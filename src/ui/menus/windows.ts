// Ventanas que se arrastran por su cabecera (paneles y modales). La posición se
// guarda por ventana en este equipo y se recorta a la pantalla al volver a
// abrirla; «Bloquear ventanas» las deja fijas. La ventana que se toca pasa al
// frente.
import type { KeyValueStore } from './saveStore';

export interface WindowPos {
  /** Esquina superior izquierda, en píxeles de pantalla. */
  x: number;
  y: number;
}

const STORE_KEY = 'frankmangames.windows';
/**
 * Recorta la posición para que la ventana quepa entera en la pantalla; si es
 * más grande que la pantalla, se pega arriba a la izquierda (la cabecera sigue
 * a la vista para poder moverla).
 */
export function clampWindow(p: WindowPos, w: number, h: number, vw: number, vh: number): WindowPos {
  return {
    x: Math.round(Math.max(0, Math.min(vw - w, p.x))),
    y: Math.round(Math.max(0, Math.min(vh - h, p.y))),
  };
}

/** Punto del elemento que se agarró: puntero menos esquina medida en pantalla. */
export function grabOffset(pointer: WindowPos, corner: WindowPos): WindowPos {
  return { x: pointer.x - corner.x, y: pointer.y - corner.y };
}

/** Esquina que deja el punto agarrado justo bajo el puntero. */
export function dragCorner(pointer: WindowPos, grab: WindowPos): WindowPos {
  return { x: pointer.x - grab.x, y: pointer.y - grab.y };
}

/**
 * Busca los valores CSS de `left`/`top` que dejan la esquina del elemento en
 * `target` (píxeles de pantalla). `render(css)` los aplica y devuelve dónde
 * quedó la esquina; `guess` es la primera estimación y `scale` los píxeles de
 * pantalla por píxel CSS (el `zoom` acumulado). No da nada por supuesto: con un
 * `transform`, márgenes o un zoom mal estimado, corrige con lo medido (como
 * mucho tres pasadas: estimación, corrección y secante).
 */
export function solvePlacement(render: (css: WindowPos) => WindowPos, target: WindowPos, guess: WindowPos, scale: number): WindowPos {
  const s = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const close = (a: WindowPos): boolean => Math.abs(a.x - target.x) < 0.5 && Math.abs(a.y - target.y) < 0.5;
  const c0 = guess;
  const s0 = render(c0);
  if (close(s0)) return c0;
  const c1 = { x: c0.x + (target.x - s0.x) / s, y: c0.y + (target.y - s0.y) / s };
  const s1 = render(c1);
  if (close(s1)) return c1;
  // Pendiente medida por eje (si el zoom estimado no era el bueno).
  const slope = (d: number, ds: number): number => (Math.abs(d) > 1e-6 && Math.abs(ds / d) > 1e-3 ? ds / d : s);
  const c2 = {
    x: c1.x + (target.x - s1.x) / slope(c1.x - c0.x, s1.x - s0.x),
    y: c1.y + (target.y - s1.y) / slope(c1.y - c0.y, s1.y - s0.y),
  };
  render(c2);
  return c2;
}

/** Lee las posiciones guardadas descartando lo que no tenga forma de posición. */
export function parseLayout(raw: unknown): Record<string, WindowPos> {
  const out: Record<string, WindowPos> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const p = v as Partial<WindowPos> | null;
    if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) out[k] = { x: p.x!, y: p.y! };
  }
  return out;
}

export class WindowLayout {
  locked = false;
  /** Se llama al soltar una ventana arrastrada (p. ej. para apuntarla en un perfil del HUD). */
  onMoved: ((key: string, pos: WindowPos) => void) | null = null;
  private pos: Record<string, WindowPos>;
  private readonly attached = new Map<HTMLElement, string>();
  /** Asas ya enganchadas (volver a llamar a `attach` no duplica el arrastre). */
  private readonly handles = new WeakSet<HTMLElement>();
  private z = 10;

  constructor(private readonly store: KeyValueStore) {
    let raw: unknown = null;
    try {
      raw = JSON.parse(store.getItem(STORE_KEY) ?? 'null');
    } catch {
      raw = null;
    }
    this.pos = parseLayout(raw);
  }

  /** Hace arrastrable `el` por `handle`; `key` identifica la ventana al guardar. */
  attach(el: HTMLElement, handle: HTMLElement, key: string): void {
    this.attached.set(el, key);
    if (this.handles.has(handle)) return;
    this.handles.add(handle);
    handle.classList.add('win-handle');
    el.addEventListener('pointerdown', () => this.front(el), true);
    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || this.locked) return;
      // Los botones de la cabecera (cerrar) siguen funcionando.
      if ((e.target as HTMLElement).closest('button, input, select')) return;
      e.preventDefault();
      // El punto agarrado se mide en pantalla (con transform y zoom incluidos)
      // y se mantiene bajo el puntero; `place` se encarga de traducirlo a CSS.
      const r = el.getBoundingClientRect();
      const grab = grabOffset({ x: e.clientX, y: e.clientY }, { x: r.left, y: r.top });
      handle.setPointerCapture(e.pointerId);
      el.classList.add('win-dragging');
      const move = (ev: PointerEvent): void => this.place(el, dragCorner({ x: ev.clientX, y: ev.clientY }, grab));
      const up = (ev: PointerEvent): void => {
        handle.releasePointerCapture(ev.pointerId);
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        handle.removeEventListener('pointercancel', up);
        el.classList.remove('win-dragging');
        const now = el.getBoundingClientRect();
        this.pos[key] = { x: Math.round(now.left), y: Math.round(now.top) };
        this.save();
        this.onMoved?.(key, this.pos[key]);
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
      handle.addEventListener('pointercancel', up);
    });
  }

  /** Coloca la ventana en su posición guardada (llamar tras mostrarla). */
  restore(el: HTMLElement): void {
    const key = this.attached.get(el);
    const p = key ? this.pos[key] : undefined;
    if (p) this.place(el, p);
    this.front(el);
  }

  /** Vuelve a colocar las ventanas visibles (p. ej. tras cambiar la escala de la interfaz). */
  refresh(): void {
    for (const [el, key] of this.attached) {
      const p = this.pos[key];
      if (p && el.offsetParent !== null) this.place(el, p);
    }
  }

  /** Olvida todas las posiciones y devuelve cada ventana a su sitio de la hoja de estilos. */
  reset(): void {
    this.pos = {};
    this.save();
    for (const el of this.attached.keys()) WindowLayout.unplace(el);
  }

  /**
   * Pone de golpe las posiciones de `keys` (las que falten en `pos` vuelven a
   * su sitio de la hoja de estilos) y recoloca lo que esté a la vista. Lo usan
   * los perfiles del HUD; las demás ventanas no se tocan.
   */
  setPositions(keys: readonly string[], pos: Readonly<Record<string, WindowPos>>): void {
    for (const k of keys) {
      const p = pos[k];
      if (p) this.pos[k] = { x: p.x, y: p.y };
      else delete this.pos[k];
    }
    this.save();
    for (const [el, key] of this.attached) {
      if (!keys.includes(key)) continue;
      const p = this.pos[key];
      if (!p) WindowLayout.unplace(el);
      else if (el.offsetParent !== null) this.place(el, p);
    }
  }

  /** Posición guardada de una ventana (o undefined si va en su sitio de siempre). */
  position(key: string): WindowPos | undefined {
    return this.pos[key];
  }

  private static unplace(el: HTMLElement): void {
    for (const prop of WindowLayout.PLACED_PROPS) el.style.removeProperty(prop);
    el.classList.remove('win-placed');
  }

  private static readonly PLACED_PROPS = ['left', 'top', 'right', 'bottom', 'margin', 'position', 'transform', 'translate'];

  detach(el: HTMLElement): void {
    this.attached.delete(el);
  }

  private front(el: HTMLElement): void {
    el.style.zIndex = String(++this.z);
  }

  /**
   * Pone la esquina de `el` en `p` (píxeles de pantalla). Quita el centrado con
   * `transform` (la barra de abajo, las coordenadas y la barra de combate van
   * con `translateX(-50%)`) y convierte a CSS dividiendo por el zoom medido;
   * luego mide dónde quedó y corrige, así ningún desfase (transform, zoom de la
   * escala de la interfaz o de las media queries, padres) separa la ventana
   * del puntero.
   */
  private place(el: HTMLElement, p: WindowPos): void {
    const r = el.getBoundingClientRect();
    const scale = el.offsetWidth > 0 && r.width > 0 ? r.width / el.offsetWidth : 1;
    const q = clampWindow(p, r.width, r.height, window.innerWidth, window.innerHeight);
    const parent = (el.offsetParent as HTMLElement | null)?.getBoundingClientRect() ?? { left: 0, top: 0 };
    el.classList.add('win-placed');
    el.style.setProperty('position', 'absolute', 'important');
    el.style.setProperty('margin', '0', 'important');
    el.style.setProperty('right', 'auto', 'important');
    el.style.setProperty('bottom', 'auto', 'important');
    el.style.setProperty('transform', 'none', 'important');
    el.style.setProperty('translate', 'none', 'important');
    const render = (css: WindowPos): WindowPos => {
      el.style.setProperty('left', `${css.x}px`, 'important');
      el.style.setProperty('top', `${css.y}px`, 'important');
      const now = el.getBoundingClientRect();
      return { x: now.left, y: now.top };
    };
    solvePlacement(render, q, { x: (q.x - parent.left) / scale, y: (q.y - parent.top) / scale }, scale);
  }

  private save(): void {
    this.store.setItem(STORE_KEY, JSON.stringify(this.pos));
  }
}
