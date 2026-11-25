import { RARITIES, type Rarity } from '../rpg/contracts';

export interface LootVisualInput {
    id: number;
    item: boolean;
    rarity: Rarity;
    beamFromRarity: Rarity;
    time: number;
    frameSeconds: number;
    sparkleTimer: number;
    glow: number;
}

export interface LootVisualState {
    kind: 'coins' | 'chest' | 'bag';
    hasBeam: boolean;
    spinY: number;
    spinRotationY: number;
    glowAlpha: number;
    beamAlpha: number;
    sparkleTimer: number;
    sparkle: boolean;
    sparkleColor: 'rarity' | 'gold';
}

export function lootVisualState(input: LootVisualInput): LootVisualState {
    const phase = input.id * 1.7;
    const rarityIndex = RARITIES.indexOf(input.rarity);
    const aboveBeamThreshold = rarityIndex >= RARITIES.indexOf(input.beamFromRarity);
    const hasBeam = input.item && aboveBeamThreshold;
    const nextSparkleTimer = input.sparkleTimer - input.frameSeconds * (1 + rarityIndex);
    const sparkle = nextSparkleTimer <= 0;

    return {
        kind: !input.item ? 'coins' : aboveBeamThreshold ? 'chest' : 'bag',
        hasBeam,
        spinY: 0.05 + Math.sin(input.time * 3 + phase) * 0.05,
        spinRotationY: input.item ? Math.sin(input.time * 0.8 + phase) * 0.5 : input.time * 2.5 + phase,
        glowAlpha: input.glow * (0.6 + 0.4 * Math.sin(input.time * 4 + phase)),
        beamAlpha: 0.25 + 0.12 * Math.sin(input.time * 2 + phase),
        sparkleTimer: sparkle ? 1.2 : nextSparkleTimer,
        sparkle,
        sparkleColor: input.item ? 'rarity' : 'gold',
    };
}
