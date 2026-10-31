// Zonas con franja de niveles (`data/zones.json`): qué zona hay en cada punto,
// cómo escala un monstruo con su nivel y quién repone los grupos caídos. Sólo datos y
// reglas; nada de DOM ni de render.
//   · Escalado relativo al nivel base de la ficha RPG: a su nivel base un
//     monstruo queda exactamente como antes (los tests y el equilibrio previo valen).
//   · Diferencia de nivel: daño × (1 + perLevel · (atacante − defensor)), con topes.
import type { ArchetypeDef, EnemyAttackDef } from '../data/schema';
import type { LevelColorDef, LevelCurveDef, LevelDifferenceDef, LevelScalingDef, LevelZoneDef, ZoneArea, ZoneSpawnDef, ZonesDef } from '../data/zonesSchema';
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
  /** ¿Está peleando (ni quieto ni volviendo a casa)? */
  isEngaged(id: number): boolean;
  /** Despierta a un monstruo quieto para que vaya a por el jugador (cohesión del grupo). */
  wake(id: number): void;
  /** Quita a un monstruo vivo sin recompensa (los nocturnos al amanecer). */
  despawn(id: number): void;
  /** ¿Es de noche? (sin reloj: nunca). */
  isNight(): boolean;
}

/** Un grupo de monstruos que nació junto. */
export interface SpawnGroup {
  /** Ids de los miembros vivos. */
  members: number[];
  anchor: Vec2;
  /** Lleva algún monstruo que sólo sale de noche: al amanecer se retira si no pelea. */
  nocturnal: boolean;
}

export interface ZoneState {
  def: LevelZoneDef;
  /** Puntos caminables de la zona (rejilla de `sampleStep`). */
  points: Vec2[];
  /** Monstruos vivos que pide la densidad. */
  target: number;
  groups: SpawnGroup[];
  /** Instantes (s de simulación) en que toca reponer un grupo caído. */
  respawnAt: number[];
}

/** ¿Puede nacer esa entrada a esta hora? */
export function spawnAllowed(time: ZoneSpawnDef['time'], night: boolean): boolean {
  return time === 'any' || (time === 'night') === night;
}

/**
 * Puebla cada zona con su densidad en grupos de `group.min..max` monstruos
 * alrededor de un ancla. Si uno pelea, el resto del grupo se suma. Cuando cae
 * el último miembro, el grupo vuelve tras `respawnSeconds` (con otra tirada).
 */
export class ZonePopulation {
  readonly zones: ZoneState[] = [];
  private time = 0;
  private wasNight: boolean | null = null;

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
      if (z.safe || z.areas.length === 0) continue;
      const points = byZone.get(z.id) ?? [];
      const hectares = (points.length * step * step) / 10000;
      const target = points.length > 0 ? Math.max(1, Math.round(hectares * z.density)) : 0;
      this.zones.push({ def: z, points, target, groups: [], respawnAt: [] });
    }
  }

  /** Monstruos vivos que piden todas las zonas. */
  get totalTarget(): number {
    return this.zones.reduce((n, z) => n + z.target, 0);
  }

  /** Monstruos vivos de una zona. */
  aliveIn(z: ZoneState): number {
    let n = 0;
    for (const g of z.groups) n += g.members.length;
    return n;
  }

  /** Llena todas las zonas de golpe (al crear el mundo). */
  populate(): void {
    for (const z of this.zones) while (this.aliveIn(z) < z.target && this.spawnGroup(z)) {}
  }

  tick(dt: number): void {
    this.time += dt;
    const night = this.host.isNight();
    const nightfall = night && this.wasNight === false;
    this.wasNight = night;
    for (const z of this.zones) {
      if (nightfall) this.swapForNight(z);
      for (let gi = z.groups.length - 1; gi >= 0; gi--) {
        const g = z.groups[gi]!;
        g.members = g.members.filter((id) => this.host.isAlive(id));
        // Al amanecer, los grupos nocturnos que no pelean se retiran y dejan sitio a los de día.
        if (!night && g.nocturnal && g.members.length > 0 && !g.members.some((id) => this.host.isEngaged(id))) {
          for (const id of g.members) this.host.despawn(id);
          g.members = [];
          z.groups.splice(gi, 1);
          z.respawnAt.push(this.time);
          continue;
        }
        if (g.members.length === 0) {
          z.groups.splice(gi, 1);
          z.respawnAt.push(this.time + z.def.respawnSeconds);
          continue;
        }
        // Cohesión: si uno pelea, los demás del grupo también.
        if (g.members.some((id) => this.host.isEngaged(id))) for (const id of g.members) this.host.wake(id);
      }
      for (let i = z.respawnAt.length - 1; i >= 0; i--) {
        if (z.respawnAt[i]! > this.time) continue;
        if (this.aliveIn(z) >= z.target || this.spawnGroup(z)) z.respawnAt.splice(i, 1);
        else z.respawnAt[i] = this.time + 1; // el jugador tapa la zona: probar dentro de un segundo
      }
    }
  }

  /** Anochecer: parte de los grupos quietos y lejos del jugador se retira y vuelve ya con la tabla de noche. */
  private swapForNight(z: ZoneState): void {
    if (!z.def.spawns.some((s) => s.time === 'night')) return;
    const from = this.host.playerPos();
    const minD = this.map.def.minSpawnDistance;
    const idle = z.groups.filter((g) => !g.nocturnal && dist(g.anchor, from) >= minD && !g.members.some((id) => this.host.isEngaged(id)));
    const n = Math.round(idle.length * this.map.def.nightSwap);
    for (let k = 0; k < n; k++) {
      const g = idle.splice(this.host.rng.int(0, idle.length - 1), 1)[0]!;
      for (const id of g.members) this.host.despawn(id);
      g.members = [];
      z.groups.splice(z.groups.indexOf(g), 1);
      z.respawnAt.push(this.time);
    }
  }

  /** Un grupo de la tabla alrededor de un punto de la zona lejos del jugador. */
  private spawnGroup(z: ZoneState): boolean {
    if (z.points.length === 0) return false;
    const rng = this.host.rng;
    const night = this.host.isNight();
    const table = z.def.spawns.filter((s) => spawnAllowed(s.time, night));
    if (table.length === 0) return false;
    const from = this.host.playerPos();
    const minD = this.map.def.minSpawnDistance;
    const gd = z.def.group;
    for (let tries = 0; tries < 24; tries++) {
      const anchor = z.points[rng.int(0, z.points.length - 1)]!;
      if (dist(anchor, from) < minD) continue;
      const size = Math.min(rng.int(gd.min, gd.max), Math.max(1, z.target - this.aliveIn(z)));
      const g: SpawnGroup = { members: [], anchor, nocturnal: false };
      for (let k = 0; k < size; k++) {
        const entry = pickWeighted(rng, table)!;
        const p = k === 0 ? anchor : this.near(z, anchor, gd.radius);
        g.members.push(this.host.spawn(entry.archetype, p, rollLevel(rng, z.def, entry.levelBonus), z.def.id));
        if (entry.time === 'night') g.nocturnal = true;
      }
      z.groups.push(g);
      return true;
    }
    return false;
  }

  /** Punto caminable de la misma zona a menos de `radius` del ancla (o el ancla). */
  private near(z: ZoneState, anchor: Vec2, radius: number): Vec2 {
    const rng = this.host.rng;
    for (let i = 0; i < 8; i++) {
      const a = rng.next() * Math.PI * 2;
      const r = radius * Math.sqrt(rng.next());
      const p = { x: anchor.x + Math.cos(a) * r, y: anchor.y + Math.sin(a) * r };
      if (this.host.walkable(p) && this.map.zoneAt(p) === z.def) return p;
    }
    return { ...anchor };
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
