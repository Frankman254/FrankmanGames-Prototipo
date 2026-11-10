// Datos del mundo visual (Slice 02): assets, terreno, vegetación, luz y
// personajes. Separado de `schema.ts` para no mezclarse con los datos de juego.
// Todo número aquí es PROPUESTA.
import type { DetailDef, DetailRange } from '../world/detail';
import type { NavPaint } from '../sim/navGrid';
import type { Vec2 } from '../sim/vec2';
import type { AnimEventDef } from '../world/anim';
import type { LightingDef, Rgb } from '../world/dayNight';
import { ANIM_EVENT_TYPES, ANIM_STATES, PROCEDURAL_MODELS, type AnimState, type ProceduralModel } from '../world/rigs';
import type { FbmDef } from '../world/noise';
import { PROP_KINDS, PROP_STYLES, SCATTER_SHAPES, type BiomeArea, type PropKind, type PropStyle, type ScatterKindDef, type ScatterShape, type VegetationDef } from '../world/scatter';
import type { WorldBounds } from '../world/shape';
import type { GroundLayerDef, TerrainDef } from '../world/terrain';
import type { StructureRules } from '../world/structures';
import { BODY_TYPES, DEFAULT_LOOK, HAIR_STYLES, HEADGEAR, OFFHAND_LOOKS, OUTFITS, WEAPON_LOOKS, type CharacterLook, type GearLook } from '../world/look';
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
  /** Cómo se asientan las estructuras en el terreno. */
  structures: StructureRules & { /** Metros que una pieza puede quedar enterrada o flotando. */ tolerance: number };
  playerStart: Vec2;
  /** Se suma a las posiciones del encuentro de la arena (data/encounter.json). */
  encounterOffset: Vec2;
}

function readWorld(r: Reader, v: unknown): WorldBounds {
  const o = r.obj(v);
  const pageMeters = r.num(o, 'pageMeters', { int: true, min: 16, max: 1024 });
  const edge = (key: string): number => {
    const n = r.num(o, key);
    if (n % pageMeters !== 0) r.fail(key, 'debe caer en un múltiplo de pageMeters');
    return n;
  };
  return {
    x0: edge('x0'),
    z0: edge('z0'),
    x1: edge('x1'),
    z1: edge('z1'),
    pageMeters,
    playable: r.arr(o, 'playable').map((p) => String(p)),
    ...(o['clearings'] === undefined
      ? {}
      : {
          clearings: r.arr(o, 'clearings').map((v, i) => {
            const c = r.child(`clearings.${i}`);
            const co = c.obj(v);
            return { id: c.str(co, 'id'), x: c.num(co, 'x'), z: c.num(co, 'z'), radius: c.num(co, 'radius', { min: 4, max: 512 }) };
          }),
        }),
    cellSize: r.num(o, 'cellSize', { min: 0.1, max: 4 }),
    navRadius: r.num(o, 'navRadius', { min: 0, max: 4 }),
  };
}

function readStructures(r: Reader, v: unknown): OverworldDef['structures'] {
  const o = r.obj(v);
  const fr = r.child('footprints');
  const fo = fr.obj(o['footprints']);
  const side = (key: string): number => fr.num(fo, key, { min: 0.1, max: 64 });
  const ar = r.child('afloat');
  const afloat: Record<string, { draft: number }> = {};
  for (const [model, raw] of Object.entries(ar.obj(o['afloat']))) {
    const c = ar.child(model);
    afloat[model] = { draft: c.num(c.obj(raw), 'draft', { min: -5, max: 5 }) };
  }
  return {
    padMargin: r.num(o, 'padMargin', { min: 0, max: 16 }),
    padFalloff: r.num(o, 'padFalloff', { min: 0.5, max: 64 }),
    padMinSize: r.num(o, 'padMinSize', { min: 0 }),
    tolerance: r.num(o, 'tolerance', { min: 0.01, max: 5 }),
    footprints: { stone: side('stone'), station: side('station'), resurrector: side('resurrector'), crypt: side('crypt') },
    afloat,
  };
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
    ...(o['world'] === undefined ? {} : { world: readWorld(r.child('world'), o['world']) }),
    structures: readStructures(r.child('structures'), o['structures']),
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
      pieces: c.arr(k, 'pieces').map((pv, n) => {
        const pc = c.child(`pieces[${n}]`);
        const po = pc.obj(pv);
        return {
          piece: pc.str(po, 'piece'),
          color: readColor(pc, po, 'color'),
          shadow: po['shadow'] !== false,
          thin: po['thin'] === true,
          ...(po['wind'] === undefined ? {} : { wind: pc.num(po, 'wind', { min: 0, max: 5 }) }),
        };
      }),
    };
  }
  const biomes = r.arr(o, 'biomes').map((v, i) => {
    const c = r.child(`biomes[${i}]`);
    const b = c.obj(v);
    const weights: Record<string, number> = {};
    const wr = c.child('weights');
    for (const [id, w] of Object.entries(wr.obj(b['weights']))) {
      if (!kinds[id]) wr.fail(id, 'no existe ese tipo');
      if (typeof w !== 'number' || w < 0) wr.fail(id, 'peso no válido');
      weights[id] = w as number;
    }
    return {
      id: c.str(b, 'id'),
      tint: readColor(c, b, 'tint'),
      tone: readColor(c, b, 'tone'),
      weights,
      areas: c.arr(b, 'areas') as BiomeArea[],
    };
  });
  const windR = r.child('wind');
  const windO = windR.obj(o['wind']);
  return {
    seed: r.num(o, 'seed', { int: true, min: 0 }),
    chunkMeters: r.num(o, 'chunkMeters', { min: 4, max: 512 }),
    clearRadiusAroundStart: r.num(o, 'clearRadiusAroundStart', { min: 0 }),
    forestNoise: readFbm(r.child('forestNoise'), o['forestNoise']),
    wind: { speed: windR.num(windO, 'speed', { min: 0 }), strength: windR.num(windO, 'strength', { min: 0, max: 5 }) },
    kinds,
    biomes,
    props: r.arr(o, 'props').map((v, i) => {
      const c = r.child(`props[${i}]`);
      const p = c.obj(v);
      const rotDeg = c.num(p, 'rotDeg', { int: true });
      if (rotDeg % 90 !== 0) c.fail('rotDeg', `sólo múltiplos de 90 (llegó ${rotDeg})`);
      return {
        kind: c.str(p, 'kind', PROP_KINDS) as PropKind,
        ...(p['model'] === undefined ? {} : { model: c.str(p, 'model') }),
        ...(p['node'] === undefined ? {} : { node: c.str(p, 'node') }),
        style: (p['style'] === undefined ? 'default' : c.str(p, 'style', PROP_STYLES)) as PropStyle,
        x: c.num(p, 'x'),
        y: c.num(p, 'y'),
        w: c.num(p, 'w', { min: 0.1 }),
        d: c.num(p, 'd', { min: 0.1 }),
        rotDeg: ((rotDeg % 360) + 360) % 360,
      };
    }),
    placements: o['placements'] === undefined ? [] : r.arr(o, 'placements').map((v, i) => {
      const c = r.child(`placements[${i}]`);
      const p = c.obj(v);
      return { kind: c.str(p, 'kind', Object.keys(kinds)), x: c.num(p, 'x'), y: c.num(p, 'y'), scale: c.num(p, 'scale', { min: 0.05, max: 10 }), rotDeg: c.num(p, 'rotDeg') };
    }),
    exclusions: o['exclusions'] === undefined ? [] : r.arr(o, 'exclusions').map((v, i) => {
      const c = r.child(`exclusions[${i}]`);
      const p = c.obj(v);
      return { kind: c.str(p, 'kind', Object.keys(kinds)), x: c.num(p, 'x'), y: c.num(p, 'y') };
    }),
  };
}

/** Celdas pintadas a mano en el editor (data/navpaint.json). */
export function parseNavPaint(raw: unknown): NavPaint {
  const r = new Reader('navpaint.json');
  const o = r.obj(raw);
  const spans = (key: 'blocked' | 'cleared'): Array<[number, number, number]> =>
    r.arr(o, key).map((v, i) => {
      const ok = Array.isArray(v) && v.length === 3 && v.every((n) => Number.isInteger(n) && n >= 0) && v[2] >= v[1];
      if (!ok) r.fail(`${key}[${i}]`, 'se esperaba [fila, colInicio, colFin] (enteros, fin ≥ inicio)');
      const t = v as number[];
      return [t[0]!, t[1]!, t[2]!];
    });
  return { cellSize: r.num(o, 'cellSize', { min: 0.1, max: 4 }), blocked: spans('blocked'), cleared: spans('cleared') };
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
      haze: readColor(c, k, 'haze'),
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
  | {
      kind: 'procedural';
      model: ProceduralModel;
      scale: number;
      palettes: Record<string, Palette>;
      ghost: boolean;
      /** Aspecto del humanoide por clase o PNJ (mismas claves que `palettes`; `default` de reserva). */
      looks: Record<string, CharacterLook>;
      /** Objeto equipado → lo que pinta en la mano (arma o escudo). */
      gear: Record<string, GearLook>;
    }
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
      /** Igual que en el procedural: los materiales del archivo se llaman como los canales. */
      palettes: Record<string, Palette>;
      looks: Record<string, CharacterLook>;
      gear: Record<string, GearLook>;
      /** Altura del modelo a escala 1 (barras de vida y zona de clic). */
      height: number;
      /** Translúcido y luminoso (aliados espectrales). */
      ghost: boolean;
      /** Las piezas opcionales se encienden según `looks` (personaje humanoide). */
      parts: boolean;
      /** Clase → id de otra entrada que la sustituye entera (un modelo propio para esa clase). */
      classModels: Record<string, string>;
      /** Dónde se pone lo de la cabeza y la espalda (vacío: no se pinta). */
      wear: Partial<Record<WearSlot, WearAnchor>>;
    };

export const WEAR_SLOTS = ['head', 'back'] as const;
export type WearSlot = (typeof WEAR_SLOTS)[number];
export interface WearPlace {
  /** Origen del objeto en el espacio del modelo glTF (Y arriba, +Z delante), en reposo. */
  at: [number, number, number];
  scale: number;
}
/** Hueso que lo lleva y su sitio; `kinds` lo cambia para un tipo de objeto (p. ej. `hat`). */
export interface WearAnchor extends WearPlace {
  joint: string;
  kinds: Record<string, WearPlace>;
}

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

/** Aspectos por id: cada campo es opcional y hereda del `default` del mismo bloque (o del de serie). */
function readLooks(r: Reader, v: unknown): Record<string, CharacterLook> {
  const o = r.obj(v);
  const out: Record<string, CharacterLook> = {};
  const read = (id: string, base: CharacterLook): CharacterLook => {
    const c = r.child(id);
    const e = c.obj(o[id]);
    const known = ['bodyType', 'hairStyle', 'outfit', 'headgear', 'cape', 'beard', 'weapon', 'offhand'];
    for (const k of Object.keys(e)) if (!k.startsWith('_') && !known.includes(k)) c.fail(k, `campo desconocido (válidos: ${known.join(', ')})`);
    const pick = <T extends string>(k: keyof CharacterLook, allowed: readonly T[]): T => (e[k] === undefined ? (base[k] as T) : (c.str(e, k, allowed) as T));
    const flag = (k: 'cape' | 'beard'): boolean => {
      if (e[k] === undefined) return base[k];
      if (typeof e[k] !== 'boolean') c.fail(k, 'se esperaba true o false');
      return e[k] as boolean;
    };
    return {
      bodyType: pick('bodyType', BODY_TYPES),
      hairStyle: pick('hairStyle', HAIR_STYLES),
      outfit: pick('outfit', OUTFITS),
      headgear: pick('headgear', HEADGEAR),
      cape: flag('cape'),
      beard: flag('beard'),
      weapon: pick('weapon', WEAPON_LOOKS),
      offhand: pick('offhand', OFFHAND_LOOKS),
    };
  };
  const base = o['default'] === undefined ? DEFAULT_LOOK : read('default', DEFAULT_LOOK);
  out['default'] = base;
  for (const id of Object.keys(o)) if (id !== 'default') out[id] = read(id, base);
  return out;
}

const GEAR_LOOKS = [...WEAPON_LOOKS.filter((w) => w !== 'none'), ...OFFHAND_LOOKS.filter((w) => w !== 'none')] as const;

function readGear(r: Reader, v: unknown): Record<string, GearLook> {
  const o = r.obj(v);
  const out: Record<string, GearLook> = {};
  for (const id of Object.keys(o)) if (!id.startsWith('_')) out[id] = r.str(o, id, GEAR_LOOKS) as GearLook;
  return out;
}

export function parseAssets(raw: unknown): AssetManifest {
  const r = new Reader('assets.json');
  const o = r.obj(raw);
  const templates = (o['templates'] ?? {}) as Record<string, Record<string, unknown>>;
  const list = r.child('assets');
  const assets = list.obj(o['assets']);
  const out: AssetManifest = {};
  for (const [id, v] of Object.entries(assets)) {
    const c = list.child(id);
    const raw0 = c.obj(v);
    // `template`: archivo, clips y demás compartidos (`templates` en data/assets.json).
    const tplId = raw0['template'];
    if (tplId !== undefined && (typeof tplId !== 'string' || !templates[tplId])) c.fail('template', `plantilla desconocida: ${String(tplId)}`);
    const e = typeof tplId === 'string' ? { ...templates[tplId], ...raw0 } : raw0;
    const kind = c.str(e, 'kind', ['procedural', 'gltf']) as 'procedural' | 'gltf';
    const scale = c.num(e, 'scale', { min: 0.05, max: 20, def: 1 });
    const pr = c.child('palettes');
    const palettes: Record<string, Palette> = {};
    if (kind === 'procedural' || e['palettes'] !== undefined) {
      for (const [cls, pv] of Object.entries(pr.obj(e['palettes']))) {
        const pc = pr.child(cls);
        const po = pc.obj(pv);
        palettes[cls] = { skin: readColor(pc, po, 'skin'), cloth: readColor(pc, po, 'cloth'), trim: readColor(pc, po, 'trim'), hair: readColor(pc, po, 'hair'), gear: readColor(pc, po, 'gear') };
      }
      if (!palettes['default']) pr.fail('default', 'falta la paleta «default»');
    }
    if (kind === 'procedural') {
      out[id] = {
        kind,
        model: c.str(e, 'model', PROCEDURAL_MODELS) as ProceduralModel,
        scale,
        palettes,
        ghost: e['ghost'] === true,
        looks: e['looks'] === undefined ? {} : readLooks(c.child('looks'), e['looks']),
        gear: e['gear'] === undefined ? {} : readGear(c.child('gear'), e['gear']),
      };
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
        palettes,
        looks: e['looks'] === undefined ? {} : readLooks(c.child('looks'), e['looks']),
        gear: e['gear'] === undefined ? {} : readGear(c.child('gear'), e['gear']),
        height: c.num(e, 'height', { min: 0.1, max: 30, def: 1.75 }),
        ghost: e['ghost'] === true,
        parts: e['parts'] === true,
        classModels: e['classModels'] === undefined ? {} : readClassModels(c.child('classModels'), e['classModels']),
        wear: e['wear'] === undefined ? {} : readWear(c.child('wear'), e['wear']),
      };
    }
  }
  for (const [id, e] of Object.entries(out)) {
    if (e.kind !== 'gltf') continue;
    for (const [cls, target] of Object.entries(e.classModels)) {
      const t = out[target];
      if (!t || t.kind !== 'gltf') list.child(id).child('classModels').fail(cls, `«${target}» no es una entrada glTF de assets`);
    }
  }
  return out;
}

function readWearPlace(r: Reader, o: Record<string, unknown>, base?: WearPlace): WearPlace {
  const at = o['at'];
  if (at === undefined && base) return { at: base.at, scale: r.num(o, 'scale', { min: 0.05, max: 5, def: base.scale }) };
  if (!Array.isArray(at) || at.length !== 3 || at.some((n) => typeof n !== 'number' || !Number.isFinite(n) || Math.abs(n) > 10)) r.fail('at', 'se esperaban tres números [x, y, z]');
  return { at: [at[0], at[1], at[2]] as [number, number, number], scale: r.num(o, 'scale', { min: 0.05, max: 5, def: base?.scale ?? 1 }) };
}

function readWear(r: Reader, v: unknown): Partial<Record<WearSlot, WearAnchor>> {
  const o = r.obj(v);
  const out: Partial<Record<WearSlot, WearAnchor>> = {};
  for (const slot of Object.keys(o)) {
    if (slot.startsWith('_')) continue;
    if (!(WEAR_SLOTS as readonly string[]).includes(slot)) r.fail(slot, `hueco desconocido (válidos: ${WEAR_SLOTS.join(', ')})`);
    const c = r.child(slot);
    const e = c.obj(o[slot]);
    const place = readWearPlace(c, e);
    const kinds: Record<string, WearPlace> = {};
    if (e['kinds'] !== undefined) {
      const kr = c.child('kinds');
      const ko = kr.obj(e['kinds']);
      for (const k of Object.keys(ko)) if (!k.startsWith('_')) kinds[k] = readWearPlace(kr.child(k), kr.child(k).obj(ko[k]), place);
    }
    out[slot as WearSlot] = { joint: c.str(e, 'joint'), ...place, kinds };
  }
  return out;
}

function readClassModels(r: Reader, v: unknown): Record<string, string> {
  const o = r.obj(v);
  const out: Record<string, string> = {};
  for (const id of Object.keys(o)) if (!id.startsWith('_')) out[id] = r.str(o, id);
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

function readDetailRange(r: Reader, o: Record<string, unknown>): DetailRange {
  const on = r.num(o, 'on', { min: 5, max: 1000 });
  const off = r.num(o, 'off', { min: 5, max: 1000 });
  if (off < on) r.fail('off', 'debe ser mayor o igual que on');
  return { on, off };
}

function readStream(r: Reader, v: unknown): DetailDef['stream'] {
  const o = r.obj(v);
  const load = r.num(o, 'load', { min: 32 });
  const drop = r.num(o, 'drop', { min: 32 });
  if (drop <= load) r.fail('drop', 'debe ser mayor que load');
  return { load, drop, inFlight: r.num(o, 'inFlight', { int: true, min: 1, max: 16 }) };
}

export function parseDetail(raw: unknown): DetailDef {
  const r = new Reader('detail.json');
  const o = r.obj(raw);
  const er = r.child('enemies');
  const eo = er.obj(o['enemies']);
  const mr = r.child('models');
  const models: Record<string, DetailRange> = {};
  for (const [id, v] of Object.entries(mr.obj(o['models']))) {
    const c = mr.child(id);
    models[id] = readDetailRange(c, c.obj(v));
  }
  if (!models['default']) mr.fail('default', 'falta el rango «default»');
  const tr = r.child('terrain');
  const to = tr.obj(o['terrain']);
  const levels = tr.arr(to, 'levels').map((v, i) => {
    const c = tr.child(`levels[${i}]`);
    const l = c.obj(v);
    return { step: c.num(l, 'step', { min: 0.25, max: 64 }), until: c.num(l, 'until', { min: 1 }) };
  });
  if (levels.length === 0) tr.fail('levels', 'hace falta al menos un nivel');
  levels.forEach((l, i) => {
    if (i > 0 && (l.until <= levels[i - 1]!.until || l.step < levels[i - 1]!.step)) tr.fail(`levels[${i}]`, 'van de más a menos detalle');
  });
  const chunkMeters = tr.num(to, 'chunkMeters', { min: 8, max: 512 });
  for (const l of levels) if (Math.abs(chunkMeters / l.step - Math.round(chunkMeters / l.step)) > 1e-6) tr.fail('levels', 'cada step debe dividir chunkMeters');
  const vr = r.child('vegetation');
  const vegetation: Record<string, { full: number; off: number }> = {};
  for (const [id, v] of Object.entries(vr.obj(o['vegetation']))) {
    const c = vr.child(id);
    const k = c.obj(v);
    const full = c.num(k, 'full', { min: 1 });
    const off = c.num(k, 'off', { min: 1 });
    if (off <= full) c.fail('off', 'debe ser mayor que full');
    vegetation[id] = { full, off };
  }
  for (const shape of SCATTER_SHAPES) if (!vegetation[shape]) vr.fail(shape, 'falta el anillo de esta forma');
  return {
    enemies: { ...readDetailRange(er, eo), createsPerFrame: er.num(eo, 'createsPerFrame', { int: true, min: 1, max: 50 }) },
    models,
    terrain: { chunkMeters, margin: tr.num(to, 'margin', { min: 0 }), levels },
    stream: readStream(r.child('stream'), o['stream']),
    vegetation,
  };
}
