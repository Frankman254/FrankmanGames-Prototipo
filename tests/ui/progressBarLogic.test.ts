import { describe, expect, it } from 'vitest';
import { progressBarState } from '../../src/ui/menus/progressBarLogic';

describe('progressBarState', () => {
    it('calcula el porcentaje y conserva la etiqueta', () => {
        expect(progressBarState(25, 100, 'Vida 25/100')).toEqual({ percent: 25, text: 'Vida 25/100' });
    });

    it('limita el porcentaje al rango de la barra', () => {
        expect(progressBarState(-5, 100).percent).toBe(0);
        expect(progressBarState(150, 100).percent).toBe(100);
    });

    it('usa cero cuando el máximo no es positivo', () => {
        expect(progressBarState(10, 0).percent).toBe(0);
        expect(progressBarState(10, -5).percent).toBe(0);
    });
});