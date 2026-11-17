import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import ambientJson from '../data/ambient.json';
import { parseAmbient } from '../src/data/ambientSchema';
import { parseCatalogGlb } from '../src/render/catalogGeometry';
import { solidFootprint } from '../src/world/ambient';

const parsed = parseAmbient(ambientJson);

const NATURAL_PIECES = [
    'natural_tronco_caido',
    'natural_roca_alta',
    'natural_roca_baja',
    'natural_helecho_ancho',
    'natural_palma_joven',
];

describe('J14: integración de naturaleza_modular.glb', () => {
    it('los 5 nodos de naturaleza existen en el GLB', () => {
        const file = readFileSync('assets/models/naturaleza_modular.glb');
        const data = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
        const library = parseCatalogGlb(data);
        for (const id of NATURAL_PIECES) {
            expect(library.get(id), `${id} en naturaleza_modular.glb`).toBeDefined();
        }
    });

    it('las dimensiones declaradas coinciden con el GLB (tolerancia 0.02 m)', () => {
        const file = readFileSync('assets/models/naturaleza_modular.glb');
        const data = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
        const library = parseCatalogGlb(data);
        for (const [id, piece] of Object.entries(parsed.pieces)) {
            if (piece.model !== 'naturaleza_modular') continue;
            const geometry = library.get(id);
            expect(geometry, id).toBeDefined();
            const size = geometry!.max.map((value, axis) => value - geometry!.min[axis]!) as [number, number, number];
            expect(Math.abs(size[0] - piece.w), `${id}: ancho`).toBeLessThanOrEqual(0.02);
            expect(Math.abs(size[1] - piece.h), `${id}: alto`).toBeLessThanOrEqual(0.02);
            expect(Math.abs(size[2] - piece.d), `${id}: fondo`).toBeLessThanOrEqual(0.02);
        }
    });

    it('el catálogo naturaleza_modular está registrado con 5 piezas', () => {
        const pieces = Object.entries(parsed.pieces).filter(([, p]) => p.model === 'naturaleza_modular');
        expect(pieces.length).toBe(5);
        const ids = pieces.map(([id]) => id);
        for (const id of NATURAL_PIECES) {
            expect(ids).toContain(id);
        }
    });

    it('natural_helecho_ancho es atravesable y las demás son sólidas', () => {
        expect(parsed.pieces['natural_helecho_ancho']!.solid).toBe(false);
        for (const id of NATURAL_PIECES) {
            if (id === 'natural_helecho_ancho') continue;
            expect(parsed.pieces[id]!.solid, `${id} debe ser sólido`).toBe(true);
        }
    });

    it('el piloto tiene máximo 8 instancias', () => {
        const naturalPlaced = parsed.placed.filter((p) => p.piece.startsWith('natural_'));
        expect(naturalPlaced.length, `instancias (${naturalPlaced.length}) <= 8`).toBeLessThanOrEqual(8);
        expect(naturalPlaced.length).toBeGreaterThan(0);
    });

    it('ninguna pieza está dentro de 10 m de puntos críticos de Iguanera', () => {
        const critical = [
            { x: 610, y: 240, name: 'muelle_seguro', r: 62 },
            { x: 617, y: 233, name: 'Eligio' },
            { x: 598, y: 238, name: 'Nena' },
            { x: 628, y: 244, name: 'Piedra' },
            { x: 592, y: 236, name: 'lancha' },
        ];
        const naturalPlaced = parsed.placed.filter((p) => p.piece.startsWith('natural_'));
        for (const p of naturalPlaced) {
            for (const c of critical) {
                let d = Math.hypot(p.x - c.x, p.y - c.y);
                if (c.r) d = d - c.r;
                expect(d, `${p.piece} → ${c.name}`).toBeGreaterThanOrEqual(10);
            }
        }
    });

    it('las piezas sólidas no crean cuellos de botella en discos de combate de 6 m', () => {
        // Muestrear varios discos de combate en la zona de Iguanera
        // La zona de combate está en (722.65, 234.35) con radio 210m
        const combatCenters = [
            { x: 700, y: 230 },
            { x: 720, y: 240 },
            { x: 740, y: 220 },
            { x: 690, y: 250 },
            { x: 730, y: 210 },
        ];
        const solidNatural = parsed.placed.filter(
            (p) => p.piece.startsWith('natural_') && parsed.pieces[p.piece]?.solid,
        );

        for (const center of combatCenters) {
            // Verificar que dentro de un disco de 6m no hay más de 1 pieza sólida natural
            let count = 0;
            for (const p of solidNatural) {
                const d = Math.hypot(p.x - center.x, p.y - center.y);
                if (d <= 6) count++;
            }
            expect(count, `disco (${center.x},${center.y}): piezas sólidas`).toBeLessThanOrEqual(1);
        }
    });

    it('las piezas sólidas no reducen la caminabilidad: huellas no se superponen', () => {
        const solidNatural = parsed.placed.filter(
            (p) => p.piece.startsWith('natural_') && parsed.pieces[p.piece]?.solid,
        );
        const footprints = solidNatural.map((p) => ({ p, fp: solidFootprint(parsed, p) }));

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
        const natural1 = parsed.placed.filter((p) => p.piece.startsWith('natural_'));
        const natural2 = parsed2.placed.filter((p) => p.piece.startsWith('natural_'));
        expect(natural1.length).toBe(natural2.length);
        for (let i = 0; i < natural1.length; i++) {
            expect(natural1[i]!.piece).toBe(natural2[i]!.piece);
            expect(natural1[i]!.x).toBe(natural2[i]!.x);
            expect(natural1[i]!.y).toBe(natural2[i]!.y);
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
        const naturalPlaced = parsed.placed.filter((p) => p.piece.startsWith('natural_'));
        for (const p of naturalPlaced) {
            const d = Math.hypot(p.x - zoneCenter.x, p.y - zoneCenter.y);
            expect(d, `${p.piece}: dentro de Iguanera (${d.toFixed(1)}m < ${zoneRadius}m)`).toBeLessThan(zoneRadius);
        }
    });
});
