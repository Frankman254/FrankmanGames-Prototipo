import { terrainLevel, type TerrainDetailDef } from '../world/detail';

export interface TerrainChunkBounds {
    x0: number;
    z0: number;
    size: number;
}

export interface TerrainChunkUpdateInput {
    detail: TerrainDetailDef;
    chunk: TerrainChunkBounds;
    playerX: number;
    playerZ: number;
    currentLevel: number;
    hasMesh: boolean;
    budget: number;
}

export interface TerrainChunkUpdate {
    level: number;
    build: boolean;
    budget: number;
}

export function terrainChunkUpdate(input: TerrainChunkUpdateInput): TerrainChunkUpdate {
    const { chunk, playerX, playerZ } = input;
    const dx = Math.max(chunk.x0 - playerX, 0, playerX - (chunk.x0 + chunk.size));
    const dz = Math.max(chunk.z0 - playerZ, 0, playerZ - (chunk.z0 + chunk.size));
    const level = terrainLevel(input.detail, Math.hypot(dx, dz), input.currentLevel);

    if (level === input.currentLevel) return { level, build: false, budget: input.budget };
    if (input.budget <= 0 && (input.hasMesh || input.budget <= -2)) {
        return { level, build: false, budget: input.budget };
    }
    return { level, build: true, budget: input.budget - 1 };
}
