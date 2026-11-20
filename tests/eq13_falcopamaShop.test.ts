// EQ-13: Falcopamas en la tienda de monturas de desarrollo (devOnly).
import { describe, expect, it } from 'vitest';
import { loadGameData, rpgRawFiles } from '../src/data';
import { parseRpgContent } from '../src/rpg/content';
import { Character } from '../src/rpg/character';
import { Shop } from '../src/rpg/shop';
import { Rng } from '../src/sim/rng';

const archetypes = Object.keys(loadGameData().enemies.archetypes);
const content = parseRpgContent(rpgRawFiles(), archetypes);
const devMerchant = content.merchants['dev_buhonero'];
if (!devMerchant) throw new Error('dev_buhonero no encontrado en merchants.json');

const FALCOPAMA_IDS = [
  'mount_dev_falcopama',
  'mount_falcopama_earth',
  'mount_falcopama_fire',
  'mount_falcopama_air',
  'mount_falcopama_water',
  'mount_falcopama_frost',
  'mount_falcopama_lightning',
  'mount_falcopama_brio',
];

describe('EQ-13: Falcopamas en la tienda de monturas de desarrollo', () => {
    it('todas las falcopamas existen en items.json', () => {
        for (const id of FALCOPAMA_IDS) {
            expect(content.items[id], `${id} debe existir en items.json`).toBeDefined();
        }
    });

    it('todas las falcopamas son monturas', () => {
        for (const id of FALCOPAMA_IDS) {
            const item = content.items[id]!;
            expect(item.slot).toBe('mount');
        }
    });

    it('el stock del buhonero incluye las 8 falcopamas', () => {
        const stockIds = new Set(devMerchant.stock.map((s) => s.itemId));
        for (const id of FALCOPAMA_IDS) {
            expect(stockIds).toContain(id);
        }
    });

    it('cada falcopama cuesta 1 moneda en el buhonero', () => {
        const char = Character.create(content, 'ember_vanguard', 'Test', new Rng(42));
        const shop = new Shop(content, devMerchant, char);
        for (const id of FALCOPAMA_IDS) {
            expect(shop.priceOf(id)).toBe(1);
        }
    });

    it('ningún mercader normal (no devOnly) vende falcopamas', () => {
        for (const [merchantId, merchant] of Object.entries(content.merchants)) {
            if (merchant.devOnly) continue;
            const stockIds = new Set(merchant.stock.map((s) => s.itemId));
            for (const id of FALCOPAMA_IDS) {
                expect(stockIds).not.toContain(id);
            }
        }
    });

    it('las falcopamas del buhonero tienen cantidad 1 (no ilimitada)', () => {
        for (const entry of devMerchant.stock) {
            if (FALCOPAMA_IDS.includes(entry.itemId)) {
                expect(entry.quantity).toBe(1);
            }
        }
    });

    it('el buhonero sigue vendiendo items de nivel alto junto con las falcopamas', () => {
        // Que el stock no se haya roto al añadir las falcopamas.
        const stockIds = new Set(devMerchant.stock.map((s) => s.itemId));
        // Al menos un item de nivel alto existente.
        expect(stockIds).toContain('ambar_axe');
        // Y las falcopamas.
        expect(stockIds).toContain('mount_dev_falcopama');
    });
});
