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
