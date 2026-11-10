// Composición de la zona continua del Slice 02: terreno, vegetación y obstáculos. Produce
// la `ZoneDef` con la que se construye `World`, sin tocar la simulación.
import type { GameData } from '../data';
import type { AnimationDataDef, AssetManifest, OverworldDef } from '../data/worldSchema';
import type { WorldData } from '../data/worldData';
import { NavGrid, type NavPaint, type RectObstacle } from '../sim/navGrid';
import { ambientObstacles, type AmbientDef, type AmbientSite } from './ambient';
import type { AtlasDef } from './atlas';
import type { LightingDef } from './dayNight';
import type { DetailDef } from './detail';
import { INSTANCE_STRIDE, type PageData } from './pages';
import { atlasToShape } from './pageContext';
import type { Scatter, ScatterInstance, VegetationDef } from './scatter';
import type { WorldBounds } from './shape';
import { WorldStream } from './stream';
import { HeightField } from './terrain';

export interface Overworld {
  def: OverworldDef;
  heights: HeightField;
  /** Rejilla de paso común a todos los `World` del exterior. */
  grid: NavGrid;
  /** Lo que se carga y se suelta al caminar. */
  stream: WorldStream;
  /** Obstáculos que bloquean el paso (se marcan en la rejilla de colisión). */
  obstacles: RectObstacle[];
  /** Celdas pintadas a mano en el editor. */
  navPaint: NavPaint;
  vegetation: VegetationDef;
  scatter: Scatter;
  lighting: LightingDef;
  /** Manifiesto de personajes y datos de animación (data/assets.json, data/animation.json). */
  characters: { assets: AssetManifest; animation: AnimationDataDef };
  detail: DetailDef;
  atlas: AtlasDef;
  ambient: AmbientDef;
}

/** Mundo mínimo si los datos no traen uno: solo la parcela. */
function boundsOf(def: OverworldDef): WorldBounds {
  return def.world ?? { x0: 0, z0: 0, x1: def.width, z1: def.depth, playable: [], pageMeters: 128, cellSize: 0.5, navRadius: 0.5 };
}

export function buildOverworld(wd: WorldData): Overworld {
  const def = wd.terrain;
  const bounds = boundsOf(def);
  const width = bounds.x1 - bounds.x0;
  const depth = bounds.z1 - bounds.z0;
  const heights = new HeightField(width, depth, def.heightStep, new Float32Array((Math.round(width / def.heightStep) + 1) * (Math.round(depth / def.heightStep) + 1)), bounds.x0, bounds.z0);
  const grid = NavGrid.streamed(width, depth, bounds.cellSize, bounds.x0, bounds.z0, bounds.navRadius);
  // Los que se pusieron a mano bloquean aunque su página aún no esté cargada.
  for (const p of wd.vegetation.props) grid.stamp({ x: p.x, y: p.y, w: p.w, d: p.d });
  // Igual que las piezas sólidas de la capa ambiental (cercas, rocas de costa, tocones).
  const ambientSolids = ambientObstacles(wd.ambient);
  for (const o of ambientSolids) grid.stamp(o);
  const stream = new WorldStream({ terrain: def, vegetation: wd.vegetation, atlas: wd.atlas, bounds, cellSize: bounds.cellSize }, heights, grid, wd.detail.stream);
  // La parcela donde empieza todo se carga al arrancar; lo demás, al caminar.
  stream.ensure(0, 0, def.width, def.depth);
  const scatter = plotScatter(wd.vegetation, stream.activePages);
  scatter.obstacles.push(...ambientSolids);
  return { def, heights, grid, stream, obstacles: scatter.obstacles, navPaint: wd.navPaint, vegetation: wd.vegetation, scatter, lighting: wd.lighting, characters: { assets: wd.assets, animation: wd.animation }, detail: wd.detail, atlas: wd.atlas, ambient: wd.ambient };
}

/** Lo que la capa ambiental consulta del mundo; las alturas valen donde la página ya llegó. */
export function ambientSite(ow: Overworld): AmbientSite {
  const shape = atlasToShape(ow.stream.ctx);
  return {
    paths: ow.def.paths,
    flatAreas: ow.def.flatAreas,
    ponds: ow.def.ponds,
    props: ow.vegetation.props,
    biomes: ow.vegetation.biomes,
    forestNoise: ow.vegetation.forestNoise,
    forestSeed: ow.vegetation.seed,
    seaLevel: shape.seaLevel,
    height: (x, z) => ow.heights.sample(x, z),
    playable: (x, z) => shape.playable(x, z),
  };
}

/** Lo que hay en las páginas iniciales, en la forma que usan el mapa y el editor. */
function plotScatter(veg: VegetationDef, pages: readonly PageData[]): Scatter {
  const byKind = new Map<string, ScatterInstance[]>();
  const obstacles: RectObstacle[] = veg.props.map((p) => ({ x: p.x, y: p.y, w: p.w, d: p.d }));
  for (const id of Object.keys(veg.kinds)) byKind.set(id, []);
  for (const page of pages) {
    for (const [id, data] of Object.entries(page.kinds)) {
      const list = byKind.get(id)!;
      const blocks = veg.kinds[id]!.blockRadius;
      for (let i = 0; i < data.length; i += INSTANCE_STRIDE) {
        const scale = data[i + 3]!;
        const tone: [number, number, number] = [data[i + 6]!, data[i + 7]!, data[i + 8]!];
        list.push({ x: data[i]!, y: data[i + 1]!, z: data[i + 2]!, scale, rotY: data[i + 4]!, tint: data[i + 5]!, tone });
        if (blocks > 0) {
          const r = blocks * scale;
          obstacles.push({ x: data[i]!, y: data[i + 2]!, w: 2 * r, d: 2 * r, round: true });
        }
      }
    }
  }
  return { byKind, obstacles };
}

/**
 * Datos de juego con la zona sustituida por la del mundo continuo. El encuentro
 * de la arena se traslada con `encounterOffset` (la simulación lo lleva a la
 * celda caminable más cercana si cae en un obstáculo).
 */
export function withOverworldZone(data: GameData, ow: Overworld): GameData {
  const off = ow.def.encounterOffset;
  return {
    ...data,
    zone: {
      ...data.zone,
      width: ow.grid.width,
      depth: ow.grid.depth,
      originX: ow.grid.originX,
      originY: ow.grid.originY,
      playerStart: ow.def.playerStart,
      obstacles: ow.obstacles,
      navPaint: ow.navPaint,
      paths: ow.def.paths,
      shared: { grid: ow.grid, isActive: (x, y) => ow.stream.isActive(x, y) },
    },
    encounter: { ...data.encounter, spawns: data.encounter.spawns.map((s) => ({ ...s, x: s.x + off.x, y: s.y + off.y })) },
  };
}
