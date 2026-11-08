// Trampas tácticas (combate v3): colocación, disparo y revelado, extraídos de
// `World`. El módulo es puro (sin DOM ni Babylon): recibe un `TrapHost` estrecho
// y guarda la lista de trampas. `World` sigue siendo quien orquesta (contexto de
// efectos, actores enemigos, caché de efectos de ataque) a través del puerto;
// el contrato externo (`traps`, `trapSpot`, `placeTrap`, `visibleTraps`) no cambia.
import type { Vec2 } from './vec2';
import { copy, dist } from './vec2';
import type { GameEvent } from './events';
import type { Actor, Team } from '../rpg/actor';
import type { Effect, EffectContext, TrapSpec } from '../rpg/effects';
import type { RpgContent } from '../rpg/content';

export interface Trap {
  id: number;
  pos: Vec2;
  radius: number;
  remaining: number;
  /** Segundos hasta que puede dispararse (`tactics.json` → traps.armSeconds). */
  arming: number;
  caster: Actor;
  team: Team;
  tag: string;
  /** Efectos sobre quien la pisa. */
  effects: Effect[];
  power: number;
  /** Hora del mundo hasta la que el bando rival la ve (revelar). */
  revealedUntil: number;
}

/** Trampa tal como la ve un bando (render). */
export interface TrapView {
  id: number;
  x: number;
  y: number;
  radius: number;
  /** Del propio bando (se ve tenue) o rival revelada. */
  own: boolean;
  /** Etiqueta del hechizo o ataque que la puso (color por elemento). */
  tag: string;
}

type TrapRules = RpgContent['tactics']['traps'];

/** Lo mínimo que `TrapManager` necesita de `World`. */
export interface TrapHost {
  readonly time: number;
  readonly rules: TrapRules;
  walkable(p: Vec2): boolean;
  nextId(): number;
  pushEvent(e: GameEvent): void;
  /** Contexto de efectos con la trampa como origen: un empujón aparta de ella. */
  effectContext(caster: Actor, tag: string, at: Vec2): EffectContext;
  /** Primer actor vivo hostil a `team` que pisa un disco en `pos` de radio `radius` (se suma el radio del actor). */
  findVictim(team: Team, pos: Vec2, radius: number): Actor | null;
}

/**
 * Vida de las trampas: armarse, expirar, dispararse y revelarse. El `World`
 * construye un adaptador (`makeTrapHost`) que reenvía a la rejilla, el reloj y
 * los actores; así la lógica vive aquí y `World` sólo delega los accesos.
 */
export class TrapManager {
  readonly traps: Trap[] = [];

  constructor(private readonly host: TrapHost) {}

  /** Punto válido para una trampa de `team` (suelo pisable y lejos de las de su bando), o null. */
  spot(team: Team, at: Vec2, minSpacing: number | null): Vec2 | null {
    if (!this.host.walkable(at)) return null;
    const gap = minSpacing ?? this.host.rules.minSpacing;
    for (const t of this.traps) if (t.team === team && dist(t.pos, at) < gap) return null;
    return copy(at);
  }

  /** Pone una trampa; si el lanzador ya tiene `maxActive`, desaparecen las más viejas. */
  place(caster: Actor, tag: string, at: Vec2, spec: TrapSpec): Trap | null {
    const h = this.host;
    const pos = this.spot(caster.team, at, spec.minSpacing);
    if (!pos) {
      h.pushEvent({ type: 'trapBlocked', casterId: caster.id });
      return null;
    }
    const own = this.traps.filter((t) => t.caster === caster);
    const max = spec.maxActive ?? h.rules.maxActive;
    for (let i = 0; i <= own.length - max; i++) this.remove(own[i]!, 'replaced');
    const t: Trap = {
      id: h.nextId(),
      pos,
      radius: spec.radius,
      remaining: spec.duration,
      arming: h.rules.armSeconds,
      caster,
      team: caster.team,
      tag,
      effects: spec.effects,
      power: spec.power,
      revealedUntil: -Infinity,
    };
    this.traps.push(t);
    h.pushEvent({ type: 'trapPlaced', trapId: t.id, casterId: caster.id, team: t.team });
    return t;
  }

  remove(t: Trap, reason: 'triggered' | 'expired' | 'replaced'): void {
    const i = this.traps.indexOf(t);
    if (i < 0) return;
    this.traps.splice(i, 1);
    this.host.pushEvent({ type: 'trapGone', trapId: t.id, reason });
  }

  /** Revela las trampas rivales a ≤ radius m de `at` durante `duration` s. */
  reveal(caster: Actor, at: Vec2, radius: number, duration: number): void {
    let count = 0;
    for (const t of this.traps) {
      if (t.team === caster.team || dist(t.pos, at) > radius + t.radius) continue;
      t.revealedUntil = Math.max(t.revealedUntil, this.host.time + duration);
      count++;
    }
    this.host.pushEvent({ type: 'reveal', casterId: caster.id, x: at.x, y: at.y, radius, count });
  }

  /** Trampas que ve un bando: las suyas siempre; las rivales sólo reveladas. */
  visible(viewer: Team = 'player'): TrapView[] {
    const out: TrapView[] = [];
    for (const t of this.traps) {
      const own = t.team === viewer;
      if (own || t.revealedUntil > this.host.time) out.push({ id: t.id, x: t.pos.x, y: t.pos.y, radius: t.radius, own, tag: t.tag });
    }
    return out;
  }

  tick(dt: number): void {
    for (let i = this.traps.length - 1; i >= 0; i--) {
      const t = this.traps[i];
      if (!t) continue;
      t.remaining -= dt;
      t.arming -= dt;
      if (t.remaining <= 1e-9 || !t.caster.alive) {
        this.remove(t, 'expired');
        continue;
      }
      if (t.arming > 0) continue;
      const victim = this.host.findVictim(t.team, t.pos, t.radius);
      if (!victim) continue;
      this.remove(t, 'triggered');
      this.host.pushEvent({ type: 'trapTriggered', trapId: t.id, targetId: victim.id, x: t.pos.x, y: t.pos.y, team: t.team });
      // El origen es la trampa: un empujón aparta de ella.
      const ctx = this.host.effectContext(t.caster, t.tag, t.pos);
      for (const e of t.effects) if (victim.alive) e.apply(ctx, victim, t.power);
    }
  }
}
