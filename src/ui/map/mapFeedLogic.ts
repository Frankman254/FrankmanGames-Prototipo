import type { LevelColorDef } from '../../data/zonesSchema';
import { levelColor } from '../../sim/zones';

export interface MapEnemyMarkerInput {
    pos: { x: number; y: number };
    level: number;
    state: string;
}

export function mapEnemyMarkers(
    enemies: readonly MapEnemyMarkerInput[],
    playerLevel: number,
    colors: readonly LevelColorDef[],
): Array<{ x: number; y: number; color: string }> {
    return enemies
        .filter((e) => e.state !== 'dead')
        .map((e) => ({ x: e.pos.x, y: e.pos.y, color: levelColor(e.level - playerLevel, colors) }));
}
