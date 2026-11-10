// Q04: arriba en el centro conviven el rótulo de zona, la barra de jefe, la ficha
// del objetivo, la guía espectral, el anuncio de nivel/zona, los avisos y el botín.
// Cada uno tenía su `top` fijo en CSS y se pisaban. Aquí forman una sola cola: cada
// visible empieza debajo del anterior. El que el jugador haya movido a mano (perfil
// de interfaz o arrastre) queda fuera de la cola y no se toca.

export interface StackItem {
  visible: boolean;
  /** Movido a mano: no entra en la cola. */
  pinned: boolean;
  /** Alto en píxeles de pantalla. */
  height: number;
}

/**
 * Posición superior (píxeles de pantalla) de cada elemento de la cola, en orden.
 * Los ocultos o fijados reciben null y no ocupan sitio.
 */
export function stackTops(items: readonly StackItem[], start: number, gap: number): (number | null)[] {
  let y = start;
  return items.map((it) => {
    if (!it.visible || it.pinned) return null;
    const top = y;
    y += it.height + gap;
    return top;
  });
}

/** Cómo se coloca cada elemento: por `top` o, para la capa de avisos, por su relleno superior. */
interface Slot {
  selector: string;
  mode: 'top' | 'padding';
  isVisible(el: HTMLElement): boolean;
}

const shown = (el: HTMLElement): boolean => !el.hidden && el.offsetParent !== null && el.offsetHeight > 0;

const SLOTS: readonly Slot[] = [
  { selector: '.world-info', mode: 'top', isVisible: shown },
  { selector: '.boss-bar', mode: 'top', isVisible: shown },
  { selector: '.combat-bar', mode: 'top', isVisible: shown },
  { selector: '.spectral-guide', mode: 'top', isVisible: shown },
  { selector: '.levelup-banner', mode: 'top', isVisible: (el) => el.classList.contains('on') && el.offsetHeight > 0 },
  { selector: '.layer-toast', mode: 'padding', isVisible: (el) => el.childElementCount > 0 },
  { selector: '.panel-spoils', mode: 'top', isVisible: shown },
];

const START = 10;
const GAP = 6;
const MARK = 'stackTop';

/** Zoom efectivo (interfaz × elemento): píxeles de pantalla por píxel CSS propio. */
function zoomOf(el: HTMLElement, rect: DOMRect): number {
  return el.offsetHeight > 0 && rect.height > 0 ? rect.height / el.offsetHeight : 1;
}

/** Fijado si su `top` en línea no es el que puso la cola (lo puso el perfil o un arrastre). */
function pinnedOf(el: HTMLElement, mode: Slot['mode']): boolean {
  if (mode === 'padding') return false;
  const top = el.style.top;
  return top !== '' && top !== el.dataset[MARK];
}

/** Alto ocupado en pantalla: para la capa de avisos, sólo lo que llenan sus mensajes. */
function heightOf(el: HTMLElement, mode: Slot['mode'], rect: DOMRect): number {
  if (mode === 'top') return rect.height;
  const first = el.firstElementChild?.getBoundingClientRect();
  const last = el.lastElementChild?.getBoundingClientRect();
  return first && last ? last.bottom - first.top : 0;
}

/** Coloca la cola. Barato si nada cambia: sólo escribe estilos cuando difieren. */
export function layoutTopStack(root: ParentNode = document): void {
  const els = SLOTS.map((s) => root.querySelector<HTMLElement>(s.selector));
  const rects = els.map((el) => el?.getBoundingClientRect() ?? null);
  const items: StackItem[] = SLOTS.map((s, i) => {
    const el = els[i];
    if (!el) return { visible: false, pinned: false, height: 0 };
    return { visible: s.isVisible(el), pinned: pinnedOf(el, s.mode), height: heightOf(el, s.mode, rects[i]!) };
  });
  const tops = stackTops(items, START, GAP);
  SLOTS.forEach((s, i) => {
    const el = els[i];
    const top = tops[i];
    if (!el || top === null || top === undefined) return;
    const css = `${Math.round(top / zoomOf(el, rects[i]!))}px`;
    if (s.mode === 'padding') {
      if (el.style.paddingTop !== css) el.style.paddingTop = css;
      return;
    }
    if (el.style.top !== css) {
      el.style.top = css;
      el.dataset[MARK] = css;
    }
  });
}
