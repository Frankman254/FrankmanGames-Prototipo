// Terreno de la zona: altura (sólo visual; la simulación sigue en el plano XZ)
// y mapa de mezcla (splatmap) hierba/tierra/camino. Puro: sin DOM ni render.
import type { Vec2 } from '../sim/vec2';
import { fbm, type FbmDef } from './noise';

export interface PathDef {
  width: number;
  points: Vec2[];
}

export interface FlatAreaDef {
  x: number;
  y: number;
  radius: number;
  falloff: number;
  /** Cuánta tierra se mezcla en la zona plana (0 = hierba, 1 = tierra). */
  dirt: number;
}

export interface GroundLayerDef {
  color: [number, number, number];
  /** Variación de color del ruido de la textura (0–1). */
  variation: number;
  /** Metros que cubre una repetición de la textura. */
  tileMeters: number;
}

export interface TerrainDef {
  width: number;
  depth: number;
  seed: number;
  /** Metros entre muestras de altura (y vértices de la malla). */
  heightStep: number;
  noise: FbmDef & { amplitude: number };
  borderHills: { width: number; height: number };
  paths: PathDef[];
  /** Metros a cada lado del camino que se aplanan además de su ancho. */
  pathFlatten: number;
  flatAreas: FlatAreaDef[];
  splatResolution: number;
  dirtNoise: FbmDef & { threshold: number };
  /** Pendiente (m/m) a partir de la cual el suelo pasa a tierra. */
  slopeDirt: number;
  layers: { grass: GroundLayerDef; dirt: GroundLayerDef; path: GroundLayerDef };
}

export const smoothstep = (e0: number, e1: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

function segDist(px: number, pz: number, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dz = b.y - a.y;
  const l2 = dx * dx + dz * dz;
  const t = l2 > 0 ? Math.min(1, Math.max(0, ((px - a.x) * dx + (pz - a.y) * dz) / l2)) : 0;
  return Math.hypot(px - (a.x + dx * t), pz - (a.y + dz * t));
}

/** Distancia desde (x, z) al borde del camino más cercano (negativa = dentro). */
export function pathEdgeDistance(paths: readonly PathDef[], x: number, z: number): number {
  let best = Infinity;
  for (const p of paths) {
    for (let i = 0; i + 1 < p.points.length; i++) {
      const d = segDist(x, z, p.points[i]!, p.points[i + 1]!) - p.width / 2;
      if (d < best) best = d;
    }
  }
  return best;
}

/** Peso [0, 1] de «zona aplanada» (caminos y claros). */
function flatWeight(def: TerrainDef, x: number, z: number): number {
  let w = smoothstep(def.pathFlatten, 0, pathEdgeDistance(def.paths, x, z));
  for (const a of def.flatAreas) {
    w = Math.max(w, smoothstep(a.radius + a.falloff, a.radius, Math.hypot(x - a.x, z - a.y)));
  }
  return w;
}

export class HeightField {
  readonly cols: number;
  readonly rows: number;

  constructor(readonly width: number, readonly depth: number, readonly step: number, readonly heights: Float32Array) {
    this.cols = Math.round(width / step) + 1;
    this.rows = Math.round(depth / step) + 1;
    if (heights.length !== this.cols * this.rows) throw new Error('HeightField: tamaño de alturas incorrecto');
  }

  /** Altura interpolada en (x, z); fuera de la zona se usa el borde. */
  sample(x: number, z: number): number {
    const gx = Math.min(this.cols - 1, Math.max(0, x / this.step));
    const gz = Math.min(this.rows - 1, Math.max(0, z / this.step));
    const x0 = Math.min(this.cols - 2, Math.floor(gx));
    const z0 = Math.min(this.rows - 2, Math.floor(gz));
    const fx = gx - x0;
    const fz = gz - z0;
    const h = this.heights;
    const i = z0 * this.cols + x0;
    const a = h[i]!;
    const b = h[i + 1]!;
    const c = h[i + this.cols]!;
    const d = h[i + this.cols + 1]!;
    return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
  }

  /** Pendiente (m/m) por diferencias centrales. */
  slope(x: number, z: number): number {
    const e = this.step;
    const dx = (this.sample(x + e, z) - this.sample(x - e, z)) / (2 * e);
    const dz = (this.sample(x, z + e) - this.sample(x, z - e)) / (2 * e);
    return Math.hypot(dx, dz);
  }

  /**
   * Primer corte de un rayo con el terreno (marcha a pasos de medio paso de
   * rejilla y bisección). Devuelve el punto o null si no toca el suelo en `maxT`.
   */
  raycast(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, maxT = 1000): { x: number; y: number; z: number } | null {
    const l = Math.hypot(dx, dy, dz);
    if (l < 1e-9) return null;
    dx /= l;
    dy /= l;
    dz /= l;
    const above = (t: number): number => oy + dy * t - this.sample(ox + dx * t, oz + dz * t);
    if (above(0) < 0) return null;
    const step = this.step * 0.5;
    let t0 = 0;
    for (let t = step; t <= maxT; t += step) {
      if (above(t) <= 0) {
        let lo = t0;
        let hi = t;
        for (let k = 0; k < 16; k++) {
          const mid = (lo + hi) / 2;
          if (above(mid) > 0) lo = mid;
          else hi = mid;
        }
        const x = ox + dx * hi;
        const z = oz + dz * hi;
        return { x, y: this.sample(x, z), z };
      }
      t0 = t;
    }
    return null;
  }
}

export function generateHeightField(def: TerrainDef): HeightField {
  const cols = Math.round(def.width / def.heightStep) + 1;
  const rows = Math.round(def.depth / def.heightStep) + 1;
  const h = new Float32Array(cols * rows);
  const n = def.noise;
  const lowNoise: FbmDef = { scale: n.scale * 2, octaves: 1, persistence: 1 };
  const bh = def.borderHills;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * def.heightStep;
      const z = r * def.heightStep;
      const base = (fbm(x, z, n, def.seed) - 0.5) * 2 * n.amplitude;
      // Las zonas planas tienden a una versión suave del relieve, no a y = 0.
      const flatTarget = (fbm(x, z, lowNoise, def.seed + 77) - 0.5) * n.amplitude;
      const w = flatWeight(def, x, z);
      let y = base * (1 - w) + flatTarget * w;
      const edge = Math.min(x, z, def.width - x, def.depth - z);
      if (edge < bh.width) {
        const k = 1 - edge / bh.width;
        y += bh.height * k * k * (0.6 + 0.8 * fbm(x, z, n, def.seed + 31));
      }
      h[r * cols + c] = y;
    }
  }
  return new HeightField(def.width, def.depth, def.heightStep, h);
}

/**
 * Mapa de mezcla RGBA (R = hierba, G = tierra, B = camino), fila 0 = z mínima.
 * Los pesos de cada píxel suman 255.
 */
export function computeSplat(def: TerrainDef, hf: HeightField): Uint8Array {
  const res = def.splatResolution;
  const out = new Uint8Array(res * res * 4);
  const dn = def.dirtNoise;
  for (let j = 0; j < res; j++) {
    for (let i = 0; i < res; i++) {
      const x = ((i + 0.5) / res) * def.width;
      const z = ((j + 0.5) / res) * def.depth;
      // Borde del camino irregular: el ruido desplaza la distancia ±0,4 m.
      const wobble = (fbm(x, z, dn, def.seed + 5) - 0.5) * 0.8;
      const path = smoothstep(0.5, -0.3, pathEdgeDistance(def.paths, x, z) + wobble);
      let dirt = smoothstep(def.slopeDirt * 0.7, def.slopeDirt * 1.3, hf.slope(x, z));
      dirt = Math.max(dirt, smoothstep(dn.threshold, dn.threshold + 0.08, fbm(x, z, dn, def.seed + 9)));
      for (const a of def.flatAreas) {
        dirt = Math.max(dirt, a.dirt * smoothstep(a.radius + a.falloff * 0.5, a.radius * 0.6, Math.hypot(x - a.x, z - a.y)));
      }
      dirt *= 1 - path;
      const grass = Math.max(0, 1 - path - dirt);
      const o = (j * res + i) * 4;
      const g = Math.round(grass * 255);
      const d = Math.round(dirt * 255);
      out[o] = g;
      out[o + 1] = d;
      out[o + 2] = Math.max(0, 255 - g - d);
      out[o + 3] = 255;
    }
  }
  return out;
}

/** Textura de suelo periódica (RGBA, `size`×`size`, potencia de dos) para repetir en mosaico. */
export function groundTile(layer: GroundLayerDef, size: number, seed: number): Uint8Array {
  const out = new Uint8Array(size * size * 4);
  const coarse: FbmDef = { scale: size / 4, octaves: 4, persistence: 0.55 };
  const fine: FbmDef = { scale: size / 64, octaves: 2, persistence: 0.5 };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const v = 0.65 * fbm(x, y, coarse, seed, size) + 0.35 * fbm(x, y, fine, seed + 3, size);
      const k = 1 + (v - 0.5) * 2 * layer.variation;
      const o = (y * size + x) * 4;
      out[o] = Math.min(255, Math.round(layer.color[0] * k * 255));
      out[o + 1] = Math.min(255, Math.round(layer.color[1] * k * 255));
      out[o + 2] = Math.min(255, Math.round(layer.color[2] * k * 255));
      out[o + 3] = 255;
    }
  }
  return out;
}
