// Separación básica entre actores: empuje simétrico entre pares solapados y
// empuje de un actor «fijo» (el jugador) que no se mueve por ellos.
import { slide } from './movement';
import type { NavGrid } from './navGrid';
import type { SpatialHash } from './spatialHash';
import type { Vec2 } from './vec2';

export interface Body {
  pos: Vec2;
  radius: number;
}

export function separate(grid: NavGrid, hash: SpatialHash, bodies: readonly Body[], maxRadius: number, fixed?: Body): void {
  hash.rebuild(bodies);
  for (let i = 0; i < bodies.length; i++) {
    const a = bodies[i]!;
    hash.query(a.pos.x, a.pos.y, a.radius + maxRadius, (j) => {
      if (j <= i) return;
      const b = bodies[j]!;
      let dx = b.pos.x - a.pos.x;
      let dy = b.pos.y - a.pos.y;
      const minD = a.radius + b.radius;
      const d2 = dx * dx + dy * dy;
      if (d2 >= minD * minD) return;
      let d = Math.sqrt(d2);
      if (d < 1e-6) {
        // Superpuestos exactos: separar en una dirección determinista.
        dx = Math.cos(i * 2.399);
        dy = Math.sin(i * 2.399);
        d = 1;
      }
      const push = (minD - d) / 2;
      const nx = dx / d;
      const ny = dy / d;
      a.pos = slide(grid, a.pos, { x: a.pos.x - nx * push, y: a.pos.y - ny * push });
      b.pos = slide(grid, b.pos, { x: b.pos.x + nx * push, y: b.pos.y + ny * push });
    });
    if (fixed) {
      const dx = a.pos.x - fixed.pos.x;
      const dy = a.pos.y - fixed.pos.y;
      const minD = a.radius + fixed.radius;
      const d2 = dx * dx + dy * dy;
      if (d2 < minD * minD && d2 > 1e-12) {
        const d = Math.sqrt(d2);
        const push = minD - d;
        a.pos = slide(grid, a.pos, { x: a.pos.x + (dx / d) * push, y: a.pos.y + (dy / d) * push });
      }
    }
  }
}
