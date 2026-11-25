export type CryptFloorDestination = { kind: 'floor'; index: number; from: 'above' | 'below' };
export type CryptSurfaceDestination = { kind: 'surface' };

export function cryptStairDestination(currentFloor: number, direction: 'down'): CryptFloorDestination;
export function cryptStairDestination(
    currentFloor: number,
    direction: 'up',
): CryptFloorDestination | CryptSurfaceDestination;
export function cryptStairDestination(
    currentFloor: number,
    direction: 'up' | 'down',
): CryptFloorDestination | CryptSurfaceDestination {
    if (direction === 'up' && currentFloor === 0) return { kind: 'surface' };
    return direction === 'up'
        ? { kind: 'floor', index: currentFloor - 1, from: 'below' }
        : { kind: 'floor', index: currentFloor + 1, from: 'above' };
}
