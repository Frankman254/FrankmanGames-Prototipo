// Objetos: la definición (`ItemDef`) es el prototipo; `ItemInstance` es la
// copia con sus tiradas. Inventario de huecos fijos con pilas, y equipo con
// huecos y bonos de set.
import type { Rng } from '../sim/rng';
import {
  EQUIP_SLOTS,
  ITEM_CATEGORIES,
  ITEM_KINDS,
  RARITIES,
  TWO_HANDED_KINDS,
  type ContentDb,
  type EquipSlot,
  type InventorySortKey,
  type ItemDef,
  type ItemInstance,
  type ItemKind,
} from './contracts';
import type { Mod } from './stats';

// ─── Creación y tiradas ────────────────────────────────────────────────────

/** Una tirada con límites enteros da enteros; si no, dos decimales. */
export function rollValue(rng: Rng, min: number, max: number): number {
  if (Number.isInteger(min) && Number.isInteger(max)) return rng.int(min, max);
  return Math.round(rng.range(min, max) * 100) / 100;
}

/** Crea instancias con uid único. El contador se reanuda tras cargar una partida. */
export class ItemFactory {
  private next = 1;

  constructor(private readonly content: ContentDb, private readonly rng: Rng) {}

  def(itemId: string): ItemDef {
    const d = this.content.items[itemId];
    if (!d) throw new Error(`objeto desconocido: ${itemId}`);
    return d;
  }

  create(itemId: string, quantity = 1): ItemInstance {
    const d = this.def(itemId);
    return {
      uid: `it${(this.next++).toString(36)}`,
      itemId,
      quantity: Math.min(quantity, d.maxStack),
      rolled: d.rolls.map((r) => ({ stat: r.stat, op: r.op, value: rollValue(this.rng, r.min, r.max) })),
    };
  }

  /** Copia con uid nuevo (dividir una pila). */
  split(src: ItemInstance, quantity: number): ItemInstance {
    return { uid: `it${(this.next++).toString(36)}`, itemId: src.itemId, quantity, rolled: src.rolled.map((m) => ({ ...m })) };
  }

  /** Tras cargar: que los uid nuevos no choquen con los guardados. */
  observe(uid: string): void {
    const m = /^it([0-9a-z]+)$/.exec(uid);
    if (m) this.next = Math.max(this.next, parseInt(m[1]!, 36) + 1);
  }
}

/** Modificadores de una instancia: fijos del prototipo + tiradas + bonificaciones propias. */
export function itemMods(def: ItemDef, inst: ItemInstance): Mod[] {
  return [...def.implicit, ...inst.rolled, ...(inst.bonus ?? [])];
}

/**
 * Calidad de las tiradas, 0..1 (0 = todas al mínimo). Sirve para el tooltip y
 * el valor de venta; un objeto sin tiradas vale 0,5.
 */
export function rollQuality(def: ItemDef, inst: ItemInstance): number {
  if (def.rolls.length === 0) return 0.5;
  let q = 0;
  def.rolls.forEach((r, i) => {
    const v = inst.rolled[i]?.value ?? r.min;
    q += r.max > r.min ? (v - r.min) / (r.max - r.min) : 1;
  });
  return q / def.rolls.length;
}

/**
 * Ajusta una instancia guardada a su definición actual (migración al cargar):
 * cada tirada busca la suya por estadística y operación (primero en el mismo
 * puesto), se recorta a los límites nuevos, y las que faltan salen a media
 * tirada; las que sobran se quitan. La cantidad se recorta a `maxStack`.
 * Devuelve true si cambió algo.
 */
export function migrateInstance(def: ItemDef, inst: ItemInstance): boolean {
  const old = inst.rolled;
  const used = new Set<number>();
  let changed = old.length !== def.rolls.length;
  const next = def.rolls.map((r, i) => {
    const same = (m: (typeof old)[number] | undefined): boolean => !!m && m.stat === r.stat && m.op === r.op;
    const j = same(old[i]) && !used.has(i) ? i : old.findIndex((m, k) => !used.has(k) && same(m));
    let value: number;
    if (j >= 0) {
      used.add(j);
      value = Math.min(r.max, Math.max(r.min, old[j]!.value));
      if (value !== old[j]!.value || j !== i) changed = true;
    } else {
      const mid = (r.min + r.max) / 2;
      value = Number.isInteger(r.min) && Number.isInteger(r.max) ? Math.round(mid) : Math.round(mid * 100) / 100;
      changed = true;
    }
    return { stat: r.stat, op: r.op, value };
  });
  inst.rolled = next;
  const q = Math.max(1, Math.min(def.maxStack, Math.floor(inst.quantity)));
  if (q !== inst.quantity) {
    inst.quantity = q;
    changed = true;
  }
  return changed;
}

// ─── Inventario ────────────────────────────────────────────────────────────

export class Inventory {
  readonly slots: (ItemInstance | null)[];

  constructor(private readonly content: ContentDb, size: number, private readonly factory: ItemFactory) {
    this.slots = new Array<ItemInstance | null>(size).fill(null);
  }

  get size(): number {
    return this.slots.length;
  }

  def(inst: ItemInstance): ItemDef {
    return this.content.items[inst.itemId]!;
  }

  indexOf(uid: string): number {
    return this.slots.findIndex((s) => s?.uid === uid);
  }

  find(uid: string): ItemInstance | null {
    const i = this.indexOf(uid);
    return i < 0 ? null : this.slots[i]!;
  }

  freeSlots(): number {
    return this.slots.filter((s) => s === null).length;
  }

  count(itemId: string): number {
    let n = 0;
    for (const s of this.slots) if (s?.itemId === itemId) n += s.quantity;
    return n;
  }

  /** ¿Cabe entera? (sin modificar nada). */
  canAdd(inst: ItemInstance): boolean {
    const d = this.def(inst);
    let left = inst.quantity;
    for (const s of this.slots) {
      if (s === null) left -= d.maxStack;
      else if (s.itemId === inst.itemId && d.maxStack > 1) left -= d.maxStack - s.quantity;
      if (left <= 0) return true;
    }
    return false;
  }

  /**
   * Añade apilando primero en pilas existentes y después en huecos libres.
   * Devuelve lo que no cupo (0 = todo dentro). La instancia puede quedar
   * repartida; si entra entera en un hueco libre conserva su uid.
   */
  add(inst: ItemInstance): number {
    const d = this.def(inst);
    let left = inst.quantity;
    if (d.maxStack > 1) {
      for (const s of this.slots) {
        if (left <= 0) break;
        if (s && s.itemId === inst.itemId && s.quantity < d.maxStack) {
          const put = Math.min(left, d.maxStack - s.quantity);
          s.quantity += put;
          left -= put;
        }
      }
    }
    for (let i = 0; i < this.slots.length && left > 0; i++) {
      if (this.slots[i] !== null) continue;
      const put = Math.min(left, d.maxStack);
      if (put === left) {
        // El último trozo conserva la instancia (y su uid).
        inst.quantity = put;
        this.slots[i] = inst;
      } else {
        this.slots[i] = this.factory.split(inst, put);
      }
      left -= put;
    }
    if (left > 0) inst.quantity = left;
    return left;
  }

  /** Coloca en un hueco concreto (vacío). */
  putAt(index: number, inst: ItemInstance): boolean {
    if (index < 0 || index >= this.slots.length || this.slots[index] !== null) return false;
    this.slots[index] = inst;
    return true;
  }

  /** Quita `quantity` de una pila (toda si es la cantidad entera). Devuelve lo quitado. */
  remove(uid: string, quantity: number): ItemInstance | null {
    const i = this.indexOf(uid);
    if (i < 0) return null;
    const s = this.slots[i]!;
    const q = Math.min(quantity, s.quantity);
    if (q <= 0) return null;
    if (q === s.quantity) {
      this.slots[i] = null;
      return s;
    }
    s.quantity -= q;
    return this.factory.split(s, q);
  }

  /** Mover: a hueco vacío, intercambiar, o fusionar pilas del mismo objeto. */
  move(from: number, to: number): boolean {
    const n = this.slots.length;
    if (from < 0 || from >= n || to < 0 || to >= n) return false;
    if (from === to) return true;
    const a = this.slots[from]!;
    const b = this.slots[to]!;
    if (!a) return false;
    if (b && b.itemId === a.itemId && this.def(a).maxStack > 1) {
      const put = Math.min(a.quantity, this.def(b).maxStack - b.quantity);
      b.quantity += put;
      a.quantity -= put;
      if (a.quantity <= 0) this.slots[from] = null;
      return true;
    }
    this.slots[from] = b ?? null;
    this.slots[to] = a;
    return true;
  }

  /**
   * Ordena fusionando pilas. Por defecto (`category`): categoría, rareza (mayor
   * primero), nivel y nombre. `kind` agrupa por tipo (espadas, escudos…),
   * `rarity` y `level` ponen primero lo mejor, `name` es alfabético.
   */
  sort(by: InventorySortKey = 'category'): void {
    const items = this.slots.filter((s): s is ItemInstance => s !== null);
    this.slots.fill(null);
    const cat = (d: ItemDef) => ITEM_CATEGORIES.indexOf(d.category);
    const rar = (d: ItemDef) => RARITIES.indexOf(d.rarity);
    const kind = (d: ItemDef) => ITEM_KINDS.indexOf(kindOf(d));
    const tail = (a: ItemDef, b: ItemDef, x: ItemInstance, y: ItemInstance) => a.name.localeCompare(b.name) || y.quantity - x.quantity;
    items.sort((x, y) => {
      const a = this.def(x);
      const b = this.def(y);
      switch (by) {
        case 'kind':
          return kind(a) - kind(b) || rar(b) - rar(a) || b.level - a.level || tail(a, b, x, y);
        case 'rarity':
          return rar(b) - rar(a) || cat(a) - cat(b) || b.level - a.level || tail(a, b, x, y);
        case 'level':
          return b.level - a.level || rar(b) - rar(a) || cat(a) - cat(b) || tail(a, b, x, y);
        case 'name':
          return tail(a, b, x, y);
        default:
          return cat(a) - cat(b) || rar(b) - rar(a) || b.level - a.level || tail(a, b, x, y);
      }
    });
    for (const it of items) this.add(it);
  }
}

// ─── Tipos de objeto ───────────────────────────────────────────────────────

/** Grupo de cada tipo: para filtros de la mochila y textos. */
export const ITEM_KIND_GROUP: Record<ItemKind, 'weapon1h' | 'weapon2h' | 'offhand' | 'armor' | 'jewel' | 'consumable' | 'scroll' | 'charm' | 'material' | 'other'> = {
  sword: 'weapon1h', dagger: 'weapon1h', axe: 'weapon1h', mace: 'weapon1h', wand: 'weapon1h', orb: 'weapon1h',
  greatsword: 'weapon2h', hammer: 'weapon2h', spear: 'weapon2h', bow: 'weapon2h', crossbow: 'weapon2h', staff: 'weapon2h',
  shield: 'offhand', buckler: 'offhand',
  helmet: 'armor', hat: 'armor', hood: 'armor', armor: 'armor', robe: 'armor', cape: 'armor', belt: 'armor', gloves: 'armor', bracers: 'armor', boots: 'armor', sandals: 'armor',
  ring: 'jewel', amulet: 'jewel',
  potion: 'consumable', elixir: 'consumable', food: 'consumable', fish: 'consumable',
  scroll: 'scroll', charm: 'charm',
  material: 'material', ore: 'material', hide: 'material', fang: 'material', essence: 'material', gem: 'material',
  key: 'other', junk: 'other',
};

/** Hueco que corresponde a cada tipo equipable (los anillos, 'ring'). */
const KIND_SLOT: Partial<Record<ItemKind, ItemDef['slot']>> = {
  shield: 'offhand', buckler: 'offhand',
  helmet: 'head', hat: 'head', hood: 'head', armor: 'chest', robe: 'chest', cape: 'back', belt: 'waist',
  gloves: 'hands', bracers: 'hands', boots: 'feet', sandals: 'feet', ring: 'ring', amulet: 'amulet',
};

export function isItemKind(v: string): v is ItemKind {
  return (ITEM_KINDS as readonly string[]).includes(v);
}

/** Hueco natural de un tipo (null = no equipable). Las armas van en `weapon`. */
export function slotForKind(kind: ItemKind): ItemDef['slot'] {
  const g = ITEM_KIND_GROUP[kind];
  if (g === 'weapon1h' || g === 'weapon2h') return 'weapon';
  return KIND_SLOT[kind] ?? null;
}

/**
 * Tipo de un objeto sin `kind` en los datos (contenidos anteriores): por su
 * icono, su hueco y su categoría. Siempre devuelve uno válido.
 */
export function inferKind(def: Pick<ItemDef, 'id' | 'icon' | 'category' | 'slot'> & { weapon?: { range: number } }): ItemKind {
  const byIcon: Record<string, ItemKind> = {
    '🗡': 'sword', '⚔': 'sword', '🪓': 'axe', '🔨': 'mace', '🪄': 'wand', '🔮': 'orb', '🏹': 'bow', '🛡': 'shield',
    '🧢': 'hood', '🎓': 'hat', '⛑': 'helmet', '🪖': 'helmet', '🦺': 'armor', '👘': 'robe', '🧤': 'gloves', '🥾': 'boots', '👢': 'boots', '🩴': 'sandals',
    '💍': 'ring', '📿': 'amulet', '🧪': 'potion', '🧴': 'potion', '🩸': 'elixir', '⚗': 'elixir', '📜': 'scroll',
    '🦷': 'fang', '🟫': 'hide', '🪨': 'ore', '💠': 'essence', '💎': 'gem', '🗝': 'key', '🐟': 'fish', '🐠': 'fish', '🐡': 'fish',
  };
  const fromIcon = byIcon[def.icon] ?? (isItemKind(def.icon) ? def.icon : undefined);
  if (fromIcon && kindFitsSlot(fromIcon, def.category, def.slot)) return fromIcon;
  if (def.id.startsWith('fish_')) return 'fish';
  switch (def.slot) {
    case 'weapon':
      return def.icon === 'staff' ? 'staff' : (def.weapon?.range ?? 0) > 3 ? 'wand' : 'sword';
    case 'offhand':
      return 'shield';
    case 'head':
      return 'helmet';
    case 'chest':
      return 'armor';
    case 'hands':
      return 'gloves';
    case 'feet':
      return 'boots';
    case 'back':
      return 'cape';
    case 'waist':
      return 'belt';
    case 'ring':
    case 'ring1':
    case 'ring2':
      return 'ring';
    case 'amulet':
      return 'amulet';
    default:
      break;
  }
  const byCategory: Partial<Record<ItemDef['category'], ItemKind>> = { consumable: 'potion', scroll: 'scroll', petCharm: 'charm', material: 'material', quest: 'key' };
  return byCategory[def.category] ?? 'junk';
}

/** ¿Encaja el tipo con la categoría y el hueco declarados? */
export function kindFitsSlot(kind: ItemKind, category: ItemDef['category'], slot: ItemDef['slot']): boolean {
  const want = slotForKind(kind);
  if (want !== null) return want === (slot === 'ring1' || slot === 'ring2' ? 'ring' : slot);
  if (slot !== null) return false;
  const g = ITEM_KIND_GROUP[kind];
  if (category === 'scroll') return g === 'scroll';
  if (category === 'petCharm') return g === 'charm';
  if (category === 'consumable') return g === 'consumable';
  return g === 'material' || g === 'other' || g === 'consumable';
}

export function kindOf(def: ItemDef): ItemKind {
  return def.kind ?? inferKind(def);
}

/** Manos que ocupa un arma (1 si no es arma). */
export function handsOf(def: ItemDef): 1 | 2 {
  if (!def.weapon) return 1;
  return def.hands ?? (TWO_HANDED_KINDS.includes(kindOf(def)) ? 2 : 1);
}

export function isTwoHanded(def: ItemDef | null | undefined): boolean {
  return !!def?.weapon && handsOf(def) === 2;
}

/** Arma de una mano: puede ir en la mano izquierda (dos armas). */
export function isOffhandWeapon(def: ItemDef | null | undefined): boolean {
  return !!def?.weapon && def.slot === 'weapon' && handsOf(def) === 1;
}

/**
 * ¿Puede ir en ese hueco? Versión ligera de `slotsFor` para la interfaz (sólo
 * mira hueco, arma, manos y tipo; sin tipo, un arma cuenta como de una mano).
 */
export function fitsEquipSlot(def: Pick<ItemDef, 'slot'> & Partial<Pick<ItemDef, 'weapon' | 'hands' | 'kind'>>, slot: EquipSlot): boolean {
  if (def.slot === 'ring') return slot === 'ring1' || slot === 'ring2';
  if (slot === 'offhand' && def.slot === 'weapon' && def.weapon) {
    return (def.hands ?? (def.kind && TWO_HANDED_KINDS.includes(def.kind) ? 2 : 1)) === 1;
  }
  return def.slot === slot;
}

// ─── Equipo y sets ─────────────────────────────────────────────────────────

/** Huecos en los que puede ir un objeto. Un arma de una mano vale para las dos. */
export function slotsFor(def: ItemDef): EquipSlot[] {
  if (def.slot === null) return [];
  if (def.slot === 'ring') return ['ring1', 'ring2'];
  if (isOffhandWeapon(def)) return ['weapon', 'offhand'];
  return [def.slot];
}

/**
 * Huecos que hay que vaciar para poner `def` en `slot`: un arma de dos manos
 * echa lo que haya en la mano izquierda, y la mano izquierda echa un arma de
 * dos manos de la derecha.
 */
export function displacedBy(content: ContentDb, map: EquipMap, def: ItemDef, slot: EquipSlot): EquipSlot[] {
  if (slot === 'weapon' && isTwoHanded(def) && map.offhand) return ['offhand'];
  if (slot === 'offhand') {
    const main = map.weapon ? content.items[map.weapon.itemId] : undefined;
    if (isTwoHanded(main)) return ['weapon'];
  }
  return [];
}

/** ¿Lleva un arma en cada mano? */
export function isDualWielding(content: ContentDb, map: EquipMap): boolean {
  const main = map.weapon ? content.items[map.weapon.itemId] : undefined;
  const off = map.offhand ? content.items[map.offhand.itemId] : undefined;
  return !!main?.weapon && isOffhandWeapon(off);
}

export type EquipMap = Partial<Record<EquipSlot, ItemInstance>>;

export class Equipment {
  readonly slots: EquipMap = {};

  constructor(private readonly content: ContentDb) {}

  get(slot: EquipSlot): ItemInstance | null {
    return this.slots[slot] ?? null;
  }

  /** Pone `inst` en `slot` y devuelve lo que había. No valida (lo hace el personaje). */
  put(slot: EquipSlot, inst: ItemInstance): ItemInstance | null {
    const prev = this.slots[slot] ?? null;
    this.slots[slot] = inst;
    return prev;
  }

  take(slot: EquipSlot): ItemInstance | null {
    const prev = this.slots[slot] ?? null;
    delete this.slots[slot];
    return prev;
  }

  /**
   * Hueco por defecto: el primero libre de los posibles, o el primero. Un arma
   * de una mano sustituye a la de la derecha; para llevar dos hay que pedir la
   * mano izquierda (arrastrar o mayúsculas + clic derecho).
   */
  defaultSlot(def: ItemDef): EquipSlot | null {
    const options = slotsFor(def);
    if (isOffhandWeapon(def)) return 'weapon';
    return options.find((s) => !this.slots[s]) ?? options[0] ?? null;
  }

  /** Arma de la mano derecha (o null = sin arma). */
  weapon(): ItemDef | null {
    const w = this.slots.weapon;
    return w ? this.content.items[w.itemId] ?? null : null;
  }

  /** Arma de la mano izquierda (null si va vacía o lleva escudo). */
  offhandWeapon(): ItemDef | null {
    const o = this.slots.offhand;
    const def = o ? this.content.items[o.itemId] ?? null : null;
    return def?.weapon ? def : null;
  }

  all(): Record<EquipSlot, ItemInstance | null> {
    const out = {} as Record<EquipSlot, ItemInstance | null>;
    for (const s of EQUIP_SLOTS) out[s] = this.slots[s] ?? null;
    return out;
  }
}

/** Piezas equipadas por set. */
export function setCounts(content: ContentDb, map: EquipMap): Map<string, number> {
  const counts = new Map<string, number>();
  for (const inst of Object.values(map)) {
    const setId = inst ? content.items[inst.itemId]?.setId : undefined;
    if (setId) counts.set(setId, (counts.get(setId) ?? 0) + 1);
  }
  return counts;
}

/**
 * Fuentes de estadísticas del equipo: "item:<uid>" por objeto y "set:<id>" con
 * los bonos de set acumulados (todos los escalones con piezas ≤ equipadas; PROPUESTA).
 */
export function equipmentSources(content: ContentDb, map: EquipMap): Map<string, Mod[]> {
  const out = new Map<string, Mod[]>();
  for (const inst of Object.values(map)) {
    if (!inst) continue;
    const def = content.items[inst.itemId];
    if (def) out.set(`item:${inst.uid}`, itemMods(def, inst));
  }
  for (const [setId, n] of setCounts(content, map)) {
    const set = content.sets[setId];
    if (!set) continue;
    const mods = set.bonuses.filter((b) => b.pieces <= n).flatMap((b) => b.modifiers);
    if (mods.length > 0) out.set(`set:${setId}`, mods);
  }
  return out;
}
