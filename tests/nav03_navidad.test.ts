// NAV-03: mapa de Navidad (data/navidad.json) — mapa aparte con su Piedra Pintada de entrada en Villa
// Raspadura y su piedra de vuelta en la plaza; cada pieza es un nodo de navidad.glb y todo se recorre
// andando desde la llegada.
import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';
import stonesJson from '../data/stones.json';
import enContent from '../data/i18n/en.content.json';
import { NavGrid } from '../src/sim/navGrid';
import { BARRIADA } from '../src/world/barriada';
import {
    NAVIDAD,
    NAVIDAD_STONE,
    guirnaldaEscala,
    navidadBounds,
    navidadFaroles,
    navidadGuirnaldas,
    navidadInicio,
    navidadPiedra,
    navidadPiezas,
    navidadSolids,
} from '../src/world/navidad';

const CELL = 0.5;
const NAV_RADIUS = 0.5;

function grid(): NavGrid {
    const b = navidadBounds();
    const g = new NavGrid(b.x1 - b.x0, b.y1 - b.y0, CELL, b.x0, b.y0);
    for (const o of navidadSolids()) g.stamp(o, NAV_RADIUS);
    return g;
}

/** Nodos que trae assets/models/navidad.glb (cabecera JSON del GLB). */
function glbNodes(): Set<string> {
    const b = readFileSync('assets/models/navidad.glb');
    const n = b.readUInt32LE(12);
    const json = JSON.parse(b.subarray(20, 20 + n).toString('utf8')) as { nodes: Array<{ name?: string }> };
    return new Set(json.nodes.map((x) => x.name ?? ''));
}

const inside = (p: { x: number; y: number }, m = 0): boolean => {
    const b = navidadBounds();
    return p.x >= b.x0 + m && p.x <= b.x1 - m && p.y >= b.y0 + m && p.y <= b.y1 - m;
};

describe('NAV-03 mapa de Navidad', () => {
    it('está lejos del mapa y de la barriada, sin solaparse', () => {
        const b = navidadBounds();
        const o = BARRIADA.origen;
        const solapa = b.x0 < o.x + BARRIADA.ancho && o.x < b.x1 && b.y0 < o.y + BARRIADA.fondo && o.y < b.y1;
        expect(solapa).toBe(false);
        expect(b.x0).toBeGreaterThan(5000);
    });

    it('cada pieza es un nodo de navidad.glb y cae dentro del mapa', () => {
        const nodes = glbNodes();
        const piezas = navidadPiezas();
        expect(piezas.length).toBeGreaterThan(30);
        for (const p of piezas) {
            expect(nodes.has(p.modelo), `${p.modelo} no está en navidad.glb`).toBe(true);
            expect(inside(p, 2), `${p.modelo} en ${p.x},${p.y} fuera del mapa`).toBe(true);
        }
        expect(nodes.has('guirnalda')).toBe(true);
    });

    it('la Piedra Pintada `navidad` existe en el mundo, cerca de la de Villa Raspadura, con nombre en inglés', () => {
        const stones = stonesJson.stones as Array<{ id: string; name: string; x: number; y: number }>;
        const nav = stones.find((s) => s.id === NAVIDAD_STONE);
        const ras = stones.find((s) => s.id === 'raspadura')!;
        expect(nav, 'falta la piedra navidad en data/stones.json').toBeDefined();
        expect(Math.hypot(nav!.x - ras.x, nav!.y - ras.y)).toBeLessThan(40);
        expect((enContent as Record<string, string>)[nav!.name]).toBeTruthy();
    });

    it('la piedra de vuelta y la llegada están dentro, en el paseo, y la llegada es pisable', () => {
        const piedra = navidadPiedra();
        const inicio = navidadInicio();
        expect(inside(piedra, 2)).toBe(true);
        expect(Math.abs(piedra.x - (NAVIDAD.origen.x + NAVIDAD.paseo.x))).toBeLessThan(NAVIDAD.paseo.ancho / 2);
        expect(Math.hypot(piedra.x - inicio.x, piedra.y - inicio.y)).toBeLessThan(6);
        expect(grid().walkable(inicio)).toBe(true);
    });

    it('desde la llegada se llega andando al árbol, al nacimiento, a cada casita y a cada farol', () => {
        const g = grid();
        const start = g.cellOf(navidadInicio());
        const seen = new Set<number>([g.index(start.cx, start.cy)]);
        const queue = [start];
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
                const k = g.index(nx, ny);
                if (seen.has(k)) continue;
                seen.add(k);
                queue.push({ cx: nx, cy: ny });
            }
        }
        // Algún punto a 4 m de cada pieza (por delante o al lado) se alcanza.
        const reach = (p: { x: number; y: number }, r: number): boolean => {
            for (let a = 0; a < 16; a++) {
                const q = { x: p.x + Math.cos((a * Math.PI) / 8) * r, y: p.y + Math.sin((a * Math.PI) / 8) * r };
                if (!inside(q)) continue;
                const c = g.cellOf(q);
                if (g.inBounds(c.cx, c.cy) && seen.has(g.index(c.cx, c.cy))) return true;
            }
            return false;
        };
        for (const p of navidadPiezas()) {
            const r = p.modelo.startsWith('casita') || p.modelo === 'nacimiento' ? 5.5 : p.modelo === 'arbol_navidad' ? 4.5 : 2;
            expect(reach(p, r), `${p.modelo} en ${p.x},${p.y} no se alcanza`).toBe(true);
        }
    });

    it('las guirnaldas cierran el anillo de faroles de la plaza sin estirarse de más', () => {
        const gs = navidadGuirnaldas();
        expect(gs.length).toBe(12);
        const faroles = navidadFaroles();
        for (const g of gs) {
            expect(faroles.some((f) => f.x === g.desde.x && f.y === g.desde.y)).toBe(true);
            expect(faroles.some((f) => f.x === g.hasta.x && f.y === g.hasta.y)).toBe(true);
            const s = guirnaldaEscala(g);
            expect(s).toBeGreaterThan(0.8);
            expect(s).toBeLessThan(1.6);
        }
    });

    it('sigue siendo PROPUESTA y no trae cifras de combate ni de economía', () => {
        const raw = JSON.parse(readFileSync('data/navidad.json', 'utf8')) as Record<string, unknown>;
        expect(raw._estado).toBe('PROPUESTA');
        const text = JSON.stringify(raw);
        for (const k of ['"oro"', '"precio"', '"dano"', '"xp"', '"nivel"']) expect(text.includes(k), k).toBe(false);
    });
});

describe('NAV-03 parpadeo de las luces', () => {
    it('luzNavidad queda entre 0,25 y 1 y cambia con el tiempo', async () => {
        const { luzNavidad } = await import('../src/render/navidadView');
        const vals = Array.from({ length: 200 }, (_, i) => luzNavidad(i * 0.1, 1.7));
        for (const v of vals) {
            expect(v).toBeGreaterThanOrEqual(0.25);
            expect(v).toBeLessThanOrEqual(1);
        }
        expect(Math.max(...vals) - Math.min(...vals)).toBeGreaterThan(0.3);
    });
});
