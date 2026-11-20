import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { buildCompendium, type CompendiumCreature } from '../src/rpg/compendium';

const data = loadGameData();
const comp = buildCompendium({ content: data.rpg, archetypes: data.enemies.archetypes, zones: data.zones.zones });

describe('JL-41 compendio: resistencias elementales', () => {
    it('todas las criaturas del compendio tienen el campo resists', () => {
        for (const c of comp.creatures) {
            expect(c).toHaveProperty('resists');
            expect(typeof c.resists).toBe('object');
        }
    });

    it('una criatura con resist.earth en stats la tiene en resists', () => {
        // melee (Sato Cimarrón) — earth: earth=15, fire=12, lightning=10, air=-12 (JL-43)
        const melee = comp.creatures.find((c) => c.id === 'melee')!;
        expect(melee.resists.earth).toBe(15);
        expect(melee.resists.fire).toBe(12);
        expect(melee.resists.lightning).toBe(10);
        expect(melee.resists.air).toBe(-12);
    });

    it('una criatura con resistencia negativa la tiene en resists', () => {
        // summoner (Curandero de Huesos) — earth: earth=15, fire=12, lightning=10, air=-12 (JL-43)
        const summoner = comp.creatures.find((c) => c.id === 'summoner')!;
        expect(summoner.resists.earth).toBe(15);
        expect(summoner.resists.fire).toBe(12);
        expect(summoner.resists.lightning).toBe(10);
        expect(summoner.resists.air).toBe(-12);
    });

    it('una criatura con debilidad la refleja', () => {
        // minion (Diablico Sucio) — earth: earth=15, fire=12, lightning=10, air=-12 (JL-43)
        const minion = comp.creatures.find((c) => c.id === 'minion')!;
        expect(minion.resists.air).toBe(-12);
    });

    it('los elementos sin afinidad no aparecen en resists', () => {
        // melee (earth) resiste earth, fire, lightning y es débil a air;
        // water y frost no deben estar (JL-43)
        const melee = comp.creatures.find((c) => c.id === 'melee')!;
        expect(melee.resists.water).toBeUndefined();
        expect(melee.resists.frost).toBeUndefined();
    });

    it('las resistencias solo contienen valores no nulos', () => {
        for (const c of comp.creatures) {
            for (const [el, val] of Object.entries(c.resists)) {
                expect(typeof val).toBe('number');
                expect(val).not.toBe(0);
                // Elemento válido
                expect(['earth', 'fire', 'air', 'water', 'frost', 'lightning']).toContain(el);
            }
        }
    });

    it('el compendio completo tiene criaturas con resistencias variadas', () => {
        const withResists = comp.creatures.filter((c) => Object.keys(c.resists).length > 0);
        // Todos los 69 enemigos tienen al menos una resistencia en los datos
        expect(withResists.length).toBeGreaterThan(0);
        // Verificar que hay tanto positivas como negativas
        const hasPositive = withResists.some((c) =>
            Object.values(c.resists).some((v) => v > 0),
        );
        const hasNegative = withResists.some((c) =>
            Object.values(c.resists).some((v) => v < 0),
        );
        expect(hasPositive).toBe(true);
        expect(hasNegative).toBe(true);
    });

    it('buildCompendium con datos sintéticos: resistencias extraídas correctamente', () => {
        const synthetic = buildCompendium({
            content: {
                ...data.rpg,
                enemies: {
                    test_fire: {
                        name: 'Fuego de prueba',
                        level: 10,
                        xp: 100,
                        lootTable: null,
                        element: 'fire',
                        stats: {
                            'resist.fire': 15,
                            'resist.earth': 10,
                            'resist.water': -12,
                        },
                    },
                },
            },
            archetypes: {
                test_fire: { maxHealth: 100, speed: 3, attack: { range: 1 } },
            },
            zones: [],
        });
        const creature = synthetic.creatures[0]!;
        expect(creature.resists.fire).toBe(15);
        expect(creature.resists.earth).toBe(10);
        expect(creature.resists.water).toBe(-12);
        expect(creature.resists.air).toBeUndefined();
        expect(creature.resists.frost).toBeUndefined();
        expect(creature.resists.lightning).toBeUndefined();
    });

    it('buildCompendium con stats vacio: resists queda vacio', () => {
        const synthetic = buildCompendium({
            content: {
                ...data.rpg,
                enemies: {
                    test_empty: {
                        name: 'Sin resistencias',
                        level: 1,
                        xp: 10,
                        lootTable: null,
                        element: 'earth',
                        stats: {},
                    },
                },
            },
            archetypes: {
                test_empty: { maxHealth: 50, speed: 2, attack: { range: 1 } },
            },
            zones: [],
        });
        const creature = synthetic.creatures[0]!;
        expect(Object.keys(creature.resists)).toHaveLength(0);
    });

    it('buildCompendium sin stats: resists queda vacio', () => {
        const synthetic = buildCompendium({
            content: {
                ...data.rpg,
                enemies: {
                    test_noStats: {
                        name: 'Sin stats',
                        level: 1,
                        xp: 10,
                        lootTable: null,
                        element: 'air',
                    },
                },
            },
            archetypes: {
                test_noStats: { maxHealth: 50, speed: 2, attack: { range: 1 } },
            },
            zones: [],
        });
        const creature = synthetic.creatures[0]!;
        expect(Object.keys(creature.resists)).toHaveLength(0);
    });
});
