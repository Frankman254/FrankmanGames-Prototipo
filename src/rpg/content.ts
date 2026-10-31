// Carga y validación del contenido RPG (`data/rpg/*.json`). Como
// `src/data/schema.ts`: cada campo se comprueba con su ruta, y después se
// cruzan las referencias (hechizo → estado, objeto → set, tabla → objeto…).
// Todo número es PROPUESTA y vive en los JSON.
import { Reader } from '../data/validate';
import {
  ELEMENTS,
  EQUIP_SLOTS,
  ITEM_CATEGORIES,
  ITEM_KINDS,
  PRIMARY_STATS,
  RARITIES,
  QUEST_STATES,
  type AreaDef,
  type ClassDef,
  type DialogueAction,
  type DialogueCondition,
  type DialogueDef,
  type ContentDb,
  type EffectDef,
  type Element,
  type EnemyInfoDef,
  type ItemDef,
  type ItemSetDef,
  type LootTableDef,
  type MerchantDef,
  type NpcDef,
  type PetDef,
  type QuestDef,
  type QuestObjectiveDef,
  type QuestState,
  type PrimaryStat,
  type Rarity,
  type SpellDef,
  type StatBlock,
  type StatId,
  type StatusDef,
} from './contracts';
import type { EnergyDef } from './energy';
import type { SpoilsRules } from './spoils';
import { inferKind, kindFitsSlot, slotForKind } from './items';
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
  /**
   * `equipo-objetos`: dos armas. El básico alterna mano derecha e izquierda;
   * el golpe de la izquierda hace `offhandDamage` × su daño, y cada golpe
   * llega `attackSpeed` × más rápido. Por defecto 0,75 y 1,2.
   */
  dualWield: { offhandDamage: number; attackSpeed: number };
}

/** Pesca (Slice 05): reglas y estanques. */
export interface FishingSpotDef {
  id: string;
  name: string;
  x: number;
  y: number;
  radius: number;
  lootTable: string;
  /** Tabla de noche (peces que sólo pican de noche), o null = la misma de día. */
  nightLootTable: string | null;
}

export interface FishingDef {
  rules: {
    /** Distancia máxima (m) del jugador a la orilla para lanzar. */
    castRange: number;
    biteSeconds: { min: number; max: number };
    /** Ventana para reaccionar cuando pica. */
    reactSeconds: number;
    /** Probabilidad de un amago (el corcho tiembla sin picar) antes de la picada. */
    nibbleChance: number;
  };
  spots: Record<string, FishingSpotDef>;
}

export interface RpgContent extends ContentDb {
  enemies: Record<string, EnemyInfoDef>;
  /** Slice 05: mercaderes del pueblo (vacío si no hay `merchants.json`). */
  merchants: Record<string, MerchantDef>;
  /** Slice 05: pesca (sin estanques si no hay `fishing.json`). */
  fishing: FishingDef;
  /** Slice 06: PNJ con diálogo (vacío si no hay `npcs.json`). Los mercaderes sin entrada aquí abren la tienda directamente. */
  npcs: Record<string, NpcDef>;
  /** Slice 06: misiones (vacío si no hay `quests.json`). */
  quests: Record<string, QuestDef>;
  rules: RpgRules;
  /** `muerte-botin`: energía («Pulso»); valores por defecto si no hay `energy.json`. */
  energy: EnergyDef;
  /** `muerte-botin`: fin de combate y reparto del botín; botín al suelo si no hay `spoils.json`. */
  spoils: SpoilsRules;
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
  /** Opcional: sin él no hay pesca. */
  fishing?: unknown;
  /** Opcional (Slice 06): sin él no hay PNJ con diálogo. */
  npcs?: unknown;
  /** Opcional (Slice 06): sin él no hay misiones. */
  quests?: unknown;
  /** Opcional (`muerte-botin`): sin él, energía por defecto. */
  energy?: unknown;
  /** Opcional (`muerte-botin`): sin él, el botín cae al suelo. */
  spoils?: unknown;
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
  const type = r.str(o, 'type', ['damage', 'heal', 'status', 'shield', 'knockback', 'dash', 'teleport', 'restoreResource', 'summon', 'zone', 'blink', 'swap', 'pull', 'recoil']);
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
    case 'blink':
      return { type, maxDistance: r.num(o, 'maxDistance', { min: 0.5, max: 40 }) };
    case 'swap':
      return { type };
    case 'pull':
      return { type, distance: r.num(o, 'distance', { min: 0.1, max: 30 }) };
    case 'recoil':
      return { type, distance: r.num(o, 'distance', { min: 0.1, max: 20 }) };
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
    unlockLevel: r.num(o, 'unlockLevel', { int: true, min: 1, max: 100, def: 1 }),
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
    friendlyFire: flag(r, o, 'friendlyFire'),
    castWhileMoving: flag(r, o, 'castWhileMoving'),
  };
}

function flag(r: Reader, o: Obj, key: string): boolean {
  const v = o[key];
  if (v !== undefined && typeof v !== 'boolean') r.fail(key, 'se esperaba true o false');
  return v === true;
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
  if (flag(r, o, 'immune')) s.immune = true;
  if (flag(r, o, 'reflect')) s.reflect = true;
  if (flag(r, o, 'rewind')) s.rewind = true;
  if (o['counter'] !== undefined) {
    const cr = r.child('counter');
    s.counter = { percent: cr.num(cr.obj(o['counter']), 'percent', { min: 1, max: 500 }) };
  }
  if ((s.immune || s.reflect || s.counter || s.rewind) && s.kind !== 'buff') r.fail('kind', 'inmunidad, reenvío, contra y retroceso son mejoras (buff)');
  return s;
}

function parseItem(id: string, o: Obj, r: Reader): ItemDef {
  const category = r.str(o, 'category', ITEM_CATEGORIES) as ItemDef['category'];
  const slotRaw = o['slot'];
  const slot = slotRaw === null || slotRaw === undefined ? null : (r.str(o, 'slot', [...EQUIP_SLOTS, 'ring']) as ItemDef['slot']);
  const equippable = category === 'weapon' || category === 'armor' || category === 'jewel';
  if (equippable && slot === null) r.fail('slot', 'un objeto equipable necesita hueco');
  if (!equippable && slot !== null) r.fail('slot', 'sólo armas, armaduras y joyas tienen hueco');
  if (category === 'weapon' && slot !== 'weapon') r.fail('slot', 'un arma va en el hueco weapon (las de una mano valen también para la izquierda)');
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
  // `equipo-objetos`: tipo concreto (deducido si falta) y manos de las armas.
  if (o['kind'] !== undefined) {
    const kind = r.str(o, 'kind', ITEM_KINDS) as NonNullable<ItemDef['kind']>;
    if (!kindFitsSlot(kind, category, slot)) r.fail('kind', `«${kind}» no encaja con category ${category} y slot ${String(slot)} (va en ${String(slotForKind(kind))})`);
    it.kind = kind;
  } else {
    it.kind = inferKind(it);
  }
  if (o['hands'] !== undefined) {
    if (!it.weapon) r.fail('hands', 'sólo las armas ocupan manos');
    it.hands = r.num(o, 'hands', { int: true, min: 1, max: 2 }) as 1 | 2;
  }
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

function parseFishing(raw: unknown): FishingDef {
  const r = new Reader('rpg/fishing.json');
  const o = r.obj(raw);
  const rr = r.child('rules');
  const ro = rr.obj(o['rules']);
  const br = rr.child('biteSeconds');
  const bo = br.obj(ro['biteSeconds']);
  const bmin = br.num(bo, 'min', { min: 0.2 });
  const spots: Record<string, FishingSpotDef> = {};
  for (const [id, so, sr] of entries(r, o, 'spots')) {
    spots[id] = { id, name: sr.str(so, 'name'), x: sr.num(so, 'x'), y: sr.num(so, 'y'), radius: sr.num(so, 'radius', { min: 1 }), lootTable: sr.str(so, 'lootTable'), nightLootTable: so['nightLootTable'] === undefined ? null : sr.str(so, 'nightLootTable') };
  }
  return {
    rules: {
      castRange: rr.num(ro, 'castRange', { min: 0.5, max: 30 }),
      biteSeconds: { min: bmin, max: br.num(bo, 'max', { min: bmin }) },
      reactSeconds: rr.num(ro, 'reactSeconds', { min: 0.2, max: 10 }),
      nibbleChance: rr.num(ro, 'nibbleChance', { min: 0, max: 1 }),
    },
    spots,
  };
}

// ─── Energía y botín de fin de combate (`muerte-botin`) ─────────────────────

const DEFAULT_ENERGY: EnergyDef = {
  id: 'pulse',
  name: 'Pulso',
  description: '',
  color: '#e0465a',
  max: 100,
  start: 100,
  deathCost: 0,
  regenPerMinute: 0,
  rest: { radius: 0, perSecond: 0 },
  items: {},
  penalty: { mode: 'weakened', name: '', description: '', clearAt: 1, modifiers: [] },
};

const DEFAULT_SPOILS: SpoilsRules = { lootMode: 'ground', calmSeconds: 3, autoCloseSeconds: 12, weights: { damage: 1, healing: 0, time: 0 }, minXpShare: 1 };

function parseEnergy(raw: unknown): EnergyDef {
  const r = new Reader('rpg/energy.json');
  const o = r.obj(raw);
  const max = r.num(o, 'max', { min: 1, max: 100000 });
  const rr = r.child('rest');
  const ro = rr.obj(o['rest']);
  const ir = r.child('items');
  const io = ir.obj(o['items'] ?? {});
  const items: Record<string, number> = {};
  for (const k of Object.keys(io)) if (!k.startsWith('_')) items[k] = ir.num(io, k, { min: 0, max });
  const pr = r.child('penalty');
  const po = pr.obj(o['penalty']);
  return {
    id: r.str(o, 'id'),
    name: r.str(o, 'name'),
    description: optStr(r, o, 'description', ''),
    color: optStr(r, o, 'color', '#e0465a'),
    max,
    start: r.num(o, 'start', { min: 0, max }),
    deathCost: r.num(o, 'deathCost', { min: 0, max }),
    regenPerMinute: r.num(o, 'regenPerMinute', { min: 0 }),
    rest: { radius: rr.num(ro, 'radius', { min: 0, max: 50 }), perSecond: rr.num(ro, 'perSecond', { min: 0 }) },
    items,
    penalty: {
      mode: pr.str(po, 'mode', ['weakened']) as 'weakened',
      name: pr.str(po, 'name'),
      description: optStr(pr, po, 'description', ''),
      clearAt: pr.num(po, 'clearAt', { min: 0.01, max }),
      modifiers: mods(pr, po, 'modifiers'),
    },
  };
}

function parseSpoils(raw: unknown): SpoilsRules {
  const r = new Reader('rpg/spoils.json');
  const o = r.obj(raw);
  const wr = r.child('weights');
  const wo = wr.obj(o['weights']);
  const weights = { damage: wr.num(wo, 'damage', { min: 0 }), healing: wr.num(wo, 'healing', { min: 0 }), time: wr.num(wo, 'time', { min: 0 }) };
  if (weights.damage + weights.healing + weights.time <= 0) r.fail('weights', 'algún peso debe ser > 0');
  return {
    lootMode: r.str(o, 'lootMode', ['window', 'ground']) as 'window' | 'ground',
    calmSeconds: r.num(o, 'calmSeconds', { min: 0.2, max: 60 }),
    autoCloseSeconds: r.num(o, 'autoCloseSeconds', { min: 1, max: 600 }),
    weights,
    minXpShare: r.num(o, 'minXpShare', { min: 0, max: 1 }),
  };
}

// ─── Misiones y diálogos (Slice 06) ─────────────────────────────────────────

function optList<T>(r: Reader, o: Obj, key: string, read: (rr: Reader, v: unknown) => T): T[] {
  if (o[key] === undefined) return [];
  return r.arr(o, key).map((v, i) => read(r.child(`${key}[${i}]`), v));
}

function parseCondition(r: Reader, raw: unknown): DialogueCondition {
  const o = r.obj(raw);
  const type = r.str(o, 'type', ['quest', 'level', 'hasItem', 'not']);
  switch (type) {
    case 'quest': {
      const st = o['states'] === undefined ? [r.str(o, 'state', QUEST_STATES)] : strList(r, o, 'states');
      st.forEach((x, i) => {
        if (!(QUEST_STATES as readonly string[]).includes(x)) r.fail(`states[${i}]`, `debe ser uno de ${QUEST_STATES.join(', ')}`);
      });
      return { type, questId: r.str(o, 'questId'), states: st as QuestState[] };
    }
    case 'level': {
      const min = r.num(o, 'min', { int: true, min: 1, def: 1 });
      return { type, min, max: r.num(o, 'max', { int: true, min, def: 999 }) };
    }
    case 'hasItem':
      return { type, itemId: r.str(o, 'itemId'), quantity: r.num(o, 'quantity', { int: true, min: 1, def: 1 }) };
    default:
      return { type: 'not', condition: parseCondition(r.child('condition'), o['condition']) };
  }
}

function parseAction(r: Reader, raw: unknown): DialogueAction {
  const o = r.obj(raw);
  const type = r.str(o, 'type', ['acceptQuest', 'completeQuest', 'openShop']);
  if (type === 'openShop') return { type };
  return { type: type as 'acceptQuest' | 'completeQuest', questId: r.str(o, 'questId') };
}

function parseDialogue(r: Reader, raw: unknown): DialogueDef {
  const o = r.obj(raw);
  const nodes: DialogueDef['nodes'] = {};
  for (const [id, no, nr] of entries(r, o, 'nodes')) {
    nodes[id] = {
      text: nr.str(no, 'text'),
      options: optList(nr, no, 'options', (or, v) => {
        const op = or.obj(v);
        const next = op['next'];
        if (next !== undefined && next !== null && (typeof next !== 'string' || next.length === 0)) or.fail('next', 'se esperaba un id de nodo o null');
        return {
          text: or.str(op, 'text'),
          conditions: optList(or, op, 'conditions', parseCondition),
          actions: optList(or, op, 'actions', parseAction),
          next: (next as string | undefined) ?? null,
        };
      }),
    };
  }
  const entry = r.arr(o, 'entry').map((v, i) => {
    const c = r.child(`entry[${i}]`);
    const e = c.obj(v);
    const node = c.str(e, 'node');
    if (!nodes[node]) c.fail('node', `nodo desconocido "${node}"`);
    return { node, conditions: optList(c, e, 'conditions', parseCondition) };
  });
  if (entry.length === 0) r.fail('entry', 'hace falta al menos una entrada');
  for (const [id, n] of Object.entries(nodes)) {
    n.options.forEach((op, i) => {
      if (op.next !== null && !nodes[op.next]) r.fail(`nodes.${id}.options[${i}].next`, `nodo desconocido "${op.next}"`);
    });
  }
  return { entry, nodes };
}

function parseNpc(merchants: Record<string, MerchantDef>) {
  return (id: string, o: Obj, r: Reader): NpcDef => {
    const dialogue = parseDialogue(r.child('dialogue'), o['dialogue']);
    if (o['merchant'] === true) {
      // Mercader con diálogo: nombre, sitio y aspecto salen de merchants.json.
      const m = merchants[id];
      if (!m) r.fail('merchant', `no hay mercader "${id}" en merchants.json`);
      return { id, name: m.name, title: m.title, position: { ...m.position }, look: m.look, merchantId: id, dialogue };
    }
    return { id, name: r.str(o, 'name'), title: r.str(o, 'title'), position: r.vec(o, 'position'), look: optStr(r, o, 'look', 'default'), merchantId: null, dialogue };
  };
}

function parseObjective(r: Reader, raw: unknown): QuestObjectiveDef {
  const o = r.obj(raw);
  const type = r.str(o, 'type', ['kill', 'collect', 'fish', 'talk', 'reach']);
  const text = r.str(o, 'text');
  switch (type) {
    case 'kill': {
      const archetypes = strList(r, o, 'archetypes');
      if (archetypes.length === 0) r.fail('archetypes', 'hace falta al menos un arquetipo');
      const def: QuestObjectiveDef = { type, archetypes, count: r.num(o, 'count', { int: true, min: 1, max: 999 }), text };
      if (o['spawn'] !== undefined) {
        const sr = r.child('spawn');
        const so = sr.obj(o['spawn']);
        def.spawn = { x: sr.num(so, 'x'), y: sr.num(so, 'y'), radius: sr.num(so, 'radius', { min: 0, max: 40, def: 4 }) };
      }
      return def;
    }
    case 'collect':
      return { type, itemId: r.str(o, 'itemId'), count: r.num(o, 'count', { int: true, min: 1, max: 999 }), consume: o['consume'] !== false, text };
    case 'fish':
      return { type, itemIds: o['itemIds'] === undefined ? [] : strList(r, o, 'itemIds'), count: r.num(o, 'count', { int: true, min: 1, max: 999 }), text };
    case 'talk':
      return { type, npcId: r.str(o, 'npcId'), text };
    default:
      return { type: 'reach', x: r.num(o, 'x'), y: r.num(o, 'y'), radius: r.num(o, 'radius', { min: 0.5, max: 60 }), text };
  }
}

function parseQuest(id: string, o: Obj, r: Reader): QuestDef {
  const giver = r.str(o, 'giver');
  const rr = r.child('rewards');
  const ro = o['rewards'] === undefined ? {} : rr.obj(o['rewards']);
  const objectives = r.arr(o, 'objectives').map((v, i) => parseObjective(r.child(`objectives[${i}]`), v));
  if (objectives.length === 0) r.fail('objectives', 'hace falta al menos un objetivo');
  return {
    id,
    name: r.str(o, 'name'),
    summary: r.str(o, 'summary'),
    chain: o['chain'] === undefined || o['chain'] === null ? null : r.str(o, 'chain'),
    giver,
    turnIn: optStr(r, o, 'turnIn', giver),
    minLevel: r.num(o, 'minLevel', { int: true, min: 1, def: 1 }),
    requires: o['requires'] === undefined ? [] : strList(r, o, 'requires'),
    offerText: r.str(o, 'offerText'),
    progressText: r.str(o, 'progressText'),
    completeText: r.str(o, 'completeText'),
    objectives,
    rewards: {
      xp: rr.num(ro, 'xp', { int: true, min: 0, def: 0 }),
      gold: rr.num(ro, 'gold', { int: true, min: 0, def: 0 }),
      items: optList(rr, ro, 'items', (c, v) => {
        const e = c.obj(v);
        return { itemId: c.str(e, 'itemId'), quantity: c.num(e, 'quantity', { int: true, min: 1, def: 1 }) };
      }),
      learnSpell: ro['learnSpell'] === undefined || ro['learnSpell'] === null ? null : rr.str(ro, 'learnSpell'),
    },
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
  const fishing: FishingDef = raw.fishing === undefined
    ? { rules: { castRange: 6, biteSeconds: { min: 3, max: 9 }, reactSeconds: 1, nibbleChance: 0 }, spots: {} }
    : parseFishing(raw.fishing);
  const npcs = raw.npcs === undefined ? {} : collect('npcs.json', 'npcs', raw.npcs, parseNpc(merchants));
  const quests = raw.quests === undefined ? {} : collect('quests.json', 'quests', raw.quests, parseQuest);

  const pr = new Reader('rpg/progression.json');
  const po = pr.obj(raw.progression);
  const xr = pr.child('xp');
  const xo = xr.obj(po['xp']);
  const progression: ContentDb['progression'] = {
    maxLevel: pr.num(po, 'maxLevel', { int: true, min: 1, max: 100 }),
    xp: { base: xr.num(xo, 'base', { min: 1 }), exponent: xr.num(xo, 'exponent', { min: 0, max: 4 }) },
    statPointsPerLevel: pr.num(po, 'statPointsPerLevel', { int: true, min: 0, max: 20 }),
    resistCap: pr.num(po, 'resistCap', { min: 0, max: 100 }),
    hotbarSize: pr.num(po, 'hotbarSize', { int: true, min: 1, max: 30 }),
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
    dualWield: (() => {
      if (ro['dualWield'] === undefined) return { offhandDamage: 0.75, attackSpeed: 1.2 };
      const dr = rr.child('dualWield');
      const d = dr.obj(ro['dualWield']);
      return { offhandDamage: dr.num(d, 'offhandDamage', { min: 0, max: 2 }), attackSpeed: dr.num(d, 'attackSpeed', { min: 0.5, max: 3 }) };
    })(),
  };
  for (const d of rules.derived) if ((PRIMARY_STATS as readonly string[]).includes(d.to)) rr.fail('derived', `una regla derivada no puede dar una primaria (${d.to})`);

  const energy = raw.energy === undefined ? DEFAULT_ENERGY : parseEnergy(raw.energy);
  const spoils = raw.spoils === undefined ? DEFAULT_SPOILS : parseSpoils(raw.spoils);

  const c: RpgContent = { classes, spells, statuses, items, sets, pets, lootTables, progression, enemies, merchants, fishing, npcs, quests, rules, energy, spoils };
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
    for (const s of cl.startingSpells) {
      const spell = c.spells[s];
      if (!spell) {
        fail('classes.json', `${p}.startingSpells`, `hechizo desconocido "${s}"`);
        continue;
      }
      if (spell.classId !== cl.id) fail('classes.json', `${p}.startingSpells`, `"${s}" no pertenece a la clase`);
      if ((spell.unlockLevel ?? 1) !== 1) fail('classes.json', `${p}.startingSpells`, `"${s}" no se desbloquea en nivel 1`);
    }
    for (const s of cl.startingHotbar) if (s !== null && !cl.startingSpells.includes(s)) fail('classes.json', `${p}.startingHotbar`, `"${s}" no está en startingSpells`);
    for (const si of cl.startingItems) needItem('classes.json', `${p}.startingItems`, si.itemId);
  }
  for (const s of Object.values(c.spells)) {
    if (s.classId !== null && !c.classes[s.classId]) fail('spells.json', `spells.${s.id}.classId`, `clase desconocida "${s.classId}"`);
    if ((s.unlockLevel ?? 1) > c.progression.maxLevel) fail('spells.json', `spells.${s.id}.unlockLevel`, `supera el nivel máximo`);
    if (s.classId !== null && (s.unlockLevel ?? 1) === 1 && !c.classes[s.classId]!.startingSpells.includes(s.id)) {
      fail('spells.json', `spells.${s.id}.unlockLevel`, `los hechizos de nivel 1 deben estar en startingSpells`);
    }
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
  for (const s of Object.values(c.fishing.spots)) {
    if (!c.lootTables[s.lootTable]) fail('fishing.json', `spots.${s.id}.lootTable`, `tabla desconocida "${s.lootTable}"`);
    if (s.nightLootTable !== null && !c.lootTables[s.nightLootTable]) fail('fishing.json', `spots.${s.id}.nightLootTable`, `tabla desconocida "${s.nightLootTable}"`);
  }
  for (const m of Object.values(c.merchants)) m.stock.forEach((e, i) => needItem('merchants.json', `merchants.${m.id}.stock[${i}]`, e.itemId));
  for (const a of archetypes) if (!c.enemies[a]) fail('enemies.json', 'enemies', `falta la ficha RPG del arquetipo "${a}"`);
  for (const id of Object.keys(c.energy.items)) needItem('energy.json', `items.${id}`, id);
  checkQuestReferences(c, archetypes, fail, needItem);
}

function checkQuestReferences(
  c: RpgContent,
  archetypes: readonly string[],
  fail: (file: string, path: string, msg: string) => never,
  needItem: (file: string, path: string, id: string) => void,
): void {
  const needQuest = (file: string, path: string, id: string): void => {
    if (!c.quests[id]) fail(file, path, `misión desconocida "${id}"`);
  };
  const checkCondition = (file: string, path: string, k: DialogueCondition): void => {
    if (k.type === 'quest') needQuest(file, `${path}.questId`, k.questId);
    if (k.type === 'hasItem') needItem(file, `${path}.itemId`, k.itemId);
    if (k.type === 'not') checkCondition(file, `${path}.condition`, k.condition);
  };
  for (const n of Object.values(c.npcs)) {
    const p = `npcs.${n.id}.dialogue`;
    n.dialogue.entry.forEach((e, i) => e.conditions.forEach((k, j) => checkCondition('npcs.json', `${p}.entry[${i}].conditions[${j}]`, k)));
    for (const [nid, node] of Object.entries(n.dialogue.nodes)) {
      node.options.forEach((op, i) => {
        const op_ = `${p}.nodes.${nid}.options[${i}]`;
        op.conditions.forEach((k, j) => checkCondition('npcs.json', `${op_}.conditions[${j}]`, k));
        op.actions.forEach((a, j) => {
          if (a.type === 'openShop' && n.merchantId === null) fail('npcs.json', `${op_}.actions[${j}]`, 'openShop sólo vale en un mercader');
          if (a.type !== 'openShop') needQuest('npcs.json', `${op_}.actions[${j}].questId`, a.questId);
        });
      });
    }
  }
  for (const q of Object.values(c.quests)) {
    const p = `quests.${q.id}`;
    if (!c.npcs[q.giver]) fail('quests.json', `${p}.giver`, `PNJ desconocido "${q.giver}"`);
    if (!c.npcs[q.turnIn]) fail('quests.json', `${p}.turnIn`, `PNJ desconocido "${q.turnIn}"`);
    q.requires.forEach((r, i) => needQuest('quests.json', `${p}.requires[${i}]`, r));
    q.objectives.forEach((o, i) => {
      const op = `${p}.objectives[${i}]`;
      if (o.type === 'kill') for (const a of o.archetypes) if (!archetypes.includes(a)) fail('quests.json', `${op}.archetypes`, `arquetipo desconocido "${a}"`);
      if (o.type === 'collect') needItem('quests.json', `${op}.itemId`, o.itemId);
      if (o.type === 'fish') o.itemIds.forEach((id) => needItem('quests.json', `${op}.itemIds`, id));
      if (o.type === 'talk' && !c.npcs[o.npcId]) fail('quests.json', `${op}.npcId`, `PNJ desconocido "${o.npcId}"`);
    });
    q.rewards.items.forEach((it, i) => needItem('quests.json', `${p}.rewards.items[${i}]`, it.itemId));
    if (q.rewards.learnSpell !== null && !c.spells[q.rewards.learnSpell]) fail('quests.json', `${p}.rewards.learnSpell`, `hechizo desconocido "${q.rewards.learnSpell}"`);
  }
  // Las cadenas no pueden dar la vuelta (A requiere B que requiere A).
  const seen = new Map<string, 'open' | 'done'>();
  const visit = (id: string): void => {
    if (seen.get(id) === 'done') return;
    if (seen.get(id) === 'open') fail('quests.json', `quests.${id}.requires`, 'la cadena de requisitos forma un ciclo');
    seen.set(id, 'open');
    for (const r of c.quests[id]!.requires) visit(r);
    seen.set(id, 'done');
  };
  for (const id of Object.keys(c.quests)) visit(id);
}
