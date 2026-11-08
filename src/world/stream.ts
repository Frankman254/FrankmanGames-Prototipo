// El mundo que se carga al caminar. Las páginas cercanas se piden a un generador; al llegar,
// alturas y paso se copian a la memoria común, y sus datos de dibujo se avisan a las vistas.
// Al alejarse, las vistas sueltan lo suyo. Alturas y paso se conservan: no pesan y volver
// cuesta entonces solo volver a dibujar. Puro: no sabe de render ni de hilos.
import type { NavGrid } from '../sim/navGrid';
import { generatePage, type PageData, pageKey } from './pages';
import type { WorldContext } from './pageContext';
import type { HeightField } from './terrain';

export interface PageSource {
  request(px: number, pz: number): void;
}

export interface StreamRadii {
  /** Se pide y se puebla lo que entra en este radio. */
  load: number;
  /** Se suelta lo que sale de este otro, mayor para no alternar en el borde. */
  drop: number;
  /** Peticiones a la vez. */
  inFlight: number;
}

export interface StreamListener {
  /** Para medir cuánto tarda cada uno al llegar una página. */
  name?: string;
  ready(page: PageData): void;
  released(page: PageData): void;
}

/** Presupuesto de cálculo, no regla de juego: páginas como máximo explora `update` por cuadro. */
export const MAX_SCAN_PAGES = 1024;

export class WorldStream {
  /** Multiplica las distancias de carga y suelta (en vuelo se ve más lejos). Topado por MAX_SCALE. */
  private _scale = 1;
  /** Tope del multiplicador: acota el barrido de `update` junto con el presupuesto de arriba. */
  static readonly MAX_SCALE = 2;

  private readonly active = new Map<string, PageData>();
  private readonly pending = new Set<string>();
  private readonly known = new Set<string>();
  private readonly listeners: StreamListener[] = [];
  private source: PageSource | null = null;
  readonly stats = { generated: 0, totalMs: 0, worstMs: 0 };
  /** Lo peor que tardó en el hilo principal cada paso de poner una página (F13: tirones). */
  readonly applyWorstMs: Record<string, number> = {};

  constructor(
    readonly ctx: WorldContext,
    private readonly heights: HeightField,
    private readonly grid: NavGrid,
    private readonly radii: StreamRadii,
  ) {
    const s = this.size;
    if (!(s > 0 && Number.isFinite(s))) throw new RangeError('pageMeters debe ser finito y positivo');
    if (!(this.radii.load > 0 && this.radii.drop > this.radii.load)) {
      throw new RangeError('los radios piden 0 < load < drop');
    }
    if (!Number.isInteger(this.radii.inFlight) || this.radii.inFlight < 1) {
      throw new RangeError('inFlight debe ser un entero >= 1');
    }
    const reach = Math.ceil((this.radii.load * WorldStream.MAX_SCALE) / s);
    if ((2 * reach + 1) ** 2 > MAX_SCAN_PAGES) {
      throw new RangeError(`load con el tope de escala pasa del presupuesto de ${MAX_SCAN_PAGES} páginas`);
    }
  }

  get scale(): number {
    return this._scale;
  }

  /** Fuera del rango [1, MAX_SCALE] se aprieta al borde: el barrido por cuadro queda acotado. */
  set scale(v: number) {
    this._scale = Math.min(WorldStream.MAX_SCALE, Math.max(1, Number.isFinite(v) ? v : 1));
  }

  get size(): number {
    return this.ctx.bounds.pageMeters;
  }

  get activePages(): readonly PageData[] {
    return [...this.active.values()];
  }

  get pendingCount(): number {
    return this.pending.size;
  }

  listen(l: StreamListener): void {
    this.listeners.push(l);
    for (const p of this.active.values()) l.ready(p);
  }

  setSource(source: PageSource): void {
    this.source = source;
  }

  private inBounds(px: number, pz: number): boolean {
    const b = this.ctx.bounds;
    const s = this.size;
    return px * s >= b.x0 && pz * s >= b.z0 && (px + 1) * s <= b.x1 && (pz + 1) * s <= b.z1;
  }

  private distanceTo(px: number, pz: number, x: number, z: number): number {
    const s = this.size;
    return Math.hypot(Math.max(px * s - x, 0, x - (px + 1) * s), Math.max(pz * s - z, 0, z - (pz + 1) * s));
  }

  /** Página dentro del radio de carga: se puede poblar. */
  isActive(x: number, z: number): boolean {
    return this.active.has(pageKey(Math.floor(x / this.size), Math.floor(z / this.size)));
  }

  /** Genera aquí mismo lo que falte en un rectángulo (arranque y viajes). */
  ensure(x0: number, z0: number, x1: number, z1: number): void {
    const s = this.size;
    for (let pz = Math.floor(z0 / s); pz * s < z1; pz++) {
      for (let px = Math.floor(x0 / s); px * s < x1; px++) {
        if (!this.inBounds(px, pz) || this.active.has(pageKey(px, pz))) continue;
        const started = performance.now();
        const page = generatePage(this.ctx, px, pz);
        this.note(performance.now() - started);
        this.apply(page);
      }
    }
  }

  private note(ms: number): void {
    this.stats.generated++;
    this.stats.totalMs += ms;
    this.stats.worstMs = Math.max(this.stats.worstMs, ms);
  }

  /** Llega una página del generador. */
  deliver(page: PageData, ms: number): void {
    this.note(ms);
    const key = pageKey(page.px, page.pz);
    this.pending.delete(key);
    if (this.active.has(key)) return;
    this.apply(page);
  }

  private apply(page: PageData): void {
    const key = pageKey(page.px, page.pz);
    let t = performance.now();
    const mark = (name: string): void => {
      const now = performance.now();
      this.applyWorstMs[name] = Math.max(this.applyWorstMs[name] ?? 0, Math.round((now - t) * 10) / 10);
      t = now;
    };
    this.heights.writeSquare(page.x0, page.z0, page.size, page.heights);
    if (!this.known.has(key)) {
      this.grid.applyPage(page.x0, page.z0, page.cells, page.mask, page.obstacles, this.ctx.bounds.pageMeters);
      this.known.add(key);
    }
    mark('alturas y paso');
    this.active.set(key, page);
    for (const l of this.listeners) {
      l.ready(page);
      mark(l.name ?? 'otro');
    }
  }

  update(x: number, z: number): void {
    const s = this.size;
    for (const [key, page] of this.active) {
      if (this.distanceTo(page.px, page.pz, x, z) <= this.radii.drop * this._scale) continue;
      this.active.delete(key);
      for (const l of this.listeners) l.released(page);
    }
    // Pisar una página sin cargar (un viaje) no puede esperar al otro hilo.
    const here = pageKey(Math.floor(x / s), Math.floor(z / s));
    if (!this.active.has(here) && !this.pending.has(here)) this.ensure(x, z, x + 0.001, z + 0.001);
    const source = this.source;
    if (!source) return;
    const reach = Math.ceil((this.radii.load * this._scale) / s);
    const cx = Math.floor(x / s);
    const cz = Math.floor(z / s);
    const wanted: Array<[number, number, number]> = [];
    for (let pz = cz - reach; pz <= cz + reach; pz++) {
      for (let px = cx - reach; px <= cx + reach; px++) {
        if (!this.inBounds(px, pz)) continue;
        const key = pageKey(px, pz);
        if (this.active.has(key) || this.pending.has(key)) continue;
        const d = this.distanceTo(px, pz, x, z);
        if (d <= this.radii.load * this._scale) wanted.push([d, px, pz]);
      }
    }
    wanted.sort((a, b) => a[0] - b[0]);
    for (const [, px, pz] of wanted) {
      if (this.pending.size >= this.radii.inFlight) break;
      this.pending.add(pageKey(px, pz));
      source.request(px, pz);
    }
  }
}
