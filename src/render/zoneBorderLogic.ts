export interface ZoneBorderCell {
    x: number;
    z: number;
    size: number;
}

export interface ZoneBorderPoint {
    x: number;
    z: number;
    offsetX: number;
    offsetZ: number;
}

export function zoneBorderPoints(cell: ZoneBorderCell): ZoneBorderPoint[] {
    const x0 = cell.x * cell.size;
    const z0 = cell.z * cell.size;
    const steps = Math.ceil(cell.size);
    const points: ZoneBorderPoint[] = [];
    const add = (x: number, z: number, offsetX: number, offsetZ: number): void => {
        points.push({ x, z, offsetX, offsetZ });
    };

    for (let i = 0; i < steps; i++)
        add(x0 + (cell.size * i) / steps, z0, i === 0 ? -1 : 0, -1);
    for (let i = 0; i < steps; i++)
        add(x0 + cell.size, z0 + (cell.size * i) / steps, 1, i === 0 ? -1 : 0);
    for (let i = 0; i < steps; i++)
        add(x0 + cell.size - (cell.size * i) / steps, z0 + cell.size, i === 0 ? 1 : 0, 1);
    for (let i = 0; i < steps; i++)
        add(x0, z0 + cell.size - (cell.size * i) / steps, -1, i === 0 ? 1 : 0);

    points.push({ ...points[0]! });
    return points;
}