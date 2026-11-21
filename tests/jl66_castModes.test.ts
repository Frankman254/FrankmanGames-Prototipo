import { describe, it, expect } from 'vitest';
import { CastInput, CAST_MODES, CAST_MODE_NAMES } from '../src/sim/castModes';

describe('JL-66: CastInput', () => {
    it('tiene los 3 modos', () => {
        expect(CAST_MODES).toEqual(['pressClick', 'indicator', 'press']);
    });

    it('CAST_MODE_NAMES tiene un nombre por modo', () => {
        for (const mode of CAST_MODES) {
            expect(CAST_MODE_NAMES[mode]).toBeDefined();
            expect(CAST_MODE_NAMES[mode].length).toBeGreaterThan(0);
        }
    });

    describe('modo por slot', () => {
        it('effectiveMode devuelve el global si no hay modo propio', () => {
            const ci = new CastInput('press');
            expect(ci.effectiveMode(0)).toBe('press');
            expect(ci.effectiveMode(5)).toBe('press');
        });

        it('effectiveMode devuelve el modo propio del slot', () => {
            const ci = new CastInput('press');
            ci.setSlotMode(2, 'indicator');
            expect(ci.effectiveMode(0)).toBe('press'); // global
            expect(ci.effectiveMode(2)).toBe('indicator'); // propio
            expect(ci.effectiveMode(5)).toBe('press'); // global
        });

        it('setSlotMode(null) vuelve al global', () => {
            const ci = new CastInput('press');
            ci.setSlotMode(3, 'indicator');
            expect(ci.effectiveMode(3)).toBe('indicator');
            ci.setSlotMode(3, null);
            expect(ci.effectiveMode(3)).toBe('press');
        });

        it('setMode global no borra los modos propios', () => {
            const ci = new CastInput('press');
            ci.setSlotMode(1, 'indicator');
            ci.setMode('pressClick');
            expect(ci.effectiveMode(0)).toBe('pressClick'); // nuevo global
            expect(ci.effectiveMode(1)).toBe('indicator'); // propio se mantiene
        });

        it('press() usa el modo efectivo del slot', () => {
            const ci = new CastInput('pressClick');
            ci.setSlotMode(0, 'press');
            // Slot 0 con modo 'press': lanza al pulsar, sin apuntar.
            expect(ci.press(0, true)).toEqual({ kind: 'cast', slot: 0 });
            expect(ci.aiming).toBeNull();
        });

        it('press() con modo propio pressClick requiere dos pulsaciones', () => {
            const ci = new CastInput('press');
            ci.setSlotMode(4, 'pressClick');
            // Primera pulsación: apunta.
            expect(ci.press(4, true)).toEqual({ kind: 'aim', slot: 4 });
            expect(ci.aiming).toBe(4);
            // Segunda pulsación: lanza.
            expect(ci.press(4, true)).toEqual({ kind: 'cast', slot: 4 });
            expect(ci.aiming).toBeNull();
        });

        it('release() usa el modo efectivo del slot', () => {
            const ci = new CastInput('pressClick');
            ci.setSlotMode(2, 'indicator');
            // Primero apunta con press.
            ci.press(2, true);
            expect(ci.aiming).toBe(2);
            // Soltar lanza en modo indicator.
            expect(ci.release(2)).toEqual({ kind: 'cast', slot: 2 });
            expect(ci.aiming).toBeNull();
        });

        it('release() no lanza si el modo del slot no es indicator', () => {
            const ci = new CastInput('pressClick');
            ci.setSlotMode(1, 'press');
            ci.press(1, true); // press lanza directo, no apunta
            expect(ci.aiming).toBeNull();
            expect(ci.release(1)).toEqual({ kind: 'none' });
        });
    });
});
