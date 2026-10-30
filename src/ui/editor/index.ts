// Modo edición (herramienta de desarrollo, F12 por defecto): con el juego
// abierto se pausa la simulación, la cámara pasa a ser libre y se pueden mover,
// girar, escalar, borrar y añadir casas, árboles, rocas, PNJ, estanques y áreas
// de zona, pintar celdas de navegación y guardar. En `npm run dev` guardar
// escribe los JSON de `data/` con su formato (scripts/editorSave.ts) y Vite
// recarga el juego; fuera de desarrollo se exportan para descargarlos.
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
import type { GameData } from '../../data';
import { parseNavPaint, parseTerrain, parseVegetation } from '../../data/worldSchema';
import { parseZones } from '../../data/zonesSchema';
import { EditorDoc, EDITOR_FILES, type EditorObject, type FileId, type ScatterFn, type ScatterItem } from '../../editor/doc';
import { EDITOR_SAVE_HEADER, EDITOR_SAVE_ROUTE } from '../../editor/files';
import type { BrushMode } from '../../editor/navBrush';
import type { ArenaView } from '../../render/arenaView';
import { buildZoneGrid, type NavGrid, type RectObstacle } from '../../sim/navGrid';
import type { Overworld } from '../../world/overworld';
import { scatterVegetation } from '../../world/scatter';
import { EditorView, FreeCamera } from './editorView';
import { EditorPanel, type PanelState, type Tool } from './panel';

export interface EditorHost {
  view: ArenaView;
  overworld: Overworld;
  data: GameData;
  /** Teclas de la acción `editor` (data/ui/keybindings.json; el jugador puede cambiarlas). */
  keys(): readonly string[];
}

export interface EditorHandle {
  /** Activo: `main.ts` pausa la simulación. */
  readonly active: boolean;
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
  const originals: Record<FileId, string> = { terrain: terrainTxt, vegetation: vegetationTxt, npcs: npcsTxt, merchants: merchantsTxt, zones: zonesTxt, fishing: fishingTxt, navpaint: navpaintTxt };
  const doc = new EditorDoc(originals, scatterFn, { cols, rows, cellSize: zone.cellSize });
  const edView = new EditorView(scene, view.heights);
  const cam = new FreeCamera();
  const labels = document.createElement('div');
  labels.className = 'ed-labels';
  document.body.append(labels);

  let active = false;
  let tool: Tool = 'select';
  let selectedKey: string | null = null;
  let paletteId: string | null = 'prop:house';
  let zoneIndex = 0;
  let brushMode: BrushMode = 'block';
  let brushRadius = 0.5;
  let filter = '';
  let hideOriginals = true;
  let camRestored = false;

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

  const selected = (): EditorObject | null => (selectedKey ? doc.find(selectedKey) : null);
  const select = (key: string | null): void => {
    selectedKey = key;
    edView.select(selected());
    refreshPanel(true);
  };

  let liveGrid: NavGrid | null = null;
  let gridVersion = -1;
  let gridBuiltAt = 0;
  /** Rejilla tal como quedaría al guardar (se rehace como mucho 10 veces por segundo). */
  const currentGrid = (): NavGrid | null => {
    if (!edView.showGrid && tool !== 'paint') return null;
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

  // ---- Panel -------------------------------------------------------------------

  const panel = new EditorPanel(document.body, {
    close: () => setActive(false),
    tool: (t) => setTool(t),
    layer: (cat, on) => {
      if (on) edView.layers.add(cat);
      else edView.layers.delete(cat);
      edView.update(() => doc.objects(), exclusions, doc.version, cam.focus, true);
      persist();
      refreshPanel(true);
    },
    showGrid: (on) => {
      edView.showGrid = on;
      persist();
      refreshPanel(true);
    },
    hideOriginals: (on) => {
      hideOriginals = on;
      applyOriginals();
      persist();
      refreshPanel(true);
    },
    field: (name, value) => {
      if (!selectedKey) return;
      const key = selectedKey;
      select(doc.edit(`Cambiar ${name}`, () => doc.setField(key, name, value)));
    },
    rotate: (steps) => rotate(steps),
    scale: (f) => scale(f),
    remove: () => remove(),
    focus: () => focusSelected(),
    palette: (id) => {
      paletteId = id;
      refreshPanel(true);
    },
    zone: (i) => {
      zoneIndex = i;
      refreshPanel(true);
    },
    brushMode: (m) => {
      brushMode = m;
      refreshPanel(true);
    },
    brushRadius: (r) => {
      brushRadius = r;
      refreshPanel();
    },
    pickFromList: (key) => {
      select(key);
      focusSelected();
    },
    filter: (text) => {
      filter = text;
      refreshPanel(true);
    },
    undo: () => undo(),
    redo: () => redo(),
    save: () => void save(),
    exportJson: () => exportJson(),
  });
  panel.setVisible(false);

  let listCache: EditorObject[] = [];
  let listAt = { x: Infinity, y: Infinity, v: -1, f: '' };
  function nearbyList(): EditorObject[] {
    const moved = Math.hypot(cam.focus.x - listAt.x, cam.focus.y - listAt.y) > 6;
    if (moved || listAt.v !== doc.version || listAt.f !== filter) {
      listAt = { x: cam.focus.x, y: cam.focus.y, v: doc.version, f: filter };
      const f = filter.trim().toLowerCase();
      listCache = doc
        .objects()
        .filter((o) => edView.layers.has(o.category) && (!f || o.label.toLowerCase().includes(f) || o.kind.includes(f)))
        .map((o) => ({ o, d: o.category === 'zones' ? Math.hypot(o.x - cam.focus.x, o.y - cam.focus.y) * 4 : Math.hypot(o.x - cam.focus.x, o.y - cam.focus.y) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 120)
        .map((e) => e.o);
    }
    return listCache;
  }

  function refreshPanel(_structural = false): void {
    if (!active) return;
    const sel = selected();
    const state: PanelState = {
      tool,
      layers: edView.layers,
      showGrid: edView.showGrid,
      hideOriginals,
      selected: sel,
      fields: sel ? doc.fields(sel.key) : [],
      canRemove: sel ? doc.canRemove(sel.key) : false,
      palette: doc.palette(),
      paletteId,
      zones: doc.zoneList().map((z) => ({ index: z.index, name: z.name })),
      zoneIndex,
      brushMode,
      brushRadius,
      list: nearbyList(),
      filter,
      undoLabel: doc.history.undoLabel,
      redoLabel: doc.history.redoLabel,
      dirty: doc.dirtyFiles().map((f) => EDITOR_FILES[f].replace(/^data\//, '')),
      canSave: import.meta.env.DEV,
      status: performance.now() - statusAt < 8000 ? status : '',
    };
    panel.render(state);
  }

  // ---- Acciones ------------------------------------------------------------------

  function setTool(t: Tool): void {
    tool = t;
    edView.brush(null, 0);
    persist();
    refreshPanel(true);
  }

  function rotate(steps: number): void {
    if (!selectedKey) return;
    const key = selectedKey;
    select(doc.edit('Girar', () => doc.rotate(key, steps)));
  }
  function scale(f: number): void {
    if (!selectedKey) return;
    const key = selectedKey;
    select(doc.edit(f > 1 ? 'Agrandar' : 'Achicar', () => doc.scale(key, f)));
  }
  function remove(): void {
    const sel = selected();
    if (!sel) return;
    if (!doc.canRemove(sel.key)) {
      say('Esto no se borra desde el editor (lleva contenido en otros archivos)');
      refreshPanel();
      return;
    }
    doc.edit(`Borrar ${sel.label}`, () => doc.remove(sel.key));
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
    if (selectedKey && !doc.find(selectedKey)) selectedKey = null;
    edView.select(selected());
    refreshPanel(true);
  }
  const undo = (): void => afterHistory(doc.undo(), 'Deshecho', 'Nada que deshacer');
  const redo = (): void => afterHistory(doc.redo(), 'Rehecho', 'Nada que rehacer');

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
    const dirty = doc.dirtyFiles();
    if (!import.meta.env.DEV || dirty.length === 0) return;
    const err = validate();
    if (err) {
      say(`No se guarda: ${err}`);
      refreshPanel();
      return;
    }
    const files: Record<string, string> = {};
    const texts: Partial<Record<FileId, string>> = {};
    for (const f of dirty) files[EDITOR_FILES[f]] = texts[f] = doc.serialize(f);
    say('Guardando…');
    refreshPanel();
    persist(); // Vite recarga la página al ver los archivos nuevos: el editor vuelve abierto.
    try {
      const res = await fetch(EDITOR_SAVE_ROUTE, { method: 'POST', headers: { 'Content-Type': 'application/json', [EDITOR_SAVE_HEADER]: '1' }, body: JSON.stringify({ files }) });
      const body = (await res.json()) as { ok: boolean; error?: string; written?: string[] };
      if (!res.ok || !body.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      doc.markSaved(texts);
      say(`Guardado: ${(body.written ?? []).join(', ')}. Recargando el juego…`);
    } catch (e) {
      say(`Error al guardar: ${(e as Error).message}`);
    }
    refreshPanel();
  }

  function exportJson(): void {
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
    refreshPanel();
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

  function setActive(on: boolean): void {
    if (on === active) return;
    active = on;
    if (!on) {
      if (dragKey || painting) doc.commit();
      dragKey = null;
      painting = false;
    }
    document.body.classList.toggle('editor-on', on);
    panel.setVisible(on);
    labels.style.display = on ? '' : 'none';
    edView.setEnabled(on);
    applyOriginals();
    if (on) {
      if (!camRestored) {
        const p = view.player.model.root.position;
        cam.focus = { x: p.x, y: p.z };
        cam.yawDeg = view.rig.yawDeg;
        cam.pitchDeg = Math.max(35, view.rig.pitchDeg);
        cam.distance = 30;
      }
      camRestored = true;
      edView.update(() => doc.objects(), exclusions, doc.version, cam.focus, true);
      edView.select(selected());
      refreshPanel(true);
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
    const step = Math.max(zone.cellSize * 0.5, brushRadius * 0.5);
    const n = Math.max(1, Math.ceil(Math.hypot(p.x - from.x, p.y - from.y) / step));
    for (let i = 1; i <= n; i++) doc.paintAt(from.x + ((p.x - from.x) * i) / n, from.y + ((p.y - from.y) * i) / n, brushRadius, mode);
    lastPaint = p;
  }

  const onCanvas = (e: Event): boolean => e.target === canvas;
  window.addEventListener('pointerdown', (e) => {
    if (!active || !onCanvas(e)) return;
    e.stopPropagation();
    e.preventDefault();
    mouse = { x: e.offsetX, y: e.offsetY };
    canvas.setPointerCapture(e.pointerId);
    if (e.button === 2) orbiting = true;
    if (e.button === 1) panning = true;
    if (e.button !== 0) return;
    const g = ground();
    if (tool === 'select') {
      const hit = edView.pick(view.rig.camera, mouse.x, mouse.y, g, cam.focus);
      select(hit?.key ?? null);
      if (hit && g) {
        doc.begin(`Mover ${hit.label}`);
        doc.dragging = true;
        dragKey = hit.key;
        dragOffset = { x: hit.x - g.x, y: hit.y - g.y };
      }
    } else if (tool === 'add' && g && paletteId) {
      const id = paletteId;
      const key = doc.edit('Añadir', () => doc.add(id, g.x, g.y, zoneIndex));
      if (key) select(key);
      else say('Elige qué añadir en la paleta');
    } else if (tool === 'paint' && g) {
      doc.begin('Pintar navegación');
      painting = true;
      lastPaint = null;
      paintTo(g, paintMode(e));
    }
  }, true);

  window.addEventListener('pointermove', (e) => {
    if (!active || (!onCanvas(e) && !orbiting && !panning && !dragKey && !painting)) return;
    e.stopPropagation();
    mouse = { x: e.offsetX, y: e.offsetY };
    if (orbiting) cam.orbit(e.movementX, e.movementY);
    if (panning) cam.pan(e.movementX, e.movementY);
    const g = ground();
    if (dragKey && g) {
      const before = dragKey;
      dragKey = doc.moveTo(dragKey, g.x + dragOffset.x, g.y + dragOffset.y);
      selectedKey = dragKey;
      const o = doc.find(dragKey);
      if (o) {
        edView.moveInstance(before, o);
        edView.select(o);
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
        doc.commit();
        dragKey = null;
        edView.update(() => doc.objects(), exclusions, doc.version, cam.focus, true);
        edView.select(selected());
        refreshPanel(true);
      }
      if (painting) {
        doc.commit();
        painting = false;
        lastPaint = null;
        refreshPanel();
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
    cam.apply(view.rig.camera, view.heights, zone);
    if (!dragKey) edView.update(() => doc.objects(), exclusions, doc.version, cam.focus);
    const g = tool === 'paint' ? ground() : null;
    edView.syncGrid(currentGrid(), g ?? cam.focus, tool === 'paint');
    panelTimer -= dt;
    if (panelTimer <= 0) {
      panelTimer = 0.25;
      refreshPanel();
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
    if (edView.layers.has('zones')) {
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
  };
}
