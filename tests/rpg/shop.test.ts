import { describe, expect, it } from 'vitest';
import { loadGameData } from '../../src/data';
import { Character } from '../../src/rpg/character';
import type { SessionEvent } from '../../src/rpg/contracts';
import { GameSession } from '../../src/rpg/session';
import { Rng } from '../../src/sim/rng';
import { World } from '../../src/sim/world';
import { content, session } from './helpers';

const offer = (s: GameSession, merchant: string, itemId: string) => s.merchant(merchant)!.stock.find((o) => o.item.itemId === itemId)!;

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
    while (h.inventory.freeSlots() > 0) h.give('ore', 1_000);
    const vest = offer(s, 'smith', 'padded_vest');
    h.addGold(vest.price);
    expect(s.buy('smith', vest.index, 1)).toEqual({ ok: false, reason: 'Inventario lleno' });
    expect(h.gold).toBe(vest.price);
  });

  it('en el mundo: clic sobre el mercader → camina hasta él y abre la tienda', () => {
    const data = loadGameData();
    // La arena de los tests mide 80 m: se trae al herrero dentro.
    data.rpg = { ...data.rpg, merchants: { smith: { ...data.rpg.merchants['smith']!, position: { x: 30, y: 10 } } } };
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
