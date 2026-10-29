// Rejilla de colisión invisible sobre el plano XZ. Los obstáculos se inflan con
// el radio de navegación, así que un camino de puntos centrales es válido para
// un actor de ese radio.
import type { Vec2 } from './vec2';

export interface RectObstacle {
  /** Centro del rectángulo en el plano XZ. */
  x: number;
  y: number;
  w: number;
  d: number;
}

export class NavGrid {
  readonly cols: number;
  readonly rows: number;
  /** 1 = bloqueada. */
  readonly blocked: Uint8Array;

  constructor(readonly width: number, readonly depth: number, readonly cellSize: number) {
    this.cols = Math.ceil(width / cellSize);
    this.rows = Math.ceil(depth / cellSize);
    this.blocked = new Uint8Array(this.cols * this.rows);
  }

  static fromObstacles(width: number, depth: number, cellSize: number, obstacles: readonly RectObstacle[], inflate: number): NavGrid {
    const g = new NavGrid(width, depth, cellSize);
    for (let cy = 0; cy < g.rows; cy++) {
      for (let cx = 0; cx < g.cols; cx++) {
        const px = (cx + 0.5) * cellSize;
        const py = (cy + 0.5) * cellSize;
        if (px < inflate || py < inflate || px > width - inflate || py > depth - inflate) g.blocked[cy * g.cols + cx] = 1;
      }
    }
    // Cada obstáculo sólo recorre las celdas de su caja inflada (zonas grandes con
    // cientos de árboles y rocas).
    for (const o of obstacles) {
      const x0 = Math.max(0, Math.floor((o.x - o.w / 2 - inflate) / cellSize));
      const x1 = Math.min(g.cols - 1, Math.floor((o.x + o.w / 2 + inflate) / cellSize));
      const y0 = Math.max(0, Math.floor((o.y - o.d / 2 - inflate) / cellSize));
      const y1 = Math.min(g.rows - 1, Math.floor((o.y + o.d / 2 + inflate) / cellSize));
      for (let cy = y0; cy <= y1; cy++) {
        for (let cx = x0; cx <= x1; cx++) {
          const dx = Math.max(Math.abs((cx + 0.5) * cellSize - o.x) - o.w / 2, 0);
          const dy = Math.max(Math.abs((cy + 0.5) * cellSize - o.y) - o.d / 2, 0);
          if (dx * dx + dy * dy < inflate * inflate) g.blocked[cy * g.cols + cx] = 1;
        }
      }
    }
    return g;
  }

  /** Bloquea las celdas cuyo centro cae dentro del círculo (agua de un estanque). */
  blockCircle(x: number, y: number, radius: number): void {
    const s = this.cellSize;
    const x0 = Math.max(0, Math.floor((x - radius) / s));
    const x1 = Math.min(this.cols - 1, Math.floor((x + radius) / s));
    const y0 = Math.max(0, Math.floor((y - radius) / s));
    const y1 = Math.min(this.rows - 1, Math.floor((y + radius) / s));
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        if (Math.hypot((cx + 0.5) * s - x, (cy + 0.5) * s - y) <= radius) this.blocked[cy * this.cols + cx] = 1;
      }
    }
  }

  index(cx: number, cy: number): number {
    return cy * this.cols + cx;
  }

  inBounds(cx: number, cy: number): boolean {
    return cx >= 0 && cy >= 0 && cx < this.cols && cy < this.rows;
  }

  walkableCell(cx: number, cy: number): boolean {
    return this.inBounds(cx, cy) && this.blocked[cy * this.cols + cx] === 0;
  }

  cellOf(p: Vec2): { cx: number; cy: number } {
    return { cx: Math.floor(p.x / this.cellSize), cy: Math.floor(p.y / this.cellSize) };
  }

  walkable(p: Vec2): boolean {
    const { cx, cy } = this.cellOf(p);
    return this.walkableCell(cx, cy);
  }

  center(idx: number): Vec2 {
    const cx = idx % this.cols;
    const cy = (idx - cx) / this.cols;
    return { x: (cx + 0.5) * this.cellSize, y: (cy + 0.5) * this.cellSize };
  }

  /**
   * Celda caminable más cercana (búsqueda en anillos), o -1 si no hay en
   * `maxRing`. Con `prefer`, los empates (p. ej. ambos lados de un muro) se
   * resuelven hacia ese punto.
   */
  nearestWalkable(p: Vec2, maxRing = 40, prefer?: Vec2): number {
    const { cx, cy } = this.cellOf(p);
    if (this.walkableCell(cx, cy)) return this.index(cx, cy);
    let best = -1;
    let bestD = Infinity;
    const tieW = 1e-3 * this.cellSize;
    let foundRing = Infinity;
    for (let r = 1; r <= maxRing; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const x = cx + dx;
          const y = cy + dy;
          if (!this.walkableCell(x, y)) continue;
          const c = this.center(this.index(x, y));
          let d = Math.hypot(c.x - p.x, c.y - p.y);
          if (prefer) d += tieW * Math.hypot(c.x - prefer.x, c.y - prefer.y);
          if (d < bestD) {
            bestD = d;
            best = this.index(x, y);
          }
        }
      }
      // Un anillo más: en distancia euclídea puede haber una celda más cercana.
      if (best >= 0 && r >= foundRing + 1) return best;
      if (best >= 0 && foundRing === Infinity) foundRing = r;
    }
    return best;
  }

  /**
   * ¿El segmento a→b sólo atraviesa celdas caminables? Recorre todas las
   * celdas que toca el segmento (DDA de Amanatides–Woo); en los cruces exactos
   * por una esquina exige que ambas vecinas estén libres.
   */
  lineOfSight(a: Vec2, b: Vec2): boolean {
    const s = this.cellSize;
    let cx = Math.floor(a.x / s);
    let cy = Math.floor(a.y / s);
    const ex = Math.floor(b.x / s);
    const ey = Math.floor(b.y / s);
    if (!this.walkableCell(cx, cy)) return false;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const stepX = dx > 0 ? 1 : -1;
    const stepY = dy > 0 ? 1 : -1;
    const tDeltaX = dx !== 0 ? Math.abs(s / dx) : Infinity;
    const tDeltaY = dy !== 0 ? Math.abs(s / dy) : Infinity;
    let tMaxX = dx !== 0 ? ((stepX > 0 ? (cx + 1) * s - a.x : a.x - cx * s) / Math.abs(dx)) : Infinity;
    let tMaxY = dy !== 0 ? ((stepY > 0 ? (cy + 1) * s - a.y : a.y - cy * s) / Math.abs(dy)) : Infinity;
    let guard = this.cols + this.rows + 4;
    // Termina al llegar a la celda final o cuando el siguiente cruce queda más allá de b.
    while ((cx !== ex || cy !== ey) && Math.min(tMaxX, tMaxY) <= 1 && guard-- > 0) {
      if (Math.abs(tMaxX - tMaxY) < 1e-12) {
        if (!this.walkableCell(cx + stepX, cy) || !this.walkableCell(cx, cy + stepY)) return false;
        cx += stepX;
        cy += stepY;
        tMaxX += tDeltaX;
        tMaxY += tDeltaY;
      } else if (tMaxX < tMaxY) {
        cx += stepX;
        tMaxX += tDeltaX;
      } else {
        cy += stepY;
        tMaxY += tDeltaY;
      }
      if (!this.walkableCell(cx, cy)) return false;
    }
    return true;
  }
}
