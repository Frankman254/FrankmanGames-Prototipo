import { ITEM_CATEGORIES, type CommandResult, type ItemCategory, type ItemInstance } from '../../rpg/contracts';
import type { UiContext } from './context';
import { button, clear, h } from './dom';
import { CATEGORY_LABEL } from './format';
import { itemIcon, RARITY_COLOR } from './icons';
import { itemInformationLines, showItemContextMenu } from './itemContextMenu';
import { Panel } from './panel';

type Side = 'bag' | 'bank';
type Category = ItemCategory | 'all';

export interface BankSelection {
  selected: Set<string>;
  anchor: string | null;
}

/** Selección por uid y orden visible, independiente del DOM y del almacenamiento. */
export function selectBankItems(current: ReadonlySet<string>, visible: readonly string[], clicked: string, anchor: string | null, ctrl: boolean, shift: boolean): BankSelection {
  if (!visible.includes(clicked)) return { selected: new Set(current), anchor };
  const selected = ctrl ? new Set(current) : new Set<string>();
  const from = anchor === null ? -1 : visible.indexOf(anchor);
  const to = visible.indexOf(clicked);
  if (shift && from >= 0) {
    for (let i = Math.min(from, to); i <= Math.max(from, to); i++) selected.add(visible[i]!);
    return { selected, anchor };
  }
  if (ctrl && selected.has(clicked)) selected.delete(clicked);
  else selected.add(clicked);
  return { selected, anchor: clicked };
}

export class BankPanel extends Panel {
  private readonly lists: Record<Side, HTMLElement>;
  private readonly counts: Record<Side, HTMLElement>;
  private readonly selected: Record<Side, Set<string>> = { bag: new Set(), bank: new Set() };
  private readonly anchors: Record<Side, string | null> = { bag: null, bank: null };
  private readonly filters: Record<Side, Category> = { bag: 'all', bank: 'all' };
  private readonly visible: Record<Side, ItemInstance[]> = { bag: [], bank: [] };
  private readonly depositSelection: HTMLButtonElement;
  private readonly withdrawSelection: HTMLButtonElement;
  private readonly depositCategory: HTMLButtonElement;
  private closeContext: (() => void) | null = null;

  constructor(ctx: UiContext, onClose: () => void) {
    super(ctx, 'Banco', 'panel-bank', onClose);
    this.el.style.cssText = 'position:absolute;left:24px;top:65px;width:min(880px,var(--ui-max-width,92vw));min-width:320px;resize:both;overflow:auto';
    this.lists = { bag: h('div.bank-list'), bank: h('div.bank-list') };
    this.counts = { bag: h('span.bank-count'), bank: h('span.bank-count') };
    this.depositSelection = button('Depositar selección', () => this.transfer('bag', [...this.selected.bag]), 'small primary');
    this.withdrawSelection = button('Retirar selección', () => this.transfer('bank', [...this.selected.bank]), 'small primary');
    this.depositCategory = button('Enviar categoría', () => {
      const category = this.filters.bag;
      if (category === 'all') return;
      this.transfer('bag', this.items('bag').filter((item) => this.ctx.session().content.items[item.itemId]?.category === category).map((item) => item.uid));
    }, 'small');
    const columns = h('div.bank-columns');
    columns.style.cssText = 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px';
    for (const side of ['bag', 'bank'] as const) {
      const filter = h('select.bank-filter', { 'aria-label': side === 'bag' ? 'Categoría de mochila' : 'Categoría de banco' },
        h('option', { value: 'all', text: 'Todas las categorías' }),
        ...ITEM_CATEGORIES.map((category) => h('option', { value: category, text: CATEGORY_LABEL[category] })));
      filter.addEventListener('change', () => {
        this.filters[side] = filter.value as Category;
        this.selected[side].clear();
        this.anchors[side] = null;
        this.render();
      });
      this.lists[side].style.cssText = 'display:grid;align-content:start;gap:5px;max-height:48vh;overflow:auto';
      const actions = side === 'bag'
        ? h('div.bank-actions', null,
          button('Enviar todo', () => this.transfer('bag', this.items('bag').map((item) => item.uid)), 'small'),
          this.depositCategory, this.depositSelection)
        : h('div.bank-actions', null, this.withdrawSelection);
      columns.append(h('section.bank-column', null,
        h('h3', { text: side === 'bag' ? 'Mochila' : 'Banco sin límite' }), this.counts[side], filter, this.lists[side], actions));
    }
    this.body.append(h('p.hint', { text: 'Clic: seleccionar · Ctrl + clic: añadir o quitar · Mayús + clic: rango · Doble clic: transferir pila · Clic derecho: opciones. Enviar todo solo mueve la mochila; conserva tu equipo.' }), columns);
    this.el.addEventListener('click', (e) => e.stopPropagation());
    this.el.addEventListener('dblclick', (e) => e.stopPropagation());
  }

  private items(side: Side): ItemInstance[] {
    const session = this.ctx.session();
    return side === 'bag' ? session.inventory().slots.filter((item): item is ItemInstance => item !== null) : (session.bank?.() ?? []);
  }

  private transfer(side: Side, uids: readonly string[]): void {
    if (uids.length === 0) return;
    this.closeContext?.();
    this.closeContext = null;
    const session = this.ctx.session();
    const result: CommandResult = side === 'bag'
      ? (session.bankDeposit?.(uids) ?? { ok: false, reason: 'No puedes depositar aquí' })
      : (session.bankWithdraw?.(uids) ?? { ok: false, reason: 'No puedes retirar aquí' });
    this.report(result);
    // Si solo cupo parte de una retirada, la selección restante se conserva.
    this.render();
  }

  override close(): void {
    this.closeContext?.();
    this.closeContext = null;
    this.selected.bag.clear();
    this.selected.bank.clear();
    this.anchors.bag = this.anchors.bank = null;
    super.close();
  }

  render(): void {
    this.closeContext?.();
    this.closeContext = null;
    const session = this.ctx.session();
    for (const side of ['bag', 'bank'] as const) {
      const items = this.items(side);
      const present = new Set(items.map((item) => item.uid));
      for (const uid of this.selected[side]) if (!present.has(uid)) this.selected[side].delete(uid);
      if (this.anchors[side] && !present.has(this.anchors[side]!)) this.anchors[side] = null;
      this.visible[side] = items.filter((item) => this.filters[side] === 'all' || session.content.items[item.itemId]?.category === this.filters[side]);
      clear(this.lists[side]);
      for (const item of this.visible[side]) {
        const def = session.content.items[item.itemId];
        const cell = h('button.bank-item', { type: 'button', 'data-bank-uid': item.uid, 'aria-pressed': 'false' });
        cell.style.cssText = 'display:flex;align-items:center;gap:8px;text-align:left;padding:7px;border:1px solid var(--line,#655437);border-radius:5px;color:inherit;background:transparent';
        const icon = h('span.bank-item-icon');
        if (def) { icon.innerHTML = itemIcon(def); icon.style.cssText = 'display:block;width:36px;height:36px;flex-shrink:0'; }
        cell.append(icon, h('span', { text: def?.name ?? item.itemId }), h('span.bank-quantity', { text: `×${item.quantity}` }));
        if (def) cell.style.setProperty('--rar', RARITY_COLOR[def.rarity]);
        this.ctx.tooltip.bind(cell, () => itemInformationLines(this.ctx, item));
        cell.addEventListener('click', (e) => {
          e.stopPropagation();
          const next = selectBankItems(this.selected[side], this.visible[side].map((entry) => entry.uid), item.uid, this.anchors[side], e.ctrlKey || e.metaKey, e.shiftKey);
          this.selected[side] = next.selected;
          this.anchors[side] = next.anchor;
          // No se reconstruye el DOM: así el segundo clic puede producir dblclick.
          this.paintSelection(side);
        });
        cell.addEventListener('dblclick', (e) => { e.preventDefault(); e.stopPropagation(); this.transfer(side, [item.uid]); });
        cell.addEventListener('contextmenu', (e) => {
          e.preventDefault(); e.stopPropagation();
          this.closeContext = showItemContextMenu(this.ctx, cell, item, side === 'bag'
            ? { deposit: () => this.transfer(side, [item.uid]) }
            : { withdraw: () => this.transfer(side, [item.uid]) });
        });
        this.lists[side].append(cell);
      }
      if (this.visible[side].length === 0) this.lists[side].append(h('p.hint', { text: items.length === 0 ? 'Sin objetos' : 'Sin objetos en esta categoría' }));
      this.paintSelection(side);
    }
    this.depositCategory.disabled = this.filters.bag === 'all' || !session.bankDeposit;
  }

  private paintSelection(side: Side): void {
    for (const cell of this.lists[side].querySelectorAll<HTMLButtonElement>('[data-bank-uid]')) {
      const selected = this.selected[side].has(cell.dataset.bankUid!);
      cell.classList.toggle('selected', selected);
      cell.setAttribute('aria-pressed', String(selected));
      cell.style.background = selected ? 'var(--bank-selected,#66502a)' : 'transparent';
      cell.style.outline = selected ? '1px solid var(--gold,#d6b76b)' : '';
    }
    this.counts[side].textContent = `${this.visible[side].length} pilas visibles · ${this.selected[side].size} seleccionadas`;
    this.depositSelection.disabled = this.selected.bag.size === 0 || !this.ctx.session().bankDeposit;
    this.withdrawSelection.disabled = this.selected.bank.size === 0 || !this.ctx.session().bankWithdraw;
  }
}
