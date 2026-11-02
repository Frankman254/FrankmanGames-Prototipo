import { describe, expect, it } from 'vitest';
import { loadGameData } from '../../src/data';
import { Character } from '../../src/rpg/character';
import { Rng } from '../../src/sim/rng';
import { World } from '../../src/sim/world';

function setup() {
  const data = loadGameData();
  data.rpg.progression.inventoryMaxWeight = 3;
  data.rpg.items.fang!.weight = 1;
  data.rpg.items.short_sword!.weight = 1;
  const character = new Character(data.rpg, 'ember_vanguard', 'Peso', new Rng(1));
  return { data, character };
}

describe('integración de carga en mochila', () => {
  it('el equipo no pesa en mochila y desequipar no destruye objetos al límite', () => {
    const { character: c } = setup();
    c.give('short_sword');
    const sword = c.inventory.slots.find((item) => item?.itemId === 'short_sword')!;
    expect(c.equip(sword.uid).ok).toBe(true);
    expect(c.inventory.bagWeight).toBe(0);
    c.give('fang', 3);
    expect(c.inventory.bagWeight).toBe(3);
    expect(c.unequip('weapon').ok).toBe(true);
    expect(c.inventory.bagWeight).toBe(4);
    expect(c.inventory.find(sword.uid)).not.toBeNull();
    expect(c.equipment.get('weapon')).toBeNull();
  });

  it('el guardado conserva sobrepeso, posiciones posteriores al tamaño legado y banco', () => {
    const { data, character: c } = setup();
    const sword = c.items.create('short_sword');
    c.inventory.restoreAt(data.rpg.progression.inventorySize + 5, sword);
    c.pickUp(c.items.create('fang', 7), true);
    const banked = c.items.create('short_sword');
    c.inventory.addTransferred(banked);
    expect(c.bank.deposit(c.inventory, [banked.uid])).toBe(1);
    const restored = Character.fromSave(data.rpg, c.toSave(new Date()), new Rng(2));
    expect(restored.inventory.find(sword.uid)).toEqual(sword);
    expect(restored.inventory.count('fang')).toBe(7);
    expect(restored.inventory.bagWeight).toBe(8);
    expect(restored.bank.view()).toEqual([banked]);
    expect(restored.pickUp(restored.items.create('fang'))).toBe(1);
  });

  it('la recompensa obligatoria permite sobrepeso y la velocidad se reduce a la mitad hasta descargar', () => {
    const { data, character: c } = setup();
    const world = new World(data, { encounter: false, character: c, seed: 1 });
    c.give('fang', 3);
    world.tick(1 / 60);
    const normalSpeed = world.player.speed;
    expect(c.pickUp(c.items.create('fang'))).toBe(1);
    const mandatory = c.items.create('fang');
    expect(c.pickUp(mandatory, true)).toBe(0);
    expect(c.inventory.bagWeight).toBe(4);
    world.tick(1 / 60);
    expect(world.player.speed).toBeCloseTo(normalSpeed * 0.5);
    const stack = c.inventory.slots.find((item) => item?.itemId === 'fang')!;
    c.inventory.remove(stack.uid, 1);
    world.tick(1 / 60);
    expect(world.player.speed).toBeCloseTo(normalSpeed);
  });
});
