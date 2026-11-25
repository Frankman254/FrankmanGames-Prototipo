// Seguimiento de la misión activa en el HUD (Slice 06): nombre, objetivos con
// su progreso y, si está lista, a quién entregarla. Clic = abrir el diario.
import { tr } from '../../i18n';
import type { UiContext } from './context';
import { h } from './dom';
import { questTrackerPresentation } from './questViewLogic';

export class QuestTracker {
    readonly el: HTMLElement;
    private key = '';

    constructor(
        private readonly ctx: UiContext,
        onClick: () => void,
    ) {
        this.el = h('div.quest-tracker.hud-bar-zone', {
            title: tr(`Diario de misiones (${ctx.keys.label('journal')})`),
        });
        this.el.hidden = true;
        this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
        this.el.addEventListener('click', onClick);
    }

    /** Cada fotograma: repinta sólo si cambió algo. */
    update(): void {
        const q = this.ctx.session().trackedQuest?.() ?? null;
        const view = q ? questTrackerPresentation(q) : null;
        const key = view?.key ?? '';
        if (key === this.key) return;
        this.key = key;
        this.el.hidden = q === null;
        if (!q || !view) return;
        const list = h('ul');
        for (const o of view.objectives) list.appendChild(h(`li${o.done ? '.done' : ''}` as 'li', { text: o.text }));
        this.el.replaceChildren(h('div.qt-name', { text: view.name }), list);
        if (view.next) this.el.appendChild(h('div.qt-next', { text: view.next }));
        this.el.classList.toggle('ready', q.state === 'ready');
    }
}
