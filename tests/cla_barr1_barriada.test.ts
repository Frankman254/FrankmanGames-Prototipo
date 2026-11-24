// CLA-BARR1: la barriada de Praderas del Norte (data/barriada.json) — lotes a los dos lados de cada
// calle, casas variadas que caben en su lote con la fachada a la calle, y todo se recorre andando
// desde la plaza de la piedra.
import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';
import { NavGrid } from '../src/sim/navGrid';
import { PLANTA, casaCreadorDoor } from '../src/world/casaCreador';
import {
    BARRIADA,
    barriadaArboles,
    barriadaBounds,
    barriadaFarolas,
    barriadaCalleAncho,
    barriadaCasas,
    barriadaInicio,
    barriadaLosas,
    barriadaLotes,
    barriadaPiedra,
    barriadaSolids,
} from '../src/world/barriada';

const NAV_RADIUS = 0.5;
const CELL = 0.5;

function grid(): NavGrid {
    const b = barriadaBounds();
    const g = new NavGrid(b.x1 - b.x0, b.y1 - b.y0, CELL, b.x0, b.y0);
    for (const o of barriadaSolids()) g.stamp(o, NAV_RADIUS);
    return g;
}

describe('CLA-BARR1 barriada de Praderas del Norte', () => {
    it('cientos de lotes de 10 × 21,5 m, a los dos lados de cada calle, sin pisarse', () => {
        const lotes = barriadaLotes();
        expect(lotes.length).toBeGreaterThan(300);
        for (const c of BARRIADA.calles) {
            expect(lotes.some((l) => l.calle === c.id && l.lado === 1)).toBe(true);
            expect(lotes.some((l) => l.calle === c.id && l.lado === -1)).toBe(true);
        }
        const key = (l: { x0: number; y0: number }): string => `${l.x0.toFixed(2)},${l.y0.toFixed(2)}`;
        expect(new Set(lotes.map(key)).size).toBe(lotes.length);
        const b = barriadaBounds();
        for (const l of lotes) {
            expect([l.ancho, l.fondo]).toEqual([10, 21.5]);
            expect(l.x0).toBeGreaterThanOrEqual(b.x0);
            expect(l.x0 + l.ancho).toBeLessThanOrEqual(b.x1);
            expect(l.y0).toBeGreaterThanOrEqual(b.y0);
            expect(l.y0 + l.fondo).toBeLessThanOrEqual(b.y1);
        }
        // Dos lotes del mismo frente no se solapan (las filas van espalda con espalda).
        const byRow = new Map<string, typeof lotes>();
        for (const l of lotes) byRow.set(l.y0.toFixed(2), [...(byRow.get(l.y0.toFixed(2)) ?? []), l]);
        for (const row of byRow.values()) {
            const xs = row.map((l) => l.x0).sort((a, b) => a - b);
            for (let i = 1; i < xs.length; i++) expect(xs[i]! - xs[i - 1]!).toBeGreaterThanOrEqual(10 - 1e-6);
        }
    });

    it('ningún lote cae sobre la transversal ni sobre otra calle', () => {
        const half = barriadaCalleAncho() / 2;
        const o = BARRIADA.origen;
        for (const l of barriadaLotes()) {
            for (const t of BARRIADA.transversales) {
                const tx = o.x + t.x;
                expect(l.x0 + l.ancho <= tx - half + 1e-6 || l.x0 >= tx + half - 1e-6, l.id).toBe(true);
            }
            for (const c of BARRIADA.calles) {
                const cy = o.y + c.y;
                expect(l.y0 + l.fondo <= cy - half + 1e-6 || l.y0 >= cy + half - 1e-6, l.id).toBe(true);
            }
        }
    });

    it('cada casa cabe en su lote con la fachada y la puerta hacia su calle', () => {
        const lotes = barriadaLotes();
        const casas = barriadaCasas();
        expect(casas).toHaveLength(lotes.length);
        casas.forEach((c, i) => {
            const l = lotes[i]!;
            expect(c.x - PLANTA.ancho / 2).toBeGreaterThan(l.x0);
            expect(c.x + PLANTA.ancho / 2).toBeLessThan(l.x0 + l.ancho);
            expect(c.y - PLANTA.fondo / 2).toBeGreaterThan(l.y0);
            expect(c.y + PLANTA.fondo / 2).toBeLessThan(l.y0 + l.fondo);
            const door = casaCreadorDoor(c).door;
            const calle = BARRIADA.origen.y + BARRIADA.calles.find((k) => k.id === l.calle)!.y;
            // La puerta mira a la calle: queda entre el centro de la casa y la calle.
            expect(Math.sign(c.y - door.y)).toBe(Math.sign(c.y - calle));
            expect(c.rotDeg).toBe(l.lado === 1 ? 0 : 180);
        });
    });

    it('las casas no son todas iguales: dos modelos y varios colores de pared, zócalo y reja', () => {
        const casas = barriadaCasas();
        const n = (f: (c: (typeof casas)[number]) => unknown): number => new Set(casas.map((c) => JSON.stringify(f(c)))).size;
        expect(n((c) => c.model)).toBe(2);
        expect(n((c) => c.pared)).toBe(BARRIADA.variantes.pared.length);
        expect(n((c) => c.zocalo)).toBe(BARRIADA.variantes.zocalo.length);
        expect(n((c) => c.reja)).toBe(BARRIADA.variantes.reja.length);
        // Fijo: la misma barriada cada vez.
        expect(barriadaCasas()).toEqual(casas);
    });

    it('desde la plaza se llega andando a la puerta de cada casa y a la piedra de vuelta', () => {
        const g = grid();
        const start = g.cellOf(barriadaInicio());
        expect(g.walkableCell(start.cx, start.cy)).toBe(true);
        const seen = new Uint8Array(g.cols * g.rows);
        const queue = [start];
        seen[g.index(start.cx, start.cy)] = 1;
        while (queue.length) {
            const { cx, cy } = queue.pop()!;
            for (const [dx, dy] of [
                [1, 0],
                [-1, 0],
                [0, 1],
                [0, -1],
            ] as const) {
                const nx = cx + dx;
                const ny = cy + dy;
                if (!g.inBounds(nx, ny) || !g.walkableCell(nx, ny)) continue;
                const i = g.index(nx, ny);
                if (seen[i]) continue;
                seen[i] = 1;
                queue.push({ cx: nx, cy: ny });
            }
        }
        // Delante de la puerta de reja, dentro del lote (a 1 m de la acera).
        const lotes = barriadaLotes();
        barriadaCasas().forEach((c, i) => {
            const l = lotes[i]!;
            const door = casaCreadorDoor(c).door;
            const out = g.cellOf({ x: door.x, y: l.lado === 1 ? l.y0 + 1 : l.y0 + l.fondo - 1 });
            expect(seen[g.index(out.cx, out.cy)], c.lote).toBe(1);
        });
        const p = barriadaPiedra();
        const near = g.cellOf({ x: p.x, y: p.y - 2.6 });
        expect(seen[g.index(near.cx, near.cy)]).toBe(1);
    });

    it('la barriada está lejos del mapa de Panamá y su piedra existe en stones.json', () => {
        const b = barriadaBounds();
        const terrain = JSON.parse(readFileSync('data/terrain.json', 'utf-8')) as { world?: { x0?: number; x1?: number } };
        // El mundo llega hasta x ≈ 4352: la barriada empieza más allá.
        expect(b.x0).toBeGreaterThan(terrain.world?.x1 ?? 4352);
        const stones = JSON.parse(readFileSync('data/stones.json', 'utf-8')).stones as Array<{ id: string }>;
        expect(stones.some((s) => s.id === 'praderas_norte')).toBe(true);
    });

    it('las losas de calle quedan dentro de la zona', () => {
        const b = barriadaBounds();
        for (const l of barriadaLosas()) {
            expect(l.x0).toBeGreaterThanOrEqual(b.x0);
            expect(l.x1).toBeLessThanOrEqual(b.x1);
            expect(l.y0).toBeGreaterThanOrEqual(b.y0);
            expect(l.y1).toBeLessThanOrEqual(b.y1);
            expect(l.x1).toBeGreaterThan(l.x0);
            expect(l.y1).toBeGreaterThan(l.y0);
        }
    });
    // CLA-BARR2: farolas y árboles.
    it('farolas en la grama de todas las calles, sin pisar andenes ni entradas de auto', () => {
        const farolas = barriadaFarolas();
        for (const c of BARRIADA.calles) {
            const cy = BARRIADA.origen.y + c.y;
            const mias = farolas.filter((f) => Math.abs(f.y - cy) < barriadaCalleAncho() / 2);
            expect(mias.length, c.id).toBeGreaterThan(3);
            for (const f of mias) {
                // En la franja de grama, entre el cordón y la acera, y colgando hacia la calle.
                const d = Math.abs(f.y - cy);
                expect(d).toBeGreaterThan(BARRIADA.calle.calzada / 2 + BARRIADA.calle.cordon);
                expect(d).toBeLessThan(BARRIADA.calle.calzada / 2 + BARRIADA.calle.cordon + BARRIADA.calle.grama);
                expect(Math.sign(cy - f.y)).toBe(f.haciaY);
            }
        }
        const pasos = barriadaLosas().filter((l) => l.pieza === 'concreto');
        for (const p of [...farolas, ...barriadaArboles()]) {
            const pisa = pasos.some((l) => p.x > l.x0 - 0.3 && p.x < l.x1 + 0.3 && p.y > l.y0 - 0.3 && p.y < l.y1 + 0.3);
            expect(pisa, `${p.x},${p.y}`).toBe(false);
        }
    });

    it('ningún árbol cae en la calzada, dentro de un lote ni fuera de la zona, y son los de siempre', () => {
        const arboles = barriadaArboles();
        expect(arboles.length).toBeGreaterThan(100);
        const vegetation = JSON.parse(readFileSync('data/vegetation.json', 'utf-8')) as {
            kinds: Record<string, { shape: string }>;
        };
        const b = barriadaBounds();
        const asfalto = barriadaLosas().filter((l) => l.pieza === 'asfalto');
        const lotes = barriadaLotes();
        for (const a of arboles) {
            expect(vegetation.kinds[a.especie]?.shape, a.especie).toBe('tree');
            expect(a.x > b.x0 && a.x < b.x1 && a.y > b.y0 && a.y < b.y1).toBe(true);
            expect(asfalto.some((l) => a.x > l.x0 && a.x < l.x1 && a.y > l.y0 && a.y < l.y1)).toBe(false);
            expect(lotes.some((l) => a.x > l.x0 && a.x < l.x0 + l.ancho && a.y > l.y0 && a.y < l.y0 + l.fondo)).toBe(false);
        }
        expect(barriadaArboles()).toEqual(arboles);
    });
});
