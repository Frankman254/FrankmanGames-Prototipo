// BAL-01: Pruebas del helper de topes de estadísticas.
import { describe, it, expect } from 'vitest';
import {
    capXpGain,
    capResist,
    effectiveXpGain,
    effectiveResist,
    applyResistCaps,
    getResistCap,
    XP_GAIN_CAP,
    type CappedStat,
} from '../scripts/balance/caps';
import { ELEMENTS } from '../src/rpg/contracts';

describe('BAL-01: topes de estadísticas', () => {
    describe('XP_GAIN_CAP', () => {
        it('es 100', () => {
            expect(XP_GAIN_CAP).toBe(100);
        });
    });

    describe('getResistCap', () => {
        it('devuelve 50 por defecto', () => {
            expect(getResistCap()).toBe(50);
        });

        it('usa el valor pasado', () => {
            expect(getResistCap({ resistCap: 60 })).toBe(60);
        });
    });

    describe('effectiveXpGain', () => {
        it('no recorta cuando está por debajo del tope', () => {
            expect(effectiveXpGain(50)).toBe(50);
            expect(effectiveXpGain(0)).toBe(0);
        });

        it('recorta al tope cuando supera los 100', () => {
            expect(effectiveXpGain(100)).toBe(100);
            expect(effectiveXpGain(101)).toBe(100);
            expect(effectiveXpGain(200)).toBe(100);
        });

        it('recorta valores negativos a 0', () => {
            expect(effectiveXpGain(-10)).toBe(0);
        });
    });

    describe('effectiveResist', () => {
        it('no recorta cuando está por debajo del tope', () => {
            expect(effectiveResist(30, 50)).toBe(30);
            expect(effectiveResist(0, 50)).toBe(0);
        });

        it('recorta al tope cuando supera el resistCap', () => {
            expect(effectiveResist(50, 50)).toBe(50);
            expect(effectiveResist(51, 50)).toBe(50);
            expect(effectiveResist(102, 50)).toBe(50);
        });
    });

    describe('capXpGain', () => {
        function check(raw: number, expectedEffective: number, expectedCapped: boolean) {
            const result: CappedStat = capXpGain(raw);
            expect(result.raw).toBe(raw);
            expect(result.effective).toBe(expectedEffective);
            expect(result.cap).toBe(100);
            expect(result.capped).toBe(expectedCapped);
        }

        it('bruta <= tope → efecto = bruta, no capped', () => {
            check(50, 50, false);
            check(100, 100, false);
        });

        it('bruta > tope → efecto = tope, capped', () => {
            check(101, 100, true);
            check(200, 100, true);
        });
    });

    describe('capResist', () => {
        function check(raw: number, resistCap: number, expectedEffective: number, expectedCapped: boolean) {
            const result: CappedStat = capResist(raw, resistCap);
            expect(result.raw).toBe(raw);
            expect(result.effective).toBe(expectedEffective);
            expect(result.cap).toBe(resistCap);
            expect(result.capped).toBe(expectedCapped);
        }

        it('bruta <= tope → efecto = bruta, no capped', () => {
            check(30, 50, 30, false);
            check(50, 50, 50, false);
        });

        it('bruta > tope → efecto = tope, capped', () => {
            check(51, 50, 50, true);
            check(102, 50, 50, true);
        });
    });

    describe('applyResistCaps', () => {
        it('marca los elementos que superan el tope', () => {
            const raw: Record<string, number> = {};
            for (const el of ELEMENTS) {
                raw[el] = 60; // todos superan 50
            }
            const result = applyResistCaps(raw, 50);
            expect(result.cappedElements.length).toBe(ELEMENTS.length);
            for (const el of ELEMENTS) {
                expect(result.effective[el]).toBe(50);
            }
        });

        it('no marca los elementos por debajo del tope', () => {
            const raw: Record<string, number> = {};
            for (const el of ELEMENTS) {
                raw[el] = 30;
            }
            const result = applyResistCaps(raw, 50);
            expect(result.cappedElements.length).toBe(0);
            for (const el of ELEMENTS) {
                expect(result.effective[el]).toBe(30);
            }
        });

        it('mezcla: algunos capped, otros no', () => {
            const raw: Record<string, number> = {};
            for (const el of ELEMENTS) {
                raw[el] = el === 'fire' ? 70 : 20;
            }
            const result = applyResistCaps(raw, 50);
            expect(result.cappedElements).toEqual(['fire']);
            expect(result.effective['fire']).toBe(50);
            for (const el of ELEMENTS) {
                if (el !== 'fire') {
                    expect(result.effective[el]).toBe(20);
                }
            }
        });
    });

    describe('build sintético que supera ambos topes', () => {
        it('experienceGain bruta 150 → efecto 100', () => {
            const xp = capXpGain(150);
            expect(xp.raw).toBe(150);
            expect(xp.effective).toBe(100);
            expect(xp.capped).toBe(true);
        });

        it('resistencia bruta 102 → efecto 50', () => {
            const resist = capResist(102, 50);
            expect(resist.raw).toBe(102);
            expect(resist.effective).toBe(50);
            expect(resist.capped).toBe(true);
        });

        it('ambos topes superados en el mismo build', () => {
            const xp = capXpGain(150);
            const resist = capResist(102, 50);
            // Bruta > tope en ambos casos
            expect(xp.capped).toBe(true);
            expect(resist.capped).toBe(true);
            // Efecto = tope en ambos casos
            expect(xp.effective).toBe(xp.cap);
            expect(resist.effective).toBe(resist.cap);
        });
    });
});
