// Dónde poner al jugador al cargar un guardado (o una partida de prueba).
// Lógica pura: recibe lo que existe hoy (tamaño del mundo, casillas
// caminables, pisos de la mazmorra, Piedras Pintadas) y decide. Si el sitio
// guardado ya no existe, la Piedra Pintada conocida más cercana.
import type { SavePlace } from '../rpg/contracts';
import type { ZoneMap } from '../sim/zones';
import type { Vec2 } from '../sim/vec2';

/** Lo que hay hoy en el mundo, para decidir. */
export interface PlaceWorld {
  width: number;
  depth: number;
  /** Casilla caminable del mundo abierto. */
  walkable(p: Vec2): boolean;
  /** Mazmorras que existen y cuántos pisos tiene cada una. */
  dungeons: Record<string, { floors: number; entrance: Vec2 }>;
  /** Piedras Pintadas con su posición real (ya ajustada al suelo caminable). */
  stones: readonly { id: string; x: number; y: number }[];
  /** Piedras que conoce el personaje (siempre incluye la de partida). */
  known: readonly string[];
  /** Piedra de partida. */
  home: string;
}

export type FallbackReason =
  /** El guardado no tenía posición (guardados antiguos): su piedra de reaparición. */
  | 'sin-posicion'
  /** La mazmorra o el piso ya no existen. */
  | 'sin-piso'
  /** La posición cae fuera del mundo. */
  | 'fuera'
  /** La casilla ya no se puede pisar (una casa nueva, un árbol). */
  | 'bloqueado';

export type Placement =
  | { kind: 'overworld'; pos: Vec2 }
  /** `pos` null = la llegada del piso por la escalera de arriba. */
  | { kind: 'dungeon'; dungeon: string; floor: number; pos: Vec2 | null }
  | { kind: 'stone'; stone: string; reason: FallbackReason };

/** Texto del aviso al caer en una piedra por no existir el sitio (null si no hace falta avisar). */
export const FALLBACK_TEXT: Record<FallbackReason, string | null> = {
  'sin-posicion': null,
  'sin-piso': 'Ese piso de la mazmorra ya no existe: apareces en la Piedra Pintada más cercana.',
  fuera: 'El sitio guardado queda fuera del mundo: apareces en la Piedra Pintada más cercana.',
  bloqueado: 'El sitio guardado ya no se puede pisar: apareces en la Piedra Pintada más cercana.',
};

/** Piedra conocida más cercana a `p` (la de partida si no conoce ninguna con posición). */
export function nearestStone(w: PlaceWorld, p: Vec2): string {
  let best = w.home;
  let bestD = Infinity;
  for (const s of w.stones) {
    if (!w.known.includes(s.id)) continue;
    const d = (s.x - p.x) ** 2 + (s.y - p.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = s.id;
    }
  }
  return best;
}

export function resolvePlace(place: SavePlace | null | undefined, w: PlaceWorld): Placement {
  const stoneOf = (id: string | null | undefined): string => (id && w.known.includes(id) && w.stones.some((s) => s.id === id) ? id : w.home);
  if (!place) return { kind: 'stone', stone: w.home, reason: 'sin-posicion' };
  const pos = place.x !== null && place.y !== null && Number.isFinite(place.x) && Number.isFinite(place.y) ? { x: place.x, y: place.y } : null;
  if (place.scene === 'dungeon') {
    const d = w.dungeons[place.dungeon ?? ''];
    const floor = place.floor ?? 0;
    if (!d || !Number.isInteger(floor) || floor < 0 || floor >= d.floors) {
      return { kind: 'stone', stone: d ? nearestStone(w, d.entrance) : stoneOf(place.stone), reason: 'sin-piso' };
    }
    return { kind: 'dungeon', dungeon: place.dungeon!, floor, pos };
  }
  if (!pos) return { kind: 'stone', stone: stoneOf(place.stone), reason: 'sin-posicion' };
  if (pos.x < 0 || pos.y < 0 || pos.x > w.width || pos.y > w.depth) return { kind: 'stone', stone: nearestStone(w, pos), reason: 'fuera' };
  if (!w.walkable(pos)) return { kind: 'stone', stone: nearestStone(w, pos), reason: 'bloqueado' };
  return { kind: 'overworld', pos };
}

/**
 * Un punto dentro de la zona `zoneId` (la que de verdad manda en ese punto,
 * porque las zonas se solapan y gana la primera de la lista): el más cercano al
 * centro de sus áreas que se pueda pisar, buscando en una rejilla de `step` m.
 * null si no tiene.
 */
export function pointInZone(zones: ZoneMap, zoneId: string, width: number, depth: number, walkable: (p: Vec2) => boolean = () => true, step = 4): Vec2 | null {
  const z = zones.get(zoneId);
  if (!z || z.areas.length === 0) return null;
  // Centro de las áreas, recortadas al mundo.
  let cx = 0;
  let cy = 0;
  for (const a of z.areas) {
    if (a.type === 'circle') {
      cx += a.x;
      cy += a.y;
    } else {
      cx += (Math.max(0, a.x0) + Math.min(width, a.x1)) / 2;
      cy += (Math.max(0, a.y0) + Math.min(depth, a.y1)) / 2;
    }
  }
  cx /= z.areas.length;
  cy /= z.areas.length;
  let best: Vec2 | null = null;
  let bestD = Infinity;
  for (let y = step / 2; y < depth; y += step) {
    for (let x = step / 2; x < width; x += step) {
      if (zones.zoneAt({ x, y })?.id !== zoneId || !walkable({ x, y })) continue;
      const d = (x - cx) ** 2 + (y - cy) ** 2;
      if (d < bestD) {
        bestD = d;
        best = { x, y };
      }
    }
  }
  return best;
}
