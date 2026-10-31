// Ventanas modales: pausa, opciones, ranuras de guardado y confirmación.
import { button, h } from '../dom';
import { ACTION_GROUPS, type Action, type KeyMap, type Keybindings } from '../keybindings';
import {
  ANTIALIAS_MODES, ENEMY_BAR_MODES, FONTS, FPS_CAPS, GRAPHICS_KEYS, GRAPHICS_PRESET_IDS, OPTION_LIMITS, SHADOW_LEVELS, SLOT_COUNT, LABEL_MAX, THEMES,
  applyGraphicsPreset, graphicsPresetOf,
  type AntialiasMode, type EnemyBarMode, type FontId, type GameOptions, type GraphicsPresetId, type ShadowLevel, type SlotSummary, type ThemeId,
} from '../saveStore';
import { CAST_MODES, type CastMode } from '../../../sim/castModes';
import { LOCK_MODES, type LockMode } from '../../../sim/lock';

export function modal(title: string, cls: string, ...children: (HTMLElement | null)[]): HTMLElement {
  const box = h(`div.panel.modal.${cls}` as 'div', null, h('header.panel-head', null, h('h2', { text: title })), h('div.panel-body', null, ...children));
  const back = h('div.modal-backdrop', null, box);
  back.addEventListener('pointerdown', (e) => e.stopPropagation());
  return back;
}

export interface PauseActions {
  resume(): void;
  save(): void;
  load(): void;
  options(): void;
  quitToTitle(): void;
  /** Sólo desarrollo: abrir «Partidas de prueba». */
  presets?: () => void;
}

export function pauseModal(a: PauseActions, info: string): HTMLElement {
  return modal('Pausa', 'pause-modal',
    h('div.modal-info', { text: info }),
    h('nav.modal-menu', null,
      button('Continuar', a.resume, 'primary'),
      button('Guardar partida', a.save),
      button('Cargar partida', a.load),
      button('Opciones', a.options),
      a.presets ? button('Partidas de prueba', a.presets) : null,
      button('Salir al título', a.quitToTitle)),
  );
}

export interface OptionsActions {
  back(): void;
  keybinds(): void;
  resetWindows(): void;
  /** Entrar en el modo «Editar interfaz» (mover los elementos del HUD). */
  editHud(): void;
  /** Tecla actual de una acción, para recordarla junto a su opción. */
  keyLabel(a: Action): string;
}

export const THEME_NAMES: Record<ThemeId, string> = {
  pergamino: 'Pergamino',
  fuego: 'Fuego',
  agua: 'Agua',
  viento: 'Viento',
  tierra: 'Tierra',
  naturaleza: 'Naturaleza',
  claro: 'Claro',
  contraste: 'Alto contraste',
};
const FONT_NAMES: Record<FontId, string> = {
  clasica: 'Clásica (serif)',
  libro: 'Libro',
  moderna: 'Moderna (sin serifa)',
  legible: 'Muy legible',
};
const PRESET_NAMES: Record<GraphicsPresetId | 'personalizado', string> = {
  bajo: 'Bajo',
  medio: 'Medio',
  alto: 'Alto',
  ultra: 'Ultra',
  personalizado: 'Personalizado',
};
const SHADOW_NAMES: Record<ShadowLevel, string> = { no: 'Sin sombras', bajas: 'Bajas', altas: 'Altas' };
const AA_NAMES: Record<AntialiasMode, string> = { no: 'Sin suavizado', fxaa: 'FXAA (rápido)', msaa: 'MSAA (al reiniciar)' };
const BAR_NAMES: Record<EnemyBarMode, string> = {
  siempre: 'Siempre',
  heridos: 'Sólo los heridos',
  objetivo: 'Sólo el objetivo',
  nunca: 'Nunca',
};

const CAST_MODE_NAMES: Record<CastMode, string> = {
  indicator: 'Con indicador (mantener y soltar)',
  press: 'Al pulsar (sale hacia el cursor)',
  pressClick: 'Pulsar y clic para confirmar',
};

const LOCK_MODE_NAMES: Record<LockMode, string> = {
  free: 'Libre (con un pequeño placaje)',
  body: 'Bloqueo de cuerpo',
};

/** Claves de opciones que son una lista cerrada de valores. */
type PickKey = 'theme' | 'font' | 'fpsCap' | 'shadows' | 'antialias' | 'enemyBars' | 'castMode' | 'lockMode';

/**
 * Opciones en pestañas (como las de DOFUS 3): gráficos, interfaz, juego,
 * pantalla, cámara, controles y sonido. Cada cambio se aplica y se guarda al
 * momento.
 */
export function optionsModal(o: GameOptions, onChange: (o: GameOptions) => void, a: OptionsActions): HTMLElement {
  let cur = { ...o };
  const L = OPTION_LIMITS;
  type RangeKey = keyof typeof OPTION_LIMITS;
  type BoolKey = { [K in keyof GameOptions]: GameOptions[K] extends boolean ? K : never }[keyof GameOptions];
  const pct = (v: number): string => `${Math.round(v * 100)} %`;
  const dec = (v: number): string => `${v.toFixed(2).replace(/0$/, '').replace('.', ',')}×`;
  /** Vuelve a leer `cur` en cada control (tras elegir un preajuste). */
  const refreshers: (() => void)[] = [];
  const graphics = new Set<keyof GameOptions>(GRAPHICS_KEYS);
  let presetSel: HTMLSelectElement | null = null;
  const emit = (key: keyof GameOptions): void => {
    if (graphics.has(key) && presetSel) presetSel.value = graphicsPresetOf(cur);
    onChange({ ...cur });
  };

  const range = (label: string, key: RangeKey, fmt: (v: number) => string): HTMLElement => {
    const out = h('output', { text: fmt(cur[key]) });
    const inp = h('input', { type: 'range', min: L[key].min, max: L[key].max, step: L[key].step, value: cur[key], 'data-opt': key });
    inp.addEventListener('input', () => {
      cur[key] = Number(inp.value);
      out.textContent = fmt(cur[key]);
      emit(key);
    });
    refreshers.push(() => {
      inp.value = String(cur[key]);
      out.textContent = fmt(cur[key]);
    });
    return h('label.opt-row', null, h('span', { text: label }), inp, out);
  };
  const check = (label: string, key: BoolKey, action?: Action): HTMLElement => {
    const inp = h('input', { type: 'checkbox', 'data-opt': key });
    inp.checked = cur[key];
    inp.addEventListener('change', () => {
      cur[key] = inp.checked;
      emit(key);
    });
    refreshers.push(() => (inp.checked = cur[key]));
    const k = action ? a.keyLabel(action) : '';
    return h('label.opt-row.check', null, h('span', null, label, k ? h('kbd', { text: k }) : null), inp);
  };
  const options = <T extends string | number>(sel: HTMLSelectElement, list: readonly T[], name: (v: T) => string, value: T): void => {
    for (const v of list) {
      const op = h('option', { value: String(v), text: name(v) });
      if (value === v) op.selected = true;
      sel.appendChild(op);
    }
  };
  const select = <T extends string | number>(label: string, key: PickKey, list: readonly T[], name: (v: T) => string): HTMLElement => {
    const sel = h('select', { 'data-opt': key });
    options(sel, list, name, cur[key] as T);
    sel.addEventListener('change', () => {
      const v = list.find((x) => String(x) === sel.value);
      if (v === undefined) return;
      (cur as Record<string, unknown>)[key] = v;
      emit(key);
    });
    refreshers.push(() => (sel.value = String(cur[key])));
    return h('label.opt-row.pick', null, h('span', { text: label }), sel);
  };
  /** Calidad gráfica: elegir un preajuste fija todas las opciones gráficas. */
  const preset = (): HTMLElement => {
    const sel = h('select', { 'data-opt': 'graphicsPreset' });
    presetSel = sel;
    options(sel, [...GRAPHICS_PRESET_IDS, 'personalizado' as const], (v) => PRESET_NAMES[v], graphicsPresetOf(cur));
    sel.addEventListener('change', () => {
      const id = GRAPHICS_PRESET_IDS.find((x) => x === sel.value);
      if (!id) {
        sel.value = graphicsPresetOf(cur);
        return;
      }
      cur = applyGraphicsPreset(cur, id);
      for (const r of refreshers) r();
      onChange({ ...cur });
    });
    return h('label.opt-row.pick', null, h('span', { text: 'Calidad gráfica' }), sel);
  };

  const tabs: [string, HTMLElement[]][] = [
    ['Gráficos', [
      preset(),
      h('h4', { text: 'Detalle' }),
      select('Sombras', 'shadows', SHADOW_LEVELS, (v) => SHADOW_NAMES[v]),
      range('Hierba y vegetación', 'vegetationDensity', pct),
      range('Distancia de visión', 'viewDistance', (v) => `${v} m`),
      range('Partículas', 'particles', (v) => (v === 0 ? 'No' : pct(v))),
      h('h4', { text: 'Imagen' }),
      range('Resolución interna', 'renderScale', pct),
      select('Suavizado de bordes', 'antialias', ANTIALIAS_MODES, (v) => AA_NAMES[v]),
      check('Recortar lo que tapa al personaje', 'occlusionCut'),
      h('p.hint', { text: 'Todo se aplica al momento salvo MSAA, que pide volver a abrir el juego. Con menos resolución interna el juego va más ligero y la interfaz sigue nítida.' }),
    ]],
    ['Interfaz', [
      select('Tema', 'theme', THEMES, (v) => THEME_NAMES[v]),
      select('Letra', 'font', FONTS, (v) => FONT_NAMES[v]),
      h('h4', { text: 'Tamaño' }),
      check('Tamaño automático (según la pantalla)', 'uiScaleAuto'),
      range('Tamaño de la interfaz (manual)', 'uiScale', pct),
      range('Iconos de la barra de hechizos', 'hotbarIconScale', dec),
      range('Casillas de la mochila', 'bagIconScale', dec),
      range('Letra del registro de combate', 'combatLogSize', (v) => `${v} px`),
      h('h4', { text: 'Ventanas' }),
      range('Opacidad de las ventanas', 'windowOpacity', pct),
      check('Animaciones de la interfaz', 'uiAnimations'),
      range('Retardo de los tooltips', 'tooltipDelay', (v) => `${v} ms`),
      check('Bloquear la posición de las ventanas', 'lockWindows'),
      h('div.opt-row.check', null, h('span', { text: 'Las ventanas se arrastran por su título' }), button('Restablecer posiciones', a.resetWindows, 'small')),
      h('div.opt-row.check', null, h('span', null, 'Mover los elementos del HUD y guardar perfiles', h('kbd', { text: a.keyLabel('editHud') })), button('Editar interfaz', a.editHud, 'small')),
    ]],
    ['Juego', [
      h('h4', { text: 'Enemigos' }),
      select('Barras de vida', 'enemyBars', ENEMY_BAR_MODES, (v) => BAR_NAMES[v]),
      check('Nombre y nivel', 'enemyLabels'),
      check('Números de daño flotantes', 'damageNumbers'),
      h('h4', { text: 'Combate' }),
      select('Lanzar hechizos', 'castMode', CAST_MODES, (v) => CAST_MODE_NAMES[v]),
      h('p.hint', { text: 'Con indicador y con clic: Esc o clic derecho cancelan. Los hechizos sobre ti salen al pulsar.' }),
      select('Placaje (experimental)', 'lockMode', LOCK_MODES, (v) => LOCK_MODE_NAMES[v]),
      h('p.hint', { text: 'Libre: atraviesas a la gente y alejarte de un enemigo pegado te frena un instante. Bloqueo de cuerpo: nadie atraviesa a nadie y zafarte de un enemigo pegado te frena más rato.' }),
      check('Alcance del hechizo al apuntarlo o cargarlo', 'showSpellRange'),
      check('Mostrar la trayectoria del personaje', 'showPath', 'togglePath'),
      check('Mostrar la cuadrícula de movimiento', 'showGrid', 'toggleGrid'),
      h('h4', { text: 'Comercio' }),
      check('Confirmar antes de vender objetos raros o mejores', 'confirmRareSell'),
    ]],
    ['Pantalla', [
      check('Pantalla completa', 'fullscreen', 'fullscreen'),
      select('Límite de FPS', 'fpsCap', FPS_CAPS, (v) => (v === 0 ? 'Sin límite' : `${v} FPS`)),
      check('Mostrar FPS y tiempos', 'showFps'),
    ]],
    ['Cámara', [
      range('Sensibilidad', 'cameraSensitivity', (v) => `${v.toFixed(1).replace('.', ',')}×`),
      range('Giro con teclas', 'cameraKeySpeed', (v) => `${v}°/s`),
      check('Invertir eje horizontal', 'invertCameraX'),
      check('Invertir eje vertical', 'invertCameraY'),
      h('p.hint', {
        text: `Girar: rueda pulsada o clic derecho y arrastrar (dos dedos en el trackpad), mantener ${a.keyLabel('cameraOrbit')} y mover el cursor, o ${a.keyLabel('cameraLeft')} / ${a.keyLabel('cameraRight')}. Zoom: rueda o pellizco.`,
      }),
    ]],
    ['Controles', [
      h('div.opt-row.check', null, h('span', { text: 'Atajos de teclado' }), button('Configurar…', a.keybinds)),
      h('p.hint', { text: 'Hechizos en QWERTYUIOP y ASDFGHJKLÑ; todo se puede cambiar.' }),
    ]],
    ['Sonido', [
      range('Volumen general', 'volume', pct),
      range('Música', 'musicVolume', pct),
      range('Efectos', 'sfxVolume', pct),
    ]],
  ];

  const nav = h('nav.opt-tabs');
  const pages = h('div.opt-pages');
  tabs.forEach(([name, rows], i) => {
    const page = h('section.opt-page', null, ...rows);
    page.hidden = i !== lastTab;
    const tab = h(`button.opt-tab${i === lastTab ? '.on' : ''}` as 'button', { type: 'button', text: name });
    tab.addEventListener('click', (e) => {
      e.stopPropagation();
      lastTab = i;
      for (const p of pages.children) (p as HTMLElement).hidden = p !== page;
      for (const t of nav.children) t.classList.toggle('on', t === tab);
      pages.scrollTop = 0;
    });
    nav.appendChild(tab);
    pages.appendChild(page);
  });

  return modal('Opciones', 'options-modal',
    nav,
    pages,
    h('p.hint', { text: 'Las opciones se guardan en este equipo.' }),
    h('div.row-end', null, button('Volver', a.back, 'primary')),
  );
}

/** Pestaña que se vio la última vez (dentro de la sesión). */
let lastTab = 0;

/** «1 h 05 min» / «12 min» a partir de segundos jugados. */
export function playTimeText(seconds: number): string {
  const m = Math.floor(seconds / 60);
  if (m < 1) return seconds > 0 ? '< 1 min' : '';
  const hh = Math.floor(m / 60);
  return hh > 0 ? `${hh} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`;
}

export function slotsModal(
  mode: 'save' | 'load',
  slots: (SlotSummary | null)[],
  current: number | null,
  className: (id: string) => string,
  a: { pick(slot: number): void; remove(slot: number): void; rename(slot: number, label: string): void; back(): void },
): HTMLElement {
  // Lista con desplazamiento: 12 ranuras no caben a la vez en pantallas pequeñas.
  const list = h('div.slot-list.slot-list-scroll');
  for (let i = 0; i < SLOT_COUNT; i++) {
    const s = slots[i] ?? null;
    const when = s ? new Date(s.savedAt) : null;
    const nameEl = h('div.slot-name', { text: s ? s.label : 'Ranura vacía' });
    // Línea 1: personaje; línea 2: sitio, fecha y tiempo jugado.
    const who = s ? `${s.label !== s.name ? `${s.name} · ` : ''}${className(s.classId)} · nivel ${s.level}${i === current ? ' · partida actual' : ''}` : '—';
    const where = s
      ? [
        s.place ? `${s.scene === 'dungeon' ? '⛫ ' : ''}${s.place}` : null,
        when && !isNaN(when.getTime()) ? when.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : '—',
        playTimeText(s.playSeconds) || null,
      ].filter((x): x is string => !!x).join(' · ')
      : null;
    const info = h('div.slot-info', null, nameEl, h('div.slot-meta', { text: who }), where ? h('div.slot-meta', { text: where }) : null);
    const row = h(`div.slot-row${s ? '' : '.empty'}${i === current ? '.current' : ''}` as 'div', null, h('div.slot-num', { text: String(i + 1) }), info);
    const pick = button(mode === 'save' ? 'Guardar aquí' : 'Cargar', () => a.pick(i), 'small');
    if (mode === 'load' && !s) pick.disabled = true;
    row.appendChild(pick);
    if (s) {
      // Renombrar en el sitio: Intro guarda, Esc cancela, salir del campo guarda.
      const ren = button('Renombrar', () => {
        const input = h('input.slot-rename', { type: 'text', maxlength: LABEL_MAX, value: s.label }) as HTMLInputElement;
        let done = false;
        const commit = (save: boolean): void => {
          if (done) return;
          done = true;
          if (save && input.value.trim() !== s.label) a.rename(i, input.value);
          else input.replaceWith(nameEl);
        };
        input.addEventListener('keydown', (e) => {
          e.stopPropagation();
          if (e.key === 'Enter') commit(true);
          if (e.key === 'Escape') commit(false);
        });
        input.addEventListener('blur', () => commit(true));
        nameEl.replaceWith(input);
        input.focus();
        input.select();
      }, 'small');
      row.append(ren, button('Borrar', () => a.remove(i), 'small danger'));
    }
    list.appendChild(row);
  }
  return modal(mode === 'save' ? 'Guardar partida' : 'Cargar partida', 'slots-modal', list, h('div.row-end', null, button('Volver', a.back)));
}

/** Una partida de prueba en la lista del título. */
export interface PresetEntry {
  id: string;
  name: string;
  description: string;
  group: string;
  role: string;
  classId: string;
  level: number;
  place: string;
}

/** «Partidas de prueba» (sólo desarrollo): agrupadas por franja, un clic carga. */
export function presetsModal(groups: { name: string; entries: PresetEntry[] }[], className: (id: string) => string, a: { pick(id: string): void; back(): void }): HTMLElement {
  const list = h('div.slot-list.slot-list-scroll');
  for (const g of groups) {
    if (g.entries.length === 0) continue;
    list.appendChild(h('div.preset-group', { text: g.name }));
    for (const p of g.entries) {
      const row = h('div.slot-row.preset-row', null,
        h('div.slot-num', { text: String(p.level) }),
        h('div.slot-info', null,
          h('div.slot-name', { text: `${p.name} · ${p.role}` }),
          h('div.slot-meta', { text: `${className(p.classId)} · nivel ${p.level} · ${p.place}` }),
          h('div.slot-meta.preset-desc', { text: p.description })),
        button('Jugar', () => a.pick(p.id), 'small primary'));
      list.appendChild(row);
    }
  }
  return modal('Partidas de prueba', 'slots-modal.presets-modal',
    h('p.hint', { text: 'Sólo para probar: personajes hechos con data/dev/presets.json. No ocupan ranura; guárdalas desde la pausa si quieres conservarlas.' }),
    list, h('div.row-end', null, button('Volver', a.back)));
}

export function confirmModal(
  title: string,
  text: string,
  yes: string,
  input: { min: number; max: number; value: number } | undefined,
  onYes: (n: number, skip: boolean) => void,
  onNo: () => void,
  /** Texto de la casilla «no volver a preguntar» (sin ella, no se enseña). */
  skipLabel?: string,
): HTMLElement {
  const num = input ? h('input.qty-input', { type: 'number', min: input.min, max: input.max, value: input.value }) : null;
  const skip = skipLabel ? (h('input', { type: 'checkbox' }) as HTMLInputElement) : null;
  const ok = button(yes, () => {
    const n = num ? Math.max(input!.min, Math.min(input!.max, Math.floor(Number(num.value) || input!.value))) : 1;
    onYes(n, skip?.checked ?? false);
  }, 'primary danger');
  return modal(title, 'confirm-modal', h('p', { text }), num ? h('label.opt-row', null, h('span', { text: 'Cantidad' }), num) : null,
    skip ? h('label.confirm-skip', null, skip, h('span', { text: skipLabel! })) : null,
    h('div.row-end', null, button('Cancelar', onNo), ok));
}

/**
 * Atajos de teclado: cada acción con su tecla; clic en la tecla → «Pulsa una
 * tecla» y la siguiente pulsación la asigna (si ya era de otra acción, se
 * intercambian). Esc cancela la captura. `onChange` se llama tras cada cambio.
 */
export function keybindsModal(keys: KeyMap, defaults: Keybindings, onChange: () => void, onBack: () => void): HTMLElement {
  const list = h('div.keybind-list');
  let capturing: { action: Action; btn: HTMLButtonElement } | null = null;

  const render = (): void => {
    list.replaceChildren();
    for (const g of ACTION_GROUPS) {
      list.appendChild(h('h4', { text: g.title }));
      const grid = h('div.keybind-grid');
      for (const { action, label } of g.actions) {
        const btn = h('button.btn.small.keybind-key', { type: 'button', text: keys.label(action) || '—' }) as HTMLButtonElement;
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (capturing) capturing.btn.textContent = keys.label(capturing.action) || '—';
          capturing = { action, btn };
          btn.textContent = 'Pulsa una tecla…';
          btn.classList.add('capturing');
        });
        grid.appendChild(h('div.keybind-row', null, h('span', { text: label }), btn));
      }
      list.appendChild(grid);
    }
  };

  // Captura antes que el resto de la interfaz (fase de captura), para que la
  // tecla no dispare su acción mientras se asigna.
  const onKey = (e: KeyboardEvent): void => {
    if (!capturing) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.code !== 'Escape') {
      keys.rebind(capturing.action, e.code);
      onChange();
    }
    capturing = null;
    render();
  };
  window.addEventListener('keydown', onKey, true);
  const back = (): void => {
    window.removeEventListener('keydown', onKey, true);
    onBack();
  };

  render();
  return modal('Atajos de teclado', 'keybinds-modal',
    h('p.hint', { text: 'Haz clic en una tecla y pulsa la nueva. Si ya la usaba otra acción, se intercambian. Esc cancela.' }),
    list,
    h('div.row-end', null,
      button('Restaurar predeterminados', () => {
        keys.reset(defaults);
        onChange();
        render();
      }),
      button('Volver', back, 'primary')),
  );
}
