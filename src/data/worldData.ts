// Carga de los datos del mundo visual. Vite reinyecta los JSON al editarlos.
import assetsJson from '../../data/assets.json';
import { parseAssets, type AssetManifest } from './worldSchema';

export interface WorldData {
  assets: AssetManifest;
}

export function loadWorldData(): WorldData {
  return {
    assets: parseAssets(assetsJson),
  };
}
