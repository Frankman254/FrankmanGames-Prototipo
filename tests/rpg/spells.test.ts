import { describe, expect, it } from 'vitest';
import { compileSpell } from '../../src/rpg/spells';
import { content, session } from './helpers';

describe('libro de hechizos', () => {
  it('cada clase empieza con sus 6 hechizos en la barra', () => {
    for (const id of ['ember_vanguard', 'storm_weaver']) {
      const s = session(id);
      const sb = s.spellbook();
      expect(sb.known).toHaveLength(6);
      const start = content().classes[id]!.startingHotbar;
      expect(sb.hotbar).toHaveLength(content().progression.hotbarSize);
      expect(sb.hotbar.slice(0, start.length)).toEqual(start);
      expect(sb.hotbar.slice(start.length).every((x) => x === null)).toBe(true);
    }
  });

  it('un pergamino enseña el hechizo; otro igual sube el rango hasta el máximo', () => {
    const s = session();
    const h = s.character;
    const max = content().spells['gust']!.maxRank;
    h.give('scroll_gust', max + 1);
    const uid = () => h.inventory.slots.find((x) => x?.itemId === 'scroll_gust')!.uid;
    const events: string[] = [];
    s.on((e) => events.push(e.type));
    expect(s.useItem(uid()).ok).toBe(true);
    expect(h.spellbook.rank('gust')).toBe(1);
    expect(events).toContain('learned');
    for (let r = 2; r <= max; r++) {
      expect(s.useItem(uid()).ok).toBe(true);
      expect(h.spellbook.rank('gust')).toBe(r);
    }
    expect(s.useItem(uid())).toEqual({ ok: false, reason: 'Ya está al rango máximo' });
    expect(h.inventory.count('scroll_gust')).toBe(1); // el último no se gasta
  });

  it('cualquier clase puede equipar cualquier hechizo que conozca; asignar intercambia', () => {
    const s = session('storm_weaver');
    expect(s.assignHotbar(0, 'fiery_slash')).toEqual({ ok: false, reason: 'Hechizo no aprendido' });
    s.character.learnSpell('fiery_slash');
    expect(s.assignHotbar(0, 'fiery_slash').ok).toBe(true);
    expect(s.spellbook().hotbar[0]).toBe('fiery_slash');
    expect(s.assignHotbar(5, 'fiery_slash').ok).toBe(true);
    expect(s.spellbook().hotbar[5]).toBe('fiery_slash');
    expect(s.spellbook().hotbar[0]).toBe('voltaic_arc');
    expect(s.assignHotbar(2, null).ok).toBe(true);
    expect(s.spellbook().hotbar[2]).toBeNull();
    expect(s.assignHotbar(content().progression.hotbarSize, 'spark').ok).toBe(false);
  });

  it('el rango sube los efectos y baja el coste', () => {
    const def = content().spells['spark']!;
    const r1 = compileSpell(content(), def, 1);
    const r3 = compileSpell(content(), def, 3);
    expect(r1.power).toBe(1);
    expect(r3.power).toBeCloseTo(1 + (2 * def.perRank.effectPercent) / 100);
    expect(r3.cost).toBe(Math.round(def.resourceCost * (1 - (2 * def.perRank.costPercent) / 100)));
    expect(r3.effects).toHaveLength(def.effects.length);
  });
});
