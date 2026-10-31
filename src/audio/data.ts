// Datos de audio (data/audio/*.json) con validación. Todo número es PROPUESTA.
import ambienceJson from '../../data/audio/ambience.json';
import mixJson from '../../data/audio/mix.json';
import musicJson from '../../data/audio/music.json';
import sfxJson from '../../data/audio/sfx.json';
import { Reader } from '../data/validate';

export const BUSES = ['master', 'music', 'sfx', 'ambience', 'ui'] as const;
export type Bus = (typeof BUSES)[number];
export const WAVES = ['sine', 'square', 'triangle', 'sawtooth', 'noise'] as const;
export type Wave = (typeof WAVES)[number];
export const FILTERS = ['lowpass', 'highpass', 'bandpass'] as const;
export type FilterType = (typeof FILTERS)[number];
export const MUSIC_LAYERS = ['pad', 'bell', 'pulse', 'drum', 'harp'] as const;
export type MusicLayer = (typeof MUSIC_LAYERS)[number];
export const MOODS = ['calm', 'tension', 'fishing'] as const;
export type Mood = (typeof MOODS)[number];

export interface LayerDef {
  wave: Wave;
  freq: number;
  freqEnd: number;
  attack: number;
  decay: number;
  gain: number;
  delay: number;
  filter: { type: FilterType; freq: number; freqEnd: number; q: number } | null;
}

export interface SoundDef {
  bus: 'sfx' | 'ui';
  vary: { pitch: number; gain: number };
  layers: LayerDef[];
}

/** Muestra WAV de un sonido (archivo de src/audio/sfx/generated_original/). */
export interface SampleDef {
  file: string;
  gain: number;
}

export interface SfxDef {
  weaponKinds: Record<string, string>;
  /** Por id de sonido; la receta del mismo id es el respaldo. */
  samples: Record<string, SampleDef>;
  sounds: Record<string, SoundDef>;
}

export interface MixDef {
  buses: Record<Bus, number>;
  limiter: { threshold: number; knee: number; ratio: number; attack: number; release: number };
  spatial: { refDistance: number; maxDistance: number; panWidth: number };
  maxVoices: number;
}

export interface MusicDef {
  seed: number;
  rootMidi: number;
  scale: number[];
  beatsPerBar: number;
  chordGraph: Record<number, number[]>;
  fadeSeconds: number;
  threatRange: number;
  threatHoldSeconds: number;
  moods: Record<Mood, { bpm: number; layers: Record<MusicLayer, number> }>;
  night: { padDarken: number; bellExtra: number };
}

export interface AmbienceDef {
  dayFrom: number;
  dayTo: number;
  birds: { day: number; night: number; chirpsPerSecond: number };
  crickets: { day: number; night: number; rate: number };
  wind: { day: number; night: number };
  water: { gain: number; waterRange: number };
}

export interface AudioData {
  sfx: SfxDef;
  mix: MixDef;
  music: MusicDef;
  ambience: AmbienceDef;
}

type Obj = Record<string, unknown>;

function parseLayer(r: Reader, v: unknown): LayerDef {
  const o = r.obj(v);
  const wave = r.str(o, 'wave', WAVES) as Wave;
  const freq = r.num(o, 'freq', { min: 1, max: 20000, def: 440 });
  let filter: LayerDef['filter'] = null;
  if (o['filter'] !== undefined) {
    const fr = r.child('filter');
    const f = fr.obj(o['filter']);
    const ff = fr.num(f, 'freq', { min: 10, max: 20000 });
    filter = { type: fr.str(f, 'type', FILTERS) as FilterType, freq: ff, freqEnd: fr.num(f, 'freqEnd', { min: 10, max: 20000, def: ff }), q: fr.num(f, 'q', { min: 0.01, max: 50, def: 1 }) };
  }
  return {
    wave,
    freq,
    freqEnd: r.num(o, 'freqEnd', { min: 1, max: 20000, def: freq }),
    attack: r.num(o, 'attack', { min: 0, max: 5 }),
    decay: r.num(o, 'decay', { min: 0.005, max: 10 }),
    gain: r.num(o, 'gain', { min: 0, max: 2 }),
    delay: r.num(o, 'delay', { min: 0, max: 5, def: 0 }),
    filter,
  };
}

export function parseSfx(raw: unknown): SfxDef {
  const r = new Reader('audio/sfx.json');
  const o = r.obj(raw);
  const weaponKinds: Record<string, string> = {};
  const wr = r.child('weaponKinds');
  for (const [k, v] of Object.entries(wr.obj(o['weaponKinds']))) {
    if (typeof v !== 'string') wr.fail(k, 'se esperaba un tipo de golpe');
    weaponKinds[k] = v as string;
  }
  const sr = r.child('sounds');
  const sounds: Record<string, SoundDef> = {};
  for (const [id, v] of Object.entries(sr.obj(o['sounds']))) {
    const c = sr.child(id);
    const s = c.obj(v);
    const vr = c.child('vary');
    const vo = vr.obj(s['vary']);
    const layers = c.arr(s, 'layers').map((l, i) => parseLayer(c.child(`layers[${i}]`), l));
    if (layers.length === 0) c.fail('layers', 'un sonido necesita al menos una capa');
    sounds[id] = {
      bus: c.str(s, 'bus', ['sfx', 'ui']) as 'sfx' | 'ui',
      vary: { pitch: vr.num(vo, 'pitch', { min: 0, max: 1 }), gain: vr.num(vo, 'gain', { min: 0, max: 1 }) },
      layers,
    };
  }
  const samples: Record<string, SampleDef> = {};
  if (o['samples'] !== undefined) {
    const pr = r.child('samples');
    for (const [id, v] of Object.entries(pr.obj(o['samples']))) {
      const c = pr.child(id);
      const s = c.obj(v);
      if (!sounds[id]) pr.fail(id, 'no hay receta con ese id (hace falta como respaldo)');
      const file = c.str(s, 'file');
      if (!/^[\w-]+\.wav$/.test(file)) c.fail('file', 'se esperaba un nombre de archivo .wav');
      samples[id] = { file, gain: c.num(s, 'gain', { min: 0, max: 2, def: 1 }) };
    }
  }
  return { weaponKinds, samples, sounds };
}

function readRecord<K extends string>(r: Reader, o: Obj, key: string, keys: readonly K[], opts: { min: number; max: number }): Record<K, number> {
  const c = r.child(key);
  const v = c.obj(o[key]);
  const out = {} as Record<K, number>;
  for (const k of keys) out[k] = c.num(v, k, opts);
  return out;
}

export function parseMix(raw: unknown): MixDef {
  const r = new Reader('audio/mix.json');
  const o = r.obj(raw);
  const lr = r.child('limiter');
  const l = lr.obj(o['limiter']);
  const sr = r.child('spatial');
  const s = sr.obj(o['spatial']);
  const refDistance = sr.num(s, 'refDistance', { min: 0.1, max: 100 });
  return {
    buses: readRecord(r, o, 'buses', BUSES, { min: 0, max: 2 }),
    limiter: {
      threshold: lr.num(l, 'threshold', { min: -60, max: 0 }),
      knee: lr.num(l, 'knee', { min: 0, max: 40 }),
      ratio: lr.num(l, 'ratio', { min: 1, max: 20 }),
      attack: lr.num(l, 'attack', { min: 0, max: 1 }),
      release: lr.num(l, 'release', { min: 0, max: 2 }),
    },
    spatial: { refDistance, maxDistance: sr.num(s, 'maxDistance', { min: refDistance, max: 500 }), panWidth: sr.num(s, 'panWidth', { min: 0, max: 1 }) },
    maxVoices: r.num(o, 'maxVoices', { int: true, min: 4, max: 256 }),
  };
}

export function parseMusic(raw: unknown): MusicDef {
  const r = new Reader('audio/music.json');
  const o = r.obj(raw);
  const scale = r.arr(o, 'scale').map((v, i) => {
    if (typeof v !== 'number' || v < 0 || v > 11) r.fail(`scale[${i}]`, 'semitono 0–11');
    return v as number;
  });
  if (scale.length < 5) r.fail('scale', 'se esperan al menos 5 notas');
  const gr = r.child('chordGraph');
  const chordGraph: Record<number, number[]> = {};
  for (const [k, v] of Object.entries(gr.obj(o['chordGraph']))) {
    const deg = Number(k);
    if (!Number.isInteger(deg) || deg < 0 || deg >= scale.length) gr.fail(k, 'grado fuera de la escala');
    if (!Array.isArray(v) || v.length === 0 || v.some((x) => typeof x !== 'number' || !(String(x) in (o['chordGraph'] as Obj)))) gr.fail(k, 'se esperan grados que existan en chordGraph');
    chordGraph[deg] = v as number[];
  }
  if (!chordGraph[0]) gr.fail('0', 'falta la tónica');
  const mr = r.child('moods');
  const mo = mr.obj(o['moods']);
  const moods = {} as MusicDef['moods'];
  for (const m of MOODS) {
    const c = mr.child(m);
    const v = c.obj(mo[m]);
    moods[m] = { bpm: c.num(v, 'bpm', { min: 20, max: 240 }), layers: readRecord(c, v, 'layers', MUSIC_LAYERS, { min: 0, max: 1 }) };
  }
  const nr = r.child('night');
  const n = nr.obj(o['night']);
  return {
    seed: r.num(o, 'seed', { int: true, min: 0 }),
    rootMidi: r.num(o, 'rootMidi', { int: true, min: 24, max: 96 }),
    scale,
    beatsPerBar: r.num(o, 'beatsPerBar', { int: true, min: 2, max: 8 }),
    chordGraph,
    fadeSeconds: r.num(o, 'fadeSeconds', { min: 0, max: 30 }),
    threatRange: r.num(o, 'threatRange', { min: 1, max: 200 }),
    threatHoldSeconds: r.num(o, 'threatHoldSeconds', { min: 0, max: 60 }),
    moods,
    night: { padDarken: nr.num(n, 'padDarken', { min: 0, max: 1 }), bellExtra: nr.num(n, 'bellExtra', { min: 0, max: 1 }) },
  };
}

export function parseAmbience(raw: unknown): AmbienceDef {
  const r = new Reader('audio/ambience.json');
  const o = r.obj(raw);
  const g = (key: string, fields: string[]): Record<string, number> => {
    const c = r.child(key);
    const v = c.obj(o[key]);
    return Object.fromEntries(fields.map((f) => [f, c.num(v, f, { min: 0, max: 100 })]));
  };
  const dayFrom = r.num(o, 'dayFrom', { min: -1, max: 1 });
  return {
    dayFrom,
    dayTo: r.num(o, 'dayTo', { min: dayFrom + 0.01, max: 1 }),
    birds: g('birds', ['day', 'night', 'chirpsPerSecond']) as AmbienceDef['birds'],
    crickets: g('crickets', ['day', 'night', 'rate']) as AmbienceDef['crickets'],
    wind: g('wind', ['day', 'night']) as AmbienceDef['wind'],
    water: g('water', ['gain', 'waterRange']) as AmbienceDef['water'],
  };
}

export function loadAudioData(): AudioData {
  return { sfx: parseSfx(sfxJson), mix: parseMix(mixJson), music: parseMusic(musicJson), ambience: parseAmbience(ambienceJson) };
}
