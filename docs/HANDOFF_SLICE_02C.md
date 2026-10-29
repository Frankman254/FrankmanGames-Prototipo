# HANDOFF — Slice 02c (oclusión y flechas)

- **Objetivo autorizado:** encargo del coordinador del 2026-10-29: que árboles,
  rocas grandes y casas no tapen al personaje, y flechas visibles para los
  ataques a distancia de los enemigos. Rama `slice02c-oclusion` desde
  `origin/master` (14cfc4a). Sin tocar `src/rpg/`, `src/sim/`, `src/ui/menus/`,
  `npcView.ts` ni `waterView.ts`.

- **Qué funciona (con cómo probarlo):**
  - `npm test` (33 archivos, 228 tests) y `npm run typecheck` en verde.
  - **Oclusión:** con `npm run dev`, baja la cámara (rueda pulsada + arrastrar)
    y métete en el bosque o detrás de una casa: lo que queda entre la cámara y
    el jugador se recorta en un círculo tramado alrededor de él (y de los 3
    enemigos vivos más cercanos a ≤ 14 m, que entran y salen con fundido). Lo que
    está detrás del personaje no se toca y las sombras no cambian. Ajustes en
    `data/fx.json → occlusion`.
  - **Flechas:** el goblin hostigador y el veterano disparan una flecha que
    sale del arco y cruza la posición del jugador en el instante exacto en que
    la simulación resuelve el disparo; si acierta se queda en el jugador, si no
    sigue hasta el final de la línea del aviso y se clava. `tests/arrows.test.ts`
    lo comprueba con la simulación real.

- **Mediciones** (Electron 33.2.1, 1920×1080, monitor a 100 Hz; tabla en
  `docs/BITACORA.md`, Slice 02c paso 3):
  - 200 perseguidores: 100 FPS, render 1,96 ms, 99 draw calls.
  - 200 + 33 enemigos + efectos: 99,2 FPS con y sin recorte; render 6,51 ms
    con recorte frente a 6,29 ms sin él (≈ 0,2 ms de CPU). GPU no medida aparte.

- **Decisiones técnicas tomadas y por qué (PROPUESTA):**
  - Recorte en el fragment shader (plugin de material) en espacio de pantalla,
    con prueba de profundidad contra el personaje: vale para las thin instances
    de la vegetación sin tocar instancias ni ordenar transparencias. Borde con
    tramado ordenado 4×4 en vez de transparencia real.
  - Lo llevan troncos, copas y hojas de árboles, rocas, paredes, tejados y
    adornos de casas y rocas grandes; no la hierba, flores, arbustos, troncos
    caídos ni farolas.
  - La flecha no adelanta ni retrasa nada de la simulación: sólo calcula cuándo
    salir para coincidir con su resolución (que es instantánea sobre la línea).

- **Incertidumbres que bloquean el siguiente paso:**
  - Sin revisión con ratón de verdad en Electron: tamaño del círculo, si el
    tramado se nota demasiado a 1080p y si conviene que el recorte sólo aparezca
    cuando de verdad hay algo delante (hoy siempre actúa, pero sólo afecta a lo
    que queda delante del personaje).
  - La flecha se vio en el panel de navegador colocada a mano; en vuelo sólo se
    ha comprobado con el test (el panel oculto no avanza la partida).
  - La simulación resuelve el disparo de golpe: si el jugador se aparta durante
    el vuelo, la flecha cruza su posición del instante de resolución, que es lo
    que la simulación usa para decidir el acierto.

- **Archivos principales:** `src/render/occlusion.ts`,
  `src/render/fx/arrowFx.ts`, `src/render/vegetationView.ts` (materiales con
  recorte), `src/render/arenaView.ts`, `src/render/enemyView.ts` (`socketOf`),
  `src/data/fxSchema.ts`, `data/fx.json`, `src/main.ts` (medición A/B),
  `tests/arrows.test.ts`.

- No se tomó ninguna decisión creativa.
