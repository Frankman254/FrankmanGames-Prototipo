// Tubería de daño (PROPUESTA; estructura inspirada en referentes, números
// propios). El azar sólo varía cuánto se hace (DEC-2026-005): no hay tirada de
// acierto, así que un golpe que conecta siempre hace al menos 1.
//   1. base   = tirada uniforme [min, max] + scaling · estadística principal
//   2. × (1 + (estadística del elemento + power + afinidad de clase) / 100)
//   3. + damage.<elemento> plano
//   4. crítico: × (1 + critBonus) con probabilidad critChance
//   5. objetivo: × (1 − min(resist.<elemento>, tope) / 100). Combate v2: no hay
//      armadura; la defensa es sólo la resistencia de cada elemento (tope en
//      datos, 50 %) y no se erosiona.
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
  let v = baseAmount(rng.range(hit.min, hit.max), hit, attacker, rules);
  const critChance = hit.critChance + a.get('critChance');
  const crit = critChance > 0 && rng.next() < critChance;
  if (crit) v = Math.floor(v * critMultiplier(hit, a));
  return { amount: afterResist(v, hit.element, d, rules), crit };
}

/** Pasos 1–3: tirada + escalado, % del atacante y daño plano del elemento. */
function baseAmount(roll: number, hit: HitSpec, attacker: AttackerProfile | null, rules: DamageRules): number {
  const a = attacker?.stats ?? NO_STATS;
  const el = hit.element;
  const main = attacker?.mainStat ? a.get(attacker.mainStat) : 0;
  let v = Math.floor(roll + hit.scaling * main);
  const affinity = attacker && attacker.affinity.includes(el) ? attacker.affinityBonus : 0;
  const pct = a.get(rules.elementStat[el]) + a.get('power') + affinity;
  v = Math.floor(v * Math.max(0, 1 + pct / 100));
  return Math.floor(v + a.get(`damage.${el}`));
}

function critMultiplier(hit: HitSpec, a: StatSource): number {
  return 1 + hit.critBonus + a.get('critBonus');
}

/** Resistencia efectiva (%) de `d` a un elemento: con tope, y negativa si le resta. */
export function effectiveResist(d: StatSource, el: Element, rules: DamageRules): number {
  return Math.min(d.get(`resist.${el}`), rules.resistCap);
}

function afterResist(v: number, el: Element, d: StatSource, rules: DamageRules): number {
  return Math.max(1, Math.floor(v * (1 - effectiveResist(d, el, rules) / 100)));
}

/** Horquilla de daño esperada (sin azar): normal y con crítico. */
export interface DamagePreview {
  min: number;
  max: number;
  critMin: number;
  critMax: number;
  /** Probabilidad de crítico (0..1) del golpe con este atacante. */
  critChance: number;
}

/**
 * Lo que haría `resolveHit` en los extremos de la tirada, tras las
 * resistencias del objetivo (para la vista previa al apuntar).
 */
export function previewHit(hit: HitSpec, attacker: AttackerProfile | null, defender: StatSource | null, rules: DamageRules): DamagePreview {
  const a = attacker?.stats ?? NO_STATS;
  const d = defender ?? NO_STATS;
  const el = hit.element;
  const raw = (roll: number): number => baseAmount(roll, hit, attacker, rules);
  // La tirada uniforme de `Rng.range` nunca llega a `max`: el tope es max − ε.
  const lo = raw(hit.min);
  const hi = raw(hit.max > hit.min ? hit.max - 1e-9 : hit.max);
  const k = critMultiplier(hit, a);
  return {
    min: afterResist(lo, el, d, rules),
    max: afterResist(hi, el, d, rules),
    critMin: afterResist(Math.floor(lo * k), el, d, rules),
    critMax: afterResist(Math.floor(hi * k), el, d, rules),
    critChance: Math.max(0, Math.min(1, hit.critChance + a.get('critChance'))),
  };
}
