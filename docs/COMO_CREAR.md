# Cómo se crea cada cosa del juego

Recetario de arquitectura (creador, 2026-11-27: «hay que armar un md arquitectonico para metodos de creacion de cada cosa y sus reglas»). Dice, para cada tipo de contenido, quién decide, qué archivos se tocan, en qué orden se trabaja y cómo se comprueba. [ARQUITECTURA](ARQUITECTURA.md) dice dónde vive el código. Este documento dice **cómo se añade algo nuevo**.

Si una receta y el código no coinciden, manda el código. La receta se corrige en la misma entrega.

## 1. Reglas que valen para todo

1. **Decide el creador.** Los nombres, la historia, las reglas de juego y las cifras son suyos. Lo que propone un agente se marca `PROPUESTA` (`"_estado": "PROPUESTA"` en el JSON) y el creador lo aprueba. Que las pruebas pasen no es aprobación.
2. **El contenido es dato.** Un monstruo, un objeto, un hechizo o una zona se añaden en `data/`. Si hay que tocar `src/` para meter contenido, falta una pieza del sistema, y esa pieza es una tarea aparte con su prueba.
3. **Clean-room.** Nada de FATE, DOFUS ni otros juegos: ni código, ni assets, ni nombres, ni tablas, ni prompts «al estilo de». La inspiración es el istmo y el folclore panameño.
4. **Procedencia primero.** Todo archivo de `assets/` tiene su fila en [PROCEDENCIA](../PROCEDENCIA.md), con autor y licencia, antes de entrar. Las filas solo se añaden.
5. **Simulación pura.** Las reglas van en `src/sim/` o `src/rpg/`, sin DOM ni Babylon, y con prueba en Vitest. Lo que se ve va en `src/render/` y lo que se toca con el ratón en `src/ui/`.
6. **Respaldo.** Si falta una pieza opcional (un retrato, una pista, un modelo), el juego usa la de hoy y no se rompe.
7. **Un escritor por archivo.** Antes de tocar un archivo compartido (`main.ts`, `houseScene.ts`, `hud.ts`, un JSON grande) se mira si otro agente lo tiene en su tarea.
8. **Validación.** Siempre `npm test` y `npm run typecheck`. Si cambia la interfaz o el empaquetado, también `npm run build` y `node scripts/checkPublishable.mjs`. Si cambian documentos, `npm run docs:check`. Lo visual se comprueba en Electron.
9. **Evidencia** en `work/<agente>-<tarea>/`. Al repositorio solo pasa lo que el juego usa o regenera.

## 2. El ciclo de cualquier creación

| Paso | Qué se hace | Dónde |
|---|---|---|
| 1. Ficha | Qué es, por qué existe y con qué se conecta. Los nombres son provisionales | La ficha de diseño que toca en `docs/diseno/` (mundo en 01, clases en 02, hechizos en 03, bestiario en 04, equipo en 07). No se crean documentos nuevos |
| 2. Tarea | Fila en `docs/TAREAS.md` con el contrato mínimo de AGENTS.md: ID, autorización citada, archivos, validación y aceptación | `docs/TAREAS.md` |
| 3. Datos | JSON `PROPUESTA` con ids ASCII estables en inglés o en español sin tildes. Un id no se renombra después | `data/` |
| 4. Arte y audio | Modelo, icono, textura, música o sonido, cada uno con su receta (§4) | `assets/` y `scripts/` |
| 5. Sistema | Solo si falta una pieza: código pequeño con prueba. Nunca se reescribe un módulo entero | `src/` y `tests/` |
| 6. Prueba | Vitest, más un recorrido en Electron si se ve | `tests/` y `scripts/qaElectron.mjs` |
| 7. Entrega | Fila de TAREAS, BITÁCORA con su evidencia, y ESTADO_ACTUAL si cambió el juego. El creador lo ve y decide | `docs/` |

Reparto habitual:
- Claude diseña, modela, hace el audio e integra lo difícil.
- Codex hace las imágenes (iconos, retratos, ilustraciones) y las auditorías.
- Junie hace pruebas, datos, enganches pequeños y recorridos en Electron.
- OMP hace modelos sueltos en Blender.

## 3. Mapas y lugares

### 3.1 Zona del mundo abierto
- **Datos:**
  - la zona, en `data/zones.json`;
  - la vegetación, en `data/vegetation.json`;
  - la pintura de caminos, en `data/navpaint.json`;
  - el ambiente, en `data/ambient.json`;
  - su Piedra Pintada, en `data/stones.json`;
  - los enemigos, por zona en `data/rpg/enemies.json`.
- **Código:** `src/world/` lo lee; el esquema está en `src/data/zonesSchema.ts`.
- **Pasos:**
  1. Ficha en 01_MUNDO: vecinas, caminos, pueblos y familias del bestiario.
  2. Zona en el editor F12, como dice la [guía de desarrollo](GUIA_DESARROLLO.md).
  3. Piedra Pintada.
  4. Música: un contexto con carpeta en `assets/audio/music/<zona>/`.
  5. Ambiente.
- **Reglas:**
  - ninguna ruta por tierra sobre el mar;
  - desde cada lugar de misión hay un camino de vuelta;
  - ningún spawn hostil pegado a una puerta, una piedra o un camino seguro (MAP-VIAL-02).
- **Se comprueba con:** `npm test` (la cobertura de zonas y música) y una captura en Electron al cruzar el borde con la zona vecina.

### 3.2 Mapa aparte, al que se llega por una Piedra Pintada
Es el patrón de la barriada de Praderas del Norte (CLA-BARR1). Lo sigue el mapa de Navidad (NAV-01…04).
- **Datos:** `data/<mapa>.json` (`PROPUESTA`) con calles, lotes, piezas y punto de llegada. La piedra de entrada va en `data/stones.json`.
- **Código:**
  - `src/world/<mapa>.ts`: trazado puro, con sólidos, inicio y piedra de salida, como `barriada.ts`;
  - `src/render/<mapa>View.ts`: dibujo, como `barriadaView.ts`;
  - `src/scenes/houseScene.ts`: una sala más en `RoomId`;
  - `src/main.ts`: la piedra de entrada abre el mapa (como `BARRIADA_STONE`) y el guardado vuelve a entrar al cargar.
- **Reglas:**
  - el mapa **siempre tiene su propia Piedra Pintada** de teletransporte: lleva de vuelta y abre la lista de viaje;
  - guardar dentro y cargar reaparece dentro;
  - salir devuelve terreno, vegetación y cámara (JL-216).
- **Se comprueba con:** una prueba del trazado (sin solapes, piedra alcanzable desde el inicio) y, en Electron, entrar y salir tres veces con la consola limpia y guardar dentro.

### 3.3 Interior (casa, taller o banco)
- **Código:** una sala en `src/scenes/houseScene.ts` o una escena en `src/scenes/` (como `bankScene.ts`).
- **Reglas:** la puerta de salida deja al jugador fuera de la puerta de entrada, mirando hacia fuera.
- **Se comprueba con:** el recorrido de entrar, salir y guardar dentro (JL-237).

### 3.4 Mazmorra
- **Datos:** `data/dungeons/` y `data/bosses.json`, validados por `src/data/dungeonSchema.ts`.
- **Arte:** piezas en `assets/models/mazmorra.glb` (`scripts/blender/mazmorra.py`).
- **Música:** contextos `crypt` y `guardian`.
- **Se comprueba con:** el escenario `cripta` de QA.

### 3.5 Ciudad o pueblo con planificación vial
La plantilla es Villa Raspadura (VIA-01…05), que se replica en las demás provincias.
- **Datos:** `data/urbanismo/<ciudad>.json` (`PROPUESTA`) con:
  - la jerarquía de vías: avenida, calle, callejón y sendero, cada una con calzada, cordón, grama y acera;
  - la plaza mayor;
  - las manzanas y los lotes con retiro;
  - las puertas, unidas a los nodos de MAP-VIAL-01.
- **Código:** `src/world/planUrbano.ts` saca calles, cruces, manzanas y lotes de la plantilla y reutiliza `src/world/urbanizacion.ts`.
- **Arte:** el kit de calle de `assets/models/vial.glb` (VIA-03). Las casas se toman del catálogo del pueblo, con variantes para que no se repitan.
- **Reglas:**
  - ningún lote toca la calzada ni otro lote;
  - cada lote da a una calle;
  - todo el plano está conectado con cada puerta;
  - ningún árbol ni piedra cae en calle o lote;
  - las casas miran a su calle.
- **Se comprueba con:** las pruebas del validador y el recorrido en Electron por todas las calles.

## 4. Contenido de juego

### 4.1 Clase
- **Decide el creador:** el nombre, el papel, el elemento y la historia (02_CLASES).
- **Datos:**
  - `data/rpg/classes.json`: `name`, `description`, `role`, `icon`, `mainStat`, `resource`, `baseStats`, `statsPerLevel`, `affinity`, `affinityBonus`, `startingSpells`, `startingItems` y `startingHotbar`;
  - sus hechizos en `data/rpg/spells.json`;
  - los textos en `data/i18n/`.
- **Arte:**
  - modelo de hombre y de mujer registrados en `data/assets.json`, con el mismo rig y los mismos clips que las clases que ya existen (MOD-07);
  - icono en `assets/icons/classes/`;
  - retratos en `assets/portraits/<clase>_<m|f>.png`;
  - ajuste del equipo en `data/art/ajusteEquipo.json`.
- **Reglas:** las cifras son PROPUESTA y se miden con `npm run balance:v3` y `npm run balance:fiel`.
- **Se comprueba con:** `npm test`, el balance, y en Electron la creación del personaje, sus hechizos en la barra y su equipo inicial puesto.

### 4.2 Hechizo
- **Datos:**
  - `data/rpg/spells.json`: cifras, nivel y rango;
  - estados en `data/rpg/statuses.json`;
  - efecto visual en `data/spell-fx.json`;
  - icono en `assets/icons/spells/<id>.png` (scripts de `scripts/art/render_spell_icons.py`).
- **Reglas:**
  - solo usa primitivas que ya existen;
  - si necesita otra, es una mecánica nueva (§4.3);
  - lleva nombre y descripción en español e inglés.
- **Se comprueba con:** `npm test`, `npm run balance:v3` y la cobertura de iconos.

### 4.3 Mecánica nueva
- **Código:**
  - un tipo nuevo de `EffectDef` en `src/rpg/contracts.ts`;
  - la regla en `src/rpg/effects.ts` o en `src/sim/`, sin DOM ni Babylon;
  - lo visual, aparte, en `src/render/fx/`.
- **Reglas:**
  - primero la prueba que describe la regla;
  - la mecánica no cambia cifras de otras;
  - si toca el tiempo de combate (GCD, cola o hit-stop), mide antes y después.
- **Se comprueba con:** una prueba propia en `tests/` y el balance, cuyo resultado se informa sin ajustar nada.

### 4.4 Objeto, equipo o conjunto
- **Datos:**
  - `data/rpg/items.json`: id, ranura, nivel y cifras PROPUESTA;
  - el conjunto, en `data/rpg/sets.json`;
  - dónde se consigue: `loot.json`, `spoils.json`, `merchants.json` o una receta de `professions.json`.
- **Arte:**
  - icono en `assets/icons/items/<id>.png`;
  - si se ve en el cuerpo (arma, secundaria, cabeza o espalda), un nodo `obj_<id>` en `assets/models/equipo.glb`. Se genera con `scripts/blender/equipo.py`, `equipo_espeja.py` y `equipo_diablica.py`, se valida con `validar_equipo.py` y respeta el tope de triángulos de JL-259;
  - el tema de color sale del prefijo de material del id (MOD-09b).
- **Reglas:**
  - una pieza no pertenece a dos conjuntos;
  - el tooltip muestra la misma cifra que usa el combate.
- **Se comprueba con:** las pruebas de cobertura (cada objeto visible tiene nodo e icono) y, en Electron, el objeto puesto.

### 4.5 Monstruo, familia o jefe
- **Decide el creador:** las familias y su hábitat (04_BESTIARIO, BES-01 y BES-02).
- **Datos:**
  - el monstruo, en `data/rpg/enemies.json`;
  - el botín, en `data/rpg/loot.json`;
  - la conducta, en `data/rpg/tactics.json`;
  - si es jefe, sus fases en `data/bosses.json` (`src/sim/bossPhases.ts`).
- **Arte:**
  - modelo propio por familia en `assets/models/<id>.glb`, con `scripts/blender/<id>.py` y `validar_<id>.py`, y su registro en `data/assets.json`;
  - retrato de bestiario en `assets/portraits/enemigo_<id>.png`.
- **Se comprueba con:** `npm test`, que aparezca en su zona y una captura en Electron.

### 4.6 PNJ o tienda
- **Datos:** el PNJ, en `data/rpg/npcs.json`, con nombre y saludo en los dos idiomas. La tienda, en `data/rpg/merchants.json`, solo con objetos que existen.
- **Arte:** modelo en `assets/models/` y retrato en `assets/portraits/npc_<id>.png`.
- **Se comprueba con:** hablar con él en Electron y comprar y vender.

### 4.7 Misión
- **Datos:** la misión, en `data/rpg/quests.json`; quien la da, en `npcs.json`.
- **Código:** `src/rpg/quests.ts`.
- **Reglas:**
  - todo lo que cita (PNJ, objetos, enemigos) existe;
  - hay camino de vuelta desde el lugar de la misión.
- **Se comprueba con:** una prueba de la cadena completa, de principio a fin.

### 4.8 Mascota o montura
- **Datos:** `data/rpg/pets.json` (`src/rpg/pets.ts`).
- **Arte:** modelo e icono en `assets/icons/pets/`. Una montura lleva su empty `Asiento` (`fg.asiento()` en `scripts/blender/fg.py`).
- **Se comprueba con:** montar y desmontar en Electron.

### 4.9 Oficio o receta
- **Datos:** `data/rpg/professions.json` (`src/rpg/professions.ts`).
- **Reglas:** los ingredientes y el producto existen, y el nivel de la receta no pasa del máximo del oficio.

### 4.10 Evento de temporada (por ejemplo, Navidad)
- Se hace como **mapa aparte** (§3.2), no cambiando el mundo de siempre.
- Lleva su Piedra Pintada, sus modelos, su ambiente y sus iconos.
- El creador decide si abre todo el año y si da objetos o misiones. Hasta entonces el mapa está abierto siempre y no tiene cifras nuevas.

## 5. Arte y audio

### 5.1 Modelo 3D
- **Método:**
  1. Generador `scripts/blender/<modelo>.py` con las piezas de `fg.py`.
  2. `validar_<modelo>.py`.
  3. GLB en `assets/models/`.
  4. Editable final en `arte/blender/<modelo>.blend`.
- **Contrato de calidad:** [GUIA_BLENDER_MCP](GUIA_BLENDER_MCP.md).
- **Reglas:**
  - capas, pelo y colas con cadena de huesos y retraso, nunca simulación de tela;
  - registro en `data/assets.json`;
  - un modelo entregado entra en `data/` solo tras la revisión visual del creador.
- **Se comprueba con:** el validador, una lámina en `work/` y una captura en Electron.

### 5.2 Textura
- PNG en `assets/textures/`, sin costuras si se repite, con su fila en PROCEDENCIA.
- Las texturas pintadas grandes se exportan en JPEG dentro del GLB (`fg.export(..., imagenes='JPEG')`).

### 5.3 Icono, retrato o ilustración
- **Familias:**
  - `assets/icons/<familia>/<id>.png`: hechizos, objetos, estados, clases, mascotas, oficios, mapa e interfaz;
  - `assets/portraits/<id>.png`;
  - `assets/art/carga/<zona>.jpg` y `assets/art/portada/portada.jpg`.
- **Método:**
  - los iconos generados salen de láminas maestras propias (Codex, 2026-11-22), se normalizan con `scripts/art/normalizar_iconos.py` y se validan con su `validar_*_icons.py`;
  - los retratos se leen con `portraitImg()` de `src/ui/menus/artIcons.ts`.
- **Reglas:**
  - los prompts quedan en `work/codex-<tarea>/`;
  - los prompts no citan otros juegos ni artistas;
  - siempre hay respaldo si falta el PNG.

### 5.4 Música
- **Archivos:**
  - pista en `assets/audio/music/<contexto>/`;
  - contextos y mezcla en `data/audio/music.json` y `mix.json`;
  - la reproduce `src/audio/contextMusic.ts`.
- **Método:** desde cero, con la cadena propia: mido → sfizz + VSCO 2 CE → pedalboard + salas propias. Primero una muestra de 30 s, se conservan los stems y la versión completa llega después del «sí» del creador.
- **Reglas:**
  - rumbo de folclore panameño;
  - los OGG de `assets/dev_dungeon/` son de otro juego y nunca entran en `dist/`.
- **Se comprueba con:** `scripts/checkMusic.ts` y `validar_musica_original.py`.

### 5.5 Sonido o ambiente
- **Archivos:**
  - los efectos, en `data/audio/sfx.json`, con su WAV y la receta de respaldo;
  - los ambientes, en `data/audio/ambience.json` y `assets/audio/ambience/`;
  - los cues, en `src/audio/cues.ts`.
- **Reglas:**
  - cada efecto va en su bus (`sfx`, `ambience` o `ui`);
  - lo que más se oye (golpes, críticos, pasos e interfaz) se pule primero;
  - el creador escucha la comparación A/B antes de sustituir.

### 5.6 Texto o idioma
- `data/i18n/` (`es` como base, más `en.ui.json` y `en.content.json`); lo lee `src/i18n.ts`.
- Los nombres propios del juego no se traducen sin el creador.
- Se comprueba con `scripts/i18nUi.mjs`.

## 6. Antes de dar algo por terminado

- [ ] La autorización está citada en la fila de TAREAS.
- [ ] Datos `PROPUESTA` y sin cifras cambiadas por iniciativa propia.
- [ ] Fila en PROCEDENCIA de cada asset nuevo.
- [ ] Pruebas nuevas en verde y ninguna prueba relajada.
- [ ] `npm test`, typecheck y, si aplica, build, `checkPublishable` y `docs:check`.
- [ ] Captura en Electron si se ve.
- [ ] TAREAS, BITÁCORA con su evidencia y ESTADO_ACTUAL si cambió el juego.
- [ ] Commit solo con tus rutas (`git commit -- <rutas>`) y `git push origin master`.
