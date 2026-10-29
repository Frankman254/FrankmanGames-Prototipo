// Datos del simulador de equilibrio. Lee los mismos JSON que `src/data/`, pero
// los clona antes de validarlos: así los «Ajustes propuestos» se aplican a una
// copia en memoria y `data/` no se toca nunca.
import cameraJson from '../../data/camera.json';
import encounterJson from '../../data/encounter.json';
import enemiesJson from '../../data/enemies.json';
import loadTestJson from '../../data/loadtest.json';
import playerJson from '../../data/player.json';
import classesJson from '../../data/rpg/classes.json';
import fishingJson from '../../data/rpg/fishing.json';
import itemsJson from '../../data/rpg/items.json';
import lootJson from '../../data/rpg/loot.json';
import merchantsJson from '../../data/rpg/merchants.json';
import petsJson from '../../data/rpg/pets.json';
import progressionJson from '../../data/rpg/progression.json';
import rpgEnemiesJson from '../../data/rpg/enemies.json';
import setsJson from '../../data/rpg/sets.json';
import spellsJson from '../../data/rpg/spells.json';
import statusesJson from '../../data/rpg/statuses.json';
import zoneJson from '../../data/zone.json';
import type { GameData } from '../../src/data';
import { parseCamera, parseEncounter, parseEnemies, parseLoadTest, parsePlayer, parseZone } from '../../src/data/schema';
import { parseRpgContent } from '../../src/rpg/content';

/** JSON sin validar, como objetos sueltos que un ajuste puede editar. */
export type Json = Record<string, any>;

export interface RawData {
  camera: Json;
  zone: Json;
  loadTest: Json;
  player: Json;
  enemies: Json;
  encounter: Json;
  rpg: {
    classes: Json;
    spells: Json;
    statuses: Json;
    items: Json;
    sets: Json;
    pets: Json;
    loot: Json;
    enemies: Json;
    progression: Json;
    merchants: Json;
    fishing: Json;
  };
}

/** Copia profunda de todos los JSON de `data/` que usa la simulación. */
export function rawData(): RawData {
  return structuredClone({
    camera: cameraJson,
    zone: zoneJson,
    loadTest: loadTestJson,
    player: playerJson,
    enemies: enemiesJson,
    encounter: encounterJson,
    rpg: {
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
    },
  }) as RawData;
}

/** Valida una copia (con o sin ajustes) igual que `loadGameData()`. */
export function buildData(raw: RawData): GameData {
  const zone = parseZone(raw.zone);
  const enemies = parseEnemies(raw.enemies);
  return {
    camera: parseCamera(raw.camera),
    zone,
    loadTest: parseLoadTest(raw.loadTest),
    player: parsePlayer(raw.player),
    enemies,
    encounter: parseEncounter(raw.encounter, enemies.archetypes, zone),
    rpg: parseRpgContent(raw.rpg, Object.keys(enemies.archetypes)),
  };
}

/** Centro del campo abierto de los escenarios de grupo y de la granja. */
export const FIELD_CENTER = { x: 40, y: 40 };

/**
 * Campo abierto de 80 × 80 m sin obstáculos ni estanques, como un prado del
 * mundo continuo. Los mercaderes siguen en el contenido (la sesión les compra
 * y vende) pero quedan fuera de la zona: en el simulador no hace falta ir al pueblo.
 */
export function openField(data: GameData): GameData {
  return {
    ...data,
    zone: { ...data.zone, obstacles: [], playerStart: { ...FIELD_CENTER } },
    rpg: { ...data.rpg, fishing: { ...data.rpg.fishing, spots: {} } },
  };
}

/** Campo abierto con el primer estanque traído a (40, 40), radio 6 (como `tests/rpg/fishing.test.ts`). */
export function pondField(data: GameData): { data: GameData; spotId: string } {
  const src = Object.values(data.rpg.fishing.spots)[0];
  if (!src) throw new Error('no hay estanques en fishing.json');
  const spot = { ...src, x: FIELD_CENTER.x, y: FIELD_CENTER.y, radius: 6 };
  const field = openField(data);
  return {
    data: { ...field, rpg: { ...field.rpg, fishing: { ...data.rpg.fishing, spots: { [spot.id]: spot } } } },
    spotId: spot.id,
  };
}
