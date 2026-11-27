import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';

const data = loadGameData();
const zones = data.zones.zones.filter((zone) => !zone.safe);
const merchants = Object.values(data.rpg.merchants).filter((merchant) => !merchant.devOnly);

describe('JL-412: stock utilizable de tiendas por franja', () => {
    it('incluye franjas y tiendas productivas para revisar', () => {
        expect(zones.length).toBeGreaterThan(0);
        expect(merchants.length).toBeGreaterThan(0);
    });

    it.each(zones)('$name ($levelMin–$levelMax): cada tienda tiene stock utilizable', (zone) => {
        const emptyStores = merchants
            .filter(
                (merchant) =>
                    !merchant.stock.some((stock) => {
                        const item = data.rpg.items[stock.itemId];
                        return item !== undefined && item.level <= zone.levelMax;
                    }),
            )
            .map((merchant) => `${merchant.name} (${merchant.id})`)
            .sort();

        expect(
            emptyStores,
            `Tiendas sin artículos de nivel ≤ ${zone.levelMax}: ${emptyStores.join(', ') || 'ninguna'}`,
        ).toEqual([]);
    });
});
