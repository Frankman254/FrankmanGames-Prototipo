// Ventana de botín de fin de combate (`muerte-botin`): monedas, XP y objetos
// que le tocaron al jugador. No es modal (el juego sigue). Clic en un objeto =
// tomarlo; «Tomar todo» se lleva lo que quepa; se cierra sola tras
// `autoCloseSeconds` y entonces recoge lo que quepa (lo demás cae a los pies).
import type { SpoilsView } from '../../rpg/contracts';
import type { UiContext } from './context';
import { button, clear, h } from './dom';
import { itemTooltip } from './format';
import { RARITY_COLOR, itemIcon, namedIcon } from './icons';
import { Panel } from './panel';

/** Si los datos no lo dicen (sesiones sin `spoils.json`). */
const DEFAULT_AUTO_CLOSE = 12;

export class SpoilsPanel extends Panel {
  private readonly summary: HTMLElement;
  private readonly grid: HTMLElement;
  private readonly countdown: HTMLElement;
  /** Segundos hasta cerrarse sola. */
  private remaining = 0;
  private shownId = -1;

  constructor(ctx: UiContext) {
    super(ctx, 'Botín del combate', 'panel-spoils', () => this.finish());
    this.summary = h('div.spoils-summary');
    this.grid = h('div.shop-grid.spoils-grid');
    this.countdown = h('span.hint');
    this.body.append(
      this.summary,
      this.grid,
      h('div.inv-footer', null, this.countdown, button('Tomar todo', () => this.takeAll(), 'primary small')),
    );
  }

  /** Hay botín nuevo: abre (o rehace) la ventana y reinicia la cuenta atrás. */
  show(): void {
    const v = this.ctx.session().spoils?.() ?? null;
    if (!v) return;
    if (v.id !== this.shownId) this.remaining = v.autoCloseSeconds ?? DEFAULT_AUTO_CLOSE;
    this.shownId = v.id;
    if (this.isOpen) this.invalidate();
    else this.open();
  }

  /** Cada fotograma con el tiempo real; `running` = sin ventanas modales (en pausa no cuenta). */
  update(dt: number, running: boolean): void {
    if (!this.isOpen || !running) return;
    this.remaining -= dt;
    const n = Math.max(0, Math.ceil(this.remaining));
    const text = `Se cierra en ${n} s`;
    if (this.countdown.textContent !== text) this.countdown.textContent = text;
    if (this.remaining <= 0) this.finish();
  }

  private takeAll(): void {
    const r = this.ctx.session().takeSpoils?.('all');
    if (r) this.report(r);
    this.afterTake();
  }

  /** Cerrar (botón, tiempo): recoge lo que quepa; lo demás cae al suelo. */
  private finish(): void {
    this.ctx.session().closeSpoils?.();
    this.close();
  }

  private afterTake(): void {
    if (this.ctx.session().spoils?.()) this.invalidate();
    else this.close();
  }

  render(): void {
    const s = this.ctx.session();
    const v: SpoilsView | null = s.spoils?.() ?? null;
    if (!v) {
      this.close();
      return;
    }
    clear(this.summary);
    const coin = h('span.coin');
    coin.innerHTML = namedIcon('coin', '#e7c25a');
    const gold = h('button.spoils-gold', { type: 'button', disabled: v.gold <= 0, title: 'Tomar las monedas' }, coin, h('b', { text: String(v.gold) }), ' monedas');
    gold.addEventListener('click', () => {
      this.report(s.takeSpoils!('gold'));
      this.afterTake();
    });
    const who = v.participants.length > 1 ? ` · tu parte ${Math.round(v.share * 100)} %` : '';
    this.summary.append(
      h('div', { text: `${v.kills} ${v.kills === 1 ? 'baja' : 'bajas'} · ${v.xp} XP · ${Math.round(v.seconds)} s${who}` }),
      gold,
    );
    clear(this.grid);
    for (const it of v.items) {
      const def = s.content.items[it.itemId];
      if (!def) continue;
      const cell = h('div.cell.filled.shop-cell');
      cell.innerHTML = itemIcon(def);
      cell.style.setProperty('--rar', RARITY_COLOR[def.rarity]);
      cell.classList.add(`r-${def.rarity}`);
      if (it.quantity > 1) cell.appendChild(h('span.qty', { text: String(it.quantity) }));
      this.ctx.tooltip.bind(cell, () =>
        itemTooltip(it, { content: s.content, equipment: s.equipment(), equipped: false, compare: [], sellValue: 0, playerLevel: s.player().level, priceLine: 'Clic: tomar' }),
      );
      cell.addEventListener('click', () => {
        this.ctx.tooltip.hide();
        this.report(s.takeSpoils!(it.uid));
        this.afterTake();
      });
      this.grid.appendChild(cell);
    }
    if (v.items.length === 0) this.grid.appendChild(h('span.hint', { text: 'Sin objetos esta vez.' }));
  }
}
