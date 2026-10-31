// Tienda de un mercader (Slice 05): saludo, existencias con precio, recompra
// de lo vendido y monedas. Clic = comprar (pide cantidad si se apila); clic
// derecho = comprar uno. Se vende arrastrando desde la mochila o con clic
// derecho en la mochila mientras la tienda está abierta.
import type { MerchantOffer, MerchantView } from '../../rpg/contracts';
import type { UiContext } from './context';
import { clear, h } from './dom';
import { dropAttr } from './drag';
import { itemTooltip } from './format';
import { RARITY_COLOR, itemIcon, namedIcon } from './icons';
import { Panel } from './panel';

export class ShopPanel extends Panel {
  /** Mercader cuya tienda está abierta. */
  merchantId: string | null = null;
  private readonly greeting: HTMLElement;
  private readonly stock: HTMLElement;
  private readonly buyback: HTMLElement;
  private readonly gold: HTMLElement;
  private readonly heading: HTMLElement;

  constructor(ctx: UiContext, onClose: () => void) {
    super(ctx, 'Tienda', 'panel-shop', onClose);
    this.heading = this.el.querySelector('h2')!;
    this.greeting = h('p.shop-greeting');
    this.stock = h('div.shop-grid');
    this.buyback = h('div.shop-grid.buyback');
    this.gold = h('div.gold');
    // Todo el panel acepta objetos de la mochila: soltar = vender.
    this.body.setAttribute('data-drop', dropAttr({ kind: 'shop' }));
    this.body.append(
      this.greeting,
      h('h3', { text: 'A la venta' }),
      this.stock,
      h('h3', { text: 'Recompra' }),
      this.buyback,
      h('div.inv-footer', null, this.gold, h('span.hint', { text: 'Clic: comprar · clic derecho: comprar uno · arrastra aquí para vender' })),
    );
  }

  openFor(merchantId: string): void {
    this.merchantId = merchantId;
    this.open();
  }

  override close(): void {
    super.close();
    this.merchantId = null;
  }

  render(): void {
    const s = this.ctx.session();
    const v = this.merchantId ? (s.merchant?.(this.merchantId) ?? null) : null;
    if (!v) {
      this.close();
      return;
    }
    this.heading.textContent = `${v.name} · ${v.title}`;
    this.greeting.textContent = `«${v.greeting}»`;
    this.fill(this.stock, v, v.stock, 'stock');
    this.fill(this.buyback, v, v.buyback, 'buyback');
    if (v.buyback.length === 0) this.buyback.appendChild(h('span.hint', { text: 'Nada todavía: lo que vendas aparecerá aquí.' }));
    clear(this.gold);
    const coin = h('span.coin');
    coin.innerHTML = namedIcon('coin', '#e7c25a');
    this.gold.append(coin, h('b', { text: String(s.player().gold) }), ' monedas');
  }

  private fill(grid: HTMLElement, v: MerchantView, offers: MerchantOffer[], kind: 'stock' | 'buyback'): void {
    clear(grid);
    const s = this.ctx.session();
    const gold = s.player().gold;
    for (const o of offers) {
      const def = s.content.items[o.item.itemId];
      if (!def) continue;
      const unitCost = o.price;
      const totalCost = kind === 'buyback' ? o.price * o.item.quantity : unitCost;
      const cell = h('div.cell.filled.shop-cell', { 'data-drop': dropAttr({ kind: 'shop' }) });
      cell.innerHTML = itemIcon(def);
      cell.style.setProperty('--rar', RARITY_COLOR[def.rarity]);
      cell.classList.add(`r-${def.rarity}`);
      if (gold < totalCost) cell.classList.add('locked');
      if (kind === 'buyback' && o.item.quantity > 1) cell.appendChild(h('span.qty', { text: String(o.item.quantity) }));
      if (kind === 'stock' && o.quantity !== null) cell.appendChild(h('span.qty', { text: `×${o.quantity}` }));
      cell.appendChild(h('span.price', { text: String(totalCost) }));
      this.ctx.tooltip.bind(cell, () =>
        itemTooltip(o.item, {
          content: s.content,
          equipment: s.equipment(),
          equipped: false,
          compare: [],
          sellValue: 0,
          inShop: true,
          playerLevel: s.player().level,
          priceLine: kind === 'buyback' ? `Recomprar: ${totalCost} monedas` : `Precio: ${unitCost} monedas${def.maxStack > 1 ? ' cada uno' : ''}`,
        }),
      );
      const buyOneNow = (): void => {
        this.ctx.tooltip.hide();
        const r = kind === 'buyback' ? s.buyBack!(v.id, o.index) : s.buy!(v.id, o.index, 1);
        this.report(r);
      };
      // Confirmación antes de comprar (salvo «no volver a preguntar en esta sesión»).
      const buyOne = (): void => {
        const p = this.ctx.trade.prompt({ kind: 'buy', stack: false, rarity: def.rarity, confirmRareSell: false });
        if (p.mode === 'direct') return buyOneNow();
        this.ctx.confirm({
          title: kind === 'buyback' ? `Recomprar ${def.name}` : `Comprar ${def.name}`,
          text: `¿${kind === 'buyback' ? 'Recomprarlo' : 'Comprarlo'} por ${totalCost} monedas?`,
          yes: kind === 'buyback' ? 'Recomprar' : 'Comprar',
          skip: p.skippable,
          onYes: (_n, skip) => {
            if (skip) this.ctx.trade.skip('buy');
            buyOneNow();
          },
        });
      };
      cell.addEventListener('click', () => {
        if (kind === 'stock' && def.maxStack > 1) {
          const afford = Math.floor(gold / Math.max(1, unitCost));
          const max = Math.max(1, Math.min(def.maxStack, o.quantity ?? def.maxStack, afford));
          this.ctx.confirm({
            title: `Comprar ${def.name}`,
            text: `${unitCost} monedas cada uno (tienes ${gold}). ¿Cuántos?`,
            yes: 'Comprar',
            input: { min: 1, max, value: 1 },
            onYes: (n) => this.report(s.buy!(v.id, o.index, n)),
          });
        } else buyOne();
      });
      cell.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        buyOne();
      });
      grid.appendChild(cell);
    }
  }
}
