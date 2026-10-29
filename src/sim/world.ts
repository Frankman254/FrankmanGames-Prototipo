// Estado de la simulación. Sólo datos y reglas; nada de DOM ni de render.
import type { GameData } from '../data';
import type { AbilityDef } from '../data/schema';
import { ChaserSystem } from './chasers';
import { canCast, castBlock, type CastBlock, type CombatState } from './combat';
import { separate } from './crowd';
import { rollDamage } from './damage';
import { EnemySystem, type Enemy, type EnemyContext } from './enemies';
import type { GameEvent } from './events';
import { slide, stepAlongPath, type Mover } from './movement';
import { NavGrid } from './navGrid';
import { Pathfinder } from './pathfinder';
import { Rng } from './rng';
import { shapeHitsCircle } from './shapes';
import { SpatialHash } from './spatialHash';
import { clamp, copy, dist, distSq, type Vec2 } from './vec2';

export interface Actor extends Mover {
  id: number;
  /** Posición al inicio del último tick, para interpolar en el render. */
  prevPos: Vec2;
  radius: number;
}

export interface Player extends Actor, CombatState {
  /** Destino final pedido por el jugador (para el marcador del render). */
  moveTarget: Vec2 | null;
  health: number;
  maxHealth: number;
  alive: boolean;
  /** Segundos que quedan sin recibir golpes. */
  invulnerable: number;
  evadeCooldown: number;
  /** Evasión en curso: dirección unitaria y segundos restantes. */
  evading: { dx: number; dy: number; remaining: number } | null;
  /** Lanzamiento con `castTime` en curso. */
  casting: { ability: string; targetId: number | null; dir: number; remaining: number } | null;
  /** Enemigo al que va a dar un ataque básico (se acerca si hace falta). */
  attackTarget: number | null;
  /** Último enemigo atacado: objetivo por defecto de las habilidades de un objetivo. */
  lastTarget: number | null;
}

/** A qué apunta una habilidad: punto del suelo bajo el cursor y enemigo bajo el cursor. */
export interface Aim {
  point: Vec2;
  targetId: number | null;
}

const ATTACK_REPATH_SECONDS = 0.25;

export interface WorldOptions {
  /** Poner los enemigos de `data/encounter.json` (por defecto sí). */
  encounter?: boolean;
}

export class World {
  time = 0;
  tickCount = 0;
  readonly grid: NavGrid;
  readonly pathfinder: Pathfinder;
  readonly rng: Rng;
  readonly player: Player;
  readonly chasers: ChaserSystem;
  readonly enemies: EnemySystem;
  private readonly hash: SpatialHash;
  private readonly enemyHash: SpatialHash;
  private readonly enemyCtx: EnemyContext;
  private events: GameEvent[] = [];
  private nextId = 1;
  private attackRepath = 0;

  constructor(readonly data: GameData, opts: WorldOptions = {}) {
    const z = data.zone;
    this.rng = new Rng(data.loadTest.seed);
    this.grid = NavGrid.fromObstacles(z.width, z.depth, z.cellSize, z.obstacles, z.navRadius);
    this.pathfinder = new Pathfinder(this.grid);
    this.hash = new SpatialHash(z.width, z.depth, 2);
    this.enemyHash = new SpatialHash(z.width, z.depth, 2);
    this.chasers = new ChaserSystem(data.loadTest, this.grid, this.pathfinder);
    this.enemies = new EnemySystem(data.enemies);
    const start = this.grid.walkable(z.playerStart) ? copy(z.playerStart) : this.grid.center(this.grid.nearestWalkable(z.playerStart));
    this.player = {
      id: this.nextId++,
      pos: start,
      prevPos: copy(start),
      radius: z.playerRadius,
      speed: z.playerSpeed,
      facing: 0,
      path: [],
      moveTarget: null,
      health: data.player.maxHealth,
      maxHealth: data.player.maxHealth,
      alive: true,
      invulnerable: 0,
      resource: data.player.maxResource,
      maxResource: data.player.maxResource,
      cooldowns: {},
      gcd: 0,
      gcdTotal: 0,
      evadeCooldown: 0,
      evading: null,
      casting: null,
      attackTarget: null,
      lastTarget: null,
    };
    this.enemyCtx = {
      grid: this.grid,
      pathfinder: this.pathfinder,
      rng: this.rng,
      player: this.player,
      hitPlayer: (src) => this.hitPlayer(src),
      newId: () => this.nextId++,
      emit: (e) => this.events.push(e),
    };
    if (opts.encounter !== false) {
      for (const s of data.encounter.spawns) {
        const p = this.grid.walkable(s) ? { x: s.x, y: s.y } : this.grid.center(this.grid.nearestWalkable(s));
        this.enemies.spawn(this.nextId++, s.archetype, p);
      }
    }
  }

  /** Recoge los sucesos acumulados desde la última llamada. */
  drainEvents(): GameEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  /** Pone un enemigo a mano (tests y depuración). */
  spawnEnemy(archetype: string, pos: Vec2): Enemy {
    return this.enemies.spawn(this.nextId++, archetype, pos);
  }

  /** Punto caminable aleatorio a más de `minDist` del jugador. */
  randomSpawnPoint(minDist: number): Vec2 {
    const z = this.data.zone;
    for (let tries = 0; tries < 200; tries++) {
      const p = { x: this.rng.range(0, z.width), y: this.rng.range(0, z.depth) };
      if (this.grid.walkable(p) && dist(p, this.player.pos) >= minDist) return p;
    }
    return this.grid.center(this.grid.nearestWalkable({ x: z.width / 2, y: z.depth / 2 }));
  }

  /** Prueba de carga: sustituye los perseguidores por `n` nuevos. */
  spawnChasers(n: number): void {
    this.chasers.clear();
    for (let i = 0; i < n; i++) {
      this.chasers.spawn(this.nextId++, this.randomSpawnPoint(this.data.loadTest.minSpawnDistance), i / Math.max(1, n));
    }
  }

  /**
   * Orden del jugador: caminar hacia un punto del suelo. Si no es caminable,
   * va al punto alcanzable más cercano. Gira hacia el destino en el mismo tick.
   */
  commandMove(target: Vec2): void {
    const p = this.player;
    if (!p.alive) return;
    p.attackTarget = null;
    p.casting = null;
    this.walkTo(target);
  }

  private walkTo(target: Vec2): void {
    const p = this.player;
    const z = this.data.zone;
    const t = { x: clamp(target.x, 0, z.width), y: clamp(target.y, 0, z.depth) };
    if (distSq(p.pos, t) < 1e-4) return;
    p.path = this.pathfinder.findPath(p.pos, t);
    const first = p.path[0];
    if (first) p.facing = Math.atan2(first.y - p.pos.y, first.x - p.pos.x);
    p.moveTarget = p.path.length > 0 ? copy(p.path[p.path.length - 1]!) : null;
  }

  /** Clic sobre un enemigo: ataque básico, acercándose primero si hace falta. */
  commandAttack(enemyId: number): void {
    const p = this.player;
    const e = this.enemies.get(enemyId);
    if (!p.alive || !e || e.state === 'dead') return;
    if (p.casting) return;
    p.attackTarget = enemyId;
    p.lastTarget = enemyId;
    this.attackRepath = 0;
  }

  ability(id: string): AbilityDef {
    const a = this.data.abilities.abilities[id];
    if (!a) throw new Error(`habilidad desconocida: ${id}`);
    return a;
  }

  /** ¿Está el objetivo al alcance de la habilidad? Las áreas propias siempre lo están. */
  inRange(def: AbilityDef, targetId: number | null): boolean {
    if (def.area.type !== 'single') return true;
    const e = targetId === null ? undefined : this.enemies.get(targetId);
    if (!e || e.state === 'dead') return false;
    const p = this.player;
    return dist(p.pos, e.pos) - p.radius - e.radius <= def.range && this.grid.lineOfSight(p.pos, e.pos);
  }

  /** Motivo por el que no se puede lanzar ahora mismo, o null. */
  checkCast(def: AbilityDef, targetId: number | null): CastBlock | null {
    const p = this.player;
    if (!p.alive) return 'dead';
    if (p.casting || p.evading) return 'busy';
    if (def.area.type === 'single') {
      const e = targetId === null ? undefined : this.enemies.get(targetId);
      if (!e || e.state === 'dead') return 'target';
    }
    return castBlock({
      resource: p.resource,
      cost: def.resourceCost,
      cooldown: p.cooldowns[def.id] ?? 0,
      gcd: p.gcd,
      inRange: this.inRange(def, targetId),
    });
  }

  /**
   * Lanza una habilidad. Las de un objetivo usan el enemigo bajo el cursor o,
   * si no hay, el último atacado; las de área se orientan hacia el cursor.
   */
  commandCast(abilityId: string, aim: Aim): CastBlock | null {
    const def = this.ability(abilityId);
    const p = this.player;
    let targetId = aim.targetId;
    if (def.area.type === 'single' && targetId === null) targetId = p.lastTarget;
    const block = this.checkCast(def, targetId);
    if (block) {
      this.events.push({ type: 'castBlocked', ability: def.id, reason: block });
      return block;
    }
    const e = targetId === null ? undefined : this.enemies.get(targetId);
    const to = def.area.type === 'single' && e ? e.pos : aim.point;
    const dir = distSq(to, p.pos) > 1e-9 ? Math.atan2(to.y - p.pos.y, to.x - p.pos.x) : p.facing;
    if (def.area.type === 'single') p.lastTarget = targetId;
    p.attackTarget = null;
    this.startCast(def, targetId, dir);
    return null;
  }

  private startCast(def: AbilityDef, targetId: number | null, dir: number): void {
    const p = this.player;
    p.facing = dir;
    p.path = [];
    if (def.castTime > 0) {
      p.casting = { ability: def.id, targetId, dir, remaining: def.castTime };
      return;
    }
    this.execute(def, targetId, dir);
  }

  /** Paga el coste, arranca enfriamientos y aplica el daño. Sin tirada de acierto. */
  private execute(def: AbilityDef, targetId: number | null, dir: number): void {
    const p = this.player;
    p.resource -= def.resourceCost;
    if (def.cooldown > 0) p.cooldowns[def.id] = def.cooldown;
    if (def.globalCooldown > 0) {
      p.gcd = Math.max(p.gcd, def.globalCooldown);
      p.gcdTotal = p.gcd;
    }
    this.events.push({ type: 'cast', ability: def.id });
    if (def.area.type === 'single') {
      const e = targetId === null ? undefined : this.enemies.get(targetId);
      if (e) this.hitEnemy(e, def);
      return;
    }
    const shape = { def: def.area, origin: copy(p.pos), dir };
    for (const e of this.enemies.list) {
      if (e.state !== 'dead' && shapeHitsCircle(shape, e.pos, e.radius)) this.hitEnemy(e, def);
    }
  }

  private hitEnemy(e: Enemy, def: AbilityDef): void {
    const roll = rollDamage(this.rng, def);
    this.events.push({ type: 'damage', sourceId: this.player.id, targetId: e.id, amount: roll.amount, crit: roll.crit, toPlayer: false, ability: def.id });
    this.enemies.damage(e, roll.amount, (ev) => this.events.push(ev));
  }

  /** Evasión hacia `point` (o hacia donde mira, si el punto es el propio jugador). */
  commandEvade(point: Vec2): CastBlock | null {
    const p = this.player;
    const ev = this.data.player.evade;
    let block: CastBlock | null = null;
    if (!p.alive) block = 'dead';
    else if (p.evading) block = 'busy';
    else if (p.resource < ev.resourceCost) block = 'resource';
    else if (p.evadeCooldown > 0) block = 'cooldown';
    if (block) {
      this.events.push({ type: 'castBlocked', ability: 'evade', reason: block });
      return block;
    }
    const dx = point.x - p.pos.x;
    const dy = point.y - p.pos.y;
    const d = Math.hypot(dx, dy);
    const dir = d > 1e-6 ? Math.atan2(dy, dx) : p.facing;
    p.facing = dir;
    p.evading = { dx: Math.cos(dir), dy: Math.sin(dir), remaining: ev.seconds };
    p.invulnerable = Math.max(p.invulnerable, ev.invulnerableSeconds);
    p.evadeCooldown = ev.cooldown;
    p.resource -= ev.resourceCost;
    p.casting = null;
    p.attackTarget = null;
    p.path = [];
    p.moveTarget = null;
    this.events.push({ type: 'evade' });
    return null;
  }

  private tickPlayer(dt: number): void {
    const p = this.player;
    const pd = this.data.player;
    p.invulnerable = Math.max(0, p.invulnerable - dt);
    p.gcd = Math.max(0, p.gcd - dt);
    p.evadeCooldown = Math.max(0, p.evadeCooldown - dt);
    for (const id in p.cooldowns) p.cooldowns[id] = Math.max(0, p.cooldowns[id]! - dt);
    if (!p.alive) return;
    p.resource = Math.min(p.maxResource, p.resource + pd.resourceRegenPerSecond * dt);
    p.health = Math.min(p.maxHealth, p.health + pd.healthRegenPerSecond * dt);

    if (p.evading) {
      const ev = p.evading;
      const step = Math.min(dt, ev.remaining) * (pd.evade.distance / pd.evade.seconds);
      p.pos = slide(this.grid, p.pos, { x: p.pos.x + ev.dx * step, y: p.pos.y + ev.dy * step });
      ev.remaining -= dt;
      if (ev.remaining <= 1e-9) p.evading = null;
      return;
    }
    if (p.casting) {
      const c = p.casting;
      c.remaining -= dt;
      if (c.remaining > 0) return;
      p.casting = null;
      const def = this.ability(c.ability);
      const block = this.checkCast(def, c.targetId);
      if (block) this.events.push({ type: 'castBlocked', ability: def.id, reason: block });
      else this.execute(def, c.targetId, c.dir);
      return;
    }
    if (p.attackTarget !== null) this.approachAndAttack(dt);
    stepAlongPath(p, dt);
  }

  /** Ataque básico pendiente: acercarse hasta tener alcance y golpear una vez. */
  private approachAndAttack(dt: number): void {
    const p = this.player;
    const e = this.enemies.get(p.attackTarget!);
    if (!e || e.state === 'dead') {
      p.attackTarget = null;
      return;
    }
    const basic = this.ability('basic');
    if (this.inRange(basic, e.id)) {
      p.path = [];
      p.moveTarget = null;
      p.facing = Math.atan2(e.pos.y - p.pos.y, e.pos.x - p.pos.x);
      const check = { resource: p.resource, cost: basic.resourceCost, cooldown: p.cooldowns[basic.id] ?? 0, gcd: p.gcd, inRange: true };
      if (canCast(check)) {
        p.attackTarget = null;
        this.startCast(basic, e.id, p.facing);
      }
      return;
    }
    this.attackRepath -= dt;
    if (this.attackRepath <= 0 || p.path.length === 0) {
      this.walkTo(e.pos);
      this.attackRepath = ATTACK_REPATH_SECONDS;
    }
  }

  private hitPlayer(src: Enemy): void {
    const p = this.player;
    if (!p.alive) return;
    if (p.invulnerable > 0) {
      this.events.push({ type: 'avoided', sourceId: src.id });
      return;
    }
    const roll = rollDamage(this.rng, src.def.attack);
    p.health = Math.max(0, p.health - roll.amount);
    this.events.push({ type: 'damage', sourceId: src.id, targetId: p.id, amount: roll.amount, crit: roll.crit, toPlayer: true, ability: null });
  }

  tick(dt: number): void {
    const p = this.player;
    p.prevPos = copy(p.pos);
    this.tickPlayer(dt);
    if (p.path.length === 0) p.moveTarget = null;

    if (this.enemies.list.length > 0) {
      this.enemies.tick(dt, this.enemyCtx);
      const alive = this.enemies.list.filter((e) => e.state !== 'dead');
      separate(this.grid, this.enemyHash, alive, this.enemies.maxRadius(), p);
    }
    if (this.chasers.list.length > 0) {
      this.chasers.tick(dt, p);
      separate(this.grid, this.hash, this.chasers.list, this.data.loadTest.radius, p);
    }
    this.time += dt;
    this.tickCount++;
  }
}
