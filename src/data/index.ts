// Punto único de carga de `data/`. Vite reinyecta los JSON al editarlos.
import cameraJson from '../../data/camera.json';
import loadTestJson from '../../data/loadtest.json';
import zoneJson from '../../data/zone.json';
import { parseCamera, parseLoadTest, parseZone, type CameraDef, type LoadTestDef, type ZoneDef } from './schema';

export interface GameData {
  camera: CameraDef;
  zone: ZoneDef;
  loadTest: LoadTestDef;
}

export function loadGameData(): GameData {
  return {
    camera: parseCamera(cameraJson),
    zone: parseZone(zoneJson),
    loadTest: parseLoadTest(loadTestJson),
  };
}
