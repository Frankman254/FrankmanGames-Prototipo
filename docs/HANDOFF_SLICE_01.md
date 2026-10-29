# HANDOFF — Slice 01

Rama: `slice01-pasos-4-6` (pasos 4–6 hechos en la nube y fusionada con `master`
tras el paso 2b de Electron y la re-medición del paso 3). Sin push a `master`.

- **Objetivo autorizado:** Slice 01 de `docs/ALCANCE_SLICE_01.md`: arena en
  tiempo real con clic para moverse, tres enemigos con intención visible, combate
  con recurso + enfriamientos, cierre de partida. Esta entrega cubre los pasos
  4 (enemigos), 5 (combate del jugador) y 6 (cierre de partida). Los pasos 1–3
  y el 2b ya estaban en `master`.

- **Qué funciona (con cómo probarlo):**
  - `npm test` → 56 tests en verde (lógica pura de `src/sim/`).
    `npm run typecheck` → limpio (renderer + proceso principal de Electron).
  - `npm run dev` abre la arena en Electron. Controles (PROPUESTA):
    - Clic izquierdo en el suelo = moverse (mantener pulsado sigue al cursor).
    - Clic izquierdo sobre un enemigo = ataque básico (se acerca si hace falta);
      mantener pulsado lo repite.
    - **Q** = habilidad barata (objetivo bajo el cursor o el último atacado).
    - **W** = habilidad cara en cono hacia el cursor, con enfriamiento.
    - **Espacio** = evasión hacia el cursor (invulnerable un instante).
    - **R** = reiniciar sin recargar · **T** = guardar la telemetría JSON.
    - Siguen L (camino), 1/2/0/V (prueba de carga).
  - Enemigos (`src/sim/enemies.ts`): máquina de estados
    `idle → acquire → pursue → telegraph → attack → recover (→ stagger) → dead`.
    `melee` se pega y golpea en cono; `ranged` mantiene la distancia, retrocede y
    dispara en línea; `summoner` se queda lejos y llama `minion`s con tope. Todo
    ataque pasa por un aviso con el área exacta dibujada en el suelo; el área se
    fija al empezar el aviso, así que salir a tiempo (o evadir) lo esquiva.
  - Combate (`src/sim/combat.ts`, `World.commandCast/Attack/Evade`):
    `canCast = recurso ≥ coste ∧ cooldown ≤ 0 ∧ GCD ≤ 0 ∧ en alcance`, daño
    uniforme en [mín, máx] con crítico, sin tirada de acierto. HUD con barras de
    vida y recurso, barrido circular de enfriamiento/GCD, gris sin recurso y el
    motivo de bloqueo.
  - Cierre (`World.outcome`, `src/sim/telemetry.ts`): victoria al no quedar
    enemigos vivos (esbirros incluidos), derrota a 0 de vida, cartel con
    resumen, R reinicia; telemetría por partida a consola y a archivo con T.
  - Todos los números en `data/enemies.json`, `data/encounter.json`,
    `data/abilities.json` y `data/player.json`, marcados `PROPUESTA` y
    validados al cargar (p. ej. ningún ataque enemigo sin aviso: `telegraphSeconds ≥ 0,1`).

- **Mediciones (FPS/frame time con N entidades, latencia de clic):**
  - En el PC del creador (Electron, de `master`): 200 entidades a 159 FPS,
    frame 6,3 ms (p95 7,2 ms); ver paso 3 en `docs/BITACORA.md`. Latencia de
    clic medida en el paso 2: 16 ms de media, máx. 33,5 ms.
  - En la nube (Node 20, sin pantalla): encuentro completo con esbirros, 20 s
    simulados: tick medio 0,028 ms, p95 0,068 ms. `bench:sim` con 200
    perseguidores: 0,40 ms medio / 1,47 ms p95.
  - **No se midió FPS con los enemigos del paso 4–6 en Electron.** Para hacerlo:
    `npm run dev`, jugar la arena y leer el panel; `npm run bench:electron`
    sigue midiendo sólo la prueba de carga (el modo `?bench` arranca sin encuentro).
  - Verificación visual hecha sólo en Chromium headless (SwiftShader) con
    capturas: avisos en cono/línea/círculo orientados, picking del clic sobre un
    enemigo, HUD, cartel de victoria/derrota, reinicio y descarga del JSON, sin
    errores en consola. No sustituye la revisión en el PC.

- **Decisiones técnicas tomadas y por qué (PROPUESTA):**
  - El área del aviso se fija al empezar y se resuelve al terminar: es lo que
    hace que «cada ataque peligroso se pueda esquivar si se reacciona al aviso».
  - Stagger: un solo golpe ≥ `staggerDamage` aturde y cancela el aviso
    (`staggerDamage: 0` = inmune). Se puede entrar desde cualquier estado vivo
    salvo el propio Stagger.
  - Soporte/invocador: se eligió **invocador** (más fácil de distinguir por
    conducta). Los esbirros cuentan para la victoria y siguen vivos si muere el invocador.
  - Correa: al pasar `leashRange` desde su punto de aparición el enemigo vuelve
    a casa ignorando al jugador; un golpe despierta a un enemigo en `idle`.
  - Clic sobre enemigo = **un** ataque básico; repetir exige mantener pulsado
    o volver a hacer clic (no hay autoataque continuo).
  - «En alcance»: para habilidades de un objetivo, distancia entre bordes ≤
    `range` y línea de visión; para áreas centradas en el jugador (cono), el
    alcance es la propia forma (`range: 0`).
  - El GCD bloquea también al ataque básico; la evasión no usa GCD.
  - `castTime` está implementado (coste y enfriamiento al terminar; moverse o
    evadir lo cancela sin pagar) pero vale 0 en las tres habilidades.
  - Evasión con invulnerabilidad corta (`invulnerableSeconds`); con 0 sólo
    esquiva por desplazamiento.
  - Reinicio = `World` nuevo con los datos ya cargados y semilla + n.º de partida.
  - Telemetría: descarga desde el renderer (Blob + enlace) además de la consola;
    no se usa Node ni red.
  - Ids técnicos neutros (`melee`, `ranged`, `summoner`, `minion`, `basic`,
    `cheap`, `cone`) y etiquetas descriptivas («Habilidad barata»…). No son nombres de juego.

- **Incertidumbres que bloquean el siguiente paso:**
  - Ninguna bloquea el código. Pendiente de revisión visual en el PC (lista
    completa en `docs/BITACORA.md`, pasos 4–6): que los tres arquetipos se
    distingan antes de leer su nombre; que los avisos (0,5–1,2 s) den tiempo a
    reaccionar; sensación de la evasión y del GCD; legibilidad del barrido y del
    gris del HUD; que Q/W/Espacio/R/T no choquen con Electron; que T abra el
    diálogo de guardar; FPS jugando la arena dentro de Electron.
  - Para el coordinador/creador: Stagger, correa, regla de un ataque por clic,
    teclas y si el invocador basta como «soporte» son PROPUESTA (ver arriba).
  - Los criterios «`npm run package` produce un `.exe` que arranca sin Node» y
    la revisión visual de 2b siguen como los dejó el paso 2b (local).

- **Archivos principales:**
  - Lógica: `src/sim/enemies.ts`, `src/sim/combat.ts`, `src/sim/shapes.ts`,
    `src/sim/damage.ts`, `src/sim/events.ts`, `src/sim/telemetry.ts`,
    `src/sim/world.ts`.
  - Datos: `data/enemies.json`, `data/encounter.json`, `data/abilities.json`,
    `data/player.json`; esquema en `src/data/schema.ts`.
  - Render/UI: `src/render/enemyView.ts`, `src/render/arenaView.ts`,
    `src/ui/hud.ts`, `src/main.ts`, estilos en `index.html`.
  - Tests: `tests/enemies.test.ts`, `tests/combat.test.ts`, `tests/session.test.ts`.
  - Sin cambios en `electron/`, `scripts/buildMain.mjs` ni `package.json`.
    `scripts/benchSim.ts` sólo pasa `{ encounter: false }`.

- No se tomó ninguna decisión creativa.
