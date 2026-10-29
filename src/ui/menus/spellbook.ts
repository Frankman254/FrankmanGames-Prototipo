// Libro de hechizos: los conocidos con su rango (arrastrables a la barra) y,
// atenuados, los de la clase que aún no se conocen.
import type { SpellDef } from '../../rpg/contracts';
import type { UiContext } from './context';
import { clear, h } from './dom';
import { ELEMENT_LABEL, spellTooltip } from './format';
import { spellIcon } from './icons';
import { Panel } from './panel';

export class SpellbookPanel extends Panel {
  constructor(ctx: UiContext, onClose: () => void) {
    super(ctx, 'Libro de hechizos', 'panel-spellbook', onClose);
  }

  render(): void {
    const s = this.ctx.session();
    const p = s.player();
    const book = s.spellbook();
    const resName = s.content.classes[p.classId]?.resource.name ?? 'Recurso';
    clear(this.body);
    this.body.appendChild(h('p.hint', { text: 'Arrastra un hechizo a la barra (1–6). Cualquier clase puede usar cualquier hechizo que conozca.' }));

    const known = new Map(book.known.map((k) => [k.spellId, k.rank]));
    const all = Object.values(s.content.spells);
    const sections: { title: string; spells: SpellDef[] }[] = [
      { title: 'De tu clase', spells: all.filter((sp) => sp.classId === p.classId) },
      { title: 'Universales', spells: all.filter((sp) => sp.classId === null && known.has(sp.id)) },
      { title: 'De otras clases', spells: all.filter((sp) => sp.classId !== null && sp.classId !== p.classId && known.has(sp.id)) },
    ];
    for (const sec of sections) {
      if (!sec.spells.length) continue;
      const list = h('div.spell-list');
      for (const sp of sec.spells) {
        const rank = known.get(sp.id);
        const slot = book.hotbar.indexOf(sp.id);
        const icon = h('div.spell-icon');
        icon.innerHTML = spellIcon(sp);
        const pips = h('div.pips');
        for (let i = 1; i <= sp.maxRank; i++) pips.appendChild(h(`i${rank && i <= rank ? '.on' : ''}` as 'i'));
        const card = h(`div.spell-card${rank ? '' : '.unknown'}` as 'div', null,
          icon,
          h('div.spell-info', null,
            h('div.spell-name', { text: sp.name }),
            h('div.spell-meta', { text: rank ? `${ELEMENT_LABEL[sp.element]} · ${sp.resourceCost} ${resName.toLowerCase()} · ${sp.cooldown ? `${sp.cooldown} s` : 'sin enfriamiento'}` : 'Por aprender (pergamino)' }),
            pips),
          slot >= 0 ? h('div.on-bar', { text: this.ctx.keys.label(`hotbar${slot + 1}` as 'hotbar1'), title: 'En la barra' }) : null);
        this.ctx.tooltip.bind(card, () => spellTooltip(sp, rank ?? 1, s.content, resName));
        if (rank) this.ctx.drag.draggable(card, () => ({ kind: 'spell', spellId: sp.id }), () => spellIcon(sp));
        list.appendChild(card);
      }
      this.body.append(h('h3', { text: sec.title }), list);
    }
  }
}
