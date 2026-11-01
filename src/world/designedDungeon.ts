import type { Vec2 } from '../sim/vec2';

export type DesignedTile = '#' | '.' | 'U' | 'N' | 'D' | 'B' | 'C' | 'L' | 'P' | 'T' | 'K' | 'S';

export interface DesignedSpawn {
  id: string;
  archetype: string;
  level: number;
  tile: [number, number];
  guardian?: boolean;
}

export interface DesignedDoor {
  id: string;
  tile: [number, number];
  openedBy?: string;
  closesUntilClear?: string;
  shortcut?: boolean;
}

export interface DesignedTrigger {
  id: string;
  kind: 'lever' | 'pressure-plate' | 'timed-trap' | 'clear-room';
  tile: [number, number];
  targets: string[];
  durationSeconds?: number;
}

export interface DesignedFloorDef {
  id: string;
  mode: 'hand' | 'seed';
  rows?: string[];
  spawns?: DesignedSpawn[];
  doors?: DesignedDoor[];
  triggers?: DesignedTrigger[];
  rareSpawn?: {
    id: string;
    archetype: string;
    chance: number;
    tile: [number, number];
    sign: { message: string; sound: string; light: string };
  };
}

export interface DesignedDungeonDef {
  id: string;
  tileSize: number;
  floors: DesignedFloorDef[];
}

export interface FloorValidation {
  ok: boolean;
  errors: string[];
  reachable: Set<string>;
}

const WALKABLE = new Set<DesignedTile>(['.', 'U', 'N', 'D', 'B', 'C', 'L', 'P', 'T', 'K', 'S']);

export function parseRows(rows: readonly string[]): { cols: number; rows: number; cells: string[] } {
  if (rows.length < 3) throw new Error('el piso diseñado necesita al menos 3 filas');
  const cols = rows[0]?.length ?? 0;
  if (cols < 3 || rows.some((r) => r.length !== cols)) throw new Error('todas las filas del piso diseñado deben tener el mismo ancho');
  const cells = rows.flatMap((r) => [...r]);
  for (const tile of cells) if (!WALKABLE.has(tile as DesignedTile) && tile !== '#') throw new Error(`baldosa desconocida: ${tile}`);
  return { cols, rows: rows.length, cells };
}

export function tileToWorld(tile: readonly [number, number], tileSize: number): Vec2 {
  return { x: (tile[0] + 0.5) * tileSize, y: (tile[1] + 0.5) * tileSize };
}

function key(x: number, y: number): string {
  return `${x},${y}`;
}

export function validateDesignedFloor(floor: DesignedFloorDef): FloorValidation {
  if (floor.mode === 'seed') return { ok: true, errors: [], reachable: new Set() };
  const errors: string[] = [];
  let grid: ReturnType<typeof parseRows>;
  try {
    grid = parseRows(floor.rows ?? []);
  } catch (error) {
    return { ok: false, errors: [error instanceof Error ? error.message : String(error)], reachable: new Set() };
  }
  const at = (x: number, y: number): string | undefined => grid.cells[y * grid.cols + x];
  const starts: Array<[number, number]> = [];
  for (let y = 0; y < grid.rows; y++) for (let x = 0; x < grid.cols; x++) if (at(x, y) === 'U') starts.push([x, y]);
  if (starts.length !== 1) errors.push('cada piso manual necesita exactamente una escalera U');
  const ids = new Set<string>();
  for (const door of floor.doors ?? []) {
    if (ids.has(door.id)) errors.push(`puerta duplicada: ${door.id}`);
    ids.add(door.id);
  }
  for (const trigger of floor.triggers ?? []) {
    if (ids.has(trigger.id)) errors.push(`id duplicado: ${trigger.id}`);
    ids.add(trigger.id);
    for (const target of trigger.targets) if (!(floor.doors ?? []).some((d) => d.id === target)) errors.push(`${trigger.id} apunta a una puerta inexistente: ${target}`);
  }
  for (const door of floor.doors ?? []) if (door.openedBy && !(floor.triggers ?? []).some((t) => t.id === door.openedBy)) errors.push(`${door.id} no tiene activador ${door.openedBy}`);
  const reachable = new Set<string>();
  const queue: Array<[number, number]> = starts.length ? [starts[0]!] : [];
  while (queue.length) {
    const [x, y] = queue.shift()!;
    const k = key(x, y);
    if (reachable.has(k)) continue;
    const tile = at(x, y);
    if (!tile || !WALKABLE.has(tile as DesignedTile)) continue;
    reachable.add(k);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) queue.push([x + dx, y + dy]);
  }
  const required: Array<[string, [number, number]]> = [];
  for (let y = 0; y < grid.rows; y++) for (let x = 0; x < grid.cols; x++) if ('UNDBCLKSPT'.includes(at(x, y) ?? '')) required.push([at(x, y)!, [x, y]]);
  for (const spawn of floor.spawns ?? []) required.push([`spawn ${spawn.id}`, spawn.tile]);
  for (const [label, [x, y]] of required) if (!reachable.has(key(x, y))) errors.push(`${label} no es alcanzable en ${x},${y}`);
  if (!(floor.spawns ?? []).some((s) => s.guardian) && (floor.rows ?? []).some((r) => r.includes('B'))) errors.push('la baldosa B necesita un spawn guardian');
  return { ok: errors.length === 0, errors, reachable };
}

export interface DungeonPuzzleState {
  openedDoors: Set<string>;
  activeTriggers: Map<string, number>;
  clearedRooms: Set<string>;
  shortcuts: Set<string>;
}

export function createPuzzleState(): DungeonPuzzleState {
  return { openedDoors: new Set(), activeTriggers: new Map(), clearedRooms: new Set(), shortcuts: new Set() };
}

export function activateTrigger(floor: DesignedFloorDef, state: DungeonPuzzleState, triggerId: string, nowSeconds: number): DungeonPuzzleState {
  const trigger = floor.triggers?.find((t) => t.id === triggerId);
  if (!trigger) return state;
  const next: DungeonPuzzleState = {
    openedDoors: new Set(state.openedDoors),
    activeTriggers: new Map(state.activeTriggers),
    clearedRooms: new Set(state.clearedRooms),
    shortcuts: new Set(state.shortcuts),
  };
  next.activeTriggers.set(trigger.id, trigger.durationSeconds ? nowSeconds + trigger.durationSeconds : Number.POSITIVE_INFINITY);
  for (const target of trigger.targets) {
    next.openedDoors.add(target);
    if (floor.doors?.find((d) => d.id === target)?.shortcut) next.shortcuts.add(target);
  }
  return next;
}

export function tickPuzzle(floor: DesignedFloorDef, state: DungeonPuzzleState, nowSeconds: number): DungeonPuzzleState {
  const next = createPuzzleState();
  for (const room of state.clearedRooms) next.clearedRooms.add(room);
  for (const shortcut of state.shortcuts) next.shortcuts.add(shortcut);
  for (const [id, expires] of state.activeTriggers) {
    if (expires <= nowSeconds) continue;
    next.activeTriggers.set(id, expires);
    const trigger = floor.triggers?.find((t) => t.id === id);
    for (const target of trigger?.targets ?? []) next.openedDoors.add(target);
  }
  for (const shortcut of next.shortcuts) next.openedDoors.add(shortcut);
  return next;
}

export function shouldSpawnRare(floor: DesignedFloorDef, roll: number): boolean {
  return !!floor.rareSpawn && roll >= 0 && roll < floor.rareSpawn.chance;
}
