import { describe, expect, it } from 'vitest';
import {
  dungeonFloorMapScope,
  listProvinceMapScopes,
  loadMapBundle,
  parseProvinceManifest,
  provinceMapScope,
} from '../src/data/mapScopes';

describe('ámbitos de mapa separados', () => {
  it('cataloga cada provincia como una futura raíz de datos propia', () => {
    const scopes = listProvinceMapScopes();
    expect(scopes).toHaveLength(10);
    expect(provinceMapScope('colon')).toMatchObject({
      kind: 'province',
      id: 'province:colon',
      dataRoot: 'data/maps/provinces/colon',
    });
  });

  it('un bundle provincial no arrastra documentos de mazmorra', () => {
    const bundle = loadMapBundle(provinceMapScope('colon'));
    expect(bundle.data.kind).toBe('province');
    expect(bundle).not.toHaveProperty('data.floor');
    if (bundle.data.kind === 'province') {
      expect(Object.keys(bundle.data.metadata.legacyFiles).sort()).toEqual(['ambient', 'navPaint', 'terrain', 'vegetation', 'zones']);
    }
  });

  it('un bundle de piso carga sólo su documento canónico', () => {
    const scope = dungeonFloorMapScope({
      dungeonId: 'cripta-tulivieja',
      floorIndex: 6,
      seed: 51931,
      cellSize: 0.5,
      generationKind: 'seed',
    });
    const bundle = loadMapBundle(scope);
    expect(bundle.data.kind).toBe('dungeon-floor');
    expect(bundle).not.toHaveProperty('data.metadata');
    if (bundle.data.kind === 'dungeon-floor') {
      expect(bundle.data.floor).toMatchObject({ dungeon: 'cripta-tulivieja', floor: 7 });
      expect(bundle.data.floor.navPaint).toEqual({ cellSize: 0.5, blocked: [], cleared: [] });
    }
  });

  it('rechaza provincias duplicadas y ámbitos inexistentes', () => {
    const files = { terrain: 't', vegetation: 'v', ambient: 'a', zones: 'z', navPaint: 'n' };
    expect(() => parseProvinceManifest({ provinces: [
      { id: 'x', name: 'X', dataRoot: 'x', legacyFiles: files },
      { id: 'x', name: 'X2', dataRoot: 'x2', legacyFiles: files },
    ] })).toThrow(/duplicado/);
    expect(() => provinceMapScope('no-existe')).toThrow(/desconocido/);
  });
});
