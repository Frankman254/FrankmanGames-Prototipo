// D-45: contentCheck — pruebas con datos sintéticos
//
// checkContent() acepta un objeto SyntheticData opcional para evitar
// modificar los archivos reales. Las pruebas pasan datos sintéticos
// directamente.

import { describe, expect, it } from 'vitest';
import { checkContent, type SyntheticData } from '../scripts/contentCheck';

// Marcar para que contentCheck.ts no haga process.exit al importarse.
(globalThis as any).__CONTENT_CHECK_IMPORT_ONLY = true;

/** Datos sintéticos con referencias rotas para probar la detección. */
function getSyntheticData(): SyntheticData {
  return {
    rpgItems: {
      items: {
        sword: { name: 'Espada', category: 'weapon' },
        shield: { name: 'Escudo', category: 'armor' },
        scroll_fire: { name: 'Pergamino', use: { learnSpell: 'fireball' } },
        setItem1: { name: 'Pieza set', setId: 'warrior' },
        setItem2: { name: 'Pieza set 2', setId: 'warrior' },
        setItemBad: { name: 'Pieza set roto', setId: 'nonexistent_set' },
      },
    },
    rpgSets: {
      sets: {
        warrior: {
          name: 'del Guerrero',
          itemIds: ['sword', 'shield'],
          bonuses: [{ pieces: 2, modifiers: [] }],
        },
        badSet: {
          name: 'Set roto',
          itemIds: ['nonexistent_item'],
          bonuses: [{ pieces: 2, modifiers: [] }],
        },
      },
    },
    rpgSpells: {
      spells: {
        fireball: {
          name: 'Bola de fuego',
          classId: 'warrior',
          effects: [{ type: 'damage', min: 5, max: 10, element: 'fire' }, { type: 'status', statusId: 'burn' }],
        },
        heal: {
          name: 'Curar',
          classId: 'healer',
          effects: [{ type: 'heal', min: 10, max: 20 }],
        },
        badSpell: {
          name: 'Hechizo roto',
          classId: 'nonexistent_class',
          effects: [{ type: 'status', statusId: 'nonexistent_status' }],
        },
      },
    },
    rpgStatuses: {
      statuses: {
        burn: { name: 'Quemadura', kind: 'debuff', duration: 3 },
        shield: { name: 'Escudo', kind: 'buff', duration: 5 },
      },
    },
    rpgClasses: {
      classes: {
        warrior: { name: 'Guerrero', baseStats: {} },
        healer: { name: 'Sanador', baseStats: {} },
      },
    },
    rpgEnemies: {
      enemies: {
        wolf: { name: 'Lobo', level: 1, lootTable: 'wolf_loot' },
        badEnemy: { name: 'Enemigo roto', level: 1, lootTable: 'nonexistent_loot' },
      },
    },
    rpgLoot: {
      tables: {
        wolf_loot: {
          entries: [
            { itemId: 'sword', weight: 1 },
            { itemId: 'nonexistent_item', weight: 1 },
          ],
        },
      },
    },
    rpgMerchants: {
      merchants: {
        smith: {
          name: 'Herrero',
          stock: [
            { itemId: 'sword', quantity: null },
            { itemId: 'nonexistent_item', quantity: 1 },
          ],
        },
      },
    },
    rpgNpcs: {
      npcs: {
        elder: {
          name: 'Anciano',
          dialogue: {
            entry: [{ node: 'hello' }],
            nodes: {
              hello: {
                text: 'Hola.',
                options: [
                  {
                    text: 'Misión?',
                    conditions: [{ type: 'quest', questId: 'q_fetch' }],
                    next: 'quest',
                  },
                  {
                    text: 'Mira esto',
                    conditions: [{ type: 'hasItem', itemId: 'nonexistent_item' }],
                    next: null,
                  },
                ],
              },
              quest: { text: 'Ve a buscar.', options: [] },
            },
          },
        },
        badNpc: {
          name: 'NPC roto',
          dialogue: {
            entry: [{ node: 'hello' }],
            nodes: {
              hello: {
                text: 'Hola.',
                options: [
                  {
                    text: 'Misión?',
                    conditions: [{ type: 'quest', questId: 'nonexistent_quest' }],
                    next: null,
                  },
                ],
              },
            },
          },
        },
      },
    },
    rpgQuests: {
      quests: {
        q_fetch: {
          name: 'Busca la espada',
          giver: 'elder',
          objectives: [
            { type: 'collect', itemId: 'sword', count: 1 },
            { type: 'collect', itemId: 'nonexistent_item', count: 1 },
          ],
          rewards: { xp: 10, items: [{ itemId: 'shield', quantity: 1 }] },
        },
        q_badNpc: {
          name: 'Misión sin PNJ',
          giver: 'nonexistent_npc',
          objectives: [],
          rewards: { xp: 5 },
        },
        q_badSpell: {
          name: 'Misión con hechizo roto',
          giver: 'elder',
          objectives: [],
          rewards: { xp: 5, learnSpell: 'nonexistent_spell' },
        },
      },
    },
    rpgPets: {
      pets: {},
    },
    dataFishing: {
      rules: { castRange: 5, biteSeconds: { min: 2, max: 5 }, reactSeconds: 1, nibbleChance: 0.2, shoals: null },
      spots: {
        pond: {
          id: 'pond',
          name: 'Estanque',
          x: 0,
          y: 0,
          radius: 5,
          lootTable: 'wolf_loot',
          nightLootTable: null,
        },
        badPond: {
          id: 'badPond',
          name: 'Estanque roto',
          x: 10,
          y: 10,
          radius: 5,
          lootTable: 'nonexistent_loot',
          nightLootTable: null,
        },
      },
    },
    dataEnemies: {
      archetypes: {
        wolf: {
          maxHealth: 50,
          radius: 0.5,
          speed: 3,
          sightRange: 10,
          spells: [
            { name: 'Mordida', effect: 'damage', status: { id: 'burn' } },
            { name: 'Aullido', effect: 'damage', status: { id: 'nonexistent_status' } },
          ],
        },
      },
    },
    dataZones: {
      zones: [
        {
          id: 'forest',
          spawns: [
            { archetype: 'wolf', weight: 5 },
            { archetype: 'nonexistent_archetype', weight: 1 },
          ],
        },
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('D-45: contentCheck con datos sintéticos', () => {
  it('detecta referencias rotas en múltiples colecciones', () => {
    const problems = checkContent(getSyntheticData());

    // Agrupar por tipo de problema
    const details = problems.map((p) => `${p.file}:${p.id}:${p.detail}`);

    // set → item roto
    expect(details).toContainEqual(
      expect.stringContaining('rpg/sets.json:badSet:itemId "nonexistent_item" no encontrado'),
    );

    // spell → class roto
    expect(details).toContainEqual(
      expect.stringContaining('rpg/spells.json:badSpell:classId "nonexistent_class" no encontrado'),
    );

    // spell → status roto
    expect(details).toContainEqual(
      expect.stringContaining('rpg/spells.json:badSpell:statusId "nonexistent_status" no encontrado'),
    );

    // item → set roto
    expect(details).toContainEqual(
      expect.stringContaining('rpg/items.json:setItemBad:setId "nonexistent_set" no encontrado'),
    );

    // enemy → lootTable roto
    expect(details).toContainEqual(
      expect.stringContaining('rpg/enemies.json:badEnemy:lootTable "nonexistent_loot" no encontrado'),
    );

    // loot → item roto
    expect(details).toContainEqual(
      expect.stringContaining('rpg/loot.json:wolf_loot:itemId "nonexistent_item" no encontrado'),
    );

    // merchant → item roto
    expect(details).toContainEqual(
      expect.stringContaining('rpg/merchants.json:smith:itemId "nonexistent_item" no encontrado'),
    );

    // quest → npc roto
    expect(details).toContainEqual(
      expect.stringContaining('rpg/quests.json:q_badNpc:npcId "nonexistent_npc" no encontrado'),
    );

    // quest → item roto
    expect(details).toContainEqual(
      expect.stringContaining('rpg/quests.json:q_fetch:itemId "nonexistent_item" no encontrado'),
    );

    // quest → spell roto
    expect(details).toContainEqual(
      expect.stringContaining('rpg/quests.json:q_badSpell:learnSpell "nonexistent_spell" no encontrado'),
    );

    // npc → quest roto
    expect(details).toContainEqual(
      expect.stringContaining('rpg/npcs.json:badNpc:questId "nonexistent_quest" no encontrado'),
    );

    // npc → item roto
    expect(details).toContainEqual(
      expect.stringContaining('rpg/npcs.json:elder:itemId "nonexistent_item" no encontrado'),
    );

    // zone → archetype roto
    expect(details).toContainEqual(
      expect.stringContaining('zones.json:forest:archetype "nonexistent_archetype" no encontrado'),
    );

    // enemy archetype → status roto
    expect(details).toContainEqual(
      expect.stringContaining('enemies.json:wolf:statusId "nonexistent_status" no encontrado'),
    );

    // fishing → lootTable roto
    expect(details).toContainEqual(
      expect.stringContaining('rpg/fishing.json:(spots):lootTable "nonexistent_loot" no encontrado'),
    );

    // Contar problemas: al menos 15 referencias rotas
    expect(problems.length).toBeGreaterThanOrEqual(15);
  });

  it('checkContent devuelve array con datos limpios', () => {
    // Datos mínimos sin referencias rotas.
    const clean: SyntheticData = {
      rpgItems: { items: {} },
      rpgSets: { sets: {} },
      rpgSpells: { spells: {} },
      rpgStatuses: { statuses: {} },
      rpgClasses: { classes: {} },
      rpgEnemies: { enemies: {} },
      rpgLoot: { tables: {} },
      rpgMerchants: { merchants: {} },
      rpgNpcs: { npcs: {} },
      rpgQuests: { quests: {} },
      rpgPets: { pets: {} },
      dataFishing: { rules: {}, spots: {} },
      dataEnemies: { archetypes: {} },
      dataZones: { zones: [] },
    };
    const problems = checkContent(clean);
    expect(problems.length).toBe(0);
  });
});
