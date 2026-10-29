import { describe, expect, it } from 'vitest';
import type { SaveData } from '../../src/rpg/contracts';
import { RpgSessionFactory } from '../../src/rpg/session';
import { content, session } from './helpers';

describe('consumibles', () => {
  it('la poción cura, se gasta y tiene enfriamiento', () => {
    const s = session();
    const h = s.character;
    h.health = 10;
    const pot = () => h.inventory.slots.find((x) => x?.itemId === 'minor_health_potion')!.uid;
    expect(s.useItem(pot()).ok).toBe(true);
    expect(h.health).toBeGreaterThanOrEqual(35);
    expect(h.inventory.count('minor_health_potion')).toBe(2);
    expect(s.useItem(pot())).toEqual({ ok: false, reason: 'En enfriamiento' });
    h.tickTimers(5);
    expect(s.useItem(pot()).ok).toBe(true);
  });

  it('el elixir aplica su estado; el tónico devuelve recurso', () => {
    const s = session();
    const h = s.character;
    h.give('haste_elixir');
    h.give('resource_tonic');
    const speed = h.stats.get('moveSpeed');
    s.useItem(h.inventory.slots.find((x) => x?.itemId === 'haste_elixir')!.uid);
    expect(h.statuses.has('haste')).toBe(true);
    expect(h.stats.get('moveSpeed')).toBeGreaterThan(speed);
    h.resource = 0;
    s.useItem(h.inventory.slots.find((x) => x?.itemId === 'resource_tonic')!.uid);
    expect(h.resource).toBe(40);
  });
});

describe('mascotas', () => {
  it('el amuleto invoca y retira; sólo una activa; su bono va al dueño', () => {
    const s = session();
    const h = s.character;
    const fox = h.inventory.slots.find((x) => x?.itemId === 'charm_ash_fox')!;
    h.give('charm_moss_turtle');
    const turtle = h.inventory.slots.find((x) => x?.itemId === 'charm_moss_turtle')!;
    const power = h.stats.get('power');
    const armor = h.stats.get('armor');
    expect(s.pet()).toBeNull();
    expect(s.useItem(fox.uid).ok).toBe(true);
    expect(s.pet()).toMatchObject({ petId: 'ash_fox', itemUid: fox.uid });
    expect(h.stats.get('power')).toBe(power + 5);
    s.useItem(turtle.uid);
    expect(s.pet()!.petId).toBe('moss_turtle');
    expect(h.stats.get('power')).toBe(power);
    expect(h.stats.get('armor')).toBe(armor + 4);
    s.useItem(turtle.uid);
    expect(s.pet()).toBeNull();
    expect(h.stats.get('armor')).toBe(armor);
  });

  it('tirar el amuleto activo retira la mascota', () => {
    const s = session();
    const fox = s.character.inventory.slots.find((x) => x?.itemId === 'charm_ash_fox')!;
    s.useItem(fox.uid);
    s.dropItem(fox.uid, 1);
    expect(s.pet()).toBeNull();
    expect(s.character.stats.sourceIds().some((x) => x.startsWith('pet:'))).toBe(false);
  });
});

describe('guardar y cargar', () => {
  it('ida y vuelta conserva todo lo de SaveData y las estadísticas', () => {
    const s = session('storm_weaver', 42);
    const h = s.character;
    h.gainXp(400);
    h.addGold(77);
    s.spendStatPoint('intellect');
    s.spendStatPoint('spirit');
    h.give('storm_orb');
    h.give('fang', 12);
    h.give('scroll_gust', 2);
    s.useItem(h.inventory.slots.find((x) => x?.itemId === 'scroll_gust')!.uid);
    s.useItem(h.inventory.slots.find((x) => x?.itemId === 'scroll_gust')!.uid);
    s.equip(h.inventory.slots.find((x) => x?.itemId === 'storm_orb')!.uid);
    s.assignHotbar(5, 'gust');
    s.useItem(h.inventory.slots.find((x) => x?.itemId === 'charm_archivist_owl')!.uid);
    s.moveItem(0, 20);

    const save = s.save();
    const json = JSON.parse(JSON.stringify(save)) as SaveData;
    const back = new RpgSessionFactory(content()).load(json, 1);
    const again = back.save();
    expect({ ...again, savedAt: '' }).toEqual({ ...save, savedAt: '' });
    const norm = (lines: ReturnType<typeof s.player>['stats']) =>
      lines.map((l) => ({ ...l, breakdown: [...l.breakdown].sort((a, b) => a.source.localeCompare(b.source)) }));
    expect(norm(back.player().stats)).toEqual(norm(s.player().stats));
    expect(back.pet()?.petId).toBe('archivist_owl');
    expect(back.spellbook().known.find((k) => k.spellId === 'gust')!.rank).toBe(2);
    // Los objetos nuevos tras cargar no repiten uid.
    back.character.give('hide');
    const uids = back.inventory().slots.filter((x) => x).map((x) => x!.uid);
    expect(new Set(uids).size).toBe(uids.length);
  });

  it('descarta objetos y hechizos que ya no existen; rechaza otra versión', () => {
    const s = session();
    const save = s.save();
    save.inventory[25] = { uid: 'zz', itemId: 'objeto_borrado', quantity: 1, rolled: [] };
    save.known.push({ spellId: 'hechizo_borrado', rank: 1 });
    save.hotbar[0] = 'hechizo_borrado';
    const back = new RpgSessionFactory(content()).load(save, 1);
    expect(back.inventory().slots[25]).toBeNull();
    expect(back.spellbook().hotbar[0]).toBeNull();
    expect(() => new RpgSessionFactory(content()).load({ ...save, version: 2 as 1 }, 1)).toThrow(/versión/);
  });

  it('la fábrica crea partidas nuevas con el kit de la clase', () => {
    const f = new RpgSessionFactory(content());
    const s = f.newGame('storm_weaver', 'Nube', 3);
    expect(s.player()).toMatchObject({ name: 'Nube', classId: 'storm_weaver', level: 1, xp: 0, gold: 0 });
    expect(s.equipment().weapon?.itemId).toBe('copper_wand');
    expect(s.player().health).toBe(s.player().maxHealth);
    expect(s.player().maxResource).toBeGreaterThanOrEqual(content().classes['storm_weaver']!.resource.max);
    expect(() => f.newGame('nope', 'x', 1)).toThrow();
  });

  it('cada orden con éxito avisa de un cambio', () => {
    const s = session();
    let n = 0;
    const off = s.on((e) => e.type === 'changed' && n++);
    s.sortInventory();
    s.unequip('chest');
    expect(n).toBe(2);
    off();
    s.sortInventory();
    expect(n).toBe(2);
  });
});
