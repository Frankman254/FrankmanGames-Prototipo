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
  const character = new Character(content, 'ember_vanguard', 'Banco', rng);
  return new GameSession(content, character, rng);
}

describe('banco en sesión y guardado', () => {
  it('exige acceso al banco y nunca deposita objetos equipados', () => {
    const s = setup();
    const c = s.character;
    c.give('short_sword');
    const sword = c.inventory.slots.find(Boolean)!;
    c.equip(sword.uid);
    c.give('fang', 2);
    const fang = c.inventory.slots.find(Boolean)!;
    expect(s.bankDeposit([fang.uid]).ok).toBe(false);
    expect(c.inventory.find(fang.uid)).not.toBeNull();
    s.setBankAccess(true);
    expect(s.bankDeposit([sword.uid]).ok).toBe(false);
    expect(c.equipment.get('weapon')?.uid).toBe(sword.uid);
    expect(s.bankDeposit([fang.uid]).ok).toBe(true);
    s.setBankAccess(false);
    expect(s.bankWithdraw([fang.uid]).ok).toBe(false);
    expect(s.bank()).toHaveLength(1);
  });

  it('guarda banco, restaura su contenido y exige reabrir acceso tras cargar', () => {
    const s = setup();
    s.character.give('fang', 2);
    const fang = s.character.inventory.slots.find(Boolean)!;
    s.setBankAccess(true);
    expect(s.bankDeposit([fang.uid]).ok).toBe(true);
    const loaded = new RpgSessionFactory(s.content).load(s.save(), 2);
    expect(loaded.bank()).toEqual([fang]);
    expect(loaded.bankWithdraw([fang.uid]).ok).toBe(false);
    loaded.setBankAccess(true);
    expect(loaded.bankWithdraw([fang.uid]).ok).toBe(true);
    expect(loaded.bank()).toEqual([]);
    expect(loaded.character.inventory.count('fang')).toBe(2);
  });

  it('permite botín forzado con sobrepeso y retirar del banco sólo lo posible', () => {
    const s = setup();
    const c = s.character;
    const deposited = c.items.create('fang', 5);
    c.bank.restore([deposited]);
    s.setBankAccess(true);
    expect(s.bankWithdraw([deposited.uid]).ok).toBe(false);
    expect(c.inventory.count('fang')).toBe(3);
    expect(s.bank()[0]!.quantity).toBe(2);
    const loot = c.items.create('fang', 2);
    c.emit({ type: 'spoils', spoils: { id: 0, gold: 0, xp: 0, kills: 1, seconds: 1, share: 1, items: [loot], participants: [] } });
    expect(s.takeSpoils('all').ok).toBe(true);
    expect(s.spoils()).toBeNull();
    expect(c.inventory.count('fang')).toBe(5);
    expect(c.inventory.bagWeight).toBe(5);
    expect(s.bankWithdraw([deposited.uid]).ok).toBe(false);
    expect(s.bank()[0]!.quantity).toBe(2);
  });
});
