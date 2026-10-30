// Información del mundo sobre el HUD: arriba, el «mapa» [x, y] con la zona y su
// franja (como DOFUS); y la barra horizontal de enemigos en combate, que sólo
// muestra a los que te persiguen y agrupa los idénticos (mismo tipo y nivel).
// `main.ts` la alimenta cada fotograma con datos ya resueltos.
import type { UiContext } from './context';
import { h } from './dom';

export interface WorldInfoView {
  coords: [number, number];
  zone: string | null;
  band: string | null;
  /** Diferencia entre el nivel mínimo de la zona y el del jugador (> 0 = peligrosa). */
  danger: number;
}

/** Un enemigo con agro (ya resuelto por `main.ts`). */
export interface Combatant {
  archetype: string;
  name: string;
  level: number;
  health: number;
  maxHealth: number;
  /** Nivel del enemigo − nivel del jugador. */
  diff: number;
  /** Preparando un hechizo con nombre (o null). */
  casting: string | null;
}

export interface CombatGroup {
  key: string;
  name: string;
  level: number;
  count: number;
  health: number;
  maxHealth: number;
  diff: number;
  casting: string | null;
}

/** Agrupa los enemigos idénticos (tipo y nivel), en orden de aparición. */
export function groupCombatants(list: readonly Combatant[]): CombatGroup[] {
  const out = new Map<string, CombatGroup>();
  for (const c of list) {
    const key = `${c.archetype}:${c.level}`;
    const g = out.get(key);
    if (g) {
      g.count++;
      g.health += c.health;
      g.maxHealth += c.maxHealth;
      g.casting ??= c.casting;
    } else {
      out.set(key, { key, name: c.name, level: c.level, count: 1, health: c.health, maxHealth: c.maxHealth, diff: c.diff, casting: c.casting });
    }
  }
  return [...out.values()];
}

/** Color por diferencia de nivel: gris (fácil), normal, naranja, rojo (peligro). */
export function diffClass(diff: number): string {
  if (diff >= 5) return 'deadly';
  if (diff >= 2) return 'hard';
  if (diff <= -4) return 'trivial';
  return 'even';
}

export class WorldInfo {
  readonly el: HTMLElement;
  private readonly coordsEl: HTMLElement;
  private readonly zoneEl: HTMLElement;
  private key = '';

  constructor() {
    this.coordsEl = h('div.wi-coords');
    this.zoneEl = h('div.wi-zone');
    this.el = h('div.world-info', null, this.coordsEl, this.zoneEl);
  }

  update(v: WorldInfoView): void {
    const key = `${v.coords.join(',')}|${v.zone}|${v.band}|${v.danger > 0}`;
    if (key === this.key) return;
    this.key = key;
    this.coordsEl.textContent = `[${v.coords[0]}, ${v.coords[1]}]`;
    this.zoneEl.textContent = v.zone ? `${v.zone}${v.band ? ` · ${v.band}` : ''}` : 'Tierras salvajes';
    this.el.classList.toggle('danger', v.danger >= 5);
  }
}

/** Grupos que caben a la vez; el resto se resume en «+N». */
const MAX_GROUPS = 8;

export class CombatBar {
  readonly el: HTMLElement;
  private readonly list: HTMLElement;
  private key = '';

  constructor(ctx: UiContext) {
    const grip = h('div.cb-grip', { title: 'Arrastrar' });
    this.list = h('div.cb-list');
    this.el = h('div.combat-bar.hud-bar-zone', null, grip, this.list);
    this.el.hidden = true;
    ctx.windows.attach(this.el, grip, 'combat-bar');
  }

  update(list: readonly Combatant[]): void {
    const groups = groupCombatants(list);
    // Repintar sólo si algo cambió (vida redondeada al 2 %).
    const key = groups.map((g) => `${g.key}x${g.count}:${Math.round((50 * g.health) / g.maxHealth)}:${g.casting ?? ''}`).join('|');
    if (key === this.key) return;
    const wasHidden = this.el.hidden;
    this.key = key;
    this.el.hidden = groups.length === 0;
    this.list.replaceChildren();
    for (const g of groups.slice(0, MAX_GROUPS)) {
      const pct = g.maxHealth > 0 ? Math.max(0, Math.min(100, (100 * g.health) / g.maxHealth)) : 0;
      this.list.appendChild(
        h(`div.cb-enemy.${diffClass(g.diff)}${g.casting ? '.casting' : ''}` as 'div', { title: `${g.name} · nivel ${g.level}${g.count > 1 ? ` · ${g.count} iguales` : ''}` },
          h('div.cb-head', null, h('span.cb-name', { text: g.name }), g.count > 1 ? h('span.cb-count', { text: `×${g.count}` }) : null),
          h('div.cb-sub', null, h('span.cb-level', { text: `niv. ${g.level}` }), g.casting ? h('span.cb-cast', { text: g.casting }) : null),
          h('div.cb-hp', null, h('div.fill', { style: `width:${pct}%` }))),
      );
    }
    if (groups.length > MAX_GROUPS) this.list.appendChild(h('div.cb-more', { text: `+${groups.length - MAX_GROUPS}` }));
    if (wasHidden && !this.el.hidden) this.ctxRestore?.();
  }

  /** Lo pone el montaje: recoloca la barra en su sitio guardado al aparecer. */
  ctxRestore: (() => void) | null = null;
}
