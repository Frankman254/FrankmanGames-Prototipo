import type { DevVisual } from './devVisual';

export interface SceneLookParameters {
    postProcess: boolean;
    toneMappingEnabled: boolean;
    exposure: number;
    contrast: number;
    colorCurvesEnabled: boolean;
    vignetteEnabled: boolean;
    vignetteWeight: number;
}

export function sceneLookParameters(v: DevVisual, inPaint: boolean): SceneLookParameters {
    const toneMappingEnabled = v.tonemap !== 'ninguna';
    return {
        postProcess: toneMappingEnabled && !inPaint,
        toneMappingEnabled,
        exposure: toneMappingEnabled ? v.exposure : 1,
        contrast: toneMappingEnabled ? v.contrast : 1,
        colorCurvesEnabled: toneMappingEnabled && v.vibrance > 0,
        vignetteEnabled: toneMappingEnabled && v.vignette > 0,
        vignetteWeight: v.vignette * 3,
    };
}

/** Cifras del revelado para el pase de pintura: modo (0 nada, 1 ACES, 2 neutra) y vec4. */
export function gradeUniforms(v: DevVisual): { mode: number; grade: [number, number, number, number] } {
    if (v.tonemap === 'ninguna') return { mode: 0, grade: [1, 1, 1, 0] };
    return {
        mode: v.tonemap === 'aces' ? 1 : 2,
        grade: [v.exposure, v.contrast, 1 + v.vibrance / 100, v.vignette],
    };
}
