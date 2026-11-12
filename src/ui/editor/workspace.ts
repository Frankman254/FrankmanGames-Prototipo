// EditorWorkspace — espacio de trabajo modular que reemplaza el panel lateral
// de 300 px. Contiene: barra superior, jerarquía (izquierda), inspector
// (derecha) y asset browser (inferior). El viewport central sigue siendo el
// canvas Babylon.js del juego.
import './workspace.css';
import type { EditorObject, Field, PaletteEntry } from '../../editor/doc';
import type { BrushMode } from '../../editor/navBrush';
import type { ManualObjectKind } from '../../data/dungeonFloorMap';
import { prefabRegistry } from '../../editor/prefabRegistry';

// ===== Tipos =================================================================

export type WorkspaceTool = 'select' | 'move' | 'rotate' | 'scale' | 'add' | 'paint';

export interface WorkspaceState {
  tool: WorkspaceTool;
  selected: EditorObject | null;
  fields: Field[];
  objects: EditorObject[];
  layers: ReadonlySet<string>;
  showGrid: boolean;
  palette: PaletteEntry[];
  paletteId: string | null;
  brushMode: BrushMode;
  brushRadius: number;
  filter: string;
  hierarchyFilter: string;
  assetFilter: string;
  assetCategory: string;
  undoLabel: string | null;
  redoLabel: string | null;
  dirty: string[];
  canSave: boolean;
  canRemove: boolean;
  status: string;
  sceneLabel: string;
  isDungeon: boolean;
  isPlaying: boolean;
}

export interface WorkspaceActions {
  close(): void;
  tool(t: WorkspaceTool): void;
  layer(cat: string, on: boolean): void;
  showGrid(on: boolean): void;
  field(name: string, value: number): void;
  rotate(steps: number): void;
  scale(factor: number): void;
  remove(): void;
  focus(): void;
  palette(id: string): void;
  brushMode(m: BrushMode): void;
  brushRadius(r: number): void;
  pickFromList(key: string): void;
  filter(text: string): void;
  hierarchyFilter(text: string): void;
  assetFilter(text: string): void;
  assetCategory(cat: string): void;
  undo(): void;
  redo(): void;
  save(): void;
  exportJson(): void;
  play(): void;
  stopPlay(): void;
  addObject(kind: ManualObjectKind, x: number, y: number): void;
  duplicate(): void;
  rename(name: string): void;
  toggleVisibility(key: string): void;
}

// ===== Utilidades DOM =======================================================

const LAYER_LABELS: Record<string, string> = {
  props: 'Props',
  trees: 'Árboles',
  npcs: 'PNJ',
  water: 'Agua',
  zones: 'Zonas',
  start: 'Inicio',
  stones: 'Piedras',
  stations: 'Talleres',
};

const CATEGORY_ICONS: Record<string, string> = {
  props: '📦',
  trees: '🌲',
  npcs: '👤',
  water: '💧',
  zones: '🔲',
  start: '🏁',
  stones: '🪨',
  stations: '⚒️',
};

const ASSET_ICONS: Record<ManualObjectKind, string> = {
  chest: '📦',
  barrel: '🛢️',
  jar: '🏺',
  door: '🚪',
  torch: '🔥',
  spawn: '💀',
  npc: '👤',
  resource: '⛏️',
  decoration: '🎨',
  structural: '🧱',
  zone: '🔲',
  trigger: '⚡',
  entrance: '⬇️',
  exit: '⬆️',
};

// Las categorías se obtienen del PrefabRegistry en lugar de ser estáticas
function getAssetCategories(): Record<string, ManualObjectKind[]> {
  const cats = prefabRegistry.getCategories();
  const record: Record<string, ManualObjectKind[]> = {};
  for (const cat of cats) {
    record[cat] = prefabRegistry.getByCategory(cat).map((e) => e.kind);
  }
  return record;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function button(text: string, onClick: () => void, cls = 'ed-toolbar-btn', title?: string): HTMLButtonElement {
  const b = el('button', cls, text);
  b.type = 'button';
  if (title) b.title = title;
  b.addEventListener('click', () => {
    onClick();
    b.blur();
  });
  return b;
}

// ===== Componentes ==========================================================

/** Barra superior con menú de herramientas y estado. */
class Toolbar {
  readonly el: HTMLElement;

  constructor(private readonly act: WorkspaceActions) {
    this.el = el('div', 'ed-toolbar');
    this.build();
  }

  private build() {
    this.el.replaceChildren();

    // Archivo
    const fileGroup = el('div', 'ed-toolbar-group');
    fileGroup.append(
      button('Guardar', () => this.act.save(), 'ed-toolbar-btn', 'Ctrl+S'),
      button('Exportar', () => this.act.exportJson(), 'ed-toolbar-btn'),
    );
    this.el.append(fileGroup);
    this.el.append(el('div', 'ed-toolbar-sep'));

    // Editar
    const editGroup = el('div', 'ed-toolbar-group');
    const undoBtn = button('↩', () => this.act.undo(), 'ed-toolbar-btn', 'Deshacer (Ctrl+Z)');
    undoBtn.dataset.role = 'undo';
    const redoBtn = button('↪', () => this.act.redo(), 'ed-toolbar-btn', 'Rehacer (Ctrl+Y)');
    redoBtn.dataset.role = 'redo';
    editGroup.append(undoBtn, redoBtn);
    this.el.append(editGroup);
    this.el.append(el('div', 'ed-toolbar-sep'));

    // Herramientas
    const toolGroup = el('div', 'ed-toolbar-group');
    const tools: Array<[WorkspaceTool, string, string]> = [
      ['select', '☝ Seleccionar', 'Elegir objetos (1)'],
      ['move', '✥ Mover', 'Mover objetos con gizmo (2)'],
      ['rotate', '↻ Girar', 'Girar objetos con gizmo (3)'],
      ['scale', '⤢ Escalar', 'Escalar objetos con gizmo (4)'],
      ['add', '➕ Añadir', 'Colocar desde assets (5)'],
      ['paint', '🖌 Navegación', 'Pintar celdas (6)'],
    ];
    for (const [t, label, tip] of tools) {
      const btn = button(label, () => this.act.tool(t), 'ed-toolbar-btn', tip);
      btn.dataset.tool = t;
      toolGroup.append(btn);
    }
    this.el.append(toolGroup);
    this.el.append(el('div', 'ed-toolbar-sep'));

    // Probar / Stop
    const playGroup = el('div', 'ed-toolbar-group');
    const playBtn = button('▶ Probar', () => this.act.play(), 'ed-toolbar-btn primary', 'Ejecutar el escenario');
    playBtn.dataset.role = 'play-btn';
    const stopBtn = button('⏹ Stop', () => this.act.stopPlay(), 'ed-toolbar-btn danger', 'Volver al editor');
    stopBtn.dataset.role = 'stop-btn';
    stopBtn.style.display = 'none';
    playGroup.append(playBtn, stopBtn);
    this.el.append(playGroup);

    // Cerrar
    this.el.append(el('div', 'ed-toolbar-sep'));
    this.el.append(
      button('✕ Cerrar', () => this.act.close(), 'ed-toolbar-btn', 'Salir (F12)'),
    );

    // Estado
    const status = el('div', 'ed-toolbar-status');
    status.dataset.role = 'status';
    this.el.append(status);
  }

  refresh(s: WorkspaceState) {
    const undo = this.el.querySelector<HTMLButtonElement>('[data-role="undo"]');
    if (undo) {
      undo.disabled = !s.undoLabel;
      undo.title = s.undoLabel ? `Deshacer «${s.undoLabel}» (Ctrl+Z)` : 'Nada que deshacer';
    }
    const redo = this.el.querySelector<HTMLButtonElement>('[data-role="redo"]');
    if (redo) {
      redo.disabled = !s.redoLabel;
      redo.title = s.redoLabel ? `Rehacer «${s.redoLabel}» (Ctrl+Y)` : 'Nada que rehacer';
    }
    // Tool buttons — highlight active
    const toolBtns = this.el.querySelectorAll<HTMLButtonElement>('[data-tool]');
    for (const btn of toolBtns) {
      btn.classList.toggle('on', btn.dataset.tool === s.tool);
    }
    // Play/Stop buttons — hidden until Play Mode is ready
    const playBtn = this.el.querySelector<HTMLButtonElement>('[data-role="play-btn"]');
    const stopBtn = this.el.querySelector<HTMLButtonElement>('[data-role="stop-btn"]');
    if (playBtn) playBtn.style.display = 'none';
    if (stopBtn) stopBtn.style.display = 'none';
    const status = this.el.querySelector<HTMLElement>('[data-role="status"]');
    if (status) {
      const dirtyText = s.dirty.length ? ` · Sin guardar: ${s.dirty.join(', ')}` : '';
      status.textContent = `${s.sceneLabel}${dirtyText}${s.status ? ' · ' + s.status : ''}`;
      status.className = s.dirty.length ? 'ed-toolbar-status ed-toolbar-dirty' : 'ed-toolbar-status';
    }
  }
}

/** Panel izquierdo — árbol de entidades con búsqueda y visibilidad. */
class HierarchyPanel {
  readonly el: HTMLElement;
  private readonly tree: HTMLElement;
  private collapsed = new Set<string>();

  constructor(private readonly act: WorkspaceActions) {
    this.el = el('div', 'ed-hierarchy');
    this.tree = el('div', 'ed-hierarchy-tree');

    const header = el('div', 'ed-hierarchy-header', 'Jerarquía');
    this.el.append(header);

    const searchWrap = el('div', 'ed-hierarchy-search');
    const searchInput = el('input');
    searchInput.placeholder = 'Buscar…';
    searchInput.addEventListener('input', () => this.act.hierarchyFilter(searchInput.value));
    searchWrap.append(searchInput);
    this.el.append(searchWrap);

    this.el.append(this.tree);
  }

  render(s: WorkspaceState) {
    // Update search input value
    const searchInput = this.el.querySelector<HTMLInputElement>('.ed-hierarchy-search input');
    if (searchInput && document.activeElement !== searchInput) {
      searchInput.value = s.hierarchyFilter;
    }

    this.tree.replaceChildren();
    const filter = s.hierarchyFilter.trim().toLowerCase();

    // Agrupar por categoría
    const groups = new Map<string, EditorObject[]>();
    for (const o of s.objects) {
      if (filter && !o.label.toLowerCase().includes(filter) && !o.kind.includes(filter)) continue;
      const cat = o.category;
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(o);
    }

    for (const [cat, items] of groups) {
      const isCollapsed = this.collapsed.has(cat);
      const catEl = el('div', `ed-tree-category${isCollapsed ? ' collapsed' : ''}`);
      const icon = CATEGORY_ICONS[cat] ?? '📁';
      catEl.innerHTML = `<span class="ed-tree-arrow">▼</span> ${icon} ${LAYER_LABELS[cat] ?? cat} (${items.length})`;
      catEl.addEventListener('click', () => {
        if (this.collapsed.has(cat)) this.collapsed.delete(cat);
        else this.collapsed.add(cat);
        this.render(s);
      });
      this.tree.append(catEl);

      if (!isCollapsed) {
        for (const o of items) {
          const itemEl = el('div', `ed-tree-item${o.key === s.selected?.key ? ' on' : ''}`);
          itemEl.textContent = o.label;
          itemEl.title = `${o.kind} · (${o.x.toFixed(1)}, ${o.y.toFixed(1)})`;
          itemEl.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).dataset.vis) return;
            this.act.pickFromList(o.key);
          });
          // Visibilidad button
          const visBtn = el('span', 'ed-vis-btn', '👁');
          visBtn.dataset.vis = '1';
          visBtn.title = 'Toggle visibilidad';
          visBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.act.toggleVisibility(o.key);
          });
          itemEl.prepend(visBtn);
          this.tree.append(itemEl);
        }
      }
    }
  }
}

/** Panel derecho — inspector de propiedades del objeto seleccionado. */
class InspectorPanel {
  readonly el: HTMLElement;

  constructor(private readonly act: WorkspaceActions) {
    this.el = el('div', 'ed-inspector');
    const header = el('div', 'ed-inspector-header', 'Inspector');
    this.el.append(header);
  }

  render(s: WorkspaceState) {
    // Keep header
    const header = this.el.querySelector('.ed-inspector-header')!;
    this.el.replaceChildren(header);

    if (!s.selected) {
      this.el.append(el('div', 'ed-inspector-empty', 'Selecciona un objeto para ver sus propiedades'));
      return;
    }

    const o = s.selected;

    // Info básica
    const infoSection = el('div', 'ed-insp-section');
    infoSection.append(el('div', 'ed-insp-section-title', o.label));
    const infoField = (label: string, value: string) => {
      const row = el('div', 'ed-insp-field');
      row.append(el('label', '', label));
      const span = el('span', '', value);
      span.style.color = '#b9c0cc';
      row.append(span);
      return row;
    };
    infoSection.append(infoField('ID', o.key));
    infoSection.append(infoField('Tipo', o.kind));
    infoSection.append(infoField('Categoría', LAYER_LABELS[o.category] ?? o.category));
    this.el.append(infoSection);

    // Transformación
    const transSection = el('div', 'ed-insp-section');
    transSection.append(el('div', 'ed-insp-section-title', 'Transformación'));

    const numField = (label: string, name: string, value: number, step: number) => {
      const row = el('div', 'ed-insp-field');
      row.append(el('label', '', label));
      const inp = el('input');
      inp.type = 'number';
      inp.step = String(step);
      inp.value = String(value);
      inp.dataset.field = name;
      inp.addEventListener('change', () => this.act.field(name, Number(inp.value)));
      row.append(inp);
      return row;
    };

    for (const f of s.fields) {
      transSection.append(numField(f.label, f.name, f.value, f.step));
    }

    // Posición X/Y si no hay fields (dungeon mode)
    if (s.fields.length === 0) {
      transSection.append(numField('X', 'x', o.x, 0.1));
      transSection.append(numField('Y', 'y', o.y, 0.1));
      if ('rotDeg' in o.shape) {
        // rotDeg is on the object, not shape — access it properly
        const rotDeg = (o as any).rotDeg ?? 0;
        transSection.append(numField('Rotación', 'rotDeg', rotDeg, 15));
      }
    }

    // Acciones
    const actions = el('div', 'ed-insp-actions');
    actions.append(button('⟲', () => this.act.rotate(-1), 'ed-insp-btn', 'Girar -15°'));
    actions.append(button('⟳', () => this.act.rotate(1), 'ed-insp-btn', 'Girar +15°'));
    actions.append(button('−', () => this.act.scale(1 / 1.1), 'ed-insp-btn', 'Más pequeño'));
    actions.append(button('+', () => this.act.scale(1.1), 'ed-insp-btn', 'Más grande'));
    actions.append(button('Centrar', () => this.act.focus(), 'ed-insp-btn', 'Cámara al objeto'));
    if (s.canRemove) {
      actions.append(button('Borrar', () => this.act.remove(), 'ed-insp-btn', 'Eliminar objeto'));
    }
    actions.append(button('Duplicar', () => this.act.duplicate(), 'ed-insp-btn', 'Duplicar objeto'));
    transSection.append(actions);
    this.el.append(transSection);

    // Forma
    if (o.shape.type === 'box') {
      const shapeSection = el('div', 'ed-insp-section');
      shapeSection.append(el('div', 'ed-insp-section-title', 'Dimensiones'));
      shapeSection.append(infoField('Ancho', `${o.shape.w.toFixed(2)} m`));
      shapeSection.append(infoField('Profundidad', `${o.shape.d.toFixed(2)} m`));
      shapeSection.append(infoField('Altura', `${o.shape.h.toFixed(2)} m`));
      this.el.append(shapeSection);
    }
  }
}

/** Panel inferior — catálogo de prefabs colocables. */
class AssetBrowser {
  readonly el: HTMLElement;
  private selectedKind: ManualObjectKind | null = null;

  constructor(private readonly act: WorkspaceActions) {
    this.el = el('div', 'ed-assets');
    this.build();
  }

  private build() {
    this.el.replaceChildren();

    const header = el('div', 'ed-assets-header');
    header.append(el('span', '', 'Assets'));

    // Categorías
    const catWrap = el('div', 'ed-assets-categories');
    const allBtn = button('Todos', () => this.act.assetCategory(''), 'ed-assets-cat-btn on');
    allBtn.dataset.role = 'cat-all';
    catWrap.append(allBtn);
    for (const cat of Object.keys(getAssetCategories())) {
      const btn = button(cat, () => this.act.assetCategory(cat), 'ed-assets-cat-btn');
      btn.dataset.cat = cat;
      catWrap.append(btn);
    }
    header.append(catWrap);

    // Búsqueda
    const searchWrap = el('div', 'ed-assets-search');
    const searchInput = el('input');
    searchInput.placeholder = 'Buscar asset…';
    searchInput.addEventListener('input', () => this.act.assetFilter(searchInput.value));
    searchWrap.append(searchInput);
    header.append(searchWrap);

    this.el.append(header);

    // Grid
    const grid = el('div', 'ed-assets-grid');
    grid.dataset.role = 'assets-grid';
    this.el.append(grid);
  }

  render(s: WorkspaceState) {
    const grid = this.el.querySelector<HTMLElement>('[data-role="assets-grid"]')!;
    if (!grid) return;
    grid.replaceChildren();

    // Update category button highlighting
    const catBtns = this.el.querySelectorAll<HTMLButtonElement>('[data-cat]');
    for (const btn of catBtns) {
      btn.classList.toggle('on', btn.dataset.cat === s.assetCategory);
    }
    const allBtn = this.el.querySelector<HTMLButtonElement>('[data-role="cat-all"]');
    if (allBtn) allBtn.classList.toggle('on', !s.assetCategory);

    // Update search input value
    const searchInput = this.el.querySelector<HTMLInputElement>('.ed-assets-search input');
    if (searchInput && document.activeElement !== searchInput) {
      searchInput.value = s.assetFilter;
    }

    const filter = s.assetFilter.trim().toLowerCase();
    const category = s.assetCategory;

    // Determinar qué kinds mostrar usando PrefabRegistry
    let entries = prefabRegistry.getAll();
    if (category) {
      entries = prefabRegistry.getByCategory(category);
    }
    if (filter) {
      entries = prefabRegistry.search(filter);
      if (category) {
        const catKinds = new Set(prefabRegistry.getByCategory(category).map((e) => e.kind));
        entries = entries.filter((e) => catKinds.has(e.kind));
      }
    }

    for (const entry of entries) {
      const kind = entry.kind;
      const card = el('div', 'ed-asset-card');
      const icon = entry.icon ?? (ASSET_ICONS[kind as keyof typeof ASSET_ICONS] ?? '📦');
      card.innerHTML = `<div class="ed-asset-icon">${icon}</div><div class="ed-asset-name">${entry.name}</div><div class="ed-asset-desc">${entry.description}</div>`;
      card.title = `${entry.description} (Clic para colocar)`;
      card.addEventListener('click', () => {
        this.selectedKind = kind;
        this.act.palette(kind);
        this.act.tool('add');
        this.render(s);
      });
      if (s.paletteId === kind) card.classList.add('on');
      grid.append(card);
    }
  }
}

// ===== EditorWorkspace principal =============================================

export class EditorWorkspace {
  readonly el: HTMLElement;
  private readonly toolbar: Toolbar;
  private readonly hierarchy: HierarchyPanel;
  private readonly inspector: InspectorPanel;
  private readonly assets: AssetBrowser;
  private lastShapeKey = '';

  constructor(parent: HTMLElement, private readonly act: WorkspaceActions) {
    this.el = el('div', 'ed-workspace');
    parent.append(this.el);

    // Toolbar
    this.toolbar = new Toolbar(act);
    this.el.append(this.toolbar.el);

    // Main area
    const main = el('div', 'ed-main');

    // Hierarchy (left)
    this.hierarchy = new HierarchyPanel(act);
    main.append(this.hierarchy.el);

    // Resize handle
    const resizeH = el('div', 'ed-resize-h');
    this.setupResize(resizeH, this.hierarchy.el, 'horizontal');
    main.append(resizeH);

    // Viewport (center) — the game canvas shows through
    const viewport = el('div', 'ed-viewport');
    viewport.dataset.role = 'viewport';
    main.append(viewport);

    // Inspector (right) — create before resize handle
    this.inspector = new InspectorPanel(act);

    // Resize handle
    const resizeH2 = el('div', 'ed-resize-h');
    this.setupResize(resizeH2, this.inspector.el, 'horizontal', true);
    main.append(resizeH2);
    main.append(this.inspector.el);

    this.el.append(main);

    // AssetBrowser — create before resize handle
    this.assets = new AssetBrowser(act);

    // Assets (bottom)
    const resizeV = el('div', 'ed-resize-v');
    this.setupResize(resizeV, this.assets.el, 'vertical');
    this.el.append(resizeV);
    this.el.append(this.assets.el);

    // Prevent keyboard events from reaching the game when typing in inputs
    this.el.addEventListener('keydown', (e) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA') {
        e.stopPropagation();
      }
    });
  }

  private setupResize(handle: HTMLElement, panel: HTMLElement, direction: 'horizontal' | 'vertical', reverse = false) {
    let startX = 0, startY = 0, startWidth = 0, startHeight = 0;

    const onDown = (e: MouseEvent) => {
      e.preventDefault();
      startX = e.clientX;
      startY = e.clientY;
      startWidth = panel.offsetWidth;
      startHeight = panel.offsetHeight;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };

    const onMove = (e: MouseEvent) => {
      if (direction === 'horizontal') {
        const delta = reverse ? -(e.clientX - startX) : (e.clientX - startX);
        const newWidth = Math.max(160, Math.min(400, startWidth + delta));
        panel.style.width = `${newWidth}px`;
      } else {
        const delta = reverse ? -(e.clientY - startY) : (e.clientY - startY);
        const newHeight = Math.max(80, Math.min(400, startHeight + delta));
        panel.style.height = `${newHeight}px`;
      }
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    handle.addEventListener('mousedown', onDown);
  }

  setVisible(on: boolean): void {
    this.el.style.display = on ? '' : 'none';
  }

  /** Renderizado condicional: solo rehace lo que cambió de forma. */
  render(s: WorkspaceState): void {
    const shapeKey = JSON.stringify([
      s.tool,
      s.selected?.key,
      s.fields.map((f) => f.name),
      s.paletteId,
      s.objects.map((o) => o.key),
      s.hierarchyFilter,
      s.assetFilter,
      s.assetCategory,
      [...s.layers],
      s.showGrid,
      s.canRemove,
    ]);

    this.toolbar.refresh(s);

    if (shapeKey !== this.lastShapeKey) {
      this.lastShapeKey = shapeKey;
      this.hierarchy.render(s);
      this.inspector.render(s);
      this.assets.render(s);
    } else {
      // Solo actualizar valores que cambian frecuentemente
      this.refreshValues(s);
    }
  }

  private refreshValues(s: WorkspaceState): void {
    // Actualizar valores de campos numéricos en el inspector
    for (const f of s.fields) {
      const inp = this.inspector.el.querySelector<HTMLInputElement>(`input[data-field="${f.name}"]`);
      if (inp && document.activeElement !== inp) inp.value = String(f.value);
    }
  }
}
