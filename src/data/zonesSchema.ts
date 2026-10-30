// Zonas con franja de niveles y escalado de monstruos por nivel
// (`data/zones.json`). Todo número es PROPUESTA y vive en los datos.
import { ELEMENTS, PRIMARY_STATS } from '../rpg/contracts';
import type { ArchetypeDef } from './schema';
import { Reader } from './validate';

/** Una pieza de zona en el plano XZ (metros). */
export type ZoneArea = { type: 'circle'; x: number; y: number; radius: number } | { type: 'rect'; x0: number; y0: number; x1: number; y1: number };

export interface ZoneSpawnDef {
  archetype: string;
  weight: number;
  /** Niveles que se suman a la tirada de la franja (variantes más duras). */
  levelBonus: number;
}

export interface LevelZoneDef {
  id: string;
  name: string;
  /** Sin monstruos ni franja (el pueblo). */
  safe: boolean;
  levelMin: number;
  levelMax: number;
  /** Monstruos vivos por hectárea de suelo caminable de la zona. */
  density: number;
  respawnSeconds: number;
  areas: ZoneArea[];
  spawns: ZoneSpawnDef[];
}

/** curva(n) = (1 + linear·(n−1)) · (1 + compound)^(n−1). */
export interface LevelCurveDef {
  linear: number;
  compound: number;
}

export interface LevelScalingDef {
  maxHealth: LevelCurveDef;
  damage: LevelCurveDef;
  xp: LevelCurveDef;
  gold: LevelCurveDef;
  /** Una tirada de objeto más cada tantos niveles por encima del base (0 = nunca). */
  extraLootRollEvery: number;
  /** Estadística → cantidad por nivel por encima del base; `resist.*` = todas las resistencias. */
  flatPerLevel: Record<string, number>;
}

export interface LevelDifferenceDef {
  perLevel: number;
  maxBonus: number;
  maxPenalty: number;
}

export interface LevelColorDef {
  minDiff: number;
  color: string;
}

export interface ZonesDef {
  minSpawnDistance: number;
  /** Separación (m) de los puntos de muestra con los que se mide y se puebla cada zona. */
  sampleStep: number;
  /** Segundos dentro de una zona nueva antes de anunciarla (evita parpadeos en el borde). */
  zoneDwellSeconds: number;
  scaling: LevelScalingDef;
  levelDifference: LevelDifferenceDef;
  levelColors: LevelColorDef[];
  zones: LevelZoneDef[];
}

/** Clave antigua de `flatPerLevel` que se ignora (ver `parseZones`). */
const LEGACY_ARMOR = 'armor';

/** Estadísticas que admite `flatPerLevel` (más `resist.*`). */
function flatStatKeys(): string[] {
  return [
    ...PRIMARY_STATS,
    'power',
    'critChance',
    'critBonus',
    'healthRegen',
    'moveSpeed',
    'resist.*',
    ...ELEMENTS.map((e) => `resist.${e}`),
    ...ELEMENTS.map((e) => `damage.${e}`),
  ];
}

function parseCurve(r: Reader, raw: unknown): LevelCurveDef {
  const o = r.obj(raw);
  return { linear: r.num(o, 'linear', { min: 0, max: 5 }), compound: r.num(o, 'compound', { min: 0, max: 1 }) };
}

function parseArea(r: Reader, raw: unknown): ZoneArea {
  const o = r.obj(raw);
  const type = r.str(o, 'type', ['circle', 'rect']);
  if (type === 'circle') return { type, x: r.num(o, 'x'), y: r.num(o, 'y'), radius: r.num(o, 'radius', { min: 0.5 }) };
  const x0 = r.num(o, 'x0');
  const y0 = r.num(o, 'y0');
  return { type: 'rect', x0, y0, x1: r.num(o, 'x1', { min: x0 + 0.5 }), y1: r.num(o, 'y1', { min: y0 + 0.5 }) };
}

export function parseZones(raw: unknown, archetypes: Record<string, ArchetypeDef>): ZonesDef {
  const r = new Reader('zones.json');
  const o = r.obj(raw);
  const sc = r.child('scaling');
  const s = sc.obj(o['scaling']);
  const fc = sc.child('flatPerLevel');
  const flatRaw = fc.obj(s['flatPerLevel']);
  const allowed = flatStatKeys();
  const flatPerLevel: Record<string, number> = {};
  for (const k of Object.keys(flatRaw)) {
    if (k.startsWith('_')) continue;
    // Combate v2: la armadura ya no existe. `data/zones.json` (de otra rama)
    // puede traer aún la clave: se acepta y se ignora hasta que la quiten.
    if (k === LEGACY_ARMOR) continue;
    if (!allowed.includes(k)) fc.fail(k, `estadística no admitida (usa una de ${allowed.join(', ')})`);
    flatPerLevel[k] = fc.num(flatRaw, k, { min: -10, max: 10 });
  }
  const scaling: LevelScalingDef = {
    maxHealth: parseCurve(sc.child('maxHealth'), s['maxHealth']),
    damage: parseCurve(sc.child('damage'), s['damage']),
    xp: parseCurve(sc.child('xp'), s['xp']),
    gold: parseCurve(sc.child('gold'), s['gold']),
    extraLootRollEvery: sc.num(s, 'extraLootRollEvery', { int: true, min: 0, max: 100 }),
    flatPerLevel,
  };
  const dc = r.child('levelDifference');
  const d = dc.obj(o['levelDifference']);
  const levelDifference: LevelDifferenceDef = {
    perLevel: dc.num(d, 'perLevel', { min: 0, max: 1 }),
    maxBonus: dc.num(d, 'maxBonus', { min: 0, max: 10 }),
    maxPenalty: dc.num(d, 'maxPenalty', { min: 0, max: 0.95 }),
  };
  const levelColors = r.arr(o, 'levelColors').map((v, i) => {
    const c = r.child(`levelColors[${i}]`);
    const lc = c.obj(v);
    const color = c.str(lc, 'color');
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) c.fail('color', 'se esperaba un color #rrggbb');
    return { minDiff: c.num(lc, 'minDiff', { int: true }), color };
  });
  for (let i = 1; i < levelColors.length; i++) {
    if (levelColors[i]!.minDiff <= levelColors[i - 1]!.minDiff) r.fail(`levelColors[${i}].minDiff`, 'los umbrales deben ir de menor a mayor');
  }
  const ids = new Set<string>();
  const zones = r.arr(o, 'zones').map((v, i): LevelZoneDef => {
    const c = r.child(`zones[${i}]`);
    const z = c.obj(v);
    const id = c.str(z, 'id');
    if (ids.has(id)) c.fail('id', `id repetido "${id}"`);
    ids.add(id);
    const safe = z['safe'] === true;
    const areas = c.arr(z, 'areas').map((a, k) => parseArea(c.child(`areas[${k}]`), a));
    if (areas.length === 0) c.fail('areas', 'una zona necesita al menos un área');
    const name = c.str(z, 'name');
    if (safe) {
      if (z['spawns'] !== undefined) c.fail('spawns', 'una zona segura no tiene monstruos');
      return { id, name, safe, levelMin: 0, levelMax: 0, density: 0, respawnSeconds: 0, areas, spawns: [] };
    }
    const levelMin = c.num(z, 'levelMin', { int: true, min: 1, max: 100 });
    const levelMax = c.num(z, 'levelMax', { int: true, min: levelMin, max: 100 });
    const spawns = c.arr(z, 'spawns').map((sp, k) => {
      const cc = c.child(`spawns[${k}]`);
      const so = cc.obj(sp);
      return {
        archetype: cc.str(so, 'archetype', Object.keys(archetypes)),
        weight: cc.num(so, 'weight', { min: 0.001 }),
        levelBonus: cc.num(so, 'levelBonus', { int: true, min: -20, max: 20, def: 0 }),
      };
    });
    if (spawns.length === 0) c.fail('spawns', 'una zona con franja necesita al menos un monstruo (o "safe": true)');
    return {
      id,
      name,
      safe,
      levelMin,
      levelMax,
      density: c.num(z, 'density', { min: 0, max: 20 }),
      respawnSeconds: c.num(z, 'respawnSeconds', { min: 1, max: 3600 }),
      areas,
      spawns,
    };
  });
  return {
    minSpawnDistance: r.num(o, 'minSpawnDistance', { min: 0, max: 200 }),
    sampleStep: r.num(o, 'sampleStep', { min: 0.5, max: 16 }),
    zoneDwellSeconds: r.num(o, 'zoneDwellSeconds', { min: 0, max: 10, def: 0.6 }),
    scaling,
    levelDifference,
    levelColors,
    zones,
  };
}
