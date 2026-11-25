import { describe, expect, it } from 'vitest';
import { zoneBorderPoints } from '../src/render/zoneBorderLogic';

describe('zoneBorderPoints', () => {
    it('returns a closed outline with all four corners for a single cell', () => {
        const points = zoneBorderPoints({ x: 2, z: 3, size: 1 });

        expect(points).toEqual([
            { x: 2, z: 3, offsetX: -1, offsetZ: -1 },
            { x: 3, z: 3, offsetX: 1, offsetZ: -1 },
            { x: 3, z: 4, offsetX: 1, offsetZ: 1 },
            { x: 2, z: 4, offsetX: -1, offsetZ: 1 },
            { x: 2, z: 3, offsetX: -1, offsetZ: -1 },
        ]);
    });

    it('subdivides each side by ceil(size) and closes the same path', () => {
        const points = zoneBorderPoints({ x: 2, z: -1, size: 2.5 });

        expect(points).toHaveLength(13);
        expect(points[0]).toEqual({ x: 5, z: -2.5, offsetX: -1, offsetZ: -1 });
        expect(points[3]).toEqual({ x: 7.5, z: -2.5, offsetX: 1, offsetZ: -1 });
        expect(points[6]).toEqual({ x: 7.5, z: 0, offsetX: 1, offsetZ: 1 });
        expect(points[9]).toEqual({ x: 5, z: 0, offsetX: -1, offsetZ: 1 });
        expect(points[1]!.x).toBeCloseTo(5 + 2.5 / 3);
        expect(points[4]!.z).toBeCloseTo(-2.5 + 2.5 / 3);
        expect(points.at(-1)).toEqual(points[0]);
    });
});