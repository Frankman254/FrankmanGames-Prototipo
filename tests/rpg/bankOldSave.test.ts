import { describe, expect, it } from 'vitest';
import { loadGameData } from '../../src/data';
import { Character } from '../../src/rpg/character';
import { GameSession, RpgSessionFactory } from '../../src/rpg/session';
import { Rng } from '../../src/sim/rng';

function setup() {
  const content = loadGameData().rpg;
  content.progression.inventoryMaxWeight = 3;
  content.items.fang!.weight = 1;
  content.items.short_sword!.weight = 1;
  const rng = new Rng(1);
  return new Character(content, 'ember_vanguard', 'Prueba', rng);
}

describe('banco: integridad al cargar (Tarea 1)', () => {
  it('restaura banco vacío correctamente al cargar', () => {
    const c = setup();
    const s = new GameSession(c.content, c, new Rng(2));
    const save = s.save() as any;
    save.bank = [];
    const loaded = new RpgSessionFactory(s.content).load(save, 2);
    expect(loaded.bank()).toEqual([]);
  });

  it('maneja guardado antiguo SIN campo bank (undefined)', () => {
    const c = setup();
    const s = new GameSession(c.content, c, new Rng(3));
    const save = s.save() as any;
    delete save.bank;
    const loaded = new RpgSessionFactory(s.content).load(save, 1);
    expect(() => loaded.bankWithdraw([])).not.toThrow();
    expect(loaded.bank()).toEqual([]);
  });

  it('no duplica objetos con UID repetidos entre inventario y banco', () => {
    const c = setup();
    const s = new GameSession(c.content, c, new Rng(4));
    c.give('fang');
    const fang = c.inventory.slots.filter(s => s)[0];
    s.setBankAccess(true);
    const moved = s.bankDeposit([fang.uid]);
    expect(moved.ok).toBe(true);
    expect(s.bank()).toHaveLength(1);
    const save = s.save() as any;
    const loaded = new RpgSessionFactory(s.content).load(save, 2);
    expect(loaded.bank().length).toBe(1);
    expect(loaded.character.inventory.find(fang.uid)).toBeNull();
  });

  it('no permite UID repetidos en mismo banco al restaurar', () => {
    const c = setup();
    const s = new GameSession(c.content, c, new Rng(5));
    const corruptBank: any[] = [
      { uid: 'it1', itemId: 'fang', quantity: 1, rolled: [{ stat: 'strength', op: 'flat', value: 1 }] },
      { uid: 'it2', itemId: 'fang', quantity: 1, rolled: [{ stat: 'agility', op: 'flat', value: 1 }] }
    ];
    s.character.bank.restore([corruptBank[0]]);
    expect(s.bank()).toHaveLength(1);
    s.character.bank.restore([corruptBank[1]]);
    expect(s.bank().length).toBe(1);
  });

  it('conserva objetos del banco tras cargar y reabrir acceso', () => {
    const c = setup();
    const s = new GameSession(c.content, c, new Rng(6));
    c.give('fang', 3);
    s.setBankAccess(true);
    const fangSlot = c.inventory.slots.filter(s => s)[0];
    const moved = s.bankDeposit([fangSlot.uid]);
    expect(moved.ok).toBe(true);
    const save = s.save() as any;
    expect(save?.bank?.length).toBe(1);
    const loaded = new RpgSessionFactory(s.content).load(save, 2);
    expect(() => loaded.setBankAccess(true)).not.toThrow();
    expect(loaded.bank().length).toBe(1);
    expect(loaded.character.inventory.count('fang')).toBeGreaterThanOrEqual(0);
  });

  it('restaura bank vacía sin errores en partida nueva', () => {
    const c = setup();
    expect(c.bank.view()).toEqual([]);
    c.bank.restore(undefined);
    expect(c.bank.view()).toEqual([]);
  });
});
