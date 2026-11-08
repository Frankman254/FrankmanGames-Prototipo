// Geometría de caminos: la definición y la distancia al borde, que necesitan a
// la vez el terreno (visual, `world/terrain`), la colocación de
// recursos (`sim/world`) y el mapa 2D. Pura: sin DOM ni render. Vive en `sim`
// porque `world/` ya importa de aquí (p. ej. `Rng`, `NavGrid`), nunca al revés.
import type { Vec2 } from './vec2';

export interface PathDef {
  width: number;
  points: Vec2[];
}

function segDist(px: number, pz: number, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dz = b.y - a.y;
  const l2 = dx * dx + dz * dz;
  const t = l2 > 0 ? Math.min(1, Math.max(0, ((px - a.x) * dx + (pz - a.y) * dz) / l2)) : 0;
  return Math.hypot(px - (a.x + dx * t), pz - (a.y + dz * t));
}

/** Distancia desde (x, z) al borde del camino más cercano (negativa = dentro). */
export function pathEdgeDistance(paths: readonly PathDef[], x: number, z: number): number {
  let best = Infinity;
  for (const p of paths) {
    for (let i = 0; i + 1 < p.points.length; i++) {
      const d = segDist(x, z, p.points[i]!, p.points[i + 1]!) - p.width / 2;
      if (d < best) best = d;
    }
  }
  return best;
}
