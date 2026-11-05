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
const BORDER = 'rgba(16, 18, 12, .85)';

export function drawPanama(ctx: CanvasRenderingContext2D, d: PanamaDraw, w: number, h: number): void {
  const a = d.atlas;
  const f = fitAtlas(a, w, h);
  ctx.fillStyle = d.sea;
  ctx.fillRect(0, 0, w, h);
  ctx.lineJoin = 'round';
  for (const r of a.regions) {
    const known = d.discovered.has(r.id);
    const hot = d.hover?.id === r.id;
    ctx.fillStyle = known ? (hot ? LAND_HOVER : LAND) : hot ? UNKNOWN_HOVER : UNKNOWN;
    ctx.strokeStyle = BORDER;
    ctx.lineWidth = hot ? 1.8 : 1;
    ctx.setLineDash(r.kind === 'comarca' ? [4, 3] : []);
    for (const ring of r.polygons) {
      ctx.beginPath();
      ring.forEach(([lon, lat], i) => {
        const g = project(a, lon, lat);
        const p = worldToAtlasView(f, g.x, g.z);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.setLineDash([]);
  for (const r of a.regions) {
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
