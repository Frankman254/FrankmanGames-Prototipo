// Mochila y equipo (`equipo-objetos`). A la izquierda, el muñeco: una silueta
// con cada hueco donde va en el cuerpo (cabeza arriba, armas a los lados de las
// manos, pies abajo, anillos y amuleto junto a la mano y el cuello) y, debajo,
// los totales: características, resistencias y daño por elemento, conjuntos y
// la regla de manos. A la derecha, la mochila con filtros (grupo, tipo y
// rareza) y orden por criterio. Arrastrar y soltar, clic derecho para usar o
// equipar (Mayús + clic derecho: mano izquierda) y monedas, como antes.
import {
  ELEMENTS,
  EQUIP_SLOTS,
  INVENTORY_SORT_KEYS,
  RARITIES,
  type EquipSlot,
  type InventorySortKey,
  type ItemDef,
  type ItemKind,
  type Rarity,
  type StatId,
} from '../../rpg/contracts';
import { fitsEquipSlot, ITEM_KIND_GROUP, isTwoHanded, kindOf } from '../../rpg/items';
import { itemTip, type UiContext } from './context';
import { button, clear, h } from './dom';
import { dropAttr } from './drag';
import { ELEMENT_LABEL, KIND_LABEL, RARITY_LABEL, SLOT_LABEL, formatModifier, formatStatValue, statLabel } from './format';
import { ELEMENT_COLOR, RARITY_COLOR, itemIcon, kindIcon, namedIcon } from './icons';
import { Panel } from './panel';

/** Silueta de hueco vacío. */
const EMPTY_KIND: Record<EquipSlot, ItemKind> = {
  weapon: 'sword', offhand: 'shield', head: 'helmet', chest: 'armor', hands: 'gloves', feet: 'boots',
  ring1: 'ring', ring2: 'ring', amulet: 'amulet', back: 'cape', waist: 'belt',
};

/** Etiquetas cortas bajo los huecos vacíos del muñeco. */
const DOLL_LABEL: Record<EquipSlot, string> = {
  weapon: 'Mano der.', offhand: 'Mano izq.', head: 'Cabeza', chest: 'Torso', hands: 'Manos', feet: 'Pies',
  ring1: 'Anillo', ring2: 'Anillo', amulet: 'Cuello', back: 'Espalda', waist: 'Cintura',
};

// Muñeco: rejilla de 5 × 5 huecos de 50 px (10 px entre columnas y 12 entre
// filas). Centro de una casilla: x = 25 + 60·(col − 1), y = 25 + 62·(fila − 1).
const DOLL_W = 290;
const DOLL_H = 298;
const cellCenter = (col: number, row: number): [number, number] => [25 + 60 * (col - 1), 25 + 62 * (row - 1)];
/** Hueco → [columna, fila] y punto del cuerpo al que apunta su línea (null = encima del cuerpo). */
const DOLL_PLACE: Record<EquipSlot, { at: [number, number]; to: [number, number] | null }> = {
  head: { at: [3, 1], to: null },
  amulet: { at: [4, 1], to: [148, 56] },
  back: { at: [1, 2], to: [112, 72] },
  chest: { at: [3, 2], to: null },
  ring1: { at: [5, 2], to: [197, 198] },
  hands: { at: [1, 3], to: [96, 186] },
  waist: { at: [3, 3], to: null },
  ring2: { at: [5, 3], to: [197, 198] },
  weapon: { at: [1, 4], to: [93, 198] },
  offhand: { at: [5, 4], to: [197, 198] },
  feet: { at: [3, 5], to: null },
};

/** Grupos de los filtros rápidos de la mochila. */
const GROUPS = [
  { id: 'all', label: 'Todo' },
  { id: 'weapon', label: 'Armas' },
  { id: 'armor', label: 'Armadura' },
  { id: 'jewel', label: 'Joyas' },
  { id: 'use', label: 'Consumibles' },
  { id: 'material', label: 'Materiales' },
] as const;
type GroupId = (typeof GROUPS)[number]['id'];

const SORT_LABEL: Record<InventorySortKey, string> = { category: 'Categoría', kind: 'Tipo', rarity: 'Rareza', level: 'Nivel', name: 'Nombre' };

/** Características que se resumen bajo el muñeco. */
const SUMMARY_STATS: StatId[] = ['maxHealth', 'maxResource', 'power', 'critChance', 'critBonus', 'cooldownReduction', 'healthRegen', 'resourceRegen', 'moveSpeed'];
const PRIMARY: StatId[] = ['strength', 'agility', 'intellect', 'vitality', 'spirit'];

export function groupOf(def: ItemDef): Exclude<GroupId, 'all'> {
  const g = ITEM_KIND_GROUP[kindOf(def)];
  if (g === 'weapon1h' || g === 'weapon2h') return 'weapon';
  if (g === 'armor' || g === 'offhand') return 'armor';
  if (g === 'jewel') return 'jewel';
  if (g === 'consumable' || g === 'scroll' || g === 'charm') return 'use';
  return 'material';
}

export interface BagFilter {
  group: GroupId;
  kind: ItemKind | 'all';
  rarity: Rarity | 'all';
}

/** ¿Pasa el objeto los filtros de la mochila? (puro, para tests). */
export function matchesFilter(def: ItemDef, f: BagFilter): boolean {
  if (f.group !== 'all' && groupOf(def) !== f.group) return false;
  if (f.kind !== 'all' && kindOf(def) !== f.kind) return false;
  if (f.rarity !== 'all' && def.rarity !== f.rarity) return false;
  return true;
}

export class InventoryPanel extends Panel {
  private readonly doll: HTMLElement;
  private readonly stats: HTMLElement;
  private readonly grid: HTMLElement;
  private readonly gold: HTMLElement;
  private readonly hint: HTMLElement;
  private readonly chips: HTMLElement;
  private readonly kindSel: HTMLSelectElement;
  private readonly raritySel: HTMLSelectElement;
  private readonly sortSel: HTMLSelectElement;
  private readonly count: HTMLElement;
  private filter: BagFilter = { group: 'all', kind: 'all', rarity: 'all' };
  private sortBy: InventorySortKey = 'category';

  constructor(ctx: UiContext, onClose: () => void) {
    super(ctx, 'Mochila y equipo', 'panel-inventory', onClose);
    this.doll = h('div.doll');
    this.stats = h('div.eq-stats');
    this.grid = h('div.inv-grid');
    this.gold = h('div.gold');
    this.hint = h('span.hint');
    this.chips = h('div.bag-chips');
    this.count = h('span.bag-count');
    this.kindSel = h('select.bag-select', { title: 'Tipo' });
    this.raritySel = h('select.bag-select', { title: 'Rareza' });
    this.sortSel = h('select.bag-select', { title: 'Criterio de «Ordenar»' });
    this.raritySel.append(h('option', { value: 'all', text: 'Toda rareza' }), ...RARITIES.map((r) => h('option', { value: r, text: RARITY_LABEL[r] })));
    for (const k of INVENTORY_SORT_KEYS) this.sortSel.append(h('option', { value: k, text: `Por ${SORT_LABEL[k].toLowerCase()}` }));
    this.kindSel.addEventListener('change', () => this.setFilter({ kind: this.kindSel.value as BagFilter['kind'] }));
    this.raritySel.addEventListener('change', () => this.setFilter({ rarity: this.raritySel.value as BagFilter['rarity'] }));
    this.sortSel.addEventListener('change', () => (this.sortBy = this.sortSel.value as InventorySortKey));
    const sort = button('Ordenar', () => this.report(this.ctx.session().sortInventory(this.sortBy)), 'small');
    this.body.append(
      h('div.inv-layout', null,
        h('section.equip-col', null, h('h3', { text: 'Equipo' }), this.doll, this.stats),
        h('section.bag-col', null,
          h('div.bag-head', null, h('h3', { text: 'Mochila' }), this.count),
          this.chips,
          h('div.bag-tools', null, this.kindSel, this.raritySel, this.sortSel, sort),
          this.grid,
          h('div.inv-footer', null, this.gold, this.hint))),
    );
  }

  private setFilter(f: Partial<BagFilter>): void {
    // El tipo que ya no está en el grupo elegido se suelta al repintar.
    this.filter = { ...this.filter, ...f };
    this.render();
  }

  render(): void {
    this.renderDoll();
    this.renderStats();
    this.renderBag();
  }

  // ─── Muñeco ───────────────────────────────────────────────────────────────

  private renderDoll(): void {
    const s = this.ctx.session();
    const eq = s.equipment();
    const main = eq.weapon ? s.content.items[eq.weapon.itemId] : undefined;
    const twoHanded = isTwoHanded(main);
    const tint = s.content.classes[s.player().classId]?.resource.color ?? 'var(--gold)';
    clear(this.doll);
    this.doll.appendChild(dollFigure(tint, twoHanded));
    for (const slot of EQUIP_SLOTS) {
      const it = eq[slot];
      const def = it ? s.content.items[it.itemId] : undefined;
      const [col, row] = DOLL_PLACE[slot].at;
      const cell = h(`div.cell.eq.eq-${slot}` as 'div', { 'data-drop': dropAttr({ kind: 'equipment', slot }), title: it ? undefined : SLOT_LABEL[slot] });
      cell.style.gridArea = `${row} / ${col}`;
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
      } else if (slot === 'offhand' && twoHanded && main) {
        // La mano izquierda la ocupa el arma de dos manos: se ve su silueta apagada.
        cell.innerHTML = itemIcon(main);
        cell.classList.add('blocked');
        cell.title = `Ocupada por ${main.name} (dos manos)`;
        cell.appendChild(h('span.lbl', { text: '2 manos' }));
      } else {
        cell.innerHTML = kindIcon(EMPTY_KIND[slot]);
        cell.appendChild(h('span.lbl', { text: DOLL_LABEL[slot] }));
      }
      this.doll.appendChild(cell);
    }
  }

  // ─── Totales ──────────────────────────────────────────────────────────────

  private renderStats(): void {
    const s = this.ctx.session();
    const p = s.player();
    const eq = s.equipment();
    const val = (id: StatId): number => p.stats.find((x) => x.stat === id)?.value ?? 0;
    clear(this.stats);

    const prim = h('div.eq-prim');
    for (const id of PRIMARY) prim.appendChild(h('div', { title: statLabel(id) }, h('span', { text: statLabel(id).slice(0, 3) }), h('b', { text: formatStatValue(id, val(id)) })));
    const main = h('div.eq-main');
    for (const id of SUMMARY_STATS) main.appendChild(h('div', null, h('span', { text: statLabel(id) }), h('b', { text: formatStatValue(id, val(id)) })));

    // Resistencia y daño plano por elemento, con el tope de resistencia.
    const cap = s.content.progression.resistCap;
    const table = h('table.eq-elements', null,
      h('thead', null, h('tr', null, h('th', { text: 'Elemento' }), h('th', { text: 'Resist.' }), h('th', { text: 'Daño +' }))));
    const body = h('tbody');
    for (const el of ELEMENTS) {
      const res = val(`resist.${el}`);
      const dmg = val(`damage.${el}`);
      const dotEl = h('i.el-dot');
      dotEl.style.background = ELEMENT_COLOR[el];
      const resCell = h('td', { text: formatStatValue(`resist.${el}`, Math.min(res, cap)) });
      if (res >= cap) {
        resCell.classList.add('capped');
        resCell.title = `Tope: ${cap} %`;
      }
      body.appendChild(h('tr', null, h('td', null, dotEl, ELEMENT_LABEL[el]), resCell, h('td', { text: dmg ? `+${formatStatValue(`damage.${el}`, dmg)}` : '—' })));
    }
    table.appendChild(body);

    this.stats.append(h('h4', { text: 'Características' }), prim, main, h('h4', { text: `Por elemento (tope ${cap} %)` }), table);

    // Conjuntos con piezas puestas: cuántas y qué escalones están activos.
    const worn = new Map<string, number>();
    for (const it of Object.values(eq)) {
      const setId = it ? s.content.items[it.itemId]?.setId : undefined;
      if (setId) worn.set(setId, (worn.get(setId) ?? 0) + 1);
    }
    if (worn.size > 0) {
      const sets = h('div.eq-sets');
      for (const [setId, count] of worn) {
        const set = s.content.sets[setId];
        if (!set) continue;
        const total = Object.values(s.content.items).filter((d) => d.setId === setId).length;
        sets.appendChild(h('div.eq-set-name', { text: `${set.name} (${count}/${total})` }));
        for (const b of set.bonuses) sets.appendChild(h(`div.eq-set-bonus${count >= b.pieces ? '.on' : ''}` as 'div', { text: `(${b.pieces}) ${b.modifiers.map(formatModifier).join(', ')}` }));
      }
      this.stats.append(h('h4', { text: 'Conjuntos' }), sets);
    }
    this.stats.append(h('p.eq-hands', { text: handsSummary(s.content, eq) }));
  }

  // ─── Mochila ──────────────────────────────────────────────────────────────

  private renderBag(): void {
    const s = this.ctx.session();
    const p = s.player();
    const inv = s.inventory();

    clear(this.chips);
    for (const g of GROUPS) {
      const chip = button(g.label, () => this.setFilter({ group: g.id, kind: 'all' }), `chip${this.filter.group === g.id ? ' on' : ''}`);
      this.chips.appendChild(chip);
    }
    // Tipos presentes en la mochila (dentro del grupo elegido).
    const kinds = new Set<ItemKind>();
    for (const it of inv.slots) {
      const def = it ? s.content.items[it.itemId] : undefined;
      if (def && (this.filter.group === 'all' || groupOf(def) === this.filter.group)) kinds.add(kindOf(def));
    }
    if (this.filter.kind !== 'all' && !kinds.has(this.filter.kind)) this.filter.kind = 'all';
    clear(this.kindSel);
    this.kindSel.append(h('option', { value: 'all', text: 'Todo tipo' }), ...[...kinds].sort((a, b) => KIND_LABEL[a].localeCompare(KIND_LABEL[b])).map((k) => h('option', { value: k, text: KIND_LABEL[k] })));
    this.kindSel.value = this.filter.kind;
    this.raritySel.value = this.filter.rarity;
    this.sortSel.value = this.sortBy;

    const filtering = this.filter.group !== 'all' || this.filter.kind !== 'all' || this.filter.rarity !== 'all';
    let used = 0;
    let shown = 0;
    clear(this.grid);
    inv.slots.forEach((it, index) => {
      const cell = h('div.cell', { 'data-drop': dropAttr({ kind: 'inventory', index }) });
      const def = it ? s.content.items[it.itemId] : undefined;
      if (it && def) {
        used++;
        cell.innerHTML = itemIcon(def);
        cell.style.setProperty('--rar', RARITY_COLOR[def.rarity]);
        cell.classList.add('filled', `r-${def.rarity}`);
        if (filtering && !matchesFilter(def, this.filter)) cell.classList.add('dim');
        else shown++;
        if (it.quantity > 1) cell.appendChild(h('span.qty', { text: String(it.quantity) }));
        if (it.uid === s.pet()?.itemUid) cell.appendChild(h('span.badge', { text: 'activa' }));
        if (def.level > p.level) cell.classList.add('locked');
        else if (def.level > 1 && def.slot) cell.appendChild(h('span.lvl', { text: String(def.level) }));
        this.ctx.drag.draggable(cell, () => ({ kind: 'inventory', index, uid: it.uid }), () => itemIcon(def));
        this.ctx.tooltip.bind(cell, () => itemTip(this.ctx, it.uid, false));
        cell.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          this.ctx.tooltip.hide();
          const ses = this.ctx.session();
          // Con una tienda abierta, el clic derecho vende en vez de usar.
          if (this.ctx.merchant()) this.ctx.sell(it.uid);
          else if (e.shiftKey && fitsEquipSlot(def, 'offhand')) this.report(ses.equip(it.uid, 'offhand'));
          else this.report(ses.useItem(it.uid));
        });
      }
      this.grid.appendChild(cell);
    });
    this.count.textContent = filtering ? `${shown} de ${used} · ${inv.size} huecos` : `${used} / ${inv.size}`;

    this.hint.textContent = this.ctx.merchant()
      ? 'Clic derecho o arrastrar a la tienda: vender'
      : 'Clic derecho: usar o equipar · Mayús: mano izquierda · arrastra fuera para tirar';
    clear(this.gold);
    const coin = h('span.coin');
    coin.innerHTML = namedIcon('coin', '#e7c25a');
    this.gold.append(coin, h('b', { text: String(p.gold) }), ' monedas');
  }
}

/** Frase con la regla de manos que rige ahora mismo. */
export function handsSummary(content: { items: Record<string, ItemDef> }, eq: Partial<Record<EquipSlot, { itemId: string } | null>>): string {
  const main = eq.weapon ? content.items[eq.weapon.itemId] : undefined;
  const off = eq.offhand ? content.items[eq.offhand.itemId] : undefined;
  if (isTwoHanded(main)) return `Dos manos: ${main!.name} ocupa también la mano izquierda.`;
  if (main?.weapon && off?.weapon) return 'Dos armas: el ataque básico alterna mano derecha e izquierda; la izquierda pega algo menos y los golpes salen más seguidos.';
  if (off?.weapon) return `Sólo un arma, en la mano izquierda: ${off.name}.`;
  if (off) return `Mano izquierda: ${off.name}. Un arma de una mano también cabe ahí.`;
  if (main) return 'Mano izquierda libre: admite escudo, rodela u otra arma de una mano.';
  return 'Sin arma: el ataque básico se hace a puñetazos.';
}

/** Silueta del personaje (SVG) con las líneas de cada hueco al punto del cuerpo donde va. */
function dollFigure(tint: string, twoHanded: boolean): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${DOLL_W} ${DOLL_H}`);
  svg.setAttribute('class', 'doll-figure');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.color = tint;
  const leaders = (Object.keys(DOLL_PLACE) as EquipSlot[])
    .map((slot) => {
      const { at, to } = DOLL_PLACE[slot];
      if (!to) return '';
      const [x, y] = cellCenter(at[0], at[1]);
      return `<path d="M${x} ${y} L${to[0]} ${to[1]}" class="doll-leader"/><circle cx="${to[0]}" cy="${to[1]}" r="2.4" class="doll-pin"/>`;
    })
    .join('');
  // Cuerpo: cabeza, torso, brazos hasta las manos (a la altura de las armas) y piernas hasta los pies.
  const body = [
    '<circle cx="145" cy="26" r="21"/>',
    '<path d="M137 46 L153 46 L154 56 L136 56 Z"/>',
    '<path d="M106 62 Q145 50 184 62 L190 112 L178 118 L176 172 L114 172 L112 118 L100 112 Z"/>',
    '<path d="M106 64 Q96 70 96 96 L92 190 L100 192 L108 124 L112 92 Z"/>',
    '<path d="M184 64 Q194 70 194 96 L198 190 L190 192 L182 124 L178 92 Z"/>',
    '<circle cx="96" cy="196" r="7"/><circle cx="194" cy="196" r="7"/>',
    '<path d="M116 170 L144 170 L142 262 L126 262 Z"/>',
    '<path d="M146 170 L174 170 L164 262 L148 262 Z"/>',
    '<path d="M120 262 L144 262 L144 278 L114 278 Z"/><path d="M146 262 L170 262 L176 278 L146 278 Z"/>',
  ].join('');
  const reach = twoHanded ? `<path d="M${cellCenter(1, 4).join(' ')} Q145 250 ${cellCenter(5, 4).join(' ')}" class="doll-two"/>` : '';
  svg.innerHTML = `<g class="doll-body">${body}</g>${leaders}${reach}`;
  return svg;
}
