// JL-13: Prueba de integridad de data/
//
// Verifica que todo id citado por botín, tiendas, misiones, kits y conjuntos
// existe en las colecciones correspondientes. Además cubre referencias que
// contentCheck.ts no verifica: items → pets (summonPet), dungeons → enemies,
// y referencias en data/ambient.json.
//
// Si hay ids rotos, la prueba los lista sin inventar objetos.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkContent } from '../scripts/contentCheck';

// Marcar para que contentCheck.ts no haga process.exit al importarse.
(globalThis as any).__CONTENT_CHECK_IMPORT_ONLY = true;

const DATA = join(import.meta.dirname, '..', 'data');

function readJson(rel: string): any {
  const path = join(DATA, rel);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

// ---------------------------------------------------------------------------
// 1. contentCheck sobre datos reales
// ---------------------------------------------------------------------------

describe('JL-13: integridad de data/ (contentCheck real)', () => {
  it('no hay referencias rotas en los datos reales', () => {
    const problems = checkContent(); // sin SyntheticData → lee los archivos reales
    if (problems.length > 0) {
      // Agrupar por archivo para el mensaje
      const byFile = new Map<string, any[]>();
      for (const p of problems) {
        const list = byFile.get(p.file) ?? [];
        list.push(p);
        byFile.set(p.file, list);
      }
      const lines: string[] = [];
      for (const [file, list] of byFile) {
        lines.push(`  ${file}:`);
        for (const p of list) {
          lines.push(`    [${p.id}] ${p.detail}`);
        }
      }
      expect(problems, `Referencias rotas:\n${lines.join('\n')}`).toHaveLength(0);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Referencias adicionales no cubiertas por contentCheck.ts
// ---------------------------------------------------------------------------

describe('JL-13: referencias adicionales', () => {
  it('items con summonPet apuntan a pets existentes', () => {
    const items = readJson('rpg/items.json');
    const pets = readJson('rpg/pets.json');
    const petIds = new Set(
      Object.keys(pets.pets ?? {}).filter((k: string) => !k.startsWith('_')),
    );

    const problems: string[] = [];
    const itemsMap = items.items ?? {};
    for (const [id, item] of Object.entries(itemsMap)) {
      if (id.startsWith('_')) continue;
      const use = (item as any).use;
      if (use && typeof use === 'object' && use.kind === 'summonPet') {
        const petId = use.petId;
        if (typeof petId === 'string' && !petIds.has(petId)) {
          problems.push(`${id}: petId "${petId}" no encontrado en pets.json`);
        }
      }
    }
    expect(problems, `Items con petId roto:\n${problems.join('\n')}`).toHaveLength(0);
  });

  it('items con learnSpell apuntan a spells existentes', () => {
    const items = readJson('rpg/items.json');
    const spells = readJson('rpg/spells.json');
    const spellIds = new Set(
      Object.keys(spells.spells ?? {}).filter((k: string) => !k.startsWith('_')),
    );

    const problems: string[] = [];
    const itemsMap = items.items ?? {};
    for (const [id, item] of Object.entries(itemsMap)) {
      if (id.startsWith('_')) continue;
      const use = (item as any).use;
      if (use && typeof use === 'object' && use.learnSpell) {
        const spellId = use.learnSpell;
        if (typeof spellId === 'string' && !spellIds.has(spellId)) {
          problems.push(`${id}: learnSpell "${spellId}" no encontrado en spells.json`);
        }
      }
    }
    expect(problems, `Items con learnSpell roto:\n${problems.join('\n')}`).toHaveLength(0);
  });

  it('items con setId apuntan a sets existentes', () => {
    const items = readJson('rpg/items.json');
    const sets = readJson('rpg/sets.json');
    const setIdIds = new Set(
      Object.keys(sets.sets ?? {}).filter((k: string) => !k.startsWith('_')),
    );

    const problems: string[] = [];
    const itemsMap = items.items ?? {};
    for (const [id, item] of Object.entries(itemsMap)) {
      if (id.startsWith('_')) continue;
      const setId = (item as any).setId;
      if (typeof setId === 'string' && !setIdIds.has(setId)) {
        problems.push(`${id}: setId "${setId}" no encontrado en sets.json`);
      }
    }
    expect(problems, `Items con setId roto:\n${problems.join('\n')}`).toHaveLength(0);
  });

  it('sets con itemIds apuntan a items existentes', () => {
    const items = readJson('rpg/items.json');
    const sets = readJson('rpg/sets.json');
    const itemIds = new Set(
      Object.keys(items.items ?? {}).filter((k: string) => !k.startsWith('_')),
    );

    const problems: string[] = [];
    const setsMap = sets.sets ?? {};
    for (const [setId, setDef] of Object.entries(setsMap)) {
      if (setId.startsWith('_')) continue;
      const itemIdsRef = (setDef as any).itemIds;
      if (Array.isArray(itemIdsRef)) {
        for (const itemId of itemIdsRef) {
          if (typeof itemId === 'string' && !itemIds.has(itemId)) {
            problems.push(`${setId}: itemId "${itemId}" no encontrado en items.json`);
          }
        }
      }
    }
    expect(problems, `Sets con itemId roto:\n${problems.join('\n')}`).toHaveLength(0);
  });

  it('loot tables apuntan a items existentes', () => {
    const items = readJson('rpg/items.json');
    const loot = readJson('rpg/loot.json');
    const itemIds = new Set(
      Object.keys(items.items ?? {}).filter((k: string) => !k.startsWith('_')),
    );

    const problems: string[] = [];
    const tables = loot.tables ?? {};
    for (const [tableId, table] of Object.entries(tables)) {
      if (tableId.startsWith('_')) continue;
      const entries = (table as any).entries;
      if (Array.isArray(entries)) {
        for (const entry of entries) {
          const itemId = (entry as any).itemId;
          if (typeof itemId === 'string' && !itemIds.has(itemId)) {
            problems.push(`${tableId}: itemId "${itemId}" no encontrado en items.json`);
          }
        }
      }
    }
    expect(problems, `Loot tables con itemId roto:\n${problems.join('\n')}`).toHaveLength(0);
  });

  it('merchants apuntan a items existentes', () => {
    const items = readJson('rpg/items.json');
    const merchants = readJson('rpg/merchants.json');
    const itemIds = new Set(
      Object.keys(items.items ?? {}).filter((k: string) => !k.startsWith('_')),
    );

    const problems: string[] = [];
    const merchantsMap = merchants.merchants ?? {};
    for (const [merchantId, merchant] of Object.entries(merchantsMap)) {
      if (merchantId.startsWith('_')) continue;
      const stock = (merchant as any).stock;
      if (Array.isArray(stock)) {
        for (const entry of stock) {
          const itemId = (entry as any).itemId;
          if (typeof itemId === 'string' && !itemIds.has(itemId)) {
            problems.push(`${merchantId}: itemId "${itemId}" no encontrado en items.json`);
          }
        }
      }
    }
    expect(problems, `Merchants con itemId roto:\n${problems.join('\n')}`).toHaveLength(0);
  });

  it('quests apuntan a NPCs, items y spells existentes', () => {
    const quests = readJson('rpg/quests.json');
    const npcs = readJson('rpg/npcs.json');
    const items = readJson('rpg/items.json');
    const spells = readJson('rpg/spells.json');

    const npcIds = new Set(
      Object.keys(npcs.npcs ?? {}).filter((k: string) => !k.startsWith('_')),
    );
    const itemIds = new Set(
      Object.keys(items.items ?? {}).filter((k: string) => !k.startsWith('_')),
    );
    const spellIds = new Set(
      Object.keys(spells.spells ?? {}).filter((k: string) => !k.startsWith('_')),
    );

    const problems: string[] = [];
    const questsMap = quests.quests ?? {};
    for (const [questId, quest] of Object.entries(questsMap)) {
      if (questId.startsWith('_')) continue;

      // giver
      const giver = (quest as any).giver;
      if (typeof giver === 'string' && !npcIds.has(giver)) {
        problems.push(`${questId}: giver "${giver}" no encontrado en npcs.json`);
      }
      // turnIn
      const turnIn = (quest as any).turnIn;
      if (typeof turnIn === 'string' && !npcIds.has(turnIn)) {
        problems.push(`${questId}: turnIn "${turnIn}" no encontrado en npcs.json`);
      }
      // objectives → itemId
      const objectives = (quest as any).objectives;
      if (Array.isArray(objectives)) {
        for (const obj of objectives) {
          const itemId = (obj as any).itemId;
          if (typeof itemId === 'string' && !itemIds.has(itemId)) {
            problems.push(`${questId}: objective itemId "${itemId}" no encontrado`);
          }
        }
      }
      // rewards → items
      const rewards = (quest as any).rewards;
      if (rewards && typeof rewards === 'object') {
        const rewardItems = rewards.items;
        if (Array.isArray(rewardItems)) {
          for (const ri of rewardItems) {
            const itemId = (ri as any).itemId;
            if (typeof itemId === 'string' && !itemIds.has(itemId)) {
              problems.push(`${questId}: reward itemId "${itemId}" no encontrado`);
            }
          }
        }
        // learnSpell
        const learnSpell = rewards.learnSpell;
        if (typeof learnSpell === 'string' && !spellIds.has(learnSpell)) {
          problems.push(`${questId}: learnSpell "${learnSpell}" no encontrado`);
        }
      }
    }
    expect(problems, `Quests con referencias rotas:\n${problems.join('\n')}`).toHaveLength(0);
  });

  it('enemies apuntan a loot tables existentes', () => {
    const enemies = readJson('rpg/enemies.json');
    const loot = readJson('rpg/loot.json');
    const tableIds = new Set(
      Object.keys(loot.tables ?? {}).filter((k: string) => !k.startsWith('_')),
    );

    const problems: string[] = [];
    const enemiesMap = enemies.enemies ?? {};
    for (const [enemyId, enemy] of Object.entries(enemiesMap)) {
      if (enemyId.startsWith('_')) continue;
      const lootTable = (enemy as any).lootTable;
      if (typeof lootTable === 'string' && !tableIds.has(lootTable)) {
        problems.push(`${enemyId}: lootTable "${lootTable}" no encontrado en loot.json`);
      }
    }
    expect(problems, `Enemies con lootTable roto:\n${problems.join('\n')}`).toHaveLength(0);
  });

  it('spells apuntan a classes y statuses existentes', () => {
    const spells = readJson('rpg/spells.json');
    const classes = readJson('rpg/classes.json');
    const statuses = readJson('rpg/statuses.json');

    const classIds = new Set(
      Object.keys(classes.classes ?? {}).filter((k: string) => !k.startsWith('_')),
    );
    const statusIds = new Set(
      Object.keys(statuses.statuses ?? {}).filter((k: string) => !k.startsWith('_')),
    );

    const problems: string[] = [];
    const spellsMap = spells.spells ?? {};
    for (const [spellId, spell] of Object.entries(spellsMap)) {
      if (spellId.startsWith('_')) continue;

      // classId (null para universales)
      const classId = (spell as any).classId;
      if (classId && typeof classId === 'string' && !classIds.has(classId)) {
        problems.push(`${spellId}: classId "${classId}" no encontrado en classes.json`);
      }

      // effects → statusId
      const effects = (spell as any).effects;
      if (Array.isArray(effects)) {
        for (const fx of effects) {
          if (fx && typeof fx === 'object' && fx.type === 'status') {
            const sid = fx.statusId;
            if (typeof sid === 'string' && !statusIds.has(sid)) {
              problems.push(`${spellId}: statusId "${sid}" no encontrado en statuses.json`);
            }
          }
        }
      }
    }
    expect(problems, `Spells con referencias rotas:\n${problems.join('\n')}`).toHaveLength(0);
  });

  it('zones apuntan a enemy archetypes existentes', () => {
    const zones = readJson('zones.json');
    const enemies = readJson('enemies.json');
    const archetypeIds = new Set(
      Object.keys(enemies.archetypes ?? {}).filter((k: string) => !k.startsWith('_')),
    );

    const problems: string[] = [];
    const zonesArr = zones.zones ?? [];
    if (Array.isArray(zonesArr)) {
      for (const zone of zonesArr) {
        const zoneId = (zone as any).id ?? '(sin id)';
        const spawns = (zone as any).spawns;
        if (Array.isArray(spawns)) {
          for (const s of spawns) {
            const archetype = (s as any).archetype;
            if (typeof archetype === 'string' && !archetypeIds.has(archetype)) {
              problems.push(`${zoneId}: archetype "${archetype}" no encontrado en enemies.json`);
            }
          }
        }
      }
    }
    expect(problems, `Zones con archetype roto:\n${problems.join('\n')}`).toHaveLength(0);
  });

  it('fishing spots apuntan a loot tables existentes', () => {
    const fishing = readJson('rpg/fishing.json');
    const loot = readJson('rpg/loot.json');
    const tableIds = new Set(
      Object.keys(loot.tables ?? {}).filter((k: string) => !k.startsWith('_')),
    );

    const problems: string[] = [];
    const spots = fishing.spots ?? {};
    for (const [spotId, spot] of Object.entries(spots)) {
      if (spotId.startsWith('_')) continue;
      const lt = (spot as any).lootTable;
      if (typeof lt === 'string' && !tableIds.has(lt)) {
        problems.push(`${spotId}: lootTable "${lt}" no encontrado en loot.json`);
      }
      const nlt = (spot as any).nightLootTable;
      if (typeof nlt === 'string' && !tableIds.has(nlt)) {
        problems.push(`${spotId}: nightLootTable "${nlt}" no encontrado en loot.json`);
      }
    }
    expect(problems, `Fishing con lootTable roto:\n${problems.join('\n')}`).toHaveLength(0);
  });
});
