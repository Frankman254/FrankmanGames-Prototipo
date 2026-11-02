import { describe, expect, it } from 'vitest';
import { groupBySector, sectorAt, sectorsAround, SectorStream } from '../src/world/streaming';

describe('validación de sectores antes de recorrer contenido', () => {
  it.each([0, -1, NaN, Infinity, -Infinity])('rechaza tamaño %s incluso sin contenido', (size) => {
    expect(() => sectorAt({ x: 0, y: 0 }, size)).toThrow(RangeError);
    expect(() => sectorsAround({ x: 0, y: 0 }, size, 1)).toThrow(RangeError);
    expect(() => new SectorStream(size, 1)).toThrow(RangeError);
    expect(() => groupBySector([], size)).toThrow(RangeError);
  });

  it.each([-1, NaN, Infinity, -Infinity])('rechaza radio %s antes del bucle', (radius) => {
    expect(() => sectorsAround({ x: 0, y: 0 }, 64, radius)).toThrow(RangeError);
    expect(() => new SectorStream(64, radius)).toThrow(RangeError);
  });

  it('conserva sectores activos si llega una posición no finita', () => {
    const stream = new SectorStream(64, 0);
    expect(stream.update({ x: -1, y: 1 }).active).toEqual(['-1:0']);
    for (const point of [{ x: Infinity, y: 0 }, { x: 0, y: NaN }]) {
      expect(() => stream.update(point)).toThrow(RangeError);
      expect(stream.active('-1:0')).toBe(true);
    }
    expect(stream.update({ x: -1, y: 1 })).toEqual({ loaded: [], unloaded: [], active: ['-1:0'] });
  });
});
