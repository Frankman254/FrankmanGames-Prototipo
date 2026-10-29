import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { Rng } from '../src/sim/rng';
import { SpatialHash } from '../src/sim/spatialHash';
import { World } from '../src/sim/world';
import { dist } from '../src/sim/vec2';

describe('Rng', () => {
  it('es reproducible con la misma semilla', () => {
    const a = new Rng(7);
    const b = new Rng(7);
    for (let i = 0; i < 20; i++) expect(a.next()).toBe(b.next());
    const r = new Rng(1);
    for (let i = 0; i < 1000; i++) {
      const v = r.int(2, 5);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(5);
    }
  });
});

describe('SpatialHash', () => {
  it('encuentra los vecinos dentro del radio', () => {
    const h = new SpatialHash(20, 20, 2);
    const items = [{ pos: { x: 1, y: 1 } }, { pos: { x: 1.5, y: 1.2 } }, { pos: { x: 15, y: 15 } }];
    h.rebuild(items);
    const found: number[] = [];
    h.query(1, 1, 1, (i) => found.push(i));
    expect(found.sort()).toEqual([0, 1]);
  });
});

describe('perseguidores (prueba de carga)', () => {
  it('200 perseguidores alcanzan al jugador sin atravesar paredes ni solaparse en exceso', () => {
    const w = new World(loadGameData());
    w.spawnChasers(200);
    const startD = w.chasers.list.map((c) => dist(c.pos, w.player.pos));
    for (let i = 0; i < 60 * 8; i++) w.tick(1 / 60);
    const list = w.chasers.list;
    for (const c of list) expect(w.grid.walkable(c.pos)).toBe(true);
    const meanStart = startD.reduce((a, b) => a + b, 0) / startD.length;
    const meanEnd = list.reduce((a, c) => a + dist(c.pos, w.player.pos), 0) / list.length;
    expect(meanEnd).toBeLessThan(meanStart * 0.5);
    // Separación básica, no física exacta: la multitud se aprieta contra el
    // jugador, pero nadie queda apilado sobre otro.
    let worst = 0;
    let pairs = 0;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const overlap = list[i]!.radius + list[j]!.radius - dist(list[i]!.pos, list[j]!.pos);
        worst = Math.max(worst, overlap);
        if (overlap > 0.05) pairs++;
      }
    }
    expect(worst).toBeLessThan(list[0]!.radius * 1.25);
    expect(pairs).toBeLessThan(list.length / 2);
  });
});
