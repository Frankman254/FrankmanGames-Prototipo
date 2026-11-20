import { describe, expect, it } from 'vitest';
import { evaluateTackle, edgeDistance, LOCK_MODES } from '../src/sim/lock';

describe('LOCK_MODES', () => {
    it('contiene exactamente free y body', () => {
        expect(LOCK_MODES).toEqual(['free', 'body']);
    });
});

describe('evaluateTackle', () => {
    it('escape limpio cuando ratio >= 1.75', () => {
        // ratio = (e+10)/(t+10). Con e=27, t=0: ratio = 37/10 = 3.7 >= 1.75 → free.
        expect(evaluateTackle(0, 27)).toBe('free');
    });

    it('penalización parcial cuando 0.75 <= ratio < 1.75', () => {
        // Con e=5, t=10: ratio = 15/20 = 0.75 → partial.
        expect(evaluateTackle(10, 5)).toBe('partial');
        // Con e=10, t=10: ratio = 20/20 = 1.0 → partial.
        expect(evaluateTackle(10, 10)).toBe('partial');
    });

    it('retención severa cuando ratio < 0.75', () => {
        // Con e=0, t=20: ratio = 10/30 = 0.333 → locked.
        expect(evaluateTackle(20, 0)).toBe('locked');
    });

    it('ambos cero da ratio 1.0 → partial', () => {
        expect(evaluateTackle(0, 0)).toBe('partial');
    });

    it('valores negativos se tratan como cero', () => {
        expect(evaluateTackle(-5, -5)).toBe('partial'); // ambos → 0, ratio = 1.0
        expect(evaluateTackle(-5, 27)).toBe('free'); // t→0, e=27, ratio = 37/10 = 3.7
        expect(evaluateTackle(20, -5)).toBe('locked'); // t=20, e→0, ratio = 10/30 = 0.333
    });

    it('umbral exacto de 1.75 da free', () => {
        // ratio = 1.75 → (e+10)/(t+10) = 1.75
        // Con t=10: (e+10) = 1.75 * 20 = 35 → e = 25
        expect(evaluateTackle(10, 25)).toBe('free');
    });

    it('umbral exacto de 0.75 da partial', () => {
        // ratio = 0.75 → (e+10)/(t+10) = 0.75
        // Con t=30: (e+10) = 0.75 * 40 = 30 → e = 20
        expect(evaluateTackle(30, 20)).toBe('partial');
    });

    it('justo por debajo de 0.75 da locked', () => {
        // Con t=30, e=19: ratio = 29/40 = 0.725 < 0.75 → locked.
        expect(evaluateTackle(30, 19)).toBe('locked');
    });

    it('justo por debajo de 1.75 da partial', () => {
        // Con t=10, e=24: ratio = 34/20 = 1.7 < 1.75 → partial.
        expect(evaluateTackle(10, 24)).toBe('partial');
    });

    it('valores altos simétricos dan partial', () => {
        expect(evaluateTackle(100, 100)).toBe('partial');
    });
});

describe('edgeDistance', () => {
    it('dos cuerpos separados devuelve distancia positiva entre bordes', () => {
        // A en (0,0) con radio 1, B en (5,0) con radio 1 → distancia centros = 5, bordes = 3.
        const d = edgeDistance({ x: 0, y: 0 }, 1, { x: 5, y: 0 }, 1);
        expect(d).toBeCloseTo(3, 5);
    });

    it('dos cuerpos tocándose devuelve 0', () => {
        // A en (0,0) con radio 1, B en (2,0) con radio 1 → distancia centros = 2, bordes = 0.
        const d = edgeDistance({ x: 0, y: 0 }, 1, { x: 2, y: 0 }, 1);
        expect(d).toBeCloseTo(0, 5);
    });

    it('dos cuerpos solapados devuelve distancia negativa', () => {
        // A en (0,0) con radio 2, B en (1,0) con radio 2 → distancia centros = 1, bordes = -3.
        const d = edgeDistance({ x: 0, y: 0 }, 2, { x: 1, y: 0 }, 2);
        expect(d).toBeCloseTo(-3, 5);
    });

    it('dos cuerpos en la misma posición devuelve negativo de la suma de radios', () => {
        const d = edgeDistance({ x: 0, y: 0 }, 1.5, { x: 0, y: 0 }, 0.5);
        expect(d).toBeCloseTo(-2, 5);
    });

    it('distancia diagonal entre bordes', () => {
        // A en (0,0) con radio 1, B en (3,4) con radio 1 → distancia centros = 5, bordes = 3.
        const d = edgeDistance({ x: 0, y: 0 }, 1, { x: 3, y: 4 }, 1);
        expect(d).toBeCloseTo(3, 5);
    });

    it('radios distintos', () => {
        // A en (0,0) con radio 0.5, B en (10,0) con radio 1.5 → distancia centros = 10, bordes = 8.
        const d = edgeDistance({ x: 0, y: 0 }, 0.5, { x: 10, y: 0 }, 1.5);
        expect(d).toBeCloseTo(8, 5);
    });
});
