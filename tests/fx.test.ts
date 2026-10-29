import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { loadFx, parseFx } from '../src/data/fxSchema';
import { ELEMENTS } from '../src/rpg/contracts';
import { World } from '../src/sim/world';
import { elementOf } from '../src/render/fx/spellFx';
import fxJson from '../data/fx.json';

describe('efectos (data/fx.json)', () => {
  const fx = loadFx();
  const data = loadGameData();

  it('cubre todos los elementos y los hechizos de línea existen', () => {
    for (const el of ELEMENTS) expect(fx.elements[el], el).toBeDefined();
    for (const id of fx.lineProjectiles) expect(data.rpg.spells[id]?.area.type, id).toBe('line');
  });

  it('los estados con aspecto existen en data/rpg/statuses.json y los de control se ven', () => {
    for (const id of Object.keys(fx.statuses)) expect(data.rpg.statuses[id], id).toBeDefined();
    // Todo perjuicio con efecto visible en juego (control, tick o modificadores) tiene aspecto.
    for (const [id, s] of Object.entries(data.rpg.statuses)) if (s.kind === 'debuff') expect(fx.statuses[id], id).toBeDefined();
  });

  it('el elemento de cada suceso sale del hechizo, del arma, del estado o de la mascota', () => {
    const w = new World(data);
    expect(elementOf(w, 'spark')).toBe('storm');
    expect(elementOf(w, 'glacial_lance')).toBe('frost');
    expect(elementOf(w, 'status:burn')).toBe('fire');
    expect(elementOf(w, 'pet:ash_fox')).toBe('fire');
    expect(elementOf(w, null)).toBe('physical');
    expect(ELEMENTS).toContain(elementOf(w, 'basic'));
  });

  it('rechaza aspectos de estado desconocidos', () => {
    const bad = { ...fxJson, statuses: { burn: { visual: 'humo', color: [1, 1, 1] } } };
    expect(() => parseFx(bad)).toThrow(/statuses\.burn\.visual/);
  });
});
