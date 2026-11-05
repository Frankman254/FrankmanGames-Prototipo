// Piedras Pintadas (piedras de viaje) y coordenadas de mapa. Lógica pura: qué piedras hay,
// cuáles conoce el jugador, cuál es su punto de reaparición y en qué «mapa»
// [x, y] está. Lo guardado vive aparte (por personaje) y se valida al leerlo.
import { Reader } from '../data/validate';

export interface StoneDef {
  id: string;
  name: string;
  x: number;
  y: number;
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
    return { id: c.str(zo, 'id'), name: c.str(zo, 'name'), x: c.num(zo, 'x'), y: c.num(zo, 'y') };
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
