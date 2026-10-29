// Ciclo día/noche: interpola las claves de `data/lighting.json` y calcula la
// dirección del sol (o de la luna). Puro: sin DOM ni render.

export type Rgb = [number, number, number];

export interface LightKey {
  t: number;
  sun: number;
  sunColor: Rgb;
  ambient: number;
  skyColor: Rgb;
  groundColor: Rgb;
  zenith: Rgb;
  horizon: Rgb;
  fogDensity: number;
  lampsOn: number;
  playerLight: number;
  stars: number;
}

export interface LightingDef {
  dayLengthSeconds: number;
  startTime: number;
  sunTiltDeg: number;
  sunAzimuthDeg: number;
  /** Ordenadas por `t`, con t en [0, 1). */
  keys: LightKey[];
  shadows: { mapSize: number; rangeMeters: number; darkness: number };
  lamps: { maxActive: number; range: number; intensity: number; color: Rgb };
  playerLight: { range: number; intensity: number; color: Rgb; height: number };
}

export interface LightState extends Omit<LightKey, 't'> {
  /** Vector unitario hacia el astro que ilumina (sol de día, luna de noche). */
  toLight: [number, number, number];
  /** Vector unitario hacia el sol (para dibujarlo en el cielo), aunque esté bajo el horizonte. */
  toSun: [number, number, number];
  isDay: boolean;
}

const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;
const lerpRgb = (a: Rgb, b: Rgb, k: number): Rgb => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

/** Hora del día en [0, 1) tras `seconds` desde el arranque. */
export function timeOfDay(def: LightingDef, seconds: number): number {
  const t = def.startTime + seconds / def.dayLengthSeconds;
  return t - Math.floor(t);
}

/** Dirección hacia el sol: sale por el este a t = 0,25, culmina a t = 0,5. */
export function sunDirection(def: LightingDef, t: number): [number, number, number] {
  const a = (t - 0.25) * Math.PI * 2;
  const tilt = (def.sunTiltDeg * Math.PI) / 180;
  const az = (def.sunAzimuthDeg * Math.PI) / 180;
  // Eje este-oeste (E) y la «vertical inclinada» del arco solar.
  const ex = Math.cos(az);
  const ez = Math.sin(az);
  const up = Math.sin(a);
  const across = Math.cos(a);
  const x = across * ex - up * Math.sin(tilt) * ez;
  const y = up * Math.cos(tilt);
  const z = across * ez + up * Math.sin(tilt) * ex;
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
}

export function sampleLighting(def: LightingDef, t: number): LightState {
  const keys = def.keys;
  let i = keys.length - 1;
  while (i > 0 && keys[i]!.t > t) i--;
  // Entre la última clave y la primera (cruzando medianoche) también se interpola.
  const a = keys[i]!.t <= t ? keys[i]! : keys[keys.length - 1]!;
  const b = keys[(keys.indexOf(a) + 1) % keys.length]!;
  let span = b.t - a.t;
  let pos = t - a.t;
  if (span <= 0) span += 1;
  if (pos < 0) pos += 1;
  const k = span > 0 ? Math.min(1, pos / span) : 0;
  const toSun = sunDirection(def, t);
  const isDay = toSun[1] > 0;
  const toLight: [number, number, number] = isDay ? toSun : [-toSun[0], -toSun[1], -toSun[2]];
  // Ni el sol ni la luna rasantes del todo: sombras infinitas y luz que no toca el suelo.
  if (toLight[1] < 0.18) {
    toLight[1] = 0.18;
    const l = Math.hypot(...toLight);
    toLight[0] /= l;
    toLight[1] /= l;
    toLight[2] /= l;
  }
  return {
    sun: lerp(a.sun, b.sun, k),
    sunColor: lerpRgb(a.sunColor, b.sunColor, k),
    ambient: lerp(a.ambient, b.ambient, k),
    skyColor: lerpRgb(a.skyColor, b.skyColor, k),
    groundColor: lerpRgb(a.groundColor, b.groundColor, k),
    zenith: lerpRgb(a.zenith, b.zenith, k),
    horizon: lerpRgb(a.horizon, b.horizon, k),
    fogDensity: lerp(a.fogDensity, b.fogDensity, k),
    lampsOn: lerp(a.lampsOn, b.lampsOn, k),
    playerLight: lerp(a.playerLight, b.playerLight, k),
    stars: lerp(a.stars, b.stars, k),
    toLight,
    toSun,
    isDay,
  };
}

/** Índices de las `k` farolas más cercanas a (x, z), de la más cercana a la más lejana. */
export function nearestLamps(lamps: ReadonlyArray<{ x: number; z: number }>, x: number, z: number, k: number): number[] {
  return lamps
    .map((l, i) => ({ i, d: (l.x - x) ** 2 + (l.z - z) ** 2 }))
    .sort((p, q) => p.d - q.d)
    .slice(0, k)
    .map((p) => p.i);
}
