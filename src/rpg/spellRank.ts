// Rango automático por nivel — función pura sin dependencias de DOM ni Babylon.
// Fórmula: para un hechizo aprendido en U, con nivel máximo M y factores
// [f1, f2, …], el rango r se alcanza en U + ceil((M−U)·f[r−1]).
// El rango efectivo es el mayor entre el guardado y el automático.

/** Factores de rango automático por maxRank (leídos de progression.json). */
export interface SpellRankConfig {
  /** Factores para hechizos con maxRank 5: [rango2, rango3, rango4, rango5]. */
  '5'?: number[];
  /** Factores para hechizos con maxRank 3: [rango2, rango3]. */
  '3'?: number[];
}

/**
 * Calcula el rango automático de un hechizo según el nivel del personaje.
 *
 * @param def - Definición del hechizo (necesita unlockLevel y maxRank).
 * @param level - Nivel actual del personaje.
 * @param maxLevel - Nivel máximo del juego (de progression.json).
 * @param cfg - Factores de rango por maxRank.
 * @returns El rango automático (1 si el nivel es menor que el de aprendizaje).
 */
export function rankAtLevel(
  def: { unlockLevel?: number; maxRank: number },
  level: number,
  maxLevel: number,
  cfg: SpellRankConfig
): number {
  const U = def.unlockLevel ?? 1;
  const M = maxLevel;
  if (level < U) return 1;
  if (def.maxRank <= 1) return 1;

  const key = String(def.maxRank) as '5' | '3';
  const factors = cfg[key];
  if (!factors || factors.length === 0) return 1;

  // El rango r se alcanza en U + ceil((M−U)·f[r−1]).
  // Recorremos los factores y devolvemos el mayor rango alcanzado.
  let rank = 1;
  for (let i = 0; i < factors.length; i++) {
    const f = factors[i];
    if (f === undefined) continue;
    const threshold = U + Math.ceil((M - U) * f);
    if (level >= threshold) {
      rank = i + 2; // i=0 → rango 2, i=1 → rango 3, etc.
    } else {
      break;
    }
  }
  return Math.min(rank, def.maxRank);
}

/**
 * Rango efectivo: el mayor entre el guardado (conocido) y el automático.
 * Nunca baja.
 */
export function effectiveRank(savedRank: number, autoRank: number, maxRank: number): number {
  return Math.min(Math.max(savedRank, autoRank), maxRank);
}
