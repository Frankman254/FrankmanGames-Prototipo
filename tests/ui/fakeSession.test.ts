import { describe, expect, it } from 'vitest';
import { FAKE_CONTENT } from '../../src/ui/menus/fake/content';
import { FakeSession, createFakeFactory } from '../../src/ui/menus/fake/fakeSession';

describe('contenido de ejemplo', () => {
  it('tiene lo pedido: 2 clases, ≥12 hechizos, ≥30 objetos, 3 mascotas', () => {
    expect(Object.keys(FAKE_CONTENT.classes)).toHaveLength(2);
    expect(Object.keys(FAKE_CONTENT.spells).length).toBeGreaterThanOrEqual(12);
    expect(Object.keys(FAKE_CONTENT.items).length).toBeGreaterThanOrEqual(30);
    expect(Object.keys(FAKE_CONTENT.pets)).toHaveLength(3);
  });

  it('todas las referencias existen', () => {
    for (const c of Object.values(FAKE_CONTENT.classes)) {
      for (const sp of c.startingSpells) expect(FAKE_CONTENT.spells[sp], sp).toBeDefined();
      for (const it of c.startingItems) expect(FAKE_CONTENT.items[it.itemId], it.itemId).toBeDefined();
    }
    for (const it of Object.values(FAKE_CONTENT.items)) {
      if (it.setId) expect(FAKE_CONTENT.sets[it.setId], it.id).toBeDefined();
      if (it.use?.kind === 'learnSpell') expect(FAKE_CONTENT.spells[it.use.spellId]).toBeDefined();
      if (it.use?.kind === 'summonPet') expect(FAKE_CONTENT.pets[it.use.petId]).toBeDefined();
    }
    for (const sp of Object.values(FAKE_CONTENT.spells)) {
      for (const e of sp.effects) if (e.type === 'status') expect(FAKE_CONTENT.statuses[e.statusId], e.statusId).toBeDefined();
    }
  });
});

describe('FakeSession', () => {
  it('partida nueva: kit equipado, hechizos de inicio y barra', () => {
    const s = createFakeFactory().newGame('ember_vanguard', 'Brasa', 1);
    expect(s.equipment().weapon?.itemId).toBe('short_sword');
    expect(s.equipment().chest?.itemId).toBe('explorer_tunic');
    expect(s.spellbook().hotbar.slice(0, 4)).toEqual(['ignite_slash', 'charge', 'ember_whirl', 'iron_shout']);
    const p = s.player();
    expect(p.health).toBe(p.maxHealth);
    expect(p.level).toBe(1);
  });

  it('las tiradas hacen que dos copias del mismo objeto difieran', () => {
    const s = FakeSession.create('storm_weaver', 'x', 5);
    for (let i = 0; i < 6; i++) s.addItem('frost_pendant', 1);
    const rolls = s.inventory().slots.filter((x) => x?.itemId === 'frost_pendant').map((x) => JSON.stringify(x!.rolled));
    expect(new Set(rolls).size).toBeGreaterThan(1);
  });

  it('apila, mueve, ordena y tira', () => {
    const s = FakeSession.create('storm_weaver', 'x', 5);
    s.addItem('copper_ore', 30);
    s.addItem('copper_ore', 30); // tope 50 → 50 + 10
    const ores = () => s.inventory().slots.filter((x) => x?.itemId === 'copper_ore').map((x) => x!.quantity);
    expect(ores()).toEqual([50, 10]);
    const inv = s.inventory().slots;
    const a = inv.findIndex((x) => x?.quantity === 10);
    const b = inv.findIndex((x) => x?.quantity === 50);
    s.dropItem(inv[b]!.uid, 45); // queda 5
    expect(s.moveItem(a, b).ok).toBe(true); // 10 sobre 5 → 15
    expect(ores()).toEqual([15]);
    s.addItem('wolf_fang', 1);
    s.sortInventory();
    const cats = s.inventory().slots.filter(Boolean).map((x) => FAKE_CONTENT.items[x!.itemId]!.category);
    expect(cats.indexOf('material')).toBeGreaterThan(cats.indexOf('consumable'));
    expect(s.inventory().slots.indexOf(null)).toBe(cats.length); // compactado
  });

  it('equipar sube estadísticas con desglose y la comparación lo predice', () => {
    const s = FakeSession.create('ember_vanguard', 'x', 5, { demo: true });
    const mail = s.inventory().slots.find((x) => x?.itemId === 'ring_mail')!;
    const delta = s.compareEquip(mail.uid).find((d) => d.stat === 'armor')!;
    expect(s.equip(mail.uid).ok).toBe(true);
    const armor = s.player().stats.find((x) => x.stat === 'armor')!;
    expect(armor.value).toBeCloseTo(delta.after);
    expect(armor.breakdown.some((b) => b.source === `item:${mail.uid}`)).toBe(true);
  });

  it('no deja equipar por encima del nivel', () => {
    const s = FakeSession.create('storm_weaver', 'x', 5);
    s.addItem('frost_pendant', 1);
    const p = s.inventory().slots.find((x) => x?.itemId === 'frost_pendant')!;
    expect(s.equip(p.uid)).toEqual({ ok: false, reason: 'Requiere nivel 8' });
  });

  it('pergamino: aprende y luego sube rango; mascota: una sola activa', () => {
    const s = FakeSession.create('storm_weaver', 'x', 5);
    s.addItem('scroll_gust', 2);
    const scroll = () => s.inventory().slots.find((x) => x?.itemId === 'scroll_gust')!;
    s.useItem(scroll().uid);
    expect(s.spellbook().known.find((k) => k.spellId === 'gust')!.rank).toBe(1);
    s.useItem(scroll().uid);
    expect(s.spellbook().known.find((k) => k.spellId === 'gust')!.rank).toBe(2);
    s.addItem('charm_ash_fox', 1);
    s.addItem('charm_moss_tortoise', 1);
    const fox = s.inventory().slots.find((x) => x?.itemId === 'charm_ash_fox')!;
    const tor = s.inventory().slots.find((x) => x?.itemId === 'charm_moss_tortoise')!;
    s.useItem(fox.uid);
    expect(s.pet()?.petId).toBe('ash_fox');
    s.useItem(tor.uid);
    expect(s.pet()?.petId).toBe('moss_tortoise');
    s.useItem(tor.uid);
    expect(s.pet()).toBeNull();
  });

  it('barra: coste, enfriamiento y global; pociones rápidas', () => {
    const s = FakeSession.create('storm_weaver', 'x', 5);
    const res0 = s.player().resource;
    expect(s.castHotbar(1).ok).toBe(true); // Lanza glacial, 6 s
    expect(s.player().resource).toBe(res0 - 30);
    expect(s.castHotbar(1)).toEqual({ ok: false, reason: 'En enfriamiento' });
    expect(s.castHotbar(0)).toEqual({ ok: false, reason: 'Enfriamiento global' });
    const st = s.hotbarState();
    expect(st[1]!.cooldownTotal).toBe(6);
    s.tick(1);
    expect(s.castHotbar(0).ok).toBe(true);
    expect(s.hotbarState()[1]!.cooldownRemaining).toBeCloseTo(5);
    const before = s.inventory().slots.find((x) => x?.itemId === 'minor_health_potion')!.quantity;
    expect(s.quickUse('health').ok).toBe(true);
    expect(s.inventory().slots.find((x) => x?.itemId === 'minor_health_potion')!.quantity).toBe(before - 1);
    expect(s.quickUse('health').ok).toBe(false); // espera de la poción
  });

  it('XP y nivel: puntos para repartir y evento', () => {
    const s = FakeSession.create('ember_vanguard', 'x', 5);
    const events: string[] = [];
    s.on((e) => events.push(e.type));
    s.grantXp(100);
    expect(s.player().level).toBe(2);
    expect(s.player().unspentStatPoints).toBe(3);
    expect(events).toContain('levelUp');
    const str = () => s.player().stats.find((x) => x.stat === 'strength')!.value;
    const before = str();
    expect(s.spendStatPoint('strength').ok).toBe(true);
    expect(str()).toBe(before + 1);
  });
});
