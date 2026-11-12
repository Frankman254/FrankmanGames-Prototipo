// Documento editable de un solo piso. La geometría base puede seguir siendo
// determinista, pero navegación y variantes de interacción pertenecen siempre
// al piso, nunca al JSON del mundo exterior.
import type { NavPaint } from '../sim/navGrid';

export type DungeonDoorActivation = 'click' | 'proximity';

export interface DungeonFloorMapDef {
  version: 1;
  dungeon: string;
  floor: number;
  generation: { kind: 'seed' | 'hand'; seed: number };
  navPaint: NavPaint;
  doors: Record<string, { activation: DungeonDoorActivation; radius?: number }>;
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
    version: 1,
    dungeon,
    floor: floorIndex + 1,
    generation: { kind, seed },
    navPaint: { cellSize, blocked: [], cleared: [] },
    doors: {},
  };
}

export function parseDungeonFloorMap(raw: unknown, expected: { dungeon: string; floorIndex: number; seed: number; cellSize: number; kind: 'seed' | 'hand' }): DungeonFloorMapDef {
  const fallback = defaultDungeonFloorMap(expected.dungeon, expected.floorIndex, expected.seed, expected.cellSize, expected.kind);
  if (!raw || typeof raw !== 'object') return fallback;
  const o = raw as Record<string, unknown>;
  if (o['dungeon'] !== expected.dungeon || o['floor'] !== expected.floorIndex + 1) throw new Error(`mapa de piso equivocado: ${String(o['dungeon'])}/${String(o['floor'])}`);
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
  return {
    version: 1,
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
}

export function loadDungeonFloorMap(dungeon: string, floorIndex: number, seed: number, cellSize: number, kind: 'seed' | 'hand'): DungeonFloorMapDef {
  const path = `/${dungeonFloorPath(dungeon, floorIndex).replaceAll('\\', '/')}`;
  const text = RAW_FLOORS[path];
  return parseDungeonFloorMap(text ? JSON.parse(text) : null, { dungeon, floorIndex, seed, cellSize, kind });
}
