import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadWorldData } from '../src/data/worldData';

const ROOT = resolve(__dirname, '..');

function animationNames(file: string): string[] {
    const text = readFileSync(file).toString('latin1');
    return [...text.matchAll(/"name"\s*:\s*"([^"]+)"/g)].map((match) => match[1]!);
}

describe('JL-302: modelos y clips de arquetipos', () => {
    const archetypes = Object.entries(loadWorldData().assets).filter(([id]) => id.startsWith('enemy.'));

    it('cada arquetipo efectivo apunta a un GLB existente con todos sus clips declarados', () => {
        expect(archetypes.length, 'no se encontraron entradas enemy.* en data/assets.json').toBeGreaterThan(0);

        const namesByFile = new Map<string, string[]>();
        const failures: string[] = [];

        for (const [id, asset] of archetypes) {
            if (asset.kind !== 'gltf') {
                failures.push(`${id}: kind=${asset.kind}, se esperaba gltf`);
                continue;
            }

            const file = join(ROOT, asset.file);
            if (!existsSync(file)) {
                failures.push(`${id}: no existe ${asset.file}`);
                continue;
            }

            let names = namesByFile.get(file);
            if (!names) {
                names = animationNames(file);
                namesByFile.set(file, names);
            }

            for (const [state, clip] of Object.entries(asset.clips)) {
                if (!names.some((name) => name.endsWith(clip))) {
                    failures.push(`${id}: falta ${state} → ${clip} en ${asset.file}`);
                }
            }
        }

        expect(failures, failures.join('\n')).toEqual([]);
    });
});
