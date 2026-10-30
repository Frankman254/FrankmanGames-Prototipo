// Dispersión con semilla de vegetación y rocas, más los props colocados a mano
// (casas, troncos, farolas). Decide también qué bloquea el paso: esos ejemplares
// se convierten en obstáculos para la rejilla de colisión.
//
// Cada tipo tiene su propia secuencia aleatoria y cada candidato gasta siempre
// los mismos números, se acepte o no: mover una casa o quitar un árbol en el
// editor sólo cambia lo que hay alrededor, no el bosque entero. Por eso las
// `exclusions` (ejemplares quitados a mano) siguen apuntando al mismo árbol.
import type { RectObstacle } from '../sim/navGrid';
import { Rng } from '../sim/rng';
import type { Vec2 } from '../sim/vec2';
import { fbm, type FbmDef } from './noise';
import { pathEdgeDistance, type HeightField, type TerrainDef } from './terrain';

export const SCATTER_SHAPES = ['pine', 'broadleaf', 'bush', 'rock', 'flower', 'grass'] as const;
export type ScatterShape = (typeof SCATTER_SHAPES)[number];
export const PROP_KINDS = ['house', 'log', 'boulder', 'lamp'] as const;
export type PropKind = (typeof PROP_KINDS)[number];

export interface ScatterKindDef {
  shape: ScatterShape;
  /** Ejemplares por 100 m² donde el bosque es máximo. */
  density: number;
  minSpacing: number;
  scale: [number, number];
  /** Radio que bloquea el paso a escala 1 (0 = se atraviesa). */
  blockRadius: number;
  /** Distancia mínima al borde de un camino. */
  pathClearance: number;
  inFlatAreas: boolean;
  /** Peso del ruido de bosque: 1 = sólo en bosque, 0 = uniforme, < 0 = prefiere claros. */
  forest: number;
  /** Amplitud del balanceo de viento (0 = rígido). */
  wind: number;
  /** Rango del multiplicador de color por ejemplar. */
  tint: [number, number];
}

export interface PropDef {
  kind: PropKind;
  x: number;
  y: number;
  /** Huella en X y Z del mundo (el rectángulo que bloquea). */
  w: number;
  d: number;
  rotDeg: number;
}

/** Árbol, roca o arbusto colocado a mano en el editor (un tipo de `kinds`). */
export interface PlacementDef {
  kind: string;
  x: number;
  y: number;
  scale: number;
  rotDeg: number;
}

/** Ejemplar generado que se quitó a mano: tipo y posición (redondeada a 2 decimales). */
export interface ExclusionDef {
  kind: string;
  x: number;
  y: number;
}

/** Tolerancia (m) al buscar el ejemplar de una exclusión. */
export const EXCLUSION_TOLERANCE = 0.05;

export interface VegetationDef {
  seed: number;
  chunkMeters: number;
  clearRadiusAroundStart: number;
  forestNoise: FbmDef;
  wind: { speed: number; strength: number };
  kinds: Record<string, ScatterKindDef>;
  props: PropDef[];
  placements: PlacementDef[];
  exclusions: ExclusionDef[];
}

export interface ScatterInstance {
  x: number;
  z: number;
  /** Altura del suelo en (x, z). */
  y: number;
  scale: number;
  rotY: number;
  tint: number;
  /** Índice en `placements` si se colocó a mano (si no, es generado). */
  placement?: number;
}

export interface Scatter {
  /** Ejemplares por id de tipo (clave de `kinds`). */
  byKind: Map<string, ScatterInstance[]>;
  /** Obstáculos de colisión: troncos, rocas y props a mano. */
  obstacles: RectObstacle[];
}

/** Cuadrícula de cubos para comprobar separación entre ejemplares que bloquean. */
class Occupancy {
  private readonly cells = new Map<number, Array<{ x: number; z: number; r: number }>>();
  constructor(private readonly size: number) {}

  private key(cx: number, cz: number): number {
    return cx * 100003 + cz;
  }

  add(x: number, z: number, r: number): void {
    const k = this.key(Math.floor(x / this.size), Math.floor(z / this.size));
    let list = this.cells.get(k);
    if (!list) this.cells.set(k, (list = []));
    list.push({ x, z, r });
  }

  free(x: number, z: number, r: number, gap: number): boolean {
    const cx = Math.floor(x / this.size);
    const cz = Math.floor(z / this.size);
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const list = this.cells.get(this.key(cx + dx, cz + dz));
        if (!list) continue;
        for (const o of list) if (Math.hypot(o.x - x, o.z - z) < o.r + r + gap) return false;
      }
    }
    return true;
  }
}

function insideRect(p: Vec2, r: PropDef, margin: number): boolean {
  return Math.abs(p.x - r.x) < r.w / 2 + margin && Math.abs(p.y - r.y) < r.d / 2 + margin;
}

/** Semilla de un tipo: la de la vegetación mezclada con su id (FNV-1a). */
function kindSeed(seed: number, id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 0x01000193);
  return (h ^ seed) >>> 0;
}

/**
 * `onlyKinds`: genera sólo esos tipos (el editor regenera los que bloquean sin
 * la hierba). Los que bloquean no dependen de los que no, así que salen iguales.
 */
export function scatterVegetation(veg: VegetationDef, terrain: TerrainDef & { playerStart: Vec2 }, hf: HeightField, onlyKinds?: ReadonlySet<string>): Scatter {
  const byKind = new Map<string, ScatterInstance[]>();
  const obstacles: RectObstacle[] = veg.props.map((p) => ({ x: p.x, y: p.y, w: p.w, d: p.d }));
  // Los que bloquean comparten separación entre tipos (ningún árbol dentro de una roca).
  const occ = new Occupancy(4);
  for (const p of veg.props) occ.add(p.x, p.y, Math.hypot(p.w, p.d) / 2);
  const margin = 2; // ni en el borde exterior de la zona
  const excluded = (id: string, x: number, z: number): boolean =>
    veg.exclusions.some((e) => e.kind === id && Math.abs(e.x - x) < EXCLUSION_TOLERANCE && Math.abs(e.y - z) < EXCLUSION_TOLERANCE);

  // Primero los que bloquean, para que la vegetación pequeña se coloque alrededor.
  const ordered = Object.entries(veg.kinds).sort((a, b) => b[1].blockRadius - a[1].blockRadius);
  for (const [id, k] of ordered) {
    if (onlyKinds && !onlyKinds.has(id)) continue;
    const rng = new Rng(kindSeed(veg.seed, id));
    const list: ScatterInstance[] = [];
    const cell = k.minSpacing;
    const pPerCell = (k.density / 100) * cell * cell;
    for (let z0 = margin; z0 < terrain.depth - margin; z0 += cell) {
      for (let x0 = margin; x0 < terrain.width - margin; x0 += cell) {
        // Seis números por candidato siempre, aunque se descarte.
        const x = x0 + rng.next() * cell;
        const z = z0 + rng.next() * cell;
        const roll = rng.next();
        const scale = k.scale[0] + (k.scale[1] - k.scale[0]) * rng.next();
        const rotY = rng.next() * Math.PI * 2;
        const tint = k.tint[0] + (k.tint[1] - k.tint[0]) * rng.next();
        const forest = fbm(x, z, veg.forestNoise, veg.seed);
        // Bosque: probabilidad modulada hacia las zonas de ruido alto (o bajo si forest < 0).
        const f = Math.abs(k.forest);
        const bias = k.forest >= 0 ? forest : 1 - forest;
        const density = (1 - f) + f * Math.min(1, Math.max(0, (bias - 0.35) * 3));
        if (roll >= pPerCell * density) continue;
        if (x > terrain.width - margin || z > terrain.depth - margin) continue;
        if (pathEdgeDistance(terrain.paths, x, z) < k.pathClearance) continue;
        if (!k.inFlatAreas && terrain.flatAreas.some((a) => Math.hypot(x - a.x, z - a.y) < a.radius + 2)) continue;
        if (Math.hypot(x - terrain.playerStart.x, z - terrain.playerStart.y) < veg.clearRadiusAroundStart) continue;
        if (terrain.ponds.some((p) => Math.hypot(x - p.x, z - p.y) < p.radius + p.shore + 1)) continue;
        if (veg.props.some((p) => insideRect({ x, y: z }, p, 0.8))) continue;
        const r = k.blockRadius * scale;
        if (r > 0 && !occ.free(x, z, r, 0.6)) continue;
        // Un ejemplar quitado a mano sigue ocupando su sitio: los vecinos no cambian.
        if (r > 0) occ.add(x, z, r);
        if (excluded(id, x, z)) continue;
        if (r > 0) obstacles.push({ x, y: z, w: 2 * r, d: 2 * r, round: true });
        list.push({ x, z, y: hf.sample(x, z), scale, rotY, tint });
      }
    }
    byKind.set(id, list);
  }
  // Los colocados a mano van aparte: no empujan a los generados.
  veg.placements.forEach((p, i) => {
    const k = veg.kinds[p.kind];
    const list = byKind.get(p.kind);
    if (!k || !list) return;
    const r = k.blockRadius * p.scale;
    if (r > 0) obstacles.push({ x: p.x, y: p.y, w: 2 * r, d: 2 * r, round: true });
    list.push({ x: p.x, z: p.y, y: hf.sample(p.x, p.y), scale: p.scale, rotY: (p.rotDeg * Math.PI) / 180, tint: 1, placement: i });
  });
  return { byKind, obstacles };
}
