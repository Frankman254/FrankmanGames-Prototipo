// Modo «Editar interfaz»: cada elemento del HUD (barra de abajo, coordenadas,
// barra de combate, seguimiento de misión, minimapa y registro de combate)
// lleva un asa que sólo aparece en este modo y lo arrastra por WindowLayout.
// Las posiciones se apuntan en el perfil activo; una barra arriba deja crear,
// renombrar, borrar y cambiar de perfil.
import type { UiContext } from '../menus/context';
import { artIconUrl } from '../menus/artIcons';

/** Lo que usa del contexto de la interfaz (avisos y confirmaciones). */
export type HudLayoutHost = Pick<UiContext, 'toast' | 'confirm'>;
import { button, h } from '../menus/dom';
import { toFraction, type WindowLayout } from '../menus/windows';
import { clampHudScale, HUD_ELEMENTS, HUD_KEYS, PROFILE_NAME_MAX, type HudProfileBook } from './hudProfiles';
import type { Minimap } from './minimap';

export class HudLayout {
  readonly toolbar: HTMLElement;
  private readonly select: HTMLSelectElement;
  private readonly nameInput: HTMLInputElement;
  private readonly els = new Map<string, HTMLElement>();
  private minimap: Minimap | null = null;
  private wasLocked = false;
  private bar: { root: HTMLElement; main: HTMLElement; box: HTMLElement; sections: { el: HTMLElement; key: string; home: Comment }[]; split: HTMLButtonElement; pin: HTMLButtonElement } | null = null;
  editing = false;

  constructor(
    private readonly ctx: HudLayoutHost,
    private readonly windows: WindowLayout,
    readonly profiles: HudProfileBook,
  ) {
    windows.onMoved = (key, pos) => {
      if (HUD_KEYS.includes(key)) profiles.setPosition(key, pos);
    };
    this.select = h('select.hl-select');
    this.select.addEventListener('change', () => {
      this.profiles.switchTo(this.select.value);
      this.apply();
      this.sync();
    });
    this.nameInput = h('input.hl-name', { type: 'text', maxlength: PROFILE_NAME_MAX, title: 'Nombre del perfil' });
    this.nameInput.addEventListener('change', () => {
      this.profiles.rename(this.profiles.active.id, this.nameInput.value);
      this.sync();
    });
    this.nameInput.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') this.nameInput.blur();
    });
    this.toolbar = h('div.hud-layout-bar', null,
      h('span.hl-title', { text: 'Editar interfaz' }),
      h('span.hl-hint', { text: 'Arrastra cada elemento por su asa.' }),
      h('label.hl-field', null, h('span', { text: 'Perfil' }), this.select),
      this.nameInput,
      button('Nuevo', () => {
        this.profiles.create();
        this.apply();
        this.sync();
        this.nameInput.select();
      }, 'small'),
      button('Borrar', () => this.removeActive(), 'small'),
      button('Restablecer', () => {
        this.profiles.resetActive();
        this.apply();
      }, 'small'),
      button('Listo', () => this.setEditing(false), 'small primary'));
    this.toolbar.hidden = true;
    this.toolbar.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.sync();
  }

  /**
   * Registra un elemento del HUD: le pone el asa del modo edición y lo coloca
   * según el perfil activo. Se puede volver a llamar si el elemento se rehace.
   */
  private readonly observed = new WeakSet<HTMLElement>();

  attach(el: HTMLElement, key: string): void {
    const label = HUD_ELEMENTS.find((e) => e.key === key)?.label ?? key;
    el.classList.add('hud-editable');
    el.dataset['hudLabel'] = label;
    let grip = el.querySelector<HTMLElement>(':scope > .hud-grip');
    if (!grip) {
      grip = h('div.hud-grip', { title: `Mover: ${label}` }, h('span', { text: label }));
      el.appendChild(grip);
    }
    // Tamaño: un asa en la esquina; el minimapa ya trae la suya (ancho y alto).
    // El chat cambia de ancho y alto con su esquina (creador, 2026-11-06): sin asa de escala, y
    // al cambiarlo se guarda dónde queda, en proporción a la pantalla.
    if (key === 'chat' && typeof ResizeObserver !== 'undefined' && !this.observed.has(el)) {
      this.observed.add(el);
      let timer = 0;
      new ResizeObserver(() => {
        if (!el.style.width && !el.style.height) return;
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          this.windows.capture(key);
          const p = this.windows.position(key);
          if (p) this.windows.setPositions([key], { [key]: p });
        }, 250);
      }).observe(el);
    }
    if (key !== 'minimap' && key !== 'chat') this.keepBottom(el, key);
    if (key !== 'minimap' && key !== 'chat' && !el.querySelector(':scope > .hud-scale')) {
      const handle = h('div.hud-scale', { title: `Tamaño: ${label} (arrastra; doble clic, el de siempre)` }, h('span', { text: '⇲' }));
      el.appendChild(handle);
      this.bindScale(handle, el, key);
    }
    this.applyScale(el, key);
    const old = this.els.get(key);
    if (old && old !== el) this.windows.detach(old);
    this.els.set(key, el);
    this.windows.attach(el, grip, key);
    const p = this.profiles.active.positions[key];
    if (p) requestAnimationFrame(() => this.windows.setPositions([key], { [key]: p }));
  }

  /**
   * Un elemento colocado en la mitad de abajo que cambia solo de alto (p. ej. al plegar la barra
   * de objetos) conserva su borde inferior: si no, se quedaría colgando con hueco debajo.
   */
  private keepBottom(el: HTMLElement, key: string): void {
    if (typeof ResizeObserver === 'undefined' || this.bottomWatched.has(el)) return;
    this.bottomWatched.add(el);
    let last: DOMRect | null = null;
    new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      const prev = last;
      last = r;
      if (!prev || this.scaling || r.width === 0 || r.height === 0) return;
      if (Math.abs(r.width - prev.width) > 1 || Math.abs(r.height - prev.height) < 1) return;
      if (!el.classList.contains('win-placed') || prev.bottom < window.innerHeight / 2) return;
      const pos = toFraction({ x: r.left, y: prev.bottom - r.height }, r.width, r.height, window.innerWidth, window.innerHeight);
      this.windows.setPositions([key], { [key]: pos });
      this.profiles.setPosition(key, pos);
      last = el.getBoundingClientRect();
    }).observe(el);
  }

  private readonly bottomWatched = new WeakSet<HTMLElement>();
  /** Mientras se arrastra una esquina de tamaño, el alto cambia a propósito. */
  private scaling = false;

  /** Arrastrar el asa cambia el tamaño: hacia la derecha o abajo crece; doble clic, el de siempre. */
  private bindScale(handle: HTMLElement, el: HTMLElement, key: string): void {
    handle.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      this.profiles.setScale(key, null);
      this.applyScale(el, key);
    });
    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || !this.canMove(key)) return;
      e.preventDefault();
      e.stopPropagation();
      const start = this.profiles.active.scales?.[key] ?? 1;
      const r = el.getBoundingClientRect();
      // Tamaño a escala 1: la escala nueva es la que hace que la esquina caiga bajo el ratón.
      const unitW = Math.max(1, r.width / start);
      const unitH = Math.max(1, r.height / start);
      const x0 = e.clientX;
      const y0 = e.clientY;
      handle.setPointerCapture(e.pointerId);
      this.scaling = true;
      const move = (ev: PointerEvent): void => {
        const want = Math.max((r.width + ev.clientX - x0) / unitW, (r.height + ev.clientY - y0) / unitH);
        // Sin salirse de la pantalla por la derecha ni por abajo.
        const room = Math.min((window.innerWidth - 4 - r.left) / unitW, (window.innerHeight - 4 - r.top) / unitH);
        this.profiles.setScale(key, clampHudScale(Math.min(want, room)));
        this.applyScale(el, key);
        // El zoom también escala la posición: se devuelve la esquina de arriba a la izquierda a su sitio.
        const now = el.getBoundingClientRect();
        this.windows.setPositions([key], { [key]: toFraction({ x: r.left, y: r.top }, now.width, now.height, window.innerWidth, window.innerHeight) });
      };
      const up = (ev: PointerEvent): void => {
        handle.releasePointerCapture(ev.pointerId);
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        requestAnimationFrame(() => (this.scaling = false));
        // Tras crecer, que siga cabiendo en la pantalla y en su proporción (la de donde se ve ahora).
        this.windows.capture(key);
        const p = this.windows.position(key);
        if (p) this.windows.setPositions([key], { [key]: p });
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
    });
  }

  /** Pone el tamaño guardado del elemento (zoom: letras y casillas crecen juntas). */
  private applyScale(el: HTMLElement, key: string): void {
    const s = this.profiles.active.scales?.[key] ?? 1;
    if (Math.abs(s - 1) < 0.01) el.style.removeProperty('zoom');
    else el.style.setProperty('zoom', String(s));
  }

  /** Engancha la barra recién creada: sus secciones y los botones de separar y fijar. */
  bindBar(root: HTMLElement): void {
    const q = (s: string): HTMLElement => root.querySelector<HTMLElement>(s)!;
    const main = q('.hud-bar-main');
    const tool = (kind: 'split' | 'unlock', onClick: () => void): HTMLButtonElement => {
      const b = h('button.hud-menu-btn.hud-bar-tool', { type: 'button' });
      const id = kind === 'split' ? 'split_bar' : 'unlock_bar';
      const normal = artIconUrl('ui', id) ?? '';
      const icon = h('img.hud-tool-icon', { src: normal, alt: '', draggable: 'false', 'aria-hidden': 'true' });
      icon.dataset.normal = normal;
      icon.dataset.pressed = artIconUrl('ui', `${id}_pressed`) ?? normal;
      b.appendChild(icon);
      b.addEventListener('click', onClick);
      q('.hud-menu').appendChild(b);
      return b;
    };
    // Cada sección deja un marcador donde vive: al unir vuelve justo ahí y el orden no se altera.
    const section = (sel: string, key: string): { el: HTMLElement; key: string; home: Comment } => {
      const el = q(sel);
      const home = document.createComment(key);
      el.before(home);
      return { el, key, home };
    };
    this.bar = {
      root,
      main,
      box: q('.hud-actionbar'),
      sections: [
        section('.hud-frame', 'hud-sec-character'),
        section('.hud-itembar', 'hud-sec-items'),
        section('.hud-slots', 'hud-sec-spells'),
        section('.hud-xp', 'hud-sec-xp'),
        section('.hud-menu', 'hud-sec-menu'),
      ],
      split: tool('split', () => this.setBar(!this.profiles.active.barSplit, this.profiles.active.barSplit === true ? this.profiles.active.barPinned !== false : false)),
      pin: tool('unlock', () => this.setBar(this.profiles.active.barSplit === true, this.profiles.active.barPinned === false)),
    };
    this.applyBar();
  }

  private setBar(split: boolean, pinned: boolean): void {
    const b = this.bar;
    if (!b) return;
    // Al separar, cada sección nace donde estaba; así nada salta de sitio.
    if (split && !this.profiles.active.barSplit) {
      for (const s of b.sections) {
        const r = s.el.getBoundingClientRect();
        this.profiles.setPosition(s.key, toFraction({ x: r.left, y: r.top }, r.width, r.height, window.innerWidth, window.innerHeight));
      }
    }
    if (!split) for (const s of b.sections) this.profiles.setPosition(s.key, null);
    this.profiles.setBar(split, pinned);
    this.applyBar();
  }

  /** Pone la barra como dice el perfil activo. */
  private applyBar(): void {
    const b = this.bar;
    if (!b) return;
    const split = this.profiles.active.barSplit === true;
    const pinned = this.profiles.active.barPinned !== false;
    b.box.classList.toggle('split', split);
    for (const s of b.sections) {
      s.el.classList.toggle('hud-section', split);
      if (split) {
        if (s.el.parentElement !== b.root) b.root.appendChild(s.el);
        this.attach(s.el, s.key);
      } else if (s.home.nextSibling !== s.el) {
        s.el.querySelector(':scope > .hud-grip')?.remove();
        s.el.querySelector(':scope > .hud-scale')?.remove();
        s.el.classList.remove('hud-editable');
        this.windows.detach(s.el);
        this.els.delete(s.key);
        s.home.after(s.el);
        for (const prop of ['left', 'top', 'right', 'bottom', 'margin', 'position', 'transform', 'translate', 'zoom', 'inset']) s.el.style.removeProperty(prop);
      }
    }
    if (split) {
      const keys = b.sections.map((s) => s.key);
      requestAnimationFrame(() => this.windows.setPositions(keys, this.profiles.active.positions));
    }
    document.body.classList.toggle('hud-bar-unpinned', !pinned);
    b.split.title = split ? 'Unir la barra' : 'Separar la barra en secciones';
    b.pin.title = pinned ? 'Soltar la barra para moverla' : 'Fijar la barra';
    const setToolState = (button: HTMLButtonElement, active: boolean): void => {
      button.classList.toggle('on', active);
      button.setAttribute('aria-pressed', String(active));
      const icon = button.querySelector<HTMLImageElement>('.hud-tool-icon');
      if (icon) icon.src = active ? icon.dataset.pressed! : icon.dataset.normal!;
    };
    setToolState(b.split, split);
    setToolState(b.pin, !pinned);
    this.syncLock();
  }

  /** Editando se mueve y escala todo; con la barra suelta, también la barra y sus secciones. */
  private canMove(key: string): boolean {
    return this.editing || (this.profiles.active.barPinned === false && (key === 'hud-bar' || key.startsWith('hud-sec-')));
  }

  /** Moverse se permite editando o con la barra suelta; si no, manda la opción «Bloquear ventanas». */
  private syncLock(): void {
    this.windows.locked = this.editing || this.profiles.active.barPinned === false ? false : this.wasLocked;
  }

  setMinimap(m: Minimap): void {
    this.minimap = m;
    m.onResize = (size) => this.profiles.setMinimapSize(size);
    m.setSize(this.profiles.active.minimapSize);
  }

  /** Coloca todos los elementos según el perfil activo. */
  apply(): void {
    this.minimap?.setSize(this.profiles.active.minimapSize);
    for (const [key, el] of this.els) this.applyScale(el, key);
    this.windows.setPositions(HUD_KEYS, this.profiles.active.positions);
    this.applyBar();
  }

  toggle(): void {
    this.setEditing(!this.editing);
  }

  setEditing(on: boolean): void {
    if (on === this.editing) return;
    this.editing = on;
    // Mientras se edita las ventanas se mueven aunque estén bloqueadas.
    this.syncLock();
    document.body.classList.toggle('hud-editing', on);
    this.toolbar.hidden = !on;
    this.sync();
    if (on) this.ctx.toast('Editar interfaz: arrastra los elementos. «Listo» para terminar.');
  }

  /** Las opciones bloquearon o desbloquearon las ventanas: se respeta al salir del modo. */
  lockChanged(locked: boolean): void {
    this.wasLocked = locked;
    this.syncLock();
  }

  private removeActive(): void {
    const p = this.profiles.active;
    if (this.profiles.list.length <= 1) {
      this.ctx.toast('Tiene que quedar al menos un perfil', 'warn');
      return;
    }
    this.ctx.confirm({
      title: 'Borrar perfil',
      text: `¿Borrar el perfil «${p.name}»?`,
      yes: 'Borrar',
      onYes: () => {
        this.profiles.remove(p.id);
        this.apply();
        this.sync();
      },
    });
  }

  private sync(): void {
    this.select.replaceChildren(...this.profiles.list.map((p) => {
      const o = h('option', { value: p.id, text: p.name });
      o.selected = p.id === this.profiles.active.id;
      return o;
    }));
    this.nameInput.value = this.profiles.active.name;
  }
}
