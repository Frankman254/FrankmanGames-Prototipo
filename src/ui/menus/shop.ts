// Tienda de un mercader (Slice 05): saludo, existencias con precio, recompra
// de lo vendido y monedas. Clic = comprar (pide cantidad si se apila); clic
// derecho = comprar uno. Se vende arrastrando desde la mochila o con clic
// derecho en la mochila mientras la tienda está abierta.
// JUI-02: filtros combinables por elemento, conjunto y enfoque.
// UI-14: botón "Vender basura" para vender de golpe los objetos comunes de nivel inferior.
import type { MerchantOffer, MerchantView } from '../../rpg/contracts';
import { tr, trf } from '../../i18n';
import type { UiContext } from './context';
import { getJunkItems } from './bagView';
import { button, clear, h } from './dom';
import { dropAttr } from './drag';
import { itemTooltip } from './format';
import { RARITY_COLOR, itemIcon, namedIcon } from './icons';
import {
    ELEMENT_LABEL,
    FOCUS_LABEL,
    getElements,
    getSetIds,
    matchesCatalogFilter,
    type ItemCatalogFilter,
} from './itemFilters';
import { Panel } from './panel';

export class ShopPanel extends Panel {
    /** Mercader cuya tienda está abierta. */
    merchantId: string | null = null;
    private readonly greeting: HTMLElement;
    private readonly stock: HTMLElement;
    private readonly buyback: HTMLElement;
    private readonly gold: HTMLElement;
    private readonly heading: HTMLElement;
    // UI-14: botón de vender basura
    private readonly junkBtn: HTMLElement;
    // JUI-02: filtros de catálogo para el stock de la tienda
    private readonly filter: ItemCatalogFilter = { element: 'all', setId: 'all', focus: 'all' };
    private elementSel: HTMLSelectElement;
    private setSel: HTMLSelectElement;
    private focusSel: HTMLSelectElement;

    constructor(ctx: UiContext, onClose: () => void) {
        super(ctx, 'Tienda', 'panel-shop', onClose);
        this.heading = this.el.querySelector('h2')!;
        this.greeting = h('p.shop-greeting');
        this.stock = h('div.shop-grid');
        this.buyback = h('div.shop-grid.buyback');
        this.gold = h('div.gold');
        // UI-14: botón "Vender basura"
        this.junkBtn = button(tr('Vender basura'), () => this.trySellJunk(), 'small junk-sell');
        // Todo el panel acepta objetos de la mochila: soltar = vender.
        this.body.setAttribute('data-drop', dropAttr({ kind: 'shop' }));
        // JUI-02: selectores de filtro para la tienda
        this.elementSel = h('select.shop-filter', { title: 'Elemento' });
        this.setSel = h('select.shop-filter', { title: 'Conjunto' });
        this.focusSel = h('select.shop-filter', { title: 'Enfoque' });
        this.elementSel.append(h('option', { value: 'all', text: 'Todo elemento' }));
        this.setSel.append(h('option', { value: 'all', text: 'Todo conjunto' }));
        this.focusSel.append(h('option', { value: 'all', text: 'Todo enfoque' }));
        for (const focus of Object.keys(FOCUS_LABEL)) {
            this.focusSel.append(h('option', { value: focus, text: FOCUS_LABEL[focus as keyof typeof FOCUS_LABEL] }));
        }
        this.elementSel.addEventListener('change', () => {
            this.filter.element = this.elementSel.value as ItemCatalogFilter['element'];
            this.render();
        });
        this.setSel.addEventListener('change', () => {
            this.filter.setId = this.setSel.value as ItemCatalogFilter['setId'];
            this.render();
        });
        this.focusSel.addEventListener('change', () => {
            this.filter.focus = this.focusSel.value as ItemCatalogFilter['focus'];
            this.render();
        });
        this.body.append(
            this.greeting,
            h('h3', { text: 'A la venta' }),
            h('div.shop-filters', null, this.elementSel, this.setSel, this.focusSel),
            this.stock,
            h('h3', { text: 'Recompra' }),
            this.buyback,
            h(
                'div.inv-footer',
                null,
                this.gold,
                this.junkBtn,
                h('span.hint', { text: 'Clic: comprar · clic derecho: comprar uno · arrastra aquí para vender' }),
            ),
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

    /** UI-14: vender todos los objetos basura de la mochila, con confirmación propia. */
    private trySellJunk(): void {
        const s = this.ctx.session();
        const merchantId = this.merchantId;
        if (!merchantId || !s.sell) return;
        const inv = s.inventory();
        const sellValues: Record<string, number> = {};
        for (const it of inv.slots) {
            if (it) sellValues[it.uid] = s.sellValue(it.uid);
        }
        const junk = getJunkItems(inv.slots, s.content.items, s.player().level, sellValues);
        if (junk.length === 0) {
            this.ctx.toast(tr('No hay objetos que vender como basura'), 'info');
            return;
        }
        const totalValue = junk.reduce((sum, j) => sum + j.sellValue, 0);
        const lines = junk.map((j) => `${j.name}${j.quantity > 1 ? ` (×${j.quantity})` : ''} — ${j.sellValue} monedas`);
        // Máximo 8 líneas visibles; si hay más, se resume.
        const showLines = lines.slice(0, 8);
        const extra = lines.length > 8 ? `\n… y ${lines.length - 8} objetos más.` : '';
        this.ctx.confirm({
            title: tr('Vender basura'),
            text: `${trf('¿Vender {count} objetos por {value} monedas en total?', { count: junk.length, value: totalValue })}${extra}\n\n${showLines.join('\n')}`,
            yes: tr('Vender'),
            skip: true,
            onYes: (_n, skip) => {
                for (const j of junk) {
                    if (skip) this.ctx.trade.skip('sell');
                    const r = s.sell!(merchantId, j.uid, j.quantity);
                    if (!r.ok) {
                        this.ctx.toast(r.reason, 'warn');
                        break;
                    }
                }
                // Los paneles se actualizan solos por el evento 'changed' de cada sell().
            },
        });
    }

    render(): void {
        const s = this.ctx.session();
        const v = this.merchantId ? (s.merchant?.(this.merchantId) ?? null) : null;
        if (!v) {
            this.close();
            return;
        }
        this.heading.textContent = `${tr(v.name)} · ${tr(v.title)}`;
        this.greeting.textContent = `«${tr(v.greeting)}»`;
        // JUI-02: filtrar stock por catálogo
        const filteredStock = v.stock.filter((offer) => {
            const def = s.content.items[offer.item.itemId];
            if (!def) return false;
            return matchesCatalogFilter(def, this.filter, s.content.sets);
        });
        // Poblar selectores dinámicos
        const defs: import('../../rpg/contracts').ItemDef[] = [];
        for (const o of filteredStock) {
            const d = s.content.items[o.item.itemId];
            if (d) defs.push(d);
        }
        // Elemento
        const prevElement = this.filter.element;
        clear(this.elementSel);
        this.elementSel.append(h('option', { value: 'all', text: 'Todo elemento' }));
        for (const elem of getElements(defs)) {
            this.elementSel.append(h('option', { value: elem, text: ELEMENT_LABEL[elem] }));
        }
        if (prevElement !== 'all' && !getElements(defs).includes(prevElement)) {
            this.filter.element = 'all';
        }
        this.elementSel.value = this.filter.element;
        // Conjunto
        const prevSet = this.filter.setId;
        clear(this.setSel);
        this.setSel.append(h('option', { value: 'all', text: 'Todo conjunto' }));
        for (const setId of getSetIds(defs)) {
            const setName = s.content.sets[setId]?.name ?? setId;
            this.setSel.append(h('option', { value: setId, text: setName }));
        }
        if (prevSet !== 'all' && !getSetIds(defs).includes(prevSet)) {
            this.filter.setId = 'all';
        }
        this.setSel.value = this.filter.setId;
        // Enfoque
        clear(this.focusSel);
        this.focusSel.append(h('option', { value: 'all', text: 'Todo enfoque' }));
        for (const focus of Object.keys(FOCUS_LABEL)) {
            this.focusSel.append(h('option', { value: focus, text: FOCUS_LABEL[focus as keyof typeof FOCUS_LABEL] }));
        }
        this.focusSel.value = this.filter.focus;
        this.fill(this.stock, v, filteredStock, 'stock');
        this.fill(this.buyback, v, v.buyback, 'buyback');
        if (v.buyback.length === 0)
            this.buyback.appendChild(h('span.hint', { text: 'Nada todavía: lo que vendas aparecerá aquí.' }));
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
            if (kind === 'buyback' && o.item.quantity > 1)
                cell.appendChild(h('span.qty', { text: String(o.item.quantity) }));
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
                    showRollRanges: this.ctx.tooltip.detailsHeld,
                    priceLine:
                        kind === 'buyback'
                            ? `Recomprar: ${totalCost} monedas`
                            : `Precio: ${unitCost} monedas${def.maxStack > 1 ? ' cada uno' : ''}`,
                }),
            );
            const buyOneNow = (): void => {
                this.ctx.tooltip.hide();
                const r = kind === 'buyback' ? s.buyBack!(v.id, o.index) : s.buy!(v.id, o.index, 1);
                this.report(r);
            };
            // Confirmación antes de comprar (salvo «no volver a preguntar en esta sesión»).
            const buyOne = (): void => {
                const p = this.ctx.trade.prompt({
                    kind: 'buy',
                    stack: false,
                    rarity: def.rarity,
                    confirmRareSell: false,
                });
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
