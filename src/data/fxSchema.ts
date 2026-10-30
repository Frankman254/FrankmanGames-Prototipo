// Datos de efectos visuales (data/fx.json). Todo número es PROPUESTA.
import fxJson from '../../data/fx.json';
import { ELEMENTS, RARITIES, type Element, type Rarity } from '../rpg/contracts';
import type { Rgb } from '../world/dayNight';
import { Reader } from './validate';
import { readColor } from './worldSchema';

export const STATUS_VISUALS = ['flames', 'frost', 'ice', 'stars', 'bubble', 'aura', 'sparks'] as const;
export type StatusVisual = (typeof STATUS_VISUALS)[number];

export interface FxDef {
  elements: Record<Element, { color: Rgb; core: Rgb; particles: number }>;
  castFlashSeconds: number;
  areaFlashSeconds: number;
  projectileSize: number;
  lineSweepSeconds: number;
  lineProjectiles: string[];
  statuses: Record<string, { visual: StatusVisual; color: Rgb }>;
  damageNumbers: { seconds: number; rise: number; size: number; critScale: number; toEnemy: Rgb; crit: Rgb; toPlayer: Rgb; heal: Rgb; critPop: number; critMark: Rgb };
  loot: { beamFromRarity: Rarity; beamHeight: number; glow: number };
  levelUp: { seconds: number; color: Rgb };
  occlusion: { playerRadius: number; enemyRadius: number; enemyRange: number; maxEnemies: number; fadeSeconds: number };
  arrow: { speed: number; length: number; color: Rgb; fletching: Rgb };
}

export function parseFx(raw: unknown): FxDef {
  const r = new Reader('fx.json');
  const o = r.obj(raw);
  const er = r.child('elements');
  const eo = er.obj(o['elements']);
  const elements = {} as FxDef['elements'];
  for (const el of ELEMENTS) {
    const c = er.child(el);
    const e = c.obj(eo[el]);
    elements[el] = { color: readColor(c, e, 'color'), core: readColor(c, e, 'core'), particles: c.num(e, 'particles', { int: true, min: 0, max: 200 }) };
  }
  const sr = r.child('statuses');
  const statuses: FxDef['statuses'] = {};
  for (const [id, v] of Object.entries(sr.obj(o['statuses']))) {
    const c = sr.child(id);
    const s = c.obj(v);
    statuses[id] = { visual: c.str(s, 'visual', STATUS_VISUALS) as StatusVisual, color: readColor(c, s, 'color') };
  }
  const dr = r.child('damageNumbers');
  const d = dr.obj(o['damageNumbers']);
  const lr = r.child('loot');
  const l = lr.obj(o['loot']);
  const ur = r.child('levelUp');
  const u = ur.obj(o['levelUp']);
  const or = r.child('occlusion');
  const oc = or.obj(o['occlusion']);
  const ar = r.child('arrow');
  const aw = ar.obj(o['arrow']);
  return {
    elements,
    castFlashSeconds: r.num(o, 'castFlashSeconds', { min: 0.01, max: 5 }),
    areaFlashSeconds: r.num(o, 'areaFlashSeconds', { min: 0.01, max: 5 }),
    projectileSize: r.num(o, 'projectileSize', { min: 0.01, max: 3 }),
    lineSweepSeconds: r.num(o, 'lineSweepSeconds', { min: 0.01, max: 5 }),
    lineProjectiles: r.arr(o, 'lineProjectiles').map((v, i) => {
      if (typeof v !== 'string') r.fail(`lineProjectiles[${i}]`, 'se esperaba un id de hechizo');
      return v as string;
    }),
    statuses,
    damageNumbers: {
      seconds: dr.num(d, 'seconds', { min: 0.1, max: 5 }),
      rise: dr.num(d, 'rise', { min: 0, max: 10 }),
      size: dr.num(d, 'size', { min: 0.05, max: 5 }),
      critScale: dr.num(d, 'critScale', { min: 1, max: 5 }),
      toEnemy: readColor(dr, d, 'toEnemy'),
      crit: readColor(dr, d, 'crit'),
      toPlayer: readColor(dr, d, 'toPlayer'),
      heal: readColor(dr, d, 'heal'),
      critPop: dr.num(d, 'critPop', { min: 0, max: 3, def: 0.6 }),
      critMark: d['critMark'] === undefined ? [1, 0.3, 0.12] : readColor(dr, d, 'critMark'),
    },
    loot: { beamFromRarity: lr.str(l, 'beamFromRarity', RARITIES) as Rarity, beamHeight: lr.num(l, 'beamHeight', { min: 0, max: 50 }), glow: lr.num(l, 'glow', { min: 0, max: 2 }) },
    levelUp: { seconds: ur.num(u, 'seconds', { min: 0.1, max: 10 }), color: readColor(ur, u, 'color') },
    occlusion: {
      playerRadius: or.num(oc, 'playerRadius', { min: 0, max: 10 }),
      enemyRadius: or.num(oc, 'enemyRadius', { min: 0, max: 10 }),
      enemyRange: or.num(oc, 'enemyRange', { min: 0, max: 100 }),
      maxEnemies: or.num(oc, 'maxEnemies', { int: true, min: 0, max: 3 }),
      fadeSeconds: or.num(oc, 'fadeSeconds', { min: 0, max: 5 }),
    },
    arrow: { speed: ar.num(aw, 'speed', { min: 1, max: 200 }), length: ar.num(aw, 'length', { min: 0.1, max: 5 }), color: readColor(ar, aw, 'color'), fletching: readColor(ar, aw, 'fletching') },
  };
}

export function loadFx(): FxDef {
  return parseFx(fxJson);
}
