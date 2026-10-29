// Ventana de diálogo con un PNJ (Slice 06): nombre y oficio, lo que dice, la
// misión de la que se habla (objetivos y recompensa) y las opciones. Clic en
// una opción o su número (1–9) para elegir; Esc cierra.
import type { DialogueOptionKind, DialogueView } from '../../rpg/contracts';
import type { UiContext } from './context';
import { clear, h } from './dom';
import { objectiveText, rewardText } from './questFormat';

const KIND_MARK: Record<DialogueOptionKind, string> = {
  talk: '',
  offer: '!',
  accept: '✓',
  turnIn: '?',
  progress: '…',
  shop: '¤',
  bye: '',
};

export class DialogueWindow {
  readonly el: HTMLElement;
  private readonly nameEl: HTMLElement;
  private readonly titleEl: HTMLElement;
  private readonly textEl: HTMLElement;
  private readonly questEl: HTMLElement;
  private readonly optionsEl: HTMLElement;
  private view: DialogueView | null = null;

  constructor(private readonly ctx: UiContext) {
    this.nameEl = h('div.dlg-name');
    this.titleEl = h('div.dlg-title');
    this.textEl = h('p.dlg-text');
    this.questEl = h('div.dlg-quest');
    this.optionsEl = h('ol.dlg-options');
    this.el = h('div.dialogue', null, h('header.dlg-head', null, this.nameEl, this.titleEl), this.textEl, this.questEl, this.optionsEl);
    this.el.hidden = true;
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** PNJ con la conversación abierta. */
  get npcId(): string | null {
    return this.el.hidden ? null : (this.view?.npcId ?? null);
  }

  open(view: DialogueView): void {
    this.view = view;
    this.el.hidden = false;
    this.render();
  }

  close(): void {
    if (this.el.hidden) return;
    this.el.hidden = true;
    this.view = null;
    this.ctx.session().endDialogue?.();
  }

  /** Elige la opción `index` (0 = la primera). */
  choose(index: number): void {
    const s = this.ctx.session();
    if (!this.view || !this.view.options[index]) return;
    const next = s.chooseDialogue?.(index) ?? null;
    if (next) this.open(next);
    else {
      this.el.hidden = true;
      this.view = null;
    }
  }

  /** Repinta con el estado actual (el progreso o la mochila pueden cambiar las opciones). */
  refresh(): void {
    if (this.el.hidden) return;
    const v = this.ctx.session().dialogue?.() ?? null;
    if (v) this.open(v);
    else this.close();
  }

  private render(): void {
    const v = this.view;
    if (!v) return;
    this.nameEl.textContent = v.name;
    this.titleEl.textContent = v.title;
    this.textEl.textContent = `«${v.text}»`;
    clear(this.questEl);
    this.questEl.hidden = v.quest === null;
    if (v.quest) {
      const q = v.quest;
      const s = this.ctx.session();
      const list = h('ul.dlg-objectives');
      for (const o of q.objectives) list.appendChild(h(`li${o.done ? '.done' : ''}` as 'li', { text: objectiveText(o) }));
      this.questEl.append(h('div.dlg-quest-name', { text: q.name }), list, h('div.dlg-reward', { text: `Recompensa: ${rewardText(q.rewards, s.content)}` }));
    }
    clear(this.optionsEl);
    v.options.forEach((o, i) => {
      const li = h(`li.dlg-opt.k-${o.kind}` as 'li');
      li.append(h('span.n', { text: `${i + 1}.` }));
      const mark = KIND_MARK[o.kind];
      if (mark) li.append(h('span.mark', { text: mark }));
      li.append(h('span.t', { text: o.text }));
      li.addEventListener('click', () => this.choose(i));
      this.optionsEl.appendChild(li);
    });
  }
}
