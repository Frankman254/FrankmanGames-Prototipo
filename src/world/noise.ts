// Ruido de valor con semilla, fractal y opcionalmente periódico (para texturas
// que se repiten en mosaico sin costura). Puro: sin DOM ni render.

function hash2(ix: number, iy: number, seed: number): number {
  let h = Math.imul(ix, 0x27d4eb2d) ^ Math.imul(iy, 0x165667b1) ^ Math.imul(seed, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const smooth = (t: number): number => t * t * (3 - 2 * t);

/** Ruido de valor en [0, 1). Con `period` > 0 se repite cada `period` unidades de red. */
export function valueNoise(x: number, y: number, seed: number, period = 0): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = smooth(x - x0);
  const fy = smooth(y - y0);
  let ax = x0;
  let ay = y0;
  let bx = x0 + 1;
  let by = y0 + 1;
  if (period > 0) {
    ax = ((ax % period) + period) % period;
    ay = ((ay % period) + period) % period;
    bx = ((bx % period) + period) % period;
    by = ((by % period) + period) % period;
  }
  const a = hash2(ax, ay, seed);
  const b = hash2(bx, ay, seed);
  const c = hash2(ax, by, seed);
  const d = hash2(bx, by, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

export interface FbmDef {
  /** Tamaño de la primera octava (metros o píxeles por celda de red). */
  scale: number;
  octaves: number;
  persistence: number;
}

/**
 * Ruido fractal normalizado a [0, 1). Con `period` (en unidades de x/y,
 * múltiplo de `scale`) es periódico.
 */
export function fbm(x: number, y: number, def: FbmDef, seed: number, period = 0): number {
  let amp = 1;
  let freq = 1 / def.scale;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < def.octaves; o++) {
    const p = period > 0 ? Math.round(period * freq) : 0;
    sum += amp * valueNoise(x * freq, y * freq, seed + o * 1013, p);
    norm += amp;
    amp *= def.persistence;
    freq *= 2;
  }
  return sum / norm;
}
