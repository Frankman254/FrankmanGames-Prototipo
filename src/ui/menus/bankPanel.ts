import { ITEM_CATEGORIES, type CommandResult, type ItemCategory, type ItemInstance } from '../../rpg/contracts';
import type { UiContext } from './context';
import { button, clear, h } from './dom';
import { CATEGORY_LABEL } from './format';
import { bagCellCount } from './gridFill';
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

const MARQUEE_MIN_PX = 6;

/** Rectángulo de arrastre, en cualquier dirección. */
export function marqueeRect(x0: number, y0: number, x1: number, y1: number): { left: number; top: number; width: number; height: number } {
  return { left: Math.min(x0, x1), top: Math.min(y0, y1), width: Math.abs(x1 - x0), height: Math.abs(y1 - y0) };
}

/** Columnas de cada rejilla del banco según el ancho de la pantalla. */
export function bankColumns(viewportWidth: number): 4 | 6 | 8 {
  if (viewportWidth < 1100) return 4;
  return viewportWidth < 1700 ? 6 : 8;
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
  private marqueeJustEnded = false;

  constructor(ctx: UiContext, onClose: () => void) {
    super(ctx, 'Banco', 'panel-bank', onClose);
    this.el.style.cssText = 'position:absolute;left:24px;top:65px;width:max-content;max-width:var(--ui-max-width,92vw);min-width:320px;resize:both;overflow:auto';
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
      this.watchMarquee(side);
      const actions = side === 'bag'
        ? h('div.bank-actions', null,
          button('Enviar todo', () => this.transfer('bag', this.items('bag').map((item) => item.uid)), 'small'),
          this.depositCategory, this.depositSelection)
        : h('div.bank-actions', null, this.withdrawSelection);
      columns.append(h('section.bank-column', null,
        h('h3', { text: side === 'bag' ? 'Mochila' : 'Banco sin límite' }), this.counts[side], filter, this.lists[side], actions));
    }
    this.body.append(h('p.hint', { text: 'Clic: seleccionar · Ctrl + clic: añadir o quitar · Mayús + clic: rango · Arrastrar: seleccionar varias · Doble clic: transferir pila · Clic derecho: opciones. Enviar todo solo mueve la mochila; conserva tu equipo.' }), columns);
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
        const cell = h('div.cell.filled.bank-item', { 'data-bank-uid': item.uid, 'aria-pressed': 'false', role: 'button', tabindex: '0' });
        if (def) cell.innerHTML = itemIcon(def);
        if (item.quantity > 1) cell.appendChild(h('span.qty', { text: String(item.quantity) }));
        if (def) cell.style.setProperty('--rar', RARITY_COLOR[def.rarity]);
        this.ctx.tooltip.bind(cell, () => itemInformationLines(this.ctx, item));
        cell.addEventListener('click', (e) => {
          e.stopPropagation();
          // El arrastre ya eligió: este clic no debe deshacerlo.
          if (this.marqueeJustEnded) return;
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
      // Rejilla de 4, 6 u 8 columnas según la pantalla, con casillas libres de relleno.
      const columns = bankColumns(window.innerWidth);
      this.lists[side].style.gridTemplateColumns = `repeat(${columns},46px)`;
      const total = bagCellCount(this.visible[side].length - 1, { columns, rows: 6 });
      for (let i = this.visible[side].length; i < total; i++) this.lists[side].append(h('div.cell'));
      this.paintSelection(side);
    }
    this.depositCategory.disabled = this.filters.bag === 'all' || !session.bankDeposit;
  }

  /** Arrastrar sobre la rejilla dibuja un rectángulo y selecciona lo que toca. */
  private watchMarquee(side: Side): void {
    const list = this.lists[side];
    list.addEventListener('pointerdown', (down) => {
      if (down.button !== 0 || down.ctrlKey || down.shiftKey) return;
      const box = h('div.bank-marquee');
      let active = false;
      const move = (e: PointerEvent): void => {
        const rect = marqueeRect(down.clientX, down.clientY, e.clientX, e.clientY);
        if (!active && rect.width + rect.height < MARQUEE_MIN_PX) return;
        if (!active) {
          active = true;
          document.body.appendChild(box);
        }
        box.style.cssText = `left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px`;
        this.selected[side].clear();
        for (const cell of list.querySelectorAll<HTMLElement>('[data-bank-uid]')) {
          const c = cell.getBoundingClientRect();
          if (c.left < rect.left + rect.width && c.right > rect.left && c.top < rect.top + rect.height && c.bottom > rect.top) this.selected[side].add(cell.dataset.bankUid!);
        }
        this.anchors[side] = null;
        this.paintSelection(side);
      };
      const up = (): void => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        box.remove();
        if (!active) return;
        this.marqueeJustEnded = true;
        setTimeout(() => (this.marqueeJustEnded = false), 0);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
  }

  private paintSelection(side: Side): void {
    for (const cell of this.lists[side].querySelectorAll<HTMLButtonElement>('[data-bank-uid]')) {
      const selected = this.selected[side].has(cell.dataset.bankUid!);
      cell.classList.toggle('selected', selected);
      cell.setAttribute('aria-pressed', String(selected));
    }
    this.counts[side].textContent = `${this.visible[side].length} pilas visibles · ${this.selected[side].size} seleccionadas`;
    this.depositSelection.disabled = this.selected.bag.size === 0 || !this.ctx.session().bankDeposit;
    this.withdrawSelection.disabled = this.selected.bank.size === 0 || !this.ctx.session().bankWithdraw;
  }
}
