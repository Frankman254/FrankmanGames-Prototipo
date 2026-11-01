// Auditoría P0 reproducible y de sólo lectura. No escribe ni altera datos.
// Desglosa dos hechizos representativos contra el mismo arquetipo a distintos
// niveles usando las clases, equipo, escalado y fórmulas reales del juego.
import { DamageEffect } from '../../src/rpg/effects';
import { xpToNext } from '../../src/rpg/progression';
import { effectiveResist } from '../../src/sim/damage';
import { levelDiffMultiplier } from '../../src/sim/zones';
import { World } from '../../src/sim/world';
import { buildData, FIELD_CENTER, openField, rawData } from './data';
import { makeSessionAt } from './scenarios';

const CASES = [
  { player: 1, enemy: 1 },
  { player: 5, enemy: 5 },
  { player: 10, enemy: 20 },
  { player: 20, enemy: 20 },
  { player: 20, enemy: 40 },
] as const;

const CLASSES = [
  { id: 'ember_vanguard', spell: 'charge' },
  { id: 'storm_weaver', spell: 'spark' },
] as const;

interface Stages {
  roll: number;
  main: number;
  afterScaling: number;
  elementStat: number;
  power: number;
  affinity: number;
  afterPercent: number;
  flat: number;
  beforeResist: number;
  resist: number;
  afterResist: number;
  levelMultiplier: number;
  final: number;
}

const data = openField(buildData(rawData()));
const rules = { elementStat: data.rpg.rules.elementStat, resistCap: data.rpg.progression.resistCap };

function stages(roll: number, scaling: number, element: keyof typeof rules.elementStat, playerLevel: number, enemyLevel: number, world: World, targetId: number): Stages {
  const ch = world.character;
  const target = world.enemyActor(world.enemies.get(targetId)!);
  const main = ch.mainStat ? ch.stats.get(ch.mainStat) : 0;
  const afterScaling = Math.floor(roll + scaling * main);
  const elementStat = ch.stats.get(rules.elementStat[element]);
  const power = ch.stats.get('power');
  const affinity = ch.affinity.includes(element) ? ch.affinityBonus : 0;
  const afterPercent = Math.floor(afterScaling * Math.max(0, 1 + (elementStat + power + affinity) / 100));
  const flat = ch.stats.get(`damage.${element}`);
  const beforeResist = Math.floor(afterPercent + flat);
  const resist = effectiveResist(target.stats, element, rules);
  const afterResist = Math.max(1, Math.floor(beforeResist * (1 - resist / 100)));
  const levelMultiplier = levelDiffMultiplier(playerLevel, enemyLevel, data.zones.levelDifference);
  const final = Math.max(1, Math.floor(afterResist * levelMultiplier));
  return { roll, main, afterScaling, elementStat, power, affinity, afterPercent, flat, beforeResist, resist, afterResist, levelMultiplier, final };
}

const rows = [];
for (const cls of CLASSES) {
  for (const levels of CASES) {
    const session = makeSessionAt(data, cls.id, levels.player, 1701, true);
    const world = new World(data, { encounter: false, character: session.character, seed: 1701 });
    session.attach(world);
    world.player.pos = { ...FIELD_CENTER };
    world.player.prevPos = { ...FIELD_CENTER };
    const enemy = world.spawnEnemy('melee', { x: FIELD_CENTER.x + 2, y: FIELD_CENTER.y }, levels.enemy);
    const spell = world.spell(cls.spell);
    const effect = spell.effects.find((e): e is DamageEffect => e instanceof DamageEffect)!;
    const lo = stages(effect.def.min * spell.power, effect.def.scaling ?? 0, effect.def.element, levels.player, levels.enemy, world, enemy.id);
    const hiRoll = effect.def.max * spell.power - (effect.def.max > effect.def.min ? 1e-9 : 0);
    const hi = stages(hiRoll, effect.def.scaling ?? 0, effect.def.element, levels.player, levels.enemy, world, enemy.id);
    const preview = world.previewDamage(cls.spell, enemy.id)!;
    if (preview.min !== lo.final || preview.max !== hi.final) throw new Error(`desglose divergente: ${cls.id} ${levels.player}/${levels.enemy}`);
    rows.push({
      classId: cls.id,
      className: session.character.classDef.name,
      spellId: cls.spell,
      spellName: spell.name,
      playerLevel: levels.player,
      enemy: data.rpg.enemies[enemy.def.id]!.name,
      enemyLevel: levels.enemy,
      enemyHealth: enemy.def.maxHealth,
      element: effect.def.element,
      normal: `${preview.min}-${preview.max}`,
      critical: `${preview.critMin}-${preview.critMax}`,
      critChance: preview.critChance,
      low: lo,
      high: hi,
    });
  }
}

const xpMilestones = [2, 5, 10, 15, 20].map((target) => {
  let total = 0;
  for (let level = 1; level < target; level++) total += xpToNext(data.rpg.progression, level);
  return { target, total, previous: xpToNext(data.rpg.progression, target - 1) };
});
const unlocks = CLASSES.map((cls) => ({
  classId: cls.id,
  levels: Object.values(data.rpg.spells)
    .filter((spell) => spell.classId === cls.id)
    .map((spell) => ({ id: spell.id, name: spell.name, level: spell.unlockLevel ?? 1 }))
    .sort((a, b) => a.level - b.level || a.id.localeCompare(b.id)),
}));
const resources = CLASSES.map((cls) => ({ classId: cls.id, ...data.rpg.classes[cls.id]!.resource }));

console.log(JSON.stringify({ cases: rows, progression: { maxLevel: data.rpg.progression.maxLevel, xpMilestones }, unlocks, resources, deathEnergy: data.rpg.energy.name }, null, 2));
