import type { DungeonFloorMapDef, EntityOverride, ManualObject, ManualObjectKind } from '../data/dungeonFloorMap';
import { parseEntityId } from '../data/dungeonFloorMap';
import type { NavGrid } from '../sim/navGrid';
import type { DungeonFloor } from '../world/dungeon';
import { brush, paintFromData, paintToData, type BrushMode, type PaintState } from './navBrush';
import { History } from './history';
import type { EditorObject } from './doc';
import { prefabRegistry } from './prefabRegistry';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Genera un ID único para objetos manuales. */
let _manualIdCounter = 0;
function generateManualId(): string {
  _manualIdCounter++;
  return `manual:${Date.now()}:${_manualIdCounter}`;
}

/** Dimensiones por defecto para cada tipo de objeto manual. */
const MANUAL_DEFAULTS: Record<ManualObjectKind, { w: number; d: number; h: number }> = {
  chest: { w: 1, d: 0.8, h: 0.8 },
  barrel: { w: 0.65, d: 0.65, h: 0.9 },
  jar: { w: 0.5, d: 0.5, h: 0.7 },
  door: { w: 0.35, d: 1.5, h: 2.4 },
  torch: { w: 0.3, d: 0.3, h: 1.2 },
  spawn: { w: 0.8, d: 0.8, h: 1.8 },
  npc: { w: 0.8, d: 0.8, h: 1.8 },
  resource: { w: 0.8, d: 0.8, h: 1.0 },
  decoration: { w: 0.8, d: 0.8, h: 1.0 },
  structural: { w: 2.0, d: 2.0, h: 3.0 },
  zone: { w: 2.0, d: 2.0, h: 0.1 },
  trigger: { w: 1.0, d: 1.0, h: 0.1 },
  entrance: { w: 1.5, d: 1.5, h: 0.25 },
  exit: { w: 1.5, d: 1.5, h: 0.25 },
};

/** Nombre legible para cada tipo de objeto manual. */
const MANUAL_LABELS: Record<ManualObjectKind, string> = {
  chest: 'cofre',
  barrel: 'barril',
  jar: 'jarra',
  door: 'puerta',
  torch: 'antorcha',
  spawn: 'punto de aparición',
  npc: 'PNJ',
  resource: 'recurso',
  decoration: 'decoración',
  structural: 'estructura',
  zone: 'zona',
  trigger: 'desencadenador',
  entrance: 'entrada',
  exit: 'salida',
};

/** Clave única para el snapshot de navegación del piso. */
const NAV_KEY = 'navpaint';

/** Documento pequeño del piso activo; no contiene ni consulta datos del exterior. */
export class DungeonEditorDoc {
  readonly data: DungeonFloorMapDef;
  private readonly original: string;
  private paint: PaintState;
  private readonly history = new History();
  private pending: { label: string; before: string } | null = null;
  version = 0;

  constructor(readonly floor: DungeonFloor) {
    // Asegurar que el documento es v2 con overrides y manualObjects
    const map = clone(floor.map);
    if (map.version !== 2) {
      map.version = 2;
      map.overrides = map.overrides ?? {};
      map.manualObjects = map.manualObjects ?? [];
    } else {
      map.overrides ??= {};
      map.manualObjects ??= [];
    }
    this.data = map;
    this.original = JSON.stringify(this.data);
    this.paint = paintFromData(this.data.navPaint, Math.ceil(floor.width / this.data.navPaint.cellSize));
  }

  // ---- Historial independiente (TICKET-2) ---------------------------------

  /** Captura el estado completo del documento como texto serializado. */
  private snapshot(): string {
    return JSON.stringify(this.data);
  }

  /** Empieza un paso de deshacer (p. ej. al pulsar para pintar). */
  begin(label: string): void {
    if (!this.pending) this.pending = { label, before: this.snapshot() };
  }

  /** Cierra el paso: si algo cambió, se apunta en el historial propio. */
  commit(): boolean {
    const p = this.pending;
    this.pending = null;
    if (!p) return false;
    const changed = this.history.record(p.label, { [NAV_KEY]: p.before }, { [NAV_KEY]: this.snapshot() });
    if (changed) this.version++;
    return changed;
  }

  /** ¿Hay pasos que deshacer? */
  canUndo(): boolean {
    return this.history.canUndo;
  }

  /** ¿Hay pasos que rehacer? */
  canRedo(): boolean {
    return this.history.canRedo;
  }

  /** Etiqueta del paso que se desharía con Ctrl+Z. */
  undoLabel(): string | null {
    return this.history.undoLabel;
  }

  /** Etiqueta del paso que se rehacería con Ctrl+Y. */
  redoLabel(): string | null {
    return this.history.redoLabel;
  }

  /** Deshacer: restaura el documento al estado anterior. */
  undo(): string | null {
    if (this.pending) this.commit();
    const c = this.history.undo();
    if (c) {
      const restored = JSON.parse(c.before[NAV_KEY]!) as DungeonFloorMapDef;
      Object.assign(this.data, restored);
      this.data.overrides = this.data.overrides ?? {};
      this.data.manualObjects = this.data.manualObjects ?? [];
      this.paint = paintFromData(this.data.navPaint, Math.ceil(this.floor.width / this.data.navPaint.cellSize));
      this.version++;
    }
    return c?.label ?? null;
  }

  /** Rehacer: restaura el documento al estado después. */
  redo(): string | null {
    const c = this.history.redo();
    if (c) {
      const restored = JSON.parse(c.after[NAV_KEY]!) as DungeonFloorMapDef;
      Object.assign(this.data, restored);
      this.data.overrides = this.data.overrides ?? {};
      this.data.manualObjects = this.data.manualObjects ?? [];
      this.paint = paintFromData(this.data.navPaint, Math.ceil(this.floor.width / this.data.navPaint.cellSize));
      this.version++;
    }
    return c?.label ?? null;
  }

  get scopeId(): string {
    return `${this.data.dungeon}:${this.data.floor}`;
  }

  get dirty(): boolean {
    return JSON.stringify(this.data) !== this.original;
  }

  paintAt(x: number, y: number, radius: number, mode: BrushMode): number {
    const cols = Math.ceil(this.floor.width / this.paint.cellSize);
    const rows = Math.ceil(this.floor.depth / this.paint.cellSize);
    const n = brush(this.paint, cols, rows, x, y, radius, mode);
    if (n) {
      this.data.navPaint = paintToData(this.paint, cols);
      this.version++;
    }
    return n;
  }

  serialize(): string {
    return `${JSON.stringify(this.data, null, 2)}\n`;
  }

  objects(): EditorObject[] {
    const out: EditorObject[] = [];
    const box = (key: string, kind: string, label: string, x: number, y: number, w = 0.8, d = 0.8, h = 1.2, rotDeg = 0): void => {
      out.push({ key, category: 'props', kind, label, x, y, rotDeg, shape: { type: 'box', w, d, h } });
    };

    // ---- Objetos generados por semilla, con overrides aplicados ----
    const overrides = this.data.overrides ?? {};
    const manualIds = new Set((this.data.manualObjects ?? []).map((o) => o.id));

    for (const b of this.floor.breakables) {
      if (manualIds.has(b.id)) continue;
      const ov = overrides[`breakable:${b.id}`];
      if (ov?.visible === false) continue;
      const x = ov?.position?.x ?? b.pos.x;
      const y = ov?.position?.y ?? b.pos.y;
      const rot = ov?.rotation ?? 0;
      const scale = ov?.scale ?? 1;
      box(`d-break:${b.id}`, b.kind, b.kind === 'jar' ? 'jarra de barro' : 'barril', x, y, 0.65 * scale, 0.65 * scale, 0.9 * scale, rot);
    }
    for (const d of this.floor.doors) {
      if (manualIds.has(d.id)) continue;
      const ov = overrides[`door:${d.id}`];
      if (ov?.visible === false) continue;
      const x = ov?.position?.x ?? d.x;
      const y = ov?.position?.y ?? d.y;
      const rot = ov?.rotation ?? 0;
      const scale = ov?.scale ?? 1;
      box(`d-door:${d.id}`, 'door', `puerta · ${d.activation === 'proximity' ? 'automática' : 'clic'}`, x, y, (d.horizontal ? d.span : 0.35) * scale, (d.horizontal ? 0.35 : d.span) * scale, 2.4 * scale, rot);
    }
    for (const c of this.floor.chests) {
      if (manualIds.has(c.id)) continue;
      const ov = overrides[`chest:${c.id}`];
      if (ov?.visible === false) continue;
      const x = ov?.position?.x ?? c.pos.x;
      const y = ov?.position?.y ?? c.pos.y;
      const rot = ov?.rotation ?? 0;
      const scale = ov?.scale ?? 1;
      box(`d-chest:${c.id}`, 'chest', 'cofre', x, y, scale, 0.8 * scale, 0.8 * scale, rot);
    }
    {
      const ov = overrides['stairs:up'];
      if (ov?.visible !== false) {
        const x = ov?.position?.x ?? this.floor.upStairs.x;
        const y = ov?.position?.y ?? this.floor.upStairs.y;
        box('d-up', 'stairs', 'escalera de subida', x, y, 1.5, 1.5, 0.25);
      }
    }
    if (this.floor.downStairs) {
      const ov = overrides['stairs:down'];
      if (ov?.visible !== false) {
        const x = ov?.position?.x ?? this.floor.downStairs.x;
        const y = ov?.position?.y ?? this.floor.downStairs.y;
        box('d-down', 'stairs', 'escalera de bajada', x, y, 1.5, 1.5, 0.25);
      }
    }
    for (const p of this.floor.pools) {
      const ov = overrides[`pool:${p.id}`];
      if (ov?.visible === false) continue;
      const x = ov?.position?.x ?? p.x;
      const y = ov?.position?.y ?? p.y;
      out.push({ key: `d-pool:${p.id}`, category: 'water', kind: 'pool', label: p.name, x, y, rotDeg: 0, shape: { type: 'circle', r: p.radius } });
    }
    this.floor.spawns.forEach((s, i) => {
      const ov = overrides[`spawn:${i}`];
      if (ov?.visible === false) return;
      const x = ov?.position?.x ?? s.pos.x;
      const y = ov?.position?.y ?? s.pos.y;
      const rot = ov?.rotation ?? 0;
      out.push({ key: `d-spawn:${i}`, category: 'npcs', kind: 'spawn', label: `aparición · ${s.archetype}`, x, y, rotDeg: rot, shape: { type: 'cyl', r: 0.45, h: 1.8 } });
    });

    // ---- Objetos manuales (v2) ----
    const manualObjects = this.data.manualObjects ?? [];
    for (const mo of manualObjects) {
      if (mo.visible === false) continue;
      const defaults = MANUAL_DEFAULTS[mo.kind] ?? { w: 0.8, d: 0.8, h: 1.0 };
      const scale = mo.scale ?? 1;
      const label = mo.name ?? MANUAL_LABELS[mo.kind] ?? mo.kind;
      const category = mo.kind === 'chest' ? 'props' :
                       mo.kind === 'spawn' || mo.kind === 'npc' ? 'npcs' :
                       mo.kind === 'zone' || mo.kind === 'trigger' ? 'zones' :
                       mo.kind === 'entrance' || mo.kind === 'exit' ? 'start' :
                       'props';
      out.push({
        key: `d-manual:${mo.id}`,
        category,
        kind: mo.kind,
        label,
        x: mo.position.x,
        y: mo.position.y,
        rotDeg: mo.rotation ?? 0,
        shape: { type: 'box', w: defaults.w * scale, d: defaults.d * scale, h: defaults.h * scale },
      });
    }

    return out;
  }

  find(key: string): EditorObject | null {
    return this.objects().find((o) => o.key === key) ?? null;
  }

  // ---- Objetos manuales (v2) ------------------------------------------------

  /**
   * Añade un objeto manual al piso. Si no se proporciona ID, se genera uno.
   * Usa el PrefabRegistry para propiedades por defecto si no se especifican.
   * Devuelve la clave del objeto añadido (p. ej. `d-manual:manual:123`).
   */
  addObject(kind: ManualObjectKind, x: number, y: number, options?: { id?: string; name?: string; rotation?: number; scale?: number; collision?: boolean; properties?: Record<string, unknown> }): string {
    const id = options?.id ?? generateManualId();

    // Usar PrefabRegistry para propiedades por defecto
    const prefab = prefabRegistry.get(kind);
    const defaultScale = prefab?.scale ?? 1;
    const defaultCollision = prefab?.collision ?? true;
    const defaultName = prefab?.name ?? MANUAL_LABELS[kind] ?? kind;
    const defaultProperties = prefab ? { ...prefab.properties } : {};

    const obj: ManualObject = {
      id,
      kind,
      name: options?.name ?? defaultName,
      position: { x, y },
      scale: options?.scale ?? defaultScale,
      collision: options?.collision ?? defaultCollision,
      visible: true,
      properties: options?.properties ?? defaultProperties,
    };
    if (options?.rotation) obj.rotation = options.rotation;

    const manualObjects = this.data.manualObjects!;
    manualObjects.push(obj);
    this.version++;
    return `d-manual:${id}`;
  }

  /** Duplica como objeto manual un rompible/cofre/puerta generado o manual. */
  duplicate(key: string): string | null {
    const source = this.find(key);
    if (!source || !(['barrel', 'jar', 'chest', 'door'] as string[]).includes(source.kind)) return null;
    const { prefix, rest } = parseEntityId(key);
    const manual = prefix === 'd-manual' ? (this.data.manualObjects ?? []).find((m) => m.id === rest) : undefined;
    return this.addObject(source.kind as ManualObjectKind, source.x + 1, source.y + 1, {
      name: manual?.name ? `${manual.name} (copia)` : `${source.label} (copia)`,
      rotation: manual?.rotation ?? source.rotDeg,
      scale: manual?.scale ?? 1,
      collision: manual?.collision,
      properties: manual?.properties ? clone(manual.properties) : undefined,
    });
  }

  /**
   * Valida las propiedades de un objeto manual contra el esquema del prefab.
   * Devuelve una lista de errores vacía si todo es válido.
   */
  validateObject(key: string): string[] {
    const { prefix, rest } = parseEntityId(key);
    if (prefix !== 'd-manual') return [];
    const mo = (this.data.manualObjects ?? []).find((m) => m.id === rest);
    if (!mo) return [`Objeto no encontrado: ${key}`];
    return prefabRegistry.validateProperties(mo.kind, mo.properties ?? {});
  }

  /**
   * Cambia una propiedad específica del tipo de un objeto manual.
   */
  setProperty(key: string, prop: string, value: unknown): boolean {
    const { prefix, rest } = parseEntityId(key);
    if (prefix !== 'd-manual') return false;
    const mo = (this.data.manualObjects ?? []).find((m) => m.id === rest);
    if (!mo) return false;
    if (!mo.properties) mo.properties = {};
    mo.properties[prop] = value;
    this.version++;
    return true;
  }

  /**
   * Elimina un objeto. Si es manual, se quita de la lista. Si es generado,
   * se añade un override `visible: false` para ocultarlo sin destruir la base.
   */
  removeObject(key: string): boolean {
    // Intentar eliminar objeto manual
    const { prefix, rest } = parseEntityId(key);
    if (prefix === 'd-manual') {
      const manualObjects = this.data.manualObjects!;
      const idx = manualObjects.findIndex((m) => m.id === rest);
      if (idx >= 0) {
        manualObjects.splice(idx, 1);
        this.version++;
        return true;
      }
      return false;
    }

    // Para objetos generados, añadir override visible: false
    const overrideKey = key.startsWith('d-') ? key.slice(2) : key;
    const overrides = this.data.overrides!;
    overrides[overrideKey] = { ...overrides[overrideKey], visible: false };
    this.version++;
    return true;
  }

  /**
   * Establece un override en un objeto generado. El override se aplica
   * sin destruir la definición original del objeto.
   */
  setOverride(key: string, override: EntityOverride): void {
    const overrides = this.data.overrides!;
    const existing = overrides[key];
    overrides[key] = { ...existing, ...override };
    this.version++;
  }

  /** Alterna visibilidad persistente para entidades manuales o generadas. */
  toggleVisibility(key: string): void {
    const { prefix, rest } = parseEntityId(key);
    if (prefix === 'd-manual') {
      const obj = (this.data.manualObjects ?? []).find((m) => m.id === rest);
      if (obj) {
        obj.visible = obj.visible === false;
        this.version++;
      }
      return;
    }
    const overrideKey = key.startsWith('d-') ? key.slice(2) : key;
    const existing = this.data.overrides![overrideKey];
    this.data.overrides![overrideKey] = { ...existing, visible: existing?.visible === false ? undefined : false };
    this.version++;
  }

  /**
   * Mueve un objeto a (x, y). Para objetos manuales, actualiza la posición.
   * Para objetos generados, establece un override de posición.
   */
  moveTo(key: string, x: number, y: number): string {
    x = Math.round(x * 100) / 100;
    y = Math.round(y * 100) / 100;

    const { prefix, rest } = parseEntityId(key);
    if (prefix === 'd-manual') {
      const obj = (this.data.manualObjects ?? []).find((m) => m.id === rest);
      if (obj) {
        obj.position.x = x;
        obj.position.y = y;
        this.version++;
      }
      return key;
    }

    // Para objetos generados, override de posición
    const overrideKey = key.startsWith('d-') ? key.slice(2) : key;
    const overrides = this.data.overrides!;
    const existing = overrides[overrideKey];
    overrides[overrideKey] = { ...existing, position: { x, y } };
    this.version++;
    return key;
  }

  /**
   * Gira un objeto `steps` × 15 grados. Para objetos manuales, actualiza la rotación.
   * Para objetos generados, establece un override de rotación.
   */
  rotate(key: string, steps: number): string {
    const { prefix, rest } = parseEntityId(key);
    if (prefix === 'd-manual') {
      const obj = (this.data.manualObjects ?? []).find((m) => m.id === rest);
      if (obj) {
        obj.rotation = (((obj.rotation ?? 0) + steps * 15) % 360 + 360) % 360;
        this.version++;
      }
      return key;
    }

    const overrideKey = key.startsWith('d-') ? key.slice(2) : key;
    const overrides = this.data.overrides!;
    const existing = overrides[overrideKey];
    const currentRot = existing?.rotation ?? 0;
    overrides[overrideKey] = { ...existing, rotation: (((currentRot + steps * 15) % 360) + 360) % 360 };
    this.version++;
    return key;
  }

  /**
   * Escala un objeto por `factor`. Para objetos manuales, actualiza la escala.
   * Para objetos generados, establece un override de escala.
   */
  scale(key: string, factor: number): string {
    const { prefix, rest } = parseEntityId(key);
    if (prefix === 'd-manual') {
      const obj = (this.data.manualObjects ?? []).find((m) => m.id === rest);
      if (obj) {
        obj.scale = Math.min(10, Math.max(0.05, Math.round((obj.scale ?? 1) * factor * 100) / 100));
        this.version++;
      }
      return key;
    }

    const overrideKey = key.startsWith('d-') ? key.slice(2) : key;
    const overrides = this.data.overrides!;
    const existing = overrides[overrideKey];
    const currentScale = existing?.scale ?? 1;
    overrides[overrideKey] = { ...existing, scale: Math.min(10, Math.max(0.05, Math.round(currentScale * factor * 100) / 100)) };
    this.version++;
    return key;
  }

  /**
   * Propiedades numéricas del objeto para el panel inspector.
   */
  fields(key: string): Array<{ name: string; label: string; value: number; step: number }> {
    const obj = this.find(key);
    if (!obj) return [];
    const transformable = obj.kind === 'barrel' || obj.kind === 'jar' || obj.kind === 'chest';
    const movableDoor = obj.kind === 'door' && !key.startsWith('d-manual:');
    if (!transformable && !movableDoor) return [];
    const f = (name: string, label: string, value: number, step = 0.1) => ({ name, label, value, step });
    const out: Array<{ name: string; label: string; value: number; step: number }> = [
      f('x', 'X', obj.x),
      f('y', 'Z', obj.y),
    ];
    if (movableDoor) return out;
    out.push(f('rotDeg', 'Giro', obj.rotDeg, 15));

    // Si es un objeto manual, añadir escala
    const { prefix, rest } = parseEntityId(key);
    if (prefix === 'd-manual') {
      const mo = (this.data.manualObjects ?? []).find((m) => m.id === rest);
      out.push(f('scale', 'Escala', mo?.scale ?? 1, 0.1));
    } else {
      const overrideKey = key.startsWith('d-') ? key.slice(2) : key;
      const ov = this.data.overrides?.[overrideKey];
      out.push(f('scale', 'Escala', ov?.scale ?? 1, 0.1));
    }

    return out;
  }

  /**
   * Cambia una propiedad numérica del objeto.
   */
  setField(key: string, name: string, value: number): string {
    if (!Number.isFinite(value)) return key;
    if (name === 'x' || name === 'y') {
      const obj = this.find(key);
      if (!obj) return key;
      return this.moveTo(key, name === 'x' ? value : obj.x, name === 'y' ? value : obj.y);
    }
    if (name === 'rotDeg') {
      const obj = this.find(key);
      if (!obj) return key;
      const steps = Math.round((value - obj.rotDeg) / 15);
      return this.rotate(key, steps);
    }
    if (name === 'scale') {
      const { prefix, rest } = parseEntityId(key);
      if (prefix === 'd-manual') {
        const mo = (this.data.manualObjects ?? []).find((m) => m.id === rest);
        if (mo) {
          const current = mo.scale ?? 1;
          const factor = value / current;
          return this.scale(key, factor);
        }
      } else {
        const overrideKey = key.startsWith('d-') ? key.slice(2) : key;
        const ov = this.data.overrides?.[overrideKey];
        const current = ov?.scale ?? 1;
        const factor = value / current;
        return this.scale(key, factor);
      }
    }
    return key;
  }

  /** Vista previa: copia la rejilla jugable ya reconstruida por CryptScene. */
  previewGrid(current: NavGrid): NavGrid {
    const copy = new (current.constructor as new (w: number, d: number, c: number) => NavGrid)(current.width, current.depth, current.cellSize);
    copy.blocked.set(current.blocked);
    copy.applyPaint(this.data.navPaint);
    return copy;
  }
}
