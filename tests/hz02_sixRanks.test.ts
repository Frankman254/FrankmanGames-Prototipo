import { describe, it, expect } from 'vitest';
import { rankAtLevel, effectiveRank, rankLadder, type SpellRankConfig } from '../src/rpg/spellRank';
import { content } from './rpg/helpers';

/**
 * HZ-02: Seis rangos por hechizo.
 *
 * Pruebas de que maxRank 6 funciona correctamente con los factores PROPUESTA
 * [0.08, 0.20, 0.40, 0.65, 0.90].
 */
describe('HZ-02: seis rangos por hechizo', () => {
    const cfg: SpellRankConfig = {
        '5': [0.1, 0.25, 0.5, 0.9],
        '3': [0.3, 0.8],
        '6': [0.08, 0.2, 0.4, 0.65, 0.9],
    };
    const maxLevel = 200;

    describe('rankAtLevel con maxRank 6', () => {
        it('hechizo aprendido en nivel 1 llega a rango 6 en nivel 200', () => {
            const def = { unlockLevel: 1, maxRank: 6 };
            // Factores: [0.08, 0.20, 0.40, 0.65, 0.90]
            // Rangos: 1+ceil(199*0.08)=17, 1+ceil(199*0.20)=41, 1+ceil(199*0.40)=81,
            //         1+ceil(199*0.65)=131, 1+ceil(199*0.90)=181
            expect(rankAtLevel(def, 1, maxLevel, cfg)).toBe(1);
            expect(rankAtLevel(def, 16, maxLevel, cfg)).toBe(1);
            expect(rankAtLevel(def, 17, maxLevel, cfg)).toBe(2);
            expect(rankAtLevel(def, 40, maxLevel, cfg)).toBe(2);
            expect(rankAtLevel(def, 41, maxLevel, cfg)).toBe(3);
            expect(rankAtLevel(def, 80, maxLevel, cfg)).toBe(3);
            expect(rankAtLevel(def, 81, maxLevel, cfg)).toBe(4);
            expect(rankAtLevel(def, 130, maxLevel, cfg)).toBe(4);
            expect(rankAtLevel(def, 131, maxLevel, cfg)).toBe(5);
            expect(rankAtLevel(def, 180, maxLevel, cfg)).toBe(5);
            expect(rankAtLevel(def, 181, maxLevel, cfg)).toBe(6);
            expect(rankAtLevel(def, 200, maxLevel, cfg)).toBe(6);
        });

        it('hechizo aprendido en nivel 20 llega a rango 6 en nivel 200', () => {
            const def = { unlockLevel: 20, maxRank: 6 };
            // Factores: [0.08, 0.20, 0.40, 0.65, 0.90]
            // Rangos: 20+ceil(180*0.08)=35, 20+ceil(180*0.20)=56, 20+ceil(180*0.40)=92,
            //         20+ceil(180*0.65)=137, 20+ceil(180*0.90)=182
            expect(rankAtLevel(def, 20, maxLevel, cfg)).toBe(1);
            expect(rankAtLevel(def, 35, maxLevel, cfg)).toBe(2);
            expect(rankAtLevel(def, 56, maxLevel, cfg)).toBe(3);
            expect(rankAtLevel(def, 92, maxLevel, cfg)).toBe(4);
            expect(rankAtLevel(def, 137, maxLevel, cfg)).toBe(5);
            expect(rankAtLevel(def, 182, maxLevel, cfg)).toBe(6);
            expect(rankAtLevel(def, 200, maxLevel, cfg)).toBe(6);
        });

        it('umbrales estrictamente crecientes', () => {
            const def = { unlockLevel: 1, maxRank: 6 };
            const ladder = rankLadder(def, maxLevel, cfg);
            for (let i = 1; i < ladder.length; i++) {
                const curr = ladder[i]!;
                const prev = ladder[i - 1]!;
                expect(curr.level).toBeGreaterThan(prev.level);
            }
        });
    });

    describe('rankLadder con maxRank 6', () => {
        it('devuelve 6 peldaños', () => {
            const def = { unlockLevel: 1, maxRank: 6 };
            const ladder = rankLadder(def, maxLevel, cfg);
            expect(ladder.length).toBe(6);
            expect(ladder.map((s) => s.rank)).toEqual([1, 2, 3, 4, 5, 6]);
        });

        it('rango 1 en unlockLevel', () => {
            const def = { unlockLevel: 10, maxRank: 6 };
            const ladder = rankLadder(def, maxLevel, cfg);
            expect(ladder[0]).toEqual({ rank: 1, level: 10 });
        });
    });

    describe('effectiveRank con maxRank 6', () => {
        it('guardado con rango 5 no baja al cargar', () => {
            // Un guardado viejo con rango 5 de un hechizo que ahora tiene maxRank 6
            // debe mantener al menos rango 5.
            expect(effectiveRank(5, 3, 6)).toBe(5);
        });

        it('nunca supera maxRank 6', () => {
            expect(effectiveRank(7, 6, 6)).toBe(6);
            expect(effectiveRank(6, 7, 6)).toBe(6);
        });
    });

    describe('integración con contenido real', () => {
        const ct = content();

        it('todos los hechizos tienen maxRank 6', () => {
            for (const spell of Object.values(ct.spells)) {
                expect(spell.maxRank, spell.id).toBe(6);
            }
        });

        it('los factores de maxRank 6 se cargan en progression', () => {
            const factors = ct.progression.spellRankFactors;
            expect(factors).toBeDefined();
            expect(factors!['6']).toEqual([0.08, 0.2, 0.4, 0.65, 0.9]);
        });

        it('personaje de nivel máximo tiene todos los hechizos en rango 6', () => {
            const factors = ct.progression.spellRankFactors!;
            for (const spell of Object.values(ct.spells)) {
                const autoRank = rankAtLevel(spell, ct.progression.maxLevel, ct.progression.maxLevel, factors);
                expect(autoRank, `${spell.id} en nivel ${ct.progression.maxLevel}`).toBe(6);
            }
        });
    });
});
