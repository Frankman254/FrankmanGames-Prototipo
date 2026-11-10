// Carga de los datos del mundo visual. Vite reinyecta los JSON al editarlos.
import ambientJson from '../../data/ambient.json';
import animationJson from '../../data/animation.json';
import assetsJson from '../../data/assets.json';
import detailJson from '../../data/detail.json';
import lightingJson from '../../data/lighting.json';
import navPaintJson from '../../data/navpaint.json';
import panamaJson from '../../data/panama.json';
import reliefJson from '../../data/relieve.json';
import terrainJson from '../../data/terrain.json';
import vegetationJson from '../../data/vegetation.json';
import deathJson from '../../data/death.json';
import dungeonJson from '../../data/dungeon.json';
import professionsJson from '../../data/rpg/professions.json';
import stonesJson from '../../data/stones.json';
import { BANK_LOCATION } from '../world/bankSite';
import { listStructures, structurePads, type Structure } from '../world/structures';
import type { NavPaint } from '../sim/navGrid';
import type { AmbientDef } from '../world/ambient';
import type { AtlasDef, AtlasRelief } from '../world/atlas';
import type { LightingDef } from '../world/dayNight';
import type { DetailDef } from '../world/detail';
import type { VegetationDef } from '../world/scatter';
import { parseAmbient } from './ambientSchema';
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
  /** Detalle de suelo, costa y caminos rurales (data/ambient.json). */
  ambient: AmbientDef;
}

/** Todo lo construido en el mundo abierto, con su huella y su regla de asiento. */
export function worldStructures(terrain: OverworldDef, vegetation: VegetationDef): Structure[] {
  return listStructures({
    props: vegetation.props,
    stones: stonesJson.stones,
    stations: Object.entries(professionsJson.stations as Record<string, { x: number; y: number }>).map(([id, s]) => ({ id, x: s.x, y: s.y })),
    resurrectors: deathJson.resurrectors,
    bank: BANK_LOCATION.building,
    crypt: dungeonJson.entrance,
  }, terrain.structures);
}

export function loadWorldData(): WorldData {
  const vegetation = parseVegetation(vegetationJson);
  const parsed = parseTerrain(terrainJson);
  // El suelo se aplana bajo cada estructura: las plataformas forman parte del terreno.
  const terrain: OverworldDef = { ...parsed, pads: structurePads(worldStructures(parsed, vegetation), parsed.structures) };
  return {
    assets: parseAssets(assetsJson),
    animation: parseAnimation(animationJson),
    terrain,
    vegetation,
    lighting: parseLighting(lightingJson),
    navPaint: parseNavPaint(navPaintJson),
    detail: parseDetail(detailJson),
    atlas: { ...(panamaJson as unknown as AtlasDef), relief: reliefJson as unknown as AtlasRelief },
    ambient: parseAmbient(ambientJson),
  };
}
