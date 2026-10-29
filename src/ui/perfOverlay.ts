// Contador de FPS / frame time en pantalla (DOM, fuera de la simulación).
import { FrameStats } from '../sim/frameStats';

export class PerfOverlay {
  readonly frame = new FrameStats(240);
  readonly sim = new FrameStats(240);
  readonly render = new FrameStats(240);
  private lastPaint = 0;
  extra: () => string = () => '';

  constructor(private readonly el: HTMLElement) {}

  paint(nowMs: number): void {
    if (nowMs - this.lastPaint < 250) return;
    this.lastPaint = nowMs;
    const f = this.frame.mean();
    const extra = this.extra();
    this.el.textContent =
      `FPS ${f > 0 ? (1000 / f).toFixed(0) : '--'}  frame ${f.toFixed(2)} ms (p95 ${this.frame.percentile(95).toFixed(2)})\n` +
      `sim ${this.sim.mean().toFixed(3)} ms  render ${this.render.mean().toFixed(2)} ms (p95 ${this.render.percentile(95).toFixed(2)})` +
      (extra ? `\n${extra}` : '');
  }
}
