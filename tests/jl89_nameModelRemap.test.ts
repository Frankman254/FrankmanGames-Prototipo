import { describe, expect, it } from 'vitest';
import { parseAssets } from '../src/data/worldSchema';
import { loadWorldData } from '../src/data/worldData';
import enemiesJson from '../data/rpg/enemies.json';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const assetsRaw = require('../data/assets.json');
const enemies = enemiesJson.enemies as Record<string, {
    name: string;
    level: number;
    xp: number;
    lootTable: string;
    element: string;
    stats?: Record<string, number>;
}>;

describe('JL-89: remapeos provisionales de nombre contra modelo', () => {
    describe('ash_alpha → jaguar.glb', () => {
        it('el GLB jaguar existe en disco', () => {
            expect(existsSync(join(ROOT, 'assets', 'models', 'jaguar.glb'))).toBe(true);
        });

        it('ash_alpha usa la plantilla jaguar', () => {
            const entry = assetsRaw.assets['enemy.ash_alpha'];
            expect(entry).toBeDefined();
            expect(entry.template).toBe('jaguar');
            expect(entry.model).toBe('jaguar');
        });

        it('ash_alpha ya no usa wolf', () => {
            const entry = assetsRaw.assets['enemy.ash_alpha'];
            expect(entry.template).not.toBe('bestia');
            expect(entry.model).not.toBe('wolf');
        });

        it('el arquetipo ash_alpha existe con nombre coherente', () => {
            const arch = enemies['ash_alpha']!;
            expect(arch).toBeDefined();
            expect(arch.name).toBe('Tigrillo de Ceniza');
        });

        it('parseAssets resuelve el GLB correcto', () => {
            const wd = loadWorldData();
            const entry = wd.assets['enemy.ash_alpha']!;
            expect(entry.kind).toBe('gltf');
            if (entry.kind !== 'gltf') return;
            expect(entry.file).toBe('assets/models/jaguar.glb');
        });
    });

    describe('boquete_owl → buho.glb', () => {
        it('el GLB buho existe en disco', () => {
            expect(existsSync(join(ROOT, 'assets', 'models', 'buho.glb'))).toBe(true);
        });

        it('boquete_owl usa la plantilla buho', () => {
            const entry = assetsRaw.assets['enemy.boquete_owl'];
            expect(entry).toBeDefined();
            expect(entry.template).toBe('buho');
            expect(entry.model).toBe('owl');
        });

        it('boquete_owl ya no usa archer', () => {
            const entry = assetsRaw.assets['enemy.boquete_owl'];
            expect(entry.template).not.toBe('arquero');
            expect(entry.model).not.toBe('archer');
        });

        it('el arquetipo boquete_owl existe con nombre coherente', () => {
            const arch = enemies['boquete_owl']!;
            expect(arch).toBeDefined();
            expect(arch.name).toBe('Búho Chismoso');
        });

        it('parseAssets resuelve el GLB correcto', () => {
            const wd = loadWorldData();
            const entry = wd.assets['enemy.boquete_owl']!;
            expect(entry.kind).toBe('gltf');
            if (entry.kind !== 'gltf') return;
            expect(entry.file).toBe('assets/models/buho.glb');
        });
    });

    describe('fortuna_coyote → zorro.glb', () => {
        it('el GLB zorro existe en disco', () => {
            expect(existsSync(join(ROOT, 'assets', 'models', 'zorro.glb'))).toBe(true);
        });

        it('fortuna_coyote usa la plantilla zorro', () => {
            const entry = assetsRaw.assets['enemy.fortuna_coyote'];
            expect(entry).toBeDefined();
            expect(entry.template).toBe('zorro');
            expect(entry.model).toBe('fox');
        });

        it('fortuna_coyote ya no usa wolf', () => {
            const entry = assetsRaw.assets['enemy.fortuna_coyote'];
            expect(entry.template).not.toBe('bestia');
            expect(entry.model).not.toBe('wolf');
        });

        it('el arquetipo fortuna_coyote existe con nombre coherente', () => {
            const arch = enemies['fortuna_coyote']!;
            expect(arch).toBeDefined();
            expect(arch.name).toBe('Coyote de la Helada');
        });

        it('parseAssets resuelve el GLB correcto', () => {
            const wd = loadWorldData();
            const entry = wd.assets['enemy.fortuna_coyote']!;
            expect(entry.kind).toBe('gltf');
            if (entry.kind !== 'gltf') return;
            expect(entry.file).toBe('assets/models/zorro.glb');
        });
    });

    describe('clips de los GLB', () => {
        it('jaguar tiene los 5 clips de enemigo', () => {
            const t = assetsRaw.templates['jaguar'];
            expect(t.clips.idle).toBeDefined();
            expect(t.clips.run).toBeDefined();
            expect(t.clips.attack).toBe('Atacar');
            expect(t.clips.hit).toBe('Golpeado');
            expect(t.clips.death).toBe('Morir');
        });

        it('buho tiene los 5 clips de enemigo', () => {
            const t = assetsRaw.templates['buho'];
            expect(t.clips.idle).toBe('Reposo');
            expect(t.clips.run).toBe('Correr');
            expect(t.clips.attack).toBe('Atacar');
            expect(t.clips.hit).toBe('Golpeado');
            expect(t.clips.death).toBe('Morir');
        });

        it('zorro tiene los 5 clips de enemigo', () => {
            const t = assetsRaw.templates['zorro'];
            expect(t.clips.idle).toBe('Reposo');
            expect(t.clips.run).toBe('Correr');
            expect(t.clips.attack).toBe('Atacar');
            expect(t.clips.hit).toBe('Golpeado');
            expect(t.clips.death).toBe('Morir');
        });
    });

    describe('consistencia general', () => {
        it('parseAssets sobre los datos reales no falla', () => {
            expect(() => parseAssets(assetsRaw)).not.toThrow();
        });

        it('las escalas se conservan', () => {
            expect(assetsRaw.assets['enemy.ash_alpha'].scale).toBe(1.5);
            expect(assetsRaw.assets['enemy.boquete_owl'].scale).toBe(1);
            expect(assetsRaw.assets['enemy.fortuna_coyote'].scale).toBe(1.5);
        });

        it('las palettes se conservan con los 5 campos', () => {
            for (const id of ['enemy.ash_alpha', 'enemy.boquete_owl', 'enemy.fortuna_coyote']) {
                const palette = assetsRaw.assets[id].palettes.default;
                expect(palette.skin, `${id}: skin`).toBeDefined();
                expect(palette.cloth, `${id}: cloth`).toBeDefined();
                expect(palette.trim, `${id}: trim`).toBeDefined();
                expect(palette.hair, `${id}: hair`).toBeDefined();
                expect(palette.gear, `${id}: gear`).toBeDefined();
            }
        });
    });
});
