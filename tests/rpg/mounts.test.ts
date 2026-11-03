import { describe, expect, it } from 'vitest';
import { loadGameData } from '../../src/data';
import { Character } from '../../src/rpg/character';
import { EQUIP_SLOTS } from '../../src/rpg/contracts';
import { fitsEquipSlot } from '../../src/rpg/items';
import { GameSession } from '../../src/rpg/session';
import { Rng } from '../../src/sim/rng';

function setup(): { s: GameSession; c: Character; data: ReturnType<typeof loadGameData> } {
  const data = loadGameData();
  const rng = new Rng(1);
  const c = Character.create(data.rpg, 'storm_weaver', 'Prueba', rng);
  c.level = 20;
  return { s: new GameSession(data.rpg, c, rng), c, data };
}

function equip(s: GameSession, c: Character, itemId: string): void {
  c.give(itemId, 1);
  const uid = c.inventory.slots.find((i) => i?.itemId === itemId)!.uid;
  expect(s.equip(uid, 'mount').ok).toBe(true);
}

describe('monturas', () => {
  it('tienen su propio hueco y sólo entran ellas', () => {
    const { data } = setup();
    expect(EQUIP_SLOTS).toContain('mount');
    const mule = data.rpg.items['mount_mule']!;
    expect(fitsEquipSlot(mule, 'mount')).toBe(true);
    expect(fitsEquipSlot(mule, 'back')).toBe(false);
    expect(fitsEquipSlot(data.rpg.items['padded_vest']!, 'mount')).toBe(false);
  });

  it('todas dan velocidad y alguna característica más', () => {
    const { data } = setup();
    const mounts = Object.values(data.rpg.items).filter((i) => i.slot === 'mount');
    expect(mounts.length).toBeGreaterThanOrEqual(3);
    for (const m of mounts) {
      expect(m.mount, m.id).toBeDefined();
      expect(m.implicit.find((x) => x.stat === 'moveSpeed')?.value ?? 0, m.id).toBeGreaterThan(0);
      expect(m.implicit.length, m.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('equiparla sube la velocidad y quitarla la devuelve', () => {
    const { s, c, data } = setup();
    const base = c.stats.get('moveSpeed');
    equip(s, c, 'mount_horse');
    const bonus = data.rpg.items['mount_horse']!.implicit.find((x) => x.stat === 'moveSpeed')!.value;
    expect(c.stats.get('moveSpeed')).toBeCloseTo(base + bonus);
    expect(s.unequip('mount').ok).toBe(true);
    expect(c.stats.get('moveSpeed')).toBeCloseTo(base);
  });

  it('se lleva a la vez que la mascota', () => {
    const { s, c } = setup();
    c.give('charm_ash_fox', 1);
    const charm = c.inventory.slots.find((i) => i?.itemId === 'charm_ash_fox');
    if (charm) expect(s.useItem(charm.uid).ok).toBe(true);
    equip(s, c, 'mount_mule');
    expect(s.equipment().mount?.itemId).toBe('mount_mule');
    if (charm) expect(c.activePetItemUid).toBe(charm.uid);
  });

  it('se guarda con la partida, y los guardados sin montura siguen cargando', () => {
    const { s, c, data } = setup();
    equip(s, c, 'mount_tapir');
    const save = JSON.parse(JSON.stringify(s.save()));
    expect(Character.fromSave(data.rpg, save, new Rng(2)).equipment.get('mount')?.itemId).toBe('mount_tapir');
    delete save.equipment.mount;
    expect(Character.fromSave(data.rpg, save, new Rng(2)).equipment.get('mount')).toBeFalsy();
  });
});
