// Punto único de carga de `data/`. Vite reinyecta los JSON al editarlos.
import cameraJson from '../../data/camera.json';
import encounterJson from '../../data/encounter.json';
import enemiesJson from '../../data/enemies.json';
import loadTestJson from '../../data/loadtest.json';
import playerJson from '../../data/player.json';
import zoneJson from '../../data/zone.json';
import {
  parseCamera,
  parseEncounter,
  parseEnemies,
  parseLoadTest,
  parsePlayer,
  parseZone,
  type CameraDef,
  type EncounterDef,
  type EnemiesDef,
  type LoadTestDef,
  type PlayerDef,
  type ZoneDef,
} from './schema';

export interface GameData {
  camera: CameraDef;
  zone: ZoneDef;
  loadTest: LoadTestDef;
  player: PlayerDef;
  enemies: EnemiesDef;
  encounter: EncounterDef;
}

export function loadGameData(): GameData {
  const zone = parseZone(zoneJson);
  const enemies = parseEnemies(enemiesJson);
  return {
    camera: parseCamera(cameraJson),
    zone,
    loadTest: parseLoadTest(loadTestJson),
    player: parsePlayer(playerJson),
    enemies,
    encounter: parseEncounter(encounterJson, enemies.archetypes, zone),
  };
}
