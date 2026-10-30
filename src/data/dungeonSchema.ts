// Mazmorra por pisos (`data/dungeon.json`). Todo número es PROPUESTA y vive en
// los datos; aquí sólo se valida y se tipa.
import dungeonJson from '../../data/dungeon.json';
import type { GameData } from './index';
import { Reader } from './validate';

export type Rgb = [number, number, number];

export interface DungeonThemeDef {
  id: string;
  floor: Rgb;
  /** Variación de brillo (±) entre baldosas del suelo. */
  floorVariation: number;
  wall: Rgb;
  wallTop: Rgb;
}

export interface DungeonSpawnDef {
  archetype: string;
  weight: number;
  levelBonus: number;
}

export interface DungeonFloorDef {
  theme: string;
  cols: number;
  rows: number;
  rooms: { min: number; max: number };
  roomSize: { min: number; max: number };
  /** Pasillos de más (además del árbol que une todas las salas): crean bucles. */
  extraLinks: number;
  levelMin: number;
  levelMax: number;
  enemiesPerRoom: { min: number; max: number };
  spawns: DungeonSpawnDef[];
  chests: number;
  chestTable: string;
  /** Monstruo fuerte del último piso, en la sala más lejana (o null). */
  guardian: { archetype: string; level: number } | null;
}

export interface DungeonLightDef {
  ambient: number;
  skyColor: Rgb;
  groundColor: Rgb;
  sun: number;
  sunColor: Rgb;
  fogDensity: number;
  fogColor: Rgb;
  torch: { color: Rgb; intensity: number; range: number; flicker: number };
  playerLight: { color: Rgb; intensity: number; range: number };
  /** Una antorcha cada tantas baldosas de pared de sala. */
  torchEvery: number;
}

/** Llave para entrar desde el mundo abierto (o null = entrada libre). */
export interface DungeonKeyDef {
  itemId: string;
  /** Se gasta al entrar. */
  consume: boolean;
  /** Dónde se consigue (se añade al aviso cuando falta). */
  hint: string;
}

export interface DungeonDef {
  name: string;
  key: DungeonKeyDef | null;
  seed: number;
  tileSize: number;
  wallHeight: number;
  corridorWidth: number;
  entrance: { x: number; y: number; facingDeg: number; reach: number };
  /** Distancia (m) a la que se usa una escalera o se abre un cofre. */
  interactReach: number;
  camera: { distance: number; maxDistance: number };
  light: DungeonLightDef;
  chest: { goldPerFloor: number; extraRollsPerFloor: number };
  themes: Record<string, DungeonThemeDef>;
  floors: DungeonFloorDef[];
}

function rgb(r: Reader, o: Record<string, unknown>, key: string): Rgb {
  const v = r.arr(o, key);
  if (v.length !== 3 || v.some((c) => typeof c !== 'number' || c < 0 || c > 1)) r.fail(key, 'se esperaba [r, g, b] con valores 0–1');
  return v as Rgb;
}

function range(r: Reader, o: Record<string, unknown>, key: string, min: number, max: number): { min: number; max: number } {
  const c = r.child(key);
  const v = c.obj(o[key]);
  const lo = c.num(v, 'min', { int: true, min, max });
  return { min: lo, max: c.num(v, 'max', { int: true, min: lo, max }) };
}

/**
 * `archetypes` y `lootTables` son los ids que existen (data/enemies.json y
 * data/rpg/loot.json): un nombre mal escrito falla al cargar.
 */
export function parseDungeon(raw: unknown, archetypes: readonly string[], lootTables: readonly string[], items?: readonly string[]): DungeonDef {
  const r = new Reader('dungeon.json');
  const o = r.obj(raw);
  const tileSize = r.num(o, 'tileSize', { min: 0.5, max: 4 });
  const corridorWidth = r.num(o, 'corridorWidth', { int: true, min: 1, max: 4 });
  const ec = r.child('entrance');
  const e = ec.obj(o['entrance']);
  const cc = r.child('camera');
  const cam = cc.obj(o['camera']);
  const lc = r.child('light');
  const l = lc.obj(o['light']);
  const tc = lc.child('torch');
  const t = tc.obj(l['torch']);
  const pc = lc.child('playerLight');
  const pl = pc.obj(l['playerLight']);
  const chc = r.child('chest');
  const ch = chc.obj(o['chest']);

  const themes: Record<string, DungeonThemeDef> = {};
  const thc = r.child('themes');
  const th = thc.obj(o['themes']);
  for (const id of Object.keys(th)) {
    if (id.startsWith('_')) continue;
    const c = thc.child(id);
    const v = c.obj(th[id]);
    themes[id] = { id, floor: rgb(c, v, 'floor'), floorVariation: c.num(v, 'floorVariation', { min: 0, max: 0.5 }), wall: rgb(c, v, 'wall'), wallTop: rgb(c, v, 'wallTop') };
  }

  const floors = r.arr(o, 'floors').map((raw, i): DungeonFloorDef => {
    const c = r.child(`floors[${i}]`);
    const f = c.obj(raw);
    const theme = c.str(f, 'theme', Object.keys(themes));
    const cols = c.num(f, 'cols', { int: true, min: 16, max: 128 });
    const rows = c.num(f, 'rows', { int: true, min: 16, max: 128 });
    const roomSize = range(c, f, 'roomSize', corridorWidth + 2, 20);
    const levelMin = c.num(f, 'levelMin', { int: true, min: 1, max: 100 });
    const spawns = c.arr(f, 'spawns').map((sv, k) => {
      const sc = c.child(`spawns[${k}]`);
      const s = sc.obj(sv);
      return { archetype: sc.str(s, 'archetype', archetypes), weight: sc.num(s, 'weight', { min: 0.01 }), levelBonus: sc.num(s, 'levelBonus', { int: true, min: 0, max: 20, def: 0 }) };
    });
    if (spawns.length === 0) c.fail('spawns', 'hace falta al menos un monstruo');
    let guardian: DungeonFloorDef['guardian'] = null;
    if (f['guardian'] !== null && f['guardian'] !== undefined) {
      const gc = c.child('guardian');
      const g = gc.obj(f['guardian']);
      guardian = { archetype: gc.str(g, 'archetype', archetypes), level: gc.num(g, 'level', { int: true, min: 1, max: 100 }) };
    }
    return {
      theme,
      cols,
      rows,
      rooms: range(c, f, 'rooms', 2, 30),
      roomSize,
      extraLinks: c.num(f, 'extraLinks', { int: true, min: 0, max: 10 }),
      levelMin,
      levelMax: c.num(f, 'levelMax', { int: true, min: levelMin, max: 100 }),
      enemiesPerRoom: range(c, f, 'enemiesPerRoom', 0, 12),
      spawns,
      chests: c.num(f, 'chests', { int: true, min: 0, max: 10 }),
      chestTable: c.str(f, 'chestTable', lootTables),
      guardian,
    };
  });
  if (floors.length === 0) r.fail('floors', 'hace falta al menos un piso');
  if (floors.slice(0, -1).some((f) => f.guardian !== null)) r.fail('floors', 'sólo el último piso lleva guardián');

  let key: DungeonKeyDef | null = null;
  if (o['key'] !== undefined && o['key'] !== null) {
    const kc = r.child('key');
    const k = kc.obj(o['key']);
    key = { itemId: kc.str(k, 'itemId', items), consume: k['consume'] !== false, hint: k['hint'] === undefined ? '' : kc.str(k, 'hint') };
  }

  return {
    name: r.str(o, 'name'),
    key,
    seed: r.num(o, 'seed', { int: true, min: 0 }),
    tileSize,
    wallHeight: r.num(o, 'wallHeight', { min: 1, max: 10 }),
    corridorWidth,
    entrance: { x: ec.num(e, 'x'), y: ec.num(e, 'y'), facingDeg: ec.num(e, 'facingDeg'), reach: ec.num(e, 'reach', { min: 0.5, max: 10 }) },
    interactReach: r.num(o, 'interactReach', { min: 0.5, max: 10 }),
    camera: { distance: cc.num(cam, 'distance', { min: 3 }), maxDistance: cc.num(cam, 'maxDistance', { min: 3 }) },
    light: {
      ambient: lc.num(l, 'ambient', { min: 0, max: 2 }),
      skyColor: rgb(lc, l, 'skyColor'),
      groundColor: rgb(lc, l, 'groundColor'),
      sun: lc.num(l, 'sun', { min: 0, max: 2 }),
      sunColor: rgb(lc, l, 'sunColor'),
      fogDensity: lc.num(l, 'fogDensity', { min: 0, max: 0.2 }),
      fogColor: rgb(lc, l, 'fogColor'),
      torch: { color: rgb(tc, t, 'color'), intensity: tc.num(t, 'intensity', { min: 0 }), range: tc.num(t, 'range', { min: 1 }), flicker: tc.num(t, 'flicker', { min: 0, max: 1 }) },
      playerLight: { color: rgb(pc, pl, 'color'), intensity: pc.num(pl, 'intensity', { min: 0 }), range: pc.num(pl, 'range', { min: 1 }) },
      torchEvery: lc.num(l, 'torchEvery', { int: true, min: 2, max: 40 }),
    },
    chest: { goldPerFloor: chc.num(ch, 'goldPerFloor', { min: 0, max: 10 }), extraRollsPerFloor: chc.num(ch, 'extraRollsPerFloor', { int: true, min: 0, max: 10 }) },
    themes,
    floors,
  };
}

/** `data/dungeon.json` validado contra los arquetipos y las tablas de botín cargados. */
export function loadDungeon(data: GameData): DungeonDef {
  return parseDungeon(dungeonJson, Object.keys(data.enemies.archetypes), Object.keys(data.rpg.lootTables), Object.keys(data.rpg.items));
}
