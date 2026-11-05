import { describe, expect, it } from 'vitest';
import { loadWorldData } from '../src/data/worldData';
import { parseDetail } from '../src/data/worldSchema';
import { inDetailRange, modelRange } from '../src/world/detail';

const RANGE = { on: 50, off: 70 };

describe('distancias de detalle', () => {
  it('no parpadea en el borde: aparece en on y se quita pasado off', () => {
    expect(inDetailRange(false, 60, RANGE)).toBe(false);
    expect(inDetailRange(false, 50, RANGE)).toBe(true);
    expect(inDetailRange(true, 60, RANGE)).toBe(true);
    expect(inDetailRange(true, 71, RANGE)).toBe(false);
  });

  it('cada modelo usa su rango o el común', () => {
    const { detail } = loadWorldData();
    expect(modelRange(detail, 'castillo')).toEqual(detail.models['castillo']);
    expect(modelRange(detail, 'casa')).toEqual(detail.models['default']);
  });

  it('los enemigos se dibujan más allá de lo que abarca la cámara más alejada', () => {
    const { detail } = loadWorldData();
    // Distancia máxima de cámara (32 m, data/camera.json) y su trozo de suelo visible.
    expect(detail.enemies.on).toBeGreaterThanOrEqual(50);
  });

  it('rechaza un rango que se quitaría antes de aparecer', () => {
    const ok = { enemies: { on: 50, off: 60, createsPerFrame: 2 }, models: { default: { on: 80, off: 90 } } };
    expect(() => parseDetail(ok)).not.toThrow();
    expect(() => parseDetail({ ...ok, enemies: { on: 50, off: 40, createsPerFrame: 2 } })).toThrow(/off/);
    expect(() => parseDetail({ ...ok, models: {} })).toThrow(/default/);
  });
});
