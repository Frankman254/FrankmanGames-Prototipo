import { describe, expect, it } from 'vitest';
import { lootLabelFor } from '../../src/render/lootLabel';
import type { Rarity } from '../../src/rpg/contracts';

const rarityColors: Record<Rarity, string> = {
    common: '#aaaaaa',
    uncommon: '#55aa55',
    rare: '#5588ff',
    epic: '#bb55ff',
    legendary: '#ffaa22',
};

describe('lootLabelFor', () => {
    it('returns no label when there is no loot under the cursor', () => {
        expect(lootLabelFor(null, undefined, rarityColors)).toBeNull();
    });

    it('labels coins with their amount and fixed gold color', () => {
        expect(lootLabelFor({ gold: 34, item: null, rarity: 'common' }, undefined, rarityColors)).toEqual({
            text: '34 monedas',
            color: '#ffd45a',
        });
    });

    it('uses the item name and color configured for its rarity', () => {
        expect(
            lootLabelFor({ gold: 0, item: { itemId: 'iron_ring' }, rarity: 'epic' }, 'Anillo de hierro', rarityColors),
        ).toEqual({ text: 'Anillo de hierro', color: '#bb55ff' });
    });

    it('falls back to the item id when its name is missing', () => {
        expect(
            lootLabelFor({ gold: 0, item: { itemId: 'missing_item' }, rarity: 'rare' }, undefined, rarityColors),
        ).toEqual({ text: 'missing_item', color: '#5588ff' });
    });
});
