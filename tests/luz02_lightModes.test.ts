// LUZ-02 y LUZ-03: modos de iluminación encima de la luz de la hora y luz propia del personaje.
import { describe, expect, it } from 'vitest';
import { applyLightMode, heroLightLevel, LIGHT_MODES } from '../src/render/lightModes';
import { normalizeDevVisual } from '../src/render/devVisual';
import { sampleLighting } from '../src/world/dayNight';
import lighting from '../data/lighting.json';
import type { LightingDef } from '../src/world/dayNight';

const def = lighting as unknown as LightingDef;
const noon = sampleLighting(def, 0.5);
const night = sampleLighting(def, 0);

describe('LUZ-02 modos de iluminación', () => {
    it('original no cambia nada', () => {
        expect(applyLightMode(noon, 'original')).toBe(noon);
    });

    it('de día, los modos dan más ambiente y un bajo más claro (sin zonas negras)', () => {
        for (const mode of LIGHT_MODES.filter((m) => m !== 'original')) {
            const s = applyLightMode(noon, mode);
            expect(s.ambient).toBeGreaterThan(noon.ambient);
            for (const i of [0, 1, 2] as const) {
                expect(s.groundColor[i]).toBeGreaterThan(noon.groundColor[i]);
                expect(s.groundColor[i]).toBeLessThanOrEqual(1);
            }
        }
    });

    it('de noche el rebote apenas cambia el bajo: la noche sigue siendo noche', () => {
        const s = applyLightMode(night, 'claro');
        const lift = s.groundColor[0] - night.groundColor[0];
        const dayLift = applyLightMode(noon, 'claro').groundColor[0] - noon.groundColor[0];
        expect(lift).toBeLessThan(dayLift);
    });

    it('lo guardado se valida: modo desconocido vuelve al propuesto', () => {
        expect(normalizeDevVisual({ lightMode: 'xx' }).lightMode).toBe('vivo');
        expect(normalizeDevVisual({ lightMode: 'calido', heroLight: false })).toMatchObject({
            lightMode: 'calido',
            heroLight: false,
        });
    });
});

describe('LUZ-03 luz propia del personaje', () => {
    it('de noche, entera; de día, tenue salvo en original; apagada si se quita', () => {
        expect(heroLightLevel(night, 'vivo', true)).toBe(1);
        expect(heroLightLevel(noon, 'vivo', true)).toBeGreaterThan(0.2);
        expect(heroLightLevel(noon, 'original', true)).toBe(0);
        expect(heroLightLevel(night, 'vivo', false)).toBe(0);
    });
});
