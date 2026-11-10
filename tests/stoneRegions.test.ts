// Una Piedra Pintada por provincia o comarca: cada región de Panamá con tierra dentro del
// rectángulo del mundo por páginas tiene al menos una, y cada Piedra y su sitio de llegada
// se pisan en la página generada (no en el mar, ni dentro de una estructura o de un árbol).
// Las regiones que aún quedan fuera del rectángulo se ven de lejos y esperan su Piedra.
import { describe, expect, it } from 'vitest';
import stonesJson from '../data/stones.json';
import { loadWorldData } from '../src/data/worldData';
import { isPanama, regionAt } from '../src/world/atlas';
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
  it('cada región de Panamá con tierra dentro del mundo tiene una Piedra dentro de ella', () => {
    const withLand = new Set<string>();
    for (let x = bounds.x0 + 8; x < bounds.x1; x += 16) {
      for (let z = bounds.z0 + 8; z < bounds.z1; z += 16) {
        const r = regionAt(atlas, x, z);
        if (r && isPanama(r)) withLand.add(r.id);
      }
    }
    const withStone = new Set(def.stones.map((s) => regionAt(atlas, s.x, s.y)?.id));
    const missing = [...withLand].filter((id) => !withStone.has(id));
    expect(missing).toEqual([]);
    // Las que faltan en el atlas solo pueden ser las que aún no entran en el mundo.
    const outside = atlas.regions.filter((r) => isPanama(r) && !withStone.has(r.id)).map((r) => r.id);
    for (const id of outside) expect(withLand.has(id), id).toBe(false);
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
