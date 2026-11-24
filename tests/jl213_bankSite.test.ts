// JL-213: Prueba de src/world/bankSite.ts — el banco cae dentro del mundo,
// en celda transitable y lejos de las Piedras Pintadas.
import { describe, expect, it } from 'vitest';
import stonesJson from '../data/stones.json';
import { BANK_LOCATION } from '../src/world/bankSite';
import { parseStones } from '../src/world/stones';
import { overworld, worldData } from './fixtures/overworld';

const def = parseStones(stonesJson);
const wd = worldData();
const ow = overworld();
const plot = { width: ow.def.width, depth: ow.def.depth };

const inPlot = (p: { x: number; y: number }): boolean =>
    p.x >= 0 && p.y >= 0 && p.x <= plot.width && p.y <= plot.depth;

describe('JL-213: Ubicación del banco', () => {
    it('BANK_LOCATION tiene coordenadas válidas', () => {
        const b = BANK_LOCATION.building;
        expect(typeof b.x).toBe('number');
        expect(typeof b.y).toBe('number');
        expect(typeof b.w).toBe('number');
        expect(typeof b.d).toBe('number');
        expect(!Number.isNaN(b.x) && !Number.isNaN(b.y)).toBe(true);
        expect(b.w).toBeGreaterThan(0);
        expect(b.d).toBeGreaterThan(0);
    });

    it('el edificio del banco está dentro del mundo', () => {
        const b = BANK_LOCATION.building;
        const cx = b.x;
        const cy = b.y;
        expect(inPlot({ x: cx, y: cy }), 'centro del banco').toBe(true);
        // Esquinas
        expect(inPlot({ x: cx - b.w / 2, y: cy - b.d / 2 }), 'esquina SW').toBe(true);
        expect(inPlot({ x: cx + b.w / 2, y: cy - b.d / 2 }), 'esquina NW').toBe(true);
        expect(inPlot({ x: cx - b.w / 2, y: cy + b.d / 2 }), 'esquina SE').toBe(true);
        expect(inPlot({ x: cx + b.w / 2, y: cy + b.d / 2 }), 'esquina NE').toBe(true);
    });

    it('la entrada del banco está dentro del mundo', () => {
        const e = BANK_LOCATION.entrance;
        expect(inPlot({ x: e.x, y: e.y }), 'entrada').toBe(true);
    });

    it('el punto de retorno del banco está dentro del mundo', () => {
        const r = BANK_LOCATION.returnPoint;
        expect(inPlot({ x: r.x, y: r.y }), 'returnPoint').toBe(true);
    });

    it('el centro del banco cae en celda transitable', () => {
        const b = BANK_LOCATION.building;
        if (inPlot({ x: b.x, y: b.y })) {
            expect(ow.grid.walkable({ x: b.x, y: b.y }), 'centro del banco').toBe(true);
        }
    });

    it('la entrada del banco cae en celda transitable', () => {
        const e = BANK_LOCATION.entrance;
        if (inPlot({ x: e.x, y: e.y })) {
            expect(ow.grid.walkable({ x: e.x, y: e.y }), 'entrada').toBe(true);
        }
    });

    it('el punto de retorno del banco cae en celda transitable', () => {
        const r = BANK_LOCATION.returnPoint;
        if (inPlot({ x: r.x, y: r.y })) {
            expect(ow.grid.walkable({ x: r.x, y: r.y }), 'returnPoint').toBe(true);
        }
    });

    it('el banco está lejos de las Piedras Pintadas (mínimo 10 m)', () => {
        const b = BANK_LOCATION.building;
        const bankCenter = { x: b.x, y: b.y };
        for (const s of def.stones) {
            const dist = Math.hypot(s.x - bankCenter.x, s.y - bankCenter.y);
            expect(dist, `${s.id}: a ${dist.toFixed(1)} m`).toBeGreaterThanOrEqual(10);
        }
    });

    it('la entrada del banco está lejos de las Piedras Pintadas (mínimo 10 m)', () => {
        const e = BANK_LOCATION.entrance;
        for (const s of def.stones) {
            const dist = Math.hypot(s.x - e.x, s.y - e.y);
            expect(dist, `${s.id}: a ${dist.toFixed(1)} m`).toBeGreaterThanOrEqual(10);
        }
    });

    it('el banco no solapa con ninguna Piedra Pintada', () => {
        const b = BANK_LOCATION.building;
        const halfW = b.w / 2;
        const halfD = b.d / 2;
        for (const s of def.stones) {
            // Distancia del centro de la piedra al rectángulo del banco
            const dx = Math.max(halfW - Math.abs(s.x - b.x), 0);
            const dz = Math.max(halfD - Math.abs(s.y - b.y), 0);
            const overlap = Math.hypot(dx, dz);
            expect(overlap, `${s.id}: solape ${overlap.toFixed(2)} m`).toBe(0);
        }
    });
});
