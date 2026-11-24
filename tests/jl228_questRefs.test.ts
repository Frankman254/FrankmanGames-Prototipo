// JL-228: Cada misión cita PNJ, monstruos y objetos que existen.
//
// jl13_dataIntegrity ya valida giver, turnIn, objectives.itemId y rewards.
// Esta prueba cubre lo que jl13 no cubre:
//   - objectives.type "kill" → archetypes deben existir en enemies.json
//   - objectives.type "talk" → npcId debe existir en npcs.json
//   - objectives.type "fish" → itemIds (si hay) deben existir en items.json

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const DATA = join(import.meta.dirname, '..', 'data');

function readJson(rel: string): any {
  const path = join(DATA, rel);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

describe('JL-228: referencias de misiones a enemigos y PNJ', () => {
  it('kill objectives apuntan a archetypes existentes en enemies.json', () => {
    const quests = readJson('rpg/quests.json');
    const enemies = readJson('rpg/enemies.json');
    const enemyIds = new Set(
      Object.keys(enemies.enemies ?? {}).filter((k: string) => !k.startsWith('_')),
    );

    const problems: string[] = [];
    const questsMap = quests.quests ?? {};
    for (const [questId, quest] of Object.entries(questsMap)) {
      if (questId.startsWith('_')) continue;
      const objectives = (quest as any).objectives;
      if (!Array.isArray(objectives)) continue;
      for (const obj of objectives) {
        if ((obj as any).type === 'kill') {
          const archetypes = (obj as any).archetypes;
          if (Array.isArray(archetypes)) {
            for (const arch of archetypes) {
              if (typeof arch === 'string' && !enemyIds.has(arch)) {
                problems.push(`${questId}: kill archetype "${arch}" no encontrado en enemies.json`);
              }
            }
          }
        }
      }
    }
    expect(problems, `Kill objectives con archetype roto:\n${problems.join('\n')}`).toHaveLength(0);
  });

  it('talk objectives apuntan a npcId existente en npcs.json', () => {
    const quests = readJson('rpg/quests.json');
    const npcs = readJson('rpg/npcs.json');
    const npcIds = new Set(
      Object.keys(npcs.npcs ?? {}).filter((k: string) => !k.startsWith('_')),
    );

    const problems: string[] = [];
    const questsMap = quests.quests ?? {};
    for (const [questId, quest] of Object.entries(questsMap)) {
      if (questId.startsWith('_')) continue;
      const objectives = (quest as any).objectives;
      if (!Array.isArray(objectives)) continue;
      for (const obj of objectives) {
        if ((obj as any).type === 'talk') {
          const npcId = (obj as any).npcId;
          if (typeof npcId === 'string' && !npcIds.has(npcId)) {
            problems.push(`${questId}: talk npcId "${npcId}" no encontrado en npcs.json`);
          }
        }
      }
    }
    expect(problems, `Talk objectives con npcId roto:\n${problems.join('\n')}`).toHaveLength(0);
  });

  it('fish objectives con itemIds apuntan a items existentes', () => {
    const quests = readJson('rpg/quests.json');
    const items = readJson('rpg/items.json');
    const itemIds = new Set(
      Object.keys(items.items ?? {}).filter((k: string) => !k.startsWith('_')),
    );

    const problems: string[] = [];
    const questsMap = quests.quests ?? {};
    for (const [questId, quest] of Object.entries(questsMap)) {
      if (questId.startsWith('_')) continue;
      const objectives = (quest as any).objectives;
      if (!Array.isArray(objectives)) continue;
      for (const obj of objectives) {
        if ((obj as any).type === 'fish') {
          const itemIdsList = (obj as any).itemIds;
          if (Array.isArray(itemIdsList)) {
            for (const itemId of itemIdsList) {
              if (typeof itemId === 'string' && !itemIds.has(itemId)) {
                problems.push(`${questId}: fish itemId "${itemId}" no encontrado en items.json`);
              }
            }
          }
        }
      }
    }
    expect(problems, `Fish objectives con itemId roto:\n${problems.join('\n')}`).toHaveLength(0);
  });

  it('prueba sintética: kill con archetype inexistente falla', () => {
    // Verificar que la lógica detecta un archetype roto
    const fakeQuests = {
      quests: {
        q_test: {
          objectives: [
            { type: 'kill', archetypes: ['melee', 'nonexistent_enemy'], count: 1 },
          ],
        },
      },
    };
    const enemies = readJson('rpg/enemies.json');
    const enemyIds = new Set(
      Object.keys(enemies.enemies ?? {}).filter((k: string) => !k.startsWith('_')),
    );

    const problems: string[] = [];
    for (const [questId, quest] of Object.entries(fakeQuests.quests)) {
      if (questId.startsWith('_')) continue;
      const objectives = (quest as any).objectives;
      if (Array.isArray(objectives)) {
        for (const obj of objectives) {
          if ((obj as any).type === 'kill') {
            const archetypes = (obj as any).archetypes;
            if (Array.isArray(archetypes)) {
              for (const arch of archetypes) {
                if (typeof arch === 'string' && !enemyIds.has(arch)) {
                  problems.push(`${questId}: kill archetype "${arch}" no encontrado`);
                }
              }
            }
          }
        }
      }
    }
    expect(problems).toContainEqual(expect.stringContaining('nonexistent_enemy'));
  });
});
