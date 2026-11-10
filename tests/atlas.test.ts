import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import raw from '../data/panama.json';
import reliefRaw from '../data/relieve.json';
import { atlasExtent, farHeight, project, regionAt, reliefMeters, type AtlasDef, type AtlasRelief } from '../src/world/atlas';

const atlas = raw as unknown as AtlasDef;
const real: AtlasDef = { ...atlas, relief: reliefRaw as unknown as AtlasRelief };
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
      ['panama', -78.95, 8.38], // Las Perlas (Isla del Rey)
      ['colon', -79.9, 9.3], // Colón
      ['darien', -77.69, 8.16], // Yaviza
      ['embera', -77.75, 8.45], // Cémaco, río Chucunaque arriba
      ['embera', -78.17, 7.85], // Sambú
      ['chiriqui', -82.43, 8.42], // David
      ['bocas', -82.5, 9.3], // Changuinola
      ['bocas', -82.24, 9.38], // Isla Colón
      ['guna_yala', -78.6, 9.36],
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
    expect(e.x1 - e.x0).toBeCloseTo(7 * atlas.kmPerDegree * atlas.metersPerKm);
  });

  it('F10: islas en su sitio y vecinos visibles que no son Panamá', () => {
    const islands: Array<[string, number, number]> = [
      ['veraguas', -81.7, 7.4], // Coiba, mitad este
      ['veraguas', -81.79, 7.27], // Jicarón
      ['veraguas', -81.17, 7.51], // Cébaco
      ['panama', -78.9, 8.38], // Isla del Rey
      ['panama', -79.11, 8.26], // San José
      ['panama', -79.03, 8.63], // Contadora
      ['guna_yala', -78.8, 9.55], // cayos
      ['bocas', -82.13, 9.17], // Isla Popa
      ['chiriqui', -82.33, 8.12], // Isla Parida
      ['ngabe', -81.56, 9.1], // Escudo de Veraguas
      ['costa_rica', -83.3, 9.0],
      ['colombia', -77.0, 7.6],
    ];
    for (const [id, lon, lat] of islands) expect(at(lon, lat), `${id} ${lon},${lat}`).toBe(id);
    expect(at(-81.4, 7.4)).toBeNull(); // mar entre Coiba y tierra firme
    const terrain = JSON.parse(readFileSync('data/terrain.json', 'utf8')) as { world: { playable: string[] } };
    for (const r of atlas.regions.filter((x) => x.kind === 'pais')) expect(terrain.world.playable).not.toContain(r.id);
    expect(atlas.regions.filter((x) => x.kind === 'pais').map((x) => x.id).sort()).toEqual(['colombia', 'costa_rica']);
  });

  it('geografía real: en todo el atlas, tierra y mar los decide la costa de Natural Earth 1:10m', () => {
    expect(atlas.handBox).toBeUndefined();
    expect(atlas.coast?.['panama']?.[0]?.length).toBeGreaterThan(800);
    // Cada provincia tiene su forma real, no un polígono de diez puntos.
    for (const r of atlas.regions.filter((x) => x.kind !== 'pais')) expect(r.polygons[0]!.length, r.id).toBeGreaterThan(60);
    const inside = (rings: ReadonlyArray<ReadonlyArray<readonly [number, number]>>, lon: number, lat: number): boolean =>
      rings.some((ring) => {
        let c = false;
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          const [xi, yi] = ring[i]!;
          const [xj, yj] = ring[j]!;
          if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) c = !c;
        }
        return c;
      });
    let land = 0;
    for (let lon = -83.5; lon < -76.7; lon += 0.05) {
      for (let lat = 7.05; lat < 9.78; lat += 0.05) {
        const id = at(lon, lat);
        if (inside(atlas.coast!['panama']!, lon, lat)) {
          land++;
          expect(id, `${lon},${lat}`).not.toBeNull();
          expect(['costa_rica', 'colombia']).not.toContain(id);
        } else if (inside(atlas.coast!['costa_rica']!, lon, lat)) expect(id).toBe('costa_rica');
        else if (inside(atlas.coast!['colombia']!, lon, lat)) expect(id).toBe('colombia');
      }
    }
    expect(land).toBeGreaterThan(1000);
  });

  it('los pueblos ya construidos siguen en tierra y en su provincia', () => {
    const towns: Array<[string, string, number, number]> = [
      ['los_santos', 'Villa Raspadura', 127, 131],
      ['los_santos', 'Pedasol', 438, 10],
      ['los_santos', 'Punta Venada', 300, -78],
      ['los_santos', 'Cambutal', 44, -226],
      ['los_santos', 'Iguanera', 725, 235],
      ['herrera', 'Chitrí', 10, 490],
    ];
    for (const [id, name, x, z] of towns) expect(regionAt(atlas, x, z)?.id, name).toBe(id);
  });

  it('relieve real: el Barú es lo más alto, las tierras bajas casi llanas y el mar abajo', () => {
    const r = real.relief!;
    expect(reliefMeters(r, -82.54, 8.81)).toBeGreaterThan(3000); // Volcán Barú, 3 474 m
    expect(reliefMeters(r, -80.43, 7.97)).toBeLessThan(80); // Chitré
    const h = (lon: number, lat: number): number => {
      const p = project(real, lon, lat);
      return farHeight(real, p.x, p.z);
    };
    expect(h(-82.54, 8.81)).toBeGreaterThan(200);
    expect(h(-82.54, 8.81)).toBeGreaterThan(h(-80.97, 8.1) + 150); // Barú frente a Santiago
    expect(h(-79.3, 8.0)).toBe(real.seaLevel);
  });

  it('las comarcas llevan nombre de juego inventado, distinto del real (creador, 2026-11-10)', () => {
    const comarcas = atlas.regions.filter((c) => c.kind === 'comarca');
    expect(comarcas.length).toBe(3);
    for (const r of comarcas) {
      expect(r.name, r.id).toBeTruthy();
      expect(r.name).not.toBe(r.official);
      expect(r.places.length).toBeGreaterThan(0);
    }
  });
});
