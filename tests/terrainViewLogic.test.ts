import { describe, expect, it } from 'vitest';
import { terrainChunkUpdate } from '../src/render/terrainViewLogic';

const detail = {
    chunkMeters: 10,
    margin: 5,
    levels: [
        { step: 1, until: 10 },
        { step: 2, until: 20 },
        { step: 4, until: 100 },
    ],
};

const chunk = { x0: 0, z0: 0, size: 10 };

function update(
    playerX: number,
    playerZ: number,
    currentLevel = -1,
    hasMesh = false,
    budget = Number.POSITIVE_INFINITY,
) {
    return terrainChunkUpdate({ detail, chunk, playerX, playerZ, currentLevel, hasMesh, budget });
}

describe('terrainChunkUpdate', () => {
    it('chooses detail from distance to the nearest point of the chunk', () => {
        expect(update(5, 5).level).toBe(0);
        expect(update(25, 5).level).toBe(1);
        expect(update(21, 22).level).toBe(1);
    });

    it('keeps the current detail within the downgrade margin and upgrades immediately', () => {
        expect(update(24, 5, 0).level).toBe(0);
        expect(update(25.1, 5, 0).level).toBe(1);
        expect(update(19.9, 5, 1).level).toBe(0);
    });

    it('builds a mesh when its target detail changes and leaves unchanged chunks alone', () => {
        expect(update(5, 5)).toEqual({ level: 0, build: true, budget: Number.POSITIVE_INFINITY });
        expect(update(5, 5, 0, true, 1)).toEqual({ level: 0, build: false, budget: 1 });
    });

    it('allows two missing meshes after the existing rebuild budget is spent', () => {
        expect(update(25.1, 5, 0, true, 1)).toEqual({ level: 1, build: true, budget: 0 });
        expect(update(25.1, 5, 0, true, 0)).toEqual({ level: 1, build: false, budget: 0 });
        expect(update(5, 5, -1, false, 0)).toEqual({ level: 0, build: true, budget: -1 });
        expect(update(5, 5, -1, false, -1)).toEqual({ level: 0, build: true, budget: -2 });
        expect(update(5, 5, -1, false, -2)).toEqual({ level: 0, build: false, budget: -2 });
    });
});
