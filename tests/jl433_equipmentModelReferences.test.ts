import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import itemsRaw from '../data/rpg/items.json' with { type: 'json' };

const ROOT = join(__dirname, '..');
const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const OBJECT_PREFIX = 'obj_';

function glbNodes(file: string): Set<string> {
    const buffer = readFileSync(join(ROOT, 'assets', 'models', file));
    if (buffer.length < 20) throw new Error(`${file}: cabecera GLB incompleta`);
    if (buffer.readUInt32LE(0) !== GLB_MAGIC) throw new Error(`${file}: magic GLB inválido`);
    if (buffer.readUInt32LE(4) !== 2) throw new Error(`${file}: solo se admite glTF 2.0`);
    if (buffer.readUInt32LE(8) !== buffer.length) throw new Error(`${file}: longitud GLB incorrecta`);

    let offset = 12;
    let jsonChunk: Buffer | undefined;
    while (offset + 8 <= buffer.length) {
        const chunkLength = buffer.readUInt32LE(offset);
        const chunkType = buffer.readUInt32LE(offset + 4);
        offset += 8;
        if (offset + chunkLength > buffer.length) throw new Error(`${file}: chunk fuera del archivo`);
        if (chunkType === JSON_CHUNK) {
            jsonChunk = buffer.subarray(offset, offset + chunkLength);
            break;
        }
        offset += chunkLength;
    }
    if (!jsonChunk) throw new Error(`${file}: falta el chunk JSON`);

    const gltf = JSON.parse(jsonChunk.toString('utf8')) as { nodes?: Array<{ name?: string }> };
    if (!Array.isArray(gltf.nodes)) throw new Error(`${file}: el JSON no contiene nodes`);
    return new Set(gltf.nodes.flatMap((node) => (typeof node.name === 'string' ? [node.name] : [])));
}

function referencesExistingItem(nodeName: string, itemIds: ReadonlySet<string>): boolean {
    const reference = nodeName.slice(OBJECT_PREFIX.length);
    if (itemIds.has(reference)) return true;

    const boneSuffix = reference.indexOf('@');
    if (boneSuffix >= 0) return itemIds.has(reference.slice(0, boneSuffix));

    const meshSubpart = reference.match(/^(.*)_malla(?:_primitive\d+)?$/);
    return meshSubpart !== null && meshSubpart[1] !== undefined && itemIds.has(meshSubpart[1]);
}

function nodesWithMissingItems(nodes: ReadonlySet<string>, itemIds: ReadonlySet<string>): string[] {
    return [...nodes].filter((name) => name.startsWith(OBJECT_PREFIX) && !referencesExistingItem(name, itemIds)).sort();
}

describe('JL-433: referencias de equipo.glb a objetos', () => {
    it('cada nodo obj_* apunta a un objeto existente en items.json', () => {
        const nodes = glbNodes('equipo.glb');
        const objectNodes = new Set([...nodes].filter((name) => name.startsWith(OBJECT_PREFIX)));
        const itemIds = new Set(Object.keys(itemsRaw.items));
        const missing = nodesWithMissingItems(objectNodes, itemIds);

        expect(objectNodes.size, 'equipo.glb debe contener nodos obj_*').toBeGreaterThan(0);
        expect(missing, `${missing.length} nodos obj_* sin objeto en items.json: ${missing.join(', ')}`).toEqual([]);
    });

    it('detecta un nodo raíz y sus subpiezas si su objeto no existe', () => {
        const nodes = new Set([
            'obj_existe',
            'obj_existe@hips',
            'obj_existe@hips_primitive0',
            'obj_existe_malla',
            'obj_inexistente',
            'obj_inexistente@hips',
            'obj_inexistente@hips_primitive0',
            'obj_inexistente_malla',
            'obj_inexistente_malla_primitive0',
        ]);

        expect(nodesWithMissingItems(nodes, new Set(['existe']))).toEqual([
            'obj_inexistente',
            'obj_inexistente@hips',
            'obj_inexistente@hips_primitive0',
            'obj_inexistente_malla',
            'obj_inexistente_malla_primitive0',
        ]);
    });

    it('reconoce primero un ID existente que termina en _malla', () => {
        expect(nodesWithMissingItems(new Set(['obj_objeto_malla']), new Set(['objeto_malla']))).toEqual([]);
    });
});
