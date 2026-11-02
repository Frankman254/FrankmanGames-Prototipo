export interface StreamPoint { x: number; y: number }
export interface StreamSector { x: number; y: number; key: string }

function validateSectorMeters(sectorMeters: number): void {
  if (!Number.isFinite(sectorMeters) || sectorMeters <= 0) throw new RangeError('sectorMeters debe ser finito y positivo');
}

function validateRadius(radius: number): void {
  if (!Number.isFinite(radius) || radius < 0) throw new RangeError('radius debe ser finito y no negativo');
}

export function sectorAt(p: StreamPoint, sectorMeters: number): StreamSector {
  validateSectorMeters(sectorMeters);
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) throw new RangeError('StreamPoint debe ser finito');
  const x = Math.floor(p.x / sectorMeters);
  const y = Math.floor(p.y / sectorMeters);
  return { x, y, key: `${x}:${y}` };
}

export function sectorsAround(p: StreamPoint, sectorMeters: number, radius: number): StreamSector[] {
  validateRadius(radius);
  const center = sectorAt(p, sectorMeters);
  const cells = Math.max(0, Math.ceil(radius / sectorMeters));
  const out: StreamSector[] = [];
  for (let y = center.y - cells; y <= center.y + cells; y++) for (let x = center.x - cells; x <= center.x + cells; x++) {
    const minX = x * sectorMeters, minY = y * sectorMeters;
    const dx = Math.max(minX - p.x, 0, p.x - (minX + sectorMeters));
    const dy = Math.max(minY - p.y, 0, p.y - (minY + sectorMeters));
    if (dx * dx + dy * dy <= radius * radius) out.push({ x, y, key: `${x}:${y}` });
  }
  return out.sort((a, b) => a.y - b.y || a.x - b.x);
}

export interface StreamDelta { loaded: string[]; unloaded: string[]; active: string[] }

/** Modelo puro; el render decide cómo crear u ocultar vegetación y props. */
export class SectorStream {
  private activeSet = new Set<string>();
  constructor(readonly sectorMeters: number, readonly radius: number) {
    validateSectorMeters(sectorMeters);
    validateRadius(radius);
  }
  update(p: StreamPoint): StreamDelta {
    const next = new Set(sectorsAround(p, this.sectorMeters, this.radius).map((s) => s.key));
    const loaded = [...next].filter((k) => !this.activeSet.has(k)).sort();
    const unloaded = [...this.activeSet].filter((k) => !next.has(k)).sort();
    this.activeSet = next;
    return { loaded, unloaded, active: [...next].sort() };
  }
  active(key: string): boolean { return this.activeSet.has(key); }
}

export function groupBySector<T extends StreamPoint>(items: readonly T[], sectorMeters: number): Map<string, T[]> {
  validateSectorMeters(sectorMeters);
  const out = new Map<string, T[]>();
  for (const item of items) {
    const key = sectorAt(item, sectorMeters).key;
    const bucket = out.get(key) ?? [];
    bucket.push(item);
    out.set(key, bucket);
  }
  return out;
}
