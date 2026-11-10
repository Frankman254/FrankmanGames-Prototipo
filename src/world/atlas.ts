// Panamá en miniatura (data/panama.json): dónde cae cada provincia en metros de juego y
// qué relieve lejano tiene. El mundo jugable es un rectángulo dentro de este atlas; lo que
// queda fuera se ve de lejos, azul, hasta que su provincia se construya. Puro.

export interface AtlasRange {
  id: string;
  name: string;
  height: number;
  /** Metros de juego hasta donde baja la ladera. */
  width: number;
  line: ReadonlyArray<readonly [number, number]>;
}

export interface AtlasRegion {
  id: string;
  official: string;
  /** Nombre de juego (inventado, parecido al real); sin él se enseña `official`. */
  name?: string;
  /** `pais`: Costa Rica y Colombia (F10). Se ven con su frontera, pero no se pisan ni se descubren. */
  kind: 'provincia' | 'comarca' | 'pais';
  status: 'pendiente' | 'en_curso' | 'pulida';
  levels: readonly [number, number] | null;
  climate: string;
  polygons: ReadonlyArray<ReadonlyArray<readonly [number, number]>>;
  places: readonly string[];
  biome: string;
  wildlife: string;
  people: string;
}

/**
 * Relieve real (data/relieve.json, Terrain Tiles on AWS): rejilla de metros sobre el mar cada
 * `step` grados desde (lonMin, latMin), fila a fila hacia el norte. Cada byte b vale
 * maxMeters·(b/255)², en base64.
 */
export interface AtlasRelief {
  lonMin: number;
  latMin: number;
  step: number;
  cols: number;
  rows: number;
  maxMeters: number;
  data: string;
}

export interface AtlasDef {
  metersPerKm: number;
  kmPerDegree: number;
  bounds: { lonMin: number; lonMax: number; latMin: number; latMax: number };
  anchor: { lon: number; lat: number };
  seaLevel: number;
  landHeight: number;
  ranges: readonly AtlasRange[];
  regions: readonly AtlasRegion[];
  /**
   * F10: costa real (Natural Earth, dominio público), un juego de anillos [lon, lat] por país
   * (`panama` y el id de cada región `pais`). Decide qué es tierra y qué mar fuera de `handBox`;
   * las provincias solo reparten esa tierra. Sin `coast`, mandan los polígonos de las regiones.
   */
  coast?: Readonly<Record<string, ReadonlyArray<ReadonlyArray<readonly [number, number]>>>>;
  /** Relieve real; sin él, el relieve lejano sale de las cordilleras de `ranges`. */
  relief?: AtlasRelief;
  /** Metros de juego por metro real de altura (la horizontal va a 1:100; la altura, exagerada). */
  reliefScale?: number;
  /** Recuadro donde manda el dibujo a mano (ya no se usa desde la geografía real de 2026-11-09). */
  handBox?: { lonMin: number; lonMax: number; latMin: number; latMax: number };
}

export interface AtlasPoint {
  x: number;
  z: number;
}

/** Metros de juego por grado. El norte es +Z, igual que en el minimapa y la brújula. */
const metersPerDegree = (a: AtlasDef): number => a.kmPerDegree * a.metersPerKm;

export function project(a: AtlasDef, lon: number, lat: number): AtlasPoint {
  const m = metersPerDegree(a);
  return { x: (lon - a.anchor.lon) * m, z: (lat - a.anchor.lat) * m };
}

/** Rectángulo del atlas en metros de juego. */
export function atlasExtent(a: AtlasDef): { x0: number; z0: number; x1: number; z1: number } {
  const sw = project(a, a.bounds.lonMin, a.bounds.latMin);
  const ne = project(a, a.bounds.lonMax, a.bounds.latMax);
  return { x0: sw.x, z0: sw.z, x1: ne.x, z1: ne.z };
}

function inRing(ring: ReadonlyArray<readonly [number, number]>, lon: number, lat: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** ¿Es parte de Panamá (provincia o comarca), y no un país vecino? */
export const isPanama = (r: AtlasRegion): boolean => r.kind !== 'pais';

type Ring = ReadonlyArray<readonly [number, number]>;
interface Box { x0: number; y0: number; x1: number; y1: number }
const boxes = new WeakMap<Ring, Box>();
function boxOf(ring: Ring): Box {
  let b = boxes.get(ring);
  if (!b) {
    b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    for (const [x, y] of ring) {
      b.x0 = Math.min(b.x0, x);
      b.y0 = Math.min(b.y0, y);
      b.x1 = Math.max(b.x1, x);
      b.y1 = Math.max(b.y1, y);
    }
    boxes.set(ring, b);
  }
  return b;
}
/** `inRing` con descarte rápido por el recuadro del anillo. */
function inRingFast(ring: Ring, lon: number, lat: number): boolean {
  const b = boxOf(ring);
  return lon >= b.x0 && lon <= b.x1 && lat >= b.y0 && lat <= b.y1 && inRing(ring, lon, lat);
}

function ringDistance(ring: Ring, lon: number, lat: number): number {
  let d = Infinity;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, ay] = ring[j]!;
    const [bx, by] = ring[i]!;
    const dx = bx - ax;
    const dy = by - ay;
    const l2 = dx * dx + dy * dy;
    const t = l2 > 0 ? Math.min(1, Math.max(0, ((lon - ax) * dx + (lat - ay) * dy) / l2)) : 0;
    d = Math.min(d, Math.hypot(lon - (ax + dx * t), lat - (ay + dy * t)));
  }
  return d;
}

const inHandBox = (a: AtlasDef, lon: number, lat: number): boolean => {
  const h = a.handBox;
  return !!h && lon >= h.lonMin && lon <= h.lonMax && lat >= h.latMin && lat <= h.latMax;
};

/**
 * Atajo de `regionAtLonLat`: rejilla sobre el atlas donde cada casilla que no cruza ningún
 * borde (costa o límite de provincia) tiene una sola respuesta, que se calcula una vez por mancha de casillas vecinas. Las
 * casillas con borde, y las de tierra repartida «a la provincia más cercana», van siempre por
 * el cálculo exacto: el resultado es idéntico punto a punto, sólo más rápido (el mundo entero
 * ya cabe en las páginas y se pregunta millones de veces).
 */
const QUICK_STEP = 0.004;
const QUICK_UNKNOWN = -2;
const QUICK_EXACT = -3;
interface QuickGrid { cols: number; rows: number; cells: Int16Array }
const quickGrids = new WeakMap<AtlasDef, QuickGrid | null>();
function quickGrid(a: AtlasDef): QuickGrid | null {
  let q = quickGrids.get(a);
  if (q !== undefined) return q;
  if (!a.coast || a.handBox) {
    quickGrids.set(a, null);
    return null;
  }
  const b = a.bounds;
  const cols = Math.ceil((b.lonMax - b.lonMin) / QUICK_STEP);
  const rows = Math.ceil((b.latMax - b.latMin) / QUICK_STEP);
  const cells = new Int16Array(cols * rows).fill(QUICK_UNKNOWN);
  const markBox = (x0: number, y0: number, x1: number, y1: number): void => {
    // Un pelo de margen: un borde justo en la raya cuenta para las dos casillas.
    const e = QUICK_STEP * 1e-6;
    const c0 = Math.max(0, Math.floor((Math.min(x0, x1) - e - b.lonMin) / QUICK_STEP));
    const c1 = Math.min(cols - 1, Math.floor((Math.max(x0, x1) + e - b.lonMin) / QUICK_STEP));
    const r0 = Math.max(0, Math.floor((Math.min(y0, y1) - e - b.latMin) / QUICK_STEP));
    const r1 = Math.min(rows - 1, Math.floor((Math.max(y0, y1) + e - b.latMin) / QUICK_STEP));
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) cells[r * cols + c] = QUICK_EXACT;
  };
  const markRing = (ring: Ring): void => {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [ax, ay] = ring[j]!;
      const [bx, by] = ring[i]!;
      // Tramos largos a trozos, para no marcar todo su recuadro.
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)) / QUICK_STEP));
      for (let k = 0; k < n; k++) markBox(ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n, ax + ((bx - ax) * (k + 1)) / n, ay + ((by - ay) * (k + 1)) / n);
    }
  };
  for (const rings of Object.values(a.coast)) rings.forEach(markRing);
  for (const r of a.regions) r.polygons.forEach(markRing);
  q = { cols, rows, cells };
  quickGrids.set(a, q);
  return q;
}

/** Región en lon/lat; null = mar. */
export function regionAtLonLat(a: AtlasDef, lon: number, lat: number): AtlasRegion | null {
  const q = quickGrid(a);
  if (!q) return regionExact(a, lon, lat).region;
  const c = Math.floor((lon - a.bounds.lonMin) / QUICK_STEP);
  const r = Math.floor((lat - a.bounds.latMin) / QUICK_STEP);
  if (c < 0 || r < 0 || c >= q.cols || r >= q.rows) return regionExact(a, lon, lat).region;
  const i = r * q.cols + c;
  const v = q.cells[i]!;
  if (v >= 0) return a.regions[v]!;
  if (v === -1) return null;
  const exact = regionExact(a, lon, lat);
  if (v === QUICK_UNKNOWN) {
    // Entre casillas sin borde que se tocan no pasa ninguna línea: toda la mancha vale lo mismo.
    const value = exact.nearest ? QUICK_EXACT : exact.region ? a.regions.indexOf(exact.region) : -1;
    const { cols, rows, cells } = q;
    const stack = [i];
    cells[i] = value;
    while (stack.length > 0) {
      const k = stack.pop()!;
      const kc = k % cols;
      const put = (n: number): void => {
        if (cells[n] !== QUICK_UNKNOWN) return;
        cells[n] = value;
        stack.push(n);
      };
      if (kc > 0) put(k - 1);
      if (kc + 1 < cols) put(k + 1);
      if (k >= cols) put(k - cols);
      if (k + cols < cols * rows) put(k + cols);
    }
  }
  return exact.region;
}

/** El cálculo exacto; `nearest`: salió por cercanía y no por caer dentro de un polígono. */
function regionExact(a: AtlasDef, lon: number, lat: number): { region: AtlasRegion | null; nearest: boolean } {
  const note = { used: false };
  const region = regionSlow(a, lon, lat, note);
  return { region, nearest: note.used };
}

function regionSlow(a: AtlasDef, lon: number, lat: number, note: { used: boolean }): AtlasRegion | null {
  if (!a.coast || inHandBox(a, lon, lat)) {
    for (const r of a.regions) if (r.polygons.some((ring) => inRingFast(ring, lon, lat))) return r;
    return null;
  }
  let country: string | null = null;
  for (const [id, rings] of Object.entries(a.coast)) if (rings.some((ring) => inRingFast(ring, lon, lat))) country = id;
  const own = a.regions.filter((r) => r.kind !== 'pais');
  if (country === 'panama') {
    for (const r of own) if (r.polygons.some((ring) => inRingFast(ring, lon, lat))) return r;
    // Tierra real que el dibujo de provincias no cubre: la provincia más cercana.
    note.used = true;
    let best: AtlasRegion | null = null;
    let bd = Infinity;
    for (const r of own) {
      for (const ring of r.polygons) {
        const d = ringDistance(ring, lon, lat);
        if (d < bd) {
          bd = d;
          best = r;
        }
      }
    }
    return best;
  }
  if (country) return a.regions.find((r) => r.id === country) ?? null;
  // Mar según la costa real: solo los islotes dibujados a mano (cayos que Natural Earth no trae).
  for (const r of own) if (r.polygons.slice(1).some((ring) => inRingFast(ring, lon, lat))) return r;
  return null;
}

/** Región en un punto de juego; null = mar. */
export function regionAt(a: AtlasDef, x: number, z: number): AtlasRegion | null {
  const m = metersPerDegree(a);
  return regionAtLonLat(a, a.anchor.lon + x / m, a.anchor.lat + z / m);
}

function segmentDistance(px: number, pz: number, a: AtlasPoint, b: AtlasPoint): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const l2 = dx * dx + dz * dz;
  const t = l2 > 0 ? Math.min(1, Math.max(0, ((px - a.x) * dx + (pz - a.z) * dz) / l2)) : 0;
  return Math.hypot(px - (a.x + dx * t), pz - (a.z + dz * t));
}

/** Ruido de valor determinista (0–1) en una rejilla entera, suavizado. */
function valueNoise(x: number, z: number): number {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const hash = (i: number, j: number): number => {
    let n = (i * 374761393 + j * 668265263) | 0;
    n = (n ^ (n >>> 13)) * 1274126177;
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };
  const fx = x - xi;
  const fz = z - zi;
  const sx = fx * fx * (3 - 2 * fx);
  const sz = fz * fz * (3 - 2 * fz);
  const a = hash(xi, zi) + (hash(xi + 1, zi) - hash(xi, zi)) * sx;
  const b = hash(xi, zi + 1) + (hash(xi + 1, zi + 1) - hash(xi, zi + 1)) * sx;
  return a + (b - a) * sz;
}

/** Crestas: dos octavas de ruido «doblado» (picos agudos y quebradas), 0–1. */
function ridgeNoise(x: number, z: number): number {
  const r1 = 1 - Math.abs(valueNoise(x, z) * 2 - 1);
  const r2 = 1 - Math.abs(valueNoise(x * 2.3 + 17, z * 2.3 - 9) * 2 - 1);
  return 1 - (r1 * 0.65 + r2 * 0.35);
}

const reliefCache = new WeakMap<AtlasRelief, Float32Array>();
function reliefGrid(r: AtlasRelief): Float32Array {
  let g = reliefCache.get(r);
  if (!g) {
    const bin = atob(r.data);
    g = new Float32Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      const k = bin.charCodeAt(i) / 255;
      g[i] = r.maxMeters * k * k;
    }
    reliefCache.set(r, g);
  }
  return g;
}

/** Metros reales sobre el mar en lon/lat (interpolado); 0 fuera de la rejilla. */
export function reliefMeters(r: AtlasRelief, lon: number, lat: number): number {
  const gx = (lon - r.lonMin) / r.step;
  const gz = (lat - r.latMin) / r.step;
  if (gx < 0 || gz < 0 || gx > r.cols - 1 || gz > r.rows - 1) return 0;
  const g = reliefGrid(r);
  const c = Math.min(r.cols - 2, Math.floor(gx));
  const w = Math.min(r.rows - 2, Math.floor(gz));
  const fx = gx - c;
  const fz = gz - w;
  const i = w * r.cols + c;
  const a = g[i]!;
  const b = g[i + 1]!;
  const d = g[i + r.cols]!;
  const f = g[i + r.cols + 1]!;
  return a + (b - a) * fx + (d - a) * fz + (a - b - d + f) * fx * fz;
}

/** Altura lejana en un punto: mar plano, o tierra con el relieve real (o la cordillera dominante). */
export function farHeight(a: AtlasDef, x: number, z: number): number {
  if (!regionAt(a, x, z)) return a.seaLevel;
  if (a.relief) {
    const m = metersPerDegree(a);
    const real = reliefMeters(a.relief, a.anchor.lon + x / m, a.anchor.lat + z / m) * (a.reliefScale ?? 0.075);
    // La rejilla real tiene un punto por kilómetro (10 m de juego): de cerca, crestas finas.
    const rough = 1 - 0.12 * ridgeNoise(x / 14, z / 14);
    return a.landHeight + real * rough;
  }
  let h = a.landHeight;
  for (const r of a.ranges) {
    let d = Infinity;
    for (let i = 0; i + 1 < r.line.length; i++) {
      const p = r.line[i]!;
      const q = r.line[i + 1]!;
      d = Math.min(d, segmentDistance(x, z, project(a, p[0], p[1]), project(a, q[0], q[1])));
    }
    const k = Math.max(0, 1 - d / r.width);
    if (k <= 0) continue;
    // Creador (2026-11-07): de lejos parecían cúpulas lisas. Ladera más empinada arriba y
    // crestas y quebradas con ruido propio; en la cumbre (k = 1) la altura no cambia.
    const shape = Math.pow(k, 1.6);
    const rough = 1 - 0.45 * (1 - k) * ridgeNoise(x / 38, z / 38);
    h = Math.max(h, a.landHeight + r.height * shape * rough);
  }
  return h;
}
