// Información de desarrollo en pantalla (DOM, fuera de la simulación). U11 (creador, 2026-11-08):
// tres modos. «Resumen»: FPS y tiempos en una línea, con un aviso si hay errores. «Completa»: además
// la carga, el mundo, las funciones activas y los últimos errores. «Oculta»: nada.
import { FrameStats } from '../sim/frameStats';

export const DEV_INFO_MODES = ['simple', 'full', 'off'] as const;
export type DevInfoMode = (typeof DEV_INFO_MODES)[number];

/** Últimos errores que se enseñan (los más nuevos al final). */
const MAX_ERRORS = 4;

export class PerfOverlay {
  readonly frame = new FrameStats(600);
  readonly sim = new FrameStats(600);
  readonly render = new FrameStats(600);
  private lastPaint = 0;
  private mode: DevInfoMode = 'simple';
  private readonly errors: string[] = [];
  private errorCount = 0;
  /** Líneas de carga y mundo (solo en el modo completo). */
  extra: () => string = () => '';
  /** Funciones activas: gráficos, motor, estado del personaje (solo en el modo completo). */
  features: () => string = () => '';

  constructor(private readonly el: HTMLElement) {}

  setMode(mode: DevInfoMode): void {
    this.mode = mode;
    this.el.style.display = mode === 'off' ? 'none' : '';
    this.el.classList.toggle('perf-full', mode === 'full');
    this.lastPaint = 0;
  }

  /** Apunta un error (de la página o de la consola) para enseñarlo. */
  error(message: string, atSeconds: number): void {
    this.errorCount++;
    const m = Math.floor(atSeconds / 60);
    const s = Math.floor(atSeconds % 60);
    this.errors.push(`[${m}:${String(s).padStart(2, '0')}] ${message.replace(/\s+/g, ' ').slice(0, 140)}`);
    if (this.errors.length > MAX_ERRORS) this.errors.shift();
    this.lastPaint = 0;
  }

  paint(nowMs: number): void {
    if (this.mode === 'off' || nowMs - this.lastPaint < 250) return;
    this.lastPaint = nowMs;
    const f = this.frame.mean();
    const fps = f > 0 ? (1000 / f).toFixed(0) : '--';
    const errs = this.errorCount;
    if (this.mode === 'simple') {
      this.el.textContent =
        `FPS ${fps} · ${f.toFixed(1)} ms (p95 ${this.frame.percentile(95).toFixed(1)}) · sim ${this.sim.mean().toFixed(2)} · render ${this.render.mean().toFixed(1)}` +
        (errs ? `\n⚠ ${errs} error${errs === 1 ? '' : 'es'}: ${this.errors[this.errors.length - 1] ?? ''}` : '');
      this.el.classList.toggle('perf-error', errs > 0);
      return;
    }
    const extra = this.extra();
    const features = this.features();
    this.el.textContent =
      `FPS ${fps}  frame ${f.toFixed(2)} ms (p95 ${this.frame.percentile(95).toFixed(2)}, máx ${this.frame.percentile(100).toFixed(1)})\n` +
      `sim ${this.sim.mean().toFixed(3)} ms  render ${this.render.mean().toFixed(2)} ms (p95 ${this.render.percentile(95).toFixed(2)})` +
      (features ? `\n── activo ──\n${features}` : '') +
      (extra ? `\n── carga ──\n${extra}` : '') +
      `\n── errores ──\n${errs ? this.errors.join('\n') + (errs > this.errors.length ? `\n(${errs} en total)` : '') : 'ninguno'}`;
    this.el.classList.toggle('perf-error', errs > 0);
  }
}
