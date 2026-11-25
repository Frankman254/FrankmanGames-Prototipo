import { describe, expect, it } from 'vitest';
import { mapEnemyMarkers } from '../../src/ui/map/mapFeedLogic';

describe('mapEnemyMarkers', () => {
    it('sends live enemy positions with colors based on player-level difference', () => {
        const enemies = [
            { pos: { x: 4, y: 8 }, level: 8, state: 'idle' },
            { pos: { x: 12, y: 16 }, level: 12, state: 'combat' },
            { pos: { x: 20, y: 24 }, level: 40, state: 'dead' },
        ];
        const colors = [
            { minDiff: -10, color: '#80c070' },
            { minDiff: 2, color: '#e05050' },
        ];

        expect(mapEnemyMarkers(enemies, 10, colors)).toEqual([
            { x: 4, y: 8, color: '#80c070' },
            { x: 12, y: 16, color: '#e05050' },
        ]);
    });
});
