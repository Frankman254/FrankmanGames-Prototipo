// Modo edición (herramienta de desarrollo, F12 por defecto): con el juego
// abierto se pausa la simulación, la cámara pasa a ser libre y se pueden mover,
// girar, escalar, borrar y añadir casas, árboles, rocas, PNJ, estanques y áreas
// de zona, pintar celdas de navegación y guardar. En `npm run dev` guardar
// escribe los JSON de `data/` con su formato (scripts/editorSave.ts) y el modo
// edición los aplica al mundo sin recargar (src/editor/hotApply.ts); fuera de
// desarrollo se exportan para descargarlos.
//
// Mientras está activo se queda con el ratón y el teclado (escucha en fase de
// captura y corta la propagación), así que el juego no recibe clics ni teclas.
import { Matrix, Vector3, type AbstractMesh } from '@babylonjs/core';
import './editor.css';
import terrainTxt from '../../../data/terrain.json?raw';
import vegetationTxt from '../../../data/vegetation.json?raw';
import npcsTxt from '../../../data/rpg/npcs.json?raw';
import merchantsTxt from '../../../data/rpg/merchants.json?raw';
import zonesTxt from '../../../data/zones.json?raw';
import fishingTxt from '../../../data/rpg/fishing.json?raw';
import navpaintTxt from '../../../data/navpaint.json?raw';
import stonesTxt from '../../../data/stones.json?raw';
import professionsTxt from '../../../data/rpg/professions.json?raw';
import deathTxt from '../../../data/death.json?raw';
import questsTxt from '../../../data/rpg/quests.json?raw';
import type { GameData } from '../../data';
import { dungeonFloorPath, type DungeonFloorMapDef } from '../../data/dungeonFloorMap';
import { parseNavPaint, parseTerrain, parseVegetation } from '../../data/worldSchema';
import { parseZones } from '../../data/zonesSchema';
import { EditorDoc, EDITOR_FILES, type EditorObject, type FileId, type ScatterFn, type ScatterItem } from '../../editor/doc';
import { DungeonEditorDoc } from '../../editor/dungeonDoc';
import { EDITOR_SAVE_HEADER, EDITOR_SAVE_ROUTE } from '../../editor/files';
import type { BrushMode } from '../../editor/navBrush';
import type { ArenaView } from '../../render/arenaView';
import { modelFileNames } from '../../render/modelFiles';
import { buildZoneGrid, type NavGrid, type RectObstacle } from '../../sim/navGrid';
import type { Overworld } from '../../world/overworld';
import type { DungeonFloor } from '../../world/dungeon';
import { scatterVegetation } from '../../world/scatter';
import { EditorView, FreeCamera } from './editorView';
import type { Tool } from './panel';
import { EditorWorkspace, type WorkspaceState, type WorkspaceTool } from './workspace';
import { TransformGizmo, type GizmoCallbacks } from './gizmo';
import type { ManualObjectKind } from '../../data/dungeonFloorMap';

export interface EditorHost {
  view: ArenaView;
  overworld: Overworld;
  data: GameData;
  /** Teclas de la acción `editor` (data/ui/keybindings.json; el jugador puede cambiarlas). */
  keys(): readonly string[];
  /**
   * Modo edición: tras escribir los JSON en disco, `main.ts` los aplica en
   * caliente (mundo, simulación y vistas) sin recargar la página. `before` es
   * el texto que había antes de guardar; devuelve el resumen para el panel
   * (puede tardar: va bajo una pantalla de carga).
   */
  apply?(files: readonly FileId[], before: Partial<Record<FileId, string>>, after: Partial<Record<FileId, string>>): string | Promise<string>;
  /** Si hay un piso activo, el editor cambia por completo a este ámbito. */
  dungeon?(): { dungeonId: string; floor: DungeonFloor; grid: NavGrid; apply(map: DungeonFloorMapDef): void } | null;
}

export interface EditorHandle {
  /** Activo: `main.ts` pausa la simulación. */
  readonly active: boolean;
  /** Abrir y cerrar por código (QA Electron; F12 sigue siendo la vía del jugador). */
  setActive(on: boolean): void;
  /** Texto del documento del archivo tal como iría a disco (QA: aplica sin pasar por Vite). */
  serialize(f: FileId): string;
  /** Texto aplicado la última vez (`before` de la diferencia; undefined si nunca se aplicó). */
  applied(f: FileId): string | undefined;
  /** QA: ámbito y catálogo exactos que ve el editor en este momento. */
  scope(): string;
  objects(): Array<{ key: string; kind: string; label: string }>;
}

const STORE_KEY = 'fmg-editor';
/** Mallas fusionadas de los props a mano (vegetationView.ts) que se pueden ocultar. */
const PROP_MESHES = ['houseWalls', 'houseRoofs', 'houseTrims', 'logs', 'boulders', 'lampPosts', 'lanterns'];

interface Stored {
  active: boolean;
  cam: { focus: { x: number; y: number }; yawDeg: number; pitchDeg: number; distance: number };
  tool: Tool;
  layers: string[];
  showGrid: boolean;
  hideOriginals: boolean;
}

function readStore(): Stored | null {
  try {
    const s = sessionStorage.getItem(STORE_KEY);
    return s ? (JSON.parse(s) as Stored) : null;
  } catch {
    return null;
  }
}

export function mountEditor(host: EditorHost): EditorHandle {
  const { view, overworld, data } = host;
  const scene = view.scene;
  const canvas = view.engine.getRenderingCanvas()!;
  const zone = data.zone;
  const cols = Math.ceil(zone.width / zone.cellSize);
  const rows = Math.ceil(zone.depth / zone.cellSize);
  const blocking = new Set(Object.entries(overworld.vegetation.kinds).filter(([, k]) => k.blockRadius > 0).map(([id]) => id));

  let status = '';
  let statusAt = 0;
  /** Mensaje en la línea de estado del panel (se borra solo a los 8 s). */
  const say = (text: string): void => {
    status = text;
    statusAt = performance.now();
  };
  let lastGood: ReturnType<ScatterFn> = { items: [], obstacles: [] };
  const scatterFn: ScatterFn = (veg, terrain) => {
    try {
      const s = scatterVegetation(parseVegetation(veg), parseTerrain(terrain), overworld.heights, blocking);
      const items: ScatterItem[] = [];
      for (const [kind, list] of s.byKind) {
        for (const i of list) items.push({ kind, x: i.x, y: i.z, scale: i.scale, rotDeg: (i.rotY * 180) / Math.PI, ...(i.placement !== undefined ? { placement: i.placement } : {}) });
      }
      lastGood = { items, obstacles: s.obstacles };
    } catch (e) {
      say(`Datos inválidos: ${(e as Error).message}`);
    }
    return lastGood;
  };
  const originals: Record<FileId, string> = { terrain: terrainTxt, vegetation: vegetationTxt, npcs: npcsTxt, merchants: merchantsTxt, zones: zonesTxt, fishing: fishingTxt, navpaint: navpaintTxt, stones: stonesTxt, professions: professionsTxt, death: deathTxt };
  const doc = new EditorDoc(originals, scatterFn, { cols, rows, cellSize: zone.cellSize }, modelFileNames(), { quests: JSON.parse(questsTxt) as unknown });
  // La imagen aplicada arranca en lo que hay en disco: el primer diff sale fino.
  Object.assign(doc.applied, originals);
  const edView = new EditorView(scene, view.heights);
  const cam = new FreeCamera();

  // ---- TransformGizmo (Hito 3) -------------------------------------------

  // ---- Canvas integration: move Babylon.js canvas into workspace viewport ----
  // The workspace overlays the full screen but the canvas must be inside the
  // viewport div so that engine.resize(), mouse coordinates and gizmos work
  // correctly. We move the canvas on open and restore it on close.
  let canvasOriginalParent: HTMLElement | null = null;
  let canvasOriginalNextSibling: ChildNode | null = null;
  let viewportEl: HTMLElement | null = null;
  // viewportEl is set after workspace is created (see below)

  function moveCanvasIntoViewport(): void {
    if (canvasOriginalParent) return; // already moved
    canvasOriginalParent = canvas.parentElement;
    canvasOriginalNextSibling = canvas.nextSibling;
    if (viewportEl) {
      // Remove any pointer-events block so the canvas receives events directly
      viewportEl.style.pointerEvents = 'auto';
      viewportEl.appendChild(canvas);
      canvas.style.position = 'absolute';
      canvas.style.left = '0';
      canvas.style.top = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';
      // Resize engine to match the new viewport dimensions
      view.engine.resize();
    }
  }

  function restoreCanvas(): void {
    if (!canvasOriginalParent) return; // not moved
    const parent = canvasOriginalParent;
    const sibling = canvasOriginalNextSibling;
    canvas.style.position = '';
    canvas.style.left = '';
    canvas.style.top = '';
    canvas.style.width = '';
    canvas.style.height = '';
    canvas.style.display = '';
    if (viewportEl) viewportEl.style.pointerEvents = '';
    if (sibling) parent.insertBefore(canvas, sibling);
    else parent.appendChild(canvas);
    canvasOriginalParent = null;
    canvasOriginalNextSibling = null;
    view.engine.resize();
  }

  // Resize the engine when the viewport size changes (panel resize handles)
  let resizeObserver: ResizeObserver | null = null;
  function setupResizeObserver(): void {
    if (resizeObserver) return;
    resizeObserver = new ResizeObserver(() => {
      if (active && canvasOriginalParent) {
        view.engine.resize();
      }
    });
    if (viewportEl) resizeObserver.observe(viewportEl);
  }
  function teardownResizeObserver(): void {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
  }

  const gizmoCallbacks: GizmoCallbacks = {
    onMove: (key, x, y) => {
      const dd = activeDungeonDoc();
      if (dd) {
        dd.begin(`Mover ${key}`);
        dd.moveTo(key, x, y);
        dd.commit();
      } else {
        doc.begin(`Mover ${key}`);
        doc.dragging = true;
        dragKey = key;
        dragOffset = { x: x - (ground()?.x ?? x), y: y - (ground()?.y ?? y) };
        const movedKey = doc.moveTo(key, x, y);
        dragKey = movedKey;
        doc.commit();
        dragKey = null;
      }
      select(selected()?.key ?? null);
    },
    onRotate: (key, steps) => {
      rotate(steps);
    },
    onScale: (key, factor) => {
      const k = key;
      const dd = activeDungeonDoc();
      if (dd) {
        dd.scale(k, factor);
      } else {
        select(doc.edit(factor > 1 ? 'Agrandar' : 'Achicar', () => doc.scale(k, factor)));
      }
      select(selected()?.key ?? null);
    },
    onSelect: (key) => {
      select(key);
    },
  };
  const transformGizmo = new TransformGizmo(scene, view.rig.camera, gizmoCallbacks);
  transformGizmo.setEnabled(false);


  const labels = document.createElement('div');
  labels.className = 'ed-labels';
  document.body.append(labels);

  let active = false;
  let saving = false;
  let tool: Tool = 'select';
  let selectedKey: string | null = null;
  let paletteId: string | null = 'prop:house';
  let zoneIndex = 0;
  let brushMode: BrushMode = 'block';
  let brushRadius = 0.5;
  let filter = '';
  let hideOriginals = true;
  let camRestored = false;
  let dungeonDoc: DungeonEditorDoc | null = null;
  // Workspace state
  let workspaceTool: WorkspaceTool = 'select';
  let hierarchyFilter = '';
  let assetFilter = '';
  let assetCategory = '';
  const activeDungeon = (): ReturnType<NonNullable<EditorHost['dungeon']>> => host.dungeon?.() ?? null;
  const activeDungeonDoc = (): DungeonEditorDoc | null => {
    const ctx = activeDungeon();
    if (!ctx) {
      dungeonDoc = null;
      return null;
    }
    const scope = `${ctx.dungeonId}:${ctx.floor.index + 1}`;
    if (!dungeonDoc || dungeonDoc.scopeId !== scope) dungeonDoc = new DungeonEditorDoc(ctx.floor);
    return dungeonDoc;
  };
  const activeObjects = (): EditorObject[] => activeDungeonDoc()?.objects() ?? doc.objects();

  const stored = readStore();
  if (stored) {
    Object.assign(cam, stored.cam);
    camRestored = true;
    tool = stored.tool;
    edView.layers.clear();
    for (const l of stored.layers) edView.layers.add(l);
    edView.showGrid = stored.showGrid;
    hideOriginals = stored.hideOriginals;
  }
  const persist = (): void => {
    try {
      const s: Stored = { active, cam: { focus: { ...cam.focus }, yawDeg: cam.yawDeg, pitchDeg: cam.pitchDeg, distance: cam.distance }, tool, layers: [...edView.layers], showGrid: edView.showGrid, hideOriginals };
      sessionStorage.setItem(STORE_KEY, JSON.stringify(s));
    } catch {
      // Sin almacenamiento de sesión: al recargar el editor empieza cerrado.
    }
  };

  // ---- Estado derivado ---------------------------------------------------------

  const selected = (): EditorObject | null => {
    if (!selectedKey) return null;
    const dungeon = activeDungeonDoc();
    return dungeon ? dungeon.find(selectedKey) : doc.find(selectedKey);
  };
  const select = (key: string | null): void => {
    selectedKey = key;
    edView.select(selected());
    // Actualizar gizmo 3D
    const sel = selected();
    if (sel && workspaceTool !== 'select' && workspaceTool !== 'add' && workspaceTool !== 'paint') {
      transformGizmo.attach(sel);
    } else {
      transformGizmo.detach();
    }
    refreshWorkspace(true);
  };

  let liveGrid: NavGrid | null = null;
  let gridVersion = -1;
  let gridBuiltAt = 0;
  /** Rejilla tal como quedaría al guardar (se rehace como mucho 10 veces por segundo). */
  const currentGrid = (): NavGrid | null => {
    if (!edView.showGrid && tool !== 'paint') return null;
    const dungeon = activeDungeon();
    const dungeonMap = activeDungeonDoc();
    if (dungeon && dungeonMap) return dungeonMap.previewGrid(dungeon.grid);
    const now = performance.now();
    if (doc.version !== gridVersion && (now - gridBuiltAt > 100 || !liveGrid)) {
      gridVersion = doc.version;
      gridBuiltAt = now;
      liveGrid = buildZoneGrid({ width: zone.width, depth: zone.depth, cellSize: zone.cellSize, navRadius: zone.navRadius, obstacles: doc.obstacles() as RectObstacle[], navPaint: parseNavPaintSafe() }, doc.water());
    }
    return liveGrid;
  };
  const parseNavPaintSafe = (): ReturnType<typeof parseNavPaint> | undefined => {
    try {
      return parseNavPaint(doc.copyOf('navpaint'));
    } catch {
      return undefined;
    }
  };

  const exclusions = (): Array<{ x: number; y: number }> => ((doc.data.vegetation as { exclusions?: Array<{ x: number; y: number }> }).exclusions ?? []);


  // ---- EditorWorkspace (nuevo) ------------------------------------------------

  const sceneLabel = () => {
    const d = activeDungeon();
    return d ? `Mazmorra · ${d.dungeonId} · Piso ${d.floor.index + 1}` : 'Mundo exterior';
  };

  const workspace = new EditorWorkspace(document.body, {
    close: () => setActive(false),
    tool: (t) => {
      workspaceTool = t;
      // Mapear workspace tools a tools del editor existente
      if (t === 'select') setTool('select');
      else if (t === 'move') setTool('select');
      else if (t === 'rotate') setTool('select');
      else if (t === 'scale') setTool('select');
      else if (t === 'add') setTool('add');
      else if (t === 'paint') setTool('paint');
      // Actualizar gizmo 3D según la herramienta
      if (t === 'move') {
        transformGizmo.setEnabled(true);
        transformGizmo.setMode('move');
      } else if (t === 'rotate') {
        transformGizmo.setEnabled(true);
        transformGizmo.setMode('rotate');
      } else if (t === 'scale') {
        transformGizmo.setEnabled(true);
        transformGizmo.setMode('scale');
      } else {
        transformGizmo.setEnabled(false);
      }
      // Re-adjuntar gizmo si hay selección y la herramienta lo permite
      if (t !== 'select' && t !== 'add' && t !== 'paint') {
        const sel = selected();
        if (sel) transformGizmo.attach(sel);
      }
      refreshWorkspace(true);
    },
    layer: (cat, on) => {
      if (on) edView.layers.add(cat);
      else edView.layers.delete(cat);
      edView.update(() => doc.objects(), exclusions, doc.version, cam.focus, true);
      persist();
      refreshWorkspace(true);
    },
    showGrid: (on) => {
      edView.showGrid = on;
      persist();
      refreshWorkspace(true);
    },
    field: (name, value) => {
      if (!selectedKey) return;
      const key = selectedKey;
      const dd = activeDungeonDoc();
      if (dd) {
        dd.setField(key, name, value);
      } else {
        doc.edit(`Cambiar ${name}`, () => doc.setField(key, name, value));
      }
      select(selected()?.key ?? null);
    },
    rotate: (steps) => {
      if (!selectedKey) return;
      const key = selectedKey;
      const dd = activeDungeonDoc();
      if (dd) {
        dd.rotate(key, steps);
      } else {
        select(doc.edit('Girar', () => doc.rotate(key, steps)));
      }
      select(selected()?.key ?? null);
    },
    scale: (f) => {
      if (!selectedKey) return;
      const key = selectedKey;
      const dd = activeDungeonDoc();
      if (dd) {
        dd.scale(key, f);
      } else {
        select(doc.edit(f > 1 ? 'Agrandar' : 'Achicar', () => doc.scale(key, f)));
      }
      select(selected()?.key ?? null);
    },
    remove: () => {
      const sel = selected();
      if (!sel) return;
      const dd = activeDungeonDoc();
      if (dd) {
        dd.removeObject(sel.key);
      } else if (doc.canRemove(sel.key)) {
        doc.edit(`Borrar ${sel.label}`, () => doc.remove(sel.key));
      } else {
        say('Esto no se borra desde el editor');
        refreshWorkspace();
        return;
      }
      say('');
      select(null);
    },
    focus: () => focusSelected(),
    palette: (id) => {
      paletteId = id;
      refreshWorkspace(true);
    },
    brushMode: (m) => {
      brushMode = m;
      refreshWorkspace(true);
    },
    brushRadius: (r) => {
      brushRadius = r;
      refreshWorkspace();
    },
    pickFromList: (key) => {
      select(key);
      focusSelected();
    },
    filter: (text) => {
      filter = text;
      refreshWorkspace(true);
    },
    hierarchyFilter: (text) => {
      hierarchyFilter = text;
      refreshWorkspace(true);
    },
    assetFilter: (text) => {
      assetFilter = text;
      refreshWorkspace(true);
    },
    assetCategory: (cat) => {
      assetCategory = cat;
      refreshWorkspace(true);
    },
    undo: () => undo(),
    redo: () => redo(),
    save: () => void save(),
    exportJson: () => exportJson(),
    play: () => {
      say('Play Mode no disponible aún; usa Guardar para aplicar cambios');
      refreshWorkspace(true);
    },
    stopPlay: () => {
      say('Play Mode no disponible aún');
      refreshWorkspace(true);
    },
    addObject: (kind, x, y) => {
      const dd = activeDungeonDoc();
      if (dd) {
        dd.addObject(kind, x, y);
      } else {
        say('Añadir objetos al mundo exterior se hace con la paleta');
      }
      refreshWorkspace(true);
    },
    duplicate: () => {
      const sel = selected();
      if (!sel) return;
      const dd = activeDungeonDoc();
      if (dd && sel.key.startsWith('d-manual:')) {
        // Duplicar objeto manual
        const parts = sel.key.split(':');
        const id = parts.slice(1).join(':');
        const obj = (dd.data.manualObjects ?? []).find((m) => m.id === id);
        if (obj) {
          dd.addObject(obj.kind, obj.position.x + 1, obj.position.y + 1, {
            name: obj.name ? `${obj.name} (copia)` : undefined,
            rotation: obj.rotation,
            scale: obj.scale,
            collision: obj.collision,
            properties: obj.properties,
          });
        }
      }
      refreshWorkspace(true);
    },
    rename: (name) => {
      const sel = selected();
      if (!sel) return;
      const dd = activeDungeonDoc();
      if (dd && sel.key.startsWith('d-manual:')) {
        const parts = sel.key.split(':');
        const id = parts.slice(1).join(':');
        const obj = (dd.data.manualObjects ?? []).find((m) => m.id === id);
        if (obj) {
          obj.name = name;
          dd.version++;
        }
      }
      refreshWorkspace(true);
    },
    toggleVisibility: (key) => {
      const dd = activeDungeonDoc();
      if (dd) {
        const existing = dd.data.overrides?.[key.replace('d-', '')];
        const newVisible = existing?.visible !== false;
        dd.setOverride(key.replace('d-', ''), { visible: newVisible === true ? false : undefined });
      }
      refreshWorkspace(true);
    },
  });
  workspace.setVisible(false);

  // Set viewportEl now that workspace exists
  viewportEl = workspace.el.querySelector<HTMLElement>('[data-role="viewport"]');

  /** Construye el estado del workspace y lo renderiza. */
  let wsListCache: EditorObject[] = [];
  let wsListAt = { x: Infinity, y: Infinity, v: -1, scope: '' };
  function workspaceObjects(): EditorObject[] {
    const dungeon = activeDungeonDoc();
    const scope = dungeon?.scopeId ?? 'overworld';
    const version = dungeon?.version ?? doc.version;
    const moved = Math.hypot(cam.focus.x - wsListAt.x, cam.focus.y - wsListAt.y) > 6;
    if (moved || wsListAt.v !== version || wsListAt.scope !== scope) {
      wsListAt = { x: cam.focus.x, y: cam.focus.y, v: version, scope };
      wsListCache = activeObjects()
        .filter((o) => edView.layers.has(o.category))
        .map((o) => ({ o, d: Math.hypot(o.x - cam.focus.x, o.y - cam.focus.y) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 200)
        .map((e) => e.o);
    }
    return wsListCache;
  }

  function refreshWorkspace(_structural = false): void {
    if (!active) return;
    const sel = selected();
    const dungeon = activeDungeonDoc();
    const state: WorkspaceState = {
      tool: workspaceTool,
      layers: edView.layers,
      showGrid: edView.showGrid,
      selected: sel,
      fields: dungeon ? [] : sel ? doc.fields(sel.key) : [],
      objects: workspaceObjects(),
      palette: dungeon ? [] : doc.palette(),
      paletteId,
      brushMode,
      brushRadius,
      filter,
      hierarchyFilter,
      assetFilter,
      assetCategory,
      undoLabel: dungeon ? dungeon.undoLabel() : doc.history.undoLabel,
      redoLabel: dungeon ? dungeon.redoLabel() : doc.history.redoLabel,
      dirty: dungeon ? (dungeon.dirty ? [dungeonFloorPath(dungeon.data.dungeon, dungeon.floor.index).replace(/^data\//, '')] : []) : doc.dirtyFiles().map((f) => EDITOR_FILES[f].replace(/^data\//, '')),
      canSave: import.meta.env.DEV,
      canRemove: dungeon ? true : sel ? doc.canRemove(sel.key) : false,
      status: performance.now() - statusAt < 8000 ? status : '',
      sceneLabel: sceneLabel(),
      isDungeon: !!dungeon,
      isPlaying: false,
    };
    workspace.render(state);
  }

  let listCache: EditorObject[] = [];
  let listAt = { x: Infinity, y: Infinity, v: -1, f: '', scope: '' };
  function nearbyList(): EditorObject[] {
    const dungeon = activeDungeonDoc();
    const scope = dungeon?.scopeId ?? 'overworld';
    const version = dungeon?.version ?? doc.version;
    const moved = Math.hypot(cam.focus.x - listAt.x, cam.focus.y - listAt.y) > 6;
    if (moved || listAt.v !== version || listAt.f !== filter || listAt.scope !== scope) {
      listAt = { x: cam.focus.x, y: cam.focus.y, v: version, f: filter, scope };
      const f = filter.trim().toLowerCase();
      listCache = activeObjects()
        .filter((o) => edView.layers.has(o.category) && (!f || o.label.toLowerCase().includes(f) || o.kind.includes(f)))
        .map((o) => ({ o, d: o.category === 'zones' ? Math.hypot(o.x - cam.focus.x, o.y - cam.focus.y) * 4 : Math.hypot(o.x - cam.focus.x, o.y - cam.focus.y) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 120)
        .map((e) => e.o);
    }
    return listCache;
  }

  // ---- Acciones ------------------------------------------------------------------

  function setTool(t: Tool): void {
    tool = t;
    edView.brush(null, 0);
    persist();
    refreshWorkspace(true);
  }

  function rotate(steps: number): void {
    if (!selectedKey) return;
    const key = selectedKey;
    const dd = activeDungeonDoc();
    if (dd) {
      dd.rotate(key, steps);
      select(selected()?.key ?? null);
    } else {
      select(doc.edit('Girar', () => doc.rotate(key, steps)));
    }
  }
  function scale(f: number): void {
    if (!selectedKey) return;
    const key = selectedKey;
    const dd = activeDungeonDoc();
    if (dd) {
      dd.scale(key, f);
      select(selected()?.key ?? null);
    } else {
      select(doc.edit(f > 1 ? 'Agrandar' : 'Achicar', () => doc.scale(key, f)));
    }
  }
  function remove(): void {
    const sel = selected();
    if (!sel) return;
    const dd = activeDungeonDoc();
    if (dd) {
      dd.removeObject(sel.key);
    } else if (!doc.canRemove(sel.key)) {
      say('Esto no se borra desde el editor (lleva contenido en otros archivos)');
      refreshWorkspace();
      return;
    } else {
      doc.edit(`Borrar ${sel.label}`, () => doc.remove(sel.key));
    }
    say('');
    select(null);
  }
  function focusSelected(): void {
    const o = selected();
    if (!o) return;
    cam.focus = { x: o.x, y: o.y };
    const size = o.shape.type === 'box' ? Math.max(o.shape.w, o.shape.d) : o.shape.type === 'rect' ? Math.max(o.shape.w, o.shape.d) : o.shape.type === 'circle' ? o.shape.r * 2 : 2;
    cam.distance = Math.min(220, Math.max(10, size * 1.6));
  }
  function afterHistory(label: string | null, verb: string, nothing: string): void {
    say(label ? `${verb}: ${label}` : nothing);
    const dd = activeDungeonDoc();
    const finder = dd ? () => dd.find(selectedKey!) : () => doc.find(selectedKey!);
    if (selectedKey && !finder()) selectedKey = null;
    edView.select(selected());
    refreshWorkspace(true);
  }
  const undo = (): void => {
    const dungeon = activeDungeonDoc();
    if (dungeon) {
      afterHistory(dungeon.undo(), 'Deshecho', 'Nada que deshacer');
    } else {
      afterHistory(doc.undo(), 'Deshecho', 'Nada que deshacer');
    }
  };
  const redo = (): void => {
    const dungeon = activeDungeonDoc();
    if (dungeon) {
      afterHistory(dungeon.redo(), 'Rehecho', 'Nada que rehacer');
    } else {
      afterHistory(doc.redo(), 'Rehecho', 'Nada que rehacer');
    }
  };

  /** Comprueba con los parsers del juego que lo que se va a escribir se puede leer. */
  function validate(): string | null {
    try {
      const terrain = parseTerrain(doc.copyOf('terrain'));
      parseVegetation(doc.copyOf('vegetation'));
      parseNavPaint(doc.copyOf('navpaint'));
      parseZones(doc.copyOf('zones'), data.enemies.archetypes);
      const spots = Object.values((doc.copyOf('fishing') as { spots?: Record<string, { x: number; y: number; radius: number }> }).spots ?? {});
      for (const s of spots) {
        if (!terrain.ponds.some((p) => p.x === s.x && p.y === s.y && p.radius === s.radius)) return 'Un sitio de pesca ya no coincide con ningún estanque';
      }
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  }

  async function save(): Promise<void> {
    if (saving) { say('Ya se está guardando…'); refreshWorkspace(); return; }
    const dungeon = activeDungeon();
    const dungeonMap = activeDungeonDoc();
    if (dungeon && dungeonMap) {
      if (!import.meta.env.DEV || !dungeonMap.dirty) return;
      const filePath = dungeonFloorPath(dungeon.dungeonId, dungeon.floor.index);
      const text = dungeonMap.serialize();
      say('Guardando piso…');
      refreshWorkspace();
      saving = true;
      try {
        const res = await fetch(EDITOR_SAVE_ROUTE, { method: 'POST', headers: { 'Content-Type': 'application/json', [EDITOR_SAVE_HEADER]: '1' }, body: JSON.stringify({ files: { [filePath]: text } }) });
        const body = (await res.json()) as { ok: boolean; error?: string };
        if (!res.ok || !body.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
        // El archivo se escribió en disco. Ahora aplicar al mundo.
        try {
          dungeon.apply(dungeonMap.data);
          dungeon.floor.map = JSON.parse(text) as DungeonFloorMapDef;
          dungeonDoc = new DungeonEditorDoc(dungeon.floor);
          say(`Guardado: ${filePath}. Objetos y navegación aplicados al piso ${dungeon.floor.index + 1}`);
        } catch (e) {
          say(`Error al aplicar: ${(e as Error).message}. El piso se escribió en disco pero no se aplicó al mundo; reabre el editor para recuperarlo.`);
        }
      } catch (e) {
        say(`Error al escribir: ${(e as Error).message}. El piso no se guardó en disco.`);
      }
      saving = false;
      refreshWorkspace(true);
      return;
    }
    const dirty = doc.dirtyFiles();
    if (!import.meta.env.DEV || dirty.length === 0) return;
    const err = validate();
    if (err) {
      say(`No se guarda: ${err}`);
      refreshWorkspace();
      return;
    }
    const files: Record<string, string> = {};
    const texts: Partial<Record<FileId, string>> = {};
    for (const f of dirty) files[EDITOR_FILES[f]] = texts[f] = doc.serialize(f);
    say('Guardando…');
    refreshWorkspace();
    persist();
    saving = true;
    try {
      const res = await fetch(EDITOR_SAVE_ROUTE, { method: 'POST', headers: { 'Content-Type': 'application/json', [EDITOR_SAVE_HEADER]: '1' }, body: JSON.stringify({ files }) });
      const body = (await res.json()) as { ok: boolean; error?: string; written?: string[] };
      if (!res.ok || !body.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      // Los archivos se escribieron en disco. Ahora aplicar al mundo.
      try {
        const before = { ...doc.applied };
        const summary = (await host.apply?.(dirty, before, { ...texts })) ?? 'recarga para ver los cambios';
        // Solo actualizar doc.applied y marcar guardado si la aplicación en caliente no falló.
        for (const [f, text] of Object.entries(texts)) doc.applied[f as FileId] = text;
        doc.markSaved(texts);
        say(`Guardado: ${(body.written ?? []).join(', ')}. ${summary}`);
      } catch (e) {
        say(`Error al aplicar: ${(e as Error).message}. Los archivos se escribieron en disco pero no se aplicaron al mundo; reabre el editor para recuperarlo.`);
      }
    } catch (e) {
      say(`Error al escribir: ${(e as Error).message}. Los archivos no se guardaron en disco.`);
    }
    saving = false;
    refreshWorkspace();
  }

  function exportJson(): void {
    const dungeon = activeDungeonDoc();
    if (dungeon) {
      if (!dungeon.dirty) { say('Nada que exportar'); refreshWorkspace(); return; }
      const url = URL.createObjectURL(new Blob([dungeon.serialize()], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = dungeonFloorPath(dungeon.data.dungeon, dungeon.floor.index).split('/').pop()!;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      say(`Exportado el piso ${dungeon.floor.index + 1}`);
      refreshWorkspace();
      return;
    }
    const dirty = doc.dirtyFiles();
    const err = validate();
    if (err) {
      say(`Aviso: ${err}`);
    }
    for (const f of dirty) {
      const url = URL.createObjectURL(new Blob([doc.serialize(f)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = EDITOR_FILES[f].split('/').pop()!;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    if (!err) say(dirty.length ? `Exportados: ${dirty.map((f) => EDITOR_FILES[f]).join(', ')} (cópialos en esas rutas)` : 'Nada que exportar');
    refreshWorkspace();
  }

  let hiddenMeshes: AbstractMesh[] = [];
  function applyOriginals(): void {
    for (const m of hiddenMeshes) m.setEnabled(true);
    hiddenMeshes = [];
    if (!active || !hideOriginals) return;
    for (const name of PROP_MESHES) {
      const m = scene.getMeshByName(name);
      if (m && m.isEnabled()) {
        m.setEnabled(false);
        hiddenMeshes.push(m);
      }
    }
  }

  function hasUnsavedChanges(): boolean {
    const dungeon = activeDungeonDoc();
    if (dungeon && dungeon.dirty) return true;
    if (!dungeon && doc.dirtyFiles().length > 0) return true;
    return false;
  }

  async function setActive(on: boolean): Promise<void> {
    if (on === active) return;
    if (!on && hasUnsavedChanges()) {
      const choice = confirm('Hay cambios sin guardar.\n\nPulse Aceptar para Guardar y aplicar.\nPulse Cancelar para seguir editando.');
      if (!choice) return; // Cancelar — seguir editando
      // Aceptar — guardar y aplicar antes de cerrar
      await save();
      if (hasUnsavedChanges()) {
        // Si aún hay cambios sin guardar después de intentar, NO cerrar
        say('Algunos cambios no se pudieron guardar. El editor permanece abierto.');
        return;
      }
    }
    active = on;
    if (!on) {
      if (dragKey || painting) doc.commit();
      dragKey = null;
      painting = false;
      transformGizmo.setEnabled(false);
      transformGizmo.detach();
      teardownResizeObserver();
      restoreCanvas();
    }
    document.body.classList.toggle('editor-on', on);
    workspace.setVisible(on);
    labels.style.display = on ? '' : 'none';
    edView.setEnabled(on);
    applyOriginals();
    if (on) {
      moveCanvasIntoViewport();
      setupResizeObserver();
      if (!camRestored) {
        const p = view.player.model.root.position;
        cam.focus = { x: p.x, y: p.z };
        cam.yawDeg = view.rig.yawDeg;
        cam.pitchDeg = Math.max(35, view.rig.pitchDeg);
        cam.distance = 30;
      }
      camRestored = true;
      const dungeon = activeDungeonDoc();
      edView.update(activeObjects, dungeon ? () => [] : exclusions, dungeon?.version ?? doc.version, cam.focus, true);
      edView.select(selected());
      refreshWorkspace(true);
    }
    persist();
  }

  // ---- Ratón -----------------------------------------------------------------------

  let orbiting = false;
  let panning = false;
  let dragKey: string | null = null;
  let dragOffset = { x: 0, y: 0 };
  let painting = false;
  let lastPaint: { x: number; y: number } | null = null;
  let mouse = { x: 0, y: 0 };

  const ground = (): { x: number; y: number } | null => view.pickGround(mouse.x, mouse.y);
  const paintMode = (e: PointerEvent | MouseEvent): BrushMode => (e.shiftKey ? 'clear' : e.altKey ? 'erase' : brushMode);

  function paintTo(p: { x: number; y: number }, mode: BrushMode): void {
    // Trazo continuo aunque el ratón vaya rápido: pinceladas cada medio radio.
    const from = lastPaint ?? p;
    const cellSize = activeDungeon()?.grid.cellSize ?? zone.cellSize;
    const step = Math.max(cellSize * 0.5, brushRadius * 0.5);
    const n = Math.max(1, Math.ceil(Math.hypot(p.x - from.x, p.y - from.y) / step));
    const dungeon = activeDungeonDoc();
    for (let i = 1; i <= n; i++) {
      const x = from.x + ((p.x - from.x) * i) / n;
      const y = from.y + ((p.y - from.y) * i) / n;
      if (dungeon) dungeon.paintAt(x, y, brushRadius, mode);
      else doc.paintAt(x, y, brushRadius, mode);
    }
    lastPaint = p;
  }

  const onCanvas = (e: Event): boolean => {
    const target = e.target as HTMLElement;
    // Canvas is now inside the viewport; accept events on the canvas itself
    // or on the viewport container (which forwards to the canvas).
    return target === canvas || (viewportEl !== null && viewportEl.contains(target));
  };

  /** Get mouse coordinates relative to the canvas, regardless of which element fired the event. */
  function getCanvasCoords(e: PointerEvent | MouseEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  window.addEventListener('pointerdown', (e) => {
    if (!active || !onCanvas(e)) return;
    e.stopPropagation();
    e.preventDefault();
    const coords = getCanvasCoords(e);
    mouse = coords;
    canvas.setPointerCapture(e.pointerId);
    if (e.button === 2) orbiting = true;
    if (e.button === 1) panning = true;
    if (e.button !== 0) return;
    const g = ground();
    if (tool === 'select') {
      const hit = edView.pick(view.rig.camera, mouse.x, mouse.y, g, cam.focus);
      select(hit?.key ?? null);
      if (hit && g) {
        const dd = activeDungeonDoc();
        if (dd) {
          dd.begin(`Mover ${hit.label}`);
          dragKey = hit.key;
          dragOffset = { x: hit.x - g.x, y: hit.y - g.y };
        } else {
          doc.begin(`Mover ${hit.label}`);
          doc.dragging = true;
          dragKey = hit.key;
          dragOffset = { x: hit.x - g.x, y: hit.y - g.y };
        }
      }
    } else if (tool === 'add' && g) {
      const dd = activeDungeonDoc();
      if (dd && paletteId && typeof paletteId === 'string' && !paletteId.includes(':')) {
        // Dungeon mode: añadir objeto manual desde el asset browser
        dd.addObject(paletteId as ManualObjectKind, g.x, g.y);
        refreshWorkspace(true);
      } else if (!dd && paletteId) {
        // Overworld mode: añadir desde la paleta existente
        const id = paletteId;
        const key = doc.edit('Añadir', () => doc.add(id, g.x, g.y, zoneIndex));
        if (key) select(key);
        else say('Elige qué añadir en la paleta');
      } else if (dd) {
        say('Elige un asset en el panel inferior');
      }
    } else if (tool === 'paint' && g) {
      const dungeon = activeDungeonDoc();
      if (dungeon) dungeon.begin('Pintar navegación');
      else doc.begin('Pintar navegación');
      painting = true;
      lastPaint = null;
      paintTo(g, paintMode(e));
    }
  }, true);

  window.addEventListener('pointermove', (e) => {
    if (!active || (!onCanvas(e) && !orbiting && !panning && !dragKey && !painting)) return;
    e.stopPropagation();
    const coords = getCanvasCoords(e);
    mouse = coords;
    if (orbiting) cam.orbit(e.movementX, e.movementY);
    if (panning) cam.pan(e.movementX, e.movementY);
    const g = ground();
    if (dragKey && g) {
      const dd = activeDungeonDoc();
      const before = dragKey;
      if (dd) {
        dragKey = dd.moveTo(dragKey, g.x + dragOffset.x, g.y + dragOffset.y);
      } else {
        dragKey = doc.moveTo(dragKey, g.x + dragOffset.x, g.y + dragOffset.y);
      }
      selectedKey = dragKey;
      const o = dd ? dd.find(dragKey) : doc.find(dragKey);
      if (o) {
        edView.moveInstance(before, o);
        edView.select(o);
        // Actualizar gizmo si está activo
        if (transformGizmo.attachedKey === dragKey) {
          transformGizmo.updateFromObject(o);
        }
      }
    }
    if (tool === 'paint') {
      edView.brush(g, brushRadius);
      if (painting && g) paintTo(g, paintMode(e));
    }
  }, true);

  window.addEventListener('pointerup', (e) => {
    if (!active) return;
    if (onCanvas(e) || orbiting || panning || dragKey || painting) e.stopPropagation();
    if (e.button === 2) orbiting = false;
    if (e.button === 1) panning = false;
    if (e.button === 0) {
      if (dragKey) {
        const dd = activeDungeonDoc();
        if (dd) dd.commit();
        else doc.commit();
        dragKey = null;
        const dungeon = activeDungeonDoc();
        edView.update(activeObjects, dungeon ? () => [] : exclusions, dungeon?.version ?? doc.version, cam.focus, true);
        edView.select(selected());
        refreshWorkspace(true);
        refreshWorkspace(true);
      }
      if (painting) {
        const dungeon = activeDungeonDoc();
        if (dungeon) dungeon.commit();
        else doc.commit();
        painting = false;
        lastPaint = null;
        refreshWorkspace();
      }
    }
  }, true);

  window.addEventListener('wheel', (e) => {
    if (!active || !onCanvas(e)) return;
    e.stopPropagation();
    e.preventDefault();
    // Rueda de ratón (±100 por muesca) o trackpad (pasos pequeños y seguidos).
    cam.zoom(Math.max(-4, Math.min(4, e.deltaY / 100)));
  }, { capture: true, passive: false });

  // ---- Teclado -----------------------------------------------------------------------

  const held = new Set<string>();
  const typing = (e: KeyboardEvent): boolean => {
    const t = e.target as HTMLElement | null;
    return !!t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA');
  };
  window.addEventListener('keydown', (e) => {
    const isToggle = host.keys().includes(e.code);
    if (!active) {
      if (isToggle && !typing(e) && !e.repeat) {
        e.stopPropagation();
        e.preventDefault();
        setActive(true);
      }
      return;
    }
    if (typing(e)) return;
    e.stopPropagation();
    const ctrl = e.ctrlKey || e.metaKey;
    let handled = true;
    if (isToggle) {
      if (!e.repeat) setActive(false);
    } else if (ctrl && e.code === 'KeyZ') {
      if (e.shiftKey) redo();
      else undo();
    } else if (ctrl && e.code === 'KeyY') redo();
    else if (ctrl && e.code === 'KeyS') void save();
    else if (e.code === 'Delete' || e.code === 'Backspace') remove();
    else if (e.code === 'KeyR' && !ctrl) rotate(e.shiftKey ? -1 : 1);
    else if (e.code === 'BracketRight') scale(1.1);
    else if (e.code === 'BracketLeft') scale(1 / 1.1);
    else if (e.code === 'KeyF' && !ctrl) focusSelected();
    else if (e.code === 'Escape') {
      if (tool !== 'select') setTool('select');
      else select(null);
    } else if (e.code === 'Digit1') setTool('select');
    else if (e.code === 'Digit2') setTool('add');
    else if (e.code === 'Digit3') setTool('paint');
    else if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(e.code)) held.add(e.code);
    else handled = false;
    if (handled) e.preventDefault();
  }, true);
  window.addEventListener('keyup', (e) => held.delete(e.code), true);
  window.addEventListener('blur', () => held.clear());

  // ---- Fotograma ----------------------------------------------------------------------

  let panelTimer = 0;
  scene.onBeforeRenderObservable.add(() => {
    if (!active) return;
    const dt = Math.min(0.1, view.engine.getDeltaTime() / 1000);
    const fwd = (held.has('KeyW') || held.has('ArrowUp') ? 1 : 0) - (held.has('KeyS') || held.has('ArrowDown') ? 1 : 0);
    const right = (held.has('KeyD') || held.has('ArrowRight') ? 1 : 0) - (held.has('KeyA') || held.has('ArrowLeft') ? 1 : 0);
    if (fwd || right) cam.move(fwd, right, dt * (held.has('ShiftLeft') || held.has('ShiftRight') ? 3 : 1));
    // Encima de la cámara del juego (que `view.sync` ya colocó siguiendo al jugador).
    const dungeon = activeDungeonDoc();
    const bounds = dungeon ? { width: dungeon.floor.width, depth: dungeon.floor.depth } : zone;
    cam.apply(view.rig.camera, view.heights, bounds);
    if (!dragKey) edView.update(activeObjects, dungeon ? () => [] : exclusions, dungeon?.version ?? doc.version, cam.focus);
    const g = tool === 'paint' ? ground() : null;
    edView.syncGrid(currentGrid(), g ?? cam.focus, tool === 'paint');
    panelTimer -= dt;
    if (panelTimer <= 0) {
      panelTimer = 0.25;
      refreshWorkspace();
      refreshWorkspace();
      persist();
    }
  });

  // Etiquetas: nombres de zona en cada área y el objeto elegido.
  const pool: HTMLDivElement[] = [];
  scene.onAfterRenderObservable.add(() => {
    if (!active) return;
    const engine = view.engine;
    const camera = view.rig.camera;
    const w = engine.getRenderWidth();
    const h = engine.getRenderHeight();
    const vp = camera.viewport.toGlobal(w, h);
    const tm = scene.getTransformMatrix();
    const sx = canvas.clientWidth / w;
    const sy = canvas.clientHeight / h;
    const items: Array<{ text: string; x: number; y: number; cls: string }> = [];
    const zonesById = new Map(doc.zoneList().map((z) => [z.id, z]));
    if (!activeDungeonDoc() && edView.layers.has('zones')) {
      for (const o of edView.visibleObjects(cam.focus)) {
        if (o.category !== 'zones') continue;
        const z = zonesById.get(o.zoneId ?? '');
        items.push({ text: z?.name ?? o.label, x: o.x, y: o.y, cls: z?.safe ? 'safe' : '' });
      }
    }
    const sel = selected();
    if (sel) items.push({ text: sel.label, x: sel.x, y: sel.y, cls: 'sel' });
    let used = 0;
    for (const it of items) {
      const lift = it.cls === 'sel' && sel && 'h' in sel.shape ? sel.shape.h + 0.6 : 2;
      const p = Vector3.Project(new Vector3(it.x, view.heights.sample(it.x, it.y) + lift, it.y), Matrix.IdentityReadOnly, tm, vp);
      if (p.z < 0 || p.z > 1 || p.x < 0 || p.y < 0 || p.x > w || p.y > h) continue;
      const div = pool[used] ?? labels.appendChild(document.createElement('div'));
      pool[used] = div;
      used++;
      div.className = `ed-label ${it.cls}`;
      div.textContent = it.text;
      div.style.left = `${p.x * sx}px`;
      div.style.top = `${p.y * sy}px`;
      div.style.display = '';
    }
    for (let i = used; i < pool.length; i++) pool[i]!.style.display = 'none';
  });

  labels.style.display = 'none';
  if (stored?.active) setActive(true);

  return {
    get active() {
      return active;
    },
    setActive,
    serialize: (f) => doc.serialize(f),
    applied: (f) => doc.applied[f],
    scope: () => activeDungeonDoc()?.scopeId ?? 'overworld',
    objects: () => activeObjects().map(({ key, kind, label }) => ({ key, kind, label })),
  };
}
