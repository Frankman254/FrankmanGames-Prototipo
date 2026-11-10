/// <reference types="node" />
// `npm run balance:t01`: mide los dos objetivos de duración del creador (H04) con varias
// semillas por combinación. Es simulación con bot: no certifica la sensación humana.
//   A. Nivel 1 sin equipo contra un monstruo de nivel 1: 30 s o menos.
//   B. Jefes tardíos: aproximadamente 5–15 min según mecánicas y sostén.
//   npm run balance:t01 -- --seeds 12 --json work/balance/T01.json [--solo inicio|tardio]
import type { GameData } from '../../src/data';
import type { LevelZoneDef } from '../../src/data/zonesSchema';
import { buildData, rawData } from './data';
import { makeSessionAt, type SkillId } from './scenarios';
import { buildAcquisitionIndex } from './v3/acquisition';
import { buildProfile, type EquipmentTier } from './v3/profiles';
import { runZoneWithSession, type ZoneRun } from './zones';

export const START_TARGET_SECONDS = 30;
export const BOSS_TARGET_SECONDS = { min: 300, max: 900 } as const;

export interface DurationRow {
  label: string;
  n: number;
  winRate: number;
  deathRate: number;
  /** Segundos de las victorias: mediana, percentil 90 y máximo (NaN sin victorias). */
  median: number;
  p90: number;
  max: number;
  /** Mediana del golpe más fuerte recibido / vida máxima. */
  maxHit: number;
  /** Mediana del daño por segundo hecho en las victorias (NaN sin victorias). */
  dps: number;
}

const quantile = (xs: number[], q: number): number => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))]!;
};

export function summarize(label: string, runs: ZoneRun[]): DurationRow {
  const wins = runs.filter((r) => r.win).map((r) => r.seconds);
  return {
    label,
    n: runs.length,
    winRate: wins.length / runs.length,
    deathRate: runs.filter((r) => r.died).length / runs.length,
    median: quantile(wins, 0.5),
    p90: quantile(wins, 0.9),
    max: wins.length ? Math.max(...wins) : NaN,
    maxHit: quantile(runs.map((r) => r.maxHitFrac), 0.5),
    dps: quantile(runs.filter((r) => r.win && r.seconds > 0).map((r) => r.dealt / r.seconds), 0.5),
  };
}

/** Zona de un solo arquetipo a un nivel fijo. */
const only = (z: LevelZoneDef, archetype: string, level: number): LevelZoneDef => ({
  ...z, levelMin: level, levelMax: level, spawns: [{ archetype, weight: 1, levelBonus: 0, time: 'any' as const }],
});

/** A. Personaje recién creado, sin equipar nada, contra monstruos de nivel 1 de la isla de inicio. */
export function measureStart(data: GameData, seeds: number, skills: SkillId[] = ['malo', 'medio']): DurationRow[] {
  const island = data.zones.zones.find((z) => z.id === 'iguanera')!;
  const archetypes = island.spawns.filter((s) => s.time !== 'night').map((s) => s.archetype);
  const rows: DurationRow[] = [];
  for (const classId of Object.keys(data.rpg.classes)) {
    for (const archetype of archetypes) {
      for (const skill of skills) {
        const runs = Array.from({ length: seeds }, (_, i) => {
          const s = makeSessionAt(data, classId, 1, 500 + i, false);
          return runZoneWithSession(data, only(island, archetype, 1), s, skill, 900 + i, { seeds: 1, group: 1, limit: 180 });
        });
        rows.push(summarize(`${classId} · ${archetype} · ${skill}`, runs));
      }
    }
  }
  return rows;
}

/** El monstruo destacado de una zona: el de menor peso entre los de día. */
export function bossOf(z: LevelZoneDef): string {
  return [...z.spawns].filter((s) => s.time !== 'night').sort((a, b) => a.weight - b.weight)[0]!.archetype;
}

/** B. Jefe de cada zona tardía, solo, contra los tres estratos de equipo obtenible. */
export function measureLate(data: GameData, seeds: number, minLevel = 50, tiers: EquipmentTier[] = ['average-obtainable', 'optimized-obtainable']): DurationRow[] {
  const index = buildAcquisitionIndex(data);
  const rows: DurationRow[] = [];
  for (const zone of data.zones.zones.filter((z) => !z.safe && z.levelMin >= minLevel)) {
    const boss = bossOf(zone);
    const level = Math.floor((zone.levelMin + zone.levelMax) / 2);
    for (const classId of Object.keys(data.rpg.classes)) {
      for (const equipmentTier of tiers) {
        const runs = Array.from({ length: seeds }, (_, i) => {
          const built = buildProfile(data, {
            id: `${zone.id}:${classId}:balanced:${equipmentTier}`, seed: 7000 + i, classId, level, build: 'balanced', equipmentTier,
            band: { id: zone.id, label: zone.name, level, zone, territory: zone.areas.length ? 'playable' : 'hypothetical' },
          }, index);
          return runZoneWithSession(data, only(zone, boss, zone.levelMax), built.session, 'medio', 8000 + i, { seeds: 1, group: 1, limit: 1200 });
        });
        rows.push(summarize(`${zone.id} ${zone.levelMin}–${zone.levelMax} · ${boss} n${zone.levelMax} · ${classId} n${level} · ${equipmentTier}`, runs));
      }
    }
  }
  return rows;
}

export interface DuelRow {
  label: string;
  n: number;
  health: number;
  dps: number;
  /** Vida propia / daño por segundo propio: cota inferior de un duelo espejo, sin defensas, curas ni huida. */
  mirrorSeconds: number;
  /** Vida que necesita un jefe para durar el mínimo y el máximo del objetivo contra este perfil. */
  bossHealthMin: number;
  bossHealthMax: number;
}

/**
 * C. Daño sostenido de un perfil con el mejor equipo obtenible contra el jefe de la última
 * zona puesto a su mismo nivel. No hay PvP ni jefes de nivel 200 en el contenido: esto da
 * el presupuesto de vida que harían falta, no una duración jugada.
 */
export function measureDuel(data: GameData, seeds: number, levels: number[] = [100, 200]): DuelRow[] {
  const index = buildAcquisitionIndex(data);
  const zone = [...data.zones.zones].filter((z) => !z.safe).sort((a, b) => b.levelMax - a.levelMax)[0]!;
  const boss = bossOf(zone);
  const rows: DuelRow[] = [];
  for (const level of levels) {
    for (const classId of Object.keys(data.rpg.classes)) {
      const health: number[] = [];
      const runs = Array.from({ length: seeds }, (_, i) => {
        const built = buildProfile(data, {
          id: `${zone.id}:${classId}:balanced:optimized-obtainable`, seed: 9000 + i, classId, level, build: 'balanced', equipmentTier: 'optimized-obtainable',
          band: { id: zone.id, label: zone.name, level, zone, territory: zone.areas.length ? 'playable' : 'hypothetical' },
        }, index);
        health.push(built.session.character.maxHealth);
        return runZoneWithSession(data, only(zone, boss, level), built.session, 'medio', 9500 + i, { seeds: 1, group: 1, limit: 1200 });
      });
      const s = summarize('', runs);
      const hp = quantile(health, 0.5);
      rows.push({
        label: `${classId} n${level} · mejor equipo obtenible · ${boss} n${level}`, n: runs.length, health: hp, dps: s.dps,
        mirrorSeconds: hp / s.dps, bossHealthMin: s.dps * BOSS_TARGET_SECONDS.min, bossHealthMax: s.dps * BOSS_TARGET_SECONDS.max,
      });
    }
  }
  return rows;
}

export function duelTable(rows: DuelRow[]): string {
  return ['perfil | n | vida | daño/s | duelo espejo mínimo s | vida de jefe para 5 min | para 15 min',
    ...rows.map((r) => `${r.label} | ${r.n} | ${Math.round(r.health)} | ${f(r.dps)} | ${f(r.mirrorSeconds)} | ${Math.round(r.bossHealthMin)} | ${Math.round(r.bossHealthMax)}`)].join('\n');
}

const f = (n: number): string => (Number.isNaN(n) ? '—' : n.toFixed(1));
export function table(rows: DurationRow[]): string {
  return ['combinación | n | gana % | muere % | s mediana | s p90 | s máx | golpe máx % vida | daño/s',
    ...rows.map((r) => `${r.label} | ${r.n} | ${(r.winRate * 100).toFixed(0)} | ${(r.deathRate * 100).toFixed(0)} | ${f(r.median)} | ${f(r.p90)} | ${f(r.max)} | ${(r.maxHit * 100).toFixed(0)} | ${f(r.dps)}`)].join('\n');
}
