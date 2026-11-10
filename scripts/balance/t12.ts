// Auditoría reproducible de T12: cercanía de nivel en combate y oficios.
// No juega ni guarda partidas; usa exclusivamente el contenido cargado.
import { loadGameData } from '../../src/data';
import { rewardProximityMultiplier, rewardXp, xpToNext } from '../../src/rpg/progression';
import { professionXpToNext, type RecipeDef, type GatherNodeDef } from '../../src/rpg/professions';
import { Rng } from '../../src/sim/rng';

const SEEDS = 32;
const LEVELS = [1, 5, 10, 20, 40, 60, 80, 100] as const;
const BANDS = { atrasado: 0.5, equivalente: 1, superior: 1.75 } as const;

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

function percentile(values: readonly number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))]!;
}

export interface T12Audit {
  seeds: number;
  combat: Array<{ level: number; band: keyof typeof BANDS; xp: { p10: number; p50: number; p90: number }; groupsToNext: number }>;
  professions: Array<{ level: number; contentLevel: number; xpPerAction: number; actionsToNext: number }>;
  contentCeilings: { gathering: number; crafting: number };
  gates: { orderedBands: boolean; superiorBelowDouble: boolean; noEquivalentLevelSkip: boolean; slowFromLevel10: boolean; reproducible: boolean };
}

function nearestEnemy<T extends { level: number }>(all: readonly T[], wanted: number, rng: Rng): T {
  const candidates = [...all].sort((a, b) => Math.abs(a.level - wanted) - Math.abs(b.level - wanted)).slice(0, Math.min(5, all.length));
  return candidates[rng.int(0, candidates.length - 1)]!;
}

function combatSamples(seedOffset = 0): T12Audit['combat'] {
  const data = loadGameData();
  const enemies = Object.values(data.rpg.enemies);
  const rows: T12Audit['combat'] = [];
  for (const level of LEVELS) {
    const zone = data.zones.zones.filter((z) => !z.safe).sort((a, b) => Math.abs((a.levelMin + a.levelMax) / 2 - level) - Math.abs((b.levelMin + b.levelMax) / 2 - level))[0]!;
    for (const [band, ratio] of Object.entries(BANDS) as Array<[keyof typeof BANDS, number]>) {
      const samples: number[] = [];
      for (let seed = 1; seed <= SEEDS; seed++) {
        const rng = new Rng(seed + seedOffset + level * 101 + Math.round(ratio * 1000));
        const size = rng.int(zone.group.min, zone.group.max);
        const wantedTotal = Math.max(1, Math.round(level * ratio * (0.9 + rng.next() * 0.2)));
        const picked = Array.from({ length: size }, () => nearestEnemy(enemies, wantedTotal / size, rng));
        const groupLevel = picked.reduce((sum, enemy) => sum + enemy.level, 0);
        samples.push(picked.reduce((sum, enemy) => sum + rewardXp(enemy.xp, level, groupLevel, data.rpg.progression.rewardProximity), 0));
      }
      const p50 = median(samples);
      rows.push({ level, band, xp: { p10: percentile(samples, 0.1), p50, p90: percentile(samples, 0.9) }, groupsToNext: Math.ceil(xpToNext(data.rpg.progression, level) / p50) });
    }
  }
  return rows;
}

function professionRows(): { rows: T12Audit['professions']; gathering: number; crafting: number } {
  const data = loadGameData();
  const nodes = Object.values(data.rpg.professions.nodes);
  const recipes = Object.values(data.rpg.professions.recipes);
  const content = [...nodes, ...recipes] as Array<GatherNodeDef | RecipeDef>;
  const rows: T12Audit['professions'] = [];
  for (let level = 1; level <= data.rpg.professions.rules.maxLevel; level++) {
    const unlocked = content.filter((entry) => entry.level <= level).sort((a, b) => b.level - a.level || b.xp - a.xp);
    const best = unlocked[0]!;
    const xp = rewardXp(best.xp, level, best.level, data.rpg.progression.rewardProximity);
    rows.push({ level, contentLevel: best.level, xpPerAction: xp, actionsToNext: Math.ceil(professionXpToNext(data.rpg.professions.rules, level) / xp) });
  }
  return {
    rows,
    gathering: Math.max(...nodes.map((node) => node.level)),
    crafting: Math.max(...recipes.map((recipe) => recipe.level)),
  };
}

export function runT12Audit(): T12Audit {
  const combat = combatSamples();
  const repeat = combatSamples();
  const professions = professionRows();
  const byLevel = (level: number, band: keyof typeof BANDS) => combat.find((row) => row.level === level && row.band === band)!;
  return {
    seeds: SEEDS,
    combat,
    professions: professions.rows,
    contentCeilings: { gathering: professions.gathering, crafting: professions.crafting },
    gates: {
      orderedBands: LEVELS.filter((level) => level > 1).every((level) => {
        const r = loadGameData().rpg.progression.rewardProximity;
        return rewardProximityMultiplier(r, level, level * 0.5) < 1 && rewardProximityMultiplier(r, level, level * 1.75) > 1;
      }),
      superiorBelowDouble: LEVELS.every((level) => rewardProximityMultiplier(loadGameData().rpg.progression.rewardProximity, level, level * 100) < 2),
      noEquivalentLevelSkip: LEVELS.every((level) => {
        const progression = loadGameData().rpg.progression;
        return byLevel(level, 'equivalente').xp.p90 < xpToNext(progression, level) + xpToNext(progression, level + 1);
      }),
      slowFromLevel10: LEVELS.filter((level) => level >= 10).every((level) => byLevel(level, 'equivalente').groupsToNext >= 3),
      reproducible: JSON.stringify(combat) === JSON.stringify(repeat),
    },
  };
}

