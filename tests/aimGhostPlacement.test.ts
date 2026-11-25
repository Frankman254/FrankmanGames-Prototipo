import { describe, expect, it } from 'vitest';
import { aimGhostPlacement } from '../src/render/fx/aimGhostPlacement';

describe('aimGhostPlacement', () => {
    it('maps the destination onto the render axes and layers the ghost, ring, and line', () => {
        const placement = aimGhostPlacement({ x: 4.5, y: -2.75 }, 3.2);

        expect(placement).toMatchObject({
            x: 4.5,
            z: -2.75,
            groundY: 3.2,
        });
        expect(placement.ringY).toBeCloseTo(3.27);
        expect(placement.lineY).toBeCloseTo(3.32);
    });

    it('preserves zero and negative terrain heights without clamping', () => {
        const placement = aimGhostPlacement({ x: 0, y: 0 }, -1);

        expect(placement).toMatchObject({
            x: 0,
            z: 0,
            groundY: -1,
        });
        expect(placement.ringY).toBeCloseTo(-0.93);
        expect(placement.lineY).toBeCloseTo(-0.88);
    });
});
