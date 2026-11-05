import { describe, expect, it } from 'vitest';
import { loadWorldData } from '../src/data/worldData';
import { parseDetail } from '../src/data/worldSchema';
import { inDetailRange, modelRange, ringFraction, terrainLevel } from '../src/world/detail';

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
    const ring = { full: 10, off: 20 };
    const ok = {
      enemies: { on: 50, off: 60, createsPerFrame: 2 },
      models: { default: { on: 80, off: 90 } },
      terrain: { chunkMeters: 64, margin: 5, levels: [{ step: 1, until: 50 }, { step: 4, until: 200 }] },
      vegetation: { tree: ring, bush: ring, rock: ring, flower: ring, grass: ring },
    };
    expect(() => parseDetail(ok)).not.toThrow();
    expect(() => parseDetail({ ...ok, enemies: { on: 50, off: 40, createsPerFrame: 2 } })).toThrow(/off/);
    expect(() => parseDetail({ ...ok, models: {} })).toThrow(/default/);
    expect(() => parseDetail({ ...ok, vegetation: { ...ok.vegetation, grass: { full: 20, off: 10 } } })).toThrow(/off/);
    expect(() => parseDetail({ ...ok, terrain: { ...ok.terrain, levels: [{ step: 4, until: 50 }, { step: 1, until: 200 }] } })).toThrow(/detalle/);
  });

  it('la vegetación se aclara con la distancia y la visión escala el anillo', () => {
    const ring = { full: 40, off: 80 };
    expect(ringFraction(ring, 10)).toBe(1);
    expect(ringFraction(ring, 60)).toBeCloseTo(0.5);
    expect(ringFraction(ring, 80)).toBe(0);
    expect(ringFraction(ring, 80, 2)).toBe(1);
  });

  it('el terreno pierde detalle al alejarse, sin alternar en el borde', () => {
    const { detail } = loadWorldData();
    const t = detail.terrain;
    expect(terrainLevel(t, 0, -1)).toBe(0);
    expect(terrainLevel(t, 5000, -1)).toBe(t.levels.length - 1);
    const edge = t.levels[0]!.until;
    expect(terrainLevel(t, edge + 1, 0)).toBe(0);
    expect(terrainLevel(t, edge + t.margin + 1, 0)).toBe(1);
    expect(terrainLevel(t, edge - 1, 1)).toBe(0);
  });

  it('cada forma de planta tiene su anillo y la hierba es la que antes desaparece', () => {
    const { vegetation } = loadWorldData().detail;
    expect(vegetation['grass']!.off).toBeLessThan(vegetation['bush']!.off);
    expect(vegetation['bush']!.off).toBeLessThan(vegetation['tree']!.off);
  });
});
