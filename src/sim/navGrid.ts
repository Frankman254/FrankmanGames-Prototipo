// Rejilla de colisión invisible sobre el plano XZ. Los obstáculos se inflan con
// el radio de navegación: una celda se bloquea si *algún punto* de ella queda a
// menos de ese radio del obstáculo, así que cualquier punto de una celda libre
// (no sólo su centro) es válido para un actor de ese radio y el personaje puede
// pararse en el borde de la celda, pegado a la pared sin atravesarla.
import type { Vec2 } from './vec2';

export interface RectObstacle {
  /** Centro del rectángulo en el plano XZ. */
  x: number;
  y: number;
  w: number;
  d: number;
  /** Tronco o roca: círculo de diámetro `w` en vez de rectángulo (esquinas más justas). */
  round?: boolean;
}

/**
 * Celdas pintadas a mano en el editor (data/navpaint.json). Cada tramo es
 * `[cy, cx0, cx1]` (ambos incluidos). `cleared` gana a los obstáculos y
 * `blocked` gana a todo. Sólo vale para el `cellSize` con el que se pintó.
 */
export interface NavPaint {
  cellSize: number;
  blocked: ReadonlyArray<readonly [number, number, number]>;
  cleared: ReadonlyArray<readonly [number, number, number]>;
}

/** Lo que hace falta para la rejilla de una zona (subconjunto de `ZoneDef`). */
export interface ZoneGridDef {
  width: number;
  depth: number;
  cellSize: number;
  navRadius: number;
  obstacles: readonly RectObstacle[];
  /** Mundo por páginas: una sola rejilla para todos los `World` del exterior. */
  shared?: SharedWorld;
  navPaint?: NavPaint | undefined;
}

/**
 * Rejilla completa de una zona: obstáculos inflados, agua de los estanques
 * (no se pisa: se pesca desde la orilla) y las celdas pintadas en el editor.
 */
export function buildZoneGrid(z: ZoneGridDef, water: ReadonlyArray<{ x: number; y: number; radius: number }>): NavGrid {
  const g = z.shared?.grid ?? NavGrid.fromObstacles(z.width, z.depth, z.cellSize, z.obstacles, z.navRadius);
  if (z.shared) for (const o of z.obstacles) g.stamp(o, z.navRadius);
  for (const s of water) g.blockCircle(s.x, s.y, s.radius + z.navRadius * 0.5);
  if (z.navPaint) g.applyPaint(z.navPaint);
  return g;
}

export interface SharedWorld {
  grid: NavGrid;
  /** ¿Está cargada la página de este punto? Solo ahí hay monstruos. */
  isActive(x: number, y: number): boolean;
}

/** Valor de una celda aún sin cargar; el bit 1 es «no se pisa». */
const UNKNOWN = 2;

/** Cómo se escribe una celda: dato de página (no reserva memoria) o dato fijo (la reserva y la conserva). */
const WRITE_PAGE = 1;
const WRITE_FIXED = 2;

/**
 * Memoria por páginas del mundo grande (creador, 2026-11-10: la memoria sigue a las páginas).
 * Cada página de `pageCells`² celdas tiene su bloque, o null si no está cargada (= no se pisa).
 * Un bloque con datos fijos (obstáculos puestos a mano, agua, pintado del editor) se conserva.
 */
interface NavPaging {
  pageCells: number;
  pagesX: number;
  pagesY: number;
  blocks: (Uint8Array | null)[];
  pinned: Uint8Array;
}

export class NavGrid {
  /** Inflado con el que se marcan los obstáculos de las páginas. */
  private inflate = 0;
  readonly cols: number;
  readonly rows: number;
  private readonly dense: Uint8Array | null;
  private readonly paging: NavPaging | null;
  /** Bloque de la última `slot` (evita crear objetos en los bucles). */
  private slotBlock: Uint8Array | null = null;

  /**
   * `originX`/`originY`: esquina de la rejilla; el mundo grande empieza en coordenadas negativas.
   * Con `pageMeters` la memoria va por páginas (ver `streamed`).
   */
  constructor(readonly width: number, readonly depth: number, readonly cellSize: number, readonly originX = 0, readonly originY = 0, pageMeters = 0) {
    this.cols = Math.ceil(width / cellSize);
    this.rows = Math.ceil(depth / cellSize);
    if (pageMeters > 0) {
      const pageCells = Math.round(pageMeters / cellSize);
      if (Math.abs(pageCells * cellSize - pageMeters) > 1e-9) throw new RangeError('NavGrid: pageMeters debe ser múltiplo de cellSize');
      const pagesX = Math.ceil(this.cols / pageCells);
      const pagesY = Math.ceil(this.rows / pageCells);
      this.paging = { pageCells, pagesX, pagesY, blocks: new Array<Uint8Array | null>(pagesX * pagesY).fill(null), pinned: new Uint8Array(pagesX * pagesY) };
      this.dense = null;
    } else {
      this.paging = null;
      this.dense = new Uint8Array(this.cols * this.rows);
    }
  }

  /** 1 = bloqueada. Solo en las rejillas densas (mazmorras, interiores, pruebas); la del mundo va por páginas. */
  get blocked(): Uint8Array {
    if (!this.dense) throw new Error('NavGrid por páginas: usa cell(i) o walkableCell');
    return this.dense;
  }

  /** ¿Va por páginas? */
  get paged(): boolean {
    return this.paging !== null;
  }

  static fromObstacles(width: number, depth: number, cellSize: number, obstacles: readonly RectObstacle[], inflate: number): NavGrid {
    const g = new NavGrid(width, depth, cellSize);
    const b = g.dense!;
    for (let cy = 0; cy < g.rows; cy++) {
      for (let cx = 0; cx < g.cols; cx++) {
        const px = (cx + 0.5) * cellSize;
        const py = (cy + 0.5) * cellSize;
        if (px < inflate || py < inflate || px > width - inflate || py > depth - inflate) b[cy * g.cols + cx] = 1;
      }
    }
    for (const o of obstacles) g.stamp(o, inflate);
    return g;
  }

  /**
   * Rejilla de un mundo por páginas: lo no cargado aún no se pisa. Con `pageMeters`, la memoria
   * va por páginas alineadas con el origen: se reserva al cargar y se suelta con `releasePage`.
   */
  static streamed(width: number, depth: number, cellSize: number, originX: number, originY: number, inflate: number, pageMeters = 0): NavGrid {
    const g = new NavGrid(width, depth, cellSize, originX, originY, pageMeters);
    g.inflate = inflate;
    g.dense?.fill(UNKNOWN);
    return g;
  }

  /** Valor de la celda (cx, cy), dentro de la rejilla: 0 se pisa, bit 1 obstáculo, 2 sin cargar. */
  cellAt(cx: number, cy: number): number {
    const d = this.dense;
    if (d) return d[cy * this.cols + cx]!;
    const p = this.paging!;
    const n = p.pageCells;
    const pc = (cx / n) | 0;
    const pr = (cy / n) | 0;
    const b = p.blocks[pr * p.pagesX + pc];
    return b ? b[(cy - pr * n) * n + (cx - pc * n)]! : UNKNOWN;
  }

  /** Valor de la celda de índice `i` (lo que era `blocked[i]`). */
  cell(i: number): number {
    const d = this.dense;
    if (d) return d[i]!;
    const cx = i % this.cols;
    return this.cellAt(cx, (i - cx) / this.cols);
  }

  /**
   * Índice de (cx, cy) dentro de su bloque para escribir, que queda en `slotBlock`; -1 si no
   * hay bloque. Un dato fijo reserva el bloque si falta y lo marca para conservarlo.
   */
  private slot(cx: number, cy: number, mode: number): number {
    const d = this.dense;
    if (d) {
      this.slotBlock = d;
      return cy * this.cols + cx;
    }
    const p = this.paging!;
    const n = p.pageCells;
    const pc = (cx / n) | 0;
    const pr = (cy / n) | 0;
    const k = pr * p.pagesX + pc;
    let b = p.blocks[k] ?? null;
    if (mode === WRITE_FIXED) {
      if (!b) p.blocks[k] = b = new Uint8Array(n * n).fill(UNKNOWN);
      p.pinned[k] = 1;
    }
    this.slotBlock = b;
    return b ? (cy - pr * n) * n + (cx - pc * n) : -1;
  }

  /** Marca un obstáculo fijo. Solo recorre las celdas de su caja inflada: hay cientos de árboles y rocas. */
  stamp(o: RectObstacle, inflate = this.inflate): void {
    this.stampWith(o, inflate, WRITE_FIXED);
  }

  /**
   * Vuelve a poner todos los datos fijos del editor (obstáculos puestos a mano
   * y pintado) sobre las rejillas recién regeneradas de `rect`. Se llama después
   * de que `WorldStream` rehaga una página: la generación de páginas no conoce
   * lo que hay en el JSON del editor.
   */
  refreshFixed(fixed: readonly RectObstacle[], paint: NavPaint | null, water: ReadonlyArray<{ x: number; y: number; radius: number }>, rect: { x0: number; z0: number; x1: number; z1: number }): void {
    const s = this.cellSize;
    const pad = this.inflate + 1;
    const inRect = (x: number, y: number, hw = 0, hd = 0): boolean => x + hw + pad >= rect.x0 && x - hw - pad <= rect.x1 && y + hd + pad >= rect.z0 && y - hd - pad <= rect.z1;
    for (const o of fixed) if (inRect(o.x, o.y, o.w / 2, o.d / 2)) this.stamp(o);
    for (const w of water) if (inRect(w.x, w.y, w.radius, w.radius)) this.blockCircle(w.x, w.y, w.radius + this.inflate * 0.5);
    if (paint) this.applyPaintRect(paint, rect);
  }

  /** `applyPaint` pero sólo dentro de `rect` (tras regenerar una página). */
  private applyPaintRect(p: NavPaint, rect: { x0: number; z0: number; x1: number; z1: number }): void {
    if (Math.abs(p.cellSize - this.cellSize) > 1e-9) return;
    const cx0 = Math.max(0, Math.floor((rect.x0 - this.originX) / this.cellSize) - 1);
    const cx1 = Math.min(this.cols - 1, Math.ceil((rect.x1 - this.originX) / this.cellSize) + 1);
    const put = (spans: NavPaint['blocked'], v: number): void => {
      for (const [cy, a, b] of spans) {
        const row = cy + Math.round(-this.originY / this.cellSize);
        const shift = Math.round(-this.originX / this.cellSize);
        if (row < 0 || row >= this.rows) continue;
        for (let cx = Math.max(cx0, a + shift); cx <= Math.min(cx1, b + shift); cx++) {
          const i = this.slot(cx, row, WRITE_FIXED);
          this.slotBlock![i] = v;
        }
      }
    };
    put(p.cleared, 0);
    put(p.blocked, 1);
  }

  private stampWith(o: RectObstacle, inflate: number, mode: number): void {
    const cellSize = this.cellSize;
    const h = cellSize / 2;
    const ox = this.originX;
    const oy = this.originY;
    const x0 = Math.max(0, Math.floor((o.x - o.w / 2 - inflate - ox) / cellSize));
    const x1 = Math.min(this.cols - 1, Math.floor((o.x + o.w / 2 + inflate - ox) / cellSize));
    const y0 = Math.max(0, Math.floor((o.y - o.d / 2 - inflate - oy) / cellSize));
    const y1 = Math.min(this.rows - 1, Math.floor((o.y + o.d / 2 + inflate - oy) / cellSize));
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const px = ox + (cx + 0.5) * cellSize;
        const py = oy + (cy + 0.5) * cellSize;
        let d: number;
        if (o.round) {
          // Punto de la celda más cercano al centro del círculo.
          const qx = Math.min(Math.max(o.x, px - h), px + h);
          const qy = Math.min(Math.max(o.y, py - h), py + h);
          d = Math.hypot(qx - o.x, qy - o.y) - o.w / 2;
        } else {
          const dx = Math.max(Math.abs(px - o.x) - o.w / 2 - h, 0);
          const dy = Math.max(Math.abs(py - o.y) - o.d / 2 - h, 0);
          d = Math.hypot(dx, dy);
        }
        if (d < inflate || d <= 0) {
          const i = this.slot(cx, cy, mode);
          if (i >= 0) this.slotBlock![i]! |= 1;
        }
      }
    }
  }

  /**
   * Abre una página: quita «sin cargar» y marca su mar y sus plantas. Lo ya marcado (por sus
   * vecinas o por datos fijos) se queda. En la rejilla por páginas, los troncos que sobresalen
   * solo marcan páginas con memoria; al llegar una vecina se le vuelven a marcar (`stampObstacles`).
   */
  applyPage(x0: number, z0: number, cells: number, mask: Uint8Array, obstacles: Float32Array, _size: number): void {
    const c0 = Math.round((x0 - this.originX) / this.cellSize);
    const r0 = Math.round((z0 - this.originY) / this.cellSize);
    const p = this.paging;
    if (p) {
      const n = p.pageCells;
      if (cells !== n || c0 % n !== 0 || r0 % n !== 0) throw new RangeError('NavGrid: la página no cuadra con los bloques');
      const k = (r0 / n) * p.pagesX + c0 / n;
      let b = p.blocks[k] ?? null;
      if (!b) p.blocks[k] = b = new Uint8Array(n * n).fill(UNKNOWN);
      for (let i = 0; i < n * n; i++) b[i] = (b[i]! & 1) | mask[i]!;
    } else {
      const blocked = this.dense!;
      for (let r = 0; r < cells; r++) {
        const row = (r0 + r) * this.cols + c0;
        for (let c = 0; c < cells; c++) blocked[row + c] = (blocked[row + c]! & 1) | mask[r * cells + c]!;
      }
    }
    this.stampObstacles(obstacles);
  }

  /** Troncos y rocas de una página (x, y, diámetro, de tres en tres): solo marcan lo que tiene memoria. */
  stampObstacles(obstacles: Float32Array): void {
    for (let i = 0; i < obstacles.length; i += 3) {
      const w = obstacles[i + 2]!;
      this.stampWith({ x: obstacles[i]!, y: obstacles[i + 1]!, w, d: w, round: true }, this.inflate, WRITE_PAGE);
    }
  }

  /**
   * Suelta la memoria de la página con esquina (x0, z0), que vuelve a «sin cargar». No suelta
   * las que guardan datos fijos. Devuelve si se soltó (entonces hay que volver a aplicarla).
   */
  releasePage(x0: number, z0: number): boolean {
    const p = this.paging;
    if (!p) return false;
    const n = p.pageCells;
    const pc = Math.round((x0 - this.originX) / this.cellSize) / n;
    const pr = Math.round((z0 - this.originY) / this.cellSize) / n;
    if (!Number.isInteger(pc) || !Number.isInteger(pr) || pc < 0 || pr < 0 || pc >= p.pagesX || pr >= p.pagesY) return false;
    const k = pr * p.pagesX + pc;
    if (p.pinned[k] || !p.blocks[k]) return false;
    p.blocks[k] = null;
    return true;
  }

  /**
   * Olvida por completo la página con esquina (x0, z0): sus celdas vuelven a
   * «sin cargar», incluidos los datos fijos que había encima. Para el editor,
   * que la re-aplica después con los datos nuevos (el repintado completo vive
   * en `WorldStream.invalidateLoaded`). Devuelve si había memoria que borrar.
   */
  forgetPage(x0: number, z0: number): boolean {
    const p = this.paging;
    if (!p) return false;
    const n = p.pageCells;
    const pc = Math.round((x0 - this.originX) / this.cellSize) / n;
    const pr = Math.round((z0 - this.originY) / this.cellSize) / n;
    if (!Number.isInteger(pc) || !Number.isInteger(pr) || pc < 0 || pr < 0 || pc >= p.pagesX || pr >= p.pagesY) return false;
    const k = pr * p.pagesX + pc;
    if (!p.blocks[k]) return false;
    p.blocks[k]!.fill(UNKNOWN);
    return true;
  }

  /** Bytes reservados para las celdas (medida de memoria). */
  allocatedBytes(): number {
    if (this.dense) return this.dense.byteLength;
    let n = 0;
    for (const b of this.paging!.blocks) if (b) n += b.byteLength;
    return n;
  }

  /** Páginas con memoria (0 en las rejillas densas). */
  allocatedPages(): number {
    return this.paging ? this.paging.blocks.filter((b) => b !== null).length : 0;
  }

  /** Bloquea las celdas cuyo centro cae dentro del círculo (agua de un estanque). */
  blockCircle(x: number, y: number, radius: number): void {
    const s = this.cellSize;
    const ox = this.originX;
    const oy = this.originY;
    const x0 = Math.max(0, Math.floor((x - radius - ox) / s));
    const x1 = Math.min(this.cols - 1, Math.floor((x + radius - ox) / s));
    const y0 = Math.max(0, Math.floor((y - radius - oy) / s));
    const y1 = Math.min(this.rows - 1, Math.floor((y + radius - oy) / s));
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        if (Math.hypot(ox + (cx + 0.5) * s - x, oy + (cy + 0.5) * s - y) <= radius) {
          const i = this.slot(cx, cy, WRITE_FIXED);
          this.slotBlock![i]! |= 1;
        }
      }
    }
  }

  /** Aplica las celdas pintadas en el editor (se ignora si se pintó con otro tamaño de celda). */
  applyPaint(p: NavPaint): void {
    if (Math.abs(p.cellSize - this.cellSize) > 1e-9) return;
    const put = (spans: NavPaint['blocked'], v: number): void => {
      for (const [cy, a, b] of spans) {
        // Se pintó sobre la parcela: fila y columna cuentan desde (0, 0).
        const row = cy + Math.round(-this.originY / this.cellSize);
        const shift = Math.round(-this.originX / this.cellSize);
        if (row < 0 || row >= this.rows) continue;
        for (let cx = Math.max(0, a + shift); cx <= Math.min(this.cols - 1, b + shift); cx++) {
          const i = this.slot(cx, row, WRITE_FIXED);
          this.slotBlock![i] = v;
        }
      }
    };
    put(p.cleared, 0);
    put(p.blocked, 1);
  }

  /** Punto de la celda `idx` más cercano a `p` (un milímetro hacia dentro del borde). */
  clampToCell(idx: number, p: Vec2): Vec2 {
    const c = this.center(idx);
    const h = this.cellSize / 2 - 1e-3;
    return { x: Math.min(Math.max(p.x, c.x - h), c.x + h), y: Math.min(Math.max(p.y, c.y - h), c.y + h) };
  }

  index(cx: number, cy: number): number {
    return cy * this.cols + cx;
  }

  inBounds(cx: number, cy: number): boolean {
    return cx >= 0 && cy >= 0 && cx < this.cols && cy < this.rows;
  }

  walkableCell(cx: number, cy: number): boolean {
    return this.inBounds(cx, cy) && this.cellAt(cx, cy) === 0;
  }

  cellOf(p: Vec2): { cx: number; cy: number } {
    return { cx: Math.floor((p.x - this.originX) / this.cellSize), cy: Math.floor((p.y - this.originY) / this.cellSize) };
  }

  walkable(p: Vec2): boolean {
    const { cx, cy } = this.cellOf(p);
    return this.walkableCell(cx, cy);
  }

  center(idx: number): Vec2 {
    const cx = idx % this.cols;
    const cy = (idx - cx) / this.cols;
    return { x: this.originX + (cx + 0.5) * this.cellSize, y: this.originY + (cy + 0.5) * this.cellSize };
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
  lineOfSight(from: Vec2, to: Vec2): boolean {
    const s = this.cellSize;
    const a = { x: from.x - this.originX, y: from.y - this.originY };
    const b = { x: to.x - this.originX, y: to.y - this.originY };
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
