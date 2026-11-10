// Forma real del mundo a partir del atlas: dónde está la costa, qué relieve grande hay y
// qué parte se puede pisar. La parcela original no cambia: el relieve grande solo crece
// al salir de ella, para que estanques, caminos y pueblo sigan a su altura. Puro.
import { atlasExtent, farHeight, isPanama, regionAt, type AtlasDef } from './atlas';

export interface WorldBounds {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  /** Regiones que ya se pueden pisar: el resto se ve pero no se entra. */
  playable: readonly string[];
  /**
   * Claros: círculos que se pisan aunque su región siga cerrada (el sitio de una Piedra
   * Pintada en una provincia sin construir). Fuera del círculo, la región manda.
   */
  clearings?: readonly Clearing[];
  pageMeters: number;
  /** Rejilla de paso: las mismas medidas que data/zone.json. */
  cellSize: number;
  navRadius: number;
}

export interface Clearing {
  id: string;
  x: number;
  z: number;
  radius: number;
}

/** ¿Se pisa este punto? Tierra de una región abierta, o de cualquier región de Panamá dentro de un claro. */
export function playableAt(atlas: AtlasDef, bounds: Pick<WorldBounds, 'playable' | 'clearings'>, x: number, z: number): boolean {
  const r = regionAt(atlas, x, z);
  if (r === null) return false;
  if (bounds.playable.includes(r.id)) return true;
  if (!isPanama(r)) return false;
  for (const c of bounds.clearings ?? []) if ((x - c.x) ** 2 + (z - c.z) ** 2 <= c.radius * c.radius) return true;
  return false;
}

export interface WorldShape {
  seaLevel: number;
  /** Relieve grande, ya atenuado dentro de la parcela. */
  macro(x: number, z: number): number;
  /** Distancia con signo a la costa (m): positiva tierra adentro. */
  coast(x: number, z: number): number;
  playable(x: number, z: number): boolean;
}

const COAST_CELL = 16;
/** Metros fuera de la parcela en los que entra el relieve grande. */
const MACRO_FADE = 80;

const smooth = (t: number): number => {
  const k = Math.min(1, Math.max(0, t));
  return k * k * (3 - 2 * k);
};

/** 0 dentro de la parcela, 1 pasados `MACRO_FADE` metros. */
export function plotFade(plot: { width: number; depth: number }, x: number, z: number): number {
  const dx = Math.max(-x, 0, x - plot.width);
  const dz = Math.max(-z, 0, z - plot.depth);
  return smooth(Math.hypot(dx, dz) / MACRO_FADE);
}

/** Distancia a la costa en una rejilla: tierra positiva, mar negativa (dos pasadas de chaflán). */
function coastField(atlas: AtlasDef): { at(x: number, z: number): number } {
  const e = atlasExtent(atlas);
  const cols = Math.ceil((e.x1 - e.x0) / COAST_CELL) + 1;
  const rows = Math.ceil((e.z1 - e.z0) / COAST_CELL) + 1;
  const land = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) land[r * cols + c] = regionAt(atlas, e.x0 + c * COAST_CELL, e.z0 + r * COAST_CELL) ? 1 : 0;
  }
  const chamfer = (inside: number): Float32Array => {
    const d = new Float32Array(cols * rows);
    for (let i = 0; i < d.length; i++) d[i] = land[i] === inside ? 1e9 : 0;
    const D = Math.SQRT2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        if (c > 0) d[i] = Math.min(d[i]!, d[i - 1]! + 1);
        if (r > 0) {
          d[i] = Math.min(d[i]!, d[i - cols]! + 1);
          if (c > 0) d[i] = Math.min(d[i]!, d[i - cols - 1]! + D);
          if (c + 1 < cols) d[i] = Math.min(d[i]!, d[i - cols + 1]! + D);
        }
      }
    }
    for (let r = rows - 1; r >= 0; r--) {
      for (let c = cols - 1; c >= 0; c--) {
        const i = r * cols + c;
        if (c + 1 < cols) d[i] = Math.min(d[i]!, d[i + 1]! + 1);
        if (r + 1 < rows) {
          d[i] = Math.min(d[i]!, d[i + cols]! + 1);
          if (c + 1 < cols) d[i] = Math.min(d[i]!, d[i + cols + 1]! + D);
          if (c > 0) d[i] = Math.min(d[i]!, d[i + cols - 1]! + D);
        }
      }
    }
    return d;
  };
  const toSea = chamfer(1);
  const toLand = chamfer(0);
  const field = new Float32Array(cols * rows);
  for (let i = 0; i < field.length; i++) field[i] = land[i] ? toSea[i]! * COAST_CELL : -toLand[i]! * COAST_CELL;
  return {
    at(x, z) {
      const gx = Math.min(cols - 1.001, Math.max(0, (x - e.x0) / COAST_CELL));
      const gz = Math.min(rows - 1.001, Math.max(0, (z - e.z0) / COAST_CELL));
      const c = Math.floor(gx);
      const r = Math.floor(gz);
      const fx = gx - c;
      const fz = gz - r;
      const i = r * cols + c;
      const a = field[i]!;
      const b = field[i + 1]!;
      const d = field[i + cols]!;
      const f = field[i + cols + 1]!;
      return a + (b - a) * fx + (d - a) * fz + (a - b - d + f) * fx * fz;
    },
  };
}

export function buildWorldShape(atlas: AtlasDef, bounds: WorldBounds, plot: { width: number; depth: number }): WorldShape {
  const field = coastField(atlas);
  return {
    seaLevel: atlas.seaLevel,
    macro: (x, z) => {
      const k = plotFade(plot, x, z);
      return k > 0 ? (Math.max(farHeight(atlas, x, z), atlas.landHeight) - atlas.landHeight) * k : 0;
    },
    coast: (x, z) => field.at(x, z),
    playable: (x, z) => playableAt(atlas, bounds, x, z),
  };
}
