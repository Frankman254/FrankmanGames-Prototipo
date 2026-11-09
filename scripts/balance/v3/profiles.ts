import type { GameData } from '../../../src/data';
import type { LevelZoneDef } from '../../../src/data/zonesSchema';
import { Character } from '../../../src/rpg/character';
import { EQUIP_SLOTS, type EquipSlot, type ItemDef, type PrimaryStat, type StatId } from '../../../src/rpg/contracts';
import { slotsFor } from '../../../src/rpg/items';
import { xpToNext } from '../../../src/rpg/progression';
import { GameSession } from '../../../src/rpg/session';
import { Rng } from '../../../src/sim/rng';
import { buildAcquisitionIndex, obtainableSources, type AcquisitionIndex, type AcquisitionSource } from './acquisition';

export const PROFILE_BUILDS = ['offense', 'defense', 'balanced', 'specialized'] as const;
export type ProfileBuild = (typeof PROFILE_BUILDS)[number];
export const EQUIPMENT_TIERS = ['none', 'average-obtainable', 'optimized-obtainable'] as const;
export type EquipmentTier = (typeof EQUIPMENT_TIERS)[number];

export interface CoverageBand {
  id: string;
  label: string;
  level: number;
  zone: LevelZoneDef | null;
  territory: 'playable' | 'hypothetical';
}

export interface EquippedEvidence {
  slot: EquipSlot;
  itemId: string;
  source: AcquisitionSource;
}

export interface BalanceProfile {
  id: string;
  seed: number;
  classId: string;
  level: number;
  build: ProfileBuild;
  equipmentTier: EquipmentTier;
  band: CoverageBand;
}

export interface BuiltProfile {
  profile: BalanceProfile;
  session: GameSession;
  equipment: EquippedEvidence[];
}

function stableSeed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

export function coverageBands(data: GameData): CoverageBand[] {
  const zones = data.zones.zones.filter((z) => !z.safe);
  const out = zones.map((zone): CoverageBand => ({
    id: zone.id,
    label: `${zone.name} ${zone.levelMin}–${zone.levelMax}`,
    level: Math.min(data.rpg.progression.maxLevel, Math.floor((zone.levelMin + zone.levelMax) / 2)),
    zone,
    territory: zone.areas.length > 0 ? 'playable' : 'hypothetical',
  }));
  // El contrato técnico llega a 200, pero no hay territorio 101–200.
  for (const level of [100, 150, 200]) {
    if (!out.some((b) => b.level === level)) out.push({ id: `future-${level}`, label: `Sin territorio documentado · nivel ${level}`, level, zone: null, territory: 'hypothetical' });
  }
  return out;
}

export function generateProfiles(data: GameData): BalanceProfile[] {
  const out: BalanceProfile[] = [];
  for (const band of coverageBands(data)) {
    for (const classId of Object.keys(data.rpg.classes)) {
      for (const build of PROFILE_BUILDS) {
        for (const equipmentTier of EQUIPMENT_TIERS) {
          const id = `${band.id}:${classId}:${build}:${equipmentTier}`;
          out.push({ id, seed: stableSeed(id), classId, level: band.level, build, equipmentTier, band });
        }
      }
    }
  }
  return out;
}

function pointPlan(main: PrimaryStat, build: ProfileBuild): PrimaryStat[] {
  if (build === 'offense') return [main];
  if (build === 'defense') return ['vitality'];
  if (build === 'balanced') return [main, 'vitality', 'spirit'];
  const alt: PrimaryStat = main === 'strength' ? 'agility' : main === 'agility' ? 'strength' : 'spirit';
  return [main, alt];
}

function equipWeights(main: PrimaryStat, build: ProfileBuild): Partial<Record<StatId, number>> {
  const w: Partial<Record<StatId, number>> = {
    [main]: build === 'defense' ? 0.25 : 1,
    vitality: build === 'offense' ? 0.2 : 1,
    spirit: build === 'specialized' ? 0.8 : 0.25,
    maxHealth: build === 'defense' ? 0.3 : 0.08,
    healthRegen: build === 'defense' ? 4 : 1,
    maxResource: build === 'specialized' ? 0.2 : 0.04,
    resourceRegen: build === 'specialized' ? 1.5 : 0.4,
    power: build === 'defense' ? 0.2 : 1,
    critChance: build === 'offense' ? 100 : 35,
    critBonus: build === 'offense' ? 20 : 5,
    moveSpeed: 0.5,
    cooldownReduction: build === 'specialized' ? 80 : 30,
    carryCapacity: build === 'balanced' ? 0.03 : 0.01,
  };
  for (const stat of ['resist.physical', 'resist.fire', 'resist.frost', 'resist.storm', 'resist.earth'] as StatId[]) w[stat] = build === 'defense' ? 2 : 0.35;
  for (const stat of ['damage.physical', 'damage.fire', 'damage.frost', 'damage.storm', 'damage.earth'] as StatId[]) w[stat] = build === 'offense' ? 2 : 0.75;
  return w;
}

function itemScore(item: ItemDef, weights: Partial<Record<StatId, number>>): number {
  let score = item.weapon ? ((item.weapon.min + item.weapon.max) / 2) * item.weapon.speed : 0;
  for (const m of item.implicit) score += (weights[m.stat] ?? 0) * (m.op === 'percent' ? m.value / 100 : m.value);
  for (const r of item.rolls) score += (weights[r.stat] ?? 0) * ((r.min + r.max) / 2) * (r.op === 'percent' ? 0.01 : 1);
  return score;
}

function chooseEquipment(data: GameData, index: AcquisitionIndex, profile: BalanceProfile): { slot: EquipSlot; item: ItemDef; source: AcquisitionSource }[] {
  if (profile.equipmentTier === 'none') return [];
  const cls = data.rpg.classes[profile.classId]!;
  const weights = equipWeights(cls.mainStat ?? 'strength', profile.build);
  const candidates = Object.values(data.rpg.items)
    .map((item) => ({ item, source: obtainableSources(index, item, profile.classId, profile.level)[0] }))
    .filter((x): x is { item: ItemDef; source: AcquisitionSource } => !!x.source && slotsFor(x.item).length > 0);
  const chosen: { slot: EquipSlot; item: ItemDef; source: AcquisitionSource }[] = [];
  for (const slot of EQUIP_SLOTS) {
    const options = candidates.filter((c) => slotsFor(c.item).includes(slot)).sort((a, b) => itemScore(a.item, weights) - itemScore(b.item, weights));
    if (!options.length) continue;
    const pick = profile.equipmentTier === 'optimized-obtainable' ? options[options.length - 1]! : options[Math.floor((options.length - 1) / 2)]!;
    chosen.push({ slot, ...pick });
  }
  return chosen;
}

export function buildProfile(data: GameData, profile: BalanceProfile, index = buildAcquisitionIndex(data)): BuiltProfile {
  const rng = new Rng(profile.seed);
  const ch = Character.create(data.rpg, profile.classId, `QA ${profile.id}`, rng);
  for (const slot of EQUIP_SLOTS) if (ch.equipment.get(slot)) ch.unequip(slot);
  let xp = 0;
  for (let level = 1; level < profile.level; level++) xp += xpToNext(data.rpg.progression, level);
  ch.gainXp(xp);
  const cls = data.rpg.classes[profile.classId]!;
  const plan = pointPlan(cls.mainStat ?? 'strength', profile.build);
  let i = 0;
  let misses = 0;
  while (ch.unspentStatPoints > 0 && misses < plan.length) {
    const result = ch.spendStatPoint(plan[i++ % plan.length]!);
    misses = result.ok ? 0 : misses + 1;
  }

  const evidence: EquippedEvidence[] = [];
  for (const selected of chooseEquipment(data, index, profile)) {
    let inst = ch.inventory.slots.find((x) => x?.itemId === selected.item.id && !Object.values(ch.equipment.slots).some((e) => e?.uid === x.uid));
    if (!inst) {
      ch.give(selected.item.id);
      inst = ch.inventory.slots.find((x) => x?.itemId === selected.item.id && !Object.values(ch.equipment.slots).some((e) => e?.uid === x.uid));
    }
    if (inst && ch.equip(inst.uid, selected.slot).ok) evidence.push({ slot: selected.slot, itemId: selected.item.id, source: selected.source });
  }
  ch.restore();
  return { profile, session: new GameSession(data.rpg, ch, rng), equipment: evidence };
}

export function profileCoverage(data: GameData, profiles = generateProfiles(data)): { total: number; playable: number; hypothetical: number; byClass: Record<string, number>; byLevel: Record<number, number> } {
  const byClass: Record<string, number> = {};
  const byLevel: Record<number, number> = {};
  for (const p of profiles) {
    byClass[p.classId] = (byClass[p.classId] ?? 0) + 1;
    byLevel[p.level] = (byLevel[p.level] ?? 0) + 1;
  }
  return { total: profiles.length, playable: profiles.filter((p) => p.band.territory === 'playable').length, hypothetical: profiles.filter((p) => p.band.territory === 'hypothetical').length, byClass, byLevel };
}
