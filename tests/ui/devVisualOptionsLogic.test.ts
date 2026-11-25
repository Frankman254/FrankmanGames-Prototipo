import { describe, expect, it } from 'vitest';
import { devVisualOptionPatch } from '../../src/ui/menus/screens/devVisualOptionsLogic';

describe('devVisualOptionPatch', () => {
    it('convierte los valores de los deslizadores en números', () => {
        expect(devVisualOptionPatch('exposure', '1.45')).toEqual({ exposure: 1.45 });
        expect(devVisualOptionPatch('vignette', '0')).toEqual({ vignette: 0 });
    });

    it('conserva los valores de los selectores y las casillas', () => {
        expect(devVisualOptionPatch('tonemap', 'neutra')).toEqual({ tonemap: 'neutra' });
        expect(devVisualOptionPatch('bloom', true)).toEqual({ bloom: true });
        expect(devVisualOptionPatch('heroLight', false)).toEqual({ heroLight: false });
    });
});
