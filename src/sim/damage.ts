// Tirada de daño. El azar sólo varía cuánto se hace (DEC-2026-005): no hay
// tirada de acierto, así que un golpe que conecta siempre hace daño.
import type { DamageDef } from '../data/schema';
import type { Rng } from './rng';

export interface DamageRoll {
  amount: number;
  crit: boolean;
}

export function rollDamage(rng: Rng, d: DamageDef): DamageRoll {
  const base = rng.range(d.damageMin, d.damageMax);
  const crit = d.critChance > 0 && rng.next() < d.critChance;
  const amount = Math.round(base * (crit ? 1 + d.critBonus : 1));
  return { amount: Math.max(Math.round(d.damageMin), amount), crit };
}
