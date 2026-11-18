import { describe, it, expect } from 'vitest';
import { rankLadder, rankAtLevel, type SpellRankConfig } from '../src/rpg/spellRank';

/**
 * HZ-01: El libro de hechizos muestra en qué nivel se obtiene cada rango.
 *
 * Pruebas de rankLadder() contra la tabla de docs/diseno/03_HECHIZOS_Y_RANGOS.md
 * (sección "Umbrales", máximo 200).
 */
describe('HZ-01: rankLadder', () => {
    const cfg: SpellRankConfig = {
        '5': [0.1, 0.25, 0.5, 0.9],
        '3': [0.3, 0.8],
        '6': [0.08, 0.2, 0.4, 0.65, 0.9],
    };
    const maxLevel = 200;

    describe('maxRank 5 — tabla de 03_HECHIZOS_Y_RANGOS.md', () => {
        /**
         * La tabla dice (máximo 200):
         * U=1  → 21 · 51 · 101 · 181
         * U=5  → 25 · 54 · 103 · 181
         * U=20 → 38 · 65 · 110 · 182
         * U=60 → 74 · 95 · 130 · 186
         * U=100→ 110· 125· 150 · 190
         * U=150→ 155· 163· 175 · 195
         */
        const cases: { U: number; expected: number[] }[] = [
            { U: 1, expected: [1, 21, 51, 101, 181] },
            { U: 5, expected: [5, 25, 54, 103, 181] },
            { U: 20, expected: [20, 38, 65, 110, 182] },
            { U: 60, expected: [60, 74, 95, 130, 186] },
            { U: 100, expected: [100, 110, 125, 150, 190] },
            { U: 150, expected: [150, 155, 163, 175, 195] },
        ];

        for (const { U, expected } of cases) {
            it(`aprendido en nivel ${U}: ${expected.join(' · ')}`, () => {
                const ladder = rankLadder({ unlockLevel: U, maxRank: 5 }, maxLevel, cfg);
                const levels = ladder.map((s) => s.level);
                expect(levels).toEqual(expected);
                expect(ladder.map((s) => s.rank)).toEqual([1, 2, 3, 4, 5]);
            });
        }
    });

    describe('maxRank 3 — tabla de 03_HECHIZOS_Y_RANGOS.md', () => {
        /**
         * La tabla dice (máximo 200, máximo 3 rangos):
         * U=1  → 61 · 161
         * U=5  → 64 · 161
         * U=20 → 74 · 164
         * U=60 → 102· 172
         * U=100→ 130· 180
         * U=150→ 165· 190
         */
        const cases: { U: number; expected: number[] }[] = [
            { U: 1, expected: [1, 61, 161] },
            { U: 5, expected: [5, 64, 161] },
            { U: 20, expected: [20, 74, 164] },
            { U: 60, expected: [60, 102, 172] },
            { U: 100, expected: [100, 130, 180] },
            { U: 150, expected: [150, 165, 190] },
        ];

        for (const { U, expected } of cases) {
            it(`aprendido en nivel ${U}: ${expected.join(' · ')}`, () => {
                const ladder = rankLadder({ unlockLevel: U, maxRank: 3 }, maxLevel, cfg);
                const levels = ladder.map((s) => s.level);
                expect(levels).toEqual(expected);
                expect(ladder.map((s) => s.rank)).toEqual([1, 2, 3]);
            });
        }
    });

    it('sin factores devuelve solo rango 1', () => {
        const ladder = rankLadder({ unlockLevel: 10, maxRank: 5 }, maxLevel, {});
        expect(ladder).toEqual([{ rank: 1, level: 10 }]);
    });

    it('maxRank 1 devuelve solo rango 1', () => {
        const ladder = rankLadder({ unlockLevel: 10, maxRank: 1 }, maxLevel, cfg);
        expect(ladder).toEqual([{ rank: 1, level: 10 }]);
    });

    it('unlockLevel undefined se trata como 1', () => {
        const ladder = rankLadder({ maxRank: 5 }, maxLevel, cfg);
        expect(ladder[0]).toEqual({ rank: 1, level: 1 });
        expect(ladder[1]?.level).toBe(21);
    });

    describe('consistencia con rankAtLevel', () => {
        it('rankAtLevel devuelve el rango correcto para cada umbral de la escalera', () => {
            const def = { unlockLevel: 20, maxRank: 5 };
            const ladder = rankLadder(def, maxLevel, cfg);
            for (const step of ladder) {
                // En el nivel del umbral, rankAtLevel debe dar al menos ese rango.
                const rank = rankAtLevel(def, step.level, maxLevel, cfg);
                expect(rank).toBeGreaterThanOrEqual(step.rank);
            }
        });

        it('un nivel justo debajo del umbral no alcanza el rango', () => {
            const def = { unlockLevel: 20, maxRank: 5 };
            const ladder = rankLadder(def, maxLevel, cfg);
            for (let i = 1; i < ladder.length; i++) {
                const step = ladder[i];
                if (!step) continue;
                const below = step.level - 1;
                const rank = rankAtLevel(def, below, maxLevel, cfg);
                expect(rank).toBeLessThan(step.rank);
            }
        });
    });

    it('umbrales estrictamente crecientes', () => {
        const def = { unlockLevel: 1, maxRank: 5 };
        const ladder = rankLadder(def, maxLevel, cfg);
        for (let i = 1; i < ladder.length; i++) {
            const curr = ladder[i];
            const prev = ladder[i - 1];
            if (!curr || !prev) continue;
            expect(curr.level).toBeGreaterThan(prev.level);
        }
    });

    it('a nivel máximo todo está en rango máximo', () => {
        const def = { unlockLevel: 1, maxRank: 5 };
        const ladder = rankLadder(def, maxLevel, cfg);
        const last = ladder[ladder.length - 1];
        expect(last!.rank).toBe(5);
        expect(last!.level).toBeLessThanOrEqual(maxLevel);
    });
});
