// Selección de marcha del jugador (2026-11-12). Los GLB del héroe traen el
// clip «Caminar» y el juego nunca lo pedía: pasaba de reposo a correr sea
// cual sea la velocidad (ralentizado por peso, clima o formas). La regla vive
// aquí, pura y sin escena, para poder probarla: velocidad baja → walk, alta →
// run, y una banda de histéresis que impide el parpadeo cuando el jugador
// baila justo sobre el umbral. No cambia ninguna velocidad de la simulación.
export type Gait = 'walk' | 'run';

/**
 * Fracciones del paso natural de correr del modelo (`runSpeed` de
 * data/assets.json). Para volver a correr hay que superar `runEnter`; para
 * caer a andar basta bajar de `runExit`. Con el héroe (2,75 m/s): corre si
 * va a ≥2,34 y anda por debajo de 2,06; entre medias conserva la marcha.
 */
export const GAIT_BAND = { runEnter: 0.85, runExit: 0.75 } as const;

/**
 * Marcha del siguiente tramo andado. `canWalk` es falso si el modelo no tiene
 * clip propio de caminar: entonces se conserva el comportamiento antiguo
 * (siempre correr) sin tocar nada más. `naturalRun ≤ 0` (modelo sin datos)
 * también corre: sin referencia no hay banda.
 */
export function pickGait(prev: Gait, speed: number, naturalRun: number, canWalk: boolean): Gait {
  if (!canWalk || naturalRun <= 0) return 'run';
  const r = speed / naturalRun;
  if (prev === 'run') return r < GAIT_BAND.runExit ? 'walk' : 'run';
  return r >= GAIT_BAND.runEnter ? 'run' : 'walk';
}
