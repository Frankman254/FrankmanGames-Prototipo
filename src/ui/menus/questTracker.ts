// Seguimiento de la misión activa en el HUD (Slice 06): nombre, objetivos con
// su progreso y, si está lista, a quién entregarla. Clic = abrir el diario.
import type { UiContext } from './context';
import { h } from './dom';
import { nextStepText, objectiveText } from './questFormat';

export class QuestTracker {
  readonly el: HTMLElement;
  private key = '';

  constructor(private readonly ctx: UiContext, onClick: () => void) {
    this.el = h('div.quest-tracker.hud-bar-zone', { title: `Diario de misiones (${ctx.keys.label('journal')})` });
    this.el.hidden = true;
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.addEventListener('click', onClick);
  }

  /** Cada fotograma: repinta sólo si cambió algo. */
  update(): void {
    const q = this.ctx.session().trackedQuest?.() ?? null;
    const key = q ? `${q.id}|${q.state}|${q.objectives.map((o) => o.current).join(',')}` : '';
    if (key === this.key) return;
    this.key = key;
    this.el.hidden = q === null;
    if (!q) return;
    const next = nextStepText(q);
    const list = h('ul');
    for (const o of q.objectives) list.appendChild(h(`li${o.done ? '.done' : ''}` as 'li', { text: objectiveText(o) }));
    this.el.replaceChildren(h('div.qt-name', { text: q.name }), list);
    if (next) this.el.appendChild(h('div.qt-next', { text: next }));
    this.el.classList.toggle('ready', q.state === 'ready');
  }
}
