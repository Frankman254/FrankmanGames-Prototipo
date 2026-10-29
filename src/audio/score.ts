// Parte pura de la música y el ambiente: mezcla de estados de ánimo (calma,
// tensión, pesca) con fundido, ganancia de cada capa, y un compositor
// generativo con semilla que escribe compás a compás sobre una escala modal.
import { Rng } from '../sim/rng';
import { MOODS, MUSIC_LAYERS, type AmbienceDef, type Mood, type MusicDef, type MusicLayer } from './data';

export type MoodWeights = Record<Mood, number>;

/** Estado de ánimo objetivo: la tensión manda; si no, pescar calma; si no, calma. */
export function moodTargets(threat: number, fishing: boolean): MoodWeights {
  const t = Math.max(0, Math.min(1, threat));
  if (fishing && t < 0.5) return { calm: 0, tension: t * 0.5, fishing: 1 - t * 0.5 };
  return { calm: 1 - t, tension: t, fishing: 0 };
}

/** Fundido lineal hacia el objetivo en `fadeSeconds`; los pesos suman 1. */
export class MoodMixer {
  weights: MoodWeights = { calm: 1, tension: 0, fishing: 0 };

  constructor(private readonly fadeSeconds: number) {}

  update(target: MoodWeights, dt: number): MoodWeights {
    const step = this.fadeSeconds > 0 ? dt / this.fadeSeconds : 1;
    for (const m of MOODS) {
      const d = target[m] - this.weights[m];
      this.weights[m] += Math.abs(d) <= step ? d : Math.sign(d) * step;
    }
    const sum = MOODS.reduce((a, m) => a + this.weights[m], 0) || 1;
    for (const m of MOODS) this.weights[m] /= sum;
    return this.weights;
  }
}

/** Ganancia de cada capa y tempo para unos pesos; de noche el pad se oscurece y la campana sube. */
export function layerMix(def: MusicDef, w: MoodWeights, night: number): { gains: Record<MusicLayer, number>; bpm: number } {
  const gains = {} as Record<MusicLayer, number>;
  for (const l of MUSIC_LAYERS) gains[l] = MOODS.reduce((a, m) => a + w[m] * def.moods[m].layers[l], 0);
  gains.pad *= 1 - def.night.padDarken * night * 0.5;
  gains.bell = Math.min(1, gains.bell + def.night.bellExtra * night);
  const bpm = MOODS.reduce((a, m) => a + w[m] * def.moods[m].bpm, 0);
  return { gains, bpm };
}

export interface Note {
  layer: MusicLayer;
  midi: number;
  /** Tiempo dentro del compás, en pulsos. */
  beat: number;
  /** Duración en pulsos. */
  beats: number;
  velocity: number;
}

export const midiToHz = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

/** Nota MIDI del grado `deg` de la escala (admite grados fuera de la octava). */
export function degreeMidi(def: MusicDef, deg: number, octave = 0): number {
  const n = def.scale.length;
  const o = Math.floor(deg / n);
  const i = ((deg % n) + n) % n;
  return def.rootMidi + 12 * (octave + o) + def.scale[i]!;
}

/** Siguiente acorde (grado) desde `prev` siguiendo el grafo, con el generador dado. */
export function nextChord(def: MusicDef, rng: Rng, prev: number): number {
  const options = def.chordGraph[prev] ?? def.chordGraph[0]!;
  return options[Math.floor(rng.next() * options.length)]!;
}

/**
 * Compás `bar` con el acorde `chord`. Determinista para (semilla, compás): la
 * misma partida suena igual al repetirse, pero nunca en bucle corto. Se
 * escriben todas las capas; quien toca multiplica por su ganancia.
 */
export function composeBar(def: MusicDef, bar: number, chord: number): Note[] {
  const rng = new Rng(def.seed * 7919 + bar * 104729);
  const B = def.beatsPerBar;
  const tones = [chord, chord + 2, chord + 4];
  const notes: Note[] = [];
  // Pad: tríada sostenida todo el compás (una 7.ª a veces, para el misterio).
  for (const d of tones) notes.push({ layer: 'pad', midi: degreeMidi(def, d, 0), beat: 0, beats: B, velocity: 0.5 });
  if (rng.chance(0.35)) notes.push({ layer: 'pad', midi: degreeMidi(def, chord + 6, 0), beat: 0, beats: B, velocity: 0.3 });
  // Campana: 1–3 notas sueltas en corcheas al azar, altas y escasas.
  const bells = 1 + rng.int(0, 2);
  for (let i = 0; i < bells; i++) {
    const d = rng.chance(0.7) ? tones[rng.int(0, 2)]! : chord + rng.int(0, 6);
    notes.push({ layer: 'bell', midi: degreeMidi(def, d, 2), beat: rng.int(0, B * 2 - 1) / 2, beats: 2, velocity: 0.35 + rng.next() * 0.3 });
  }
  // Pulso: ostinato de corcheas en la fundamental grave, acentos en los pulsos.
  for (let i = 0; i < B * 2; i++) {
    const accent = i % 2 === 0;
    const d = i === B * 2 - 1 && rng.chance(0.5) ? chord + 4 : chord;
    notes.push({ layer: 'pulse', midi: degreeMidi(def, d, -1), beat: i / 2, beats: 0.4, velocity: accent ? 0.7 : 0.45 });
  }
  // Tambor: bombo en 1 y 3, golpe suave a contratiempo al final.
  for (const b of [0, B / 2]) notes.push({ layer: 'drum', midi: 36, beat: b, beats: 0.5, velocity: 0.8 });
  if (rng.chance(0.6)) notes.push({ layer: 'drum', midi: 38, beat: B - 0.5, beats: 0.25, velocity: 0.45 });
  // Arpa: arpegio ascendente por las notas del acorde (la pesca).
  for (let i = 0; i < B * 2; i++) {
    const d = tones[i % 3]! + 7 * Math.floor(i / 3);
    notes.push({ layer: 'harp', midi: degreeMidi(def, d, 1), beat: i / 2, beats: 1.5, velocity: 0.3 + (i % 3 === 0 ? 0.15 : 0) });
  }
  return notes;
}

export interface AmbienceMix {
  birds: number;
  crickets: number;
  wind: number;
  water: number;
  /** 0 = noche, 1 = día. */
  day: number;
}

/** Capas de ambiente según la altura del sol (−1–1) y la distancia a la orilla más cercana. */
export function ambienceMix(def: AmbienceDef, sunHeight: number, waterDistance: number): AmbienceMix {
  const k = Math.max(0, Math.min(1, (sunHeight - def.dayFrom) / (def.dayTo - def.dayFrom)));
  const day = k * k * (3 - 2 * k);
  const lerp = (n: number, d: number): number => n + (d - n) * day;
  const near = Math.max(0, 1 - Math.max(0, waterDistance) / def.water.waterRange);
  return {
    birds: lerp(def.birds.night, def.birds.day),
    crickets: lerp(def.crickets.night, def.crickets.day),
    wind: lerp(def.wind.night, def.wind.day),
    water: def.water.gain * near * near,
    day,
  };
}

/** Variación aleatoria de una reproducción (tono y volumen alrededor de 1). */
export function variation(rng: Rng, vary: { pitch: number; gain: number }): { pitch: number; gain: number } {
  return { pitch: 1 + (rng.next() * 2 - 1) * vary.pitch, gain: 1 + (rng.next() * 2 - 1) * vary.gain };
}
