// Sucesos de la simulación para el render, el HUD y la telemetría. `World`
// los acumula y quien dibuja los recoge con `drainEvents()`.
import type { CastBlock } from './combat';

export type GameEvent =
  | { type: 'damage'; sourceId: number; targetId: number; amount: number; crit: boolean; toPlayer: boolean; ability: string | null }
  | { type: 'avoided'; sourceId: number }
  | { type: 'telegraph'; enemyId: number }
  | { type: 'summon'; enemyId: number; count: number }
  | { type: 'stagger'; enemyId: number }
  | { type: 'enemyDeath'; enemyId: number; archetype: string }
  | { type: 'cast'; ability: string }
  | { type: 'castBlocked'; ability: string; reason: CastBlock }
  | { type: 'playerDeath' }
  | { type: 'outcome'; outcome: 'victory' | 'defeat' }
  // Slice 03 (contenido RPG)
  | { type: 'heal'; targetId: number; amount: number; source: string }
  | { type: 'status'; targetId: number; statusId: string }
  | { type: 'lootDrop'; lootId: number }
  | { type: 'lootPickup'; lootId: number; byPet: boolean }
  | { type: 'xp'; amount: number }
  | { type: 'levelUp'; level: number }
  | { type: 'petSpawn'; petId: string; entityId: number }
  | { type: 'teleport'; from: { x: number; y: number }; to: { x: number; y: number }; entityId?: number }
  // Combate v2
  /** Un hechizo de un objetivo rebota en `fromId` (reenvío) y vuelve a `toId`. */
  | { type: 'reflect'; fromId: number; toId: number; ability: string }
  /** El golpe no hizo nada por inmunidad. */
  | { type: 'immune'; targetId: number; sourceId: number }
  /** La contra devolvió daño (el daño va en su propio suceso `damage`). */
  | { type: 'counter'; targetId: number; sourceId: number }
  /** Retroceso: `targetId` vuelve a donde estaba (y a la vida que tenía). */
  | { type: 'rewind'; targetId: number; from: { x: number; y: number }; to: { x: number; y: number } }
  /** Proyectil teledirigido lanzado (render): de `sourceId` a `targetId`. */
  | { type: 'homing'; sourceId: number; targetId: number; ability: string | null; speed: number }
  // Slice 05 (pesca)
  | { type: 'fishCast'; spotId: string; x: number; y: number }
  | { type: 'fishNibble' }
  | { type: 'fishBite' }
  | { type: 'fishCatch'; itemId: string | null; gold: number }
  | { type: 'fishEscape'; reason: 'early' | 'late' }
  | { type: 'fishStop' }
  // Zonas con franja de niveles: el jugador entra en otra zona (null = fuera de todas).
  | { type: 'zoneEnter'; zoneId: string | null };
