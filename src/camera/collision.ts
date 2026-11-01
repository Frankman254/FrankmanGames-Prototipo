export interface CameraBlocker { x: number; z: number; halfWidth: number; halfDepth: number; top: number }
export interface CameraRay { x: number; y: number; z: number; dx: number; dy: number; dz: number }

/** Distancia analítica hasta la primera caja; evita el muestreo brusco por pasos. */
export function distanceBeforeBlocker(ray: CameraRay, desired: number, blockers: readonly CameraBlocker[], padding = 0.35): number {
  let best = desired;
  for (const b of blockers) {
    const minX = b.x - b.halfWidth, maxX = b.x + b.halfWidth;
    const minZ = b.z - b.halfDepth, maxZ = b.z + b.halfDepth;
    let lo = 0, hi = desired;
    for (const [origin, dir, min, max] of [[ray.x, ray.dx, minX, maxX], [ray.z, ray.dz, minZ, maxZ]] as const) {
      if (Math.abs(dir) < 1e-9) { if (origin < min || origin > max) { lo = 1; hi = 0; break; } continue; }
      const a = (min - origin) / dir, c = (max - origin) / dir;
      lo = Math.max(lo, Math.min(a, c)); hi = Math.min(hi, Math.max(a, c));
    }
    if (lo <= hi && hi >= 0) {
      const t = Math.max(0, lo);
      if (t <= desired && ray.y + ray.dy * t <= b.top) best = Math.min(best, Math.max(0, t - padding));
    }
  }
  return best;
}
