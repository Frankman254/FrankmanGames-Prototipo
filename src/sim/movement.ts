// Movimiento de actores sobre la rejilla: seguir un camino y deslizar contra
// paredes cuando un empuje (separación, retroceso) intenta meterlos en ellas.
import type { NavGrid } from './navGrid';
import { copy, type Vec2 } from './vec2';

export interface Mover {
  pos: Vec2;
  speed: number;
  facing: number;
  /** Puntos pendientes; el primero es el siguiente objetivo. */
  path: Vec2[];
}

/** Avanza por `path` hasta `speed·dt` metros. Devuelve true si se movió. */
export function stepAlongPath(m: Mover, dt: number, speedScale = 1): boolean {
  let budget = m.speed * speedScale * dt;
  let moved = false;
  while (budget > 1e-9 && m.path.length > 0) {
    const wp = m.path[0]!;
    const dx = wp.x - m.pos.x;
    const dy = wp.y - m.pos.y;
    const d = Math.hypot(dx, dy);
    if (d > 1e-9) m.facing = Math.atan2(dy, dx);
    if (d <= budget) {
      m.pos = copy(wp);
      m.path.shift();
      budget -= d;
    } else {
      m.pos = { x: m.pos.x + (dx / d) * budget, y: m.pos.y + (dy / d) * budget };
      budget = 0;
    }
    moved = true;
  }
  return moved;
}

/** Mueve de `from` a `to` sin entrar en celdas bloqueadas, deslizando por ejes. */
export function slide(grid: NavGrid, from: Vec2, to: Vec2): Vec2 {
  if (grid.walkable(to)) return copy(to);
  const xOnly = { x: to.x, y: from.y };
  if (grid.walkable(xOnly)) return xOnly;
  const yOnly = { x: from.x, y: to.y };
  if (grid.walkable(yOnly)) return yOnly;
  return copy(from);
}
