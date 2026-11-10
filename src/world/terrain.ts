// Terreno de la zona: altura (sólo visual; la simulación sigue en el plano XZ)
// y mapa de mezcla (splatmap) hierba/tierra/camino. Puro: sin DOM ni render.
import type { Vec2 } from '../sim/vec2';
import { pathEdgeDistance, type PathDef } from '../sim/paths';
import { fbm, type FbmDef } from './noise';
import type { WorldBounds, WorldShape } from './shape';

const COAST_WOBBLE: FbmDef = { scale: 70, octaves: 3, persistence: 0.5 };
/** Metros tierra adentro en los que el suelo baja hacia el mar. */
const COAST_REACH = 55;

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

export interface PondDef {
  x: number;
  y: number;
  /** Radio del agua (m). */
  radius: number;
  /** Profundidad del fondo bajo la orilla (m). */
  depth: number;
  /** Ancho de la orilla que baja hasta el agua (m). */
  shore: number;
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
  /** Estanques (Slice 05, pesca): hoyo con agua y orilla de tierra. */
  ponds: PondDef[];
  splatResolution: number;
  dirtNoise: FbmDef & { threshold: number };
  /** Pendiente (m/m) a partir de la cual el suelo pasa a tierra. */
  slopeDirt: number;
  layers: { grass: GroundLayerDef; dirt: GroundLayerDef; path: GroundLayerDef };
  /** Mundo completo, por páginas. `width` y `depth` son la parcela original. */
  world?: WorldBounds;
  /** Plataformas bajo las estructuras (las deriva `loadWorldData` de `src/world/structures.ts`). */
  pads?: readonly PadDef[];
}

/**
 * Suelo a nivel bajo la huella de una estructura: dentro del rectángulo (ya con su margen)
 * el terreno queda a la altura natural del ancla; fuera, vuelve al relieve en `falloff` m.
 */
export interface PadDef {
  x: number;
  y: number;
  /** Medio ancho (X) y medio fondo (Z), margen incluido. */
  hw: number;
  hd: number;
  falloff: number;
  /** Ancla: el punto cuyo suelo natural da la altura de la plataforma. */
  ax: number;
  ay: number;
}

export const smoothstep = (e0: number, e1: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};


/** Peso [0, 1] de «zona aplanada» (caminos y claros). */
function flatWeight(def: TerrainDef, x: number, z: number): number {
  let w = smoothstep(def.pathFlatten, 0, pathEdgeDistance(def.paths, x, z));
  for (const a of def.flatAreas) {
    w = Math.max(w, smoothstep(a.radius + a.falloff, a.radius, Math.hypot(x - a.x, z - a.y)));
  }
  // Alrededor de un estanque el terreno se aplana para que el agua quede a nivel.
  for (const p of def.ponds) {
    w = Math.max(w, smoothstep(p.radius + p.shore + 6, p.radius + p.shore, Math.hypot(x - p.x, z - p.y)));
  }
  return w;
}

/** Relieve suave al que tienden las zonas planas (el de los estanques también). */
function flatTargetAt(def: TerrainDef, x: number, z: number): number {
  const n = def.noise;
  return (fbm(x, z, { scale: n.scale * 2, octaves: 1, persistence: 1 }, def.seed + 77) - 0.5) * n.amplitude;
}

/** Altura de la superficie del agua de un estanque (un poco por debajo de la orilla). */
export function pondWaterLevel(def: TerrainDef, p: PondDef): number {
  return flatTargetAt(def, p.x, p.y) - 0.3;
}

export class HeightField {
  readonly cols: number;
  readonly rows: number;

  /** `originX`/`originZ`: esquina del campo; el mundo grande empieza en coordenadas negativas. */
  constructor(readonly width: number, readonly depth: number, readonly step: number, readonly heights: Float32Array, readonly originX = 0, readonly originZ = 0) {
    this.cols = Math.round(width / step) + 1;
    this.rows = Math.round(depth / step) + 1;
    if (heights.length !== this.cols * this.rows) throw new Error('HeightField: tamaño de alturas incorrecto');
  }

  /** Altura interpolada en (x, z); fuera de la zona se usa el borde. */
  sample(x: number, z: number): number {
    const gx = Math.min(this.cols - 1, Math.max(0, (x - this.originX) / this.step));
    const gz = Math.min(this.rows - 1, Math.max(0, (z - this.originZ) / this.step));
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

  /** Copia un cuadrado de alturas ya calculado, (size + 1)², con paso de un metro. */
  writeSquare(x0: number, z0: number, size: number, data: Float32Array): void {
    const line = size + 1;
    const c0 = Math.round((x0 - this.originX) / this.step);
    const r0 = Math.round((z0 - this.originZ) / this.step);
    for (let r = 0; r < line; r++) this.heights.set(data.subarray(r * line, (r + 1) * line), (r0 + r) * this.cols + c0);
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

/** Altura de cada plataforma por terreno y forma del mundo: el suelo natural en su ancla. */
const padLevels = new WeakMap<TerrainDef, Map<WorldShape | undefined, Float64Array>>();

function padLevel(def: TerrainDef, pads: readonly PadDef[], i: number, shape?: WorldShape): number {
  let byShape = padLevels.get(def);
  if (!byShape) padLevels.set(def, (byShape = new Map()));
  let levels = byShape.get(shape);
  if (!levels) byShape.set(shape, (levels = new Float64Array(pads.length).fill(NaN)));
  let v = levels[i]!;
  if (Number.isNaN(v)) {
    const p = pads[i]!;
    levels[i] = v = naturalHeight(def, p.ax, p.ay, shape);
  }
  return v;
}

/**
 * Altura del suelo en un punto. Con `shape`, además, el relieve grande y la costa del atlas.
 * Bajo las estructuras (`def.pads`) el suelo queda a nivel, para que ninguna se entierre
 * ni flote en una ladera.
 */
export function terrainHeight(def: TerrainDef, x: number, z: number, shape?: WorldShape): number {
  const y = naturalHeight(def, x, z, shape);
  const pads = def.pads;
  if (!pads || pads.length === 0) return y;
  let top = 0;
  let sum = 0;
  let level = 0;
  for (let i = 0; i < pads.length; i++) {
    const p = pads[i]!;
    const dx = Math.abs(x - p.x) - p.hw;
    const dz = Math.abs(z - p.y) - p.hd;
    if (dx >= p.falloff || dz >= p.falloff) continue;
    const w = smoothstep(p.falloff, 0, Math.hypot(Math.max(dx, 0), Math.max(dz, 0)));
    if (w <= 0) continue;
    top = Math.max(top, w);
    sum += w;
    level += w * padLevel(def, pads, i, shape);
  }
  return top > 0 ? y + (level / sum - y) * top : y;
}

/** El relieve sin plataformas: ruido, caminos, claros, estanques, relieve grande y costa. */
export function naturalHeight(def: TerrainDef, x: number, z: number, shape?: WorldShape): number {
  const n = def.noise;
  const lowNoise: FbmDef = { scale: n.scale * 2, octaves: 1, persistence: 1 };
  const base = (fbm(x, z, n, def.seed) - 0.5) * 2 * n.amplitude;
  // Las zonas planas tienden a una versión suave del relieve, no a y = 0.
  const flatTarget = (fbm(x, z, lowNoise, def.seed + 77) - 0.5) * n.amplitude;
  const w = flatWeight(def, x, z);
  let y = base * (1 - w) + flatTarget * w;
  for (const p of def.ponds) y -= p.depth * smoothstep(p.radius + p.shore, p.radius * 0.55, Math.hypot(x - p.x, z - p.y));
  if (shape) {
    y += shape.macro(x, z);
    // La costa ondula: el contorno del atlas es de líneas rectas.
    const d = shape.coast(x, z) + (fbm(x, z, COAST_WOBBLE, def.seed + 41) - 0.5) * 90;
    if (d < COAST_REACH) y = shape.seaLevel - 4 + (y - shape.seaLevel + 4) * smoothstep(-COAST_REACH * 0.3, COAST_REACH, d);
    return y;
  }
  const bh = def.borderHills;
  const edge = Math.min(x, z, def.width - x, def.depth - z);
  if (edge < bh.width) {
    const k = 1 - edge / bh.width;
    y += bh.height * k * k * (0.6 + 0.8 * fbm(x, z, n, def.seed + 31));
  }
  return y;
}

export function generateHeightField(def: TerrainDef): HeightField {
  const cols = Math.round(def.width / def.heightStep) + 1;
  const rows = Math.round(def.depth / def.heightStep) + 1;
  const h = new Float32Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) h[r * cols + c] = terrainHeight(def, c * def.heightStep, r * def.heightStep);
  }
  return new HeightField(def.width, def.depth, def.heightStep, h);
}

/**
 * Mapa de mezcla RGBA (R = hierba, G = tierra, B = camino), fila 0 = z mínima.
 * Los pesos de cada píxel suman 255.
 */
export function computeSplat(def: TerrainDef, hf: HeightField): Uint8Array {
  return computeSplatRegion(def, hf, 0, 0, def.width, def.splatResolution, null, def.depth);
}

/** Mezcla de un trozo. `seaLevel`: la orilla pasa a arena. */
export function computeSplatRegion(def: TerrainDef, hf: HeightField, x0: number, z0: number, size: number, res: number, seaLevel: number | null, sizeZ = size): Uint8Array {
  const out = new Uint8Array(res * res * 4);
  const dn = def.dirtNoise;
  for (let j = 0; j < res; j++) {
    for (let i = 0; i < res; i++) {
      const x = x0 + ((i + 0.5) / res) * size;
      const z = z0 + ((j + 0.5) / res) * sizeZ;
      // Borde del camino irregular: el ruido desplaza la distancia ±0,4 m.
      const wobble = (fbm(x, z, dn, def.seed + 5) - 0.5) * 0.8;
      let path = smoothstep(0.5, -0.3, pathEdgeDistance(def.paths, x, z) + wobble);
      if (seaLevel !== null) path = Math.max(path, smoothstep(seaLevel + 2.6, seaLevel + 1.2, hf.sample(x, z)));
      let dirt = smoothstep(def.slopeDirt * 0.7, def.slopeDirt * 1.3, hf.slope(x, z));
      dirt = Math.max(dirt, smoothstep(dn.threshold, dn.threshold + 0.08, fbm(x, z, dn, def.seed + 9)));
      for (const a of def.flatAreas) {
        dirt = Math.max(dirt, a.dirt * smoothstep(a.radius + a.falloff * 0.5, a.radius * 0.6, Math.hypot(x - a.x, z - a.y)));
      }
      for (const p of def.ponds) dirt = Math.max(dirt, 0.85 * smoothstep(p.radius + p.shore, p.radius, Math.hypot(x - p.x, z - p.y)));
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
