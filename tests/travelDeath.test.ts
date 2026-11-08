import { describe, expect, it } from 'vitest';
import cartographyJson from '../data/cartography.json';
import deathJson from '../data/death.json';
import { parseSpectralDef, SpectralState } from '../src/rpg/spectral';
import { mapCell, parseCartography, worldCoordinate } from '../src/world/cartography';

describe('cartografía continua', () => {
  const def = parseCartography(cartographyJson);

  it('usa una sola proyección estable para celdas, pliegos y altura', () => {
    const c = worldCoordinate(160, 96, 12.2, 256, 256, def);
    expect(c).toMatchObject({ mapX: 1, mapY: -1, sectorX: 0, sectorY: -1, localX: 1, localY: 3, altitude: 10 });
    expect(c.label).toContain('Pliego +0,−1');
    expect(mapCell(160, 96, 256, 256, def.cellMeters)).toEqual([1, -1]);
  });

  it('rechaza datos fuera de los límites documentados', () => {
    expect(() => parseCartography({ ...cartographyJson, cellMeters: 2 })).toThrow(/cellMeters/);
  });
});


describe('muerte espectral', () => {
  const def = parseSpectralDef(deathJson);

  it('bloquea combate y botín hasta llegar a un Alzador o recibir ayuda', () => {
    const state = new SpectralState(def);
    state.die();
    expect(state.toSave()).toEqual({ active: true, deaths: 1 });
    expect(state.canFight()).toBe(false);
    expect(state.canLoot()).toBe(false);
    expect(state.ignoredByEnemies()).toBe(true);
    expect(state.speed(10)).toBeCloseTo(7.2);
    const altar = def.resurrectors[0]!;
    expect(state.resurrectAt(altar.id, { x: altar.x + def.resurrectRadius + 1, y: altar.y })).toBe(false);
    expect(state.resurrectAt(altar.id, altar)).toBe(true);
    expect(new SpectralState(def, state.toSave()).active).toBe(false);
  });

  it('valida nombres únicos y parámetros de muerte', () => {
    expect(() => parseSpectralDef({ ...deathJson, speedMultiplier: 2 })).toThrow(/speedMultiplier/);
    expect(() => parseSpectralDef({ ...deathJson, resurrectors: [deathJson.resurrectors[0], deathJson.resurrectors[0]] })).toThrow(/únicos/);
  });
});
