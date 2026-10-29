// Tubería de daño (PROPUESTA; estructura inspirada en referentes, números
// propios). El azar sólo varía cuánto se hace (DEC-2026-005): no hay tirada de
// acierto, así que un golpe que conecta siempre hace al menos 1.
//   1. base   = tirada uniforme [min, max] + scaling · estadística principal
//   2. × (1 + (estadística del elemento + power + afinidad de clase) / 100)
//   3. + damage.<elemento> plano
//   4. crítico: × (1 + critBonus) con probabilidad critChance
//   5. objetivo: − armor (sólo físico), luego × (1 − min(resist, tope) / 100)
//   6. redondeo hacia abajo en cada paso; mínimo 1
import type { Element, PrimaryStat, StatId } from '../rpg/contracts';
import type { Rng } from './rng';

export interface StatSource {
  get(stat: StatId): number;
}

/** Quien golpea: sus estadísticas y lo que aporta su clase. */
export interface AttackerProfile {
  stats: StatSource;
  mainStat: PrimaryStat | null;
  affinity: readonly Element[];
  affinityBonus: number;
}

/** Lo que tira un efecto de daño (ya escalado por rango). */
export interface HitSpec {
  min: number;
  max: number;
  element: Element;
  scaling: number;
  /** Crítico propio del hechizo o ataque, que se suma al del atacante. */
  critChance: number;
  critBonus: number;
}

export interface DamageRules {
  /** Estadística que potencia cada elemento. */
  elementStat: Record<Element, PrimaryStat>;
  /** % máximo de resistencia. */
  resistCap: number;
}

export interface DamageRoll {
  amount: number;
  crit: boolean;
}

const NO_STATS: StatSource = { get: () => 0 };

export function resolveHit(rng: Rng, hit: HitSpec, attacker: AttackerProfile | null, defender: StatSource | null, rules: DamageRules): DamageRoll {
  const a = attacker?.stats ?? NO_STATS;
  const d = defender ?? NO_STATS;
  const el = hit.element;
  const main = attacker?.mainStat ? a.get(attacker.mainStat) : 0;
  let v = Math.floor(rng.range(hit.min, hit.max) + hit.scaling * main);
  const affinity = attacker && attacker.affinity.includes(el) ? attacker.affinityBonus : 0;
  const pct = a.get(rules.elementStat[el]) + a.get('power') + affinity;
  v = Math.floor(v * Math.max(0, 1 + pct / 100));
  v = Math.floor(v + a.get(`damage.${el}`));
  const critChance = hit.critChance + a.get('critChance');
  const crit = critChance > 0 && rng.next() < critChance;
  if (crit) v = Math.floor(v * (1 + hit.critBonus + a.get('critBonus')));
  if (el === 'physical') v = Math.floor(v - d.get('armor'));
  const resist = Math.min(d.get(`resist.${el}`), rules.resistCap);
  v = Math.floor(v * (1 - resist / 100));
  return { amount: Math.max(1, v), crit };
}
