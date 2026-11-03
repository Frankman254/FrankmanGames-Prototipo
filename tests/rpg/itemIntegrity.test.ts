import { describe, expect, it } from 'vitest';
import { loadGameData } from '../../src/data';
import { Character } from '../../src/rpg/character';
import type { ItemInstance, SaveData } from '../../src/rpg/contracts';
import { Rng } from '../../src/sim/rng';

function fresh(): { content: ReturnType<typeof loadGameData>['rpg']; c: Character } {
  const content = loadGameData().rpg;
  const c = new Character(content, 'ember_vanguard', 'Integridad', new Rng(1));
  return { content, c };
}

/** Todas las instancias del personaje, estén donde estén. */
function everywhere(c: Character): ItemInstance[] {
  const out = c.inventory.slots.filter((s): s is ItemInstance => s !== null);
  for (const s of ['head', 'chest', 'hands', 'weapon', 'offhand', 'ring1', 'ring2', 'amulet', 'back', 'waist', 'feet'] as const) {
    const e = c.equipment.get(s);
    if (e) out.push(e);
  }
  return [...out, ...c.bank.view()];
}

const inst = (uid: string, itemId: string, over: Partial<ItemInstance> = {}): ItemInstance => ({ uid, itemId, quantity: 1, rolled: [], ...over });

function saveWith(c: Character, over: Partial<SaveData>): SaveData {
  return { ...c.toSave(new Date(0)), inventory: [], equipment: {}, bank: [], ...over };
}

describe('C01: UID únicos al cargar mochila, equipo y banco', () => {
  it('el mismo objeto en las tres ubicaciones queda una sola vez (manda el equipo) y se registra', () => {
    const { content, c } = fresh();
    const dup = inst('itz', 'short_sword');
    const save = saveWith(c, { inventory: [{ ...dup }], equipment: { weapon: { ...dup } }, bank: [{ ...dup }] });
    const loaded = Character.fromSave(content, save, new Rng(2));
    expect(loaded.equipment.get('weapon')?.uid).toBe('itz');
    expect(everywhere(loaded).filter((i) => i.itemId === 'short_sword')).toHaveLength(1);
    expect(loaded.loadRepairs).toHaveLength(2);
    expect(loaded.loadRepairs[0]).toMatch(/itz/);
  });

  it('objetos distintos con el mismo UID no se pierden: el segundo recibe uno nuevo', () => {
    const { content, c } = fresh();
    const save = saveWith(c, { inventory: [inst('itz', 'short_sword')], bank: [inst('itz', 'woodcutter_axe')] });
    const loaded = Character.fromSave(content, save, new Rng(2));
    const all = everywhere(loaded);
    expect(all.map((i) => i.itemId).sort()).toEqual(['short_sword', 'woodcutter_axe']);
    expect(new Set(all.map((i) => i.uid)).size).toBe(2);
    expect(loaded.loadRepairs).toHaveLength(1);
  });

  it('el mismo objeto con propiedades distintas cuenta como otro objeto', () => {
    const { content, c } = fresh();
    const a = inst('itz', 'short_sword', { rolled: [{ stat: 'strength', op: 'flat', value: 1 }] });
    const b = inst('itz', 'short_sword', { rolled: [{ stat: 'strength', op: 'flat', value: 2 }] });
    const loaded = Character.fromSave(content, saveWith(c, { inventory: [a, b] }), new Rng(2));
    const swords = everywhere(loaded).filter((i) => i.itemId === 'short_sword');
    expect(swords).toHaveLength(2);
    expect(swords.map((s) => s.rolled[0]!.value).sort()).toEqual([1, 2]);
    expect(new Set(swords.map((s) => s.uid)).size).toBe(2);
  });

  it('dentro del banco tampoco se pierden objetos distintos con UID repetido', () => {
    const { content, c } = fresh();
    const loaded = Character.fromSave(content, saveWith(c, { bank: [inst('itz', 'fang', { quantity: 2 }), inst('itz', 'hide', { quantity: 3 })] }), new Rng(2));
    expect(loaded.bank.view().map((i) => i.itemId).sort()).toEqual(['fang', 'hide']);
  });

  it('tras cargar, el contador no reutiliza ningún UID de ninguna ubicación', () => {
    const { content, c } = fresh();
    const save = saveWith(c, { inventory: [inst('itc', 'fang')], equipment: { weapon: inst('itz', 'short_sword') }, bank: [inst('it10', 'hide')] });
    const loaded = Character.fromSave(content, save, new Rng(2));
    const used = new Set(everywhere(loaded).map((i) => i.uid));
    for (let k = 0; k < 40; k++) {
      loaded.give('fang', 1);
    }
    const created = loaded.items.create('hide');
    expect(used.has(created.uid)).toBe(false);
    expect(parseInt(created.uid.slice(2), 36)).toBeGreaterThan(36);
  });

  it('un guardado sano no se repara ni cambia ningún UID', () => {
    const { content, c } = fresh();
    c.give('short_sword');
    c.give('fang', 3);
    const uids = everywhere(c).map((i) => i.uid).sort();
    const loaded = Character.fromSave(content, c.toSave(new Date(0)), new Rng(2));
    expect(everywhere(loaded).map((i) => i.uid).sort()).toEqual(uids);
    expect(loaded.loadRepairs).toEqual([]);
  });
});

describe('C02: las pilas conservan sus propiedades', () => {
  const bonus: ItemInstance['rolled'] = [{ stat: 'strength', op: 'flat', value: 7 }];

  it('dos copias con bonificación distinta no se fusionan al transferir ni al ordenar', () => {
    const { c } = fresh();
    c.inventory.addTransferred(inst('ita', 'fang', { quantity: 2, bonus }));
    c.inventory.addTransferred(inst('itb', 'fang', { quantity: 3 }));
    c.inventory.sort();
    const fangs = c.inventory.slots.filter((s): s is ItemInstance => s?.itemId === 'fang');
    expect(fangs).toHaveLength(2);
    expect(fangs.find((f) => f.uid === 'ita')).toMatchObject({ quantity: 2, bonus });
    expect(fangs.find((f) => f.uid === 'itb')?.quantity).toBe(3);
    expect(fangs.find((f) => f.uid === 'itb')?.bonus).toBeUndefined();
    expect(c.inventory.count('fang')).toBe(5);
  });

  it('las copias iguales siguen apilándose', () => {
    const { c } = fresh();
    c.inventory.addTransferred(inst('ita', 'fang', { quantity: 2 }));
    c.inventory.addTransferred(inst('itb', 'fang', { quantity: 3 }));
    expect(c.inventory.slots.filter((s) => s?.itemId === 'fang')).toHaveLength(1);
    expect(c.inventory.count('fang')).toBe(5);
  });

  it('dividir una pila conserva la bonificación y no comparte referencias', () => {
    const { c } = fresh();
    const src = inst('ita', 'fang', { quantity: 4, bonus });
    const part = c.items.split(src, 1);
    expect(part.bonus).toEqual(bonus);
    expect(part.bonus).not.toBe(src.bonus);
    expect(part.uid).not.toBe('ita');
  });

  it('mover una pila sobre otra con propiedades distintas no las mezcla', () => {
    const { c } = fresh();
    c.inventory.restoreAt(0, inst('ita', 'fang', { quantity: 2, bonus }));
    c.inventory.restoreAt(1, inst('itb', 'fang', { quantity: 3 }));
    c.inventory.move(0, 1);
    const fangs = c.inventory.slots.filter((s): s is ItemInstance => s?.itemId === 'fang');
    expect(fangs).toHaveLength(2);
    expect(c.inventory.count('fang')).toBe(5);
    expect(fangs.find((f) => f.uid === 'ita')?.bonus).toEqual(bonus);
  });
});
