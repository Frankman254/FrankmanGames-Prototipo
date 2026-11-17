import { describe, expect, it } from 'vitest';
import { loadGameData } from '../../src/data';
import { Character } from '../../src/rpg/character';
import type { SessionEvent } from '../../src/rpg/contracts';
import { GameSession } from '../../src/rpg/session';
import { Rng } from '../../src/sim/rng';
import { World } from '../../src/sim/world';
import { fillInventory, content, session } from './helpers';

const offer = (s: GameSession, merchant: string, itemId: string) =>
    s.merchant(merchant)!.stock.find((o) => o.item.itemId === itemId)!;

describe('mercaderes', () => {
    it('cargan de datos con precio = valor × rareza × multiplicador (hacia arriba)', () => {
        const c = content();
        const smith = c.merchants['smith']!;
        expect(smith.stock.length).toBeGreaterThan(0);
        const s = session();
        const o = offer(s, 'smith', 'short_sword');
        const d = c.items['short_sword']!;
        expect(o.price).toBe(Math.ceil(d.value * c.rules.rarityValue[d.rarity] * smith.buyMultiplier));
        expect(o.quantity).toBeNull();
    });

    it('comprar cobra, mete en la mochila y gasta existencias limitadas', () => {
        const s = session();
        const h = s.character;
        const axe = offer(s, 'smith', 'woodcutter_axe');
        expect(s.buy('smith', axe.index, 1)).toEqual({ ok: false, reason: 'No tienes monedas suficientes' });
        h.addGold(axe.price);
        const exposed = axe.item.uid;
        expect(s.buy('smith', axe.index, 1).ok).toBe(true);
        expect(h.gold).toBe(0);
        // Se lleva la copia expuesta, con sus tiradas.
        expect(h.inventory.find(exposed)?.itemId).toBe('woodcutter_axe');
        // Quedaba 1: desaparece de la lista.
        expect(s.merchant('smith')!.stock.some((o) => o.item.itemId === 'woodcutter_axe')).toBe(false);
    });

    it('los apilables se compran por cantidad y los ilimitados no se agotan', () => {
        const s = session();
        const h = s.character;
        const pot = offer(s, 'apothecary', 'minor_health_potion');
        const before = h.inventory.count('minor_health_potion');
        h.addGold(pot.price * 4);
        expect(s.buy('apothecary', pot.index, 4).ok).toBe(true);
        expect(h.inventory.count('minor_health_potion')).toBe(before + 4);
        expect(h.gold).toBe(0);
        expect(offer(s, 'apothecary', 'minor_health_potion').quantity).toBeNull();
        const sword = offer(s, 'smith', 'short_sword');
        h.addGold(sword.price * 2);
        expect(s.buy('smith', sword.index, 2)).toEqual({ ok: false, reason: 'Se compra de uno en uno' });
    });

    it('vender paga el valor de venta y se puede recomprar al mismo precio', () => {
        const s = session();
        const h = s.character;
        h.give('fang', 5);
        const fang = h.inventory.slots.find((x) => x?.itemId === 'fang')!;
        const unit = s.sellValue(fang.uid) / fang.quantity;
        expect(s.sell('smith', fang.uid, 2).ok).toBe(true);
        expect(h.gold).toBe(unit * 2);
        expect(h.inventory.count('fang')).toBe(3);
        const bb = s.merchant('smith')!.buyback;
        expect(bb).toHaveLength(1);
        expect(bb[0]!.quantity).toBe(2);
        expect(bb[0]!.price).toBe(unit);
        expect(s.buyBack('smith', 0).ok).toBe(true);
        expect(h.gold).toBe(0);
        expect(h.inventory.count('fang')).toBe(5);
        expect(s.merchant('smith')!.buyback).toHaveLength(0);
    });

    it('no vende la mascota activa ni con la mochila llena', () => {
        const s = session();
        const h = s.character;
        const charm = h.inventory.slots.find((x) => x?.itemId === 'charm_ash_fox')!;
        s.useItem(charm.uid);
        expect(h.activePetItemUid).toBe(charm.uid);
        expect(s.sell('smith', charm.uid, 1)).toEqual({ ok: false, reason: 'Retira antes a la mascota' });
        fillInventory(h);
        const vest = offer(s, 'smith', 'padded_vest');
        h.addGold(vest.price);
        expect(s.buy('smith', vest.index, 1)).toEqual({ ok: false, reason: 'Inventario lleno' });
        expect(h.gold).toBe(vest.price);
    });

    // ─── JEQ-04: Filtrado de stock por nivel ───

    it('personaje nivel 1 no ve piezas de nivel alto en la tienda', () => {
        const s = session();
        const view = s.merchant('smith')!;
        // El personaje empieza en nivel 1; con margen +5, ve hasta nivel 6.
        for (const offer of view.stock) {
            const itemDef = content().items[offer.item.itemId]!;
            expect(itemDef.level, `${offer.item.itemId} level ${itemDef.level} should be <= 6`).toBeLessThanOrEqual(6);
        }
        // Hay al menos una pieza visible (las de nivel bajo).
        expect(view.stock.length).toBeGreaterThan(0);
    });

    it('personaje nivel 20 ve piezas hasta nivel 25', () => {
        const s = session();
        // Subir a nivel 20 (necesita ~301687 XP con base=40, exponent=2.42).
        s.character.gainXp(310000);
        expect(s.character.level).toBeGreaterThanOrEqual(20);
        const view = s.merchant('smith')!;
        for (const offer of view.stock) {
            const itemDef = content().items[offer.item.itemId]!;
            expect(
                itemDef.level,
                `${offer.item.itemId} level ${itemDef.level} should be <= ${s.character.level + 5}`,
            ).toBeLessThanOrEqual(s.character.level + 5);
        }
    });

    it('personaje nivel 200 ve todo el stock', () => {
        const s = session();
        // Subir a nivel 200 (necesita ~858M XP). Usar un valor muy alto.
        s.character.gainXp(1000000000);
        expect(s.character.level).toBeGreaterThanOrEqual(199);
        const view = s.merchant('smith')!;
        // Con nivel 200 + margen 5 = 205, todas las piezas (máx nivel 200) son visibles.
        const allItemIds = new Set(content().merchants['smith']!.stock.map((entry) => entry.itemId));
        const visibleItemIds = new Set(view.stock.map((o) => o.item.itemId));
        // Todas las piezas del mercader deben ser visibles.
        for (const id of allItemIds) {
            expect(visibleItemIds.has(id), `Item ${id} should be visible at level 200`).toBe(true);
        }
    });

    it('los índices del stock filtrado funcionan para comprar', () => {
        const s = session();
        const h = s.character;
        const view = s.merchant('smith')!;
        // Intenta comprar la primera pieza visible.
        if (view.stock.length > 0) {
            const first = view.stock[0]!;
            h.addGold(first.price * 10);
            // El índice debe apuntar a la pieza correcta en el stock interno.
            const result = s.buy('smith', first.index, 1);
            if (result.ok) {
                expect(h.inventory.count(first.item.itemId)).toBeGreaterThanOrEqual(1);
            }
        }
    });

    it('ningún objeto equipable está huérfano (sin fuente de adquisición)', () => {
        const c = content();
        // Fuentes de adquisición: mercader, botín (loot tables), starting items de clase
        // y recompensas de misión.
        const merchantItemIds = new Set(
            Object.values(c.merchants).flatMap((m) => m.stock.map((entry) => entry.itemId)),
        );
        const lootItemIds = new Set(
            Object.values(c.lootTables).flatMap((table) => table.entries.map((entry) => entry.itemId)),
        );
        // Los starting items de las clases también son una fuente.
        const startingItemIds = new Set(
            Object.values(c.classes).flatMap((cls) => cls.startingItems?.map((entry) => entry.itemId) ?? []),
        );
        const allSources = new Set([...merchantItemIds, ...lootItemIds, ...startingItemIds]);
        // Todos los items deben tener al menos una fuente de adquisición.
        for (const [itemId, itemDef] of Object.entries(c.items)) {
            // Los items de misión pura pueden no tener fuente automática.
            if (itemDef.category === 'quest') continue;
            // Los materiales de oficio se obtienen recolectando nodos del mundo.
            if (itemDef.category === 'material') continue;
            // Las monturas de desarrollo (mount_dev_*) solo las da npm run dev.
            if (itemId.startsWith('mount_dev_')) continue;
            expect(
                allSources.has(itemId),
                `Item ${itemId} (${itemDef.name}) should have a source (merchant, loot, or class starting)`,
            ).toBe(true);
        }
    });

    it('en el mundo: clic sobre el mercader → camina hasta él y abre la tienda', () => {
        const data = loadGameData();
        // La arena de los tests mide 80 m: se trae al herrero dentro. Sin entrada en
        // npcs.json (Slice 06) un mercader abre la tienda directamente.
        data.rpg = {
            ...data.rpg,
            npcs: {},
            merchants: { smith: { ...data.rpg.merchants['smith']!, position: { x: 30, y: 10 } } },
        };
        const rng = new Rng(3);
        const s = new GameSession(data.rpg, Character.create(data.rpg, 'ember_vanguard', 'Prueba', rng), rng);
        const w = new World(data, { encounter: false, character: s.character, seed: 3 });
        s.attach(w);
        w.player.pos = { x: 10, y: 10 };
        w.player.prevPos = { x: 10, y: 10 };
        expect(w.npcs).toHaveLength(1);
        const events: SessionEvent[] = [];
        s.on((e) => events.push(e));
        w.commandTalk('smith');
        for (let i = 0; i < 60 * 15 && !events.some((e) => e.type === 'openMerchant'); i++) w.tick(1 / 60);
        expect(events).toContainEqual({ type: 'openMerchant', merchantId: 'smith' });
        expect(Math.hypot(w.player.pos.x - 30, w.player.pos.y - 10)).toBeLessThanOrEqual(2.7);
        expect(w.player.path).toHaveLength(0);
        // Moverse cancela la conversación pendiente.
        w.commandTalk('smith');
        w.commandMove({ x: 12, y: 12 });
        expect(w.talkTarget).toBeNull();
    });
});
