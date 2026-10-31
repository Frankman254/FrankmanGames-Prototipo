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
    handle.classList.add('win-handle');
    el.addEventListener('pointerdown', () => this.front(el), true);
    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || this.locked) return;
      // Los botones de la cabecera (cerrar) siguen funcionando.
      if ((e.target as HTMLElement).closest('button, input, select')) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const ox = e.clientX - r.left;
      const oy = e.clientY - r.top;
      handle.setPointerCapture(e.pointerId);
      el.classList.add('win-dragging');
      const move = (ev: PointerEvent): void => this.place(el, { x: ev.clientX - ox, y: ev.clientY - oy });
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
    for (const prop of ['left', 'top', 'right', 'bottom', 'margin', 'position']) el.style.removeProperty(prop);
  }

  detach(el: HTMLElement): void {
    this.attached.delete(el);
  }

  private front(el: HTMLElement): void {
    el.style.zIndex = String(++this.z);
  }

  /**
   * Pone la esquina de `el` en `p` (píxeles de pantalla). Con la escala de la
   * interfaz (`zoom`) las longitudes CSS del elemento van multiplicadas, así
   * que se divide por la escala medida.
   */
  private place(el: HTMLElement, p: WindowPos): void {
    const r = el.getBoundingClientRect();
    const scale = el.offsetWidth > 0 ? r.width / el.offsetWidth : 1;
    const q = clampWindow(p, r.width, r.height, window.innerWidth, window.innerHeight);
    const parent = (el.offsetParent as HTMLElement | null)?.getBoundingClientRect() ?? { left: 0, top: 0 };
    el.style.setProperty('position', 'absolute', 'important');
    el.style.setProperty('margin', '0', 'important');
    el.style.setProperty('right', 'auto', 'important');
    el.style.setProperty('bottom', 'auto', 'important');
    el.style.setProperty('left', `${(q.x - parent.left) / scale}px`, 'important');
    el.style.setProperty('top', `${(q.y - parent.top) / scale}px`, 'important');
  }

  private save(): void {
    this.store.setItem(STORE_KEY, JSON.stringify(this.pos));
  }
}
