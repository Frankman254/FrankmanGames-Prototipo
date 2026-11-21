// JL-59: Barra de hechizos fusionada — escala por eje y migración.
import { describe, it, expect } from 'vitest';
import {
    parseScales,
    clampHudScale,
    clampHudScaleAxis,
    migrateScale,
    HUD_SCALE_MIN,
    HUD_SCALE_MAX,
    type HudScale,
} from '../src/ui/map/hudProfiles';

describe('JL-59: escala por eje del HUD', () => {
    it('migración: número único da {x, y} iguales', () => {
        const out = parseScales({ 'hud-bar': 1.2 }) as Record<string, HudScale>;
        expect(out['hud-bar']).toEqual({ x: 1.2, y: 1.2 });
    });

    it('migración: número fuera de rango se clampea en ambos ejes', () => {
        const out = parseScales({ 'hud-bar': 3.0 }) as Record<string, HudScale>;
        expect(out['hud-bar']).toEqual({ x: HUD_SCALE_MAX, y: HUD_SCALE_MAX });
    });

    it('lectura directa de {x, y}', () => {
        const out = parseScales({ 'hud-bar': { x: 1.3, y: 0.8 } }) as Record<string, HudScale>;
        expect(out['hud-bar']).toEqual({ x: 1.3, y: 0.8 });
    });

    it('clampea cada eje por separado', () => {
        const out = parseScales({ 'hud-bar': { x: 3.0, y: 0.1 } }) as Record<string, HudScale>;
        expect(out['hud-bar']).toEqual({ x: HUD_SCALE_MAX, y: HUD_SCALE_MIN });
    });

    it('ignora valores inválidos', () => {
        const out = parseScales({
            'hud-bar': 'no',
            'hud-sec-character': { x: 1.1 },
            'hud-sec-items': { x: 1.1, y: 'no' },
            'hud-sec-spells': null,
        }) as Record<string, HudScale>;
        expect(Object.keys(out)).toHaveLength(0);
    });

    it('parseScales con objeto vacío', () => {
        const out = parseScales({});
        expect(Object.keys(out)).toHaveLength(0);
    });

    it('parseScales con null/undefined', () => {
        expect(Object.keys(parseScales(null))).toHaveLength(0);
        expect(Object.keys(parseScales(undefined))).toHaveLength(0);
    });

    it('migrateScale clampea y duplica', () => {
        expect(migrateScale(0.3)).toEqual({ x: HUD_SCALE_MIN, y: HUD_SCALE_MIN });
        expect(migrateScale(1.0)).toEqual({ x: 1, y: 1 });
        expect(migrateScale(2.5)).toEqual({ x: HUD_SCALE_MAX, y: HUD_SCALE_MAX });
    });

    it('clampHudScaleAxis clampea cada eje', () => {
        expect(clampHudScaleAxis({ x: 0.1, y: 3.0 })).toEqual({ x: HUD_SCALE_MIN, y: HUD_SCALE_MAX });
        expect(clampHudScaleAxis({ x: 1.0, y: 1.0 })).toEqual({ x: 1, y: 1 });
    });

    it('clampHudScale conserva el valor dentro de rango', () => {
        expect(clampHudScale(1.0)).toBe(1);
        expect(clampHudScale(1.5)).toBe(1.5);
    });

    it('clampHudScale limita al mínimo', () => {
        expect(clampHudScale(0.1)).toBe(HUD_SCALE_MIN);
    });

    it('clampHudScale limita al máximo', () => {
        expect(clampHudScale(3.0)).toBe(HUD_SCALE_MAX);
    });
});
