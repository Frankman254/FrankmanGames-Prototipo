// Experiencia, niveles y botín ponderado. Funciones puras sobre los datos.
import type { Rng } from '../sim/rng';
import type { ContentDb, LootTableDef } from './contracts';

export type RewardProximity = ContentDb['progression']['rewardProximity'];

/**
 * Multiplicador por cercanía de nivel. La distancia es relativa al nivel de
 * quien progresa, para que 20 contra 10 se parezca a 100 contra 50. La rama
 * superior tiene su propio tope: un objetivo desproporcionado nunca duplica XP.
 */
export function rewardProximityMultiplier(r: RewardProximity, learnerLevel: number, targetLevel: number): number {
  const learner = Math.max(1, learnerLevel);
  const gap = (Math.max(1, targetLevel) - learner) / learner;
  if (gap === 0) return 1;
  return gap < 0
    ? 1 - r.maxPenalty * Math.tanh(-gap * r.belowSensitivity)
    : 1 + r.maxBonus * Math.tanh(gap * r.aboveSensitivity);
}

/** Aplica la cercanía y redondea una sola vez; una recompensa positiva conserva al menos 1 XP. */
export function rewardXp(baseXp: number, learnerLevel: number, targetLevel: number, r: RewardProximity): number {
  if (baseXp <= 0) return 0;
  return Math.max(1, Math.round(baseXp * rewardProximityMultiplier(r, learnerLevel, targetLevel)));
}

/** xpToNext(n) = round(base · n^exponent); 0 en el nivel máximo. */
export function xpToNext(p: ContentDb['progression'], level: number): number {
  if (level >= p.maxLevel) return 0;
  return Math.round(p.xp.base * Math.pow(level, p.xp.exponent));
}

/**
 * Suma XP y sube los niveles que toque. Devuelve el nuevo nivel/XP y cuántos
 * niveles se ganaron. En el nivel máximo la XP se queda en 0.
 */
export function addXp(p: ContentDb['progression'], level: number, xp: number, gained: number): { level: number; xp: number; levelsGained: number } {
  let l = level;
  let x = xp + Math.max(0, gained);
  let n = 0;
  while (l < p.maxLevel && x >= xpToNext(p, l)) {
    x -= xpToNext(p, l);
    l++;
    n++;
  }
  if (l >= p.maxLevel) x = 0;
  return { level: l, xp: x, levelsGained: n };
}

export interface LootDrop {
  gold: number;
  items: { itemId: string; quantity: number }[];
}

/** Elige una entrada con probabilidad ∝ peso. */
export function weightedPick<T>(rng: Rng, list: readonly T[], weight: (t: T) => number): T | null {
  let total = 0;
  for (const t of list) total += Math.max(0, weight(t));
  if (total <= 0) return null;
  let x = rng.next() * total;
  for (const t of list) {
    x -= Math.max(0, weight(t));
    if (x < 0) return t;
  }
  return list[list.length - 1] ?? null;
}

/**
 * Tira una tabla: monedas con su probabilidad y `rolls` tiradas de objeto, cada
 * una con probabilidad `chance`. Peso efectivo = peso de la entrada × `dropWeight`
 * del objeto (así la rareza pesa en todas las tablas a la vez; PROPUESTA).
 */
export function rollLoot(rng: Rng, content: ContentDb, table: LootTableDef): LootDrop {
  const out: LootDrop = { gold: 0, items: [] };
  if (table.gold.max > 0 && rng.chance(table.gold.chance)) out.gold = rng.int(table.gold.min, table.gold.max);
  for (let i = 0; i < table.rolls; i++) {
    if (!rng.chance(table.chance)) continue;
    const e = weightedPick(rng, table.entries, (en) => en.weight * (content.items[en.itemId]?.dropWeight ?? 0));
    if (!e) continue;
    const min = e.min ?? 1;
    out.items.push({ itemId: e.itemId, quantity: rng.int(min, Math.max(min, e.max ?? min)) });
  }
  return out;
}
