import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DATA = join(__dirname, '..', 'data');
const MODELS = join(__dirname, '..', 'assets', 'models');

/** Lee los nodos de un GLB sin Babylon (mismo parser que modelos.test.ts). */
function gltfNodes(file: string): Set<string> {
    const glb = readFileSync(join(MODELS, file));
    const json = JSON.parse(glb.toString('utf8', 20, 20 + glb.readUInt32LE(12)));
    return new Set((json.nodes ?? []).map((n: { name: string }) => n.name));
}

describe('NAT-01: nodos referenciados en data/ existen en sus GLB', () => {
    it('ambient.json: cada pieza con model apunta a un nodo que existe en el GLB', () => {
        const ambient = JSON.parse(readFileSync(join(DATA, 'ambient.json'), 'utf8')) as {
            pieces: Record<string, { model: string }>;
        };
        const byModel = new Map<string, string[]>();
        for (const [id, piece] of Object.entries(ambient.pieces)) {
            const arr = byModel.get(piece.model) ?? [];
            arr.push(id);
            byModel.set(piece.model, arr);
        }
        for (const [model, ids] of byModel) {
            const nodes = gltfNodes(`${model}.glb`);
            for (const id of ids) {
                expect(nodes.has(id), `${model}.glb debe contener el nodo ${id} (referenciado en ambient.json)`).toBe(
                    true,
                );
            }
        }
    });

    it('vegetation.json: cada prop con node y model apunta a un nodo que existe en el GLB', () => {
        const veg = JSON.parse(readFileSync(join(DATA, 'vegetation.json'), 'utf8')) as {
            props: Array<{ node?: string; model?: string; kind: string }>;
        };
        for (const p of veg.props) {
            if (!p.node || !p.model) continue;
            const nodes = gltfNodes(`${p.model}.glb`);
            expect(nodes.has(p.node), `${p.model}.glb debe contener el nodo ${p.node} (referenciado en vegetation.json)`).toBe(
                true,
            );
        }
    });

    it('landmarkView naturePlacement: los nodos por defecto existen en naturaleza_suelo.glb', () => {
        const nodes = gltfNodes('naturaleza_suelo.glb');
        // naturePlacement usa estos nodos como default cuando no se pasa node
        expect(nodes.has('tronco_recto'), 'default log').toBe(true);
        expect(nodes.has('roca_redonda_grande'), 'default boulder').toBe(true);
        // Y los nodos explícitos de NATURE_SIZE
        for (const node of ['roca_musgosa', 'grupo_rocas_bajo', 'tronco_curvo', 'tronco_musgoso'])
            expect(nodes.has(node), node).toBe(true);
    });
});
