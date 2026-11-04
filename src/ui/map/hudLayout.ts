// Modo «Editar interfaz»: cada elemento del HUD (barra de abajo, coordenadas,
// barra de combate, seguimiento de misión, minimapa y registro de combate)
// lleva un asa que sólo aparece en este modo y lo arrastra por WindowLayout.
// Las posiciones se apuntan en el perfil activo; una barra arriba deja crear,
// renombrar, borrar y cambiar de perfil.
import type { UiContext } from '../menus/context';

/** Lo que usa del contexto de la interfaz (avisos y confirmaciones). */
export type HudLayoutHost = Pick<UiContext, 'toast' | 'confirm'>;
import { button, h } from '../menus/dom';
import type { WindowLayout } from '../menus/windows';
import { HUD_ELEMENTS, HUD_KEYS, PROFILE_NAME_MAX, type HudProfileBook } from './hudProfiles';
import type { Minimap } from './minimap';

export class HudLayout {
  readonly toolbar: HTMLElement;
  private readonly select: HTMLSelectElement;
  private readonly nameInput: HTMLInputElement;
  private readonly els = new Map<string, HTMLElement>();
  private minimap: Minimap | null = null;
  private wasLocked = false;
  private bar: { root: HTMLElement; main: HTMLElement; box: HTMLElement; sections: { el: HTMLElement; key: string }[]; split: HTMLButtonElement; pin: HTMLButtonElement } | null = null;
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
  attach(el: HTMLElement, key: string): void {
    const label = HUD_ELEMENTS.find((e) => e.key === key)?.label ?? key;
    el.classList.add('hud-editable');
    el.dataset['hudLabel'] = label;
    let grip = el.querySelector<HTMLElement>(':scope > .hud-grip');
    if (!grip) {
      grip = h('div.hud-grip', { title: `Mover: ${label}` }, h('span', { text: label }));
      el.appendChild(grip);
    }
    const old = this.els.get(key);
    if (old && old !== el) this.windows.detach(old);
    this.els.set(key, el);
    this.windows.attach(el, grip, key);
    const p = this.profiles.active.positions[key];
    if (p) requestAnimationFrame(() => this.windows.setPositions([key], { [key]: p }));
  }

  /** Engancha la barra recién creada: sus secciones y los botones de separar y fijar. */
  bindBar(root: HTMLElement): void {
    const q = (s: string): HTMLElement => root.querySelector<HTMLElement>(s)!;
    const tool = (icon: string, onClick: () => void): HTMLButtonElement => {
      const b = h('button.hud-menu-btn.hud-bar-tool', { type: 'button', text: icon });
      b.addEventListener('click', onClick);
      q('.hud-menu').appendChild(b);
      return b;
    };
    this.bar = {
      root,
      main: q('.hud-bar-main'),
      box: q('.hud-actionbar'),
      sections: [
        { el: q('.hud-frame'), key: 'hud-sec-character' },
        { el: q('.hud-bar-centre'), key: 'hud-sec-spells' },
        { el: q('.hud-menu'), key: 'hud-sec-menu' },
      ],
      split: tool('⇄', () => this.setBar(!this.profiles.active.barSplit, this.profiles.active.barPinned !== false)),
      pin: tool('📌', () => this.setBar(this.profiles.active.barSplit === true, this.profiles.active.barPinned === false)),
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
        this.profiles.setPosition(s.key, { x: r.left, y: r.top });
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
      } else if (s.el.parentElement !== b.main) {
        s.el.querySelector(':scope > .hud-grip')?.remove();
        s.el.classList.remove('hud-editable');
        this.windows.detach(s.el);
        this.els.delete(s.key);
        b.main.appendChild(s.el);
        for (const prop of ['left', 'top', 'right', 'bottom', 'margin', 'position', 'transform', 'translate']) s.el.style.removeProperty(prop);
      }
    }
    if (split) {
      const keys = b.sections.map((s) => s.key);
      requestAnimationFrame(() => this.windows.setPositions(keys, this.profiles.active.positions));
    }
    document.body.classList.toggle('hud-bar-unpinned', !pinned);
    b.split.title = split ? 'Unir la barra' : 'Separar la barra en secciones';
    b.pin.title = pinned ? 'Soltar la barra para moverla' : 'Fijar la barra';
    b.pin.classList.toggle('on', !pinned);
    this.syncLock();
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
