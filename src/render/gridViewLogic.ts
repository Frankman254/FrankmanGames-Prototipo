import type { NavGrid } from '../sim/navGrid';

export interface GridCellToDraw {
    x0: number;
    z0: number;
    alpha: number;
    walkable: boolean;
}

export function gridCellsToDraw(grid: NavGrid, x: number, z: number, radius: number): GridCellToDraw[] {
    const s = grid.cellSize;
    const cx0 = Math.max(0, Math.floor((x - radius - grid.originX) / s));
    const cx1 = Math.min(grid.cols - 1, Math.floor((x + radius - grid.originX) / s));
    const cy0 = Math.max(0, Math.floor((z - radius - grid.originY) / s));
    const cy1 = Math.min(grid.rows - 1, Math.floor((z + radius - grid.originY) / s));
    const cells: GridCellToDraw[] = [];
    for (let cy = cy0; cy <= cy1; cy++) {
        for (let cx = cx0; cx <= cx1; cx++) {
            const x0 = grid.originX + cx * s;
            const z0 = grid.originY + cy * s;
            const alpha = Math.max(0, 1 - Math.hypot(x0 + s / 2 - x, z0 + s / 2 - z) / radius);
            if (alpha <= 0) continue;
            cells.push({ x0, z0, alpha, walkable: grid.walkableCell(cx, cy) });
        }
    }
    return cells;
}
