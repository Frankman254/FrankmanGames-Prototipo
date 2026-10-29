// Tipos de datos ajustables y su parseo con validación. Todo número aquí es
// PROPUESTA: vive en `data/*.json`, no en el código.
import type { RectObstacle } from '../sim/navGrid';
import { Reader } from './validate';

export interface CameraDef {
  pitchDeg: number;
  yawDeg: number;
  distance: number;
  fovDeg: number;
  followLerpPerSecond: number;
  minDistance: number;
  maxDistance: number;
}

export function parseCamera(raw: unknown): CameraDef {
  const r = new Reader('camera.json');
  const o = r.obj(raw);
  const minDistance = r.num(o, 'minDistance', { min: 1 });
  const maxDistance = r.num(o, 'maxDistance', { min: minDistance });
  return {
    pitchDeg: r.num(o, 'pitchDeg', { min: 10, max: 89 }),
    yawDeg: r.num(o, 'yawDeg', { min: -360, max: 360 }),
    distance: r.num(o, 'distance', { min: minDistance, max: maxDistance }),
    fovDeg: r.num(o, 'fovDeg', { min: 10, max: 120 }),
    followLerpPerSecond: r.num(o, 'followLerpPerSecond', { min: 0.1 }),
    minDistance,
    maxDistance,
  };
}

export interface LoadTestDef {
  seed: number;
  speed: number;
  radius: number;
  minSpawnDistance: number;
  repathSeconds: number;
  maxRepathsPerTick: number;
}

export function parseLoadTest(raw: unknown): LoadTestDef {
  const r = new Reader('loadtest.json');
  const o = r.obj(raw);
  return {
    seed: r.num(o, 'seed', { int: true, min: 0 }),
    speed: r.num(o, 'speed', { min: 0.1, max: 50 }),
    radius: r.num(o, 'radius', { min: 0.05, max: 3 }),
    minSpawnDistance: r.num(o, 'minSpawnDistance', { min: 0 }),
    repathSeconds: r.num(o, 'repathSeconds', { min: 0.05 }),
    maxRepathsPerTick: r.num(o, 'maxRepathsPerTick', { int: true, min: 1 }),
  };
}

export interface ZoneDef {
  width: number;
  depth: number;
  cellSize: number;
  navRadius: number;
  playerStart: { x: number; y: number };
  playerSpeed: number;
  playerRadius: number;
  holdRepathSeconds: number;
  obstacles: RectObstacle[];
}

export function parseZone(raw: unknown): ZoneDef {
  const r = new Reader('zone.json');
  const o = r.obj(raw);
  const width = r.num(o, 'width', { min: 10, max: 1000 });
  const depth = r.num(o, 'depth', { min: 10, max: 1000 });
  const playerStart = r.vec(o, 'playerStart');
  if (playerStart.x < 0 || playerStart.x > width || playerStart.y < 0 || playerStart.y > depth) {
    r.fail('playerStart', 'fuera de la zona');
  }
  const obstacles = r.arr(o, 'obstacles').map((v, i) => {
    const c = r.child(`obstacles[${i}]`);
    const ob = c.obj(v);
    return { x: c.num(ob, 'x'), y: c.num(ob, 'y'), w: c.num(ob, 'w', { min: 0.1 }), d: c.num(ob, 'd', { min: 0.1 }) };
  });
  return {
    width,
    depth,
    cellSize: r.num(o, 'cellSize', { min: 0.1, max: 4 }),
    navRadius: r.num(o, 'navRadius', { min: 0, max: 4 }),
    playerStart,
    playerSpeed: r.num(o, 'playerSpeed', { min: 0.1, max: 50 }),
    playerRadius: r.num(o, 'playerRadius', { min: 0.05, max: 3 }),
    holdRepathSeconds: r.num(o, 'holdRepathSeconds', { min: 0.016, max: 2 }),
    obstacles,
  };
}

/** Forma de un área de efecto sobre el plano XZ (ver `src/sim/shapes.ts`). */
export type ShapeDef =
  | { type: 'circle'; radius: number }
  | { type: 'cone'; length: number; angleDeg: number }
  | { type: 'line'; length: number; width: number };

export function parseShape(r: Reader, raw: unknown): ShapeDef {
  const o = r.obj(raw);
  const type = r.str(o, 'type', ['circle', 'cone', 'line']);
  if (type === 'circle') return { type, radius: r.num(o, 'radius', { min: 0.1, max: 50 }) };
  if (type === 'cone') return { type, length: r.num(o, 'length', { min: 0.1, max: 50 }), angleDeg: r.num(o, 'angleDeg', { min: 1, max: 360 }) };
  return { type: 'line', length: r.num(o, 'length', { min: 0.1, max: 100 }), width: r.num(o, 'width', { min: 0.05, max: 20 }) };
}

/** Daño = uniforme en [damageMin, damageMax], ×(1 + critBonus) si sale crítico. Nunca falla. */
export interface DamageDef {
  damageMin: number;
  damageMax: number;
  critChance: number;
  critBonus: number;
}

export function parseDamage(r: Reader, o: Record<string, unknown>, def?: number): DamageDef {
  const damageMin = r.num(o, 'damageMin', { min: 0, def });
  return {
    damageMin,
    damageMax: r.num(o, 'damageMax', { min: damageMin, def }),
    critChance: r.num(o, 'critChance', { min: 0, max: 1, def: 0 }),
    critBonus: r.num(o, 'critBonus', { min: 0, max: 10, def: 0 }),
  };
}

export interface EvadeDef {
  distance: number;
  seconds: number;
  cooldown: number;
  resourceCost: number;
  invulnerableSeconds: number;
}

/** Vida, recurso y estadísticas vienen de la clase (`data/rpg/classes.json`); aquí queda la evasión. */
export interface PlayerDef {
  evade: EvadeDef;
}

export function parsePlayer(raw: unknown): PlayerDef {
  const r = new Reader('player.json');
  const o = r.obj(raw);
  const ec = r.child('evade');
  const ev = ec.obj(o['evade']);
  return {
    evade: {
      distance: ec.num(ev, 'distance', { min: 0.1, max: 30 }),
      seconds: ec.num(ev, 'seconds', { min: 0.02, max: 2 }),
      cooldown: ec.num(ev, 'cooldown', { min: 0 }),
      resourceCost: ec.num(ev, 'resourceCost', { min: 0 }),
      invulnerableSeconds: ec.num(ev, 'invulnerableSeconds', { min: 0, max: 5 }),
    },
  };
}

/** Área de una habilidad: un objetivo, o una forma centrada en el jugador. */
export type AbilityArea = { type: 'single' } | ShapeDef;

/**
 * Resumen de un hechizo (o del ataque básico) con la forma del Slice 01, para
 * el HUD y el render. Lo construye `World.ability()` a partir de `SpellDef`.
 */
export interface AbilityDef extends DamageDef {
  id: string;
  label: string;
  resourceCost: number;
  cooldown: number;
  globalCooldown: number;
  castTime: number;
  range: number;
  area: AbilityArea;
}

export interface SummonDef {
  archetype: string;
  count: number;
  maxAlive: number;
  /** Distancia del punto de invocación al invocador, hacia el jugador. */
  distance: number;
  /** Dispersión de los esbirros alrededor del punto de invocación. */
  spread: number;
}

export interface EnemyAttackDef extends DamageDef {
  effect: 'damage' | 'summon';
  range: number;
  cooldown: number;
  telegraphSeconds: number;
  attackSeconds: number;
  recoverSeconds: number;
  shape: ShapeDef;
  summon: SummonDef | null;
}

export interface EnemyLookDef {
  mesh: 'box' | 'cylinder' | 'cone' | 'sphere';
  color: [number, number, number];
  height: number;
}

export interface ArchetypeDef {
  id: string;
  maxHealth: number;
  radius: number;
  speed: number;
  sightRange: number;
  leashRange: number;
  acquireSeconds: number;
  /** Distancia (entre bordes) a la que se para al perseguir; 0 = la del ataque. */
  preferredRange: number;
  /** Si el jugador está más cerca que esto, retrocede; 0 = nunca. */
  retreatRange: number;
  /** Daño de un solo golpe que provoca Stagger; 0 = inmune. */
  staggerDamage: number;
  staggerSeconds: number;
  corpseSeconds: number;
  look: EnemyLookDef;
  attack: EnemyAttackDef;
}

export interface EnemiesDef {
  repathSeconds: number;
  maxRepathsPerTick: number;
  archetypes: Record<string, ArchetypeDef>;
}

/**
 * Variantes por datos: un arquetipo con `base` copia el arquetipo base y
 * sustituye sólo lo que define; `look` y `attack` se mezclan campo a campo.
 */
function resolveVariants(r: Reader, archRaw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const resolve = (id: string, seen: string[]): Record<string, unknown> => {
    const c = r.child(id);
    const a = c.obj(archRaw[id]);
    if (a['base'] === undefined) return a;
    const baseId = String(a['base']);
    if (typeof a['base'] !== 'string' || !(baseId in archRaw) || baseId.startsWith('_')) c.fail('base', `arquetipo base desconocido "${baseId}"`);
    if (seen.includes(baseId)) c.fail('base', 'herencia circular');
    const b = resolve(baseId, [...seen, id]);
    const merged: Record<string, unknown> = { ...b, ...a };
    delete merged['base'];
    for (const k of ['look', 'attack']) {
      if (a[k] !== undefined) merged[k] = { ...c.child(k).obj(b[k]), ...c.child(k).obj(a[k]) };
    }
    return merged;
  };
  for (const id of Object.keys(archRaw)) out[id] = id.startsWith('_') ? archRaw[id] : resolve(id, [id]);
  return out;
}

export function parseEnemies(raw: unknown): EnemiesDef {
  const r = new Reader('enemies.json');
  const o = r.obj(raw);
  const archRaw = resolveVariants(r.child('archetypes'), r.child('archetypes').obj(o['archetypes']));
  const archetypes: Record<string, ArchetypeDef> = {};
  for (const [id, v] of Object.entries(archRaw)) {
    if (id.startsWith('_')) continue;
    const c = r.child(`archetypes.${id}`);
    const a = c.obj(v);
    const lc = c.child('look');
    const look = lc.obj(a['look']);
    const color = lc.arr(look, 'color');
    if (color.length !== 3 || color.some((x) => typeof x !== 'number' || x < 0 || x > 1)) lc.fail('color', 'se esperaban 3 números en [0, 1]');
    const ac = c.child('attack');
    const at = ac.obj(a['attack']);
    const effect = ac.str(at, 'effect', ['damage', 'summon']) as 'damage' | 'summon';
    let summon: SummonDef | null = null;
    if (effect === 'summon') {
      const sc = ac.child('summon');
      const s = sc.obj(at['summon']);
      summon = {
        archetype: sc.str(s, 'archetype'),
        count: sc.num(s, 'count', { int: true, min: 1, max: 20 }),
        maxAlive: sc.num(s, 'maxAlive', { int: true, min: 1, max: 50 }),
        distance: sc.num(s, 'distance', { min: 0 }),
        spread: sc.num(s, 'spread', { min: 0 }),
      };
    }
    archetypes[id] = {
      id,
      maxHealth: c.num(a, 'maxHealth', { min: 1 }),
      radius: c.num(a, 'radius', { min: 0.1, max: 3 }),
      speed: c.num(a, 'speed', { min: 0, max: 50 }),
      sightRange: c.num(a, 'sightRange', { min: 0 }),
      leashRange: c.num(a, 'leashRange', { min: 1 }),
      acquireSeconds: c.num(a, 'acquireSeconds', { min: 0 }),
      preferredRange: c.num(a, 'preferredRange', { min: 0 }),
      retreatRange: c.num(a, 'retreatRange', { min: 0 }),
      staggerDamage: c.num(a, 'staggerDamage', { min: 0 }),
      staggerSeconds: c.num(a, 'staggerSeconds', { min: 0 }),
      corpseSeconds: c.num(a, 'corpseSeconds', { min: 0 }),
      look: {
        mesh: lc.str(look, 'mesh', ['box', 'cylinder', 'cone', 'sphere']) as EnemyLookDef['mesh'],
        color: color as [number, number, number],
        height: lc.num(look, 'height', { min: 0.2, max: 6 }),
      },
      attack: {
        effect,
        range: ac.num(at, 'range', { min: 0 }),
        cooldown: ac.num(at, 'cooldown', { min: 0 }),
        // Sin aviso no hay ataque justo: el mínimo evita un golpe sin telegraph.
        telegraphSeconds: ac.num(at, 'telegraphSeconds', { min: 0.1 }),
        attackSeconds: ac.num(at, 'attackSeconds', { min: 0 }),
        recoverSeconds: ac.num(at, 'recoverSeconds', { min: 0 }),
        shape: parseShape(ac.child('shape'), at['shape']),
        summon,
        ...parseDamage(ac, at, effect === 'summon' ? 0 : undefined),
      },
    };
  }
  for (const a of Object.values(archetypes)) {
    const s = a.attack.summon;
    if (s && !archetypes[s.archetype]) r.fail(`archetypes.${a.id}.attack.summon.archetype`, `arquetipo desconocido "${s.archetype}"`);
  }
  if (Object.keys(archetypes).length === 0) r.fail('archetypes', 'no hay ningún arquetipo');
  return {
    repathSeconds: r.num(o, 'repathSeconds', { min: 0.05 }),
    maxRepathsPerTick: r.num(o, 'maxRepathsPerTick', { int: true, min: 1 }),
    archetypes,
  };
}

export interface SpawnDef {
  archetype: string;
  x: number;
  y: number;
}

export interface EncounterDef {
  spawns: SpawnDef[];
}

export function parseEncounter(raw: unknown, archetypes: Record<string, ArchetypeDef>, zone: ZoneDef): EncounterDef {
  const r = new Reader('encounter.json');
  const o = r.obj(raw);
  const spawns = r.arr(o, 'spawns').map((v, i) => {
    const c = r.child(`spawns[${i}]`);
    const s = c.obj(v);
    const archetype = c.str(s, 'archetype', Object.keys(archetypes));
    const x = c.num(s, 'x', { min: 0, max: zone.width });
    const y = c.num(s, 'y', { min: 0, max: zone.depth });
    return { archetype, x, y };
  });
  return { spawns };
}
