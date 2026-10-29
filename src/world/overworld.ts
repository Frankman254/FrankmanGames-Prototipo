// Composición de la zona continua del Slice 02: terreno, vegetación y obstáculos. Produce
// la `ZoneDef` con la que se construye `World`, sin tocar la simulación.
import type { GameData } from '../data';
import type { OverworldDef } from '../data/worldSchema';
import type { WorldData } from '../data/worldData';
import type { RectObstacle } from '../sim/navGrid';
import type { LightingDef } from './dayNight';
import { scatterVegetation, type Scatter, type VegetationDef } from './scatter';
import { generateHeightField, type HeightField } from './terrain';

export interface Overworld {
  def: OverworldDef;
  heights: HeightField;
  /** Obstáculos que bloquean el paso (se marcan en la rejilla de colisión). */
  obstacles: RectObstacle[];
  vegetation: VegetationDef;
  scatter: Scatter;
  lighting: LightingDef;
}

export function buildOverworld(wd: WorldData): Overworld {
  const def = wd.terrain;
  const heights = generateHeightField(def);
  const scatter = scatterVegetation(wd.vegetation, def, heights);
  return { def, heights, obstacles: scatter.obstacles, vegetation: wd.vegetation, scatter, lighting: wd.lighting };
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
    zone: { ...data.zone, width: ow.def.width, depth: ow.def.depth, playerStart: ow.def.playerStart, obstacles: ow.obstacles },
    encounter: { ...data.encounter, spawns: data.encounter.spawns.map((s) => ({ ...s, x: s.x + off.x, y: s.y + off.y })) },
  };
}
