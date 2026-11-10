import { describe, expect, it } from 'vitest';
import { OCCLUSION_UNIFORM_NAMES, occlusionPicks } from '../src/render/occlusion';
import { PAINT_STYLE_FRAGMENT_SHADER } from '../src/render/paintStyle';

// QA Q03: el cazador dispara desde más de 14 m y su objetivo quedaba bajo las copas.
describe('occlusionPicks', () => {
  const at = { x: 0, y: 0 };
  const foe = (id: number, x: number, state = 'pursue') => ({ id, pos: { x, y: 0 }, state });
  const list = [foe(1, 5), foe(2, 8), foe(3, 12), foe(4, 25), foe(5, 3, 'dead')];

  it('sin objetivo: los vivos más cercanos dentro del alcance', () => {
    expect(occlusionPicks(list, at, null, 14, 3).map((e) => e.id)).toEqual([1, 2, 3]);
  });

  it('el objetivo del jugador va primero aunque esté lejos', () => {
    expect(occlusionPicks(list, at, 4, 14, 3).map((e) => e.id)).toEqual([4, 1, 2]);
    // Ya dentro del alcance: no se repite.
    expect(occlusionPicks(list, at, 2, 14, 3).map((e) => e.id)).toEqual([2, 1, 3]);
  });

  it('un objetivo muerto o desconocido no cuenta', () => {
    expect(occlusionPicks(list, at, 5, 14, 3).map((e) => e.id)).toEqual([1, 2, 3]);
    expect(occlusionPicks(list, at, 99, 14, 3).map((e) => e.id)).toEqual([1, 2, 3]);
  });
});

describe('contorno y recorte comparten la misma máscara', () => {
  it('el pase de pintura anula el contorno fantasma dentro de cada círculo', () => {
    for (const name of OCCLUSION_UNIFORM_NAMES) {
      expect(PAINT_STYLE_FRAGMENT_SHADER).toContain(`uniform vec4 ${name};`);
      expect(PAINT_STYLE_FRAGMENT_SHADER).toContain(`occ = max(occ, occlusionCutAt(${name}, d));`);
    }
    expect(PAINT_STYLE_FRAGMENT_SHADER).toContain('depth >= c.w');
    expect(PAINT_STYLE_FRAGMENT_SHADER).toContain('edge *= 1.0 - occ;');
  });
});
