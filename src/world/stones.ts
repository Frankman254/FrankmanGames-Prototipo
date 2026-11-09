// Piedras Pintadas (piedras de viaje) y coordenadas de mapa. Lógica pura: qué piedras hay,
// cuáles conoce el jugador, cuál es su punto de reaparición y en qué «mapa»
// [x, y] está. Lo guardado vive aparte (por personaje) y se valida al leerlo.
import { Reader } from '../data/validate';

export interface StoneDef {
  id: string;
  name: string;
  x: number;
  y: number;
  /** Hacia dónde se aparece y mira la cámara al empezar (Iguanera: el guardaparque). */
  face?: { x: number; y: number };
}

/** Metros de la Piedra a los que se aparece: a su lado, no dentro de su malla (QA Q03). */
export const ARRIVE_METERS = 2.5;

/** Sitio al lado de la Piedra (puesta en `at`) hacia `face`, o al sur si no tiene. */
export function arrivalSpot(z: StoneDef, at: { x: number; y: number }): { x: number; y: number } {
  const dx = z.face ? z.face.x - z.x : 0;
  const dy = z.face ? z.face.y - z.y : -1;
  const len = Math.hypot(dx, dy) || 1;
  return { x: at.x + (dx / len) * ARRIVE_METERS, y: at.y + (dy / len) * ARRIVE_METERS };
}

/** Rumbo de cámara (grados, el de `CameraRig`) para mirar desde `from` hacia `face`; null sin él. */
export function faceYawDeg(z: StoneDef, from: { x: number; y: number }): number | null {
  if (!z.face) return null;
  return (Math.atan2(z.face.x - from.x, z.face.y - from.y) * 180) / Math.PI;
}

export interface StonesDef {
  activateRadius: number;
  coordCellMeters: number;
  /** Piedra de partida: conocida desde el principio y reaparición por defecto. */
  home: string;
  /** Piedra donde empieza un personaje nuevo (por defecto, home). */
  start: string;
  stones: StoneDef[];
}

export function parseStones(raw: unknown): StonesDef {
  const r = new Reader('stones.json');
  const o = r.obj(raw);
  const stones = r.arr(o, 'stones').map((z, i) => {
    const c = r.child(`stones.${i}`);
    const zo = c.obj(z);
    const stone: StoneDef = { id: c.str(zo, 'id'), name: c.str(zo, 'name'), x: c.num(zo, 'x'), y: c.num(zo, 'y') };
    if (zo['face'] !== undefined) {
      const f = c.child('face');
      const fo = f.obj(zo['face']);
      stone.face = { x: f.num(fo, 'x'), y: f.num(fo, 'y') };
    }
    return stone;
  });
  const ids = new Set<string>();
  for (const z of stones) {
    if (ids.has(z.id)) r.fail('stones', `id repetido "${z.id}"`);
    ids.add(z.id);
  }
  const home = r.str(o, 'home');
  if (!ids.has(home)) r.fail('home', `piedra desconocida "${home}"`);
  const start = o['start'] === undefined ? home : r.str(o, 'start');
  if (!ids.has(start)) r.fail('start', `piedra desconocida "${start}"`);
  return {
    activateRadius: r.num(o, 'activateRadius', { min: 0.5, max: 20 }),
    coordCellMeters: r.num(o, 'coordCellMeters', { min: 1, max: 256 }),
    home,
    start,
    stones,
  };
}

/** Coordenadas de mapa: el centro del mundo es [0, 0]. */
export function mapCoords(x: number, y: number, worldW: number, worldD: number, cell: number): [number, number] {
  return [Math.floor((x - worldW / 2) / cell), Math.floor((y - worldD / 2) / cell)];
}

/** Lo que el jugador sabe de las Piedras Pintadas (se guarda por personaje). */
export interface StoneProgress {
  known: string[];
  respawn: string;
}

export class StoneBook {
  progress: StoneProgress;

  constructor(
    readonly def: StonesDef,
    saved: unknown = null,
  ) {
    this.progress = StoneBook.normalize(def, saved);
  }

  static normalize(def: StonesDef, saved: unknown): StoneProgress {
    const ids = new Set(def.stones.map((z) => z.id));
    const s = (saved && typeof saved === 'object' ? saved : {}) as Partial<Record<keyof StoneProgress, unknown>>;
    // Un personaje nuevo solo conoce la Piedra donde empieza; uno guardado, siempre la de casa.
    const fresh = !Array.isArray(s.known);
    const known = fresh ? [] : (s.known as unknown[]).filter((k): k is string => typeof k === 'string' && ids.has(k));
    const base = fresh ? def.start : def.home;
    if (!known.includes(base)) known.unshift(base);
    const respawn = typeof s.respawn === 'string' && known.includes(s.respawn) ? s.respawn : base;
    return { known: [...new Set(known)], respawn };
  }

  get(id: string): StoneDef | undefined {
    return this.def.stones.find((z) => z.id === id);
  }

  knows(id: string): boolean {
    return this.progress.known.includes(id);
  }

  get respawn(): StoneDef {
    return this.get(this.progress.respawn)!;
  }

  /** Piedras conocidas, en el orden de los datos. */
  known(): StoneDef[] {
    return this.def.stones.filter((z) => this.knows(z.id));
  }

  /**
   * El jugador pasa por `pos` (con las posiciones reales de cada piedra ya
   * ajustadas al suelo caminable). Devuelve la piedra que acaba de activar por
   * primera vez, o null. Tocar una la hace punto de reaparición.
   */
  touch(pos: { x: number; y: number }, at: (z: StoneDef) => { x: number; y: number }): StoneDef | null {
    const r2 = this.def.activateRadius ** 2;
    for (const z of this.def.stones) {
      const p = at(z);
      if ((p.x - pos.x) ** 2 + (p.y - pos.y) ** 2 > r2) continue;
      const fresh = !this.knows(z.id);
      if (fresh) this.progress.known.push(z.id);
      this.progress.respawn = z.id;
      return fresh ? z : null;
    }
    return null;
  }
}
