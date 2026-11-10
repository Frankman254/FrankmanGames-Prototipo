// Capa ambiental: piezas de los catálogos de Blender (detalle de suelo, costa, caminos
// rurales y rocas/troncos) colocadas desde data/ambient.json. Dos familias:
//  - `layers`: detalle bajo repartido con semilla, sin colisión (se atraviesa).
//  - `placed`: piezas puestas a mano; las sólidas llevan huella explícita que bloquea el paso.
// Puro y determinista: no sabe de render ni de DOM. El mismo trozo sale siempre igual.
import type { RectObstacle } from '../sim/navGrid';
import { pathEdgeDistance, type PathDef } from '../sim/paths';
import { Rng } from '../sim/rng';
import type { VegetationRing } from './detail';
import { fbm, type FbmDef } from './noise';
import { biomeAt, type BiomeDef, type PropDef } from './scatter';
import type { FlatAreaDef, PondDef } from './terrain';

export const AMBIENT_RINGS = ['detail', 'prop'] as const;
export type AmbientRing = (typeof AMBIENT_RINGS)[number];

/** Una pieza de un catálogo GLB y su huella a escala 1 (m). */
export interface AmbientPieceDef {
  /** Archivo de assets/models/, sin extensión. */
  model: string;
  /** Ancho (X local), fondo (Z local) y alto de la pieza. */
  w: number;
  d: number;
  h: number;
  /** Bloquea el paso: sólo puede ir en `placed`, nunca en una capa. */
  solid: boolean;
}

export interface AmbientLayerDef {
  id: string;
  /** Nodos que reparte esta capa (claves de `pieces`), todos atravesables. */
  pieces: readonly string[];
  /** Ejemplares por 100 m² donde el peso es 1. */
  density: number;
  minSpacing: number;
  scale: [number, number];
  /** Rango del multiplicador de color por ejemplar. */
  tint: [number, number];
  /** Distancia mínima al borde de un camino. */
  pathClearance: number;
  /** Si existe, sólo a esta distancia [mín, máx] del borde de un camino. */
  pathBand?: [number, number];
  /** Si existe, sólo con el suelo a esta altura [mín, máx] sobre el mar (playa). */
  shore?: [number, number];
  /** Peso del ruido de bosque, como en la vegetación: 1 = sólo bosque, 0 = uniforme. */
  forest: number;
  inFlatAreas: boolean;
  /** Pendiente máxima (m/m): más inclinado no se coloca. */
  maxSlope: number;
  ring: AmbientRing;
  /** Peso por bioma (id de data/vegetation.json); lo que no aparece usa `defaultWeight`. */
  weights: Record<string, number>;
  defaultWeight: number;
}

export interface AmbientPlacedDef {
  piece: string;
  x: number;
  y: number;
  rotDeg: number;
  scale: number;
}

export interface AmbientBudget {
  /** Ejemplares de detalle como máximo en un trozo. */
  maxScatterPerChunk: number;
  /** Triángulos como máximo en un trozo (detalle más piezas sólidas). */
  maxTrianglesPerChunk: number;
  maxPlaced: number;
  /** Lo más que el suelo puede separarse del plano de apoyo de una pieza puesta a mano (m). */
  maxPlacedGap: number;
  /** Pendiente máxima (m/m) del suelo bajo una pieza puesta a mano. */
  maxPlacedSlope: number;
  /** Distancia mínima de una pieza sólida al borde de un camino (m). */
  solidPathClearance: number;
}

export interface AmbientDef {
  seed: number;
  /** Lado del trozo que se construye y se suelta de una vez; divide a la página. */
  chunkMeters: number;
  rings: Record<AmbientRing, VegetationRing>;
  budget: AmbientBudget;
  pieces: Record<string, AmbientPieceDef>;
  layers: readonly AmbientLayerDef[];
  placed: readonly AmbientPlacedDef[];
}

/** Lo que la capa necesita saber del mundo para decidir dónde cabe algo. */
export interface AmbientSite {
  paths: readonly PathDef[];
  flatAreas: readonly FlatAreaDef[];
  ponds: readonly PondDef[];
  props: readonly PropDef[];
  biomes: readonly BiomeDef[];
  forestNoise: FbmDef;
  forestSeed: number;
  seaLevel: number;
  height(x: number, z: number): number;
  playable(x: number, z: number): boolean;
}

export interface AmbientInstance {
  piece: string;
  x: number;
  z: number;
  /** Altura del suelo en (x, z). */
  y: number;
  scale: number;
  rotY: number;
  tint: number;
  /** Pendiente del suelo (m/m) en X y Z: la pieza se recuesta sobre ella. */
  slopeX: number;
  slopeZ: number;
}

/** Margen sobre el mar bajo el que no se coloca nada (igual que la vegetación). */
export const AMBIENT_DRY_MARGIN = 1;
/** Separación entre círculos de la huella, en diámetros. */
const FOOTPRINT_STEP = 0.5;

/**
 * Giro de un punto local al mundo, el mismo que usa el dibujo: con rotY = 0 el eje X
 * local es +X del mundo; al crecer rotY gira hacia −Z.
 */
export function rotateLocal(lx: number, lz: number, rotY: number): { x: number; z: number } {
  const c = Math.cos(rotY);
  const s = Math.sin(rotY);
  return { x: lx * c + lz * s, z: -lx * s + lz * c };
}

function layerSeed(seed: number, id: string, x0: number, z0: number): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 0x01000193);
  return ((h ^ seed) ^ Math.imul(x0 | 0, 73856093) ^ Math.imul(z0 | 0, 19349663)) >>> 0;
}

function slopeAt(site: AmbientSite, x: number, z: number): { sx: number; sz: number } {
  const e = 0.5;
  return { sx: (site.height(x + e, z) - site.height(x - e, z)) / (2 * e), sz: (site.height(x, z + e) - site.height(x, z - e)) / (2 * e) };
}

/** Círculos que cubren la huella girada de una pieza sólida (ninguno si se atraviesa). */
export function solidFootprint(def: AmbientDef, s: AmbientPlacedDef): RectObstacle[] {
  const piece = def.pieces[s.piece];
  if (!piece || !piece.solid) return [];
  const w = piece.w * s.scale;
  const d = piece.d * s.scale;
  const along = w >= d;
  const long = along ? w : d;
  const short = Math.max(0.3, along ? d : w);
  const rotY = (s.rotDeg * Math.PI) / 180;
  const n = Math.max(1, Math.ceil((long - short) / (short * FOOTPRINT_STEP)) + 1);
  const out: RectObstacle[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : -(long - short) / 2 + ((long - short) * i) / (n - 1);
    const o = rotateLocal(along ? t : 0, along ? 0 : t, rotY);
    out.push({ x: s.x + o.x, y: s.y + o.z, w: short, d: short, round: true });
  }
  return out;
}

/** Obstáculos de todas las piezas sólidas, para la rejilla de paso. */
export function ambientObstacles(def: AmbientDef): RectObstacle[] {
  return def.placed.flatMap((s) => solidFootprint(def, s));
}

export interface PlacedGround {
  /** Altura a la que se apoya el origen de la pieza. */
  y: number;
  /** Pendiente del plano de apoyo (m/m): la pieza se recuesta sobre él. */
  slopeX: number;
  slopeZ: number;
  /** Lo más que el suelo real se separa de ese plano bajo la huella (m). */
  gap: number;
  /** Altura mínima del suelo bajo la huella. */
  min: number;
}

/**
 * Apoyo de una pieza puesta a mano: el plano del suelo bajo su huella girada. La pieza
 * sigue ese plano (una cerca acompaña la cuesta), así que ni flota ni se entierra más
 * que `gap`; la mitad de ese resto se hunde para que no asome aire por debajo.
 */
export function placedGround(def: AmbientDef, s: AmbientPlacedDef, height: (x: number, z: number) => number): PlacedGround {
  const piece = def.pieces[s.piece]!;
  const rotY = (s.rotDeg * Math.PI) / 180;
  const r = Math.max(0.5, (Math.hypot(piece.w, piece.d) * s.scale) / 2);
  const slopeX = (height(s.x + r, s.y) - height(s.x - r, s.y)) / (2 * r);
  const slopeZ = (height(s.x, s.y + r) - height(s.x, s.y - r)) / (2 * r);
  const center = height(s.x, s.y);
  let gap = 0;
  let min = center;
  for (const fx of [-0.5, 0, 0.5]) {
    for (const fz of [-0.5, 0, 0.5]) {
      const o = rotateLocal(fx * piece.w * s.scale, fz * piece.d * s.scale, rotY);
      const h = height(s.x + o.x, s.y + o.z);
      min = Math.min(min, h);
      gap = Math.max(gap, Math.abs(h - (center + slopeX * o.x + slopeZ * o.z)));
    }
  }
  return { y: center - gap / 2, slopeX, slopeZ, gap, min };
}

/** Piezas puestas a mano cuyo centro cae en el cuadrado. */
export function placedInChunk(def: AmbientDef, x0: number, z0: number, size: number): AmbientPlacedDef[] {
  return def.placed.filter((s) => s.x >= x0 && s.x < x0 + size && s.y >= z0 && s.y < z0 + size);
}

/**
 * Detalle atravesable de un cuadrado. Cada capa tiene su secuencia y cada candidato gasta
 * siempre los mismos números, se acepte o no: tocar una capa no mueve las demás.
 */
export function scatterAmbient(def: AmbientDef, site: AmbientSite, x0: number, z0: number, size: number): AmbientInstance[] {
  const out: AmbientInstance[] = [];
  const blockers = def.placed.filter((s) => def.pieces[s.piece]?.solid).map((s) => ({ x: s.x, y: s.y, r: (Math.hypot(def.pieces[s.piece]?.w ?? 0, def.pieces[s.piece]?.d ?? 0) * s.scale) / 2 }));
  const dry = site.seaLevel + AMBIENT_DRY_MARGIN;
  for (const layer of def.layers) {
    if (layer.pieces.length === 0 || layer.density <= 0) continue;
    const rng = new Rng(layerSeed(def.seed, layer.id, x0, z0));
    const cell = layer.minSpacing;
    const pPerCell = (layer.density / 100) * cell * cell;
    for (let oz = 0; oz < size; oz += cell) {
      for (let ox = 0; ox < size; ox += cell) {
        const x = x0 + ox + rng.next() * cell;
        const z = z0 + oz + rng.next() * cell;
        const roll = rng.next();
        const scale = layer.scale[0] + (layer.scale[1] - layer.scale[0]) * rng.next();
        const rotY = rng.next() * Math.PI * 2;
        const tint = layer.tint[0] + (layer.tint[1] - layer.tint[0]) * rng.next();
        const piece = layer.pieces[Math.min(layer.pieces.length - 1, Math.floor(rng.next() * layer.pieces.length))]!;
        if (x >= x0 + size || z >= z0 + size) continue;
        const weight = layer.weights[biomeAt(site.biomes, x, z)?.id ?? ''] ?? layer.defaultWeight;
        if (weight <= 0) continue;
        let density = 1;
        if (layer.forest !== 0) {
          const f = Math.abs(layer.forest);
          const noise = fbm(x, z, site.forestNoise, site.forestSeed);
          const bias = layer.forest >= 0 ? noise : 1 - noise;
          density = 1 - f + f * Math.min(1, Math.max(0, (bias - 0.35) * 3));
        }
        if (roll >= pPerCell * density * weight) continue;
        const edge = pathEdgeDistance(site.paths, x, z);
        if (edge < layer.pathClearance) continue;
        if (layer.pathBand && (edge < layer.pathBand[0] || edge > layer.pathBand[1])) continue;
        if (!layer.inFlatAreas && site.flatAreas.some((a) => Math.hypot(x - a.x, z - a.y) < a.radius + 2)) continue;
        if (site.ponds.some((p) => Math.hypot(x - p.x, z - p.y) < p.radius + 1)) continue;
        if (site.props.some((p) => Math.abs(x - p.x) < p.w / 2 + 0.4 && Math.abs(z - p.y) < p.d / 2 + 0.4)) continue;
        if (blockers.some((b) => Math.hypot(x - b.x, z - b.y) < b.r)) continue;
        if (!site.playable(x, z)) continue;
        const y = site.height(x, z);
        if (y < dry) continue;
        if (layer.shore && (y - site.seaLevel < layer.shore[0] || y - site.seaLevel > layer.shore[1])) continue;
        const { sx, sz } = slopeAt(site, x, z);
        if (Math.hypot(sx, sz) > layer.maxSlope) continue;
        out.push({ piece, x, z, y, scale, rotY, tint, slopeX: sx, slopeZ: sz });
        if (out.length >= def.budget.maxScatterPerChunk) return out;
      }
    }
  }
  return out;
}
