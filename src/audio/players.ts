// Música generativa y ambiente sobre el motor. La composición y las mezclas
// son puras (score.ts); aquí sólo se programan notas y se ajustan ganancias.
import { Rng } from '../sim/rng';
import type { AmbienceDef, MusicDef, MusicLayer } from './data';
import type { AudioEngine } from './engine';
import { composeBar, layerMix, midiToHz, MoodMixer, nextChord, type AmbienceMix, type MoodWeights, type Note } from './score';

const LOOKAHEAD = 0.25;

export class MusicPlayer {
  readonly mixer: MoodMixer;
  private bar = 0;
  private chord = 0;
  private nextBarAt = 0;
  private readonly rng: Rng;
  private night = 0;
  /** Ganancias del último compás programado (para el HUD y los tests). */
  lastGains: Record<MusicLayer, number> | null = null;

  constructor(private readonly e: AudioEngine, private readonly def: MusicDef) {
    this.mixer = new MoodMixer(def.fadeSeconds);
    this.rng = new Rng(def.seed);
    this.nextBarAt = e.ctx.currentTime + 0.3;
  }

  update(target: MoodWeights, night: number, dt: number): void {
    this.mixer.update(target, dt);
    this.night = night;
    const now = this.e.ctx.currentTime;
    if (this.nextBarAt < now) this.nextBarAt = now + 0.05; // tras una pausa larga, no se recupera lo perdido
    while (this.nextBarAt < now + LOOKAHEAD) this.scheduleBar();
  }

  private scheduleBar(): void {
    const { gains, bpm } = layerMix(this.def, this.mixer.weights, this.night);
    this.lastGains = gains;
    const beat = 60 / bpm;
    const t0 = this.nextBarAt;
    if (this.bar > 0) this.chord = nextChord(this.def, this.rng, this.chord);
    for (const n of composeBar(this.def, this.bar, this.chord)) {
      const g = gains[n.layer];
      if (g < 0.02) continue;
      this.play(n, t0 + n.beat * beat, n.beats * beat, g * n.velocity);
    }
    this.bar++;
    this.nextBarAt = t0 + this.def.beatsPerBar * beat;
  }

  private play(n: Note, at: number, dur: number, gain: number): void {
    const e = this.e;
    const f = midiToHz(n.midi);
    switch (n.layer) {
      case 'pad':
        // Dos sierras desafinadas por un filtro grave: cuerda lejana.
        for (const detune of [-7, 7]) e.tone({ wave: 'sawtooth', freq: f, detune, at, attack: Math.min(1.2, dur * 0.4), hold: dur * 0.5, release: 1.4, gain: gain * 0.05, cutoff: 900 * (1 - this.def.night.padDarken * this.night * 0.6) });
        break;
      case 'bell':
        // Campana: fundamental y un parcial inarmónico que se apaga antes.
        e.tone({ wave: 'sine', freq: f, at, attack: 0.005, hold: 0, release: 2.4, gain: gain * 0.12 });
        e.tone({ wave: 'sine', freq: f * 2.76, at, attack: 0.005, hold: 0, release: 0.9, gain: gain * 0.04 });
        break;
      case 'pulse':
        e.tone({ wave: 'triangle', freq: f, at, attack: 0.005, hold: dur * 0.3, release: 0.18, gain: gain * 0.16, cutoff: 1200 });
        break;
      case 'drum':
        if (n.midi === 36) {
          // Bombo: seno que cae de tono.
          const o = e.ctx.createOscillator();
          const g = e.ctx.createGain();
          o.frequency.setValueAtTime(120, at);
          o.frequency.exponentialRampToValueAtTime(42, at + 0.25);
          g.gain.setValueAtTime(0.0001, at);
          g.gain.linearRampToValueAtTime(gain * 0.5, at + 0.005);
          g.gain.exponentialRampToValueAtTime(0.0001, at + 0.35);
          o.connect(g);
          g.connect(e.buses.music);
          o.onended = (): void => g.disconnect();
          o.start(at);
          o.stop(at + 0.4);
        } else {
          // Golpe de mano: ruido filtrado corto.
          const s = e.noiseSource();
          const bp = e.ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.value = 900;
          const g = e.ctx.createGain();
          g.gain.setValueAtTime(0.0001, at);
          g.gain.linearRampToValueAtTime(gain * 0.25, at + 0.003);
          g.gain.exponentialRampToValueAtTime(0.0001, at + 0.12);
          s.connect(bp);
          bp.connect(g);
          g.connect(e.buses.music);
          s.onended = (): void => g.disconnect();
          s.start(at);
          s.stop(at + 0.15);
        }
        break;
      case 'harp':
        e.tone({ wave: 'triangle', freq: f, at, attack: 0.004, hold: 0, release: 1.6, gain: gain * 0.1, cutoff: 3000 });
        e.tone({ wave: 'sine', freq: f * 2, at, attack: 0.004, hold: 0, release: 0.8, gain: gain * 0.03 });
        break;
    }
  }
}

export class AmbiencePlayer {
  private readonly wind: { gain: GainNode; filter: BiquadFilterNode };
  private readonly water: { gain: GainNode; filter: BiquadFilterNode };
  private nextChirp = 0;
  private nextCricket = 0;
  private time = 0;
  private readonly rng = new Rng(777);
  mix: AmbienceMix = { birds: 0, crickets: 0, wind: 0, water: 0, day: 1 };

  constructor(private readonly e: AudioEngine, private readonly def: AmbienceDef) {
    this.wind = this.loop('lowpass', 500, 0.7);
    this.water = this.loop('bandpass', 700, 0.8);
  }

  /** Ruido en bucle por un filtro, con su propia ganancia (empieza en silencio). */
  private loop(type: BiquadFilterType, freq: number, q: number): { gain: GainNode; filter: BiquadFilterNode } {
    const src = this.e.noiseSource(true);
    const filter = this.e.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = this.e.ctx.createGain();
    gain.gain.value = 0;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.e.buses.ambience);
    src.start();
    return { gain, filter };
  }

  update(mix: AmbienceMix, dt: number): void {
    this.mix = mix;
    this.time += dt;
    const now = this.e.ctx.currentTime;
    // Viento: ráfagas lentas moviendo el filtro y el volumen.
    const gust = 0.6 + 0.4 * Math.sin(this.time * 0.23) * Math.sin(this.time * 0.071 + 1);
    this.wind.gain.gain.setTargetAtTime(mix.wind * 0.25 * gust, now, 0.5);
    this.wind.filter.frequency.setTargetAtTime(300 + 500 * gust, now, 0.5);
    // Agua: rumor con un vaivén.
    this.water.gain.gain.setTargetAtTime(mix.water * 0.3, now, 0.4);
    this.water.filter.frequency.setTargetAtTime(600 + 250 * Math.sin(this.time * 0.9), now, 0.3);
    // Pájaros: trinos sueltos (proceso de Poisson).
    if (mix.birds > 0.02 && now >= this.nextChirp) {
      this.chirp(now + 0.02, mix.birds);
      this.nextChirp = now + -Math.log(1 - this.rng.next()) / this.def.birds.chirpsPerSecond;
    }
    // Grillos: trenes de pulsos agudos.
    if (mix.crickets > 0.02 && now >= this.nextCricket) {
      this.cricket(now + 0.02, mix.crickets);
      this.nextCricket = now + 0.4 + this.rng.next() * 0.9;
    }
  }

  private chirp(at: number, level: number): void {
    const e = this.e;
    const base = 2200 + this.rng.next() * 2200;
    const notes = 2 + this.rng.int(0, 3);
    const pan = this.rng.next() * 1.6 - 0.8;
    const p = e.ctx.createStereoPanner();
    p.pan.value = pan;
    p.connect(e.buses.ambience);
    for (let i = 0; i < notes; i++) {
      const t = at + i * (0.07 + this.rng.next() * 0.05);
      const o = e.ctx.createOscillator();
      const g = e.ctx.createGain();
      const f = base * (1 + (this.rng.next() - 0.3) * 0.4);
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * (1.2 + this.rng.next() * 0.4), t + 0.05);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(level * 0.06, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      o.connect(g);
      g.connect(p);
      o.onended = (): void => g.disconnect();
      o.start(t);
      o.stop(t + 0.08);
    }
  }

  private cricket(at: number, level: number): void {
    const e = this.e;
    const pulses = 3 + this.rng.int(0, 4);
    const period = 1 / this.def.crickets.rate;
    const p = e.ctx.createStereoPanner();
    p.pan.value = this.rng.next() * 1.4 - 0.7;
    p.connect(e.buses.ambience);
    const o = e.ctx.createOscillator();
    o.frequency.value = 4300 + this.rng.next() * 500;
    const g = e.ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    for (let i = 0; i < pulses; i++) {
      const t = at + i * period;
      g.gain.linearRampToValueAtTime(level * 0.035, t + period * 0.2);
      g.gain.linearRampToValueAtTime(0.0001, t + period * 0.6);
    }
    o.connect(g);
    g.connect(p);
    o.onended = (): void => g.disconnect();
    o.start(at);
    o.stop(at + pulses * period + 0.05);
  }
}
