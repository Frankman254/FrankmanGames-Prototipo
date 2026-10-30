// Pisos de mazmorra generados con semilla (`data/dungeon.json`): salas
// rectangulares unidas por pasillos en L sobre una rejilla de baldosas, con
// escaleras, cofres, antorchas y la lista de monstruos con su nivel. Sólo datos;
// nada de DOM ni de render, para poder probarlo y reconstruir el `World`.
//   · Un piso es siempre el mismo: semilla = seed + índice × 7919.
//   · Coordenadas en metros del plano XZ, como el resto de la simulación
//     (`Vec2.y` es la Z del render).
import type { GameData } from '../data';
import type { DungeonDef, DungeonFloorDef, DungeonThemeDef } from '../data/dungeonSchema';
import type { LootTableDef } from '../rpg/contracts';
import type { RectObstacle } from '../sim/navGrid';
import { Rng } from '../sim/rng';
import type { Vec2 } from '../sim/vec2';

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
}

export interface DungeonFloor {
  /** 0 = primer piso. */
  index: number;
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
  /** Roca como rectángulos fusionados (rejilla de colisión). */
  obstacles: RectObstacle[];
  /** Baldosas de roca que tocan suelo (las únicas que se dibujan como muro). */
  wallTiles: Array<{ c: number; r: number }>;
  /** Muros fusionados en rectángulos (cámara). */
  wallRects: RectObstacle[];
}

const FLOOR_SEED_STEP = 7919;

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
      if (j < 0 || !cells[j] || dist[j] >= 0) continue;
      dist[j] = (dist[i] ?? 0) + 1;
      queue[tail++] = j;
    }
  }
  return dist;
}

/** Genera el piso `index` (0 = el primero) de forma determinista. */
export function generateFloor(def: DungeonDef, index: number): DungeonFloor {
  const fd = def.floors[index];
  if (!fd) throw new Error(`[dungeon] no hay piso ${index}`);
  const theme = def.themes[fd.theme]!;
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

  // Monstruos: por sala (no en la de llegada), lejos del borde de la sala.
  const spawns: DungeonSpawn[] = [];
  const inside = (rm: Room): Vec2 => tileCenter(ts, rng.int(rm.x0 + 1, rm.x0 + rm.w - 2), rng.int(rm.y0 + 1, rm.y0 + rm.h - 2));
  rooms.forEach((rm, i) => {
    if (i === startRoom) return;
    const n = rng.int(fd.enemiesPerRoom.min, fd.enemiesPerRoom.max);
    for (let k = 0; k < n; k++) {
      const s = pickWeighted(rng, fd.spawns);
      spawns.push({ archetype: s.archetype, pos: inside(rm), level: rng.int(fd.levelMin, fd.levelMax) + s.levelBonus, guardian: false });
    }
  });
  if (fd.guardian) spawns.push({ archetype: fd.guardian.archetype, pos: at(centers[exitRoom]!), level: fd.guardian.level, guardian: true });

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

  const solid = new Uint8Array(cells.length);
  for (let i = 0; i < cells.length; i++) solid[i] = cells[i] ? 0 : 1;

  return {
    index,
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
    obstacles: mergeRects(solid, cols, rows, ts),
    wallTiles,
    wallRects: mergeRects(wallMask, cols, rows, ts),
  };
}

/** Rótulo del piso para el aviso de entrada: «Cripta del Cruce · piso 2». */
export function floorTitle(def: DungeonDef, index: number): string {
  return `${def.name} · piso ${index + 1}`;
}

/**
 * Datos de juego con la zona sustituida por el piso: tamaño, roca como
 * obstáculos y el jugador en `start`. El `World` se construye con esto.
 */
export function floorGameData(data: GameData, floor: DungeonFloor, start: Vec2): GameData {
  return { ...data, zone: { ...data.zone, width: floor.width, depth: floor.depth, playerStart: { ...start }, obstacles: floor.obstacles } };
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
