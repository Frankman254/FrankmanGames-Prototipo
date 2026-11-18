# Tareas de desarrollo

Tablero único. Revisión: 2026-11-17, sobre `4e84461`. El texto completo de cada fila anterior, con su evidencia, está sin cambios en [historico/TAREAS_HASTA_2026-11-17](historico/TAREAS_HASTA_2026-11-17.md). Los hechos comprobados están en [ESTADO_ACTUAL](ESTADO_ACTUAL.md); lo que el creador debe probar o decidir, en [ACCIONES_CREADOR](ACCIONES_CREADOR.md); el diseño, en [diseno](diseno/README.md).

## Reglas del tablero

- **Estados**: *Autorizada* (el creador la encargó: se puede ejecutar), *En curso*, *Parcial* (hay entrega y falta parte de la aceptación), *Espera al creador* (falta una decisión o una cifra), *Sin autorizar* (lista, pero nadie la ejecuta hasta que el creador lo diga), *Bloqueada*, *Retirada*, *Hecho*.
- Un agente solo ejecuta filas **Autorizada**. Las propuestas técnicas del coordinador entran como *Sin autorizar*.
- Cada encargo cumple el contrato mínimo de 11 puntos de [AGENTS.md](../AGENTS.md#contrato-mínimo-de-una-tarea). Si a la fila le falta un punto, lo completa la cola del agente (`work/prompts-noche/COLA_<AGENTE>.md`), que no crea tareas nuevas.
- Normas comunes: no se cambian cifras productivas de balance, progresión, economía, clases ni hechizos; lógica en `src/sim/` o `src/rpg/` con pruebas; no se relaja ninguna prueba; nombres originales y provisionales; evidencia en `work/<agente>-<tarea>/`.
- Quién: **J** = Junie, **O** = OMP (programador o Blender), **C** = Codex, **Coord** = Claude coordinador.
- Orden de producto: primero la rebanada 1–10 ([06](diseno/06_PLAN_IMPLEMENTACION.md)) y después el hito 1–40 de la [hoja de ruta](HOJA_DE_RUTA.md).

## Activas

| ID | Prioridad | Responsable | Estado | Alcance | Depende de | Aceptación |
|---|---|---|---|---|---|---|
| D-06 | P2 | Coord | Autorizada (creador, 2026-11-15) | Congelar por entregas la línea faltante de las tres clases a partir de las 48 entradas de [03](diseno/03_HECHIZOS_Y_RANGOS.md). Sin cuota por elemento ni cambios de elemento a hechizos actuales | — | Cada entrega con cifras `PROPUESTA` y comparación de daño y recurso; el creador aprueba antes de integrar |
| D-08 | P2 | Coord + J | Autorizada por fases (creador, 2026-11-15) | Integrar los hechizos de niveles 25–200: primero los que usan efectos existentes; luego M2–M5/M6–M9 tras sus primitivas | TEC-02, D-06 | Rangos automáticos conservados; tope de `unlockLevel` ampliado de forma explícita y con prueba |
| D-07 | P2 | C + J | En curso: 53/53 actuales, 3/48 de la línea nueva | Iconos de hechizo. Primer lote futuro: `firebreak`, `mist_veil`, `reed_call`; segundo pase para cuatro trazos finos | D-06 | PNG RGBA únicos, caja segura, lámina a 46 px y registro en `PROCEDENCIA.md` |
| EQ-06 | P2 | C | Autorizada (creador, 2026-11-15) | Segundo pase visual de iconos de objetos y cobertura de los sets nuevos | — | Cada lote revisado a 46 px y registrado en `PROCEDENCIA.md` |
| J13 | P2 | J | Hecho (`a2cb7a7`) | Integrar `escenografia_regional.glb` en los embarcaderos de Iguanera (592,236) y Pedasol (478,14) sin bloquear la lancha. 3 piezas registradas, 8 placed (4 por muelle), 10 pruebas | — | Corredores libres probados; `qa:electron -- iguanera` 7/7; capturas en `work/junie-j13/` |
| J14 | P2 | J | Hecho (`de1b1d3`) | Integrar `naturaleza_modular.glb` en Iguanera: 5 piezas registradas (tronco, roca alta, roca baja, helecho, palma), 8 placed en (688-715, 205-225), 11 pruebas | — | Discos de combate de 6 m limpios; >10m de puntos críticos; suite 1477/1477 |
| J12 | P2 | J + Coord | Parcial | Piloto de `utileria.glb` en el campamento de Iguanera. El código está en master (`092123d`, `tests/j12_utileria.test.ts`), pero la cola lo marca bloqueado y nadie revisó que se vea en escena | — | El coordinador mira las capturas de `work/junie-j12/` o repite `iguanera` en Electron y cierra o reabre |
| O8 | P2 | Coord | Hecha (integrada 2026-11-17) | Kit de accesos de la cripta (subida, bajada, puerta adaptable) en `work/omp-cripta-accesos/` con `CAMBIOS_PROPUESTOS.patch`. `scripts/blender/mazmorra.py` no cambia desde el 2026-11-14 | J17 (hecha, `a892405`) | Integrado en `mazmorra.py`/`mazmorra.glb` (3472 triángulos); escenario `criptaAccesos` 4/4; capturas en `work/claude-o8o9/` |
| O9 | P2 | Coord | Modelo integrado (2026-11-17); runtime parcial en O9-RT (8515602) | Contrato de montaje de antorchas corregido en `work/omp-cripta-antorchas-montaje/` (origen en el plano de pared, +X a la sala, penetración 0, margen animado ≥ 10 cm en llama). Modelo en `CAMBIOS_PROPUESTOS.patch` (solo `mazmorra.py`, apply-check OK, GLB reproducible bit a bit); validador `scripts/blender/validar_antorchas.py`: el publicado falla (−20…−1,8 cm), la candidata pasa. Puntos 1–2 del runtime aplicados por Junie (8515602). Punto 3 (TorchRig.write) pendiente para OMP | O8 (hecha) | Modelo aplicado: `validar_antorchas.py` ANTORCHAS VALIDAS (margen +10,6/+10,4 cm). Runtime: puntos 1–2 hechos, punto 3 pendiente OMP |
| F36-POL | P2 | Coord | Hecha v8 (2026-11-17), pendiente de revisión del creador | v8: el pelo ya no asoma por el turbante, coleta redonda y brazos con codo y muñeca que siguen al hombro con retraso (`v8_*.png`, 17 663 triángulos). La Espeja v6, rehecha pieza por pieza según la lámina de modelo y la lámina modular del creador (`work/claude-diablica/ref2/`): turbante menta con espejo, corona y cascada de pompones con cintas, coleta baja ondulada con lazo lavanda, blusa blanca con botones, tirantes lavanda y puños de volante rosa/menta, fajín menta con lazo grande, sobrefalda de pétalos menta con franja lavanda y espejos de aro rojo, falda globo rosa con franjas doradas y espejos de aro plateado, dos volantes lavanda con encaje, medias blancas, calcetín de volante y zapatos de plataforma menta/rosa con lazo y espejo, bastón de rayas rosa/verde con pomo dorado y lazo. Un color plano de paleta por pieza (estilo anime). Rostro según la lámina (pedido del creador): ojos cafés algo más grandes y separados, delineado y cejas café claro, pecas en nariz y mejillas, rubor, piel más cálida y labios delgados rosados. Espejos más pequeños; tres espejitos en la banda; corona compacta con una cola arqueada de pompones que cae por un lado con cintas (imagen del creador). Careta conservada para `MascaraOn`/`MascaraOff`. La v5 queda en `work/claude-diablica/v5_anterior/` y en `0e064b9` | Encargo del creador 2026-11-17 | `validar_diablica_espejo.py` válida (17 956 triángulos, 6 piezas, 20 clips, 1,82 m); escenario `espeja` 3/3; hojas `v6_*.png`, `v6c_rostro_vs_lamina.png`, `v6d_hoja.png` y `v6_electron.jpg` en `work/claude-diablica/` |
| F36-DANZA | P2 | Coord | Hecha (2026-11-17), pendiente de revisión del creador | La Espeja: huesos de vaivén (falda, coleta, cola de pompones en tres tramos y dos manojos de cintas) con muelles amortiguados horneados en todos sus clips y arrastre del aire al caminar y correr; dos danzas propias (`Danza_Reflejo`, `Danza_Brinco`) inspiradas en el diablo espejo de Colón que sustituyen a `Lanzar`/`Atacar` cuando lanza un hechizo (`spellClips` en `data/assets.json`, `playSpell` en `GltfCharacter`, `enemyView`); grupo «Cripta · jefes» en Partidas de prueba (tres clases al nivel de cada guardián, build equilibrada, equipo obtenible) | Encargo del creador 2026-11-17 | `validar_diablica_espejo.py` (17 956 triángulos, 7 huesos de vaivén, la cola se mueve al caminar); `tests/f36_danzaEspeja.test.ts`; escenario `espeja` 3/3; `work/claude-diablica/v7_andar_tres.png`, `v7_andar_espalda.png`, `v7_danzas.png`. Sin comprobar todavía en un combate real contra ella |
| ANIM-01 | P1 | O (Blender) | Hecha (2026-11-17) | Ciclos nuevos en `scripts/blender/locomocion_anime.py` (post-proceso sobre los GLB, vía `cazador_anime_fix.py`; la base CC0 no vive en el repo): pie de apoyo CONGELADO stance a stance, despegue solo de tobillo hasta salir del umbral de apoyo, vuelo con rodilla alta, cierre sin salto y simetría L/R exacta. Duraciones medida por `diagnostico.py`: Caminar 1,125 s (antes 1,100/1,083), Correr 0,708 s (antes 0,700/0,708); la cadencia de `gltfCharacter` se adapta sola (usa la proporción de duraciones). `fg_rig.biped_clips` sin cambios (genera la fuente; el rebake reescribe Caminar/Correr encima) | O9 (hecha) | `diagnostico.py` sobre los seis GLB: máx 0,8 cm/f (YW) y 0,7 (B-chan), simetría 0 % (antes 7,7–21,1 y L/R 2,7×). Hojas `work/omp-anim01/hoja_centinela.png` y `hoja_centinela_f.png`; capturas Electron `electron_centinela_{caminar,correr}_*.png`; `npm test` 1543/1543 |
| MOD-01 | P1 | Claude | En curso (creador, 2026-11-17). Águila arpía terminada e integrada como montura de pruebas (`mount_dev_harpy` → `aguila_arpia.glb`; la arpía vieja queda desactivada sin borrar); ojos hundidos en sus cuencas (creador, 2026-11-17). Monturas con paleta: modo camuflaje (sigue la ropa) y modo color fijo (creador, 2026-11-17), hechos. Ahora: la Falcolomba fiel a su desglose modular, pieza por pieza | Un modelo esculpido de verdad (esculpido, retopo, bake de color y normales) para medir el nivel de modelado frente a los modelos de bloques actuales. Sigue `docs/GUIA_BLENDER_MCP.md` | — | Renders frente a la referencia, conteo de polígonos y validador; evidencia en `work/claude-mod01/`. Entra en `data/` solo tras revisión del creador |
| D-00 | P0 | Coord + J | Espera al creador | La suite está en verde desde `b03210c` (1450/1450), que devolvió la zona segura del muelle a (610, 240), sincronizó la vegetación, retiró una de las dos casas y añadió un sendero a la otra. Falta que el creador confirme que es lo que quería (E1–E6) | — | El creador responde E1–E6 en [ACCIONES_CREADOR](ACCIONES_CREADOR.md); lo accidental se corrige sin editar pruebas |

## Propuestas técnicas del coordinador (2026-11-17)

Van separadas de las decisiones de diseño. Ninguna cambia cifras y todas esperan autorización.

| ID | Prioridad | Responsable | Estado | Alcance | Depende de | Aceptación |
|---|---|---|---|---|---|---|
| BAL-01 | P1 | J | Hecho (`156c03f`) | Helper puro `scripts/balance/caps.ts` con topes de experienceGain (100) y resistCap (50). `auditBuilds.ts` y `auditCombat.ts` muestran R:bruta/efectiva% y XP:bruta/efectiva% con nota "(tope)". 18 pruebas en `tests/bal01_caps.test.ts` | — | Informe con dos columnas; prueba de build sintético que supera ambos topes |
| DATA-01 | P1 | J | Hecho (`e1f8264`) | Migrar el id `tri_tambor_azuerо` (última letra cirílica, U+043E) a ASCII en el generador, `sets.json`, `items.json`, `merchants.json` y la prueba, con alias de carga para guardados antiguos | — | Ningún id de `data/` contiene caracteres no ASCII (prueba nueva); un guardado con el id viejo carga igual |
| TEC-02 | P1 | J | Hecho (dentro de HZ-03) | El parser acepta unlockLevel hasta 200 (`src/rpg/content.ts:529`, max 100→200). Integrado con HZ-03: 33 hechizos nuevos en `data/rpg/spells.json` | HZ-02 | 220 pruebas verdes (hz03_spellCalendar.test.ts), tsc limpio, content:check OK |
| ED-01 | P2 | J | Hecho (`15322f9`) | Play Mode del editor: `src/editor/playMode.ts` existe, pero el botón «▶ Probar» responde «Play Mode no disponible aún». Conectar instantánea, juego y restauración | — | Escenario Electron: editar, probar, parar y volver al estado editado sin pérdidas |

## Encargo del creador (2026-11-17, noche)

El creador pidió rendimiento, objetos hasta el nivel 200, seis rangos por hechizo y un calendario de hechizos hasta el 200 («pon a los agentes a hacer eso»). La decisión está en [00_DECISIONES](diseno/00_DECISIONES.md). El contrato completo está en `work/prompts-noche/COLA_JUNIE.md`. Orden: TC-01 → PERF-01 → PUE-01 → TOR-01 → DW-01 → HZ-01 → HZ-02 → IT-01 → HZ-03 → EV-01 → CAD-01.

| ID | Prioridad | Responsable | Estado | Alcance | Depende de | Aceptación |
|---|---|---|---|---|---|---|
| PERF-01 | P0 | J | Parcial; el resto pasa a WIN-01 | 11 fps en Windows en una partida de prueba. Medición ANTES en pueblo, Iguanera y pisos 1/20/60 de cripta. Diagnóstico: carga de modelos de enemigos al entrar (piso 20: 13 fps), materiales sin freeze(), 7 luces en cripta. Arreglos: freeze() en materials.ts, dungeonView.ts, ambientView.ts, vegetationView.ts. Falta: medición DESPUÉS, suavizado de carga de modelos, optimización de luces | — | Tabla ANTES en work/junie-perf01/MEDICION.md; freeze() aplicado; resto en PERF-01-resto |
| PUE-01 | P1 | J | Hecho (950e6d2) | Puertas automáticas (`proximity`) de la cripta con hueco de ≥ 3,0 m; expandProximityDoor() en generateFloor y generateHandFloor | O8 (hecha) | 8 pruebas verdes, span ≥ 3,0m en todos los pisos, cells coherentes, camino libre |
| TOR-01 | P1 | J | Hecho (71c0203) | Auditoría 100 pisos: 0 duplicados, 0 en puertas, 0 normales malas. Tests de regresión (7). torchEvery 5→4 (promedio 5.9 antorchas/sala) | J16 (hecha) | 7 pruebas verdes, auditoria.json limpio |
| DW-01 | P2 | J | Hecho (ba4b46b) | Dos armas: evento 'cast' con 'hand', combatLog etiqueta offhand, PlayerAvatar espeja modelo, i18n | — | 7 pruebas verdes, tsc limpio |
| HZ-01 | P1 | J | Hecho (caf925c) | `rankLadder()` en `spellRank.ts` devuelve [{rank, level}] para cada rango. `spellbook.ts` muestra la escalera con rangos actuales en dorado y futuros atenuados. Estilos `.spell-ladder` en `ventanas.css`. Claves i18n en español e inglés | — | 19 pruebas verdes (hz01_spellRankLadder.test.ts), tsc limpio, suite 1662/1662 |
| HZ-02 | P1 | J | Hecho (PROPUESTA) | Seis rangos por hechizo: `maxRank` 6 y factores `[0.08, 0.20, 0.40, 0.65, 0.90]` en `progression.json` (`PROPUESTA`), `perRank` sin cambios, parser genérico en `content.ts` | — | 10 pruebas verdes (hz02_sixRanks.test.ts), suite 1672/1672, tsc limpio, build OK, `IMPACTO.md` en work/junie-hz02/ |
| IT-01 | P1 | J | Hecho (`c6d122b`) | Ampliado generador T05 a 10 franjas (1–200): 105 objetos nuevos (75 fillers + 30 tipos especiales). 12 armas + offhand/waist/ring cubren franjas 6–10. Tipos especiales (robe, hood, bracers, sandals, buckler, helmet) cada 40 niveles. Items de nivel > 100 sin tablas de botín (pendiente) | — | 12 pruebas verdes (gearMatrix.test.ts), suite 1674/1674, tsc limpio, content:check OK |
| HZ-03 | P1 | J | Parcial (Paso 1+2 hechos, Paso 2 pendiente) | Calendario completo en `docs/diseno/03_HECHIZOS_Y_RANGOS.md` (sección «Calendario hasta el 200», PROPUESTA). 33 hechizos integrados en `data/rpg/spells.json` (13 VG, 11 TJ, 9 CZ) con efectos existentes. 18 esperan primitiva M2-M9. TEC-02: unlockLevel 100→200. Cada clase tiene hechizo en nivel 200. Queda: integrar los 18 hechizos cuando existan M2-M9 | HZ-02 | 220 pruebas verdes (hz03_spellCalendar.test.ts), tsc limpio, content:check OK, tabla PROPUESTA en 03 |
| O9-RT3 | P2 | O (programador) | Autorizada (cierre de O9-RT) | Humo y chispa de las antorchas centrados en `ancla + normal·0,30` en `TorchRig.write()` | O9-RT | Prueba: la trayectoria nunca cruza el plano de la pared |
| WIN-01 | P0 | Agente Windows | Autorizada (creador, 2026-11-17, noche) | Medir y hacer fluido el juego en el PC Windows del creador (RTX 3080 + RTX 2080 en la misma máquina; 36 fps con «Jefe piso 30 · La Espeja», 11 fps en otra partida). Absorbe lo que quedaba de PERF-01 (Junie ya no lo toca). Contrato debajo de esta tabla | PERF-01 (parcial) | ≥ 60 fps de media y p95 ≤ 25 ms a 1920×1080 en la 3080 con las opciones por defecto en pueblo, Iguanera, piso 30 con La Espeja y pisos 1/20/60/100, o el motivo medido de por qué no. Meta `PROPUESTA` del coordinador |


**Contrato de WIN-01 (agente del PC Windows)**

1. **Objetivo:** que el juego vaya fluido en Windows, midiendo antes de tocar. Lo pidió el creador el 2026-11-17 por la noche.
2. **Archivos:**
   - Puede modificar `src/render/**`, la puesta en marcha del motor en `src/main.ts`, `electron/main.ts` y `scripts/qaElectron.mjs`.
   - No toca `src/sim/`, `src/rpg/`, `src/world/`, `data/`, `assets/` ni lo que otro agente tenga sin publicar (`git status`). Las cifras de juego no se cambian.
3. **Paso 0:**
   - `git pull`, `npm ci`, `npm test` y `npm run typecheck` en verde.
   - Comprobar con el panel de rendimiento del juego (línea `GPU …`) qué tarjeta usa Electron.
   - Con dos GPU, `force_high_performance_gpu` no elige entre ellas. Probar Configuración de Windows → Pantalla → Gráficos (Electron en alto rendimiento) y el monitor conectado a la 3080, y anotar el efecto.
4. **Medir antes:**
   - `node scripts/qaElectron.mjs rendimientoHondo` y `node scripts/qaElectron.mjs rendimiento`.
   - A mano, la partida de prueba «Jefe piso 30 · La Espeja» con el panel de rendimiento.
   - Anotar fps, p95, draw calls, mallas activas, esqueletos, sombras y luces. Hacerlo a 1920×1080 y a la resolución real del monitor.
5. **Arreglar:**
   - Un cambio por commit, y volver a medir tras cada uno.
   - Por dónde empezar: lo que dejó PERF-01 (carga de modelos de enemigos de golpe al entrar al piso, luces dinámicas de la cripta, materiales sin `freeze()`), los mapas de sombras, los huesos y las animaciones de modelos lejanos, y el límite de fps o vsync.
6. **Bloqueos:** si un arreglo cambia lo que se ve (quitar sombras por defecto, bajar la calidad o la distancia de vista), no se aplica. Se anota en `docs/ACCIONES_CREADOR.md` para que decida el creador.
7. **Validación:** `npm test`, `npm run typecheck`, `npm run build` y el escenario de Electron del cambio. No se relaja ninguna prueba.
8. **Evidencia:**
   - Los ficheros, en `work/win01/` de esa máquina.
   - Como `work/` no viaja por Git, la tabla antes/después (zona, fps, p95, draw calls, GPU) va en la entrada de `docs/BITACORA.md`.
9. **Integración:**
   - Commits pequeños en `master`, solo con las rutas propias: `git commit -- <rutas>`.
   - `git pull --rebase` antes de `git push origin master`, y nunca `--force`.
   - Al terminar, actualizar esta fila y `docs/ESTADO_ACTUAL.md`. El coordinador revisa contra la tabla.
10. **Reanudación:** leer esta fila, `git log` y `docs/BITACORA.md`, y seguir desde la última medición publicada.

## Lote largo de Junie (2026-11-17, noche)

El creador pidió una cola larga para que Junie siga sola; el coordinador eligió filas técnicas sin cifras ni decisiones abiertas. Detalle y contrato en `work/prompts-noche/COLA_JUNIE.md`. Van detrás de DATA-01, BAL-01 y ED-01.

| ID | Prioridad | Responsable | Estado | Alcance | Depende de | Aceptación |
|---|---|---|---|---|---|---|
| UI-03 | P2 | J | Hecho (2a58e43) | El submenú «Cambiar apariencia» sobrevive al repintado de la mochila al elegir variante, camuflaje o color fijo | — | 6 pruebas verdes, qa:electron 5/5 |
| O9-RT | P2 | J + O | Parcial (8515602); punto 3 en cola de OMP (O9-RT3) | Puntos 1–2 del REPORTE de O9 en el runtime: ancla en el plano de pared (ts*0.5) y yaw por normal (atan2(ny,nx)) en dungeon.ts y dungeonView.ts. Punto 3 (remolino de humo/chispa en TorchRig.write) pendiente para OMP | Integración del modelo O8/O9 (Coord) | 11 pruebas verdes (j16_torches.test.ts), suite 1524/1524 |
| Q09-FIN | P2 | J | Hecho (`6fe019c`), falta captura (EV-01) | Q09 resto: las curas dicen su origen (regeneración pasiva emite heal con source "regen", combatLog muestra "Regeneración") y la tecla 1 elige respuesta en un diálogo (ya implementado en index.ts:1171) | — | 9 pruebas verdes (q09_fin.test.ts) |
| F18-INT | P2 | J | Hecho (`87b36be`) | Cascos, capuchas, sombreros y capas de `equipo.glb` enganchados a cabeza y espalda (código ya conectado; pruebas añadidas) | — | 10 pruebas verdes (f18int_heldGearHeadBack.test.ts) |
| U02-INT | P2 | J | Hecho (`264130a`) | Retrato predeterminado e iconos de las cinco características conectados, con respaldo | — | 16 pruebas verdes (u02int_portraitStats.test.ts) |
| F27-INT | P2 | J | Hecho (`3bfdbf0`) | Los emotes del chat reproducen `Emote_<id>` y vuelven a reposo; dance/sleep bucle 4 s; moverse/daño/cast corta | — | 12 pruebas verdes (f27int_emotes.test.ts) |
| F24-INT | P2 | J | Hecho (`60c5dd1`) | Piloto de tres piezas de `simbolos_istmo.glb` en Iguanera, 6 piezas registradas | — | 10 pruebas verdes (f24int_simbolos.test.ts) |
| D-45 | P2 | J | Hecho (`a6a5e61`) | `npm run content:check`: ids únicos y referencias cruzadas en data/ (15 tipos de referencia) | — | 2 pruebas verdes (d45_contentCheck.test.ts), datos reales sin problemas |
| R08-A | P2 | J | Hecho (`0fe01f0`) | Plantillas con datos de la interfaz fija a `trf()`, en español e inglés (combatLog, HUD, banners, Personaje, spellbook, worldHud) | — | 24 pruebas verdes (r08a_i18nData.test.ts), suite 1607/1607 |
| TC-01 | P1 | J | Hecho (`bae3723`) | `npm run typecheck` en verde: guards en data01_asciiIds.test.ts (m[1], inv[i], item.id/setId), setItemLook en FakeSession, demo_mount en FAKE_CONTENT, inventario actualizado tras addItem en ui03_mountLooks.test.ts | — | 1614/1614, tsc limpio, build OK |
| EV-01 | P1 | J | Autorizada (cierre del lote largo, coordinador 2026-11-17) | Faltan las capturas de Electron que exigían ED-01, F18-INT, F27-INT, Q09-FIN y O9-RT (`work/junie-o9rt/`, `q09fin/` y `f27int/` están vacías), J12 en escena y las danzas de La Espeja en combate (F36-DANZA). Hace falta un escenario de `qaElectron` por cada una | — | Escenarios nuevos en verde con capturas; lo que falle se reabre |
| CAD-01 | P2 | J | Autorizada (cierre de ANIM-01, coordinador 2026-11-17) | Cadencia en juego con los ciclos nuevos (Caminar 1,125 s, Correr 0,708 s), sin cambiar `moveSpeed` ni `runSpeed` | ANIM-01 (hecha) | Los pies no patinan a la vista en Electron; prueba de cadencia de los seis héroes |

## Esperan al creador

Detalle y preguntas en [ACCIONES_CREADOR](ACCIONES_CREADOR.md).

| ID | Responsable | Qué falta |
|---|---|---|
| D-01b | Por asignar | Confirmación C1 (pergaminos por rango) |
| D-01c | Por asignar | Cifra C2 (tasa de pergaminos) |
| D-50 | Por asignar | Informe del nivel máximo 400, sin tocar datos; espera el encargo |
| D-17 | O | Revisión visual del ave (gallote y tijereta) y color de la tijereta. El modelo está en `assets/`, sin integrar por orden del creador |
| JEQ-07, JEQ-08 | J | Qué hallazgos se corrigen: crítico global sin tope, rolls idénticos entre ranuras, oro estancado, sets de aguante y apoyo que no matan |
| D01 | Creador | Distribución y firma en Windows |
| T04 | Creador | Cifras, facción y contrato de la vertical Panamá Viejo y Diablicos Espejos |
| M03, M04 | Creador | Orden de provincias, nombres, escala y desplazamiento |
| Q01, Q02, Q05, Q10, Q13 | Creador | Iguanera, día y noche, XP de arquetipos generados, ataque automático y hechizos de área propia |
| F05, F22, F28, F33, F34 | Creador | Ver, escuchar o elegir: decoraciones, pintura, audio y monturas de desarrollo |

## Sin autorizar

Listas para hacerse cuando el creador lo diga. Texto completo en el histórico.

- **Rebanada 1–10:** D-30 (fichas de las tres zonas; tras D-00), D-10, D-12, D-13 y D-14 (familias y comportamientos nuevos), D-18 (comején y nido), D-20 (misiones 1–5; tras D-30), D-25 (secundarias), D-23 (despertar por clase).
- **Prototipos aislados:** D-02 (obstáculo), D-05 (Brasa), D-04 (Hilos), D-03 (Reclamo).
- **Orden del repo:** D-42 (datos con pareja vieja), D-43 (refactors pequeños, una extracción por entrega).

## Bloqueadas y retiradas

- Bloqueadas hasta cerrar la rebanada: D-11, D-15, D-16, D-19, D-21, D-22, D-24, D-31, D-32.
- D-44: solo si hay choques reales entre agentes.
- D-33: retirada (creador, N7).

## Abiertas del tablero anterior

Parciales o pendientes de antes de la dirección de diseño. No se ejecutan sin autorización; su texto y su evidencia están en el histórico.

| ID | Estado | Qué falta |
|---|---|---|
| T01, T02 | Parcial | Lote humano o estadístico de balance; recorrido completo en Electron |
| T03 | Mantenimiento | Documentación: índice, estado, bitácora y `docs:check` |
| T06, T07, T10 | Pendiente de diseño | Mascotas con hechizos, harpía por misiones, temporadas |
| T08, T09 | Parcial | Regiones renderizadas; interiores y secretos |
| T13 | Pendiente | Vista en vivo en la creación de personaje |
| T14 | Parcial | Iguanera como inicio: tutoriales, viviendas y estatuas |
| R03 | Autorizado, sin integrar | Fuente píxel libre registrada en `PROCEDENCIA.md` |
| R06 | Pendiente | Monturas productivas |
| R08 | Parcial (R08-A autorizada) | Idiomas: frases con datos dentro del código |
| R10 | Parcial | Acción y movilidad del contrato de agua |
| P05 | Espera revisión | `prop_pila_lena` de OMP en `work/omp-utileria-p05/` |
| P12 | Parcial | Resto del pulido de modales |
| M01 | Parcial | Integrar y medir el arte LOD |
| M06, M07 | Parcial | Lugares que esperan su provincia; mar y costa |
| B06, F27 | Parcial (F27-INT autorizada) | Clips y caritas de emotes |
| B07 | Parcial | Edificios por Blender |
| F18, F19, F23, F24 | Arte listo, F18-INT y F24-INT hechas | Cabeza y espalda, caminar, utilería, símbolos |
| A01 | Pendiente | Flora según dónde crece cada especie |
| A03, A06, A07 | Parcial | Aplicar PBR, figuras pendientes, tres puntos de densidad |
| U02 (línea visual) | Arte listo, falta integrar (U02-INT autorizada) | Retrato e iconos de características |
| Q06 | Pendiente | Textos de Iguanera (`PROPUESTA`) |
| Q09 | Parcial (resto en Q09-FIN) | J4d-resto (`01d0b37`) cerró etiquetas, zoom, botín y «Explorado»; UI-01 (`cbd5fed`), el doble clic de la mochila. Quedan «Curas» sin origen y la tecla 1 en diálogos |
| E03 | Parcial | Editor de casas (la mazmorra está hecha) |

## Hechas

Con evidencia en el histórico o en la bitácora. «Falta verlo» quiere decir que el creador aún no lo probó en Electron.

- **2026-11-17:** D-41 (Coord, por el encargo del creador: documentos fechados a `historico/`, `docs:check` en verde). D-01a-fix (`64bd28e`, `tests/d01a_fix.test.ts`). D-01d (`cd4ff62` + `30857a4`: evento `rankUp`, cartel, aviso y agrupación en `rankUpBatch`). D-01d-fix (`30857a4`, `tests/d01d_fix.test.ts`). DATA-01 (`e1f8264`, `tests/data01_asciiIds.test.ts`: id cirílico a ASCII + alias de carga). BAL-01 (`156c03f`, `tests/bal01_caps.test.ts`: auditorías bruta vs efecto en juego). F36 La Espeja. J13 (`a2cb7a7`, `tests/j13_escenografia.test.ts`: escenografía regional en embarcaderos). J14 (`de1b1d3`, `tests/j14_naturaleza.test.ts`: naturaleza modular en Iguanera).
- **Rangos e interfaz:** D-01a, UI-01, JUI-02.
- **Equipo y balance:** EQ-01, EQ-02, EQ-03, EQ-04, EQ-05, EQ-07, EQ-08, T05, T11, T12, R05, R09, R11, R12.
- **Orden del repo:** D-40, TICKET-1, TICKET-2, TICKET-3, TICKET-4, TICKET-6, TICKET-7.
- **Junie, 2026-11-13 a 15:** J1, J2, J4d-resto, J7, J15, J16, J17, ART-01, Q07, T15 (`65218b2`; la fila «Pendiente» repetida del tablero viejo era un duplicado).
- **Banco y comercio:** C01, C02, C03 (sustituido por C06), C04, C05, C06, C07, Q08.
- **Interfaz y mochila (2026-11-08):** U01–U18, falta sentirlas. Los ids U01–U04 se repitieron en la sección «Interfaz: línea visual común» del histórico: allí U01, U03 y U04 están hechos y U02 sigue abierta.
- **Personajes y pulido (2026-11-08):** P01, P02, P03, P04, P06, P07, P08, P09, P10, P11.
- **Mapa:** M00, M02, M05. Las provincias M10–M22 son fichas de diseño, no tareas.
- **Cuestionario:** R01, R02, R04, R07.
- **Reportes del creador:** B01–B05, B08–B15; F01–F04, F06–F17, F20, F21, F25, F26, F29–F32, F35.
- **Arte:** A02, A04, A05.
- **QA:** Q03, Q04, Q11, Q15, Q16; Q12 (`cefd1c4`, `tests/q12_lineOfSight.test.ts`) y Q14 (`174719c`, `tests/cameraFraming.test.ts`), que el tablero viejo seguía dando por pendientes.
- **Editor:** E01, E02.
