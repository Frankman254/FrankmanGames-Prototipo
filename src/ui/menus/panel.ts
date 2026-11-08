// Base de los paneles de partida (mochila, personaje, libro): marco de
// pergamino, título, cerrar, arrastrar por la cabecera y repintado al cambiar
// la sesión.
import type { CommandResult } from '../../rpg/contracts';
import type { UiContext } from './context';
import { h } from './dom';
import { emitUiSound } from './uiSound';

export abstract class Panel {
  readonly el: HTMLElement;
  protected readonly body: HTMLElement;
  private dirty = true;
  /** true si es el panel de la tienda (`panel-shop`), que cambia el sonido del oro. */
  private readonly shop: boolean;

  constructor(
    protected readonly ctx: UiContext,
    title: string,
    cls: string,
    onClose: () => void,
  ) {
    this.shop = cls === 'panel-shop';
    const close = h('button.panel-close', { type: 'button', title: 'Cerrar', text: '×' });
    close.addEventListener('click', onClose);
    this.body = h('div.panel-body');
    const head = h('header.panel-head', null, h('h2', { text: title }), close);
    this.el = h(`div.panel.${cls}` as 'div', null, head, this.body);
    ctx.windows.attach(this.el, head, cls);
    this.el.hidden = true;
    // Los clics en un panel no deben llegar al lienzo (mover al personaje).
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  get isOpen(): boolean {
    return !this.el.hidden;
  }

  open(): void {
    const wasOpen = !this.el.hidden;
    this.el.hidden = false;
    if (!wasOpen) emitUiSound({ type: 'panel', open: true, shop: this.shop });
    this.ctx.windows.restore(this.el);
    this.render();
    this.dirty = false;
  }

  close(): void {
    if (this.el.hidden) return;
    this.el.hidden = true;
    emitUiSound({ type: 'panel', open: false, shop: this.shop });
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
