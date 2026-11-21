export interface CameraBlocker {
    x: number;
    z: number;
    halfWidth: number;
    halfDepth: number;
    top: number;
}
export interface CameraRay {
    x: number;
    y: number;
    z: number;
    dx: number;
    dy: number;
    dz: number;
}

/** Distancia analítica hasta la primera caja; evita el muestreo brusco por pasos. */
export function distanceBeforeBlocker(
    ray: CameraRay,
    desired: number,
    blockers: readonly CameraBlocker[],
    padding = 0.35,
): number {
    let best = desired;
    for (const b of blockers) {
        const minX = b.x - b.halfWidth,
            maxX = b.x + b.halfWidth;
        const minZ = b.z - b.halfDepth,
            maxZ = b.z + b.halfDepth;
        let lo = 0,
            hi = desired;
        for (const [origin, dir, min, max] of [
            [ray.x, ray.dx, minX, maxX],
            [ray.z, ray.dz, minZ, maxZ],
        ] as const) {
            if (Math.abs(dir) < 1e-9) {
                if (origin < min || origin > max) {
                    lo = 1;
                    hi = 0;
                    break;
                }
                continue;
            }
            const a = (min - origin) / dir,
                c = (max - origin) / dir;
            lo = Math.max(lo, Math.min(a, c));
            hi = Math.min(hi, Math.max(a, c));
        }
        if (lo <= hi && hi >= 0) {
            const t = Math.max(0, lo);
            if (t <= desired && ray.y + ray.dy * t <= b.top) best = Math.min(best, Math.max(0, t - padding));
        }
    }
    return best;
}

/**
 * Devuelve los índices de los blockers que tapan el rayo entre la cámara (en `cameraDist`)
 * y el foco (en t=0). Solo los que están entre ambos y cuya caja intersecta el rayo.
 * `targetDist` es la distancia del foco a la cámara (un punto intermedio, p. ej. el personaje).
 */
export function blockersOccludingRay(
    ray: CameraRay,
    cameraDist: number,
    targetDist: number,
    blockers: readonly CameraBlocker[],
): number[] {
    const occluding: number[] = [];
    // El rayo va desde el foco (t=0) hacia la cámara (t=cameraDist).
    // El objetivo está a targetDist del foco.
    // Un blocker tapa si intersecta el rayo entre targetDist y cameraDist.
    for (let i = 0; i < blockers.length; i++) {
        const b = blockers[i]!;
        const minX = b.x - b.halfWidth,
            maxX = b.x + b.halfWidth;
        const minZ = b.z - b.halfDepth,
            maxZ = b.z + b.halfDepth;
        let lo = 0,
            hi = cameraDist;
        let valid = true;
        for (const [origin, dir, min, max] of [
            [ray.x, ray.dx, minX, maxX],
            [ray.z, ray.dz, minZ, maxZ],
        ] as const) {
            if (Math.abs(dir) < 1e-9) {
                if (origin < min || origin > max) {
                    valid = false;
                    break;
                }
                continue;
            }
            const a = (min - origin) / dir,
                c = (max - origin) / dir;
            lo = Math.max(lo, Math.min(a, c));
            hi = Math.min(hi, Math.max(a, c));
        }
        if (!valid || lo > hi || hi < 0) continue;
        // El bloqueador debe estar entre el objetivo y la cámara.
        const entry = Math.max(0, lo);
        const exit = Math.min(cameraDist, hi);
        if (entry >= exit) continue;
        // Solo cuenta si el entry está después del objetivo (entre objetivo y cámara).
        if (entry < targetDist) continue;
        // Verificar altura: la intersección debe estar bajo el top del blocker.
        const intersectY = ray.y + ray.dy * entry;
        if (intersectY > b.top) continue;
        occluding.push(i);
    }
    return occluding;
}
