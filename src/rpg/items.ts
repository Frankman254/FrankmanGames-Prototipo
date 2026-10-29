// Objetos: la definición (`ItemDef`) es el prototipo; `ItemInstance` es la
// copia con sus tiradas. Inventario de huecos fijos con pilas, y equipo con
// huecos y bonos de set.
import type { Rng } from '../sim/rng';
import {
  EQUIP_SLOTS,
  ITEM_CATEGORIES,
  RARITIES,
  type ContentDb,
  type EquipSlot,
  type ItemDef,
  type ItemInstance,
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

/** Modificadores de una instancia: fijos del prototipo + tiradas. */
export function itemMods(def: ItemDef, inst: ItemInstance): Mod[] {
  return [...def.implicit, ...inst.rolled];
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

  /** Ordena por categoría, rareza (mayor primero), nivel y nombre, fusionando pilas. */
  sort(): void {
    const items = this.slots.filter((s): s is ItemInstance => s !== null);
    this.slots.fill(null);
    const cat = (d: ItemDef) => ITEM_CATEGORIES.indexOf(d.category);
    const rar = (d: ItemDef) => RARITIES.indexOf(d.rarity);
    items.sort((x, y) => {
      const a = this.def(x);
      const b = this.def(y);
      return cat(a) - cat(b) || rar(b) - rar(a) || b.level - a.level || a.name.localeCompare(b.name) || y.quantity - x.quantity;
    });
    for (const it of items) this.add(it);
  }
}

// ─── Equipo y sets ─────────────────────────────────────────────────────────

/** Huecos en los que puede ir un objeto. */
export function slotsFor(def: ItemDef): EquipSlot[] {
  if (def.slot === null) return [];
  if (def.slot === 'ring') return ['ring1', 'ring2'];
  return [def.slot];
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

  /** Hueco por defecto: el primero libre de los posibles, o el primero. */
  defaultSlot(def: ItemDef): EquipSlot | null {
    const options = slotsFor(def);
    return options.find((s) => !this.slots[s]) ?? options[0] ?? null;
  }

  weapon(): ItemDef | null {
    const w = this.slots.weapon;
    return w ? this.content.items[w.itemId] ?? null : null;
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
