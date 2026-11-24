# JL-218: Mapa grande de la barriada Praderas del Norte

## Resumen
El mapa grande (tecla M) dentro de la barriada mostraba solo niebla. Ahora muestra calles, casas, piedra de vuelta y posición del jugador.

## Evidencia
- `tests/jl218_barriadaWorldMap.test.ts`: 10 pruebas verdes
- Suite completa: 4377/4377
- `npx tsc --noEmit`: limpio (solo balM3.ts ajeno)
- `npx vite build`: OK
- Escenario `barriada` en Electron: 8/8

## Archivos cambiados
- `src/ui/map/barriadaMap.ts`: nueva función `drawBarriadaWorldMap()`
- `src/ui/map/worldMap.ts`: detección de barriada, center() y pan adaptados
- `tests/jl218_barriadaWorldMap.test.ts`: pruebas nuevas
- `docs/TAREAS.md`: JL-218 añadido
- `docs/BITACORA.md`: entrada nueva
- `work/prompts-noche/COLA_JUNIE.md`: casilla marcada [x]
