import { describe, expect, it } from 'vitest';
import { NavGrid } from '../src/sim/navGrid';
import { gridCellsToDraw } from '../src/render/gridViewLogic';

describe('gridCellsToDraw', () => {
    it('clips cells to the grid and omits cells at or beyond the fade radius', () => {
        const grid = new NavGrid(4, 4, 1);
        grid.applyPaint({ cellSize: 1, blocked: [[0, 1, 1]], cleared: [] });

        expect(gridCellsToDraw(grid, 0.5, 0.5, 2)).toEqual([
            { x0: 0, z0: 0, alpha: 1, walkable: true },
            { x0: 1, z0: 0, alpha: 0.5, walkable: false },
            { x0: 0, z0: 1, alpha: 0.5, walkable: true },
            { x0: 1, z0: 1, alpha: 1 - Math.SQRT2 / 2, walkable: true },
        ]);
    });

    it('uses the grid origin when selecting world-space cells', () => {
        const grid = new NavGrid(3, 3, 1, -2, -2);
        const cells = gridCellsToDraw(grid, -1.5, -1.5, 1.5);

        expect(cells).toMatchObject([
            { x0: -2, z0: -2, alpha: 1, walkable: true },
            { x0: -1, z0: -2, walkable: true },
            { x0: -2, z0: -1, walkable: true },
            { x0: -1, z0: -1, alpha: 1 - Math.SQRT2 / 1.5, walkable: true },
        ]);
        expect(cells[1]!.alpha).toBeCloseTo(1 / 3, 14);
        expect(cells[2]!.alpha).toBeCloseTo(1 / 3, 14);
    });
});
