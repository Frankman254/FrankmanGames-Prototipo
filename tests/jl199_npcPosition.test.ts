// JL-199: content:check — cada NPC debe tener posición (x, y).
//
// Se usa SyntheticData para probar sin modificar data/rpg/npcs.json.

// Marcar ANTES del import para que contentCheck.ts no haga process.exit.
(globalThis as any).__CONTENT_CHECK_IMPORT_ONLY = true;

import { describe, expect, it } from 'vitest';
import { checkContent, type SyntheticData } from '../scripts/contentCheck';

/** Datos mínimos limpios, reutilizables. */
function baseData(): SyntheticData {
  return {
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
}

describe('JL-199: cada NPC debe tener posición', () => {
  it('detecta un NPC sin position', () => {
    const data = baseData();
    (data.rpgNpcs.npcs as Record<string, any>)['sinPos'] = {
      name: 'Sin Posición',
      dialogue: { entry: [{ node: 'h' }], nodes: { h: { text: 'Hola', options: [] } } },
    };

    const problems = checkContent(data);
    const details = problems.map((p) => `${p.id}:${p.detail}`);
    expect(details).toContainEqual(
      expect.stringContaining('sinPos:sin posición'),
    );
  });

  it('detecta un NPC con position vacía (objeto sin x/y)', () => {
    const data = baseData();
    (data.rpgNpcs.npcs as Record<string, any>)['posVacia'] = {
      name: 'Pos Vacía',
      position: {},
      dialogue: { entry: [{ node: 'h' }], nodes: { h: { text: 'Hola', options: [] } } },
    };

    const problems = checkContent(data);
    const details = problems.map((p) => `${p.id}:${p.detail}`);
    expect(details).toContainEqual(
      expect.stringContaining('posVacia:posición incompleta'),
    );
  });

  it('detecta un NPC con position.x ausente', () => {
    const data = baseData();
    (data.rpgNpcs.npcs as Record<string, any>)['soloY'] = {
      name: 'Solo Y',
      position: { y: 10 },
      dialogue: { entry: [{ node: 'h' }], nodes: { h: { text: 'Hola', options: [] } } },
    };

    const problems = checkContent(data);
    const details = problems.map((p) => `${p.id}:${p.detail}`);
    expect(details).toContainEqual(
      expect.stringContaining('soloY:posición incompleta'),
    );
  });

  it('detecta un NPC con position.x como string', () => {
    const data = baseData();
    (data.rpgNpcs.npcs as Record<string, any>)['strX'] = {
      name: 'String X',
      position: { x: 'cinco', y: 10 },
      dialogue: { entry: [{ node: 'h' }], nodes: { h: { text: 'Hola', options: [] } } },
    };

    const problems = checkContent(data);
    const details = problems.map((p) => `${p.id}:${p.detail}`);
    expect(details).toContainEqual(
      expect.stringContaining('strX:posición incompleta'),
    );
  });

  it('no reporta problema con position válida', () => {
    const data = baseData();
    (data.rpgNpcs.npcs as Record<string, any>)['valido'] = {
      name: 'Válido',
      position: { x: 100, y: 200 },
      dialogue: { entry: [{ node: 'h' }], nodes: { h: { text: 'Hola', options: [] } } },
    };

    const problems = checkContent(data);
    const npcProblems = problems.filter((p) => p.id === 'valido');
    expect(npcProblems.length).toBe(0);
  });

  it('no reporta problema con position con decimales', () => {
    const data = baseData();
    (data.rpgNpcs.npcs as Record<string, any>)['decimales'] = {
      name: 'Decimales',
      position: { x: 617.41, y: 232.61 },
      dialogue: { entry: [{ node: 'h' }], nodes: { h: { text: 'Hola', options: [] } } },
    };

    const problems = checkContent(data);
    const npcProblems = problems.filter((p) => p.id === 'decimales');
    expect(npcProblems.length).toBe(0);
  });

  it('no reporta problema con position negativa', () => {
    const data = baseData();
    (data.rpgNpcs.npcs as Record<string, any>)['negativo'] = {
      name: 'Negativo',
      position: { x: -50, y: -30 },
      dialogue: { entry: [{ node: 'h' }], nodes: { h: { text: 'Hola', options: [] } } },
    };

    const problems = checkContent(data);
    const npcProblems = problems.filter((p) => p.id === 'negativo');
    expect(npcProblems.length).toBe(0);
  });

  it('detecta múltiples NPCs sin posición en la misma ejecución', () => {
    const data = baseData();
    (data.rpgNpcs.npcs as Record<string, any>)['uno'] = {
      name: 'Uno',
      dialogue: { entry: [{ node: 'h' }], nodes: { h: { text: 'Hola', options: [] } } },
    };
    (data.rpgNpcs.npcs as Record<string, any>)['dos'] = {
      name: 'Dos',
      position: {},
      dialogue: { entry: [{ node: 'h' }], nodes: { h: { text: 'Hola', options: [] } } },
    };
    (data.rpgNpcs.npcs as Record<string, any>)['tres'] = {
      name: 'Tres',
      position: { x: 10 },
      dialogue: { entry: [{ node: 'h' }], nodes: { h: { text: 'Hola', options: [] } } },
    };

    const problems = checkContent(data);
    const details = problems.map((p) => `${p.id}:${p.detail}`);
    expect(details).toContainEqual(expect.stringContaining('uno:sin posición'));
    expect(details).toContainEqual(expect.stringContaining('dos:posición incompleta'));
    expect(details).toContainEqual(expect.stringContaining('tres:posición incompleta'));
  });
});
