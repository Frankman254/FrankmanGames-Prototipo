// Compendio (Digit3): criaturas, objetos y zonas. JL-47: rework completo con iconos,
// filtros, rangos de características, conjuntos y pestaña de mapa.
import {
    matchesSearch,
    type Compendium,
    type CompendiumCreature,
    type CompendiumItem,
    type CompendiumZone,
} from '../../rpg/compendium';
import { ELEMENTS, type Element } from '../../rpg/contracts';
import type { UiContext } from './context';
import { button, h } from './dom';
import { ELEMENT_LABEL, RARITY_LABEL, statLabel, formatModValue } from './format';
import { ELEMENT_COLOR, RARITY_COLOR, itemIcon } from './icons';
import { Panel } from './panel';
import type { CreaturePreview3d } from './compendiumPreview';

type Tab = 'creatures' | 'items' | 'zones';
const TABS: ReadonlyArray<[Tab, string]> = [
    ['creatures', 'Criaturas'],
    ['items', 'Objetos'],
    ['zones', 'Zonas'],
];

const RARITIES: readonly string[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const CATEGORIES: readonly string[] = ['weapon', 'armor', 'jewel', 'consumable', 'scroll', 'petCharm', 'misc'];
const SLOTS: readonly string[] = ['weapon', 'offhand', 'chest', 'head', 'feet', 'hands', 'waist', 'ring', 'amulet', 'huaca'];
const SLOT_LABELS: Record<string, string> = {
    weapon: 'Arma',
    offhand: 'Mano izq.',
    chest: 'Pecho',
    head: 'Cabeza',
    feet: 'Pies',
    hands: 'Manos',
    waist: 'Cintura',
    ring: 'Anillo',
    amulet: 'Amuleto',
    huaca: 'Huaca',
};

export class CompendiumPanel extends Panel {
    private tab: Tab = 'creatures';
    private query = '';
    private selected: Record<Tab, string | null> = { creatures: null, items: null, zones: null };
    // Filtros para objetos
    private filterCategory: string = 'all';
    private filterRarity: string = 'all';
    private filterLevelMin: number = 0;
    private filterLevelMax: number = 200;
    private sortItems: 'level' | 'name' = 'level';

    private readonly tabs = h('div.bag-chips');
    private readonly search = h('input.comp-search', { type: 'search', placeholder: 'Buscar…' }) as HTMLInputElement;
    private readonly filters = h('div.comp-filters');
    private readonly list = h('div.comp-list');
    private readonly detail = h('div.comp-detail');

    constructor(
        ctx: UiContext,
        onClose: () => void,
        private readonly data: Compendium,
        private readonly preview?: CreaturePreview3d,
    ) {
        super(ctx, 'Compendio', 'panel-compendium', onClose);
        this.search.addEventListener('input', () => {
            this.query = this.search.value;
            this.renderList();
        });
        this.search.addEventListener('keydown', (e) => e.stopPropagation());
        this.body.append(this.tabs, this.search, this.filters, h('div.comp-columns', null, this.list, this.detail));
    }

    override open(): void {
        super.open();
        this.preview?.start();
    }

    override close(): void {
        this.preview?.stop();
        this.preview?.show(null);
        super.close();
    }

    render(): void {
        this.tabs.replaceChildren(
            ...TABS.map(([id, label]) => {
                const b = button(
                    label,
                    () => {
                        this.tab = id;
                        this.render();
                    },
                    'small chip',
                );
                b.classList.toggle('on', this.tab === id);
                return b;
            }),
        );
        this.renderFilters();
        this.renderList();
    }

    /** Abre la ficha de algo concreto desde otra (enlaces entre fichas). */
    private go(tab: Tab, name: string): void {
        const rows: ReadonlyArray<{ id: string; name: string }> = this.data[tab];
        const row = rows.find((r) => r.name === name);
        if (!row) return;
        this.tab = tab;
        this.selected[tab] = row.id;
        this.query = '';
        this.search.value = '';
        this.render();
    }

    // ── Filtros ──────────────────────────────────────────────────────────────

    private renderFilters(): void {
        this.filters.replaceChildren();
        if (this.tab !== 'items') return;
        const row = h('div.comp-filter-row');
        // Categoría
        row.appendChild(h('label.comp-filter-label', { text: 'Tipo:' }));
        const catSel = h('select.comp-filter-select') as HTMLSelectElement;
        catSel.value = this.filterCategory;
        const allOpt = h('option', { value: 'all', text: 'Todos' });
        catSel.appendChild(allOpt);
        for (const cat of CATEGORIES) {
            const opt = h('option', { value: cat, text: cat });
            catSel.appendChild(opt);
        }
        catSel.addEventListener('change', () => {
            this.filterCategory = catSel.value;
            this.renderList();
        });
        row.appendChild(catSel);
        // Rareza
        row.appendChild(h('label.comp-filter-label', { text: 'Rareza:' }));
        const rarSel = h('select.comp-filter-select') as HTMLSelectElement;
        rarSel.value = this.filterRarity;
        rarSel.appendChild(h('option', { value: 'all', text: 'Todas' }));
        for (const rar of RARITIES) {
            rarSel.appendChild(h('option', { value: rar, text: RARITY_LABEL[rar as keyof typeof RARITY_LABEL] ?? rar }));
        }
        rarSel.addEventListener('change', () => {
            this.filterRarity = rarSel.value;
            this.renderList();
        });
        row.appendChild(rarSel);
        // Orden
        row.appendChild(h('label.comp-filter-label', { text: 'Orden:' }));
        const sortSel = h('select.comp-filter-select') as HTMLSelectElement;
        sortSel.value = this.sortItems;
        sortSel.appendChild(h('option', { value: 'level', text: 'Nivel' }));
        sortSel.appendChild(h('option', { value: 'name', text: 'Nombre' }));
        sortSel.addEventListener('change', () => {
            this.sortItems = sortSel.value as 'level' | 'name';
            this.renderList();
        });
        row.appendChild(sortSel);
        this.filters.appendChild(row);
    }

    // ── Lista ────────────────────────────────────────────────────────────────

    private renderList(): void {
        let shown: Array<{ id: string; name: string; level?: number; rarity?: string }> = [];
        if (this.tab === 'creatures') {
            shown = this.data.creatures
                .filter((c) => matchesSearch(c.name, this.query))
                .map((c) => ({ id: c.id, name: c.name, level: c.level }));
        } else if (this.tab === 'items') {
            let items = this.data.items.filter((i) => matchesSearch(i.name, this.query));
            if (this.filterCategory !== 'all') items = items.filter((i) => i.category === this.filterCategory);
            if (this.filterRarity !== 'all') items = items.filter((i) => i.rarity === this.filterRarity);
            if (this.sortItems === 'level') {
                items = [...items].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'es'));
            } else {
                items = [...items].sort((a, b) => a.name.localeCompare(b.name, 'es'));
            }
            shown = items.map((i) => ({ id: i.id, name: i.name, level: i.level, rarity: i.rarity }));
        } else {
            shown = this.data.zones
                .filter((z) => matchesSearch(z.name, this.query))
                .map((z) => ({ id: z.id, name: z.name, level: z.levelMin }));
        }
        if (this.selected[this.tab] === null || !shown.some((r) => r.id === this.selected[this.tab]))
            this.selected[this.tab] = shown[0]?.id ?? null;
        this.list.replaceChildren(
            ...shown.map((r) => {
                const row = h('div.comp-row', { class: r.id === this.selected[this.tab] ? 'on' : '' });
                // Icono a la izquierda
                if (this.tab === 'items') {
                    const itemDef = this.data.items.find((x) => x.id === r.id);
                    if (itemDef) {
                        const iconSpan = h('span.comp-row-icon');
                        iconSpan.innerHTML = this.getItemIcon(itemDef);
                        row.appendChild(iconSpan);
                    }
                } else if (this.tab === 'creatures') {
                    const c = this.data.creatures.find((x) => x.id === r.id);
                    if (c) {
                        const dot = h('span.comp-row-dot');
                        dot.style.backgroundColor = ELEMENT_COLOR[c.element];
                        row.appendChild(dot);
                    }
                }
                const label = h('span.comp-row-label', { text: this.rowLabel(r.id) });
                row.appendChild(label);
                row.addEventListener('click', () => {
                    this.selected[this.tab] = r.id;
                    this.renderList();
                });
                return row;
            }),
        );
        if (shown.length === 0) this.list.appendChild(h('p.hint', { text: 'Nada con ese nombre.' }));
        this.renderDetail();
    }

    private rowLabel(id: string): string {
        if (this.tab === 'creatures') {
            const c = this.data.creatures.find((x) => x.id === id)!;
            return `${c.name} · nv. ${c.level}`;
        }
        if (this.tab === 'zones') {
            const z = this.data.zones.find((x) => x.id === id)!;
            return `${z.name} · ${z.levelMin}–${z.levelMax}`;
        }
        const i = this.data.items.find((x) => x.id === id)!;
        return `${i.name} · nv. ${i.level}`;
    }

    /** Icono de un objeto del compendio. */
    private getItemIcon(itemDef: CompendiumItem): string {
        // Reutiliza itemIcon de icons.ts que acepta objetos con id, kind, rarity, weapon, etc.
        try {
            return itemIcon({
                id: itemDef.id,
                name: itemDef.name,
                rarity: itemDef.rarity,
                kind: itemDef.kind,
                category: itemDef.category,
                weapon: itemDef.weapon,
                slot: itemDef.slot,
            } as any);
        } catch {
            return '';
        }
    }

    // ── Detalle ──────────────────────────────────────────────────────────────

    private renderDetail(): void {
        const id = this.selected[this.tab];
        this.detail.replaceChildren();
        if (id === null) return;
        if (this.tab === 'creatures') this.creature(this.data.creatures.find((c) => c.id === id)!);
        else if (this.tab === 'items') this.item(this.data.items.find((i) => i.id === id)!);
        else this.zone(this.data.zones.find((z) => z.id === id)!);
    }

    /** Lista de nombres que abren su ficha al pulsarlos. */
    private links(title: string, names: readonly string[], tab: Tab, empty: string): void {
        this.detail.appendChild(h('h4', { text: title }));
        if (names.length === 0) {
            this.detail.appendChild(h('p.hint', { text: empty }));
            return;
        }
        const wrap = h('div.comp-links');
        for (const n of names) wrap.appendChild(button(n, () => this.go(tab, n), 'small'));
        this.detail.appendChild(wrap);
    }

    private facts(rows: ReadonlyArray<[string, string]>): void {
        const dl = h('dl.comp-facts');
        for (const [k, v] of rows) dl.append(h('dt', { text: k }), h('dd', { text: v }));
        this.detail.appendChild(dl);
    }

    // ── Criatura ─────────────────────────────────────────────────────────────

    private creature(c: CompendiumCreature): void {
        this.renderPreview(c);
        const title = h('h3', { text: c.name });
        title.style.color = ELEMENT_COLOR[c.element];
        this.detail.appendChild(title);
        this.facts([
            ['Nivel', c.levelMin === c.levelMax ? String(c.level) : `${c.levelMin}–${c.levelMax}`],
            ['Experiencia', String(c.xp)],
            ['Elemento', ELEMENT_LABEL[c.element]],
            ['Vida base', String(c.maxHealth)],
            ['Velocidad', `${c.speed} m/s`],
            ['Alcance', `${c.attackRange} m`],
            ...(c.gold
                ? ([['Monedas', `${c.gold.min}–${c.gold.max} (${Math.round(c.gold.chance * 100)} %)`]] as [
                      string,
                      string,
                  ][])
                : []),
        ]);
        this.renderResists(c);
        this.links('Zonas', c.zones, 'zones', 'No aparece en ninguna zona del mundo: invocada o de mazmorra.');
        this.detail.appendChild(h('h4', { text: 'Botín' }));
        if (c.drops.length === 0) this.detail.appendChild(h('p.hint', { text: 'No suelta objetos.' }));
        const drops = h('div.comp-drops');
        for (const d of c.drops) {
            const row = h(
                'button.comp-drop',
                { type: 'button' },
                h('span', { text: d.name }),
                h('span.comp-chance', { text: `${Math.max(1, Math.round(d.chance * 100))} %` }),
            );
            row.style.color = RARITY_COLOR[d.rarity];
            row.addEventListener('click', () => this.go('items', d.name));
            drops.appendChild(row);
        }
        this.detail.appendChild(drops);
    }

    // ── Objeto ───────────────────────────────────────────────────────────────

    private item(i: CompendiumItem): void {
        // Icono grande + cabecera
        const header = h('div.comp-item-header');
        const iconDiv = h('div.comp-item-icon');
        try {
            iconDiv.innerHTML = this.getItemIcon(i);
        } catch {
            // sin icono
        }
        header.appendChild(iconDiv);
        const nameWrap = h('div.comp-item-name-wrap');
        const title = h('h3', { text: i.name });
        title.style.color = RARITY_COLOR[i.rarity];
        nameWrap.appendChild(title);
        // Subtítulo: rareza, ranura, nivel, peso
        const parts: string[] = [RARITY_LABEL[i.rarity]];
        if (i.slot) parts.push(SLOT_LABELS[i.slot] ?? i.slot);
        if (i.level > 1) parts.push(`nivel ${i.level}`);
        if (i.weight) parts.push(`${i.weight} briznas`);
        const sub = h('p.comp-item-sub', { text: parts.join(' · ') });
        nameWrap.appendChild(sub);
        header.appendChild(nameWrap);
        this.detail.appendChild(header);
        // Descripción
        if (i.description) this.detail.appendChild(h('p.hint', { text: i.description }));
        // Daño del arma
        if (i.weapon) {
            const w = i.weapon;
            this.detail.appendChild(
                h('p.comp-item-weapon', {
                    text: `Daño ${w.min}–${w.max} de ${ELEMENT_LABEL[w.element as Element] ?? w.element}`,
                }),
            );
        }
        // Características posibles (implicit + rolls rangos)
        this.renderStatRanges(i);
        // Conjunto
        if (i.setId) {
            const content = this.ctx.session()?.content;
            const setDef = content?.sets[i.setId];
            if (setDef) {
                this.detail.appendChild(h('h4', { text: `Conjunto: ${setDef.name}` }));
                const setList = h('div.comp-set-bonuses');
                for (const b of setDef.bonuses) {
                    const bonusRow = h('div.comp-set-bonus');
                    bonusRow.appendChild(h('span.comp-set-pieces', { text: `(${b.pieces} piezas)` }));
                    for (const mod of b.modifiers) {
                        bonusRow.appendChild(h('span.comp-set-mod', { text: formatModValue(mod) }));
                    }
                    setList.appendChild(bonusRow);
                }
                this.detail.appendChild(setList);
            } else {
                this.detail.appendChild(h('p.hint', { text: `Conjunto: ${i.setId}` }));
            }
        }
        // Botín
        this.links('Lo sueltan', i.droppedBy, 'creatures', 'Ninguna criatura lo suelta.');
        this.detail.appendChild(h('h4', { text: 'Lo venden' }));
        this.detail.appendChild(
            h('p.hint', { text: i.soldBy.length > 0 ? i.soldBy.join(', ') : 'Ningún mercader.' }),
        );
    }

    /** Muestra las características posibles con su rango (min–max de cada roll e implicit). */
    private renderStatRanges(i: CompendiumItem): void {
        const hasStats = (i.implicit?.length ?? 0) > 0 || (i.rolls?.length ?? 0) > 0;
        if (!hasStats) return;
        this.detail.appendChild(h('h4', { text: 'Características posibles' }));
        const statsDiv = h('div.comp-stat-ranges');
        // Implicit (fijos)
        for (const m of i.implicit ?? []) {
            const row = h('div.comp-stat-row');
            const label = h('span.comp-stat-label', { text: statLabel(m.stat as any) });
            const value = h('span.comp-stat-value.comp-stat-implicit', { text: formatModValue(m as any) });
            row.appendChild(label);
            row.appendChild(value);
            statsDiv.appendChild(row);
        }
        // Rolls (rangos)
        for (const r of i.rolls ?? []) {
            const row = h('div.comp-stat-row');
            const label = h('span.comp-stat-label', {
                text: statLabel(r.stat as any),
            });
            const rangeText = this.formatRollRange(r);
            const value = h('span.comp-stat-value.comp-stat-roll', { text: rangeText });
            row.appendChild(label);
            row.appendChild(value);
            statsDiv.appendChild(row);
        }
        this.detail.appendChild(statsDiv);
    }

    /** Formatea el rango de una tirada: "Voluntad 3–5" o "Prob. de crítico 1–2 %". */
    private formatRollRange(r: { stat: string; op: 'flat' | 'percent'; min: number; max: number }): string {
        const one = (v: number): string => formatModValue({ stat: r.stat as any, op: r.op, value: v }).replace(/^\+/, '');
        return `${one(r.min)}–${one(r.max)}`;
    }

    // ── Zona ─────────────────────────────────────────────────────────────────

    private zone(z: CompendiumZone): void {
        this.detail.appendChild(h('h3', { text: z.name }));
        this.facts([
            ['Niveles', `${z.levelMin}–${z.levelMax}`],
            ['Clima', z.climate],
            ['Segura', z.safe ? 'Sí' : 'No'],
        ]);
        this.links('Criaturas', z.creatures, 'creatures', 'Sin criaturas.');
        // Botón "Ver en el mapa"
        const mapBtn = button('Ver en el mapa', () => {
            // Cierra el compendio y abre el mapa grande.
            this.close();
            // El mapa se abre desde el controlador de menús; emitimos el evento.
            const event = new CustomEvent('fg:togglePanel', { detail: 'map' });
            this.ctx.root.dispatchEvent(event);
        }, 'small');
        mapBtn.classList.add('comp-map-btn');
        this.detail.appendChild(mapBtn);
    }

    /** JL-42: muestra el visor 3D de la criatura si está disponible. */
    private renderPreview(c: CompendiumCreature): void {
        if (!this.preview) return;
        const assetId = `enemy.${c.id}`;
        this.preview.show(assetId);
        if (!this.detail.contains(this.preview.element)) {
            this.detail.prepend(this.preview.element);
        }
    }

    /** JL-41: muestra las resistencias elementales con colores verde/rojo/gris. */
    private renderResists(c: CompendiumCreature): void {
        const hasAny = ELEMENTS.some((el) => typeof c.resists[el] === 'number');
        if (!hasAny) return;
        this.detail.appendChild(h('h4', { text: 'Resistencias' }));
        const row = h('div.comp-resists');
        for (const el of ELEMENTS) {
            const val = c.resists[el];
            const cell = h('span.comp-resist-cell');
            cell.appendChild(h('span.comp-resist-label', { text: ELEMENT_LABEL[el] }));
            const badge = h('span.comp-resist-badge');
            if (typeof val === 'number' && val !== 0) {
                badge.textContent = val > 0 ? `+${val}` : String(val);
                badge.classList.add(val > 0 ? 'resist-high' : 'resist-low');
            } else {
                badge.textContent = '—';
                badge.classList.add('resist-neutral');
            }
            cell.appendChild(badge);
            row.appendChild(cell);
        }
        this.detail.appendChild(row);
    }
}
