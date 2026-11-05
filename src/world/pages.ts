// Una página del mundo: todo lo que hace falta de un cuadrado de `pageMeters` para caminar
// por él y dibujarlo. Se calcula sin tocar nada compartido, así que puede hacerse en otro
// hilo y, sin él (pruebas, viajes), aquí mismo. Puro y determinista: la misma página sale
// siempre igual, en cualquier orden.
import type { RectObstacle } from '../sim/navGrid';
import { atlasToShape, type WorldContext } from './pageContext';
import { scatterRegion, type ScatterInstance } from './scatter';
import { computeSplatRegion, HeightField, terrainHeight } from './terrain';

export interface PageData {
  /** Índice de página. */
  px: number;
  pz: number;
  x0: number;
  z0: number;
  size: number;
  /** Alturas, (size + 1)² a un metro. */
  heights: Float32Array;
  /** Mezcla de suelo RGBA, `splatRes`². */
  splat: Uint8Array;
  splatRes: number;
  /** Celdas que no se pisan por mar o por región cerrada, `cells`². */
  mask: Uint8Array;
  cells: number;
  /** Troncos y rocas del azar: x, y, w, d. */
  obstacles: Float32Array;
  /** Ejemplares por tipo: x, y, z, escala, giro, tinte, tonoR, tonoG, tonoB. */
  kinds: Record<string, Float32Array>;
}

export const INSTANCE_STRIDE = 9;
/** Margen de alturas alrededor de la página, para pendientes y árboles del borde. */
const MARGIN = 8;
/** Metros de suelo por píxel de la mezcla. */
const SPLAT_METERS = 0.5;

export function pageKey(px: number, pz: number): string {
  return `${px}:${pz}`;
}

export function generatePage(ctx: WorldContext, px: number, pz: number): PageData {
  const shape = atlasToShape(ctx);
  const { terrain, vegetation, cellSize } = ctx;
  const size = ctx.bounds.pageMeters;
  const x0 = px * size;
  const z0 = pz * size;
  // Campo local con margen: da las mismas alturas que el mundo en este cuadrado.
  const span = size + 2 * MARGIN;
  const step = 1;
  const line = span + 1;
  const wide = new Float32Array(line * line);
  for (let r = 0; r < line; r++) {
    for (let c = 0; c < line; c++) wide[r * line + c] = terrainHeight(terrain, x0 - MARGIN + c * step, z0 - MARGIN + r * step, shape);
  }
  const hf = new HeightField(span, span, step, wide, x0 - MARGIN, z0 - MARGIN);
  const edge = size + 1;
  const heights = new Float32Array(edge * edge);
  for (let r = 0; r < edge; r++) heights.set(wide.subarray((r + MARGIN) * line + MARGIN, (r + MARGIN) * line + MARGIN + edge), r * edge);

  const splatRes = Math.round(size / SPLAT_METERS);
  const splat = computeSplatRegion(terrain, hf, x0, z0, size, splatRes, shape.seaLevel);

  const cells = Math.round(size / cellSize);
  const mask = new Uint8Array(cells * cells);
  const dryAbove = shape.seaLevel + 0.4;
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      const x = x0 + (c + 0.5) * cellSize;
      const z = z0 + (r + 0.5) * cellSize;
      if (hf.sample(x, z) < dryAbove || !shape.playable(x, z)) mask[r * cells + c] = 1;
    }
  }

  const scatter = scatterRegion(vegetation, terrain, hf, x0, z0, size, dryAbove);
  const kinds: Record<string, Float32Array> = {};
  for (const [id, list] of scatter.byKind) if (list.length > 0) kinds[id] = packInstances(list);
  return { px, pz, x0, z0, size, heights, splat, splatRes, mask, cells, obstacles: packObstacles(scatter.obstacles), kinds };
}

export function packInstances(list: readonly ScatterInstance[]): Float32Array {
  const out = new Float32Array(list.length * INSTANCE_STRIDE);
  list.forEach((it, i) => {
    const t = it.tone;
    out.set([it.x, it.y, it.z, it.scale, it.rotY, it.tint, t?.[0] ?? 1, t?.[1] ?? 1, t?.[2] ?? 1], i * INSTANCE_STRIDE);
  });
  return out;
}

function packObstacles(list: readonly RectObstacle[]): Float32Array {
  const out = new Float32Array(list.length * 3);
  list.forEach((o, i) => out.set([o.x, o.y, o.w], i * 3));
  return out;
}

/** Los buffers de una página, para pasarlos entre hilos sin copiarlos. */
export function pageBuffers(p: PageData): ArrayBuffer[] {
  return [p.heights, p.splat, p.mask, p.obstacles, ...Object.values(p.kinds)].map((a) => a.buffer as ArrayBuffer);
}
