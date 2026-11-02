import { describe, expect, it } from 'vitest';
import { Inventory, ItemFactory } from '../../src/rpg/items';
import { Rng } from '../../src/sim/rng';
import { content } from './helpers';

function setup(maxWeight = 5) {
  const db = structuredClone(content());
  db.progression.inventoryMaxWeight = maxWeight;
  db.progression.defaultItemWeight = 1;
  db.items.short_sword!.weight = 1;
  db.items.fang!.weight = 0.5;
  const factory = new ItemFactory(db, new Rng(1));
  return { inv: new Inventory(db, 1, factory), factory };
}

describe('inventario limitado por peso', () => {
  it('crece más allá de sus posiciones iniciales hasta alcanzar el peso', () => {
    const { inv, factory } = setup(3);
    for (let i = 0; i < 3; i++) expect(inv.add(factory.create('short_sword'))).toBe(0);
    expect(inv.size).toBe(3);
    expect(inv.bagWeight).toBe(3);
    expect(inv.canAdd(factory.create('short_sword'))).toBe(false);
    expect(inv.add(factory.create('short_sword'))).toBe(1);
  });

  it('apila sólo la cantidad admitida y conserva el sobrante fuera', () => {
    const { inv, factory } = setup(2.5);
    const stack = factory.create('fang', 8);
    expect(inv.capacityFor(stack)).toBe(5);
    expect(inv.canAdd(stack)).toBe(false);
    expect(inv.add(stack)).toBe(3);
    expect(stack.quantity).toBe(3);
    expect(inv.count('fang')).toBe(5);
    expect(inv.slots[0]).not.toBe(stack);
    expect(inv.remainingWeight).toBe(0);
  });

  it('cuenta sólo mochila y valida putAt como ingreso', () => {
    const { inv, factory } = setup(2);
    const equippedOutsideBag = factory.create('short_sword');
    expect(equippedOutsideBag.quantity).toBe(1);
    expect(inv.carriedWeight).toBe(0);
    expect(inv.putAt(4, factory.create('short_sword'))).toBe(true);
    expect(inv.carriedWeight).toBe(1);
    expect(inv.putAt(5, factory.create('short_sword'))).toBe(true);
    expect(inv.putAt(6, factory.create('short_sword'))).toBe(false);
    expect(inv.remainingWeight).toBe(0);
  });

  it('restaura posiciones lejanas y ordena/mueve sobrepeso sin perder objetos', () => {
    const { inv, factory } = setup(1);
    expect(inv.restoreAt(7, factory.create('fang', 6))).toBe(true);
    expect(inv.restoreAt(9, factory.create('short_sword'))).toBe(true);
    expect(inv.restoreAt(9, factory.create('short_sword'))).toBe(false);
    expect(inv.bagWeight).toBe(4);
    inv.sort('name');
    const sword = inv.slots.findIndex((s) => s?.itemId === 'short_sword');
    expect(inv.move(sword, 12)).toBe(true);
    expect(inv.count('fang')).toBe(6);
    expect(inv.count('short_sword')).toBe(1);
    expect(inv.bagWeight).toBe(4);
    expect(inv.canAdd(factory.create('fang'))).toBe(false);
  });

  it('permite transferencias internas y fusión de pilas sobre el límite', () => {
    const { inv, factory } = setup(1);
    expect(inv.addTransferred(factory.create('fang', 40))).toBe(0);
    expect(inv.addTransferred(factory.create('fang', 20))).toBe(0);
    expect(inv.count('fang')).toBe(60);
    expect(inv.slots.filter(Boolean).map((s) => s!.quantity)).toEqual([50, 10]);
    inv.sort();
    expect(inv.count('fang')).toBe(60);
    expect(inv.bagWeight).toBe(30);
  });
});
