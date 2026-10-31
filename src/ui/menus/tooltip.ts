// Un único tooltip flotante para toda la interfaz. Los elementos lo piden con
// `bind(el, () => líneas)`; las líneas se calculan al pasar el ratón, así
// siempre reflejan el estado actual (comparación con lo equipado incluida).
import { h, clear } from './dom';
import type { TipLine } from './format';
import { RARITY_COLOR } from './icons';

export class Tooltip {
  readonly el: HTMLElement;
  private owner: HTMLElement | null = null;
  private suppressed = false;
  /** Milisegundos con el ratón quieto encima antes de mostrarse (opción de la interfaz). */
  delay = 0;
  private pending: ReturnType<typeof setTimeout> | null = null;
  private last = { x: 0, y: 0 };

  constructor(root: HTMLElement) {
    this.el = h('div.tooltip', { role: 'tooltip' });
    this.el.hidden = true;
    root.appendChild(this.el);
  }

  bind(target: HTMLElement, lines: () => TipLine[] | null): void {
    target.addEventListener('pointerenter', (e) => {
      if (this.suppressed) return;
      this.cancel();
      this.owner = target;
      this.last = { x: e.clientX, y: e.clientY };
      const open = (): void => {
        this.pending = null;
        if (this.owner !== target || this.suppressed) return;
        const ls = lines();
        if (ls) this.show(ls, this.last.x, this.last.y);
      };
      if (this.delay > 0) this.pending = setTimeout(open, this.delay);
      else open();
    });
    target.addEventListener('pointermove', (e) => {
      if (this.owner !== target) return;
      this.last = { x: e.clientX, y: e.clientY };
      if (!this.el.hidden) this.place(e.clientX, e.clientY);
    });
    target.addEventListener('pointerleave', () => {
      if (this.owner === target) this.hide();
    });
  }

  private cancel(): void {
    if (this.pending !== null) clearTimeout(this.pending);
    this.pending = null;
  }

  /** Mientras se arrastra no se muestran tooltips. */
  suppress(on: boolean): void {
    this.suppressed = on;
    if (on) this.hide();
  }

  show(lines: TipLine[], x: number, y: number): void {
    clear(this.el);
    for (const l of lines) this.el.appendChild(renderLine(l));
    this.el.hidden = false;
    this.place(x, y);
  }

  hide(): void {
    this.cancel();
    this.el.hidden = true;
    this.owner = null;
  }

  private place(x: number, y: number): void {
    const r = this.el.getBoundingClientRect();
    const pad = 14;
    let left = x + pad;
    let top = y + pad;
    if (left + r.width > window.innerWidth - 4) left = x - pad - r.width;
    if (top + r.height > window.innerHeight - 4) top = Math.max(4, window.innerHeight - 4 - r.height);
    this.el.style.left = `${Math.max(4, left)}px`;
    this.el.style.top = `${top}px`;
  }
}

function renderLine(l: TipLine): HTMLElement {
  switch (l.kind) {
    case 'title': {
      const e = h('div.tip-title', { text: l.text });
      e.style.color = RARITY_COLOR[l.rarity];
      return e;
    }
    case 'sub':
      return h('div.tip-sub', { text: l.text });
    case 'stat':
      return h(`div.tip-stat.${l.tone}` as 'div', { text: l.text });
    case 'text':
      return h('div.tip-text', { text: l.text });
    case 'set':
      return h(`div.tip-set${l.active ? '.on' : ''}` as 'div', { text: l.text });
    case 'compare':
      return h(`div.tip-cmp.${l.tone}` as 'div', { text: l.text });
    case 'hint':
      return h('div.tip-hint', { text: l.text });
    case 'req':
      return h(`div.tip-req${l.met ? '.met' : ''}` as 'div', { text: l.text });
    case 'sep':
      return h('div.tip-sep');
  }
}
