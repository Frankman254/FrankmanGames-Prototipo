import { describe, expect, it } from 'vitest';
import { FAKE_CONTENT } from '../../src/ui/menus/fake/content';
import { FakeSession } from '../../src/ui/menus/fake/fakeSession';
import { compareLine, formatModifier, formatStatValue, itemTooltip, sourceLabel, spellTooltip, statLabel } from '../../src/ui/menus/format';

describe('textos de estadísticas', () => {
  it('etiquetas', () => {
    expect(statLabel('strength')).toBe('Fuerza');
    expect(statLabel('damage.fire')).toBe('Daño de fuego');
    expect(statLabel('resist.storm')).toBe('Resistencia a tormenta');
  });

  it('valores y modificadores', () => {
    expect(formatStatValue('critChance', 0.075)).toBe('7,5 %');
    expect(formatStatValue('moveSpeed', 5.2)).toBe('5,2 m/s');
    expect(formatStatValue('armor', 12)).toBe('12');
    expect(formatStatValue('resist.fire', 10)).toBe('10 %');
    expect(formatModifier({ stat: 'strength', op: 'flat', value: 3 })).toBe('+3 Fuerza');
    expect(formatModifier({ stat: 'moveSpeed', op: 'percent', value: -10 })).toBe('−10 % Velocidad');
    expect(formatModifier({ stat: 'critChance', op: 'flat', value: 0.02 })).toBe('+2 % Probabilidad de crítico');
  });

  it('comparación: verde si sube, rojo si baja', () => {
    expect(compareLine({ stat: 'armor', before: 6, after: 9 })).toMatchObject({ kind: 'compare', tone: 'up' });
    expect(compareLine({ stat: 'armor', before: 9, after: 6 })).toMatchObject({ kind: 'compare', tone: 'down' });
  });
});

describe('tooltips', () => {
  const s = FakeSession.create('ember_vanguard', 'Prueba', 3, { demo: true });
  const inv = s.inventory().slots;
  const ctx = (uid: string, equipped = false) => ({
    content: s.content, equipment: s.equipment(), equipped, compare: s.compareEquip(uid), sellValue: s.sellValue(uid), playerLevel: s.player().level,
  });

  it('un arma: título con rareza, tiradas con su rango y comparación', () => {
    const axe = inv.find((x) => x?.itemId === 'woodcutter_axe')!;
    const lines = itemTooltip(axe, ctx(axe.uid));
    expect(lines[0]).toEqual({ kind: 'title', text: 'Hacha de leñador', rarity: 'uncommon' });
    expect(lines.some((l) => l.kind === 'stat' && l.tone === 'rolled' && /Fuerza \(2–5\)/.test(l.text))).toBe(true);
    expect(lines.some((l) => l.kind === 'compare')).toBe(true);
  });

  it('una pieza de set enseña el conjunto y qué bonos están activos', () => {
    const gloves = inv.find((x) => x?.itemId === 'explorer_gloves')!;
    const sets = itemTooltip(gloves, ctx(gloves.uid)).filter((l) => l.kind === 'set');
    expect(sets[0]).toMatchObject({ text: 'Equipo del Explorador (3/4)', active: true });
    expect(sets[1]).toMatchObject({ active: true }); // 2 piezas
    expect(sets[2]).toMatchObject({ active: false }); // 4 piezas
  });

  it('las fuentes del desglose se leen', () => {
    const w = s.equipment().weapon!;
    const find = (uid: string) => (uid === w.uid ? w : null);
    expect(sourceLabel(`item:${w.uid}`, FAKE_CONTENT, find)).toBe('Espada corta');
    expect(sourceLabel('set:explorer', FAKE_CONTENT, find)).toBe('Equipo del Explorador');
    expect(sourceLabel('pet:ash_fox', FAKE_CONTENT, find)).toBe('Mascota: Zorro de ceniza');
  });

  it('un hechizo escala con el rango', () => {
    const r1 = spellTooltip(FAKE_CONTENT.spells['ignite_slash']!, 1, FAKE_CONTENT, 'Vigor');
    const r3 = spellTooltip(FAKE_CONTENT.spells['ignite_slash']!, 3, FAKE_CONTENT, 'Vigor');
    const dmg = (ls: typeof r1) => ls.find((l) => l.kind === 'stat')!;
    expect(dmg(r1)).toMatchObject({ text: '22–30 de daño de fuego' });
    expect(dmg(r3)).toMatchObject({ text: '27–37 de daño de fuego' });
  });
});
