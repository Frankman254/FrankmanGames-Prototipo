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
  kind: 'provincia' | 'comarca';
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

/** Región en un punto de juego; null = mar. */
export function regionAt(a: AtlasDef, x: number, z: number): AtlasRegion | null {
  const m = metersPerDegree(a);
  const lon = a.anchor.lon + x / m;
  const lat = a.anchor.lat + z / m;
  for (const r of a.regions) if (r.polygons.some((ring) => inRing(ring, lon, lat))) return r;
  return null;
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
