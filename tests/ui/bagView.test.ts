// U15–U18: vista de la mochila (categorías, filtro sin huecos, idénticos juntos y orden por fecha).
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../../src/data';
import { bagEntries, bagGroupOf, uidOrder } from '../../src/ui/menus/bagView';
import type { ItemInstance } from '../../src/rpg/contracts';

const items = loadGameData().rpg.items;
const inst = (uid: string, itemId: string, quantity = 1, rolled: ItemInstance['rolled'] = []): ItemInstance => ({ uid, itemId, quantity, rolled });
const all = { group: 'all', kind: 'all', rarity: 'all' } as const;

describe('vista de la mochila', () => {
  it('cuatro categorías: Equipo junta armadura, escudos y joyas', () => {
    expect(bagGroupOf(items['short_sword']!)).toBe('weapon');
    expect(bagGroupOf(items['oak_buckler']!)).toBe('gear');
    expect(bagGroupOf(items['copper_ring']!)).toBe('gear');
    expect(bagGroupOf(items['palm_cap']!)).toBe('gear');
    expect(bagGroupOf(items['minor_health_potion']!)).toBe('use');
    expect(bagGroupOf(items['hide']!)).toBe('material');
  });

  it('ordena por fecha de llegada (uid), no por casilla', () => {
    const slots = [inst('it5', 'short_sword'), null, inst('it2', 'palm_cap'), inst('itb', 'hide')];
    expect(bagEntries(slots, items, all, 'date').map((e) => e.item.uid)).toEqual(['it2', 'it5', 'itb']);
    expect(uidOrder('it10')).toBe(36);
  });

  it('lo filtrado no aparece y lo que queda va junto, sin huecos', () => {
    const slots = [inst('it1', 'short_sword'), null, null, inst('it2', 'palm_cap'), null, inst('it3', 'reed_bow')];
    const weapons = bagEntries(slots, items, { ...all, group: 'weapon' }, 'date');
    expect(weapons.map((e) => e.item.itemId)).toEqual(['short_sword', 'reed_bow']);
    expect(weapons.map((e) => e.index)).toEqual([0, 5]);
  });

  it('dos copias idénticas van en una casilla con la cantidad; con tiradas distintas, aparte', () => {
    const a = [{ stat: 'agility', op: 'flat', value: 1 }] as ItemInstance['rolled'];
    const b = [{ stat: 'agility', op: 'flat', value: 2 }] as ItemInstance['rolled'];
    const slots = [inst('it1', 'reed_bow', 1, a), inst('it2', 'reed_bow', 1, a), inst('it3', 'reed_bow', 1, b), inst('it4', 'hide', 3), inst('it5', 'hide', 2)];
    const e = bagEntries(slots, items, all, 'date');
    expect(e.map((x) => [x.item.itemId, x.count])).toEqual([['reed_bow', 2], ['reed_bow', 1], ['hide', 5]]);
    expect(e[0]!.uids).toEqual(['it1', 'it2']);
  });
});
