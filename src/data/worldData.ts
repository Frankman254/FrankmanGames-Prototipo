// Carga de los datos del mundo visual. Vite reinyecta los JSON al editarlos.
import animationJson from '../../data/animation.json';
import assetsJson from '../../data/assets.json';
import detailJson from '../../data/detail.json';
import lightingJson from '../../data/lighting.json';
import navPaintJson from '../../data/navpaint.json';
import panamaJson from '../../data/panama.json';
import terrainJson from '../../data/terrain.json';
import vegetationJson from '../../data/vegetation.json';
import type { NavPaint } from '../sim/navGrid';
import type { AtlasDef } from '../world/atlas';
import type { LightingDef } from '../world/dayNight';
import type { DetailDef } from '../world/detail';
import type { VegetationDef } from '../world/scatter';
import { parseAnimation, parseAssets, parseDetail, parseLighting, parseNavPaint, parseTerrain, parseVegetation, type AnimationDataDef, type AssetManifest, type OverworldDef } from './worldSchema';

export interface WorldData {
  assets: AssetManifest;
  animation: AnimationDataDef;
  terrain: OverworldDef;
  vegetation: VegetationDef;
  lighting: LightingDef;
  navPaint: NavPaint;
  detail: DetailDef;
  atlas: AtlasDef;
}

export function loadWorldData(): WorldData {
  return {
    assets: parseAssets(assetsJson),
    animation: parseAnimation(animationJson),
    terrain: parseTerrain(terrainJson),
    vegetation: parseVegetation(vegetationJson),
    lighting: parseLighting(lightingJson),
    navPaint: parseNavPaint(navPaintJson),
    detail: parseDetail(detailJson),
    atlas: panamaJson as unknown as AtlasDef,
  };
}
