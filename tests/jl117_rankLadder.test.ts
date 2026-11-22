import { describe, it, expect } from 'vitest';
import { rankLadder, rankAtLevel, type SpellRankConfig } from '../src/rpg/spellRank';

/**
 * JL-117: Prueba de rankLadder con maxRank 6 y hechizos que se aprenden
 * en el nivel 150 o después.
 *
 * Los hechizos tardíos (unlockLevel ≥ 150) tienen poco margen para subir
 * de rango: con U=150 y M=200, el margen es solo 50 niveles. Con los
 * factores '6' [0.08, 0.20, 0.40, 0.65, 0.90], algunos rangos pueden
 * no alcanzarse nunca porque el umbral supera el nivel máximo.
 */
describe('JL-117: rankLadder con maxRank 6 y hechizos tardíos', () => {
    const maxLevel = 200;
    const cfg: SpellRankConfig = {
        '6': [0.08, 0.20, 0.40, 0.65, 0.90],
    };

    /**
     * Casos reales de spells.json: unlockLevel ≥ 150, maxRank 6.
     * Cada uno con el id del hechizo para referencia.
     */
    const lateSpells = [
        { id: 'flood_furrow', unlockLevel: 150, classId: 'ember_vanguard' },
        { id: 'glacial_lance', unlockLevel: 165, classId: 'ember_vanguard' },
        { id: 'tempest_crown', unlockLevel: 200, classId: 'ember_vanguard' },
        { id: 'storm_weaver_190', unlockLevel: 190, classId: 'storm_weaver' },
        { id: 'storm_weaver_180', unlockLevel: 180, classId: 'storm_weaver' },
        { id: 'storm_weaver_200', unlockLevel: 200, classId: 'storm_weaver' },
        { id: 'mangrove_hunter_165', unlockLevel: 165, classId: 'mangrove_hunter' },
        { id: 'mangrove_hunter_200', unlockLevel: 200, classId: 'mangrove_hunter' },
        { id: 'ember_vanguard_180', unlockLevel: 180, classId: 'ember_vanguard' },
        { id: 'ember_vanguard_190', unlockLevel: 190, classId: 'ember_vanguard' },
        { id: 'storm_weaver_150', unlockLevel: 150, classId: 'storm_weaver' },
        { id: 'storm_weaver_165', unlockLevel: 165, classId: 'storm_weaver' },
        { id: 'mangrove_hunter_150', unlockLevel: 150, classId: 'mangrove_hunter' },
        { id: 'mangrove_hunter_158', unlockLevel: 158, classId: 'mangrove_hunter' },
        { id: 'mangrove_hunter_180', unlockLevel: 180, classId: 'mangrove_hunter' },
        { id: 'mangrove_hunter_190', unlockLevel: 190, classId: 'mangrove_hunter' },
    ];

    describe('escalera de rangos para cada unlockLevel tardío', () => {
        for (const spell of lateSpells) {
            it(`${spell.id} (nivel ${spell.unlockLevel}): escalera válida`, () => {
                const def = { unlockLevel: spell.unlockLevel, maxRank: 6 };
                const ladder = rankLadder(def, maxLevel, cfg);

                // El primer peldaño siempre es el rango 1 en unlockLevel.
                expect(ladder[0]).toEqual({ rank: 1, level: spell.unlockLevel });

                // Los niveles deben ser no-decrecientes (≥).
                // Con margen muy pequeño (U=195+), los umbrales pueden coincidir
                // porque ceil((M-U)*f) da el mismo valor para factores cercanos.
                // rankLadder no verifica monotonía estricta: empuja todos los
                // umbrales ≤ M. Esto es el comportamiento actual (HZ-03-fix).
                for (let i = 1; i < ladder.length; i++) {
                    const prev = ladder[i - 1]!;
                    const curr = ladder[i]!;
                    expect(curr.level).toBeGreaterThanOrEqual(prev.level);
                    expect(curr.rank).toBe(prev.rank + 1);
                }

                // Ningún nivel supera el máximo del juego.
                for (const step of ladder) {
                    expect(step.level).toBeLessThanOrEqual(maxLevel);
                }

                // Si unlockLevel === maxLevel, la escalera tiene 6 peldaños
                // todos en nivel 200 (margen 0 → todos los umbrales = 200).
                // rankAtLevel con U===M y level===U devuelve 6 (no 1),
                // porque la condición U < M es falsa y el bucle de factores
                // alcanza todos los rangos con threshold = 200.
                if (spell.unlockLevel === maxLevel) {
                    expect(ladder.length).toBe(6);
                    // Todos en nivel 200.
                    for (const step of ladder) {
                        expect(step.level).toBe(200);
                    }
                } else {
                    // Con margen, al menos rango 1 y posiblemente más.
                    expect(ladder.length).toBeGreaterThanOrEqual(1);
                }
            });
        }
    });

    describe('rankAtLevel coincide con la escalera', () => {
        for (const spell of lateSpells) {
            it(`${spell.id} (nivel ${spell.unlockLevel}): rankAtLevel sigue la escalera`, () => {
                const def = { unlockLevel: spell.unlockLevel, maxRank: 6 };
                const ladder = rankLadder(def, maxLevel, cfg);

                for (const step of ladder) {
                    // En el nivel del umbral, rankAtLevel debe dar al menos ese rango.
                    const rank = rankAtLevel(def, step.level, maxLevel, cfg);
                    expect(rank).toBeGreaterThanOrEqual(step.rank);
                }

                // Un nivel justo debajo de cada umbral no alcanza ese rango.
                for (let i = 1; i < ladder.length; i++) {
                    const step = ladder[i]!;
                    const rankBelow = rankAtLevel(def, step.level - 1, maxLevel, cfg);
                    expect(rankBelow).toBeLessThan(step.rank);
                }
            });
        }
    });

    describe('casos límite', () => {
        it('unlockLevel 150: rango 1 en 150, rangos siguientes dentro del 200', () => {
            const def = { unlockLevel: 150, maxRank: 6 };
            const ladder = rankLadder(def, maxLevel, cfg);

            // Con U=150, M=200, margen=50.
            // Rango 2: 150 + ceil(50 * 0.08) = 150 + 4 = 154
            // Rango 3: 150 + ceil(50 * 0.20) = 150 + 10 = 160
            // Rango 4: 150 + ceil(50 * 0.40) = 150 + 20 = 170
            // Rango 5: 150 + ceil(50 * 0.65) = 150 + 33 = 183
            // Rango 6: 150 + ceil(50 * 0.90) = 150 + 45 = 195
            expect(ladder.length).toBe(6);
            expect(ladder.map((s) => s.level)).toEqual([150, 154, 160, 170, 183, 195]);
        });

        it('unlockLevel 190: pocos rangos alcanzables', () => {
            const def = { unlockLevel: 190, maxRank: 6 };
            const ladder = rankLadder(def, maxLevel, cfg);

            // Con U=190, M=200, margen=10.
            // Rango 2: 190 + ceil(10 * 0.08) = 190 + 1 = 191
            // Rango 3: 190 + ceil(10 * 0.20) = 190 + 2 = 192
            // Rango 4: 190 + ceil(10 * 0.40) = 190 + 4 = 194
            // Rango 5: 190 + ceil(10 * 0.65) = 190 + 7 = 197
            // Rango 6: 190 + ceil(10 * 0.90) = 190 + 9 = 199
            expect(ladder.length).toBe(6);
            expect(ladder.map((s) => s.level)).toEqual([190, 191, 192, 194, 197, 199]);
        });

        it('unlockLevel 200: 6 peldaños todos en nivel 200', () => {
            const def = { unlockLevel: 200, maxRank: 6 };
            const ladder = rankLadder(def, maxLevel, cfg);

            // Con U=200, M=200, margen=0.
            // Todos los umbrales = 200 + ceil(0 * f) = 200.
            // threshold = 200, que no es > 200, así que no se rompe.
            // rankLadder empuja los 6 rangos, todos en nivel 200.
            expect(ladder.length).toBe(6);
            expect(ladder.map((s) => s.level)).toEqual([200, 200, 200, 200, 200, 200]);
            expect(ladder.map((s) => s.rank)).toEqual([1, 2, 3, 4, 5, 6]);

            // rankAtLevel con U===M: la condición level===U && U<M es falsa
            // (porque U===M), así que el bucle de factores se ejecuta.
            // threshold = 200 para todos. level 200 >= 200 → rank = 6.
            const rank = rankAtLevel(def, 200, maxLevel, cfg);
            expect(rank).toBe(6);
        });

        it('rankAtLevel a nivel 200 para hechizo de nivel 150 da rango 6', () => {
            const def = { unlockLevel: 150, maxRank: 6 };
            const rank = rankAtLevel(def, 200, maxLevel, cfg);
            expect(rank).toBe(6);
        });

        it('rankAtLevel a nivel 150 para hechizo de nivel 150 da rango 1', () => {
            const def = { unlockLevel: 150, maxRank: 6 };
            const rank = rankAtLevel(def, 150, maxLevel, cfg);
            expect(rank).toBe(1);
        });

        it('rankAtLevel a nivel 199 para hechizo de nivel 150 da rango 6', () => {
            const def = { unlockLevel: 150, maxRank: 6 };
            const rank = rankAtLevel(def, 199, maxLevel, cfg);
            // Rango 6 umbral: 195. 199 >= 195 → rango 6.
            expect(rank).toBe(6);
        });

        it('rankAtLevel a nivel 194 para hechizo de nivel 150 da rango 5', () => {
            const def = { unlockLevel: 150, maxRank: 6 };
            const rank = rankAtLevel(def, 194, maxLevel, cfg);
            // Rango 5 umbral: 183. Rango 6 umbral: 195. 194 < 195 → rango 5.
            expect(rank).toBe(5);
        });

        it('sin factores "6" devuelve solo rango 1', () => {
            const def = { unlockLevel: 150, maxRank: 6 };
            const emptyCfg: SpellRankConfig = {};
            const ladder = rankLadder(def, maxLevel, emptyCfg);
            expect(ladder).toEqual([{ rank: 1, level: 150 }]);
        });

        it('monotonía no-decreciente: los umbrales nunca bajan para cualquier unlockLevel', () => {
            // Verificamos todos los unlockLevel de 1 a 200.
            // Con margen muy pequeño (U=195+), los umbrales pueden coincidir
            // (ej: U=195 → rangos 2 y 3 ambos en 196), pero nunca bajan.
            for (let U = 1; U <= maxLevel; U++) {
                const def = { unlockLevel: U, maxRank: 6 };
                const ladder = rankLadder(def, maxLevel, cfg);
                for (let i = 1; i < ladder.length; i++) {
                    const prev = ladder[i - 1]!;
                    const curr = ladder[i]!;
                    expect(curr.level, `U=${U}: peldaño ${i} baja`).toBeGreaterThanOrEqual(prev.level);
                }
            }
        });

        it('casos con niveles duplicados: U=195 da rangos 2 y 3 en el mismo nivel', () => {
            const def = { unlockLevel: 195, maxRank: 6 };
            const ladder = rankLadder(def, maxLevel, cfg);
            // Rango 2: 195 + ceil(5 * 0.08) = 195 + 1 = 196
            // Rango 3: 195 + ceil(5 * 0.20) = 195 + 1 = 196 (mismo nivel)
            // Rango 4: 195 + ceil(5 * 0.40) = 195 + 2 = 197
            // Rango 5: 195 + ceil(5 * 0.65) = 195 + 4 = 199
            // Rango 6: 195 + ceil(5 * 0.90) = 195 + 5 = 200
            expect(ladder.map((s) => s.level)).toEqual([195, 196, 196, 197, 199, 200]);
        });

        it('ningún umbral supera maxLevel para cualquier unlockLevel', () => {
            for (let U = 1; U <= maxLevel; U++) {
                const def = { unlockLevel: U, maxRank: 6 };
                const ladder = rankLadder(def, maxLevel, cfg);
                for (const step of ladder) {
                    expect(step.level, `U=${U}: nivel ${step.level} > ${maxLevel}`).toBeLessThanOrEqual(maxLevel);
                }
            }
        });
    });
});
