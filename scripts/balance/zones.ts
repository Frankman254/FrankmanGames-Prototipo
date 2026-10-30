// Escenario «zona contra nivel del jugador»: un jugador de nivel 1/5/10/20 se
// enfrenta a grupos de monstruos de cada zona de `data/zones.json` (arquetipos
// y niveles tirados con la tabla y la franja de la zona). Mismo `World`, misma
// `GameSession` y mismo bot que la batería principal, en campo abierto.
import type { GameData } from '../../src/data';
import type { LevelZoneDef } from '../../src/data/zonesSchema';
import { Rng } from '../../src/sim/rng';
import { World } from '../../src/sim/world';
import { rollLevel } from '../../src/sim/zones';
import { PlayerBot } from './bot';
import { FIELD_CENTER, openField } from './data';
import { median } from './metrics';
import { DT, makeSessionAt, SKILLS, type SkillId } from './scenarios';

export const ZONE_PLAYER_LEVELS = [1, 5, 10, 20] as const;
export const ZONE_SKILLS: SkillId[] = ['malo', 'medio', 'bueno'];

export interface ZoneOptions {
  seeds: number;
  /** Monstruos por grupo. */
  group: number;
  /** Segundos máximos de cada partida. */
  limit: number;
}

export const ZONE_FULL: ZoneOptions = { seeds: 6, group: 2, limit: 150 };

export interface ZoneRun {
  zone: string;
  playerLevel: number;
  classId: string;
  skill: SkillId;
  win: boolean;
  died: boolean;
  /** Murió de un solo golpe con más del 90 % de la vida. */
  oneShot: boolean;
  seconds: number;
  kills: number;
  /** Golpe más fuerte recibido / vida máxima. */
  maxHitFrac: number;
  /** Media de niveles de los monstruos del grupo. */
  monsterLevel: number;
  xp: number;
}

/** Grupo de la zona: arquetipos por peso y niveles de la franja, en arco a 9–11 m del jugador. */
function placeZoneGroup(w: World, z: LevelZoneDef, n: number, rng: Rng): number[] {
  const p = w.player.pos;
  const base = rng.range(0, Math.PI * 2);
  const levels: number[] = [];
  for (let i = 0; i < n; i++) {
    let x = rng.next() * z.spawns.reduce((t, s) => t + s.weight, 0);
    const entry = z.spawns.find((s) => (x -= s.weight) < 0) ?? z.spawns[z.spawns.length - 1]!;
    const level = rollLevel(rng, z, entry.levelBonus);
    const a = base + (n > 1 ? (i / (n - 1) - 0.5) * 1.2 : 0);
    const r = rng.range(9, 11);
    const at = { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r };
    w.spawnEnemy(entry.archetype, w.grid.walkable(at) ? at : w.grid.center(w.grid.nearestWalkable(at)), level);
    levels.push(level);
  }
  return levels;
}

export function runZone(data: GameData, z: LevelZoneDef, playerLevel: number, classId: string, skill: SkillId, seed: number, o: ZoneOptions): ZoneRun {
  const d = openField(data);
  const s = makeSessionAt(d, classId, playerLevel, seed * 7919 + 17);
  const w = new World(d, { encounter: false, character: s.character, seed });
  s.attach(w);
  w.player.pos = { ...FIELD_CENTER };
  w.player.prevPos = { ...FIELD_CENTER };
  const levels = placeZoneGroup(w, z, o.group, new Rng(seed ^ 0x51ed));
  const bot = new PlayerBot(w, s, { dodge: SKILLS[skill], seed: seed * 31 + 7 });
  const ch = s.character;
  let maxHit = 0;
  let lastHitFrac = 0;
  let hpBefore = ch.health;
  let xp = 0;
  while (w.outcome === 'playing' && w.time < o.limit) {
    bot.think();
    hpBefore = ch.health;
    w.tick(DT);
    for (const e of w.drainEvents()) {
      if (e.type === 'damage' && e.toPlayer) {
        maxHit = Math.max(maxHit, e.amount);
        lastHitFrac = hpBefore / ch.maxHealth;
      } else if (e.type === 'xp') xp += e.amount;
    }
  }
  const died = w.outcome === 'defeat';
  return {
    zone: z.id,
    playerLevel,
    classId,
    skill,
    win: w.outcome === 'victory',
    died,
    // Murió con más del 90 % de la vida justo antes del último golpe.
    oneShot: died && lastHitFrac >= 0.9,
    seconds: w.endTime ?? w.time,
    kills: w.enemies.list.filter((e) => e.state === 'dead').length,
    maxHitFrac: maxHit / ch.maxHealth,
    monsterLevel: levels.reduce((a, b) => a + b, 0) / levels.length,
    xp,
  };
}

export interface ZoneAgg {
  zone: string;
  playerLevel: number;
  skill: SkillId;
  n: number;
  winRate: number;
  deathRate: number;
  oneShotRate: number;
  /** Mediana de segundos por monstruo abatido en las victorias (NaN si no hay). */
  ttkPerKill: number;
  /** Mediana del golpe más fuerte recibido / vida máxima. */
  maxHit: number;
  monsterLevel: number;
  /** XP por minuto de combate (todas las partidas). */
  xpPerMin: number;
}

export function aggregateZone(rs: ZoneRun[]): ZoneAgg {
  const r0 = rs[0]!;
  const wins = rs.filter((r) => r.win);
  const minutes = rs.reduce((t, r) => t + r.seconds, 0) / 60;
  return {
    zone: r0.zone,
    playerLevel: r0.playerLevel,
    skill: r0.skill,
    n: rs.length,
    winRate: wins.length / rs.length,
    deathRate: rs.filter((r) => r.died).length / rs.length,
    oneShotRate: rs.filter((r) => r.oneShot).length / rs.length,
    ttkPerKill: wins.length ? median(wins.map((r) => r.seconds / Math.max(1, r.kills))) : NaN,
    maxHit: median(rs.map((r) => r.maxHitFrac)),
    monsterLevel: rs.reduce((t, r) => t + r.monsterLevel, 0) / rs.length,
    xpPerMin: minutes > 0 ? rs.reduce((t, r) => t + r.xp, 0) / minutes : 0,
  };
}

export interface ZoneMeasurement {
  options: ZoneOptions;
  classes: string[];
  zones: { id: string; name: string; levelMin: number; levelMax: number }[];
  rows: ZoneAgg[];
}

/** Todas las combinaciones zona × nivel × habilidad (las dos clases juntas). */
export function measureZones(data: GameData, o: ZoneOptions = ZONE_FULL, only: string[] | null = null): ZoneMeasurement {
  const classes = Object.keys(data.rpg.classes);
  const zones = data.zones.zones.filter((z) => !z.safe && (!only || only.includes(z.id)));
  const rows: ZoneAgg[] = [];
  for (const z of zones) {
    for (const lv of ZONE_PLAYER_LEVELS) {
      for (const skill of ZONE_SKILLS) {
        const rs: ZoneRun[] = [];
        for (const c of classes) for (let seed = 1; seed <= o.seeds; seed++) rs.push(runZone(data, z, lv, c, skill, seed * 101 + lv, o));
        rows.push(aggregateZone(rs));
      }
    }
  }
  return { options: o, classes, zones: zones.map((z) => ({ id: z.id, name: z.name, levelMin: z.levelMin, levelMax: z.levelMax })), rows };
}
