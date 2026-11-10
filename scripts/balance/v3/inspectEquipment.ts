import { ELEMENTS } from '../../../src/rpg/contracts';
import { loadGameData } from '../../../src/data';
import { buildAcquisitionIndex } from './acquisition';
import { buildProfile, coverageBands, type BalanceProfile, type EquipmentTier } from './profiles';

const data = loadGameData();
const acquisition = buildAcquisitionIndex(data);
const levels = [...new Set(coverageBands(data).map((band) => band.level).filter((level) => level <= 100))];

function profile(classId: string, level: number, equipmentTier: EquipmentTier): BalanceProfile {
  return {
    id: `equipment-audit:${classId}:${level}:${equipmentTier}`,
    seed: level * 101 + classId.length,
    classId,
    level,
    build: 'balanced',
    equipmentTier,
    band: { id: `audit-${level}`, label: `Nivel ${level}`, level, zone: null, territory: 'hypothetical' },
  };
}

for (const classId of Object.keys(data.rpg.classes)) {
  console.log(`\n${classId}`);
  console.log('nivel\tequipo\tvida\tprimaria\tpotencia\tcrit\tresMedia\tpiezas');
  const main = data.rpg.classes[classId]!.mainStat ?? 'strength';
  for (const level of levels) {
    for (const tier of ['none', 'average-obtainable', 'optimized-obtainable'] as const) {
      const built = buildProfile(data, profile(classId, level, tier), acquisition);
      const stats = built.session.character.stats;
      const resist = [...ELEMENTS]
        .reduce((sum, element) => sum + stats.get(`resist.${element}` as never), 0) / 5;
      console.log([
        level,
        tier,
        built.session.character.maxHealth.toFixed(0),
        stats.get(main).toFixed(0),
        stats.get('power').toFixed(0),
        (stats.get('critChance') * 100).toFixed(1),
        resist.toFixed(1),
        built.equipment.length,
      ].join('\t'));
    }
  }
}
