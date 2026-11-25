export function aimGhostPlacement(
    to: { x: number; y: number },
    groundY: number,
): { x: number; z: number; groundY: number; ringY: number; lineY: number } {
    return {
        x: to.x,
        z: to.y,
        groundY,
        ringY: groundY + 0.07,
        lineY: groundY + 0.12,
    };
}
