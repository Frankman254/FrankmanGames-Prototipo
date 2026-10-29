// Reglas de lanzamiento de habilidades del jugador (DEC-2026-004: recurso que
// se regenera + enfriamientos). Funciones puras: `World` les pasa el estado.
import type { AbilityDef } from '../data/schema';

/** Motivo por el que no se puede lanzar, en el orden en que se comprueba. */
export type CastBlock = 'dead' | 'busy' | 'target' | 'resource' | 'cooldown' | 'gcd' | 'range';

export interface CastCheck {
  resource: number;
  cost: number;
  cooldown: number;
  gcd: number;
  inRange: boolean;
}

/** puedeLanzar = recurso ≥ coste ∧ cooldown ≤ 0 ∧ GCD ≤ 0 ∧ en alcance. */
export function canCast(c: CastCheck): boolean {
  return c.resource >= c.cost && c.cooldown <= 0 && c.gcd <= 0 && c.inRange;
}

/** Primer motivo que impide lanzar, o null si `canCast` es cierto. */
export function castBlock(c: CastCheck): CastBlock | null {
  if (c.resource < c.cost) return 'resource';
  if (c.cooldown > 0) return 'cooldown';
  if (c.gcd > 0) return 'gcd';
  if (!c.inRange) return 'range';
  return null;
}

/** Estado de combate del jugador (vive en `Player`). */
export interface CombatState {
  resource: number;
  maxResource: number;
  /** Enfriamiento restante por habilidad. */
  cooldowns: Record<string, number>;
  /** Enfriamiento global restante y su duración al dispararse (para el barrido). */
  gcd: number;
  gcdTotal: number;
}

/** Lo que el HUD necesita para dibujar un hueco de habilidad. */
export interface SlotView {
  /** Fracción de enfriamiento que queda, 0..1 (barrido circular). */
  sweep: number;
  /** Segundos que quedan del enfriamiento que se muestra. */
  remaining: number;
  /** Gris: no hay recurso suficiente. */
  lacksResource: boolean;
  /** Lista salvo por el alcance. */
  ready: boolean;
}

/**
 * Barrido = el mayor entre el enfriamiento propio y el GCD, cada uno
 * relativo a su duración.
 */
export function slotView(s: CombatState, def: AbilityDef): SlotView {
  const own = s.cooldowns[def.id] ?? 0;
  let sweep = 0;
  let remaining = 0;
  if (own > 0 && def.cooldown > 0) {
    sweep = own / def.cooldown;
    remaining = own;
  }
  if (s.gcd > 0 && s.gcdTotal > 0 && s.gcd > remaining) {
    sweep = Math.max(sweep, s.gcd / s.gcdTotal);
    remaining = s.gcd;
  }
  const lacksResource = s.resource < def.resourceCost;
  return { sweep: Math.min(1, sweep), remaining, lacksResource, ready: !lacksResource && remaining <= 0 };
}
