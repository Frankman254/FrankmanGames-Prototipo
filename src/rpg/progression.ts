// Experiencia, niveles y botín ponderado. Funciones puras sobre los datos.
import type { Rng } from '../sim/rng';
import type { ContentDb, LootTableDef } from './contracts';

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
