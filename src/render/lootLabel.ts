import type { Rarity } from '../rpg/contracts';

export interface LootLabel {
    text: string;
    color: string;
}

interface LootLabelSource {
    gold: number;
    item: { itemId: string } | null;
    rarity: Rarity;
}

export function lootLabelFor(
    loot: LootLabelSource | null | undefined,
    itemName: string | undefined,
    rarityColor: Record<Rarity, string>,
): LootLabel | null {
    if (!loot) return null;
    if (!loot.item) return { text: `${loot.gold} monedas`, color: '#ffd45a' };
    return { text: itemName ?? loot.item.itemId, color: rarityColor[loot.rarity] };
}
