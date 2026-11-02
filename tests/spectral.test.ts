import { describe, expect, it } from 'vitest';
import deathJson from '../data/death.json';
import { parseSpectralDef, SpectralState } from '../src/rpg/spectral';

describe('resurrección espectral: validación de posición', () => {
  const def = parseSpectralDef(deathJson);
  const altar = def.resurrectors[0]!;

  it.each([
    { x: NaN, y: altar.y }, { x: altar.x, y: NaN },
    { x: Infinity, y: altar.y }, { x: altar.x, y: -Infinity },
  ])('rechaza coordenadas no finitas sin perder el estado: %j', (pos) => {
    const state = new SpectralState(def);
    state.die();
    expect(state.resurrectAt(altar.id, pos)).toBe(false);
    expect(state.toSave()).toEqual({ active: true, deaths: 1 });
  });

  it('acepta el límite exacto, rechaza fuera y no repite una resurrección', () => {
    const state = new SpectralState(def);
    state.die();
    expect(state.resurrectAt(altar.id, { x: altar.x + def.resurrectRadius + 0.001, y: altar.y })).toBe(false);
    expect(state.resurrectAt('inexistente', altar)).toBe(false);
    expect(state.resurrectAt(altar.id, { x: altar.x + def.resurrectRadius, y: altar.y })).toBe(true);
    expect(state.resurrectAt(altar.id, altar)).toBe(false);
    expect(state.toSave()).toEqual({ active: false, deaths: 1 });
  });
});
