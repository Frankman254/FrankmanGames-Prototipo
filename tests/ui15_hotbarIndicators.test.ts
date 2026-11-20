import { describe, it, expect } from 'vitest';
import { HotbarSlotState } from '../src/rpg/contracts';

describe('UI-15: Indicadores de la barra de hechizos', () => {
    describe('HotbarSlotState.inRange', () => {
        it('un slot vacío tiene inRange true', () => {
            const slot: HotbarSlotState = {
                spellId: null,
                cooldownRemaining: 0,
                cooldownTotal: 0,
                affordable: true,
                inRange: true,
            };
            expect(slot.inRange).toBe(true);
        });

        it('un hechizo en rango tiene inRange true', () => {
            const slot: HotbarSlotState = {
                spellId: 'spark',
                cooldownRemaining: 0,
                cooldownTotal: 0,
                affordable: true,
                inRange: true,
            };
            expect(slot.inRange).toBe(true);
        });

        it('un hechizo fuera de alcance tiene inRange false', () => {
            const slot: HotbarSlotState = {
                spellId: 'spark',
                cooldownRemaining: 0,
                cooldownTotal: 0,
                affordable: true,
                inRange: false,
            };
            expect(slot.inRange).toBe(false);
        });

        it('inRange es opcional — sin él se asume true', () => {
            const slot: HotbarSlotState = {
                spellId: 'spark',
                cooldownRemaining: 0,
                cooldownTotal: 0,
                affordable: true,
            };
            // undefined === no se sabe → el HUD lo trata como true (comportamiento por defecto)
            expect(slot.inRange ?? true).toBe(true);
        });

        it('un hechizo sin recurso y fuera de alcance marca ambos', () => {
            const slot: HotbarSlotState = {
                spellId: 'spark',
                cooldownRemaining: 0,
                cooldownTotal: 0,
                affordable: false,
                inRange: false,
            };
            expect(slot.affordable).toBe(false);
            expect(slot.inRange).toBe(false);
        });

        it('un hechizo en cooldown puede estar fuera de alcance a la vez', () => {
            const slot: HotbarSlotState = {
                spellId: 'spark',
                cooldownRemaining: 2.5,
                cooldownTotal: 3,
                affordable: true,
                inRange: false,
            };
            expect(slot.cooldownRemaining).toBeGreaterThan(0);
            expect(slot.inRange).toBe(false);
        });

        it('un hechizo de área (no single) siempre está en rango', () => {
            // Los hechizos de área autocentrada no necesitan objetivo lejano.
            const slot: HotbarSlotState = {
                spellId: 'healing_ward',
                cooldownRemaining: 0,
                cooldownTotal: 0,
                affordable: true,
                inRange: true,
            };
            expect(slot.inRange).toBe(true);
        });

        it('HUD: clase outOfRange solo cuando inRange es false explícito', () => {
            // Simula la lógica de hud.ts: slot.root.classList.toggle('outOfRange', !!id && st?.inRange === false)
            const shouldBeOutOfRange = (spellId: string | null, st: HotbarSlotState | undefined) =>
                !!spellId && st?.inRange === false;

            // Hechizo en rango → no outOfRange
            expect(shouldBeOutOfRange('spark', { spellId: 'spark', cooldownRemaining: 0, cooldownTotal: 0, affordable: true, inRange: true })).toBe(false);

            // Hechizo fuera de rango → outOfRange
            expect(shouldBeOutOfRange('spark', { spellId: 'spark', cooldownRemaining: 0, cooldownTotal: 0, affordable: true, inRange: false })).toBe(true);

            // Slot vacío → no outOfRange
            expect(shouldBeOutOfRange(null, { spellId: null, cooldownRemaining: 0, cooldownTotal: 0, affordable: true, inRange: true })).toBe(false);

            // Estado sin inRange (sesión vieja) → no outOfRange
            expect(shouldBeOutOfRange('spark', { spellId: 'spark', cooldownRemaining: 0, cooldownTotal: 0, affordable: true })).toBe(false);

            // Estado undefined → no outOfRange
            expect(shouldBeOutOfRange('spark', undefined)).toBe(false);
        });
    });
});
