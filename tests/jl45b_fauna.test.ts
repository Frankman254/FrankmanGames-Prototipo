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

describe('JL-45b: integración del modelo cangrejo', () => {
    describe('plantilla cangrejo en assets.json', () => {
        it('la plantilla existe con los campos obligatorios', () => {
            const t = assetsRaw.templates['cangrejo'];
            expect(t).toBeDefined();
            expect(t.kind).toBe('gltf');
            expect(t.file).toBe('assets/models/cangrejo.glb');
            expect(t.yawDeg).toBeDefined();
            expect(t.height).toBeDefined();
            expect(t.height).toBeGreaterThan(0);
        });

        it('el GLB del cangrejo existe en disco', () => {
            expect(existsSync(join(ROOT, 'assets', 'models', 'cangrejo.glb'))).toBe(true);
        });

        it('los 5 clips están declarados (sin Correr, run usa Caminar)', () => {
            const t = assetsRaw.templates['cangrejo'];
            const clips = t.clips;
            expect(clips.idle).toBe('Reposo');
            expect(clips.walk).toBe('Caminar');
            expect(clips.run).toBe('Caminar'); // sin clip Correr, reusa Caminar
            expect(clips.hit).toBe('Golpeado');
            expect(clips.death).toBe('Morir');
            expect(clips.attack).toBe('Atacar');
        });

        it('parseAssets acepta la plantilla sin lanzar', () => {
            expect(() => parseAssets(assetsRaw)).not.toThrow();
        });
    });

    describe('enemy.chame_crab y enemy.chame_grandcrab', () => {
        it('chame_crab usa la plantilla cangrejo', () => {
            const entry = assetsRaw.assets['enemy.chame_crab'];
            expect(entry).toBeDefined();
            expect(entry.template).toBe('cangrejo');
            expect(entry.scale).toBe(1.2);
        });

        it('chame_grandcrab usa la plantilla cangrejo', () => {
            const entry = assetsRaw.assets['enemy.chame_grandcrab'];
            expect(entry).toBeDefined();
            expect(entry.template).toBe('cangrejo');
            expect(entry.scale).toBe(1.5);
        });

        it('ambos usan palettes con los 5 campos obligatorios (skin, cloth, trim, hair, gear)', () => {
            for (const id of ['enemy.chame_crab', 'enemy.chame_grandcrab']) {
                const entry = assetsRaw.assets[id];
                const palette = entry.palettes.default;
                expect(palette.skin, `${id}: skin`).toBeDefined();
                expect(palette.cloth, `${id}: cloth`).toBeDefined();
                expect(palette.trim, `${id}: trim`).toBeDefined();
                expect(palette.hair, `${id}: hair`).toBeDefined();
                expect(palette.gear, `${id}: gear`).toBeDefined();
            }
        });

        it('ya no apuntan al modelo wolf', () => {
            for (const id of ['enemy.chame_crab', 'enemy.chame_grandcrab']) {
                const entry = assetsRaw.assets[id];
                expect(entry.model, `${id}: no debe tener model`).toBeUndefined();
                expect(entry.template).not.toBe('bestia');
            }
        });
    });

    describe('arquetipos en data/rpg/enemies.json', () => {
        it('chame_crab existe con nombre y nivel coherentes', () => {
            const arch = enemies['chame_crab']!;
            expect(arch).toBeDefined();
            expect(arch.name).toBe('Cangrejo Machetero');
            expect(arch.level).toBe(15);
            expect(arch.element).toBe('water');
        });

        it('chame_grandcrab existe con nombre y nivel coherentes', () => {
            const arch = enemies['chame_grandcrab']!;
            expect(arch).toBeDefined();
            expect(arch.name).toBe('Cangrejo Abuelo');
            expect(arch.level).toBe(18);
            expect(arch.element).toBe('water');
        });

        it('ambos siguen la afinidad water (resiste water, lightning, frost; débil fire)', () => {
            for (const id of ['chame_crab', 'chame_grandcrab']) {
                const s = enemies[id]!.stats!;
                expect(s['resist.water'], `${id}: resist.water`).toBe(15);
                expect(s['resist.lightning'], `${id}: resist.lightning`).toBe(12);
                expect(s['resist.frost'], `${id}: resist.frost`).toBe(10);
                expect(s['resist.fire'], `${id}: resist.fire`).toBe(-12);
            }
        });
    });

    describe('consistencia con el mundo', () => {
        it('parseAssets sobre los datos reales no falla', () => {
            const wd = loadWorldData();
            expect(wd.assets['enemy.chame_crab']).toBeDefined();
            expect(wd.assets['enemy.chame_grandcrab']).toBeDefined();
            // La plantilla resuelta debe tener los clips del cangrejo
            const crab = wd.assets['enemy.chame_crab']!;
            expect(crab.kind).toBe('gltf');
            if (crab.kind !== 'gltf') return;
            expect(crab.file).toBe('assets/models/cangrejo.glb');
            expect(crab.clips).toBeDefined();
            expect(crab.clips.idle).toBe('Reposo');
            expect(crab.clips.run).toBe('Caminar');
        });
    });
});
