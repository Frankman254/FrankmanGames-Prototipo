// Ventana deslizante de duraciones (ms) para media y percentil 95.

export class FrameStats {
  private readonly samples: Float64Array;
  private count = 0;
  private head = 0;

  constructor(readonly capacity = 240) {
    this.samples = new Float64Array(capacity);
  }

  push(ms: number): void {
    this.samples[this.head] = ms;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;
  }

  get size(): number {
    return this.count;
  }

  mean(): number {
    if (this.count === 0) return 0;
    let s = 0;
    for (let i = 0; i < this.count; i++) s += this.samples[i]!;
    return s / this.count;
  }

  percentile(p: number): number {
    if (this.count === 0) return 0;
    const sorted = Array.from(this.samples.subarray(0, this.count)).sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
    return sorted[idx]!;
  }

  clear(): void {
    this.count = 0;
    this.head = 0;
  }
}
