# FrankmanGames-Prototipo

Código del RPG original de FrankmanGames. Empieza por el Slice 01
(`docs/ALCANCE_SLICE_01.md`): una arena en tiempo real con clic para moverse,
tres enemigos con intención visible y dos habilidades con recurso y enfriamiento.

- Reglas para agentes: `AGENTS.md`
- Decisiones del juego: `../FrankmanGames/04_VISION_Y_DECISIONES.md`
- Procedencia de assets: `PROCEDENCIA.md`
- Progreso: `docs/BITACORA.md`

La investigación (`../FATE-ReverseEngineering`, `../Dofus-ReverseEngineering`)
es sólo de consulta; nada de ahí se copia a este repositorio.

## Cómo arrancar

Aplicación de escritorio para Windows (Electron). Vite es sólo la herramienta de desarrollo.

```bash
npm install
npm run dev        # ventana de Electron con recarga en caliente
npm test           # lógica pura (Vitest)
npm run package    # release/FrankmanGames-Prototipo-<versión>-portable.exe
npm run bench:sim  # prueba de carga de la simulación sin render
```

Controles por defecto (se cambian en Opciones → Atajos de teclado):
- Clic izquierdo: mover (mantener = seguir el cursor), atacar, hablar, recoger o pescar en el agua.
- Hechizos: fila 1 `Q W E R T Y U I O P`, fila 2 `A S D F G H J K L Ñ`.
- `1` poción de vida, `2` tónico, `Espacio` evasión, `Z` pescar.
- `B` mochila, `C` personaje, `V` libro de hechizos, `N` diario de misiones, `Esc` menú.
- Cámara: rueda = zoom (pellizco en el trackpad). Girar: rueda pulsada o clic derecho y arrastrar (dos dedos en el trackpad del Mac), mantener `X` y mover el cursor, o `,` / `.`.
- `F11` pantalla completa, `F4` mostrar/ocultar la trayectoria, `F1` mostrar/ocultar la cuadrícula de movimiento.
- Las ventanas se arrastran por su título. Opciones → Interfaz: tema, letra, tamaño de la interfaz y bloquear ventanas.
- Depuración: `F2` reloj rápido, `F3` +3 h, `F5` modo de render, `F6/F7/F8` prueba de carga, `F9` reiniciar arena, `F10` telemetría.

`npx electron . --bench` (tras `npm run build`) imprime la medición `BENCH {json}`.
