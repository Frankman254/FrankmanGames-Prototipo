// MUN-03: Verificación estática de colisiones del pueblo
// Confirma que las casas, cercas y obstáculos tienen colisión correcta.

import { describe, it, expect } from 'vitest';
import vegetation from '../data/vegetation.json';
import ambient from '../data/ambient.json';
import navpaint from '../data/navpaint.json';

const houses = vegetation.props.filter((p: any) => p.kind === 'house');
const placed = ambient.placed;
const pieces = ambient.pieces;

function isSolid(pieceId: string): boolean {
    return (pieces as Record<string, { solid: boolean }>)[pieceId]?.solid === true;
}

describe('MUN-03: Colisiones del pueblo', () => {
    it('todas las casas tienen dimensiones válidas', () => {
        for (const h of houses) {
            expect(h.w).toBeDefined();
            expect(h.d).toBeDefined();
            expect(h.w).toBeGreaterThan(0);
            expect(h.d).toBeGreaterThan(0);
        }
    });

    it('ninguna casa es demasiado pequeña para colisionar', () => {
        for (const h of houses) {
            expect(h.w).toBeGreaterThanOrEqual(5);
            expect(h.d).toBeGreaterThanOrEqual(5);
        }
    });

    it('no hay superposición entre casas', () => {
        for (let i = 0; i < houses.length; i++) {
            for (let j = i + 1; j < houses.length; j++) {
                const a = houses[i]!;
                const b = houses[j]!;
                const overlapX = Math.abs(a.x - b.x) < (a.w + b.w) / 2;
                const overlapY = Math.abs(a.y - b.y) < (a.d + b.d) / 2;
                expect(overlapX && overlapY).toBe(false);
            }
        }
    });

    it('las cercas de Villa Raspadura son sólidas', () => {
        const fences = placed.filter(
            (p: any) =>
                p.piece.includes('cerca') && p.x >= 90 && p.x <= 250 && p.y >= 60 && p.y <= 160,
        );
        expect(fences.length).toBeGreaterThan(0);
        for (const f of fences) {
            expect(isSolid(f.piece)).toBe(true);
        }
    });

    it('las cercas de Iguanera son sólidas', () => {
        const fences = placed.filter(
            (p: any) =>
                p.piece.includes('cerca') && p.x >= 610 && p.x <= 660 && p.y >= 220 && p.y <= 270,
        );
        expect(fences.length).toBeGreaterThan(0);
        for (const f of fences) {
            expect(isSolid(f.piece)).toBe(true);
        }
    });

    it('las cercas de Chitrí son sólidas', () => {
        const fences = placed.filter(
            (p: any) =>
                p.piece.includes('cerca') && p.x >= 70 && p.x <= 100 && p.y >= 415 && p.y <= 460,
        );
        expect(fences.length).toBeGreaterThan(0);
        for (const f of fences) {
            expect(isSolid(f.piece)).toBe(true);
        }
    });

    it('todas las piezas de cerca definidas son sólidas (excepto rota/caída/abierto)', () => {
        const cercaKeys = Object.keys(pieces).filter(
            (k) => k.includes('cerca') || k.includes('porton') || k.includes('barrera'),
        );
        for (const k of cercaKeys) {
            const def = (pieces as Record<string, { solid: boolean }>)[k];
            // Las cercas rotas, caídas y portones abiertos pueden no ser sólidas (diseño intencional)
            const exempt = k.includes('rota') || k.includes('caida') || k.includes('abierto');
            if (!exempt && def) {
                expect(def.solid).toBe(true);
            }
        }
    });

    it('hay casas en cada pueblo', () => {
        const zonas: { name: string; x0: number; y0: number; x1: number; y1: number }[] = [
            { name: 'Villa Raspadura', x0: 90, y0: 60, x1: 160, y1: 160 },
            { name: 'Iguanera', x0: 240, y0: 220, x1: 260, y1: 250 },
            { name: 'Pedasol', x0: 410, y0: -20, x1: 460, y1: 30 },
            { name: 'Punta Venada', x0: 280, y0: -100, x1: 320, y1: -80 },
            { name: 'Cambutal', x0: 20, y0: -230, x1: 70, y1: -210 },
            { name: 'Chitrí', x0: -40, y0: 460, x1: 40, y1: 520 },
        ];
        for (const z of zonas) {
            const count = houses.filter(
                (h: any) => h.x >= z.x0 && h.x <= z.x1 && h.y >= z.y0 && h.y <= z.y1,
            ).length;
            expect(count).toBeGreaterThan(0);
        }
    });

    it('navpaint tiene celdas bloqueadas válidas', () => {
        expect(navpaint.blocked).toBeDefined();
        expect(Array.isArray(navpaint.blocked)).toBe(true);
        for (const b of navpaint.blocked) {
            expect(b).toHaveLength(3);
            expect(typeof b[0]).toBe('number'); // fila
            expect(typeof b[1]).toBe('number'); // col inicio
            expect(typeof b[2]).toBe('number'); // col fin
            expect(Number(b[1])).toBeLessThanOrEqual(Number(b[2]));
        }
    });

    it('los landmarks sólidos (castillo, iglesia, trapiche) tienen dimensiones adecuadas', () => {
        const landmarks = vegetation.props.filter((p: any) => p.kind === 'landmark');
        const solid = landmarks.filter((l: any) => ['castillo', 'iglesia', 'trapiche'].includes(l.model));
        for (const l of solid) {
            expect(l.w).toBeGreaterThan(5);
            expect(l.d).toBeGreaterThan(5);
        }
    });
});
