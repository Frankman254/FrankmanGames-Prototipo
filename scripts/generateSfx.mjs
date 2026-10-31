// Genera los efectos de sonido de src/audio/sfx/generated_original/ por síntesis
// en código: osciladores, ruido de un generador pseudoaleatorio con semilla fija
// y filtros biquad. No lee ningún archivo de audio ni usa muestras de terceros;
// ejecutarlo dos veces produce exactamente los mismos bytes.
//
//   node scripts/generateSfx.mjs
//
// Cada WAV lleva un bloque LIST/INFO con su origen (ISFT = este script) para que
// la procedencia se pueda comprobar abriendo el archivo. Registro: PROCEDENCIA.md.
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 22050;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'audio', 'sfx', 'generated_original');
export const SOFTWARE = 'FrankmanGames scripts/generateSfx.mjs';
const COMMENT = 'Sintetizado por codigo (osciladores, ruido con semilla y filtros). Licencia: propia del proyecto.';

// ─── Utilidades ────────────────────────────────────────────────────────────

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const buf = (sec) => new Float32Array(Math.round(sec * RATE));

/** Envolvente: ataque lineal y caída exponencial hasta ~-60 dB al final. */
function env(i, n, attack, curve = 6) {
  const t = i / RATE;
  const a = Math.max(1e-4, attack);
  const up = Math.min(1, t / a);
  const rest = Math.max(0, (i - a * RATE) / Math.max(1, n - a * RATE));
  return up * Math.exp(-curve * rest);
}

/** Filtro biquad (RBJ). type: lowpass | highpass | bandpass. freq puede ser función del índice. */
function biquad(x, type, freq, q = 0.707) {
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const f = Math.min(RATE * 0.45, Math.max(20, typeof freq === 'function' ? freq(i) : freq));
    const w = (2 * Math.PI * f) / RATE;
    const cs = Math.cos(w), al = Math.sin(w) / (2 * q);
    let b0, b1, b2;
    if (type === 'lowpass') [b0, b1, b2] = [(1 - cs) / 2, 1 - cs, (1 - cs) / 2];
    else if (type === 'highpass') [b0, b1, b2] = [(1 + cs) / 2, -(1 + cs), (1 + cs) / 2];
    else [b0, b1, b2] = [al, 0, -al];
    const a0 = 1 + al, a1 = -2 * cs, a2 = 1 - al;
    const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v;
    y[i] = v;
  }
  return y;
}

function noise(sec, seed) {
  const r = rng(seed);
  const b = buf(sec);
  for (let i = 0; i < b.length; i++) b[i] = r() * 2 - 1;
  return b;
}

/** Oscilador con barrido exponencial de f0 a f1. wave: sine | tri | saw | square. */
function osc(sec, f0, f1, wave = 'sine') {
  const b = buf(sec);
  let ph = 0;
  for (let i = 0; i < b.length; i++) {
    const f = f0 * Math.pow(f1 / f0, i / b.length);
    ph += f / RATE;
    const p = ph % 1;
    b[i] = wave === 'sine' ? Math.sin(2 * Math.PI * p) : wave === 'tri' ? 4 * Math.abs(p - 0.5) - 1 : wave === 'saw' ? 2 * p - 1 : p < 0.5 ? 1 : -1;
  }
  return b;
}

function shape(x, attack, curve) {
  for (let i = 0; i < x.length; i++) x[i] *= env(i, x.length, attack, curve);
  return x;
}

/** Suma capas (con retraso en segundos) en un búfer de `sec` segundos. */
function mix(sec, layers) {
  const out = buf(sec);
  for (const [x, gain = 1, delay = 0] of layers) {
    const d = Math.round(delay * RATE);
    for (let i = 0; i < x.length && i + d < out.length; i++) out[i + d] += x[i] * gain;
  }
  return out;
}

function normalize(x, peak = 0.89) {
  let m = 0;
  for (const v of x) m = Math.max(m, Math.abs(v));
  const k = m > 0 ? peak / m : 1;
  // Fundido final de 5 ms para no acabar en un clic.
  const fade = Math.round(0.005 * RATE);
  for (let i = 0; i < x.length; i++) x[i] *= k * Math.min(1, (x.length - 1 - i) / fade);
  return x;
}

// ─── Recetas (todas originales) ────────────────────────────────────────────

export const RECIPES = {
  // Golpe cortante ligero: chasquido de ruido agudo + tic grave.
  hit_blade_light_01: () => mix(0.32, [
    [shape(biquad(noise(0.32, 11), 'highpass', 1800), 0.002, 9), 1],
    [shape(osc(0.12, 320, 140, 'tri'), 0.001, 7), 0.6],
  ]),
  // Golpe cortante pesado: más cuerpo y cola.
  hit_blade_heavy_01: () => mix(0.5, [
    [shape(biquad(noise(0.5, 12), 'bandpass', (i) => 2400 - i * 0.12, 1.2), 0.002, 7), 1],
    [shape(osc(0.3, 180, 60, 'sine'), 0.001, 6), 0.9],
  ]),
  // Golpe contundente: golpe sordo filtrado.
  hit_blunt_01: () => mix(0.38, [
    [shape(biquad(noise(0.38, 13), 'lowpass', 900), 0.001, 8), 1],
    [shape(osc(0.25, 140, 55, 'sine'), 0.001, 6), 1],
  ]),
  // Crítico: chasquido brillante + campana inarmónica corta.
  hit_critical_01: () => mix(0.7, [
    [shape(biquad(noise(0.25, 14), 'highpass', 2500), 0.001, 10), 0.9],
    [shape(osc(0.35, 120, 45, 'sine'), 0.001, 6), 0.9],
    [shape(osc(0.6, 1320, 1290, 'sine'), 0.002, 5), 0.35, 0.02],
    [shape(osc(0.6, 1980, 1940, 'sine'), 0.002, 6), 0.22, 0.02],
  ]),
  // Bloqueo: anillo metálico con parciales inarmónicos.
  block_metal_01: () => mix(0.8, [
    [shape(biquad(noise(0.08, 15), 'highpass', 3000), 0.001, 8), 0.7],
    ...[1, 2.76, 5.4, 8.93].map((r, k) => [shape(osc(0.8, 520 * r, 520 * r * 0.995, 'sine'), 0.001, 4 + k * 2), 0.5 / (k + 1)]),
  ]),
  // Fuego, lanzamiento: soplo que sube + crepitar.
  spell_fire_cast_01: () => {
    const crackle = noise(0.6, 21);
    const r = rng(22);
    for (let i = 0; i < crackle.length; i++) crackle[i] *= r() > 0.985 ? 1 : 0.05;
    return mix(0.6, [
      [shape(biquad(noise(0.6, 20), 'bandpass', (i) => 400 + i * 0.12, 0.9), 0.12, 4), 1],
      [shape(biquad(crackle, 'highpass', 2000), 0.05, 3), 0.6],
    ]);
  },
  // Fuego, impacto: estallido grave con cola de llamas.
  spell_fire_impact_01: () => mix(0.75, [
    [shape(biquad(noise(0.75, 23), 'lowpass', (i) => 3000 - i * 0.16), 0.003, 5), 1],
    [shape(osc(0.4, 90, 40, 'sine'), 0.002, 5), 0.8],
  ]),
  // Escarcha, lanzamiento: brillo agudo que tintinea y aire frío.
  spell_frost_cast_01: () => mix(0.8, [
    [shape(biquad(noise(0.8, 30), 'highpass', 5000), 0.08, 4), 0.5],
    [shape(osc(0.6, 2093, 2093, 'sine'), 0.005, 5), 0.3, 0.0],
    [shape(osc(0.6, 2637, 2637, 'sine'), 0.005, 5), 0.25, 0.07],
    [shape(osc(0.6, 3136, 3136, 'sine'), 0.005, 5), 0.2, 0.14],
  ]),
  // Tormenta, lanzamiento: zumbido eléctrico con saltos de tono.
  spell_storm_cast_01: () => {
    const r = rng(40);
    const x = buf(0.55);
    let f = 180, ph = 0;
    for (let i = 0; i < x.length; i++) {
      if (i % 220 === 0) f = 120 + r() * 260;
      ph += f / RATE;
      x[i] = 2 * (ph % 1) - 1;
    }
    return mix(0.55, [
      [shape(biquad(x, 'bandpass', 1400, 0.8), 0.01, 4), 1],
      [shape(biquad(noise(0.55, 41), 'highpass', 4000), 0.01, 6), 0.3],
    ]);
  },
  // Tormenta, impacto: chasquido seco del rayo y retumbo.
  spell_storm_impact_01: () => mix(0.8, [
    [shape(biquad(noise(0.1, 42), 'highpass', 1500), 0.0005, 6), 1],
    [shape(biquad(noise(0.8, 43), 'lowpass', 300), 0.03, 4), 0.9, 0.04],
  ]),
  // Tierra, lanzamiento: retumbo grave y grava.
  spell_earth_cast_01: () => mix(0.6, [
    [shape(osc(0.6, 70, 50, 'tri'), 0.04, 4), 1],
    [shape(biquad(noise(0.6, 50), 'lowpass', 600), 0.03, 4), 0.8],
  ]),
  // Curación: arpegio mayor ascendente de senos suaves.
  spell_heal_01: () => mix(1.1, [523.25, 659.25, 783.99, 1046.5].map((f, k) => [shape(osc(0.7, f, f, 'sine'), 0.03, 4), 0.35, k * 0.09])),
};

// ─── WAV PCM 16 bits mono con LIST/INFO ─────────────────────────────────────

function infoChunk(fields) {
  const parts = Object.entries(fields).map(([id, text]) => {
    const data = Buffer.from(`${text}\0`, 'latin1');
    const pad = data.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0);
    const head = Buffer.alloc(8);
    head.write(id, 0, 'ascii');
    head.writeUInt32LE(data.length, 4);
    return Buffer.concat([head, data, pad]);
  });
  const body = Buffer.concat([Buffer.from('INFO', 'ascii'), ...parts]);
  const head = Buffer.alloc(8);
  head.write('LIST', 0, 'ascii');
  head.writeUInt32LE(body.length, 4);
  return Buffer.concat([head, body]);
}

export function encodeWav(samples, name) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), i * 2);
  const fmt = Buffer.alloc(24);
  fmt.write('fmt ', 0, 'ascii');
  fmt.writeUInt32LE(16, 4);
  fmt.writeUInt16LE(1, 8); // PCM
  fmt.writeUInt16LE(1, 10); // mono
  fmt.writeUInt32LE(RATE, 12);
  fmt.writeUInt32LE(RATE * 2, 16);
  fmt.writeUInt16LE(2, 20);
  fmt.writeUInt16LE(16, 22);
  const info = infoChunk({ INAM: name, ISFT: SOFTWARE, ICMT: COMMENT, ICOP: 'FrankmanGames (propio)' });
  const dataHead = Buffer.alloc(8);
  dataHead.write('data', 0, 'ascii');
  dataHead.writeUInt32LE(data.length, 4);
  const body = Buffer.concat([Buffer.from('WAVE', 'ascii'), fmt, info, dataHead, data]);
  const riff = Buffer.alloc(8);
  riff.write('RIFF', 0, 'ascii');
  riff.writeUInt32LE(body.length, 4);
  return Buffer.concat([riff, body]);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  mkdirSync(OUT, { recursive: true });
  // Sólo quedan los que genera este script.
  for (const f of readdirSync(OUT)) if (f.endsWith('.wav') && !(f.replace(/\.wav$/, '') in RECIPES)) rmSync(join(OUT, f));
  for (const [name, make] of Object.entries(RECIPES)) {
    const wav = encodeWav(normalize(make()), name);
    writeFileSync(join(OUT, `${name}.wav`), wav);
    console.log(`${name}.wav  ${(wav.length / 1024).toFixed(1)} KB`);
  }
}
