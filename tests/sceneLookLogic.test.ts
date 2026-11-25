import { describe, expect, it } from 'vitest';
import { DEV_VISUAL_DEFAULTS, type DevVisual } from '../src/render/devVisual';
import { gradeUniforms, sceneLookParameters } from '../src/render/sceneLookLogic';

const visual = (patch: Partial<DevVisual> = {}): DevVisual => ({ ...DEV_VISUAL_DEFAULTS, ...patch });

describe('sceneLookParameters', () => {
    it('maps ACES options to the scene post-process parameters', () => {
        expect(sceneLookParameters(visual(), false)).toEqual({
            postProcess: true,
            toneMappingEnabled: true,
            exposure: 1.3,
            contrast: 1.18,
            colorCurvesEnabled: true,
            vignetteEnabled: true,
            vignetteWeight: 0.35 * 3,
        });
    });

    it('uses neutral exposure and contrast when tone mapping is disabled', () => {
        expect(sceneLookParameters(visual({ tonemap: 'ninguna', exposure: 1.7, contrast: 1.4 }), false)).toEqual({
            postProcess: false,
            toneMappingEnabled: false,
            exposure: 1,
            contrast: 1,
            colorCurvesEnabled: false,
            vignetteEnabled: false,
            vignetteWeight: 0.35 * 3,
        });
    });

    it('keeps tone mapping parameters when the paint pass owns post-processing', () => {
        expect(
            sceneLookParameters(
                visual({ tonemap: 'neutra', exposure: 1.5, contrast: 0.95, vibrance: 0, vignette: 0 }),
                true,
            ),
        ).toEqual({
            postProcess: false,
            toneMappingEnabled: true,
            exposure: 1.5,
            contrast: 0.95,
            colorCurvesEnabled: false,
            vignetteEnabled: false,
            vignetteWeight: 0,
        });
    });
});

describe('gradeUniforms', () => {
    it('maps each tone curve and its values to the paint shader uniforms', () => {
        expect(gradeUniforms(visual())).toEqual({ mode: 1, grade: [1.3, 1.18, 1.2, 0.35] });
        expect(gradeUniforms(visual({ tonemap: 'neutra' }))).toEqual({
            mode: 2,
            grade: [1.3, 1.18, 1.2, 0.35],
        });
        expect(gradeUniforms(visual({ tonemap: 'ninguna' }))).toEqual({ mode: 0, grade: [1, 1, 1, 0] });
    });
});
