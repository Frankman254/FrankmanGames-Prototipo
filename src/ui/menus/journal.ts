// Diario de misiones (Slice 06, tecla J): en curso y por entregar con sus
// objetivos, recompensa y a quién entregarlas; seguir una en el HUD o
// abandonarla; y la lista de completadas.
import { tr } from '../../i18n';
import type { QuestView } from '../../rpg/contracts';
import type { UiContext } from './context';
import { button, h } from './dom';
import { Panel } from './panel';
import { questJournalSections, questJournalText } from './questViewLogic';

export class JournalPanel extends Panel {
    constructor(ctx: UiContext, onClose: () => void) {
        super(ctx, tr('Diario de misiones'), 'panel-journal', onClose);
    }

    render(): void {
        const s = this.ctx.session();
        const { open, done } = questJournalSections(s.quests?.() ?? []);
        this.body.replaceChildren();
        this.body.appendChild(h('h3', { text: tr('En curso') }));
        if (open.length === 0)
            this.body.appendChild(h('p.hint', { text: tr('Ninguna. Busca a los PNJ con «!» encima y háblales.') }));
        for (const q of open) this.body.appendChild(this.card(q));
        if (done.length > 0) {
            this.body.appendChild(h('h3', { text: tr('Completadas') }));
            const ul = h('ul.journal-done');
            for (const q of done) ul.appendChild(h('li', { text: q.name }));
            this.body.appendChild(ul);
        }
    }

    private card(q: QuestView): HTMLElement {
        const s = this.ctx.session();
        const text = questJournalText(q, s.content);
        const objectives = h('ul.journal-objectives');
        for (const o of text.objectives)
            objectives.appendChild(h(`li${o.done ? '.done' : ''}` as 'li', { text: o.text }));
        const track = button(
            q.tracked ? tr('Dejar de seguir') : tr('Seguir'),
            () => this.report(s.trackQuest?.(q.tracked ? null : q.id) ?? { ok: true }),
            'small',
        );
        const abandon = button(
            tr('Abandonar'),
            () =>
                this.ctx.confirm({
                    title: tr('Abandonar misión'),
                    text: tr(`¿Abandonar «${q.name}»? Se pierde el progreso; podrás aceptarla otra vez.`),
                    yes: tr('Abandonar'),
                    onYes: () => this.report(s.abandonQuest?.(q.id) ?? { ok: true }),
                }),
            'small danger',
        );
        return h(
            `div.journal-quest${q.tracked ? '.tracked' : ''}${q.state === 'ready' ? '.ready' : ''}` as 'div',
            null,
            h(
                'div.journal-head',
                null,
                h('span.journal-name', { text: text.name }),
                h('span.journal-state', { text: text.state }),
            ),
            text.chain ? h('div.journal-chain', { text: text.chain }) : null,
            h('p.journal-summary', { text: text.summary }),
            objectives,
            h('div.journal-meta', { text: text.meta }),
            h('div.journal-reward', { text: text.reward }),
            h('div.journal-actions', null, track, abandon),
        );
    }
}
