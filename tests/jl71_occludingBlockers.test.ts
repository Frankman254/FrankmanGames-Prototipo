import { describe, it, expect } from 'vitest';
import { blockersOccludingRay } from '../src/camera/collision';

describe('JL-71: blockersOccludingRay', () => {
    // Rayo desde (0,2,0) hacia (0,1,10) — cámara a 10 m del foco, mirando hacia +Z.
    const ray = { x: 0, y: 2, z: 0, dx: 0, dy: 0, dz: 1 };

    it('sin blockers, no hay oclusión', () => {
        const result = blockersOccludingRay(ray, 10, 3, []);
        expect(result).toEqual([]);
    });

    it('blocker detrás del objetivo no tapa', () => {
        // Blocker a t=1 (antes del objetivo a t=3).
        const blockers = [{ x: 0, z: 1, halfWidth: 1, halfDepth: 1, top: 5 }];
        const result = blockersOccludingRay(ray, 10, 3, blockers);
        expect(result).toEqual([]);
    });

    it('blocker entre objetivo y cámara sí tapa', () => {
        // Blocker a t=6 (entre objetivo a t=3 y cámara a t=10).
        const blockers = [{ x: 0, z: 6, halfWidth: 1, halfDepth: 1, top: 5 }];
        const result = blockersOccludingRay(ray, 10, 3, blockers);
        expect(result).toEqual([0]);
    });

    it('blocker más allá de la cámara no tapa', () => {
        // Blocker a t=15 (más allá de la cámara a t=10).
        const blockers = [{ x: 0, z: 15, halfWidth: 1, halfDepth: 1, top: 5 }];
        const result = blockersOccludingRay(ray, 10, 3, blockers);
        expect(result).toEqual([]);
    });

    it('blocker fuera del rayo no tapa', () => {
        // Blocker a t=6 pero desplazado en X.
        const blockers = [{ x: 5, z: 6, halfWidth: 1, halfDepth: 1, top: 5 }];
        const result = blockersOccludingRay(ray, 10, 3, blockers);
        expect(result).toEqual([]);
    });

    it('blocker muy alto no tapa (rayo pasa por debajo)', () => {
        // Blocker a t=6 pero con top=0 (el rayo está a y=2).
        const blockers = [{ x: 0, z: 6, halfWidth: 1, halfDepth: 1, top: 0 }];
        const result = blockersOccludingRay(ray, 10, 3, blockers);
        expect(result).toEqual([]);
    });

    it('múltiples blockers, devuelve los índices correctos', () => {
        const blockers = [
            { x: 0, z: 1, halfWidth: 1, halfDepth: 1, top: 5 }, // t=1, antes del objetivo
            { x: 0, z: 5, halfWidth: 1, halfDepth: 1, top: 5 }, // t=5, entre objetivo y cámara
            { x: 5, z: 7, halfWidth: 1, halfDepth: 1, top: 5 }, // t=7, fuera del rayo
            { x: 0, z: 8, halfWidth: 1, halfDepth: 1, top: 5 }, // t=8, entre objetivo y cámara
        ];
        const result = blockersOccludingRay(ray, 10, 3, blockers);
        expect(result).toEqual([1, 3]);
    });

    it('rayo con inclinación vertical', () => {
        // Rayo sube: desde (0,0,0) hacia (0,1,1).
        const upRay = { x: 0, y: 0, z: 0, dx: 0, dy: 0.5, dz: 0.5 };
        // Blocker a t=6, y = 0 + 0.5*6 = 3. Top=4 → el rayo está bajo el top.
        const blockers = [{ x: 0, z: 3, halfWidth: 1, halfDepth: 1, top: 4 }];
        const result = blockersOccludingRay(upRay, 10, 3, blockers);
        expect(result).toEqual([0]);
    });

    it('rayo paralelo al eje Z con dx=0', () => {
        // Rayo paralelo a Z, dx=0. Blocker cubre x=0.
        const parallelRay = { x: 0, y: 2, z: 0, dx: 0, dy: 0, dz: 1 };
        const blockers = [{ x: 0, z: 6, halfWidth: 2, halfDepth: 2, top: 5 }];
        const result = blockersOccludingRay(parallelRay, 10, 3, blockers);
        expect(result).toEqual([0]);
    });

    it('blocker justo en el límite del objetivo no tapa', () => {
        // Blocker a t=3 (exactamente en el objetivo). entry < targetDist → no cuenta.
        const blockers = [{ x: 0, z: 3, halfWidth: 0.5, halfDepth: 0.5, top: 5 }];
        const result = blockersOccludingRay(ray, 10, 3, blockers);
        expect(result).toEqual([]);
    });
});
