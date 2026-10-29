// Carga y validación del contenido RPG (`data/rpg/*.json`). Como
// `src/data/schema.ts`: cada campo se comprueba con su ruta, y después se
// cruzan las referencias (hechizo → estado, objeto → set, tabla → objeto…).
// Todo número es PROPUESTA y vive en los JSON.
import { Reader } from '../data/validate';
import {
  ELEMENTS,
  EQUIP_SLOTS,
  ITEM_CATEGORIES,
  PRIMARY_STATS,
  RARITIES,
  type AreaDef,
  type ClassDef,
  type ContentDb,
  type EffectDef,
  type Element,
  type EnemyInfoDef,
  type ItemDef,
  type ItemSetDef,
  type LootTableDef,
  type MerchantDef,
  type PetDef,
  type PrimaryStat,
  type Rarity,
  type SpellDef,
  type StatBlock,
  type StatId,
  type StatusDef,
} from './contracts';
import type { DerivedRule, Mod } from './stats';

/** Ataque de un arma (o sin arma). */
export interface WeaponDef {
  min: number;
  max: number;
  element: Element;
  speed: number;
  range: number;
}

/** Reglas generales que no caben en `ContentDb.progression`. */
export interface RpgRules {
  defaultClass: string;
  derived: DerivedRule[];
  /** Estadística primaria que potencia cada elemento. */
  elementStat: Record<Element, PrimaryStat>;
  /** Ataque básico sin arma equipada. */
  unarmed: WeaponDef;
  /** El básico escala con la estadística principal (× scaling). */
  basicScaling: number;
  /** Fracción del valor que se recupera al vender. */
  sellRatio: number;
  /** Multiplicador de valor por rareza. */
  rarityValue: Record<Rarity, number>;
  rarityColor: Record<Rarity, string>;
  /** Dispersión del botín alrededor del enemigo (m). */
  lootScatter: number;
  /** Distancia a la que el clic recoge un objeto del suelo. */
  pickupReach: number;
  /** Segundos que dura el botín en el suelo. */
  lootLifetime: number;
}

export interface RpgContent extends ContentDb {
  enemies: Record<string, EnemyInfoDef>;
  /** Slice 05: mercaderes del pueblo (vacío si no hay `merchants.json`). */
  merchants: Record<string, MerchantDef>;
  rules: RpgRules;
}

export interface RpgRawFiles {
  classes: unknown;
  spells: unknown;
  statuses: unknown;
  items: unknown;
  sets: unknown;
  pets: unknown;
  loot: unknown;
  enemies: unknown;
  progression: unknown;
  /** Opcional: sin él no hay mercaderes. */
  merchants?: unknown;
}

type Obj = Record<string, unknown>;

const STAT_IDS: readonly string[] = [
  ...PRIMARY_STATS,
  'maxHealth',
  'maxResource',
  'healthRegen',
  'resourceRegen',
  'power',
  'critChance',
  'critBonus',
  'armor',
  'moveSpeed',
  'cooldownReduction',
  'pickupRadius',
  ...ELEMENTS.map((e) => `damage.${e}`),
  ...ELEMENTS.map((e) => `resist.${e}`),
];

/** Entradas de un objeto `{ id: {...} }` sin las claves de comentario (`_…`). */
function entries(r: Reader, o: Obj, key: string): [string, Obj, Reader][] {
  const c = r.child(key);
  const m = c.obj(o[key]);
  return Object.entries(m)
    .filter(([id]) => !id.startsWith('_'))
    .map(([id, v]) => {
      const cr = c.child(id);
      return [id, cr.obj(v), cr];
    });
}

function optStr(r: Reader, o: Obj, key: string, def: string): string {
  return o[key] === undefined ? def : r.str(o, key);
}

function strList(r: Reader, o: Obj, key: string): string[] {
  return r.arr(o, key).map((v, i) => {
    if (typeof v !== 'string' || v.length === 0) r.fail(`${key}[${i}]`, 'se esperaba un texto');
    return v;
  });
}

function stat(r: Reader, o: Obj, key = 'stat'): StatId {
  return r.str(o, key, STAT_IDS) as StatId;
}

function statBlock(r: Reader, o: Obj, key: string): StatBlock {
  if (o[key] === undefined) return {};
  const c = r.child(key);
  const b = c.obj(o[key]);
  const out: StatBlock = {};
  for (const k of Object.keys(b)) {
    if (k.startsWith('_')) continue;
    if (!STAT_IDS.includes(k)) c.fail(k, `estadística desconocida`);
    out[k as StatId] = c.num(b, k);
  }
  return out;
}

function mods(r: Reader, o: Obj, key: string): Mod[] {
  if (o[key] === undefined) return [];
  return r.arr(o, key).map((v, i) => {
    const c = r.child(`${key}[${i}]`);
    const m = c.obj(v);
    return { stat: stat(c, m), op: c.str(m, 'op', ['flat', 'percent']) as 'flat' | 'percent', value: c.num(m, 'value') };
  });
}

function element(r: Reader, o: Obj, key = 'element'): Element {
  return r.str(o, key, ELEMENTS) as Element;
}

function weapon(r: Reader, raw: unknown): WeaponDef {
  const o = r.obj(raw);
  const min = r.num(o, 'min', { min: 0 });
  return {
    min,
    max: r.num(o, 'max', { min }),
    element: element(r, o),
    speed: r.num(o, 'speed', { min: 0.1, max: 10 }),
    range: r.num(o, 'range', { min: 0.3, max: 30 }),
  };
}

export function parseEffect(r: Reader, raw: unknown): EffectDef {
  const o = r.obj(raw);
  const type = r.str(o, 'type', ['damage', 'heal', 'status', 'shield', 'knockback', 'dash', 'teleport', 'restoreResource', 'summon', 'zone']);
  switch (type) {
    case 'damage': {
      const min = r.num(o, 'min', { min: 0 });
      return { type, min, max: r.num(o, 'max', { min }), element: element(r, o), scaling: r.num(o, 'scaling', { min: 0, def: 0 }) };
    }
    case 'heal': {
      const min = r.num(o, 'min', { min: 0 });
      return { type, min, max: r.num(o, 'max', { min }), scaling: r.num(o, 'scaling', { min: 0, def: 0 }) };
    }
    case 'status': {
      const e: EffectDef = { type, statusId: r.str(o, 'statusId') };
      if (o['duration'] !== undefined) e.duration = r.num(o, 'duration', { min: 0.1 });
      if (o['chance'] !== undefined) e.chance = r.num(o, 'chance', { min: 0, max: 1 });
      return e;
    }
    case 'shield':
      return { type, amount: r.num(o, 'amount', { min: 1 }), duration: r.num(o, 'duration', { min: 0.1 }) };
    case 'knockback':
      return { type, distance: r.num(o, 'distance', { min: 0.1, max: 20 }) };
    case 'dash':
      return { type, distance: r.num(o, 'distance', { min: 0.1, max: 30 }) };
    case 'teleport':
      return { type, maxDistance: r.num(o, 'maxDistance', { min: 0.5, max: 40 }) };
    case 'restoreResource':
      return { type, amount: r.num(o, 'amount', { min: 1 }) };
    case 'summon':
      return {
        type,
        archetype: r.str(o, 'archetype'),
        count: r.num(o, 'count', { int: true, min: 1, max: 5 }),
        duration: r.num(o, 'duration', { min: 1 }),
      };
    default: {
      const every = r.num(o, 'every', { min: 0.1 });
      const effects = r.arr(o, 'effects').map((v, i) => parseEffect(r.child(`effects[${i}]`), v));
      if (effects.some((e) => e.type === 'zone')) r.fail('effects', 'una zona no puede contener otra zona');
      return { type: 'zone', radius: r.num(o, 'radius', { min: 0.2, max: 20 }), duration: r.num(o, 'duration', { min: every }), every, effects };
    }
  }
}

function effectList(r: Reader, o: Obj, key: string): EffectDef[] {
  return r.arr(o, key).map((v, i) => parseEffect(r.child(`${key}[${i}]`), v));
}

function area(r: Reader, raw: unknown): AreaDef {
  const o = r.obj(raw);
  const type = r.str(o, 'type', ['self', 'single', 'circle', 'cone', 'line']);
  if (type === 'self' || type === 'single') return { type };
  if (type === 'circle') return { type, radius: r.num(o, 'radius', { min: 0.2, max: 30 }), atTarget: o['atTarget'] === true };
  if (type === 'cone') return { type, length: r.num(o, 'length', { min: 0.2, max: 30 }), angleDeg: r.num(o, 'angleDeg', { min: 1, max: 360 }) };
  return { type: 'line', length: r.num(o, 'length', { min: 0.2, max: 40 }), width: r.num(o, 'width', { min: 0.1, max: 10 }) };
}

function parseClass(id: string, o: Obj, r: Reader): ClassDef {
  const rc = r.child('resource');
  const res = rc.obj(o['resource']);
  const c: ClassDef = {
    id,
    name: r.str(o, 'name'),
    description: r.str(o, 'description'),
    role: r.str(o, 'role'),
    icon: r.str(o, 'icon'),
    resource: {
      id: rc.str(res, 'id'),
      name: rc.str(res, 'name'),
      color: rc.str(res, 'color'),
      max: rc.num(res, 'max', { min: 1 }),
      regenPerSecond: rc.num(res, 'regenPerSecond', { min: 0 }),
    },
    baseStats: statBlock(r, o, 'baseStats'),
    statsPerLevel: statBlock(r, o, 'statsPerLevel'),
    affinity: r.arr(o, 'affinity').map((v, i) => {
      if (!(ELEMENTS as readonly unknown[]).includes(v)) r.fail(`affinity[${i}]`, `debe ser uno de ${ELEMENTS.join(', ')}`);
      return v as Element;
    }),
    affinityBonus: r.num(o, 'affinityBonus', { min: 0, max: 200 }),
    startingSpells: strList(r, o, 'startingSpells'),
    startingItems: r.arr(o, 'startingItems').map((v, i) => {
      const c2 = r.child(`startingItems[${i}]`);
      const si = c2.obj(v);
      return { itemId: c2.str(si, 'itemId'), quantity: c2.num(si, 'quantity', { int: true, min: 1, def: 1 }) };
    }),
    startingHotbar: r.arr(o, 'startingHotbar').map((v, i) => {
      if (v !== null && (typeof v !== 'string' || v.length === 0)) r.fail(`startingHotbar[${i}]`, 'se esperaba un id de hechizo o null');
      return v as string | null;
    }),
  };
  if (o['mainStat'] !== undefined) c.mainStat = r.str(o, 'mainStat', PRIMARY_STATS) as PrimaryStat;
  return c;
}

function parseSpell(id: string, o: Obj, r: Reader): SpellDef {
  const pr = r.child('perRank');
  const per = pr.obj(o['perRank']);
  const a = area(r.child('area'), o['area']);
  const range = r.num(o, 'range', { min: 0, max: 60 });
  if ((a.type === 'single' || (a.type === 'circle' && a.atTarget)) && range <= 0) r.fail('range', 'un hechizo con objetivo necesita range > 0');
  const classId = o['classId'];
  if (classId !== null && typeof classId !== 'string') r.fail('classId', 'se esperaba un id de clase o null');
  const effects = effectList(r, o, 'effects');
  if (effects.length === 0) r.fail('effects', 'un hechizo necesita al menos un efecto');
  return {
    id,
    name: r.str(o, 'name'),
    description: r.str(o, 'description'),
    icon: r.str(o, 'icon'),
    element: element(r, o),
    classId,
    resourceCost: r.num(o, 'resourceCost', { min: 0 }),
    cooldown: r.num(o, 'cooldown', { min: 0 }),
    globalCooldown: r.num(o, 'globalCooldown', { min: 0, max: 5 }),
    castTime: r.num(o, 'castTime', { min: 0, max: 5 }),
    range,
    area: a,
    projectileSpeed: o['projectileSpeed'] === null || o['projectileSpeed'] === undefined ? null : r.num(o, 'projectileSpeed', { min: 1, max: 200 }),
    effects,
    maxRank: r.num(o, 'maxRank', { int: true, min: 1, max: 10 }),
    perRank: { effectPercent: pr.num(per, 'effectPercent', { min: 0, max: 200 }), costPercent: pr.num(per, 'costPercent', { min: 0, max: 50 }) },
    critChance: r.num(o, 'critChance', { min: 0, max: 1, def: 0 }),
    critBonus: r.num(o, 'critBonus', { min: 0, max: 10, def: 0 }),
    tags: o['tags'] === undefined ? [] : strList(r, o, 'tags'),
  };
}

function parseStatus(id: string, o: Obj, r: Reader): StatusDef {
  const s: StatusDef = {
    id,
    name: r.str(o, 'name'),
    description: r.str(o, 'description'),
    icon: r.str(o, 'icon'),
    kind: r.str(o, 'kind', ['buff', 'debuff']) as 'buff' | 'debuff',
    duration: r.num(o, 'duration', { min: 0.1 }),
    maxStacks: r.num(o, 'maxStacks', { int: true, min: 1, max: 20 }),
    modifiers: mods(r, o, 'modifiers'),
  };
  if (o['tick'] !== undefined) {
    const tr = r.child('tick');
    const t = tr.obj(o['tick']);
    const effect = parseEffect(tr.child('effect'), t['effect']);
    if (effect.type !== 'damage' && effect.type !== 'heal' && effect.type !== 'restoreResource') tr.fail('effect', 'un estado sólo puede repetir daño, curación o recurso');
    s.tick = { every: tr.num(t, 'every', { min: 0.1 }), effect };
  }
  if (o['control'] !== undefined) s.control = r.str(o, 'control', ['stun', 'root', 'silence']) as 'stun' | 'root' | 'silence';
  return s;
}

function parseItem(id: string, o: Obj, r: Reader): ItemDef {
  const category = r.str(o, 'category', ITEM_CATEGORIES) as ItemDef['category'];
  const slotRaw = o['slot'];
  const slot = slotRaw === null || slotRaw === undefined ? null : (r.str(o, 'slot', [...EQUIP_SLOTS, 'ring']) as ItemDef['slot']);
  const equippable = category === 'weapon' || category === 'armor' || category === 'jewel';
  if (equippable && slot === null) r.fail('slot', 'un objeto equipable necesita hueco');
  if (!equippable && slot !== null) r.fail('slot', 'sólo armas, armaduras y joyas tienen hueco');
  if (category === 'weapon' && slot !== 'weapon') r.fail('slot', 'un arma va en el hueco weapon');
  const maxStack = r.num(o, 'maxStack', { int: true, min: 1, max: 999 });
  const rolls = r.arr(o, 'rolls').map((v, i) => {
    const c = r.child(`rolls[${i}]`);
    const ro = c.obj(v);
    const min = c.num(ro, 'min');
    return { stat: stat(c, ro), op: c.str(ro, 'op', ['flat', 'percent']) as 'flat' | 'percent', min, max: c.num(ro, 'max', { min }) };
  });
  if (rolls.length > 0 && maxStack > 1) r.fail('maxStack', 'un objeto con tiradas no se apila (cada copia es distinta)');
  const it: ItemDef = {
    id,
    name: r.str(o, 'name'),
    description: r.str(o, 'description'),
    icon: r.str(o, 'icon'),
    category,
    slot,
    rarity: r.str(o, 'rarity', RARITIES) as Rarity,
    level: r.num(o, 'level', { int: true, min: 1, max: 100 }),
    value: r.num(o, 'value', { min: 0 }),
    maxStack,
    implicit: mods(r, o, 'implicit'),
    rolls,
    dropWeight: r.num(o, 'dropWeight', { min: 0 }),
  };
  if (o['weapon'] !== undefined) it.weapon = weapon(r.child('weapon'), o['weapon']);
  if (category === 'weapon' && !it.weapon) r.fail('weapon', 'un arma necesita daño');
  if (o['use'] !== undefined) {
    const ur = r.child('use');
    const u = ur.obj(o['use']);
    const kind = ur.str(u, 'kind', ['effects', 'learnSpell', 'summonPet']);
    if (kind === 'effects') it.use = { kind, effects: effectList(ur, u, 'effects'), cooldown: ur.num(u, 'cooldown', { min: 0 }) };
    else if (kind === 'learnSpell') it.use = { kind, spellId: ur.str(u, 'spellId') };
    else it.use = { kind: 'summonPet', petId: ur.str(u, 'petId') };
  }
  const needsUse: Partial<Record<ItemDef['category'], string>> = { consumable: 'effects', scroll: 'learnSpell', petCharm: 'summonPet' };
  const want = needsUse[category];
  if (want && it.use?.kind !== want) r.fail('use', `un objeto ${category} necesita use.kind = ${want}`);
  if (o['setId'] !== undefined) it.setId = r.str(o, 'setId');
  return it;
}

function parseSet(id: string, o: Obj, r: Reader): ItemSetDef {
  return {
    id,
    name: r.str(o, 'name'),
    bonuses: r.arr(o, 'bonuses').map((v, i) => {
      const c = r.child(`bonuses[${i}]`);
      const b = c.obj(v);
      return { pieces: c.num(b, 'pieces', { int: true, min: 2, max: 9 }), modifiers: mods(c, b, 'modifiers') };
    }),
  };
}

function parsePet(id: string, o: Obj, r: Reader): PetDef {
  const behavior = r.str(o, 'behavior', ['fighter', 'collector', 'guardian']) as PetDef['behavior'];
  const p: PetDef = {
    id,
    name: r.str(o, 'name'),
    description: r.str(o, 'description'),
    icon: r.str(o, 'icon'),
    behavior,
    speed: r.num(o, 'speed', { min: 0.5, max: 30 }),
    followDistance: r.num(o, 'followDistance', { min: 0.5, max: 10 }),
    ownerBonus: mods(r, o, 'ownerBonus'),
    maxHealth: r.num(o, 'maxHealth', { min: 1, def: 50 }),
    reach: r.num(o, 'reach', { min: 1, max: 30, def: 8 }),
  };
  if (o['attack'] !== undefined) {
    const ar = r.child('attack');
    const a = ar.obj(o['attack']);
    const min = ar.num(a, 'min', { min: 0 });
    p.attack = { min, max: ar.num(a, 'max', { min }), element: element(ar, a), range: ar.num(a, 'range', { min: 0.3 }), cooldown: ar.num(a, 'cooldown', { min: 0.1 }) };
  }
  if (o['aura'] !== undefined) {
    const ar = r.child('aura');
    const a = ar.obj(o['aura']);
    p.aura = { every: ar.num(a, 'every', { min: 0.2 }), effect: parseEffect(ar.child('effect'), a['effect']) };
  }
  if (behavior === 'fighter' && !p.attack) r.fail('attack', 'una mascota luchadora necesita ataque');
  if (behavior === 'guardian' && !p.aura) r.fail('aura', 'una mascota guardiana necesita aura');
  return p;
}

function parseLoot(id: string, o: Obj, r: Reader): LootTableDef {
  const gr = r.child('gold');
  const g = gr.obj(o['gold']);
  const gmin = gr.num(g, 'min', { int: true, min: 0 });
  return {
    id,
    gold: { min: gmin, max: gr.num(g, 'max', { int: true, min: gmin }), chance: gr.num(g, 'chance', { min: 0, max: 1 }) },
    rolls: r.num(o, 'rolls', { int: true, min: 0, max: 20 }),
    chance: r.num(o, 'chance', { min: 0, max: 1 }),
    entries: r.arr(o, 'entries').map((v, i) => {
      const c = r.child(`entries[${i}]`);
      const e = c.obj(v);
      const out: LootTableDef['entries'][number] = { itemId: c.str(e, 'itemId'), weight: c.num(e, 'weight', { min: 0 }) };
      if (e['min'] !== undefined) out.min = c.num(e, 'min', { int: true, min: 1 });
      if (e['max'] !== undefined) out.max = c.num(e, 'max', { int: true, min: out.min ?? 1 });
      return out;
    }),
  };
}

function parseEnemyInfo(id: string, o: Obj, r: Reader): EnemyInfoDef {
  const lt = o['lootTable'];
  if (lt !== null && (typeof lt !== 'string' || lt.length === 0)) r.fail('lootTable', 'se esperaba un id de tabla o null');
  return {
    id,
    name: r.str(o, 'name'),
    level: r.num(o, 'level', { int: true, min: 1, max: 100 }),
    xp: r.num(o, 'xp', { min: 0 }),
    lootTable: lt,
    element: o['element'] === undefined ? 'physical' : element(r, o),
    stats: statBlock(r, o, 'stats'),
  };
}

function parseMerchant(id: string, o: Obj, r: Reader): MerchantDef {
  const pr = r.child('position');
  const po = pr.obj(o['position']);
  return {
    id,
    name: r.str(o, 'name'),
    title: r.str(o, 'title'),
    greeting: r.str(o, 'greeting'),
    position: { x: pr.num(po, 'x'), y: pr.num(po, 'y') },
    look: optStr(r, o, 'look', 'default'),
    buyMultiplier: r.num(o, 'buyMultiplier', { min: 0.1, max: 20 }),
    buybackSize: r.num(o, 'buybackSize', { int: true, min: 0, max: 40 }),
    stock: r.arr(o, 'stock').map((v, i) => {
      const c = r.child(`stock[${i}]`);
      const e = c.obj(v);
      const q = e['quantity'];
      if (q !== null && (typeof q !== 'number' || !Number.isInteger(q) || q < 1)) c.fail('quantity', 'se esperaba un entero ≥ 1 o null (ilimitado)');
      return { itemId: c.str(e, 'itemId'), quantity: q as number | null };
    }),
  };
}

function parseRarityMap<T>(r: Reader, o: Obj, key: string, read: (rr: Reader, oo: Obj, k: string) => T): Record<Rarity, T> {
  const c = r.child(key);
  const m = c.obj(o[key]);
  const out = {} as Record<Rarity, T>;
  for (const k of RARITIES) out[k] = read(c, m, k);
  return out;
}

/**
 * Valida los nueve archivos y sus referencias cruzadas. `knownArchetypes`
 * son los arquetipos de `data/enemies.json` (cada uno necesita su ficha RPG).
 */
export function parseRpgContent(raw: RpgRawFiles, knownArchetypes: readonly string[]): RpgContent {
  const collect = <T>(file: string, key: string, src: unknown, parse: (id: string, o: Obj, r: Reader) => T): Record<string, T> => {
    const r = new Reader(`rpg/${file}`);
    const out: Record<string, T> = {};
    for (const [id, o, cr] of entries(r, r.obj(src), key)) out[id] = parse(id, o, cr);
    return out;
  };
  const classes = collect('classes.json', 'classes', raw.classes, parseClass);
  const spells = collect('spells.json', 'spells', raw.spells, parseSpell);
  const statuses = collect('statuses.json', 'statuses', raw.statuses, parseStatus);
  const items = collect('items.json', 'items', raw.items, parseItem);
  const sets = collect('sets.json', 'sets', raw.sets, parseSet);
  const pets = collect('pets.json', 'pets', raw.pets, parsePet);
  const lootTables = collect('loot.json', 'tables', raw.loot, parseLoot);
  const enemies = collect('enemies.json', 'enemies', raw.enemies, parseEnemyInfo);
  const merchants = raw.merchants === undefined ? {} : collect('merchants.json', 'merchants', raw.merchants, parseMerchant);

  const pr = new Reader('rpg/progression.json');
  const po = pr.obj(raw.progression);
  const xr = pr.child('xp');
  const xo = xr.obj(po['xp']);
  const progression: ContentDb['progression'] = {
    maxLevel: pr.num(po, 'maxLevel', { int: true, min: 1, max: 100 }),
    xp: { base: xr.num(xo, 'base', { min: 1 }), exponent: xr.num(xo, 'exponent', { min: 0, max: 4 }) },
    statPointsPerLevel: pr.num(po, 'statPointsPerLevel', { int: true, min: 0, max: 20 }),
    resistCap: pr.num(po, 'resistCap', { min: 0, max: 100 }),
    hotbarSize: pr.num(po, 'hotbarSize', { int: true, min: 1, max: 12 }),
    inventorySize: pr.num(po, 'inventorySize', { int: true, min: 4, max: 200 }),
  };
  const rr = pr.child('rules');
  const ro = rr.obj(po['rules']);
  const rules: RpgRules = {
    defaultClass: rr.str(ro, 'defaultClass'),
    derived: rr.arr(ro, 'derived').map((v, i) => {
      const c = rr.child(`derived[${i}]`);
      const d = c.obj(v);
      return { from: c.str(d, 'from', PRIMARY_STATS) as PrimaryStat, to: stat(c, d, 'to'), op: c.str(d, 'op', ['flat', 'percent']) as 'flat' | 'percent', per: c.num(d, 'per') };
    }),
    elementStat: (() => {
      const er = rr.child('elementStat');
      const eo = er.obj(ro['elementStat']);
      const out = {} as Record<Element, PrimaryStat>;
      for (const el of ELEMENTS) out[el] = er.str(eo, el, PRIMARY_STATS) as PrimaryStat;
      return out;
    })(),
    unarmed: weapon(rr.child('unarmed'), ro['unarmed']),
    basicScaling: rr.num(ro, 'basicScaling', { min: 0 }),
    sellRatio: rr.num(ro, 'sellRatio', { min: 0, max: 1 }),
    rarityValue: parseRarityMap(rr, ro, 'rarityValue', (c, m, k) => c.num(m, k, { min: 0 })),
    rarityColor: parseRarityMap(rr, ro, 'rarityColor', (c, m, k) => c.str(m, k)),
    lootScatter: rr.num(ro, 'lootScatter', { min: 0, max: 5 }),
    pickupReach: rr.num(ro, 'pickupReach', { min: 0.3, max: 5 }),
    lootLifetime: rr.num(ro, 'lootLifetime', { min: 1 }),
  };
  for (const d of rules.derived) if ((PRIMARY_STATS as readonly string[]).includes(d.to)) rr.fail('derived', `una regla derivada no puede dar una primaria (${d.to})`);

  const c: RpgContent = { classes, spells, statuses, items, sets, pets, lootTables, progression, enemies, merchants, rules };
  checkReferences(c, knownArchetypes);
  return c;
}

function checkReferences(c: RpgContent, archetypes: readonly string[]): void {
  const fail = (file: string, path: string, msg: string): never => new Reader(`rpg/${file}`).fail(path, msg);
  const needItem = (file: string, path: string, id: string): void => {
    if (!c.items[id]) fail(file, path, `objeto desconocido "${id}"`);
  };
  const checkEffects = (file: string, path: string, list: EffectDef[]): void => {
    list.forEach((e, i) => {
      if (e.type === 'status' && !c.statuses[e.statusId]) fail(file, `${path}[${i}].statusId`, `estado desconocido "${e.statusId}"`);
      if (e.type === 'summon' && !c.pets[e.archetype]) fail(file, `${path}[${i}].archetype`, `mascota desconocida "${e.archetype}"`);
      if (e.type === 'zone') checkEffects(file, `${path}[${i}].effects`, e.effects);
    });
  };
  if (!c.statuses['shield']) fail('statuses.json', 'statuses.shield', 'falta (los efectos de escudo lo usan)');
  if (!c.classes[c.rules.defaultClass]) fail('progression.json', 'rules.defaultClass', `clase desconocida "${c.rules.defaultClass}"`);
  for (const cl of Object.values(c.classes)) {
    const p = `classes.${cl.id}`;
    if (cl.startingHotbar.length > c.progression.hotbarSize) fail('classes.json', `${p}.startingHotbar`, `más huecos que hotbarSize (${c.progression.hotbarSize})`);
    for (const s of cl.startingSpells) if (!c.spells[s]) fail('classes.json', `${p}.startingSpells`, `hechizo desconocido "${s}"`);
    for (const s of cl.startingHotbar) if (s !== null && !cl.startingSpells.includes(s)) fail('classes.json', `${p}.startingHotbar`, `"${s}" no está en startingSpells`);
    for (const si of cl.startingItems) needItem('classes.json', `${p}.startingItems`, si.itemId);
  }
  for (const s of Object.values(c.spells)) {
    if (s.classId !== null && !c.classes[s.classId]) fail('spells.json', `spells.${s.id}.classId`, `clase desconocida "${s.classId}"`);
    checkEffects('spells.json', `spells.${s.id}.effects`, s.effects);
  }
  for (const st of Object.values(c.statuses)) if (st.tick) checkEffects('statuses.json', `statuses.${st.id}.tick`, [st.tick.effect]);
  for (const it of Object.values(c.items)) {
    const p = `items.${it.id}`;
    if (it.setId && !c.sets[it.setId]) fail('items.json', `${p}.setId`, `set desconocido "${it.setId}"`);
    if (it.use?.kind === 'learnSpell' && !c.spells[it.use.spellId]) fail('items.json', `${p}.use.spellId`, `hechizo desconocido "${it.use.spellId}"`);
    if (it.use?.kind === 'summonPet' && !c.pets[it.use.petId]) fail('items.json', `${p}.use.petId`, `mascota desconocida "${it.use.petId}"`);
    if (it.use?.kind === 'effects') checkEffects('items.json', `${p}.use.effects`, it.use.effects);
  }
  for (const set of Object.values(c.sets)) {
    const pieces = Object.values(c.items).filter((i) => i.setId === set.id).length;
    for (const b of set.bonuses) if (b.pieces > pieces) fail('sets.json', `sets.${set.id}`, `bono de ${b.pieces} piezas pero el set sólo tiene ${pieces}`);
  }
  for (const p of Object.values(c.pets)) if (p.aura) checkEffects('pets.json', `pets.${p.id}.aura`, [p.aura.effect]);
  for (const t of Object.values(c.lootTables)) t.entries.forEach((e, i) => needItem('loot.json', `tables.${t.id}.entries[${i}]`, e.itemId));
  for (const e of Object.values(c.enemies)) {
    if (!archetypes.includes(e.id)) fail('enemies.json', `enemies.${e.id}`, 'no existe ese arquetipo en data/enemies.json');
    if (e.lootTable !== null && !c.lootTables[e.lootTable]) fail('enemies.json', `enemies.${e.id}.lootTable`, `tabla desconocida "${e.lootTable}"`);
  }
  for (const m of Object.values(c.merchants)) m.stock.forEach((e, i) => needItem('merchants.json', `merchants.${m.id}.stock[${i}]`, e.itemId));
  for (const a of archetypes) if (!c.enemies[a]) fail('enemies.json', 'enemies', `falta la ficha RPG del arquetipo "${a}"`);
}
