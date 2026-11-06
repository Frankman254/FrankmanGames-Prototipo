// Rango de niveles propio de cada monstruo y su tamaño según el nivel (F20). Puro: sin DOM.
// Cada arquetipo sale solo dentro de su rango (alrededor de su nivel base de la ficha RPG),
// aunque la franja de la zona sea más ancha; y crece o encoge un poco con el nivel.

export interface LevelRange {
  min: number;
  max: number;
}

/** `data/zones.json` → `archetypeLevels` (cifras PROPUESTA). */
export interface ArchetypeLevelsDef {
  /** Niveles por debajo del base en los que aún sale. */
  below: number;
  /** Niveles por encima del base hasta los que sale. */
  above: number;
  /** Cambio de tamaño por nivel respecto al base (0.02 = 2 %). */
  sizePerLevel: number;
  sizeMin: number;
  sizeMax: number;
  /** Rangos a mano que sustituyen al de por defecto. */
  ranges: Record<string, LevelRange>;
}

export function levelRangeOf(def: ArchetypeLevelsDef, archetype: string, base: number): LevelRange {
  const own = def.ranges[archetype];
  if (own) return own;
  return { min: Math.max(1, base - def.below), max: base + def.above };
}

/** El nivel tirado, metido en el rango (si la franja de la zona no lo toca, el extremo más cercano). */
export function clampToRange(level: number, r: LevelRange): number {
  return Math.min(r.max, Math.max(r.min, level));
}

/** Escala del modelo a ese nivel: 1 en el nivel base. */
export function sizeForLevel(def: ArchetypeLevelsDef, level: number, base: number): number {
  const s = 1 + def.sizePerLevel * (level - base);
  return Math.min(def.sizeMax, Math.max(def.sizeMin, s));
}
