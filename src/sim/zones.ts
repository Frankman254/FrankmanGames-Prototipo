// Zonas con franja de niveles (`data/zones.json`): qué zona hay en cada punto,
// cómo escala un monstruo con su nivel y quién repone las bajas. Sólo datos y
// reglas; nada de DOM ni de render.
//   · Escalado relativo al nivel base de la ficha RPG: a su nivel base un
//     monstruo queda exactamente como antes (los tests y el equilibrio previo valen).
//   · Diferencia de nivel: daño × (1 + perLevel · (atacante − defensor)), con topes.
import type { ArchetypeDef, EnemyAttackDef } from '../data/schema';
import type { LevelColorDef, LevelCurveDef, LevelDifferenceDef, LevelScalingDef, LevelZoneDef, ZoneArea, ZonesDef } from '../data/zonesSchema';
import { ELEMENTS, type StatBlock, type StatId } from '../rpg/contracts';
import type { Rng } from './rng';
import { dist, type Vec2 } from './vec2';

/** curva(n) = (1 + linear·(n−1)) · (1 + compound)^(n−1). */
export function levelCurve(c: LevelCurveDef, level: number): number {
  const n = Math.max(0, level - 1);
  return (1 + c.linear * n) * Math.pow(1 + c.compound, n);
}

/** Multiplicador de una curva al pasar del nivel base a `level`. */
export function levelRatio(c: LevelCurveDef, level: number, baseLevel: number): number {
  return levelCurve(c, level) / levelCurve(c, baseLevel);
}

function scaleAttack(at: EnemyAttackDef, k: number): EnemyAttackDef {
  if (at.effect !== 'damage' || k === 1) return at;
  return { ...at, damageMin: at.damageMin * k, damageMax: at.damageMax * k };
}

/**
 * Arquetipo a otro nivel: vida, umbral de aturdimiento y daño del básico y de
 * los hechizos. Los hechizos conservan su orden (los índices identifican cada
 * hechizo en el registro y el sonido). A su nivel base devuelve el mismo objeto.
 */
export function scaleArchetype(def: ArchetypeDef, level: number, baseLevel: number, s: LevelScalingDef): ArchetypeDef {
  if (level === baseLevel) return def;
  const hp = levelRatio(s.maxHealth, level, baseLevel);
  const dmg = levelRatio(s.damage, level, baseLevel);
  return {
    ...def,
    maxHealth: Math.max(1, Math.round(def.maxHealth * hp)),
    staggerDamage: def.staggerDamage * hp,
    attack: scaleAttack(def.attack, dmg),
    spells: def.spells.map((sp) => scaleAttack(sp, dmg)),
  };
}

/** Estadísticas que suma (o resta) el nivel respecto al base: power, armadura, críticos, resistencias. */
export function levelStatBlock(level: number, baseLevel: number, s: LevelScalingDef): StatBlock {
  const d = level - baseLevel;
  const out: StatBlock = {};
  if (d === 0) return out;
  const add = (stat: StatId, v: number): void => {
    out[stat] = (out[stat] ?? 0) + v;
  };
  for (const [k, per] of Object.entries(s.flatPerLevel)) {
    if (k === 'resist.*') for (const el of ELEMENTS) add(`resist.${el}`, per * d);
    else add(k as StatId, per * d);
  }
  return out;
}

export interface RewardScale {
  xp: number;
  gold: number;
  /** Tiradas de objeto de más (nunca menos de las de la tabla). */
  extraRolls: number;
}

export function rewardScale(level: number, baseLevel: number, s: LevelScalingDef): RewardScale {
  const above = Math.max(0, level - baseLevel);
  return {
    xp: levelRatio(s.xp, level, baseLevel),
    gold: levelRatio(s.gold, level, baseLevel),
    extraRolls: s.extraLootRollEvery > 0 ? Math.floor(above / s.extraLootRollEvery) : 0,
  };
}

/** Multiplicador de daño por diferencia de nivel, con tope en los dos sentidos. */
export function levelDiffMultiplier(attackerLevel: number, defenderLevel: number, r: LevelDifferenceDef): number {
  const x = r.perLevel * (attackerLevel - defenderLevel);
  return x >= 0 ? 1 + Math.min(r.maxBonus, x) : 1 - Math.min(r.maxPenalty, -x);
}

/** Color del nombre según el nivel del monstruo menos el del jugador. */
export function levelColor(diff: number, colors: readonly LevelColorDef[]): string {
  let c = colors[0]?.color ?? '#ffffff';
  for (const lc of colors) if (diff >= lc.minDiff) c = lc.color;
  return c;
}

/** Texto de la franja: "niv. 5–12" o "zona segura". */
export function bandLabel(z: LevelZoneDef): string {
  return z.safe ? 'zona segura' : `niv. ${z.levelMin}–${z.levelMax}`;
}

function inArea(a: ZoneArea, p: Vec2): boolean {
  if (a.type === 'circle') return (p.x - a.x) ** 2 + (p.y - a.y) ** 2 <= a.radius * a.radius;
  return p.x >= a.x0 && p.x <= a.x1 && p.y >= a.y0 && p.y <= a.y1;
}

/** Zona de cada punto: la primera de la lista que lo contiene. */
export class ZoneMap {
  constructor(readonly def: ZonesDef) {}

  zoneAt(p: Vec2): LevelZoneDef | null {
    for (const z of this.def.zones) for (const a of z.areas) if (inArea(a, p)) return z;
    return null;
  }

  get(id: string): LevelZoneDef | undefined {
    return this.def.zones.find((z) => z.id === id);
  }
}

/** Nivel de un monstruo nuevo en la zona: uniforme en la franja + el extra de su entrada (mínimo 1). */
export function rollLevel(rng: Rng, z: LevelZoneDef, levelBonus: number): number {
  return Math.max(1, rng.int(z.levelMin, z.levelMax) + levelBonus);
}

/** Lo que la población de zonas necesita del mundo. */
export interface ZoneHost {
  rng: Rng;
  walkable(p: Vec2): boolean;
  playerPos(): Vec2;
  /** Pone un monstruo y devuelve su id. */
  spawn(archetype: string, pos: Vec2, level: number, zoneId: string): number;
  /** ¿Sigue vivo ese monstruo? (false si murió o ya no está). */
  isAlive(id: number): boolean;
}

export interface ZoneState {
  def: LevelZoneDef;
  /** Puntos caminables de la zona (rejilla de `sampleStep`). */
  points: Vec2[];
  /** Monstruos vivos que pide la densidad. */
  target: number;
  alive: number[];
  /** Instantes (s de simulación) en que toca reponer una baja. */
  respawnAt: number[];
}

/** Puebla cada zona con su densidad y repone las bajas tras `respawnSeconds`. */
export class ZonePopulation {
  readonly zones: ZoneState[] = [];
  private time = 0;

  constructor(
    readonly map: ZoneMap,
    private readonly host: ZoneHost,
    width: number,
    depth: number,
  ) {
    const step = map.def.sampleStep;
    const byZone = new Map<string, Vec2[]>();
    for (let y = step / 2; y < depth; y += step) {
      for (let x = step / 2; x < width; x += step) {
        const p = { x, y };
        const z = map.zoneAt(p);
        if (!z || z.safe || !host.walkable(p)) continue;
        let list = byZone.get(z.id);
        if (!list) byZone.set(z.id, (list = []));
        list.push(p);
      }
    }
    for (const z of map.def.zones) {
      if (z.safe) continue;
      const points = byZone.get(z.id) ?? [];
      const hectares = (points.length * step * step) / 10000;
      const target = points.length > 0 ? Math.max(1, Math.round(hectares * z.density)) : 0;
      this.zones.push({ def: z, points, target, alive: [], respawnAt: [] });
    }
  }

  /** Monstruos vivos que piden todas las zonas. */
  get totalTarget(): number {
    return this.zones.reduce((n, z) => n + z.target, 0);
  }

  /** Llena todas las zonas de golpe (al crear el mundo). */
  populate(): void {
    for (const z of this.zones) while (z.alive.length < z.target && this.spawnIn(z)) {}
  }

  tick(dt: number): void {
    this.time += dt;
    for (const z of this.zones) {
      for (let i = z.alive.length - 1; i >= 0; i--) {
        if (this.host.isAlive(z.alive[i]!)) continue;
        z.alive.splice(i, 1);
        z.respawnAt.push(this.time + z.def.respawnSeconds);
      }
      for (let i = z.respawnAt.length - 1; i >= 0; i--) {
        if (z.respawnAt[i]! > this.time) continue;
        if (z.alive.length >= z.target || this.spawnIn(z)) z.respawnAt.splice(i, 1);
        else z.respawnAt[i] = this.time + 1; // el jugador tapa la zona: probar dentro de un segundo
      }
    }
  }

  /** Un monstruo de la tabla en un punto de la zona lejos del jugador. */
  private spawnIn(z: ZoneState): boolean {
    if (z.points.length === 0) return false;
    const rng = this.host.rng;
    const from = this.host.playerPos();
    const minD = this.map.def.minSpawnDistance;
    for (let tries = 0; tries < 24; tries++) {
      const p = z.points[rng.int(0, z.points.length - 1)]!;
      if (dist(p, from) < minD) continue;
      const entry = pickWeighted(rng, z.def.spawns);
      if (!entry) return false;
      z.alive.push(this.host.spawn(entry.archetype, p, rollLevel(rng, z.def, entry.levelBonus), z.def.id));
      return true;
    }
    return false;
  }
}

function pickWeighted<T extends { weight: number }>(rng: Rng, list: readonly T[]): T | null {
  let total = 0;
  for (const t of list) total += t.weight;
  let x = rng.next() * total;
  for (const t of list) {
    x -= t.weight;
    if (x < 0) return t;
  }
  return list[list.length - 1] ?? null;
}
