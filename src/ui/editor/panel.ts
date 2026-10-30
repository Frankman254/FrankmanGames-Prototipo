// Panel lateral del modo edición (DOM). No sabe nada del mundo: recibe el
// estado que tiene que pintar y avisa de lo que pulsa el usuario.
import type { Category, EditorObject, Field, PaletteEntry } from '../../editor/doc';
import type { BrushMode } from '../../editor/navBrush';

export type Tool = 'select' | 'add' | 'paint';

export interface PanelState {
  tool: Tool;
  layers: ReadonlySet<string>;
  showGrid: boolean;
  hideOriginals: boolean;
  selected: EditorObject | null;
  fields: Field[];
  canRemove: boolean;
  palette: PaletteEntry[];
  paletteId: string | null;
  zones: Array<{ index: number; name: string }>;
  zoneIndex: number;
  brushMode: BrushMode;
  brushRadius: number;
  list: EditorObject[];
  filter: string;
  undoLabel: string | null;
  redoLabel: string | null;
  dirty: string[];
  canSave: boolean;
  status: string;
}

export interface PanelActions {
  close(): void;
  tool(t: Tool): void;
  layer(cat: string, on: boolean): void;
  showGrid(on: boolean): void;
  hideOriginals(on: boolean): void;
  field(name: string, value: number): void;
  rotate(steps: number): void;
  scale(factor: number): void;
  remove(): void;
  focus(): void;
  palette(id: string): void;
  zone(index: number): void;
  brushMode(m: BrushMode): void;
  brushRadius(r: number): void;
  pickFromList(key: string): void;
  filter(text: string): void;
  undo(): void;
  redo(): void;
  save(): void;
  exportJson(): void;
}

const LAYER_LABELS: Record<Category, string> = {
  props: 'Casas y props',
  trees: 'Árboles y rocas',
  npcs: 'PNJ y mercaderes',
  water: 'Estanques',
  zones: 'Zonas',
  start: 'Inicio',
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function button(text: string, onClick: () => void, cls = 'ed-btn', title?: string): HTMLButtonElement {
  const b = el('button', cls, text);
  b.type = 'button';
  if (title) b.title = title;
  b.addEventListener('click', () => {
    onClick();
    b.blur(); // que las teclas no vuelvan a pulsar el botón
  });
  return b;
}

export class EditorPanel {
  readonly el: HTMLElement;
  private readonly body: HTMLElement;
  private lastHtmlKey = '';

  constructor(parent: HTMLElement, private readonly act: PanelActions) {
    this.el = el('aside', 'ed-panel');
    const head = el('header', 'ed-head');
    head.append(el('strong', '', 'Modo edición'), button('×', () => act.close(), 'ed-btn ed-close', 'Salir (F12)'));
    this.body = el('div', 'ed-body');
    this.el.append(head, this.body);
    parent.append(this.el);
    // Las teclas que se escriben en el panel no llegan al juego ni al editor.
    this.el.addEventListener('keydown', (e) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT') e.stopPropagation();
    });
  }

  setVisible(on: boolean): void {
    this.el.style.display = on ? '' : 'none';
  }

  /**
   * Repinta. Para no perder el foco de un campo mientras se escribe, sólo se
   * rehace lo que cambió de forma (herramienta, selección, lista).
   */
  render(s: PanelState): void {
    const shapeKey = JSON.stringify([s.tool, s.selected?.key, s.fields.map((f) => f.name), s.paletteId, s.zoneIndex, s.zones.length, s.brushMode, s.list.map((o) => o.key), s.filter, [...s.layers], s.showGrid, s.hideOriginals, s.canRemove]);
    if (shapeKey === this.lastHtmlKey) {
      this.refreshValues(s);
      return;
    }
    this.lastHtmlKey = shapeKey;
    const b = this.body;
    b.replaceChildren();

    const tools = el('div', 'ed-row ed-tools');
    for (const [t, label, tip] of [['select', 'Seleccionar', 'Elegir y arrastrar objetos'], ['add', 'Añadir', 'Colocar desde la paleta'], ['paint', 'Navegación', 'Pintar celdas bloqueadas o libres']] as const) {
      tools.append(button(label, () => this.act.tool(t), `ed-btn${s.tool === t ? ' on' : ''}`, tip));
    }
    b.append(tools);

    const layers = el('details', 'ed-sec');
    layers.open = true;
    layers.append(el('summary', '', 'Capas'));
    const lw = el('div', 'ed-layers');
    for (const [cat, label] of Object.entries(LAYER_LABELS)) lw.append(this.check(label, s.layers.has(cat), (on) => this.act.layer(cat, on)));
    lw.append(this.check('Cuadrícula de navegación', s.showGrid, (on) => this.act.showGrid(on)));
    lw.append(this.check('Ocultar casas y rocas originales', s.hideOriginals, (on) => this.act.hideOriginals(on)));
    layers.append(lw);
    b.append(layers);

    if (s.tool === 'add') {
      const sec = el('div', 'ed-sec');
      sec.append(el('div', 'ed-title', 'Paleta · clic en el suelo para colocar'));
      const grid = el('div', 'ed-palette');
      for (const p of s.palette) grid.append(button(p.label, () => this.act.palette(p.id), `ed-btn${s.paletteId === p.id ? ' on' : ''}`));
      sec.append(grid);
      if (s.palette.find((p) => p.id === s.paletteId)?.needsZone) {
        const sel = el('select', 'ed-input');
        for (const z of s.zones) {
          const o = el('option', '', z.name);
          o.value = String(z.index);
          o.selected = z.index === s.zoneIndex;
          sel.append(o);
        }
        sel.addEventListener('change', () => this.act.zone(Number(sel.value)));
        const row = el('label', 'ed-field');
        row.append(el('span', '', 'Zona'), sel);
        sec.append(row);
      }
      b.append(sec);
    }

    if (s.tool === 'paint') {
      const sec = el('div', 'ed-sec');
      sec.append(el('div', 'ed-title', 'Pincel · arrastrar con clic izquierdo'));
      const modes = el('div', 'ed-row');
      for (const [m, label] of [['block', 'Bloquear'], ['clear', 'Liberar'], ['erase', 'Automático']] as const) {
        modes.append(button(label, () => this.act.brushMode(m), `ed-btn${s.brushMode === m ? ' on' : ''}`));
      }
      sec.append(modes);
      const range = el('input', 'ed-input');
      range.type = 'range';
      range.min = '0';
      range.max = '4';
      range.step = '0.25';
      range.value = String(s.brushRadius);
      range.dataset['role'] = 'brush';
      range.addEventListener('input', () => this.act.brushRadius(Number(range.value)));
      const row = el('label', 'ed-field');
      row.append(el('span', 'ed-brush-label', `Radio ${s.brushRadius} m`), range);
      sec.append(row, el('p', 'ed-hint', 'Bloquear: no se pisa aunque no haya nada. Liberar: se pisa aunque un obstáculo la bloquee. Automático: lo que digan los obstáculos. Mayús = Liberar, Alt = Automático mientras pintas.'));
      b.append(sec);
    }

    if (s.selected) {
      const sec = el('div', 'ed-sec ed-selected');
      sec.append(el('div', 'ed-title', s.selected.label));
      for (const f of s.fields) {
        const inp = el('input', 'ed-input');
        inp.type = 'number';
        inp.step = String(f.step);
        inp.value = String(f.value);
        inp.dataset['field'] = f.name;
        inp.addEventListener('change', () => this.act.field(f.name, Number(inp.value)));
        const row = el('label', 'ed-field');
        row.append(el('span', '', f.label), inp);
        sec.append(row);
      }
      const acts = el('div', 'ed-row');
      acts.append(
        button('⟲', () => this.act.rotate(-1), 'ed-btn', 'Girar (Mayús+R)'),
        button('⟳', () => this.act.rotate(1), 'ed-btn', 'Girar (R)'),
        button('−', () => this.act.scale(1 / 1.1), 'ed-btn', 'Más pequeño ([)'),
        button('+', () => this.act.scale(1.1), 'ed-btn', 'Más grande (])'),
        button('Centrar', () => this.act.focus(), 'ed-btn', 'Cámara al objeto (F)'),
      );
      const del = button('Borrar', () => this.act.remove(), 'ed-btn danger', 'Supr');
      del.disabled = !s.canRemove;
      if (!s.canRemove) del.title = 'Los PNJ, mercaderes, estanques, el inicio y la única área de una zona no se borran desde aquí';
      acts.append(del);
      sec.append(acts);
      b.append(sec);
    }

    const listSec = el('details', 'ed-sec');
    listSec.open = s.tool === 'select';
    listSec.append(el('summary', '', 'Objetos cercanos'));
    const filter = el('input', 'ed-input');
    filter.placeholder = 'Filtrar (casa, pine, Marina…)';
    filter.value = s.filter;
    filter.addEventListener('input', () => this.act.filter(filter.value));
    const ul = el('ul', 'ed-list');
    for (const o of s.list) {
      const li = el('li', o.key === s.selected?.key ? 'on' : '', o.label);
      li.addEventListener('click', () => this.act.pickFromList(o.key));
      ul.append(li);
    }
    listSec.append(filter, ul);
    b.append(listSec);

    const foot = el('div', 'ed-sec ed-foot');
    const hist = el('div', 'ed-row');
    const undo = button('Deshacer', () => this.act.undo(), 'ed-btn', 'Ctrl+Z');
    undo.dataset['role'] = 'undo';
    const redo = button('Rehacer', () => this.act.redo(), 'ed-btn', 'Ctrl+Y');
    redo.dataset['role'] = 'redo';
    hist.append(undo, redo);
    const save = button(s.canSave ? 'Guardar (Ctrl+S)' : 'Guardar: sólo en npm run dev', () => this.act.save(), 'ed-btn primary');
    save.dataset['role'] = 'save';
    const exp = button('Exportar JSON', () => this.act.exportJson(), 'ed-btn', 'Descarga los archivos cambiados');
    exp.dataset['role'] = 'export';
    const saves = el('div', 'ed-row');
    saves.append(save, exp);
    const status = el('div', 'ed-status');
    status.dataset['role'] = 'status';
    foot.append(hist, saves, status, el('p', 'ed-hint', 'Cámara: WASD o flechas · clic derecho y arrastrar = girar · rueda pulsada = desplazar · rueda = zoom. Objetos: clic y arrastrar · R girar · [ ] tamaño · Supr borrar · F centrar · Esc soltar. Los cambios se ven como cajas; el mundo real se regenera al guardar.'));
    b.append(foot);
    this.refreshValues(s);
  }

  /** Lo que cambia a menudo (valores, etiquetas de deshacer, estado) sin rehacer el panel. */
  private refreshValues(s: PanelState): void {
    const q = <T extends HTMLElement>(sel: string): T | null => this.body.querySelector<T>(sel);
    for (const f of s.fields) {
      const inp = q<HTMLInputElement>(`input[data-field="${f.name}"]`);
      if (inp && document.activeElement !== inp) inp.value = String(f.value);
    }
    const undo = q<HTMLButtonElement>('[data-role="undo"]');
    if (undo) {
      undo.disabled = !s.undoLabel;
      undo.title = s.undoLabel ? `Deshacer «${s.undoLabel}» (Ctrl+Z)` : 'Nada que deshacer';
    }
    const redo = q<HTMLButtonElement>('[data-role="redo"]');
    if (redo) {
      redo.disabled = !s.redoLabel;
      redo.title = s.redoLabel ? `Rehacer «${s.redoLabel}» (Ctrl+Y)` : 'Nada que rehacer';
    }
    const save = q<HTMLButtonElement>('[data-role="save"]');
    if (save) save.disabled = !s.canSave || s.dirty.length === 0;
    const exp = q<HTMLButtonElement>('[data-role="export"]');
    if (exp) exp.disabled = s.dirty.length === 0;
    const status = q<HTMLElement>('[data-role="status"]');
    if (status) status.textContent = s.status || (s.dirty.length ? `Sin guardar: ${s.dirty.join(', ')}` : 'Todo guardado');
    const bl = q<HTMLElement>('.ed-brush-label');
    if (bl) bl.textContent = `Radio ${s.brushRadius} m`;
  }

  private check(label: string, on: boolean, fn: (on: boolean) => void): HTMLLabelElement {
    const l = el('label', 'ed-check');
    const c = el('input');
    c.type = 'checkbox';
    c.checked = on;
    c.addEventListener('change', () => fn(c.checked));
    l.append(c, el('span', '', label));
    return l;
  }
}
