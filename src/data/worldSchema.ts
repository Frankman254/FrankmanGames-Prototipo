// Datos del mundo visual (Slice 02): assets, terreno, vegetación, luz y
// personajes. Separado de `schema.ts` para no mezclarse con los datos de juego.
// Todo número aquí es PROPUESTA.
import type { Vec2 } from '../sim/vec2';
import type { AnimEventDef } from '../world/anim';
import type { LightingDef, Rgb } from '../world/dayNight';
import { ANIM_EVENT_TYPES, ANIM_STATES, PROCEDURAL_MODELS, type AnimState, type ProceduralModel } from '../world/rigs';
import type { FbmDef } from '../world/noise';
import { PROP_KINDS, SCATTER_SHAPES, type PropKind, type ScatterKindDef, type ScatterShape, type VegetationDef } from '../world/scatter';
import type { GroundLayerDef, TerrainDef } from '../world/terrain';
import { Reader } from './validate';

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
    ponds: o['ponds'] === undefined ? [] : r.arr(o, 'ponds').map((v, i) => {
      const c = r.child(`ponds[${i}]`);
      const p = c.obj(v);
      return { x: c.num(p, 'x'), y: c.num(p, 'y'), radius: c.num(p, 'radius', { min: 1 }), depth: c.num(p, 'depth', { min: 0.2 }), shore: c.num(p, 'shore', { min: 0.5 }) };
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

export function parseLighting(raw: unknown): LightingDef {
  const r = new Reader('lighting.json');
  const o = r.obj(raw);
  const keys = r.arr(o, 'keys').map((v, i) => {
    const c = r.child(`keys[${i}]`);
    const k = c.obj(v);
    return {
      t: c.num(k, 't', { min: 0, max: 0.999999 }),
      sun: c.num(k, 'sun', { min: 0, max: 10 }),
      sunColor: readColor(c, k, 'sunColor'),
      ambient: c.num(k, 'ambient', { min: 0, max: 10 }),
      skyColor: readColor(c, k, 'skyColor'),
      groundColor: readColor(c, k, 'groundColor'),
      zenith: readColor(c, k, 'zenith'),
      horizon: readColor(c, k, 'horizon'),
      fogDensity: c.num(k, 'fogDensity', { min: 0, max: 0.2 }),
      lampsOn: c.num(k, 'lampsOn', { min: 0, max: 1 }),
      playerLight: c.num(k, 'playerLight', { min: 0, max: 1 }),
      stars: c.num(k, 'stars', { min: 0, max: 1 }),
    };
  });
  if (keys.length < 2) r.fail('keys', 'se necesitan al menos 2 claves');
  keys.forEach((k, i) => {
    if (i > 0 && k.t <= keys[i - 1]!.t) r.fail(`keys[${i}].t`, 'las claves deben ir en orden creciente de t');
  });
  const sh = r.child('shadows');
  const shO = sh.obj(o['shadows']);
  const la = r.child('lamps');
  const laO = la.obj(o['lamps']);
  const pl = r.child('playerLight');
  const plO = pl.obj(o['playerLight']);
  const mapSize = sh.num(shO, 'mapSize', { int: true, min: 256, max: 8192 });
  if ((mapSize & (mapSize - 1)) !== 0) sh.fail('mapSize', 'debe ser potencia de dos');
  return {
    dayLengthSeconds: r.num(o, 'dayLengthSeconds', { min: 1 }),
    startTime: r.num(o, 'startTime', { min: 0, max: 1 }),
    sunTiltDeg: r.num(o, 'sunTiltDeg', { min: 0, max: 80 }),
    sunAzimuthDeg: r.num(o, 'sunAzimuthDeg', { min: -360, max: 360 }),
    keys,
    shadows: { mapSize, rangeMeters: sh.num(shO, 'rangeMeters', { min: 5, max: 500 }), darkness: sh.num(shO, 'darkness', { min: 0, max: 1 }) },
    lamps: { maxActive: la.num(laO, 'maxActive', { int: true, min: 0, max: 8 }), range: la.num(laO, 'range', { min: 0.5 }), intensity: la.num(laO, 'intensity', { min: 0 }), color: readColor(la, laO, 'color') },
    playerLight: { range: pl.num(plO, 'range', { min: 0.5 }), intensity: pl.num(plO, 'intensity', { min: 0 }), color: readColor(pl, plO, 'color'), height: pl.num(plO, 'height', { min: 0 }) },
  };
}

export interface Palette {
  skin: Rgb;
  cloth: Rgb;
  trim: Rgb;
  hair: Rgb;
  gear: Rgb;
}

export type AssetEntry =
  | { kind: 'procedural'; model: ProceduralModel; scale: number; palettes: Record<string, Palette>; ghost: boolean }
  | {
      kind: 'gltf';
      /** Ruta relativa a la raíz del repositorio, p. ej. `assets/kenney/personaje.glb`. */
      file: string;
      scale: number;
      /** Giro para que el modelo mire hacia +X (la convención del juego). */
      yawDeg: number;
      runSpeed: number;
      /** Nombre del AnimationGroup del archivo para cada estado. */
      clips: Partial<Record<AnimState, string>>;
      events: Record<string, AnimEventDef[]>;
    };

export type AssetManifest = Record<string, AssetEntry>;

function readEvents(r: Reader, v: unknown): Record<string, AnimEventDef[]> {
  const out: Record<string, AnimEventDef[]> = {};
  for (const [clip, list] of Object.entries(r.obj(v))) {
    const c = r.child(clip);
    if (!Array.isArray(list)) c.fail('', 'se esperaba una lista de eventos');
    out[clip] = (list as unknown[]).map((e, i) => {
      const ec = c.child(String(i));
      const eo = ec.obj(e);
      return { t: ec.num(eo, 't', { min: 0, max: 1 }), type: ec.str(eo, 'type', ANIM_EVENT_TYPES) };
    });
  }
  return out;
}

export function parseAssets(raw: unknown): AssetManifest {
  const r = new Reader('assets.json');
  const o = r.obj(raw);
  const list = r.child('assets');
  const assets = list.obj(o['assets']);
  const out: AssetManifest = {};
  for (const [id, v] of Object.entries(assets)) {
    const c = list.child(id);
    const e = c.obj(v);
    const kind = c.str(e, 'kind', ['procedural', 'gltf']) as 'procedural' | 'gltf';
    const scale = c.num(e, 'scale', { min: 0.05, max: 20, def: 1 });
    if (kind === 'procedural') {
      const pr = c.child('palettes');
      const palettes: Record<string, Palette> = {};
      for (const [cls, pv] of Object.entries(pr.obj(e['palettes']))) {
        const pc = pr.child(cls);
        const po = pc.obj(pv);
        palettes[cls] = { skin: readColor(pc, po, 'skin'), cloth: readColor(pc, po, 'cloth'), trim: readColor(pc, po, 'trim'), hair: readColor(pc, po, 'hair'), gear: readColor(pc, po, 'gear') };
      }
      if (!palettes['default']) pr.fail('default', 'falta la paleta «default»');
      out[id] = { kind, model: c.str(e, 'model', PROCEDURAL_MODELS) as ProceduralModel, scale, palettes, ghost: e['ghost'] === true };
    } else {
      const file = c.str(e, 'file');
      if (!/^assets\/[\w\-./]+$/.test(file) || file.includes('..')) c.fail('file', `debe estar dentro de assets/ (llegó "${file}")`);
      const cr = c.child('clips');
      const clips: Partial<Record<AnimState, string>> = {};
      for (const [state, name] of Object.entries(cr.obj(e['clips']))) {
        if (!(ANIM_STATES as readonly string[]).includes(state)) cr.fail(state, `estado desconocido (válidos: ${ANIM_STATES.join(', ')})`);
        if (typeof name !== 'string' || !name) cr.fail(state, 'se esperaba el nombre de la animación');
        clips[state as AnimState] = name as string;
      }
      if (!clips.idle) cr.fail('idle', 'hace falta al menos la animación de reposo');
      out[id] = {
        kind,
        file,
        scale,
        yawDeg: c.num(e, 'yawDeg', { min: -360, max: 360, def: 0 }),
        runSpeed: c.num(e, 'runSpeed', { min: 0.1, max: 50 }),
        clips,
        events: e['events'] === undefined ? {} : readEvents(c.child('events'), e['events']),
      };
    }
  }
  return out;
}

export interface AnimationDataDef {
  blendSeconds: number;
  models: Record<ProceduralModel, { runSpeed: number; events: Record<string, AnimEventDef[]> }>;
}

export function parseAnimation(raw: unknown): AnimationDataDef {
  const r = new Reader('animation.json');
  const o = r.obj(raw);
  const mr = r.child('models');
  const mo = mr.obj(o['models']);
  const models = {} as AnimationDataDef['models'];
  for (const m of PROCEDURAL_MODELS) {
    const c = mr.child(m);
    const e = c.obj(mo[m]);
    models[m] = { runSpeed: c.num(e, 'runSpeed', { min: 0.1, max: 50 }), events: readEvents(c.child('events'), e['events']) };
  }
  return { blendSeconds: r.num(o, 'blendSeconds', { min: 0, max: 2 }), models };
}
