// `equipo-objetos`: iconos por tipo, filtros de la mochila y textos de manos.
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../../src/data';
import { ITEM_KINDS, RARITIES, type ItemDef } from '../../src/rpg/contracts';
import { FAKE_CONTENT } from '../../src/ui/menus/fake/content';
import { handsText, itemTooltip, KIND_LABEL } from '../../src/ui/menus/format';
import { iconKind, itemIcon, kindIcon } from '../../src/ui/menus/icons';
import { ICON_KINDS, elementOf, iconSeed } from '../../src/ui/menus/itemIcons';
import { groupOf, handsSummary, matchesFilter } from '../../src/ui/menus/inventory';

/** SVG bien formado (sin DOM): etiquetas equilibradas, números válidos, sin huecos de plantilla. */
function wellFormed(svg: string): void {
  expect(svg.startsWith('<svg ')).toBe(true);
  expect(svg.endsWith('</svg>')).toBe(true);
  expect(svg).not.toMatch(/NaN|undefined|null|Infinity|\$\{/);
  const stack: string[] = [];
  for (const m of svg.matchAll(/<(\/?)([a-zA-Z]+)[^>]*?(\/?)>/g)) {
    const [, close, tag, self] = m;
    if (self) continue;
    if (close) expect(stack.pop()).toBe(tag);
    else stack.push(tag!);
  }
  expect(stack).toEqual([]);
  // Cada atributo numérico de trazado es un número.
  for (const d of svg.matchAll(/ d="([^"]*)"/g)) expect(d[1]).toMatch(/^[MLQZmlqzae0-9 .,\-]+$/);
}

const game = loadGameData().rpg;

describe('iconos de objeto por tipo', () => {
  it('hay un dibujo por cada tipo, todos distintos y bien formados', () => {
    expect([...ICON_KINDS].sort()).toEqual([...ITEM_KINDS].sort());
    const seen = new Set<string>();
    for (const k of ITEM_KINDS) {
      const svg = kindIcon(k);
      wellFormed(svg);
      expect(svg).toContain(`data-kind="${k}"`);
      const body = svg.replace(/data-kind="[^"]*"/, '');
      expect(seen.has(body), k).toBe(false);
      seen.add(body);
    }
  });

  it('cada objeto del juego y del contenido falso se dibuja sin errores', () => {
    for (const def of [...Object.values(game.items), ...Object.values(FAKE_CONTENT.items)]) {
      const svg = itemIcon(def);
      wellFormed(svg);
      expect(svg, def.id).toContain(`data-kind="${iconKind(def)}"`);
    }
  });

  it('dos objetos del mismo tipo no salen iguales; el mismo objeto, siempre igual', () => {
    const swords = Object.values(game.items).filter((d) => d.kind === 'sword');
    expect(swords.length).toBeGreaterThan(3);
    const icons = new Set(swords.map((d) => itemIcon(d)));
    expect(icons.size).toBe(swords.length);
    expect(itemIcon(swords[0]!)).toBe(itemIcon(swords[0]!));
    expect(iconSeed('a')).not.toBe(iconSeed('b'));
  });

  it('la rareza y el elemento tiñen el icono', () => {
    const base = game.items['volcano_sword']!;
    const colors = new Set(RARITIES.map((r) => itemIcon({ ...base, rarity: r })));
    expect(colors.size).toBe(RARITIES.length);
    expect(elementOf(base)).toBe('fire');
    expect(elementOf(game.items['short_sword']!)).toBeNull();
    expect(elementOf(game.items['reed_hat']!)).toBe('fire'); // resistencia a fuego
    const frost: ItemDef = { ...base, weapon: { ...base.weapon!, element: 'frost' } };
    expect(itemIcon(frost)).not.toBe(itemIcon(base));
  });

  it('un objeto sin `kind` (contenido viejo) se dibuja por su icono o su categoría', () => {
    expect(iconKind({ icon: 'shield', category: 'armor', rarity: 'common', slot: 'offhand' })).toBe('shield');
    expect(iconKind({ icon: '🧪', category: 'consumable', rarity: 'common', slot: null })).toBe('potion');
    expect(iconKind({ icon: 'zzz', category: 'material', rarity: 'common', slot: null })).toBe('material');
  });
});

describe('mochila: filtros y textos', () => {
  const d = (id: string) => game.items[id]!;

  it('agrupa por tipo y filtra por grupo, tipo y rareza', () => {
    expect(groupOf(d('machetero_blade'))).toBe('weapon');
    expect(groupOf(d('gourd_buckler'))).toBe('armor');
    expect(groupOf(d('coconut_ring'))).toBe('jewel');
    expect(groupOf(d('corn_bollo'))).toBe('use');
    expect(groupOf(d('scroll_gust'))).toBe('use');
    expect(groupOf(d('crab_eye_gem'))).toBe('material');
    expect(groupOf(d('crypt_key'))).toBe('material');
    const all = { group: 'all', kind: 'all', rarity: 'all' } as const;
    expect(matchesFilter(d('volcano_sword'), all)).toBe(true);
    expect(matchesFilter(d('volcano_sword'), { ...all, group: 'armor' })).toBe(false);
    expect(matchesFilter(d('volcano_sword'), { ...all, kind: 'sword', rarity: 'rare' })).toBe(true);
    expect(matchesFilter(d('volcano_sword'), { ...all, kind: 'dagger' })).toBe(false);
    expect(matchesFilter(d('volcano_sword'), { ...all, rarity: 'epic' })).toBe(false);
  });

  it('explica la regla de manos en el tooltip y bajo el muñeco', () => {
    expect(handsText(d('machetero_blade'))).toMatch(/Dos manos/);
    expect(handsText(d('peeling_knife'))).toMatch(/Una mano/);
    const eq = (w: string | null, o: string | null) => ({ weapon: w ? { itemId: w } : null, offhand: o ? { itemId: o } : null });
    expect(handsSummary(game, eq('machetero_blade', null))).toMatch(/Dos manos/);
    expect(handsSummary(game, eq('short_sword', 'peeling_knife'))).toMatch(/alterna/);
    expect(handsSummary(game, eq('short_sword', 'gourd_buckler'))).toMatch(/Rodela de totuma/);
    expect(handsSummary(game, eq(null, null))).toMatch(/puñetazos/);
    for (const k of ITEM_KINDS) expect(KIND_LABEL[k], k).toBeTruthy();
  });

  it('el tooltip de un arma de una mano compara también en la mano izquierda', () => {
    const it = { uid: 'x', itemId: 'peeling_knife', quantity: 1, rolled: [{ stat: 'agility' as const, op: 'flat' as const, value: 2 }] };
    const lines = itemTooltip(it, {
      content: game,
      equipment: { weapon: null, offhand: null, head: null, chest: null, hands: null, feet: null, ring1: null, ring2: null, amulet: null, back: null, waist: null },
      equipped: false,
      compare: [{ stat: 'agility', before: 5, after: 3 }],
      compareOffhand: [{ stat: 'agility', before: 5, after: 7 }],
      sellValue: 1,
      playerLevel: 10,
    });
    const text = lines.map((l) => ('text' in l ? l.text : '')).join('\n');
    expect(text).toContain('Daga · Arma');
    expect(text).toContain('mano derecha');
    expect(text).toContain('mano izquierda (dos armas)');
  });
});
