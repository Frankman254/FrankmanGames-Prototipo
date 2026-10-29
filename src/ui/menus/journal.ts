// Diario de misiones (Slice 06, tecla J): en curso y por entregar con sus
// objetivos, recompensa y a quién entregarlas; seguir una en el HUD o
// abandonarla; y la lista de completadas.
import type { QuestView } from '../../rpg/contracts';
import type { UiContext } from './context';
import { button, h } from './dom';
import { Panel } from './panel';
import { QUEST_STATE_LABEL, objectiveText, rewardText } from './questFormat';

export class JournalPanel extends Panel {
  constructor(ctx: UiContext, onClose: () => void) {
    super(ctx, 'Diario de misiones', 'panel-journal', onClose);
  }

  render(): void {
    const s = this.ctx.session();
    const all = s.quests?.() ?? [];
    const open = all.filter((q) => q.state === 'active' || q.state === 'ready');
    const done = all.filter((q) => q.state === 'completed');
    this.body.replaceChildren();
    this.body.appendChild(h('h3', { text: 'En curso' }));
    if (open.length === 0) this.body.appendChild(h('p.hint', { text: 'Ninguna. Busca a los PNJ con «!» encima y háblales.' }));
    for (const q of open) this.body.appendChild(this.card(q));
    if (done.length > 0) {
      this.body.appendChild(h('h3', { text: 'Completadas' }));
      const ul = h('ul.journal-done');
      for (const q of done) ul.appendChild(h('li', { text: q.name }));
      this.body.appendChild(ul);
    }
  }

  private card(q: QuestView): HTMLElement {
    const s = this.ctx.session();
    const objectives = h('ul.journal-objectives');
    for (const o of q.objectives) objectives.appendChild(h(`li${o.done ? '.done' : ''}` as 'li', { text: objectiveText(o) }));
    const track = button(q.tracked ? 'Dejar de seguir' : 'Seguir', () => this.report(s.trackQuest?.(q.tracked ? null : q.id) ?? { ok: true }), 'small');
    const abandon = button('Abandonar', () =>
      this.ctx.confirm({
        title: 'Abandonar misión',
        text: `¿Abandonar «${q.name}»? Se pierde el progreso; podrás aceptarla otra vez.`,
        yes: 'Abandonar',
        onYes: () => this.report(s.abandonQuest?.(q.id) ?? { ok: true }),
      }),
      'small danger',
    );
    return h(
      `div.journal-quest${q.tracked ? '.tracked' : ''}${q.state === 'ready' ? '.ready' : ''}` as 'div',
      null,
      h('div.journal-head', null, h('span.journal-name', { text: q.name }), h('span.journal-state', { text: QUEST_STATE_LABEL[q.state] })),
      q.chain ? h('div.journal-chain', { text: q.chain }) : null,
      h('p.journal-summary', { text: q.summary }),
      objectives,
      h('div.journal-meta', { text: q.state === 'ready' ? `Entrégasela a ${q.turnIn.name}` : `Encargo de ${q.giver.name}${q.turnIn.id !== q.giver.id ? ` · se entrega a ${q.turnIn.name}` : ''}` }),
      h('div.journal-reward', { text: `Recompensa: ${rewardText(q.rewards, s.content)}` }),
      h('div.journal-actions', null, track, abandon),
    );
  }
}
