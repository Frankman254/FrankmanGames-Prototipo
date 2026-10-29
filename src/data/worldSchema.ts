// Datos del mundo visual (Slice 02): assets, terreno, vegetación, luz y
// personaje. Separado de `schema.ts` para no mezclarse con los datos de juego.
// Todo número aquí es PROPUESTA.
import type { Vec2 } from '../sim/vec2';
import type { FbmDef } from '../world/noise';
import { PROP_KINDS, SCATTER_SHAPES, type PropKind, type ScatterKindDef, type ScatterShape, type VegetationDef } from '../world/scatter';
import type { GroundLayerDef, TerrainDef } from '../world/terrain';
import { Reader } from './validate';

export interface AssetEntry {
  /** Ruta relativa a la raíz del repositorio, p. ej. `assets/kenney/arbol.glb`. */
  file: string;
}

export type AssetManifest = Record<string, AssetEntry>;

export function parseAssets(raw: unknown): AssetManifest {
  const r = new Reader('assets.json');
  const o = r.obj(raw);
  const list = r.child('assets');
  const assets = list.obj(o['assets'], '');
  const out: AssetManifest = {};
  for (const [id, v] of Object.entries(assets)) {
    const c = list.child(id);
    const file = c.str(c.obj(v), 'file');
    if (!/^assets\/[\w\-./]+$/.test(file) || file.includes('..')) c.fail('file', `debe estar dentro de assets/ (llegó "${file}")`);
    out[id] = { file };
  }
  return out;
}

type Obj = Record<string, unknown>;

export function readColor(r: Reader, o: Obj, key: string): [number, number, number] {
  const v = r.arr(o, key);
  if (v.length !== 3 || v.some((c) => typeof c !== 'number' || c < 0 || c > 4)) r.fail(key, 'se esperaba [r, g, b] con valores en 0–4');
  return v as [number, number, number];
}

function readFbm(r: Reader, v: unknown): FbmDef {
  const o = r.obj(v);
  return {
    scale: r.num(o, 'scale', { min: 0.5 }),
    octaves: r.num(o, 'octaves', { int: true, min: 1, max: 8 }),
    persistence: r.num(o, 'persistence', { min: 0, max: 1 }),
  };
}

function readLayer(r: Reader, v: unknown): GroundLayerDef {
  const o = r.obj(v);
  return { color: readColor(r, o, 'color'), variation: r.num(o, 'variation', { min: 0, max: 1 }), tileMeters: r.num(o, 'tileMeters', { min: 0.25 }) };
}

export interface OverworldDef extends TerrainDef {
  playerStart: Vec2;
  /** Se suma a las posiciones del encuentro de la arena (data/encounter.json). */
  encounterOffset: Vec2;
}

export function parseTerrain(raw: unknown): OverworldDef {
  const r = new Reader('terrain.json');
  const o = r.obj(raw);
  const width = r.num(o, 'width', { min: 16, max: 2048 });
  const depth = r.num(o, 'depth', { min: 16, max: 2048 });
  const playerStart = r.vec(o, 'playerStart');
  if (playerStart.x < 0 || playerStart.x > width || playerStart.y < 0 || playerStart.y > depth) r.fail('playerStart', 'fuera de la zona');
  const heightStep = r.num(o, 'heightStep', { min: 0.25, max: 8 });
  if (Math.abs(width / heightStep - Math.round(width / heightStep)) > 1e-6) r.fail('heightStep', 'debe dividir el ancho de la zona');
  const noiseR = r.child('noise');
  const noiseO = noiseR.obj(o['noise']);
  const dirtR = r.child('dirtNoise');
  const dirtO = dirtR.obj(o['dirtNoise']);
  const bhR = r.child('borderHills');
  const bhO = bhR.obj(o['borderHills']);
  const layersR = r.child('layers');
  const layersO = layersR.obj(o['layers']);
  const splatResolution = r.num(o, 'splatResolution', { int: true, min: 16, max: 4096 });
  return {
    width,
    depth,
    playerStart,
    encounterOffset: r.vec(o, 'encounterOffset'),
    seed: r.num(o, 'seed', { int: true, min: 0 }),
    heightStep,
    noise: { ...readFbm(noiseR, noiseO), amplitude: noiseR.num(noiseO, 'amplitude', { min: 0, max: 50 }) },
    borderHills: { width: bhR.num(bhO, 'width', { min: 0 }), height: bhR.num(bhO, 'height', { min: 0, max: 100 }) },
    pathFlatten: r.num(o, 'pathFlatten', { min: 0 }),
    paths: r.arr(o, 'paths').map((v, i) => {
      const c = r.child(`paths[${i}]`);
      const p = c.obj(v);
      const points = c.arr(p, 'points').map((pt, k) => {
        const pc = c.child(`points[${k}]`);
        const po = pc.obj(pt);
        return { x: pc.num(po, 'x'), y: pc.num(po, 'y') };
      });
      if (points.length < 2) c.fail('points', 'un camino necesita al menos 2 puntos');
      return { width: c.num(p, 'width', { min: 0.5 }), points };
    }),
    flatAreas: r.arr(o, 'flatAreas').map((v, i) => {
      const c = r.child(`flatAreas[${i}]`);
      const a = c.obj(v);
      return { x: c.num(a, 'x'), y: c.num(a, 'y'), radius: c.num(a, 'radius', { min: 0 }), falloff: c.num(a, 'falloff', { min: 0.1 }), dirt: c.num(a, 'dirt', { min: 0, max: 1 }) };
    }),
    splatResolution,
    dirtNoise: { ...readFbm(dirtR, dirtO), threshold: dirtR.num(dirtO, 'threshold', { min: 0, max: 1 }) },
    slopeDirt: r.num(o, 'slopeDirt', { min: 0.01 }),
    layers: {
      grass: readLayer(layersR.child('grass'), layersO['grass']),
      dirt: readLayer(layersR.child('dirt'), layersO['dirt']),
      path: readLayer(layersR.child('path'), layersO['path']),
    },
  };
}

function readRange(r: Reader, o: Obj, key: string, min: number): [number, number] {
  const v = r.arr(o, key);
  if (v.length !== 2 || typeof v[0] !== 'number' || typeof v[1] !== 'number' || v[0] < min || v[1] < v[0]) r.fail(key, `se esperaba [mín, máx] con mín ≥ ${min}`);
  return [v[0], v[1]];
}

export function parseVegetation(raw: unknown): VegetationDef {
  const r = new Reader('vegetation.json');
  const o = r.obj(raw);
  const kindsR = r.child('kinds');
  const kinds: Record<string, ScatterKindDef> = {};
  for (const [id, v] of Object.entries(kindsR.obj(o['kinds']))) {
    if (id.startsWith('_')) continue;
    const c = kindsR.child(id);
    const k = c.obj(v);
    kinds[id] = {
      shape: c.str(k, 'shape', SCATTER_SHAPES) as ScatterShape,
      density: c.num(k, 'density', { min: 0, max: 100 }),
      minSpacing: c.num(k, 'minSpacing', { min: 0.2, max: 50 }),
      scale: readRange(c, k, 'scale', 0.05),
      blockRadius: c.num(k, 'blockRadius', { min: 0, max: 10 }),
      pathClearance: c.num(k, 'pathClearance', { min: 0 }),
      inFlatAreas: k['inFlatAreas'] === true,
      forest: c.num(k, 'forest', { min: -1, max: 1 }),
      wind: c.num(k, 'wind', { min: 0, max: 5 }),
      tint: readRange(c, k, 'tint', 0),
    };
  }
  const windR = r.child('wind');
  const windO = windR.obj(o['wind']);
  return {
    seed: r.num(o, 'seed', { int: true, min: 0 }),
    chunkMeters: r.num(o, 'chunkMeters', { min: 4, max: 512 }),
    clearRadiusAroundStart: r.num(o, 'clearRadiusAroundStart', { min: 0 }),
    forestNoise: readFbm(r.child('forestNoise'), o['forestNoise']),
    wind: { speed: windR.num(windO, 'speed', { min: 0 }), strength: windR.num(windO, 'strength', { min: 0, max: 5 }) },
    kinds,
    props: r.arr(o, 'props').map((v, i) => {
      const c = r.child(`props[${i}]`);
      const p = c.obj(v);
      const rotDeg = c.num(p, 'rotDeg', { int: true });
      if (rotDeg % 90 !== 0) c.fail('rotDeg', `sólo múltiplos de 90 (llegó ${rotDeg})`);
      return {
        kind: c.str(p, 'kind', PROP_KINDS) as PropKind,
        x: c.num(p, 'x'),
        y: c.num(p, 'y'),
        w: c.num(p, 'w', { min: 0.1 }),
        d: c.num(p, 'd', { min: 0.1 }),
        rotDeg: ((rotDeg % 360) + 360) % 360,
      };
    }),
  };
}
