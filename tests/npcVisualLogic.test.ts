import { describe, expect, it } from 'vitest';
import { npcModelAssetId, npcYawTowardPlayer } from '../src/render/npcVisualLogic';

describe('npcModelAssetId', () => {
    const assets = { npc: {}, player: {}, npc_diablica_espejo: {} };

    it('uses the configured model when its asset exists', () => {
        expect(npcModelAssetId('npc_diablica_espejo', assets)).toBe('npc_diablica_espejo');
    });

    it('uses the generic NPC model when no model is configured', () => {
        expect(npcModelAssetId(undefined, assets)).toBe('npc');
    });

    it('uses the generic NPC model when the configured asset is missing', () => {
        expect(npcModelAssetId('missing_model', assets)).toBe('npc');
    });
});

describe('npcYawTowardPlayer', () => {
    it('faces east when the player is east', () => {
        expect(npcYawTowardPlayer(0, 0, 1, 0)).toBeCloseTo(0);
    });

    it('faces south when the player is south', () => {
        expect(npcYawTowardPlayer(0, 0, 0, 1)).toBeCloseTo(-Math.PI / 2);
    });

    it('faces west when the player is west', () => {
        expect(npcYawTowardPlayer(0, 0, -1, 0)).toBeCloseTo(-Math.PI);
    });

    it('faces north when the player is north', () => {
        expect(npcYawTowardPlayer(0, 0, 0, -1)).toBeCloseTo(Math.PI / 2);
    });
});
