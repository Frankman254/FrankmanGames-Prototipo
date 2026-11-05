// Libro de hechizos: los conocidos con su rango (arrastrables a la barra) y,
// atenuados, los de la clase que aún no se conocen.
import type { SpellDef } from '../../rpg/contracts';
import type { UiContext } from './context';
import { clear, h } from './dom';
import { spellTooltip } from './format';
import { spellIcon } from './icons';
import { Panel } from './panel';

export class SpellbookPanel extends Panel {
  private readonly list = h('div.spell-sections');
  private readonly search = h('input.spell-search', { type: 'search', placeholder: 'Buscar…' });

  constructor(ctx: UiContext, onClose: () => void) {
    super(ctx, 'Libro de hechizos', 'panel-spellbook', onClose);
    this.search.addEventListener('input', () => this.applySearch());
    this.body.append(
      h('div.spell-tools', null, this.search),
      this.list,
      h('p.hint', { text: 'Arrastra un hechizo a la barra. Tu clase empieza con 3 y aprende más al subir de nivel; los pergaminos enseñan otros elementos a cualquier nivel, pero sólo van a la barra con el nivel que piden.' }),
    );
  }

  /** Oculta lo que no coincide; el buscador sobrevive a los repintados del libro. */
  private applySearch(): void {
    const q = this.search.value.trim().toLowerCase();
    for (const sec of this.list.querySelectorAll<HTMLElement>('.spell-section')) {
      let any = false;
      for (const card of sec.querySelectorAll<HTMLElement>('.spell-card')) {
        card.hidden = q !== '' && !(card.dataset['name'] ?? '').includes(q);
        any ||= !card.hidden;
      }
      sec.hidden = !any;
    }
  }

  render(): void {
    const s = this.ctx.session();
    const p = s.player();
    const book = s.spellbook();
    const resName = s.content.classes[p.classId]?.resource.name ?? 'Recurso';
    clear(this.list);

    const known = new Map(book.known.map((k) => [k.spellId, k.rank]));
    const all = Object.values(s.content.spells);
    const sections: { title: string; spells: SpellDef[] }[] = [
      { title: 'De tu clase', spells: all.filter((sp) => sp.classId === p.classId).sort((a, b) => (a.unlockLevel ?? 1) - (b.unlockLevel ?? 1)) },
      { title: 'Universales', spells: all.filter((sp) => sp.classId === null && known.has(sp.id)) },
      { title: 'De otras clases', spells: all.filter((sp) => sp.classId !== null && sp.classId !== p.classId && known.has(sp.id)) },
    ];
    for (const sec of sections) {
      if (!sec.spells.length) continue;
      const list = h('div.spell-list');
      for (const sp of sec.spells) {
        const rank = known.get(sp.id);
        const unlockLevel = sp.unlockLevel ?? 1;
        // Por debajo del nivel: los de la clase aún no se conocen; los de pergamino se conocen pero no se equipan.
        const levelLocked = p.level < unlockLevel;
        const slot = book.hotbar.indexOf(sp.id);
        const icon = h('div.spell-icon');
        icon.innerHTML = spellIcon(sp);
        const pips = h('div.pips');
        for (let i = 1; i <= sp.maxRank; i++) pips.appendChild(h(`i${rank && i <= rank ? '.on' : ''}` as 'i'));
        const card = h(`div.spell-card${rank ? '' : '.unknown'}${levelLocked ? '.locked' : ''}` as 'div', { 'data-name': sp.name.toLowerCase() },
          icon,
          h('div.spell-info', null,
            h('div.spell-name', { text: sp.name }),
            levelLocked ? h('div.spell-meta', { text: `Nivel ${unlockLevel}` }) : pips),
          slot >= 0 ? h('div.on-bar', { text: this.ctx.keys.label(`hotbar${slot + 1}` as 'hotbar1'), title: 'En la barra' }) : null);
        this.ctx.tooltip.bind(card, () => spellTooltip(sp, rank ?? 1, s.content, resName, { level: p.level, classId: p.classId, known: !!rank }));
        if (rank && !levelLocked) this.ctx.drag.draggable(card, () => ({ kind: 'spell', spellId: sp.id }), () => spellIcon(sp));
        list.appendChild(card);
      }
      this.list.appendChild(h('section.spell-section', null, h('h3', { text: sec.title }), list));
    }
    this.applySearch();
  }
}
