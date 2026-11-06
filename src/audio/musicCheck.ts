// Revisión de la música generada: cada nota en su escala, duraciones y voces con tope.
// Sirve de criterio ejecutable (scripts/checkMusic.ts y tests/audio.test.ts), también para
// revisar lo que proponga un agente: no vale decir «validado», vale que esto pase.
import { Rng } from '../sim/rng';
import type { MusicDef } from './data';
import { composeBar, nextChord } from './score';

export interface MusicLimits {
  /** Notas por compás, todas las capas juntas. */
  maxNotesPerBar: number;
  /** Notas sonando a la vez en cualquier instante. */
  maxSimultaneous: number;
  /** Ninguna nota dura más de esto, en compases. */
  maxBarsPerNote: number;
}

export const MUSIC_LIMITS: MusicLimits = { maxNotesPerBar: 40, maxSimultaneous: 20, maxBarsPerNote: 1 };

/** Problemas de `bars` compases seguidos de una música; vacío si todo está bien. */
export function auditMusic(def: MusicDef, bars = 64, limits: MusicLimits = MUSIC_LIMITS): string[] {
  const out: string[] = [];
  const allowed = new Set(def.scale.map((s) => (def.rootMidi + s) % 12));
  const rng = new Rng(def.seed);
  let chord = 0;
  for (let bar = 0; bar < bars; bar++) {
    if (bar > 0) chord = nextChord(def, rng, chord);
    if (!def.chordGraph[chord]) out.push(`compás ${bar}: el acorde ${chord} no está en el grafo`);
    const notes = composeBar(def, bar, chord);
    if (notes.length > limits.maxNotesPerBar) out.push(`compás ${bar}: ${notes.length} notas (tope ${limits.maxNotesPerBar})`);
    for (const n of notes) {
      // El tambor no tiene altura: sus números son instrumentos, no notas.
      if (n.layer !== 'drum' && !allowed.has(((n.midi % 12) + 12) % 12)) out.push(`compás ${bar}: ${n.layer} ${n.midi} fuera de la escala`);
      if (n.beats <= 0 || n.beats > def.beatsPerBar * limits.maxBarsPerNote) out.push(`compás ${bar}: ${n.layer} dura ${n.beats} pulsos`);
      if (n.beat < 0 || n.beat >= def.beatsPerBar) out.push(`compás ${bar}: ${n.layer} empieza fuera del compás (${n.beat})`);
    }
    for (let t = 0; t < def.beatsPerBar; t += 0.25) {
      const on = notes.filter((n) => n.beat <= t && t < n.beat + n.beats).length;
      if (on > limits.maxSimultaneous) out.push(`compás ${bar}, pulso ${t}: ${on} voces a la vez (tope ${limits.maxSimultaneous})`);
    }
  }
  return out;
}
