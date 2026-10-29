// Sucesos de la simulación para el render, el HUD y la telemetría. `World`
// los acumula y quien dibuja los recoge con `drainEvents()`.

export type GameEvent =
  | { type: 'damage'; sourceId: number; targetId: number; amount: number; crit: boolean; toPlayer: boolean; ability: string | null }
  | { type: 'avoided'; sourceId: number }
  | { type: 'telegraph'; enemyId: number }
  | { type: 'summon'; enemyId: number; count: number }
  | { type: 'stagger'; enemyId: number }
  | { type: 'enemyDeath'; enemyId: number; archetype: string };
