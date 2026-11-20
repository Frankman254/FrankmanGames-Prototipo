import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import ambientJson from '../data/ambient.json';
import { parseAmbient } from '../src/data/ambientSchema';
import { parseCatalogGlb } from '../src/render/catalogGeometry';
import { placedInChunk, type AmbientSite } from '../src/world/ambient';
import { ambientChunkInstances } from '../src/render/ambientView';

const parsed = parseAmbient(ambientJson);

describe('J12: utilería visible en Iguanera', () => {
    it('placedInChunk encuentra las 3 piezas del campamento en sus chunks', () => {
        const size = parsed.chunkMeters; // 64
        // prop_banco: (620.1, 253) → chunk (576, 192)
        const chunk1 = placedInChunk(parsed, 576, 192, size);
        const banco1 = chunk1.find((p) => p.piece === 'prop_banco');
        expect(banco1, 'prop_banco en chunk (576,192)').toBeDefined();

        // prop_cajon: (640, 256) → chunk (640, 256)
        const chunk2 = placedInChunk(parsed, 640, 256, size);
        const cajon2 = chunk2.find((p) => p.piece === 'prop_cajon');
        expect(cajon2, 'prop_cajon en chunk (640,256)').toBeDefined();

        // prop_barril: (646, 252) → chunk (640, 192)
        const chunk3 = placedInChunk(parsed, 640, 192, size);
        const barril3 = chunk3.find((p) => p.piece === 'prop_barril');
        expect(barril3, 'prop_barril en chunk (640,192)').toBeDefined();
    });

    it('ambientChunkInstances devuelve las piezas con geometría válida', () => {
        const file = readFileSync('assets/models/utileria.glb');
        const data = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
        const library = parseCatalogGlb(data);

        // Site mínimo para placedGround
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

        const size = parsed.chunkMeters;

        // Chunk con prop_banco
        const result1 = ambientChunkInstances(parsed, site, library, 576, 192, 'prop');
        expect(result1.items.length, 'items en chunk (576,192)').toBeGreaterThanOrEqual(1);
        const bancoItem = result1.items.find((it) => it.geometry);
        expect(bancoItem, 'prop_banco con geometría').toBeDefined();

        // Chunk con prop_cajon
        const result2 = ambientChunkInstances(parsed, site, library, 640, 256, 'prop');
        expect(result2.items.length, 'items en chunk (640,256)').toBeGreaterThanOrEqual(1);

        // Chunk con prop_barril
        const result3 = ambientChunkInstances(parsed, site, library, 640, 192, 'prop');
        expect(result3.items.length, 'items en chunk (640,192)').toBeGreaterThanOrEqual(1);
    });

    it('los 4 nodos de utilería tienen geometría con triángulos', () => {
        const file = readFileSync('assets/models/utileria.glb');
        const data = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
        const library = parseCatalogGlb(data);
        for (const id of ['prop_banco', 'prop_cajon', 'prop_barril', 'prop_fogata']) {
            const g = library.get(id);
            expect(g, `${id} en library`).toBeDefined();
            expect(g!.triangles, `${id}.triangles`).toBeGreaterThan(0);
        }
    });
});
