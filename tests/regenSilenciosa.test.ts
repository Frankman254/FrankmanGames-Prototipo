// Creador (2026-11-24): «el +1 de la regeneración básica aparece in game y es molesto (...) satura el
// juego de información». La regeneración natural no da número flotante, chispas ni línea de chat;
// las curas de hechizos y pociones sí.
import { describe, expect, it } from 'vitest';
import { isQuietHeal, type GameEvent } from '../src/sim/events';

describe('regeneración silenciosa', () => {
    it('solo la regeneración natural se calla', () => {
        const regen: GameEvent = { type: 'heal', targetId: 1, amount: 1, source: 'regen' };
        const spell: GameEvent = { type: 'heal', targetId: 1, amount: 40, source: 'mend' };
        expect(isQuietHeal(regen)).toBe(true);
        expect(isQuietHeal(spell)).toBe(false);
        expect(isQuietHeal({ type: 'avoided', sourceId: 1 } as GameEvent)).toBe(false);
    });
});
