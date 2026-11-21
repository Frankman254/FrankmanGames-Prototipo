import { describe, expect, it } from 'vitest';
import { parseAssets } from '../src/data/worldSchema';
import { loadWorldData } from '../src/data/worldData';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const assetsRaw = require('../data/assets.json');

describe('JL-86: Águilas de FA-21 integradas en assets.json', () => {
    const templates = assetsRaw.templates;
    const assetsEntries = assetsRaw.assets;

    describe('templates de águila existen', () => {
        for (const name of ['aguila_negra', 'aguila_ornada', 'aguila_crestada', 'aguila_arpia']) {
            it(`${name} es una template gltf`, () => {
                const t = templates[name];
                expect(t).toBeDefined();
                expect(t.kind).toBe('gltf');
                expect(t.file).toBe(`assets/models/${name}.glb`);
            });
        }
    });

    describe('GLB existen en disco', () => {
        for (const name of ['aguila_negra', 'aguila_ornada', 'aguila_crestada', 'aguila_arpia']) {
            it(`${name}.glb existe en assets/models/`, () => {
                expect(existsSync(join(ROOT, 'assets', 'models', `${name}.glb`))).toBe(true);
            });
        }
    });

    describe('clips de enemigo', () => {
        it('aguila_negra tiene los clips estándar', () => {
            const t = templates['aguila_negra'];
            expect(t.clips.idle).toBe('Reposo');
            expect(t.clips.walk).toBe('Caminar');
            expect(t.clips.run).toBe('Caminar');
            expect(t.clips.hit).toBe('Golpeado');
            expect(t.clips.death).toBe('Morir');
            expect(t.clips.attack).toBe('Atacar');
        });

        it('aguila_ornada tiene los clips estándar', () => {
            const t = templates['aguila_ornada'];
            expect(t.clips.idle).toBe('Reposo');
            expect(t.clips.attack).toBe('Atacar');
            expect(t.clips.death).toBe('Morir');
        });

        it('aguila_crestada tiene los clips estándar', () => {
            const t = templates['aguila_crestada'];
            expect(t.clips.idle).toBe('Reposo');
            expect(t.clips.attack).toBe('Atacar');
            expect(t.clips.death).toBe('Morir');
        });

        it('aguila_arpia tiene clips de vuelo adaptados', () => {
            const t = templates['aguila_arpia'];
            expect(t.clips.idle).toBe('idle_ground');
            expect(t.clips.walk).toBe('walk');
            expect(t.clips.run).toBe('run');
            expect(t.clips.attack).toBe('fly_forward');
            expect(t.clips.death).toBe('land');
        });
    });

    describe('alturas y velocidades', () => {
        it('aguila_negra es pequeña (0.40 m)', () => {
            expect(templates['aguila_negra'].height).toBe(0.40);
        });

        it('aguila_ornada y aguila_crestada son medianas (~1 m)', () => {
            expect(templates['aguila_ornada'].height).toBeCloseTo(1, 1);
            expect(templates['aguila_crestada'].height).toBeCloseTo(1, 1);
        });

        it('aguila_arpia es grande (3.20 m)', () => {
            expect(templates['aguila_arpia'].height).toBe(3.20);
        });
    });

    describe('enemy.darien_harpy usa aguila_arpia', () => {
        const entry = assetsEntries['enemy.darien_harpy'];

        it('template es aguila_arpia', () => {
            expect(entry.template).toBe('aguila_arpia');
        });

        it('ya no usa wolf ni bestia', () => {
            expect(entry.model).toBeUndefined();
            expect(entry.template).not.toBe('bestia');
        });

        it('conserva las palettes de color', () => {
            expect(entry.palettes.default.skin).toEqual([0.5, 0.5, 0.55]);
        });
    });

    describe('eventos de ataque', () => {
        for (const name of ['aguila_negra', 'aguila_ornada', 'aguila_crestada', 'aguila_arpia']) {
            it(`${name} tiene evento hit en attack`, () => {
                const t = templates[name];
                expect(t.events.attack).toBeDefined();
                const hitEvent = t.events.attack.find((e: { type: string }) => e.type === 'hit');
                expect(hitEvent).toBeDefined();
            });
        }
    });

    describe('parseAssets y resolución', () => {
        it('parseAssets acepta las plantillas sin lanzar', () => {
            expect(() => parseAssets(assetsRaw)).not.toThrow();
        });

        it('darien_harpy resuelve a gltf con el archivo correcto', () => {
            const wd = loadWorldData();
            const entry = wd.assets['enemy.darien_harpy'];
            expect(entry).toBeDefined();
            expect(entry?.kind).toBe('gltf');
            if (entry?.kind === 'gltf') {
                expect(entry.file).toBe('assets/models/aguila_arpia.glb');
            }
        });
    });
});
