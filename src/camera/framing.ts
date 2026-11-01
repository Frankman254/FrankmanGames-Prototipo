import type { CameraPose } from './types';

export type FramingId = 'default' | 'top' | 'close' | 'isometric' | 'cinematic';

export const DEFAULT_FRAMINGS: Readonly<Record<FramingId, CameraPose>> = {
  default: { yawDeg: 0, pitchDeg: 42, distance: 16 },
  top: { yawDeg: 0, pitchDeg: 78, distance: 21 },
  close: { yawDeg: 0, pitchDeg: 28, distance: 8 },
  isometric: { yawDeg: 45, pitchDeg: 46, distance: 17 },
  cinematic: { yawDeg: 25, pitchDeg: 21, distance: 12 },
};

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
