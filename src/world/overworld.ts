// Composición de la zona continua del Slice 02: terreno, vegetación y obstáculos. Produce
// la `ZoneDef` con la que se construye `World`, sin tocar la simulación.
import type { GameData } from '../data';
import type { OverworldDef } from '../data/worldSchema';
import type { WorldData } from '../data/worldData';
import type { RectObstacle } from '../sim/navGrid';
import { scatterVegetation, type Scatter, type VegetationDef } from './scatter';
import { generateHeightField, type HeightField } from './terrain';

export interface Overworld {
  def: OverworldDef;
  heights: HeightField;
  /** Obstáculos que bloquean el paso (se marcan en la rejilla de colisión). */
  obstacles: RectObstacle[];
  vegetation: VegetationDef;
  scatter: Scatter;
}

export function buildOverworld(wd: WorldData): Overworld {
  const def = wd.terrain;
  const heights = generateHeightField(def);
  const scatter = scatterVegetation(wd.vegetation, def, heights);
  return { def, heights, obstacles: scatter.obstacles, vegetation: wd.vegetation, scatter };
}

/** Datos de juego con la zona sustituida por la del mundo continuo. */
export function withOverworldZone(data: GameData, ow: Overworld): GameData {
  return {
    ...data,
    zone: { ...data.zone, width: ow.def.width, depth: ow.def.depth, playerStart: ow.def.playerStart, obstacles: ow.obstacles },
  };
}
