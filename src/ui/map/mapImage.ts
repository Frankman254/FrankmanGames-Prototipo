// Imagen base del mapa, generada una vez de los datos del terreno: mezcla
// hierba/tierra/camino (el mismo splatmap que el suelo, a menos resolución),
// sombreado del relieve, agua de los estanques, bosque, la aldea y sus casas.
// Puro: devuelve los píxeles RGBA; el lienzo lo pone `minimap.ts`.
import { computeSplat, type HeightField, type TerrainDef } from '../../world/terrain';
import type { MapColorKey } from './mapLogic';

export interface MapImageInput {
  terrain: TerrainDef;
  heights: HeightField;
  /** Casas y demás props a mano (sólo se pintan las casas). */
  props: readonly { kind: string; x: number; y: number; w: number; d: number }[];
  /** Copas de los árboles (posición y radio aproximado en metros). */
  trees: readonly { x: number; y: number; r: number }[];
  /** Zonas seguras (la aldea), como áreas circulares o rectangulares. */
  villages: readonly ({ type: 'circle'; x: number; y: number; radius: number } | { type: 'rect'; x0: number; y0: number; x1: number; y1: number })[];
  pixelsPerMeter: number;
  colors: Record<MapColorKey, string>;
}

export interface MapImage {
  width: number;
  height: number;
  /** RGBA, fila 0 = norte (y máxima del mundo). */
  data: Uint8ClampedArray;
}

export function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function buildMapImage(inp: MapImageInput): MapImage {
  const t = inp.terrain;
  const ppm = inp.pixelsPerMeter;
  const W = Math.max(1, Math.round(t.width * ppm));
  const H = Math.max(1, Math.round(t.depth * ppm));
  // Splat cuadrado a la resolución del lado mayor (fila 0 = z mínima).
  const res = Math.max(W, H);
  const splat = computeSplat({ ...t, splatResolution: res }, inp.heights);
  const L = t.layers;
  const col = (c: [number, number, number]): [number, number, number] => [c[0] * 255, c[1] * 255, c[2] * 255];
  const grass = col(L.grass.color);
  const dirt = col(L.dirt.color);
  const path = col(L.path.color);
  const data = new Uint8ClampedArray(W * H * 4);
  const water = hexRgb(inp.colors.water);
  const waterEdge = hexRgb(inp.colors.waterEdge);
  const village = hexRgb(inp.colors.village);
  const inVillage = (x: number, z: number): boolean =>
    inp.villages.some((a) => (a.type === 'circle' ? (x - a.x) ** 2 + (z - a.y) ** 2 <= a.radius ** 2 : x >= a.x0 && x <= a.x1 && z >= a.y0 && z <= a.y1));
  const hs = inp.heights;
  for (let py = 0; py < H; py++) {
    const z = t.depth - (py + 0.5) / ppm;
    const sj = Math.min(res - 1, Math.floor((z / t.depth) * res));
    for (let px = 0; px < W; px++) {
      const x = (px + 0.5) / ppm;
      const si = Math.min(res - 1, Math.floor((x / t.width) * res));
      const so = (sj * res + si) * 4;
      const g = splat[so]! / 255;
      const d = splat[so + 1]! / 255;
      const p = splat[so + 2]! / 255;
      let r = grass[0] * g + dirt[0] * d + path[0] * p;
      let gg = grass[1] * g + dirt[1] * d + path[1] * p;
      let b = grass[2] * g + dirt[2] * d + path[2] * p;
      // Sombreado: luz del noroeste según la pendiente.
      const e = hs.step;
      const sx = (hs.sample(x + e, z) - hs.sample(x - e, z)) / (2 * e);
      const sz = (hs.sample(x, z + e) - hs.sample(x, z - e)) / (2 * e);
      const shade = Math.min(1.35, Math.max(0.6, 1 + (-sx + sz) * 0.35));
      r *= shade;
      gg *= shade;
      b *= shade;
      if (inVillage(x, z)) {
        r = r * 0.8 + village[0] * 0.2;
        gg = gg * 0.8 + village[1] * 0.2;
        b = b * 0.8 + village[2] * 0.2;
      }
      for (const pond of t.ponds) {
        const dd = Math.hypot(x - pond.x, z - pond.y);
        if (dd <= pond.radius) {
          const k = Math.min(1, (pond.radius - dd) / 1.5);
          r = waterEdge[0] + (water[0] - waterEdge[0]) * k;
          gg = waterEdge[1] + (water[1] - waterEdge[1]) * k;
          b = waterEdge[2] + (water[2] - waterEdge[2]) * k;
        }
      }
      const o = (py * W + px) * 4;
      data[o] = r;
      data[o + 1] = gg;
      data[o + 2] = b;
      data[o + 3] = 255;
    }
  }
  // Copas de los árboles: discos oscuros semitransparentes.
  const tree = hexRgb(inp.colors.tree);
  for (const tr of inp.trees) disc(data, W, H, tr.x * ppm, (t.depth - tr.y) * ppm, Math.max(0.8, tr.r * ppm), tree, 0.55);
  // Casas: rectángulo con borde.
  const house = hexRgb(inp.colors.house);
  const edge = hexRgb(inp.colors.houseEdge);
  for (const pr of inp.props) {
    if (pr.kind !== 'house') continue;
    const x0 = Math.round((pr.x - pr.w / 2) * ppm);
    const x1 = Math.round((pr.x + pr.w / 2) * ppm);
    const y0 = Math.round((t.depth - pr.y - pr.d / 2) * ppm);
    const y1 = Math.round((t.depth - pr.y + pr.d / 2) * ppm);
    for (let py = Math.max(0, y0); py < Math.min(H, y1); py++) {
      for (let px = Math.max(0, x0); px < Math.min(W, x1); px++) {
        const border = px === x0 || py === y0 || px === x1 - 1 || py === y1 - 1;
        const c = border ? edge : house;
        const o = (py * W + px) * 4;
        data[o] = c[0];
        data[o + 1] = c[1];
        data[o + 2] = c[2];
      }
    }
  }
  return { width: W, height: H, data };
}

function disc(data: Uint8ClampedArray, W: number, H: number, cx: number, cy: number, r: number, c: [number, number, number], a: number): void {
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(W - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const y1 = Math.min(H - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 > r * r) continue;
      const o = (y * W + x) * 4;
      data[o] = data[o]! * (1 - a) + c[0] * a;
      data[o + 1] = data[o + 1]! * (1 - a) + c[1] * a;
      data[o + 2] = data[o + 2]! * (1 - a) + c[2] * a;
    }
  }
}
