// Fichas sobre los enemigos que alcanzaría el hechizo apuntado: nombre, vida con
// lo que le quitaría, daño esperado, estados y si lo mueve. Sólo pintan lo que da
// `World.previewSpell`; no cuentan nada por su cuenta.
import { tr } from './i18n';

export interface AimCardData {
  key: string;
  x: number;
  y: number;
  title: string;
  /** Sin vida: ficha simple (p. ej. dónde cae el lanzador). */
  health?: { value: number; max: number; lostMin: number; lostMax: number };
  damage?: string;
  crit?: string;
  lines?: string[];
  tone?: 'normal' | 'lethal' | 'immune' | 'self' | 'out';
}

/** Tramos de la barra, en % de la vida máxima: lo que queda seguro, lo que quizá se pierde y lo que se pierde seguro. */
export function healthSegments(h: NonNullable<AimCardData['health']>): { safe: number; maybe: number; sure: number } {
  const max = Math.max(1, h.max);
  const cur = Math.max(0, Math.min(h.value, max));
  const sure = Math.min(cur, Math.max(0, h.lostMin));
  const all = Math.min(cur, Math.max(sure, h.lostMax));
  return { safe: (100 * (cur - all)) / max, maybe: (100 * (all - sure)) / max, sure: (100 * sure) / max };
}

export class AimCards {
  private readonly pool: HTMLElement[] = [];
  private lastKey = '';

  constructor(private readonly parent: HTMLElement) {}

  /** `list` en píxeles de pantalla; una ficha por entrada, reutilizando elementos. */
  update(list: readonly AimCardData[]): void {
    const key = JSON.stringify(list);
    if (key === this.lastKey) return;
    this.lastKey = key;
    while (this.pool.length < list.length) {
      const el = document.createElement('div');
      el.className = 'aim-card';
      this.parent.appendChild(el);
      this.pool.push(el);
    }
    this.pool.forEach((el, i) => {
      const c = list[i];
      el.hidden = !c;
      if (c) this.paint(el, c);
    });
  }

  private paint(el: HTMLElement, c: AimCardData): void {
    el.dataset['tone'] = c.tone ?? 'normal';
    el.replaceChildren();
    const add = (cls: string, text: string): HTMLElement => {
      const d = document.createElement('div');
      d.className = cls;
      d.textContent = text;
      el.appendChild(d);
      return d;
    };
    add('ac-name', c.title);
    if (c.health) {
      const seg = healthSegments(c.health);
      const bar = add('ac-hp', '');
      const part = (cls: string, w: number): void => {
        const i = document.createElement('i');
        i.className = cls;
        i.style.width = `${w}%`;
        bar.appendChild(i);
      };
      part('safe', seg.safe);
      part('maybe', seg.maybe);
      part('sure', seg.sure);
      const num = document.createElement('span');
      num.textContent = `${Math.round(c.health.value)} / ${Math.round(c.health.max)}`;
      bar.appendChild(num);
    }
    if (c.damage) add('ac-dmg', c.damage);
    if (c.crit) add('ac-crit', c.crit);
    for (const l of c.lines ?? []) add('ac-line', l);
    const zoom = (el as unknown as { currentCSSZoom?: number }).currentCSSZoom ?? 1;
    el.style.left = `${c.x / zoom}px`;
    el.style.top = `${c.y / zoom}px`;
  }
}

/** Traducción perezosa de las etiquetas fijas de las fichas. */
export const aimText = (s: string): string => tr(s);
