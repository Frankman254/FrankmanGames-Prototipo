// Stones (piedras de viaje) y coordenadas de mapa. Lógica pura: qué stones hay,
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
  /** Stone de partida: conocido desde el principio y reaparición por defecto. */
  home: string;
  stones: StoneDef[];
}

export function parseStones(raw: unknown): StonesDef {
  const r = new Reader('stones.json');
  const o = r.obj(raw);
  const stones = r.arr(o, 'stones').map((z, i) => {
    const c = r.child(`stones.${i}`);
    const zo = c.obj(z);
    return { id: c.str(zo, 'id'), name: c.str(zo, 'name'), x: c.num(zo, 'x', { min: 0 }), y: c.num(zo, 'y', { min: 0 }) };
  });
  const ids = new Set<string>();
  for (const z of stones) {
    if (ids.has(z.id)) r.fail('stones', `id repetido "${z.id}"`);
    ids.add(z.id);
  }
  const home = r.str(o, 'home');
  if (!ids.has(home)) r.fail('home', `stone desconocido "${home}"`);
  return {
    activateRadius: r.num(o, 'activateRadius', { min: 0.5, max: 20 }),
    coordCellMeters: r.num(o, 'coordCellMeters', { min: 1, max: 256 }),
    home,
    stones,
  };
}

/** Coordenadas de mapa como en DOFUS: el centro del mundo es [0, 0]. */
export function mapCoords(x: number, y: number, worldW: number, worldD: number, cell: number): [number, number] {
  return [Math.floor((x - worldW / 2) / cell), Math.floor((y - worldD / 2) / cell)];
}

/** Lo que el jugador sabe de los stones (se guarda por personaje). */
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
    const known = Array.isArray(s.known) ? s.known.filter((k): k is string => typeof k === 'string' && ids.has(k)) : [];
    if (!known.includes(def.home)) known.unshift(def.home);
    const respawn = typeof s.respawn === 'string' && known.includes(s.respawn) ? s.respawn : def.home;
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

  /** Stones conocidos, en el orden de los datos. */
  known(): StoneDef[] {
    return this.def.stones.filter((z) => this.knows(z.id));
  }

  /**
   * El jugador pasa por `pos` (con las posiciones reales de cada stone ya
   * ajustadas al suelo caminable). Devuelve el stone que acaba de activar por
   * primera vez, o null. Tocar uno lo hace punto de reaparición.
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
