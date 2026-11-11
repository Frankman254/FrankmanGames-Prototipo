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

/**
 * Multiplicador de XP por tamaño del grupo de enemigos en combate
 * (estilo Dofus: 1=1×, 2=1.5×, 3=2.2×, 4=3×, 5=3.6×, 6=4.2×, 7=4.7×, 8+=5.2×).
 */
export const GROUP_SIZE_MULTIPLIERS = [1.0, 1.0, 1.5, 2.2, 3.0, 3.6, 4.2, 4.7, 5.2] as const;

export function groupSizeMultiplier(count: number): number {
  if (count <= 1) return 1.0;
  if (count >= GROUP_SIZE_MULTIPLIERS.length) return GROUP_SIZE_MULTIPLIERS[GROUP_SIZE_MULTIPLIERS.length - 1]!;
  return GROUP_SIZE_MULTIPLIERS[count]!;
}

/** Aplica la cercanía de nivel, el multiplicador de grupo y redondea; una recompensa positiva conserva al menos 1 XP. */
export function rewardXp(baseXp: number, learnerLevel: number, targetLevel: number, r: RewardProximity, groupSize = 1): number {
  if (baseXp <= 0) return 0;
  const prox = rewardProximityMultiplier(r, learnerLevel, targetLevel);
  const sizeMult = groupSizeMultiplier(groupSize);
  return Math.max(1, Math.round(baseXp * prox * sizeMult));
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
 * del objeto. En V4, `discovery` (Hallazgo, de Caudal) bonifica moderadamente el peso
 * relativo de botín raro (dropWeight < 100) sin inflar oro, XP ni número de tiradas.
 */
export function rollLoot(rng: Rng, content: ContentDb, table: LootTableDef, discoveryBonus = 0): LootDrop {
  const out: LootDrop = { gold: 0, items: [] };
  if (table.gold.max > 0 && rng.chance(table.gold.chance)) out.gold = rng.int(table.gold.min, table.gold.max);
  const rareMult = 1 + Math.min(100, Math.max(0, discoveryBonus)) / 100;
  for (let i = 0; i < table.rolls; i++) {
    if (!rng.chance(table.chance)) continue;
    const e = weightedPick(rng, table.entries, (en) => {
      const it = content.items[en.itemId];
      const baseWeight = en.weight * (it?.dropWeight ?? 0);
      const isRare = (it?.dropWeight ?? 100) < 100 || (it?.rarity && it.rarity !== 'common');
      return isRare ? baseWeight * rareMult : baseWeight;
    });
    if (!e) continue;
    const min = e.min ?? 1;
    out.items.push({ itemId: e.itemId, quantity: rng.int(min, Math.max(min, e.max ?? min)) });
  }
  return out;
}
