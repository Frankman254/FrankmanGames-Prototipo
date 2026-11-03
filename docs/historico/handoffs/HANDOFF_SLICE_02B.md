# HANDOFF — Slice 02b (pulido visual: efectos)

- **Objetivo autorizado:** encargo del coordinador del 2026-10-29 (el creador lo
  dejó al mando): efectos de hechizos por elemento, estados visibles, mascotas y
  aliados animados, botín, números de daño y subida de nivel, todo con geometría
  y partículas generadas por código, sin descargas. Rama `slice02b-efectos` desde
  `origin/master` (1777131). Sin tocar `src/rpg/`, `src/sim/` (sólo lectura de
  sucesos y estado) ni `src/ui/menus/`.

- **Qué funciona (con cómo probarlo):**
  - `npm install`, `npm run dev` (o `npm run dev:web`). `npm test` (30 archivos,
    213 tests) y `npm run typecheck` en verde.
  - **Hechizos** (`src/render/fx/spellFx.ts`): destello en la mano del lanzador;
    proyectiles con estela a la velocidad de la simulación (Chispa, Marca
    ardiente, ataque básico con varita u orbe); la Lanza glacial es una lanza
    de hielo que recorre su línea; impactos con el color de su elemento (más
    grandes si son críticos); áreas con su forma y origen reales (el Campo
    estático cae en el punto apuntado; conos y líneas salen hacia el cursor);
    zonas persistentes con pulso y chispas. Probado con la Tejedora de
    Tormentas.
  - **Estados** (`statusFx.ts`): llamas (quemadura), escarcha (ralentizado),
    cristales de hielo (inmovilizado), estrellas que giran (aturdido), burbuja
    con aros (escudo), aura con partículas (mejoras), chispas (carga estática),
    sobre jugador, enemigos y mascotas.
  - **Mascotas** (`src/render/petView.ts`): zorro de ceniza, búho archivero
    (vuela), tortuga de musgo y lobo espectral translúcido, animados con
    `CharacterModel` (`pet.<id>` en `data/assets.json`).
  - **Botín** (`lootView.ts`): bolsa con cinta de la rareza, cofre con haz de
    luz para lo raro o superior, monedas que giran, brillo y destellos; etiqueta
    con el nombre al pasar el cursor (`src/ui/hoverLabel.ts`).
  - **Números flotantes** (`floatingText.ts`): daño (crítico más grande),
    daño recibido, curación; «¡Nivel N!» con anillos y chispas.
  - Para verlo sin jugar, desde la consola de `npm run dev:web` (objeto
    `__game`): `world.character.statuses.apply(...)`, `world.dropLoot(...)`,
    `world.spawnEnemy(...)` (así se hicieron las comprobaciones).

- **Mediciones** (Electron 33.2.1, 1920×1080, monitor a 100 Hz; tabla completa en
  `docs/BITACORA.md`, Slice 02b paso 6):
  - 200 perseguidores: 100 FPS, render 1,84 ms, 92 draw calls.
  - 200 + 33 enemigos animados + efectos (4 mascotas, 10 botines, estados en
    todos los enemigos, 10 impactos con número por segundo): **99,2 FPS**, frame
    p95 13,7 ms, render 6,18 ms (p95 12,7), 323 draw calls. Un tirón suelto de
    ≈ 60 ms al aparecer muchos personajes a la vez.
  - En las pasadas con enemigos el jugador se cura sólo durante la medición (si
    muere, la partida termina dentro de la ventana y falsea los números).

- **Decisiones técnicas tomadas y por qué (PROPUESTA):**
  - Todo el aspecto en `data/fx.json` (colores por elemento, aspecto de cada
    estado, tamaños, duraciones, rareza desde la que hay haz de luz).
  - Partículas de Babylon con una textura de punto generada por código; las
    ráfagas salen de un pool de sistemas reutilizados.
  - Lo que se pinta en el suelo va con mezcla normal; brillos, orbes y haces con
    suma de luz (sumado, a mediodía, se blanqueaba).
  - La simulación no emite el punto apuntado ni los ataques de mascotas: el
    render usa `player.casting.aim` (lanzamientos con carga) o el cursor
    (instantáneos), y detecta el ataque de mascota cuando rearma su
    enfriamiento.
  - `CharacterModel.socket(articulación)` nuevo en la interfaz (mano para el
    destello y el origen de los proyectiles).

- **Incertidumbres que bloquean el siguiente paso:**
  - **Fallo en `master`, en `src/ui/menus/`:** en partida, `.game-hud` cubre
    todo el lienzo con `pointer-events: auto`. Los clics y el movimiento del
    ratón no llegan al lienzo: no se puede andar ni atacar con clic ni ver la
    etiqueta del botín con el ratón. No lo arreglé porque esa carpeta no es mía;
    probablemente basta con `pointer-events: none` en el contenedor y `auto`
    en sus paneles.
  - Sin revisión con ratón de verdad en Electron (por lo anterior).
  - La Lanza glacial y las áreas usan `player.facing` en el instante del
    suceso; si la simulación cambiara de dirección antes de emitir `cast`, el
    dibujo se desviaría.
  - Las sombras no recogen las partículas; las piezas que brillan no emiten luz real.
  - Enemigos a distancia (goblin) siguen sin flecha visible: no estaba en el
    encargo.

- **Archivos principales:**
  - Datos: `data/fx.json`, `data/assets.json` (`pet.*`), `data/animation.json`
    (zorro, tortuga, búho).
  - Código: `src/data/fxSchema.ts`, `src/render/fx/` (`particles.ts`,
    `spellFx.ts`, `statusFx.ts`, `floatingText.ts`), `src/render/petView.ts`,
    `src/render/lootView.ts`, `src/ui/hoverLabel.ts`, `src/world/rigs.ts`
    (fox, turtle, owl), `src/render/characters/proceduralCharacter.ts`
    (piezas nuevas, `ghost`), `src/render/arenaView.ts`, `src/main.ts`
    (etiqueta, batería de medición).
  - Tests: `tests/fx.test.ts`, `tests/animation.test.ts`.

- No se tomó ninguna decisión creativa. Colores, formas y siluetas son
  marcadores de prototipo (PROPUESTA) para leer elementos, estados y rarezas.
