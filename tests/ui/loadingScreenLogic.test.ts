import { describe, expect, it } from 'vitest';
import { LOADING_TIPS, loadingProgressPercent, nextLoadingTipIndex } from '../../src/ui/loadingScreenLogic';

describe('loadingProgressPercent', () => {
    it('acota y redondea el progreso a porcentaje entero', () => {
        expect(loadingProgressPercent(-0.2)).toBe(0);
        expect(loadingProgressPercent(0)).toBe(0);
        expect(loadingProgressPercent(0.126)).toBe(13);
        expect(loadingProgressPercent(1)).toBe(100);
        expect(loadingProgressPercent(1.2)).toBe(100);
    });
});

describe('nextLoadingTipIndex', () => {
    it('recorre cada consejo una vez y vuelve al primero', () => {
        expect(LOADING_TIPS).toHaveLength(9);
        expect(LOADING_TIPS.map((_, index) => nextLoadingTipIndex(index))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 0]);
    });
});
