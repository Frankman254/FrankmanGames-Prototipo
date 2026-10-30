// Enemigos con intención: máquina de estados propia
// Idle → Acquire → Pursue → Telegraph → Attack → Recover (→ Stagger) → Dead.
// Todo ataque pasa por Telegraph: el área queda fijada al empezar el aviso y
// sólo se resuelve al terminarlo, así que salir de ella a tiempo lo esquiva.
// Además del ataque básico cada arquetipo puede tener hechizos propios con su
// enfriamiento: en Pursue usa el primero que esté listo y a su alcance.
import type { ArchetypeDef, EnemiesDef, EnemyAttackDef } from '../data/schema';
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
}

/** Lo que los enemigos necesitan del mundo. */
export interface EnemyContext {
  grid: NavGrid;
  pathfinder: Pathfinder;
  rng: Rng;
  player: { id: number; pos: Vec2; radius: number; alive: boolean };
  /** Resuelve un golpe enemigo contra el jugador (la tirada la hace el mundo). */
  hitPlayer(source: Enemy, attack: EnemyAttackDef): void;
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
      // Los hechizos empiezan a medio enfriar para que no abran todos el combate.
      spellCooldowns: a.spells.map((sp) => sp.cooldown * 0.5),
      current: a.attack,
      repathTimer: 0,
      returning: false,
      telegraph: null,
      summonerId,
      frozen: false,
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
      if (e.state === 'dead') {
        e.stateTime += dt;
        continue;
      }
      if (e.frozen) continue;
      e.stateTime += dt;
      e.attackCooldown = Math.max(0, e.attackCooldown - dt);
      for (let k = 0; k < e.spellCooldowns.length; k++) e.spellCooldowns[k] = Math.max(0, e.spellCooldowns[k]! - dt);
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
        if (e.stateTime >= e.current.telegraphSeconds) {
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
        if (e.spellCooldowns[k]! <= 0 && edge <= sp.range && edge >= sp.minRange && this.canUse(e, sp)) {
          this.startTelegraph(e, ctx, sp);
          return;
        }
      }
    }
    if (los && edge <= a.attack.range && e.attackCooldown <= 0 && this.canUse(e, a.attack)) {
      this.startTelegraph(e, ctx, a.attack);
      return;
    }
    if (los && a.retreatRange > 0 && edge < a.retreatRange && centre > 1e-6) {
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

  /** El invocador no avisa si ya tiene el tope de esbirros vivos. */
  private canUse(e: Enemy, at: EnemyAttackDef): boolean {
    const s = at.summon;
    return !s || this.minionsOf(e.id) < s.maxAlive;
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
    const k = e.def.spells.indexOf(at);
    if (k >= 0) e.spellCooldowns[k] = at.cooldown;
    else e.attackCooldown = at.cooldown;
    if (!t) return;
    if (at.effect === 'damage') {
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
