import { describe, expect, it } from 'vitest';
import { loadGameData } from '../../src/data';
import { ELEMENTS } from '../../src/rpg/contracts';
import { previewHit } from '../../src/sim/damage';
import { buildAcquisitionIndex } from '../../scripts/balance/v3/acquisition';
import { buildProfile, coverageBands, generateProfiles } from '../../scripts/balance/v3/profiles';

const data = loadGameData();

describe('balance productivo v2', () => {
  it('las tres clases disponen de daño de los cinco elementos al nivel 20', () => {
    for (const cls of Object.values(data.rpg.classes)) {
      const elements = new Set(Object.values(data.rpg.spells)
        .filter((spell) => spell.classId === cls.id && (spell.unlockLevel ?? 1) <= 20)
        .flatMap((spell) => spell.effects.filter((effect) => effect.type === 'damage').map((effect) => effect.element)));
      expect([...elements].sort(), cls.id).toEqual([...ELEMENTS].sort());
    }
  });

  it('el ataque representativo de nivel 10 queda en una banda común', () => {
    const averages: number[] = [];
    const zone = data.zones.zones.find((z) => z.id === 'azuero')!;
    for (const cls of Object.values(data.rpg.classes)) {
      const profile = { id: `v2:${cls.id}`, seed: 10, classId: cls.id, level: 10, build: 'offense' as const, equipmentTier: 'none' as const,
        band: { id: 'v2', label: 'v2', level: 10, zone, territory: 'playable' as const } };
      const ch = buildProfile(data, profile).session.character;
      const spell = Object.values(data.rpg.spells).find((s) => s.classId === cls.id && s.effects.some((e) => e.type === 'damage'))!;
      const effect = spell.effects.find((e) => e.type === 'damage')!;
      const result = previewHit({ min: effect.min, max: effect.max, element: effect.element, scaling: effect.scaling ?? 0,
        critChance: spell.critChance, critBonus: spell.critBonus }, ch, null,
      { elementStat: data.rpg.rules.elementStat, resistCap: data.rpg.progression.resistCap });
      averages.push((result.min + result.max) / 2);
    }
    expect(Math.max(...averages) / Math.min(...averages)).toBeLessThanOrEqual(1.2);
  });

  it('los objetos cubren capacidad, acción, movilidad y las cinco primarias', () => {
    const stats = new Set(Object.values(data.rpg.items).flatMap((item) => [
      ...item.implicit.map((m) => m.stat),
      ...item.rolls.map((m) => m.stat),
    ]));
    for (const stat of ['strength', 'agility', 'intellect', 'vitality', 'spirit', 'carryCapacity', 'maxResource', 'resourceRegen', 'cooldownReduction', 'moveSpeed']) {
      expect(stats.has(stat as never), stat).toBe(true);
    }
    const capacityLevels = Object.values(data.rpg.items)
      .filter((item) => [...item.implicit, ...item.rolls].some((m) => m.stat === 'carryCapacity'))
      .map((item) => item.level);
    expect(Math.min(...capacityLevels)).toBeLessThanOrEqual(3);
    expect(Math.max(...capacityLevels)).toBeGreaterThanOrEqual(80);
  });

  it('crea una partida jugable por clase para cada franja de nivel', () => {
    const bands = coverageBands(data);
    const profiles = generateProfiles(data).filter((profile) =>
      profile.build === 'balanced' && profile.equipmentTier === 'optimized-obtainable');
    expect(profiles).toHaveLength(bands.length * Object.keys(data.rpg.classes).length);
    expect(new Set(profiles.map((profile) => profile.band.id))).toEqual(new Set(bands.map((band) => band.id)));

    const acquisition = buildAcquisitionIndex(data);
    for (const profile of profiles) {
      const built = buildProfile(data, profile, acquisition);
      const save = built.session.save();
      expect(save.version, profile.id).toBe(2);
      expect(save.level, profile.id).toBe(profile.level);
      expect(save.classId, profile.id).toBe(profile.classId);
      expect(built.equipment.length, profile.id).toBeGreaterThan(0);
    }
  });
});
