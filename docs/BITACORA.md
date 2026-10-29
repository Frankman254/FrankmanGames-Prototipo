# Bitácora — Slice 01

Cada paso termina con `npm test` en verde y un commit. Las cifras de `data/`
son `PROPUESTA`.

## Paso 1 — Esqueleto técnico (2026-10-28)

**Qué se hizo**
- Vite 5 + TypeScript estricto + Babylon.js 7.54.3 + Vitest 2 (versiones en `PROCEDENCIA.md`).
- `src/sim/loop.ts`: reloj de paso fijo a 60 Hz con acumulador, `alpha` para
  interpolar y tope de 8 ticks por fotograma (descarta el resto tras un parón).
- `src/sim/world.ts`: estado puro; el jugador camina en línea recta hacia el
  punto clicado (sustituido por A* en el paso 2).
- `src/render/`: arena 80×80 m (mayor que la pantalla) con rejilla dibujada,
  cápsula del jugador con «nariz» de orientación, cámara ARPG elevada con
  seguimiento exponencial y zoom con rueda. Parámetros en `data/camera.json`.
- `src/data/`: carga y validación de `data/*.json` con errores que nombran
  archivo y campo. Las claves `_*` son comentarios (`_estado: PROPUESTA`).
- HUD de FPS, frame time medio/p95, y tiempos de simulación y render por separado.

**Qué se midió**
- En el panel de navegador de la app: render ≈ 0,5 ms (p95 ≈ 1 ms), sim ≈ 0,02 ms.
  El FPS del panel (~28) está limitado por el propio panel cuando no tiene el
  foco, no por el juego; las medidas de carga del paso 3 usan los tiempos de
  sim/render, que no dependen de ese límite.

**Pendiente**
- Nada bloqueante.

## Paso 2 — Clic para moverse (2026-10-29)

**Qué se hizo**
- `src/sim/navGrid.ts`: rejilla de colisión invisible (celda 0,5 m) generada
  desde los obstáculos de `data/zone.json`, inflados con `navRadius`. Línea de
  visión por recorrido DDA de celdas (sin colarse por esquinas).
- `src/sim/pathfinder.ts`: A* de 8 vecinos sin cortar esquinas, montículo
  binario y buffers reutilizados con sello de generación (pensado para que
  muchos enemigos re-planifiquen). Atajo: si hay línea de visión, camino de un
  solo tramo sin A*. Suavizado «tirar de la cuerda» por línea de visión.
  Destino bloqueado → celda libre más cercana (empates hacia el jugador);
  destino en otra isla → celda explorada más cercana a la meta.
- `src/sim/movement.ts`: seguir camino con presupuesto `speed·dt` y `slide`
  (deslizar por ejes) para empujes futuros.
- Picking separado de la colisión: el clic es un rayo de cámara contra el
  plano y = 0 del render; la simulación sólo recibe un punto XZ.
- Mantener pulsado re-emite el destino cada `holdRepathSeconds` (0,1 s).
- El jugador gira hacia el primer tramo en el mismo instante del clic; la orden
  entra antes del siguiente tick.
- Camino dibujado en amarillo (tecla L lo oculta).

**Qué se midió** (panel de navegador de la app)
- Latencia clic → primer fotograma con el jugador ya desplazándose:
  media 16 ms, máx. 33,5 ms en 4 clics (≈ 1–2 fotogramas a 60 Hz).
- Render ≈ 0,5 ms, sim < 0,02 ms con 12 obstáculos.

**Pendiente**
- El A* no tiene límite de tiempo por tick; si con 200 enemigos se dispara,
  repartir re-planificaciones entre ticks (paso 3).

## Paso 3 — Prueba de carga (2026-10-29)

**Qué se hizo**
- `src/sim/chasers.ts`: perseguidores simples (no son enemigos de juego). Línea
  recta si ven al jugador; si no, A* con re-planificación cada `repathSeconds`
  y un tope de `maxRepathsPerTick` búsquedas por tick (reparto entre ticks).
- `src/sim/spatialHash.ts` + `src/sim/crowd.ts`: separación básica por pares
  con rejilla de cubos de 2 m sin asignaciones; el jugador empuja y no es empujado.
- `src/sim/rng.ts`: RNG con semilla (mulberry32) para que todo sea reproducible.
- A* optimizado (sin cierres ni desestructuración en el bucle interno,
  desempate ×1,001 en la heurística). Con 8 re-planificaciones/tick el p95 de
  la simulación con 200 era 7,2 ms; con 3/tick y el A* optimizado bajó a 1,9 ms.
- Render en tres modos (tecla V): thin instances, mallas sueltas, sin dibujar.
  Teclas 1 = 20, 2 = 200, 0 = quitar. `await __game.bench(n, modo, s)` en consola.
- `npm run bench:sim`: simulación sin render, 20 s simulados, jugador en ronda.

**Qué se midió**

Simulación sola (`npm run bench:sim`, Node 20, este PC):

| Perseguidores | Tick medio | p95 | máx | A* en 20 s |
|---|---|---|---|---|
| 20 | 0,093 ms | 0,198 ms | 12,3 ms (calentamiento JIT) | 289 |
| 200 | 0,549 ms | 1,918 ms | 7,3 ms | 2 957 |

Juego completo en el panel de navegador de la app, visible, 4 s por medida
tras 1 s de calentamiento (tiempo de sim y de render = CPU de cada fase por fotograma):

| N | Render | FPS | Frame medio / p95 | Sim media / p95 | Render medio / p95 |
|---|---|---|---|---|---|
| 0 | — | 60,0 | 16,67 / 18,2 ms | 0,03 / 0,1 ms | 0,45 / 0,8 ms |
| 20 | thin instances | 60,0 | 16,68 / 18,7 ms | 0,16 / 0,5 ms | 0,62 / 1,2 ms |
| 200 | thin instances | 60,0 | 16,67 / 18,8 ms | 0,93 / 2,0 ms | 0,49 / 1,1 ms |
| 200 | mallas sueltas | 59,9 | 16,69 / 18,3 ms | 0,70 / 1,4 ms | 1,99 / 3,3 ms |
| 200 | sin dibujar | 59,7 | 16,75 / 18,4 ms | 0,70 / 1,6 ms | 0,48 / 0,7 ms |

- Las 200 entidades se mantienen en 60 FPS; el frame time está limitado por la
  sincronía vertical (16,7 ms), no por el juego: sim + render con 200 ≈ 1,4 ms
  de media y ≈ 3 ms en p95, es decir, mucho margen.
- Instancing frente a mallas sueltas: el render pasa de ≈ 2 ms a ≈ 0,5 ms.
- La «carga» del frame no incluye el tiempo de GPU (no se mide aparte).

**Pendiente**
- La multitud se aprieta contra el jugador (separación básica, no física): con
  200 quedan solapes de hasta ≈ 0,3 m entre perseguidores. Aceptable para la
  prueba; los enemigos del paso 4 son pocos.
