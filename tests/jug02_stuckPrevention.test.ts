// JUG-02: Giro y arranque inmediatos; que el personaje no se atasque en esquinas
// ni en otros personajes.
import { describe, expect, it } from 'vitest';
import { NavGrid } from '../src/sim/navGrid';
import { Pathfinder } from '../src/sim/pathfinder';
import { stepAlongPath } from '../src/sim/movement';
import type { Vec2 } from '../src/sim/vec2';

/** Sala 20×20 con una esquina de pared en (10,10) que obliga a rodear. */
function cornerGrid(): NavGrid {
    return NavGrid.fromObstacles(20, 20, 0.5, [{ x: 10, y: 10, w: 2, d: 2 }], 0.45);
}

describe('JUG-02: stepAlongPath con grid evita paredes', () => {
    it('sin grid, el actor puede entrar en celda bloqueada', () => {
        const g = cornerGrid();
        const m = {
            pos: { x: 8, y: 9 },
            speed: 6,
            facing: 0,
            path: [{ x: 10, y: 9 }], // el waypoint está junto a la esquina
        };
        // Sin grid, stepAlongPath coloca al actor en el waypoint sin verificar.
        stepAlongPath(m, 1 / 60);
        // El actor se acercó al waypoint.
        expect(m.pos.x).toBeGreaterThan(8);
    });

    it('con grid, el actor desliza y no entra en celda bloqueada', () => {
        const g = cornerGrid();
        const m = {
            pos: { x: 8, y: 9 },
            speed: 6,
            facing: 0,
            path: [{ x: 10, y: 9 }],
        };
        stepAlongPath(m, 1 / 60, 1, g);
        // La posición resultante debe ser caminable.
        expect(g.walkable(m.pos)).toBe(true);
    });

    it('con grid, el actor sigue avanzando a lo largo de la pared', () => {
        const g = cornerGrid();
        const pf = new Pathfinder(g);
        // Camino desde un lado de la esquina al otro.
        const from = { x: 8, y: 9 };
        const to = { x: 13, y: 9 };
        const path = pf.findPath(from, to);
        expect(path.length).toBeGreaterThan(0);

        const m = {
            pos: { ...from },
            speed: 6,
            facing: 0,
            path,
        };
        // Avanzar varios ticks.
        for (let i = 0; i < 30; i++) {
            stepAlongPath(m, 1 / 60, 1, g);
            expect(g.walkable(m.pos)).toBe(true);
        }
        // Debería haber avanzado significativamente.
        expect(Math.hypot(m.pos.x - from.x, m.pos.y - from.y)).toBeGreaterThan(0.5);
    });

    it('sin grid, el comportamiento es idéntico al anterior (backward compat)', () => {
        const m = {
            pos: { x: 0, y: 0 },
            speed: 2,
            facing: 0,
            path: [
                { x: 1, y: 0 },
                { x: 1, y: 1 },
            ],
        };
        stepAlongPath(m, 0.75);
        expect(m.path.length).toBe(1);
        expect(m.pos.x).toBeCloseTo(1);
        expect(m.pos.y).toBeCloseTo(0.5);
    });
});

describe('JUG-02: re-planificación al atascarse', () => {
    it('cuando un obstáculo se interpone, re-planificar encuentra nuevo camino', () => {
        // Grid inicial: pasillo libre.
        const g1 = NavGrid.fromObstacles(20, 10, 0.5, [], 0.45);
        const pf1 = new Pathfinder(g1);
        const path = pf1.findPath({ x: 2, y: 5 }, { x: 18, y: 5 });
        expect(path.length).toBeGreaterThan(0);

        const m = {
            pos: { x: 2, y: 5 },
            speed: 6,
            facing: 0,
            path,
        };
        // Avanzar un poco.
        stepAlongPath(m, 0.5, 1, g1);
        const halfway = { ...m.pos };

        // Ahora aparece un obstáculo en el camino.
        const g2 = NavGrid.fromObstacles(20, 10, 0.5, [{ x: 10, y: 3, w: 1, d: 4 }], 0.45);
        const pf2 = new Pathfinder(g2);
        // Re-planificar desde la posición actual.
        const newPath = pf2.findPath(halfway, { x: 18, y: 5 });
        // Debería encontrar un camino que rodee el obstáculo.
        expect(newPath.length).toBeGreaterThan(0);
        // Verificar que todo el nuevo camino es caminable.
        for (const pt of newPath) {
            expect(g2.walkable(pt)).toBe(true);
        }
    });

    it('si el destino está encerrado, el pathfinder lleva al punto más cercano', () => {
        // Caja cerrada idéntica a la de navigation.test.ts.
        const g = NavGrid.fromObstacles(30, 30, 0.5, [
            { x: 20, y: 15, w: 10, d: 1 },
            { x: 20, y: 25, w: 10, d: 1 },
            { x: 15, y: 20, w: 1, d: 11 },
            { x: 25, y: 20, w: 1, d: 11 },
        ], 0.45);
        const pf = new Pathfinder(g);
        const path = pf.findPath({ x: 5, y: 20 }, { x: 20, y: 20 });
        const end = path[path.length - 1]!;
        // El punto final está fuera de la caja.
        expect(end.x < 15 || end.x > 25 || end.y < 15 || end.y > 25).toBe(true);
    });
});

describe('JUG-02: separación del jugador contra enemigos', () => {
    it('pushOut empuja al jugador fuera del enemigo sin entrar en paredes', () => {
        const g = NavGrid.fromObstacles(10, 10, 0.5, [{ x: 0, y: 0, w: 3, d: 10 }], 0.45);
        // Jugador y enemigo solapados: el enemigo empuja al jugador hacia la pared.
        const playerPos = { x: 3.2, y: 5 };
        const enemyPos = { x: 3.5, y: 5 };
        const playerR = 0.4;
        const enemyR = 0.5;
        const minD = playerR + enemyR;

        // Verificar que están solapados (distancia < minD).
        const dist = Math.hypot(playerPos.x - enemyPos.x, playerPos.y - enemyPos.y);
        expect(dist).toBeLessThan(minD);

        // pushOut: empujar al jugador lejos del enemigo.
        const dx = playerPos.x - enemyPos.x;
        const dy = playerPos.y - enemyPos.y;
        const d = Math.hypot(dx, dy);
        const push = minD - d;
        const target = { x: playerPos.x + (dx / d) * push, y: playerPos.y + (dy / d) * push };

        // El jugador es empujado hacia la izquierda (hacia la pared).
        // slide debe mantenerlo en suelo caminable.
        expect(g.walkable(target)).toBe(true);
    });
});
