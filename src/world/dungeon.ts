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
import { waterDistance, type NavGrid, type RectObstacle } from '../sim/navGrid';
import { Rng } from '../sim/rng';
import type { Vec2 } from '../sim/vec2';
import designedDungeonJson from '../../data/dungeons/cripta-tulivieja.json';
import {
    parseRows,
    shouldSpawnRare,
    tileToWorld,
    validateDesignedFloor,
    type DesignedDungeonDef,
    type DesignedFloorDef,
} from './designedDungeon';

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

/** Escalera con posición y rotación (radianes, eje Y). */
export interface DungeonStairs {
    x: number;
    y: number;
    /** Rotación Y: el arco de la escalera apunta en la dirección del muro más cercano. */
    rotation: number;
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

/** Pieza decorativa de utilería en un piso de mazmorra. */
export interface DungeonProp {
    /** Nombre del nodo en el GLB (p. ej. `crip_altar_huaca`). */
    piece: string;
    pos: Vec2;
    /** Giro en radianes alrededor de Y. */
    rotation: number;
    /** Escala relativa (1 = tamaño del modelo). */
    scale: number;
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
    upStairs: DungeonStairs;
    downStairs: DungeonStairs | null;
    /** Dónde aparece el jugador al bajar desde arriba (junto al primer escalón). */
    arrivalFromAbove: Vec2;
    /** Dónde aparece al subir desde el piso de abajo (junto al primer escalón). */
    arrivalFromBelow: Vec2;
    chests: DungeonChest[];
    torches: DungeonTorch[];
    spawns: DungeonSpawn[];
    /** Estanques de pesca (agua en el centro de salas grandes). */
    pools: FishingSpotDef[];
    doors: DungeonDoor[];
    breakables: DungeonBreakable[];
    ambushes: DungeonAmbush[];
    /** Piezas decorativas de utilería (crip_* de utileria_cripta.glb). */
    props: DungeonProp[];
    /** Roca como rectángulos fusionados (rejilla de colisión). */
    obstacles: RectObstacle[];
    /** Baldosas de roca que tocan suelo (las únicas que se dibujan como muro). */
    wallTiles: Array<{ c: number; r: number }>;
    /** Muros fusionados en rectángulos (cámara). */
    wallRects: RectObstacle[];
}

const FLOOR_SEED_STEP = 7919;

/**
 * Agua no redonda (creador, 2026-11-25) dentro de una caja de semiancho `halfW`×`halfH` (m)
 * centrada en (x, y): un círculo principal y de 2 a 3 lóbulos solapados, todos dentro de la caja.
 */
function irregularWater(
    x: number,
    y: number,
    halfW: number,
    halfH: number,
    rng: Rng,
): { radius: number; lobes: Array<{ x: number; y: number; radius: number }> } {
    const radius = Math.min(halfW, halfH) * 0.62;
    const lobes: Array<{ x: number; y: number; radius: number }> = [];
    const n = rng.int(2, 3);
    const a0 = rng.next() * Math.PI * 2;
    for (let k = 0; k < n; k++) {
        const a = a0 + (k * 2 * Math.PI) / n + rng.range(-0.5, 0.5);
        const d = radius * rng.range(0.6, 0.85);
        const lx = x + Math.cos(a) * d;
        const ly = y + Math.sin(a) * d;
        const r = Math.min(radius * rng.range(0.55, 0.85), halfW - Math.abs(lx - x), halfH - Math.abs(ly - y));
        // Solapa con el principal (d < radius) y no sale de la caja; si queda muy chico, no va.
        if (r >= 0.6) lobes.push({ x: lx, y: ly, radius: r });
    }
    return { radius, lobes };
}
/** Lado mínimo (baldosas) de una sala con estanque, y margen seco (m) alrededor del agua. */
const POOL_MIN_ROOM = 8;
const POOL_MARGIN = 1.2;
/** Nada de jarras junto a las escaleras ni donde aparece el jugador (m). */
const STAIRS_CLEARANCE = 2.5;
/** Una boca más ancha que esto (baldosas) es un pasillo que pasa rozando: no lleva puerta. */
const DOOR_MAX_SPAN = 3;
/** Una puerta de proximidad debe tener al menos este ancho (baldosas). */
const DOOR_PROXIMITY_MIN_SPAN = 3;
const DESIGNED_DUNGEON = designedDungeonJson as unknown as DesignedDungeonDef;

export function floorSeed(def: DungeonDef, index: number): number {
    return (def.seed + index * FLOOR_SEED_STEP) >>> 0;
}

/** Centro de la baldosa (c, r) en metros. */
export function tileCenter(tileSize: number, c: number, r: number): Vec2 {
    return { x: (c + 0.5) * tileSize, y: (r + 0.5) * tileSize };
}

/**
 * Si una puerta de proximidad tiene menos de `DOOR_PROXIMITY_MIN_SPAN` baldosas,
 * expande `cells` hacia los vecinos del mismo lado (horizontal/vertical) que sean
 * suelo caminable. Recalcula `span` y `x`/`y` (centro del hueco).
 */
function expandProximityDoor(
    door: DungeonDoor,
    cells: Uint8Array,
    cols: number,
    rows: number,
    ts: number,
): void {
    const cellCount = door.cells.length;
    if (cellCount >= DOOR_PROXIMITY_MIN_SPAN) return;
    const needed = DOOR_PROXIMITY_MIN_SPAN - cellCount;
    const added: Array<{ c: number; r: number }> = [];
    const isFloor = (c: number, r: number): boolean =>
        c >= 0 && r >= 0 && c < cols && r < rows && cells[r * cols + c] === 1;
    const isOccupied = (c: number, r: number): boolean =>
        door.cells.some((t) => t.c === c && t.r === r) || added.some((t) => t.c === c && t.r === r);
    if (door.horizontal) {
        // Puerta horizontal: expandir en X (izquierda y derecha).
        const first = door.cells[0]!;
        const last = door.cells[door.cells.length - 1]!;
        // Izquierda.
        for (let i = 1; i <= needed + 1; i++) {
            const nc = first.c - i;
            if (!isFloor(nc, first.r) || isOccupied(nc, first.r)) break;
            added.push({ c: nc, r: first.r });
            if (added.length >= needed) break;
        }
        // Derecha (si falta).
        if (added.length < needed) {
            for (let i = 1; i <= needed + 1; i++) {
                const nc = last.c + i;
                if (!isFloor(nc, last.r) || isOccupied(nc, last.r)) break;
                added.push({ c: nc, r: last.r });
                if (added.length >= needed) break;
            }
        }
    } else {
        // Puerta vertical: expandir en Y (arriba y abajo).
        const first = door.cells[0]!;
        const last = door.cells[door.cells.length - 1]!;
        // Arriba.
        for (let i = 1; i <= needed + 1; i++) {
            const nr = first.r - i;
            if (!isFloor(first.c, nr) || isOccupied(first.c, nr)) break;
            added.push({ c: first.c, r: nr });
            if (added.length >= needed) break;
        }
        // Abajo (si falta).
        if (added.length < needed) {
            for (let i = 1; i <= needed + 1; i++) {
                const nr = last.r + i;
                if (!isFloor(last.c, nr) || isOccupied(last.c, nr)) break;
                added.push({ c: last.c, r: nr });
                if (added.length >= needed) break;
            }
        }
    }
    if (added.length === 0) return;
    // Insertar al inicio y al final según corresponda.
    const allCells = [...door.cells];
    if (door.horizontal) {
        // Separar izquierda (c < first.c) y derecha (c > last.c).
        const left = added.filter((t) => t.c < door.cells[0]!.c).sort((a, b) => b.c - a.c);
        const right = added.filter((t) => t.c > door.cells[door.cells.length - 1]!.c).sort((a, b) => a.c - b.c);
        allCells.unshift(...left);
        allCells.push(...right);
    } else {
        const top = added.filter((t) => t.r < door.cells[0]!.r).sort((a, b) => b.r - a.r);
        const bottom = added.filter((t) => t.r > door.cells[door.cells.length - 1]!.r).sort((a, b) => a.r - b.r);
        allCells.unshift(...top);
        allCells.push(...bottom);
    }
    door.cells = allCells;
    const a = allCells[0]!;
    const b = allCells[allCells.length - 1]!;
    door.span = allCells.length * ts;
    door.x = ((a.c + b.c) / 2 + 0.5) * ts;
    door.y = ((a.r + b.r) / 2 + 0.5) * ts;
}

/**
 * Calcular la rotación de una escalera para que el arco apunte hacia el muro
 * y los peldaños bajen hacia la sala caminable.
 *
 * La geometría `d_subida` tiene el arco en -X local y los peldaños bajando hacia +X local.
 * La rotación Y devuelve el ángulo que alinea +X local con la dirección del suelo más cercano.
 */
function stairsRotation(cells: Uint8Array, cols: number, rows: number, c: number, r: number): number {
    // Buscar la dirección (dx, dz) hacia el suelo caminable más cercano en 4 direcciones.
    // La escalera está en una baldosa de suelo; buscamos hacia dónde hay más suelo
    // para orientar los peldaños en esa dirección.
    let bestDir: { dx: number; dz: number } | null = null;
    let bestScore = -1;
    for (const [dc, dr] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
    ] as const) {
        const nc = c + dc;
        const nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
        if (!cells[nr * cols + nc]) continue; // no es suelo
        // Contar cuántas baldosas de suelo hay en esta dirección (para elegir la más abierta).
        let score = 0;
        for (let step = 1; step <= 3; step++) {
            const sc = c + dc * step;
            const sr = r + dr * step;
            if (sc < 0 || sr < 0 || sc >= cols || sr >= rows) break;
            if (cells[sr * cols + sc]) score++;
            else break;
        }
        if (score > bestScore) {
            bestScore = score;
            bestDir = { dx: dc, dz: dr };
        }
    }
    // Si no se encontró dirección, usar el centro de las salas como fallback.
    if (!bestDir) return 0;
    // +X local de la escalera debe apuntar hacia bestDir (los peldaños bajan hacia la sala).
    // Math.atan2(-dz, dx) da el yaw que alinea +X con (dx, dz).
    // Pero como dz es Y en coordenadas del juego, usamos atan2(-bestDir.dz, bestDir.dx).
    // El signo de dz se invierte porque en Babylon Y del juego = Z del mundo.
    return Math.atan2(-bestDir.dz, bestDir.dx);
}

/**
 * Calcular la posición de llegada junto al primer escalón (lado bajo),
 * no junto al arco (lado alto).
 *
 * La escalera tiene el arco en -X local y los peldaños bajando hacia +X local.
 * El jugador debe aparecer en el lado +X local (primer escalón), desplazado
 * perpendicularmente para no solaparse con la escalera.
 */
function arrivalBesideStairs(stairs: DungeonStairs, cells: Uint8Array, cols: number, ts: number): Vec2 {
    // Dirección del primer escalón: +X local rotado por la rotación de la escalera.
    const cos = Math.cos(stairs.rotation);
    const sin = Math.sin(stairs.rotation);
    // +X local en coordenadas del mundo: (cos, -sin)
    // Perpendicular (a la derecha de la escalera): (sin, cos)
    // Probar posiciones a 1-2 baldosas del lado bajo (+X local) con offset perpendicular.
    const offsets = [
        { dx: cos * 1.5 + sin * 0.8, dy: -sin * 1.5 + cos * 0.8 },
        { dx: cos * 1.5 - sin * 0.8, dy: -sin * 1.5 - cos * 0.8 },
        { dx: cos * 2.0 + sin * 0.5, dy: -sin * 2.0 + cos * 0.5 },
        { dx: cos * 2.0 - sin * 0.5, dy: -sin * 2.0 - cos * 0.5 },
        { dx: cos * 1.0, dy: -sin * 1.0 },
    ];
    for (const o of offsets) {
        const px = stairs.x + o.dx;
        const py = stairs.y + o.dy;
        const tc = Math.floor(px / ts - 0.5);
        const tr = Math.floor(py / ts - 0.5);
        if (tc >= 0 && tr >= 0 && tc < cols && cells[tr * cols + tc]) {
            return tileCenter(ts, tc, tr);
        }
    }
    // Fallback: 2 baldosas en cualquier dirección caminable desde la escalera.
    const sc = Math.floor(stairs.x / ts - 0.5);
    const sr = Math.floor(stairs.y / ts - 0.5);
    for (const [dc, dr] of [
        [2, 0],
        [-2, 0],
        [0, 2],
        [0, -2],
    ] as const) {
        const nc = sc + dc,
            nr = sr + dr;
        if (nc >= 0 && nr >= 0 && nc < cols && cells[nr * cols + nc]) {
            return tileCenter(ts, nc, nr);
        }
    }
    return { x: stairs.x, y: stairs.y };
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
        const next = [
            x > 0 ? i - 1 : -1,
            x < cols - 1 ? i + 1 : -1,
            y > 0 ? i - cols : -1,
            y < rows - 1 ? i + cols : -1,
        ];
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
    const cells = new Uint8Array(grid.cells.map((tile) => (tile === '#' ? 0 : 1)));
    const tiles = (symbol?: string): Array<[number, number]> => {
        const out: Array<[number, number]> = [];
        for (let r = 0; r < grid.rows; r++)
            for (let c = 0; c < grid.cols; c++)
                if (symbol ? grid.cells[r * grid.cols + c] === symbol : cells[r * grid.cols + c]) out.push([c, r]);
        return out;
    };
    const up = tiles('U')[0]!;
    const down = tiles('N')[0] ?? null;
    const boss = hand.spawns?.find((s) => s.guardian)?.tile ?? null;
    const exit = down ?? boss ?? tiles().at(-1)!;
    const roomTiles = [
        up,
        ...tiles()
            .filter(([c, r]) => (c !== up[0] || r !== up[1]) && (c !== exit[0] || r !== exit[1]))
            .slice(0, Math.max(0, fd.rooms.min - 2)),
        exit,
    ];
    const rooms: Room[] = roomTiles.map(([c, r]) => ({ x0: c, y0: r, w: 1, h: 1 }));
    const links: Array<[number, number]> = rooms.slice(1).map((_, i) => [i, i + 1]);
    const ts = DESIGNED_DUNGEON.tileSize || def.tileSize;
    const at = (tile: readonly [number, number]): Vec2 => tileToWorld(tile, ts);
    const _beside = ([c, r]: readonly [number, number]): Vec2 => {
        for (const [dc, dr] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
        ] as const)
            if (cells[(r + dr) * grid.cols + c + dc]) return at([c + dc, r + dr]);
        return at([c, r]);
    };
    const spawns: DungeonSpawn[] = (hand.spawns ?? []).map((spawn) => ({
        archetype: spawn.archetype,
        pos: at(spawn.tile),
        level: spawn.level,
        guardian: !!spawn.guardian,
    }));
    if (hand.rareSpawn) {
        const rng = new Rng(floorSeed(def, index));
        if (shouldSpawnRare(hand, rng.next()))
            spawns.push({
                archetype: hand.rareSpawn.archetype,
                pos: at(hand.rareSpawn.tile),
                level: fd.levelMax + 2,
                guardian: false,
                rare: true,
            });
    }
    const chestTiles = tiles('C');
    const extraChestTiles = tiles().filter(
        ([c, r]) => !chestTiles.some((p) => p[0] === c && p[1] === r) && !(c === up[0] && r === up[1]),
    );
    while (chestTiles.length < fd.chests && extraChestTiles.length)
        chestTiles.push(extraChestTiles.splice(Math.floor(extraChestTiles.length / 2), 1)[0]!);
    const chests: DungeonChest[] = chestTiles
        .slice(0, fd.chests)
        .map((tile, i) => ({ id: `${index}:hand:${i}`, pos: at(tile) }));
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
            ...(floorMap.doors[door.id]?.radius === undefined
                ? {}
                : { activationRadius: floorMap.doors[door.id]!.radius }),
            room,
            x: pos.x,
            y: pos.y,
            span: ts,
            horizontal: verticalPassage,
            cells: [{ c, r }],
        };
    });
    // Las puertas de proximidad deben tener al menos DOOR_PROXIMITY_MIN_SPAN baldosas.
    for (const door of doors) {
        if (door.activation === 'proximity') {
            expandProximityDoor(door, cells, grid.cols, grid.rows, ts);
        }
    }
    const wallTiles: Array<{ c: number; r: number }> = [];
    const wallMask = new Uint8Array(cells.length);
    for (let r = 0; r < grid.rows; r++)
        for (let c = 0; c < grid.cols; c++) {
            if (cells[r * grid.cols + c]) continue;
            const touches = (
                [
                    [1, 0],
                    [-1, 0],
                    [0, 1],
                    [0, -1],
                ] as const
            ).some(([dc, dr]) => cells[(r + dr) * grid.cols + c + dc]);
            if (touches) {
                wallTiles.push({ c, r });
                wallMask[r * grid.cols + c] = 1;
            }
        }
    // Antorchas: una cada `torchEvery` baldosas de muro, con la normal hacia el suelo.
    // Filtrar las que quedan cerca de escaleras o sobre puertas.
    // Calcular primero los puntos a evitar (escaleras y llegadas).
    const upRot = stairsRotation(cells, grid.cols, grid.rows, up[0], up[1]);
    const handUpStairs = { ...at(up), rotation: upRot };
    const downRot = down ? stairsRotation(cells, grid.cols, grid.rows, down[0], down[1]) : 0;
    const handDownStairs = down ? { ...at(down), rotation: downRot } : null;
    const handArrivalFromAbove = arrivalBesideStairs(handUpStairs, cells, grid.cols, ts);
    const handArrivalFromBelow = arrivalBesideStairs(
        { x: at(exit).x, y: at(exit).y, rotation: downRot || upRot },
        cells,
        grid.cols,
        ts,
    );
    const handTorches: DungeonTorch[] = [];
    // Si el piso declara sus antorchas, las usa y salta la generación automática.
    if (hand.torches && hand.torches.length > 0) {
        for (const t of hand.torches) {
            const [tc, tr] = t.tile;
            const [tnx, tny] = t.dir;
            // Validar que la baldosa es roca y la normal apunta a suelo.
            if (tc < 0 || tr < 0 || tc >= grid.cols || tr >= grid.rows) continue;
            if (cells[tr * grid.cols + tc]) continue; // no es roca
            const nc = tc + tnx,
                nr = tr + tny;
            if (nc < 0 || nr < 0 || nc >= grid.cols || nr >= grid.rows || !cells[nr * grid.cols + nc]) continue;
            const pos = { x: (tc + 0.5) * ts, y: (tr + 0.5) * ts };
            const edgeX = pos.x + tnx * (ts * 0.5);
            const edgeY = pos.y + tny * (ts * 0.5);
            handTorches.push({ x: edgeX, y: edgeY, nx: tnx, ny: tny });
        }
    } else {
        // Generación automática: una cada `torchEvery` baldosas de muro, con la normal hacia el suelo.
        const avoidPoints: Vec2[] = [handUpStairs, handDownStairs, handArrivalFromAbove, handArrivalFromBelow].filter(
            Boolean,
        ) as Vec2[];
        // Baldosas de puerta (en coordenadas de grid).
        const doorTileSet = new Set<string>();
        for (const d of doors) {
            for (const cell of d.cells) doorTileSet.add(`${cell.c},${cell.r}`);
        }
        let wallIndex = 0;
        for (const { c, r } of wallTiles) {
            if (wallIndex % def.light.torchEvery !== 0) {
                wallIndex++;
                continue;
            }
            wallIndex++;
            // No sobre puertas.
            if (doorTileSet.has(`${c},${r}`)) continue;
            // No cerca de escaleras.
            const pos = { x: (c + 0.5) * ts, y: (r + 0.5) * ts };
            if (avoidPoints.some((q) => Math.hypot(pos.x - q.x, pos.y - q.y) <= STAIRS_CLEARANCE)) continue;
            // Calcular la normal hacia el suelo más cercano (4 direcciones).
            let nx = 0,
                ny = 0,
                bestDist = Infinity;
            for (const [dc, dr] of [
                [1, 0],
                [-1, 0],
                [0, 1],
                [0, -1],
            ] as const) {
                const nc = c + dc,
                    nr = r + dr;
                if (nc >= 0 && nr >= 0 && nc < grid.cols && nr < grid.rows && cells[nr * grid.cols + nc]) {
                    // Esta cara separa roca y suelo: la normal apunta al suelo.
                    nx = dc;
                    ny = dr;
                    bestDist = 0;
                    break;
                }
            }
            // Si no hay suelo en las 4 direcciones adyacentes (esquina aislada), no poner antorcha.
            if (bestDist === Infinity) continue;
            // Posición: plano de pared exacto (borde roca/suelo). El modelo O9 ya no
            // penetra, así que no hay que "asomarlo" con rellenos.
            const edgeX = pos.x + nx * (ts * 0.5);
            const edgeY = pos.y + ny * (ts * 0.5);
            handTorches.push({ x: edgeX, y: edgeY, nx, ny });
        }
    }
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
        upStairs: handUpStairs,
        downStairs: handDownStairs,
        arrivalFromAbove: handArrivalFromAbove,
        arrivalFromBelow: handArrivalFromBelow,
        chests,
        torches: handTorches,
        spawns,
        pools: [],
        doors,
        breakables: [],
        ambushes: [],
        props: (hand.props ?? []).map((p) => {
            const pos = at(p.tile);
            return {
                piece: p.piece,
                pos,
                rotation: ((p.rotDeg ?? 0) * Math.PI) / 180,
                scale: p.scale ?? 1,
            };
        }),
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
    for (const rm of rooms)
        for (let r = rm.y0; r < rm.y0 + rm.h; r++) for (let c = rm.x0; c < rm.x0 + rm.w; c++) set(c, r);

    // Pasillos: árbol de expansión mínima (Prim, distancia Manhattan entre centros) y algún bucle.
    const centers = rooms.map(roomCenterTile);
    const md = (a: number, b: number): number =>
        Math.abs(centers[a]!.c - centers[b]!.c) + Math.abs(centers[a]!.r - centers[b]!.r);
    const links: Array<[number, number]> = [];
    const inTree = new Set<number>([0]);
    while (inTree.size < rooms.length) {
        let best: [number, number] | null = null;
        for (const a of inTree)
            for (let b = 0; b < rooms.length; b++)
                if (!inTree.has(b) && (!best || md(a, b) < md(best[0], best[1]))) best = [a, b];
        links.push(best!);
        inTree.add(best![1]);
    }
    const linked = (a: number, b: number): boolean =>
        links.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
    const extra: Array<[number, number]> = [];
    for (let a = 0; a < rooms.length; a++)
        for (let b = a + 1; b < rooms.length; b++) if (!linked(a, b)) extra.push([a, b]);
    extra.sort((p, q) => md(p[0], p[1]) - md(q[0], q[1]));
    const pool = extra.slice(0, fd.extraLinks * 3);
    for (let k = 0; k < fd.extraLinks && pool.length > 0; k++)
        links.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]!);

    const cw = def.corridorWidth;
    const lo = Math.floor((cw - 1) / 2);
    const carveH = (r: number, c0: number, c1: number): void => {
        for (let c = Math.min(c0, c1) - lo; c <= Math.max(c0, c1) - lo + cw - 1; c++)
            for (let k = 0; k < cw; k++) set(c, r - lo + k);
    };
    const carveV = (c: number, r0: number, r1: number): void => {
        for (let r = Math.min(r0, r1) - lo; r <= Math.max(r0, r1) - lo + cw - 1; r++)
            for (let k = 0; k < cw; k++) set(c - lo + k, r);
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
    const startCenter = centers[startRoom]!;
    const exitCenter = centers[exitRoom]!;
    const upRot = stairsRotation(cells, cols, rows, startCenter.c, startCenter.r);
    const upStairsPos = at(startCenter);
    const upStairs = { x: upStairsPos.x, y: upStairsPos.y, rotation: upRot };
    const downRot = isLast ? 0 : stairsRotation(cells, cols, rows, exitCenter.c, exitCenter.r);
    const downStairsPos = isLast ? null : at(exitCenter);
    const downStairs = isLast ? null : { x: downStairsPos!.x, y: downStairsPos!.y, rotation: downRot };
    const arrivalFromAbove = arrivalBesideStairs(upStairs, cells, cols, ts);
    const arrivalFromBelow = arrivalBesideStairs(
        downStairs ?? { x: at(exitCenter).x, y: at(exitCenter).y, rotation: 0 },
        cells,
        cols,
        ts,
    );

    // Estanques: agua en el centro de salas grandes (ni la de llegada ni la de salida), con dos
    // baldosas de orilla alrededor para rodearla.
    const pools: FishingSpotDef[] = [];
    const poolRooms = rooms
        .map((_, i) => i)
        .filter((i) => i !== startRoom && i !== exitRoom && Math.min(rooms[i]!.w, rooms[i]!.h) >= POOL_MIN_ROOM);
    // Los lóbulos usan su propia semilla: así no cambian los monstruos, cofres ni jarras del piso.
    const lobeRng = new Rng(floorSeed(def, index) ^ 0x5eed);
    for (let k = 0; k < fd.pools && poolRooms.length > 0; k++) {
        const ri = poolRooms.splice(rng.int(0, poolRooms.length - 1), 1)[0]!;
        const rm = rooms[ri]!;
        const x = (rm.x0 + rm.w / 2) * ts;
        const y = (rm.y0 + rm.h / 2) * ts;
        pools.push({
            id: `pool:${index}:${ri}`,
            name: 'Estanque de la cripta',
            x,
            y,
            ...irregularWater(x, y, ((rm.w - 4) * ts) / 2, ((rm.h - 4) * ts) / 2, lobeRng),
            lootTable: fd.poolLootTable,
            nightLootTable: fd.poolNightLootTable,
        });
    }
    /** Lejos del agua (con margen para el cuerpo del monstruo o el objeto). */
    const dry = (p: Vec2): boolean => pools.every((o) => waterDistance(o, p) > POOL_MARGIN);

    // Monstruos: por sala (no en la de llegada), lejos del borde de la sala y del agua.
    const spawns: DungeonSpawn[] = [];
    const inside = (rm: Room): Vec2 => {
        const pick = (): Vec2 =>
            tileCenter(ts, rng.int(rm.x0 + 1, rm.x0 + rm.w - 2), rng.int(rm.y0 + 1, rm.y0 + rm.h - 2));
        let p = pick();
        for (let t = 0; t < 30 && !dry(p); t++) p = pick();
        return p;
    };
    rooms.forEach((rm, i) => {
        if (i === startRoom) return;
        const n = rng.int(fd.enemiesPerRoom.min, fd.enemiesPerRoom.max);
        for (let k = 0; k < n; k++) {
            const s = pickWeighted(rng, fd.spawns);
            spawns.push({
                archetype: s.archetype,
                pos: inside(rm),
                level: rng.int(fd.levelMin, fd.levelMax) + s.levelBonus,
                guardian: false,
            });
        }
    });
    // El guardián espera junto a la bajada (o en el centro de la última sala).
    if (fd.guardian)
        spawns.push({
            archetype: fd.guardian.archetype,
            pos: downStairs ? arrivalFromBelow : at(centers[exitRoom]!),
            level: fd.guardian.level,
            guardian: true,
        });

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

    // Puertas primero: las antorchas necesitan saber dónde están para no solaparse.
    const doors = placeDoors(rng, fd, rooms, cells, cols, rows, ts, index);
    for (const door of doors) {
        const override = floorMap.doors[door.id];
        door.activation = override?.activation ?? door.activation;
        if (override?.radius !== undefined) door.activationRadius = override.radius;
    }
    // Las puertas de proximidad deben tener al menos DOOR_PROXIMITY_MIN_SPAN baldosas.
    for (const door of doors) {
        if (door.activation === 'proximity') {
            expandProximityDoor(door, cells, cols, rows, ts);
        }
    }

    // Antorchas: después de puertas y escaleras, para excluir huecos y accesos.
    // Una cada `torchEvery` baldosas de muro del contorno de cada sala.
    // La posición es el centro de la baldosa de roca; la normal apunta al suelo.
    const torches: DungeonTorch[] = [];
    // Baldosas ocupadas por puertas (no poner antorcha encima).
    const doorTiles = new Set<string>();
    for (const d of doors) {
        for (const cell of d.cells) doorTiles.add(`${cell.c},${cell.r}`);
    }
    // Distancia mínima a escaleras (en baldosas).
    const stairsClearTile = (c: number, r: number): boolean => {
        const p = tileCenter(ts, c, r);
        const points: { x: number; y: number }[] = [
            upStairs,
            downStairs ?? null,
            arrivalFromAbove,
            arrivalFromBelow,
        ].filter(Boolean) as { x: number; y: number }[];
        return points.every((q) => Math.hypot(p.x - q.x, p.y - q.y) > STAIRS_CLEARANCE);
    };
    for (const rm of rooms) {
        const ring: Array<{ c: number; r: number; nx: number; ny: number }> = [];
        for (let c = rm.x0; c < rm.x0 + rm.w; c++) ring.push({ c, r: rm.y0 - 1, nx: 0, ny: 1 });
        for (let r = rm.y0; r < rm.y0 + rm.h; r++) ring.push({ c: rm.x0 + rm.w, r, nx: -1, ny: 0 });
        for (let c = rm.x0 + rm.w - 1; c >= rm.x0; c--) ring.push({ c, r: rm.y0 + rm.h, nx: 0, ny: -1 });
        for (let r = rm.y0 + rm.h - 1; r >= rm.y0; r--) ring.push({ c: rm.x0 - 1, r, nx: 1, ny: 0 });
        const offset = rng.int(0, def.light.torchEvery - 1);
        ring.forEach((t, k) => {
            if ((k + offset) % def.light.torchEvery !== 0) return;
            // La baldosa debe ser roca (no suelo).
            if (cells[t.r * cols + t.c]) return;
            // No sobre puertas.
            if (doorTiles.has(`${t.c},${t.r}`)) return;
            // No cerca de escaleras.
            if (!stairsClearTile(t.c, t.r)) return;
            // La normal debe apuntar a suelo (la cara separa roca y suelo).
            const floorSide = cells[(t.r + t.ny) * cols + t.c + t.nx];
            if (!floorSide) return;
            // Posición: plano de pared exacto (borde roca/suelo). El modelo O9 ya no
            // penetra, así que no hay que "asomarlo" con rellenos.
            const p = tileCenter(ts, t.c, t.r);
            const edgeX = p.x + t.nx * (ts * 0.5);
            const edgeY = p.y + t.ny * (ts * 0.5);
            torches.push({ x: edgeX, y: edgeY, nx: t.nx, ny: t.ny });
        });
    }

    const stairsClear = (p: Vec2): boolean => {
        const points: { x: number; y: number }[] = [
            upStairs,
            downStairs ?? null,
            arrivalFromAbove,
            arrivalFromBelow,
        ].filter(Boolean) as { x: number; y: number }[];
        return points.every((q) => Math.hypot(p.x - q.x, p.y - q.y) > STAIRS_CLEARANCE);
    };
    const breakables = placeBreakables(
        rng,
        fd,
        rooms,
        cells,
        cols,
        ts,
        index,
        (p) => dry(p) && stairsClear(p) && chests.every((c) => Math.hypot(p.x - c.pos.x, p.y - c.pos.y) > 1),
    );

    // Emboscadas: salas (ni la de llegada ni la de salida) con bichos escondidos de más nivel.
    const ambushes: DungeonAmbush[] = [];
    rooms.forEach((rm, ri) => {
        if (ri === startRoom || ri === exitRoom || !rng.chance(fd.ambushChance)) return;
        const n = rng.int(fd.enemiesPerRoom.min, fd.enemiesPerRoom.max) + 1;
        const list: DungeonSpawn[] = [];
        for (let k = 0; k < n; k++) {
            const s = pickWeighted(rng, fd.spawns);
            list.push({
                archetype: s.archetype,
                pos: inside(rm),
                level: Math.min(100, fd.levelMax + 1 + s.levelBonus),
                guardian: false,
            });
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
        props: [],
        obstacles: mergeRects(solid, cols, rows, ts),
        wallTiles,
        wallRects: mergeRects(wallMask, cols, rows, ts),
    };
}

/**
 * Puertas: las bocas de cada sala son tiras de suelo en el anillo de baldosas que la rodea. Solo
 * las estrechas (un pasillo que entra de frente) y sin esquinas abiertas; dos puertas no se tocan.
 */
function placeDoors(
    rng: Rng,
    fd: DungeonFloorDef,
    rooms: readonly Room[],
    cells: Uint8Array,
    cols: number,
    rows: number,
    ts: number,
    index: number,
): DungeonDoor[] {
    const doors: DungeonDoor[] = [];
    if (fd.doorChance <= 0) return doors;
    const floor = (c: number, r: number): boolean =>
        c >= 0 && r >= 0 && c < cols && r < rows && cells[r * cols + c] === 1;
    const taken = new Set<number>();
    rooms.forEach((rm, ri) => {
        // Esquina del anillo abierta junto al hueco = no se puede cerrar con una hoja.
        const tl = floor(rm.x0 - 1, rm.y0 - 1);
        const tr = floor(rm.x0 + rm.w, rm.y0 - 1);
        const bl = floor(rm.x0 - 1, rm.y0 + rm.h);
        const br = floor(rm.x0 + rm.w, rm.y0 + rm.h);
        const sides: Array<{
            horizontal: boolean;
            line: Array<{ c: number; r: number }>;
            startOpen: boolean;
            endOpen: boolean;
        }> = [
            {
                horizontal: true,
                line: Array.from({ length: rm.w }, (_, k) => ({ c: rm.x0 + k, r: rm.y0 - 1 })),
                startOpen: tl,
                endOpen: tr,
            },
            {
                horizontal: true,
                line: Array.from({ length: rm.w }, (_, k) => ({ c: rm.x0 + k, r: rm.y0 + rm.h })),
                startOpen: bl,
                endOpen: br,
            },
            {
                horizontal: false,
                line: Array.from({ length: rm.h }, (_, k) => ({ c: rm.x0 - 1, r: rm.y0 + k })),
                startOpen: tl,
                endOpen: bl,
            },
            {
                horizontal: false,
                line: Array.from({ length: rm.h }, (_, k) => ({ c: rm.x0 + rm.w, r: rm.y0 + k })),
                startOpen: tr,
                endOpen: br,
            },
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
                if (
                    (g[0] === side.line[0] && side.startOpen) ||
                    (g[g.length - 1] === side.line[side.line.length - 1] && side.endOpen)
                )
                    continue;
                const near = g.some((t) => NEIGHBOURS.some(([dc, dr]) => taken.has((t.r + dr) * cols + t.c + dc)));
                if (near || !rng.chance(fd.doorChance)) continue;
                for (const t of g) taken.add(t.r * cols + t.c);
                const a = g[0]!;
                const b = g[g.length - 1]!;
                doors.push({
                    id: `${index}:door:${doors.length}`,
                    activation: 'click',
                    room: ri,
                    x: ((a.c + b.c) / 2 + 0.5) * ts,
                    y: ((a.r + b.r) / 2 + 0.5) * ts,
                    span: g.length * ts,
                    horizontal: side.horizontal,
                    cells: g,
                });
            }
        }
    });
    return doors;
}

const NEIGHBOURS: ReadonlyArray<readonly [number, number]> = [
    [0, 0],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
];

/** Jarras y barriles: en baldosas de sala pegadas a una pared lisa (sin bocas al lado). */
function placeBreakables(
    rng: Rng,
    fd: DungeonFloorDef,
    rooms: readonly Room[],
    cells: Uint8Array,
    cols: number,
    ts: number,
    index: number,
    ok: (p: Vec2) => boolean,
): DungeonBreakable[] {
    const out: DungeonBreakable[] = [];
    if (fd.breakablesPerRoom.max <= 0) return out;
    const rock = (c: number, r: number): boolean => cells[r * cols + c] !== 1;
    for (const rm of rooms) {
        const spots: Array<{ c: number; r: number }> = [];
        for (let c = rm.x0; c < rm.x0 + rm.w; c++) {
            if (rock(c - 1, rm.y0 - 1) && rock(c, rm.y0 - 1) && rock(c + 1, rm.y0 - 1)) spots.push({ c, r: rm.y0 });
            if (rock(c - 1, rm.y0 + rm.h) && rock(c, rm.y0 + rm.h) && rock(c + 1, rm.y0 + rm.h))
                spots.push({ c, r: rm.y0 + rm.h - 1 });
        }
        for (let r = rm.y0 + 1; r < rm.y0 + rm.h - 1; r++) {
            if (rock(rm.x0 - 1, r - 1) && rock(rm.x0 - 1, r) && rock(rm.x0 - 1, r + 1)) spots.push({ c: rm.x0, r });
            if (rock(rm.x0 + rm.w, r - 1) && rock(rm.x0 + rm.w, r) && rock(rm.x0 + rm.w, r + 1))
                spots.push({ c: rm.x0 + rm.w - 1, r });
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
export function applyDoors(
    grid: NavGrid,
    base: Uint8Array,
    floor: DungeonFloor,
    open: ReadonlySet<string>,
    navRadius: number,
): void {
    grid.blocked.set(base);
    for (const d of floor.doors) {
        if (floor.map.overrides?.[`door:${d.id}`]?.visible === false) continue;
        if (!open.has(d.id)) grid.stamp(doorRect(d, floor.tileSize), navRadius);
    }
}

/** Puertas automáticas que debe abrir el jugador situado en `player`; los enemigos no participan. */
export function proximityDoors(floor: DungeonFloor, open: ReadonlySet<string>, player: Vec2, reach: number): string[] {
    return floor.doors
        .filter(
            (door) =>
                door.activation === 'proximity' &&
                !open.has(door.id) &&
                Math.hypot(player.x - door.x, player.y - door.y) <= (door.activationRadius ?? reach),
        )
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
    return {
        ...base,
        rolls: b.rolls,
        gold: {
            min: Math.max(1, Math.round(chest.gold.min * b.goldScale)),
            max: Math.max(1, Math.round(chest.gold.max * b.goldScale)),
            chance: b.goldChance,
        },
    };
}

/** ¿Está el punto dentro de la sala (en metros)? */
export function inRoom(rm: Room, tileSize: number, p: Vec2): boolean {
    return (
        p.x >= rm.x0 * tileSize &&
        p.x <= (rm.x0 + rm.w) * tileSize &&
        p.y >= rm.y0 * tileSize &&
        p.y <= (rm.y0 + rm.h) * tileSize
    );
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
    if (inv.count(k.itemId) <= 0)
        return {
            ok: false,
            message: `La reja de la ${def.name} está cerrada con candado: necesitas una ${keyName}.${k.hint ? ` ${k.hint}` : ''}`,
        };
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
    return {
        ...data,
        zone: {
            ...data.zone,
            shared: undefined,
            originX: 0,
            originY: 0,
            width: floor.width,
            depth: floor.depth,
            playerStart: { ...start },
            obstacles: floor.obstacles,
            navPaint: floor.map.navPaint,
        },
    };
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
 * Creador (2026-11-25): a la cripta solo se entra hablando con Berto Candado, el portero («berto
 * debe estar en la propia puerta de la mazmorra»). Un clic en la reja lleva a hablar con él.
 */
export const CRYPT_WARDEN_NPC = 'crypt_warden';

/**
 * CLA-CRIPTA2: sitios para los `n` PNJ de la cripta (`crypt: true`) cerca de `arrival`, en suelo
 * caminable, separados de los objetos reservados y sin pisarse entre ellos.
 */
export function cryptStaffSpots(
    arrival: Vec2,
    n: number,
    walkable: (p: Vec2) => boolean,
    reserved: readonly Vec2[] = [],
): Vec2[] {
    const radii = [2.5, 3.5, 4.5, 5.5];
    const out: Vec2[] = [];
    for (const radius of radii) {
        for (let step = 0; step < 16; step++) {
            if (out.length >= n) return out;
            const angle = (step * Math.PI) / 8;
            const p = { x: arrival.x + Math.cos(angle) * radius, y: arrival.y + Math.sin(angle) * radius };
            if (
                walkable(p) &&
                reserved.every((q) => Math.hypot(q.x - p.x, q.y - p.y) >= 1) &&
                out.every((q) => Math.hypot(q.x - p.x, q.y - p.y) >= 1.5)
            )
                out.push(p);
        }
    }
    return out;
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
