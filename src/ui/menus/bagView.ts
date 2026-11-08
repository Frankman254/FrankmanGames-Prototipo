// Vista de la mochila (creador, 2026-11-08, U15–U18). Solo cambia cómo se enseña; las casillas
// guardadas no se tocan:
//  - categorías Equipo, Armas, Consumibles y Materiales;
//  - lo filtrado no aparece (no se sombrea) y lo que queda se junta como una pila, sin huecos;
//  - objetos idénticos (mismo objeto y mismas tiradas) en una sola casilla con la cantidad;
//  - orden automático, por fecha de llegada de fábrica (el uid crece al crear cada objeto).
import type { ItemDef, ItemInstance, ItemKind, Rarity } from '../../rpg/contracts';
import { ITEM_KIND_GROUP, kindOf, sameItemProperties } from '../../rpg/items';

export const BAG_GROUPS = [
  { id: 'all', label: 'Todo' },
  { id: 'gear', label: 'Equipo' },
  { id: 'weapon', label: 'Armas' },
  { id: 'use', label: 'Consumibles' },
  { id: 'material', label: 'Materiales' },
] as const;
export type BagGroupId = (typeof BAG_GROUPS)[number]['id'];

export const BAG_SORTS = ['date', 'category', 'kind', 'rarity', 'level', 'name'] as const;
export type BagSort = (typeof BAG_SORTS)[number];
export const BAG_SORT_LABEL: Record<BagSort, string> = { date: 'Por fecha', category: 'Por categoría', kind: 'Por tipo', rarity: 'Por rareza', level: 'Por nivel', name: 'Por nombre' };

export interface BagFilter {
  group: BagGroupId;
  kind: ItemKind | 'all';
  rarity: Rarity | 'all';
}

export function bagGroupOf(def: ItemDef): Exclude<BagGroupId, 'all'> {
  const g = ITEM_KIND_GROUP[kindOf(def)];
  if (g === 'weapon1h' || g === 'weapon2h') return 'weapon';
  if (g === 'armor' || g === 'offhand' || g === 'jewel') return 'gear';
  if (g === 'consumable' || g === 'scroll' || g === 'charm') return 'use';
  return 'material';
}

export function matchesBagFilter(def: ItemDef, f: BagFilter): boolean {
  if (f.group !== 'all' && bagGroupOf(def) !== f.group) return false;
  if (f.kind !== 'all' && kindOf(def) !== f.kind) return false;
  if (f.rarity !== 'all' && def.rarity !== f.rarity) return false;
  return true;
}

/** Una casilla de la vista: una pila guardada o varias copias idénticas juntas. */
export interface BagEntry {
  /** La primera copia: la que se usa, se equipa o se arrastra. */
  item: ItemInstance;
  def: ItemDef;
  /** Casilla guardada de la primera copia (para soltar encima). */
  index: number;
  /** Todas las copias juntas en esta casilla. */
  uids: string[];
  /** Cantidad total (suma de pilas). */
  count: number;
}

const RARITY_ORDER: Record<Rarity, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
/** Orden de llegada: el número del uid (`it` + base 36). */
export const uidOrder = (uid: string): number => {
  const m = /^it([0-9a-z]+)$/.exec(uid);
  return m ? parseInt(m[1]!, 36) : Number.MAX_SAFE_INTEGER;
};

export function bagEntries(slots: readonly (ItemInstance | null)[], items: Readonly<Record<string, ItemDef>>, filter: BagFilter, sort: BagSort): BagEntry[] {
  const out: BagEntry[] = [];
  slots.forEach((it, index) => {
    const def = it ? items[it.itemId] : undefined;
    if (!it || !def || !matchesBagFilter(def, filter)) return;
    const same = out.find((e) => e.item.itemId === it.itemId && sameItemProperties(e.item, it));
    if (same) {
      same.uids.push(it.uid);
      same.count += it.quantity;
      if (uidOrder(it.uid) < uidOrder(same.item.uid)) {
        same.item = it;
        same.index = index;
      }
      return;
    }
    out.push({ item: it, def, index, uids: [it.uid], count: it.quantity });
  });
  const byDate = (a: BagEntry, b: BagEntry): number => uidOrder(a.item.uid) - uidOrder(b.item.uid);
  const cmp: Record<BagSort, (a: BagEntry, b: BagEntry) => number> = {
    date: byDate,
    category: (a, b) => BAG_GROUPS.findIndex((g) => g.id === bagGroupOf(a.def)) - BAG_GROUPS.findIndex((g) => g.id === bagGroupOf(b.def)) || byDate(a, b),
    kind: (a, b) => kindOf(a.def).localeCompare(kindOf(b.def)) || byDate(a, b),
    rarity: (a, b) => RARITY_ORDER[b.def.rarity] - RARITY_ORDER[a.def.rarity] || byDate(a, b),
    level: (a, b) => b.def.level - a.def.level || byDate(a, b),
    name: (a, b) => a.def.name.localeCompare(b.def.name) || byDate(a, b),
  };
  return out.sort(cmp[sort]);
}
