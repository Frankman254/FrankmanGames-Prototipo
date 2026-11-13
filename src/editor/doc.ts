// Documento del modo edición: los JSON de `data/` que el editor puede cambiar,
// tal cual se leen (con sus `_nota`), más la lista de objetos colocables que
// salen de ellos y las operaciones sobre esos objetos (mover, girar, escalar,
// borrar, añadir, pintar la navegación). Cada cambio va en una transacción que
// apunta un paso de deshacer. Lógica pura: sin DOM ni Babylon.
import type { NavPaint, RectObstacle } from '../sim/navGrid';
import { History, type Snapshot } from './history';
import { formatLike } from './jsonFormat';
import { brush, paintFromData, paintToData, type BrushMode, type PaintState } from './navBrush';

import { FILE_IDS, type FileId } from './files';

export { EDITOR_FILES, FILE_IDS, type FileId } from './files';

/** Props a mano y su tamaño al añadirlos desde la paleta (PROPUESTA). */
const PROP_DEFAULTS: Record<string, { w: number; d: number }> = {
  house: { w: 6, d: 6 },
  log: { w: 5, d: 1 },
  boulder: { w: 3, d: 3 },
  lamp: { w: 0.4, d: 0.4 },
};
/** Alto aproximado de cada cosa para dibujarla y elegirla con el ratón. */
const PROP_HEIGHT: Record<string, number> = { house: 4.4, log: 0.9, boulder: 2, lamp: 3.1 };
/** Modelos que ya salen por su kind (la farola es la lámpara); no se repiten en la paleta. */
const KNOWN_PROPS = ['farola'];

interface RawProp { kind: string; model?: string; node?: string; x: number; y: number; w: number; d: number; rotDeg: number; parts?: RawProp[] }
interface RawPlacement { kind: string; x: number; y: number; scale: number; rotDeg: number }
interface RawExclusion { kind: string; x: number; y: number }
interface RawKind { blockRadius: number; scale: [number, number]; shape: string }
interface RawVegetation { kinds: Record<string, RawKind>; props: RawProp[]; placements?: RawPlacement[]; exclusions?: RawExclusion[] }
interface RawPond { x: number; y: number; radius: number; depth: number; shore: number }
interface RawTerrain { width: number; depth: number; playerStart: { x: number; y: number }; ponds?: RawPond[] }
interface RawPerson { name?: string; title?: string; merchant?: boolean; merchantId?: string | null; position?: { x: number; y: number }; dialogue?: unknown; look?: string }
type RawArea = { type: 'circle'; x: number; y: number; radius: number } | { type: 'rect'; x0: number; y0: number; x1: number; y1: number };
interface RawZone { id: string; name: string; safe?: boolean; areas: RawArea[] }
interface RawSpot { x: number; y: number; radius: number }
interface RawStone { id: string; name: string; x: number; y: number; face?: { x: number; y: number } }
interface RawStones { stones: RawStone[]; home: string; start?: string; boats?: Array<{ id: string; name: string; x: number; y: number; to: { x: number; y: number }; arrive: string; requires?: string | null; waitText?: string }> }
interface RawStation { name: string; profession: string; x: number; y: number; shape: string }
interface RawResurrector { id: string; name: string; region?: string; x: number; y: number }

/** Ejemplar de vegetación tal como sale de la dispersión (generado o colocado). */
export interface ScatterItem {
  kind: string;
  x: number;
  y: number;
  scale: number;
  rotDeg: number;
  /** Índice en `placements` si se colocó a mano. */
  placement?: number;
}

/** Dispersión de los tipos que bloquean a partir de vegetation.json y terrain.json. */
export type ScatterFn = (vegetation: unknown, terrain: unknown) => { items: ScatterItem[]; obstacles: RectObstacle[] };

export type Category = 'props' | 'trees' | 'npcs' | 'water' | 'zones' | 'start' | 'stones' | 'stations';

export type Footprint =
  | { type: 'box'; w: number; d: number; h: number }
  | { type: 'cyl'; r: number; h: number }
  | { type: 'circle'; r: number }
  | { type: 'rect'; w: number; d: number };

export interface EditorObject {
  /** Identificador estable mientras no se borre nada antes (p. ej. `prop:3`). */
  key: string;
  category: Category;
  /** house, pine, npc, pond, zone… */
  kind: string;
  label: string;
  x: number;
  y: number;
  rotDeg: number;
  shape: Footprint;
  /** Zona a la que pertenece un área (para las etiquetas y colores). */
  zoneId?: string;
}

export interface Field {
  name: string;
  label: string;
  value: number;
  step: number;
}

export interface PaletteEntry {
  id: string;
  label: string;
  /** Necesita una zona elegida (añadir un área). */
  needsZone?: boolean;
}

const round2 = (v: number): number => Math.round(v * 100) / 100;

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export class EditorDoc {
  readonly data: Record<FileId, unknown>;
  /** Texto aplicado en caliente (referencia para el diff del modo edición). */
  readonly applied: Partial<Record<FileId, string>> = {};
  readonly history = new History();
  /** Sube con cada cambio (la vista se rehace cuando cambia). */
  version = 0;
  /** Mientras se arrastra no se regenera la dispersión (se hace al soltar). */
  dragging = false;
  private originals: Record<FileId, string>;
  private pending: { label: string; before: Snapshot } | null = null;
  private scatterKey = '';
  private scatterCache: ReturnType<ScatterFn> = { items: [], obstacles: [] };
  private paint: PaintState | null = null;

  constructor(
    originals: Record<FileId, string>,
    private readonly scatterFn: ScatterFn,
    /** Rejilla de navegación de la zona (columnas y filas con su cellSize). */
    readonly grid: { cols: number; rows: number; cellSize: number },
    /** Mallas GLB del catálogo (de `assets/models/`), para la paleta. */
    readonly models: readonly string[] = [],
    /** Archivos que sólo se leen para las guardas (quests referencia PNJ y piedras). */
    private readonly refs: { quests?: unknown } = {},
  ) {
    this.originals = { ...originals };
    this.data = Object.fromEntries(FILE_IDS.map((f) => [f, JSON.parse(originals[f])])) as Record<FileId, unknown>;
  }

  private get veg(): RawVegetation {
    return this.data.vegetation as RawVegetation;
  }
  private get terrain(): RawTerrain {
    return this.data.terrain as RawTerrain;
  }
  private get zones(): RawZone[] {
    return (this.data.zones as { zones: RawZone[] }).zones;
  }
  private get npcs(): Record<string, RawPerson> {
    return (this.data.npcs as { npcs: Record<string, RawPerson> }).npcs;
  }
  private get merchants(): Record<string, RawPerson> {
    return (this.data.merchants as { merchants: Record<string, RawPerson> }).merchants;
  }
  private get spots(): Record<string, RawSpot> {
    return (this.data.fishing as { spots?: Record<string, RawSpot> }).spots ?? {};
  }
  private get stones(): RawStones {
    return this.data.stones as RawStones;
  }
  private get stations(): Record<string, RawStation> {
    return (this.data.professions as { stations: Record<string, RawStation> }).stations;
  }
  private get resurrectors(): RawResurrector[] {
    return (this.data.death as { resurrectors: RawResurrector[] }).resurrectors;
  }
  private placements(): RawPlacement[] {
    return (this.veg.placements ??= []);
  }
  private exclusions(): RawExclusion[] {
    return (this.veg.exclusions ??= []);
  }

  // ---- Transacciones y deshacer -------------------------------------------

  snapshot(): Snapshot {
    return Object.fromEntries(FILE_IDS.map((f) => [f, JSON.stringify(this.data[f])]));
  }

  /** Empieza un paso de deshacer (p. ej. al pulsar para arrastrar). */
  begin(label: string): void {
    if (!this.pending) this.pending = { label, before: this.snapshot() };
  }

  /** Cierra el paso: si algo cambió, se apunta. */
  commit(): boolean {
    const p = this.pending;
    this.pending = null;
    this.dragging = false;
    if (!p) return false;
    const changed = this.history.record(p.label, p.before, this.snapshot());
    this.touch();
    return changed;
  }

  /** Cambio de un solo golpe (botón, campo numérico). */
  edit<T>(label: string, fn: () => T): T {
    const nested = this.pending !== null;
    this.begin(label);
    const out = fn();
    if (!nested) this.commit();
    else this.touch();
    return out;
  }

  private restore(s: Snapshot): void {
    for (const [f, text] of Object.entries(s)) this.data[f as FileId] = JSON.parse(text);
    this.paint = null;
    this.touch();
  }

  undo(): string | null {
    if (this.pending) this.commit();
    const c = this.history.undo();
    if (c) this.restore(c.before);
    return c?.label ?? null;
  }

  redo(): string | null {
    const c = this.history.redo();
    if (c) this.restore(c.after);
    return c?.label ?? null;
  }

  private touch(): void {
    this.version++;
  }

  // ---- Guardar --------------------------------------------------------------

  /** Archivos con cambios respecto a lo último guardado. */
  dirtyFiles(): FileId[] {
    return FILE_IDS.filter((f) => JSON.stringify(this.data[f]) !== JSON.stringify(JSON.parse(this.originals[f])));
  }

  /** Texto a escribir en disco, con el formato del original. */
  serialize(f: FileId): string {
    return formatLike(this.originals[f], this.data[f]);
  }

  /** Tras guardar: lo escrito pasa a ser el original. */
  markSaved(files: Partial<Record<FileId, string>>): void {
    for (const [f, text] of Object.entries(files)) this.originals[f as FileId] = text;
    this.touch();
  }

  // ---- Dispersión y navegación ----------------------------------------------

  private scatter(): ReturnType<ScatterFn> {
    if (this.dragging && this.scatterKey) return this.scatterCache;
    const t = this.terrain;
    const key = JSON.stringify([this.veg, t.ponds, t.playerStart, (t as unknown as { paths?: unknown }).paths, (t as unknown as { flatAreas?: unknown }).flatAreas]);
    if (key !== this.scatterKey) {
      this.scatterKey = key;
      this.scatterCache = this.scatterFn(this.veg, this.terrain);
    }
    return this.scatterCache;
  }

  /** Obstáculos de la rejilla tal como quedarían al guardar (props, troncos y rocas). */
  obstacles(): RectObstacle[] {
    return this.scatter().obstacles;
  }

  /** Agua que no se pisa (los `spots` de pesca). */
  water(): RawSpot[] {
    return Object.values(this.spots);
  }

  navPaint(): NavPaint {
    return this.data.navpaint as NavPaint;
  }

  private paintState(): PaintState {
    return (this.paint ??= paintFromData(this.navPaint(), this.grid.cols));
  }

  /** Pincelada (dentro de una transacción abierta con `begin`). Devuelve las celdas cambiadas. */
  paintAt(x: number, y: number, radius: number, mode: BrushMode): number {
    const s = this.paintState();
    if (Math.abs(s.cellSize - this.grid.cellSize) > 1e-9) {
      // Pintado con otro tamaño de celda: se descarta y se empieza de cero.
      s.cellSize = this.grid.cellSize;
      s.blocked.clear();
      s.cleared.clear();
    }
    const n = brush(s, this.grid.cols, this.grid.rows, x, y, radius, mode);
    if (n > 0) {
      const raw = this.data.navpaint as Record<string, unknown>;
      Object.assign(raw, paintToData(s, this.grid.cols));
      this.touch();
    }
    return n;
  }

  // ---- Objetos ----------------------------------------------------------------

  objects(): EditorObject[] {
    const out: EditorObject[] = [];
    this.veg.props.forEach((p, i) => {
      if (p.kind === 'group') {
        out.push({ key: `prop:${i}`, category: 'props', kind: 'group', label: `grupo ${i + 1} (${p.parts?.length ?? 0})`, x: p.x, y: p.y, rotDeg: p.rotDeg, shape: { type: 'box', w: p.w, d: p.d, h: PROP_HEIGHT[p.parts?.[0]?.kind ?? 'boulder'] ?? 2 } });
        return;
      }
      out.push({ key: `prop:${i}`, category: 'props', kind: p.kind, label: `${p.kind} ${i + 1}`, x: p.x, y: p.y, rotDeg: p.rotDeg, shape: { type: 'box', w: p.w, d: p.d, h: PROP_HEIGHT[p.kind] ?? 2 } });
    });
    for (const it of this.scatter().items) {
      const k = this.veg.kinds[it.kind];
      const r = Math.max(0.25, (k?.blockRadius ?? 0.3) * it.scale);
      const h = (k?.shape === 'rock' ? 1 : 4.5) * it.scale;
      if (it.placement !== undefined) {
        const p = this.placements()[it.placement];
        if (!p) continue;
        out.push({ key: `placement:${it.placement}`, category: 'trees', kind: p.kind, label: `${p.kind} (a mano)`, x: p.x, y: p.y, rotDeg: p.rotDeg, shape: { type: 'cyl', r, h } });
      } else {
        out.push({ key: `scatter:${it.kind}:${round2(it.x)}:${round2(it.y)}:${round2(it.scale)}:${Math.round(it.rotDeg)}`, category: 'trees', kind: it.kind, label: it.kind, x: it.x, y: it.y, rotDeg: it.rotDeg, shape: { type: 'cyl', r, h } });
      }
    }
    for (const [id, n] of Object.entries(this.npcs)) {
      if (n.merchant || !n.position) continue;
      out.push({ key: `npc:${id}`, category: 'npcs', kind: 'npc', label: n.name ?? id, x: n.position.x, y: n.position.y, rotDeg: 0, shape: { type: 'cyl', r: 0.5, h: 2 } });
    }
    for (const [id, m] of Object.entries(this.merchants)) {
      if (!m.position) continue;
      out.push({ key: `merchant:${id}`, category: 'npcs', kind: 'merchant', label: `${m.name ?? id} (mercader)`, x: m.position.x, y: m.position.y, rotDeg: 0, shape: { type: 'cyl', r: 0.5, h: 2 } });
    }
    this.stones.stones.forEach((z) => {
      out.push({ key: `stone:${z.id}`, category: 'stones', kind: 'stone', label: z.name, x: z.x, y: z.y, rotDeg: 0, shape: { type: 'cyl', r: 2, h: 3 } });
    });
    for (const [id, s] of Object.entries(this.stations)) {
      out.push({ key: `station:${id}`, category: 'stations', kind: 'station', label: `${s.name} (taller)`, x: s.x, y: s.y, rotDeg: 0, shape: { type: 'box', w: 2.5, d: 2.5, h: 1.6 } });
    }
    this.resurrectors.forEach((a) => {
      out.push({ key: `altar:${a.id}`, category: 'stations', kind: 'altar', label: `${a.name} (Alzador)`, x: a.x, y: a.y, rotDeg: 0, shape: { type: 'box', w: 2, d: 2, h: 3.5 } });
    });
    (this.terrain.ponds ?? []).forEach((p, i) => {
      out.push({ key: `pond:${i}`, category: 'water', kind: 'pond', label: `estanque ${i + 1}`, x: p.x, y: p.y, rotDeg: 0, shape: { type: 'circle', r: p.radius } });
    });
    this.zones.forEach((z, zi) => {
      z.areas.forEach((a, ai) => {
        const label = `${z.name} · área ${ai + 1}`;
        const base = { key: `area:${zi}:${ai}`, category: 'zones' as const, kind: 'zone', label, rotDeg: 0, zoneId: z.id };
        if (a.type === 'circle') out.push({ ...base, x: a.x, y: a.y, shape: { type: 'circle', r: a.radius } });
        else out.push({ ...base, x: (a.x0 + a.x1) / 2, y: (a.y0 + a.y1) / 2, shape: { type: 'rect', w: a.x1 - a.x0, d: a.y1 - a.y0 } });
      });
    });
    const s = this.terrain.playerStart;
    out.push({ key: 'start', category: 'start', kind: 'start', label: 'inicio del jugador', x: s.x, y: s.y, rotDeg: 0, shape: { type: 'cyl', r: 0.6, h: 0.3 } });
    return out;
  }

  find(key: string): EditorObject | null {
    return this.objects().find((o) => o.key === key) ?? null;
  }

  /** Zonas (para la paleta y las etiquetas). */
  zoneList(): Array<{ index: number; id: string; name: string; safe: boolean }> {
    return this.zones.map((z, index) => ({ index, id: z.id, name: z.name, safe: z.safe === true }));
  }

  /**
   * Un árbol o roca generado pasa a colocado a mano: se excluye el generado y se
   * añade una colocación igual. Devuelve el índice de la colocación.
   */
  private adopt(key: string): number {
    const [, kind, x, y, scale, rot] = key.split(':');
    const ex = { kind: kind!, x: Number(x), y: Number(y) };
    this.exclusions().push(ex);
    this.placements().push({ kind: kind!, x: ex.x, y: ex.y, scale: Number(scale), rotDeg: Number(rot) });
    return this.placements().length - 1;
  }

  private pondSpot(p: RawPond): RawSpot | null {
    return Object.values(this.spots).find((s) => Math.abs(s.x - p.x) < 1e-6 && Math.abs(s.y - p.y) < 1e-6) ?? null;
  }

  private area(key: string): { zone: RawZone; area: RawArea; ai: number } | null {
    const [, zi, ai] = key.split(':').map(Number);
    const zone = this.zones[zi!];
    const area = zone?.areas[ai!];
    return zone && area ? { zone, area, ai: ai! } : null;
  }

  /** Mueve el objeto a (x, y). Devuelve su clave nueva (un generado cambia de clave). */
  moveTo(key: string, x: number, y: number): string {
    x = round2(x);
    y = round2(y);
    const [t, a] = key.split(':');
    if (t === 'scatter') key = `placement:${this.adopt(key)}`;
    const [tt, idx] = key.split(':');
    const i = Number(idx);
    if (tt === 'prop') Object.assign(this.veg.props[i]!, { x, y });
    else if (tt === 'placement') Object.assign(this.placements()[i]!, { x, y });
    else if (t === 'npc') this.npcs[a!]!.position = { x, y };
    else if (t === 'merchant') this.merchants[a!]!.position = { x, y };
    else if (t === 'pond') {
      const p = this.terrain.ponds![i]!;
      const spot = this.pondSpot(p);
      Object.assign(p, { x, y });
      if (spot) Object.assign(spot, { x, y });
    } else if (t === 'area') {
      const r = this.area(key);
      if (r?.area.type === 'circle') Object.assign(r.area, { x, y });
      else if (r?.area.type === 'rect') {
        const hw = (r.area.x1 - r.area.x0) / 2;
        const hd = (r.area.y1 - r.area.y0) / 2;
        Object.assign(r.area, { x0: round2(x - hw), x1: round2(x + hw), y0: round2(y - hd), y1: round2(y + hd) });
      }
    } else if (t === 'start') this.terrain.playerStart = { x, y };
    else if (t === 'stone') {
      const z = this.stones.stones.find((s) => s.id === a);
      if (z) Object.assign(z, { x, y });
    } else if (t === 'station') {
      const s = this.stations[a!];
      if (s) Object.assign(s, { x, y });
    } else if (t === 'altar') {
      const al = this.resurrectors.find((s) => s.id === a);
      if (al) Object.assign(al, { x, y });
    }
    this.touch();
    return key;
  }

  /** Giro: casas y props de 90 en 90 (cambian ancho por fondo); árboles de 15 en 15. */
  rotate(key: string, steps: number): string {
    const [t] = key.split(':');
    if (t === 'scatter') key = `placement:${this.adopt(key)}`;
    const [tt, idx] = key.split(':');
    if (tt === 'prop') {
      const p = this.veg.props[Number(idx)]!;
      p.rotDeg = (((p.rotDeg + steps * 90) % 360) + 360) % 360;
      if (steps % 2 !== 0) [p.w, p.d] = [p.d, p.w];
    } else if (tt === 'placement') {
      const p = this.placements()[Number(idx)]!;
      p.rotDeg = (((p.rotDeg + steps * 15) % 360) + 360) % 360;
    }
    this.touch();
    return key;
  }

  /** Escala tamaño, radio o escala del ejemplar por `factor`. */
  scale(key: string, factor: number): string {
    const [t] = key.split(':');
    if (t === 'scatter') key = `placement:${this.adopt(key)}`;
    const [tt, idx] = key.split(':');
    const i = Number(idx);
    if (tt === 'prop') {
      const p = this.veg.props[Number(idx)]!;
      p.w = Math.max(0.1, round2(p.w * factor));
      p.d = Math.max(0.1, round2(p.d * factor));
      if (p.kind === 'group' && p.parts) {
        // El sobre solo se dibuja; lo que pesa en el mundo son las piezas.
        p.parts = p.parts.map((q) => ({ ...q, x: round2(q.x * factor), y: round2(q.y * factor), w: Math.max(0.1, round2(q.w * factor)), d: Math.max(0.1, round2(q.d * factor)) }));
      }
    } else if (tt === 'placement') {
      const p = this.placements()[i]!;
      p.scale = Math.min(10, Math.max(0.05, round2(p.scale * factor)));
    } else if (tt === 'pond') {
      const p = this.terrain.ponds![i]!;
      const spot = this.pondSpot(p);
      p.radius = Math.max(1, round2(p.radius * factor));
      if (spot) spot.radius = p.radius;
    } else if (tt === 'area') {
      const r = this.area(key);
      if (r?.area.type === 'circle') r.area.radius = Math.max(1, round2(r.area.radius * factor));
      else if (r?.area.type === 'rect') {
        const a = r.area;
        const cx = (a.x0 + a.x1) / 2;
        const cy = (a.y0 + a.y1) / 2;
        const hw = Math.max(0.5, ((a.x1 - a.x0) / 2) * factor);
        const hd = Math.max(0.5, ((a.y1 - a.y0) / 2) * factor);
        Object.assign(a, { x0: round2(cx - hw), x1: round2(cx + hw), y0: round2(cy - hd), y1: round2(cy + hd) });
      }
    }
    this.touch();
    return key;
  }

  /** ¿Se puede borrar? Da el motivo cuando no. */
  removeBlock(key: string): string | null {
    const [t, idx] = key.split(':');
    if (t === 'prop' || t === 'placement' || t === 'scatter') return null;
    if (t === 'area') return (this.area(key)?.zone.areas.length ?? 0) > 1 ? null : 'La zona necesita al menos un área';
    if (t === 'stone') {
      const s = this.stones;
      if (idx === s.home) return 'Es la piedra de casa: donde se reaparece';
      if (idx === (s.start ?? s.home)) return 'Es la piedra de inicio del juego';
      const z = s.stones.find((x) => x.id === idx);
      if (z && s.boats?.some((b) => Math.hypot(b.x - z.x, b.y - z.y) < 30 || Math.hypot(b.to.x - z.x, b.to.y - z.y) < 30)) return 'Hay un muelle de lancha aquí';
      const q = this.questRefs(idx!);
      if (q) return `La misión «${q}» la menciona`;
      return null;
    }
    if (t === 'altar') return this.resurrectors.length > 1 ? null : 'Debe quedar al menos un Alzador';
    if (t === 'station') return null;
    if (t === 'pond') {
      const p = this.terrain.ponds?.[Number(idx)];
      if (p && Object.values(this.spots).some((s) => s.x === p.x && s.y === p.y)) return 'Tiene un sitio de pesca encima';
      return null;
    }
    if (t === 'npc' || t === 'merchant') {
      const q = this.questRefs(idx!);
      if (q) return `La misión «${q}» lo necesita`;
      return null;
    }
    return 'Esto no se borra desde el editor';
  }

  /** Primera misión que menciona ese id (objetivos `talk`/`reach` y condiciones). */
  private questRefs(id: string): string | null {
    const quests = (this.refs.quests as { quests?: Record<string, { text?: string; title?: string; objectives?: Array<Record<string, unknown>> }> } | undefined)?.quests;
    if (!quests) return null;
    const hay = (o: unknown): boolean => {
      if (typeof o === 'string') return o === id;
      if (Array.isArray(o)) return o.some(hay);
      if (o && typeof o === 'object') return Object.values(o).some(hay);
      return false;
    };
    for (const [qid, q] of Object.entries(quests)) if (hay(q)) return q.title ?? q.text ?? qid;
    return null;
  }

  canRemove(key: string): boolean {
    return this.removeBlock(key) === null;
  }

  remove(key: string): boolean {
    if (!this.canRemove(key)) return false;
    const [t, idx] = key.split(':');
    if (t === 'prop') this.veg.props.splice(Number(idx), 1);
    else if (t === 'placement') this.placements().splice(Number(idx), 1);
    else if (t === 'scatter') {
      const [, kind, x, y] = key.split(':');
      this.exclusions().push({ kind: kind!, x: Number(x), y: Number(y) });
    } else if (t === 'area') {
      const r = this.area(key)!;
      r.zone.areas.splice(r.ai, 1);
    } else if (t === 'stone') {
      this.stones.stones = this.stones.stones.filter((z) => z.id !== idx);
    } else if (t === 'altar') {
      (this.data.death as { resurrectors: unknown[] }).resurrectors = this.resurrectors.filter((a) => a.id !== idx);
    } else if (t === 'station') {
      delete this.stations[idx!];
    } else if (t === 'pond') {
      const p = this.terrain.ponds![Number(idx)]!;
      const spot = this.pondSpot(p);
      if (spot) {
        const fishing = this.data.fishing as { spots: Record<string, RawSpot> };
        for (const [id, s] of Object.entries(fishing.spots)) if (s === spot) delete fishing.spots[id];
      }
      this.terrain.ponds!.splice(Number(idx), 1);
    } else if (t === 'npc') {
      delete this.npcs[idx!];
    } else if (t === 'merchant') {
      delete this.merchants[idx!];
      for (const [id, n] of Object.entries(this.npcs)) if (n.merchantId === idx) delete this.npcs[id];
    }
    this.touch();
    return true;
  }

  // ---- Fusionar, desunir y duplicar ------------------------------------------

  /**
   * Fusiona props sueltos en un `group`: uno solo se selecciona, se mueve, se
   * gira y se deshace. El juego dibuja las piezas por separado (así estaban);
   * lo que ahorra es manipulación y, sobre todo, objetos que cuidar.
   */
  merge(keys: readonly string[]): string | null {
    const idx = keys.map((k) => (k.startsWith('prop:') ? Number(k.slice(5)) : -1)).filter((i) => i >= 0);
    if (idx.length < 2) return null;
    const parts = idx.map((i) => this.veg.props[i]!).filter((p) => p.kind !== 'group');
    if (parts.length < 2) return null;
    const x0 = Math.min(...parts.map((p) => p.x - p.w / 2));
    const x1 = Math.max(...parts.map((p) => p.x + p.w / 2));
    const y0 = Math.min(...parts.map((p) => p.y - p.d / 2));
    const y1 = Math.max(...parts.map((p) => p.y + p.d / 2));
    const cx = round2((x0 + x1) / 2);
    const cy = round2((y0 + y1) / 2);
    const group: RawProp = {
      kind: 'group',
      x: cx,
      y: cy,
      w: round2(x1 - x0),
      d: round2(y1 - y0),
      rotDeg: 0,
      parts: parts.map((p) => ({ ...clone(p), x: round2(p.x - cx), y: round2(p.y - cy) })),
    };
    for (const i of [...idx].sort((a, b) => b - a)) this.veg.props.splice(i, 1);
    this.veg.props.push(group);
    this.touch();
    return `prop:${this.veg.props.length - 1}`;
  }

  /** Devuelve un grupo a props sueltos, cada uno en su sitio. */
  unmerge(key: string): string[] {
    const [t, idx] = key.split(':');
    if (t !== 'prop') return [];
    const g = this.veg.props[Number(idx)];
    if (g?.kind !== 'group' || !g.parts) return [];
    const rad = (g.rotDeg * Math.PI) / 180;
    const cos = Math.round(Math.cos(rad));
    const sin = Math.round(Math.sin(rad));
    const quarter = ((Math.abs(g.rotDeg) / 90) % 2) as 0 | 1;
    const kids = g.parts.map((q) => ({
      ...clone(q),
      x: round2(g.x + q.x * cos + q.y * sin),
      y: round2(g.y - q.x * sin + q.y * cos),
      w: quarter ? q.d : q.w,
      d: quarter ? q.w : q.d,
      rotDeg: (((q.rotDeg + g.rotDeg) % 360) + 360) % 360,
    }));
    this.veg.props.splice(Number(idx), 1, ...kids);
    this.touch();
    return kids.map((_, n) => `prop:${Number(idx) + n}`);
  }

  /** Copia un objeto justo al lado (2 m). Devuelve la clave de la copia. */
  duplicate(key: string): string | null {
    return this.edit('Duplicar', () => {
      if (key.startsWith('scatter:')) key = `placement:${this.adopt(key)}`;
      const [t, idx] = key.split(':');
      if (t === 'prop') {
        const p = this.veg.props[Number(idx)];
        if (!p) return null;
        this.veg.props.push({ ...clone(p), x: round2(p.x + 2) });
        return `prop:${this.veg.props.length - 1}`;
      }
      if (t === 'placement') {
        const p = this.placements()[Number(idx)];
        if (!p) return null;
        this.placements().push({ ...clone(p), x: round2(p.x + 2) });
        return `placement:${this.placements().length - 1}`;
      }
      if (t === 'pond') {
        const p = this.terrain.ponds![Number(idx)];
        if (!p) return null;
        this.terrain.ponds!.push({ ...clone(p), x: round2(p.x + 2) });
        return `pond:${this.terrain.ponds!.length - 1}`;
      }
      return null;
    });
  }

  palette(): PaletteEntry[] {
    const out: PaletteEntry[] = Object.keys(PROP_DEFAULTS).map((k) => ({ id: `prop:${k}`, label: k }));
    for (const m of this.models) {
      if (m.startsWith('_') || KNOWN_PROPS.includes(m)) continue;
      out.push({ id: `model:${m}`, label: m });
    }
    for (const [id, k] of Object.entries(this.veg.kinds)) {
      if (id.startsWith('_') || k.shape === 'grass' || k.shape === 'flower') continue;
      out.push({ id: `plant:${id}`, label: id });
    }
    out.push({ id: 'pond', label: 'estanque' }, { id: 'npc', label: 'PNJ' });
    out.push({ id: 'area:circle', label: 'área circular', needsZone: true }, { id: 'area:rect', label: 'área rectangular', needsZone: true });
    return out;
  }

  /** Añade desde la paleta en (x, y). `zone` = índice de zona para las áreas. Devuelve la clave nueva. */
  add(id: string, x: number, y: number, zone?: number): string | null {
    x = round2(x);
    y = round2(y);
    const [t, kind] = id.split(':');
    let key: string | null = null;
    if (t === 'prop' && PROP_DEFAULTS[kind!]) {
      this.veg.props.push({ kind: kind!, x, y, ...PROP_DEFAULTS[kind!]!, rotDeg: 0 });
      key = `prop:${this.veg.props.length - 1}`;
    } else if (t === 'model') {
      const w = kind === 'castillo' || kind === 'iglesia' ? 10 : 3;
      this.veg.props.push({ kind: 'landmark', model: kind!, x, y, w, d: w, rotDeg: 0 });
      key = `prop:${this.veg.props.length - 1}`;
    } else if (t === 'pond') {
      (this.terrain.ponds ??= []).push({ x, y, radius: 5, depth: 1.6, shore: 2 });
      key = `pond:${this.terrain.ponds.length - 1}`;
    } else if (t === 'npc') {
      let n = 1;
      while (`editor_${n}` in this.npcs) n++;
      const idNew = `editor_${n}`;
      this.npcs[idNew] = {
        name: 'PNJ nuevo',
        title: '',
        position: { x, y },
        dialogue: { nodes: { hello: { text: '…', options: [] } }, entry: [{ node: 'hello' }] },
      };
      key = `npc:${idNew}`;
    } else if (t === 'plant' && this.veg.kinds[kind!]) {
      const k = this.veg.kinds[kind!]!;
      this.placements().push({ kind: kind!, x, y, scale: round2((k.scale[0] + k.scale[1]) / 2), rotDeg: 0 });
      key = `placement:${this.placements().length - 1}`;
    } else if (t === 'area' && zone !== undefined && this.zones[zone]) {
      const areas = this.zones[zone]!.areas;
      areas.push(kind === 'circle' ? { type: 'circle', x, y, radius: 10 } : { type: 'rect', x0: x - 8, y0: y - 8, x1: x + 8, y1: y + 8 });
      key = `area:${zone}:${areas.length - 1}`;
    }
    if (key) this.touch();
    return key;
  }

  /** Propiedades numéricas del objeto para el panel. */
  fields(key: string): Field[] {
    const [t, idx] = key.split(':');
    const f = (name: string, label: string, value: number, step = 0.1): Field => ({ name, label, value, step });
    if (t === 'prop') {
      const p = this.veg.props[Number(idx)];
      return p ? [f('x', 'X', p.x), f('y', 'Z', p.y), f('w', 'Ancho (X)', p.w), f('d', 'Fondo (Z)', p.d), f('rotDeg', 'Giro (puerta)', p.rotDeg, 90)] : [];
    }
    if (t === 'placement') {
      const p = this.placements()[Number(idx)];
      return p ? [f('x', 'X', p.x), f('y', 'Z', p.y), f('scale', 'Escala', p.scale, 0.05), f('rotDeg', 'Giro', p.rotDeg, 15)] : [];
    }
    if (t === 'scatter') {
      const [, , x, y, scale, rot] = key.split(':');
      return [f('x', 'X', Number(x)), f('y', 'Z', Number(y)), f('scale', 'Escala', Number(scale), 0.05), f('rotDeg', 'Giro', Number(rot), 15)];
    }
    if (t === 'npc' || t === 'merchant') {
      const p = (t === 'npc' ? this.npcs : this.merchants)[idx!]?.position;
      return p ? [f('x', 'X', p.x), f('y', 'Z', p.y)] : [];
    }
    if (t === 'pond') {
      const p = this.terrain.ponds?.[Number(idx)];
      return p ? [f('x', 'X', p.x), f('y', 'Z', p.y), f('radius', 'Radio', p.radius), f('depth', 'Hondura', p.depth), f('shore', 'Orilla', p.shore)] : [];
    }
    if (t === 'stone') {
      const z = this.stones.stones.find((s) => s.id === idx);
      return z ? [f('x', 'X', z.x), f('y', 'Z', z.y)] : [];
    }
    if (t === 'station') {
      const s = this.stations[idx!];
      return s ? [f('x', 'X', s.x), f('y', 'Z', s.y)] : [];
    }
    if (t === 'altar') {
      const a = this.resurrectors.find((s) => s.id === idx);
      return a ? [f('x', 'X', a.x), f('y', 'Z', a.y)] : [];
    }
    if (t === 'area') {
      const a = this.area(key)?.area;
      if (!a) return [];
      if (a.type === 'circle') return [f('x', 'X', a.x, 1), f('y', 'Z', a.y, 1), f('radius', 'Radio', a.radius, 1)];
      return [f('x0', 'X mín', a.x0, 1), f('y0', 'Z mín', a.y0, 1), f('x1', 'X máx', a.x1, 1), f('y1', 'Z máx', a.y1, 1)];
    }
    if (t === 'start') {
      const s = this.terrain.playerStart;
      return [f('x', 'X', s.x), f('y', 'Z', s.y)];
    }
    return [];
  }

  /** Cambia una propiedad numérica. Devuelve la clave (puede cambiar). */
  setField(key: string, name: string, value: number): string {
    if (!Number.isFinite(value)) return key;
    const obj = this.find(key);
    if (!obj) return key;
    if ((name === 'x' || name === 'y') && !key.startsWith('area:')) {
      return this.moveTo(key, name === 'x' ? value : obj.x, name === 'y' ? value : obj.y);
    }
    const [t] = key.split(':');
    if (t === 'scatter') key = `placement:${this.adopt(key)}`;
    const [tt, idx] = key.split(':');
    const v = round2(value);
    if (tt === 'prop') {
      const p = this.veg.props[Number(idx)]!;
      if (name === 'rotDeg') {
        const steps = Math.round((v - p.rotDeg) / 90);
        return this.rotate(key, steps);
      }
      if (name === 'w' || name === 'd') p[name] = Math.max(0.1, v);
    } else if (tt === 'placement') {
      const p = this.placements()[Number(idx)]!;
      if (name === 'scale') p.scale = Math.min(10, Math.max(0.05, v));
      if (name === 'rotDeg') p.rotDeg = ((v % 360) + 360) % 360;
    } else if (tt === 'pond') {
      const p = this.terrain.ponds![Number(idx)]!;
      const spot = this.pondSpot(p);
      if (name === 'radius') {
        p.radius = Math.max(1, v);
        if (spot) spot.radius = p.radius;
      }
      if (name === 'depth') p.depth = Math.max(0.2, v);
      if (name === 'shore') p.shore = Math.max(0.5, v);
    } else if (tt === 'area') {
      const a = this.area(key)?.area;
      if (a?.type === 'circle' && (name === 'x' || name === 'y')) a[name] = v;
      if (a?.type === 'circle' && name === 'radius') a.radius = Math.max(1, v);
      if (a?.type === 'rect' && (name === 'x0' || name === 'x1' || name === 'y0' || name === 'y1')) {
        a[name] = v;
        if (a.x1 < a.x0) [a.x0, a.x1] = [a.x1, a.x0];
        if (a.y1 < a.y0) [a.y0, a.y1] = [a.y1, a.y0];
      }
    }
    this.touch();
    return key;
  }

  /** Copia de los datos de un archivo (para validarlos con los parsers del juego). */
  copyOf(f: FileId): unknown {
    return clone(this.data[f]);
  }
}
