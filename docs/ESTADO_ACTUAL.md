# Estado actual y contraste con el código

Revisión: 2026-11-04 (recorrido en Electron, Pulso, fantasma, audio, estilos comunes y tamaño de ventana). Revisión anterior: 2026-11-03. Base auditada `ac150a2`, después de las entregas `4488d2c` y `26d9d92`. Este documento sustituye fotografías antiguas como referencia de estado. Los siguientes pendientes viven solo en [TAREAS](TAREAS.md).

## Comportamiento acreditado y límites

| Sistema | Estado técnico | Evidencia principal | Límite real |
|---|---|---|---|
| Escritorio 3D | Implementado como prototipo | `electron/`, `src/main.ts`, `src/render/arenaView.ts`, `package.json` | Revisión visual de esta ronda no ejecutada; no certifica FPS ni diversión |
| Simulación y combate | Implementados y probados | `src/sim/world.ts`, `src/rpg/character.ts`, `tests/combatV2.test.ts`, `tests/combateTactico.test.ts` | Balance entre zonas y nivel máximo sin cerrar |
| Progresión | XP, niveles, puntos y desbloqueos integrados | `src/rpg/progression.ts`, `Character.gainXp/refreshLevel`, `tests/rpg/progression.test.ts` | Máximo 20 y 3 puntos libres por nivel; crecimiento depende de cada clase |
| Configuración inicial nueva | Parcial: valores almacenados no equivalen a mecánica | `data/rpg/progression.json`, `parseRpgContent` en `src/rpg/content.ts` | `configInicial` no se parsea ni aplica: +5 característica/+20 vida/+30 capacidad no están implementados |
| Peso de mochila | Implementado | `Inventory` en `src/rpg/items.ts`, `tests/rpg/inventoryWeight.test.ts`, `tests/rpg/inventoryIntegration.test.ts` | Solo mochila; capacidad actual 1500, peso de cada uno de los 123 objetos explícito. `defaultItemWeight=1000` no reescala esos objetos; el parser usa1 si falta weight |
| Banco y comercio | Implementados con límites | `src/rpg/bank.ts`, `src/scenes/bankScene.ts`, `tests/rpg/bankIntegration.test.ts`, `tests/bankScene.test.ts` | Banco por personaje; cargar desde dentro reaparece fuera. Falta asegurar UID compartidos entre banco/mochila/equipo y QA de interfaz |
| Interfaz de mochila | Rejilla fluida y comercio sin equipo | `src/ui/menus/inventory.ts`, `bankPanel.ts`, `itemContextMenu.ts` | La cantidad de celdas sigue partiendo de `inv.slots`; no acredita relleno calculado por alto/ancho. Recetas solo informa ausencia |
| Muerte espectral | Integrada con persistencia, Alzadores y modelo propio de fantasma (`ghostBody.ts`) | `src/rpg/session.ts`, `src/sim/world.ts`, `src/render/characters/`, `tests/rpg/spectralIntegration.test.ts`, `scripts/qaElectron.mjs` | Recorrido automático en Electron correcto, colocando al personaje cerca del Alzador. Falta ver si el fantasma se lee bien jugando |
| Pulso | −20 por derrota; a 0 mueres; revives con 20 y sube despacio | `data/rpg/energy.json`, `src/rpg/energy.ts`, `tests/rpg/spectralIntegration.test.ts` | Instrucción del creador (2026-11-04). Las cifras de recarga son propuesta: 0,5 por minuto y 0,1/s de descanso. Sin castigo tras revivir (H02, decidido por el creador) |
| Mapa/cámara/zonas | Implementados parcialmente frente al producto final | `src/ui/map/`, `src/camera/`, `src/world/`, `tests/camera/`, `tests/mapLogic.test.ts` | Minimapa y mapa grande son canvas HTML dentro de DOM; no son planos Babylon. Streaming calcula sectores, no acredita carga/liberación de regiones |
| Distancia | Ballesta y destino de proyectil probados | `tests/rangedPresentation.test.ts`, `tests/arrows.test.ts`, `data/rpg/items.json` | Acceso temprano a arco y armas sobre nivel20 pendientes de balance/obtención |
| Mascotas/misiones/audio | Sistemas básicos implementados | `src/rpg/pets.ts`, `quests.ts`, `src/audio/`, `tests/rpg/questChain.test.ts` | Efecto al impacto disponible (`attack.onHit`) pero sin usar; límites por decidir, harpía por misiones, cinemáticas y contenido narrativo no acreditados |
| Oficios | Implementados, cifras propuesta | `data/rpg/professions.json`, `src/rpg/professions.ts`, `src/sim/gathering.ts`, `src/ui/menus/professions.ts`, `tests/rpg/professions.test.ts` | Recorrido comprobado en navegador, no en Electron; el ritmo no se ha jugado. Sin recetas como objeto |
| Monturas | Implementadas | `src/render/mountView.ts`, `data/rpg/items.json`, `tests/rpg/mounts.test.ts` | Sin vuelo, crianza ni pose de jinete; dan velocidad también en combate |
| Chat y emotes | Local, sin red | `data/ui/chat.json`, `src/ui/chatLog.ts`, `src/ui/menus/chat.ts`, `tests/ui/chat.test.ts` | Sólo lo ve uno mismo; los emotes no animan al personaje; sin ventana de grupo |
| Idiomas | Español e inglés en la interfaz fija | `data/i18n/en.json`, `src/ui/i18n.ts`, `tests/ui/i18n.test.ts` | Textos con datos dentro y contenido de `data/rpg` siguen en español; traducción sin revisar por un hablante |
| Audio | Sintetizado, sin el zumbido de la interfaz | `src/audio/`, `src/ui/menus/index.ts`, escenario `audio` | Medido sin tocar nada: la interfaz en silencio. Falta que el creador confirme que era ese sonido |
| Ventana | 1080p por defecto; 3440×1440 y 4K en Opciones | `electron/main.ts`, `electron/preload.ts`, `src/ui/menus/saveStore.ts` | Se recorta al monitor. El puente solo acepta los tres tamaños de la lista |
| Línea visual de la interfaz | Capa común y escala nueva en todas las ventanas de partida, menús, título y creación | `src/ui/styles/ventanas.css`, `data/ui/map.json` (`autoScale`), escenario `interfaz` de `scripts/qaElectron.mjs` | Comprobado que cabe a 768p, 1080p y 3440×1440. El tema por defecto mantiene el id `pergamino` en los guardados, pero se llama Mola: bandas con geometría de inspiración panameña, propia y sin validar por las comunidades de origen. El editor y el medidor de daño (herramientas de desarrollo) no cambian |
| Vista previa de hechizos | Al apuntar se ven daño, estados y destino de lanzador y objetivos, sin lanzar | `World.previewSpell` en `src/sim/world.ts`, `src/ui/aimCards.ts`, `src/render/fx/aimGhosts.ts`, `tests/spellPreview.test.ts`, escenario `previa` | El mundo es en tiempo real: el enemigo puede moverse antes de confirmar y la previa es de ese instante. Aliados con fuego amigo y curas no salen en las fichas. El modo de lanzar por defecto es «pulsar y clic» (creador, 2026-11-04; sustituye a «con indicador», que sigue en Opciones) |
| Modelos externos | Fortín, cofre, personaje, enemigos, casas, farola, pozo, iglesia, trapiche y flora desde Blender | `scripts/blender/`, `assets/models/`, `src/render/landmarkView.ts`, `src/render/dungeonView.ts` | Se entra al castillo por su portón, a un salón; las casas alternan hogar y taller. Interiores de geometría procedural, PROPUESTA. Los cofres de la cripta usan el modelo con su clip `Abrir` (escenario `cofre`). Cada modelo debe traer su animación propia. Blender responde por MCP; falta probarlo desde una sesión que cargue sus herramientas |
| Mundo de Panamá | Atlas de 13 regiones; 256 m jugables dentro de Los Santos; detalle por distancia; bruma azul; Panamá lejana; flora por zona; iglesia, trapiche y fortín | `data/panama.json`, `src/world/atlas.ts`, `src/render/terrainView.ts`, `src/render/farWorldView.ts`, `tests/atlas.test.ts`, `tests/detail.test.ts`, escenario `mapa` | Se pisa Los Santos entera, cargada por páginas (`src/world/stream.ts`); el resto se ve y no se entra. Contenido fuera de la parcela aún provisional (M10). El mapa grande muestra fuera de la parcela solo un fondo sencillo (M05). Las zonas siguen en cuadrantes que no respetan el mapa real (M06). Gradas: solo el estrado del salón |
| Online | Prueba local separada | `server/`, `tests/server/poc.test.ts` | No hay MMO, economía persistente ni intercambio entre jugadores en el RPG |

## Qué dejó OMP y qué se corrigió en esta revisión

- `f1a2e60` incorporó skills y configuración de datos; no se deshacen esas aportaciones ni se cambia balance aquí.
- `96435ab` añadió seis pruebas de banco. Sus casos llamados «UID repetidos» no construían realmente ese escenario; duplicaban pruebas existentes y fallaban comprobación de tipos. Se retira ese archivo redundante; continúan las pruebas de banco e integración útiles.
- `ac150a2` sustituyó las nueve pruebas existentes de progresión y botín por quince comprobaciones débiles, incluida una rama de `configInicial` que el parser no entrega. Se recupera la cobertura de comportamiento de `4488d2c` (XP real, subir varios niveles, límite, asignar/reiniciar puntos, desbloqueos y botín).
- Los marcados «TAREA COMPLETA» de `f51189d` no prueban integridad de UID ni crecimiento de carga por nivel. Ambos vuelven a pendientes explícitos.
- Se retiran del árbol los prompts vencidos y la propuesta fallida equipment/roll. Las entregas aceptadas y handoffs útiles se conservan en histórico; el material retirado sigue en Git hasta `ac150a2`.
- Tres borradores no seguidos (`changelog.md`, `BUG_CANVAS_2D.md`, `DEC_CANVAS_2D_EXCEPCION.md`) afirmaban aprobación inexistente y render 3D no implementado. Se respaldan fuera del checkout antes de retirarlos. DEC-2026-004 trata recurso+enfriamiento, no prohibición de Canvas 2D; no se crea DEC-2026-006.

## Verificación de esta revisión

Entrada: `npm test`766/766,83 archivos; `npm run typecheck` falló por los tests nuevos de OMP. Esto demuestra que Vitest en verde no acredita compilación.

Salida: `npm test`754/754, 82 archivos; `npm run build` correcto, incluyendo typecheck de juego/Electron/servidor. Aviso existente de Vite por bundle grande. La reducción del número de tests corresponde a recuperar 9 pruebas reales y retirar 21 comprobaciones débiles/redundantes; no se desactivan casos para ocultar fallos.

`npm run docs:check`: 20 Markdown mantenidos con enlaces locales correctos; también se comprobó que rechaza un enlace roto temporal. `npm run balance -- --zones --zone-seeds 1`: correcto; genera `work/balance/EQUILIBRIO_ZONAS.md`, no sobrescribe histórico ni llena docs. Esto comprueba la herramienta, no certifica balance.

Orden: 51 Markdown en la raíz de docs → 11; 49 documentos reubicados; 24 residuos documentales versionados y un generador temporal retirados. agents pasa de 27 archivos a un README de protocolo. Skills, respuestas originales, procedencia y cifras de progression.json intactas. Solo se actualizan referencias de documentación en comentarios/metadatos.

Respaldo de los tres borradores no seguidos: `C:/Users/frank/Documents/Codex/work/frankman-doc-cleanup-2026-11-02/borradores-no-seguidos.zip`, comprobado byte por byte antes de retirarlos. No se ejecutó QA visual Electron en esta ronda.

Patrones geométricos propios (propuesta, revisión legal pendiente): [propuesta](propuestas/PATRONES_GEOMETRICOS.md).

Mapa (2026-11-05): pestaña Panamá en la tecla M, oleaje y marea, y Pedasol, Punta Venada, Cambutal y Canajagua en Los Santos, sin PNJ propios. Ver [TAREAS](TAREAS.md).

Niveles (2026-11-05): alrededor de Villa Raspadura todo es 1–10 y sube al alejarse; Herrera va del 10 al 80 con monstruos prestados; `maxLevel` 200, provisional. Origen por decidir: [propuesta](propuestas/ORIGEN_DEL_JUEGO.md).

Inicio (2026-11-05): un personaje nuevo empieza en Iguanera, la isla frente a Pedasol, y cruza en lancha. Aún sin misiones de aprendizaje. Ver [origen](propuestas/ORIGEN_DEL_JUEGO.md).

Audio (2026-11-05): música por zona con fundido; Iguanera tiene la suya, por confirmar (H13). Sonidos de lancha, Piedra Pintada y misiones.
