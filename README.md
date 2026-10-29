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

En la ventana: F11 pantalla completa; clic izquierdo mover (mantener = seguir
el cursor); rueda zoom; L camino; 1/2/0 prueba de carga con 20/200/0; V modo de render.
`npx electron . --bench` (tras `npm run build`) imprime la medición `BENCH {json}`.
