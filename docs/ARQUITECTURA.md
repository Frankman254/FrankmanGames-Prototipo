# Arquitectura actual

Mapa de implementación inspeccionado2026-11-02, no propuesta de refactor.

| Lugar | Responsabilidad | Relación verificable |
|---|---|---|
| `electron/` | Ventana de escritorio y proceso principal | Destino Windows; juego en renderer, sin cargar URLs remotas en producción |
| `src/main.ts` | Composición de sesión, mundo, entrada, vistas e interiores | Coordina CryptScene/BankScene y enlaza sesión al mundo; no constituye servidor |
| `src/data/index.ts`, `src/rpg/content.ts` | Carga y validación de datos | JSON→RpgContent; campos no parseados como configInicial no llegan al juego |
| `src/rpg/contracts.ts` | Definiciones de contenido, vistas, comandos y guardado | Contrato usado por lógica y menús |
| `src/rpg/character.ts` | Personaje, stats, equipo, inventario, banco y reconstrucción de guardado | Comparte el mismo personaje con GameSession y World; no son dos estados independientes |
| `src/rpg/items.ts`, `bank.ts` | Creación de copias, mochila por peso, equipo/sets y almacén personal | Identidad por UID; las reglas de fusión/restauración requieren C01/C02 |
| `src/rpg/session.ts` | Comandos de interfaz, misiones, comercio, Pulso y botín pendiente | Delega movimiento/efectos al mundo enlazado y expone vistas para menús |
| `src/sim/` | Paso fijo, navegación, encuentros, combate y entidades | Lógica independiente del DOM/Babylon; World usa Character compartido |
| `src/scenes/` | Transiciones de cripta y banco | Construyen mundos de interior conservando personaje; main coordina vistas/guardado |
| `src/render/`, `src/camera/` | Babylon, representación e interacción de cámara | Consumen simulación; no confundir presencia visual con reglas RPG |
| `src/ui/menus/`, `src/ui/map/` | DOM/CSS, mochila/comercio/banco, mapa y minimapa | Mapas con canvas HTML real; no se migraron a mallas Babylon |
| `src/world/` | Terreno, zonas, cartografía, viaje y sectores | Streaming es selección de sectores; carga regional real pendiente |
| `src/audio/` | Motor Web Audio, música contextual y efectos sintetizados | Buses (master, música, efectos, ambiente, interfaz) con limitador; contextos musicales con crossfade exponencial de 2 s (AUD-J2); SFX por recetas de `data/audio/sfx.json` |
| `server/` | PoC autoritativa separada en loopback | No integra todavía economía/mundo persistente del RPG |
| `tests/`, `scripts/balance/` | Regresión y mediciones | Vitest no sustituye typecheck, build ni prueba visual. Fixture compartido en `tests/fixtures/overworld.ts` (QA-03) cachea overworld, worldData y gameData en `globalThis` para evitar reconstruir el mundo en cada archivo de prueba |

Datos vigentes: `data/`. Borradores de diseño: [propuestas](propuestas/README.md), sin carga automática. Assets: [procedencia](../PROCEDENCIA.md). Reglas de juego y clean-room: [AGENTS](../AGENTS.md).

No se ha decidido extraer equipment/roll: el intento previo fue incompatible. Antes de una extracción futura debe demostrarse conservación de comportamiento a través de los contratos existentes; no es una tarea de esta limpieza.

## Dónde va cada cosa (2026-11-13)

El paso a paso de cada tipo de contenido, con sus reglas y su reparto, está en [COMO_CREAR](COMO_CREAR.md).

Regla general: **el contenido es dato, no código**. Si para añadir un monstruo o un hechizo hay que tocar `src/`, falta una pieza del sistema y eso se pide como tarea aparte.

| Quiero añadir o cambiar… | Datos | Código que lo lee | Arte | Se comprueba con |
|---|---|---|---|---|
| **Un hechizo** | `data/rpg/spells.json` (cifras, nivel, rango), `data/rpg/statuses.json` (estados) | `src/rpg/spells.ts`, `src/rpg/effects.ts`; tipos en `src/rpg/contracts.ts` | Efecto en `data/spell-fx.json` y `src/render/fx/`; icono en `assets/icons/` | `npm test`, `npm run balance:v3` |
| **Una mecánica de hechizo nueva** | Un tipo nuevo en `EffectDef` | `src/rpg/contracts.ts` + `src/sim/` (sin Babylon ni DOM) | `src/render/fx/` aparte | Prueba propia en `tests/` |
| **Un monstruo** | `data/rpg/enemies.json`, botín en `data/rpg/loot.json`, conducta en `data/rpg/tactics.json` | `src/rpg/enemy.ts`, `src/sim/enemies.ts` | `assets/models/<id>.glb` + `scripts/blender/<id>.py` y `validar_<id>.py` | `npm test`; ficha de [04](diseno/04_BESTIARIO.md) |
| **Un jefe** | Lo anterior + `data/bosses.json` | `src/sim/bossPhases.ts` | Igual | Prueba de fases |
| **Una misión** | `data/rpg/quests.json`; quien la da en `data/rpg/npcs.json` | `src/rpg/quests.ts`, `src/rpg/session.ts` | — | Prueba de la cadena de principio a fin |
| **Un PNJ o tienda** | `data/rpg/npcs.json`, `data/rpg/merchants.json` | `src/rpg/shop.ts`, `src/render/npcView.ts` | Modelo en `assets/models/` | Recorrido en Electron |
| **Un objeto o conjunto** | `data/rpg/items.json`, `data/rpg/sets.json` | `src/rpg/items.ts` | Icono | `tests/rpg/` |
| **Una zona** | `data/zones.json`, `data/vegetation.json`, `data/navpaint.json`, `data/ambient.json`, `data/stones.json` | `src/world/`, `src/data/zonesSchema.ts` | — | Editor F12 ([guía](GUIA_DESARROLLO.md)); ficha de [05](diseno/05_VERSION_ESTABLE.md) |
| **Un piso de mazmorra** | `data/dungeons/` | `src/scenes/`, `src/data/dungeonSchema.ts` | Piezas en `assets/models/` | Escenario `cripta` de QA |
| **Un modelo 3D** | Registro en `data/assets.json` y en [PROCEDENCIA](../PROCEDENCIA.md) | `src/render/modelFiles.ts`, `assetCache.ts` | GLB en `assets/`, editable en `arte/blender/<modelo>.blend` | `validar_<modelo>.py` |
| **Música o sonido** | `data/audio/` | `src/audio/` | `assets/` + PROCEDENCIA | `scripts/checkMusic.ts` |
| **Un texto de interfaz** | `data/i18n/` | `src/i18n.ts` | — | `scripts/i18nUi.mjs` |
| **Una cifra de progresión** | `data/rpg/progression.json`, `data/rpg/classes.json` | `src/rpg/progression.ts`, `stats.ts` | — | `npm run balance:v3`. Nunca se relaja una prueba para que pase |
| **Una partida de prueba** | `data/dev/presets.json` | `src/dev/presets.ts` | — | — |

Dónde **no** va nada:
- Pruebas, capturas, vídeos, `.blend` de trabajo y reportes: `work/<agente>-<tarea>/` (fuera de Git).
- Ideas sin aprobar: `docs/propuestas/`. Dirección de diseño vigente: [docs/diseno](diseno/README.md).
- Documentos vencidos: `docs/historico/`.

## Desorden conocido

Cada punto es una tarea de [TAREAS](TAREAS.md), sección «Dirección de diseño». Ninguna cambia el comportamiento del juego.

| Problema | Medida | Tarea |
|---|---|---|
| Archivos que hacen demasiado | `src/sim/world.ts` 2.516 líneas, `src/main.ts` 1.714, `src/rpg/content.ts` 1.408, `src/ui/editor/index.ts` 1.223, `src/ui/menus/index.ts` 1.175 | D-43 (una extracción por entrega) |
| Datos con pareja vieja | `data/zone.json` y `zones.json`; `data/dungeon.json` y `data/dungeons/`; `data/enemies.json` y `data/rpg/enemies.json` | D-42 |
| Un solo archivo por tipo de contenido: dos agentes chocan al editarlo | `spells.json`, `enemies.json`, `quests.json` | D-44 (solo si hay choques reales) |
| No hay comprobación de referencias entre datos | Una misión puede citar un monstruo que no existe | D-45 |
| ~~Documentos fechados en la raíz de `docs/`~~ resuelto (2026-11-17) | Auditoría de Junie, plan RPG V4, informes de balance V2 y V3 y `local-ai/` movidos a `docs/historico/` | D-41 |
| ~~Pruebas de agentes en `arte/`~~ resuelto (2026-11-14) | Las 14 carpetas de pruebas de OMP y `auditoria-densidad` se movieron a `work/omp-*`; `arte/` queda sólo con `blender/` y `patrones/` | D-40 |

## Plan técnico incremental (2026-11-17)

Orden: primero lo que pide la rebanada 1–10, luego el hito 1–40. Cada paso es una tarea pequeña de [TAREAS](TAREAS.md); ninguna reescribe `src/sim/`, `src/rpg/`, `src/world/` ni el editor (D-43). «Sin tarea» quiere decir que no hace falta nada hasta que una entrega lo pida.

| Área | Estado comprobado | Siguiente paso | Tarea |
|---|---|---|---|
| Simulación y render separados | `src/sim/` no importa Babylon ni el DOM (grep, 2026-11-17). `main.ts` avanza la simulación a paso fijo con `clock.advance` e interpola con `alpha` en las vistas | Mantener la regla. `world.ts` (2 516 líneas) se reduce solo por extracciones | D-43 |
| Contratos de datos RPG | El parser de `src/rpg/content.ts` valida esquemas, pero topa niveles en 100 y no comprueba referencias cruzadas; hay un id con letra cirílica | Comprobación de referencias, tope explícito e ids ASCII | D-45, TEC-02, DATA-01 |
| Editor F12 | Ámbitos exterior y mazmorra; guardado en caliente; gizmo blindado (J1) | Casas en el editor | E03 |
| Prefabs | `src/editor/prefabRegistry.ts` cataloga objetos manuales de mazmorra con valores por defecto y validación | Ampliar al exterior cuando E03 lo necesite | Sin tarea |
| Play Mode | `PlayModeController` existe; la interfaz lo tiene desactivado | Conectar instantánea, juego y restauración | ED-01 |
| Generación de mapas reproducible | Terreno, dispersión y pisos hondos usan semilla (`src/world/{noise,scatter,terrain}.ts`, `data/dungeon.json`). `npm run audit:density` reproduce la medición, pero solo de la parcela antigua | Extender la auditoría a las zonas de la rebanada | D-30 |
| Pipeline de Blender | Generador `scripts/blender/<modelo>.py` + `validar_<modelo>.py` + GLB en `assets/`; contrato en [GUIA_BLENDER_MCP](GUIA_BLENDER_MCP.md). Un modelo entregado no es un asset aprobado: entra en `data/` solo tras revisión del creador | Revisar las entregas pendientes de OMP antes de pedir más | D-17, P05 |
| Métricas de render y streaming | FPS medidos por escenario en `scripts/qaElectron.mjs`; `src/world/stream.ts` calcula sectores y páginas, pero no se mide carga ni liberación de regiones | Medir llamadas de dibujo y memoria por página cuando se construya la rebanada | M01 |
| Simulación de balance | `scripts/balance/`: la medición fiel es `fiel.ts` (`npm run balance:fiel`, World real a igualdad de nivel, varias semillas). `balM3.ts`, `auditBuilds.ts` y `auditCombat.ts` son exploratorios, no fieles | Informar bruto y efecto por separado; varias semillas | BAL-01, T01 |
| Servidor autoritativo futuro | `server/` es una PoC local en loopback (protocolo, transporte y bot); el juego no tiene red | Nada hasta que el creador decida el online. La simulación determinista a paso fijo es la base para que un servidor la ejecute | T10 |

## Audio (2026-11-20)

Motor Web Audio puro; sin dependencias externas. Los assets y sus límites de distribución están en [PROCEDENCIA](../PROCEDENCIA.md).

| Archivo | Responsabilidad |
|---|---|
| `src/audio/engine.ts` | `AudioEngine`: buses (master, música, efectos, ambiente, interfaz) con limitador; voces sintetizadas a partir de recetas de `data/audio/sfx.json` (osciladores, ruido, filtro, envolvente, paneo); ruido blanco reutilizado (7 s) |
| `src/audio/contextMusic.ts` | `ContextMusicPlayer`: 5 contextos (`title`, `town`, `town_fight`, `crypt`, `guardian`) con pista WAV/OGG por contexto; crossfade exponencial de 2 s (`CROSSFADE_TC = 0.4`) entre contextos (AUD-J2); `DungeonPlaylist` rota pistas sin repetir consecutivas; música generativa (`overridden`) se atenúa cuando entra una pista empaquetada |
| `src/audio/director.ts` | Orquesta los cambios de contexto: lee pantalla, piso, guardián y combate, y llama a `ContextMusicPlayer.update()` |
| `src/audio/localMusic.ts` | Partitura generativa regional (sin pistas empaquetadas); se atenúa cuando entra un contexto empaquetado |
| `src/audio/data.ts` | `MixDef`, `Bus`, `SoundDef`: definición de buses, volúmenes y recetas de SFX |
| `src/audio/score.ts` | `variation()`: variación aleatoria de pitch y tempo para evitar la monotonía en SFX repetidos |
| `src/audio/cues.ts` | Cues de interfaz y eventos del juego |
| `src/audio/samples.ts` | Muestras WAV generadas por código (`playBuffer`); la receta queda de respaldo si el WAV no carga |
| `src/audio/players.ts` | Reproductores auxiliares |
| `src/audio/musicCheck.ts` | Verificación de que los archivos de música existen y son válidos |

Los OGG de `assets/dev_dungeon/` son de otro juego (no aptos para publicación). Solo rotan en `npm run dev` con `devDungeon` activado y nunca entran en `dist/` (lo vigila `scripts/checkPublishable.mjs`).

## Pruebas (2026-11-20)

Vitest como motor. La suite no sustituye a `npm run typecheck`, `npm run build` ni a la prueba visual en Electron.

| Archivo | Responsabilidad |
|---|---|
| `tests/fixtures/overworld.ts` | Fixture compartido (QA-03): cachea `overworld`, `worldData` y `gameData` en `globalThis` para evitar reconstruir el mundo en cada archivo de prueba. `buildOverworld()` tarda ~680 ms; con ~27 llamadas dispersas, los tests ahorraban ~18 s |
| `tests/fixtures/save_v*.json` | Guardados de versiones antiguas para pruebas de migración |
| `scripts/balance/` | Balance: `fiel.ts` (fiel, BAL-P0-FIEL), V3 y bots; `balM3.ts`, `auditBuilds.ts`, `auditCombat.ts` exploratorios (no fieles) |
