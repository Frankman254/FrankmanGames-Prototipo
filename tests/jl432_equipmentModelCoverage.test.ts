import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import itemsRaw from '../data/rpg/items.json' with { type: 'json' };

const ROOT = join(__dirname, '..');
const REQUIRED_SLOTS = new Set(['weapon', 'offhand', 'head', 'back']);
const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;

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

describe('JL-432: cobertura de nodos del equipo', () => {
    it('cada objeto de ranura weapon, offhand, head o back tiene nodo obj_<id> en equipo.glb', () => {
        const items = itemsRaw.items as Record<string, { slot?: string | null }>;
        const equipables = Object.entries(items).filter(([, item]) => REQUIRED_SLOTS.has(item.slot ?? ''));
        const nodes = glbNodes('equipo.glb');
        const missing = equipables
            .filter(([id]) => !nodes.has(`obj_${id}`))
            .map(([id]) => id)
            .sort();

        expect(equipables.length, 'debe haber objetos en las ranuras solicitadas').toBeGreaterThan(0);
        expect(missing, `${missing.length} objetos sin nodo en equipo.glb: ${missing.join(', ')}`).toEqual([]);
    });
});
