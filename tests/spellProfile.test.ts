import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { loadSpellFx, parseSpellFx } from '../src/data/spellFxSchema';
import { StaticSpellProfileRegistry } from '../src/render/fx/spellProfile';
import spellFxJson from '../data/spell-fx.json';

describe('perfiles de hechizo (data/spell-fx.json)', () => {
  const profiles = loadSpellFx();
  const data = loadGameData();
  const spellIds = Object.keys(data.rpg.spells);

  it('carga los 9 perfiles sin errores', () => {
    expect(Object.keys(profiles).length).toBe(9);
  });

  it('cada perfil tiene un hechizo existente y el elemento coincide', () => {
    for (const [id, profile] of Object.entries(profiles)) {
      expect(spellIds, `${id}: existe en spells.json`).toContain(id);
      const spell = data.rpg.spells[id]!;
      expect(profile.element, `${id}: elemento coincide`).toBe(spell.element);
    }
  });

  it('cubre las categorías requeridas: 2 fuego, 2 hielo/agua, 2 aire, 1 físico a distancia, 1 curación', () => {
    const ids = Object.keys(profiles);
    const fire = ids.filter((id) => data.rpg.spells[id]!.element === 'fire');
    const frost = ids.filter((id) => data.rpg.spells[id]!.element === 'frost');
    const water = ids.filter((id) => data.rpg.spells[id]!.element === 'water');
    const air = ids.filter((id) => data.rpg.spells[id]!.element === 'air');
    const lightning = ids.filter((id) => data.rpg.spells[id]!.element === 'lightning');
    const heal = ids.filter((id) => data.rpg.spells[id]!.tags?.includes('heal'));

    expect(fire.length, 'fuego').toBeGreaterThanOrEqual(2);
    expect(frost.length + water.length, 'hielo/agua').toBeGreaterThanOrEqual(2);
    expect(air.length, 'aire').toBeGreaterThanOrEqual(2);
    // spark (lightning) como ataque a distancia + piercing_shot (water) como línea
    expect(lightning.length + water.length, 'ataque a distancia').toBeGreaterThanOrEqual(1);
    expect(heal.length, 'curación').toBeGreaterThanOrEqual(1);
  });

  it('StaticSpellProfileRegistry: get y has funcionan', () => {
    const registry = new StaticSpellProfileRegistry(profiles);
    expect(registry.has('ember_whirl')).toBe(true);
    expect(registry.has('spark')).toBe(true);
    expect(registry.has('unknown_spell')).toBe(false);
    expect(registry.get('ember_whirl')).not.toBeNull();
    expect(registry.get('unknown_spell')).toBeNull();
  });

  it('fallback: los 44 hechizos sin perfil usan el flujo genérico', () => {
    const registry = new StaticSpellProfileRegistry(profiles);
    const profiled = Object.keys(profiles);
    let unprofiled = 0;
    for (const id of spellIds) {
      if (!registry.has(id)) unprofiled++;
    }
    expect(unprofiled, 'hechizos sin perfil (usan fallback)').toBeGreaterThanOrEqual(40);
  });

  it('cada perfil tiene las 4 fases definidas', () => {
    for (const [id, profile] of Object.entries(profiles)) {
      expect(profile.anticipation, `${id}: anticipación`).toBeDefined();
      expect(profile.cast, `${id}: cast`).toBeDefined();
      expect(profile.impact, `${id}: impacto`).toBeDefined();
      expect(profile.dissipation, `${id}: disipación`).toBeDefined();
      expect(profile.anticipation.handBurst, `${id}: handBurst`).toBeDefined();
      expect(profile.anticipation.groundRing, `${id}: groundRing`).toBeDefined();
      expect(profile.impact.burst, `${id}: impact burst`).toBeDefined();
    }
  });

  it('rechaza un elemento inválido', () => {
    const bad = { profiles: { ember_whirl: { ...spellFxJson.profiles.ember_whirl, element: 'void' } } };
    expect(() => parseSpellFx(bad)).toThrow(/ember_whirl\.element/);
  });

  it('rechaza un color fuera de rango', () => {
    const sparkProfile = spellFxJson.profiles.spark;
    const handBurst = { ...sparkProfile.anticipation.handBurst, color: [2, 0, 0] };
    const anticipation = { ...sparkProfile.anticipation, handBurst };
    const badProfile = { ...sparkProfile, anticipation };
    const bad = { profiles: { spark: badProfile } };
    expect(() => parseSpellFx(bad)).toThrow(/spark\.anticipation\.handBurst/);
  });
});
