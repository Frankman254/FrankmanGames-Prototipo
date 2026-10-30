// Carga de los datos del mundo visual. Vite reinyecta los JSON al editarlos.
import animationJson from '../../data/animation.json';
import assetsJson from '../../data/assets.json';
import lightingJson from '../../data/lighting.json';
import navPaintJson from '../../data/navpaint.json';
import terrainJson from '../../data/terrain.json';
import vegetationJson from '../../data/vegetation.json';
import type { NavPaint } from '../sim/navGrid';
import type { LightingDef } from '../world/dayNight';
import type { VegetationDef } from '../world/scatter';
import { parseAnimation, parseAssets, parseLighting, parseNavPaint, parseTerrain, parseVegetation, type AnimationDataDef, type AssetManifest, type OverworldDef } from './worldSchema';

export interface WorldData {
  assets: AssetManifest;
  animation: AnimationDataDef;
  terrain: OverworldDef;
  vegetation: VegetationDef;
  lighting: LightingDef;
  navPaint: NavPaint;
}

export function loadWorldData(): WorldData {
  return {
    assets: parseAssets(assetsJson),
    animation: parseAnimation(animationJson),
    terrain: parseTerrain(terrainJson),
    vegetation: parseVegetation(vegetationJson),
    lighting: parseLighting(lightingJson),
    navPaint: parseNavPaint(navPaintJson),
  };
}
