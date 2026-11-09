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
import { type HeightField, type TerrainDef } from './terrain';
import { pathEdgeDistance } from '../sim/paths';

/** Tamaño de página: el mismo reparto en la parcela y en el mundo (data/terrain.json). */
const SCATTER_PAGE = 128;

export const SCATTER_SHAPES = ['tree', 'bush', 'rock', 'flower', 'grass'] as const;
export type ScatterShape = (typeof SCATTER_SHAPES)[number];
export const PROP_KINDS = ['landmark', 'house', 'log', 'boulder', 'lamp'] as const;
export type PropKind = (typeof PROP_KINDS)[number];
export const PROP_STYLES = ['default', 'golden'] as const;
export type PropStyle = (typeof PROP_STYLES)[number];

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
  /** Piezas de assets/models/vegetacion.glb y su color. */
  pieces: ReadonlyArray<{ piece: string; color: [number, number, number]; shadow: boolean; wind?: number; thin?: boolean }>;
}

export type BiomeArea =
  | { type: 'circle'; x: number; y: number; radius: number }
  | { type: 'rect'; x0: number; y0: number; x1: number; y1: number };

/** Lo que crece en cada zona. Las áreas repiten las de data/zones.json (lo comprueba un test). */
export interface BiomeDef {
  id: string;
  /** Multiplica el color del suelo. */
  tint: [number, number, number];
  /** Multiplica el color de hierba y matas. */
  tone: [number, number, number];
  /** Densidad de cada tipo aquí; lo que no aparece no crece. */
  weights: Record<string, number>;
  areas: readonly BiomeArea[];
}

function inArea(a: BiomeArea, x: number, z: number): boolean {
  if (a.type === 'circle') return Math.hypot(x - a.x, z - a.y) <= a.radius;
  return x >= a.x0 && x <= a.x1 && z >= a.y0 && z <= a.y1;
}

/** Bioma en un punto: el primero de la lista que lo contiene, o el último. */
export function biomeAt(biomes: readonly BiomeDef[], x: number, z: number): BiomeDef | undefined {
  return biomes.find((b) => b.areas.some((a) => inArea(a, x, z))) ?? biomes[biomes.length - 1];
}

/** Color del suelo con las fronteras difuminadas. */
export function groundTintAt(biomes: readonly BiomeDef[], x: number, z: number): [number, number, number] {
  const out: [number, number, number] = [0, 0, 0];
  const R = 9;
  const samples = [[0, 0], [R, 0], [-R, 0], [0, R], [0, -R], [R * 0.7, R * 0.7], [-R * 0.7, R * 0.7], [R * 0.7, -R * 0.7], [-R * 0.7, -R * 0.7]] as const;
  for (const [dx, dz] of samples) {
    const t = biomeAt(biomes, x + dx, z + dz)?.tint ?? [1, 1, 1];
    out[0] += t[0] / samples.length;
    out[1] += t[1] / samples.length;
    out[2] += t[2] / samples.length;
  }
  return out;
}

export interface PropDef {
  kind: PropKind;
  /** `landmark`: archivo de assets/models/, sin extensión. */
  model?: string;
  /** Nodo concreto dentro de un catálogo GLB (rocas y troncos variados). */
  node?: string;
  /** Acabado visual reutilizable; `golden` es la prueba PBR del banco. */
  style?: PropStyle;
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
  biomes: readonly BiomeDef[];
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
  /** Color de la zona, solo en hierba y matas. */
  tone?: readonly [number, number, number];
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

/** Semilla de un tipo en una página: cada página sale igual en cualquier orden. */
function pageSeed(seed: number, id: string, x0: number, z0: number): number {
  return Math.imul(kindSeed(seed, id) ^ Math.imul(x0 | 0, 73856093), 1) ^ Math.imul(z0 | 0, 19349663);
}

/**
 * Parcela original, página a página.
 * `onlyKinds`: genera sólo esos tipos (el editor regenera los que bloquean sin
 * la hierba). Los que bloquean no dependen de los que no, así que salen iguales.
 */
export function scatterVegetation(veg: VegetationDef, terrain: TerrainDef & { playerStart: Vec2 }, hf: HeightField, onlyKinds?: ReadonlySet<string>, pageMeters = SCATTER_PAGE): Scatter {
  const byKind = new Map<string, ScatterInstance[]>();
  const obstacles: RectObstacle[] = veg.props.map((p) => ({ x: p.x, y: p.y, w: p.w, d: p.d }));
  for (let z0 = 0; z0 < terrain.depth; z0 += pageMeters) {
    for (let x0 = 0; x0 < terrain.width; x0 += pageMeters) {
      const s = scatterRegion(veg, terrain, hf, x0, z0, pageMeters, null, onlyKinds);
      for (const [id, list] of s.byKind) {
        const all = byKind.get(id);
        if (all) all.push(...list);
        else byKind.set(id, [...list]);
      }
      obstacles.push(...s.obstacles);
    }
  }
  return { byKind, obstacles };
}

/**
 * Plantas de un cuadrado. Los props no se devuelven como obstáculos, pero sí apartan a las
 * plantas. `dryAbove`: por debajo de esa altura (mar) no crece nada.
 */
export function scatterRegion(veg: VegetationDef, terrain: TerrainDef & { playerStart?: Vec2 }, hf: HeightField, x0: number, z0: number, size: number, dryAbove: number | null, onlyKinds?: ReadonlySet<string>): Scatter {
  const byKind = new Map<string, ScatterInstance[]>();
  const obstacles: RectObstacle[] = [];
  // Los que bloquean comparten separación entre tipos (ningún árbol dentro de una roca).
  const occ = new Occupancy(4);
  for (const p of veg.props) occ.add(p.x, p.y, Math.hypot(p.w, p.d) / 2);
  const margin = dryAbove === null ? 2 : 0; // la parcela sola no planta en su borde exterior
  const excluded = (id: string, x: number, z: number): boolean =>
    veg.exclusions.some((e) => e.kind === id && Math.abs(e.x - x) < EXCLUSION_TOLERANCE && Math.abs(e.y - z) < EXCLUSION_TOLERANCE);
  const start = terrain.playerStart;

  // Primero los que bloquean, para que la vegetación pequeña se coloque alrededor.
  const ordered = Object.entries(veg.kinds).sort((a, b) => b[1].blockRadius - a[1].blockRadius);
  for (const [id, k] of ordered) {
    if (onlyKinds && !onlyKinds.has(id)) continue;
    const rng = new Rng(pageSeed(veg.seed, id, x0, z0));
    const list: ScatterInstance[] = [];
    const cell = k.minSpacing;
    const pPerCell = (k.density / 100) * cell * cell;
    for (let oz = 0; oz < size; oz += cell) {
      for (let ox = 0; ox < size; ox += cell) {
        // Seis números por candidato siempre, aunque se descarte.
        const x = x0 + ox + rng.next() * cell;
        const z = z0 + oz + rng.next() * cell;
        const roll = rng.next();
        const scale = k.scale[0] + (k.scale[1] - k.scale[0]) * rng.next();
        const rotY = rng.next() * Math.PI * 2;
        const tint = k.tint[0] + (k.tint[1] - k.tint[0]) * rng.next();
        const forest = fbm(x, z, veg.forestNoise, veg.seed);
        // Bosque: probabilidad modulada hacia las zonas de ruido alto (o bajo si forest < 0).
        const f = Math.abs(k.forest);
        const bias = k.forest >= 0 ? forest : 1 - forest;
        const density = (1 - f) + f * Math.min(1, Math.max(0, (bias - 0.35) * 3));
        const biome = biomeAt(veg.biomes, x, z);
        if (roll >= pPerCell * density * (biome?.weights[id] ?? 0)) continue;
        if (x >= x0 + size || z >= z0 + size) continue;
        if (margin > 0 && (x < margin || z < margin || x > terrain.width - margin || z > terrain.depth - margin)) continue;
        if (pathEdgeDistance(terrain.paths, x, z) < k.pathClearance) continue;
        if (!k.inFlatAreas && terrain.flatAreas.some((a) => Math.hypot(x - a.x, z - a.y) < a.radius + 2)) continue;
        if (start && Math.hypot(x - start.x, z - start.y) < veg.clearRadiusAroundStart) continue;
        if (terrain.ponds.some((p) => Math.hypot(x - p.x, z - p.y) < p.radius + p.shore + 1)) continue;
        if (veg.props.some((p) => insideRect({ x, y: z }, p, 0.8))) continue;
        const y = hf.sample(x, z);
        if (dryAbove !== null && y < dryAbove + 0.6) continue;
        const r = k.blockRadius * scale;
        if (r > 0 && !occ.free(x, z, r, 0.6)) continue;
        // Un ejemplar quitado a mano sigue ocupando su sitio: los vecinos no cambian.
        if (r > 0) occ.add(x, z, r);
        if (excluded(id, x, z)) continue;
        if (r > 0) obstacles.push({ x, y: z, w: 2 * r, d: 2 * r, round: true });
        const toned = k.shape === 'grass' || k.shape === 'bush';
        list.push({ x, z, y, scale, rotY, tint, ...(toned && biome ? { tone: biome.tone } : {}) });
      }
    }
    byKind.set(id, list);
  }
  // Los colocados a mano van aparte: no empujan a los generados.
  veg.placements.forEach((p, i) => {
    if (p.x < x0 || p.y < z0 || p.x >= x0 + size || p.y >= z0 + size) return;
    const k = veg.kinds[p.kind];
    const list = byKind.get(p.kind);
    if (!k || !list) return;
    const r = k.blockRadius * p.scale;
    if (r > 0) obstacles.push({ x: p.x, y: p.y, w: 2 * r, d: 2 * r, round: true });
    list.push({ x: p.x, z: p.y, y: hf.sample(p.x, p.y), scale: p.scale, rotY: (p.rotDeg * Math.PI) / 180, tint: 1, placement: i });
  });
  return { byKind, obstacles };
}
