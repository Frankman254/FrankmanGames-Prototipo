// Pisos de mazmorra generados con semilla (`data/dungeon.json`): salas
// rectangulares unidas por pasillos en L sobre una rejilla de baldosas, con
// escaleras, cofres, antorchas y la lista de monstruos con su nivel. Sólo datos;
// nada de DOM ni de render, para poder probarlo y reconstruir el `World`.
//   · Un piso es siempre el mismo: semilla = seed + índice × 7919.
//   · Coordenadas en metros del plano XZ, como el resto de la simulación
//     (`Vec2.y` es la Z del render).
import type { GameData } from '../data';
import { loadDungeonFloorMap, type DungeonFloorMapDef } from '../data/dungeonFloorMap';
import type { DungeonDef, DungeonFloorDef, DungeonThemeDef } from '../data/dungeonSchema';
import type { LootTableDef } from '../rpg/contracts';
import type { FishingSpotDef } from '../rpg/content';
import type { NavGrid, RectObstacle } from '../sim/navGrid';
import { Rng } from '../sim/rng';
import type { Vec2 } from '../sim/vec2';
import designedDungeonJson from '../../data/dungeons/cripta-tulivieja.json';
import { parseRows, shouldSpawnRare, tileToWorld, validateDesignedFloor, type DesignedDungeonDef, type DesignedFloorDef } from './designedDungeon';

/** Sala en baldosas: [x0, x0 + w) × [y0, y0 + h). */
export interface Room {
  x0: number;
  y0: number;
  w: number;
  h: number;
}

export interface DungeonChest {
  /** Id estable dentro del piso (para recordar los cofres ya abiertos). */
  id: string;
  pos: Vec2;
}

/** Antorcha en una pared: posición junto a la cara y normal hacia la sala. */
export interface DungeonTorch {
  x: number;
  y: number;
  nx: number;
  ny: number;
}

export interface DungeonSpawn {
  archetype: string;
  pos: Vec2;
  level: number;
  guardian: boolean;
  rare?: boolean;
}

/**
 * Puerta en la boca de una sala: tapa `cells` (baldosas de suelo del anillo de fuera de la sala)
 * mientras está cerrada. `horizontal` = la hoja va a lo largo de X (pared de arriba o de abajo).
 */
export interface DungeonDoor {
  id: string;
  /** Interacción manual o apertura automática exclusiva del jugador. */
  activation: 'click' | 'proximity';
  activationRadius?: number;
  room: number;
  x: number;
  y: number;
  /** Ancho del hueco en metros. */
  span: number;
  horizontal: boolean;
  cells: Array<{ c: number; r: number }>;
}

/** Jarra o barril junto a una pared de sala: se rompe con un clic. */
export interface DungeonBreakable {
  id: string;
  kind: 'jar' | 'barrel';
  pos: Vec2;
}

/** Bichos escondidos en una sala que salen cuando el jugador entra en ella. */
export interface DungeonAmbush {
  id: string;
  room: number;
  spawns: DungeonSpawn[];
}

export interface DungeonFloor {
  /** 0 = primer piso. */
  index: number;
  /** Documento aislado y editable de este piso. */
  map: DungeonFloorMapDef;
  def: DungeonFloorDef;
  theme: DungeonThemeDef;
  cols: number;
  rows: number;
  tileSize: number;
  width: number;
  depth: number;
  /** 1 = suelo, 0 = roca. */
  cells: Uint8Array;
  rooms: Room[];
  startRoom: number;
  /** Sala más lejana (por los pasillos) de la de llegada: escalera de bajada o guardián. */
  exitRoom: number;
  /** Pares de salas unidas por un pasillo. */
  links: Array<[number, number]>;
  upStairs: Vec2;
  downStairs: Vec2 | null;
  /** Dónde aparece el jugador al bajar desde arriba (junto a la escalera de subida). */
  arrivalFromAbove: Vec2;
  /** Dónde aparece al subir desde el piso de abajo (junto a la escalera de bajada). */
  arrivalFromBelow: Vec2;
  chests: DungeonChest[];
  torches: DungeonTorch[];
  spawns: DungeonSpawn[];
  /** Estanques de pesca (agua en el centro de salas grandes). */
  pools: FishingSpotDef[];
  doors: DungeonDoor[];
  breakables: DungeonBreakable[];
  ambushes: DungeonAmbush[];
  /** Roca como rectángulos fusionados (rejilla de colisión). */
  obstacles: RectObstacle[];
  /** Baldosas de roca que tocan suelo (las únicas que se dibujan como muro). */
  wallTiles: Array<{ c: number; r: number }>;
  /** Muros fusionados en rectángulos (cámara). */
  wallRects: RectObstacle[];
}

const FLOOR_SEED_STEP = 7919;
/** Lado mínimo (baldosas) de una sala con estanque, y margen seco (m) alrededor del agua. */
const POOL_MIN_ROOM = 8;
const POOL_MARGIN = 1.2;
/** Nada de jarras junto a las escaleras ni donde aparece el jugador (m). */
const STAIRS_CLEARANCE = 2.5;
/** Una boca más ancha que esto (baldosas) es un pasillo que pasa rozando: no lleva puerta. */
const DOOR_MAX_SPAN = 3;
const DESIGNED_DUNGEON = designedDungeonJson as unknown as DesignedDungeonDef;

export function floorSeed(def: DungeonDef, index: number): number {
  return (def.seed + index * FLOOR_SEED_STEP) >>> 0;
}

/** Centro de la baldosa (c, r) en metros. */
export function tileCenter(tileSize: number, c: number, r: number): Vec2 {
  return { x: (c + 0.5) * tileSize, y: (r + 0.5) * tileSize };
}

function roomCenterTile(rm: Room): { c: number; r: number } {
  return { c: rm.x0 + Math.floor(rm.w / 2), r: rm.y0 + Math.floor(rm.h / 2) };
}

function overlaps(a: Room, b: Room, gap: number): boolean {
  return a.x0 - gap < b.x0 + b.w && b.x0 - gap < a.x0 + a.w && a.y0 - gap < b.y0 + b.h && b.y0 - gap < a.y0 + a.h;
}

function pickWeighted<T extends { weight: number }>(rng: Rng, list: readonly T[]): T {
  const total = list.reduce((s, e) => s + e.weight, 0);
  let x = rng.next() * total;
  for (const e of list) {
    x -= e.weight;
    if (x < 0) return e;
  }
  return list[list.length - 1]!;
}

/** Fusiona las baldosas marcadas en rectángulos (tiras por fila que se alargan hacia abajo). */
export function mergeRects(mask: Uint8Array, cols: number, rows: number, tileSize: number): RectObstacle[] {
  const used = new Uint8Array(mask.length);
  const out: RectObstacle[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      if (!mask[i] || used[i]) continue;
      let w = 1;
      while (c + w < cols && mask[i + w] && !used[i + w]) w++;
      let h = 1;
      grow: while (r + h < rows) {
        for (let k = 0; k < w; k++) {
          const j = (r + h) * cols + c + k;
          if (!mask[j] || used[j]) break grow;
        }
        h++;
      }
      for (let dy = 0; dy < h; dy++) for (let k = 0; k < w; k++) used[(r + dy) * cols + c + k] = 1;
      out.push({ x: (c + w / 2) * tileSize, y: (r + h / 2) * tileSize, w: w * tileSize, d: h * tileSize });
    }
  }
  return out;
}

/** Distancia en baldosas de suelo desde (c, r) a todas (BFS en 4 direcciones); -1 = inalcanzable. */
export function floodDistances(cells: Uint8Array, cols: number, rows: number, c: number, r: number): Int32Array {
  const dist = new Int32Array(cells.length).fill(-1);
  const start = r * cols + c;
  if (!cells[start]) return dist;
  const queue = new Int32Array(cells.length);
  let head = 0;
  let tail = 0;
  queue[tail++] = start;
  dist[start] = 0;
  while (head < tail) {
    const i = queue[head++]!;
    const x = i % cols;
    const y = (i - x) / cols;
    const next = [x > 0 ? i - 1 : -1, x < cols - 1 ? i + 1 : -1, y > 0 ? i - cols : -1, y < rows - 1 ? i + cols : -1];
    for (const j of next) {
      if (j < 0 || !cells[j] || dist[j]! >= 0) continue;
      dist[j] = (dist[i] ?? 0) + 1;
      queue[tail++] = j;
    }
  }
  return dist;
}

function generateHandFloor(def: DungeonDef, index: number, hand: DesignedFloorDef): DungeonFloor {
  const checked = validateDesignedFloor(hand);
  if (!checked.ok) throw new Error(`[dungeon] piso manual ${hand.id}: ${checked.errors.join('; ')}`);
  const fd = def.floors[index]!;
  const theme = def.themes[fd.theme]!;
  const grid = parseRows(hand.rows ?? []);
  const cells = new Uint8Array(grid.cells.map((tile) => tile === '#' ? 0 : 1));
  const tiles = (symbol?: string): Array<[number, number]> => {
    const out: Array<[number, number]> = [];
    for (let r = 0; r < grid.rows; r++) for (let c = 0; c < grid.cols; c++) if (symbol ? grid.cells[r * grid.cols + c] === symbol : cells[r * grid.cols + c]) out.push([c, r]);
    return out;
  };
  const up = tiles('U')[0]!;
  const down = tiles('N')[0] ?? null;
  const boss = hand.spawns?.find((s) => s.guardian)?.tile ?? null;
  const exit = down ?? boss ?? tiles().at(-1)!;
  const roomTiles = [up, ...tiles().filter(([c, r]) => (c !== up[0] || r !== up[1]) && (c !== exit[0] || r !== exit[1])).slice(0, Math.max(0, fd.rooms.min - 2)), exit];
  const rooms: Room[] = roomTiles.map(([c, r]) => ({ x0: c, y0: r, w: 1, h: 1 }));
  const links: Array<[number, number]> = rooms.slice(1).map((_, i) => [i, i + 1]);
  const ts = DESIGNED_DUNGEON.tileSize || def.tileSize;
  const at = (tile: readonly [number, number]): Vec2 => tileToWorld(tile, ts);
  const beside = ([c, r]: readonly [number, number]): Vec2 => {
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) if (cells[(r + dr) * grid.cols + c + dc]) return at([c + dc, r + dr]);
    return at([c, r]);
  };
  const spawns: DungeonSpawn[] = (hand.spawns ?? []).map((spawn) => ({ archetype: spawn.archetype, pos: at(spawn.tile), level: spawn.level, guardian: !!spawn.guardian }));
  if (hand.rareSpawn) {
    const rng = new Rng(floorSeed(def, index));
    if (shouldSpawnRare(hand, rng.next())) spawns.push({ archetype: hand.rareSpawn.archetype, pos: at(hand.rareSpawn.tile), level: fd.levelMax + 2, guardian: false, rare: true });
  }
  const chestTiles = tiles('C');
  const extraChestTiles = tiles().filter(([c, r]) => !chestTiles.some((p) => p[0] === c && p[1] === r) && !(c === up[0] && r === up[1]));
  while (chestTiles.length < fd.chests && extraChestTiles.length) chestTiles.push(extraChestTiles.splice(Math.floor(extraChestTiles.length / 2), 1)[0]!);
  const chests: DungeonChest[] = chestTiles.slice(0, fd.chests).map((tile, i) => ({ id: `${index}:hand:${i}`, pos: at(tile) }));
  const floorMap = loadDungeonFloorMap('cripta-tulivieja', index, floorSeed(def, index), def.tileSize / 3, 'hand');
  const doors: DungeonDoor[] = (hand.doors ?? []).map((door) => {
    const [c, r] = door.tile;
    const verticalPassage = !!cells[(r - 1) * grid.cols + c] && !!cells[(r + 1) * grid.cols + c];
    let room = 0;
    let best = Number.POSITIVE_INFINITY;
    roomTiles.forEach(([rc, rr], i) => {
      const d = (rc - c) ** 2 + (rr - r) ** 2;
      if (d < best) {
        best = d;
        room = i;
      }
    });
    const pos = at(door.tile);
    return {
      id: door.id,
      activation: floorMap.doors[door.id]?.activation ?? door.activation ?? 'click',
      ...(floorMap.doors[door.id]?.radius === undefined ? {} : { activationRadius: floorMap.doors[door.id]!.radius }),
      room,
      x: pos.x,
      y: pos.y,
      span: ts,
      horizontal: verticalPassage,
      cells: [{ c, r }],
    };
  });
  const wallTiles: Array<{ c: number; r: number }> = [];
  const wallMask = new Uint8Array(cells.length);
  for (let r = 0; r < grid.rows; r++) for (let c = 0; c < grid.cols; c++) {
    if (cells[r * grid.cols + c]) continue;
    const touches = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).some(([dc, dr]) => cells[(r + dr) * grid.cols + c + dc]);
    if (touches) {
      wallTiles.push({ c, r });
      wallMask[r * grid.cols + c] = 1;
    }
  }
  const torches: DungeonTorch[] = wallTiles.filter((_, i) => i % def.light.torchEvery === 0).map(({ c, r }) => ({ x: (c + 0.5) * ts, y: (r + 0.5) * ts, nx: 0, ny: 1 }));
  const solid = new Uint8Array(cells.length);
  for (let i = 0; i < cells.length; i++) solid[i] = cells[i] ? 0 : 1;
  return {
    index,
    map: floorMap,
    def: fd,
    theme,
    cols: grid.cols,
    rows: grid.rows,
    tileSize: ts,
    width: grid.cols * ts,
    depth: grid.rows * ts,
    cells,
    rooms,
    startRoom: 0,
    exitRoom: rooms.length - 1,
    links,
    upStairs: at(up),
    downStairs: down ? at(down) : null,
    arrivalFromAbove: beside(up),
    arrivalFromBelow: beside(exit),
    chests,
    torches,
    spawns,
    pools: [],
    doors,
    breakables: [],
    ambushes: [],
    obstacles: mergeRects(solid, grid.cols, grid.rows, ts),
    wallTiles,
    wallRects: mergeRects(wallMask, grid.cols, grid.rows, ts),
  };
}

/** Genera el piso `index` (0 = el primero) de forma determinista. */
export function generateFloor(def: DungeonDef, index: number): DungeonFloor {
  const fd = def.floors[index];
  if (!fd) throw new Error(`[dungeon] no hay piso ${index}`);
  const designed = DESIGNED_DUNGEON.floors[index];
  if (designed?.mode === 'hand') return generateHandFloor(def, index, designed);
  const theme = def.themes[fd.theme]!;
  const floorMap = loadDungeonFloorMap('cripta-tulivieja', index, floorSeed(def, index), def.tileSize / 3, 'seed');
  const rng = new Rng(floorSeed(def, index));
  const { cols, rows } = fd;
  const ts = def.tileSize;
  const cells = new Uint8Array(cols * rows);
  const set = (c: number, r: number): void => {
    if (c >= 1 && r >= 1 && c < cols - 1 && r < rows - 1) cells[r * cols + c] = 1;
  };

  // Salas: intentos al azar sin solaparse (con dos baldosas de roca entre medias).
  const target = rng.int(fd.rooms.min, fd.rooms.max);
  const rooms: Room[] = [];
  for (let tries = 0; tries < 600 && rooms.length < target; tries++) {
    const w = rng.int(fd.roomSize.min, fd.roomSize.max);
    const h = rng.int(fd.roomSize.min, fd.roomSize.max);
    if (w > cols - 4 || h > rows - 4) continue;
    const rm = { x0: rng.int(2, cols - w - 2), y0: rng.int(2, rows - h - 2), w, h };
    if (rooms.some((o) => overlaps(o, rm, 2))) continue;
    rooms.push(rm);
  }
  if (rooms.length < 2) throw new Error(`[dungeon] piso ${index}: no caben dos salas en ${cols}×${rows}`);
  for (const rm of rooms) for (let r = rm.y0; r < rm.y0 + rm.h; r++) for (let c = rm.x0; c < rm.x0 + rm.w; c++) set(c, r);

  // Pasillos: árbol de expansión mínima (Prim, distancia Manhattan entre centros) y algún bucle.
  const centers = rooms.map(roomCenterTile);
  const md = (a: number, b: number): number => Math.abs(centers[a]!.c - centers[b]!.c) + Math.abs(centers[a]!.r - centers[b]!.r);
  const links: Array<[number, number]> = [];
  const inTree = new Set<number>([0]);
  while (inTree.size < rooms.length) {
    let best: [number, number] | null = null;
    for (const a of inTree) for (let b = 0; b < rooms.length; b++) if (!inTree.has(b) && (!best || md(a, b) < md(best[0], best[1]))) best = [a, b];
    links.push(best!);
    inTree.add(best![1]);
  }
  const linked = (a: number, b: number): boolean => links.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  const extra: Array<[number, number]> = [];
  for (let a = 0; a < rooms.length; a++) for (let b = a + 1; b < rooms.length; b++) if (!linked(a, b)) extra.push([a, b]);
  extra.sort((p, q) => md(p[0], p[1]) - md(q[0], q[1]));
  const pool = extra.slice(0, fd.extraLinks * 3);
  for (let k = 0; k < fd.extraLinks && pool.length > 0; k++) links.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]!);

  const cw = def.corridorWidth;
  const lo = Math.floor((cw - 1) / 2);
  const carveH = (r: number, c0: number, c1: number): void => {
    for (let c = Math.min(c0, c1) - lo; c <= Math.max(c0, c1) - lo + cw - 1; c++) for (let k = 0; k < cw; k++) set(c, r - lo + k);
  };
  const carveV = (c: number, r0: number, r1: number): void => {
    for (let r = Math.min(r0, r1) - lo; r <= Math.max(r0, r1) - lo + cw - 1; r++) for (let k = 0; k < cw; k++) set(c - lo + k, r);
  };
  for (const [a, b] of links) {
    const p = centers[a]!;
    const q = centers[b]!;
    if (rng.chance(0.5)) {
      carveH(p.r, p.c, q.c);
      carveV(q.c, p.r, q.r);
    } else {
      carveV(p.c, p.r, q.r);
      carveH(q.r, p.c, q.c);
    }
  }

  // Llegada en la primera sala; salida en la más lejana por los pasillos.
  const startRoom = 0;
  const s0 = centers[startRoom]!;
  const dist = floodDistances(cells, cols, rows, s0.c, s0.r);
  let exitRoom = 1;
  for (let i = 1; i < rooms.length; i++) {
    const c = centers[i]!;
    if (dist[c.r * cols + c.c]! > dist[centers[exitRoom]!.r * cols + centers[exitRoom]!.c]!) exitRoom = i;
  }
  const isLast = index === def.floors.length - 1;
  const at = (t: { c: number; r: number }): Vec2 => tileCenter(ts, t.c, t.r);
  const upStairs = at(centers[startRoom]!);
  const downStairs = isLast ? null : at(centers[exitRoom]!);
  /** Una baldosa de suelo a dos de la escalera (prueba a los lados de la sala). */
  const beside = (t: { c: number; r: number }): Vec2 => {
    for (const [dc, dr] of [[2, 0], [-2, 0], [0, 2], [0, -2]] as const) if (cells[(t.r + dr) * cols + t.c + dc]) return tileCenter(ts, t.c + dc, t.r + dr);
    return at(t);
  };
  const arrivalFromAbove = beside(centers[startRoom]!);
  const arrivalFromBelow = beside(centers[exitRoom]!);

  // Estanques: agua en el centro de salas grandes (ni la de llegada ni la de salida), con dos
  // baldosas de orilla alrededor para rodearla.
  const pools: FishingSpotDef[] = [];
  const poolRooms = rooms.map((_, i) => i).filter((i) => i !== startRoom && i !== exitRoom && Math.min(rooms[i]!.w, rooms[i]!.h) >= POOL_MIN_ROOM);
  for (let k = 0; k < fd.pools && poolRooms.length > 0; k++) {
    const ri = poolRooms.splice(rng.int(0, poolRooms.length - 1), 1)[0]!;
    const rm = rooms[ri]!;
    pools.push({ id: `pool:${index}:${ri}`, name: 'Estanque de la cripta', x: (rm.x0 + rm.w / 2) * ts, y: (rm.y0 + rm.h / 2) * ts, radius: ((Math.min(rm.w, rm.h) - 4) * ts) / 2, lootTable: fd.poolLootTable, nightLootTable: fd.poolNightLootTable });
  }
  /** Lejos del agua (con margen para el cuerpo del monstruo o el objeto). */
  const dry = (p: Vec2): boolean => pools.every((o) => Math.hypot(p.x - o.x, p.y - o.y) > o.radius + POOL_MARGIN);

  // Monstruos: por sala (no en la de llegada), lejos del borde de la sala y del agua.
  const spawns: DungeonSpawn[] = [];
  const inside = (rm: Room): Vec2 => {
    const pick = (): Vec2 => tileCenter(ts, rng.int(rm.x0 + 1, rm.x0 + rm.w - 2), rng.int(rm.y0 + 1, rm.y0 + rm.h - 2));
    let p = pick();
    for (let t = 0; t < 30 && !dry(p); t++) p = pick();
    return p;
  };
  rooms.forEach((rm, i) => {
    if (i === startRoom) return;
    const n = rng.int(fd.enemiesPerRoom.min, fd.enemiesPerRoom.max);
    for (let k = 0; k < n; k++) {
      const s = pickWeighted(rng, fd.spawns);
      spawns.push({ archetype: s.archetype, pos: inside(rm), level: rng.int(fd.levelMin, fd.levelMax) + s.levelBonus, guardian: false });
    }
  });
  // El guardián espera junto a la bajada (o en el centro de la última sala).
  if (fd.guardian) spawns.push({ archetype: fd.guardian.archetype, pos: downStairs ? arrivalFromBelow : at(centers[exitRoom]!), level: fd.guardian.level, guardian: true });

  // Cofres: en una esquina de salas al azar (ni la de llegada ni, si se puede, la de salida).
  const candidates = rooms.map((_, i) => i).filter((i) => i !== startRoom && i !== exitRoom);
  if (candidates.length < fd.chests) candidates.push(exitRoom);
  const chests: DungeonChest[] = [];
  for (let k = 0; k < fd.chests && candidates.length > 0; k++) {
    const ri = candidates.splice(rng.int(0, candidates.length - 1), 1)[0]!;
    const rm = rooms[ri]!;
    const c = rng.chance(0.5) ? rm.x0 + 1 : rm.x0 + rm.w - 2;
    const r = rng.chance(0.5) ? rm.y0 + 1 : rm.y0 + rm.h - 2;
    chests.push({ id: `${index}:${ri}`, pos: tileCenter(ts, c, r) });
  }

  // Muros visibles: roca con algún vecino (8 direcciones) de suelo.
  const wallMask = new Uint8Array(cells.length);
  const wallTiles: Array<{ c: number; r: number }> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (cells[r * cols + c]) continue;
      let touches = false;
      for (let dr = -1; dr <= 1 && !touches; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const x = c + dc;
          const y = r + dr;
          if (x >= 0 && y >= 0 && x < cols && y < rows && cells[y * cols + x]) {
            touches = true;
            break;
          }
        }
      }
      if (touches) {
        wallMask[r * cols + c] = 1;
        wallTiles.push({ c, r });
      }
    }
  }

  // Antorchas: recorriendo el contorno de cada sala, una cada `torchEvery` baldosas de muro.
  const torches: DungeonTorch[] = [];
  for (const rm of rooms) {
    const ring: Array<{ c: number; r: number; nx: number; ny: number }> = [];
    for (let c = rm.x0; c < rm.x0 + rm.w; c++) ring.push({ c, r: rm.y0 - 1, nx: 0, ny: 1 });
    for (let r = rm.y0; r < rm.y0 + rm.h; r++) ring.push({ c: rm.x0 + rm.w, r, nx: -1, ny: 0 });
    for (let c = rm.x0 + rm.w - 1; c >= rm.x0; c--) ring.push({ c, r: rm.y0 + rm.h, nx: 0, ny: -1 });
    for (let r = rm.y0 + rm.h - 1; r >= rm.y0; r--) ring.push({ c: rm.x0 - 1, r, nx: 1, ny: 0 });
    const offset = rng.int(0, def.light.torchEvery - 1);
    ring.forEach((t, k) => {
      if ((k + offset) % def.light.torchEvery !== 0 || cells[t.r * cols + t.c]) return;
      const p = tileCenter(ts, t.c, t.r);
      torches.push({ x: p.x + t.nx * ts * 0.5, y: p.y + t.ny * ts * 0.5, nx: t.nx, ny: t.ny });
    });
  }

  const doors = placeDoors(rng, fd, rooms, cells, cols, rows, ts, index);
  for (const door of doors) {
    const override = floorMap.doors[door.id];
    door.activation = override?.activation ?? door.activation;
    if (override?.radius !== undefined) door.activationRadius = override.radius;
  }
  const stairsClear = (p: Vec2): boolean => [upStairs, downStairs, arrivalFromAbove, arrivalFromBelow].every((q) => !q || Math.hypot(p.x - q.x, p.y - q.y) > STAIRS_CLEARANCE);
  const breakables = placeBreakables(rng, fd, rooms, cells, cols, ts, index, (p) => dry(p) && stairsClear(p) && chests.every((c) => Math.hypot(p.x - c.pos.x, p.y - c.pos.y) > 1));

  // Emboscadas: salas (ni la de llegada ni la de salida) con bichos escondidos de más nivel.
  const ambushes: DungeonAmbush[] = [];
  rooms.forEach((rm, ri) => {
    if (ri === startRoom || ri === exitRoom || !rng.chance(fd.ambushChance)) return;
    const n = rng.int(fd.enemiesPerRoom.min, fd.enemiesPerRoom.max) + 1;
    const list: DungeonSpawn[] = [];
    for (let k = 0; k < n; k++) {
      const s = pickWeighted(rng, fd.spawns);
      list.push({ archetype: s.archetype, pos: inside(rm), level: Math.min(100, fd.levelMax + 1 + s.levelBonus), guardian: false });
    }
    ambushes.push({ id: `${index}:amb:${ri}`, room: ri, spawns: list });
  });

  const solid = new Uint8Array(cells.length);
  for (let i = 0; i < cells.length; i++) solid[i] = cells[i] ? 0 : 1;

  return {
    index,
    map: floorMap,
    def: fd,
    theme,
    cols,
    rows,
    tileSize: ts,
    width: cols * ts,
    depth: rows * ts,
    cells,
    rooms,
    startRoom,
    exitRoom,
    links,
    upStairs,
    downStairs,
    arrivalFromAbove,
    arrivalFromBelow,
    chests,
    torches,
    spawns,
    pools,
    doors,
    breakables,
    ambushes,
    obstacles: mergeRects(solid, cols, rows, ts),
    wallTiles,
    wallRects: mergeRects(wallMask, cols, rows, ts),
  };
}

/**
 * Puertas: las bocas de cada sala son tiras de suelo en el anillo de baldosas que la rodea. Solo
 * las estrechas (un pasillo que entra de frente) y sin esquinas abiertas; dos puertas no se tocan.
 */
function placeDoors(rng: Rng, fd: DungeonFloorDef, rooms: readonly Room[], cells: Uint8Array, cols: number, rows: number, ts: number, index: number): DungeonDoor[] {
  const doors: DungeonDoor[] = [];
  if (fd.doorChance <= 0) return doors;
  const floor = (c: number, r: number): boolean => c >= 0 && r >= 0 && c < cols && r < rows && cells[r * cols + c] === 1;
  const taken = new Set<number>();
  rooms.forEach((rm, ri) => {
    // Esquina del anillo abierta junto al hueco = no se puede cerrar con una hoja.
    const tl = floor(rm.x0 - 1, rm.y0 - 1);
    const tr = floor(rm.x0 + rm.w, rm.y0 - 1);
    const bl = floor(rm.x0 - 1, rm.y0 + rm.h);
    const br = floor(rm.x0 + rm.w, rm.y0 + rm.h);
    const sides: Array<{ horizontal: boolean; line: Array<{ c: number; r: number }>; startOpen: boolean; endOpen: boolean }> = [
      { horizontal: true, line: Array.from({ length: rm.w }, (_, k) => ({ c: rm.x0 + k, r: rm.y0 - 1 })), startOpen: tl, endOpen: tr },
      { horizontal: true, line: Array.from({ length: rm.w }, (_, k) => ({ c: rm.x0 + k, r: rm.y0 + rm.h })), startOpen: bl, endOpen: br },
      { horizontal: false, line: Array.from({ length: rm.h }, (_, k) => ({ c: rm.x0 - 1, r: rm.y0 + k })), startOpen: tl, endOpen: bl },
      { horizontal: false, line: Array.from({ length: rm.h }, (_, k) => ({ c: rm.x0 + rm.w, r: rm.y0 + k })), startOpen: tr, endOpen: br },
    ];
    for (const side of sides) {
      const groups: Array<Array<{ c: number; r: number }>> = [];
      let cur: Array<{ c: number; r: number }> = [];
      for (const t of side.line) {
        if (floor(t.c, t.r)) cur.push(t);
        else if (cur.length) {
          groups.push(cur);
          cur = [];
        }
      }
      if (cur.length) groups.push(cur);
      for (const g of groups) {
        if (g.length > DOOR_MAX_SPAN) continue;
        if ((g[0] === side.line[0] && side.startOpen) || (g[g.length - 1] === side.line[side.line.length - 1] && side.endOpen)) continue;
        const near = g.some((t) => NEIGHBOURS.some(([dc, dr]) => taken.has((t.r + dr) * cols + t.c + dc)));
        if (near || !rng.chance(fd.doorChance)) continue;
        for (const t of g) taken.add(t.r * cols + t.c);
        const a = g[0]!;
        const b = g[g.length - 1]!;
        doors.push({ id: `${index}:door:${doors.length}`, activation: 'click', room: ri, x: ((a.c + b.c) / 2 + 0.5) * ts, y: ((a.r + b.r) / 2 + 0.5) * ts, span: g.length * ts, horizontal: side.horizontal, cells: g });
      }
    }
  });
  return doors;
}

const NEIGHBOURS: ReadonlyArray<readonly [number, number]> = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];

/** Jarras y barriles: en baldosas de sala pegadas a una pared lisa (sin bocas al lado). */
function placeBreakables(rng: Rng, fd: DungeonFloorDef, rooms: readonly Room[], cells: Uint8Array, cols: number, ts: number, index: number, ok: (p: Vec2) => boolean): DungeonBreakable[] {
  const out: DungeonBreakable[] = [];
  if (fd.breakablesPerRoom.max <= 0) return out;
  const rock = (c: number, r: number): boolean => cells[r * cols + c] !== 1;
  for (const rm of rooms) {
    const spots: Array<{ c: number; r: number }> = [];
    for (let c = rm.x0; c < rm.x0 + rm.w; c++) {
      if (rock(c - 1, rm.y0 - 1) && rock(c, rm.y0 - 1) && rock(c + 1, rm.y0 - 1)) spots.push({ c, r: rm.y0 });
      if (rock(c - 1, rm.y0 + rm.h) && rock(c, rm.y0 + rm.h) && rock(c + 1, rm.y0 + rm.h)) spots.push({ c, r: rm.y0 + rm.h - 1 });
    }
    for (let r = rm.y0 + 1; r < rm.y0 + rm.h - 1; r++) {
      if (rock(rm.x0 - 1, r - 1) && rock(rm.x0 - 1, r) && rock(rm.x0 - 1, r + 1)) spots.push({ c: rm.x0, r });
      if (rock(rm.x0 + rm.w, r - 1) && rock(rm.x0 + rm.w, r) && rock(rm.x0 + rm.w, r + 1)) spots.push({ c: rm.x0 + rm.w - 1, r });
    }
    const n = rng.int(fd.breakablesPerRoom.min, fd.breakablesPerRoom.max);
    for (let k = 0; k < n && spots.length > 0; k++) {
      const t = spots.splice(rng.int(0, spots.length - 1), 1)[0]!;
      const pos = tileCenter(ts, t.c, t.r);
      if (!ok(pos) || out.some((b) => Math.hypot(b.pos.x - pos.x, b.pos.y - pos.y) < ts * 0.9)) continue;
      out.push({ id: `${index}:brk:${out.length}`, kind: rng.chance(0.5) ? 'jar' : 'barrel', pos });
    }
  }
  return out;
}

/**
 * Rejilla con las puertas cerradas: parte de `base` (la rejilla del piso sin puertas) y tapa el
 * hueco de cada puerta que no esté en `open`.
 */
export function applyDoors(grid: NavGrid, base: Uint8Array, floor: DungeonFloor, open: ReadonlySet<string>, navRadius: number): void {
  grid.blocked.set(base);
  for (const d of floor.doors) {
    if (floor.map.overrides?.[`door:${d.id}`]?.visible === false) continue;
    if (!open.has(d.id)) grid.stamp(doorRect(d, floor.tileSize), navRadius);
  }
}

/** Puertas automáticas que debe abrir el jugador situado en `player`; los enemigos no participan. */
export function proximityDoors(floor: DungeonFloor, open: ReadonlySet<string>, player: Vec2, reach: number): string[] {
  return floor.doors
    .filter((door) => door.activation === 'proximity' && !open.has(door.id) && Math.hypot(player.x - door.x, player.y - door.y) <= (door.activationRadius ?? reach))
    .map((door) => door.id);
}

/** Rectángulo que tapa una puerta cerrada (rejilla de colisión). */
export function doorRect(d: DungeonDoor, tileSize: number): RectObstacle {
  return d.horizontal ? { x: d.x, y: d.y, w: d.span, d: tileSize } : { x: d.x, y: d.y, w: tileSize, d: d.span };
}

/** Delante de la puerta, del lado de `from` (a una baldosa del hueco). */
export function doorApproach(d: DungeonDoor, tileSize: number, from: Vec2): Vec2 {
  const a = d.horizontal ? { x: d.x, y: d.y - tileSize } : { x: d.x - tileSize, y: d.y };
  const b = d.horizontal ? { x: d.x, y: d.y + tileSize } : { x: d.x + tileSize, y: d.y };
  return Math.hypot(from.x - a.x, from.y - a.y) <= Math.hypot(from.x - b.x, from.y - b.y) ? a : b;
}

/** Botín de una jarra o un barril del piso `index`: una fracción del de un cofre. */
export function breakableLootTable(base: LootTableDef, index: number, def: DungeonDef): LootTableDef {
  const chest = chestLootTable(base, index, def.chest);
  const b = def.breakable;
  return { ...base, rolls: b.rolls, gold: { min: Math.max(1, Math.round(chest.gold.min * b.goldScale)), max: Math.max(1, Math.round(chest.gold.max * b.goldScale)), chance: b.goldChance } };
}

/** ¿Está el punto dentro de la sala (en metros)? */
export function inRoom(rm: Room, tileSize: number, p: Vec2): boolean {
  return p.x >= rm.x0 * tileSize && p.x <= (rm.x0 + rm.w) * tileSize && p.y >= rm.y0 * tileSize && p.y <= (rm.y0 + rm.h) * tileSize;
}

/** Lo que hace falta del inventario para la llave. */
export interface KeyRing {
  count(itemId: string): number;
  readonly slots: ReadonlyArray<{ uid: string; itemId: string } | null>;
  remove(uid: string, quantity: number): unknown;
}

export type KeyCheck = { ok: true; message: string } | { ok: false; message: string };

/**
 * ¿Se puede entrar desde el mundo abierto? Sin llave en los datos, siempre.
 * Con llave: hace falta una en el inventario y, si `consume`, se gasta una.
 * `keyName` = nombre del objeto para el aviso.
 */
export function useDungeonKey(def: DungeonDef, inv: KeyRing, keyName: string): KeyCheck {
  const k = def.key;
  if (!k) return { ok: true, message: '' };
  if (inv.count(k.itemId) <= 0) return { ok: false, message: `La reja de la ${def.name} está cerrada con candado: necesitas una ${keyName}.${k.hint ? ` ${k.hint}` : ''}` };
  if (k.consume) {
    const slot = inv.slots.find((s) => s?.itemId === k.itemId);
    if (slot) inv.remove(slot.uid, 1);
    return { ok: true, message: `Usas una ${keyName}: la reja se abre chirriando (y se queda con la llave).` };
  }
  return { ok: true, message: `Abres la reja con tu ${keyName}.` };
}

/** Rótulo del piso para el aviso de entrada: «Cripta de la Tulivieja · piso 2». */
export function floorTitle(def: DungeonDef, index: number): string {
  return `${def.name} · piso ${index + 1}`;
}

/**
 * Datos de juego con la zona sustituida por el piso: tamaño, roca como
 * obstáculos y el jugador en `start`. El `World` se construye con esto.
 */
export function floorGameData(data: GameData, floor: DungeonFloor, start: Vec2): GameData {
  return { ...data, zone: { ...data.zone, shared: undefined, originX: 0, originY: 0, width: floor.width, depth: floor.depth, playerStart: { ...start }, obstacles: floor.obstacles, navPaint: floor.map.navPaint } };
}

/** Tabla de botín de un cofre del piso `index`: más monedas y tiradas cuanto más hondo. */
export function chestLootTable(base: LootTableDef, index: number, chest: DungeonDef['chest']): LootTableDef {
  const k = 1 + chest.goldPerFloor * index;
  return {
    ...base,
    rolls: base.rolls + chest.extraRollsPerFloor * index,
    // Un cofre siempre da monedas.
    gold: { min: Math.round(base.gold.min * k), max: Math.round(base.gold.max * k), chance: 1 },
  };
}

/**
 * Punto del mundo abierto donde aparece el jugador al salir de la cripta:
 * delante de la boca, a `reach` + 1 m en la dirección a la que mira.
 */
export function entranceExit(def: DungeonDef): Vec2 {
  const a = (def.entrance.facingDeg * Math.PI) / 180;
  const d = def.entrance.reach + 1;
  return { x: def.entrance.x + Math.cos(a) * d, y: def.entrance.y + Math.sin(a) * d };
}
