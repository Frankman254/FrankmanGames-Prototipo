// Motor de audio sobre Web Audio: buses (master, música, efectos, ambiente,
// interfaz) con un limitador a la salida, y voces sintetizadas a partir de las
// recetas de data/audio/sfx.json (osciladores o ruido, filtro, envolvente y
// paneo). Algunos sonidos tienen además una muestra WAV generada por código
// (`playBuffer`, ver src/audio/samples.ts); la receta queda de respaldo.
import { Rng } from '../sim/rng';
import { BUSES, type Bus, type LayerDef, type MixDef, type SoundDef } from './data';
import { variation } from './score';

export interface PlayOptions {
  pan?: number;
  gain?: number;
  pitch?: number;
  delay?: number;
}

/** Ruido blanco de un segundo, reutilizado por todas las voces de ruido. */
function noiseBuffer(ctx: BaseAudioContext, seconds = 1): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  const rng = new Rng(4242);
  for (let i = 0; i < len; i++) d[i] = rng.next() * 2 - 1;
  return buf;
}

export class AudioEngine {
  readonly buses: Record<Bus, GainNode>;
  readonly limiter: DynamicsCompressorNode;
  /** Eco suave de la música (da espacio sin reverberación de archivo). */
  readonly musicIn: GainNode;
  private readonly noise: AudioBuffer;
  private readonly rng: Rng;
  private voices = 0;
  private userVolume = 1;
  /** Voces descartadas por superar `maxVoices` (para medir). */
  dropped = 0;

  constructor(readonly ctx: BaseAudioContext, private readonly mix: MixDef, seed = 1) {
    this.rng = new Rng(seed);
    this.noise = noiseBuffer(ctx);
    this.buses = {} as Record<Bus, GainNode>;
    for (const b of BUSES) {
      const g = ctx.createGain();
      g.gain.value = mix.buses[b];
      this.buses[b] = g;
    }
    const L = mix.limiter;
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = L.threshold;
    this.limiter.knee.value = L.knee;
    this.limiter.ratio.value = L.ratio;
    this.limiter.attack.value = L.attack;
    this.limiter.release.value = L.release;
    for (const b of BUSES) if (b !== 'master') this.buses[b].connect(this.buses.master);
    this.buses.master.connect(this.limiter);
    this.limiter.connect(ctx.destination);

    // Música: seco + eco con realimentación filtrada.
    this.musicIn = ctx.createGain();
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.36;
    const fb = ctx.createGain();
    fb.gain.value = 0.38;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2200;
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    this.musicIn.connect(this.buses.music);
    this.musicIn.connect(delay);
    delay.connect(tone);
    tone.connect(fb);
    fb.connect(delay);
    tone.connect(wet);
    wet.connect(this.buses.music);
    this.setVolume(1);
  }

  /** Volumen general de las opciones (0–1) sobre la ganancia del bus master. */
  setVolume(v: number): void {
    this.userVolume = Math.max(0, Math.min(1, v));
    this.buses.master.gain.setTargetAtTime(this.mix.buses.master * this.userVolume, this.ctx.currentTime, 0.05);
  }

  /** Volumen de un bus (música, efectos…) de las opciones (0–1) sobre su ganancia de mezcla. */
  setBusVolume(bus: Exclude<Bus, 'master'>, v: number): void {
    this.buses[bus].gain.setTargetAtTime(this.mix.buses[bus] * Math.max(0, Math.min(1, v)), this.ctx.currentTime, 0.05);
  }

  get volume(): number {
    return this.userVolume;
  }

  get activeVoices(): number {
    return this.voices;
  }

  /** Fuente de ruido (en bucle si `loop`). */
  noiseSource(loop = false): AudioBufferSourceNode {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    s.loop = loop;
    return s;
  }

  /** Reproduce una receta con variación aleatoria. Devuelve false si se descartó. */
  play(def: SoundDef, opts: PlayOptions = {}, bus: Bus = def.bus): boolean {
    if (this.voices >= this.mix.maxVoices) {
      this.dropped++;
      return false;
    }
    const v = variation(this.rng, def.vary);
    const pitch = v.pitch * (opts.pitch ?? 1);
    const gain = v.gain * (opts.gain ?? 1);
    if (gain <= 0.001) return false;
    const t0 = this.ctx.currentTime + (opts.delay ?? 0) + 0.005;
    const out = this.ctx.createStereoPanner();
    out.pan.value = Math.max(-1, Math.min(1, opts.pan ?? 0));
    out.connect(this.buses[bus]);
    let end = t0;
    let alive = def.layers.length;
    this.voices++;
    const done = (): void => {
      if (--alive === 0) {
        this.voices--;
        out.disconnect();
      }
    };
    for (const l of def.layers) end = Math.max(end, this.layer(l, t0, pitch, gain, out, done));
    return true;
  }

  /** Reproduce una muestra decodificada con la variación de la receta. Devuelve false si se descartó. */
  playBuffer(buffer: AudioBuffer, vary: SoundDef['vary'], opts: PlayOptions = {}, bus: Bus = 'sfx'): boolean {
    if (this.voices >= this.mix.maxVoices) {
      this.dropped++;
      return false;
    }
    const v = variation(this.rng, vary);
    const gain = v.gain * (opts.gain ?? 1);
    if (gain <= 0.001) return false;
    const t0 = this.ctx.currentTime + (opts.delay ?? 0) + 0.005;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = v.pitch * (opts.pitch ?? 1);
    const g = this.ctx.createGain();
    g.gain.value = gain;
    const out = this.ctx.createStereoPanner();
    out.pan.value = Math.max(-1, Math.min(1, opts.pan ?? 0));
    src.connect(g);
    g.connect(out);
    out.connect(this.buses[bus]);
    this.voices++;
    src.onended = (): void => {
      this.voices--;
      g.disconnect();
      out.disconnect();
    };
    src.start(t0);
    return true;
  }

  /** Una capa: fuente → filtro opcional → envolvente → salida. Devuelve cuándo acaba. */
  private layer(l: LayerDef, t0: number, pitch: number, gain: number, out: AudioNode, done: () => void): number {
    const ctx = this.ctx;
    const t = t0 + l.delay;
    const end = t + l.attack + l.decay;
    let src: AudioScheduledSourceNode;
    if (l.wave === 'noise') {
      const n = this.noiseSource(true);
      n.playbackRate.value = pitch;
      src = n;
    } else {
      const o = ctx.createOscillator();
      o.type = l.wave;
      o.frequency.setValueAtTime(l.freq * pitch, t);
      if (l.freqEnd !== l.freq) o.frequency.exponentialRampToValueAtTime(Math.max(1, l.freqEnd * pitch), end);
      src = o;
    }
    let node: AudioNode = src;
    if (l.filter) {
      const f = ctx.createBiquadFilter();
      f.type = l.filter.type;
      f.Q.value = l.filter.q;
      f.frequency.setValueAtTime(l.filter.freq * pitch, t);
      if (l.filter.freqEnd !== l.filter.freq) f.frequency.exponentialRampToValueAtTime(Math.max(10, l.filter.freqEnd * pitch), end);
      node.connect(f);
      node = f;
    }
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(Math.max(0.0002, l.gain * gain), t + Math.max(0.001, l.attack));
    env.gain.exponentialRampToValueAtTime(0.0001, end);
    node.connect(env);
    env.connect(out);
    src.onended = (): void => {
      env.disconnect();
      done();
    };
    src.start(t);
    src.stop(end + 0.03);
    return end;
  }

  /** Nota tónica sencilla (música): oscilador con filtro y envolvente ADSR. */
  tone(opts: { wave: OscillatorType; freq: number; at: number; attack: number; hold: number; release: number; gain: number; cutoff?: number; detune?: number; dest?: AudioNode }): void {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = opts.wave;
    o.frequency.value = opts.freq;
    if (opts.detune) o.detune.value = opts.detune;
    const env = ctx.createGain();
    const t = opts.at;
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(Math.max(0.0002, opts.gain), t + opts.attack);
    env.gain.setValueAtTime(Math.max(0.0002, opts.gain), t + opts.attack + opts.hold);
    env.gain.exponentialRampToValueAtTime(0.0001, t + opts.attack + opts.hold + opts.release);
    let node: AudioNode = o;
    if (opts.cutoff) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = opts.cutoff;
      o.connect(f);
      node = f;
    }
    node.connect(env);
    env.connect(opts.dest ?? this.musicIn);
    o.onended = (): void => env.disconnect();
    o.start(t);
    o.stop(t + opts.attack + opts.hold + opts.release + 0.05);
  }
}
