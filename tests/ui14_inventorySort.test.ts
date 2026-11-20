// UI-14: ordenamiento del inventario (ya implementado) y venta de basura en la tienda.
import { describe, it, expect } from 'vitest';
import { isJunk, getJunkItems, type JunkItem } from '../src/ui/menus/bagView';
import type { ItemDef, ItemInstance } from '../src/rpg/contracts';

/** Crea un ItemDef mínimo para las pruebas. */
function makeDef(
    overrides: Partial<ItemDef> & { kind?: ItemDef['kind'] },
): ItemDef {
    return {
        id: 'test_item',
        name: 'Objeto de prueba',
        kind: overrides.kind ?? 'sword',
        category: overrides.category ?? 'weapon',
        rarity: overrides.rarity ?? 'common',
        level: overrides.level ?? 1,
        value: overrides.value ?? 10,
        ...overrides,
    } as ItemDef;
}

/** Crea un ItemInstance mínimo. */
function makeInstance(uid: string, itemId: string, quantity = 1): ItemInstance {
    return { uid, itemId, quantity } as ItemInstance;
}

describe('UI-14: isJunk', () => {
    it('common de nivel inferior al jugador es basura', () => {
        const def = makeDef({ rarity: 'common', level: 5 });
        expect(isJunk(def, 10)).toBe(true);
    });

    it('common de nivel igual al jugador NO es basura', () => {
        const def = makeDef({ rarity: 'common', level: 10 });
        expect(isJunk(def, 10)).toBe(false);
    });

    it('common de nivel superior al jugador NO es basura', () => {
        const def = makeDef({ rarity: 'common', level: 15 });
        expect(isJunk(def, 10)).toBe(false);
    });

    it('uncommon nunca es basura', () => {
        const def = makeDef({ rarity: 'uncommon', level: 1 });
        expect(isJunk(def, 100)).toBe(false);
    });

    it('rare nunca es basura', () => {
        const def = makeDef({ rarity: 'rare', level: 1 });
        expect(isJunk(def, 200)).toBe(false);
    });

    it('epic nunca es basura', () => {
        const def = makeDef({ rarity: 'epic', level: 1 });
        expect(isJunk(def, 200)).toBe(false);
    });

    it('legendary nunca es basura', () => {
        const def = makeDef({ rarity: 'legendary', level: 1 });
        expect(isJunk(def, 200)).toBe(false);
    });

    it('consumible common no es basura', () => {
        // potion es consumible
        const def = makeDef({ rarity: 'common', level: 3, kind: 'potion', category: 'consumable' });
        expect(isJunk(def, 50)).toBe(false);
    });

    it('pergamino common no es basura', () => {
        const def = makeDef({ rarity: 'common', level: 3, kind: 'scroll', category: 'scroll' });
        expect(isJunk(def, 50)).toBe(false);
    });

    it('material common no es basura', () => {
        const def = makeDef({ rarity: 'common', level: 3, kind: 'ore', category: 'material' });
        expect(isJunk(def, 50)).toBe(false);
    });

    it('arma common de nivel bajo es basura', () => {
        const def = makeDef({ rarity: 'common', level: 5, kind: 'sword', category: 'weapon' });
        expect(isJunk(def, 50)).toBe(true);
    });

    it('armadura common de nivel bajo es basura', () => {
        const def = makeDef({ rarity: 'common', level: 8, kind: 'armor', category: 'armor' });
        expect(isJunk(def, 50)).toBe(true);
    });

    it('anillo common de nivel bajo es basura', () => {
        const def = makeDef({ rarity: 'common', level: 10, kind: 'ring', category: 'jewel' });
        expect(isJunk(def, 50)).toBe(true);
    });
});

describe('UI-14: getJunkItems', () => {
    const items: Record<string, ItemDef> = {
        old_sword: makeDef({ id: 'old_sword', name: 'Espada vieja', rarity: 'common', level: 5, kind: 'sword', category: 'weapon' }),
        old_shield: makeDef({ id: 'old_shield', name: 'Escudo viejo', rarity: 'common', level: 3, kind: 'shield', category: 'armor' }),
        good_sword: makeDef({ id: 'good_sword', name: 'Espada buena', rarity: 'uncommon', level: 5, kind: 'sword', category: 'weapon' }),
        potion: makeDef({ id: 'potion', name: 'Poción', rarity: 'common', level: 1, kind: 'potion', category: 'consumable' }),
        high_sword: makeDef({ id: 'high_sword', name: 'Espada alta', rarity: 'common', level: 100, kind: 'sword', category: 'weapon' }),
    };

    it('devuelve solo los objetos basura', () => {
        const slots: (ItemInstance | null)[] = [
            makeInstance('it1', 'old_sword'),
            makeInstance('it2', 'old_shield'),
            makeInstance('it3', 'good_sword'),
            makeInstance('it4', 'potion'),
            makeInstance('it5', 'high_sword'),
            null,
        ];
        const sellValues: Record<string, number> = {
            it1: 10,
            it2: 5,
            it3: 50,
            it4: 2,
            it5: 100,
        };
        const junk = getJunkItems(slots, items, 50, sellValues);
        expect(junk).toHaveLength(2);
        expect(junk.map((j) => j.uid)).toEqual(['it1', 'it2']);
    });

    it('incluye la cantidad y el valor de venta', () => {
        const slots: (ItemInstance | null)[] = [
            makeInstance('it1', 'old_sword', 3),
        ];
        const sellValues: Record<string, number> = { it1: 30 };
        const junk = getJunkItems(slots, items, 50, sellValues);
        expect(junk).toHaveLength(1);
        expect(junk[0]).toEqual<JunkItem>({
            uid: 'it1',
            name: 'Espada vieja',
            level: 5,
            quantity: 3,
            sellValue: 30,
        });
    });

    it('mochila vacía devuelve array vacío', () => {
        const slots: (ItemInstance | null)[] = [null, null, null];
        const junk = getJunkItems(slots, items, 50, {});
        expect(junk).toHaveLength(0);
    });

    it('sin objetos basura devuelve array vacío', () => {
        const slots: (ItemInstance | null)[] = [
            makeInstance('it1', 'good_sword'),
            makeInstance('it2', 'potion'),
        ];
        const junk = getJunkItems(slots, items, 50, { it1: 50, it2: 2 });
        expect(junk).toHaveLength(0);
    });

    it('nivel del jugador 1: nada es basura (todo nivel >= 1)', () => {
        const slots: (ItemInstance | null)[] = [
            makeInstance('it1', 'old_sword'),
        ];
        const junk = getJunkItems(slots, items, 1, { it1: 10 });
        expect(junk).toHaveLength(0);
    });
});
