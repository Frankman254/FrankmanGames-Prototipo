// Mochila y equipo (`equipo-objetos`). A la izquierda, el muñeco: una silueta
// con cada hueco donde va en el cuerpo (cabeza arriba, armas a los lados de las
// manos, pies abajo, anillos y amuleto junto a la mano y el cuello) y, debajo,
// los totales: características, resistencias y daño por elemento, conjuntos y
// la regla de manos. A la derecha, la mochila con filtros (grupo, tipo y
// rareza) y orden por criterio. Arrastrar y soltar, clic derecho para usar o
// equipar (Mayús + clic derecho: mano izquierda) y monedas, como antes.
import { tr } from '../../i18n';
import { BAG_GROUPS, BAG_SORT_LABEL, BAG_SORTS, bagEntries, bagGroupOf, type BagFilter as BagViewFilter, type BagSort } from './bagView';
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
import { bagCellCount, rowsThatFit, type GridSpace } from './gridFill';
import { ELEMENT_LABEL, KIND_LABEL, RARITY_LABEL, SLOT_LABEL, formatModifier, formatStatValue, statLabel } from './format';
import { ELEMENT_COLOR, RARITY_COLOR, itemIcon, kindIcon, namedIcon } from './icons';
import { Panel } from './panel';
import { itemInformationLines, showItemContextMenu } from './itemContextMenu';

/** Silueta de hueco vacío. */
const EMPTY_KIND: Record<EquipSlot, ItemKind> = {
  weapon: 'sword', offhand: 'shield', head: 'helmet', chest: 'armor', hands: 'gloves', feet: 'boots',
  ring1: 'ring', ring2: 'ring', amulet: 'amulet', back: 'cape', waist: 'belt', mount: 'mount',
};

/** Etiquetas cortas bajo los huecos vacíos del muñeco. */
const DOLL_LABEL: Record<EquipSlot, string> = {
  weapon: 'Mano der.', offhand: 'Mano izq.', head: 'Cabeza', chest: 'Torso', hands: 'Manos', feet: 'Pies',
  ring1: 'Anillo der.', ring2: 'Anillo izq.', amulet: 'Cuello', back: 'Espalda', waist: 'Cintura', mount: 'Montura',
};

// Muñeco: rejilla de 5 × 5 huecos de 50 px (10 px entre columnas y 12 entre
// filas). Centro de una casilla: x = 25 + 60·(col − 1), y = 25 + 62·(fila − 1).
const DOLL_W = 290;
const DOLL_H = 298;
const cellCenter = (col: number, row: number): [number, number] => [25 + 60 * (col - 1), 25 + 62 * (row - 1)];
/** Hueco → [columna, fila] y punto del cuerpo al que apunta su línea (null = encima del cuerpo). */
// U13 (creador, 2026-11-08): simétrico. A cada lado, su mano (arma) con su anillo encima; en el
// centro, lo que va en el cuerpo, con los guantes y las botas como un par (una sola pieza).
const DOLL_PLACE: Record<EquipSlot, { at: [number, number]; to: [number, number] | null }> = {
  back: { at: [1, 1], to: [112, 72] },
  head: { at: [3, 1], to: null },
  amulet: { at: [5, 1], to: [178, 72] },
  ring1: { at: [1, 2], to: [93, 198] },
  chest: { at: [3, 2], to: null },
  ring2: { at: [5, 2], to: [197, 198] },
  weapon: { at: [1, 3], to: [93, 198] },
  waist: { at: [3, 3], to: null },
  offhand: { at: [5, 3], to: [197, 198] },
  hands: { at: [3, 4], to: null },
  feet: { at: [3, 5], to: null },
  mount: { at: [5, 5], to: null },
};
/** Huecos que son un par (dos guantes, dos botas): su hueco vacío enseña dos siluetas. */
const PAIR_SLOTS: ReadonlySet<EquipSlot> = new Set<EquipSlot>(['hands', 'feet']);

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
  private readonly hands: HTMLElement;
  private readonly grid: HTMLElement;
  private readonly gold: HTMLElement;
  private readonly hint: HTMLElement;
  private readonly chips: HTMLElement;
  private readonly kindSel: HTMLSelectElement;
  private readonly raritySel: HTMLSelectElement;
  private readonly sortSel: HTMLSelectElement;
  private readonly count: HTMLElement;
  private readonly weight: HTMLElement;
  private filter: BagViewFilter = { group: 'all', kind: 'all', rarity: 'all' };
  /** U18: orden automático; de fábrica, por fecha de llegada. */
  private sortBy: BagSort = 'date';
  private closeContext: (() => void) | null = null;
  private gridSpace: GridSpace = { columns: 1, rows: 1 };
  private gridObserver: ResizeObserver | null = null;

  constructor(ctx: UiContext, onClose: () => void, private readonly tradeOnly = false, onStats?: () => void) {
    super(ctx, tradeOnly ? 'Mochila para vender' : 'Mochila y equipo', tradeOnly ? 'panel-inventory-trade' : 'panel-inventory', onClose);
    this.doll = h('div.doll');
    this.hands = h('p.eq-hands');
    this.grid = h('div.inv-grid');
    this.grid.style.gridTemplateColumns = 'repeat(auto-fill,calc(36px * var(--bag-icon-scale,1)))';
    // El tamaño de celda ya aplica la preferencia; no multiplicarla otra vez con zoom.
    this.grid.style.zoom = '1';
    this.gold = h('div.gold');
    this.hint = h('span.hint');
    this.chips = h('div.bag-chips');
    this.count = h('span.bag-count');
    this.weight = h('span.bag-weight');
    this.kindSel = h('select.bag-select', { title: 'Tipo' });
    this.raritySel = h('select.bag-select', { title: 'Rareza' });
    this.sortSel = h('select.bag-select', { title: 'Orden' });
    this.raritySel.append(h('option', { value: 'all', text: 'Toda rareza' }), ...RARITIES.map((r) => h('option', { value: r, text: RARITY_LABEL[r] })));
    for (const k of BAG_SORTS) this.sortSel.append(h('option', { value: k, text: BAG_SORT_LABEL[k] }));
    this.kindSel.addEventListener('change', () => this.setFilter({ kind: this.kindSel.value as BagViewFilter['kind'] }));
    this.raritySel.addEventListener('change', () => this.setFilter({ rarity: this.raritySel.value as BagViewFilter['rarity'] }));
    // El orden se aplica solo al momento: no hay botón «Ordenar».
    this.sortSel.addEventListener('change', () => {
      this.sortBy = this.sortSel.value as BagSort;
      this.render();
    });
    const layout = h('div.inv-layout', null,
        tradeOnly ? null : h('section.equip-col', null, h('h3', { text: 'Equipo' }), this.doll, this.hands, onStats ? button('Características', onStats, 'small eq-open-stats') : null),
        h('section.bag-col', null,
          h('div.bag-head', null, h('h3', { text: 'Mochila' }), this.count),
          this.chips,
          h('div.bag-tools', null, this.kindSel, this.raritySel, this.sortSel),
          this.grid,
          h('div.inv-footer', null, this.gold, this.weight, this.hint)));
    if (tradeOnly) {
      layout.style.display = 'grid';
      layout.style.gridTemplateColumns = 'minmax(0,1fr)';
      // Al lado de la tienda (8 + 290 de ancho + 6), no encima: las dos hacen falta para vender.
      this.el.style.cssText = 'left:304px;top:8px;width:min(400px,calc(var(--ui-max-width,100vw) - 304px));max-height:calc(var(--ui-max-height,100vh) - 16px)';
    }
    this.body.append(layout);
    this.el.style.resize = 'both';
    this.el.style.overflow = 'auto';
    this.el.style.minWidth = tradeOnly ? 'min(300px,var(--ui-max-width,90vw))' : 'min(350px,var(--ui-max-width,90vw))';
  }

  /** U16: destruir un objeto de la mochila, con confirmación (y cuántos, si es una pila). */
  private confirmDestroy(uid: string): void {
    const s = this.ctx.session();
    const it = s.inventory().slots.find((x) => x?.uid === uid);
    const def = it ? s.content.items[it.itemId] : undefined;
    if (!it || !def) return;
    this.ctx.confirm({
      title: 'Destruir objeto',
      text: `¿Destruir ${def.name}${it.quantity > 1 ? ` (tienes ${it.quantity})` : ''}? No se puede deshacer.`,
      yes: 'Destruir',
      ...(it.quantity > 1 ? { input: { min: 1, max: it.quantity, value: it.quantity } } : {}),
      onYes: (n) => this.report(s.dropItem(it.uid, n)),
    });
  }

  private setFilter(f: Partial<BagViewFilter>): void {
    // El tipo que ya no está en el grupo elegido se suelta al repintar.
    this.filter = { ...this.filter, ...f };
    this.render();
  }

  render(): void {
    this.closeContext?.();
    this.closeContext = null;
    if (!this.tradeOnly) {
      this.renderDoll();
      this.hands.textContent = tr(handsSummary(this.ctx.session().content, this.ctx.session().equipment()));
    }
    this.renderBag();
  }

  override open(): void {
    super.open();
    this.watchGrid();
  }

  /** Columnas reales de la rejilla y filas que caben hasta el borde inferior de la ventana. */
  private measureGrid(): GridSpace {
    const columns = getComputedStyle(this.grid).gridTemplateColumns.split(' ').filter((c) => c !== 'none' && c !== '').length || 1;
    const cell = this.grid.firstElementChild?.getBoundingClientRect().height ?? 36;
    // La rejilla se desplaza dentro de la ventana: el alto lo da su propio hueco.
    const available = this.grid.getBoundingClientRect().height;
    return { columns, rows: rowsThatFit(available, cell, 3) };
  }

  /** Redibuja sólo si cambian las columnas o las filas; un único observador mientras está abierta. */
  private watchGrid(): void {
    if (this.gridObserver || typeof ResizeObserver === 'undefined') return;
    // Freno contra oscilaciones (F29): si la rejilla cambia más de 3 veces en medio segundo,
    // se queda como está hasta que cambie de verdad el tamaño de la ventana.
    let changes: number[] = [];
    let lastViewport = `${innerWidth}x${innerHeight}`;
    this.gridObserver = new ResizeObserver(() => {
      if (!this.isOpen) return;
      const next = this.measureGrid();
      if (next.columns === this.gridSpace.columns && next.rows === this.gridSpace.rows) return;
      const viewport = `${innerWidth}x${innerHeight}`;
      const now = performance.now();
      if (viewport !== lastViewport) {
        lastViewport = viewport;
        changes = [];
      }
      changes = changes.filter((t) => now - t < 500);
      if (changes.length >= 3) return;
      changes.push(now);
      this.invalidate();
    });
    this.gridObserver.observe(this.grid);
    this.gridObserver.observe(document.documentElement);
  }

  override close(): void {
    this.gridObserver?.disconnect();
    this.gridObserver = null;
    this.closeContext?.();
    this.closeContext = null;
    super.close();
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
          e.stopPropagation();
          this.closeContext = showItemContextMenu(this.ctx, cell, it, {
            useLabel: 'Desequipar',
            use: () => this.ctx.session().unequip(slot),
          });
        });
      } else if (slot === 'offhand' && twoHanded && main) {
        // La mano izquierda la ocupa el arma de dos manos: se ve su silueta apagada.
        cell.innerHTML = itemIcon(main);
        cell.classList.add('blocked');
        cell.title = `Ocupada por ${main.name} (dos manos)`;
        cell.appendChild(h('span.lbl', { text: '2 manos' }));
      } else {
        // Guantes y botas: el hueco vacío enseña el par (una sola pieza, dos siluetas).
        cell.innerHTML = PAIR_SLOTS.has(slot) ? `<span class="pair-icon">${kindIcon(EMPTY_KIND[slot])}${kindIcon(EMPTY_KIND[slot])}</span>` : kindIcon(EMPTY_KIND[slot]);
        cell.appendChild(h('span.lbl', { text: DOLL_LABEL[slot] }));
      }
      this.doll.appendChild(cell);
    }
  }

  // ─── Mochila ──────────────────────────────────────────────────────────────

  private renderBag(): void {
    const s = this.ctx.session();
    const p = s.player();
    const inv = s.inventory();

    clear(this.chips);
    for (const g of BAG_GROUPS) {
      const chip = button(g.label, () => this.setFilter({ group: g.id, kind: 'all' }), `chip${this.filter.group === g.id ? ' on' : ''}`);
      this.chips.appendChild(chip);
    }
    // Tipos presentes en la mochila (dentro del grupo elegido).
    const kinds = new Set<ItemKind>();
    for (const it of inv.slots) {
      const def = it ? s.content.items[it.itemId] : undefined;
      if (def && (this.filter.group === 'all' || bagGroupOf(def) === this.filter.group)) kinds.add(kindOf(def));
    }
    if (this.filter.kind !== 'all' && !kinds.has(this.filter.kind)) this.filter.kind = 'all';
    clear(this.kindSel);
    this.kindSel.append(h('option', { value: 'all', text: 'Todo tipo' }), ...[...kinds].sort((a, b) => KIND_LABEL[a].localeCompare(KIND_LABEL[b])).map((k) => h('option', { value: k, text: KIND_LABEL[k] })));
    this.kindSel.value = this.filter.kind;
    this.raritySel.value = this.filter.rarity;
    this.sortSel.value = this.sortBy;

    const filtering = this.filter.group !== 'all' || this.filter.kind !== 'all' || this.filter.rarity !== 'all';
    const used = inv.slots.filter((it) => it && s.content.items[it.itemId]).length;
    // U16–U18: solo lo que pasa el filtro, agrupado (idénticos juntos) y ordenado; sin huecos.
    const entries = bagEntries(inv.slots, s.content.items, this.filter, this.sortBy);
    const shown = entries.length;
    // Los huecos son relleno visual: la capacidad real es el peso (ver gridFill.ts).
    this.gridSpace = this.measureGrid();
    clear(this.grid);
    const firstEmpty = inv.slots.findIndex((x) => !x);
    const cellCount = bagCellCount(entries.length - 1, this.gridSpace);
    for (let i = 0; i < cellCount; i++) {
      const entry = entries[i];
      // Soltar en una casilla vacía de la vista lo deja en la primera casilla libre de verdad.
      const index = entry ? entry.index : firstEmpty >= 0 ? firstEmpty : inv.slots.length;
      const cell = h('div.cell', { 'data-drop': dropAttr({ kind: 'inventory', index }) });
      cell.style.width = '100%';
      cell.style.height = 'auto';
      cell.style.aspectRatio = '1';
      if (entry) {
        const { item: it, def } = entry;
        cell.innerHTML = itemIcon(def);
        cell.style.setProperty('--rar', RARITY_COLOR[def.rarity]);
        cell.classList.add('filled', `r-${def.rarity}`);
        // U17: cantidad a la izquierda; nivel a la derecha.
        if (entry.count > 1) cell.appendChild(h('span.qty', { text: String(entry.count) }));
        if (it.uid === s.pet()?.itemUid) cell.appendChild(h('span.badge', { text: 'activa' }));
        if (def.level > p.level) cell.classList.add('locked');
        else if (def.level > 1 && def.slot) cell.appendChild(h('span.lvl', { text: String(def.level) }));
        this.ctx.drag.draggable(cell, () => ({ kind: 'inventory', index: entry.index, uid: it.uid }), () => itemIcon(def));
        this.ctx.tooltip.bind(cell, () => this.tradeOnly ? itemInformationLines(this.ctx, it) : itemTip(this.ctx, it.uid, false));
        cell.addEventListener('dblclick', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (this.tradeOnly) return;
          const ses = this.ctx.session();
          if (def.slot) ses.equip(it.uid);
          else ses.useItem(it.uid);
        });
        cell.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const ses = this.ctx.session();
          const trading = this.ctx.merchant() !== null;
          this.closeContext = showItemContextMenu(this.ctx, cell, it, {
            ...(trading ? { sell: () => this.ctx.sell(it.uid) } : {
              use: () => e.shiftKey && fitsEquipSlot(def, 'offhand') ? ses.equip(it.uid, 'offhand') : ses.useItem(it.uid),
              useLabel: e.shiftKey && fitsEquipSlot(def, 'offhand') ? 'Equipar en mano izquierda' : 'Usar / equipar',
              ...(ses.bankDeposit ? { deposit: () => ses.bankDeposit!([it.uid]) } : {}),
              // U16: destruir, con confirmación.
              destroy: () => this.confirmDestroy(it.uid),
            }),
          });
        });
      }
      this.grid.appendChild(cell);
    }
    this.count.textContent = tr(filtering ? `${shown} de ${used} pilas` : `${used} pilas`);
    void filtering;
    this.weight.textContent = inv.weight === undefined || inv.maxWeight === undefined
      ? ''
      : tr(`Peso: ${Math.round(inv.weight * 100) / 100} / ${Math.round(inv.maxWeight * 100) / 100} ${inv.weightUnit ?? ''}`.trim());

    this.hint.textContent = tr(this.ctx.merchant()
      ? 'Clic derecho: opciones y vender · arrastra a la tienda para vender'
      : 'Clic derecho: opciones · Mayús al abrir: mano izquierda · arrastra fuera para tirar');
    clear(this.gold);
    const coin = h('span.coin');
    coin.innerHTML = namedIcon('coin', '#e7c25a');
    this.gold.append(coin, h('b', { text: String(p.gold) }), h('span', { text: ' monedas' }));
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
