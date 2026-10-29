import { describe, expect, it } from 'vitest';
import { NavGrid } from '../src/sim/navGrid';
import { Pathfinder } from '../src/sim/pathfinder';
import { stepAlongPath, slide } from '../src/sim/movement';
import type { Vec2 } from '../src/sim/vec2';

/** Comprueba que cada tramo del camino es recto sobre celdas libres. */
function pathIsClear(g: NavGrid, from: Vec2, path: Vec2[]): boolean {
  let a = from;
  for (const b of path) {
    if (!g.lineOfSight(a, b)) return false;
    a = b;
  }
  return true;
}

describe('NavGrid', () => {
  it('infla obstáculos y bordes con el radio de navegación', () => {
    const g = NavGrid.fromObstacles(10, 10, 0.5, [{ x: 5, y: 5, w: 2, d: 2 }], 0.5);
    expect(g.walkable({ x: 5, y: 5 })).toBe(false);
    expect(g.walkable({ x: 3.6, y: 5 })).toBe(false); // dentro del inflado
    expect(g.walkable({ x: 3.2, y: 5 })).toBe(true);
    expect(g.walkable({ x: 0.1, y: 5 })).toBe(false); // borde
  });

  it('línea de visión: bloqueada por una pared, libre a su lado', () => {
    const g = NavGrid.fromObstacles(20, 20, 0.5, [{ x: 10, y: 10, w: 1, d: 10 }], 0.3);
    expect(g.lineOfSight({ x: 5, y: 10 }, { x: 15, y: 10 })).toBe(false);
    expect(g.lineOfSight({ x: 5, y: 2 }, { x: 15, y: 2 })).toBe(true);
    expect(g.lineOfSight({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(true);
  });

  it('nearestWalkable devuelve una celda libre cercana', () => {
    const g = NavGrid.fromObstacles(20, 20, 0.5, [{ x: 10, y: 10, w: 4, d: 4 }], 0.5);
    const c = g.center(g.nearestWalkable({ x: 10, y: 10 }));
    expect(g.walkable(c)).toBe(true);
    expect(Math.hypot(c.x - 10, c.y - 10)).toBeLessThan(3.5);
  });
});

describe('Pathfinder', () => {
  const g = NavGrid.fromObstacles(30, 30, 0.5, [
    { x: 15, y: 12, w: 1, d: 24 }, // muro con hueco arriba (y > 24)
  ], 0.5);
  const pf = new Pathfinder(g);

  it('en línea recta devuelve sólo el destino', () => {
    expect(pf.findPath({ x: 3, y: 3 }, { x: 8, y: 6 })).toEqual([{ x: 8, y: 6 }]);
  });

  it('rodea un muro y el camino suavizado nunca atraviesa obstáculos', () => {
    const from = { x: 5, y: 5 };
    const to = { x: 25, y: 5 };
    const path = pf.findPath(from, to);
    expect(path.length).toBeGreaterThan(1);
    expect(path.length).toBeLessThan(6); // suavizado: pocas esquinas, no una por celda
    expect(path[path.length - 1]).toEqual(to);
    expect(pathIsClear(g, from, path)).toBe(true);
    expect(Math.max(...path.map((p) => p.y))).toBeGreaterThan(24);
  });

  it('un destino bloqueado lleva al punto alcanzable más cercano', () => {
    const path = pf.findPath({ x: 5, y: 5 }, { x: 15, y: 10 });
    const end = path[path.length - 1]!;
    expect(g.walkable(end)).toBe(true);
    expect(end.x).toBeLessThan(15);
    expect(Math.hypot(end.x - 15, end.y - 10)).toBeLessThan(2);
  });

  it('una meta encerrada lleva a la celda más cercana alcanzable', () => {
    const box = NavGrid.fromObstacles(30, 30, 0.5, [
      { x: 20, y: 15, w: 10, d: 1 }, { x: 20, y: 25, w: 10, d: 1 },
      { x: 15, y: 20, w: 1, d: 11 }, { x: 25, y: 20, w: 1, d: 11 },
    ], 0.4);
    const pf2 = new Pathfinder(box);
    const path = pf2.findPath({ x: 5, y: 20 }, { x: 20, y: 20 });
    expect(path.length).toBeGreaterThan(0);
    const end = path[path.length - 1]!;
    expect(box.walkable(end)).toBe(true);
    expect(end.x < 15 || end.x > 25 || end.y < 15 || end.y > 25).toBe(true);
    expect(Math.hypot(end.x - 20, end.y - 20)).toBeLessThan(6.5);
  });
});

describe('movimiento', () => {
  it('stepAlongPath consume el camino a la velocidad indicada', () => {
    const m = { pos: { x: 0, y: 0 }, speed: 2, facing: 0, path: [{ x: 1, y: 0 }, { x: 1, y: 1 }] };
    stepAlongPath(m, 0.75);
    expect(m.path.length).toBe(1);
    expect(m.pos.x).toBeCloseTo(1);
    expect(m.pos.y).toBeCloseTo(0.5);
    expect(m.facing).toBeCloseTo(Math.PI / 2);
  });

  it('slide no deja entrar en una pared y desliza por el eje libre', () => {
    const g = NavGrid.fromObstacles(10, 10, 0.5, [{ x: 5, y: 5, w: 1, d: 10 }], 0.3);
    const r = slide(g, { x: 3.8, y: 3 }, { x: 4.6, y: 3.5 });
    expect(g.walkable(r)).toBe(true);
    expect(r.y).toBeCloseTo(3.5);
  });
});
