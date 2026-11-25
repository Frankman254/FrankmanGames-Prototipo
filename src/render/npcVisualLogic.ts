export function npcModelAssetId<T>(model: string | undefined, assets: Record<string, T>): string {
    return model && assets[model] ? model : 'npc';
}

export function npcYawTowardPlayer(npcX: number, npcZ: number, playerX: number, playerZ: number): number {
    return -Math.atan2(playerZ - npcZ, playerX - npcX);
}
