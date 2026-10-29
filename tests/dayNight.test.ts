import { describe, expect, it } from 'vitest';
import { loadWorldData } from '../src/data/worldData';
import { parseLighting } from '../src/data/worldSchema';
import { nearestLamps, sampleLighting, sunDirection, timeOfDay } from '../src/world/dayNight';
import lightingJson from '../data/lighting.json';

const def = loadWorldData().lighting;

describe('día y noche', () => {
  it('el reloj da la vuelta cada dayLengthSeconds', () => {
    expect(timeOfDay(def, 0)).toBeCloseTo(def.startTime);
    expect(timeOfDay(def, def.dayLengthSeconds)).toBeCloseTo(def.startTime);
    expect(timeOfDay(def, def.dayLengthSeconds * 0.5)).toBeCloseTo((def.startTime + 0.5) % 1);
  });

  it('el sol sale, culmina y se pone', () => {
    expect(sunDirection(def, 0.5)[1]).toBeGreaterThan(0.8);
    expect(Math.abs(sunDirection(def, 0.25)[1])).toBeLessThan(1e-9);
    expect(sunDirection(def, 0)[1]).toBeLessThan(-0.8);
    for (const t of [0.1, 0.33, 0.6, 0.9]) expect(Math.hypot(...sunDirection(def, t))).toBeCloseTo(1);
  });

  it('de día luce el sol; de noche, luna, farolas y luz del jugador', () => {
    const noon = sampleLighting(def, 0.5);
    const night = sampleLighting(def, 0.95);
    expect(noon.isDay).toBe(true);
    expect(night.isDay).toBe(false);
    expect(noon.sun).toBeGreaterThan(night.sun * 3);
    expect(noon.lampsOn).toBe(0);
    expect(night.lampsOn).toBe(1);
    expect(night.playerLight).toBe(1);
    // La luz direccional siempre viene de arriba (luna de noche).
    expect(night.toLight[1]).toBeGreaterThan(0);
    expect(sampleLighting(def, 0.25).toLight[1]).toBeGreaterThan(0.15);
  });

  it('interpola sin saltos, también cruzando medianoche', () => {
    let worst = 0;
    let prev = sampleLighting(def, 0);
    for (let i = 1; i <= 1000; i++) {
      const s = sampleLighting(def, (i / 1000) % 1);
      worst = Math.max(worst, Math.abs(s.sun - prev.sun), Math.abs(s.ambient - prev.ambient), Math.abs(s.lampsOn - prev.lampsOn));
      prev = s;
    }
    expect(worst).toBeLessThan(0.05);
  });

  it('elige las farolas más cercanas', () => {
    const lamps = [{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 3, z: 0 }, { x: 50, z: 50 }];
    expect(nearestLamps(lamps, 2, 0, 2)).toEqual([2, 0]);
    expect(nearestLamps(lamps, 2, 0, 9)).toHaveLength(4);
  });

  it('rechaza claves desordenadas', () => {
    const keys = [...lightingJson.keys];
    [keys[0], keys[1]] = [keys[1]!, keys[0]!];
    expect(() => parseLighting({ ...lightingJson, keys })).toThrow(/keys\[1\]\.t/);
  });
});
