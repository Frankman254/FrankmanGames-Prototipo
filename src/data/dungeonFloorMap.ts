// Documento editable de un solo piso. La geometría base puede seguir siendo
// determinista, pero navegación y variantes de interacción pertenecen siempre
// al piso, nunca al JSON del mundo exterior.
import type { NavPaint } from '../sim/navGrid';

export type DungeonDoorActivation = 'click' | 'proximity';

/** Tipos de objetos que se pueden colocar manualmente en un piso. */
export type ManualObjectKind =
  | 'chest' | 'barrel' | 'jar' | 'door' | 'torch'
  | 'spawn' | 'npc' | 'resource' | 'decoration'
  | 'structural' | 'zone' | 'trigger' | 'entrance' | 'exit';

/** Override de propiedades para un objeto generado por semilla. */
export interface EntityOverride {
  visible?: boolean;
  position?: { x: number; y: number; z?: number };
  rotation?: number;
  scale?: number;
  category?: string;
  properties?: Record<string, unknown>;
}

/** Objeto colocado a mano en el editor. */
export interface ManualObject {
  id: string;
  kind: ManualObjectKind;
  name?: string;
  position: { x: number; y: number; z?: number };
  rotation?: number;
  scale?: number;
  visible?: boolean;
  collision?: boolean;
  properties?: Record<string, unknown>;
}

export interface DungeonFloorMapDef {
  version: 1 | 2;
  dungeon: string;
  floor: number;
  generation: { kind: 'seed' | 'hand'; seed: number };
  navPaint: NavPaint;
  doors: Record<string, { activation: DungeonDoorActivation; radius?: number }>;
  // v2: objetos manuales y overrides
  overrides?: Record<string, EntityOverride>;
  manualObjects?: ManualObject[];
}

const RAW_FLOORS = import.meta.glob('/data/dungeons/*/floors/*.json', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export function dungeonFloorPath(dungeon: string, floorIndex: number): string {
  return `data/dungeons/${dungeon}/floors/${String(floorIndex + 1).padStart(3, '0')}.json`;
}

export function defaultDungeonFloorMap(dungeon: string, floorIndex: number, seed: number, cellSize: number, kind: 'seed' | 'hand'): DungeonFloorMapDef {
  return {
    version: 2,
    dungeon,
    floor: floorIndex + 1,
    generation: { kind, seed },
    navPaint: { cellSize, blocked: [], cleared: [] },
    doors: {},
    overrides: {},
    manualObjects: [],
  };
}

const VALID_KINDS: ReadonlySet<ManualObjectKind> = new Set([
  'chest', 'barrel', 'jar', 'door', 'torch',
  'spawn', 'npc', 'resource', 'decoration',
  'structural', 'zone', 'trigger', 'entrance', 'exit',
]);

/**
 * Parsea un ID de entidad sin romper los separadores internos.
 * Los IDs de objetos generados usan el formato `prefix:index` (p. ej. `d-chest:0`),
 * pero los IDs manuales pueden contener dos puntos. Usamos split limitado para
 * extraer solo el prefijo y el resto del ID.
 */
export function parseEntityId(id: string): { prefix: string; rest: string } {
  const colonIdx = id.indexOf(':');
  if (colonIdx < 0) return { prefix: id, rest: '' };
  return { prefix: id.slice(0, colonIdx), rest: id.slice(colonIdx + 1) };
}

export function parseDungeonFloorMap(raw: unknown, expected: { dungeon: string; floorIndex: number; seed: number; cellSize: number; kind: 'seed' | 'hand' }): DungeonFloorMapDef {
  const fallback = defaultDungeonFloorMap(expected.dungeon, expected.floorIndex, expected.seed, expected.cellSize, expected.kind);
  if (!raw || typeof raw !== 'object') return fallback;
  const o = raw as Record<string, unknown>;
  if (o['dungeon'] !== expected.dungeon || o['floor'] !== expected.floorIndex + 1) throw new Error(`mapa de piso equivocado: ${String(o['dungeon'])}/${String(o['floor'])}`);

  // Versión: si no hay version o es 1, se migra a 2.
  const version = (typeof o['version'] === 'number' && o['version'] >= 2) ? 2 : 1;

  const nav = o['navPaint'] as Record<string, unknown> | undefined;
  const spans = (value: unknown): Array<[number, number, number]> => Array.isArray(value)
    ? value.map((v) => {
        if (!Array.isArray(v) || v.length !== 3 || v.some((n) => !Number.isInteger(n))) throw new Error('tramo de navegación inválido');
        return [v[0] as number, v[1] as number, v[2] as number];
      })
    : [];
  const doors: DungeonFloorMapDef['doors'] = {};
  if (o['doors'] && typeof o['doors'] === 'object') {
    for (const [id, value] of Object.entries(o['doors'] as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue;
      const d = value as Record<string, unknown>;
      const activation = d['activation'];
      if (activation !== 'click' && activation !== 'proximity') throw new Error(`${id}: activación de puerta inválida`);
      const radius = typeof d['radius'] === 'number' && Number.isFinite(d['radius']) ? Math.max(0.5, d['radius']) : undefined;
      doors[id] = { activation, ...(radius === undefined ? {} : { radius }) };
    }
  }

  // v2: overrides
  const overrides: DungeonFloorMapDef['overrides'] = {};
  if (version >= 2 && o['overrides'] && typeof o['overrides'] === 'object') {
    for (const [id, value] of Object.entries(o['overrides'] as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue;
      const ov = value as Record<string, unknown>;
      const entry: EntityOverride = {};
      if (typeof ov['visible'] === 'boolean') entry.visible = ov['visible'];
      if (ov['position'] && typeof ov['position'] === 'object') {
        const p = ov['position'] as Record<string, unknown>;
        if (typeof p['x'] === 'number' && typeof p['y'] === 'number') {
          entry.position = { x: p['x'], y: p['y'], ...(typeof p['z'] === 'number' ? { z: p['z'] } : {}) };
        }
      }
      if (typeof ov['rotation'] === 'number') entry.rotation = ov['rotation'];
      if (typeof ov['scale'] === 'number') entry.scale = ov['scale'];
      if (typeof ov['category'] === 'string') entry.category = ov['category'];
      if (ov['properties'] && typeof ov['properties'] === 'object') entry.properties = ov['properties'] as Record<string, unknown>;
      overrides[id] = entry;
    }
  }

  // v2: manualObjects
  const manualObjects: DungeonFloorMapDef['manualObjects'] = [];
  if (version >= 2 && Array.isArray(o['manualObjects'])) {
    for (const item of o['manualObjects']) {
      if (!item || typeof item !== 'object') continue;
      const m = item as Record<string, unknown>;
      const id = m['id'];
      const kind = m['kind'];
      const pos = m['position'];
      if (typeof id !== 'string' || typeof kind !== 'string' || !VALID_KINDS.has(kind as ManualObjectKind)) continue;
      if (!pos || typeof pos !== 'object') continue;
      const p = pos as Record<string, unknown>;
      if (typeof p['x'] !== 'number' || typeof p['y'] !== 'number') continue;
      const entry: ManualObject = {
        id,
        kind: kind as ManualObjectKind,
        position: { x: p['x'], y: p['y'], ...(typeof p['z'] === 'number' ? { z: p['z'] } : {}) },
      };
      if (typeof m['name'] === 'string') entry.name = m['name'];
      if (typeof m['rotation'] === 'number') entry.rotation = m['rotation'];
      if (typeof m['scale'] === 'number') entry.scale = m['scale'];
      if (typeof m['visible'] === 'boolean') entry.visible = m['visible'];
      if (typeof m['collision'] === 'boolean') entry.collision = m['collision'];
      if (m['properties'] && typeof m['properties'] === 'object') entry.properties = m['properties'] as Record<string, unknown>;
      manualObjects.push(entry);
    }
  }

  const result: DungeonFloorMapDef = {
    version: version as 1 | 2,
    dungeon: expected.dungeon,
    floor: expected.floorIndex + 1,
    generation: { kind: expected.kind, seed: expected.seed },
    navPaint: {
      cellSize: typeof nav?.['cellSize'] === 'number' ? nav['cellSize'] : expected.cellSize,
      blocked: spans(nav?.['blocked']),
      cleared: spans(nav?.['cleared']),
    },
    doors,
  };

  // Solo añadir v2 fields si la versión lo permite
  if (version >= 2) {
    result.overrides = overrides;
    result.manualObjects = manualObjects;
  }

  return result;
}

export function loadDungeonFloorMap(dungeon: string, floorIndex: number, seed: number, cellSize: number, kind: 'seed' | 'hand'): DungeonFloorMapDef {
  const path = `/${dungeonFloorPath(dungeon, floorIndex).replaceAll('\\', '/')}`;
  const text = RAW_FLOORS[path];
  return parseDungeonFloorMap(text ? JSON.parse(text) : null, { dungeon, floorIndex, seed, cellSize, kind });
}
