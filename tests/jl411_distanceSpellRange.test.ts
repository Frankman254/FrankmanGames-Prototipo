import { describe, expect, it } from 'vitest';
import enemiesJson from '../data/enemies.json';
import { loadGameData } from '../src/data';

type ArchetypeSource = { base?: string; _rol?: string };

const rawArchetypes = (enemiesJson as { archetypes: Record<string, ArchetypeSource> }).archetypes;
const data = loadGameData();

function hasDistanceRole(id: string): boolean {
    const visited = new Set<string>();
    let currentId: string | undefined = id;

    while (currentId && !visited.has(currentId)) {
        visited.add(currentId);
        const source: ArchetypeSource | undefined = rawArchetypes[currentId];
        if (!source) return false;
        if (source._rol?.startsWith('A distancia:')) return true;
        currentId = source.base;
    }

    return false;
}

describe('JL-411: hechizos de menor alcance que el ataque básico en arquetipos a distancia', () => {
    it('lista las excepciones entre los enemigos RPG', () => {
        const enemyIds = Object.keys(data.rpg.enemies);
        const distanceIds = enemyIds.filter(hasDistanceRole);
        const exceptions = distanceIds.flatMap((enemyId) => {
            const archetype = data.enemies.archetypes[enemyId]!;
            return archetype.spells
                .filter((spell) => spell.range < archetype.attack.range)
                .map((spell) => ({
                    enemyId,
                    spellName: spell.name,
                    spellRange: spell.range,
                    basicRange: archetype.attack.range,
                }));
        });

        expect(enemyIds).toHaveLength(72);
        expect(distanceIds.sort()).toEqual([
            'ancon_pavo',
            'baru_lookout',
            'bocas_pirate',
            'boquete_owl',
            'boquete_quetzal',
            'cerropunta_farmer',
            'chame_heron',
            'darien_blowgun',
            'espejo_cascabelero',
            'fortuna_archer',
            'goblin_veteran',
            'perlas_fisher',
            'ranged',
            'trapper',
        ]);
        expect(exceptions).toEqual([
            { enemyId: 'trapper', spellName: 'Cepo oculto', spellRange: 6, basicRange: 11 },
            { enemyId: 'trapper', spellName: 'Polvo de pimienta', spellRange: 3.5, basicRange: 11 },
            { enemyId: 'trapper', spellName: 'Boleadoras', spellRange: 9, basicRange: 11 },
            { enemyId: 'trapper', spellName: 'Grito desorientador', spellRange: 10, basicRange: 11 },
            {
                enemyId: 'espejo_cascabelero',
                spellName: 'Rebote de cascabel',
                spellRange: 7,
                basicRange: 11,
            },
        ]);
    });
});
