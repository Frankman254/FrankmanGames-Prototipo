// Mochila (cuadrícula con arrastrar y soltar, apilar, ordenar, tirar, clic
// derecho para usar/equipar, monedas) junto al equipo (muñeco de huecos).
import { EQUIP_SLOTS, type EquipSlot } from '../../rpg/contracts';
import { itemTip, type UiContext } from './context';
import { button, clear, h } from './dom';
import { dropAttr } from './drag';
import { SLOT_LABEL, formatStatValue, statLabel } from './format';
import { RARITY_COLOR, itemIcon, namedIcon } from './icons';
import { Panel } from './panel';

/** Icono de hueco vacío por posición del muñeco. */
const EMPTY_GLYPH: Record<EquipSlot, string> = {
  weapon: 'sword', offhand: 'shield', head: 'head', chest: 'chest', hands: 'hands', feet: 'feet', ring1: 'ring', ring2: 'ring', amulet: 'amulet',
};

/** Etiquetas cortas bajo los huecos vacíos del muñeco. */
const DOLL_LABEL: Record<EquipSlot, string> = {
  weapon: 'Arma', offhand: 'Mano izq.', head: 'Cabeza', chest: 'Torso', hands: 'Manos', feet: 'Pies', ring1: 'Anillo', ring2: 'Anillo', amulet: 'Amuleto',
};

export class InventoryPanel extends Panel {
  private readonly doll: HTMLElement;
  private readonly grid: HTMLElement;
  private readonly gold: HTMLElement;
  private readonly summary: HTMLElement;
  private readonly hint: HTMLElement;

  constructor(ctx: UiContext, onClose: () => void) {
    super(ctx, 'Mochila y equipo', 'panel-inventory', onClose);
    this.doll = h('div.doll');
    this.summary = h('div.doll-summary');
    this.grid = h('div.inv-grid');
    this.gold = h('div.gold');
    this.hint = h('span.hint');
    const sort = button('Ordenar', () => this.report(this.ctx.session().sortInventory()), 'small');
    this.body.append(
      h('div.inv-layout', null,
        h('section.equip-col', null, h('h3', { text: 'Equipo' }), this.doll, this.summary),
        h('section.bag-col', null, h('h3', { text: 'Mochila' }), this.grid,
          h('div.inv-footer', null, this.gold, this.hint, sort))),
    );
  }

  render(): void {
    const s = this.ctx.session();
    const eq = s.equipment();
    clear(this.doll);
    for (const slot of EQUIP_SLOTS) {
      const it = eq[slot];
      const def = it ? s.content.items[it.itemId] : undefined;
      const cell = h(`div.cell.eq.eq-${slot}` as 'div', { 'data-drop': dropAttr({ kind: 'equipment', slot }), title: it ? undefined : SLOT_LABEL[slot] });
      if (it && def) {
        cell.innerHTML = itemIcon(def);
        cell.style.setProperty('--rar', RARITY_COLOR[def.rarity]);
        cell.classList.add('filled');
        this.ctx.drag.draggable(cell, () => ({ kind: 'equipment', slot, uid: it.uid }), () => itemIcon(def));
        this.ctx.tooltip.bind(cell, () => itemTip(this.ctx, it.uid, true));
        cell.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          this.ctx.tooltip.hide();
          this.report(this.ctx.session().unequip(slot));
        });
      } else {
        cell.innerHTML = namedIcon(EMPTY_GLYPH[slot], '#5a4a33');
        cell.appendChild(h('span.lbl', { text: DOLL_LABEL[slot] }));
      }
      this.doll.appendChild(cell);
    }

    const p = s.player();
    const val = (id: Parameters<typeof statLabel>[0]): string => formatStatValue(id, p.stats.find((x) => x.stat === id)?.value ?? 0);
    clear(this.summary);
    for (const id of ['maxHealth', 'resist.physical', 'power', 'critChance'] as const) {
      this.summary.appendChild(h('div', null, h('span', { text: statLabel(id) }), h('b', { text: val(id) })));
    }

    const inv = s.inventory();
    clear(this.grid);
    inv.slots.forEach((it, index) => {
      const cell = h('div.cell', { 'data-drop': dropAttr({ kind: 'inventory', index }) });
      const def = it ? s.content.items[it.itemId] : undefined;
      if (it && def) {
        cell.innerHTML = itemIcon(def);
        cell.style.setProperty('--rar', RARITY_COLOR[def.rarity]);
        cell.classList.add('filled', `r-${def.rarity}`);
        if (it.quantity > 1) cell.appendChild(h('span.qty', { text: String(it.quantity) }));
        if (it.uid === s.pet()?.itemUid) cell.appendChild(h('span.badge', { text: 'activa' }));
        if (def.level > p.level) cell.classList.add('locked');
        this.ctx.drag.draggable(cell, () => ({ kind: 'inventory', index, uid: it.uid }), () => itemIcon(def));
        this.ctx.tooltip.bind(cell, () => itemTip(this.ctx, it.uid, false));
        cell.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          this.ctx.tooltip.hide();
          // Con una tienda abierta, el clic derecho vende en vez de usar.
          if (this.ctx.merchant()) this.ctx.sell(it.uid);
          else this.report(this.ctx.session().useItem(it.uid));
        });
      }
      this.grid.appendChild(cell);
    });

    this.hint.textContent = this.ctx.merchant() ? 'Clic derecho o arrastrar a la tienda: vender' : 'Clic derecho: usar · arrastra fuera para tirar';
    clear(this.gold);
    const coin = h('span.coin');
    coin.innerHTML = namedIcon('coin', '#e7c25a');
    this.gold.append(coin, h('b', { text: String(p.gold) }), ' monedas');
  }
}
