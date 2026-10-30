// Punto único de carga de `data/`. Vite reinyecta los JSON al editarlos.
import cameraJson from '../../data/camera.json';
import encounterJson from '../../data/encounter.json';
import enemiesJson from '../../data/enemies.json';
import loadTestJson from '../../data/loadtest.json';
import playerJson from '../../data/player.json';
import classesJson from '../../data/rpg/classes.json';
import rpgEnemiesJson from '../../data/rpg/enemies.json';
import itemsJson from '../../data/rpg/items.json';
import lootJson from '../../data/rpg/loot.json';
import merchantsJson from '../../data/rpg/merchants.json';
import fishingJson from '../../data/rpg/fishing.json';
import npcsJson from '../../data/rpg/npcs.json';
import questsJson from '../../data/rpg/quests.json';
import petsJson from '../../data/rpg/pets.json';
import progressionJson from '../../data/rpg/progression.json';
import setsJson from '../../data/rpg/sets.json';
import spellsJson from '../../data/rpg/spells.json';
import statusesJson from '../../data/rpg/statuses.json';
import zoneJson from '../../data/zone.json';
import { parseRpgContent, type RpgContent, type RpgRawFiles } from '../rpg/content';
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
  /** Clases, hechizos, estados, objetos, sets, mascotas, botín y fichas de enemigos. */
  rpg: RpgContent;
}

/** Los JSON crudos de `data/rpg/` (los tests los copian para probar la validación). */
export function rpgRawFiles(): RpgRawFiles {
  return {
    classes: classesJson,
    spells: spellsJson,
    statuses: statusesJson,
    items: itemsJson,
    sets: setsJson,
    pets: petsJson,
    loot: lootJson,
    enemies: rpgEnemiesJson,
    progression: progressionJson,
    merchants: merchantsJson,
    fishing: fishingJson,
    npcs: npcsJson,
    quests: questsJson,
  };
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
    rpg: parseRpgContent(rpgRawFiles(), Object.keys(enemies.archetypes)),
  };
}
