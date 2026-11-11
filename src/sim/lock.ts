// Placaje y bloqueo (combate táctico): dos modos experimentales que el
// creador quiere probar ("podríamos experimentar ambos modos y ver cómo se
// sienten"). Se eligen en Opciones → Juego; las cifras y los estados que
// aplican viven en `data/rpg/tactics.json` → lock.
//
//   - body («bloqueo de cuerpo»): jugador, mascotas y enemigos ocupan su sitio
//     y nadie atraviesa a un rival; separarse andando de un rival pegado
//     aplica `lock.body.statusId` (ir más lento un rato).
//   - free («libre»): como antes (se empuja entre la gente), más un pequeño
//     placaje (`lock.free.statusId`) al empezar a alejarse andando de un rival
//     pegado.

export const LOCK_MODES = ['free', 'body'] as const;
export type LockMode = (typeof LOCK_MODES)[number];

export type TackleOutcome = 'free' | 'partial' | 'locked';

/**
 * Comparación determinista entre Placaje del retenedor y Huida de quien intenta salir (V4).
 * Ratio = (escape + 10) / (tackle + 10).
 * - ratio >= 1.75: escape limpio sin castigo ('free').
 * - 0.75 <= ratio < 1.75: penalización estándar ('partial').
 * - ratio < 0.75: retención severa ('locked').
 */
export function evaluateTackle(retainerTackle: number, moverEscape: number): TackleOutcome {
  const t = Math.max(0, retainerTackle);
  const e = Math.max(0, moverEscape);
  const ratio = (e + 10) / (t + 10);
  if (ratio >= 1.75) return 'free';
  if (ratio >= 0.75) return 'partial';
  return 'locked';
}

/** Distancia entre bordes de dos cuerpos. */
export function edgeDistance(a: { x: number; y: number }, ra: number, b: { x: number; y: number }, rb: number): number {
  return Math.hypot(a.x - b.x, a.y - b.y) - ra - rb;
}
