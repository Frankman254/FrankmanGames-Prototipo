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
  needsConsult?: boolean;
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
  /** Recuadro donde manda el dibujo a mano (ahí está construido el mundo jugable). */
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

/** Región en lon/lat; null = mar. */
export function regionAtLonLat(a: AtlasDef, lon: number, lat: number): AtlasRegion | null {
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

/** Altura lejana en un punto: mar plano, o tierra más la cordillera dominante. */
export function farHeight(a: AtlasDef, x: number, z: number): number {
  if (!regionAt(a, x, z)) return a.seaLevel;
  let h = a.landHeight;
  for (const r of a.ranges) {
    let d = Infinity;
    for (let i = 0; i + 1 < r.line.length; i++) {
      const p = r.line[i]!;
      const q = r.line[i + 1]!;
      d = Math.min(d, segmentDistance(x, z, project(a, p[0], p[1]), project(a, q[0], q[1])));
    }
    const k = Math.max(0, 1 - d / r.width);
    h = Math.max(h, a.landHeight + r.height * k * k * (3 - 2 * k));
  }
  return h;
}
