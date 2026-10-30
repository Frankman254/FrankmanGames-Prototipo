// Zaaps (piedras de viaje) y coordenadas de mapa. Lógica pura: qué zaaps hay,
// cuáles conoce el jugador, cuál es su punto de reaparición y en qué «mapa»
// [x, y] está. Lo guardado vive aparte (por personaje) y se valida al leerlo.
import { Reader } from '../data/validate';

export interface ZaapDef {
  id: string;
  name: string;
  x: number;
  y: number;
}

export interface ZaapsDef {
  activateRadius: number;
  coordCellMeters: number;
  /** Zaap de partida: conocido desde el principio y reaparición por defecto. */
  home: string;
  zaaps: ZaapDef[];
}

export function parseZaaps(raw: unknown): ZaapsDef {
  const r = new Reader('zaaps.json');
  const o = r.obj(raw);
  const zaaps = r.arr(o, 'zaaps').map((z, i) => {
    const c = r.child(`zaaps.${i}`);
    const zo = c.obj(z);
    return { id: c.str(zo, 'id'), name: c.str(zo, 'name'), x: c.num(zo, 'x', { min: 0 }), y: c.num(zo, 'y', { min: 0 }) };
  });
  const ids = new Set<string>();
  for (const z of zaaps) {
    if (ids.has(z.id)) r.fail('zaaps', `id repetido "${z.id}"`);
    ids.add(z.id);
  }
  const home = r.str(o, 'home');
  if (!ids.has(home)) r.fail('home', `zaap desconocido "${home}"`);
  return {
    activateRadius: r.num(o, 'activateRadius', { min: 0.5, max: 20 }),
    coordCellMeters: r.num(o, 'coordCellMeters', { min: 1, max: 256 }),
    home,
    zaaps,
  };
}

/** Coordenadas de mapa como en DOFUS: el centro del mundo es [0, 0]. */
export function mapCoords(x: number, y: number, worldW: number, worldD: number, cell: number): [number, number] {
  return [Math.floor((x - worldW / 2) / cell), Math.floor((y - worldD / 2) / cell)];
}

/** Lo que el jugador sabe de los zaaps (se guarda por personaje). */
export interface ZaapProgress {
  known: string[];
  respawn: string;
}

export class ZaapBook {
  progress: ZaapProgress;

  constructor(
    readonly def: ZaapsDef,
    saved: unknown = null,
  ) {
    this.progress = ZaapBook.normalize(def, saved);
  }

  static normalize(def: ZaapsDef, saved: unknown): ZaapProgress {
    const ids = new Set(def.zaaps.map((z) => z.id));
    const s = (saved && typeof saved === 'object' ? saved : {}) as Partial<Record<keyof ZaapProgress, unknown>>;
    const known = Array.isArray(s.known) ? s.known.filter((k): k is string => typeof k === 'string' && ids.has(k)) : [];
    if (!known.includes(def.home)) known.unshift(def.home);
    const respawn = typeof s.respawn === 'string' && known.includes(s.respawn) ? s.respawn : def.home;
    return { known: [...new Set(known)], respawn };
  }

  get(id: string): ZaapDef | undefined {
    return this.def.zaaps.find((z) => z.id === id);
  }

  knows(id: string): boolean {
    return this.progress.known.includes(id);
  }

  get respawn(): ZaapDef {
    return this.get(this.progress.respawn)!;
  }

  /** Zaaps conocidos, en el orden de los datos. */
  known(): ZaapDef[] {
    return this.def.zaaps.filter((z) => this.knows(z.id));
  }

  /**
   * El jugador pasa por `pos` (con las posiciones reales de cada zaap ya
   * ajustadas al suelo caminable). Devuelve el zaap que acaba de activar por
   * primera vez, o null. Tocar uno lo hace punto de reaparición.
   */
  touch(pos: { x: number; y: number }, at: (z: ZaapDef) => { x: number; y: number }): ZaapDef | null {
    const r2 = this.def.activateRadius ** 2;
    for (const z of this.def.zaaps) {
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
