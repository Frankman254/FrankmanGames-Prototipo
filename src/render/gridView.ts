// Cuadrícula de la malla de navegación alrededor del jugador (Opciones →
// Pantalla → «Mostrar la cuadrícula de movimiento», o su tecla). Celdas libres
// con líneas finas que se desvanecen con la distancia y celdas bloqueadas con
// una cruz roja. Se rehace cuando el jugador cambia de trozo, no cada fotograma.
import { Color4, MeshBuilder, Vector3, type LinesMesh, type Scene } from '@babylonjs/core';
import type { NavGrid } from '../sim/navGrid';

/** Metros alrededor del jugador que se dibujan (por defecto). */
const RADIUS = 12;
/** Cada cuánto (m) se rehace al moverse. */
const REBUILD_STEP = 3;
const LIFT = 0.05;

export class GridView {
  visible = false;
  private mesh: LinesMesh | null = null;
  private key = '';
  private grid: NavGrid | null = null;

  constructor(
    private readonly scene: Scene,
    private readonly heights: { sample(x: number, z: number): number },
    /** El editor de navegación dibuja más alrededor del pincel. */
    private readonly radius = RADIUS,
  ) {}

  sync(grid: NavGrid, x: number, z: number): void {
    if (!this.visible) {
      if (this.mesh) this.mesh.isVisible = false;
      return;
    }
    const key = `${Math.round(x / REBUILD_STEP)},${Math.round(z / REBUILD_STEP)}`;
    if (key !== this.key || grid !== this.grid || !this.mesh) {
      this.key = key;
      this.grid = grid;
      this.rebuild(grid, Math.round(x / REBUILD_STEP) * REBUILD_STEP, Math.round(z / REBUILD_STEP) * REBUILD_STEP);
    }
    this.mesh!.isVisible = true;
  }

  private rebuild(grid: NavGrid, x: number, z: number): void {
    this.mesh?.dispose();
    const s = grid.cellSize;
    const R = this.radius;
    const cx0 = Math.max(0, Math.floor((x - R) / s));
    const cx1 = Math.min(grid.cols - 1, Math.floor((x + R) / s));
    const cy0 = Math.max(0, Math.floor((z - R) / s));
    const cy1 = Math.min(grid.rows - 1, Math.floor((z + R) / s));
    const lines: Vector3[][] = [];
    const colors: Color4[][] = [];
    const p = (px: number, pz: number): Vector3 => new Vector3(px, this.heights.sample(px, pz) + LIFT, pz);
    const fade = (px: number, pz: number): number => Math.max(0, 1 - Math.hypot(px - x, pz - z) / R);
    const free = (a: number): Color4 => new Color4(0.95, 0.9, 0.7, 0.45 * a);
    const red = (a: number): Color4 => new Color4(1, 0.25, 0.2, 0.85 * a);
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const x0 = cx * s;
        const z0 = cy * s;
        const a = fade(x0 + s / 2, z0 + s / 2);
        if (a <= 0) continue;
        if (!grid.walkableCell(cx, cy)) {
          lines.push([p(x0, z0), p(x0 + s, z0 + s)], [p(x0 + s, z0), p(x0, z0 + s)]);
          colors.push([red(a), red(a)], [red(a), red(a)]);
        }
        // Borde inferior e izquierdo de cada celda (el superior/derecho lo pone la vecina).
        lines.push([p(x0, z0), p(x0 + s, z0)], [p(x0, z0), p(x0, z0 + s)]);
        colors.push([free(a), free(a)], [free(a), free(a)]);
      }
    }
    this.mesh = MeshBuilder.CreateLineSystem('navGrid', { lines, colors, useVertexAlpha: true }, this.scene);
    this.mesh.isPickable = false;
  }
}
