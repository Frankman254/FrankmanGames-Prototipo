import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { loadWorldData } from '../src/data/worldData';
import { World } from '../src/sim/world';
import { GATHER_PATH_CLEARANCE } from '../src/sim/gathering';
import { buildOverworld, withOverworldZone } from '../src/world/overworld';
import { pathEdgeDistance } from '../src/sim/paths';

describe('recursos de oficio (F12)', () => {
  const wd = loadWorldData();
  const data = withOverworldZone(loadGameData(), buildOverworld(wd));
  const w = new World(data, { encounter: false, seed: 3 });
  const nodes = w.gatherField!.nodes;

  it('ningún recurso cae sobre un camino ni pegado a su borde', () => {
    for (const n of nodes) expect(pathEdgeDistance(wd.terrain.paths, n.x, n.y), `${n.kind} en ${n.x.toFixed(1)},${n.y.toFixed(1)}`).toBeGreaterThan(GATHER_PATH_CLEARANCE);
  });

  it('caben todos los que piden los datos, en sitio pisable', () => {
    const wanted = data.rpg.professions.groves.reduce((a, g) => a + g.count, 0);
    expect(nodes.length).toBe(wanted);
    for (const n of nodes) expect(w.grid.walkable(n)).toBe(true);
  });
});
