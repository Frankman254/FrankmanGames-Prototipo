import { describe, expect, it } from 'vitest';
import { stoneIdFromMesh, stoneVisualState } from '../src/render/stoneVisualLogic';

describe('stoneVisualState', () => {
    it('uses the brighter, faster animation for a known stone', () => {
        expect(stoneVisualState(true)).toEqual({
            material: 'lit',
            rotationSpeed: 0.9,
            bobAmplitude: 0.12,
        });
    });

    it('uses the dimmer, slower animation for an unknown stone', () => {
        expect(stoneVisualState(false)).toEqual({
            material: 'dim',
            rotationSpeed: 0.3,
            bobAmplitude: 0.04,
        });
    });
});

describe('stoneIdFromMesh', () => {
    it('returns only string stone IDs from mesh metadata', () => {
        expect(stoneIdFromMesh({ metadata: { stoneId: 'raspadura' } })).toBe('raspadura');
        expect(stoneIdFromMesh({ metadata: { stoneId: 7 } })).toBeNull();
        expect(stoneIdFromMesh({ metadata: {} })).toBeNull();
        expect(stoneIdFromMesh(null)).toBeNull();
        expect(stoneIdFromMesh(undefined)).toBeNull();
    });
});