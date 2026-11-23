// CLA-CASA2: la casa del creador se camina por dentro (3 recámaras, 2 baños, cocina, sala-comedor y
// portal), la puerta del mundo cae en el hueco P1 de la planta y la versión espejada es simétrica.
import { describe, expect, it } from 'vitest';
import { NavGrid } from '../src/sim/navGrid';
import {
    CASA_CELL,
    CASA_NAV_RADIUS,
    PLANTA,
    casaAmbienteAt,
    casaCreadorDoor,
    casaRoomExit,
    casaRoomSize,
    casaRoomSolids,
    casaRoomStart,
    casaToRoom,
} from '../src/world/casaCreador';

function reachable(espejo: boolean): { grid: NavGrid; seen: Uint8Array } {
    const { width, depth } = casaRoomSize();
    const grid = NavGrid.fromObstacles(width, depth, CASA_CELL, casaRoomSolids(espejo), CASA_NAV_RADIUS);
    const seen = new Uint8Array(grid.cols * grid.rows);
    const start = grid.cellOf(casaRoomStart(espejo));
    expect(grid.walkableCell(start.cx, start.cy)).toBe(true);
    const queue = [start];
    seen[grid.index(start.cx, start.cy)] = 1;
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
            if (!grid.inBounds(nx, ny) || !grid.walkableCell(nx, ny)) continue;
            const i = grid.index(nx, ny);
            if (seen[i]) continue;
            seen[i] = 1;
            queue.push({ cx: nx, cy: ny });
        }
    }
    return { grid, seen };
}

describe('CLA-CASA2 casa del creador', () => {
    it('la planta tiene 3 recámaras, 2 baños, cocina, sala-comedor y portal', () => {
        const ids = PLANTA.ambientes.map((a) => a.id);
        expect(ids.filter((i) => i.startsWith('recamara'))).toHaveLength(3);
        expect(ids.filter((i) => i.startsWith('bano'))).toHaveLength(2);
        expect(ids).toEqual(expect.arrayContaining(['cocina', 'sala_comedor', 'portal', 'pasillo']));
        // Cada baño tiene su ventana alta (V-C) en el muro exterior.
        const vc = PLANTA.muros.flatMap((m) => m.huecos.filter((h) => h.tipo === 'V-C'));
        expect(vc).toHaveLength(2);
        const banos = PLANTA.ambientes.filter((a) => a.id.startsWith('bano'));
        for (const b of banos) expect(vc.some((h) => h.desde >= b.d0 - 1e-6 && h.hasta <= b.d1 + 1e-6)).toBe(true);
    });

    for (const espejo of [false, true]) {
        it(`se llega andando a todos los ambientes y a la salida (${espejo ? 'espejo' : 'base'})`, () => {
            const { grid, seen } = reachable(espejo);
            const llegados = new Set<string>();
            for (let i = 0; i < seen.length; i++) {
                if (!seen[i]) continue;
                const a = casaAmbienteAt(grid.center(i), espejo);
                if (a) llegados.add(a);
            }
            expect([...llegados].sort()).toEqual(PLANTA.ambientes.map((a) => a.id).sort());
            const exit = grid.cellOf(casaRoomExit(espejo).pos);
            expect(seen[grid.index(exit.cx, exit.cy)]).toBe(1);
        });
    }

    it('el espejo refleja la planta en x', () => {
        const { width } = casaRoomSize();
        const a = casaToRoom(1, 2, false);
        const b = casaToRoom(1, 2, true);
        expect(a.x + b.x).toBeCloseTo(width);
        expect(a.y).toBeCloseTo(b.y);
        const sa = casaRoomSolids(false).map((s) => `${(width - s.x).toFixed(3)},${s.y.toFixed(3)},${s.w.toFixed(3)}`).sort();
        const sb = casaRoomSolids(true).map((s) => `${s.x.toFixed(3)},${s.y.toFixed(3)},${s.w.toFixed(3)}`).sort();
        expect(sb).toEqual(sa);
    });

    it('la puerta del mundo cae en el hueco P1 y la salida queda delante del portal', () => {
        // rotDeg 0: fachada a −Z; la puerta está 4,5 m delante del centro y 0,30 m a la derecha
        // (base) o a la izquierda (espejo) del eje, mirando desde la calle.
        const base = casaCreadorDoor({ model: 'casa_creador', x: 100, y: 200, rotDeg: 0 });
        expect(base.door.x).toBeCloseTo(100.3);
        expect(base.door.y).toBeCloseTo(195.5);
        expect(base.outside.y).toBeCloseTo(193.2);
        const esp = casaCreadorDoor({ model: 'casa_creador_espejo', x: 100, y: 200, rotDeg: 0 });
        expect(esp.espejo).toBe(true);
        expect(esp.door.x).toBeCloseTo(99.7);
        // Girada 90°: la fachada mira a −X.
        const g = casaCreadorDoor({ model: 'casa_creador', x: 100, y: 200, rotDeg: 90 });
        expect(g.door.x).toBeCloseTo(95.5);
        expect(g.door.y).toBeCloseTo(199.7);
    });
});

describe('CLA-CASA2 urbanización', () => {
    it('cada lote tiene su casa en vegetation.json, con la fachada a la calle', async () => {
        const { readFileSync } = await import('fs');
        const veg = JSON.parse(readFileSync('data/vegetation.json', 'utf-8')) as {
            props: Array<{ kind: string; model?: string; x: number; y: number; w: number; d: number; rotDeg: number }>;
        };
        const { URBANIZACION, loteCasa, calleAncho } = await import('../src/world/urbanizacion');
        const casas = veg.props.filter((p) => p.kind === 'landmark' && (p.model ?? '').startsWith('casa_creador'));
        expect(casas).toHaveLength(URBANIZACION.lotes.length);
        const modelos = new Set(URBANIZACION.lotes.map((l) => l.modelo));
        expect(modelos).toEqual(new Set(['casa_creador', 'casa_creador_espejo']));
        for (const l of URBANIZACION.lotes) {
            const c = loteCasa(l);
            const p = casas.find((q) => Math.abs(q.x - c.x) < 1e-6 && Math.abs(q.y - c.y) < 1e-6);
            expect(p, l.id).toBeDefined();
            expect(p!.model).toBe(l.modelo);
            expect(p!.rotDeg).toBe(0);
            expect([p!.w, p!.d]).toEqual([PLANTA.ancho, PLANTA.fondo]);
            // La casa cabe en su lote y el lote empieza donde acaba la acera.
            expect(c.x - c.w / 2).toBeGreaterThan(l.x0);
            expect(c.x + c.w / 2).toBeLessThan(l.x0 + l.ancho);
            expect(c.y + c.d / 2).toBeLessThan(l.y0 + l.fondo);
            const calle = URBANIZACION.calles[0]!;
            expect(Math.abs(l.y0 - (calle.y + calleAncho(calle) / 2))).toBeLessThan(0.1);
            // Ningún otro prop dentro del lote (salvo su casa).
            for (const q of veg.props) {
                if (q === p) continue;
                const inside = q.x > l.x0 && q.x < l.x0 + l.ancho && q.y > l.y0 && q.y < l.y0 + l.fondo;
                expect(inside, `${q.kind} ${q.model ?? ''} en ${l.id}`).toBe(false);
            }
        }
    });

    it('ni árboles ni rocas en lotes y calle; piedras y alzadores fuera', async () => {
        const { readFileSync } = await import('fs');
        const { URBANIZACION, insideLot, insideStreet } = await import('../src/world/urbanizacion');
        const stones = JSON.parse(readFileSync('data/stones.json', 'utf-8')).stones as Array<{ x: number; y: number }>;
        const death = JSON.parse(readFileSync('data/death.json', 'utf-8')).resurrectors as Array<{ x: number; y: number }>;
        for (const s of [...stones, ...death]) {
            expect(insideLot(s.x, s.y, URBANIZACION, 3)).toBe(false);
            expect(insideStreet(s.x, s.y, URBANIZACION, 3)).toBe(false);
        }
        const amb = JSON.parse(readFileSync('data/ambient.json', 'utf-8')).placed as Array<{ x: number; y: number }>;
        for (const a of amb) expect(insideLot(a.x, a.y) || insideStreet(a.x, a.y)).toBe(false);
    });
});
