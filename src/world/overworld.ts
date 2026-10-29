// Composición de la zona continua del Slice 02: terreno y obstáculos. Produce
// la `ZoneDef` con la que se construye `World`, sin tocar la simulación.
import type { GameData } from '../data';
import type { OverworldDef } from '../data/worldSchema';
import type { WorldData } from '../data/worldData';
import type { RectObstacle } from '../sim/navGrid';
import { generateHeightField, type HeightField } from './terrain';

export interface Overworld {
  def: OverworldDef;
  heights: HeightField;
  /** Obstáculos que bloquean el paso (se marcan en la rejilla de colisión). */
  obstacles: RectObstacle[];
}

export function buildOverworld(wd: WorldData): Overworld {
  const def = wd.terrain;
  return { def, heights: generateHeightField(def), obstacles: [] };
}

/** Datos de juego con la zona sustituida por la del mundo continuo. */
export function withOverworldZone(data: GameData, ow: Overworld): GameData {
  return {
    ...data,
    zone: { ...data.zone, width: ow.def.width, depth: ow.def.depth, playerStart: ow.def.playerStart, obstacles: ow.obstacles },
  };
}
