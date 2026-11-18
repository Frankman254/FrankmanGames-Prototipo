// Estrella de vendaval congelaba el render: la malla de la estrella usaba CreatePolygon (necesita
// earcut, que no se carga) y sólo cubría media vuelta. Ahora el contorno es puro y debe coincidir
// con el área que golpea la simulación.
import { describe, expect, it } from 'vitest';
import { starOutline } from '../src/render/starOutline';
import { shapeHitsCircle } from '../src/sim/shapes';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** ¿Está el punto dentro del polígono? (par/impar) */
function inside(poly: [number, number][], x: number, z: number): boolean {
    let ok = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, zi] = poly[i]!;
        const [xj, zj] = poly[j]!;
        if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) ok = !ok;
    }
    return ok;
}

describe('estrella de ocho puntas (área star)', () => {
    const arm = 3.2;
    const width = 1;
    const poly = starOutline(arm, width);
    const placed = { def: { type: 'star' as const, arm, width }, origin: { x: 0, y: 0 }, dir: 0 };

    it('tiene ocho puntas que dan la vuelta entera', () => {
        expect(poly).toHaveLength(24);
        const angles = new Set(poly.filter((_, i) => i % 3 !== 2).map(([x, z]) => (Math.round((Math.atan2(z, x) * 4) / Math.PI) + 8) % 8));
        expect(angles.size).toBe(8);
    });

    it('cubre lo mismo que golpea la simulación', () => {
        let diff = 0;
        let n = 0;
        for (let x = -3.5; x <= 3.5; x += 0.1)
            for (let z = -3.5; z <= 3.5; z += 0.1) {
                // Lejos del borde (±0,06 m) ambas deben coincidir.
                const near = [
                    [0.06, 0], [-0.06, 0], [0, 0.06], [0, -0.06],
                ].map(([ox, oz]) => shapeHitsCircle(placed, { x: x + ox!, y: z + oz! }, 0));
                const a = near.some(Boolean);
                const b = near.every(Boolean);
                if (a !== b) continue;
                n++;
                if (inside(poly, x, z) !== a) diff++;
            }
        expect(n).toBeGreaterThan(4000);
        expect(diff).toBe(0);
    });

    it('el render no usa CreatePolygon (requiere earcut y lanzaba dentro del bucle de dibujo)', () => {
        const src = readFileSync(join(__dirname, '../src/render/enemyView.ts'), 'utf8');
        expect(src).not.toMatch(/CreatePolygon|ExtrudePolygon/);
    });
});
