import { describe, it, expect } from 'vitest';
import { DEFAULT_OPTIONS, normalizeOptions, type GameOptions } from '../src/ui/menus/saveStore';
import { CAMERA_MODE_SHORT } from '../src/ui/menus/screens/modals';
import { CAMERA_MODES } from '../src/camera';

describe('JL-103: opción showCameraModeLabel', () => {
    it('DEFAULT_OPTIONS tiene showCameraModeLabel false', () => {
        expect(DEFAULT_OPTIONS.showCameraModeLabel).toBe(false);
    });

    it('normalizeOptions lee showCameraModeLabel', () => {
        const opts = normalizeOptions({ showCameraModeLabel: true }) as GameOptions;
        expect(opts.showCameraModeLabel).toBe(true);
    });

    it('normalizeOptions usa false por defecto si falta', () => {
        const opts = normalizeOptions({}) as GameOptions;
        expect(opts.showCameraModeLabel).toBe(false);
    });

    it('normalizeOptions ignora valores no booleanos', () => {
        const opts = normalizeOptions({ showCameraModeLabel: 'yes' }) as GameOptions;
        expect(opts.showCameraModeLabel).toBe(false);
    });

    it('CAMERA_MODE_SHORT tiene una entrada por modo', () => {
        for (const mode of CAMERA_MODES) {
            const label = CAMERA_MODE_SHORT[mode];
            expect(label, `${mode} sin etiqueta corta`).toBeDefined();
            expect(label!.length).toBeLessThan(30);
        }
    });

    it('CAMERA_MODE_SHORT empieza con "Cámara:"', () => {
        for (const mode of CAMERA_MODES) {
            expect(CAMERA_MODE_SHORT[mode]!.startsWith('Cámara:')).toBe(true);
        }
    });
});
