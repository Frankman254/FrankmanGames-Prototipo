// Vista de Panamá entera en el mapa grande: silueta del atlas con sus provincias y comarcas.
// Las regiones que el personaje ya pisó se ven en color y con nombre; el resto queda en sombra.
import { atlasExtent, project, regionAt, type AtlasDef, type AtlasRegion } from '../../world/atlas';
import { drawLabel, drawMarker } from './mapDraw';
import type { Vec } from './mapLogic';

export interface AtlasFit {
  scale: number;
  /** Píxel del punto (0, 0) del mundo. */
  ox: number;
  oy: number;
}

const MARGIN = 12;

/** Encaja el atlas en un lienzo sin deformarlo. */
export function fitAtlas(a: AtlasDef, w: number, h: number): AtlasFit {
  const e = atlasExtent(a);
  const scale = Math.max(0.001, Math.min((w - MARGIN * 2) / (e.x1 - e.x0), (h - MARGIN * 2) / (e.z1 - e.z0)));
  return {
    scale,
    ox: w / 2 - ((e.x0 + e.x1) / 2) * scale,
    oy: h / 2 + ((e.z0 + e.z1) / 2) * scale,
  };
}

/** Punto del mundo a píxel: el norte (+Z) queda arriba. */
export function worldToAtlasView(f: AtlasFit, x: number, z: number): Vec {
  return { x: f.ox + x * f.scale, y: f.oy - z * f.scale };
}

/** Región bajo un píxel; null = mar. */
export function regionAtView(a: AtlasDef, f: AtlasFit, p: Vec): AtlasRegion | null {
  return regionAt(a, (p.x - f.ox) / f.scale, (f.oy - p.y) / f.scale);
}

/** Centro del anillo más grande: donde va el nombre. */
export function regionCenter(a: AtlasDef, r: AtlasRegion): { x: number; z: number } {
  let best = { x: 0, z: 0 };
  let area = -1;
  for (const ring of r.polygons) {
    let sum = 0;
    let cx = 0;
    let cz = 0;
    const pts = ring.map(([lon, lat]) => project(a, lon, lat));
    pts.forEach((p, i) => {
      const q = pts[(i + 1) % pts.length]!;
      const k = p.x * q.z - q.x * p.z;
      sum += k;
      cx += (p.x + q.x) * k;
      cz += (p.z + q.z) * k;
    });
    if (Math.abs(sum) > area && sum !== 0) {
      area = Math.abs(sum);
      best = { x: cx / (3 * sum), z: cz / (3 * sum) };
    }
  }
  return best;
}

/** Texto de la ficha lateral de una región. */
export function regionInfo(r: AtlasRegion | null, known: boolean): string {
  if (!r) return ' ';
  if (r.kind === 'pais') return `${r.official}\nFuera de Panamá: no se entra`;
  if (!known) return 'Sin descubrir';
  const levels = r.levels ? ` · niv. ${r.levels[0]}–${r.levels[1]}` : '';
  return `${r.official}${levels}\n${r.biome}`;
}

export interface PanamaDraw {
  atlas: AtlasDef;
  discovered: ReadonlySet<string>;
  hover: AtlasRegion | null;
  player: Vec | null;
  yaw: number;
  sea: string;
  playerColor: string;
}

const LAND = '#7d8a4e';
const LAND_HOVER = '#97a65f';
const UNKNOWN = '#3b4238';
const UNKNOWN_HOVER = '#4b5347';
/** F10: países vecinos, apagados, y la frontera con trazo propio. */
const NEIGHBOR = '#5d5a52';
const FRONTIER = '#d8c9a3';

/**
 * Región de cada píxel del lienzo (índice + 1; 0 = mar), con la misma regla que el juego
 * (`regionAt`: costa real fuera del recuadro a mano). Se calcula una vez por tamaño.
 */
export function regionGrid(a: AtlasDef, w: number, h: number): Int16Array {
  const key = `${w}x${h}`;
  const hit = grids.get(a);
  if (hit && hit.key === key) return hit.ids;
  const f = fitAtlas(a, w, h);
  const ids = new Int16Array(w * h);
  const index = new Map(a.regions.map((r, i) => [r, i + 1]));
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const r = regionAt(a, (px + 0.5 - f.ox) / f.scale, (f.oy - (py + 0.5)) / f.scale);
      ids[py * w + px] = r ? index.get(r)! : 0;
    }
  }
  grids.set(a, { key, ids });
  return ids;
}
const grids = new WeakMap<AtlasDef, { key: string; ids: Int16Array }>();
const rasters = new WeakMap<CanvasRenderingContext2D, HTMLCanvasElement>();

const rgb = (ctx: CanvasRenderingContext2D, color: string): [number, number, number] => {
  ctx.fillStyle = color;
  const c = String(ctx.fillStyle);
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(c);
  return m ? [parseInt(m[1]!, 16), parseInt(m[2]!, 16), parseInt(m[3]!, 16)] : [40, 80, 120];
};

export function drawPanama(ctx: CanvasRenderingContext2D, d: PanamaDraw, w: number, h: number): void {
  const a = d.atlas;
  const f = fitAtlas(a, w, h);
  w = Math.max(1, Math.floor(w));
  h = Math.max(1, Math.floor(h));
  const ids = regionGrid(a, w, h);
  // Color de cada región y de sus bordes: provincias, comarcas y la frontera con los vecinos.
  const fill: [number, number, number][] = [rgb(ctx, d.sea)];
  for (const r of a.regions) {
    const known = d.discovered.has(r.id);
    const hot = d.hover?.id === r.id;
    fill.push(rgb(ctx, r.kind === 'pais' ? NEIGHBOR : known ? (hot ? LAND_HOVER : LAND) : hot ? UNKNOWN_HOVER : UNKNOWN));
  }
  const border = rgb(ctx, '#10120c');
  const frontier = rgb(ctx, FRONTIER);
  const foreign = (i: number): boolean => i > 0 && a.regions[i - 1]!.kind === 'pais';
  const img = ctx.createImageData(w, h);
  const px = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = y * w + x;
      const id = ids[k]!;
      let c = fill[id]!;
      const right = x + 1 < w ? ids[k + 1]! : id;
      const down = y + 1 < h ? ids[k + w]! : id;
      const other = right !== id ? right : down !== id ? down : id;
      if (other !== id && id > 0 && other > 0) c = foreign(id) !== foreign(other) ? frontier : border;
      px[k * 4] = c[0];
      px[k * 4 + 1] = c[1];
      px[k * 4 + 2] = c[2];
      px[k * 4 + 3] = 255;
    }
  }
  // Por un lienzo aparte: drawImage respeta la escala de pantalla del contexto (putImageData no).
  const tmp = (rasters.get(ctx) ?? rasters.set(ctx, ctx.canvas.ownerDocument.createElement('canvas')).get(ctx))!;
  if (tmp.width !== w || tmp.height !== h) {
    tmp.width = w;
    tmp.height = h;
  }
  tmp.getContext('2d')!.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, 0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  for (const r of a.regions) {
    if (r.kind === 'pais') {
      const c = regionCenter(a, r);
      const p = worldToAtlasView(f, c.x, c.z);
      drawLabel(ctx, r.official, p.x, p.y, 11, '#cfc4a8');
      continue;
    }
    if (!d.discovered.has(r.id)) continue;
    const c = regionCenter(a, r);
    const p = worldToAtlasView(f, c.x, c.z);
    drawLabel(ctx, r.official.replace(/^(Provincia de |Comarca )/, ''), p.x, p.y, 12, '#f0cf8a');
  }
  if (d.player) {
    const p = worldToAtlasView(f, d.player.x, d.player.y);
    drawMarker(ctx, 'player', p.x, p.y, 7, d.playerColor, d.yaw);
  }
}
