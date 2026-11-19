// Libro de hechizos: los conocidos con su rango (arrastrables a la barra) y,
// atenuados, los de la clase que aún no se conocen.
// Pestaña Reacciones: las 5 marcas elementales y las 15 reacciones.
import { tr, trf } from '../../i18n';
import { ELEMENTS, type Element as Elem } from '../../rpg/contracts';
import type { SpellDef } from '../../rpg/contracts';
import { rankLadder, type RankLadderStep } from '../../rpg/spellRank';
import type { UiContext } from './context';
import { clear, h } from './dom';
import { spellTooltip } from './format';
import { ELEMENT_COLOR, namedIcon, spellIcon } from './icons';
import { Panel } from './panel';

/** Datos estáticos de reacciones — se leen de reactions.json en build. */
const REACTIONS_DATA = typeof import.meta !== 'undefined'
    ? (import.meta.glob('../../../../data/rpg/reactions.json', { eager: true, query: '?raw' }) as Record<string, string>)
    : {};

function loadReactions(): { marks: Record<string, string>; reactions: Array<{ id: string; label: string; pair: [string, string]; description: string }> } {
    try {
        const raw = (REACTIONS_DATA['../../data/rpg/reactions.json'] ?? '') as string;
        const data = raw ? JSON.parse(raw) : null;
        if (data && data.reactions) return data;
    } catch { /* fallback */ }
    // Fallback hardcoded si el import falla.
    return {
        marks: { fire: 'mark_fire', water: 'mark_water', frost: 'mark_frost', lightning: 'mark_lightning', earth: 'mark_earth' },
        reactions: [],
    };
}

/** Nombre legible de un elemento, traducido. */
function elementLabel(elem: string): string {
    const labels: Record<string, string> = {
        fire: 'Fuego', water: 'Agua', frost: 'Escarcha', lightning: 'Rayo', earth: 'Tierra', air: 'Aire',
    };
    return tr(labels[elem] ?? elem);
}

/** Nombre legible de una marca elemental. */
function markLabel(elem: string): string {
    const labels: Record<string, string> = {
        fire: 'Marca de fuego', water: 'Marca de agua', frost: 'Marca de escarcha',
        lightning: 'Marca de rayo', earth: 'Marca de tierra',
    };
    const found = labels[elem];
    if (found) return tr(found);
    return trf('Marca de {element}', { element: elementLabel(elem) });
}

/** Descripción genérica de una marca. */
function markDescription(): string {
    return tr('Marca elemental: un elemento distinto puede detonar una reacción.');
}

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
    private readonly tabs = h('div.spell-tabs');
    private readonly spellsContent = h('div.spell-tab-content');
    private readonly reactionsContent = h('div.spell-tab-content');
    private readonly search = h('input.spell-search', { type: 'search', placeholder: 'Buscar…' });
    private activeTab: 'spells' | 'reactions' = 'spells';

    constructor(ctx: UiContext, onClose: () => void) {
        super(ctx, 'Libro de hechizos', 'panel-spellbook', onClose);
        this.search.addEventListener('input', () => this.applySearch());

        // Construir pestañas.
        const tabSpells = h('button.spell-tab.active', { text: 'Hechizos' });
        const tabReactions = h('button.spell-tab', { text: 'Reacciones' });
        tabSpells.addEventListener('click', () => this.setTab('spells'));
        tabReactions.addEventListener('click', () => this.setTab('reactions'));
        this.tabs.append(tabSpells, tabReactions);

        this.body.append(
            this.tabs,
            h('div.spell-tools', null, this.search),
            this.spellsContent,
            this.reactionsContent,
            h('p.hint', {
                text: 'Arrastra un hechizo a la barra. Tu clase empieza con 3 y aprende más al subir de nivel; los pergaminos enseñan otros elementos a cualquier nivel, pero sólo van a la barra con el nivel que piden.',
            }),
        );
        this.setTab('spells');
    }

    private setTab(tab: 'spells' | 'reactions'): void {
        this.activeTab = tab;
        for (const btn of this.tabs.querySelectorAll<HTMLElement>('.spell-tab')) {
            btn.classList.toggle('active', btn.textContent === (tab === 'spells' ? 'Hechizos' : 'Reacciones'));
        }
        this.spellsContent.style.display = tab === 'spells' ? '' : 'none';
        this.reactionsContent.style.display = tab === 'reactions' ? '' : 'none';
        // Mostrar/ocultar buscador solo en pestaña Hechizos.
        this.search.parentElement!.style.display = tab === 'spells' ? '' : 'none';
    }

    /** Oculta lo que no coincide; el buscador sobrevive a los repintados del libro. */
    private applySearch(): void {
        const q = this.search.value.trim().toLowerCase();
        for (const sec of this.spellsContent.querySelectorAll<HTMLElement>('.spell-section')) {
            let any = false;
            for (const card of sec.querySelectorAll<HTMLElement>('.spell-card')) {
                card.hidden = q !== '' && !(card.dataset['name'] ?? '').includes(q);
                any ||= !card.hidden;
            }
            sec.hidden = !any;
        }
    }

    render(): void {
        this.renderSpells();
        this.renderReactions();
    }

    private renderSpells(): void {
        const s = this.ctx.session();
        const p = s.player();
        const book = s.spellbook();
        const resName = s.content.classes[p.classId]?.resource.name ?? 'Recurso';
        clear(this.spellsContent);

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
            this.spellsContent.appendChild(h('section.spell-section', null, h('h3', { text: sec.title }), list));
        }
        this.applySearch();
    }

    private renderReactions(): void {
        clear(this.reactionsContent);
        const data = loadReactions();

        // Nota explicativa arriba.
        this.reactionsContent.appendChild(h('p.reactions-intro', {
            text: 'Cada elemento deja una marca de 6 s en el objetivo. Otro elemento distinto la convierte en una reacción, con 2 s de espera por objetivo.',
        }));

        // Las 5 marcas elementales.
        const marksSection = h('section.reactions-section');
        marksSection.appendChild(h('h3', { text: 'Marcas elementales' }));
        const marksList = h('div.reactions-list');
        const markElements: Elem[] = ['fire', 'water', 'frost', 'lightning', 'earth'];
        for (const elem of markElements) {
            const color = ELEMENT_COLOR[elem];
            const card = h('div.reaction-card.mark-card', { 'data-id': elem });
            // Icono del elemento.
            const iconWrap = h('div.reaction-icon');
            iconWrap.innerHTML = namedIcon(elem, color);
            const info = h('div.reaction-info');
            info.appendChild(h('div.reaction-name', { text: markLabel(elem) }));
            info.appendChild(h('div.reaction-desc', { text: markDescription() }));
            card.append(iconWrap, info);
            marksList.appendChild(card);
        }
        marksSection.appendChild(marksList);
        this.reactionsContent.appendChild(marksSection);

        // Las 15 reacciones.
        if (data.reactions.length > 0) {
            const reactionsSection = h('section.reactions-section');
            reactionsSection.appendChild(h('h3', { text: 'Reacciones' }));
            const reactionsList = h('div.reactions-list');
            for (const rx of data.reactions) {
                const card = h('div.reaction-card', { 'data-id': rx.id });
                // Icono provisional: el elemento del primer miembro del par.
                const elem1 = rx.pair[0] as Elem;
                const elem2 = rx.pair[1] as Elem;
                const color1 = ELEMENT_COLOR[elem1] ?? '#888';
                const color2 = ELEMENT_COLOR[elem2] ?? '#888';
                const iconWrap = h('div.reaction-icon.reaction-pair-icon');
                iconWrap.innerHTML = namedIcon(elem1, color1) + namedIcon(elem2, color2);
                const info = h('div.reaction-info');
                info.appendChild(h('div.reaction-name', { text: rx.label }));
                // Par de elementos con iconos.
                const pairEl = h('div.reaction-pair');
                pairEl.innerHTML = namedIcon(elem1, color1) + ' + ' + namedIcon(elem2, color2);
                pairEl.appendChild(h('span.reaction-pair-label', {
                    text: elementLabel(elem1) + ' + ' + elementLabel(elem2),
                }));
                info.appendChild(pairEl);
                info.appendChild(h('div.reaction-desc', { text: rx.description }));
                card.append(iconWrap, info);
                reactionsList.appendChild(card);
            }
            reactionsSection.appendChild(reactionsList);
            this.reactionsContent.appendChild(reactionsSection);
        }
    }
}
