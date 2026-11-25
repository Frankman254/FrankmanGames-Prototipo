import { h } from './dom';
import { progressBarState } from './progressBarLogic';

/** Barra de progreso reutilizable: vida, recursos, jefes o cargas. */
export class ProgressBar {
    readonly el: HTMLElement;
    private readonly fill: HTMLElement;
    private readonly text: HTMLElement;

    constructor(className = '') {
        this.fill = h('div.fill');
        this.text = h('span.progress-text');
        this.el = h(`div.progress-bar${className ? `.${className}` : ''}` as 'div', null, this.fill, this.text);
    }

    update(value: number, max: number, label = ''): void {
        const state = progressBarState(value, max, label);
        this.fill.style.width = `${state.percent}%`;
        this.text.textContent = state.text;
        this.el.setAttribute('aria-valuemin', '0');
        this.el.setAttribute('aria-valuemax', String(max));
        this.el.setAttribute('aria-valuenow', String(Math.max(0, value)));
        this.el.setAttribute('role', 'progressbar');
    }
}
