import type { GatherNodeDef } from '../rpg/professions';

export interface GatherNodeVisualState {
    state: 'full' | 'spent' | 'regrowing';
    depleted: boolean;
    scale: number;
    ringEnabled: boolean;
    pickable: boolean;
}

export function gatherVisualState(
    respawn: number,
    respawnSeconds: number,
    shape: GatherNodeDef['shape'],
): GatherNodeVisualState {
    const depleted = respawn > 0;
    const state = !depleted ? 'full' : respawn >= respawnSeconds ? 'spent' : 'regrowing';

    return {
        state,
        depleted,
        scale: depleted ? (shape === 'rock' ? 0.55 : 0.35) : 1,
        ringEnabled: !depleted,
        pickable: !depleted,
    };
}
