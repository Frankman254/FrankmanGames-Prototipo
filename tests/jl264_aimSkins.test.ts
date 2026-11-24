// JL-264 (OMP-POL-12): Skins del indicador de apuntado, del puntero y de la trayectoria.
import { describe, it, expect } from 'vitest';
import {
    AIM_SKINS,
    AIM_SKIN_DEFAULT,
    getAimSkin,
    isValidAimSkin,
    type AimSkinDef,
} from '../src/render/fx/aimSkins';
import {
    devVisual,
    setDevVisual,
    normalizeDevVisual,
    DEV_VISUAL_DEFAULTS,
} from '../src/render/devVisual';

describe('JL-264: aimSkins', () => {
    it('hay al menos 3 skins distintas', () => {
        expect(AIM_SKINS.length).toBeGreaterThanOrEqual(3);
    });

    it('cada skin tiene id, nombre y las 3 funciones', () => {
        for (const s of AIM_SKINS) {
            expect(typeof s.id).toBe('string');
            expect(s.id.length).toBeGreaterThan(0);
            expect(typeof s.name).toBe('string');
            expect(s.name.length).toBeGreaterThan(0);
            expect(typeof s.makeTargetMarker).toBe('function');
            expect(typeof s.makeLandingRing).toBe('function');
            expect(typeof s.makeTrajectoryLine).toBe('function');
        }
    });

    it('los ids son únicos', () => {
        const ids = AIM_SKINS.map((s) => s.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('getAimSkin devuelve la skin correcta por id', () => {
        for (const s of AIM_SKINS) {
            expect(getAimSkin(s.id)).toBe(s);
        }
    });

    it('getAimSkin con id desconocido devuelve la skin por defecto', () => {
        expect(getAimSkin('inexistente')).toBe(getAimSkin(AIM_SKIN_DEFAULT));
    });

    it('isValidAimSkin acepta los ids válidos', () => {
        for (const s of AIM_SKINS) {
            expect(isValidAimSkin(s.id)).toBe(true);
        }
    });

    it('isValidAimSkin rechaza ids inválidos', () => {
        expect(isValidAimSkin('inexistente')).toBe(false);
        expect(isValidAimSkin(123)).toBe(false);
        expect(isValidAimSkin(null)).toBe(false);
        expect(isValidAimSkin('')).toBe(false);
    });

    it('AIM_SKIN_DEFAULT es un id válido', () => {
        expect(isValidAimSkin(AIM_SKIN_DEFAULT)).toBe(true);
    });

    it('DevVisual incluye aimSkin con el valor por defecto', () => {
        expect(DEV_VISUAL_DEFAULTS.aimSkin).toBe(AIM_SKIN_DEFAULT);
    });

    it('normalizeDevVisual acepta aimSkin válido', () => {
        const skin = AIM_SKINS[1]!.id;
        const v = normalizeDevVisual({ aimSkin: skin });
        expect(v.aimSkin).toBe(skin);
    });

    it('normalizeDevVisual rechaza aimSkin inválido y usa el por defecto', () => {
        const v = normalizeDevVisual({ aimSkin: 'inexistente' });
        expect(v.aimSkin).toBe(AIM_SKIN_DEFAULT);
    });

    it('normalizeDevVisual sin aimSkin usa el por defecto', () => {
        const v = normalizeDevVisual({});
        expect(v.aimSkin).toBe(AIM_SKIN_DEFAULT);
    });

    it('setDevVisual cambia aimSkin y devVisual() lo devuelve', () => {
        const skin = AIM_SKINS[AIM_SKINS.length - 1]!.id;
        setDevVisual({ aimSkin: skin });
        expect(devVisual().aimSkin).toBe(skin);
        // Restaurar
        setDevVisual({ aimSkin: AIM_SKIN_DEFAULT });
    });
});
