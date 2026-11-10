import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import ambientJson from '../data/ambient.json';
import { parseAmbient } from '../src/data/ambientSchema';
import { mergeCatalogInstances, parseCatalogGlb, type CatalogGeometry } from '../src/render/catalogGeometry';
import {
  placedGround,
  scatterAmbient,
  solidFootprint,
  type AmbientDef,
  type AmbientSite,
} from '../src/world/ambient';

const parsed = parseAmbient(ambientJson);

function flatSite(): AmbientSite {
  return {
    paths: [],
    flatAreas: [],
    ponds: [],
    props: [],
    biomes: [],
    forestNoise: { scale: 10, octaves: 1, persistence: 0.5 },
    forestSeed: 1,
    seaLevel: 0,
    height: () => 5,
    playable: () => true,
  };
}

describe('datos ambientales', () => {
  it('valida el catálogo, las capas y el presupuesto de colocaciones', () => {
    expect(Object.keys(parsed.pieces)).toHaveLength(72);
    expect(parsed.layers).toHaveLength(7);
    expect(new Set(parsed.layers.map((layer) => layer.id)).size).toBe(parsed.layers.length);
    expect(parsed.placed.length).toBeLessThanOrEqual(parsed.budget.maxPlaced);
    for (const layer of parsed.layers) {
      for (const id of layer.pieces) {
        expect(parsed.pieces[id], id).toBeDefined();
        expect(parsed.pieces[id]!.solid, id).toBe(false);
      }
    }
  });

  it('rechaza una pieza sólida dentro de una capa repartida', () => {
    const invalid = structuredClone(ambientJson) as unknown as { layers: Array<{ pieces: string[] }> };
    const solid = Object.entries(parsed.pieces).find(([, piece]) => piece.solid)![0];
    invalid.layers[0]!.pieces = [solid];
    expect(() => parseAmbient(invalid)).toThrow(/sólida/);
  });

  it('cada nodo existe en su GLB y conserva las dimensiones declaradas', () => {
    const libraries = new Map<string, ReturnType<typeof parseCatalogGlb>>();
    for (const model of new Set(Object.values(parsed.pieces).map((piece) => piece.model))) {
      const file = readFileSync(`assets/models/${model}.glb`);
      const data = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
      libraries.set(model, parseCatalogGlb(data));
    }
    for (const [id, piece] of Object.entries(parsed.pieces)) {
      const geometry = libraries.get(piece.model)!.get(id);
      expect(geometry, `${piece.model}:${id}`).toBeDefined();
      const size = geometry!.max.map((value, axis) => value - geometry!.min[axis]!) as [number, number, number];
      expect(Math.abs(size[0] - piece.w), `${id}: ancho`).toBeLessThanOrEqual(0.02);
      expect(Math.abs(size[1] - piece.h), `${id}: alto`).toBeLessThanOrEqual(0.02);
      expect(Math.abs(size[2] - piece.d), `${id}: fondo`).toBeLessThanOrEqual(0.02);
    }
  });

  it('reparte igual con la misma semilla y respeta el máximo por trozo', () => {
    const def: AmbientDef = {
      seed: 9,
      chunkMeters: 10,
      rings: { detail: { full: 10, off: 20 }, prop: { full: 10, off: 20 } },
      budget: { maxScatterPerChunk: 3, maxTrianglesPerChunk: 100, maxPlaced: 0, maxPlacedGap: 1, maxPlacedSlope: 1, solidPathClearance: 0 },
      pieces: { leaf: { model: 'test', w: 1, d: 1, h: 0.1, solid: false } },
      layers: [{ id: 'leaves', pieces: ['leaf'], density: 100, minSpacing: 1, scale: [1, 1], tint: [1, 1], pathClearance: 0, forest: 0, inFlatAreas: true, maxSlope: 1, ring: 'detail', weights: {}, defaultWeight: 1 }],
      placed: [],
    };
    const a = scatterAmbient(def, flatSite(), 0, 0, 10);
    const b = scatterAmbient(def, flatSite(), 0, 0, 10);
    expect(a).toEqual(b);
    expect(a).toHaveLength(3);
  });

  it('gira la huella sólida y apoya una pieza sobre un plano inclinado', () => {
    const fence = Object.entries(parsed.pieces).find(([id, piece]) => id.includes('cerca_4m') && piece.solid)![0];
    const base = { piece: fence, x: 10, y: 20, scale: 1 };
    const horizontal = solidFootprint(parsed, { ...base, rotDeg: 0 });
    const vertical = solidFootprint(parsed, { ...base, rotDeg: 90 });
    expect(horizontal.length).toBeGreaterThan(1);
    expect(Math.max(...horizontal.map((p) => p.x)) - Math.min(...horizontal.map((p) => p.x))).toBeGreaterThan(2);
    expect(Math.max(...vertical.map((p) => p.y)) - Math.min(...vertical.map((p) => p.y))).toBeGreaterThan(2);
    const support = placedGround(parsed, { ...base, rotDeg: 25 }, (x, z) => 2 + x * 0.1 + z * 0.2);
    expect(support.slopeX).toBeCloseTo(0.1, 6);
    expect(support.slopeZ).toBeCloseTo(0.2, 6);
    expect(support.gap).toBeCloseTo(0, 6);
  });
});

describe('geometría ambiental fusionada', () => {
  it('transforma dos copias y conserva el corte de índices por copia', () => {
    const geometry: CatalogGeometry = {
      positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
      normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
      colors: new Float32Array([1, 1, 1, 1, 1, 1, 1, 1, 1]),
      indices: new Uint32Array([0, 1, 2]),
      triangles: 1,
      min: [0, 0, 0],
      max: [1, 1, 0],
    };
    const out = mergeCatalogInstances([
      { geometry, x: 0, y: 0, z: 0, scale: 1, rotY: 0, tint: 1, slopeX: 0, slopeZ: 0 },
      { geometry, x: 5, y: 0, z: 0, scale: 1, rotY: Math.PI / 2, tint: 0.5, slopeX: 0, slopeZ: 0 },
    ]);
    expect([...out.indexEnd]).toEqual([3, 6]);
    expect([...out.indices]).toEqual([0, 1, 2, 3, 4, 5]);
    expect(out.positions[9]).toBeCloseTo(5, 6);
    expect(out.colors[12]).toBeCloseTo(0.5, 6);
  });
});
