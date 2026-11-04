import { moveAngleTowards, wrapDegrees } from './damping';
import { fitZoneCell, ZONE_VIEW_MARGIN, type ZoneCell } from './framing';
import type { CameraMode, CameraPoint, CameraPose, CameraThreat, CameraTuning } from './types';

export interface ModeInput {
  mode: CameraMode;
  target: CameraPoint;
  threats: readonly CameraThreat[];
  pose: CameraPose;
  dt: number;
  manualPause: number;
  tuning: CameraTuning;
  /** Casilla vigente de la cámara estática y datos para encuadrarla. */
  zone?: { cell: ZoneCell; fovDeg: number; aspect: number };
}

export interface ModeTarget { focus: CameraPoint; pose: CameraPose }

function bounds(target: CameraPoint, threats: readonly CameraThreat[]): { x: number; z: number; radius: number } {
  let minX = target.x, maxX = target.x, minZ = target.z, maxZ = target.z;
  for (const t of threats) {
    const r = t.radius ?? 0;
    minX = Math.min(minX, t.x - r); maxX = Math.max(maxX, t.x + r);
    minZ = Math.min(minZ, t.z - r); maxZ = Math.max(maxZ, t.z + r);
  }
  return { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2, radius: Math.max(maxX - minX, maxZ - minZ) / 2 };
}

export function modeTarget(input: ModeInput): ModeTarget {
  const { mode, target, threats, pose, tuning } = input;
  if (mode === 'zone') {
    const s = Math.max(4, tuning.zoneCellSize);
    const cell = input.zone?.cell ?? { x: Math.floor(target.x / s), z: Math.floor(target.z / s), size: s };
    const cx = cell.x * s + s / 2, cz = cell.z * s + s / 2;
    if (!input.zone) return { focus: { x: cx, y: target.y, z: cz }, pose };
    const fit = fitZoneCell(s * (1 + 2 * ZONE_VIEW_MARGIN), pose.yawDeg, pose.pitchDeg, input.zone.fovDeg, input.zone.aspect);
    const yaw = pose.yawDeg * Math.PI / 180;
    return { focus: { x: cx + Math.sin(yaw) * fit.shift, y: target.y, z: cz + Math.cos(yaw) * fit.shift }, pose: { ...pose, distance: fit.distance } };
  }
  if ((mode === 'autoFocus' || mode === 'smart') && threats.length) {
    const b = bounds(target, threats);
    const focus = { x: b.x, y: target.y, z: b.z };
    let desiredYaw = pose.yawDeg;
    if (mode === 'smart' && input.manualPause <= 0) {
      const nearest = threats.reduce((a, c) => Math.hypot(c.x - target.x, c.z - target.z) < Math.hypot(a.x - target.x, a.z - target.z) ? c : a);
      const ideal = wrapDegrees(Math.atan2(nearest.x - target.x, nearest.z - target.z) * 180 / Math.PI + 180);
      desiredYaw = moveAngleTowards(pose.yawDeg, ideal, tuning.smartTurnRateDeg * input.dt);
    }
    return { focus, pose: { yawDeg: desiredYaw, pitchDeg: pose.pitchDeg, distance: Math.max(pose.distance, 9 + b.radius * 1.6) } };
  }
  return { focus: target, pose };
}
