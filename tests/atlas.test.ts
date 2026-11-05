import { describe, expect, it } from 'vitest';
import raw from '../data/panama.json';
import { atlasExtent, farHeight, project, regionAt, type AtlasDef } from '../src/world/atlas';

const atlas = raw as unknown as AtlasDef;
const at = (lon: number, lat: number): string | null => {
  const p = project(atlas, lon, lat);
  return regionAt(atlas, p.x, p.z)?.id ?? null;
};

describe('atlas de Panamá', () => {
  it('tiene las diez provincias y las comarcas con territorio propio', () => {
    expect(atlas.regions.filter((r) => r.kind === 'provincia')).toHaveLength(10);
    expect(atlas.regions.filter((r) => r.kind === 'comarca').map((r) => r.id).sort()).toEqual(['embera', 'guna_yala', 'ngabe']);
  });

  it('cada lugar real cae en su región', () => {
    const places: Array<[string, number, number]> = [
      ['los_santos', -80.43, 7.77], // Las Tablas
      ['herrera', -80.43, 7.97], // Chitré, en la costa
      ['veraguas', -80.97, 8.1], // Santiago
      ['veraguas', -81.75, 7.45], // Coiba
      ['cocle', -80.36, 8.5], // Penonomé
      ['panama_oeste', -79.78, 8.88], // La Chorrera
      ['panama', -79.5, 9.0], // Ciudad de Panamá
      ['panama', -79.0, 8.45], // Las Perlas
      ['colon', -79.9, 9.3], // Colón
      ['darien', -77.9, 8.25], // Yaviza
      ['chiriqui', -82.43, 8.42], // David
      ['bocas', -82.5, 9.3], // Changuinola
      ['bocas', -82.24, 9.38], // Isla Colón
      ['guna_yala', -78.6, 9.3],
      ['ngabe', -81.7, 8.6],
    ];
    for (const [id, lon, lat] of places) expect(at(lon, lat), `${id} ${lon},${lat}`).toBe(id);
  });

  it('el mar queda fuera', () => {
    expect(at(-79.3, 8.0)).toBeNull(); // golfo de Panamá
    expect(at(-80.5, 9.6)).toBeNull(); // Caribe
    expect(at(-82.0, 7.2)).toBeNull(); // Pacífico
  });

  it('el mundo jugable actual cae en Los Santos, en tierra', () => {
    for (const [x, z] of [[0, 0], [256, 0], [0, 256], [256, 256], [128, 128]] as const) {
      expect(regionAt(atlas, x, z)?.id, `${x},${z}`).toBe('los_santos');
    }
  });

  it('las montañas salen donde están y el mar se queda abajo', () => {
    const baru = project(atlas, -82.54, 8.8);
    expect(farHeight(atlas, baru.x, baru.z)).toBeGreaterThan(200);
    const sea = project(atlas, -79.3, 8.0);
    expect(farHeight(atlas, sea.x, sea.z)).toBe(atlas.seaLevel);
    const e = atlasExtent(atlas);
    expect(e.x1 - e.x0).toBeCloseTo(6.1 * atlas.kmPerDegree * atlas.metersPerKm);
  });

  it('las comarcas no llevan contenido inventado sin consultar', () => {
    for (const r of atlas.regions.filter((c) => c.kind === 'comarca')) {
      expect(r.needsConsult).toBe(true);
      expect(r.people).toMatch(/consultar/);
    }
  });
});
