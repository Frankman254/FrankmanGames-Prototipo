// Partidas de prueba (sólo desarrollo): cada una es un guardado completo hecho
// desde `data/dev/presets.json` (clase, nivel, puntos, equipo con tiradas
// fijas, hechizos y barra, mascota y lugar). Se cargan como cualquier
// guardado, así que prueban también el camino real de carga.
import presetsJson from '../../data/dev/presets.json';
import { Reader } from '../data/validate';
import { Character } from '../rpg/character';
import type { RpgContent } from '../rpg/content';
import { EQUIP_SLOTS, PRIMARY_STATS, type EquipSlot, type ItemInstance, type PrimaryStat, type SaveData, type SavePlace, type StatId } from '../rpg/contracts';
import { slotsFor } from '../rpg/items';
import { requiredLevel } from '../rpg/spells';
import { Rng } from '../sim/rng';
import type { ZoneMap } from '../sim/zones';
import { pointInZone } from '../world/placement';

export const PRESET_GROUPS = ['baja', 'media', 'alta', 'especial'] as const;
export type PresetGroup = (typeof PRESET_GROUPS)[number];
export const PRESET_GROUP_NAME: Record<PresetGroup, string> = { baja: 'Franja baja', media: 'Franja media', alta: 'Franja alta', especial: 'Casos especiales' };

/** Modificador forzado en una pieza (resistencias, daño elemental…). */
export interface PresetMod {
  stat: StatId;
  op: 'flat' | 'percent';
  value: number;
}

export interface PresetEquip {
  itemId: string;
  /** Tiradas extra de prueba, además de las del objeto. */
  bonus: PresetMod[];
}

export type PresetPlace =
  | { kind: 'zone'; zone: string; x: number | null; y: number | null }
  | { kind: 'dungeon'; dungeon: string; floor: number };

export interface PresetDef {
  id: string;
  name: string;
  description: string;
  group: PresetGroup;
  /** Para qué sirve (aparece en la lista): «tanque», «daño», «curación»… */
  role: string;
  classId: string;
  level: number;
  /** Puntos repartidos; lo que sobre queda libre. */
  stats: Partial<Record<PrimaryStat, number>>;
  equipment: Partial<Record<EquipSlot, PresetEquip>>;
  /** Hechizos aprendidos además de los de la clase (pergaminos) y rangos. */
  spells: { spellId: string; rank: number }[];
  /** Barra de hechizos desde el hueco 1 (null = vacío). */
  hotbar: (string | null)[];
  inventory: { itemId: string; quantity: number }[];
  /** Amuleto de mascota invocada (se añade a la mochila). */
  pet: string | null;
  gold: number;
  place: PresetPlace;
  /** Hora del día 0..1 (null = la que haya). */
  timeOfDay: number | null;
  /** Calidad de las tiradas del equipo (0 = mínimo, 1 = máximo). */
  rollQuality: number;
}

export interface PresetsFile {
  /** Las partidas de prueba conocen todas las Piedras Pintadas (viajar es parte de probar). */
  allStones: boolean;
  presets: PresetDef[];
}

function parseMod(r: Reader, o: Record<string, unknown>): PresetMod {
  return { stat: r.str(o, 'stat') as StatId, op: r.str(o, 'op', ['flat', 'percent']) as PresetMod['op'], value: r.num(o, 'value') };
}

export function parsePresets(raw: unknown): PresetsFile {
  const r = new Reader('dev/presets.json');
  const o = r.obj(raw);
  const presets = r.arr(o, 'presets').map((p, i): PresetDef => {
    const c = r.child(`presets.${i}`);
    const po = c.obj(p);
    const stats: PresetDef['stats'] = {};
    const so = c.obj(po['stats'] ?? {}, 'stats');
    for (const k of Object.keys(so)) {
      if (!PRIMARY_STATS.includes(k as PrimaryStat)) c.fail('stats', `estadística desconocida "${k}"`);
      stats[k as PrimaryStat] = c.child('stats').num(so, k, { min: 0, int: true });
    }
    const equipment: PresetDef['equipment'] = {};
    const eo = c.obj(po['equipment'] ?? {}, 'equipment');
    for (const k of Object.keys(eo)) {
      if (!EQUIP_SLOTS.includes(k as EquipSlot)) c.fail('equipment', `hueco desconocido "${k}"`);
      const v = eo[k];
      const ec = c.child(`equipment.${k}`);
      if (typeof v === 'string') equipment[k as EquipSlot] = { itemId: v, bonus: [] };
      else {
        const vo = ec.obj(v);
        equipment[k as EquipSlot] = { itemId: ec.str(vo, 'itemId'), bonus: Array.isArray(vo['bonus']) ? ec.arr(vo, 'bonus').map((m, j) => parseMod(ec.child(`bonus.${j}`), ec.obj(m))) : [] };
      }
    }
    const spells = Array.isArray(po['spells'])
      ? c.arr(po, 'spells').map((s, j) => {
        const sc = c.child(`spells.${j}`);
        if (typeof s === 'string') return { spellId: s, rank: 1 };
        const so2 = sc.obj(s);
        return { spellId: sc.str(so2, 'spellId'), rank: sc.num(so2, 'rank', { min: 1, int: true, def: 1 }) };
      })
      : [];
    const hotbar = c.arr(po, 'hotbar').map((h, j) => (h === null ? null : typeof h === 'string' ? h : c.fail(`hotbar.${j}`, 'texto o null')));
    const inventory = Array.isArray(po['inventory'])
      ? c.arr(po, 'inventory').map((it, j) => {
        const ic = c.child(`inventory.${j}`);
        const io = ic.obj(it);
        return { itemId: ic.str(io, 'itemId'), quantity: ic.num(io, 'quantity', { min: 1, int: true, def: 1 }) };
      })
      : [];
    const pc = c.child('place');
    const plo = pc.obj(po['place'], 'place');
    let place: PresetPlace | null = null;
    if (typeof plo['zone'] === 'string') {
      const hasPos = typeof plo['x'] === 'number' && typeof plo['y'] === 'number';
      place = { kind: 'zone', zone: plo['zone'], x: hasPos ? pc.num(plo, 'x', { min: 0 }) : null, y: hasPos ? pc.num(plo, 'y', { min: 0 }) : null };
    } else if (typeof plo['dungeon'] === 'string') {
      place = { kind: 'dungeon', dungeon: plo['dungeon'], floor: pc.num(plo, 'floor', { min: 0, int: true }) };
    }
    if (!place) return pc.fail('', 'hace falta "zone" o "dungeon"');
    return {
      id: c.str(po, 'id'),
      name: c.str(po, 'name'),
      description: c.str(po, 'description'),
      group: c.str(po, 'group', PRESET_GROUPS) as PresetGroup,
      role: c.str(po, 'role'),
      classId: c.str(po, 'classId'),
      level: c.num(po, 'level', { min: 1, int: true }),
      stats,
      equipment,
      spells,
      hotbar,
      inventory,
      pet: typeof po['pet'] === 'string' ? po['pet'] : null,
      gold: typeof po['gold'] === 'number' ? c.num(po, 'gold', { min: 0, int: true }) : 0,
      place,
      timeOfDay: typeof po['timeOfDay'] === 'number' ? c.num(po, 'timeOfDay', { min: 0, max: 1 }) : null,
      rollQuality: typeof po['rollQuality'] === 'number' ? c.num(po, 'rollQuality', { min: 0, max: 1 }) : 0.5,
    };
  });
  const ids = new Set<string>();
  for (const p of presets) {
    if (ids.has(p.id)) r.fail('presets', `id repetido "${p.id}"`);
    ids.add(p.id);
  }
  return { allStones: o['allStones'] !== false, presets };
}

/** Lo que hace falta saber del mundo para comprobar y situar las partidas de prueba. */
export interface PresetWorld {
  zones: ZoneMap;
  width: number;
  depth: number;
  /** Pisos por mazmorra y rótulo de cada piso. */
  dungeons: Record<string, { floors: number; title(floor: number): string }>;
  /** Piedras Pintadas (ids) y la de partida. */
  stones: readonly string[];
  home: string;
  /** Casilla caminable del mundo abierto (sin ella, toda casilla vale). */
  walkable?: (p: { x: number; y: number }) => boolean;
}

/** Problemas de una partida de prueba frente al contenido actual (vacío = bien). */
export function presetProblems(content: RpgContent, p: PresetDef, w: PresetWorld): string[] {
  const out: string[] = [];
  const cls = content.classes[p.classId];
  if (!cls) out.push(`clase desconocida "${p.classId}"`);
  const maxLevel = content.progression.maxLevel;
  if (p.level > maxLevel) out.push(`nivel ${p.level} por encima del máximo (${maxLevel})`);
  const points = (Math.min(p.level, maxLevel) - 1) * content.progression.statPointsPerLevel;
  const spent = Object.values(p.stats).reduce((a, b) => a + (b ?? 0), 0);
  if (spent > points) out.push(`reparte ${spent} puntos y a nivel ${p.level} sólo hay ${points}`);
  for (const [slot, e] of Object.entries(p.equipment) as [EquipSlot, PresetEquip][]) {
    const def = content.items[e.itemId];
    if (!def) {
      out.push(`objeto desconocido "${e.itemId}" en ${slot}`);
      continue;
    }
    if (!slotsFor(def).includes(slot)) out.push(`"${e.itemId}" no va en ${slot}`);
    if (def.level > p.level) out.push(`"${e.itemId}" pide nivel ${def.level}`);
  }
  for (const it of p.inventory) if (!content.items[it.itemId]) out.push(`objeto desconocido "${it.itemId}" en la mochila`);
  if (p.pet) {
    const def = content.items[p.pet];
    if (!def || def.use?.kind !== 'summonPet') out.push(`"${p.pet}" no es un amuleto de mascota`);
  }
  const known = new Set(p.spells.map((s) => s.spellId));
  for (const s of p.spells) {
    const def = content.spells[s.spellId];
    if (!def) out.push(`hechizo desconocido "${s.spellId}"`);
    else if (s.rank > def.maxRank) out.push(`"${s.spellId}" rango ${s.rank} > ${def.maxRank}`);
  }
  if (p.hotbar.length > content.progression.hotbarSize) out.push(`barra de ${p.hotbar.length} huecos (máx. ${content.progression.hotbarSize})`);
  for (const id of p.hotbar) {
    if (id === null) continue;
    const def = content.spells[id];
    if (!def) {
      out.push(`hechizo desconocido "${id}" en la barra`);
      continue;
    }
    const own = def.classId === p.classId;
    if (!own && !known.has(id)) out.push(`"${id}" en la barra sin aprenderlo`);
    if (requiredLevel(def) > p.level) out.push(`"${id}" pide nivel ${requiredLevel(def)}`);
  }
  if (p.place.kind === 'zone') {
    const z = w.zones.get(p.place.zone);
    if (!z) out.push(`zona desconocida "${p.place.zone}"`);
    else if (p.place.x === null && !pointInZone(w.zones, z.id, w.width, w.depth, w.walkable)) out.push(`la zona "${z.id}" no tiene sitio en el mundo`);
    else if (p.place.x !== null && w.zones.zoneAt({ x: p.place.x, y: p.place.y! })?.id !== z.id) out.push(`(${p.place.x}, ${p.place.y}) no cae en "${z.id}"`);
    else if (p.place.x !== null && w.walkable && !w.walkable({ x: p.place.x, y: p.place.y! })) out.push(`(${p.place.x}, ${p.place.y}) no se puede pisar`);
  } else {
    const d = w.dungeons[p.place.dungeon];
    if (!d) out.push(`mazmorra desconocida "${p.place.dungeon}"`);
    else if (p.place.floor >= d.floors) out.push(`la mazmorra "${p.place.dungeon}" no tiene piso ${p.place.floor + 1}`);
  }
  return out;
}

/** El lugar de la partida de prueba como lugar de guardado. */
export function presetPlace(p: PresetDef, w: PresetWorld, allStones: boolean): SavePlace {
  const knownStones = allStones ? [...w.stones] : [w.home];
  const common = { stone: w.home, knownStones, timeOfDay: p.timeOfDay };
  if (p.place.kind === 'dungeon') {
    const d = w.dungeons[p.place.dungeon];
    return { scene: 'dungeon', dungeon: p.place.dungeon, floor: p.place.floor, x: null, y: null, name: d?.title(p.place.floor), ...common };
  }
  const pos = p.place.x !== null && p.place.y !== null ? { x: p.place.x, y: p.place.y } : pointInZone(w.zones, p.place.zone, w.width, w.depth, w.walkable);
  return { scene: 'overworld', dungeon: null, floor: null, x: pos?.x ?? null, y: pos?.y ?? null, name: w.zones.get(p.place.zone)?.name, ...common };
}

/** Valor de una tirada con calidad fija (misma regla de redondeo que el juego). */
function fixedRoll(min: number, max: number, q: number): number {
  const v = min + (max - min) * q;
  return Number.isInteger(min) && Number.isInteger(max) ? Math.round(v) : Math.round(v * 100) / 100;
}

/**
 * El guardado de una partida de prueba. Parte de un personaje nuevo de la
 * clase (kit de nivel 1, misiones y energía de siempre) y le pone encima lo de
 * la partida; `Character.fromSave` aprende los hechizos de clase del nivel.
 */
export function buildPresetSave(content: RpgContent, p: PresetDef, w: PresetWorld, allStones = true, now = new Date()): SaveData {
  const c = Character.create(content, p.classId, p.name, new Rng(1));
  const base = c.toSave(now);
  const level = Math.min(p.level, content.progression.maxLevel);
  const points = (level - 1) * content.progression.statPointsPerLevel;
  const allocated: SaveData['allocated'] = {};
  let spent = 0;
  for (const s of PRIMARY_STATS) {
    const v = Math.min(p.stats[s] ?? 0, points - spent);
    if (v > 0) {
      allocated[s] = v;
      spent += v;
    }
  }
  const make = (itemId: string, quantity = 1, bonus: PresetMod[] = []): ItemInstance => {
    const inst = c.items.create(itemId, quantity);
    const def = content.items[itemId]!;
    inst.rolled = [...def.rolls.map((r) => ({ stat: r.stat, op: r.op, value: fixedRoll(r.min, r.max, p.rollQuality) })), ...bonus.map((m) => ({ ...m }))];
    return inst;
  };
  const equipment: SaveData['equipment'] = {};
  for (const [slot, e] of Object.entries(p.equipment) as [EquipSlot, PresetEquip][]) if (content.items[e.itemId]) equipment[slot] = make(e.itemId, 1, e.bonus);
  const inventory: (ItemInstance | null)[] = Array.from({ length: content.progression.inventorySize }, () => null);
  let i = 0;
  const put = (inst: ItemInstance): void => {
    if (i < inventory.length) inventory[i++] = inst;
  };
  for (const it of p.inventory) {
    const def = content.items[it.itemId];
    if (!def) continue;
    for (let left = it.quantity; left > 0; left -= def.maxStack) put(make(it.itemId, Math.min(left, def.maxStack)));
  }
  let activePetItemUid: string | null = null;
  if (p.pet && content.items[p.pet]) {
    const charm = make(p.pet);
    put(charm);
    activePetItemUid = charm.uid;
  }
  const known = new Map(base.known.map((k) => [k.spellId, k.rank]));
  for (const s of p.spells) if (content.spells[s.spellId]) known.set(s.spellId, s.rank);
  const hotbar: (string | null)[] = Array.from({ length: content.progression.hotbarSize }, (_, k) => p.hotbar[k] ?? null);
  // Los de clase de la barra que aún no sabe (se aprenden por nivel): ya conocidos, con rango 1.
  for (const id of hotbar) if (id && !known.has(id) && content.spells[id]?.classId === p.classId) known.set(id, 1);
  return {
    ...base,
    label: `Prueba · ${p.name}`,
    level,
    xp: 0,
    gold: p.gold,
    allocated,
    unspentStatPoints: points - spent,
    inventory,
    equipment,
    known: [...known].map(([spellId, rank]) => ({ spellId, rank })),
    hotbar,
    activePetItemUid,
    place: presetPlace(p, w, allStones),
  };
}

let cached: PresetsFile | null = null;
/** Las partidas de prueba de `data/dev/presets.json`. */
export function loadPresets(): PresetsFile {
  cached ??= parsePresets(presetsJson);
  return cached;
}
