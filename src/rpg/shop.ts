// Mercader: existencias (instancias con sus tiradas), precios, compra, venta y
// recompra. Idea tomada de la economía de FATE (comprar caro, vender barato,
// lo vendido se puede recuperar) con fórmula y números propios en datos.
import type { Character } from './character';
import { fail, OK } from './character';
import type { RpgContent } from './content';
import type { CommandResult, ItemInstance, MerchantDef, MerchantOffer, MerchantView } from './contracts';

interface StockEntry {
  /** Muestra con sus tiradas: es lo que se compra (para los no apilables, esa copia). */
  item: ItemInstance;
  /** null = ilimitado. */
  quantity: number | null;
}

interface BuybackEntry {
  item: ItemInstance;
  /** Lo que se pagó por unidad al venderlo (se recompra igual). */
  price: number;
}

export class Shop {
  private readonly stock: StockEntry[];
  private readonly buyback: BuybackEntry[] = [];

  constructor(
    private readonly content: RpgContent,
    readonly def: MerchantDef,
    private readonly character: Character,
  ) {
    this.stock = def.stock.map((s) => ({ item: character.items.create(s.itemId, 1), quantity: s.quantity }));
  }

  /** Precio de compra por unidad: valor × rareza × multiplicador del mercader, hacia arriba. */
  priceOf(itemId: string): number {
    const d = this.content.items[itemId]!;
    return Math.max(1, Math.ceil(d.value * this.content.rules.rarityValue[d.rarity] * this.def.buyMultiplier));
  }

  view(): MerchantView {
    const d = this.def;
    return {
      id: d.id,
      name: d.name,
      title: d.title,
      greeting: d.greeting,
      stock: this.stock.map((s, index): MerchantOffer => ({ index, item: s.item, price: this.priceOf(s.item.itemId), quantity: s.quantity })),
      buyback: this.buyback.map((b, index): MerchantOffer => ({ index, item: b.item, price: b.price, quantity: b.item.quantity })),
    };
  }

  buy(index: number, quantity: number): CommandResult {
    const s = this.stock[index];
    if (!s) return fail('Ese objeto ya no está');
    const c = this.character;
    const def = this.content.items[s.item.itemId]!;
    const q = Math.max(1, Math.floor(quantity));
    if (s.quantity !== null && s.quantity < q) return fail('No le quedan tantos');
    if (def.maxStack === 1 && q > 1) return fail('Se compra de uno en uno');
    const cost = this.priceOf(def.id) * q;
    if (c.gold < cost) return fail('No tienes monedas suficientes');
    // Los no apilables se llevan la copia expuesta (con sus tiradas) y se pone otra.
    const inst = def.maxStack === 1 ? s.item : c.items.create(def.id, q);
    if (!c.inventory.canAdd(inst)) return fail('Inventario lleno');
    c.inventory.add(inst);
    c.gold -= cost;
    if (s.quantity !== null) s.quantity -= q;
    if (s.quantity === 0) this.stock.splice(index, 1);
    else if (def.maxStack === 1) s.item = c.items.create(def.id, 1);
    c.emit({ type: 'loot', itemId: def.id, quantity: q });
    return OK;
  }

  /** Vende `quantity` de una pila por `unitPrice` cada una; queda para recomprar. */
  sell(uid: string, quantity: number, unitPrice: number): CommandResult {
    const c = this.character;
    const inst = c.inventory.find(uid);
    if (!inst) return fail('No está en la mochila');
    const def = this.content.items[inst.itemId]!;
    if (def.category === 'quest') return fail('No puedes vender eso');
    if (c.activePetItemUid === uid) return fail('Retira antes a la mascota');
    const q = Math.max(1, Math.min(Math.floor(quantity), inst.quantity));
    const removed = c.inventory.remove(uid, q);
    if (!removed) return fail('No se pudo vender');
    c.addGold(unitPrice * q);
    if (this.def.buybackSize > 0) {
      this.buyback.unshift({ item: removed, price: unitPrice });
      this.buyback.length = Math.min(this.buyback.length, this.def.buybackSize);
    }
    return OK;
  }

  buyBack(index: number): CommandResult {
    const b = this.buyback[index];
    if (!b) return fail('Ese objeto ya no está');
    const c = this.character;
    const cost = b.price * b.item.quantity;
    if (c.gold < cost) return fail('No tienes monedas suficientes');
    if (!c.inventory.canAdd(b.item)) return fail('Inventario lleno');
    c.inventory.add(b.item);
    c.gold -= cost;
    this.buyback.splice(index, 1);
    return OK;
  }
}
