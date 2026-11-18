// Creador, 2026-11-18: la Vida de una pieza se suma también a la vida actual.
// 900/1000 + pieza de +100 → 1000/1100; a tope, la barra sigue llena.
import { describe, expect, it } from 'vitest';
import type { Character } from '../../src/rpg/character';
import { hero } from './helpers';

const uidOf = (c: Character, itemId: string): string => c.inventory.slots.find((x) => x?.itemId === itemId)!.uid;

function withBelt(): { c: Character; uid: string } {
    const c = hero();
    c.level = 200;
    c.give('renio_belt');
    c.restore();
    return { c, uid: uidOf(c, 'renio_belt') };
}

describe('Vida al equipar y desequipar', () => {
    it('a tope, equipar una pieza de Vida deja la barra llena', () => {
        const { c, uid } = withBelt();
        expect(c.equip(uid).ok).toBe(true);
        expect(c.health).toBe(c.maxHealth);
    });

    it('herido, la vida actual sube lo mismo que la máxima', () => {
        const { c, uid } = withBelt();
        const max0 = c.maxHealth;
        c.health = max0 - 10;
        c.equip(uid);
        const gain = c.maxHealth - max0;
        expect(gain).toBeGreaterThan(0);
        expect(c.health).toBe(max0 - 10 + gain);
    });

    it('quitarse y ponerse la pieza no cura', () => {
        const { c, uid } = withBelt();
        c.equip(uid);
        const hurt = c.maxHealth - 5;
        c.health = hurt;
        c.unequip('waist');
        expect(c.health).toBeGreaterThanOrEqual(1);
        c.equip(uidOf(c, 'renio_belt'));
        expect(c.health).toBeLessThanOrEqual(hurt);
    });

    it('quitarse una pieza nunca mata', () => {
        const { c, uid } = withBelt();
        c.equip(uid);
        c.health = 5;
        c.unequip('waist');
        expect(c.health).toBe(1);
    });
});
