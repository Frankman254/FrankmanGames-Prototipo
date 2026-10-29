// Carga de los datos del mundo visual. Vite reinyecta los JSON al editarlos.
import assetsJson from '../../data/assets.json';
import lightingJson from '../../data/lighting.json';
import terrainJson from '../../data/terrain.json';
import vegetationJson from '../../data/vegetation.json';
import type { LightingDef } from '../world/dayNight';
import type { VegetationDef } from '../world/scatter';
import { parseAssets, parseLighting, parseTerrain, parseVegetation, type AssetManifest, type OverworldDef } from './worldSchema';

export interface WorldData {
  assets: AssetManifest;
  terrain: OverworldDef;
  vegetation: VegetationDef;
  lighting: LightingDef;
}

export function loadWorldData(): WorldData {
  return {
    assets: parseAssets(assetsJson),
    terrain: parseTerrain(terrainJson),
    vegetation: parseVegetation(vegetationJson),
    lighting: parseLighting(lightingJson),
  };
}
