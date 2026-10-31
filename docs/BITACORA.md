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

## Paso 2b — Ventana de escritorio con Electron (2026-10-29)

Añadido al alcance el 2026-10-29. Se hizo después de commitear el paso 3 (que
ya estaba medido en navegador); la medición del paso 3 se repitió dentro de
Electron justo después (sección siguiente).

**Qué se hizo**
- Electron 33.2.1. `electron/main.ts` sólo abre la ventana:
  `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, sin
  preload, sin menú (`Menu.setApplicationMenu(null)`), F11 alterna pantalla
  completa, se bloquea navegar fuera del juego y abrir ventanas nuevas. Sólo
  carga `file://` (empaquetado) o la URL local de Vite (desarrollo).
- `npm run dev` (`scripts/dev.mjs`): compila el proceso principal con esbuild,
  arranca Vite (recarga en caliente del renderer) y abre Electron contra él.
  `npm run dev:web` sigue existiendo sólo como herramienta de inspección.
- `npm run package`: `vite build` (rutas relativas, `base: './'`) + esbuild +
  electron-builder `portable` → `release/FrankmanGames-Prototipo-0.1.0-portable.exe` (80 MB).
  `signAndEditExecutable: false`: el paquete de firma de electron-builder trae
  enlaces simbólicos de macOS que Windows no deja crear sin privilegios; no
  firmamos, así que no hace falta (consecuencia: icono y metadatos por defecto).
- Modo medición `--bench`: el renderer corre la batería fija de carga y escribe
  `BENCH {json}` en consola; el proceso principal lo imprime y cierra. En ese
  modo se desactiva `backgroundThrottling`.
- `tsconfig.electron.json` aparte (tipos de Node sólo para el proceso principal;
  el renderer sigue sin tipos de Node).

**Qué se comprobó**
- `npm run dev` abre la ventana de Electron con el servidor de Vite.
- El portable, lanzado con `PATH=C:\Windows\System32` (sin Node), abre la
  ventana «FrankmanGames · Slice 01». No se probó en un PC limpio sin Node.

**Pendiente**
- Revisión visual en local: F11, recarga en caliente al editar `src/` y `data/`,
  aspecto de la ventana empaquetada.
- Las apps empaquetadas no exponen stdout en Windows: `--bench` sólo da números
  con `npx electron .`, no con el `.exe`.

## Paso 3 — Re-medición dentro de Electron (2026-10-29)

`npm run build && npx electron . --bench`: Electron 33.2.1 (Chrome 130), ventana
1280×800 en este PC, monitor a 160 Hz (vsync). Por medida: 1 s de calentamiento y
5 s de muestreo; las estadísticas son de los últimos 600 fotogramas (≈ 3,75 s).

| N | Render | FPS | Frame medio / p95 | Sim media / p95 | Render medio / p95 |
|---|---|---|---|---|---|
| 0 | — | 160,0 | 6,25 / 6,6 ms | 0,004 / 0,0 ms | 0,38 / 0,7 ms |
| 20 | thin instances | 157,9 | 6,34 / 6,8 ms | 0,05 / 0,2 ms | 0,42 / 0,7 ms |
| 200 | thin instances | 159,4 | 6,27 / 7,2 ms | 0,34 / 1,2 ms | 0,44 / 0,9 ms |
| 200 | mallas sueltas | 160,0 | 6,25 / 6,5 ms | 0,23 / 0,9 ms | 1,68 / 2,4 ms |
| 200 | sin dibujar | 159,2 | 6,28 / 6,7 ms | 0,24 / 0,9 ms | 0,34 / 0,5 ms |

- Criterio «200 entidades ≥ 60 FPS»: se cumple con holgura; el juego va al
  tope del monitor (160 Hz). sim + render con 200 ≈ 0,8 ms de media.
- Coincide con la medición previa en el panel de navegador (allí topado a 60 Hz).
- La sim por fotograma (0,34 ms) es menor que por tick en `bench:sim` porque a
  160 FPS muchos fotogramas no ejecutan ningún tick de 60 Hz.

**Pendiente de revisión visual (local)**
- Mirar la multitud de 200 en la ventana: solapes de ≈ 0,3 m contra el jugador.

## Paso 4 — Enemigos con intención (2026-10-29)

Hecho en la nube (rama `slice01-pasos-4-6`), sin la ventana de Electron.

**Qué se hizo**
- `src/sim/enemies.ts`: máquina de estados propia
  `idle → acquire → pursue → telegraph → attack → recover → pursue`, con
  `stagger` (si un golpe supera `staggerDamage`; cancela el aviso) y `dead`.
  Correa: si se aleja más de `leashRange` de su casa vuelve a `idle` y regresa
  ignorando al jugador. Un golpe despierta a un enemigo en `idle`.
- Avisos: al entrar en `telegraph` el área queda **fijada** (origen y
  dirección); el daño sólo se resuelve al terminar el aviso y sólo si el
  jugador sigue dentro. Salir a tiempo lo esquiva. `telegraphSeconds ≥ 0,1`
  lo exige el validador (ningún ataque sin aviso).
- `src/sim/shapes.ts`: formas `cone`, `line` y `circle` contra un círculo; las
  usan los avisos y (paso 5) las habilidades.
- `src/sim/damage.ts`: tirada de daño en [mín, máx] + crítico; sin tirada de
  acierto (`DEC-2026-005`).
- `src/sim/events.ts`: sucesos (`damage`, `telegraph`, `summon`, `stagger`,
  `enemyDeath`…) que `World` acumula para render, HUD y telemetría.
- Arquetipos en `data/enemies.json` (PROPUESTA):
  - `melee`: se pega al jugador; cono delante de sí.
  - `ranged`: se queda a `preferredRange`, retrocede si te acercas a menos de
    `retreatRange` mientras recarga; línea recta larga.
  - `summoner`: se queda lejos; aviso circular en el punto de invocación y
    llama `minion`s con tope `maxAlive`.
  - `minion`: débil y rápido, cono corto.
- Encuentro en `data/encounter.json` (2 `melee`, 2 `ranged`, 1 `summoner`).
  `data/player.json`: vida del jugador.
- Render (`src/render/enemyView.ts`): forma y color por arquetipo (`look`),
  «nariz» de orientación, barra de vida al recibir daño, parpadeo en el aviso,
  blanqueo en `stagger`, tumbado y oscuro al morir. El aviso es el área exacta
  que resolverá la simulación (contorno translúcido + relleno que crece hasta
  el golpe; morado si es una invocación).
- `World(data, { encounter: false })` para la prueba de carga y los tests;
  `npm run bench:sim` sigue midiendo sólo perseguidores.

**Qué se midió**
- `npm test`: 37 tests en verde (16 nuevos: formas, tirada, secuencia de
  estados, aviso esquivable, stagger/dead, correa, tope del invocador,
  distancia a la que se queda cada arquetipo). `npx tsc --noEmit` limpio.
- Sin pantalla en la nube; se comprobó el render en Chromium headless
  (SwiftShader) con capturas: cono, línea e invocación se dibujan orientados
  hacia el jugador y sin errores en consola. No sustituye la prueba en el PC.

**Pendiente de revisar en el PC (visual)**
- Que los tres arquetipos se distingan por conducta a simple vista.
- Que los tiempos de aviso (0,5–1,2 s) permitan reaccionar.
- Legibilidad del aviso con la cámara por defecto.

## Paso 5 — Combate del jugador (2026-10-29)

**Qué se hizo**
- `src/sim/combat.ts`: `canCast` es literalmente
  `recurso ≥ coste ∧ cooldown ≤ 0 ∧ GCD ≤ 0 ∧ en alcance`; `castBlock` da el
  primer motivo que falla (para el HUD) y `slotView` calcula el barrido.
- `World`: `commandAttack` (clic sobre enemigo = un ataque básico; si está
  lejos, se acerca y golpea al llegar), `commandCast` (habilidades),
  `commandEvade`. Antes de los cuatro términos se comprueba `dead`, `busy`
  (evadiendo o lanzando) y `target` (habilidad de un objetivo sin objetivo).
  - «En alcance»: para `area: single`, distancia entre bordes ≤ `range` **y**
    línea de visión; para áreas centradas en el jugador (cono) siempre cierto:
    el alcance es la forma.
  - Objetivo de la habilidad barata: el enemigo bajo el cursor o, si no hay, el
    último atacado. El cono se orienta hacia el cursor.
  - `castTime > 0` está soportado (coste y enfriamientos al terminar; moverse
    o evadir lo cancela sin pagar), pero los tres valores de datos están a 0.
  - Daño: `rollDamage` (paso 4); no existe tirada de acierto.
- Evasión: desplazamiento de `distance` m en `seconds` s hacia el cursor,
  desliza contra paredes, invulnerable `invulnerableSeconds`, enfriamiento
  propio, no usa el GCD. Datos en `data/player.json`.
- Datos: `data/abilities.json` (`basic`, `cheap`, `cone`), recurso y
  regeneración en `data/player.json`. Todo PROPUESTA.
- Entrada (`main.ts`): clic izquierdo sobre la malla de un enemigo = ataque
  básico; mantener pulsado lo repite. **Q** = habilidad barata, **W** = cono,
  **Espacio** = evasión (teclas PROPUESTA).
- HUD (`src/ui/hud.ts` + CSS en `index.html`): barras de vida y recurso, cuatro
  huecos con barrido circular (`conic-gradient`) del enfriamiento propio o del
  GCD, tiempo restante, coste, gris cuando falta recurso, borde dorado si está
  lista; aviso del motivo de bloqueo; registro de los últimos golpes.
- Render: destello del enemigo golpeado, área del cono visible 0,18 s, tinte
  del jugador mientras es invulnerable.

**Qué se midió**
- `npm test`: 50 tests en verde (13 nuevos: tabla de verdad de `canCast`,
  recurso/regeneración, GCD que bloquea también el básico, cono con
  enfriamiento y área, alcance y pared, 300 golpes sin fallo, clic que se
  acerca y golpea una vez, evasión con invulnerabilidad/enfriamiento/pared,
  `castTime`, barrido del HUD). `npx tsc --noEmit` limpio.
- Chromium headless: un clic real sobre la malla de un `melee` lo elige por
  picking y le pega; W hace 27 y lo aturde; Q justo después muestra
  «Enfriamiento global». Sin errores en consola.

**Pendiente de revisar en el PC (visual)**
- Sensación de la evasión (4,5 m en 0,25 s) y de los tiempos de GCD.
- Legibilidad del barrido y del gris en los huecos.
- Que Q/W/Espacio no choquen con atajos de Electron.

## Paso 6 — Cierre de partida (2026-10-29)

**Qué se hizo**
- `World.outcome`: `playing` → `victory` cuando no queda ningún enemigo vivo
  (esbirros incluidos) o `defeat` cuando la vida del jugador llega a 0. Se
  decide una sola vez por partida (`outcome` + `endTime`). Al caer, el jugador
  deja de obedecer (`dead` en todo) y los enemigos sueltan la correa y vuelven.
- Reinicio rápido (tecla **R**, en cualquier momento): `main.ts` crea un
  `World` nuevo con los mismos datos ya cargados y otra semilla, limpia
  enemigos/avisos del render, el registro y el cartel. Sin recargar la página.
- `src/sim/telemetry.ts`: telemetría local en JSON por partida (tiempo
  simulado, daño hecho/recibido, golpes recibidos/evitados, críticos, usos por
  habilidad y evasión, bloqueos por `habilidad:motivo`, bajas por arquetipo,
  muertes, resultado) y totales de la sesión. Una partida reiniciada a medias
  queda como `abandoned`. Al terminar cada partida se vuelca a la consola; la
  tecla **T** guarda el informe completo como archivo `.json` (descarga del
  renderer: en Electron abre el diálogo de guardar por defecto) y lo escribe
  también en la consola. Nada sale del equipo.
- HUD: cartel de fin («Arena limpia» / «Has caído») con el resumen y las teclas.

**Qué se midió**
- `npm test`: 56 tests en verde (6 nuevos: victoria única, esbirros cuentan,
  derrota y jugador inerte, partida nueva limpia, agregados de telemetría,
  telemetría de una partida real). `npx tsc --noEmit` limpio.
- Simulación del encuentro completo (5 enemigos + esbirros, jugador
  recorriendo la arena y lanzando el cono, 20 s, Node 20 en la nube):
  tick medio 0,028 ms, p95 0,068 ms, máx 0,78 ms.
- `npm run bench:sim` sin cambios de orden de magnitud (200 perseguidores:
  0,40 ms medio, 1,47 ms p95 en la máquina de la nube).
- Chromium headless: victoria → cartel; R → 5 enemigos nuevos y cartel oculto;
  vida a 0 → «Has caído»; T descarga un JSON con las dos partidas. Sin errores.

**Pendiente de revisar en el PC (visual)**
- Jugar la arena de principio a fin dentro de Electron: dificultad, duración,
  y que el cartel y el reinicio se sientan inmediatos.
- Que la descarga de T abra el diálogo de guardar en la ventana de Electron
  (si el contenedor la bloquea, la copia en consola sigue disponible).

## Slice 03 A — Sistemas RPG (2026-10-29, nube, rama `slice03-sistemas`)

**Qué se hizo**
- Lógica OOP en `src/rpg/` (hoja de estadísticas, actores, estados, efectos
  con registro, objetos, inventario, equipo y sets, XP, botín, hechizos con
  rango, mascotas con conducta, sesión y guardado) y contenido en
  `data/rpg/*.json` validado al cargar. Detalle en `docs/HANDOFF_SLICE_03_A.md`.
- Integración con la simulación: el jugador es el personaje de la clase, la
  barra 1–6 sustituye a las habilidades fijas, el básico usa el arma, los
  enemigos sueltan botín (se recoge al pasar o con clic) y la mascota acompaña.
- `src/render/lootView.ts` (nuevo) y montaje provisional en `src/main.ts`.

**Qué se midió**
- `npm test`: 135 en verde (79 nuevos). `npm run typecheck`: limpio.
- Encuentro completo simulado 90 s (Node 20, nube): tick medio 0,015–0,026 ms.
- Chromium headless: las dos clases sin errores de consola.

**Pendiente de revisar a ojo en el PC**
- `npm run dev` (Vanguardia) y `npm run dev:web` + `/?class=storm_weaver`
  (Tejedora): jugar la arena entera con cada clase.
- Que los 6 hechizos se entiendan al lanzarlos: Embestida (carga de 6 m),
  Remolino y Nova (círculo alrededor), Lanza glacial (línea), Arco voltaico
  (cono), Paso del relámpago (teletransporte), Campo estático (zona azul en el
  punto apuntado; el destello del render sale en el jugador, ver handoff).
- Botín: que los cubos de color (rareza) y los discos dorados se distingan, que
  el clic los coja y que la recogida al pasar no resulte molesta.
- Mascotas (esferas): zorro naranja que pelea, búho que trae el botín,
  tortuga verde; el lobo espectral (translúcido) del pergamino.
- Tiempo para subir de nivel, dificultad del Lobo alfa y del Hostigador
  veterano, sensación del Vigor (60) frente al Maná (140).
- Que F6/F7/F8 no choquen con atajos de Electron.
- FPS con el encuentro nuevo dentro de Electron (no medido en la nube).

## Slice 03 B — Interfaz contra `FakeSession` (2026-10-29)

**Qué se hizo** (rama `slice03-interfaz`, nube)
- Toda la interfaz en `src/ui/menus/` y `src/ui/styles/`, montada con una sola
  llamada `mountMenus(fábrica)` en `src/main.ts`: título, creación de
  personaje, HUD, mochila con equipo, tooltips con comparación, hoja de
  personaje con desglose y reparto de puntos, libro de hechizos con arrastre a
  la barra, pausa, opciones y guardado en 3 ranuras de `localStorage`.
- `FakeSession` en `src/ui/menus/fake/` con contenido de ejemplo (2 clases,
  16 hechizos, 37 objetos, 3 mascotas) que implementa `GameSessionApi`.
- Atajos en `data/ui/keybindings.json`: prueba de carga en F6/F7/F8, reinicio
  de arena en F9; 1–6, Q, E y R quedan libres (R sin asignar).
- Contrato: añadidos opcionales `GameSessionFactory.content`,
  `hotbarState`, `castHotbar`, `quickUse` (detalle en `docs/HANDOFF_SLICE_03_B.md`).

**Qué se midió**
- `npm test`: 94 tests en verde (38 nuevos en `tests/ui/`). `npm run typecheck` limpio.
- Chromium headless: recorrido completo con `scripts/capturasMenus.cjs`
  (23 capturas en `docs/capturas/slice03/`), sin errores en consola; guardar en
  la ranura 2, salir al título, cargar y volver al mismo nivel; opciones persistidas.
- Rendimiento: sin medición (SwiftShader no es representativo).

**Pendiente de revisar en el PC (a ojo, en Electron)**
- Legibilidad del estilo de pergamino a 1080p y a pantalla completa (F11); que
  las fuentes serif de Windows (Palatino Linotype/Book Antiqua) se vean bien.
- FPS de la arena con el HUD nuevo frente al paso 3 (el HUD toca el DOM cada fotograma).
- Arrastrar y soltar con ratón real: umbral de 5 px, fantasma, soltar fuera
  para tirar, anillo 1↔2, libro → barra, barra → fuera.
- Que F6–F9, Q, E, Espacio y Esc no choquen con atajos de Electron/Windows y
  que Esc no saque de pantalla completa.
- Que «Salir» cierre la ventana de Electron y que `localStorage` persista
  entre arranques del `.exe` portable.
- Tamaños: HUD y paneles a 1280×720 (la mochila mide 620 px de ancho) y si
  conviene escalar la interfaz.
- Que los colores de rareza se distingan bien sobre el fondo oscuro.
---

# Bitácora — Slice 02 (mundo visual)

Rama `slice02-mundo-visual`, alcance en `docs/ALCANCE_SLICE_02.md`. No se toca
la lógica de combate (Slice 01 pasos 4–6, en la nube).

## Paso 1 — Pipeline de assets (2026-10-29)

**Qué se hizo**
- `@babylonjs/loaders` y `@babylonjs/materials` 7.54.3 (misma versión que el core).
- `data/assets.json`: manifiesto id → archivo (sólo rutas dentro de `assets/`).
  Datos del mundo en `src/data/worldSchema.ts` / `worldData.ts`, aparte de
  `schema.ts` para no chocar con la rama de la nube.
- `src/render/assetCache.ts`: carga glTF/GLB una vez por id (`AssetContainer`)
  y crea copias con `instantiateModelsToScene` (esqueleto y animaciones propios).
  Las URL salen de `import.meta.glob('/assets/**')`, así Vite copia los archivos
  con hash y funcionan igual en desarrollo y con `file://` empaquetado.
- `tests/assets.test.ts`: falla si un archivo de `assets/` no aparece en
  `PROCEDENCIA.md`, si una entrada del manifiesto no existe en disco o si apunta
  fuera de `assets/`.

**Pendiente**
- El manifiesto está vacío hasta el paso 5 (personaje). Terreno y vegetación se
  hacen con geometría y texturas generadas por código (sin descargas).

## Paso 2 — Terreno (2026-10-29)

**Qué se hizo**
- `data/terrain.json`: zona continua de 256×256 m con semilla, relieve fractal
  (ruido de valor, 4 octavas, ±3,2 m), colinas de 12 m en el borde que encuadran
  la zona, tres caminos (polilíneas con ancho) y dos claros aplanados (pueblo y
  un claro al noreste). `playerStart` propio.
- `src/world/` (puro, sin DOM ni Babylon, testeable): `noise.ts` (ruido de valor
  con semilla, fractal y periódico) y `terrain.ts` (`HeightField` con muestreo
  bilineal, pendiente y rayo contra el terreno; splatmap RGBA hierba/tierra/camino
  con borde de camino irregular, tierra por pendiente, por ruido y en los claros;
  texturas de suelo periódicas generadas por código).
- `src/world/overworld.ts`: compone la zona y sustituye `data.zone` (ancho,
  fondo, inicio, obstáculos) antes de crear `World`. **No se tocó `src/sim/`** ni
  `data/zone.json`: los tests del Slice 01 siguen usando la arena de 80 m.
- `src/render/terrainView.ts`: malla de 257×257 vértices con las alturas y
  `TerrainMaterial` (splatmap 1024² + tres texturas 256² en mosaico de 4–6 m,
  filtrado anisótropo 8×). Recibe sombras.
- El clic es un rayo de cámara contra el `HeightField` (marcha de 0,5 m +
  bisección), no contra la malla. Jugador, marcador, camino dibujado y
  perseguidores se apoyan en la altura del terreno; la simulación sigue en XZ.
- Se quitaron la rejilla dibujada y las paredes grises de la arena.

**Qué se midió** (panel de navegador)
- Generar el mundo al arrancar (alturas + splatmap + mallas): ≈ 1,4 s. Lo caro
  es el splatmap de 1 M píxeles con distancia a cada tramo de camino. Aceptable
  para el prototipo; si molesta, se puede hornear o bajar a 512².
- Render ≈ 0,5 ms con el terreno solo.

**Pendiente**
- Revisión visual en Electron (la hace el paso 6 de medición).

## Paso 3 — Vegetación y props (2026-10-29)

**Qué se hizo**
- `data/vegetation.json`: seis tipos dispersos (pino, árbol de hoja ancha,
  arbusto, roca, flor, hierba) con densidad, separación mínima, escala, color,
  distancia a caminos, viento y `blockRadius` (> 0 = bloquea), más props a mano
  (5 casas, 3 troncos caídos, 3 rocas grandes, 8 farolas).
- `src/world/scatter.ts` (puro): rejilla con jitter y semilla, densidad modulada
  por ruido de «bosque» (bosques y claros), sin nada en caminos, claros del
  pueblo, inicio del jugador ni encima de los props; separación entre todo lo que
  bloquea. Cada ejemplar que bloquea se convierte en un rectángulo de colisión.
  Con los datos actuales: 421 pinos, 370 árboles, 518 arbustos, 98 rocas,
  1 718 flores, 10 881 matas de hierba; 908 obstáculos. Genera en ≈ 0,2 s (Node).
- **Cambio mínimo en `src/sim/navGrid.ts`**: `fromObstacles` recorre sólo la caja
  inflada de cada obstáculo en vez de cada celda × cada obstáculo (512×512 celdas ×
  900 obstáculos era inviable). Mismo resultado; hay un test que lo compara con
  el método anterior celda a celda.
- `src/render/vegetationView.ts`: geometría y texturas generadas por código
  (conos para pinos, copas de tarjetas con normales «esféricas», rocas de
  icosaedro deformado con sombreado plano, tarjetas cruzadas para hierba y
  flores, casas con tejado a dos aguas, puerta y ventanas, farolas). Thin
  instances repartidas en trozos de 32 m para que la cámara descarte lo que no
  ve; color por instancia. Hojas, hierba y flores con recorte alfa.
- `src/render/windPlugin.ts`: `MaterialPluginBase` que desplaza los vértices en
  el shader según su altura local (la base queda fija) con fase por posición y
  ráfagas; amplitud por tipo en datos.

**Dos trampas de Babylon 7.54 (anotadas para quien siga)**
- Las thin instances guardan sus búferes en la *geometría*: clones que la
  comparten se pisan las matrices. Cada trozo hace `makeGeometryUnique()`.
- Con color por instancia, el recorte alfa se evalúa al final
  (`ALPHATEST_AFTERALLALPHACOMPUTATIONS`) y sin `useAlphaFromDiffuseTexture` no
  recorta nada (las tarjetas salían como cuadrados negros).

**Qué se comprobó**
- Tests: lo que bloquea cae en celdas bloqueadas; nada bloqueante sobre un
  camino ni en el inicio; el camino principal se recorre con A* de punta a punta;
  la dispersión es determinista.
- En el panel de navegador: árboles, hierba, flores, rocas, casas y farolas a la
  vista; hojas recortadas y moviéndose con el viento.

**Pendiente**
- Las sombras de hojas no se balancean (el material de sombras no lleva el
  plugin). Se nota poco con la cámara cenital.

## Unión con `master` y cámara orbital (2026-10-29)

Encargo del coordinador (pedido del creador: «con el clic de la rueda del ratón
podemos mover el ángulo de la cámara para que sea tipo Tower of Fantasy»).

**Qué se hizo**
- `git merge origin/master` (Slice 01 pasos 4–6 y contratos del Slice 03).
  Conflictos en `src/main.ts`, `src/render/arenaView.ts` y esta bitácora,
  resueltos conservando ambas partes. Enemigos, barras de vida y avisos se apoyan
  en la altura del terreno (`EnemyView.ground`). El encuentro de
  `data/encounter.json` (coordenadas de la arena de 80 m) se traslada a un prado
  de la zona con `terrain.json → encounterOffset`, sin tocar ese archivo.
- `src/render/cameraRig.ts`: cámara orbital. Rueda pulsada + arrastrar gira el
  yaw (libre) y el pitch (12°–82°); la rueda hace zoom (6–32 m); sigue al jugador
  con suavizado y mira 1 m por encima de sus pies; nunca baja del terreno
  (`groundClearance`). `data/camera.json`: `minPitchDeg`, `maxPitchDeg`,
  `orbitDegPerPixel`, `invertX`, `invertY`, `groundClearance` (con valores por
  defecto en `schema.ts`).
- `src/ui/input.ts`: arrastre con el botón central (bits de `buttons`, captura
  del puntero, sin auto-desplazamiento del navegador).
- El clic izquierdo para moverse y atacar sigue siendo un rayo de cámara contra
  el terreno, válido con cualquier ángulo. `tests/camera.test.ts` lo comprueba
  con `NullEngine` en cuatro combinaciones de yaw/pitch.

**Qué se comprobó** (panel de navegador)
- Arrastre simulado de 300 px: yaw 45° → 135°, pitch 55° → 19°; vista a ras de
  suelo con el bosque al fondo. Un clic sobre el camino pone el marcador en el
  punto clicado.

**Pendiente**
- Revisión con un ratón de verdad en Electron (sensibilidad, sentido de los ejes).

## Paso 4 — Luz y atmósfera (2026-10-29)

**Qué se hizo**
- `data/lighting.json`: día de 300 s (empieza a media mañana), 8 claves de luz
  (sol, ambiente cielo/suelo, cénit y horizonte del cielo, niebla, farolas, luz
  del jugador, estrellas), sombras (mapa 2048, alcance 60 m) y luces puntuales
  (4 farolas activas como máximo, alcance 16 m; luz del jugador 11 m).
- `src/world/dayNight.ts` (puro): hora del día, dirección del sol (arco inclinado,
  sale a t = 0,25), interpolación de claves con enlace por medianoche, luna en
  dirección opuesta de noche y astro nunca rasante (y ≥ 0,18), farolas más cercanas.
- `src/render/atmosphere.ts`: sol/luna `DirectionalLight` con sombras PCF cuyo
  frustum ortográfico fijo (60 m) sigue al jugador; `HemisphericLight` de
  ambiente; niebla EXP2 del color del horizonte; cúpula de cielo con shader
  propio (degradado, disco y halo del sol, estrellas de noche). Farolas: el farol
  emite siempre que estén encendidas, pero sólo las 4 más cercanas al jugador
  tienen luz real (se reeligen cada 15 fotogramas). Luz del jugador de noche.
  Todo material (también los de enemigos que nacen después) admite 7 luces.
- Proyectan sombra árboles, arbustos, rocas, props y el jugador; la hierba y las
  flores no.
- La cámara se acerca al jugador si una casa o roca grande tapa la vista
  (el atardecer de prueba la dejaba dentro de un tejado).
- Depuración en teclas F (1–6, Q, E, R son del juego): F2 reloj ×40, F3 +3 h,
  F6/F7/F8 perseguidores 20/200/0, F9 modo de render. El HUD muestra la hora.

**Qué se comprobó** (panel de navegador)
- Mediodía con sombras, atardecer naranja con niebla cálida, noche con farolas
  iluminando el camino, luz azulada alrededor del jugador y estrellas.

**Pendiente**
- La cámara orbital a ras de suelo atraviesa copas de árboles (sólo casas y rocas
  grandes la empujan). Los enemigos no proyectan sombra (nacen después; se puede
  añadir en `EnemyView`).

## Paso 6 — Medición con el mundo visual (2026-10-29, antes del personaje)

Se mide ya porque el paso 5 espera el permiso de descarga del modelo; el
personaje es una sola malla con esqueleto y se re-medirá al añadirlo.

**Qué se hizo**
- `--bench` abre la ventana a pantalla completa con área de dibujo 1920×1080
  (a 1920×1080 en ventana, la barra de tareas la recortaba a 1904×993) y la
  batería mide además draw calls, mallas activas y hora del día (mediodía 0,5
  con sombras del sol; noche 0,95 con farolas y luz del jugador).
- **Optimización**: el mapa de sombras no descarta por su frustum y dibujaba los
  ~360 trozos de vegetación de todo el mapa (411 draw calls con 46 mallas
  activas, render 4,2 ms). Ahora `Atmosphere` le pasa cada 10 fotogramas sólo las
  mallas cuya caja toca el cuadrado de sombras (60 m + 8 m) alrededor del jugador:
  92 draw calls y render 2,3–2,6 ms.

**Qué se midió** — `npm run build && npx electron . --bench`, Electron 33.2.1
(Chrome 130), lienzo 1920×1080, DPR 1, monitor a 100 Hz (vsync). 1 s de
calentamiento + 5 s de muestreo; últimos 500 fotogramas. Mundo generado en 1,7 s.

| N | Render | Hora | FPS | Frame medio / p95 | Sim media / p95 | Render medio / p95 | Draw calls | Mallas activas |
|---|---|---|---|---|---|---|---|---|
| 0 | thin instances | 12:00 | 100,0 | 10,0 / 10,3 ms | 0,01 / 0,1 ms | 2,50 / 4,4 ms | 92 | 41 |
| 20 | thin instances | 12:00 | 100,0 | 10,0 / 10,2 ms | 0,15 / 0,7 ms | 2,34 / 4,1 ms | 93 | 42 |
| 200 | thin instances | 12:00 | 100,0 | 10,0 / 10,3 ms | 0,56 / 1,3 ms | 2,34 / 4,0 ms | 93 | 42 |
| 200 | mallas sueltas | 12:00 | 100,0 | 10,0 / 13,3 ms | 0,49 / 1,2 ms | 4,65 / 12,4 ms | 292 | 241 |
| 200 | sin dibujar | 12:00 | 100,0 | 10,0 / 10,2 ms | 0,49 / 1,2 ms | 2,19 / 3,8 ms | 92 | 41 |
| 0 | thin instances | 22:48 | 100,0 | 10,0 / 10,3 ms | 0,00 / 0,0 ms | 2,57 / 5,6 ms | 92 | 41 |
| 200 | thin instances | 22:48 | 100,0 | 10,0 / 10,2 ms | 0,48 / 1,2 ms | 2,55 / 5,8 ms | 93 | 42 |

- Objetivo ≥ 60 FPS: se cumple; va al tope del monitor (100 Hz) en todos los
  casos. sim + render con 200 perseguidores ≈ 2,9 ms de media (antes del mundo
  visual ≈ 0,8 ms): el mundo cuesta ≈ 2 ms de CPU de render por fotograma.
- La noche cuesta ≈ 0,2 ms más (luces puntuales). El tiempo de GPU no se mide
  aparte (como en el Slice 01); con vsync a 100 Hz no hay fotogramas perdidos.
- Antes de la optimización de sombras (misma batería, 1904×993): render 3,9–4,4 ms,
  411 draw calls.

## Paso 5 — Personajes animados procedurales (2026-10-29)

El permiso para descargar un modelo CC0 quedó pendiente (el creador duerme); el
coordinador pidió hacer el paso sin descargas, con personajes procedurales y la
puerta abierta a un glTF.

**Qué se hizo**
- `src/world/anim.ts` (puro): rig de articulaciones, clips de keyframes (Euler con
  la convención de Babylon y desplazamientos), evaluación con suavizado, mezcla de
  poses (nlerp), cinemática directa y `Animator` (un clip a la vez con fundido,
  velocidad, clips de una vez que se quedan en su último fotograma, eventos por
  tiempo normalizado también al dar la vuelta en bucle).
- `src/world/rigs.ts` (puro): rig humanoide (16 articulaciones, proporciones
  ajustables) y de lobo (13), con sus clips: reposo, correr, ataque (espada, arco
  o garra), lanzar hechizo, evasión, golpe recibido y muerte. El chamán es el
  humanoide encorvado (postura sumada a todos los clips) y su ataque es invocar.
- `data/animation.json`: eventos por fotograma (`footstep`, `hit`, `cast`) y
  velocidad de referencia de correr por modelo. Los instantes de `footstep` son
  los apoyos de cada pie; `tests/animation.test.ts` comprueba con cinemática
  directa que en cada uno el pie de apoyo es el más bajo y está a < 1 cm de su
  punto más bajo del ciclo, y que alternan.
- `src/render/characters/`: interfaz `CharacterModel` con dos implementaciones,
  `ProceduralCharacter` y `GltfCharacter`, y `createCharacter` que elige según
  `data/assets.json` (`kind: procedural | gltf`). Pasar un personaje a glTF es
  cambiar su entrada (archivo, nombres de sus AnimationGroups y eventos); hay un
  `_ejemploGltf` en el manifiesto. **`GltfCharacter` sólo está comprobado con
  tsc**: no hay todavía ningún glTF aprobado.
- Jugador (`PlayerAvatar`): humanoide con espada y paleta por clase
  (`palettes` por id de clase; hoy sólo `default`, no se inventan clases). Elige
  la animación con el estado de la simulación (vivo, evasión, lanzamiento,
  camino) y sus sucesos (`cast` básico → ataque, otro → hechizo, `evade`, daño
  recibido → golpe, muerte); correr se acompasa a la velocidad real. En cada
  `footstep` mide la distancia pie↔suelo y deja una nube de polvo; el HUD
  muestra pasos, esa distancia y el recuento de eventos.
- Enemigos (`enemyView.ts`): `enemy.<arquetipo>` en el manifiesto. Lobo
  cuadrúpedo (melee), goblin flaco de orejas puntiagudas con arco y carcaj
  (ranged), chamán encorvado con túnica, barba, báculo con orbe y halo
  (summoner), diablillo con cuernos, cola y garras (minion). El ataque se
  acompasa para que su `hit`/`cast` caiga justo al acabar el aviso; aturdido →
  golpe recibido; muerto → muerte. Picking con una cápsula invisible.
  Arquetipo sin entrada → humanoide con el color de `look`.
- **No se tocó `src/sim/`.** Los eventos de animación llegan a `main.ts`, que
  los cuenta; la simulación todavía no los consume (habría que tocar `src/sim/`).

**Rendimiento**: la primera versión (una malla por pieza, ~22 por personaje)
con 30 enemigos daba 1 413 draw calls y 18,7 ms de render (49 FPS). Ahora cada
personaje es **una malla con esqueleto** (cada pieza pegada al 100 % a su hueso,
color por vértice; una segunda malla sólo si tiene piezas que brillan).

**Re-medición** (`--bench`, Electron 33.2.1, 1920×1080, monitor a 100 Hz):

| Caso | FPS | Frame medio / p95 | Sim media / p95 | Render medio / p95 | Draw calls | Mallas activas |
|---|---|---|---|---|---|---|
| 0 perseguidores, 12:00 | 100,0 | 10,0 / 10,3 ms | 0,01 / 0,1 ms | 2,40 / 4,1 ms | 91 | 40 |
| 200 thin instances, 12:00 | 100,0 | 10,0 / 10,2 ms | 0,57 / 1,4 ms | 2,26 / 3,9 ms | 92 | 41 |
| 200 mallas sueltas, 12:00 | 100,0 | 10,0 / 13,2 ms | 0,50 / 1,2 ms | 4,45 / 12,1 ms | 291 | 240 |
| 200 sin dibujar, 12:00 | 100,0 | 10,0 / 10,2 ms | 0,51 / 1,2 ms | 2,11 / 3,7 ms | 91 | 40 |
| 0, 22:48 | 100,0 | 10,0 / 10,3 ms | 0,00 / 0,0 ms | 2,56 / 5,5 ms | 91 | 40 |
| 200 thin instances, 22:48 | 100,0 | 10,0 / 10,2 ms | 0,50 / 1,2 ms | 2,45 / 5,5 ms | 92 | 41 |
| **200 + 30 enemigos animados**, 12:00 | 98,0 | 10,2 / 11,1 ms | 0,51 / 1,3 ms | 4,95 / 10,0 ms | 198 | 96 |

- Objetivo ≥ 60 FPS cumplido en todo. Los 30 enemigos (20 puestos + diablillos
  invocados) añaden ≈ 2,7 ms de render.

**Pendiente**
- Revisión en Electron con ratón de verdad: lectura de las siluetas a distintas
  distancias, deslizamiento de pies (la velocidad de referencia de correr es un
  compromiso: el paso dibujado es más corto que lo que avanza la sim a 6 m/s).
- Las piezas que brillan (halo, orbe, ojos) no emiten luz de verdad.

---

# Bitácora — Slice 02b (efectos)

Encargo del coordinador (2026-10-29): efectos de hechizos, estados visibles,
mascotas animadas, botín y números de daño, todo con geometría y partículas
generadas por código. Rama `slice02b-efectos` desde `origin/master` (1777131).
No se toca `src/rpg/`, `src/sim/` (sólo se leen sucesos y estado) ni `src/ui/menus/`.

## Paso 1 — Efectos de hechizos por elemento (2026-10-29)

**Qué se hizo**
- `data/fx.json` (+ `src/data/fxSchema.ts`): color y número de partículas por
  elemento (físico, fuego, hielo, tormenta, tierra), duraciones, tamaño de
  proyectil, hechizos de línea que se dibujan como proyectil, aspecto de cada
  estado, números de daño, botín y subida de nivel.
- `src/render/fx/particles.ts`: textura de punto suave generada por código,
  pool de sistemas de partículas para ráfagas y emisores continuos que siguen a
  un nodo; material de brillo aditivo o con mezcla normal (para el suelo).
- `src/render/fx/spellFx.ts`:
  - Destello en la mano del lanzador (`CharacterModel.socket('handR')`, nuevo en
    la interfaz) con orbe que se expande.
  - Proyectiles con estela para todo hechizo de un objetivo con
    `projectileSpeed` (Chispa, Marca ardiente) y para el ataque básico de armas a
    distancia (varita, orbe): vuelan a la velocidad de la simulación hacia el
    objetivo; la Chispa tiembla como un rayo. La Lanza glacial (línea) es una
    lanza de hielo que recorre su línea.
  - Áreas con su forma y su origen reales: el círculo con `atTarget` (Campo
    estático) cae en el punto apuntado (antes salía centrado en el jugador);
    cono y línea salen del lanzador hacia el cursor. Partículas repartidas por la
    forma. Hechizos sobre uno mismo: anillo y partículas que suben.
  - Impactos en cada suceso `damage` con el elemento del origen (hechizo, arma,
    estado periódico, mascota); críticos con más partículas. Curaciones: brillo verde.
  - Zonas persistentes (`world.zones`): disco con pulso, borde y chispas del
    elemento (sustituye al disco azul de `lootView.ts`).

**Qué se comprobó** (panel de navegador, Tejedora de Tormentas)
- Chispa con estela hasta el goblin; Campo estático en el punto apuntado; cono
  del Arco voltaico y línea de la Lanza glacial con su forma real y color.
- Sobre hierba clara el modo aditivo blanqueaba las áreas: las formas del suelo
  van con mezcla normal y las partículas/orbes con suma.

## Paso 2 — Estados visibles (2026-10-29)

**Qué se hizo**
- `src/render/fx/statusFx.ts`: lee las listas de estados del jugador
  (`world.character.statuses`), de cada enemigo (`world.enemyActors`) y de las
  mascotas, y pone encima un efecto por estado según `data/fx.json → statuses`:
  - quemadura: llamas (más intensas con cada acumulación);
  - ralentizado: escarcha que cae y disco helado en el suelo;
  - inmovilizado: cristales de hielo alrededor de los pies;
  - aturdido: tres estrellas que giran sobre la cabeza;
  - escudo: velo apenas teñido y dos aros brillantes que giran (con Fresnel o
    con suma de luz blanqueaba al personaje a mediodía);
  - mejoras (Grito de hierro, Piel de piedra, Regeneración, Prisa): aro en el
    suelo y partículas que suben, del color de cada una;
  - carga estática: chispas.
  Un estado sin entrada se ve como aura si es mejora y no se ve si es perjuicio.
- La altura de cada personaje sale de su modelo (`EnemyView.heightOf`).

**Qué se comprobó** (panel de navegador, estados aplicados desde la consola de
desarrollo): escudo, quemadura y prisa en el jugador; ralentizado, inmovilizado y
aturdido en un lobo; quemadura y carga estática en un goblin.

## Paso 3 — Mascotas y aliados animados (2026-10-29)

**Qué se hizo**
- Nuevos modelos procedurales en `src/world/rigs.ts`: `fox` y `turtle` (rig
  cuadrúpedo con proporciones; la tortuga con zancada al 60 %) y `owl` (rig de
  ave que vuela a 1,25 m, aleteo lento en reposo y rápido al desplazarse, picado
  al atacar). El búho no tiene `footstep`; el test lo exige.
- Piezas en `proceduralCharacter.ts`: zorro de ceniza (hocico, orejas grandes,
  cola tupida con punta de brasa), búho archivero (disco facial, ojos grandes,
  anteojos, alas), tortuga de musgo (caparazón con placas de musgo y brote
  luminoso). Lobo espectral = el lobo con `ghost: true` (translúcido y luminoso).
- `data/assets.json`: `pet.ash_fox`, `pet.archivist_owl`, `pet.moss_turtle`,
  `pet.spirit_wolf`. `data/animation.json`: pasos del zorro (0,4 / 0,9) y de la
  tortuga (0 / 0,5) calculados con cinemática directa.
- `src/render/petView.ts` sustituye las esferas de `lootView.ts`: camina o vuela
  según se mueva, ataca cuando la simulación rearma su enfriamiento (no hay
  suceso de ataque de mascota), proyecta sombra y aparece con una ráfaga.
  Pasar una mascota a glTF es cambiar su entrada en el manifiesto.

**Qué se comprobó** (panel de navegador, mascotas invocadas desde la consola):
las cuatro siguen al jugador; el búho vuela, el lobo espectral se ve translúcido
y la tortuga aplica su aura de regeneración (aro verde en el jugador).

## Paso 4 — Botín (2026-10-29)

**Qué se hizo**
- `src/render/lootView.ts` reescrito (antes: cubos y discos a y = 0,05 sobre
  terreno con relieve): bolsa de tela atada con cinta del color de su rareza;
  cofre de madera con herrajes de color para lo raro o superior
  (`fx.json → loot.beamFromRarity`), con haz de luz vertical; montoncito de tres
  monedas que gira. Todo se apoya en el terreno, flota un poco, tiene un disco de
  brillo de su rareza que late y suelta destellos (más a menudo cuanto más raro).
  Una caja invisible recibe el clic, como antes.
- `src/ui/hoverLabel.ts` (fuera de `src/ui/menus/`, con estilos en línea para no
  tocar `index.html`): etiqueta junto al cursor con el nombre del objeto en el
  color de su rareza, o «N monedas». `main.ts` hace el picking 10 veces por segundo.

**Qué se comprobó** (panel de navegador, botín soltado desde la consola): bolsas
común y poco común, cofre épico con haz morado, monedas; la etiqueta muestra
«Amuleto de piedra lunar» en morado.

**Problema encontrado en `master` (no es de este slice)**: el elemento
`.game-hud` de `src/ui/menus/` cubre todo el lienzo con `pointer-events: auto`,
así que en partida los clics y el movimiento del ratón no llegan al lienzo: el
clic para moverse/atacar y la etiqueta no funcionan con el ratón. Para probar la
etiqueta se desactivó a mano desde la consola. No se tocó `src/ui/menus/`.

## Paso 5 — Números de daño y subida de nivel (2026-10-29)

**Qué se hizo**
- `src/render/fx/floatingText.ts`: pool de 32 planos en modo cartel, cada uno
  con su textura dibujada por código (texto con contorno), en un grupo de render
  por encima del mundo. Daño a enemigos en blanco cálido, críticos más grandes
  (×1,7), con «!» y en naranja; daño recibido en rojo; curación en verde («+N»).
  Suben frenando y se desvanecen en el último tercio.
- Subida de nivel (suceso `levelUp`): «¡Nivel N!» grande y dorado, dos anillos
  que se abren y una columna de chispas.
- `tests/fx.test.ts`: `data/fx.json` cubre los cinco elementos y todos los
  perjuicios de `data/rpg/statuses.json`; los hechizos de línea existen; el
  elemento de cada suceso sale del hechizo, del arma, del estado o de la mascota.

**Qué se comprobó** (panel de navegador): números de daño normal, crítico,
recibido y curación, y la subida de nivel. La textura del plano llegaba
invertida en vertical: el texto se dibuja volteado en el lienzo.

## Paso 6 — Medición con efectos (2026-10-29)

**Qué se hizo**
- `--bench` añade el máximo y los fotogramas de más de 33 ms, y una pasada
  «efectos» (`stageEffects` en `main.ts`): 20 enemigos más (33 con los del
  encuentro y los diablillos invocados) con quemadura, ralentizado, aturdido,
  carga estática o inmovilizado; escudo en el jugador; las cuatro mascotas; 10
  botines de varias rarezas a 12 m (fuera del alcance del búho, que los recoge);
  y 10 impactos con número por segundo (sucesos sintéticos, sólo para el render).
- En las pasadas con enemigos se crea un mundo nuevo y **el jugador se cura cada
  50 ms sólo durante la medición**: si no, moría a mitad de la ventana (fin de
  partida, mascotas despedidas) y los números no medían lo que deben.

**Qué se midió** (`npm run build && npx electron . --bench`; Electron 33.2.1,
1920×1080 a pantalla completa, monitor a 100 Hz con vsync; 1 s de
calentamiento + 5 s de muestreo):

| Caso | FPS | Frame medio / p95 / máx | >33 ms | Sim media / p95 | Render medio / p95 | Draw calls | Mallas activas |
|---|---|---|---|---|---|---|---|
| 0 perseguidores, 12:00 | 100,0 | 10,0 / 10,1 / 10,3 | 0 | 0,01 / 0,1 | 2,00 / 3,5 | 91 | 40 |
| 200 thin instances, 12:00 | 100,0 | 10,0 / 10,1 / 10,2 | 0 | 0,44 / 1,1 | 1,84 / 3,3 | 92 | 41 |
| 200 mallas sueltas | 100,0 | 10,0 / 11,5 / 13,2 | 0 | 0,39 / 0,9 | 3,74 / 10,6 | 291 | 240 |
| 200 thin instances, noche | 100,0 | 10,0 / 10,1 / 10,3 | 0 | 0,39 / 1,0 | 2,10 / 4,9 | 92 | 41 |
| 200 + 33 enemigos animados | 98,8 | 10,1 / 10,3 / 63,2 | 1 | 0,45 / 1,0 | 4,50 / 9,0 | 205 | 101 |
| **200 + 33 enemigos + efectos** (4 mascotas, 10 botines, estados, 10 impactos/s) | **99,2** | 10,1 / 13,7 / 57,3 | 1 | 0,48 / 1,2 | 6,18 / 12,7 | 323 | 205 |

- Objetivo ≥ 60 FPS cumplido en todos los casos. Los efectos del Slice 02b
  cuestan ≈ 1,7 ms de render con esta carga. Queda un tirón suelto (≈ 60 ms) al
  aparecer muchos personajes a la vez (creación de mallas y compilación de
  materiales), que no se repite.
- Antes de mantener al jugador con vida, la pasada de 26 enemigos daba 37 FPS de
  media con p95 de 12 ms: no era coste de render sino la partida terminando
  (fin de partida, telemetría) dentro de la ventana.

---

# Bitácora — Slice 02c (oclusión y flechas)

Encargo del coordinador (2026-10-29). Rama `slice02c-oclusion` desde
`origin/master` (14cfc4a). Sin tocar `src/rpg/`, `src/sim/`, `src/ui/menus/`,
`npcView.ts` ni `waterView.ts`.

## Paso 1 — Oclusión por recorte en pantalla (2026-10-29)

**Qué se hizo**
- `src/render/occlusion.ts`: `OcclusionPlugin`, un plugin de material que en el
  fragment shader descarta los píxeles que (a) están dentro de un círculo
  alrededor de un personaje en pantalla y (b) están más cerca de la cámara que
  ese personaje (`gl_FragCoord.z` contra su profundidad proyectada). El borde es
  un tramado ordenado 4×4 (borde suave sin transparencia real ni ordenar
  nada). Trabaja en espacio de pantalla, así vale igual para las thin instances
  de la vegetación que para las mallas de las casas: no se toca ninguna
  instancia. Las sombras no cambian (el material de sombras no lleva el plugin).
- `OcclusionController`: cada fotograma proyecta al jugador y a los 3 enemigos
  vivos más cercanos (≤ 14 m) y actualiza 4 círculos compartidos por todos los
  materiales; los de enemigos aparecen y desaparecen con un fundido del radio.
  Radios, alcance y fundido en `data/fx.json → occlusion`.
- Llevan el recorte: troncos y copas de pinos y árboles, hojas de árbol, rocas,
  paredes, tejados y adornos de las casas, rocas grandes. No: hierba, flores,
  arbustos, troncos caídos ni farolas (bajos o finos).
- `OcclusionPlugin.setEnabled(on)` para medir con y sin recorte.

**Qué se comprobó** (panel de navegador): con la cámara baja dentro del bosque,
el roble y el pino que quedan delante del jugador muestran un hueco tramado
alrededor del personaje; lo que queda detrás no se recorta.

## Paso 2 — Flechas de los enemigos a distancia (2026-10-29)

**Qué se hizo**
- `src/render/fx/arrowFx.ts`: flecha (astil, punta y plumas, generada por
  código) para los ataques en línea de largo alcance (`ranged` y
  `goblin_veteran`, que hereda de él). La simulación resuelve el disparo de golpe
  al acabar el aviso, sobre la línea del aviso; la flecha sale del arco (mano
  izquierda del modelo, `EnemyView.socketOf`) con la antelación justa para pasar
  por el punto de esa línea más cercano al jugador en ese instante, a la
  velocidad de `data/fx.json → arrow.speed` (26 m/s). Si la simulación emite el
  daño de ese enemigo, la flecha se queda en el jugador; si no, sigue hasta el
  final de la línea y se clava en el suelo.
- `tests/arrows.test.ts` (NullEngine + simulación real a 60 Hz): en el tick en
  que el enemigo pasa de aviso a ataque, su flecha está a < 0,6 m del jugador;
  con acierto, se queda en él; los ataques cuerpo a cuerpo no disparan flechas.

**Qué se comprobó**: en el panel de navegador, la forma y orientación de la
flecha. La sincronización con la simulación la prueba el test (el panel oculto
no avanza la partida fotograma a fotograma).

## Paso 3 — Medición (2026-10-29)

`npm run build && npx electron . --bench`; Electron 33.2.1, 1920×1080 a pantalla
completa, monitor a 100 Hz (vsync); 1 s de calentamiento + 5 s de muestreo. La
batería añade la misma pasada de efectos con el recorte de oclusión apagado
(`OcclusionPlugin.setEnabled(false)`). Con `master` 14cfc4a (tienda y estanque
incluidos: el caso base pasa de 91 a 98 draw calls).

| Caso | Recorte | FPS | Frame medio / p95 / máx | Sim media / p95 | Render medio / p95 | Draw calls |
|---|---|---|---|---|---|---|
| 0 perseguidores, 12:00 | sí | 100,0 | 10,0 / 10,1 / 11,0 | 0,01 / 0,1 | 2,25 / 4,1 | 98 |
| 200 thin instances, 12:00 | sí | 100,0 | 10,0 / 10,1 / 10,3 | 0,45 / 1,2 | 1,96 / 3,7 | 99 |
| 200 thin instances, noche | sí | 100,0 | 10,0 / 10,1 / 10,2 | 0,42 / 1,0 | 2,36 / 5,7 | 99 |
| 200 + 33 enemigos animados | sí | 98,8 | 10,1 / 10,6 / 60,4 | 0,45 / 1,0 | 4,85 / 9,8 | 219 |
| 200 + 33 enemigos + efectos | **sí** | 99,2 | 10,1 / 14,7 / 56,2 | 0,52 / 1,3 | **6,51** / 13,5 | 336 |
| 200 + 33 enemigos + efectos | **no** | 99,2 | 10,1 / 14,2 / 56,6 | 0,54 / 1,4 | **6,29** / 13,1 | 327 |

- Objetivo ≥ 60 FPS cumplido. El recorte cuesta ≈ 0,2 ms de CPU de render por
  fotograma (actualizar 4 círculos en los materiales que lo llevan) y no cambia
  los FPS; el coste de GPU (unas pocas operaciones por píxel de árboles y casas)
  no se mide aparte y queda por debajo del tope de 100 Hz.
- La cámara de la medición es la de partida (55°), con pocos árboles delante:
  el recorte se evalúa en todos los píxeles de esos materiales esté o no
  tapando, así que el coste medido no depende de que haya oclusión.

## Simulador de equilibrio (2026-10-30)

Rama `balance-sim` desde `master` 47deff9. `npm run balance` juega con bots
sobre `World` y `GameSession` reales (sin pantalla) y escribe
`docs/EQUILIBRIO_2026-10.md`: clases, hechizos (uso y ablación), habilidad
(esquivar 0 / 50 / 90 %), preparación, XP en N minutos, botín por rareza,
economía de combate y pesca, y seis ajustes de números propuestos con su
resultado al volver a simular sobre una copia en memoria. `data/` y `src/` sin
cambios.

**Qué se midió**: 2592 partidas de la batería principal más ablaciones,
escaleras, 12 granjas de 60 min y 9 sesiones de pesca, en ~2 min con 4 procesos.
Con el kit de nivel 1 el contenido es fácil para las dos clases; la armadura
plana hace a la Vanguardia casi inmune, el recurso casi nunca limita, el nivel 2
llega en mitad del primer combate y la tienda cuesta minutos.

**Qué quedó pendiente**: que el creador fije los objetivos (tiempo hasta el
nivel 20, precio de lo más caro, dificultad de los jefes). Armadura porcentual y
XP por diferencia de nivel son decisiones de diseño, no de datos.

# Bitácora — Slice 06 (misiones y diálogos)

Rama `slice06-misiones` desde `master` 47deff9. Informe completo en
`docs/HANDOFF_SLICE_06.md`.

## Bloques 1–3 (2026-10-29/30)

**Qué se hizo**: misiones y diálogos en datos (`data/rpg/npcs.json`,
`quests.json`), lógica en `src/rpg/quests.ts` (objetivos de matar, recoger o
entregar, pescar, hablar y llegar; cadenas; recompensas de XP, monedas, objetos
y hechizo), PNJ generales en el mundo, «!»/«?» encima, ventana de diálogo,
diario (J), seguimiento en el HUD y avisos. Estado en `SaveData.quests`
(opcional). Contenido: 3 PNJ nuevos, diálogo para los 2 mercaderes y una cadena
de 5 misiones.

**Qué se midió**: 263 tests en verde (26 nuevos), `typecheck` limpio. Recorrido
completo de la cadena con la simulación en el mundo de 256 m. Prueba de humo en
el navegador de desarrollo sin errores. No se midió rendimiento en Electron (no
hay render nuevo pesado).

**Qué revisar a ojo (en Electron)**:
- Que el «!» y el «?» se lean bien de día y de noche y a la distancia de la
  cámara de partida, y que no se confundan con la moneda de los mercaderes.
- Que los tres PNJ nuevos caigan en buen sitio en el pueblo (no dentro de una
  casa ni tapados por una farola) y que sus paletas se distingan.
- La ventana de diálogo: legibilidad, que no tape demasiado, clic en opciones
  y teclas 1–6, Esc, y que se cierre al alejarse.
- Diario (J) y seguimiento: que no choquen con la mochila, la tienda ni el
  panel de medición; clic en el seguimiento abre el diario.
- Que los lobos de la misión aparezcan al noroeste del pueblo (≈ 98, 92) y los
  goblins al este (≈ 172, 150), en terreno razonable, y que la piedra del vigía
  (180, 132) esté en un sitio al que se llegue andando.
- Flujo con el ratón real: hablar con el herrero → «Comerciar» → tienda; el
  sonido de la tienda debe seguir sonando al abrirla así.
- Guardar con misiones a medias, cargar, y que el diario y los enemigos
  vuelvan como estaban.

## Opciones, ventanas y enemigos con hechizos (2026-10-30)

En `master`. Detalle en `docs/OPCIONES_E_INTERFAZ.md`.

**Qué mirar a ojo:**
- **Ventanas.**
  - Arrastrar por el título la mochila, el personaje, el libro, la tienda, el diario y las ventanas de Opciones.
  - Comprobar que recuerdan su sitio al cerrar y reabrir, y que «Restablecer posiciones» las devuelve.
- **Interfaz.**
  - Los 5 temas, sobre todo Claro: el HUD sobre el mundo usa fondo claro.
  - Las 4 letras.
  - Escala de interfaz al 75 % y al 150 %.
- **Pantalla completa** en Electron con la casilla y con F11. Con Esc se sale y la casilla se desmarca.
- **Mac con trackpad.**
  - Clic con dos dedos y arrastrar.
  - Mantener X y mover.
  - `,` y `.` para girar.
- **Combate.**
  - Que cada hechizo enemigo se vea venir y se pueda esquivar, sobre todo la Lluvia de flechas en el jugador y el Aullido del alfa.
  - Que el daño se note sin ser injusto.
- **Rendimiento.** Cuadrícula activada (F1); se rehace cada 3 m.

**Probado en el navegador de desarrollo:** temas, letras, escala, arrastre de Opciones y de la mochila, ventana al frente, cuadrícula, giro con `.` y con X. No probado: Electron a pantalla completa ni el trackpad real del Mac.


## Zonas con franja de niveles (2026-10-30)

En la rama `zonas-nivel` (sin fusionar). Detalle en `docs/HANDOFF_ZONAS.md`.

**Qué se hizo:**
- **Zonas.** `data/zones.json` con el pueblo seguro y cinco franjas: 1–5, 5–12, 9–15, 13–20 y la élite 20–24. Unos 43 monstruos que se reponen. El encuentro fijo pasa a ser la primera zona.
- **Nivel de los monstruos.** Escalan por curvas en datos: vida, daño, power, críticos, armadura, resistencias, XP y botín.
- **Hechizos por nivel.** Nuevos hechizos con `minLevel` y dos variantes: Bruto de la cripta y Lobo de ceniza.
- **Diferencia de nivel.** Multiplicador de daño con topes.
- **Interfaz.** Banner al entrar en una zona, nivel en el registro y cartel de nombre y nivel sobre cada monstruo.

**Qué se midió:**
- **Equilibrio.** `npm run balance -- --zones` escribe `docs/EQUILIBRIO_ZONAS.md`.
  - Nivel 1 sin esquivar en la élite: muere de un golpe en el 92 % de las partidas.
  - Dentro de la franja, con habilidad media: muere el 0–25 %.
  - Cinco niveles por debajo: con habilidad media muere mucho más que con buena.
- **Tests.** `npm run typecheck` y `npx vitest run` en verde: 307 tests, 17 nuevos.

**Qué quedó pendiente:**
- FPS con 43 monstruos y sus carteles, y la revisión visual: en local.
- Regenerar `docs/EQUILIBRIO_2026-10.md`: la diferencia de nivel toca un poco la arena.
- Preguntas para el creador en el handoff, sobre todo si la élite debe quedar por encima del nivel máximo.


## Opciones completas y temas elementales (2026-10-30)

En la rama `opciones-temas` (sin fusionar). Detalle en `docs/HANDOFF_OPCIONES.md`.

**Qué se hizo:**
- **Temas.** 8 temas: Pergamino, Fuego, Agua, Viento, Tierra, Naturaleza, Claro y Alto contraste. Los guardados con `noche` o `bosque` pasan a Agua y Naturaleza.
- **Gráficos.** Preajustes Bajo / Medio / Alto / Ultra y opciones sueltas: sombras, vegetación, distancia de visión, partículas, resolución interna, suavizado y recorte de oclusión. Todo se aplica en marcha salvo MSAA, que pide reiniciar.
- **Interfaz.** Tamaño de los iconos de la barra y de la mochila, opacidad de las ventanas, animaciones, letra del registro de combate y retardo de los tooltips.
- **Juego.** Barras de vida (siempre, heridos, objetivo o nunca), nombre y nivel, números de daño, alcance del hechizo al cargarlo y confirmar la venta de objetos raros.
- **Ventanas modales.** Ya no se salen de la pantalla: el contenido se desplaza y las pestañas, el título y los botones se quedan fijos.

**Qué se midió:**
- **Contraste WCAG** de los 8 temas, en un test.
- **Modales.** En el navegador de desarrollo, a 1280×720 y con la interfaz al 150 %, Opciones y Atajos caben enteras.
- **Tests.** `npm run typecheck` y `npx vitest run` en verde: 324 tests, 17 nuevos.

**Qué quedó pendiente:**
- FPS por preajuste.
- Revisión de los temas en Electron.
- Tamaño de la barra de hechizos con el HUD nuevo (otra sesión).

## Modo edición y colisión junto a las paredes (2026-10-30)

En la rama `modo-edicion` (sin fusionar). Detalle en `docs/HANDOFF_EDITOR.md`.

**Qué se hizo:**
- **Modo edición (F12).** Pausa el mundo y usa una cámara libre. Se puede:
  - seleccionar y arrastrar casas y props, árboles y rocas, PNJ, mercaderes, estanques, áreas de zona y el inicio;
  - girar, escalar, borrar y añadir desde una paleta;
  - pintar la navegación con la cuadrícula a la vista;
  - deshacer y rehacer (Ctrl+Z / Ctrl+Y).
- **Guardar (Ctrl+S, sólo en desarrollo).** Un plugin de Vite escribe los JSON de `data/` con el mismo formato y Vite recarga. Fuera de desarrollo, «Exportar JSON».
- **Datos nuevos.** En `vegetation.json`, `placements` y `exclusions`. Además, `data/navpaint.json`.
- **Vegetación estable.** Una secuencia aleatoria por tipo y un gasto fijo por candidato. El bosque generado cambia una vez respecto a `master`.
- **Colisión.** Tres cambios:
  - la celda se mide por su borde;
  - troncos y rocas son redondos;
  - un clic en la pared termina en el borde de la celda libre.
  
  Junto a una casa, el personaje se para a 0,5 m de la pared en vez de a 0,75 m, sin atravesarla.

**Qué se midió:**
- **Tests.** `npm run typecheck` y `npx vitest run` en verde: 332 tests, 25 nuevos en `tests/editor.test.ts`.
- **`vite build`.** Funciona y el punto de guardado no está en el paquete.
- **Prueba en el panel del navegador.** Se abrió el editor, se arrastró una casa, se deshizo y se pintó. Al guardar, el diff fue de una línea y la recarga la mostró en su sitio. Después se revirtió.

**Qué quedó pendiente:**
- Probar en Electron y medir los FPS con el editor abierto: en local.
- Decidir si se acepta el bosque nuevo y si se prueba una rejilla de 0,25 m (preguntas en el handoff).

## Mazmorras: Cripta del Cruce (2026-10-30)

En la rama `mazmorras` (sin fusionar). Detalle en `docs/HANDOFF_MAZMORRAS.md`.

**Qué se hizo:**
- **Entrada.** Arco de piedra al sur del pueblo, en (141, 156): clic y se baja.
- **Pisos.** Tres pisos generados por semilla desde `data/dungeon.json`: salas, pasillos, escaleras, antorchas, cofres y monstruos de niv. 3–5, 5–7 y 7–9.
  - En el último, el guardián `crypt_warden` (variante de `grave_brute`, niv. 10).
- **Cambio de escena.** `src/scenes/cryptScene.ts`:
  - `World` nuevo con el mismo personaje.
  - Exterior oculto, suelo plano y luz de interior con antorchas que parpadean.
  - La cámara se acerca y sólo esquiva meterse dentro de un muro; los muros que tapan al jugador se recortan con la oclusión.
- **Banner.** «Cripta del Cruce · piso N · niv. X–Y»: es el banner de zona de siempre.

**Qué se midió:**
- **Rendimiento.** Escena del piso 1 a 3,1 ms de media (5,8 ms en p95) con `gl.finish`, en el navegador de desarrollo con el panel oculto. Hay que medir los FPS reales en Electron.
- **Tests.** `npm run typecheck` y `npx vitest run` en verde: 318 tests, 11 nuevos.

**Qué quedó pendiente:**
- Revisión visual en Electron de la boca retocada y de los temas de los pisos 2 y 3.
- FPS reales.
- Audio de interior.
- Dificultad del piso 1 para nivel 1.

## Personaje 3D procedural (2026-10-30)

En la rama `personaje-3d` (sin fusionar). Detalle en `docs/HANDOFF_PERSONAJE.md`; capturas en `docs/capturas/personaje/`.

**Qué se hizo:**
- **Humanoide nuevo** (`src/render/characters/heroModel.ts`) para el jugador, los PNJ y el bruto de las tumbas.
  - Formas redondeadas: cápsulas, elipsoides, tornos y cintas.
  - Rig propio (`heroRig`): cabeza grande y unas 4,3 cabezas de alto.
  - Cara con ojos que parpadean, cejas, nariz y boca. Seis peinados y barba.
  - Ropa por capas: túnica, armadura, túnica larga o mandil; capucha, yelmo o diadema; capa.
  - Pesos por vértice para que el torso, la falda y la capa se doblen sin cortes.
- **Variantes en datos.** `looks` por clase y por PNJ en `data/assets.json` (`bodyType`, `hairStyle`, `outfit`, `headgear`, `cape`, `beard`, `weapon`, `offhand`), validados con la ruta del error.
- **Equipo a la vista.** El mapa `gear` pinta el arma equipada en la mano derecha (espada, hacha, maza, báculo, varita u orbe) y la rodela en la izquierda. El modelo del jugador se rehace al cambiar de clase o de equipo.
- **Animaciones nuevas** con los mismos estados, eventos y sockets:
  - Reposo que respira.
  - Carrera con braceo y capa.
  - Tajo o golpe de báculo, y hechizo.
  - Voltereta, impacto y caída de espaldas.
- **Medición.** `?bench=humans` (24 humanoides) y una fila más en `?bench=1`. Galería `/personajes.html` para revisar a ojo.

**Qué se midió** (cifras completas en el handoff):
- **Coste por personaje.** De 2148 vértices y 3372 triángulos con las cajas a 2750–4300 vértices y 5000–7700 triángulos. Una llamada de dibujo, dos con arma que brilla. El test fija menos de 5000 vértices.
- **Corro de 24 humanoides** (Chromium por software en la nube, 640×360):
  - Llamadas de dibujo: +41 antes, +44 ahora.
  - Triángulos activos: +140 mil antes, +224 mil ahora.
  - El FPS real no se puede medir aquí.
- **Tests.** `npm run typecheck` y `npx vitest run` en verde: 315 tests, 8 nuevos.

**Qué quedó pendiente:**
- FPS real con `npx electron . --bench` y la revisión visual en movimiento: en local.
- Elegir pelo y color en la creación: no se hizo, porque toca el guardado y los estilos de otras sesiones.
- El arquero, el chamán y el diablillo siguen con piezas de caja.

## Mundo, nombres y clima (2026-10-30)

En la rama `mundo-clima` (sin fusionar). Detalle, glosario y preguntas en `docs/HANDOFF_MUNDO_CLIMA.md`.

**Qué se hizo:**
- **Nombres panameños (PROPUESTA).**
  - Los zaaps pasan a ser **Piedras Pintadas** (`data/stones.json`, `src/world/stones.ts`).
  - El pueblo es Villa Raspadura y la cripta, la Cripta de la Tulivieja.
  - Las zonas son Azuero, Chame, Boquete, Cerro Punta y Barú, más cinco preparadas.
  - Los monstruos de la franja 1 son satos, duendes, curanderos y diablicos.
- **10 franjas de 10 en 10 hasta 100.**
  - Cada una tiene su clima y su familia (55 arquetipos nuevos con `base` y `damageScale`, ficha RPG y asset procedural).
  - Cinco zonas no caben en el mundo de hoy: llevan `planned` y no tienen áreas.
- **Grupos.**
  - Los monstruos nacen en grupos de 1 a N (tope por zona).
  - Si uno pelea, todo el grupo va a por el jugador.
  - El grupo vuelve entero tras `respawnSeconds`: de 30 s en la franja 1 a 360 s en la 10.
- **Noche.**
  - Hay monstruos que sólo salen de noche, y el relevo cambia la población al anochecer y al amanecer.
  - Hay pesca nocturna (`nightLootTable`).
- **Tiempo por zona** (`data/weather.json`, `src/sim/weather.ts`).
  - La lluvia baja el fuego a ×0,7 y el solazo de día lo sube a ×1,25. Se aplica como multiplicador del mundo tras la tubería de daño, sin tocar `damage.ts`.
  - La nieve sólo cae en zonas frías: se acumula y frena al jugador hasta un −40 %.
  - Render: partículas de lluvia y nieve, y tinte de la luz (`src/render/weatherView.ts`). La tecla Insert pasa al siguiente tiempo.
- **Cripta con llave.** Hace falta la Llave de la Tulivieja, que sueltan los monstruos de la franja 1–10 y se gasta al entrar. Sin ella, sale un aviso claro.

**Qué se midió:**
- `npm run typecheck`, `npx vitest run` (402 tests, 27 nuevos) y `npm run build` en verde.
- La llave cae en el 4–12 % de las muertes.
- Vivos en el mundo: 42, igual que antes.
- Revisión rápida en Vite: el aguacero y el solazo se ven en Azuero.

**Qué quedó pendiente:**
- Ver la nieve y medir los FPS con partículas en Electron (en local).
- Equilibrio de las franjas 50–100: las curvas se disparan y el nivel máximo es 20.
- Icono de tiempo en el HUD, para la sesión de mapa y HUD.
- Mundo que carga por trozos, barcos y globos: sólo hay propuesta.

## Combate v2 (2026-10-30)

Se eliminó la estadística de armadura: la defensa usa resistencias elementales
con tope de 50 %. La evasión genérica dejó libre Espacio y las clases reciben
movilidad propia (blink, intercambio, empuje y atracción), además de inmunidad,
reenvío, contra y rebobinado. Los hechizos de un objetivo son teledirigidos y
las áreas pueden tener fuego amigo. Se añadieron tres modos de lanzamiento,
indicador de alcance, vista previa del daño, crítico con marca/sonido separado,
cargas del ataque básico y `castWhileMoving`. Detalle y revisión visual en
`docs/HANDOFF_COMBATE_V2.md`.

## Muerte, Pulso y botín de combate (2026-10-30)

Se añadió Pulso persistente con pérdida por muerte, recuperación natural,
descanso junto a Piedras Pintadas, consumible y penalización a cero. El botín
de monstruos se acumula por combate, se reparte por participación y aparece en
una ventana no modal con cuenta atrás y recogida individual o total. Compra y
venta tienen confirmación y «no volver a preguntar en esta sesión». Detalle en
`docs/HANDOFF_MUERTE_BOTIN.md`.

## Mapa, minimapa y HUD configurable (2026-10-30)

Se añadieron minimapa cuadrado arrastrable/redimensionable, norte fijo o giro
con cámara, brújula y marcadores; mapa grande en M con zoom, paneo, capas,
coordenadas, niebla por personaje y banderas propias. El modo Inicio permite
mover los elementos del HUD y administrar perfiles. La escala automática usa
resolución CSS, `devicePixelRatio` y límites configurables. Detalle y revisión
visual en `docs/HANDOFF_MAPA_HUD.md`.

## Arquitectura online y PoC local (2026-10-30)

`docs/ARQUITECTURA_ONLINE.md` documenta servidor autoritativo, predicción,
interpolación, transporte, interés por celdas, instancias, persistencia,
economía, cuentas, seguridad, chat, grupos, mercado, carga, costes y ruta por
fases. `server/` añade una PoC aislada en `127.0.0.1`: World a 60 Hz,
snapshots delta a 20 Hz, dos bots, protocolo binario, validación y medición de
bytes. Se ejecuta con `npm run server:poc` y no conecta el juego actual.

## Integración de sistemas y revisión local (2026-10-30)

Se integraron en `master` mundo/clima, combate v2, Pulso y botín, mapa/HUD y
la arquitectura online. Los conflictos se resolvieron conservando los nombres
originales, las familias de monstruos, el multiplicador climático y los nuevos
efectos defensivos. El mapa ahora se recentra en el jugador cada vez que abre y
su ventana queda centrada en ambos ejes. Las capas usan el componente
reutilizable `toggleChoice`, de modo que estilo y comportamiento se mantienen
en un único lugar en vez de casillas nativas específicas del mapa.

**Verificación final:**
- `npm run typecheck`: verde para juego, Electron y servidor.
- `npx vitest run`: 58 archivos y 488 tests, todos verdes.
- `npm run build`: verde; queda el aviso conocido del paquete principal de
  6,13 MB antes de gzip (1,43 MB gzip), pendiente de separar por carga dinámica.
- `npm run balance`: informe regenerado con los nombres y datos integrados.
- `npm run server:poc`: 599 ticks en 10 s (59,8/s); ~634 B/s de bajada y
  11–13 B/s de subida por cliente, sin comandos rechazados.
- Revisión en Electron: partida guardada, aguacero, zona Llanos de Azuero,
  minimapa, niebla, capas, franjas y Piedra Pintada visibles. El mapa se abrió
  desde el botón del minimapa y se revisó a resolución de escritorio.
- Revisión a 1266×792: overlays y paneles calculan su área máxima antes del
  escalado automático. La creación de personaje queda centrada y enteramente
  dentro del viewport; cuando su contenido no cabe, desplaza dentro del panel
  en vez de salir de los límites. La misma restricción se aplica a pantallas,
  modales y ventanas del juego.

## Revisión de la Vanguardia e interfaz (2026-10-31)

- La Vanguardia empieza con tres acciones legibles: Embestida (dash con daño),
  Remolino de brasas (área alrededor) y Grito de hierro (aumento explícito).
- Sus demás hechizos se desbloquean en niveles 3, 5, 7, 9 y 12; el repertorio
  alterna físico, fuego y tierra. Los pergaminos siguen permitiendo aprender
  hechizos de otros elementos.
- Los guardados antiguos filtran los hechizos propios que todavía no
  corresponden al nivel y reconstruyen automáticamente los ya desbloqueados.
- Pulso se muestra redondeado, los estados explican su efecto en el tooltip y
  el tooltip global queda por encima de paneles, modales y editor.
- La hoja de personaje incorpora reinicio confirmado de puntos principales y
  límites de tamaño que descuentan su posición al ampliar la interfaz.

## Progresión por clase, requisito de nivel y sonidos (2026-10-31, continuación)

- Se terminó el WIP `wip-progresion-clase`: los 2 errores de tipos de
  `content.ts` y los 6 tests rotos. Los tests que usan hechizos de nivel alto
  ahora suben al personaje de verdad (`tests/levels.ts`), no se saltan la regla.
- `unlockLevel` es el requisito para la barra: la clase lo aprende sola al
  alcanzarlo y un pergamino puede enseñarlo antes, pero ni `assign`, ni
  `learn`, ni la carga de partida lo ponen en la barra, y `commandCast`
  devuelve el bloqueo nuevo `level`. Al llegar al nivel entra solo en un hueco.
- Tejedora: kit de nivel 1 = Chispa, Nova de escarcha y Foco de tormenta
  (aumento nuevo); el resto alterna rayo/escarcha cada dos niveles
  (Transposición pasa a escarcha). Universales con requisito 2–10 y pergamino
  nuevo de escarcha (Esquirla de escarcha, nivel 5) en el boticario y en botín.
- Interfaz: medidor de Pulso en el HUD, `pulseText` común (HUD, hoja, muerte);
  línea roja de requisito en tooltips de hechizos y pergaminos; iconos propios
  para aumentos y cargas; hoja de personaje con cuerpo desplazable y columnas
  auto-fit (verificada a 150 % en Chromium headless: scroll interno, sin
  desbordamiento horizontal).
- Sonidos: 12 WAV regenerados por síntesis en código (`scripts/generateSfx.mjs`,
  determinista, con metadatos INFO), conectados por `samples` en
  `data/audio/sfx.json` (golpes, críticos, lanzamientos por elemento, curación,
  bloqueo) con la receta sintetizada como respaldo. `src/audio/music/` en
  `.gitignore`.
- Medido: `npm run typecheck`, `npx vitest run` (514 tests) y `npm run build`
  en verde. Pendiente en local: escuchar las muestras y probar en Electron.

## Combate táctico: trampas, controles y placaje (2026-10-31, rama `combate-tactico`)

- Trampas invisibles: efecto `trap` (se dispara al pisarla un rival; armado,
  límite por lanzador, distancia mínima y duración en `data/rpg/tactics.json`),
  revelar (`reveal`, Polvo vidente con pergamino), Lazo de zarzas, Brasa
  enterrada y el arquetipo Trampero del Matorral (ataque `effect: "trap"`).
  El render pinta las propias tenues y las rivales sólo reveladas.
- Controles en tiempo real como estados con `hinder`: Agotamiento (lentitud y
  enfriamientos más lentos, acumulable con tope), Embotado (el próximo
  lanzamiento tarda más o falla) y Desorientado (sin desplazamientos).
  Rendimientos decrecientes por familia y estadística nueva `slowResist`
  (Tobilleras de junco). Uno de cada para jugador y enemigos.
- Placaje: dos modos experimentales en Opciones → Juego (`lockMode`): libre
  (placaje pequeño al alejarse) y bloqueo de cuerpo (nadie atraviesa a nadie,
  zafarse cuesta). Valen también para los enemigos que se separan del jugador.
- Medido: `npm run typecheck`, `npx vitest run` (535 tests, 21 nuevos) y
  `npm run build` en verde. Pendiente en local: revisión visual (anillos de
  trampa, opción nueva) y sensación de los dos modos. Detalle en
  `docs/HANDOFF_COMBATE_TACTICO.md`.

## Diseño de ambientación, elementos y clases (2026-10-31, rama `diseno-clases`)

- Sólo diseño: no se tocó `src/` ni `data/`.
- `docs/DISENO_ELEMENTOS_CLASES.md`: 3 ambientaciones (A fantasía tropical
  panameña, B retrofuturista del Canal, C «La Marea Doble», mezcla
  **recomendada**); 6 elementos propios (Ñeque, Bochorno, Sereno, Saloma,
  Bejuco, Vaivén) con huellas y 7 reacciones que también disparan los
  compañeros, efecto del clima y correspondencia con los 5 de hoy; 8
  primarias (Fibra, Temple, Calma, Pulmón, Arraigo, Tino, Aguante, Malicia) con
  fórmulas; 7 clases (Yerbatero, Pilonero, Diablico, Tamborero, Cuentero,
  Arponero y la propuesta Esclusero), cada una con recurso, mecánica,
  movilidad, defensa y 8 hechizos (3 en nivel 1); combinaciones de grupo;
  repertorio de «décimas» por franjas 1–100 y fuentes; progresión «Maña»;
  trampas invisibles con detonador, percepción y contramedidas; plan de
  migración y 15 preguntas para el creador.
- `docs/propuestas/`: borradores JSON (elementos, 7 clases, 56 hechizos y
  estados) en el formato de `data/rpg/`, validados como JSON y con todos los
  hechizos iniciales comprobados (clase y nivel 1).
- Pendiente: respuestas del creador (§9 del documento); después, implementar
  los ids nuevos, las reacciones en `src/sim/` y los efectos marcados `_nuevo`.

## Arreglos del HUD: cursor desplazado y minimapa libre (2026-10-31)

Rama `hud-arreglos`. **Causa del desfase:** `WindowLayout.place` escribía
`left/top/right/bottom` en línea y Chromium lo guarda como `inset: …`, así que
las reglas `[style*='left'] { transform: none }` nunca casaban. El
`translateX(-50%)` seguía puesto, y la barra de abajo, las coordenadas y la
barra de combate quedaban a medio ancho del cursor: 504 px con la barra a
100 % en 1600×900 y 750 px a 150 %. Ahora `place` quita el transform en línea
(clase `win-placed`) y corrige con lo medido (`solvePlacement`), así el zoom de
la escala y de las media queries ya no descoloca nada. `clampDrag` evita el
salto de las ventanas que ya asomaban fuera. El minimapa se redimensiona por el
borde izquierdo, el de abajo o la esquina, con cualquier proporción entre
`minSize` y `maxSize`; la imagen se recorta a escala fija y el perfil guarda
`{ w, h }`.

**Verificación:**
- `typecheck`, 504 tests y `build` en verde.
- Chromium headless a 1600×900 y 900×800, al 100 % y al 150 %: los seis
  elementos del HUD y las seis ventanas siguen al cursor a menos de 0,5 px
  (fuera de los topes del borde de la pantalla).
- Detalle en `docs/HANDOFF_HUD_ARREGLOS.md`.
- Pendiente: revisión en Electron.

## Equipo y objetos (2026-10-31, rama `equipo-objetos`)

- Mano izquierda con escudo, rodela o un arma de una mano.
  - Con dos armas, el básico alterna de mano: la izquierda pega al 75 % y los dos golpes salen ×1,2 más rápido (`rules.dualWield`).
  - Las armas de dos manos (mandoble, martillo, lanza, arco, ballesta, bastón) bloquean la izquierda y desplazan lo que haya en ella.
  - Huecos nuevos: capa (`back`) y cinturón (`waist`).
- Tipo de objeto (`kind`, 41 tipos). Se valida contra el hueco y la categoría, y se deduce si falta.
- Iconos SVG por tipo, coloreados por rareza y elemento, con variantes por id.
- 71 objetos nuevos del nivel 1 al 99, en las 10 franjas.
  - 6 sets: Machetero, Diablo Danzante, Pollera, Cazador del Darién, Guardián de las Esclusas y Tulivieja.
  - 36 tablas de botín, una por zona y papel. Las franjas 10–100 ya no sueltan el equipo de nivel 1–4.
  - Mercaderes ampliados.
- Mochila y equipo:
  - muñeco con cada hueco en su sitio del cuerpo;
  - totales de características, resistencia y daño por elemento, y conjuntos;
  - filtros por grupo, tipo y rareza, y orden por criterio;
  - comparación por mano en el tooltip.
- 3D: la mano izquierda dibuja escudo, rodela o arma. Hay dibujos nuevos para daga, mandoble, martillo, lanza, arco, ballesta y rodela, y los objetos sin `gear` se dibujan por su tipo.
- Migración al cargar:
  - las tiradas se ajustan a la definición actual;
  - lo que ya no encaja en su hueco vuelve a la mochila o, si no cabe, al botín pendiente.
- Medido:
  - `npm run typecheck`, `npx vitest run` (542 tests) y `npm run build` en verde;
  - `npm run balance` regenerado, con cambios pequeños frente a `master`; ver `docs/HANDOFF_EQUIPO.md`;
  - panel y galería 3D comprobados en Chromium headless.
- Pendiente en local: Electron, FPS y revisión a ojo.
- Pregunta abierta: el nivel máximo sigue en 20, así que el equipo de 21–99 cae pero no se puede equipar.

## Guardado con lugar, partidas de prueba y medidor de daño (2026-10-31, rama `guardado-presets`)

- 12 ranuras (las 3 de antes conservan su clave), con lista desplazable y nombre
  editable. Cada fila enseña el sitio, la fecha y el tiempo jugado.
- El guardado lleva `place`: escena, mazmorra y piso, x/y, piedra activa y
  conocidas, hora y segundos jugados. Al cargar se aparece exactamente ahí; si el
  sitio ya no existe, en la Piedra Pintada conocida más cercana
  (`src/world/placement.ts`). Los guardados antiguos se migran a su piedra de
  reaparición.
- «Partidas de prueba» (dev o marca `frankmangames.dev`): 13 partidas en
  `data/dev/presets.json` con franjas baja, media y alta, fuego, tormenta y escarcha
  puros, mixtos, tanque, daño, curación, nivel 3 en el Barú y pisos 1 y 3 de la
  cripta. Se cargan con un clic, como un guardado normal.
- Medidor de daño (tecla Fin): DPS hecho y recibido, curación por segundo, golpe
  máximo, desglose por hechizo y tiempo en matar.
- Música local sólo en `npm run dev`: `src/audio/music/local.json` asigna
  canciones a sitios (`dungeon`, `crypt-N`, zona, `overworld`). El build no la
  incluye (comprobado en `dist/`) y la carpeta sigue ignorada por git.
- Medido: `npm run typecheck`, `npx vitest run` (558 tests, 44 nuevos) y
  `npm run build` en verde. Prueba de humo en Chromium headless: guardar en la
  cripta, ir al título, cargar y mismo piso y punto. La música local entra en la
  cripta y sale al volver al mundo abierto.
- Pendiente en local: revisión visual en Electron y escuchar la canción real.
  Detalle en `docs/HANDOFF_GUARDADO_PRESETS.md`.
