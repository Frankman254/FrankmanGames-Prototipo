import { describe, expect, it } from 'vitest';
import enemiesJson from '../data/rpg/enemies.json';
import dungeonJson from '../data/dungeons/cripta-tulivieja.json';

const enemies = enemiesJson.enemies as Record<string, {
    name: string;
    level: number;
    xp: number;
    lootTable: string;
    element: string;
    stats?: Record<string, number>;
}>;

const floors = dungeonJson.floors as Array<{
    id: string;
    spawns: Array<{
        id: string;
        archetype: string;
        level: number;
        tile: number[];
        guardian?: boolean;
    }>;
}>;

describe('JL-44: cripta_rata, cripta_bruto, cripta_guardian en la cripta', () => {
    describe('arquetipos en enemies.json', () => {
        it('cripta_rata existe con cifras coherentes', () => {
            const arch = enemies['cripta_rata'];
            expect(arch).toBeDefined();
            expect(arch!.name).toBe('Ratón de la Cripta');
            expect(arch!.level).toBe(2);
            expect(arch!.xp).toBe(10);
            expect(arch!.element).toBe('earth');
            expect(arch!.lootTable).toBe('bone_imp');
        });

        it('cripta_bruto existe con cifras coherentes', () => {
            const arch = enemies['cripta_bruto'];
            expect(arch).toBeDefined();
            expect(arch!.name).toBe('Bruto de la Cripta');
            expect(arch!.level).toBe(8);
            expect(arch!.xp).toBe(80);
            expect(arch!.element).toBe('earth');
            expect(arch!.lootTable).toBe('bone_shaman');
            expect(arch!.stats!.power).toBe(15);
        });

        it('cripta_guardian existe con cifras coherentes', () => {
            const arch = enemies['cripta_guardian'];
            expect(arch).toBeDefined();
            expect(arch!.name).toBe('Guardián de la Cripta');
            expect(arch!.level).toBe(12);
            expect(arch!.xp).toBe(140);
            expect(arch!.element).toBe('earth');
            expect(arch!.lootTable).toBe('alpha_wolf');
            expect(arch!.stats!.power).toBe(15);
        });

        it('las 3 criaturas siguen la tabla de afinidades earth', () => {
            for (const id of ['cripta_rata', 'cripta_bruto', 'cripta_guardian']) {
                const arch = enemies[id]!;
                const s = arch.stats!;
                expect(s['resist.earth'], `${id}: resist.earth`).toBe(15);
                expect(s['resist.fire'], `${id}: resist.fire`).toBe(12);
                expect(s['resist.lightning'], `${id}: resist.lightning`).toBe(10);
                expect(s['resist.air'], `${id}: resist.air`).toBe(-12);
            }
        });

        it('las XP escalan con el nivel (rata < bruto < guardian)', () => {
            expect(enemies['cripta_rata']!.xp).toBeLessThan(enemies['cripta_bruto']!.xp);
            expect(enemies['cripta_bruto']!.xp).toBeLessThan(enemies['cripta_guardian']!.xp);
        });

        it('los niveles base están en orden (rata < bruto < guardian)', () => {
            expect(enemies['cripta_rata']!.level).toBeLessThan(enemies['cripta_bruto']!.level);
            expect(enemies['cripta_bruto']!.level).toBeLessThan(enemies['cripta_guardian']!.level);
        });
    });

    describe('spawns en cripta-tulivieja', () => {
        function getSpawnsByArchetype(archetype: string) {
            const results: Array<{ floorId: string; spawnId: string; level: number }> = [];
            for (const floor of floors) {
                for (const spawn of floor.spawns) {
                    if (spawn.archetype === archetype) {
                        results.push({
                            floorId: floor.id,
                            spawnId: spawn.id,
                            level: spawn.level
                        });
                    }
                }
            }
            return results;
        }

        it('cripta_rata aparece en pisos bajos (1-2)', () => {
            const spawns = getSpawnsByArchetype('cripta_rata');
            expect(spawns.length).toBeGreaterThanOrEqual(2);
            for (const s of spawns) {
                expect(s.level).toBeGreaterThanOrEqual(2);
                expect(s.level).toBeLessThanOrEqual(4);
            }
        });

        it('cripta_bruto aparece en pisos medios (3-4)', () => {
            const spawns = getSpawnsByArchetype('cripta_bruto');
            expect(spawns.length).toBeGreaterThanOrEqual(1);
            for (const s of spawns) {
                expect(s.level).toBeGreaterThanOrEqual(7);
                expect(s.level).toBeLessThanOrEqual(11);
            }
        });

        it('cripta_guardian aparece en pisos altos (4-5)', () => {
            const spawns = getSpawnsByArchetype('cripta_guardian');
            expect(spawns.length).toBeGreaterThanOrEqual(1);
            for (const s of spawns) {
                expect(s.level).toBeGreaterThanOrEqual(10);
                expect(s.level).toBeLessThanOrEqual(14);
            }
        });

        it('cada spawn tiene tile dentro del mapa 15x15', () => {
            for (const floor of floors) {
                for (const spawn of floor.spawns) {
                    const [x, y] = spawn.tile;
                    expect(x).toBeGreaterThanOrEqual(0);
                    expect(x).toBeLessThan(15);
                    expect(y).toBeGreaterThanOrEqual(0);
                    expect(y).toBeLessThan(15);
                }
            }
        });

        it('no hay IDs duplicados de spawn entre pisos', () => {
            const allIds: string[] = [];
            for (const floor of floors) {
                for (const spawn of floor.spawns) {
                    allIds.push(spawn.id);
                }
            }
            const unique = new Set(allIds);
            expect(unique.size).toBe(allIds.length);
        });
    });

    describe('consistencia con assets.json', () => {
        it('los 3 modelos existen en assets.json', () => {
            // Verificamos que los templates enemy.* existen
            const assetsJson = require('../data/assets.json');
            expect(assetsJson.assets['enemy.cripta_rata']).toBeDefined();
            expect(assetsJson.assets['enemy.cripta_bruto']).toBeDefined();
            expect(assetsJson.assets['enemy.cripta_guardian']).toBeDefined();
        });
    });
});
