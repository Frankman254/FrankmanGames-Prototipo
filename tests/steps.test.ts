import { describe, expect, it } from 'vitest';
import { ROOMS } from '../src/scenes/houseScene';
import { buildZoneGrid } from '../src/sim/navGrid';
import { stepBoxes, surfaceHeight, type Platform } from '../src/world/steps';

const p: Platform = { x: 10, z: 10, w: 4, d: 4, height: 0.6, run: 1.5, steps: 3 };

describe('gradas', () => {
  it('la altura sube sin saltos desde el suelo hasta la parte alta', () => {
    expect(surfaceHeight([p], 10, 5)).toBe(0);
    expect(surfaceHeight([p], 10, 10)).toBeCloseTo(0.6);
    let before = 0;
    for (let z = 6; z <= 9; z += 0.05) {
      const h = surfaceHeight([p], 10, z);
      expect(h - before).toBeLessThan(0.05);
      expect(h).toBeGreaterThanOrEqual(before);
      before = h;
    }
  });

  it('cada escalón es más alto y más estrecho, y el último es la parte alta', () => {
    const boxes = stepBoxes(p);
    expect(boxes.map((b) => b.top)).toEqual([0.2, 0.4, 0.6].map((v) => expect.closeTo(v)));
    expect(boxes[0]!.w).toBeCloseTo(6);
    expect(boxes[2]!.w).toBe(4);
  });

  it('en el salón del castillo se llega andando a lo alto del estrado', () => {
    const room = ROOMS.salon;
    const grid = buildZoneGrid({
      width: room.width,
      depth: room.depth,
      cellSize: 0.5,
      navRadius: 0.5,
      obstacles: room.solids.map((s) => ({ x: s.x, y: s.z, w: s.w, d: s.d })),
    }, []);
    // Delante, a los lados y arriba: solo bloquea el trono.
    const blocked = (x: number, z: number): boolean => !grid.walkableCell(Math.floor(x / 0.5), Math.floor(z / 0.5));
    for (const [x, z] of [[12, 17], [12, 18.6], [9.8, 19.8], [14.2, 19.8]] as const) expect(blocked(x, z), `${x},${z}`).toBe(false);
    expect(blocked(12, 20.5)).toBe(true);
    expect(surfaceHeight(room.platforms!, 12, 18.6)).toBeGreaterThan(0.6);
  });
});
