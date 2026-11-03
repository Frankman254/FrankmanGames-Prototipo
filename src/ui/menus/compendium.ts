// Compendio (Digit3): criaturas, objetos y zonas con buscador. A la izquierda la
// lista y a la derecha la ficha; las criaturas llevan a sus zonas y a su botín,
// y los objetos a quién los suelta o los vende. Los datos salen de rpg/compendium.
import { matchesSearch, type Compendium, type CompendiumCreature, type CompendiumItem, type CompendiumZone } from '../../rpg/compendium';
import type { UiContext } from './context';
import { button, h } from './dom';
import { ELEMENT_LABEL, RARITY_LABEL } from './format';
import { ELEMENT_COLOR, RARITY_COLOR } from './icons';
import { Panel } from './panel';

type Tab = 'creatures' | 'items' | 'zones';
const TABS: ReadonlyArray<[Tab, string]> = [['creatures', 'Criaturas'], ['items', 'Objetos'], ['zones', 'Zonas']];

export class CompendiumPanel extends Panel {
  private tab: Tab = 'creatures';
  private query = '';
  private selected: Record<Tab, string | null> = { creatures: null, items: null, zones: null };
  private readonly tabs = h('div.bag-chips');
  private readonly search = h('input.comp-search', { type: 'search', placeholder: 'Buscar…' }) as HTMLInputElement;
  private readonly list = h('div.comp-list');
  private readonly detail = h('div.comp-detail');

  constructor(ctx: UiContext, onClose: () => void, private readonly data: Compendium) {
    super(ctx, 'Compendio', 'panel-compendium', onClose);
    this.search.addEventListener('input', () => {
      this.query = this.search.value;
      this.renderList();
    });
    // Escribir aquí no debe disparar atajos de juego.
    this.search.addEventListener('keydown', (e) => e.stopPropagation());
    this.body.append(this.tabs, this.search, h('div.comp-columns', null, this.list, this.detail));
  }

  render(): void {
    this.tabs.replaceChildren(
      ...TABS.map(([id, label]) => {
        const b = button(label, () => {
          this.tab = id;
          this.render();
        }, 'small chip');
        b.classList.toggle('on', this.tab === id);
        return b;
      }),
    );
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

  private renderList(): void {
    const rows: ReadonlyArray<{ id: string; name: string }> = this.data[this.tab];
    const shown = rows.filter((r) => matchesSearch(r.name, this.query));
    if (this.selected[this.tab] === null || !shown.some((r) => r.id === this.selected[this.tab])) this.selected[this.tab] = shown[0]?.id ?? null;
    this.list.replaceChildren(
      ...shown.map((r) => {
        const row = h('button.comp-row', { type: 'button', text: this.rowLabel(r.id) });
        row.classList.toggle('on', r.id === this.selected[this.tab]);
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
    return this.data.items.find((x) => x.id === id)!.name;
  }

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

  private creature(c: CompendiumCreature): void {
    const title = h('h3', { text: c.name });
    title.style.color = ELEMENT_COLOR[c.element];
    this.detail.appendChild(title);
    this.facts([
      ['Nivel', String(c.level)],
      ['Experiencia', String(c.xp)],
      ['Elemento', ELEMENT_LABEL[c.element]],
      ['Vida base', String(c.maxHealth)],
      ['Velocidad', `${c.speed} m/s`],
      ['Alcance', `${c.attackRange} m`],
      ...(c.gold ? ([['Monedas', `${c.gold.min}–${c.gold.max} (${Math.round(c.gold.chance * 100)} %)`]] as [string, string][]) : []),
    ]);
    this.links('Zonas', c.zones, 'zones', 'No aparece en ninguna zona del mundo: invocada o de mazmorra.');
    this.detail.appendChild(h('h4', { text: 'Botín' }));
    if (c.drops.length === 0) this.detail.appendChild(h('p.hint', { text: 'No suelta objetos.' }));
    const drops = h('div.comp-drops');
    for (const d of c.drops) {
      const row = h('button.comp-drop', { type: 'button' }, h('span', { text: d.name }), h('span.comp-chance', { text: `${Math.max(1, Math.round(d.chance * 100))} %` }));
      row.style.color = RARITY_COLOR[d.rarity];
      row.addEventListener('click', () => this.go('items', d.name));
      drops.appendChild(row);
    }
    this.detail.appendChild(drops);
  }

  private item(i: CompendiumItem): void {
    const title = h('h3', { text: i.name });
    title.style.color = RARITY_COLOR[i.rarity];
    this.detail.appendChild(title);
    this.detail.appendChild(h('p.hint', { text: i.description }));
    this.facts([['Rareza', RARITY_LABEL[i.rarity]], ['Nivel', String(i.level)], ['Valor', String(i.value)]]);
    this.links('Lo sueltan', i.droppedBy, 'creatures', 'Ninguna criatura lo suelta.');
    this.detail.appendChild(h('h4', { text: 'Lo venden' }));
    this.detail.appendChild(h('p.hint', { text: i.soldBy.length > 0 ? i.soldBy.join(', ') : 'Ningún mercader.' }));
  }

  private zone(z: CompendiumZone): void {
    this.detail.appendChild(h('h3', { text: z.name }));
    this.facts([['Niveles', `${z.levelMin}–${z.levelMax}`], ['Clima', z.climate], ['Segura', z.safe ? 'Sí' : 'No']]);
    this.links('Criaturas', z.creatures, 'creatures', 'Sin criaturas.');
  }
}
