# JL-135: Seco del Regreso en escenario `santos`

## Causa
El escenario `santos` teletransportaba al jugador a Pedasol (438, 8) pero nunca fijaba `stones.progress.respawn='pedasol'`. Al usar el Seco del Regreso desde (-300, 100), el jugador volvía a Villa Raspadura (131.25, 115.75), el valor por defecto de `newGame()`.

## Arreglo
1. `src/main.ts`: expuesto `__game.stoneBook` (el StoneBook con progreso) para que QA pueda fijar el respawn.
2. `scripts/qaElectron.mjs`: después de llegar a Pedasol, el escenario ejecuta `__game.stoneBook.progress.respawn='pedasol'` antes de irse lejos.

## Validación
- Escenario `santos`: 24/24 en verde (2 ejecuciones consecutivas).
- Suite: 3513/3513 en verde.
- Typecheck: limpio (solo balM3.ts ajeno).
- Build: OK.
