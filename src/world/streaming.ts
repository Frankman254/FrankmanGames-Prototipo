export interface StreamPoint { x: number; y: number }
export interface StreamSector { x: number; y: number; key: string }

/** Presupuesto de cálculo, no regla de juego: impedir recorridos desmesurados. */
export const MAX_SECTOR_CANDIDATES = 65_536;

function validateSectorMeters(sectorMeters: number): void {
  if (!Number.isFinite(sectorMeters) || sectorMeters <= 0) throw new RangeError('sectorMeters debe ser finito y positivo');
}

function validateRadius(radius: number): void {
  if (!Number.isFinite(radius) || radius < 0) throw new RangeError('radius debe ser finito y no negativo');
}

function sectorRadius(sectorMeters: number, radius: number): number {
  validateSectorMeters(sectorMeters);
  validateRadius(radius);
  const cells = Math.ceil(radius / sectorMeters);
  if (!Number.isSafeInteger(cells) || (2 * cells + 1) ** 2 > MAX_SECTOR_CANDIDATES) {
    throw new RangeError('radius/sectorMeters excede el presupuesto de sectores');
  }
  return cells;
}

export function sectorAt(p: StreamPoint, sectorMeters: number): StreamSector {
  validateSectorMeters(sectorMeters);
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) throw new RangeError('StreamPoint debe ser finito');
  const x = Math.floor(p.x / sectorMeters);
  const y = Math.floor(p.y / sectorMeters);
  if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) throw new RangeError('Índice de sector fuera del rango seguro');
  return { x, y, key: `${x}:${y}` };
}

export function sectorsAround(p: StreamPoint, sectorMeters: number, radius: number): StreamSector[] {
  const cells = sectorRadius(sectorMeters, radius);
  const center = sectorAt(p, sectorMeters);
  if (![center.x - cells, center.x + cells, center.y - cells, center.y + cells].every(Number.isSafeInteger)) {
    throw new RangeError('Vecindad de sectores fuera del rango seguro');
  }
  const out: StreamSector[] = [];
  for (let y = center.y - cells; y <= center.y + cells; y++) for (let x = center.x - cells; x <= center.x + cells; x++) {
    const minX = x * sectorMeters, minY = y * sectorMeters;
    const dx = Math.max(minX - p.x, 0, p.x - (minX + sectorMeters));
    const dy = Math.max(minY - p.y, 0, p.y - (minY + sectorMeters));
    if (Math.hypot(dx, dy) <= radius) out.push({ x, y, key: `${x}:${y}` });
  }
  return out.sort((a, b) => a.y - b.y || a.x - b.x);
}

export interface StreamDelta { loaded: string[]; unloaded: string[]; active: string[] }

/** Modelo puro; el render decide cómo crear u ocultar vegetación y props. */
export class SectorStream {
  private activeSet = new Set<string>();
  constructor(readonly sectorMeters: number, readonly radius: number) {
    sectorRadius(sectorMeters, radius);
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
