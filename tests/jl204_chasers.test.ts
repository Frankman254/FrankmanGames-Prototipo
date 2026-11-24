// JL-204: pruebas de src/sim/chasers.ts — persecución, alcance y abandono, con casos de borde.
import { describe, expect, it } from 'vitest';
import { ChaserSystem } from '../src/sim/chasers';
import { NavGrid } from '../src/sim/navGrid';
import { Pathfinder } from '../src/sim/pathfinder';
import type { LoadTestDef } from '../src/data/schema';
import type { Vec2 } from '../src/sim/vec2';

const DEF: LoadTestDef = {
    seed: 42,
    speed: 4,
    radius: 0.4,
    minSpawnDistance: 2,
    repathSeconds: 1,
    maxRepathsPerTick: 10,
};

/** Rejilla vacía 20×20, celda 0.5, sin obstáculos. */
function emptyGrid(): NavGrid {
    return NavGrid.fromObstacles(20, 20, 0.5, [], 0.3);
}

/** Rejilla con un muro horizontal completo en y=10 (sin huecos). */
function wallGrid(): NavGrid {
    return NavGrid.fromObstacles(20, 20, 0.5, [{ x: 0, y: 10, w: 20, d: 1 }], 0.3);
}

function makeSystem(grid: NavGrid) {
    const pf = new Pathfinder(grid);
    return new ChaserSystem(DEF, grid, pf);
}

describe('ChaserSystem.spawn', () => {
    it('crea un chaser con la posición y los valores del def', () => {
        const sys = makeSystem(emptyGrid());
        const c = sys.spawn(1, { x: 3, y: 3 }, 0);
        expect(c.id).toBe(1);
        expect(c.pos).toEqual({ x: 3, y: 3 });
        expect(c.prevPos).toEqual({ x: 3, y: 3 });
        expect(c.radius).toBe(DEF.radius);
        expect(c.speed).toBe(DEF.speed);
        expect(c.path).toEqual([]);
        expect(c.repathTimer).toBe(0); // stagger 0 × repathSeconds
    });

    it('stagger retrasa el primer repath', () => {
        const sys = makeSystem(emptyGrid());
        const c = sys.spawn(2, { x: 5, y: 5 }, 2);
        expect(c.repathTimer).toBe(2 * DEF.repathSeconds);
    });

    it('se añade a la lista', () => {
        const sys = makeSystem(emptyGrid());
        sys.spawn(1, { x: 1, y: 1 }, 0);
        sys.spawn(2, { x: 2, y: 2 }, 0);
        expect(sys.list.length).toBe(2);
        expect(sys.list[0]!.id).toBe(1);
        expect(sys.list[1]!.id).toBe(2);
    });
});

describe('ChaserSystem.clear', () => {
    it('vacía la lista', () => {
        const sys = makeSystem(emptyGrid());
        sys.spawn(1, { x: 1, y: 1 }, 0);
        sys.spawn(2, { x: 2, y: 2 }, 0);
        sys.clear();
        expect(sys.list.length).toBe(0);
    });
});

describe('ChaserSystem.tick — persecución en línea recta', () => {
    it('se acerca al objetivo cuando hay línea de visión', () => {
        const sys = makeSystem(emptyGrid());
        sys.spawn(1, { x: 2, y: 2 }, 0);
        const target = { pos: { x: 8, y: 2 } as Vec2, radius: 0.5 };
        sys.tick(0.5, target);
        // speed=4, dt=0.5 → 2 m hacia el objetivo
        expect(sys.list[0]!.pos.x).toBeCloseTo(4);
        expect(sys.list[0]!.pos.y).toBeCloseTo(2);
    });

    it('actualiza prevPos antes de mover', () => {
        const sys = makeSystem(emptyGrid());
        sys.spawn(1, { x: 2, y: 2 }, 0);
        const target = { pos: { x: 8, y: 2 } as Vec2, radius: 0.5 };
        sys.tick(0.5, target);
        const c = sys.list[0]!;
        expect(c.prevPos.x).toBeCloseTo(2);
        expect(c.prevPos.y).toBeCloseTo(2);
    });

    it('gira hacia el objetivo', () => {
        const sys = makeSystem(emptyGrid());
        sys.spawn(1, { x: 2, y: 2 }, 0);
        const target = { pos: { x: 8, y: 5 } as Vec2, radius: 0.5 };
        sys.tick(0.5, target);
        const expectedFacing = Math.atan2(5 - 2, 8 - 2);
        expect(sys.list[0]!.facing).toBeCloseTo(expectedFacing);
    });
});

describe('ChaserSystem.tick — alcance', () => {
    it('vacía el camino al llegar al rango de alcance', () => {
        const sys = makeSystem(emptyGrid());
        // Chaser muy cerca del objetivo: dentro de reach = radius + target.radius + 0.05
        sys.spawn(1, { x: 5, y: 5 }, 0);
        const target = { pos: { x: 5.1, y: 5 } as Vec2, radius: 0.5 };
        // reach = 0.4 + 0.5 + 0.05 = 0.95; distSq = 0.01 < 0.95²
        sys.tick(0.5, target);
        expect(sys.list[0]!.path.length).toBe(0);
    });

    it('no vacía el camino si está fuera de alcance', () => {
        const sys = makeSystem(emptyGrid());
        sys.spawn(1, { x: 2, y: 2 }, 0);
        const target = { pos: { x: 10, y: 10 } as Vec2, radius: 0.5 };
        sys.tick(0.5, target);
        // reach = 0.95; dist ≈ 11.3 > 0.95 → path no vacío
        expect(sys.list[0]!.path.length).toBeGreaterThan(0);
    });
});

describe('ChaserSystem.tick — persecución con A*', () => {
    it('rodea un muro cuando no hay línea de visión', () => {
        const sys = makeSystem(wallGrid());
        // Chaser arriba del muro (y=14), objetivo abajo (y=6), muro completo en y=10
        sys.spawn(1, { x: 5, y: 14 }, 0);
        const target = { pos: { x: 5, y: 6 } as Vec2, radius: 0.5 };
        // Sin línea de visión → busca A*
        sys.tick(0.5, target);
        const c = sys.list[0]!;
        expect(c.path.length).toBeGreaterThan(0);
        // lastRepaths debe ser 1 (una búsqueda A*)
        expect(sys.lastRepaths).toBe(1);
    });

    it('respeta el presupuesto de repaths por tick', () => {
        const defLimited: LoadTestDef = {
            ...DEF,
            maxRepathsPerTick: 1,
        };
        const grid = wallGrid();
        const pf = new Pathfinder(grid);
        const sys = new ChaserSystem(defLimited, grid, pf);
        // Dos chasers sin línea de visión → solo uno busca A*
        sys.spawn(1, { x: 5, y: 14 }, 0);
        sys.spawn(2, { x: 15, y: 14 }, 0);
        const target = { pos: { x: 5, y: 6 } as Vec2, radius: 0.5 };
        sys.tick(0.5, target);
        expect(sys.lastRepaths).toBe(1);
    });

    it('replanifica cuando el timer expira', () => {
        const sys = makeSystem(wallGrid());
        sys.spawn(1, { x: 5, y: 14 }, 0);
        const target = { pos: { x: 5, y: 6 } as Vec2, radius: 0.5 };
        // Primer tick: repathTimer=0 → busca A*
        sys.tick(0.5, target);
        expect(sys.lastRepaths).toBe(1);
        // Segundo tick: repathTimer aún > 0 → no busca
        sys.tick(0.1, target);
        expect(sys.lastRepaths).toBe(0);
        // Tick que expira el timer (repathSeconds=1, ya gastamos 0.6)
        sys.tick(1.0, target);
        expect(sys.lastRepaths).toBe(1);
    });

    it('replanifica si el camino se vacía', () => {
        const sys = makeSystem(wallGrid());
        sys.spawn(1, { x: 5, y: 14 }, 0);
        const target = { pos: { x: 5, y: 6 } as Vec2, radius: 0.5 };
        sys.tick(0.5, target); // busca A*
        // Forzamos path vacío
        sys.list[0]!.path.length = 0;
        // repathTimer > 0 pero path vacío → busca de nuevo
        sys.tick(0.1, target);
        expect(sys.lastRepaths).toBe(1);
    });
});

describe('ChaserSystem.tick — línea de visión vs A*', () => {
    it('usa línea directa cuando hay visión, sin gastar repath', () => {
        const sys = makeSystem(emptyGrid());
        sys.spawn(1, { x: 3, y: 3 }, 0);
        const target = { pos: { x: 8, y: 8 } as Vec2, radius: 0.5 };
        sys.tick(0.5, target);
        // Con visión directa, path = [target.pos], sin A*
        expect(sys.lastRepaths).toBe(0);
        expect(sys.list[0]!.path).toEqual([{ x: 8, y: 8 }]);
    });

    it('cambia de A* a línea directa al aparecer visión', () => {
        const sys = makeSystem(wallGrid());
        sys.spawn(1, { x: 5, y: 14 }, 0);
        // Objetivo al otro lado del muro
        const target = { pos: { x: 5, y: 6 } as Vec2, radius: 0.5 };
        sys.tick(0.5, target); // A*
        expect(sys.lastRepaths).toBe(1);
        // Mover objetivo al mismo lado → visión directa
        (target.pos as Vec2).x = 5;
        (target.pos as Vec2).y = 14;
        sys.tick(0.5, target);
        expect(sys.lastRepaths).toBe(0);
    });
});

describe('ChaserSystem.tick — casos de borde', () => {
    it('dt=0 no mueve ni consume repathTimer', () => {
        const sys = makeSystem(emptyGrid());
        sys.spawn(1, { x: 3, y: 3 }, 0);
        const target = { pos: { x: 8, y: 8 } as Vec2, radius: 0.5 };
        sys.tick(0, target);
        const c = sys.list[0]!;
        expect(c.pos.x).toBeCloseTo(3);
        expect(c.pos.y).toBeCloseTo(3);
        // repathTimer no cambia con dt=0
        expect(c.repathTimer).toBe(0);
    });

    it('sin chasers, tick no falla', () => {
        const sys = makeSystem(emptyGrid());
        const target = { pos: { x: 5, y: 5 } as Vec2, radius: 0.5 };
        expect(() => sys.tick(0.5, target)).not.toThrow();
        expect(sys.lastRepaths).toBe(0);
    });

    it('múltiples chasers se mueven en el mismo tick', () => {
        const sys = makeSystem(emptyGrid());
        sys.spawn(1, { x: 2, y: 2 }, 0);
        sys.spawn(2, { x: 18, y: 18 }, 0);
        const target = { pos: { x: 10, y: 10 } as Vec2, radius: 0.5 };
        sys.tick(0.5, target);
        // Ambos se acercan al centro
        const c1 = sys.list[0]!;
        const c2 = sys.list[1]!;
        const d1Before = Math.hypot(2 - 10, 2 - 10);
        const d1After = Math.hypot(c1.pos.x - 10, c1.pos.y - 10);
        const d2Before = Math.hypot(18 - 10, 18 - 10);
        const d2After = Math.hypot(c2.pos.x - 10, c2.pos.y - 10);
        expect(d1After).toBeLessThan(d1Before);
        expect(d2After).toBeLessThan(d2Before);
    });

    it('chaser en la misma posición que el objetivo vacía el camino', () => {
        const sys = makeSystem(emptyGrid());
        sys.spawn(1, { x: 5, y: 5 }, 0);
        const target = { pos: { x: 5, y: 5 } as Vec2, radius: 0.5 };
        sys.tick(0.5, target);
        expect(sys.list[0]!.path.length).toBe(0);
    });

    it('prevPos se actualiza para cada chaser en el mismo tick', () => {
        const sys = makeSystem(emptyGrid());
        sys.spawn(1, { x: 2, y: 2 }, 0);
        const target = { pos: { x: 8, y: 2 } as Vec2, radius: 0.5 };
        sys.tick(0.5, target);
        const c = sys.list[0]!;
        // prevPos = posición antes del movimiento
        expect(c.prevPos.x).toBeCloseTo(2);
        expect(c.prevPos.y).toBeCloseTo(2);
        // pos ya se movió
        expect(c.pos.x).toBeGreaterThan(2);
    });

    it('repathTimer con stagger alto no busca hasta que expira', () => {
        const sys = makeSystem(wallGrid());
        // stagger=5 → repathTimer = 5 s
        sys.spawn(1, { x: 5, y: 14 }, 5);
        const target = { pos: { x: 5, y: 6 } as Vec2, radius: 0.5 };
        // Sin visión y sin path → debería buscar, pero repathTimer > 0
        // Sin embargo, path.length === 0 fuerza la búsqueda
        sys.tick(0.5, target);
        // path vacío → busca a pesar del timer
        expect(sys.lastRepaths).toBe(1);
    });
});
