// Arrastrar y soltar con eventos de puntero (no la API HTML5 de drag, que en
// Electron/Chromium no deja controlar el fantasma ni el cursor). Un elemento se
// hace arrastrable con `draggable(el, () => fuente, icono)` y un destino se
// marca con `data-drop` (JSON de `DropTarget`). Soltar fuera de todo panel =
// `trash`; sobre un panel sin destino = `none`.
import type { DragSource, DropTarget } from './dragModel';
import { h } from './dom';
import type { Tooltip } from './tooltip';

const THRESHOLD = 5; // px antes de considerar que es un arrastre y no un clic

export class DragController {
  private ghost: HTMLElement | null = null;
  private active: { src: DragSource; from: HTMLElement } | null = null;
  private hover: HTMLElement | null = null;
  dragging = false;

  constructor(
    private readonly root: HTMLElement,
    private readonly tooltip: Tooltip,
    private readonly onDrop: (src: DragSource, dst: DropTarget) => void,
  ) {}

  draggable(el: HTMLElement, source: () => DragSource | null, iconHtml: () => string): void {
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const src = source();
      if (!src) return;
      e.preventDefault();
      const sx = e.clientX;
      const sy = e.clientY;
      const move = (m: PointerEvent): void => {
        if (!this.active) {
          if (Math.hypot(m.clientX - sx, m.clientY - sy) < THRESHOLD) return;
          this.begin(src, el, iconHtml());
        }
        this.moveGhost(m.clientX, m.clientY);
        this.updateHover(m.clientX, m.clientY);
      };
      const up = (u: PointerEvent): void => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        if (this.active) this.finish(u.clientX, u.clientY);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
  }

  private begin(src: DragSource, from: HTMLElement, iconHtml: string): void {
    this.active = { src, from };
    this.dragging = true;
    this.tooltip.suppress(true);
    from.classList.add('drag-from');
    this.ghost = h('div.drag-ghost', { html: iconHtml });
    this.root.appendChild(this.ghost);
    document.body.classList.add('is-dragging');
  }

  private moveGhost(x: number, y: number): void {
    if (this.ghost) this.ghost.style.transform = `translate(${x - 22}px, ${y - 22}px)`;
  }

  private targetAt(x: number, y: number): { el: HTMLElement | null; target: DropTarget } {
    const hit = document.elementFromPoint(x, y) as HTMLElement | null;
    const dropEl = hit?.closest<HTMLElement>('[data-drop]') ?? null;
    if (dropEl) return { el: dropEl, target: JSON.parse(dropEl.dataset['drop']!) as DropTarget };
    // Sobre un panel (o el HUD) sin destino válido: cancelar. Fuera de todo: tirar.
    if (hit?.closest('.panel, .hud-bar-zone, .modal')) return { el: null, target: { kind: 'none' } };
    return { el: null, target: { kind: 'trash' } };
  }

  private updateHover(x: number, y: number): void {
    const { el, target } = this.targetAt(x, y);
    if (this.hover !== el) {
      this.hover?.classList.remove('drop-hover');
      el?.classList.add('drop-hover');
      this.hover = el;
    }
    document.body.classList.toggle('drag-trash', target.kind === 'trash');
  }

  private finish(x: number, y: number): void {
    const a = this.active!;
    const { target } = this.targetAt(x, y);
    this.ghost?.remove();
    this.ghost = null;
    this.hover?.classList.remove('drop-hover');
    this.hover = null;
    a.from.classList.remove('drag-from');
    document.body.classList.remove('is-dragging', 'drag-trash');
    this.active = null;
    this.tooltip.suppress(false);
    // El clic que sigue al pointerup no debe contar como clic normal.
    const swallow = (c: Event): void => {
      c.stopPropagation();
      c.preventDefault();
    };
    window.addEventListener('click', swallow, { capture: true, once: true });
    setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);
    this.dragging = false;
    this.onDrop(a.src, target);
  }
}

export function dropAttr(t: DropTarget): string {
  return JSON.stringify(t);
}
