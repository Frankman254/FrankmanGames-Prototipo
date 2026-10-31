// Progresión de hechizos por nivel (creador, 2026-10-31): la clase empieza con
// 3 hechizos (desplazamiento con daño, área y aumento) y aprende los demás al
// subir, alternando elementos; los pergaminos de otros elementos se aprenden a
// cualquier nivel, pero no van a la barra hasta tener el nivel que piden.
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../../src/data';
import { Character } from '../../src/rpg/character';
import type { SessionEvent, SpellDef } from '../../src/rpg/contracts';
import { requiredLevel } from '../../src/rpg/spells';
import { Rng } from '../../src/sim/rng';
import { World } from '../../src/sim/world';
import { reachLevel } from '../levels';
import { content, hero, session } from './helpers';

const classSpells = (classId: string): SpellDef[] =>
  Object.values(content().spells)
    .filter((s) => s.classId === classId)
    .sort((a, b) => requiredLevel(a) - requiredLevel(b));

describe('kit de nivel 1', () => {
  it('cada clase empieza con exactamente 3 hechizos: uno de área con daño y un aumento', () => {
    for (const cl of Object.values(content().classes)) {
      const kit = cl.startingSpells.map((id) => content().spells[id]!);
      expect(kit, cl.id).toHaveLength(3);
      expect(kit.every((s) => requiredLevel(s) === 1), cl.id).toBe(true);
      expect(kit.some((s) => s.area.type === 'circle' && s.effects.some((e) => e.type === 'damage')), cl.id).toBe(true);
      expect(kit.some((s) => s.tags.includes('buff') && s.area.type === 'self'), cl.id).toBe(true);
      expect(hero(cl.id).spellbook.hotbar.filter((x) => x !== null)).toEqual(cl.startingSpells);
    }
  });

  it('la Vanguardia empieza con la carga que golpea, el remolino y el grito', () => {
    const kit = content().classes['ember_vanguard']!.startingSpells.map((id) => content().spells[id]!);
    const dash = kit.find((s) => s.effects.some((e) => e.type === 'dash'))!;
    expect(dash.id).toBe('charge');
    expect(dash.effects.some((e) => e.type === 'damage')).toBe(true);
    expect(kit.map((s) => s.id)).toEqual(['charge', 'ember_whirl', 'iron_shout']);
  });
});

describe('progresión por nivel', () => {
  it('los hechizos que se aprenden subiendo alternan elemento', () => {
    for (const cl of Object.values(content().classes)) {
      const later = classSpells(cl.id).filter((s) => requiredLevel(s) > 1);
      expect(later.length, cl.id).toBeGreaterThanOrEqual(4);
      for (let i = 1; i < later.length; i++) expect(later[i]!.element, `${cl.id}: ${later[i]!.id}`).not.toBe(later[i - 1]!.element);
      // Nunca dos desbloqueos en el mismo nivel: cada subida enseña como mucho uno.
      expect(new Set(later.map(requiredLevel)).size, cl.id).toBe(later.length);
    }
  });

  it('subir de nivel enseña cada hechizo de la clase justo en su nivel, lo avisa y lo pone en la barra', () => {
    for (const cl of Object.values(content().classes)) {
      const h = hero(cl.id);
      const learned: string[] = [];
      h.on((e: SessionEvent) => {
        if (e.type === 'learned') learned.push(e.spellId);
      });
      for (const sp of classSpells(cl.id).filter((s) => requiredLevel(s) > 1)) {
        reachLevel(h, requiredLevel(sp) - 1);
        expect(h.spellbook.rank(sp.id), `${sp.id} antes de nivel`).toBe(0);
        reachLevel(h, requiredLevel(sp));
        expect(h.spellbook.rank(sp.id), `${sp.id} en su nivel`).toBe(1);
        expect(h.spellbook.hotbar).toContain(sp.id);
      }
      expect(learned).toEqual(classSpells(cl.id).filter((s) => requiredLevel(s) > 1).map((s) => s.id));
    }
  });

  it('un guardado antiguo con todo el kit se recorta al nivel y uno de nivel alto recupera lo que le toca', () => {
    const low = hero('storm_weaver').toSave(new Date(0));
    low.known = classSpells('storm_weaver').map((s) => ({ spellId: s.id, rank: 1 }));
    low.hotbar = [...low.known.map((k) => k.spellId), ...new Array<null>(20).fill(null)].slice(0, 20);
    const c = Character.fromSave(content(), low, new Rng(1));
    expect([...c.spellbook.known.keys()].sort()).toEqual([...content().classes['storm_weaver']!.startingSpells].sort());
    expect(c.spellbook.hotbar.filter((x) => x !== null).every((id) => requiredLevel(content().spells[id]!) <= 1)).toBe(true);

    const high = { ...hero('storm_weaver').toSave(new Date(0)), level: 9 };
    const d = Character.fromSave(content(), high, new Rng(1));
    for (const s of classSpells('storm_weaver')) expect(d.spellbook.rank(s.id) > 0, s.id).toBe(requiredLevel(s) <= 9);
  });
});

describe('requisito de nivel para la barra', () => {
  it('un pergamino de otro elemento se aprende a nivel 1 pero no se equipa hasta su nivel', () => {
    const s = session('ember_vanguard');
    const h = s.character;
    const need = requiredLevel(content().spells['rime_shard']!);
    expect(need).toBeGreaterThan(1);
    expect(content().spells['rime_shard']!.element).not.toBe('fire');
    // Se compra al boticario y se lee a nivel 1.
    const offer = s.merchant('apothecary')!.stock.find((o) => o.item.itemId === 'scroll_rime_shard')!;
    h.addGold(offer.price);
    expect(s.buy('apothecary', offer.index, 1).ok).toBe(true);
    expect(s.useItem(h.inventory.slots.find((x) => x?.itemId === 'scroll_rime_shard')!.uid).ok).toBe(true);
    expect(h.spellbook.rank('rime_shard')).toBe(1);
    expect(h.spellbook.hotbar).not.toContain('rime_shard');
    expect(s.assignHotbar(5, 'rime_shard')).toEqual({ ok: false, reason: `Requiere nivel ${need}` });
    // Al llegar al nivel entra sola en un hueco libre y ya se puede mover.
    reachLevel(h, need);
    expect(h.spellbook.hotbar).toContain('rime_shard');
    expect(s.assignHotbar(19, 'rime_shard').ok).toBe(true);
    expect(s.spellbook().hotbar[19]).toBe('rime_shard');
  });

  it('por debajo del nivel tampoco se lanza por id', () => {
    const data = loadGameData();
    const c = Character.create(data.rpg, 'ember_vanguard', 'x', new Rng(1));
    c.learnSpell('rime_shard');
    const w = new World(data, { encounter: false, character: c });
    expect(w.commandCast('rime_shard', { point: { x: 5, y: 0 }, targetId: null })).toBe('level');
    expect(w.drainEvents()).toContainEqual({ type: 'castBlocked', ability: 'rime_shard', reason: 'level' });
  });

  it('cargar una partida quita de la barra lo que aún no se puede equipar, sin olvidarlo', () => {
    const h = hero('ember_vanguard');
    h.learnSpell('rime_shard');
    const save = h.toSave(new Date(0));
    save.hotbar[7] = 'rime_shard';
    const c = Character.fromSave(content(), save, new Rng(1));
    expect(c.spellbook.rank('rime_shard')).toBe(1);
    expect(c.spellbook.hotbar).not.toContain('rime_shard');
  });

  it('los pergaminos universales tienen requisito de nivel válido y algún mercader vende uno de otro elemento', () => {
    const c = content();
    for (const s of Object.values(c.spells)) expect(requiredLevel(s), s.id).toBeLessThanOrEqual(c.progression.maxLevel);
    const sold = Object.values(c.merchants).flatMap((m) => m.stock.map((x) => c.items[x.itemId]!));
    const taught = sold.flatMap((i) => (i.use?.kind === 'learnSpell' ? [c.spells[i.use.spellId]!] : []));
    expect(taught.some((s) => requiredLevel(s) > 1)).toBe(true);
    expect(new Set(taught.map((s) => s.element)).size).toBeGreaterThanOrEqual(3);
  });
});

describe('reinicio de características (reparto libre)', () => {
  it('desde la sesión: devuelve todos los puntos, avisa del cambio y se puede repartir otra vez', () => {
    const s = session('storm_weaver');
    const h = s.character;
    reachLevel(h, 3);
    const pts = h.unspentStatPoints;
    const intellect = h.stats.get('intellect');
    for (let i = 0; i < pts; i++) s.spendStatPoint('intellect');
    expect(h.unspentStatPoints).toBe(0);
    expect(h.stats.get('intellect')).toBe(intellect + pts);
    let changed = 0;
    h.on((e) => {
      if (e.type === 'changed') changed++;
    });
    expect(s.resetStatPoints()).toEqual({ ok: true });
    expect(changed).toBeGreaterThan(0);
    expect(h.unspentStatPoints).toBe(pts);
    expect(h.stats.get('intellect')).toBe(intellect);
    expect(s.spendStatPoint('vitality').ok).toBe(true);
    // El reinicio sobrevive a guardar y cargar.
    const c = Character.fromSave(content(), h.toSave(new Date(0)), new Rng(1));
    expect(c.unspentStatPoints).toBe(pts - 1);
    expect(c.allocated).toEqual({ vitality: 1 });
  });

  it('la vida actual no supera el máximo tras quitar Vitalidad', () => {
    const h = hero();
    reachLevel(h, 2);
    while (h.spendStatPoint('vitality').ok);
    h.restore();
    expect(h.resetStatPoints().ok).toBe(true);
    expect(h.health).toBe(h.maxHealth);
  });
});
