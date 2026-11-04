import type { CameraPose } from './types';

export type FramingId = 'default' | 'top' | 'close' | 'isometric' | 'cinematic';

export const DEFAULT_FRAMINGS: Readonly<Record<FramingId, CameraPose>> = {
  default: { yawDeg: 0, pitchDeg: 42, distance: 16 },
  top: { yawDeg: 0, pitchDeg: 78, distance: 21 },
  close: { yawDeg: 0, pitchDeg: 28, distance: 8 },
  isometric: { yawDeg: 45, pitchDeg: 46, distance: 17 },
  cinematic: { yawDeg: 25, pitchDeg: 21, distance: 12 },
};

/** Parte de la casilla vecina que queda a la vista, por lado: da margen para ver lo que viene. */
export const ZONE_VIEW_MARGIN = 0.1;
/** Metros que hay que pasar la frontera para cambiar de casilla: evita el vaivén al caminar por el borde. */
export const ZONE_SWITCH_HYSTERESIS = 1.5;

export interface ZoneCell { x: number; z: number; size: number }

/** Casilla de la cámara: se conserva la actual hasta pasar su borde con holgura. */
export function nextZoneCell(current: ZoneCell | null, x: number, z: number, size: number): ZoneCell {
  if (current && current.size === size) {
    const h = ZONE_SWITCH_HYSTERESIS;
    const inX = x >= current.x * size - h && x <= (current.x + 1) * size + h;
    const inZ = z >= current.z * size - h && z <= (current.z + 1) * size + h;
    if (inX && inZ) return current;
  }
  return { x: Math.floor(x / size), z: Math.floor(z / size), size };
}

/** Zona de la pantalla libre de interfaz, en coordenadas normalizadas (−1 a 1). */
export const ZONE_SAFE_AREA = { side: 0.94, top: 0.84, bottom: -0.62 };

/**
 * Distancia y desplazamiento del foco para que el cuadrado de lado `size` entre
 * completo en la zona libre y centrado en ella, con cualquier giro de cámara.
 */
export function fitZoneCell(size: number, yawDeg: number, pitchDeg: number, fovDeg: number, aspect: number): { distance: number; shift: number } {
  const yaw = yawDeg * Math.PI / 180, pitch = pitchDeg * Math.PI / 180;
  const sy = Math.sin(yaw), cy = Math.cos(yaw), sp = Math.sin(pitch), cp = Math.cos(pitch);
  const f = [sy * cp, -sp, cy * cp] as const;
  const r = [cy, 0, -sy] as const;
  const u = [f[1] * r[2] - f[2] * r[1], f[2] * r[0] - f[0] * r[2], f[0] * r[1] - f[1] * r[0]] as const;
  const t = Math.tan(fovDeg * Math.PI / 360);
  const half = size / 2;
  const safe = ZONE_SAFE_AREA;
  const ys = (distance: number, shift: number): { min: number; max: number; fits: boolean } => {
    // Cámara relativa al centro de la casilla, en el suelo; mira un metro por encima del foco.
    const cam = [shift * sy - f[0] * distance, 1 - f[1] * distance, shift * cy - f[2] * distance];
    let min = Infinity, max = -Infinity, fits = true;
    for (const [cx, cz] of [[-half, -half], [half, -half], [-half, half], [half, half]] as const) {
      const v = [cx - cam[0]!, -cam[1]!, cz - cam[2]!];
      const depth = v[0]! * f[0] + v[1]! * f[1] + v[2]! * f[2];
      if (depth <= 0.1) return { min: -9, max: 9, fits: false };
      const nx = (v[0]! * r[0] + v[2]! * r[2]) / depth / (t * aspect);
      const ny = (v[0]! * u[0] + v[1]! * u[1] + v[2]! * u[2]) / depth / t;
      min = Math.min(min, ny);
      max = Math.max(max, ny);
      if (Math.abs(nx) > safe.side) fits = false;
    }
    return { min, max, fits: fits && min >= safe.bottom && max <= safe.top };
  };
  const center = (safe.top + safe.bottom) / 2;
  let shift = 0, distance = size;
  for (let pass = 0; pass < 10; pass++) {
    let lo = 1, hi = size * 12;
    for (let i = 0; i < 26; i++) {
      const mid = (lo + hi) / 2;
      if (ys(mid, shift).fits) hi = mid; else lo = mid;
    }
    distance = hi;
    const y = ys(distance, shift);
    // Mirar más adelante baja la casilla en pantalla.
    shift += ((y.min + y.max) / 2 - center) * size * 0.5;
  }
  let lo = 1, hi = size * 12;
  for (let i = 0; i < 26; i++) {
    const mid = (lo + hi) / 2;
    if (ys(mid, shift).fits) hi = mid; else lo = mid;
  }
  return { distance: hi, shift };
}

export function normalizePose(raw: unknown, fallback: CameraPose): CameraPose {
  const v = raw && typeof raw === 'object' ? raw as Partial<CameraPose> : {};
  const num = (x: unknown, d: number): number => typeof x === 'number' && Number.isFinite(x) ? x : d;
  return {
    yawDeg: num(v.yawDeg, fallback.yawDeg),
    pitchDeg: Math.min(85, Math.max(5, num(v.pitchDeg, fallback.pitchDeg))),
    distance: Math.min(80, Math.max(2, num(v.distance, fallback.distance))),
  };
}

export function parseFramings(raw: unknown): Record<FramingId, CameraPose> {
  const obj = raw && typeof raw === 'object' ? raw as Partial<Record<FramingId, unknown>> : {};
  return Object.fromEntries((Object.keys(DEFAULT_FRAMINGS) as FramingId[]).map((id) => [id, normalizePose(obj[id], DEFAULT_FRAMINGS[id])])) as Record<FramingId, CameraPose>;
}

export function heldLongEnough(startMs: number, endMs: number, thresholdMs = 650): boolean {
  return Number.isFinite(startMs) && Number.isFinite(endMs) && endMs - startMs >= thresholdMs;
}
