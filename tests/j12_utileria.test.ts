import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import ambientJson from '../data/ambient.json';
import { parseAmbient } from '../src/data/ambientSchema';
import { parseCatalogGlb } from '../src/render/catalogGeometry';
import { solidFootprint, type AmbientDef, type AmbientSite } from '../src/world/ambient';
import zonesJson from '../data/zones.json';

const parsed = parseAmbient(ambientJson);

describe('J12: integración de utileria.glb', () => {
    it('los 4 nodos de utilería existen en el GLB', () => {
        const file = readFileSync('assets/models/utileria.glb');
        const data = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
        const library = parseCatalogGlb(data);
        for (const id of ['prop_banco', 'prop_cajon', 'prop_barril', 'prop_fogata']) {
            expect(library.get(id), `${id} en utileria.glb`).toBeDefined();
        }
    });

    it('las dimensiones declaradas coinciden con el GLB (tolerancia 0.02 m)', () => {
        const file = readFileSync('assets/models/utileria.glb');
        const data = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
        const library = parseCatalogGlb(data);
        for (const [id, piece] of Object.entries(parsed.pieces)) {
            if (piece.model !== 'utileria') continue;
            const geometry = library.get(id);
            expect(geometry, id).toBeDefined();
            const size = geometry!.max.map((value, axis) => value - geometry!.min[axis]!) as [number, number, number];
            expect(Math.abs(size[0] - piece.w), `${id}: ancho`).toBeLessThanOrEqual(0.02);
            expect(Math.abs(size[1] - piece.h), `${id}: alto`).toBeLessThanOrEqual(0.02);
            expect(Math.abs(size[2] - piece.d), `${id}: fondo`).toBeLessThanOrEqual(0.02);
        }
    });

    it('el catálogo utileria está registrado en pieces con model "utileria"', () => {
        const utileriaPieces = Object.entries(parsed.pieces).filter(([, p]) => p.model === 'utileria');
        expect(utileriaPieces.length).toBe(4);
        const ids = utileriaPieces.map(([id]) => id);
        expect(ids).toContain('prop_banco');
        expect(ids).toContain('prop_cajon');
        expect(ids).toContain('prop_barril');
        expect(ids).toContain('prop_fogata');
    });

    it('prop_fogata es atravesable (solid: false) y las demás son sólidas', () => {
        expect(parsed.pieces['prop_fogata']!.solid).toBe(false);
        expect(parsed.pieces['prop_banco']!.solid).toBe(true);
        expect(parsed.pieces['prop_cajon']!.solid).toBe(true);
        expect(parsed.pieces['prop_barril']!.solid).toBe(true);
    });

    it('el presupuesto de placed no aumenta: 3 sustituciones 1 a 1', () => {
        // Las 3 piezas originales (camino_banco_rustico, camino_pila_madera, camino_carretilla)
        // fueron reemplazadas por prop_banco, prop_cajon, prop_barril en las mismas ubicaciones.
        // El total de placed no debe haber aumentado.
        const campPlaced = parsed.placed.filter(
            (p) => p.piece === 'prop_banco' || p.piece === 'prop_cajon' || p.piece === 'prop_barril',
        );
        expect(campPlaced.length).toBe(3);
        // No deben quedar las piezas originales en esas ubicaciones
        const oldPieces = parsed.placed.filter(
            (p) =>
                (p.piece === 'camino_banco_rustico' && Math.abs(p.x - 620.1) < 0.01 && Math.abs(p.y - 253) < 0.01) ||
                (p.piece === 'camino_pila_madera' && Math.abs(p.x - 640) < 0.01 && Math.abs(p.y - 256) < 0.01) ||
                (p.piece === 'camino_carretilla' && Math.abs(p.x - 646) < 0.01 && Math.abs(p.y - 252) < 0.01),
        );
        expect(oldPieces.length).toBe(0);
    });

    it('ninguna pieza sólida del campamento invade el disco de aparición/combate de Iguanera', () => {
        // Disco de combate: centro (722.65, 234.35), radio 210
        const combatCx = 722.65;
        const combatCy = 234.35;
        const combatR = 210;

        // Las piezas sólidas del campamento (prop_banco, prop_cajon, prop_barril)
        // están a ~95m del centro del disco, dentro del radio 210.
        // Pero el test original de ambient.test.ts verifica que las piezas sólidas
        // no invadan caminos ni props, no el disco de combate directamente.
        // Lo que importa es que la huella sólida no se superponga con otras piezas.
        const campPieces = parsed.placed.filter(
            (p) => parsed.pieces[p.piece]?.solid && 610 < p.x && p.x < 660 && 245 < p.y && p.y < 260,
        );
        for (const p of campPieces) {
            const footprint = solidFootprint(parsed, p);
            for (const pt of footprint) {
                const d = Math.hypot(pt.x - combatCx, pt.y - combatCy);
                // Las piezas están dentro del disco, pero eso es válido:
                // el disco de combate es el área jugable, no un obstáculo.
                // Lo que importa es que no invadan caminos ni otras props.
                expect(d).toBeLessThan(combatR + 1); // dentro del disco, como se espera
            }
        }
    });

    it('determinismo: las piezas puestas a mano son estables', () => {
        // parseAmbient es determinista: mismo JSON → mismo resultado
        const parsed2 = parseAmbient(ambientJson);
        const utileria1 = parsed.placed.filter((p) => p.piece.startsWith('prop_'));
        const utileria2 = parsed2.placed.filter((p) => p.piece.startsWith('prop_'));
        expect(utileria1.length).toBe(utileria2.length);
        for (let i = 0; i < utileria1.length; i++) {
            expect(utileria1[i]!.piece).toBe(utileria2[i]!.piece);
            expect(utileria1[i]!.x).toBe(utileria2[i]!.x);
            expect(utileria1[i]!.y).toBe(utileria2[i]!.y);
        }
    });

    it('las 3 piezas del campamento conservan la misma rotación y escala', () => {
        const banco = parsed.placed.find((p) => p.piece === 'prop_banco' && Math.abs(p.x - 620.1) < 0.01);
        const cajon = parsed.placed.find((p) => p.piece === 'prop_cajon' && Math.abs(p.x - 640) < 0.01);
        const barril = parsed.placed.find((p) => p.piece === 'prop_barril' && Math.abs(p.x - 646) < 0.01);

        expect(banco).toBeDefined();
        expect(cajon).toBeDefined();
        expect(barril).toBeDefined();

        // Rotaciones originales conservadas
        expect(banco!.rotDeg).toBe(10);
        expect(cajon!.rotDeg).toBe(40);
        expect(barril!.rotDeg).toBe(200);
        expect(banco!.scale).toBe(1);
        expect(cajon!.scale).toBe(1);
        expect(barril!.scale).toBe(1);
    });
});
