// Libro de hechizos: los conocidos con su rango (arrastrables a la barra) y,
// atenuados, los de la clase que aún no se conocen.
import { trf } from '../../i18n';
import type { SpellDef } from '../../rpg/contracts';
import { rankLadder, type RankLadderStep } from '../../rpg/spellRank';
import type { UiContext } from './context';
import { clear, h } from './dom';
import { spellTooltip } from './format';
import { spellIcon } from './icons';
import { Panel } from './panel';

/** Estado de un peldaño en la línea compacta de rangos. */
export interface LadderCell {
    level: number;
    /** Clase sufijo del span: '', '.current' o '.future'. */
    cls: '' | '.current' | '.future';
}

/**
 * Escalera compacta en una línea: cada peldaño se muestra sólo con su nivel
 * (`1·17·41·81·131·181`). El rango actual se resalta; los futuros se atenúan.
 * Sin rango conocido (hechizo aún no aprendido) todos van como futuros.
 * Función pura: el detalle completo va en el tooltip, no en la carta.
 */
export function ladderCells(steps: RankLadderStep[], currentRank?: number): LadderCell[] {
    return steps.map((s) => ({
        level: s.level,
        cls: !currentRank ? '.future' : s.rank === currentRank ? '.current' : s.rank > currentRank ? '.future' : '',
    }));
}

export class SpellbookPanel extends Panel {
    private readonly list = h('div.spell-sections');
    private readonly search = h('input.spell-search', { type: 'search', placeholder: 'Buscar…' });

    constructor(ctx: UiContext, onClose: () => void) {
        super(ctx, 'Libro de hechizos', 'panel-spellbook', onClose);
        this.search.addEventListener('input', () => this.applySearch());
        this.body.append(
            h('div.spell-tools', null, this.search),
            this.list,
            h('p.hint', {
                text: 'Arrastra un hechizo a la barra. Tu clase empieza con 3 y aprende más al subir de nivel; los pergaminos enseñan otros elementos a cualquier nivel, pero sólo van a la barra con el nivel que piden.',
            }),
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
            {
                title: 'De tu clase',
                spells: all
                    .filter((sp) => sp.classId === p.classId)
                    .sort((a, b) => (a.unlockLevel ?? 1) - (b.unlockLevel ?? 1)),
            },
            { title: 'Universales', spells: all.filter((sp) => sp.classId === null && known.has(sp.id)) },
            {
                title: 'De otras clases',
                spells: all.filter((sp) => sp.classId !== null && sp.classId !== p.classId && known.has(sp.id)),
            },
        ];
        // Config para la escalera de rangos.
        const cfg = s.content.progression.spellRankFactors;
        const maxLevel = s.content.progression.maxLevel;

        for (const sec of sections) {
            if (!sec.spells.length) continue;
            const list = h('div.spell-list');
            for (const sp of sec.spells) {
                const rank = known.get(sp.id);
                const unlockLevel = sp.unlockLevel ?? 1;
                // Por debajo del nivel: los de la clase aún no se conocen; los de pergamino se conocen pero no se equipan.
                const levelLocked = p.level < unlockLevel;
                const slot = book.hotbar.indexOf(sp.id);
                // HZ-UI-01: la tecla y las pepitas van sobre el icono, agrupadas,
                // para que la carta sea más compacta y el icono más grande.
                const icon = h('div.spell-icon');
                icon.innerHTML = spellIcon(sp);
                const pips = h('div.pips');
                for (let i = 1; i <= sp.maxRank; i++) pips.appendChild(h(`i${rank && i <= rank ? '.on' : ''}` as 'i'));
                if (rank && !levelLocked) icon.appendChild(pips);
                const keyLabel = slot >= 0 ? this.ctx.keys.label(`hotbar${slot + 1}` as 'hotbar1') : '';
                // Atajo sin tecla (BAR-01): label devuelve '' → sin insignia.
                if (keyLabel) icon.appendChild(h('div.on-bar', { text: keyLabel, title: 'En la barra' }));

                // Escalera compacta en una línea: sólo los niveles («1·17·41·81»);
                // el detalle («Rango 2 · nivel 17») va en el título de cada tramo.
                const ladderEl = h('div.spell-ladder');
                if (cfg && maxLevel) {
                    const ladder = rankLadder({ unlockLevel: sp.unlockLevel, maxRank: sp.maxRank }, maxLevel, cfg);
                    const cells = ladderCells(ladder, rank);
                    for (const [i, step] of ladder.entries()) {
                        const cell = cells[i]!;
                        ladderEl.appendChild(
                            h(`span.spell-ladder-step${cell.cls}` as 'span', {
                                text: String(step.level),
                                title: trf('Rango {rank} · nivel {level}', { rank: step.rank, level: step.level }),
                            }),
                        );
                    }
                }

                const card = h(
                    `div.spell-card${rank ? '' : '.unknown'}${levelLocked ? '.locked' : ''}` as 'div',
                    { 'data-name': sp.name.toLowerCase() },
                    icon,
                    h(
                        'div.spell-info',
                        null,
                        h('div.spell-name', { text: sp.name }),
                        levelLocked
                            ? h('div.spell-meta', { text: trf('Nivel {level}', { level: unlockLevel }) })
                            : ladderEl,
                    ),
                );
                const critChance =
                    (s as unknown as { character?: { stats?: { get(k: string): number } } }).character?.stats?.get?.(
                        'critChance',
                    ) ?? 0;
                this.ctx.tooltip.bind(card, () =>
                    spellTooltip(sp, rank ?? 1, s.content, resName, {
                        level: p.level,
                        classId: p.classId,
                        known: !!rank,
                        critChance,
                    }),
                );
                if (rank && !levelLocked)
                    this.ctx.drag.draggable(
                        card,
                        () => ({ kind: 'spell', spellId: sp.id }),
                        () => spellIcon(sp),
                    );
                list.appendChild(card);
            }
            this.list.appendChild(h('section.spell-section', null, h('h3', { text: sec.title }), list));
        }
        this.applySearch();
    }
}
