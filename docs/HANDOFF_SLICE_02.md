# HANDOFF — Slice 02 (mundo visual)

- **Objetivo autorizado:** `docs/ALCANCE_SLICE_02.md` (creador, 2026-10-29),
  pasos 1–6, en la rama `slice02-mundo-visual`. Añadidos por el coordinador el
  mismo día: unir `origin/master` (Slice 01 pasos 4–6 y contratos del Slice 03),
  cámara orbital con la rueda del ratón (pedido del creador), y hacer el paso 5
  con personajes procedurales mientras no haya permiso de descarga.

- **Qué funciona (con cómo probarlo):**
  - `npm install`, `npm run dev` (ventana de Electron). `npm test` (14 archivos,
    92 tests) y `npm run typecheck` en verde.
  - **Zona de 256×256 m** (`data/terrain.json`): relieve, colinas en el borde,
    tres caminos y un pueblo, con hierba, tierra y camino mezclados. Clic
    izquierdo para andar (rayo contra el terreno); mantener pulsado sigue al cursor.
  - **Vegetación y props** (`data/vegetation.json`): ~14 000 ejemplares con
    semilla (pinos, árboles con hojas recortadas, arbustos, rocas, flores,
    hierba) que se mueven con el viento; casas, troncos, rocas grandes y farolas.
    Troncos, rocas y props bloquean el paso: el A* los rodea.
  - **Cámara orbital:** rueda pulsada + arrastrar gira (yaw libre, pitch
    12°–82°), rueda = zoom, sigue al jugador, no se mete bajo el terreno ni
    dentro de casas. Ajustes en `data/camera.json`.
  - **Día y noche** (`data/lighting.json`, día de 5 min): sol con sombras
    alrededor del jugador, cielo con degradado, sol y estrellas, niebla, farolas
    que se encienden (las 4 más cercanas dan luz real) y luz del jugador de noche.
    F2 = reloj ×40, F3 = +3 h; el HUD muestra la hora.
  - **Personajes animados procedurales:** jugador humanoide con espada; enemigos
    con siluetas propias (lobo, goblin con arco, chamán con báculo y halo,
    diablillo). Animaciones: reposo, correr (al ritmo de la sim), ataque, hechizo,
    evasión, golpe recibido y muerte, con fundido. Los ataques enemigos golpean
    justo al acabar el aviso. Cada `footstep` deja una nube de polvo y el HUD
    muestra «pie↔suelo» (≈ 1,3 cm de media en la prueba) y el recuento de eventos.
  - Depuración: F6/F7/F8 perseguidores 20/200/0, F9 modo de render, L camino,
    `__game` en la consola de `npm run dev:web`.
  - Medición: `npm run build && npx electron . --bench` imprime `BENCH {json}`.

- **Mediciones** (Electron 33.2.1, 1920×1080 a pantalla completa, monitor a
  100 Hz con vsync; tablas completas en `docs/BITACORA.md`, Slice 02 pasos 5 y 6):
  - 200 perseguidores, mediodía: **100 FPS** (tope del monitor), frame p95
    10,2 ms, sim 0,57 ms, render 2,26 ms (p95 3,9), 92 draw calls.
  - Igual de noche: 100 FPS, render 2,45 ms (p95 5,5).
  - 200 perseguidores + 30 enemigos animados: **98 FPS**, frame p95 11,1 ms,
    render 4,95 ms (p95 10,0), 198 draw calls.
  - Generar el mundo al arrancar: ≈ 1,7 s. Tiempo de GPU no medido aparte.

- **Decisiones técnicas tomadas y por qué (PROPUESTA):**
  - Terreno, vegetación y personajes con geometría y texturas **generadas por
    código**: no hizo falta descargar nada; `assets/` está vacío y
    `PROCEDENCIA.md` sólo suma `@babylonjs/loaders` y `@babylonjs/materials` 7.54.3.
  - La zona continua **no cambia `data/zone.json`**: `src/world/overworld.ts`
    sustituye ancho, fondo, inicio y obstáculos antes de crear `World`, y
    traslada el encuentro de la arena con `encounterOffset`. Los tests del
    Slice 01 siguen con la arena de 80 m.
  - **Único cambio en `src/sim/`:** `NavGrid.fromObstacles` marca cada obstáculo
    sólo en su caja (900 obstáculos × 262 000 celdas era inviable). Mismo
    resultado; hay un test que lo compara con el método anterior.
  - Vegetación en thin instances por trozos de 32 m (la cámara los descarta) y
    sombras sólo con los trozos cercanos al jugador (de 411 a 92 draw calls).
  - Personajes: animador puro en `src/world/anim.ts`; cada personaje es **una
    malla con esqueleto** (de 1 413 a 198 draw calls con 30 enemigos).
    `CharacterModel` tiene implementación procedural y glTF; se elige en
    `data/assets.json` (`kind`).
  - Teclas de depuración en F (1–6, Q, E y R son del juego).

- **Incertidumbres que bloquean el siguiente paso:**
  - **Permiso de descarga pendiente (para el creador):** el alcance pedía un
    personaje CC0 animado (Quaternius/Kenney/Poly Haven) y la regla exige tu
    permiso en el chat antes de cada descarga. Candidatos encontrados, sin
    descargar:
    - Kenney «Mini Characters» (CC0), https://kenney.nl/assets/mini-characters.
      Zip con enlace firmado; el tamaño no se ve antes de bajarlo. No se
      confirmó que traiga GLB ni clips de ataque y muerte.
    - Quaternius «Universal Animation Library», paquete Standard (CC0, 15 MB,
      gratis), https://quaternius.itch.io/universal-animation-library.
      45 animaciones con muertes; no se confirmó el formato del paquete gratuito.
    - Si apruebas uno: va a `assets/<origen>/`, se anota en `PROCEDENCIA.md` y se
      cambia la entrada `player` (o `enemy.*`) de `data/assets.json` a
      `kind: "gltf"`. `GltfCharacter` está sin probar con un archivo real.
  - Los eventos de animación (`hit`, `cast`, `footstep`) no llegan a la
    simulación: el alcance decía «el render emite a la simulación», pero eso
    exige tocar `src/sim/`, que es de otra rama (Slice 03). Hoy `main.ts` los
    cuenta. Hay que decidir si el golpe se resuelve en la sim (como ahora) o en
    el `hit` de la animación.
  - Sin revisión visual con ratón de verdad: sensibilidad de la órbita,
    deslizamiento de pies al correr (la velocidad de referencia es un compromiso),
    la cámara a ras de suelo atraviesa copas de árboles y las piezas «que
    brillan» (halo, orbe, ojos) no emiten luz real.
  - Unión: esta rama ya contiene `master` (f9c6989 + 9fde1c8). Si
    `slice03-sistemas` o `slice03-interfaz` tocan `src/main.ts`,
    `src/render/enemyView.ts` o `index.html`, habrá conflictos pequeños.

- **Archivos principales:**
  - Datos: `data/terrain.json`, `data/vegetation.json`, `data/lighting.json`,
    `data/animation.json`, `data/assets.json`, `data/camera.json`.
  - Lógica pura: `src/world/` (`terrain.ts`, `noise.ts`, `scatter.ts`,
    `overworld.ts`, `dayNight.ts`, `anim.ts`, `rigs.ts`), esquemas en
    `src/data/worldSchema.ts` y `src/data/worldData.ts`.
  - Render: `src/render/terrainView.ts`, `vegetationView.ts`, `windPlugin.ts`,
    `atmosphere.ts`, `cameraRig.ts`, `assetCache.ts`, `enemyView.ts`,
    `src/render/characters/` (`characterModel.ts`, `proceduralCharacter.ts`,
    `gltfCharacter.ts`, `playerAvatar.ts`).
  - Tests: `tests/assets.test.ts`, `terrain.test.ts`, `vegetation.test.ts`,
    `camera.test.ts`, `dayNight.test.ts`, `animation.test.ts`.

- No se tomó ninguna decisión creativa. Formas, colores y siluetas de
  personajes son marcadores de prototipo (PROPUESTA) para leer el mundo y los
  roles, no arte definitivo; no se inventaron nombres de clases.
