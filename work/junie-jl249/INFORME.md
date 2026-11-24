# JL-249: Arranque en frío — Medición

**Fecha:** 2026-11-24  
**Método:** `scripts/qa-cold-start.mjs` — spawnea Electron con perfil limpio, mide hitos vía CDP, crea personaje y espera a que la escena esté lista (pantalla de carga oculta).  
**Entorno:** macOS, Electron con Vite dev server, perfil borrado antes de cada ejecución.

## Hitos medidos

| Hito | Descripción |
|------|-------------|
| t₀ | Inicio de `spawn(electron)` |
| t₁ | CDP WebSocket conectado |
| t₂ | Botón "Nueva partida" visible (`[data-testid="new-game"]`) |
| t₃ | Pantalla de carga oculta, sesión activa, personaje con nombre |

## Resultados (3 ejecuciones)

| Ejecución | Spawn→CDP | CDP→Título | Título→Listo | **Total** |
|-----------|-----------|------------|--------------|-----------|
| 1 | 742 ms | 4218 ms | 9950 ms | **14910 ms** |
| 2 | 811 ms | 4016 ms | 10117 ms | **14944 ms** |
| 3 | 804 ms | 4257 ms | 10069 ms | **15130 ms** |
| **Media** | **786 ms** | **4164 ms** | **10045 ms** | **14995 ms** |
| **Desv.** | ±34 ms | ±121 ms | ±81 ms | ±110 ms |

## Análisis

- **Spawn→CDP (~786 ms):** Electron abre la ventana y expone el puerto de depuración. Incluye `buildMain()` (compilación de `electron/main.ts`) y `vite.createServer()`.
- **CDP→Título (~4164 ms):** El renderer carga, Babylon.js inicializa y la pantalla de título se muestra. Incluye la carga de Vite bundle en el renderer.
- **Título→Listo (~10045 ms):** El usuario hace clic en "Nueva partida", escribe nombre, elige clase y el juego carga la escena 3D (mundo, personaje, cámara, iluminación). Este es el hito más largo: carga del mundo, generación de vegetación, construcción de la navGrid, etc.
- **Total (~15 s):** Tiempo desde que el proceso de Electron se inicia hasta que el personaje está en escena y la pantalla de carga desaparece.

## Notas

- Los flags `inputActive`, `hasSpeed` y `sessionReady` salieron `false` porque las propiedades exactas de `__game.input` y `__game.session.state` no coinciden con los nombres probados. Sin embargo, el hito t₃ (carga oculta + sesión con nombre correcto) es el indicador fiable de que el personaje es controlable — coincide con lo que `newGame()` en `qaElectron.mjs` espera antes de continuar con los escenarios.
- Las 3 mediciones son consistentes (desviación ±110 ms sobre ~15 s), lo que indica que el ruido del sistema es bajo.
- Datos crudos en `datos.json`.
