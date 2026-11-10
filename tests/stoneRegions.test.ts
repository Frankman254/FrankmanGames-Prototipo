// Una Piedra Pintada por provincia o comarca: cada región de Panamá (no las de `pais`) tiene
// al menos una, y cada Piedra y su sitio de llegada se pisan en la página generada (no en el
// mar, ni dentro de una estructura o de un árbol). El mundo por páginas cubre todo el atlas.
import { describe, expect, it } from 'vitest';
import stonesJson from '../data/stones.json';
import { loadWorldData } from '../src/data/worldData';
import { isPanama, project, regionAt } from '../src/world/atlas';
import { buildOverworld } from '../src/world/overworld';
import { arrivalSpot, parseStones, type StoneDef } from '../src/world/stones';

const wd = loadWorldData();
const atlas = wd.atlas;
const def = parseStones(stonesJson);
const ow = buildOverworld(wd);
const bounds = ow.stream.ctx.bounds;
const plot = { width: ow.def.width, depth: ow.def.depth };

const inPlot = (p: { x: number; y: number }): boolean => p.x >= 0 && p.y >= 0 && p.x <= plot.width && p.y <= plot.depth;
/** Lo mismo que `stoneAt` de main: dentro de la parcela, la casilla caminable más cercana. */
function stoneAt(z: StoneDef): { x: number; y: number } {
  const cell = inPlot(z) ? ow.grid.nearestWalkable({ x: z.x, y: z.y }) : -1;
  return cell >= 0 ? ow.grid.center(cell) : { x: z.x, y: z.y };
}
/** Lo mismo que `arriveAt` de main. */
function arriveAt(z: StoneDef): { x: number; y: number } {
  const p = arrivalSpot(z, stoneAt(z));
  const cell = inPlot(p) ? ow.grid.nearestWalkable(p) : -1;
  return cell >= 0 ? ow.grid.center(cell) : p;
}

describe('Piedras Pintadas por región', () => {
  it('cada provincia y comarca de Panamá tiene una Piedra dentro de ella', () => {
    const withStone = new Set(def.stones.map((s) => regionAt(atlas, s.x, s.y)?.id));
    const missing = atlas.regions.filter((r) => isPanama(r) && !withStone.has(r.id)).map((r) => r.id);
    expect(missing).toEqual([]);
    // Y el mundo por páginas cubre todo el atlas: ninguna tierra de Panamá queda fuera.
    let outside = 0;
    for (const r of atlas.regions.filter(isPanama)) {
      for (const ring of r.polygons) {
        for (const [lon, lat] of ring) {
          const p = project(atlas, lon, lat);
          if (p.x < bounds.x0 || p.x > bounds.x1 || p.z < bounds.z0 || p.z > bounds.z1) outside++;
        }
      }
    }
    expect(outside).toBe(0);
  });

  it('cada Piedra está en tierra de Panamá y dentro del mundo por páginas', () => {
    for (const s of def.stones) {
      const r = regionAt(atlas, s.x, s.y);
      expect(r && isPanama(r), s.id).toBe(true);
      expect(s.x > bounds.x0 && s.x < bounds.x1 && s.y > bounds.z0 && s.y < bounds.z1, s.id).toBe(true);
    }
  });

  it('cada Piedra y su sitio de llegada se pisan en la página generada', () => {
    for (const s of def.stones) {
      const at = stoneAt(s);
      const arrive = arriveAt(s);
      for (const p of [at, arrive]) ow.stream.ensure(p.x - 4, p.y - 4, p.x + 4, p.y + 4);
      // En la parcela se corrige a la casilla más cercana: que no se vaya lejos de los datos.
      expect(Math.hypot(at.x - s.x, at.y - s.y), `${s.id} se movió`).toBeLessThan(3);
      expect(ow.grid.walkable(at), `${s.id}: piedra ${at.x},${at.y}`).toBe(true);
      expect(ow.grid.walkable(arrive), `${s.id}: llegada ${arrive.x},${arrive.y}`).toBe(true);
    }
  });
});
