import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { loadWorldData } from '../src/data/worldData';
import { parseVegetation } from '../src/data/worldSchema';
import { NavGrid } from '../src/sim/navGrid';
import { World } from '../src/sim/world';
import { buildOverworld, withOverworldZone } from '../src/world/overworld';
import { pathEdgeDistance } from '../src/world/terrain';
import vegetationJson from '../data/vegetation.json';

const wd = loadWorldData();
const ow = buildOverworld(wd);
const world = new World(withOverworldZone(loadGameData(), ow));

describe('vegetación y props', () => {
  it('la dispersión es determinista y no vacía', () => {
    const again = buildOverworld(wd);
    for (const [id, list] of ow.scatter.byKind) {
      expect(again.scatter.byKind.get(id)).toEqual(list);
      expect(list.length).toBeGreaterThan(0);
    }
  });

  it('los troncos, rocas y props bloquean; arbustos, flores y hierba no', () => {
    for (const [id, list] of ow.scatter.byKind) {
      const k = wd.vegetation.kinds[id]!;
      if (k.blockRadius === 0) continue;
      for (const inst of list) {
        expect(world.grid.walkable({ x: inst.x, y: inst.z }), `${id} en (${inst.x.toFixed(1)}, ${inst.z.toFixed(1)})`).toBe(false);
      }
    }
    for (const p of wd.vegetation.props) expect(world.grid.walkable({ x: p.x, y: p.y }), p.kind).toBe(false);
    // Los que no bloquean se atraviesan: la mayoría de arbustos están en celdas libres.
    const bushes = ow.scatter.byKind.get('bush')!;
    expect(bushes.some((b) => world.grid.walkable({ x: b.x, y: b.z }))).toBe(true);
  });

  it('nada que bloquee cae sobre un camino ni en el inicio', () => {
    for (const o of ow.obstacles) {
      expect(pathEdgeDistance(wd.terrain.paths, o.x, o.y)).toBeGreaterThan(-0.01);
    }
    expect(world.grid.walkable(wd.terrain.playerStart)).toBe(true);
  });

  it('se puede recorrer el camino principal de punta a punta', () => {
    const pts = wd.terrain.paths[0]!.points;
    // Extremos un poco hacia dentro: el borde exterior de la zona está bloqueado.
    const a = { x: pts[0]!.x, y: pts[0]!.y + 4 };
    const b = { x: pts[pts.length - 1]!.x, y: pts[pts.length - 1]!.y - 4 };
    const path = world.pathfinder.findPath(a, b);
    const end = path[path.length - 1]!;
    expect(Math.hypot(end.x - b.x, end.y - b.y)).toBeLessThan(0.5);
  });

  it('marcar obstáculos por caja da la misma rejilla que celda a celda', () => {
    const obstacles = [{ x: 5, y: 5, w: 2, d: 1 }, { x: 0.3, y: 9.7, w: 1, d: 1 }, { x: 7.1, y: 2.2, w: 0.7, d: 0.7 }];
    const g = NavGrid.fromObstacles(10, 10, 0.5, obstacles, 0.5);
    for (let cy = 0; cy < g.rows; cy++) {
      for (let cx = 0; cx < g.cols; cx++) {
        const px = (cx + 0.5) * 0.5;
        const py = (cy + 0.5) * 0.5;
        let block = px < 0.5 || py < 0.5 || px > 9.5 || py > 9.5;
        for (const o of obstacles) {
          const dx = Math.max(Math.abs(px - o.x) - o.w / 2, 0);
          const dy = Math.max(Math.abs(py - o.y) - o.d / 2, 0);
          block ||= dx * dx + dy * dy < 0.25;
        }
        expect(g.blocked[cy * g.cols + cx]).toBe(block ? 1 : 0);
      }
    }
  });

  it('rechaza rotaciones que no son múltiplos de 90', () => {
    const bad = { ...vegetationJson, props: [{ kind: 'house', x: 1, y: 1, w: 2, d: 2, rotDeg: 45 }] };
    expect(() => parseVegetation(bad)).toThrow(/props\[0\]\.rotDeg/);
  });
});
