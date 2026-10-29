// Carga de los datos del mundo visual. Vite reinyecta los JSON al editarlos.
import assetsJson from '../../data/assets.json';
import terrainJson from '../../data/terrain.json';
import { parseAssets, parseTerrain, type AssetManifest, type OverworldDef } from './worldSchema';

export interface WorldData {
  assets: AssetManifest;
  terrain: OverworldDef;
}

export function loadWorldData(): WorldData {
  return {
    assets: parseAssets(assetsJson),
    terrain: parseTerrain(terrainJson),
  };
}
