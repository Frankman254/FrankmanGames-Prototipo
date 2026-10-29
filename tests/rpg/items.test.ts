import { describe, expect, it } from 'vitest';
import { equipmentSources, ItemFactory, rollQuality } from '../../src/rpg/items';
import { Rng } from '../../src/sim/rng';
import { content, hero, session } from './helpers';

describe('tiradas de objetos', () => {
  it('dos copias del mismo objeto difieren; misma semilla, mismas tiradas', () => {
    const f = new ItemFactory(content(), new Rng(5));
    const copies = Array.from({ length: 20 }, () => f.create('woodcutter_axe'));
    const def = content().items['woodcutter_axe']!;
    for (const c of copies) {
      def.rolls.forEach((r, i) => {
        expect(c.rolled[i]!.value).toBeGreaterThanOrEqual(r.min);
        expect(c.rolled[i]!.value).toBeLessThanOrEqual(r.max);
        expect(Number.isInteger(c.rolled[i]!.value)).toBe(true);
      });
    }
    expect(new Set(copies.map((c) => JSON.stringify(c.rolled))).size).toBeGreaterThan(1);
    expect(new Set(copies.map((c) => c.uid)).size).toBe(20);
    const g = new ItemFactory(content(), new Rng(5));
    expect(g.create('woodcutter_axe').rolled).toEqual(copies[0]!.rolled);
  });

  it('tiradas con decimales y calidad entre 0 y 1', () => {
    const f = new ItemFactory(content(), new Rng(9));
    const g = f.create('explorer_gloves');
    expect(g.rolled[0]!.value).toBeGreaterThanOrEqual(0.01);
    expect(g.rolled[0]!.value).toBeLessThanOrEqual(0.03);
    const q = rollQuality(content().items['explorer_gloves']!, g);
    expect(q).toBeGreaterThanOrEqual(0);
    expect(q).toBeLessThanOrEqual(1);
  });
});

describe('inventario', () => {
  it('apila hasta maxStack y desborda a otro hueco', () => {
    const h = hero();
    const before = h.inventory.count('fang');
    expect(h.give('fang', 70)).toBe(0);
    expect(h.inventory.count('fang')).toBe(before + 70);
    const stacks = h.inventory.slots.filter((s) => s?.itemId === 'fang');
    expect(stacks.map((s) => s!.quantity).sort((a, b) => b - a)).toEqual([50, 20]);
  });

  it('lleno: devuelve lo que no cabe', () => {
    const h = hero();
    while (h.inventory.freeSlots() > 0) h.give('short_sword');
    expect(h.give('short_sword')).toBe(1);
    expect(h.give('fang', 3)).toBe(3);
  });

  it('mover a vacío, intercambiar y fusionar pilas', () => {
    const s = session();
    const inv = s.character.inventory;
    inv.slots.fill(null);
    s.character.give('fang', 10);
    s.character.give('short_sword');
    expect(s.moveItem(0, 5).ok).toBe(true);
    expect(inv.slots[5]!.itemId).toBe('fang');
    expect(s.moveItem(1, 5).ok).toBe(true); // intercambio
    expect(inv.slots[5]!.itemId).toBe('short_sword');
    expect(inv.slots[1]!.itemId).toBe('fang');
    inv.putAt(8, s.character.items.create('fang', 45));
    expect(s.moveItem(8, 1).ok).toBe(true); // 10 + 45: llena a 50 y deja 5
    expect(inv.slots[1]!.quantity).toBe(50);
    expect(inv.slots[8]!.quantity).toBe(5);
    expect(inv.count('fang')).toBe(55);
    expect(s.moveItem(99, 0).ok).toBe(false);
  });

  it('ordenar agrupa por categoría y rareza y fusiona pilas', () => {
    const s = session();
    const inv = s.character.inventory;
    inv.slots.fill(null);
    inv.putAt(7, s.character.items.create('fang', 5));
    inv.putAt(3, s.character.items.create('minor_health_potion', 2));
    inv.putAt(9, s.character.items.create('fang', 6));
    inv.putAt(1, s.character.items.create('storm_orb'));
    inv.putAt(4, s.character.items.create('short_sword'));
    s.sortInventory();
    expect(inv.slots.slice(0, 4).map((x) => x?.itemId)).toEqual(['storm_orb', 'short_sword', 'minor_health_potion', 'fang']);
    expect(inv.slots[3]!.quantity).toBe(11);
    expect(inv.slots[4]).toBeNull();
  });

  it('tirar parte de una pila deja el resto', () => {
    const s = session();
    const pot = s.character.inventory.slots.find((x) => x?.itemId === 'minor_health_potion')!;
    expect(s.dropItem(pot.uid, 2).ok).toBe(true);
    expect(s.character.inventory.count('minor_health_potion')).toBe(1);
    expect(s.dropItem(pot.uid, 0).ok).toBe(false);
  });
});

describe('equipo y sets', () => {
  it('equipar y desequipar mueve el objeto y cambia las estadísticas', () => {
    const s = session();
    const h = s.character;
    h.give('iron_helm');
    const helm = h.inventory.slots.find((x) => x?.itemId === 'iron_helm')!;
    const armor = h.stats.get('armor');
    expect(s.equip(helm.uid).ok).toBe(false); // requiere nivel 2
    h.gainXp(h.xpToNext);
    expect(s.equip(helm.uid).ok).toBe(true);
    expect(s.equipment().head?.uid).toBe(helm.uid);
    expect(h.inventory.find(helm.uid)).toBeNull();
    expect(h.stats.get('armor')).toBe(armor + 3);
    expect(h.stats.line('armor').breakdown.some((b) => b.source === `item:${helm.uid}`)).toBe(true);
    expect(s.unequip('head').ok).toBe(true);
    expect(h.stats.get('armor')).toBe(armor);
    expect(s.unequip('head').ok).toBe(false);
  });

  it('equipar en un hueco ocupado devuelve lo anterior al inventario; los anillos van a ring1/ring2', () => {
    const s = session();
    const h = s.character;
    const oldWeapon = s.equipment().weapon!;
    h.give('copper_wand');
    const wand = h.inventory.slots.find((x) => x?.itemId === 'copper_wand')!;
    expect(s.equip(wand.uid).ok).toBe(true);
    expect(h.inventory.find(oldWeapon.uid)).not.toBeNull();
    expect(h.weapon()?.id).toBe('copper_wand');
    h.give('copper_ring', 2);
    const rings = h.inventory.slots.filter((x) => x?.itemId === 'copper_ring');
    expect(s.equip(rings[0]!.uid).ok).toBe(true);
    expect(s.equip(rings[1]!.uid).ok).toBe(true);
    expect(s.equipment().ring1?.uid).toBe(rings[0]!.uid);
    expect(s.equipment().ring2?.uid).toBe(rings[1]!.uid);
    expect(s.equip(h.inventory.slots.find((x) => x?.itemId === 'fang' || x?.itemId === 'minor_health_potion')!.uid).ok).toBe(false);
    expect(s.equip(wand.uid, 'head').ok).toBe(false);
  });

  it('los bonos de set se acumulan por número de piezas', () => {
    const c = content();
    const f = new ItemFactory(c, new Rng(1));
    const parts = ['explorer_hood', 'explorer_jerkin', 'explorer_gloves', 'explorer_boots'].map((id) => f.create(id));
    const one = equipmentSources(c, { head: parts[0]! });
    expect(one.has('set:explorer')).toBe(false);
    const two = equipmentSources(c, { head: parts[0]!, chest: parts[1]! });
    expect(two.get('set:explorer')).toHaveLength(2);
    const four = equipmentSources(c, { head: parts[0]!, chest: parts[1]!, hands: parts[2]!, feet: parts[3]! });
    expect(four.get('set:explorer')).toHaveLength(4);
  });

  it('el set se nota en la hoja del personaje y en la comparación', () => {
    const s = session('storm_weaver');
    const h = s.character;
    h.gainXp(1000);
    h.give('apprentice_cowl');
    const cowl = h.inventory.slots.find((x) => x?.itemId === 'apprentice_cowl')!;
    const delta = s.compareEquip(cowl.uid);
    const intel = delta.find((d) => d.stat === 'intellect')!;
    const cowlInt = cowl.rolled[0]!.value;
    expect(intel.after - intel.before).toBeCloseTo(cowlInt + 4); // + bono de 2 piezas (con la túnica inicial)
    const before = h.stats.get('intellect');
    s.equip(cowl.uid);
    expect(h.stats.get('intellect')).toBeCloseTo(before + cowlInt + 4);
    expect(h.stats.has('set:storm_apprentice')).toBe(true);
  });

  it('valor de venta según rareza, calidad y cantidad', () => {
    const s = session();
    const pot = s.character.inventory.slots.find((x) => x?.itemId === 'minor_health_potion')!;
    const r = content().rules;
    const each = Math.floor(5 * r.rarityValue.common * r.sellRatio * 1);
    expect(s.sellValue(pot.uid)).toBe(each * pot.quantity);
    expect(s.sellValue('nada')).toBe(0);
  });
});
