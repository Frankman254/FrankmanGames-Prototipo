import { describe, expect, it } from 'vitest';
import { parseAssets } from '../src/data/worldSchema';
import { loadWorldData } from '../src/data/worldData';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const assetsRaw = require('../data/assets.json');

describe('JL-87: Ñeque y tapir de FA-06 integrados en assets.json', () => {
    const templates = assetsRaw.templates;
    const assetsEntries = assetsRaw.assets;

    describe('templates de neque y tapir existen', () => {
        for (const name of ['neque', 'tapir']) {
            it(`${name} es una template gltf`, () => {
                const t = templates[name];
                expect(t).toBeDefined();
                expect(t.kind).toBe('gltf');
                expect(t.file).toBe(`assets/models/${name}.glb`);
            });
        }
    });

    describe('GLB existen en disco', () => {
        for (const name of ['neque', 'tapir']) {
            it(`${name}.glb existe en assets/models/`, () => {
                expect(existsSync(join(ROOT, 'assets', 'models', `${name}.glb`))).toBe(true);
            });
        }
    });

    describe('clips de enemigo estándar', () => {
        it('neque tiene los 5 clips estándar', () => {
            const t = templates['neque'];
            expect(t.clips.idle).toBe('Reposo');
            expect(t.clips.walk).toBe('Caminar');
            expect(t.clips.run).toBe('Caminar');
            expect(t.clips.hit).toBe('Golpeado');
            expect(t.clips.death).toBe('Morir');
            expect(t.clips.attack).toBe('Atacar');
        });

        it('tapir tiene los 5 clips estándar', () => {
            const t = templates['tapir'];
            expect(t.clips.idle).toBe('Reposo');
            expect(t.clips.walk).toBe('Caminar');
            expect(t.clips.run).toBe('Caminar');
            expect(t.clips.hit).toBe('Golpeado');
            expect(t.clips.death).toBe('Morir');
            expect(t.clips.attack).toBe('Atacar');
        });
    });

    describe('eventos de ataque', () => {
        it('neque tiene evento hit en t=0.5', () => {
            const t = templates['neque'];
            expect(t.events.attack).toEqual([{ t: 0.5, type: 'hit' }]);
        });

        it('tapir tiene evento hit en t=0.5', () => {
            const t = templates['tapir'];
            expect(t.events.attack).toEqual([{ t: 0.5, type: 'hit' }]);
        });
    });

    describe('alturas y velocidad', () => {
        it('neque tiene altura pequeña (agutí/roedor)', () => {
            const t = templates['neque'];
            expect(t.height).toBeGreaterThan(0);
            expect(t.height).toBeLessThan(0.5);
        });

        it('tapir tiene altura grande (mamífero forestal)', () => {
            const t = templates['tapir'];
            expect(t.height).toBeGreaterThan(0.8);
            expect(t.height).toBeLessThan(1.5);
        });

        it('neque tiene yawDeg 90', () => {
            expect(templates['neque'].yawDeg).toBe(90);
        });

        it('tapir tiene yawDeg 90', () => {
            expect(templates['tapir'].yawDeg).toBe(90);
        });
    });

    describe('entradas de enemigo usan sus templates', () => {
        it('enemy.darien_neque usa template neque (no wolf)', () => {
            const entry = assetsEntries['enemy.darien_neque'];
            expect(entry.template).toBe('neque');
            expect(entry.model).toBeUndefined();
        });

        it('enemy.darien_tapir usa template tapir (no wolf)', () => {
            const entry = assetsEntries['enemy.darien_tapir'];
            expect(entry.template).toBe('tapir');
            expect(entry.model).toBeUndefined();
        });
    });

    describe('parseAssets y resolución', () => {
        it('parseAssets acepta las plantillas sin lanzar', () => {
            expect(() => parseAssets(assetsRaw)).not.toThrow();
        });

        it('darien_neque resuelve a gltf con el archivo correcto', () => {
            const wd = loadWorldData();
            const entry = wd.assets['enemy.darien_neque'];
            expect(entry).toBeDefined();
            expect(entry?.kind).toBe('gltf');
            if (entry?.kind === 'gltf') {
                expect(entry.file).toBe('assets/models/neque.glb');
            }
        });

        it('darien_tapir resuelve a gltf con el archivo correcto', () => {
            const wd = loadWorldData();
            const entry = wd.assets['enemy.darien_tapir'];
            expect(entry).toBeDefined();
            expect(entry?.kind).toBe('gltf');
            if (entry?.kind === 'gltf') {
                expect(entry.file).toBe('assets/models/tapir.glb');
            }
        });
    });
});
