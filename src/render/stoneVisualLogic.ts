export interface StoneVisualState {
    material: 'lit' | 'dim';
    rotationSpeed: number;
    bobAmplitude: number;
}

export function stoneVisualState(known: boolean): StoneVisualState {
    return known
        ? { material: 'lit', rotationSpeed: 0.9, bobAmplitude: 0.12 }
        : { material: 'dim', rotationSpeed: 0.3, bobAmplitude: 0.04 };
}

export function stoneIdFromMesh(mesh: { metadata?: unknown } | null | undefined): string | null {
    const md = mesh?.metadata as { stoneId?: string } | undefined;
    return typeof md?.stoneId === 'string' ? md.stoneId : null;
}