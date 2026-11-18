// MER-01: PNJ de pruebas que vende objetos de nivel alto a 1 moneda.
import { describe, it, expect } from 'vitest';
import { loadGameData, rpgRawFiles } from '../src/data';
import { parseRpgContent } from '../src/rpg/content';
import { Shop } from '../src/rpg/shop';
import { Character } from '../src/rpg/character';
import type { MerchantDef } from '../src/rpg/contracts';
import { Rng } from '../src/sim/rng';

const archetypes = Object.keys(loadGameData().enemies.archetypes);
const content = parseRpgContent(rpgRawFiles(), archetypes);
const devMerchant = content.merchants['dev_buhonero'];
if (!devMerchant) throw new Error('dev_buhonero no encontrado en merchants.json');

describe('MER-01: Buhonero de pruebas', () => {

    it('el mercader dev_buhonero existe en el contenido', () => {
        expect(devMerchant).toBeDefined();
        expect(devMerchant.id).toBe('dev_buhonero');
    });

    it('tiene la marca devOnly', () => {
        expect(devMerchant.devOnly).toBe(true);
    });

    it('tiene fixedPrice 1', () => {
        expect(devMerchant.fixedPrice).toBe(1);
    });

    it('tiene maxLevelOffset 200 para que se vean todos los objetos', () => {
        expect(devMerchant.maxLevelOffset).toBe(200);
    });

    it('su stock contiene solo objetos de nivel >= 101', () => {
        for (const entry of devMerchant.stock) {
            const itemDef = content.items[entry.itemId];
            expect(itemDef).toBeDefined();
            expect(itemDef!.level).toBeGreaterThanOrEqual(101);
        }
    });

    it('su stock contiene todos los objetos de nivel >= 101', () => {
        const stockIds = new Set(devMerchant.stock.map((s) => s.itemId));
        for (const [id, def] of Object.entries(content.items)) {
            if (def.level >= 101) {
                expect(stockIds.has(id)).toBe(true);
            }
        }
    });

    it('su stock tiene cantidad ilimitada en cada entrada', () => {
        for (const entry of devMerchant.stock) {
            expect(entry.quantity).toBeNull();
        }
    });

    it('el NPC dev_buhonero existe y está vinculado al mercader', () => {
        const npc = content.npcs['dev_buhonero'];
        expect(npc).toBeDefined();
        expect(npc!.merchantId).toBe('dev_buhonero');
    });

    it('Shop.priceOf devuelve 1 para cualquier item del mercader dev', () => {
        const char = Character.create(content, 'ember_vanguard', 'Test', new Rng(42));
        const shop = new Shop(content, devMerchant, char);
        for (const entry of devMerchant.stock) {
            expect(shop.priceOf(entry.itemId)).toBe(1);
        }
    });

    it('los mercaderes normales no tienen la marca devOnly', () => {
        for (const [id, m] of Object.entries(content.merchants)) {
            if (id === 'dev_buhonero') continue;
            expect(m.devOnly).toBeUndefined();
        }
    });
});
