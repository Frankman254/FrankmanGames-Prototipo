// JL-265 (OMP-POL-02b): tema por profundidad en la cripta.
// Verifica que los temas nuevos cargan floorTex/wallTex, que los temas
// antiguos usan el default y que los pisos profundos eligen el tema
// según el nivel del enemigo.
import { describe, it, expect } from 'vitest';
import { loadDungeon } from '../src/data/dungeonSchema';
import { loadGameData } from '../src/data';

describe('JL-265: tema por profundidad en la cripta', () => {
    const data = loadGameData();
    const def = loadDungeon(data);

    it('tiene los 6 temas (3 originales + 3 nuevos)', () => {
        const ids = Object.keys(def.themes);
        expect(ids).toContain('losa');
        expect(ids).toContain('osario');
        expect(ids).toContain('musgo');
        expect(ids).toContain('raices');
        expect(ids).toContain('humedo');
        expect(ids).toContain('oro');
        expect(ids.length).toBe(6);
    });

    describe('temas originales sin textura', () => {
        it('losa no define floorTex ni wallTex', () => {
            expect(def.themes.losa!.floorTex).toBeUndefined();
            expect(def.themes.losa!.wallTex).toBeUndefined();
        });

        it('osario no define floorTex ni wallTex', () => {
            expect(def.themes.osario!.floorTex).toBeUndefined();
            expect(def.themes.osario!.wallTex).toBeUndefined();
        });

        it('musgo no define floorTex ni wallTex', () => {
            expect(def.themes.musgo!.floorTex).toBeUndefined();
            expect(def.themes.musgo!.wallTex).toBeUndefined();
        });
    });

    describe('temas nuevos con textura', () => {
        it('raices tiene floorTex y wallTex', () => {
            expect(def.themes.raices!.floorTex).toBe('baldosa_raices');
            expect(def.themes.raices!.wallTex).toBe('muro_raices');
        });

        it('humedo tiene floorTex y wallTex', () => {
            expect(def.themes.humedo!.floorTex).toBe('baldosa_humedo');
            expect(def.themes.humedo!.wallTex).toBe('muro_humedo');
        });

        it('oro tiene floorTex y wallTex', () => {
            expect(def.themes.oro!.floorTex).toBe('baldosa_oro');
            expect(def.themes.oro!.wallTex).toBe('muro_oro');
        });
    });

    describe('pisos manuales conservan su tema', () => {
        it('piso 0 (índice 0) usa losa', () => {
            expect(def.floors[0]?.theme).toBe('losa');
        });

        it('los 5 pisos manuales existen', () => {
            expect(def.floors.length).toBeGreaterThanOrEqual(5);
        });
    });

    describe('pisos profundos eligen tema por nivel', () => {
        // Los tiers de deep asignan:
        // fromLevel 10-30 → raices, 35-60 → humedo, 70-90 → oro
        // parseDeep genera pisos desde floors.length+1 hasta deep.floors

        it('el primer piso profundo (índice 5) usa raices', () => {
            // El piso 6 (índice 5) tiene nivel ~10 → tier raices
            const floor = def.floors[5];
            expect(floor).toBeDefined();
            expect(floor!.theme).toBe('raices');
        });

        it('un piso de nivel medio usa humedo', () => {
            // Busca un piso con levelMin entre 35 y 60
            const medio = def.floors.find((f) => f.levelMin >= 35 && f.levelMin <= 60);
            expect(medio).toBeDefined();
            expect(medio!.theme).toBe('humedo');
        });

        it('un piso de nivel alto usa oro', () => {
            // Busca un piso con levelMin entre 70 y 90
            const alto = def.floors.find((f) => f.levelMin >= 70 && f.levelMin <= 90);
            expect(alto).toBeDefined();
            expect(alto!.theme).toBe('oro');
        });

        it('ningún piso profundo usa losa, osario ni musgo', () => {
            // Los pisos profundos empiezan en el índice 5
            const profundos = def.floors.slice(5);
            const temasProhibidos = ['losa', 'osario', 'musgo'];
            for (const f of profundos) {
                expect(temasProhibidos).not.toContain(f.theme);
            }
        });

        it('los temas de los pisos profundos son raices, humedo u oro', () => {
            const profundos = def.floors.slice(5);
            const temasValidos = ['raices', 'humedo', 'oro'];
            for (const f of profundos) {
                expect(temasValidos).toContain(f.theme);
            }
        });
    });

    describe('tintes de los temas nuevos', () => {
        it('raices tiene tinte gris tibia', () => {
            const th = def.themes.raices!;
            expect(th.floor[0]).toBeCloseTo(0.34);
            expect(th.floor[1]).toBeCloseTo(0.33);
            expect(th.floor[2]).toBeCloseTo(0.32);
        });

        it('humedo tiene tinte verdín de musgo', () => {
            const th = def.themes.humedo!;
            expect(th.floor[0]).toBeCloseTo(0.24);
            expect(th.floor[1]).toBeCloseTo(0.29);
            expect(th.floor[2]).toBeCloseTo(0.28);
        });

        it('oro tiene tinte ocre cálido', () => {
            const th = def.themes.oro!;
            expect(th.floor[0]).toBeCloseTo(0.42);
            expect(th.floor[1]).toBeCloseTo(0.34);
            expect(th.floor[2]).toBeCloseTo(0.20);
        });
    });
});
