// Punto único de carga de `data/`. Vite reinyecta los JSON al editarlos.
import cameraJson from '../../data/camera.json';
import zoneJson from '../../data/zone.json';
import { parseCamera, parseZone, type CameraDef, type ZoneDef } from './schema';

export interface GameData {
  camera: CameraDef;
  zone: ZoneDef;
}

export function loadGameData(): GameData {
  return {
    camera: parseCamera(cameraJson),
    zone: parseZone(zoneJson),
  };
}
