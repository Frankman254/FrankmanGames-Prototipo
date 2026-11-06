// Mapa de los interiores (F26): mazmorras, casas, castillo y banco se descubren al andar, igual
// que el exterior. Cada lugar (y cada piso) guarda su propia niebla sobre las casillas de su
// rejilla de paso; el minimapa pinta suelo y paredes de lo ya visto. Puro: sin DOM.
import { FogOfWar } from './mapLogic';

/** Lo que el mapa necesita de la rejilla de paso del interior (`NavGrid` lo cumple). */
export interface InteriorGrid {
  readonly cols: number;
  readonly rows: number;
  readonly cellSize: number;
  readonly originX: number;
  readonly originY: number;
  /** Bit 1 = casilla bloqueada. */
  readonly blocked: Uint8Array;
}

export interface InteriorColors {
  floor: [number, number, number];
  wall: [number, number, number];
}

/** Un lugar y su tamaño: si la rejilla cambia (otro diseño), su niebla empieza de cero. */
export const interiorKey = (name: string, g: InteriorGrid): string => `${name}|${g.cols}x${g.rows}`;

export class InteriorMaps {
  private readonly maps = new Map<string, FogOfWar>();
  private readonly saved: Record<string, string>;

  constructor(saved?: unknown) {
    this.saved = {};
    if (saved && typeof saved === 'object') {
      for (const [k, v] of Object.entries(saved as Record<string, unknown>)) if (typeof v === 'string') this.saved[k] = v;
    }
  }

  /** Niebla del lugar (se crea o se lee la primera vez). */
  fogFor(name: string, g: InteriorGrid): FogOfWar {
    const key = interiorKey(name, g);
    let fog = this.maps.get(key);
    if (!fog) {
      fog = FogOfWar.load(this.saved[key], g.cols * g.cellSize, g.rows * g.cellSize, g.cellSize);
      this.maps.set(key, fog);
    }
    return fog;
  }

  /** Descubre alrededor de (x, y). Devuelve si cambió algo. */
  reveal(name: string, g: InteriorGrid, x: number, y: number, radius: number): boolean {
    return this.fogFor(name, g).reveal(x - g.originX, y - g.originY, radius);
  }

  toJSON(): Record<string, string> {
    const out: Record<string, string> = { ...this.saved };
    for (const [k, fog] of this.maps) out[k] = fog.serialize();
    return out;
  }
}

const isWalkable = (g: InteriorGrid, c: number, r: number): boolean => c >= 0 && r >= 0 && c < g.cols && r < g.rows && (g.blocked[r * g.cols + c]! & 1) === 0;

/**
 * Píxeles RGBA (uno por casilla, fila 0 = la de menor y) de lo descubierto: suelo donde se
 * pisa y pared en lo bloqueado que toca un suelo. Lo demás, transparente.
 */
export function interiorPixels(g: InteriorGrid, fog: FogOfWar, colors: InteriorColors): Uint8ClampedArray<ArrayBuffer> {
  const px = new Uint8ClampedArray(g.cols * g.rows * 4);
  for (let r = 0; r < g.rows; r++) {
    for (let c = 0; c < g.cols; c++) {
      if (!fog.isCellRevealed(c, r)) continue;
      let col: [number, number, number] | null = null;
      if (isWalkable(g, c, r)) col = colors.floor;
      else if (isWalkable(g, c + 1, r) || isWalkable(g, c - 1, r) || isWalkable(g, c, r + 1) || isWalkable(g, c, r - 1)) col = colors.wall;
      if (!col) continue;
      const i = (r * g.cols + c) * 4;
      px[i] = col[0];
      px[i + 1] = col[1];
      px[i + 2] = col[2];
      px[i + 3] = 255;
    }
  }
  return px;
}
