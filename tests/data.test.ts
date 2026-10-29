import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { parseCamera, parseZone } from '../src/data/schema';
import { DataError } from '../src/data/validate';

describe('datos', () => {
  it('los JSON del repositorio son válidos', () => {
    expect(() => loadGameData()).not.toThrow();
  });

  it('rechaza números fuera de rango con la ruta del campo', () => {
    const cam = { pitchDeg: 120, yawDeg: 0, distance: 20, fovDeg: 45, followLerpPerSecond: 8, minDistance: 10, maxDistance: 30 };
    expect(() => parseCamera(cam)).toThrow(DataError);
    expect(() => parseCamera(cam)).toThrow(/pitchDeg/);
  });

  it('rechaza un inicio fuera de la zona', () => {
    const z = { width: 20, depth: 20, playerStart: { x: 30, y: 1 }, playerSpeed: 5, playerRadius: 0.5 };
    expect(() => parseZone(z)).toThrow(/playerStart/);
  });
});
