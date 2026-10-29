// Estado de la simulación. Sólo datos y reglas; nada de DOM ni de render.
// Slice 03: el jugador es el `Character` de la clase elegida (vida, recurso y
// estadísticas salen de su hoja), los hechizos de la barra sustituyen a las
// habilidades fijas, los enemigos sueltan botín y la mascota activa acompaña.
import type { GameData } from '../data';
import type { AbilityDef } from '../data/schema';
import { Actor } from '../rpg/actor';
import { Character } from '../rpg/character';
import type { RpgContent } from '../rpg/content';
import type { EffectDef, GroundLootView, ItemInstance, PetDef, StatusDef } from '../rpg/contracts';
import { createEffect, DamageEffect, type Effect, type EffectContext, type ZoneSpec } from '../rpg/effects';
import { EnemyActor } from '../rpg/enemy';
import { Pet, type PetWorld } from '../rpg/pets';
import { rollLoot } from '../rpg/progression';
import type { SessionWorld } from '../rpg/session';
import { compileSpell, type CompiledSpell } from '../rpg/spells';
import { ChaserSystem } from './chasers';
import { castBlock, type CastBlock, type CombatState } from './combat';
import { separate } from './crowd';
import { resolveHit, type AttackerProfile, type DamageRules, type HitSpec } from './damage';
import { EnemySystem, type Enemy, type EnemyContext } from './enemies';
import type { GameEvent } from './events';
import { slide, stepAlongPath, type Mover } from './movement';
import { NavGrid } from './navGrid';
import { Pathfinder } from './pathfinder';
import { Rng } from './rng';
import { shapeHitsCircle, type PlacedShape } from './shapes';
import { SpatialHash } from './spatialHash';
import { clamp, copy, dist, distSq, type Vec2 } from './vec2';

export interface Body extends Mover {
  id: number;
  /** Posición al inicio del último tick, para interpolar en el render. */
  prevPos: Vec2;
  radius: number;
}

export interface Player extends Body, CombatState {
  /** Destino final pedido por el jugador (para el marcador del render). */
  moveTarget: Vec2 | null;
  /** Vida y recurso son los del `Character` (accesores). */
  health: number;
  maxHealth: number;
  alive: boolean;
  /** Segundos que quedan sin recibir golpes. */
  invulnerable: number;
  evadeCooldown: number;
  /** Evasión en curso: dirección unitaria y segundos restantes. */
  evading: { dx: number; dy: number; remaining: number } | null;
  /** Lanzamiento con `castTime` en curso. */
  casting: { ability: string; targetId: number | null; dir: number; aim: Vec2; remaining: number } | null;
  /** Enemigo al que va a dar un ataque básico (se acerca si hace falta). */
  attackTarget: number | null;
  /** Último enemigo atacado: objetivo por defecto de los hechizos de un objetivo. */
  lastTarget: number | null;
  /** Botín del suelo al que va a por él (clic). */
  pickupTarget: number | null;
}

/** A qué apunta una habilidad: punto del suelo bajo el cursor y enemigo bajo el cursor. */
export interface Aim {
  point: Vec2;
  targetId: number | null;
}

/** Objeto o monedas en el suelo. */
export interface GroundLoot {
  id: number;
  pos: Vec2;
  item: ItemInstance | null;
  gold: number;
  age: number;
}

/** Zona persistente de un hechizo (Campo estático). */
export interface Zone extends ZoneSpec {
  id: number;
  pos: Vec2;
  remaining: number;
  timer: number;
  caster: Actor;
  tag: string;
}

interface PendingHit {
  remaining: number;
  run: () => void;
}

const ATTACK_REPATH_SECONDS = 0.25;
/** Velocidad del proyectil del ataque básico con armas de alcance > 3 m (PROPUESTA). */
const BASIC_PROJECTILE_SPEED = 20;
const RANGED_WEAPON_REACH = 3;
const BASIC_ID = 'basic';
const MOVE_STEP = 0.25;

export interface WorldOptions {
  /** Poner los enemigos de `data/encounter.json` (por defecto sí). */
  encounter?: boolean;
  /** Semilla del RNG (por defecto la de `data/loadtest.json`). */
  seed?: number;
  /** Personaje de la sesión; si falta, uno nuevo de la clase por defecto. */
  character?: Character;
}

/** `playing` hasta limpiar la arena (`victory`) o caer (`defeat`). */
export type Outcome = 'playing' | 'victory' | 'defeat';

export class World implements SessionWorld {
  time = 0;
  tickCount = 0;
  outcome: Outcome = 'playing';
  /** Segundos simulados hasta el final de la partida. */
  endTime: number | null = null;
  readonly grid: NavGrid;
  readonly pathfinder: Pathfinder;
  readonly rng: Rng;
  readonly player: Player;
  readonly chasers: ChaserSystem;
  readonly enemies: EnemySystem;
  readonly content: RpgContent;
  readonly character: Character;
  /** Actor RPG de cada enemigo de la simulación, por id. */
  readonly enemyActors = new Map<number, EnemyActor>();
  readonly loot: GroundLoot[] = [];
  /** Mascota activa (con amuleto) y aliados invocados. */
  readonly pets: Pet[] = [];
  readonly zones: Zone[] = [];
  private readonly pending: PendingHit[] = [];
  private readonly hash: SpatialHash;
  private readonly enemyHash: SpatialHash;
  private readonly enemyCtx: EnemyContext;
  private readonly damageRules: DamageRules;
  private readonly spellCache = new Map<string, CompiledSpell>();
  private readonly effectCache = new Map<EffectDef, Effect>();
  private readonly petWorld: PetWorld;
  private events: GameEvent[] = [];
  private nextId = 1;
  private attackRepath = 0;

  constructor(readonly data: GameData, opts: WorldOptions = {}) {
    const z = data.zone;
    this.content = data.rpg;
    this.rng = new Rng(opts.seed ?? data.loadTest.seed);
    this.grid = NavGrid.fromObstacles(z.width, z.depth, z.cellSize, z.obstacles, z.navRadius);
    this.pathfinder = new Pathfinder(this.grid);
    this.hash = new SpatialHash(z.width, z.depth, 2);
    this.enemyHash = new SpatialHash(z.width, z.depth, 2);
    this.chasers = new ChaserSystem(data.loadTest, this.grid, this.pathfinder);
    this.enemies = new EnemySystem(data.enemies);
    this.damageRules = { elementStat: this.content.rules.elementStat, resistCap: this.content.progression.resistCap };
    const ch = opts.character ?? Character.create(this.content, this.content.rules.defaultClass, 'Aventurero', new Rng((opts.seed ?? data.loadTest.seed) ^ 0x5eed));
    this.character = ch;
    // Arena nueva: vida y recurso llenos, sin estados de la anterior.
    ch.statuses.clear();
    ch.restore();
    const start = this.grid.walkable(z.playerStart) ? copy(z.playerStart) : this.grid.center(this.grid.nearestWalkable(z.playerStart));
    this.player = {
      id: this.nextId++,
      pos: start,
      prevPos: copy(start),
      radius: z.playerRadius,
      speed: ch.stats.get('moveSpeed'),
      facing: 0,
      path: [],
      moveTarget: null,
      get health() {
        return ch.health;
      },
      set health(v: number) {
        ch.health = v;
      },
      get maxHealth() {
        return ch.maxHealth;
      },
      alive: true,
      invulnerable: 0,
      get resource() {
        return ch.resource;
      },
      set resource(v: number) {
        ch.resource = v;
      },
      get maxResource() {
        return ch.maxResource;
      },
      cooldowns: {},
      gcd: 0,
      gcdTotal: 0,
      evadeCooldown: 0,
      evading: null,
      casting: null,
      attackTarget: null,
      lastTarget: null,
      pickupTarget: null,
    };
    ch.id = this.player.id;
    ch.body = this.player;
    this.enemyCtx = {
      grid: this.grid,
      pathfinder: this.pathfinder,
      rng: this.rng,
      player: this.player,
      hitPlayer: (src) => this.hitPlayer(src),
      newId: () => this.nextId++,
      emit: (e) => this.events.push(e),
    };
    this.petWorld = this.makePetWorld();
    if (opts.encounter !== false) {
      for (const s of data.encounter.spawns) {
        const p = this.grid.walkable(s) ? { x: s.x, y: s.y } : this.grid.center(this.grid.nearestWalkable(s));
        this.spawnEnemy(s.archetype, p);
      }
    }
    this.syncPets();
  }

  /** Recoge los sucesos acumulados desde la última llamada. */
  drainEvents(): GameEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  /** Pone un enemigo a mano (tests y depuración). */
  spawnEnemy(archetype: string, pos: Vec2): Enemy {
    const e = this.enemies.spawn(this.nextId++, archetype, pos);
    this.enemyActor(e);
    return e;
  }

  /** Actor RPG de un enemigo (se crea al primer uso: también los esbirros invocados). */
  enemyActor(e: Enemy): EnemyActor {
    let a = this.enemyActors.get(e.id);
    if (!a) {
      a = new EnemyActor(this.content, e, (amount) => this.enemies.damage(e, amount, (ev) => this.events.push(ev)));
      this.enemyActors.set(e.id, a);
    }
    return a;
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

  // ─── Órdenes del jugador ─────────────────────────────────────────────────

  /**
   * Orden del jugador: caminar hacia un punto del suelo. Si no es caminable,
   * va al punto alcanzable más cercano. Gira hacia el destino en el mismo tick.
   */
  commandMove(target: Vec2): void {
    const p = this.player;
    if (!p.alive) return;
    p.attackTarget = null;
    p.pickupTarget = null;
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

  /** Clic sobre un enemigo: ataque básico con el arma, acercándose primero si hace falta. */
  commandAttack(enemyId: number): void {
    const p = this.player;
    const e = this.enemies.get(enemyId);
    if (!p.alive || !e || e.state === 'dead') return;
    if (p.casting) return;
    p.attackTarget = enemyId;
    p.lastTarget = enemyId;
    p.pickupTarget = null;
    this.attackRepath = 0;
  }

  /** Clic sobre un botín: ir a por él y recogerlo. */
  commandPickup(lootId: number): void {
    const p = this.player;
    const l = this.loot.find((x) => x.id === lootId);
    if (!p.alive || !l) return;
    p.attackTarget = null;
    p.casting = null;
    p.pickupTarget = lootId;
    if (dist(p.pos, l.pos) > this.content.rules.pickupReach) this.walkTo(l.pos);
  }

  /** Hechizo compilado con el rango que conoce el personaje (o el básico del arma). */
  spell(id: string): CompiledSpell {
    if (id === BASIC_ID) return this.basicAttack();
    const def = this.content.spells[id];
    if (!def) throw new Error(`hechizo desconocido: ${id}`);
    const rank = Math.max(1, this.character.spellbook.rank(id));
    const key = `${id}:${rank}`;
    let s = this.spellCache.get(key);
    if (!s) {
      s = compileSpell(this.content, def, rank);
      this.spellCache.set(key, s);
    }
    return s;
  }

  /** Ataque básico del arma equipada (o sin arma): un objetivo, sin coste ni GCD. */
  basicAttack(): CompiledSpell {
    const w = this.character.weapon();
    const key = `${BASIC_ID}:${w?.id ?? '-'}`;
    let s = this.spellCache.get(key);
    if (!s) {
      const wd = w?.weapon ?? this.content.rules.unarmed;
      const effect: EffectDef = { type: 'damage', min: wd.min, max: wd.max, element: wd.element, scaling: this.content.rules.basicScaling };
      s = {
        id: BASIC_ID,
        name: w ? `Ataque (${w.name})` : 'Ataque básico',
        def: null,
        rank: 1,
        cost: 0,
        cooldown: 1 / wd.speed,
        globalCooldown: 0,
        castTime: 0,
        range: wd.range,
        area: { type: 'single' },
        projectileSpeed: wd.range > RANGED_WEAPON_REACH ? BASIC_PROJECTILE_SPEED : null,
        critChance: 0,
        critBonus: 0,
        power: 1,
        effects: [new DamageEffect(effect as Extract<EffectDef, { type: 'damage' }>)],
      };
      this.spellCache.set(key, s);
    }
    return s;
  }

  /**
   * Resumen con la forma del Slice 01 para el HUD y el render (que dibujan
   * áreas centradas en el jugador). `self` se presenta como `single`.
   */
  ability(id: string): AbilityDef {
    const s = this.spell(id);
    const dmg = s.effects.find((e): e is DamageEffect => e instanceof DamageEffect);
    const a = s.area;
    return {
      id: s.id,
      label: s.name,
      resourceCost: s.cost,
      cooldown: this.cooldownOf(s),
      globalCooldown: s.globalCooldown,
      castTime: s.castTime,
      range: s.range,
      area: a.type === 'self' || a.type === 'single' ? { type: 'single' } : a.type === 'circle' ? { type: 'circle', radius: a.radius } : a,
      damageMin: dmg ? dmg.def.min * s.power : 0,
      damageMax: dmg ? dmg.def.max * s.power : 0,
      critChance: s.critChance,
      critBonus: s.critBonus,
    };
  }

  /** Etiqueta legible de una fuente de daño (hechizo, estado, mascota…). */
  labelOf(source: string): string {
    if (source === 'evade') return 'Evasión';
    if (source === BASIC_ID) return this.basicAttack().name;
    if (this.content.spells[source]) return this.content.spells[source]!.name;
    const [kind, id] = source.split(':');
    if (kind === 'status') return this.content.statuses[id!]?.name ?? source;
    if (kind === 'pet') return this.content.pets[id!]?.name ?? source;
    if (kind === 'item') return this.content.items[id!]?.name ?? source;
    return source;
  }

  /** Enfriamiento con la reducción del personaje (tope 50 %; el básico no se reduce). */
  cooldownOf(s: CompiledSpell): number {
    if (s.id === BASIC_ID) return s.cooldown;
    return s.cooldown * (1 - clamp(this.character.stats.get('cooldownReduction'), 0, 0.5));
  }

  private enemyById(id: number | null): Enemy | undefined {
    const e = id === null ? undefined : this.enemies.get(id);
    return e && e.state !== 'dead' ? e : undefined;
  }

  /** ¿Está el objetivo al alcance? Las áreas propias siempre lo están; el círculo apuntado mira la distancia al punto. */
  inRange(s: CompiledSpell, targetId: number | null, aim?: Vec2): boolean {
    const p = this.player;
    if (s.area.type === 'circle' && s.area.atTarget) return aim !== undefined && dist(p.pos, aim) <= s.range && this.grid.lineOfSight(p.pos, aim);
    if (s.area.type !== 'single') return true;
    const e = this.enemyById(targetId);
    if (!e) return false;
    return dist(p.pos, e.pos) - p.radius - e.radius <= s.range && this.grid.lineOfSight(p.pos, e.pos);
  }

  /** Motivo por el que no se puede lanzar ahora mismo, o null. */
  checkCast(s: CompiledSpell, targetId: number | null, aim?: Vec2): CastBlock | null {
    const p = this.player;
    if (!p.alive) return 'dead';
    if (p.casting || p.evading) return 'busy';
    const control = this.character.control;
    if (control === 'stun' || control === 'silence') return 'control';
    if (s.area.type === 'single' && !this.enemyById(targetId)) return 'target';
    return castBlock({
      resource: p.resource,
      cost: s.cost,
      cooldown: p.cooldowns[s.id] ?? 0,
      gcd: p.gcd,
      inRange: this.inRange(s, targetId, aim),
    });
  }

  /** Lanza el hechizo del hueco `index` (0..5) de la barra. */
  commandCastSlot(index: number, aim: Aim): CastBlock | null {
    const id = this.character.spellbook.hotbar[index] ?? null;
    if (id === null && !this.player.alive) {
      this.events.push({ type: 'castBlocked', ability: `slot${index + 1}`, reason: 'dead' });
      return 'dead';
    }
    if (id === null) {
      this.events.push({ type: 'castBlocked', ability: `slot${index + 1}`, reason: 'empty' });
      return 'empty';
    }
    return this.commandCast(id, aim);
  }

  /**
   * Lanza un hechizo conocido. Los de un objetivo usan el enemigo bajo el
   * cursor o, si no hay, el último atacado; las áreas se orientan hacia el cursor.
   */
  commandCast(spellId: string, aim: Aim): CastBlock | null {
    if (this.player.alive && spellId !== BASIC_ID && this.character.spellbook.rank(spellId) <= 0) {
      this.events.push({ type: 'castBlocked', ability: spellId, reason: 'unknown' });
      return 'unknown';
    }
    const s = this.spell(spellId);
    const p = this.player;
    let targetId = aim.targetId;
    if (s.area.type === 'single' && targetId === null) targetId = p.lastTarget;
    const block = this.checkCast(s, targetId, aim.point);
    if (block) {
      this.events.push({ type: 'castBlocked', ability: s.id, reason: block });
      return block;
    }
    const e = this.enemyById(targetId);
    const to = s.area.type === 'single' && e ? e.pos : aim.point;
    const dir = distSq(to, p.pos) > 1e-9 ? Math.atan2(to.y - p.pos.y, to.x - p.pos.x) : p.facing;
    if (s.area.type === 'single') p.lastTarget = targetId;
    p.attackTarget = null;
    p.pickupTarget = null;
    this.startCast(s, targetId, dir, copy(aim.point));
    return null;
  }

  private startCast(s: CompiledSpell, targetId: number | null, dir: number, aim: Vec2): void {
    const p = this.player;
    p.facing = dir;
    p.path = [];
    if (s.castTime > 0) {
      p.casting = { ability: s.id, targetId, dir, aim, remaining: s.castTime };
      return;
    }
    this.execute(s, targetId, dir, aim);
  }

  /** Paga el coste, arranca enfriamientos y aplica los efectos. Sin tirada de acierto. */
  private execute(s: CompiledSpell, targetId: number | null, dir: number, aim: Vec2): void {
    const p = this.player;
    const ch = this.character;
    p.resource -= s.cost;
    const cd = this.cooldownOf(s);
    if (cd > 0) p.cooldowns[s.id] = cd;
    if (s.globalCooldown > 0) {
      p.gcd = Math.max(p.gcd, s.globalCooldown);
      p.gcdTotal = p.gcd;
    }
    this.events.push({ type: 'cast', ability: s.id });
    const ctx = this.context(ch, s.id, aim, dir, s.critChance, s.critBonus);
    const targets = this.targetsOf(s, targetId, aim, dir);
    const self = s.effects.filter((e) => e.targeting === 'self');
    const hit = s.effects.filter((e) => e.targeting === 'hit');
    const applyHits = (): void => {
      for (const t of targets) {
        if (!t.alive) continue;
        for (const e of hit) if (t.alive) e.apply(ctx, t, s.power);
      }
    };
    // Proyectil: el golpe llega cuando recorre la distancia; lo propio se aplica ya.
    const first = targets[0];
    if (s.projectileSpeed && first && hit.length > 0) {
      const delay = Math.max(0, dist(p.pos, first.pos) - p.radius) / s.projectileSpeed;
      if (delay > 1e-6) this.pending.push({ remaining: delay, run: applyHits });
      else applyHits();
    } else {
      applyHits();
    }
    for (const e of self) e.apply(ctx, ch, s.power);
  }

  /** Enemigos vivos que alcanza un hechizo. */
  private targetsOf(s: CompiledSpell, targetId: number | null, aim: Vec2, dir: number): EnemyActor[] {
    const a = s.area;
    const p = this.player;
    if (a.type === 'self') return [];
    if (a.type === 'single') {
      const e = this.enemyById(targetId);
      return e ? [this.enemyActor(e)] : [];
    }
    const shape: PlacedShape =
      a.type === 'circle' ? { def: { type: 'circle', radius: a.radius }, origin: a.atTarget ? copy(aim) : copy(p.pos), dir } : { def: a, origin: copy(p.pos), dir };
    const out: EnemyActor[] = [];
    for (const e of this.enemies.list) if (e.state !== 'dead' && shapeHitsCircle(shape, e.pos, e.radius)) out.push(this.enemyActor(e));
    return out;
  }

  /** Evasión hacia `point` (o hacia donde mira, si el punto es el propio jugador). */
  commandEvade(point: Vec2): CastBlock | null {
    const p = this.player;
    const ev = this.data.player.evade;
    const control = this.character.control;
    let block: CastBlock | null = null;
    if (!p.alive) block = 'dead';
    else if (p.evading) block = 'busy';
    else if (control === 'stun' || control === 'root') block = 'control';
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
    p.pickupTarget = null;
    p.path = [];
    p.moveTarget = null;
    this.events.push({ type: 'evade' });
    return null;
  }

  // ─── Efectos ─────────────────────────────────────────────────────────────

  private profile(a: Actor): AttackerProfile {
    return a;
  }

  /** Contexto de efectos para un lanzador (hechizos, estados, mascotas, consumibles). */
  context(caster: Actor, tag: string, aim: Vec2, dir: number, critChance = 0, critBonus = 0): EffectContext {
    const w = this;
    const origin = copy(caster.pos);
    return {
      rng: this.rng,
      content: this.content,
      caster,
      tag,
      origin,
      aim,
      dir,
      critChance,
      critBonus,
      damage: (t, h) => w.dealDamage(caster, t, h, tag),
      heal: (t, amount) => {
        const healed = t.heal(amount);
        if (healed > 0) w.events.push({ type: 'heal', targetId: t.id, amount: healed, source: tag });
      },
      restoreResource: (t, amount) => {
        if (t instanceof Character) t.resource = Math.min(t.maxResource, t.resource + amount);
      },
      applyStatus: (t, def, duration, shield) => w.applyStatus(caster, t, def, duration, shield),
      knockback: (t, from, distance) => w.knockback(t, from, distance),
      dash: (distance) => w.dash(caster, dir, distance),
      teleport: (maxDistance) => w.teleport(caster, aim, dir, maxDistance),
      summon: (pet, count, duration) => w.summon(pet, count, duration),
      zone: (spec) => w.addZone(caster, tag, aim, spec),
    };
  }

  /** `SessionWorld`: consumibles usados desde el inventario durante la partida. */
  effectContext(tag: string): EffectContext {
    return this.context(this.character, tag, copy(this.player.pos), this.player.facing);
  }

  private dealDamage(source: Actor, target: Actor, hit: HitSpec, tag: string): void {
    if (!target.alive) return;
    const toPlayer = target === this.character;
    if (toPlayer && this.player.invulnerable > 0) {
      this.events.push({ type: 'avoided', sourceId: source.id });
      return;
    }
    const roll = resolveHit(this.rng, hit, this.profile(source), target.stats, this.damageRules);
    this.events.push({ type: 'damage', sourceId: source.id, targetId: target.id, amount: roll.amount, crit: roll.crit, toPlayer, ability: tag });
    target.takeDamage(roll.amount);
  }

  private applyStatus(source: Actor, target: Actor, def: StatusDef, duration: number, shield?: number): void {
    if (!target.alive) return;
    target.statuses.apply(def, { duration, source, shield: shield ?? 0 });
    this.events.push({ type: 'status', targetId: target.id, statusId: def.id });
  }

  private bodyOf(a: Actor): { pos: Vec2; path: Vec2[] } | null {
    if (a === this.character) return this.player;
    if (a instanceof EnemyActor) return this.enemies.get(a.id) ?? null;
    if (a instanceof Pet) return a;
    return null;
  }

  /** Mueve en línea recta por pasos cortos, deslizando por paredes. */
  private push(body: { pos: Vec2 }, dir: number, distance: number): void {
    const n = Math.max(1, Math.ceil(distance / MOVE_STEP));
    const sx = (Math.cos(dir) * distance) / n;
    const sy = (Math.sin(dir) * distance) / n;
    for (let i = 0; i < n; i++) body.pos = slide(this.grid, body.pos, { x: body.pos.x + sx, y: body.pos.y + sy });
  }

  private knockback(t: Actor, from: Vec2, distance: number): void {
    const b = this.bodyOf(t);
    if (!b || !t.alive) return;
    const dx = b.pos.x - from.x;
    const dy = b.pos.y - from.y;
    const dir = dx * dx + dy * dy > 1e-9 ? Math.atan2(dy, dx) : this.player.facing;
    this.push(b, dir, distance);
    b.path.length = 0;
  }

  private dash(caster: Actor, dir: number, distance: number): void {
    const b = this.bodyOf(caster);
    if (!b) return;
    this.push(b, dir, distance);
    b.path.length = 0;
    if (b === this.player) this.player.moveTarget = null;
  }

  /** Teletransporte hacia el punto apuntado (como mucho `maxDistance`), al último punto caminable con línea de visión. */
  private teleport(caster: Actor, aim: Vec2, dir: number, maxDistance: number): void {
    const b = this.bodyOf(caster);
    if (!b) return;
    const from = copy(b.pos);
    const want = Math.min(maxDistance, dist(from, aim));
    let to = from;
    for (let d = want; d > 0; d -= MOVE_STEP) {
      const p = { x: from.x + Math.cos(dir) * d, y: from.y + Math.sin(dir) * d };
      if (this.grid.walkable(p) && this.grid.lineOfSight(from, p)) {
        to = p;
        break;
      }
    }
    b.pos = to;
    b.path.length = 0;
    if (b === this.player) {
      this.player.prevPos = copy(to);
      this.player.moveTarget = null;
    }
    this.events.push({ type: 'teleport', from, to: copy(to) });
  }

  private summon(def: PetDef, count: number, duration: number): void {
    for (let i = 0; i < count; i++) this.spawnPet(def, null, duration);
  }

  private addZone(caster: Actor, tag: string, at: Vec2, spec: ZoneSpec): void {
    this.zones.push({ ...spec, id: this.nextId++, pos: copy(at), remaining: spec.duration, timer: 0, caster, tag });
  }

  // ─── Golpes enemigos ─────────────────────────────────────────────────────

  private hitPlayer(src: Enemy): void {
    const p = this.player;
    if (!p.alive) return;
    if (p.invulnerable > 0) {
      this.events.push({ type: 'avoided', sourceId: src.id });
      return;
    }
    const at = src.def.attack;
    const actor = this.enemyActor(src);
    const hit: HitSpec = { min: at.damageMin, max: at.damageMax, element: actor.info.element, scaling: 0, critChance: at.critChance, critBonus: at.critBonus };
    const roll = resolveHit(this.rng, hit, this.profile(actor), this.character.stats, this.damageRules);
    this.events.push({ type: 'damage', sourceId: src.id, targetId: p.id, amount: roll.amount, crit: roll.crit, toPlayer: true, ability: null });
    this.character.takeDamage(roll.amount);
  }

  // ─── Botín ───────────────────────────────────────────────────────────────

  /** Deja un objeto (o monedas) en el suelo cerca de `at`. */
  dropLoot(at: Vec2, item: ItemInstance | null, gold = 0): GroundLoot {
    const s = this.content.rules.lootScatter;
    let pos = { x: at.x + this.rng.range(-s, s), y: at.y + this.rng.range(-s, s) };
    if (!this.grid.walkable(pos) || !this.grid.lineOfSight(at, pos)) pos = this.grid.walkable(at) ? copy(at) : this.grid.center(this.grid.nearestWalkable(at));
    const l: GroundLoot = { id: this.nextId++, pos, item, gold, age: 0 };
    this.loot.push(l);
    this.events.push({ type: 'lootDrop', lootId: l.id });
    return l;
  }

  /** `SessionWorld`: lo que se tira del inventario cae junto al jugador. */
  dropToGround(inst: ItemInstance): void {
    this.dropLoot(this.player.pos, inst);
  }

  /** `SessionWorld`. */
  petHealth(): { health: number; maxHealth: number } | null {
    const pet = this.pets.find((p) => p.itemUid !== null);
    return pet ? { health: pet.health, maxHealth: pet.maxHealth } : null;
  }

  private canCollect(l: GroundLoot): boolean {
    return l.item === null || this.character.inventory.canAdd(l.item);
  }

  /** Recoge un botín para el personaje. Devuelve si desapareció del suelo. */
  collect(lootId: number, byPet = false): boolean {
    const i = this.loot.findIndex((x) => x.id === lootId);
    if (i < 0) return false;
    const l = this.loot[i]!;
    if (l.item) {
      if (this.character.pickUp(l.item) > 0) return false;
    } else {
      this.character.addGold(l.gold);
    }
    this.loot.splice(i, 1);
    this.events.push({ type: 'lootPickup', lootId, byPet });
    return true;
  }

  /** Vista del botín del suelo (render, interfaz). */
  lootView(): GroundLootView[] {
    return this.loot.map((l) => ({
      id: l.id,
      x: l.pos.x,
      y: l.pos.y,
      item: l.item,
      gold: l.gold,
      rarity: l.item ? this.content.items[l.item.itemId]!.rarity : 'common',
    }));
  }

  private tickLoot(dt: number): void {
    const p = this.player;
    const life = this.content.rules.lootLifetime;
    for (let i = this.loot.length - 1; i >= 0; i--) {
      const l = this.loot[i]!;
      l.age += dt;
      if (l.age >= life) this.loot.splice(i, 1);
    }
    if (!p.alive) return;
    const r = this.character.stats.get('pickupRadius');
    for (const l of [...this.loot]) {
      if (dist(p.pos, l.pos) <= r && this.canCollect(l)) this.collect(l.id);
    }
    if (p.pickupTarget !== null) {
      const l = this.loot.find((x) => x.id === p.pickupTarget);
      if (!l) p.pickupTarget = null;
      else if (dist(p.pos, l.pos) <= Math.max(r, this.content.rules.pickupReach)) {
        p.pickupTarget = null;
        p.path = [];
        p.moveTarget = null;
        this.collect(l.id);
      }
    }
  }

  /** XP y botín de cada enemigo muerto, una sola vez. */
  private rewardDeaths(): void {
    for (const e of this.enemies.list) {
      if (e.state !== 'dead') continue;
      const a = this.enemyActor(e);
      if (a.rewarded) continue;
      a.rewarded = true;
      a.statuses.clear();
      if (!this.player.alive) continue;
      if (a.info.xp > 0) {
        const before = this.character.level;
        this.character.gainXp(a.info.xp);
        this.events.push({ type: 'xp', amount: a.info.xp });
        for (let l = before + 1; l <= this.character.level; l++) this.events.push({ type: 'levelUp', level: l });
      }
      const table = a.info.lootTable ? this.content.lootTables[a.info.lootTable] : undefined;
      if (!table) continue;
      const drop = rollLoot(this.rng, this.content, table);
      if (drop.gold > 0) this.dropLoot(e.pos, null, drop.gold);
      for (const it of drop.items) this.dropLoot(e.pos, this.character.items.create(it.itemId, it.quantity));
    }
  }

  // ─── Mascotas ────────────────────────────────────────────────────────────

  private spawnPet(def: PetDef, itemUid: string | null, ttl: number | null): Pet {
    const o = this.player.pos;
    let pos = { x: o.x - Math.cos(this.player.facing) * 1.2, y: o.y - Math.sin(this.player.facing) * 1.2 };
    if (!this.grid.walkable(pos)) pos = copy(o);
    const pet = new Pet(this.content, def, pos, itemUid, ttl);
    pet.id = this.nextId++;
    this.pets.push(pet);
    this.events.push({ type: 'petSpawn', petId: def.id, entityId: pet.id });
    return pet;
  }

  /** La mascota activa del mundo sigue al amuleto activo del personaje. */
  private syncPets(): void {
    const ch = this.character;
    const want = ch.activePetId();
    const uid = ch.activePetItemUid;
    const cur = this.pets.find((p) => p.itemUid !== null);
    if (cur && (!want || cur.itemUid !== uid || cur.def.id !== want || !this.player.alive)) this.pets.splice(this.pets.indexOf(cur), 1);
    if (want && uid && this.player.alive && !this.pets.some((p) => p.itemUid === uid)) this.spawnPet(this.content.pets[want]!, uid, null);
  }

  private makePetWorld(): PetWorld {
    const w = this;
    return {
      rng: this.rng,
      owner: this.character,
      nearestEnemy(from, radius) {
        let best: EnemyActor | null = null;
        let bd = radius;
        for (const e of w.enemies.list) {
          if (e.state === 'dead') continue;
          const d = dist(from, e.pos);
          if (d <= bd) {
            bd = d;
            best = w.enemyActor(e);
          }
        }
        return best;
      },
      nearestLoot(from, radius) {
        let best: GroundLoot | null = null;
        let bd = radius;
        for (const l of w.loot) {
          const d = dist(from, l.pos);
          if (d <= bd && w.canCollect(l)) {
            bd = d;
            best = l;
          }
        }
        return best;
      },
      collectLoot(id) {
        w.collect(id, true);
      },
      petAttack(pet, target) {
        const a = pet.def.attack!;
        w.dealDamage(pet, target, { min: a.min, max: a.max, element: a.element, scaling: 0, critChance: 0, critBonus: 0 }, `pet:${pet.def.id}`);
      },
      petEffect(pet, effect, target) {
        effect.apply(w.context(pet, `pet:${pet.def.id}`, copy(pet.pos), pet.facing), target, 1);
      },
      moveTowards(pet, to, dt) {
        if (w.grid.lineOfSight(pet.pos, to)) pet.path = [copy(to)];
        else if (pet.path.length === 0) pet.path = w.pathfinder.findPath(pet.pos, to);
        stepAlongPath(pet, dt);
      },
    };
  }

  private tickPets(dt: number): void {
    this.syncPets();
    for (const pet of [...this.pets]) {
      if (pet.expired || !this.player.alive) {
        this.pets.splice(this.pets.indexOf(pet), 1);
        continue;
      }
      pet.tick(this.petWorld, dt);
    }
  }

  // ─── Tiempo ──────────────────────────────────────────────────────────────

  /** Efecto (instanciado una vez) que repite un estado. */
  private tickEffect(def: EffectDef): Effect {
    let e = this.effectCache.get(def);
    if (!e) {
      e = createEffect(def, this.content);
      this.effectCache.set(def, e);
    }
    return e;
  }

  private tickStatuses(a: Actor, dt: number): void {
    if (a.statuses.list.length === 0) return;
    a.statuses.tick(dt, (s) => {
      if (!a.alive || !s.def.tick) return;
      const src = s.source instanceof Actor ? s.source : a;
      this.tickEffect(s.def.tick.effect).apply(this.context(src, `status:${s.def.id}`, copy(a.pos), 0), a, 1);
    });
  }

  private tickZones(dt: number): void {
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i]!;
      const step = Math.min(dt, z.remaining);
      z.remaining -= dt;
      z.timer += step;
      while (z.timer >= z.every - 1e-9) {
        z.timer -= z.every;
        const ctx = this.context(z.caster, z.tag, z.pos, 0);
        const shape: PlacedShape = { def: { type: 'circle', radius: z.radius }, origin: z.pos, dir: 0 };
        for (const e of this.enemies.list) {
          if (e.state === 'dead' || !shapeHitsCircle(shape, e.pos, e.radius)) continue;
          const t = this.enemyActor(e);
          for (const eff of z.effects) if (eff.targeting === 'hit' && t.alive) eff.apply(ctx, t, z.power);
        }
      }
      if (z.remaining <= 1e-9) this.zones.splice(i, 1);
    }
  }

  private tickPending(dt: number): void {
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const h = this.pending[i]!;
      h.remaining -= dt;
      if (h.remaining > 0) continue;
      this.pending.splice(i, 1);
      h.run();
    }
  }

  /** Estados, control y velocidad de los enemigos (antes de su máquina de estados). */
  private tickEnemyActors(dt: number): void {
    for (const e of this.enemies.list) {
      const a = this.enemyActor(e);
      if (e.state === 'dead') continue;
      this.tickStatuses(a, dt);
      const c = a.control;
      e.frozen = c === 'stun';
      e.speed = c === 'stun' || c === 'root' ? 0 : a.stats.get('moveSpeed');
    }
  }

  private tickPlayer(dt: number): void {
    const p = this.player;
    const ch = this.character;
    p.invulnerable = Math.max(0, p.invulnerable - dt);
    p.gcd = Math.max(0, p.gcd - dt);
    p.evadeCooldown = Math.max(0, p.evadeCooldown - dt);
    for (const id in p.cooldowns) p.cooldowns[id] = Math.max(0, p.cooldowns[id]! - dt);
    if (!p.alive) return;
    ch.tickTimers(dt);
    this.tickStatuses(ch, dt);
    const control = ch.control;
    p.speed = control === 'root' || control === 'stun' ? 0 : ch.stats.get('moveSpeed');
    if (control === 'stun') {
      p.casting = null;
      return;
    }

    if (p.evading) {
      const ev = p.evading;
      const evd = this.data.player.evade;
      const step = Math.min(dt, ev.remaining) * (evd.distance / evd.seconds);
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
      const s = this.spell(c.ability);
      const block = this.checkCast(s, c.targetId, c.aim);
      if (block) this.events.push({ type: 'castBlocked', ability: s.id, reason: block });
      else this.execute(s, c.targetId, c.dir, c.aim);
      return;
    }
    if (p.attackTarget !== null) this.approachAndAttack(dt);
    stepAlongPath(p, dt);
  }

  /** Ataque básico pendiente: acercarse hasta tener alcance y golpear una vez. */
  private approachAndAttack(dt: number): void {
    const p = this.player;
    const e = this.enemyById(p.attackTarget);
    if (!e) {
      p.attackTarget = null;
      return;
    }
    const basic = this.basicAttack();
    if (this.inRange(basic, e.id)) {
      p.path = [];
      p.moveTarget = null;
      p.facing = Math.atan2(e.pos.y - p.pos.y, e.pos.x - p.pos.x);
      if (this.checkCast(basic, e.id) === null) {
        p.attackTarget = null;
        this.startCast(basic, e.id, p.facing, copy(e.pos));
      }
      return;
    }
    this.attackRepath -= dt;
    if (this.attackRepath <= 0 || p.path.length === 0) {
      this.walkTo(e.pos);
      this.attackRepath = ATTACK_REPATH_SECONDS;
    }
  }

  /** Muerte del jugador → derrota; ningún enemigo vivo → victoria. Una sola vez. */
  private checkOutcome(): void {
    const p = this.player;
    if (p.alive && p.health <= 0) {
      p.alive = false;
      p.path = [];
      p.moveTarget = null;
      p.evading = null;
      p.casting = null;
      p.attackTarget = null;
      p.pickupTarget = null;
      this.events.push({ type: 'playerDeath' });
    }
    if (this.outcome !== 'playing') return;
    let next: Outcome = 'playing';
    if (!p.alive) next = 'defeat';
    else if (this.enemies.list.length > 0 && this.enemies.aliveCount() === 0) next = 'victory';
    if (next === 'playing') return;
    this.outcome = next;
    this.endTime = this.time;
    this.events.push({ type: 'outcome', outcome: next });
  }

  tick(dt: number): void {
    const p = this.player;
    p.prevPos = copy(p.pos);
    this.tickPlayer(dt);
    if (p.path.length === 0) p.moveTarget = null;
    this.tickPending(dt);
    this.tickZones(dt);

    if (this.enemies.list.length > 0) {
      this.tickEnemyActors(dt);
      this.enemies.tick(dt, this.enemyCtx);
      const alive = this.enemies.list.filter((e) => e.state !== 'dead');
      separate(this.grid, this.enemyHash, alive, this.enemies.maxRadius(), p);
    }
    this.tickPets(dt);
    this.rewardDeaths();
    this.tickLoot(dt);
    this.checkOutcome();
    if (this.chasers.list.length > 0) {
      this.chasers.tick(dt, p);
      separate(this.grid, this.hash, this.chasers.list, this.data.loadTest.radius, p);
    }
    this.time += dt;
    this.tickCount++;
  }
}
