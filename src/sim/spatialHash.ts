// Rejilla uniforme de cubos para consultas de vecinos. Se reconstruye cada tick
// con un conteo por cubo (sin asignar memoria en régimen estable).
import type { Vec2 } from './vec2';

export class SpatialHash {
  readonly cols: number;
  readonly rows: number;
  private readonly start: Int32Array;
  private readonly count: Int32Array;
  private items = new Int32Array(64);
  private cellOfItem = new Int32Array(64);

  constructor(readonly width: number, readonly depth: number, readonly cellSize: number) {
    this.cols = Math.max(1, Math.ceil(width / cellSize));
    this.rows = Math.max(1, Math.ceil(depth / cellSize));
    this.start = new Int32Array(this.cols * this.rows + 1);
    this.count = new Int32Array(this.cols * this.rows);
  }

  private cell(x: number, y: number): number {
    const cx = Math.min(this.cols - 1, Math.max(0, Math.floor(x / this.cellSize)));
    const cy = Math.min(this.rows - 1, Math.max(0, Math.floor(y / this.cellSize)));
    return cy * this.cols + cx;
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
    const x0 = Math.max(0, Math.floor((x - r) / s));
    const x1 = Math.min(this.cols - 1, Math.floor((x + r) / s));
    const y0 = Math.max(0, Math.floor((y - r) / s));
    const y1 = Math.min(this.rows - 1, Math.floor((y + r) / s));
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const c = cy * this.cols + cx;
        const end = this.start[c]! + this.count[c]!;
        for (let k = this.start[c]!; k < end; k++) fn(this.items[k]!);
      }
    }
  }
}
