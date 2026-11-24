import { describe, expect, it } from 'vitest';
import { NavGrid } from '../src/sim/navGrid';
import { SpatialHash } from '../src/sim/spatialHash';
import { Body, separate } from '../src/sim/crowd';
import { dist } from '../src/sim/vec2';
import type { RectObstacle } from '../src/sim/navGrid';

function makeGrid(w = 20, d = 20, cellSize = 1, obstacles: RectObstacle[] = []) {
    return NavGrid.fromObstacles(w, d, cellSize, obstacles, 0.4);
}

function makeHash(w = 20, d = 20, cellSize = 1) {
    return new SpatialHash(w, d, cellSize);
}

describe('crowd.separate', () => {
    it('separa dos cuerpos solapados', () => {
        const grid = makeGrid();
        const hash = makeHash();
        const bodies: Body[] = [
            { pos: { x: 5, y: 5 }, radius: 0.5 },
            { pos: { x: 5.1, y: 5 }, radius: 0.5 },
        ];
        separate(grid, hash, bodies, 1);
        // La distancia mínima es la suma de radios (1.0).
        expect(dist(bodies[0]!.pos, bodies[1]!.pos)).toBeGreaterThanOrEqual(0.99);
    });

    it('no separa cuerpos que ya están separados', () => {
        const grid = makeGrid();
        const hash = makeHash();
        const bodies: Body[] = [
            { pos: { x: 3, y: 3 }, radius: 0.5 },
            { pos: { x: 8, y: 8 }, radius: 0.5 },
        ];
        const orig0 = { ...bodies[0]!.pos };
        const orig1 = { ...bodies[1]!.pos };
        separate(grid, hash, bodies, 1);
        expect(bodies[0]!.pos.x).toBe(orig0.x);
        expect(bodies[0]!.pos.y).toBe(orig0.y);
        expect(bodies[1]!.pos.x).toBe(orig1.x);
        expect(bodies[1]!.pos.y).toBe(orig1.y);
    });

    it('no separa cuerpos que se tocan justo en el borde', () => {
        const grid = makeGrid();
        const hash = makeHash();
        const bodies: Body[] = [
            { pos: { x: 5, y: 5 }, radius: 0.5 },
            { pos: { x: 6, y: 5 }, radius: 0.5 }, // distancia = 1.0 = suma de radios
        ];
        const orig0 = { ...bodies[0]!.pos };
        const orig1 = { ...bodies[1]!.pos };
        separate(grid, hash, bodies, 1);
        expect(bodies[0]!.pos.x).toBe(orig0.x);
        expect(bodies[0]!.pos.y).toBe(orig0.y);
        expect(bodies[1]!.pos.x).toBe(orig1.x);
        expect(bodies[1]!.pos.y).toBe(orig1.y);
    });

    it('separación simétrica: cada cuerpo se mueve la mitad', () => {
        const grid = makeGrid();
        const hash = makeHash();
        const bodies: Body[] = [
            { pos: { x: 5, y: 5 }, radius: 0.5 },
            { pos: { x: 5.2, y: 5 }, radius: 0.5 },
        ];
        separate(grid, hash, bodies, 1);
        // El empuje es (minD - d) / 2 para cada uno.
        const d = dist(bodies[0]!.pos, bodies[1]!.pos);
        expect(d).toBeGreaterThanOrEqual(0.99);
        // Ambos se movieron aproximadamente lo mismo.
        const move0 = dist(bodies[0]!.pos, { x: 5, y: 5 });
        const move1 = dist(bodies[1]!.pos, { x: 5.2, y: 5 });
        expect(Math.abs(move0 - move1)).toBeLessThan(0.01);
    });

    it('cuerpos casi superpuestos se separan (no exactos, ver hallazgo)', () => {
        const grid = makeGrid();
        const hash = makeHash();
        const bodies: Body[] = [
            { pos: { x: 5, y: 5 }, radius: 0.5 },
            { pos: { x: 5.001, y: 5 }, radius: 0.5 }, // casi superpuestos, pero d > 1e-6
        ];
        separate(grid, hash, bodies, 1);
        // Deben haberse separado a la suma de radios.
        expect(dist(bodies[0]!.pos, bodies[1]!.pos)).toBeGreaterThanOrEqual(0.99);
    });

    it('HALLAZGO: cuerpos exactamente superpuestos no se separan (d=1 → push=0)', () => {
        const grid = makeGrid();
        const hash = makeHash();
        const bodies: Body[] = [
            { pos: { x: 5, y: 5 }, radius: 0.5 },
            { pos: { x: 5, y: 5 }, radius: 0.5 },
        ];
        separate(grid, hash, bodies, 1);
        // Bug: cuando d < 1e-6, se fija d=1 para la dirección, pero push = (minD - 1)/2 = 0.
        // Los cuerpos no se mueven. Se informa en la casilla JL-205.
        expect(dist(bodies[0]!.pos, bodies[1]!.pos)).toBe(0);
    });

    it('el cuerpo fijo no se mueve, solo empuja a los demás', () => {
        const grid = makeGrid();
        const hash = makeHash();
        const fixed: Body = { pos: { x: 5, y: 5 }, radius: 0.6 };
        const bodies: Body[] = [
            { pos: { x: 5.3, y: 5 }, radius: 0.5 }, // solapa con fixed
        ];
        const fixedOrig = { ...fixed.pos };
        separate(grid, hash, bodies, 1, fixed);
        // El fijo no se mueve.
        expect(fixed.pos.x).toBe(fixedOrig.x);
        expect(fixed.pos.y).toBe(fixedOrig.y);
        // El cuerpo se separó del fijo.
        expect(dist(bodies[0]!.pos, fixed.pos)).toBeGreaterThanOrEqual(1.09); // 0.5 + 0.6
    });

    it('el cuerpo fijo no empuja si no hay solape', () => {
        const grid = makeGrid();
        const hash = makeHash();
        const fixed: Body = { pos: { x: 5, y: 5 }, radius: 0.5 };
        const bodies: Body[] = [
            { pos: { x: 10, y: 10 }, radius: 0.5 },
        ];
        const orig = { ...bodies[0]!.pos };
        separate(grid, hash, bodies, 1, fixed);
        expect(bodies[0]!.pos.x).toBe(orig.x);
        expect(bodies[0]!.pos.y).toBe(orig.y);
    });

    it('con tres cuerpos solapados, una llamada reduce el solape', () => {
        const grid = makeGrid();
        const hash = makeHash();
        const bodies: Body[] = [
            { pos: { x: 5, y: 5 }, radius: 0.5 },
            { pos: { x: 5.1, y: 5 }, radius: 0.5 },
            { pos: { x: 5.2, y: 5 }, radius: 0.5 },
        ];
        // Distancia inicial entre el primero y el último.
        const initialDist = dist(bodies[0]!.pos, bodies[2]!.pos);
        separate(grid, hash, bodies, 1);
        // Una llamada reduce el solape: la distancia entre extremos crece.
        const finalDist = dist(bodies[0]!.pos, bodies[2]!.pos);
        expect(finalDist).toBeGreaterThan(initialDist);
        // Los vecinos directos (0,1) se separan bien porque son el primer par.
        expect(dist(bodies[0]!.pos, bodies[1]!.pos)).toBeGreaterThanOrEqual(0.99);
    });

    it('tres cuerpos se separan completamente con varias llamadas', () => {
        const grid = makeGrid();
        const hash = makeHash();
        const bodies: Body[] = [
            { pos: { x: 5, y: 5 }, radius: 0.5 },
            { pos: { x: 5.1, y: 5 }, radius: 0.5 },
            { pos: { x: 5.2, y: 5 }, radius: 0.5 },
        ];
        // Varios pasos de separación.
        for (let k = 0; k < 5; k++) {
            separate(grid, hash, bodies, 1);
        }
        // Cada par debe estar a ≥ suma de radios.
        for (let i = 0; i < bodies.length; i++) {
            for (let j = i + 1; j < bodies.length; j++) {
                expect(dist(bodies[i]!.pos, bodies[j]!.pos)).toBeGreaterThanOrEqual(0.99);
            }
        }
    });

    it('separación con slide: los cuerpos no atraviesan obstáculos', () => {
        // Una pared vertical en x=6, y=4..6 (centro 6,5, ancho 1, profundidad 2).
        const grid = makeGrid(20, 20, 1, [{ x: 6, y: 5, w: 1, d: 2 }]);
        const hash = makeHash(20, 20, 1);
        // Dos cuerpos a la izquierda de la pared, solapados.
        const bodies: Body[] = [
            { pos: { x: 4.5, y: 5 }, radius: 0.5 },
            { pos: { x: 4.3, y: 5 }, radius: 0.5 },
        ];
        separate(grid, hash, bodies, 1);
        // Los cuerpos deben haberse separado (distancia ≥ suma de radios).
        expect(dist(bodies[0]!.pos, bodies[1]!.pos)).toBeGreaterThanOrEqual(0.99);
        // Ninguno debe quedar dentro de la pared (x entre 5.5 y 6.5 con navRadius 0.4 → celda bloqueada).
        for (const b of bodies) {
            expect(grid.walkable(b.pos)).toBe(true);
        }
    });

    it('separación con radios distintos', () => {
        const grid = makeGrid();
        const hash = makeHash();
        const bodies: Body[] = [
            { pos: { x: 5, y: 5 }, radius: 0.3 },
            { pos: { x: 5.1, y: 5 }, radius: 0.8 },
        ];
        separate(grid, hash, bodies, 1.1);
        // La distancia mínima es 0.3 + 0.8 = 1.1.
        expect(dist(bodies[0]!.pos, bodies[1]!.pos)).toBeGreaterThanOrEqual(1.09);
    });

    it('maxRadius controla el radio de consulta del hash', () => {
        const grid = makeGrid();
        const hash = makeHash();
        // Dos cuerpos muy lejos, pero con maxRadius grande.
        const bodies: Body[] = [
            { pos: { x: 5, y: 5 }, radius: 0.5 },
            { pos: { x: 5.1, y: 5 }, radius: 0.5 },
        ];
        // Con maxRadius=0, el hash no consulta vecinos más allá del propio radio.
        // Pero como están a 0.1 m, el radio de consulta es 0.5 + 0 = 0.5, suficiente.
        separate(grid, hash, bodies, 0);
        // Deberían separarse igual porque están dentro del radio de consulta.
        expect(dist(bodies[0]!.pos, bodies[1]!.pos)).toBeGreaterThanOrEqual(0.99);
    });

    it('array vacío no falla', () => {
        const grid = makeGrid();
        const hash = makeHash();
        separate(grid, hash, [], 1);
        // No error.
    });

    it('un solo cuerpo no falla', () => {
        const grid = makeGrid();
        const hash = makeHash();
        const bodies: Body[] = [
            { pos: { x: 5, y: 5 }, radius: 0.5 },
        ];
        const orig = { ...bodies[0]!.pos };
        separate(grid, hash, bodies, 1);
        expect(bodies[0]!.pos.x).toBe(orig.x);
        expect(bodies[0]!.pos.y).toBe(orig.y);
    });

    it('fixed empuja a varios cuerpos a la vez', () => {
        const grid = makeGrid();
        const hash = makeHash();
        const fixed: Body = { pos: { x: 5, y: 5 }, radius: 1.0 };
        const bodies: Body[] = [
            { pos: { x: 5.5, y: 5 }, radius: 0.3 },
            { pos: { x: 5, y: 5.5 }, radius: 0.3 },
            { pos: { x: 5.5, y: 5.5 }, radius: 0.3 },
        ];
        separate(grid, hash, bodies, 1.5, fixed);
        // Ningún cuerpo debe solapar con el fijo.
        for (const b of bodies) {
            expect(dist(b.pos, fixed.pos)).toBeGreaterThanOrEqual(1.29); // 1.0 + 0.3
        }
    });

    it('separación en diagonal', () => {
        const grid = makeGrid();
        const hash = makeHash();
        const bodies: Body[] = [
            { pos: { x: 5, y: 5 }, radius: 0.5 },
            { pos: { x: 5.3, y: 5.3 }, radius: 0.5 }, // distancia ~0.42, solapan
        ];
        separate(grid, hash, bodies, 1);
        expect(dist(bodies[0]!.pos, bodies[1]!.pos)).toBeGreaterThanOrEqual(0.99);
    });
});
