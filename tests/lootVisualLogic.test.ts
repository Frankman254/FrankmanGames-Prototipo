import { describe, expect, it } from 'vitest';
import { RARITIES } from '../src/rpg/contracts';
import { lootVisualState, type LootVisualInput } from '../src/render/lootVisualLogic';

const input = (overrides: Partial<LootVisualInput> = {}): LootVisualInput => ({
    id: 0,
    item: true,
    rarity: 'common',
    beamFromRarity: 'rare',
    time: 0,
    frameSeconds: 0,
    sparkleTimer: 2,
    glow: 0.6,
    ...overrides,
});

describe('lootVisualState', () => {
    it('chooses a bag or chest at the configured rarity threshold', () => {
        expect(lootVisualState(input({ rarity: 'uncommon' }))).toMatchObject({ kind: 'bag', hasBeam: false });
        expect(lootVisualState(input({ rarity: 'rare' }))).toMatchObject({ kind: 'chest', hasBeam: true });
        expect(lootVisualState(input({ rarity: 'legendary' }))).toMatchObject({ kind: 'chest', hasBeam: true });
    });

    it('keeps coins without a beam and uses their gold sparkle color', () => {
        expect(lootVisualState(input({ item: false, rarity: 'legendary' }))).toMatchObject({
            kind: 'coins',
            hasBeam: false,
            sparkleColor: 'gold',
        });
    });

    it('increases sparkle frequency with rarity', () => {
        const remaining = RARITIES.map((rarity) => lootVisualState(input({ rarity, frameSeconds: 0.1 })).sparkleTimer);
        expect(remaining).toEqual([1.9, 1.8, 1.7, 1.6, 1.5]);
    });

    it('resets the sparkle timer when it expires', () => {
        expect(lootVisualState(input({ frameSeconds: 0.5, sparkleTimer: 0.2 }))).toMatchObject({
            sparkleTimer: 1.2,
            sparkle: true,
        });
        expect(lootVisualState(input({ frameSeconds: 0.1, sparkleTimer: 2 }))).toMatchObject({
            sparkleTimer: 1.9,
            sparkle: false,
        });
    });

    it('preserves the bob, spin and rarity glow pulses', () => {
        expect(lootVisualState(input())).toMatchObject({
            spinY: 0.05,
            spinRotationY: 0,
            glowAlpha: 0.36,
            beamAlpha: 0.25,
        });
        expect(lootVisualState(input({ time: Math.PI / 8 })).glowAlpha).toBeCloseTo(0.6);
        expect(lootVisualState(input({ time: (3 * Math.PI) / 8 })).glowAlpha).toBeCloseTo(0.12);
    });
});
