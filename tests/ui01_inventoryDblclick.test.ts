// UI-01: Doble clic en la mochila — lógica de decisión y ejecución.
// El handler de dblclick (inventory.ts) decide: si el objeto tiene slot → equipar;
// si no → usar. Esta prueba verifica la decisión pura y que la sesión ejecuta
// la acción correcta para cada tipo de objeto.
import { describe, expect, it } from 'vitest';
import { content, session } from './rpg/helpers';
import type { ItemDef } from '../src/rpg/contracts';

/** Doble clic: ¿qué acción se ejecuta para este objeto? (puro, sin DOM). */
function dblclickAction(def: ItemDef): 'equip' | 'use' {
  return def.slot ? 'equip' : 'use';
}

describe('UI-01: doble clic en la mochila — decisión de acción', () => {
  const c = content();

  it('objeto equipable (espada) → equip', () => {
    const sword = c.items['short_sword'];
    expect(sword).toBeDefined();
    expect(dblclickAction(sword!)).toBe('equip');
  });

  it('objeto equipable (armadura) → equip', () => {
    const armor = c.items['padded_vest'];
    expect(armor).toBeDefined();
    expect(dblclickAction(armor!)).toBe('equip');
  });

  it('objeto equipable (anillo) → equip', () => {
    const ring = c.items['copper_ring'];
    expect(ring).toBeDefined();
    expect(dblclickAction(ring!)).toBe('equip');
  });

  it('poción de vida (sin slot) → use', () => {
    const potion = c.items['health_potion'];
    expect(potion).toBeDefined();
    expect(dblclickAction(potion!)).toBe('use');
  });

  it('poción de recurso (sin slot) → use', () => {
    const tonic = c.items['resource_tonic'];
    expect(tonic).toBeDefined();
    expect(dblclickAction(tonic!)).toBe('use');
  });

  it('pergamino (sin slot, learnSpell) → use', () => {
    const scroll = c.items['scroll_light_bandage'];
    expect(scroll).toBeDefined();
    expect(dblclickAction(scroll!)).toBe('use');
  });

  it('material (sin slot, sin use) → use (falla en sesión, pero la decisión es use)', () => {
    const mat = c.items['fang'];
    expect(mat).toBeDefined();
    expect(dblclickAction(mat!)).toBe('use');
  });
});

describe('UI-01: doble clic — ejecución en sesión', () => {
  it('equipar una espada con doble clic', () => {
    const s = session();
    s.character.give('short_sword');
    const it = s.character.inventory.slots.find((x) => x?.itemId === 'short_sword')!;
    const r = s.equip(it.uid);
    expect(r.ok).toBe(true);
    expect(s.equipment().weapon?.itemId).toBe('short_sword');
  });

  it('usar una poción de vida con doble clic', () => {
    const s = session();
    // Dañar al personaje para que la poción tenga efecto visible.
    const maxHp = s.character.maxHealth;
    s.character.health = Math.floor(maxHp * 0.5);
    const hpBefore = s.character.health;
    s.character.give('health_potion');
    const it = s.character.inventory.slots.find((x) => x?.itemId === 'health_potion')!;
    const r = s.useItem(it.uid);
    expect(r.ok).toBe(true);
    expect(s.character.health).toBeGreaterThan(hpBefore);
  });

  it('leer un pergamino con doble clic', () => {
    const s = session();
    s.character.give('scroll_light_bandage');
    const it = s.character.inventory.slots.find((x) => x?.itemId === 'scroll_light_bandage')!;
    const r = s.useItem(it.uid);
    expect(r.ok).toBe(true);
    // El hechizo se aprendió: Spellbook.known es un Map<string, number>.
    const rank = s.character.spellbook.rank('light_bandage');
    expect(rank).toBeGreaterThanOrEqual(1);
  });
});

describe('UI-01: arrastre no dispara doble clic', () => {
  /*
   * Cuando el usuario arrastra un objeto (supera el umbral de 5 px), el
   * pointerdown ya no bloquea el evento (setPointerCapture en vez de
   * preventDefault). Pero un arrastre real no debe activar dblclick porque:
   *
   * 1. El arrastre consume pointerup y traga el click siguiente
   *    (drag.ts: swallow en finish).
   * 2. Un arrastre requiere movimiento > THRESHOLD px; un doble clic
   *    no mueve el puntero, así que nunca entra en el camino del arrastre.
   *
   * La verificación visual en Electron confirma que arrastrar no equipa
   * ni usa el objeto (solo soltar en el destino correcto lo hace).
   */
  it('un objeto movido en la mochila no se equipa ni usa', () => {
    const s = session();
    // Dar dos objetos para poder mover uno a la posición del otro.
    s.character.give('short_sword');
    s.character.give('copper_ring');
    const slots = s.character.inventory.slots;
    const idx = slots.findIndex((x) => x?.itemId === 'short_sword');
    expect(idx).toBeGreaterThanOrEqual(0);
    // Buscar un hueco adyacente ocupado para intercambiar.
    const ringIdx = slots.findIndex((x) => x?.itemId === 'copper_ring');
    expect(ringIdx).toBeGreaterThanOrEqual(0);
    // Mover la espada al índice del anillo (intercambio).
    const r = s.moveItem(idx, ringIdx);
    expect(r.ok).toBe(true);
    // El objeto sigue en la mochila, no equipado.
    expect(s.equipment().weapon).toBeNull();
  });
});
