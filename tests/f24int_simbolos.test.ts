import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import ambientJson from '../data/ambient.json';
import { parseAmbient } from '../src/data/ambientSchema';
import { parseCatalogGlb } from '../src/render/catalogGeometry';
import { solidFootprint } from '../src/world/ambient';

const parsed = parseAmbient(ambientJson);

const SIMBOLO_PIECES = [
    'simbolo_aretes_oro',
    'simbolo_estatua_arpia',
    'simbolo_machete_ceremonial',
    'simbolo_monedas_ficticias',
    'simbolo_sombrero_trenzado',
    'simbolo_vestido_festivo',
];

describe('F24-INT: integración de simbolos_istmo.glb', () => {
    it('los 6 nodos de símbolos existen en el GLB', () => {
        const file = readFileSync('assets/models/simbolos_istmo.glb');
        const data = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
        const library = parseCatalogGlb(data);
        for (const id of SIMBOLO_PIECES) {
            expect(library.get(id), `${id} en simbolos_istmo.glb`).toBeDefined();
        }
    });

    it('las dimensiones declaradas coinciden con el GLB (tolerancia 0.02 m)', () => {
        const file = readFileSync('assets/models/simbolos_istmo.glb');
        const data = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
        const library = parseCatalogGlb(data);
        for (const [id, piece] of Object.entries(parsed.pieces)) {
            if (piece.model !== 'simbolos_istmo') continue;
            const geometry = library.get(id);
            expect(geometry, id).toBeDefined();
            const size = geometry!.max.map((value, axis) => value - geometry!.min[axis]!) as [number, number, number];
            expect(Math.abs(size[0] - piece.w), `${id}: ancho`).toBeLessThanOrEqual(0.02);
            expect(Math.abs(size[1] - piece.h), `${id}: alto`).toBeLessThanOrEqual(0.02);
            expect(Math.abs(size[2] - piece.d), `${id}: fondo`).toBeLessThanOrEqual(0.02);
        }
    });

    it('el catálogo simbolos_istmo está registrado con 6 piezas', () => {
        const pieces = Object.entries(parsed.pieces).filter(([, p]) => p.model === 'simbolos_istmo');
        expect(pieces.length).toBe(6);
        const ids = pieces.map(([id]) => id);
        for (const id of SIMBOLO_PIECES) {
            expect(ids).toContain(id);
        }
    });

    it('simbolo_estatua_arpia es sólida y las demás son atravesables', () => {
        expect(parsed.pieces['simbolo_estatua_arpia']!.solid).toBe(true);
        for (const id of SIMBOLO_PIECES) {
            if (id === 'simbolo_estatua_arpia') continue;
            expect(parsed.pieces[id]!.solid, `${id} debe ser atravesable`).toBe(false);
        }
    });

    it('el piloto tiene exactamente 3 instancias', () => {
        const simboloPlaced = parsed.placed.filter((p) => p.piece.startsWith('simbolo_'));
        expect(simboloPlaced.length).toBe(3);
    });

    it('ninguna pieza está dentro de 10 m de puntos críticos de Iguanera', () => {
        const critical = [
            { x: 610, y: 240, name: 'muelle_seguro', r: 62 },
            { x: 617, y: 233, name: 'Eligio' },
            { x: 598, y: 238, name: 'Nena' },
            { x: 628, y: 244, name: 'Piedra' },
            { x: 592, y: 236, name: 'lancha' },
        ];
        const simboloPlaced = parsed.placed.filter((p) => p.piece.startsWith('simbolo_'));
        for (const p of simboloPlaced) {
            for (const c of critical) {
                let d = Math.hypot(p.x - c.x, p.y - c.y);
                if (c.r) d = d - c.r;
                expect(d, `${p.piece} → ${c.name}`).toBeGreaterThanOrEqual(10);
            }
        }
    });

    it('las piezas sólidas no se superponen entre sí', () => {
        const solidSimbolo = parsed.placed.filter(
            (p) => p.piece.startsWith('simbolo_') && parsed.pieces[p.piece]?.solid,
        );
        const footprints = solidSimbolo.map((p) => ({ p, fp: solidFootprint(parsed, p) }));

        for (let i = 0; i < footprints.length; i++) {
            for (let j = i + 1; j < footprints.length; j++) {
                const a = footprints[i]!;
                const b = footprints[j]!;
                let overlap = false;
                for (const ptA of a.fp) {
                    for (const ptB of b.fp) {
                        if (Math.hypot(ptA.x - ptB.x, ptA.y - ptB.y) < 0.3) {
                            overlap = true;
                        }
                    }
                }
                expect(overlap, `${a.p.piece} vs ${b.p.piece}: sin superposición}`).toBe(false);
            }
        }
    });

    it('determinismo: las piezas puestas a mano son estables', () => {
        const parsed2 = parseAmbient(ambientJson);
        const simbolo1 = parsed.placed.filter((p) => p.piece.startsWith('simbolo_'));
        const simbolo2 = parsed2.placed.filter((p) => p.piece.startsWith('simbolo_'));
        expect(simbolo1.length).toBe(simbolo2.length);
        for (let i = 0; i < simbolo1.length; i++) {
            expect(simbolo1[i]!.piece).toBe(simbolo2[i]!.piece);
            expect(simbolo1[i]!.x).toBe(simbolo2[i]!.x);
            expect(simbolo1[i]!.y).toBe(simbolo2[i]!.y);
        }
    });

    it('el presupuesto de placed no se excede con las nuevas piezas', () => {
        const maxPlaced = parsed.budget.maxPlaced;
        expect(parsed.placed.length, `placed total (${parsed.placed.length}) <= ${maxPlaced}`).toBeLessThanOrEqual(
            maxPlaced,
        );
    });

    it('todas las piezas del piloto están dentro de la zona de Iguanera', () => {
        // Zona de combate de Iguanera: (722.65, 234.35) radio 210m
        const zoneCenter = { x: 722.65, y: 234.35 };
        const zoneRadius = 210;
        const simboloPlaced = parsed.placed.filter((p) => p.piece.startsWith('simbolo_'));
        for (const p of simboloPlaced) {
            const d = Math.hypot(p.x - zoneCenter.x, p.y - zoneCenter.y);
            expect(d, `${p.piece}: dentro de Iguanera (${d.toFixed(1)}m < ${zoneRadius}m)`).toBeLessThan(zoneRadius);
        }
    });
});
