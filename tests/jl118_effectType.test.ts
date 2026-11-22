// JL-118: content:check falla con un tipo de efecto inexistente.
//
// El script contentCheck.ts valida que cada efecto de un hechizo
// use un tipo reconocido por el motor (parseEffect en content.ts).
// Si un hechizo declara { type: "efecto_falso" }, content:check
// debe reportarlo como problema.

import { describe, expect, it } from 'vitest';
import { checkContent, type SyntheticData } from '../scripts/contentCheck';

(globalThis as any).__CONTENT_CHECK_IMPORT_ONLY = true;

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

describe('JL-118: content:check valida tipos de efecto', () => {
  it('detecta un tipo de efecto inexistente en un hechizo', () => {
    const data = baseData();
    (data.rpgSpells.spells as Record<string, unknown>) = {
      fakeSpell: {
        name: 'Hechizo falso',
        classId: null,
        effects: [{ type: 'efecto_falso', min: 1, max: 5, element: 'fire' }],
      },
    };
    const problems = checkContent(data);
    const details = problems.map((p) => `${p.id}:${p.detail}`);
    expect(details).toContainEqual(
      expect.stringContaining('fakeSpell:tipo de efecto "efecto_falso" no reconocido'),
    );
  });

  it('detecta tipos inexistentes en sub-efectos de una trampa', () => {
    const data = baseData();
    (data.rpgSpells.spells as Record<string, unknown>) = {
      trapSpell: {
        name: 'Trampa con efecto malo',
        classId: null,
        effects: [
          {
            type: 'trap',
            radius: 2,
            duration: 10,
            effects: [{ type: 'damage', min: 1, max: 3, element: 'fire' }, { type: 'inexistente' }],
          },
        ],
      },
    };
    const problems = checkContent(data);
    const details = problems.map((p) => `${p.id}:${p.detail}`);
    expect(details).toContainEqual(
      expect.stringContaining('trapSpell:tipo de efecto "inexistente" no reconocido'),
    );
  });

  it('no reporta problema con tipos de efecto válidos', () => {
    const data = baseData();
    (data.rpgClasses.classes as Record<string, unknown>) = {
      warrior: { name: 'Guerrero' },
    };
    (data.rpgStatuses.statuses as Record<string, unknown>) = {
      burn: { name: 'Quemadura' },
    };
    (data.rpgSpells.spells as Record<string, unknown>) = {
      validSpell: {
        name: 'Hechizo válido',
        classId: 'warrior',
        effects: [
          { type: 'damage', min: 5, max: 10, element: 'fire' },
          { type: 'status', statusId: 'burn' },
          { type: 'knockback', distance: 3 },
          { type: 'chain', jumps: 2, radius: 5 },
          { type: 'selfStack', bonusPct: 25, maxStacks: 2, durationSec: 6 },
          { type: 'power', amount: 10, duration: 5 },
          { type: 'shield', amount: 50, duration: 3 },
          { type: 'dispel', kind: 'buff' },
          { type: 'shareDamage', pct: 30, duration: 4 },
        ],
      },
    };
    const problems = checkContent(data);
    // Puede haber problemas de referencia (statusId, classId) si no están,
    // pero no de tipo de efecto.
    const effectTypeProblems = problems.filter((p) => p.detail.includes('tipo de efecto'));
    expect(effectTypeProblems.length).toBe(0);
  });

  it('detecta varios tipos inexistentes en el mismo hechizo', () => {
    const data = baseData();
    (data.rpgSpells.spells as Record<string, unknown>) = {
      multiBad: {
        name: 'Varios malos',
        classId: null,
        effects: [
          { type: 'damage', min: 1, max: 2, element: 'fire' },
          { type: 'mega_blast' },
          { type: 'time_warp' },
        ],
      },
    };
    const problems = checkContent(data);
    const details = problems.map((p) => p.detail);
    expect(details).toContainEqual(expect.stringContaining('mega_blast'));
    expect(details).toContainEqual(expect.stringContaining('time_warp'));
    // El tipo válido 'damage' no debe aparecer como problema.
    const damageProblems = problems.filter((p) => p.detail.includes('damage'));
    expect(damageProblems.length).toBe(0);
  });
});
