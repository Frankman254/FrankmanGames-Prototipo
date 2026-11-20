import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import ambientJson from '../data/ambient.json';
import { parseAmbient } from '../src/data/ambientSchema';
import { parseCatalogGlb } from '../src/render/catalogGeometry';
import { placedInChunk, type AmbientSite } from '../src/world/ambient';
import { ambientChunkInstances } from '../src/render/ambientView';
import { mergeCatalogInstances } from '../src/render/catalogGeometry';

const parsed = parseAmbient(ambientJson);
const glbData = readFileSync('assets/models/utileria.glb');
const glbBuffer = glbData.buffer.slice(glbData.byteOffset, glbData.byteOffset + glbData.byteLength) as ArrayBuffer;
const library = parseCatalogGlb(glbBuffer);

const site: AmbientSite = {
    paths: [],
    flatAreas: [],
    ponds: [],
    props: [],
    biomes: [],
    forestNoise: { octaves: 1, persistence: 0.5, scale: 64 },
    forestSeed: 0,
    seaLevel: 0,
    height: () => 0,
    playable: () => true,
};

describe('J12: utilería posiciones y merge', () => {
    it('las piezas del campamento están en los chunks correctos', () => {
        const size = parsed.chunkMeters; // 64

        // prop_banco: (620.1, 253)
        const chunk1 = placedInChunk(parsed, 576, 192, size);
        expect(chunk1.find((p) => p.piece === 'prop_banco')).toBeDefined();

        // prop_cajon: (640, 256)
        const chunk2 = placedInChunk(parsed, 640, 256, size);
        expect(chunk2.find((p) => p.piece === 'prop_cajon')).toBeDefined();

        // prop_barril: (646, 252)
        const chunk3 = placedInChunk(parsed, 640, 192, size);
        expect(chunk3.find((p) => p.piece === 'prop_barril')).toBeDefined();
    });

    it('ambientChunkInstances devuelve las piezas con coordenadas correctas', () => {
        const size = parsed.chunkMeters;

        // Chunk (576, 192) — prop_banco
        const r1 = ambientChunkInstances(parsed, site, library, 576, 192, 'prop');
        expect(r1.items.length).toBeGreaterThanOrEqual(1);
        const banco = r1.items.find((it) => it.geometry);
        expect(banco).toBeDefined();
        // La posición X debe ser ~620.1, Z debe ser ~253
        expect(banco!.x).toBeCloseTo(620.1, 1);
        expect(banco!.z).toBeCloseTo(253, 1);

        // Chunk (640, 256) — prop_cajon
        const r2 = ambientChunkInstances(parsed, site, library, 640, 256, 'prop');
        expect(r2.items.length).toBeGreaterThanOrEqual(1);
        const cajon = r2.items.find((it) => it.geometry);
        expect(cajon).toBeDefined();
        expect(cajon!.x).toBeCloseTo(640, 1);
        expect(cajon!.z).toBeCloseTo(256, 1);

        // Chunk (640, 192) — prop_barril
        const r3 = ambientChunkInstances(parsed, site, library, 640, 192, 'prop');
        expect(r3.items.length).toBeGreaterThanOrEqual(1);
        const barril = r3.items.find((it) => it.geometry);
        expect(barril).toBeDefined();
        expect(barril!.x).toBeCloseTo(646, 1);
        expect(barril!.z).toBeCloseTo(252, 1);
    });

    it('mergeCatalogInstances produce vértices en las coordenadas del mundo', () => {
        const size = parsed.chunkMeters;
        const r1 = ambientChunkInstances(parsed, site, library, 576, 192, 'prop');
        const merged = mergeCatalogInstances(r1.items);

        // Los vértices deben estar cerca de (620, 0, 253) — banco
        // Con height=0, y=0, los vértices X deben estar cerca de 620
        let minX = Infinity, maxX = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;
        for (let i = 0; i < merged.positions.length; i += 3) {
            minX = Math.min(minX, merged.positions[i]!);
            maxX = Math.max(maxX, merged.positions[i]!);
            minZ = Math.min(minZ, merged.positions[i + 2]!);
            maxZ = Math.max(maxZ, merged.positions[i + 2]!);
        }
        // El centro debe estar cerca de (620, 253)
        const centerX = (minX + maxX) / 2;
        const centerZ = (minZ + maxZ) / 2;
        expect(centerX).toBeCloseTo(620.1, 0);
        expect(centerZ).toBeCloseTo(253, 0);
    });

    it('todas las piezas tienen geometría no vacía', () => {
        for (const id of ['prop_banco', 'prop_cajon', 'prop_barril', 'prop_fogata']) {
            const g = library.get(id);
            expect(g, `${id} en library`).toBeDefined();
            expect(g!.triangles, `${id}.triangles`).toBeGreaterThan(0);
            // Verificar que los vértices no son todos cero
            let hasNonZero = false;
            for (let i = 0; i < g!.positions.length; i++) {
                if (Math.abs(g!.positions[i]!) > 0.001) { hasNonZero = true; break; }
            }
            expect(hasNonZero, `${id} tiene vértices no nulos`).toBe(true);
        }
    });
});
