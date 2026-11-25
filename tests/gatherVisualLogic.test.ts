import { describe, expect, it } from 'vitest';
import { gatherVisualState } from '../src/render/gatherVisualLogic';

describe('gatherVisualState', () => {
    it('shows a full resource at normal size with its ring and selection enabled', () => {
        expect(gatherVisualState(0, 60, 'tree')).toEqual({
            state: 'full',
            depleted: false,
            scale: 1,
            ringEnabled: true,
            pickable: true,
        });
    });

    it('shows a just-spent rock as depleted at its existing scale', () => {
        expect(gatherVisualState(60, 60, 'rock')).toEqual({
            state: 'spent',
            depleted: true,
            scale: 0.55,
            ringEnabled: false,
            pickable: false,
        });
    });

    it('keeps regrowing trees and plants depleted until their timer reaches zero', () => {
        for (const shape of ['tree', 'plant'] as const) {
            expect(gatherVisualState(30, 60, shape)).toEqual({
                state: 'regrowing',
                depleted: true,
                scale: 0.35,
                ringEnabled: false,
                pickable: false,
            });
            expect(gatherVisualState(0, 60, shape).state).toBe('full');
        }
    });
});
