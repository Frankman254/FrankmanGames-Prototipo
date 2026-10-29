// Base de los paneles de partida (mochila, personaje, libro): marco de
// pergamino, título, cerrar, y repintado al cambiar la sesión.
import type { CommandResult } from '../../rpg/contracts';
import type { UiContext } from './context';
import { h } from './dom';

export abstract class Panel {
  readonly el: HTMLElement;
  protected readonly body: HTMLElement;
  private dirty = true;

  constructor(
    protected readonly ctx: UiContext,
    title: string,
    cls: string,
    onClose: () => void,
  ) {
    const close = h('button.panel-close', { type: 'button', title: 'Cerrar', text: '×' });
    close.addEventListener('click', onClose);
    this.body = h('div.panel-body');
    this.el = h(`div.panel.${cls}` as 'div', null, h('header.panel-head', null, h('h2', { text: title }), close), this.body);
    this.el.hidden = true;
    // Los clics en un panel no deben llegar al lienzo (mover al personaje).
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  get isOpen(): boolean {
    return !this.el.hidden;
  }

  open(): void {
    this.el.hidden = false;
    this.render();
    this.dirty = false;
  }

  close(): void {
    this.el.hidden = true;
    this.ctx.tooltip.hide();
  }

  /** Marca para repintar en el próximo fotograma (si está abierto). */
  invalidate(): void {
    this.dirty = true;
  }

  flush(): void {
    if (this.dirty && this.isOpen && !this.ctx.drag.dragging) {
      this.dirty = false;
      this.render();
    }
  }

  protected report(r: CommandResult): void {
    if (!r.ok) this.ctx.toast(r.reason, 'warn');
  }

  abstract render(): void;
}
