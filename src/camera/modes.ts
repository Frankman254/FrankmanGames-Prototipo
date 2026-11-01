import { moveAngleTowards, wrapDegrees } from './damping';
import type { CameraMode, CameraPoint, CameraPose, CameraThreat, CameraTuning } from './types';

export interface ModeInput {
  mode: CameraMode;
  target: CameraPoint;
  threats: readonly CameraThreat[];
  pose: CameraPose;
  dt: number;
  manualPause: number;
  tuning: CameraTuning;
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
    return { focus: { x: Math.floor(target.x / s) * s + s / 2, y: target.y, z: Math.floor(target.z / s) * s + s / 2 }, pose };
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
