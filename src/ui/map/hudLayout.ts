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

  setMinimap(m: Minimap): void {
    this.minimap = m;
    m.onResize = (size) => this.profiles.setMinimapSize(size);
    m.setSize(this.profiles.active.minimapSize);
  }

  /** Coloca todos los elementos según el perfil activo. */
  apply(): void {
    this.minimap?.setSize(this.profiles.active.minimapSize);
    this.windows.setPositions(HUD_KEYS, this.profiles.active.positions);
  }

  toggle(): void {
    this.setEditing(!this.editing);
  }

  setEditing(on: boolean): void {
    if (on === this.editing) return;
    this.editing = on;
    // Mientras se edita las ventanas se mueven aunque estén bloqueadas.
    if (on) {
      this.wasLocked = this.windows.locked;
      this.windows.locked = false;
    } else this.windows.locked = this.wasLocked;
    document.body.classList.toggle('hud-editing', on);
    this.toolbar.hidden = !on;
    this.sync();
    if (on) this.ctx.toast('Editar interfaz: arrastra los elementos. «Listo» para terminar.');
  }

  /** Las opciones bloquearon o desbloquearon las ventanas: se respeta al salir del modo. */
  lockChanged(locked: boolean): void {
    this.wasLocked = locked;
    if (this.editing) this.windows.locked = false;
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
