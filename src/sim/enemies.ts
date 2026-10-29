// Enemigos con intención: máquina de estados propia
// Idle → Acquire → Pursue → Telegraph → Attack → Recover (→ Stagger) → Dead.
// Todo ataque pasa por Telegraph: el área queda fijada al empezar el aviso y
// sólo se resuelve al terminarlo, así que salir de ella a tiempo lo esquiva.
import type { ArchetypeDef, EnemiesDef } from '../data/schema';
import type { GameEvent } from './events';
import { slide, stepAlongPath } from './movement';
import type { NavGrid } from './navGrid';
import type { Pathfinder } from './pathfinder';
import type { Rng } from './rng';
import { shapeHitsCircle, type PlacedShape } from './shapes';
import { copy, dist, distSq, type Vec2 } from './vec2';

export type EnemyState = 'idle' | 'acquire' | 'pursue' | 'telegraph' | 'attack' | 'recover' | 'stagger' | 'dead';

export interface Enemy {
  id: number;
  def: ArchetypeDef;
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
  repathTimer: number;
  /** En Idle: volviendo a casa tras soltar la correa (ignora al jugador). */
  returning: boolean;
  /** Aviso en curso (sólo en Telegraph). */
  telegraph: PlacedShape | null;
  /** Invocador que lo llamó, o null. */
  summonerId: number | null;
}

/** Lo que los enemigos necesitan del mundo. */
export interface EnemyContext {
  grid: NavGrid;
  pathfinder: Pathfinder;
  rng: Rng;
  player: { id: number; pos: Vec2; radius: number; alive: boolean };
  /** Resuelve un golpe enemigo contra el jugador (la tirada la hace el mundo). */
  hitPlayer(source: Enemy): void;
  newId(): number;
  emit(e: GameEvent): void;
}

export class EnemySystem {
  readonly list: Enemy[] = [];

  constructor(private readonly def: EnemiesDef) {}

  spawn(id: number, archetype: string, pos: Vec2, summonerId: number | null = null): Enemy {
    const a = this.def.archetypes[archetype];
    if (!a) throw new Error(`arquetipo desconocido: ${archetype}`);
    const e: Enemy = {
      id,
      def: a,
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
      repathTimer: 0,
      returning: false,
      telegraph: null,
      summonerId,
    };
    this.list.push(e);
    return e;
  }

  get(id: number): Enemy | undefined {
    return this.list.find((e) => e.id === id);
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
      e.stateTime += dt;
      if (e.state === 'dead') continue;
      e.attackCooldown = Math.max(0, e.attackCooldown - dt);
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
        if (e.stateTime >= a.attack.telegraphSeconds) {
          this.resolve(e, ctx);
          enter(e, 'attack');
        }
        return;
      case 'attack':
        if (e.stateTime >= a.attack.attackSeconds) enter(e, 'recover');
        return;
      case 'recover':
        if (e.stateTime >= a.attack.recoverSeconds) enter(e, 'pursue');
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

    if (los && edge <= a.attack.range && e.attackCooldown <= 0 && this.canUseAttack(e)) {
      this.startTelegraph(e, ctx);
      return;
    }
    if (los && a.retreatRange > 0 && edge < a.retreatRange && centre > 1e-6) {
      // Retroceder en línea recta alejándose del jugador, deslizando por paredes.
      const step = (a.speed * dt) / centre;
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

  /** El invocador no avisa si ya tiene el tope de esbirros vivos. */
  private canUseAttack(e: Enemy): boolean {
    const s = e.def.attack.summon;
    return !s || this.minionsOf(e.id) < s.maxAlive;
  }

  minionsOf(summonerId: number): number {
    let n = 0;
    for (const m of this.list) if (m.summonerId === summonerId && m.state !== 'dead') n++;
    return n;
  }

  private startTelegraph(e: Enemy, ctx: EnemyContext): void {
    const at = e.def.attack;
    face(e, ctx.player.pos);
    e.path.length = 0;
    let origin = copy(e.pos);
    if (at.summon) {
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
    const at = e.def.attack;
    const t = e.telegraph;
    e.telegraph = null;
    e.attackCooldown = at.cooldown;
    if (!t) return;
    if (at.effect === 'damage') {
      if (ctx.player.alive && shapeHitsCircle(t, ctx.player.pos, ctx.player.radius)) ctx.hitPlayer(e);
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
      const m = this.spawn(ctx.newId(), s.archetype, p, e.id);
      enter(m, 'acquire');
      made++;
    }
    if (made > 0) ctx.emit({ type: 'summon', enemyId: e.id, count: made });
  }
}

function enter(e: Enemy, s: EnemyState): void {
  if (s !== 'telegraph') e.telegraph = null;
  e.state = s;
  e.stateTime = 0;
}

function face(e: Enemy, p: Vec2): void {
  const dx = p.x - e.pos.x;
  const dy = p.y - e.pos.y;
  if (dx * dx + dy * dy > 1e-12) e.facing = Math.atan2(dy, dx);
}
