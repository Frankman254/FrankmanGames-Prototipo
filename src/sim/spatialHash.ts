// Rejilla uniforme de cubos para consultas de vecinos. Se reconstruye cada tick
// con un conteo por cubo (sin asignar memoria en régimen estable).
import type { Vec2 } from './vec2';

/**
 * Cubos por eje como máximo. Un mundo más ancho da la vuelta (dos sitios a `MAX_AXIS` cubos
 * comparten cubo): `rebuild` recorre todos los cubos cada tick y no puede crecer con el país
 * entero. `query` puede entonces devolver algún índice lejano de más; quien consulta ya
 * comprueba la distancia, porque un cubo siempre trae vecinos de fuera del círculo.
 */
const MAX_AXIS = 512;

export class SpatialHash {
  /** Cubos del mundo entero por eje. */
  readonly cols: number;
  readonly rows: number;
  /** Cubos de la tabla (≤ MAX_AXIS por eje). */
  private readonly tCols: number;
  private readonly tRows: number;
  private readonly start: Int32Array;
  private readonly count: Int32Array;
  private items = new Int32Array(64);
  private cellOfItem = new Int32Array(64);

  constructor(readonly width: number, readonly depth: number, readonly cellSize: number, readonly originX = 0, readonly originY = 0) {
    this.cols = Math.max(1, Math.ceil(width / cellSize));
    this.rows = Math.max(1, Math.ceil(depth / cellSize));
    this.tCols = Math.min(this.cols, MAX_AXIS);
    this.tRows = Math.min(this.rows, MAX_AXIS);
    this.start = new Int32Array(this.tCols * this.tRows + 1);
    this.count = new Int32Array(this.tCols * this.tRows);
  }

  private cell(x: number, y: number): number {
    const cx = Math.min(this.cols - 1, Math.max(0, Math.floor((x - this.originX) / this.cellSize)));
    const cy = Math.min(this.rows - 1, Math.max(0, Math.floor((y - this.originY) / this.cellSize)));
    return (cy % this.tRows) * this.tCols + (cx % this.tCols);
  }

  rebuild(positions: ReadonlyArray<{ pos: Vec2 }>): void {
    const n = positions.length;
    if (this.items.length < n) {
      this.items = new Int32Array(n * 2);
      this.cellOfItem = new Int32Array(n * 2);
    }
    this.count.fill(0);
    for (let i = 0; i < n; i++) {
      const c = this.cell(positions[i]!.pos.x, positions[i]!.pos.y);
      this.cellOfItem[i] = c;
      this.count[c]!++;
    }
    let acc = 0;
    for (let c = 0; c < this.count.length; c++) {
      this.start[c] = acc;
      acc += this.count[c]!;
    }
    this.start[this.count.length] = acc;
    this.count.fill(0);
    for (let i = 0; i < n; i++) {
      const c = this.cellOfItem[i]!;
      this.items[this.start[c]! + this.count[c]!++] = i;
    }
  }

  /** Llama a `fn(i)` para cada índice cuyo cubo toca el círculo (x, y, r). */
  query(x: number, y: number, r: number, fn: (i: number) => void): void {
    const s = this.cellSize;
    const x0 = Math.max(0, Math.floor((x - r - this.originX) / s));
    const x1 = Math.min(this.cols - 1, Math.floor((x + r - this.originX) / s));
    const y0 = Math.max(0, Math.floor((y - r - this.originY) / s));
    const y1 = Math.min(this.rows - 1, Math.floor((y + r - this.originY) / s));
    // Más ancho que la tabla, cada cubo una sola vez.
    const xe = Math.min(x1, x0 + this.tCols - 1);
    const ye = Math.min(y1, y0 + this.tRows - 1);
    for (let cy = y0; cy <= ye; cy++) {
      for (let cx = x0; cx <= xe; cx++) {
        const c = (cy % this.tRows) * this.tCols + (cx % this.tCols);
        const end = this.start[c]! + this.count[c]!;
        for (let k = this.start[c]!; k < end; k++) fn(this.items[k]!);
      }
    }
  }
}
