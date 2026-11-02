import { describe, expect, it } from 'vitest';
import { BankStorage } from '../../src/rpg/bank';
import { Inventory, ItemFactory } from '../../src/rpg/items';
import { Rng } from '../../src/sim/rng';
import { content } from './helpers';

function setup(maxWeight = 5) {
  const db = structuredClone(content());
  db.progression.inventoryMaxWeight = maxWeight;
  db.items.fang!.weight = 1;
  db.items.short_sword!.weight = 1;
  const factory = new ItemFactory(db, new Rng(1));
  return { bank: new BankStorage(db, factory), bag: new Inventory(db, 1, factory), factory };
}

describe('banco de objetos de mochila', () => {
  it('deposita varias pilas incluso con sobrepeso y no duplica selecciones', () => {
    const { bank, bag, factory } = setup(1);
    const a = factory.create('fang', 20);
    const b = factory.create('short_sword');
    bag.addTransferred(a);
    bag.addTransferred(b);
    expect(bank.deposit(bag, [a.uid, b.uid, a.uid, 'missing'])).toBe(2);
    expect(bag.bagWeight).toBe(0);
    expect(bank.view().map((i) => i.uid)).toEqual([a.uid, b.uid]);
    expect(bank.deposit(bag, [a.uid])).toBe(0);
  });

  it('retira parcialmente por peso, conserva el resto y respeta el límite', () => {
    const { bank, bag, factory } = setup(3);
    const stack = factory.create('fang', 8);
    bank.restore([stack]);
    expect(bank.withdraw(bag, [stack.uid, stack.uid])).toEqual({ moved: 1, blocked: true });
    expect(bag.count('fang')).toBe(3);
    expect(bank.view()[0]!.quantity).toBe(5);
    expect(bank.view()[0]!.uid).toBe(stack.uid);
    expect(bag.slots.find(Boolean)!.uid).not.toBe(stack.uid);
    expect(bank.withdraw(bag, [stack.uid])).toEqual({ moved: 0, blocked: true });
    const part = bag.slots.find(Boolean)!;
    bank.deposit(bag, [part.uid]);
    expect(bank.view().reduce((n, i) => n + i.quantity, 0)).toBe(8);
  });

  it('conserva uid, tiradas y bonos al guardar/restaurar; las vistas son copias', () => {
    const { bank, bag, factory } = setup();
    const sword = factory.create('short_sword');
    sword.bonus = [{ stat: 'power', op: 'flat', value: 7 }];
    bank.restore([sword]);
    const saved = bank.toSave();
    expect(saved).toEqual([sword]);
    saved[0]!.quantity = 99;
    saved[0]!.bonus![0]!.value = 99;
    expect(bank.view()).toEqual([sword]);
    bank.restore(bank.toSave());
    expect(bank.withdraw(bag, [sword.uid])).toEqual({ moved: 1, blocked: false });
    expect(bag.find(sword.uid)).toEqual(sword);
    expect(bank.view()).toEqual([]);
  });

  it('ignora desconocidos, cantidades inválidas y uid duplicados al restaurar', () => {
    const { bank, factory } = setup();
    const item = factory.create('fang', 2);
    bank.restore([item, { ...item }, { ...item, uid: 'unknown', itemId: 'no-existe' }, { ...item, uid: 'zero', quantity: 0 }]);
    expect(bank.view()).toEqual([item]);
    bank.restore(undefined);
    expect(bank.view()).toEqual([]);
  });
});
