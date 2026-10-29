// A* de 8 vecinos sobre `NavGrid`, sin cortar esquinas, más suavizado por
// línea de visión. Reutiliza sus buffers entre búsquedas (muchos actores
// re-planifican cada pocos ticks).
import type { NavGrid } from './navGrid';
import type { Vec2 } from './vec2';

const SQRT2 = Math.SQRT2;
const DIRS: ReadonlyArray<readonly [number, number, number]> = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, SQRT2], [1, -1, SQRT2], [-1, 1, SQRT2], [-1, -1, SQRT2],
];

class MinHeap {
  private idx: number[] = [];
  private key: number[] = [];

  get size(): number {
    return this.idx.length;
  }

  clear(): void {
    this.idx.length = 0;
    this.key.length = 0;
  }

  push(i: number, k: number): void {
    const a = this.idx;
    const ks = this.key;
    let n = a.length;
    a.push(i);
    ks.push(k);
    while (n > 0) {
      const p = (n - 1) >> 1;
      if (ks[p]! <= k) break;
      a[n] = a[p]!;
      ks[n] = ks[p]!;
      n = p;
    }
    a[n] = i;
    ks[n] = k;
  }

  pop(): number {
    const a = this.idx;
    const ks = this.key;
    const top = a[0]!;
    const lastI = a.pop()!;
    const lastK = ks.pop()!;
    const len = a.length;
    if (len > 0) {
      let n = 0;
      for (;;) {
        const l = 2 * n + 1;
        if (l >= len) break;
        const r = l + 1;
        const c = r < len && ks[r]! < ks[l]! ? r : l;
        if (ks[c]! >= lastK) break;
        a[n] = a[c]!;
        ks[n] = ks[c]!;
        n = c;
      }
      a[n] = lastI;
      ks[n] = lastK;
    }
    return top;
  }
}

export interface PathStats {
  searches: number;
  expanded: number;
}

export class Pathfinder {
  private readonly g: Float64Array;
  private readonly parent: Int32Array;
  private readonly stamp: Uint32Array;
  private readonly closed: Uint32Array;
  private gen = 0;
  private readonly open = new MinHeap();
  readonly stats: PathStats = { searches: 0, expanded: 0 };

  constructor(readonly grid: NavGrid, readonly maxExpand = 20000) {
    const n = grid.cols * grid.rows;
    this.g = new Float64Array(n);
    this.parent = new Int32Array(n);
    this.stamp = new Uint32Array(n);
    this.closed = new Uint32Array(n);
  }

  /** Índices de celda de inicio a meta (ambos incluidos), o null si no hay camino. */
  searchCells(start: number, goal: number): number[] | null {
    const grid = this.grid;
    if (grid.blocked[start] || grid.blocked[goal]) return null;
    const gen = ++this.gen;
    const cols = grid.cols;
    const gx = goal % cols;
    const gy = (goal - gx) / cols;
    const h = (i: number): number => {
      const x = i % cols;
      const dx = Math.abs(x - gx);
      const dy = Math.abs((i - x) / cols - gy);
      return dx + dy + (SQRT2 - 2) * Math.min(dx, dy);
    };
    const open = this.open;
    open.clear();
    this.g[start] = 0;
    this.parent[start] = -1;
    this.stamp[start] = gen;
    open.push(start, h(start));
    let expanded = 0;
    this.stats.searches++;

    while (open.size > 0) {
      const cur = open.pop();
      if (this.closed[cur] === gen) continue;
      this.closed[cur] = gen;
      if (cur === goal) break;
      if (++expanded > this.maxExpand) break;
      const cx = cur % cols;
      const cy = (cur - cx) / cols;
      const gc = this.g[cur]!;
      for (const [dx, dy, cost] of DIRS) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (!grid.walkableCell(nx, ny)) continue;
        // Diagonal sólo si ambas ortogonales están libres: no se corta esquina.
        if (dx !== 0 && dy !== 0 && (!grid.walkableCell(cx + dx, cy) || !grid.walkableCell(cx, cy + dy))) continue;
        const ni = ny * cols + nx;
        if (this.closed[ni] === gen) continue;
        const ng = gc + cost;
        if (this.stamp[ni] !== gen || ng < this.g[ni]!) {
          this.stamp[ni] = gen;
          this.g[ni] = ng;
          this.parent[ni] = cur;
          open.push(ni, ng + h(ni));
        }
      }
    }
    this.stats.expanded += expanded;
    if (this.closed[goal] !== gen) return null;
    const out: number[] = [];
    for (let i = goal; i !== -1; i = this.parent[i]!) out.push(i);
    return out.reverse();
  }

  /**
   * Camino en el mundo desde `from` hasta `to` (o hasta el punto alcanzable más
   * cercano si `to` está bloqueado). No incluye `from`. Lista vacía = ya está ahí
   * o no hay camino.
   */
  findPath(from: Vec2, to: Vec2): Vec2[] {
    const grid = this.grid;
    const start = grid.nearestWalkable(from);
    let goal = grid.nearestWalkable(to, 40, from);
    if (start < 0 || goal < 0) return [];
    const exactGoal = grid.walkable(to);
    if (grid.walkable(from) && exactGoal && grid.lineOfSight(from, to)) return [{ x: to.x, y: to.y }];
    let cells = this.searchCells(start, goal);
    if (!cells) {
      // Meta en otra isla: nos quedamos con la celda explorada más cercana a la meta.
      goal = this.closestReached(to);
      if (goal < 0 || goal === start) return [];
      cells = this.searchCells(start, goal);
      if (!cells) return [];
    }
    const pts = cells.map((c) => grid.center(c));
    if (exactGoal && goal === grid.nearestWalkable(to, 40, from)) pts[pts.length - 1] = { x: to.x, y: to.y };
    const startPt = grid.walkable(from) ? from : pts[0]!;
    return smoothPath(grid, startPt, pts);
  }

  private closestReached(to: Vec2): number {
    let best = -1;
    let bestD = Infinity;
    const gen = this.gen;
    for (let i = 0; i < this.closed.length; i++) {
      if (this.closed[i] !== gen) continue;
      const c = this.grid.center(i);
      const d = (c.x - to.x) ** 2 + (c.y - to.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }
}

/** Tirar de la cuerda: desde cada punto, saltar al más lejano que se vea. */
export function smoothPath(grid: NavGrid, start: Vec2, pts: readonly Vec2[]): Vec2[] {
  const out: Vec2[] = [];
  let anchor = start;
  let i = 0;
  while (i < pts.length) {
    let far = i;
    for (let j = pts.length - 1; j > i; j--) {
      if (grid.lineOfSight(anchor, pts[j]!)) {
        far = j;
        break;
      }
    }
    out.push(pts[far]!);
    anchor = pts[far]!;
    i = far + 1;
  }
  // El primer punto puede coincidir con la posición actual: no lo devolvemos.
  if (out.length > 1 && Math.abs(out[0]!.x - start.x) < 1e-9 && Math.abs(out[0]!.y - start.y) < 1e-9) out.shift();
  return out;
}
