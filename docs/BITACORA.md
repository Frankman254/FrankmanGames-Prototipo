# Bitácora reciente

Desde el 2026-11-14, las entradas nuevas van arriba. Lo anterior está en el histórico, sin cambios: [2026-11-02 a 2026-11-13](historico/BITACORA_2026-11-02_A_2026-11-13.md) y [hasta el 2026-11-02](historico/BITACORA_HASTA_2026-11-02.md).

Resumen de lo archivado (2026-11-02 a 2026-11-13):
- RPG V3 y V4: contrato de características, seis elementos, crítico por hechizo, guardado v2/v3 y migraciones.
- Progresión 10/20/30 en producción; balance v2 y evidencia V3.
- Mundo de Panamá por páginas, geografía real y Piedras Pintadas por región.
- Cripta de 100 pisos.
- Editor F12: aplicación en caliente, mazmorra y World Builder.
- Héroes anime, iconos completos, monturas y audio.
- Rendimiento del pueblo.
- Dirección de diseño del 2026-11-13 y respuestas R1–R4 del creador sobre rangos.

## 2026-11-17 — Saneamiento de documentación, `work/` y gobierno de agentes (coordinador)

Encargo «CLAUDE MASTER» del creador, sobre `4e84461`. Sin cambios de código, datos ni cifras.

- **Verificación base:** `npm test` 165 archivos, 1450/1450; typecheck, build y `docs:check` correctos. Las 5 pruebas rojas de D-00 pasan desde `b03210c`, que devolvió la zona segura del muelle a (610, 240), sincronizó vegetación, retiró una casa y añadió un sendero. Falta que el creador lo confirme (E1–E6).
- **Documentos (D-41):** auditoría de Junie y plan RPG V4 a `historico/auditorias/`; informes de balance V2 y V3 a `historico/balance/`; `local-ai/` a `historico/` porque el creador no usa el modelo local. Copias literales de `TAREAS`, `ESTADO_ACTUAL`, la bitácora del 2 al 13 de noviembre y el `AGENTS.md` anterior en `historico/`. `AGENTS.md` queda en reglas, papeles y contrato de tarea de 11 puntos. `TAREAS.md` pasa a tablero accionable con las 229 ids anteriores comprobadas por script. `ESTADO_ACTUAL.md` queda en hechos con evidencia. Mapa de documentos en `README.md` y plan técnico de diez áreas en `ARQUITECTURA.md`.
- **Contradicciones resueltas:** T15 estaba a la vez hecha y pendiente (hecha, `65218b2`); U01–U04 se repetían en dos secciones; Q12 y Q14 constaban pendientes con commit y prueba (`cefd1c4`, `174719c`); J17 sin marcar en la cola con commit `a892405`; J12 «bloqueada» con su código en master (`092123d`); J13, J14, O8 y O9 vivían solo en las colas; ESTADO_ACTUAL aún decía que OMP tenía 8192 de contexto.
- **Revisión de entregas:** D-01a-fix hecha (`64bd28e`). D-01d a medias (`cd4ff62`): sin aviso agrupado y sin aviso para universales al subir de nivel; queda D-01d-fix en la cola de Junie. En JEQ-07, la XP (+100 %, `character.ts:213`) y la resistencia (50 % por elemento, `damage.ts:95`) ya se topan en ejecución: el «10100 %» y el «102 %» son sumas brutas. El id cirílico es real. Propuestas técnicas sin autorizar: BAL-01, DATA-01, TEC-02 y ED-01.
- **`work/`:** de 807 MB y 14 724 archivos a 527 MB y 1 895. Se borraron solo cachés regenerables de Chromium en los perfiles de QA y 14 capturas idénticas por SHA-256 a su gemela en la carpeta del agente. Manifiesto, inventario y registro en `work/_maintenance/2026-11-17-limpieza/`.
- **Ramas:** `feat/rpg-v4-elements` (`161c506`) y `jeq07-auditoria-balance` (`9e52743`) borradas en local con `git branch -d` tras comprobar 0 commits fuera de master.

## 2026-11-17 — OMP: 180K de vuelta y modos programador y Blender (coordinador)

- **Causa del «8K»:** Codex bajó Skynet a 8192 por rechazos «request exceeds the available context size (8192)». Los logs de OMP muestran que esos rechazos venían de `lm-studio/gemma-4-31b` (modelo local), no de Skynet. Medido hoy contra Skynet con peticiones reales: 3.573, 19.387, 44.387 y 152.569 tokens aceptados. Con 8192 declarados OMP ni arrancaba: su prompt fijo ya ocupa 9.578.
- **Arreglo** (fuera del repo, en `~/.omp/`, con copias `*.bak-2026-11-17-pre-modos`): Skynet otra vez a 180.224 de contexto y 16.384 de salida; compactación al 80 %; rol `smol` también a Skynet (faltaba).
- **Modos:** perfil por defecto = programador, sin Blender MCP. Perfil `blender` (`~/.omp/profiles/blender/agent/`, `models.yml` enlazado) con el catálogo completo de Blender. Los dos dejan de leer el `.mcp.json` del repo y `~/.claude.json`, que metían Blender completo por duplicado. Lanzadores `scripts/mac/omp_programador.sh` y `scripts/mac/omp_blender.sh`.
- **Medido:** prompt fijo de 9.404 tokens en programador, 10.590 con Blender lite y 17.591 con Blender completo, de 180K. En modo Blender, OMP vio ~240 herramientas, incluidas las de esculpido (`sculpt_base`, `sculpt_multires`, `sculpt_voxel_remesh`…), y leyó la escena (3 objetos) llamando a `get_scene_info`.
- Guía actualizada: `docs/GUIA_BLENDER_MCP.md`.

## 2026-11-16 — Blender MCP 3.2 y prueba de calidad con dos modelos (Codex)

Se sustituyó el puente antiguo por `blender-mcp-ultra==3.2.0`, fijado y
registrado en procedencia. Blender 5.2.3 expone 248 herramientas tipadas en
localhost:9876. Junie ejecutó `mcp_blender_scene_get_info` contra la escena
real. OMP montó 26 herramientas en modo lite; el modo completo ocupa unos 20k
tokens y excede los 8k que sirve actualmente Skynet por Tailscale (corregido el 2026-11-17: esos 8K eran de LM Studio local; Skynet tiene 180K configurados). OMP no usa
inferencia local. Se documentó además que
`execute_blender_code` bloquea la carga arbitraria de scripts del repositorio:
los generadores reproducibles se ejecutan por Blender CLI y MCP queda para
inspección, importación, retoques y render tipados.

La prueba produjo dos entregas. `crestalba.glb` se regeneró como v2 clean-room
(4 960 triángulos, once piezas, siete clips y diez apariencias), corrigiendo
cara, plumas, alas, cola y silla sin copiar la montura de la referencia.
`moneda_exposicion_1915.glb` es un prop histórico octagonal creado desde cero
(69 852 triángulos, una malla, tres materiales y relieve geométrico); la foto
aportada no se copió, cargó ni usó como textura. Generadores, editables,
validadores y láminas quedaron en el repo y en
`work/codex-mcp-calidad/{crestalba_final,moneda_exposicion_1915_final}.png`.

Por petición posterior del creador, `BankScene` instancia la moneda conservando
sus tres materiales: una placa exterior junto a la puerta y un sello interior
sobre el mostrador. La regla se aplica a cada escena de banco; actualmente el
juego sólo tiene el Banco del Cruce. No añade colisión, interacción ni valor
económico. `npm run qa:electron -- banco` comprobó presencia interior/exterior,
entrada, mobiliario, empleado, inventario, salida y consola: 12/12. Evidencia:
`work/qa/c05-banco-interior.jpg` y `work/qa/c05-banco-exterior.jpg`.

## 2026-11-17 — Presets de hechizos y consolidación de agentes

- Reproducido el reporte del creador: el preset de catálogo de nivel 20 escribía
  todos los hechizos conocidos con `maxRank`. La carga respetaba correctamente
  la regla de no rebajar rangos guardados, por lo que los hechizos de clase
  quedaban en rango 5. `spellCatalogPresets` calcula ahora su rango con
  `rankAtLevel`; los universales del catálogo conservan el rango explícito de
  los pergaminos consumidos. Regresión en `tests/presetCoverage.test.ts`.
- Contrastadas las entregas sin commit con sus filas: Crestalba v2 (F34), moneda
  histórica en bancos (F24), auditorías JEQ-07/08 y perfiles MCP. Los hallazgos
  de balance siguen siendo diagnóstico y no se aplicaron como cambios de cifras.
- Integrada la rama de La Espeja como F36 después de revisar el reporte y las
  capturas en `work/omp-diablica-espejo/`; el validador que estaba sólo en
  `work/` pasó al contrato regenerable
  `scripts/blender/validar_diablica_espejo.py`.
- Verificación final: `npm run typecheck`, `npm run build`, `npm run docs:check`
  y 1 450/1 450 pruebas Vitest en verde. Validadores Blender en verde para
  Crestalba (4 960 tri), moneda (69 852 tri) y La Espeja (17 411 tri, 12 clips
  requeridos). El perfil de OMP no tiene límite total de tiempo y no usa
  inferencia local; sólo conserva el límite por llamada del gateway.

## 2026-11-14 — D-01a-fix y D-01d asignadas a Junie (coordinador)

El creador respondió A1: Junie hace el arreglo de universales en rango 1 (D-01a-fix) y el aviso de subida de rango (D-01d). Van primeras en `work/prompts-noche/COLA_JUNIE.md`, por delante de J13 y J14. D-01b y D-01c siguen sin autorizar.

## 2026-11-14 — Revisión de las entregas de Junie y OMP (coordinador)

Estado comprobado sobre `d54ff5b`, con los cambios sin guardar de J12 apartados: `tsc` limpio; `vitest` 1361/1366, los mismos 5 fallos de D-00 y ninguno nuevo.

- **D-01a** (`4e5ed9b`): en Electron, partida nueva llevada a nivel 200 con `gainXp`: los 13 hechizos de clase en rango máximo. **Fallo**: cuatro universales leídos por pergamino a nivel 200 quedaron en rango 1 (el recálculo solo corre al subir de nivel y al cargar) → D-01a-fix. La subida de rango reutiliza el evento `learned` → D-01d. Solo hay medición de balance «después» en `work/junie-d01a/`; falta la de «antes».
- **UI-01** (`cbd5fed`): con eventos de ratón reales por CDP, doble clic equipa (4 piezas), lee pergaminos (4) y usa pociones; arrastre a casilla vacía mueve; cursor `default` en reposo y `grabbing` al arrastrar. Los `charm` no reaccionan al doble clic (por confirmar si es lo esperado).
- **J5** (`27df8b2`): no toca `moveSpeed`. Usa una constante `DEFAULT_MOVE_SPEED = 6` en `playerAvatar.ts` en vez de leer la velocidad de la clase, y cambió las velocidades de entrada de tres casos de `tests/locomocion.test.ts`. No hay evidencia visual de que los pies no patinen: lo mira el creador.
- **J2-fix, J4a-fix, J11**: pruebas en verde; sin revisión en pantalla.
- **J12**: bloqueada dos veces; hay cambios sin guardar en `data/ambient.json`, `src/render/ambientView.ts`, `tests/ambient.test.ts` y `tests/j12_utileria.test.ts`. No se tocaron. Con ellos puestos, la consola avisa de 4 nodos que faltan en `naturaleza_suelo.glb`.
- **D-40** (`6ad72fe`): `arte/omp-*` vacío; todo en `work/`.
- **D-17** (`d54ff5b`): lámina revisada. Gallote correcto. La tijereta es blanca con alas negras; la real es casi negra.
- Evidencia: `work/claude-rev1114/` y capturas `rev-*` en `work/qa-manual/shots/`. Preguntas al creador en `ACCIONES_CREADOR.md`.

## 2026-11-14 — J5: locomoción, segundo intento (Junie)

Causa: `pickGait()` en `playerAvatar.ts` usaba `m.runSpeed` (1.3 m/s del GLB) como referencia para decidir walk/run, pero el jugador se mueve a `moveSpeed` 6 m/s. La ratio `6/1.3 ≈ 4.6` siempre superaba el umbral de correr (0.85), así que el personaje siempre corría. Fix: nueva constante `DEFAULT_MOVE_SPEED = 6` en `playerAvatar.ts`, usada como referencia en `pickGait()` en lugar de `m.runSpeed`. Los umbrales walk/run ahora se expresan en relación con la velocidad de juego: walk por debajo de 4.5 m/s (75 %), run por encima de 5.1 m/s (85 %). El `speedRatio` del clip (`gltfCharacter.ts`) no cambia: ya escala correctamente con `moveSpeed / runSpeed` para que los pasos coincidan con la distancia recorrida. Pruebas de `locomocion.test.ts` actualizadas con velocidades coherentes (3 m/s para walk, 6 m/s para run). `tsc` limpio, 1356/1361 pruebas verdes (5 fallos conocidos de D-00). Escenario `previa` en Electron: 9/11 OK. Commit `27df8b2`, push OK. Evidencia en `work/junie-j5/`.

## 2026-11-14 — J4a-fix: vista previa de apuntado considera línea de visión (Junie)

Causa: `syncAim()` en `spellFx.ts` usaba solo `world.inRange()` para decidir el color del indicador (`fx.ok` verde / `fx.bad` gris). Cuando el objetivo estaba en alcance pero tapado por un obstáculo, la vista previa se pintaba verde a través de paredes. Fix: agregar `&& world.hasLineOfSight()` en las líneas 527 y 536, igual que ya hace `previewSpell` en `world.ts` (línea 1685). 8 pruebas en `tests/j4a_fix_aimLineOfSight.test.ts`: enemigo detrás de muro (inRange true, hasLineOfSight false, checkCast "noLineOfSight"), sin obstáculos (ambos true, checkCast null), spells de área apuntada, y prioridad "range" sobre "noLineOfSight". `tsc` limpio, 1356/1361 pruebas verdes (5 fallos conocidos de D-00). Commit `7f76a68`, push OK. Evidencia en `work/junie-j4a-fix/`.

## 2026-11-14 — J2-fix: efectos por hechizo sin meshes huérfanos (Junie)

Causa: `onCast()` en `spellFx.ts` hacía `return` después de `playCast()` cuando había perfil visual, saltando todo el flujo genérico. Los proyectiles (`searing_mark`, `glacial_lance`, `vertigo_whistle`, `spark`, `piercing_shot`) quedaban quietos en el lanzador; las áreas perdían su forma real. Fix: el perfil ahora solo cambia el aspecto — los proyectiles se registran en `this.projectiles` para que viajen y se liberen, y las áreas sin proyectil conservan `buildAreaShape()`. Método `buildAreaShape()` extraído como compartido. 4 pruebas en `tests/j2fix_spellFxProfiles.test.ts`: 9 perfiles sin meshes huérfanos tras 5 s, proyectiles single/line registrados, áreas con forma. `tsc` limpio, 1348/1353 pruebas verdes (5 fallos conocidos de D-00). Escenario `previa` en Electron 11/11 (usa `gust` con perfil). Commit `16ca9b5`, push OK. Evidencia en `work/junie-j2fix/`.

## 2026-11-14 — UI-01: doble clic y arrastre en la mochila (Junie)

Causa raíz: `drag.ts` llamaba a `preventDefault()` en `pointerdown` antes de confirmar el arrastre, bloqueando la cadena mousedown→click→dblclick. Fix: reemplazar por `setPointerCapture()`/`releasePointerCapture()` para mantener el control del puntero sin impedir los eventos de clic. Cursor: `.cell.filled` vuelve a `cursor: default`; `grabbing` solo con `body.is-dragging` (durante arrastre real). 11 pruebas en `tests/ui01_inventoryDblclick.test.ts`: decisión pura por tipo de objeto (equipar vs. usar), equipar espada, usar poción, leer pergamino, y moveItem() sin equipar. Escenario `mochila` en Electron: 5/5. `tsc` limpio, 1344/1349 pruebas verdes (5 fallos conocidos de D-00). Commit `cbd5fed`, push OK. Evidencia en `work/junie-ui01/`.

## 2026-11-14 — D-01a: rango automático por nivel (Junie)

Función pura `rankAtLevel(def, level, maxLevel, cfg)` en `src/rpg/spellRank.ts`: para un hechizo aprendido en U, con nivel máximo M, el rango r se alcanza en `U + ceil((M−U)·factor[r−1])`. Factores `[0.10, 0.25, 0.50, 0.90]` (maxRank 5) y `[0.30, 0.80]` (maxRank 3) en `data/rpg/progression.json` como `PROPUESTA`. Integración: `unlockClassSpellsForLevel()` en `character.ts` aprende directamente al rango automático; `recalculateSpellRanks()` recalcula todos los hechizos (incluidos universales) al cargar partida y al subir de nivel. Rango efectivo = mayor entre guardado y automático, nunca baja. 15 pruebas en `tests/rpg/spellRank.test.ts`: tablas de 03_HECHIZOS_Y_RANGOS.md con máximo 200 y 400, nivel máximo de cada clase en rango máximo, guardado viejo sin bajar rangos, `Spellbook.learn()` intacto. `npm run balance:v3` idéntico (los presets usan rangos explícitos). `tsc` limpio, 1333/1338 pruebas verdes (5 fallos conocidos de D-00). Evidencia en `work/junie-d01a/`.

