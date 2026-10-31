// Enemigos con intención: máquina de estados propia
// Idle → Acquire → Pursue → Telegraph → Attack → Recover (→ Stagger) → Dead.
// Todo ataque pasa por Telegraph: el área queda fijada al empezar el aviso y
// sólo se resuelve al terminarlo, así que salir de ella a tiempo lo esquiva.
// Además del ataque básico cada arquetipo puede tener hechizos propios con su
// enfriamiento: en Pursue usa el primero que esté listo y a su alcance.
// Con zonas cada enemigo tiene nivel: sus cifras escalan con él y los hechizos
// con `minLevel` sólo los usa a partir de ese nivel.
import type { ArchetypeDef, EnemiesDef, EnemyAttackDef } from '../data/schema';
import type { LevelScalingDef } from '../data/zonesSchema';
import type { GameEvent } from './events';
import { slide, stepAlongPath } from './movement';
import type { NavGrid } from './navGrid';
import type { Pathfinder } from './pathfinder';
import type { Rng } from './rng';
import { shapeHitsCircle, type PlacedShape } from './shapes';
import { copy, dist, distSq, type Vec2 } from './vec2';
import { scaleArchetype } from './zones';

export type EnemyState = 'idle' | 'acquire' | 'pursue' | 'telegraph' | 'attack' | 'recover' | 'stagger' | 'dead';

export interface Enemy {
  id: number;
  /** Arquetipo ya escalado a `level` (el mismo objeto de los datos si está a su nivel base). */
  def: ArchetypeDef;
  level: number;
  /** Zona que lo puso, o null (encuentro, misión, depuración). */
  zoneId: string | null;
  pos: Vec2;
  prevPos: Vec2;
  radius: number;
  speed: number;
  facing: number;
  path: Vec2[];
  home: Vec2;
  health: number;
  state: EnemyState;
  /** Segundos en el estado actual. */
  stateTime: number;
  attackCooldown: number;
  /** Enfriamiento restante de cada hechizo de `def.spells`. */
  spellCooldowns: number[];
  /** Ataque o hechizo en curso (aviso, golpe y recuperación); el básico si no hay ninguno. */
  current: EnemyAttackDef;
  repathTimer: number;
  /** En Idle: volviendo a casa tras soltar la correa (ignora al jugador). */
  returning: boolean;
  /** Aviso en curso (sólo en Telegraph). */
  telegraph: PlacedShape | null;
  /** Invocador que lo llamó, o null. */
  summonerId: number | null;
  /** Aturdido por un estado: no piensa ni avanza el tiempo de su estado (Slice 03). */
  frozen: boolean;
  // Combate táctico (los pone el mundo cada tick a partir de sus estados).
  /** Ritmo de sus enfriamientos (1 = normal; el agotamiento lo baja). */
  cooldownRate: number;
  /** Desorientado: no retrocede para mantener la distancia. */
  disoriented: boolean;
  /** Segundos de más del aviso en curso (embotamiento). */
  telegraphExtra: number;
}

/** Lo que los enemigos necesitan del mundo. */
export interface EnemyContext {
  grid: NavGrid;
  pathfinder: Pathfinder;
  rng: Rng;
  player: { id: number; pos: Vec2; radius: number; alive: boolean };
  /** Resuelve un golpe enemigo contra el jugador (la tirada la hace el mundo). */
  hitPlayer(source: Enemy, attack: EnemyAttackDef): void;
  /** Combate v2: lanza un proyectil teledirigido al jugador (llega aunque se mueva). */
  launchHoming(source: Enemy, attack: EnemyAttackDef): void;
  /**
   * Combate táctico: al empezar un aviso. Devuelve los segundos de más que
   * tarda (embotamiento) o null si el lanzamiento falla. Sin él, 0.
   */
  castStart?(source: Enemy, attack: EnemyAttackDef): number | null;
  /** Combate táctico: ¿puede poner ahora esa trampa (espaciado)? Sin él, sí. */
  canPlaceTrap?(source: Enemy, attack: EnemyAttackDef, at: Vec2): boolean;
  /** Combate táctico: pone la trampa de un ataque `effect: 'trap'` en `at`. */
  placeTrap?(source: Enemy, attack: EnemyAttackDef, at: Vec2): void;
  newId(): number;
  emit(e: GameEvent): void;
}

/** Niveles base de cada arquetipo (fichas RPG) y curvas de escalado. */
export interface EnemyLevels {
  baseLevel(archetype: string): number;
  scaling: LevelScalingDef;
}

export class EnemySystem {
  readonly list: Enemy[] = [];
  private readonly scaled = new Map<string, ArchetypeDef>();

  constructor(
    private readonly def: EnemiesDef,
    private readonly levels: EnemyLevels | null = null,
  ) {}

  /** Nivel base de un arquetipo (1 sin fichas de nivel). */
  baseLevel(archetype: string): number {
    return this.levels?.baseLevel(archetype) ?? 1;
  }

  /** Arquetipo escalado a un nivel (cacheado). */
  archetypeAt(archetype: string, level: number): ArchetypeDef {
    const a = this.def.archetypes[archetype];
    if (!a) throw new Error(`arquetipo desconocido: ${archetype}`);
    const base = this.baseLevel(archetype);
    if (!this.levels || level === base) return a;
    const key = `${archetype}:${level}`;
    let s = this.scaled.get(key);
    if (!s) this.scaled.set(key, (s = scaleArchetype(a, level, base, this.levels.scaling)));
    return s;
  }

  /** `level` null = el nivel base del arquetipo (como antes de las zonas). */
  spawn(id: number, archetype: string, pos: Vec2, summonerId: number | null = null, level: number | null = null, zoneId: string | null = null): Enemy {
    const lv = Math.max(1, Math.round(level ?? this.baseLevel(archetype)));
    const a = this.archetypeAt(archetype, lv);
    const e: Enemy = {
      id,
      def: a,
      level: lv,
      zoneId,
      pos: copy(pos),
      prevPos: copy(pos),
      radius: a.radius,
      speed: a.speed,
      facing: 0,
      path: [],
      home: copy(pos),
      health: a.maxHealth,
      state: 'idle',
      stateTime: 0,
      attackCooldown: 0,
      // Los hechizos empiezan a medio enfriar para que no abran todos el combate.
      spellCooldowns: a.spells.map((sp) => sp.cooldown * 0.5),
      current: a.attack,
      repathTimer: 0,
      returning: false,
      telegraph: null,
      summonerId,
      frozen: false,
      cooldownRate: 1,
      disoriented: false,
      telegraphExtra: 0,
    };
    this.list.push(e);
    return e;
  }

  get(id: number): Enemy | undefined {
    return this.list.find((e) => e.id === id);
  }

  /** Quita un enemigo de la lista (cadáveres del mundo abierto). */
  remove(id: number): void {
    const i = this.list.findIndex((e) => e.id === id);
    if (i >= 0) this.list.splice(i, 1);
  }

  aliveCount(): number {
    let n = 0;
    for (const e of this.list) if (e.state !== 'dead') n++;
    return n;
  }

  maxRadius(): number {
    let r = 0;
    for (const a of Object.values(this.def.archetypes)) r = Math.max(r, a.radius);
    return r;
  }

  /**
   * Aplica daño ya tirado. Despierta a un enemigo en Idle, lo aturde (Stagger)
   * si el golpe supera su umbral y lo mata a 0 de vida.
   */
  damage(e: Enemy, amount: number, emit: (ev: GameEvent) => void): void {
    if (e.state === 'dead') return;
    e.health = Math.max(0, e.health - amount);
    if (e.health <= 0) {
      enter(e, 'dead');
      e.path.length = 0;
      emit({ type: 'enemyDeath', enemyId: e.id, archetype: e.def.id });
      return;
    }
    if (e.def.staggerDamage > 0 && amount >= e.def.staggerDamage && e.state !== 'stagger') {
      enter(e, 'stagger');
      e.path.length = 0;
      emit({ type: 'stagger', enemyId: e.id });
      return;
    }
    if (e.state === 'idle') {
      e.returning = false;
      enter(e, 'acquire');
    }
  }

  tick(dt: number, ctx: EnemyContext): void {
    let budget = this.def.maxRepathsPerTick;
    const useRepath = (): boolean => {
      if (budget <= 0) return false;
      budget--;
      return true;
    };
    // Las invocaciones se añaden al final de la lista y empiezan en el siguiente tick.
    const n = this.list.length;
    for (let i = 0; i < n; i++) {
      const e = this.list[i]!;
      e.prevPos = copy(e.pos);
      if (e.state === 'dead') {
        e.stateTime += dt;
        continue;
      }
      if (e.frozen) continue;
      e.stateTime += dt;
      const cdt = dt * e.cooldownRate;
      e.attackCooldown = Math.max(0, e.attackCooldown - cdt);
      for (let k = 0; k < e.spellCooldowns.length; k++) e.spellCooldowns[k] = Math.max(0, e.spellCooldowns[k]! - cdt);
      e.repathTimer -= dt;
      this.think(e, dt, ctx, useRepath);
    }
  }

  private think(e: Enemy, dt: number, ctx: EnemyContext, useRepath: () => boolean): void {
    const a = e.def;
    const pl = ctx.player;
    switch (e.state) {
      case 'idle': {
        if (e.returning) {
          if (e.path.length === 0 && useRepath()) e.path = ctx.pathfinder.findPath(e.pos, e.home);
          stepAlongPath(e, dt);
          if (distSq(e.pos, e.home) < 1 || e.path.length === 0) {
            e.returning = false;
            e.path.length = 0;
          }
          return;
        }
        if (pl.alive && dist(e.pos, pl.pos) <= a.sightRange && ctx.grid.lineOfSight(e.pos, pl.pos)) enter(e, 'acquire');
        return;
      }
      case 'acquire':
        face(e, pl.pos);
        if (!pl.alive) return enter(e, 'idle');
        if (e.stateTime >= a.acquireSeconds) enter(e, 'pursue');
        return;
      case 'pursue':
        return this.pursue(e, dt, ctx, useRepath);
      case 'telegraph':
        if (e.stateTime >= e.current.telegraphSeconds + e.telegraphExtra) {
          this.resolve(e, ctx);
          enter(e, 'attack');
        }
        return;
      case 'attack':
        if (e.stateTime >= e.current.attackSeconds) enter(e, 'recover');
        return;
      case 'recover':
        if (e.stateTime >= e.current.recoverSeconds) enter(e, 'pursue');
        return;
      case 'stagger':
        if (e.stateTime >= a.staggerSeconds) enter(e, 'pursue');
        return;
    }
  }

  private pursue(e: Enemy, dt: number, ctx: EnemyContext, useRepath: () => boolean): void {
    const a = e.def;
    const pl = ctx.player;
    if (!pl.alive || dist(e.pos, e.home) > a.leashRange) {
      // Soltar la correa: vuelve a casa sin mirar al jugador.
      enter(e, 'idle');
      e.returning = true;
      e.path.length = 0;
      return;
    }
    const centre = dist(e.pos, pl.pos);
    const edge = centre - e.radius - pl.radius;
    const los = ctx.grid.lineOfSight(e.pos, pl.pos);

    if (los) {
      for (let k = 0; k < a.spells.length; k++) {
        const sp = a.spells[k]!;
        if (sp.minLevel <= e.level && e.spellCooldowns[k]! <= 0 && edge <= sp.range && edge >= sp.minRange && this.canUse(e, sp, ctx)) {
          this.startTelegraph(e, ctx, sp);
          return;
        }
      }
    }
    if (los && edge <= a.attack.range && e.attackCooldown <= 0 && this.canUse(e, a.attack, ctx)) {
      this.startTelegraph(e, ctx, a.attack);
      return;
    }
    if (los && a.retreatRange > 0 && !e.disoriented && edge < a.retreatRange && centre > 1e-6) {
      // Retroceder en línea recta alejándose del jugador, deslizando por paredes.
      const step = (e.speed * dt) / centre;
      const to = { x: e.pos.x + (e.pos.x - pl.pos.x) * step, y: e.pos.y + (e.pos.y - pl.pos.y) * step };
      e.pos = slide(ctx.grid, e.pos, to);
      e.path.length = 0;
      face(e, pl.pos);
      return;
    }
    const stopAt = a.preferredRange > 0 ? a.preferredRange : a.attack.range * 0.8;
    if (los && edge <= stopAt) {
      e.path.length = 0;
      face(e, pl.pos);
      return;
    }
    if (los) {
      e.path = [copy(pl.pos)];
    } else if ((e.repathTimer <= 0 || e.path.length === 0) && useRepath()) {
      e.path = ctx.pathfinder.findPath(e.pos, pl.pos);
      e.repathTimer = this.def.repathSeconds;
    }
    stepAlongPath(e, dt);
  }

  /** El invocador no avisa si ya tiene el tope de esbirros vivos; el trampero, si no cabe otra trampa a sus pies. */
  private canUse(e: Enemy, at: EnemyAttackDef, ctx: EnemyContext): boolean {
    if (at.trap) return ctx.canPlaceTrap?.(e, at, e.pos) ?? true;
    const s = at.summon;
    return !s || this.minionsOf(e.id) < s.maxAlive;
  }

  private spendCooldown(e: Enemy, at: EnemyAttackDef): void {
    const k = e.def.spells.indexOf(at);
    if (k >= 0) e.spellCooldowns[k] = at.cooldown;
    else e.attackCooldown = at.cooldown;
  }

  minionsOf(summonerId: number): number {
    let n = 0;
    for (const m of this.list) if (m.summonerId === summonerId && m.state !== 'dead') n++;
    return n;
  }

  private startTelegraph(e: Enemy, ctx: EnemyContext, at: EnemyAttackDef): void {
    face(e, ctx.player.pos);
    e.path.length = 0;
    e.current = at;
    // Embotado: el aviso tarda más, o el lanzamiento falla y se pierde.
    const extra = ctx.castStart ? ctx.castStart(e, at) : 0;
    if (extra === null) {
      this.spendCooldown(e, at);
      enter(e, 'recover');
      return;
    }
    e.telegraphExtra = extra;
    let origin = copy(e.pos);
    if (at.placement === 'target') {
      // Área a los pies del jugador: queda fijada aquí, así que moverse la esquiva.
      origin = copy(ctx.player.pos);
    } else if (at.summon) {
      // Punto de invocación entre el invocador y el jugador, en suelo caminable.
      const d = Math.min(at.summon.distance, Math.max(0, dist(e.pos, ctx.player.pos) - ctx.player.radius - 1));
      const p = { x: e.pos.x + Math.cos(e.facing) * d, y: e.pos.y + Math.sin(e.facing) * d };
      origin = ctx.grid.walkable(p) && ctx.grid.lineOfSight(e.pos, p) ? p : copy(e.pos);
    }
    e.telegraph = { def: at.shape, origin, dir: e.facing };
    enter(e, 'telegraph');
    ctx.emit({ type: 'telegraph', enemyId: e.id });
  }

  private resolve(e: Enemy, ctx: EnemyContext): void {
    const at = e.current;
    const t = e.telegraph;
    e.telegraph = null;
    this.spendCooldown(e, at);
    if (!t) return;
    if (at.effect === 'trap') {
      ctx.placeTrap?.(e, at, t.origin);
      return;
    }
    if (at.effect === 'damage') {
      if (at.homing) {
        if (ctx.player.alive) ctx.launchHoming(e, at);
        return;
      }
      if (ctx.player.alive && shapeHitsCircle(t, ctx.player.pos, ctx.player.radius)) ctx.hitPlayer(e, at);
      return;
    }
    const s = at.summon!;
    const count = Math.min(s.count, s.maxAlive - this.minionsOf(e.id));
    let made = 0;
    for (let k = 0; k < count; k++) {
      const ang = ctx.rng.range(0, Math.PI * 2);
      const r = ctx.rng.range(0, s.spread);
      let p = { x: t.origin.x + Math.cos(ang) * r, y: t.origin.y + Math.sin(ang) * r };
      if (!ctx.grid.walkable(p)) p = copy(t.origin);
      if (!ctx.grid.walkable(p)) continue;
      // El esbirro conserva la diferencia de nivel de siempre con su invocador.
      const lv = this.baseLevel(s.archetype) + e.level - this.baseLevel(e.def.id);
      const m = this.spawn(ctx.newId(), s.archetype, p, e.id, lv, e.zoneId);
      enter(m, 'acquire');
      made++;
    }
    if (made > 0) ctx.emit({ type: 'summon', enemyId: e.id, count: made });
  }
}

function enter(e: Enemy, s: EnemyState): void {
  if (s !== 'telegraph') e.telegraphExtra = 0;
  if (s !== 'telegraph') e.telegraph = null;
  e.state = s;
  e.stateTime = 0;
}

function face(e: Enemy, p: Vec2): void {
  const dx = p.x - e.pos.x;
  const dy = p.y - e.pos.y;
  if (dx * dx + dy * dy > 1e-12) e.facing = Math.atan2(dy, dx);
}
