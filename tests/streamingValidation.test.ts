import { describe, expect, it } from 'vitest';
import { groupBySector, sectorAt, sectorsAround, SectorStream } from '../src/world/streaming';

describe('validación de sectores antes de recorrer contenido', () => {
  it('no confunde distancias enormes por desbordamiento al elevarlas al cuadrado', () => {
    const keys = sectorsAround({ x: 5e199, y: 5e199 }, 1e200, 6e199).map((s) => s.key);
    expect(keys).toEqual(['0:-1', '-1:0', '0:0', '1:0', '0:1']);
  });

  it.each([
    { size: 1, radius: 128 },
    { size: 1, radius: Number.MAX_VALUE },
    { size: Number.MIN_VALUE, radius: 1 },
  ])('rechaza un presupuesto excesivo antes de recorrer: %j', ({ size, radius }) => {
    expect(() => sectorsAround({ x: 0, y: 0 }, size, radius)).toThrow(/presupuesto/);
    expect(() => new SectorStream(size, radius)).toThrow(/presupuesto/);
  });

  it.each([
    { x: Number.MAX_VALUE, y: 0 },
    { x: 0, y: Number.MAX_SAFE_INTEGER + 1 },
  ])('rechaza índices no representables: %j', (point) => {
    expect(() => sectorAt(point, 1)).toThrow(/rango seguro/);
  });

  it('un borde no representable no altera los sectores que ya estaban activos', () => {
    const stream = new SectorStream(1, 1);
    const previous = stream.update({ x: 0.5, y: 0.5 }).active;
    expect(() => stream.update({ x: Number.MAX_SAFE_INTEGER, y: 0 })).toThrow(/rango seguro/);
    expect(stream.update({ x: 0.5, y: 0.5 })).toEqual({ loaded: [], unloaded: [], active: previous });
  });
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
