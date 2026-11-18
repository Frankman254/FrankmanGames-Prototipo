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

## 2026-11-17 — F27-INT: Los emotes del chat disparan su clip (Junie)

`data/ui/chat.json` define 8 emotes (wave, laugh, dance, cry, angry, love, sleep, doubt) y `personaje.glb` trae los clips `Emote_<id>`, pero el chat solo mostraba la burbuja sin reproducir la animación. `PlayerAvatar` gana `playEmote(emoteId)` que llama a `model.playNamed('Emote_' + emoteId)`; `dance` y `sleep` tienen timer de 4 s (bucle corto), los demás son de una vez. Moverse, recibir daño o lanzar hechizo corta el emote vía `cancelEmote()` → `stopGesture()`. `GltfCharacter` expone `stopGesture()` para detener el clip suelto. `CharacterModel` interface añade `stopGesture?()`. `ChatBox` acepta callback `onEmote` en el constructor y lo invoca al enviar un emote. `MenusController` expone `onEmote(fn)`. `main.ts` conecta: `menus.onEmote((id) => view.player.playEmote(id))`. 12 pruebas en `tests/f27int_emotes.test.ts`: playNamed correcto, isEmoting, movimiento corta, daño corta, cast corta, timer dance 4 s, clip termina → idle, reset limpia, emote nuevo cancela anterior, sleep vs cry. Suite 1571/1571, tsc sin errores nuevos. Commit `3bfdbf0`, push OK. Evidencia en `work/junie-f27int/`.

## 2026-11-17 — U02-INT: Retrato e iconos de características (Junie)

`assets/portraits/adventurer_default.png` y `assets/icons/stats/{strength,agility,intellect,vitality,spirit}.png` ya estaban registrados en `PROCEDENCIA.md` pero no conectados. `artIcons.ts` gana `portraitImg()`, `portraitUrl()` y `portraitIds()` (nuevo `import.meta.glob` para `/assets/portraits/*.png`). En `character.ts`, `div.char-face` usa el retrato PNG con respaldo al SVG de la clase; cada fila de característica primaria muestra el icono PNG cuando existe (strength, agility, intellect, vitality, spirit) y un hueco vacío para calm, flow y will. En `hud.ts`, `div.hud-portrait` usa el mismo patrón. CSS: `.portrait-img` con `object-fit: cover` y `.stat-icon` de 20 px. 16 pruebas en `tests/u02int_portraitStats.test.ts`: rutas, helpers, null para ids inexistentes. Suite 1559/1559, tsc sin errores nuevos. Commit `264130a`, push OK. Capturas en `work/junie-u02int/`.

## 2026-11-17 — F36-POL: La Espeja rehecha según la lámina (Coord)

Encargo del creador: la diablica estaba «bien horrible» y la base anime tenía mal el paso, la carrera y las manos. `scripts/blender/diablica_espejo.py` se reescribe: de `oraculo_f_anime.glb` solo toma la malla (piel, cara con iris castaños, pelo, guantes y zapatos) y el esqueleto; descarta su ropa y sus clips. Vestuario, tocado, bastón y careta son geometría propia con una paleta por pieza. Se tapa con una pechera el hueco que la piel base tenía bajo su ropa. Clips propios: reposo con el bastón, paso corto bajo la falda (sin patinar: las piernas no se ven), carrera, giro de evasión, golpe de bastón, lanzar, golpeado, morir, máscara on/off, bastón, reacción y los ocho gestos comunes con los brazos fuera de la falda. Validador: 17 360 triángulos, 6 piezas, 20 clips, 1,82 m, apoyo 0. Electron: escenario nuevo `espeja` 3/3 (PNJ en Villa Raspadura con sus piezas y clips). Sigue en el piso 30 de la cripta como jefa del tramo «espejos» (pisos 30–34), sin cambiar datos. Copia de la versión anterior en `work/claude-diablica/anterior/`; láminas `v5_*` y `espeja-pueblo.jpg` en `work/claude-diablica/`. Modelo entregado, no aprobado: lo revisa el creador.

## 2026-11-17 — F18-INT: pruebas de cascos, capuchas, sombreros y capas (Junie)

El código para integrar los nodos de cabeza y espalda de `equipo.glb` ya estaba conectado: `arenaView.ts` pasa `worn` a `withGear()`, `gltfCharacter.wornPlacements()` usa `entry.wear` del template, y `attachHeld()` busca `obj_<itemId>` en `equipo.glb`. Lo que faltaban eran las pruebas. Se verificó que `equipo.glb` contiene 18 nodos de head/back (`obj_<itemId>`): 14 de cabeza (cascos, capuchas, sombreros) y 4 de espalda (capas). Los 18 items existen en `items.json` con el `slot` correcto. `wear` del template `personaje` define `head.joint = "head"` y `back.joint = "chest"`, huesos que existen en `personaje.glb`. 10 pruebas en `tests/f18int_heldGearHeadBack.test.ts`: items con nodo existen y tienen slot correcto, `gearNodeName` produce `obj_<id>`, `wear` del jugador y classModels tienen huesos, `withGear` con `worn` pasa `headItem`/`backItem`, `coversHair` por kind (hood/helmet sí, hat no), kinds válidos. Suite 1543/1543, tsc sin errores nuevos. Commit `87b36be`, push OK. Evidencia en `work/junie-f18int/`. Capturas de Electron omitidas (requieren escenario dedicado).

## 2026-11-17 — Q09-FIN: curas con origen y tecla 1 en diálogos (Junie)

Dos problemas remanentes de Q09. **Curas sin origen:** la regeneración pasiva (`character.ts:622`, `healthRegen`) curaba sin emitir evento `heal`. `tickTimers()` ahora devuelve la vida regenerada; `world.ts:2411-2414` emite `{ type: 'heal', source: 'regen' }` cuando hay curación. `combatLog.ts` muestra "Regeneración" cuando source es "regen". Los demás orígenes ya tenían source: hechizos (`s.id`), consumibles (`item:${def.id}`), estados (`status:${s.def.id}`), mascotas (`pet:${pet.def.id}`). **Tecla 1 en diálogos:** ya implementado en `index.ts:1171-1174`: cuando hay diálogo abierto, `hotbarIndex` y `itemBarIndex` eligen la opción del diálogo en vez de lanzar la ranura. 9 pruebas en `tests/q09_fin.test.ts`: regeneración emite heal con source, hechizo/poción/estado muestran origen, tickTimers devuelve cantidad correcta, hotbarIndex resuelve hotbar1. Suite 1533 pruebas (9 nuevas), tsc sin errores nuevos. Commit pendiente, push pendiente. Evidencia en `work/junie-q09fin/`.

## 2026-11-17 — O9-RT: antorchas, ancla y giro en el runtime (Junie)

Contrato O9 aplicado al runtime (puntos 1–2 del REPORTE). `dungeon.ts`: la ancla de antorchas pasa de `ts*0.5 - 0.05` a `ts*0.5` (plano de pared exacto) tanto en `generateHandFloor` como en `generateFloor` generado. `dungeonView.ts`: el soporte (`d_antorcha`) usa `yawMatrix` con `yaw = atan2(ny, nx)` para girar hacia la sala; `TORCH_BRACKET_OFFSET` y `TORCH_FLAME_OFFSET` pasan a 0 (el modelo O9 lleva el frontal). Punto 3 (remolino de humo/chispa en `TorchRig.write()`) pendiente para OMP — `torchFlame.ts` no se modifica. Prueba nueva en `j16_torches.test.ts`: distancia de la ancla al plano de pared ≤ 1mm para las 4 normales ±X/±Z. 11 pruebas verdes (j16_torches.test.ts), suite 1524/1524, tsc sin errores nuevos. Commit `8515602`, push OK. Evidencia en `work/junie-o9rt/`.

## 2026-11-17 — UI-03: menú «Cambiar apariencia» no se cierra al elegir (Junie)

Al elegir una variante, «Camuflaje» o «Color fijo» en el submenú de apariencias de una montura, `setItemLook()` emitía `changed` → `Panel.invalidate()` → `render()` → `closeContext()`, cerrando el menú. Se añadió `looksMenuOpen` (export boolean) en `itemContextMenu.ts`: `true` en `showLooks()`, `false` en `showOptions()`, `showLines()` y `close()`. `InventoryWindow.render()` y `BankPanel.render()` solo cierran `closeContext` cuando `!looksMenuOpen`. `Panel.close()` sigue cerrando sin condicional. 6 pruebas en `tests/ui03_mountLooks.test.ts`: export boolean, render condicional, dos variantes seguidas, close incondicional, `setItemLook` emite `changed`. Suite 1523/1523, tsc sin errores nuevos, `qa:electron -- montura_color` 5/5. Commit `2a58e43`, push OK.

## 2026-11-17 — DATA-01: id cirílico a ASCII y alias de carga (Junie)

`tri_tambor_azuerо` terminaba en `о` cirílica (U+043E) en vez de `o` latina. Se reemplazó en `data/rpg/items.json`, `sets.json`, `merchants.json`, `scripts/balance/generateTriElementalSets.mjs` y `tests/rpg/equipmentRoutes.test.ts`. Se añadió `LEGACY_ID_ALIAS` en `src/ui/menus/saveStore.ts` con 6 entradas (set + 5 piezas) para que `migrateSave()` convierta los ids cirílicos de guardados viejos al nuevo id ASCII. 6 pruebas en `tests/data01_asciiIds.test.ts`: ningún id en `data/` (excluyendo `i18n/`) tiene caracteres no-ASCII; `migrateSave` resuelve itemId y setId con о cirílica en inventory y equipment. Suite 1487/1487, tsc limpio. Commit `e1f8264`, push OK.

## 2026-11-17 — BAL-01: auditorías de balance, suma bruta frente a efecto en juego (Junie)

JEQ-07 presentaba «10100 %» de XP y «102 %» de resistencia como si fueran efectos reales, pero el juego topa la XP de Aprendizaje en +100 % (`character.ts:234`, `Math.min(100, experienceGain)`) y la resistencia por elemento en `resistCap` 50 (`damage.ts:102`, `Math.min(resist, resistCap)`). Helper puro `scripts/balance/caps.ts` con `capXpGain()`, `capResist()` y `applyResistCaps()` que no importa nada de `src/`. `auditBuilds.ts` muestra en cada línea `R:bruta/efectiva%` y `XP:bruta/efectiva%`, marcando «(tope)» cuando se recorta; nueva sección «XP DE APRENDIZAJE (bruta / efecto en juego)». `auditCombat.ts` lista los escenarios de resistencia con bruta > tope. 18 pruebas en `tests/bal01_caps.test.ts`: capXpGain, capResist, applyResistCaps, build sintético que supera ambos topes. Suite 1505/1505, tsc sin errores nuevos. Salida de auditorías en `work/junie-bal01/`. Commit `156c03f`, push OK.

## 2026-11-17 — ED-01: Play Mode del editor (Junie)

`src/editor/playMode.ts` tenía el controlador `PlayModeController` con snapshot/restore, pero el botón «▶ Probar» del editor solo mostraba un aviso. Se conectó: `index.ts` instancia el controlador con callbacks para pausar/reanudar simulación (vía flag `inPlayMode` que hace `active` devolver false durante Play Mode), aplicar el documento al mundo (dungeon.apply o host.apply) y notificar cambios de estado. `play()` llama a `enterPlayMode()` (snapshot → apply → ocultar UI); `stopPlay()` llama a `stopPlayMode()` (pausar → restore snapshot → mostrar UI). F12 durante Play Mode sale de Play Mode en vez de abrir el editor. `workspace.ts` muestra/oculta los botones ▶ Probar / ⏹ Stop según `isPlaying`. `_restoreSnapshot()` en `playMode.ts` limpia las propiedades del documento antes de `Object.assign` para eliminar objetos añadidos durante Play Mode. 12 pruebas en `tests/ed01_playMode.test.ts`: estado inicial, enter/stop, snapshot y restauración con DungeonEditorDoc real, ciclos múltiples. Suite 1517/1517, tsc limpio. Commit `15322f9`, push OK.

## 2026-11-17 — O8/O9 integrados: accesos y antorchas de la cripta (Claude)

- `scripts/blender/mazmorra.py`: parche de O9 (antorchas con origen en el plano de pared, capas desplazadas hacia la sala y soporte reanclado) y, encima, el de O8 (subida y bajada abiertas). `assets/models/mazmorra.glb` regenerado: 3472 triángulos.
- `scripts/blender/validar_antorchas.py`: ANTORCHAS VALIDAS, margen +10,6 y +10,4 cm, copa 0,267 frente a boca de llama 0,275.
- Nuevo escenario `node scripts/qaElectron.mjs criptaAccesos` (4/4): encuentra `dUpStairs`, `dDownFrame` y la antorcha `dTorch` (instancias finas) y fotografía cada una. Capturas y registro en `work/claude-o8o9/`.
- Hasta que entre O9-RT (Junie) las antorchas pueden quedar unos centímetros por delante del muro, pero ya no lo atraviesan. Con esta entrada queda desbloqueada O9-RT.

## 2026-11-17 — Monturas: camuflaje y color fijo; ojos del águila en sus cuencas (Claude)

- Pedido del creador: la montura puede seguir el color del atuendo (camuflaje) o llevar un color elegido (fijo). `src/rpg/mountColor.ts` reparte el color por regiones de la paleta (pico, cuero y herrajes no cambian); `setItemLook` y la carga de partidas aceptan `camuflaje` y `#rrggbb` solo en monturas con paleta. Menú «Cambiar apariencia» con botón de camuflaje y selector de color.
- Águila: el globo ocular sobresalía ~85 %; ahora hay cuenca excavada (meta negativa), párpado inferior y el ojo hundido 4 cm (`arpia_gigante.py`). Regenerados `aguila_arpia.glb` y `.blend`: 17 698 triángulos, validador OK.
- Evidencia: `work/claude-mod01/ojos/` (renders `alta_*`, logs de bake y rig, capturas de QA). `npm test` 1481/1481, typecheck limpio, QA Electron `montura_color` 5/5 y `montado` OK.

## 2026-11-17 — MOD-01: el águila arpía sustituye a la arpía de pruebas (Claude)

- **Decisión del creador:** el águila esculpida sustituye a la arpía de pruebas. El diseño viejo queda desactivado, sin borrar.
- **Montura:** `mount_dev_harpy` ahora carga `assets/models/aguila_arpia.glb`. Escala 1 y `rideHeight` 2,17, que es la altura del anclaje. `montura_arpia.glb` y `scripts/blender/montura_arpia.py` siguen en el repositorio, pero ningún objeto los usa.
- **Rig:** 35 huesos, con un hueso por primaria, y siete clips del contrato. Los anclajes `mount_seat` y `rider_root` cuelgan de `hips`.
- **Malla:** 17 680 triángulos. Mide 3,22 m de alto con la silla a 2,17 m, por petición de que imponga.
- **Reproducible:** `scripts/blender/aguila_arpia/` (esculpido → bake → rig) y `scripts/blender/validar_aguila_arpia.py`. Editable en `arte/blender/aguila_arpia.blend`.
- **Evidencia en `work/claude-mod01/`:**
  - `poses_hoja.png`;
  - `validacion_repo.txt`: OK, z mínima de los clips de suelo entre 0 y +0,02;
  - `qa_electron_log.txt`: `montado` y `volar` 7/7, sin errores de consola. Capturas `work/qa/montado-lado.jpg` y `volando.jpg`.
- **Límites:**
  - un solo material horneado, así que no tiene variantes de color;
  - las alas se abren con una rotación rígida;
  - es mayor que el rango del Diostedé.
- **Siguiente:** la Falcolomba pieza por pieza, en `work/claude-falcolomba/`. La cabeza ya está en curso.

## 2026-11-17 — MOD-01: águila arpía esculpida y lote técnico de Junie (Claude)

- **Elección del creador:** águila arpía gigante, montable y de estilo anime. Se esculpe sin interfaz y de forma procedural: masas de metaballs, remallado por vóxeles, relieve de plumas en escama, color por vértice y plumas, pico y garras como piezas aparte. Rasgos tomados de referencias reales: penacho doble, banda negra en el pecho, «pantalones» barrados, tarsos gruesos y cola con tres bandas.
- **Versiones:** la alta tiene unos 526 000 triángulos. La de juego, unos 18 000, con color y normales horneados a 2048, en un GLB de unos 5,6 MB.
- **Evidencia en `work/claude-mod01/`:** láminas `v2_*` (alta) y `juego_*` (juego), `arpia_gigante.glb`, `arpia_alta.blend`, `arpia_juego.blend` y los scripts.
- **Pendiente:** rig y clips del contrato de monturas, paleta de variantes y revisión del creador. No está integrado en `assets/` ni en `data/`.
- **Guía:** el método queda en `docs/GUIA_BLENDER_MCP.md`, sección 7, para los demás agentes. La misma guía deja de dar por descartada la «Falcolomba»: el creador confirmó que es una lámina propia generada con ChatGPT y autorizó modelarla fiel a su desglose.
- **Lote técnico de Junie:** el creador lo autorizó; DATA-01, BAL-01 y ED-01 quedan en su cola.

## 2026-11-17 — O9: contrato de montaje de antorchas contra pared (OMP)

Diagnóstico medido: las cinco piezas (`d_antorcha`, `d_llama`, `d_llama_halo`, `d_llama_humo`, `d_llama_chispa`) viajaban centradas en su propio pivote y el runtime no las giraba por la normal: con el ancla en el plano de pared el soporte metía 10 cm en el muro y el halo 14 con el balanceo. Candidata en `work/omp-cripta-antorchas-montaje/`: origen único en el punto de contacto, +X hacia la sala, ningún vértice en x<0, llama ≥ 10 cm aún animada, soporte 44 tri (GLB 3.484, sin crecer). Modelo vía `CAMBIOS_PROPUESTOS.patch` (solo `scripts/blender/mazmorra.py`; apply-check OK y el GLB del script parcheado sale binariamente idéntico); runtime (yaw por normal, ancla en el plano exacto, remolino de humo a +30 cm) documentado en el REPORTE para Junie. Validador nuevo `scripts/blender/validar_antorchas.py`: el publicado falla (10 penetraciones), la candidata pasa; `validar_mazmorra.py` del contrato vivo también pasa. Evidencia: `revision.png` (cuatro normales ±X/±Z, esquina, junto a puerta, figura de 1,7 m), `validacion.txt`, `antorchas_montaje.blend`. NO integrado en `assets/`.

## 2026-11-17 — Prettier y ESLint con indentación de 4 espacios

Configuración pedida por el creador: `tabWidth` 4 (espacios, no tabuladores). Paquetes de desarrollo `prettier` 3.10.1, `eslint` 10.15.0, `typescript-eslint` 8.73.0 y `eslint-config-prettier`. El código de `src/`, `tests/`, `electron/`, `server/` y `scripts/` (salvo Blender) se reformateó. Los JSON de `data/`, documentos y skills de agentes no se tocan. Comandos: `npm run format`, `format:check` y `lint`. Cursor/VS Code: formato al guardar. Typecheck limpio; las dos pruebas de `modalP12` que leían la firma en una sola línea se ajustaron al salto de línea de Prettier, sin cambiar el contrato. Suite 1477/1477.

## 2026-11-17 — J14: naturaleza modular en Iguanera (Junie)

Integrar `naturaleza_modular.glb` sin saturar el combate. Se registraron 5 piezas (`natural_tronco_caido`, `natural_roca_alta`, `natural_roca_baja`, `natural_helecho_ancho`, `natural_palma_joven`) con dimensiones reales medidas del GLB. Se colocaron 8 instancias en Iguanera en la zona (688-715, 205-225), al sureste del muelle seguro, a más de 18m del borde del muelle y más de 60m de PNJs individuales. `natural_helecho_ancho` es atravesable; las demás son sólidas. Las piezas sólidas no se superponen y no crean cuellos de botella en discos de combate de 6m. El GLB se añadió al `import.meta.glob` de `ambientView.ts`. 11 pruebas en `tests/j14_naturaleza.test.ts`: nodos GLB, dimensiones, catálogo registrado, solidez, máximo 8 instancias, distancia a puntos críticos, discos de combate, huellas sin superposición, determinismo, presupuesto, dentro de zona Iguanera. Se actualizó el count de piezas en `ambient.test.ts` (79→84). Suite 1477/1477, tsc limpio, build OK. Commit `de1b1d3`, push OK. Evidencia en `work/junie-j14/`.

## 2026-11-17 — J13: escenografía regional en embarcaderos (Junie)

Integrar `escenografia_regional.glb` en los dos embarcaderos sin bloquear la lancha. Se registraron 3 piezas (`escena_amarradero`, `escena_baliza_costera`, `escena_poste_direcciones`) con dimensiones reales medidas del GLB (eje Y de Blender = alto). Se colocaron 8 piezas en total: 4 simétricas alrededor de (592,236) en Iguanera y 4 alrededor de (478,14) en Pedasol, conservando radio 4m libre alrededor de cada punto de lancha, corredores caminables de 3m hacia tierra y sin solapamiento con caminos. `escena_amarradero` es atravesable; baliza y poste son sólidos. El GLB se añadió al `import.meta.glob` de `ambientView.ts`. 10 pruebas en `tests/j13_escenografia.test.ts`: nodos GLB, dimensiones, catálogo registrado, solidez, radio libre, corredores, simetría, determinismo, sin botes decorativos, presupuesto. Se actualizó el count de piezas en `ambient.test.ts` (76→79). Suite 1466/1466, tsc limpio, Electron iguanera 7/7. Commit `a2cb7a7`, push OK. Evidencia en `work/junie-j13/`.

## 2026-11-17 — D-01d-fix: aviso de rango agrupado (Junie)

Causa: al subir de nivel, `unlockClassSpellsForLevel()` emitía un evento `rankUp` por cada hechizo de clase, y `index.ts` mostraba un `showBanner` individual por cada uno, tapándose entre sí. Los universales que subían en `recalculateSpellRanks()` no emitían ningún evento. Fix: nuevo evento `rankUpBatch` en `contracts.ts`; `gainXp()` usa `unlockClassSpellsForLevelCollect()` y `recalculateSpellRanksCollect()` para recopilar todas las subidas (clase + universales) y emitir un solo batch. `index.ts` maneja `rankUpBatch` con un único `showBanner` agrupado (máx 4 líneas y "+N más"). `learnSpell()` sigue emitiendo `rankUp` individual para pergaminos. 6 pruebas en `tests/d01d_fix.test.ts`: batch al subir de nivel, clase y universales en mismo batch, pergamino emite rankUp individual, sin batch si no sube ningún rango, un batch por nivel, rangos coinciden con spellbook. Suite 1456/1456, tsc limpio, build OK. Escenario `previa` en Electron: 9/11 OK (2 fallos pre-existentes). Commit `30857a4`, push OK. Evidencia en `work/junie-d01d-fix/`.

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

