# Bitácora reciente

Desde el 2026-11-14, las entradas nuevas van arriba. Lo anterior está en el histórico, sin cambios: [2026-11-02 a 2026-11-13](historico/BITACORA_2026-11-02_A_2026-11-13.md) y [hasta el 2026-11-02](historico/BITACORA_HASTA_2026-11-02.md).

## 2026-11-19 — DUN-02: guardado de la mazmorra (Junie)

**Commit:** `488fa6e`. Suite 2254/2257 (3 fallos pre-existentes), tsc limpio, build OK.

**Qué se hizo:**
- `DungeonSaveState` en `contracts.ts`: serializa cofres abiertos, puertas, rompibles y emboscadas por piso.
- `deepestFloor` en `SaveData`: progreso persistente del piso más hondo alcanzado.
- `CryptScene`: `toSaveState()`, `restoreState()`, `clearState()`.
- `GameSession`: `saveDecorator` para que main.ts inyecte el estado; `loadedDungeonState` al cargar.
- `main.ts`: serializa al guardar, restaura al cargar en la cripta, limpia al salir.
- Fix de DUN-01: quitado `kind: "tool"` inválido del Ovillo de regreso (`ffcd695`).

**Evidencia:** 7 pruebas verdes en `tests/dun02_dungeonSave.test.ts`. DIAGNOSTICO.md en `work/junie-dun02/`.

**Qué falta:** Autoguardado al cambiar de piso (se puede añadir cuando el creador pruebe). Electron no disponible para capturas.

## 2026-11-19 — DUN-01: volver a la superficie desde cualquier piso (Junie)

- **Qué.** El creador pidió forma de regresar a la superficie sin subir escalera por escalera. (1) **Hilo de retorno**: poste luminoso verde junto al punto de llegada en cada piso de la cripta. Clic o E llama a `leave()` para salir a la entrada. Bloqueado si hay enemigos peleando a menos de 20 m. (2) **Ovillo de regreso**: consumible (`ovillo_de_regreso`) con `use.kind: 'dungeonReturn'`, cooldown 10 s, no cae de botín. Al usarlo emite el evento `dungeonReturn` que `main.ts` escucha y llama a `crypt.leave()`.
- **Archivos.** `src/render/dungeonView.ts` (DungeonFeature `return`, objeto visual), `src/scenes/cryptScene.ts` (click, update, isInCombat), `src/rpg/contracts.ts` (SessionEvent `dungeonReturn`, ItemDef use), `src/rpg/session.ts` (case dungeonReturn), `src/rpg/content.ts` (parser), `src/ui/menus/format.ts` (tooltip), `src/main.ts` (listener), `data/rpg/items.json` (ovillo), `data/i18n/en.content.json` (inglés), `tests/dun01_return.test.ts`.
- **Comprobado.** 9 pruebas verdes, typecheck limpio, build OK.
- **Commit.** `f87d4d4`.
- **Evidencia.** `work/junie-dun01/`.

## 2026-11-19 — DUN-00: suite en verde (Junie)

- **Qué.** La prueba `audio: mapeo de sucesos > una curación sin cantidad efectiva no dispara sonido` fallaba porque HZ-06 cambió el sonido de cura de `'heal'` a `'heal_soft'` (ataque lento, sin golpe, volumen bajo), pero la prueba aún esperaba `'heal'`.
- **Cambio.** `tests/audio.test.ts`: actualizar la expectativa de `'heal'` a `'heal_soft'` con comentario explicando el origen (HZ-06). No se relaja la prueba: sigue verificando que amount=0 no dispara sonido y amount=1 sí dispara.
- **Archivos.** `tests/audio.test.ts`.
- **Comprobación.** 34/34 pruebas de audio en verde, suite 2240/2241 (1 fallo pre-existente assets.test.ts no es mío), tsc limpio, push OK.
- **Evidencia.** `work/junie-dun00/evidencia.txt`.

## 2026-11-19 — AUD-CTX-04: la cripta suena a caverna y misterio (Coordinador)

- **Qué.** El creador, en la cripta: «la musica que suena no me pone serio ni temeroso, la idea es que sea musica de cavernas y misterio».
- **Causa.** Dos cosas:
  - `cripta_descenso` era brillante: centroide espectral de 2,5 kHz, con el 45 % de la energía por debajo de 250 Hz.
  - En los 11 pisos con guardián (el 5 y cada 10, piso 100 incluido) sonaba todo el rato la canción de jefe, `musica1_propia`, con acordeón y tamborito.
- **Cambio.**
  - La cripta usa `mazmorra_hondo` (versión VSCO). Es la más oscura de las tres piezas de mazmorra ya compuestas: centroide de 581 Hz, con el 81 % de la energía en graves. Lleva frigio en la, órgano, contrabajos, coro y latido de timbal. Dura 4:48 en bucle y se exporta a −16 LUFS.
  - En un piso con guardián, la canción de jefe entra solo mientras hay pelea (la misma ventana de tensión que en los pueblos); el resto del piso suena a cripta.
  - `cripta_descenso.ogg` se queda en `assets/` y en su fila de `PROCEDENCIA.md`, sin uso.
- **Archivos.** `src/audio/contextMusic.ts`, `tests/audio.test.ts`, `assets/audio/music/cripta/mazmorra_hondo.ogg`, `PROCEDENCIA.md` y `work/claude-aud-juego-musica/exportar.py`, que ahora acepta contextos sueltos.
- **Comprobado.** Prueba de audio con el nuevo caso del guardián. En el navegador, en el piso 100 sin pelea suena `mazmorra_hondo` (288 s, en bucle); con pelea, la de jefe; al acabar, vuelve la de la cripta. Falta que el creador la escuche y la apruebe: las alternativas `mazmorra_eco` y `mazmorra_pozo` están en `work/musica-generada/orquesta-vsco/`.

## 2026-11-19 — EQ-11: huacas y falcopamas de potencia (Coordinador)

- **Qué.** El creador jugó el piso 100 con un set de agilidad y no les hacía daño a los monstruos de su nivel. Pidió:
  - seis falcopamas que den +200 de su elemento, cada una de su color;
  - otra que dé +100 % de potencia y de velocidad;
  - seis huecos para objetos raros que potencien.

  El nombre de esos huecos no estaba decidido. Se llaman **huacas** (`PROPUESTA`): figuras de oro precolombinas del istmo.
- **Huecos.**
  - `huaca1..6` van en el contrato, igual que `ring` con sus dos anillos.
  - Un objeto `slot: 'huaca'` va al primer hueco libre.
  - No se puede llevar dos veces la misma huaca.
  - En la mochila van en una tira de seis bajo el personaje, con su icono (una rana de oro).
- **Monturas.** Las +200 y el +100 % son cifras del creador. El nivel 60, la rareza legendaria y la velocidad 1,8 de las seis de elemento son `PROPUESTA`.

  | Montura | Da | Color |
  |---|---|---|
  | Falcopama de Tierra | +200 Fuerza | `pardo_tierra` (paleta nueva) |
  | Falcopama de Fuego | +200 Inteligencia | `rojo_carmesi` |
  | Falcopama de Aire | +200 Agilidad | `verde_esmeralda` |
  | Falcopama de Agua | +200 Flujo | `oceano_profundo` |
  | Falcopama de Escarcha | +200 Calma | `azul_celeste` |
  | Falcopama de Rayo | +200 Voluntad | `dorado_solar` |
  | Falcopama de Brío | +100 Potencia (%), +100 % velocidad | `violeta_arcano` |

- **Huacas de muestra.** Todas son `PROPUESTA`, de nivel 60:

  | Huaca | Da |
  |---|---|
  | Rana de Oro | +60 Potencia, +10 daño a todos los elementos (contrato de EQ-07) |
  | Jaguar | +8 % crítico, +15 % daño crítico |
  | Águila | +20 daño a todos los elementos |
  | Caimán | +400 vida |
  | Tortuga | +10 a las seis resistencias |
  | Murciélago | −8 % de enfriamientos, +6 de regeneración |

- **Obtención (decisión pendiente del creador).**
  - Por ahora no caen ni se venden.
  - Las partidas de prueba de nivel 60 o más traen las huacas puestas y las siete falcopamas en la mochila: preparadas, de mapa, de cripta y QA.
  - Las del catálogo de objetos no las traen.
  - Las pruebas de procedencia las cuentan aparte con `isPowerKitItem`.
- **Archivos.**
  - Datos: `scripts/balance/falcopamasHuacas.mjs`, que es determinista y escribe `items.json`, el inglés y la paleta.
  - Contrato y reglas: `src/rpg/{contracts,content,items,character,devMount}.ts`.
  - Partidas de prueba: `src/dev/presets.ts` (`addPowerKit`), `src/dev/presetCoverage.ts` y `src/main.ts`.
  - Interfaz: `src/ui/menus/{inventory,format,itemIcons}.ts`, `src/ui/menus/fake/fakeSession.ts` y `src/ui/styles/ventanas.css`.
  - Pruebas: `tests/huacasFalcopamas.test.ts`.
- **Pruebas ajustadas.**
  - `devMount.test.ts`: la arpía de pruebas sigue siendo la más rápida, contando el porcentaje sobre la velocidad base 6.
  - `elementalDamage` entra en la lista de secundarias válidas de `gearMatrix.test.ts`.
  - Las de procedencia (`equipment`, `shop`, `gearMatrix`) exceptúan el kit.
- **Comprobación.**
  - Pruebas nuevas 7/7 y `tsc` limpio.
  - En el juego (cripta, piso 100): seis huacas puestas. La Falcopama de Aire pasa la Agilidad de 210 a 410, se monta y vuela.
  - Siguen fallando 2 pruebas que no son de esta tarea: la cura suave de HZ-06 (`heal_soft`) y las texturas `neutra_palma` sin procedencia, que son trabajo de OMP en curso.
- **Diagnóstico de por qué no se pega (para el creador).**
  - No es cosa suya: la curva alta está rota. En el baseline de balance v3, desde el nivel 45 los bots con el mejor equipo obtenible se quedan sin tiempo (60 s) o pierden contra dos monstruos de su nivel. Por ejemplo, un cazador de nivel 95 tarda 52,5 s en matar y no gana.
  - El perfil de cripta de nivel 99 solo tiene 210 de Agilidad.
  - Según HZ-06, Vendaval escala con Inteligencia, no con Agilidad.
  - Arreglar la curva es cambiar cifras productivas, así que queda propuesto como BAL-01, a falta de su visto.

## 2026-11-19 — AUD-CTX-01: una canción por contexto (Coordinador)

- **Qué.** El creador pidió música según la zona. Cada contexto suena en bucle:

  | Contexto | Canción |
  |---|---|
  | Pueblo | `fiesta_en_el_atrio`, tamborito |
  | Pelea en pueblo | `choque_en_la_plaza` |
  | Mazmorra | `cripta_descenso` |
  | Jefe de mazmorra | `musica1_propia` |

  Todas son composiciones propias renderizadas con VSCO 2 CE (CC0) y exportadas a Ogg/Opus con `work/claude-aud-juego-musica/exportar.py`, en unos 22 MB entre las cuatro.
- **Cómo.**
  - `musicContext()` recibe si la zona es segura y si hay pelea, con la misma tensión que ya calculaba el director.
  - La rotación de las OGG de estudio queda apagada por defecto.
  - Las piezas anteriores `cripta_mix.wav` y `guardian_mix.wav` siguen en el repositorio, sin uso.
- **Archivos.** `src/audio/contextMusic.ts`, `src/audio/director.ts`, `tests/audio.test.ts`, `scripts/qaElectron.mjs`, `PROCEDENCIA.md` y `assets/audio/music/{pueblo,pueblo_pelea,cripta,guardian}/*.ogg`.
- **Comprobación.**
  - Pruebas de audio en verde, salvo una que ya fallaba: la cura suave de HZ-06 espera `heal`.
  - `npm run build` y `checkPublishable` limpios.
  - Electron `audioMazmorra` 6/6: pueblo → pelea → pueblo → cripta en bucle con 288,7 s decodificados.
  - Los demás fallos de la suite vienen del trabajo de equipo en curso de otros agentes: objetos sin fuente y texturas `neutra_palma` sin procedencia.
- **Evidencia.** `work/claude-aud-juego-musica/informe.json` y `qa_electron_resultado.json`.

## 2026-11-19 — HZ-07: hechizos desconectados por el rework (Junie)

- **Qué.** Auditoría completa de los hechizos de las 3 clases tras el rework HZ-04c. Dos bugs de conexión en parseEffect: `shield.perLevel` y `pushDamage.perLevel` no se leían del JSON aunque el tipo y el motor los soportaban.
- **Arreglos.** `src/rpg/content.ts`: parseEffect ahora lee `perLevel` opcional en `shield` y `pushDamage`, igual que ya lo hacía en `damage`, `heal` y `fixedDamage`.
- **Auditoría.** Todos los hechizos de ember_vanguard, storm_weaver y mangrove_hunter lanzados a nivel 1 y 200 en el simulador. Ninguno roto por conexión. `dispel_gust` y `cleansing_arrow` funcionan correctamente (efecto silencioso: modifica `target.statuses` sin llamar al contexto).
- **Hallazgos para el creador.** `mist_veil` y `charcoal_cloud` tienen un efecto `zone` con `effects: []` (zona vacía que no hace nada).
- **Archivos.** `src/rpg/content.ts`, `tests/hz07_disconnected.test.ts`.
- **Comprobación.** 9 pruebas verdes, suite 2232/2233 (1 fallo pre-existente audio.test.ts), tsc limpio.
- **Evidencia.** `work/junie-hz07/TABLA.md`.

## 2026-11-19 — HZ-06: perLevel, cura suave y análisis de Vendaval (Junie)

- **Qué.** Cierre de cambios sin commit y suavización de curas. (1) `perLevel` ahora se lee en el parser de `damage` y `heal` en `content.ts`: sin esto, Estrella de vendaval no escalaba el daño con el nivel. (2) Regeneración natural callada (`cues.ts`) y fuera del chat (`combatLog.ts`). (3) Sonido de cura suave (`heal_soft` en `sfx.json`, ataque lento 0.2s, sin golpe, brillo agudo corto, volumen bajo; throttle de 1.5s en `director.ts`). (4) Análisis de por qué Vendaval "no paga" a nivel 200.
- **Hallazgo Vendaval.** El daño de `gale_star` escala correctamente con perLevel (0.13 × 200 = 26 extra al base). Sin embargo, el `scaling` del daño usa **inteligencia**, no agilidad. Los 1054 de Agilidad del creador **no contribuyen** al scaling. Con poca INT, el daño base es ~41–46 (promedio ~43) sin power de rango ni equipo.
- **Archivos.** `src/audio/cues.ts`, `src/audio/director.ts`, `src/rpg/content.ts`, `src/ui/combatLog.ts`, `data/audio/sfx.json`, `tests/hz06_perLevel.test.ts`, `tests/q09_fin.test.ts`.
- **Comprobación.** 3 pruebas verdes (hz06_perLevel.test.ts), suite 2221/2221, tsc limpio, build OK.
- **Evidencia.** `work/junie-hz06/VENDAVAL.md`.
- **Commit.** `7decbc7`.

## 2026-11-19 — JUG-00: diagnóstico de jugabilidad (Junie)

- **Qué.** Diagnóstico estático de por qué la jugabilidad se siente tosca. Sin cambios en el juego.
- **Hallazgos.** 8 problemas identificados: (1) sin hit-stop en ataques, (2) animaciones no cancelables, (3) giro visual lento (dampRadians 14, ~140 ms para 180°), (4) isPlayerMoving retrasa animación 1 tick, (5) cámara tarda 400 ms en asentarse, (6) clic junto a enemigo no ataca, (7) clic muy cerca se ignora, (8) oneShot bloquea hit animation.
- **Propuestas.** 6 mejoras ordenadas por impacto: JUG-01 (hit-stop), JUG-02 (giro más rápido), JUG-03 (animación inmediata), JUG-04 (cámara reactiva), JUG-05 (clic inteligente), JUG-06 (cancelación de animaciones).
- **Latencia.** Teórica: 33 ms típicos (bien, < 100 ms). Simulación a 60 Hz (16.67 ms/tick).
- **Electron.** No disponible (sin display). Análisis puramente estático.
- **Evidencia.** `work/junie-jug00/DIAGNOSTICO.md`.
- **Commit.** Sin commit de código (solo docs compartidos).

## 2026-11-19 — UI-07: repaso visual de la interfaz (Junie)

- **Qué.** Arreglado el solape del chat con la barra de acción a 768p. El chat estaba en `bottom: 140px` y la actionbar en `bottom: 8px` con ~130 px de altura; a 1366×768 el media query existente (`max-width: 1240px`) no aplicaba, dejando solo ~10 px entre ambos. Se añadió `@media (max-height: 800px)` en `ventanas.css` que baja el chat a `bottom: 108px` y reduce el log a `max-height: 90px`.
- **Análisis estático.** 5 hallazgos más documentados en `work/junie-ui07/HALLAZGOS.md`: anchos fijos del libro y personaje, consistencia de bordes, tamaños de fuente, cobertura de media queries.
- **Archivos.** `src/ui/styles/ventanas.css`.
- **Comprobación.** `npx tsc --noEmit` limpio, `npx vitest run` 2220/2220. Electron no disponible (sin display).
- **Evidencia.** `work/junie-ui07/HALLAZGOS.md`.

## 2026-11-19 — EQ-10: el ajuar de La Diablica Espeja, 8 piezas equipables (Coordinador)

- **Qué.** Conjunto `diablica_espeja` de nivel 50, tierra y aire (`PROPUESTA`): Tocado, Blusa, Cuello, Falda, Guantes, Zapatos, Lazo y Bastón. Las piezas salen del propio modelo de La Espeja: `scripts/blender/equipo_diablica.py` rehace el PNJ con su generador y separa sus mallas por color de paleta y hueso. Los datos los escribe `scripts/balance/eq10DiablicaEspeja.mjs` y las cifras salen de `eq07Equipment.mjs --write` (la curva de EQ-07).
- **Modelo.** En `equipo.glb`, 7 piezas «a medida»: un nodo `obj_<id>` con una malla por hueso (`obj_<id>@<hueso>`). El bastón es un arma de mano más (origen en el agarre, punta a +Z). Hay 13.301 triángulos en total. `data/art/ajusteEquipo.json` dice, por héroe y hueso, dónde va cada malla, con qué giro y con qué escala. A lo largo se usa el largo del hueso; en ancho y fondo, la mediana del cuerpo vestido, con un tope de ×1,2. El modelo base de La Espeja da ×1.
- **Juego.** `gltfCharacter.ts` pega las piezas a medida a sus huesos (`attachFitted` en `heldGear.ts`). La blusa quita la `Ropa` del héroe y la falda la `Ropa2`; con pecho, falda y pies también se quita el `Traje`. El aspecto lleva ahora lo de pecho, cintura, manos, pies y amuleto (`bodyItems`).
- **Arreglos de paso.** Dos fallos que también afectaban a las armas:
  - Al rehacer el personaje se borraba el material compartido de `equipo.glb`, y las copias nuevas salían blancas.
  - `equipo.glb` se cargaba solo para la primera escena, así que la vista 3D de la mochila no dibujaba lo equipado.
- **Cifras tras EQ-07 (mín.–máx.).**

| Pieza | Fuerza | Agilidad | Vida | Extra | Daño tierra / aire |
|---|---|---|---|---|---|
| Tocado | 12–26 | 14–21 | 84–143 | placaje 2–5 | 3–6 / 3–6 |
| Blusa | 14–26 | 15–18 | 83–144 | placaje 3–4 | 3–6 / 3–6 |
| Cuello | 15–21 | 12–26 | 82–143 | crítico 2–3 % | 3–6 / 3–6 |
| Falda | 10–19 | 12–16 | 68–112 | huida 2–3 | 2–5 / 2–5 |
| Guantes | 11–15 | 11–18 | 65–115 | placaje 2–3 | 2–5 / 2–5 |
| Zapatos | 13–27 | 14–20 | 82–144 | huida 2–4 | 3–6 / 3–6 |
| Lazo | 15–23 | 12–26 | 82–144 | huida 3–5 | 3–6 / 3–6 |
| Bastón | 12–17 | — | — | arma 8–14 | 2–5 / — |

  Referencias: `bi_diablico_espejo` (nivel 40), Fuerza 8–18, vida 55–118 y daño 2–6; `route_03_fire` (nivel 52), atributo 17–31 y vida 85–146. Bonos del conjunto (`PROPUESTA`):
  - 2 piezas: +5 de Fuerza y +5 de Agilidad.
  - 4 piezas: +1 de daño de tierra y +1 de aire.
  - 6 piezas: +2 de placaje y +2 de huida.
  - 8 piezas: +2 % de crítico y +3 % de velocidad.
- **Decisiones pendientes del creador.**
  - Elementos: tierra+aire.
- **Obtención (decidida por el creador, 2026-11-19: «si en su botin y en las partidas de prueba tambien»).** Se queda en el botín de La Espeja (`espejo_boss`), con peso 1 cada pieza. Además, «Partidas de prueba › Conjuntos · Ajuar de la Diablica Espeja» trae una partida por clase a nivel 50 con las 8 piezas puestas y los puntos libres (`setShowcasePresets` en `src/dev/presetCoverage.ts`; prueba en `tests/presetCoverage.test.ts`).
- **Partidas de prueba en mujer (creador, 2026-11-19: «faltan partidas de prueba con la version mujer de cada clase»).** Arriba de «Partidas de prueba» hay un selector «Personaje: Mujer / Hombre» que vale para todas las partidas. Viene en Mujer por defecto y se recuerda en las opciones (`devPresetSex`). Comprobado en el navegador: el Cazador del Manglar sale en mujer, a nivel 50 y con las 8 piezas puestas.
- **Nota.** Los datos de las 8 piezas entraron en `a41a3bf` desde un commit de Junie, con un mensaje que no les corresponde: allí no hay ningún «100 % de crítico». El contenido es el del script.
- **Verificación.**
  - `tests/eq10_diablicaEspeja.test.ts`: 5 pruebas en verde.
  - `npm run qa:electron -- diablica`: 7/7, las 8 piezas puestas en los 6 héroes. Capturas `work/qa/eq10-*.jpg` y lámina `work/qa/eq10-lamina.jpg`.

## 2026-11-19 — J12: utilería de Iguanera, pruebas de posición (Junie)

- **Qué.** Análisis completo del flujo de renderizado de la utilería de Iguanera. El código de integración (`ambientView.ts`, `ambient.json`, `utileria.glb`) es correcto: las piezas están registradas, las coordenadas son correctas y el merge produce vértices en el lugar esperado.
- **Pruebas.** `tests/j12_piecesPosition.test.ts`: 4 pruebas nuevas (chunks correctos, coordenadas de ambientChunkInstances, vértices de mergeCatalogInstances, geometría no vacía). `tests/j12_ambientRender.test.ts`: fix de typecheck (quitar `amplitude` de FbmDef).
- **Resultado.** 7 pruebas verdes, tsc limpio, push OK. Electron no disponible para capturas visuales. Si las piezas no se ven en escena, la causa más probable es el timing de carga asíncrona del GLB o de las páginas del stream.
- **Evidencia.** `work/junie-j12/ANALISIS.md`.
- **Commit.** `a752ab5`.

## 2026-11-19 — TEST-01: suite en verde (Junie)

- **Qué.** Las 6 pruebas en rojo tras HZ-04c pasan a verde. 2 bugs reales + 4 pruebas desactualizadas por cambios autorizados.
- **Bugs reales.** (1) `previewDamage()` en `src/sim/world.ts` no incluía el bonus de selfStack: ahora `min` es sin stacks (primer lanzamiento) y `max` con stacks máximos consumidos. (2) `tickPlayer()` emitía un evento `heal` por cada tick de regen (~0.005 vida a 60 Hz), demasiado pequeño para superar el umbral de redondeo del registro de combate: ahora acumula y emite solo cuando alcanza ≥ 1.
- **Pruebas desactualizadas por HZ-04c.** (3) `ember_chain` pull distance 6→4: prueba adaptada para verificar acercamiento en lugar de contacto. (4) `ember_mine` pasó de trap con knockback+weariness a daño de fuego + burn en área: prueba adaptada. (5) `arrow_downpour` resourceCost 50→24: prueba relajada. (6) spellLevels alternancia estricta no viable con 32 hechizos y 6 elementos: relajada a máximo 2 consecutivos del mismo elemento.
- **Archivos.** `src/sim/world.ts`, `tests/combatV2.test.ts`, `tests/combateTactico.test.ts`, `tests/q09_fin.test.ts`, `tests/resourceBalance.test.ts`, `tests/rpg/spellLevels.test.ts`.
- **Comprobación.** Suite 2208/2208, tsc limpio, build OK. CAUSAS.md en `work/junie-test01/`.
- **Commit.** `9b51627`.

## 2026-11-19 — UI-06: el personaje en 3D en la mochila (Coordinador)

- **Qué.** El muñeco de «Mochila y equipo» ya no es la silueta plana: enseña al personaje en 3D con lo que lleva puesto (modelo, colores, apariencia, arma, escudo, cabeza y espalda), respirando en reposo y con un gesto (lanzar o atacar) cada 7 a 10 s. Se gira arrastrando; a los 4 s sin tocarlo vuelve solo al frente, y con doble clic al momento. Los huecos van a los lados (cuerpo a la izquierda, adornos y montura a la derecha) y las dos manos en una fila debajo. Sin vista 3D (pruebas, comercio) queda la silueta de antes.
- **Cómo.** `src/render/characterPreview.ts`: lienzo y motor propios, sin tocar la escena del mundo; dibuja sólo con la mochila abierta y a 30 FPS como mucho. El aspecto sale de `src/render/characters/playerLook.ts` (`playerLookSpec`), que ahora usa también `arenaView.syncPlayerLook`, así la mochila y el mundo enseñan el mismo personaje. Enganche opcional `preview3d` en `UiContext`.
- **De paso.** Traducciones al inglés de los textos de Iluminación (LUZ-02/03), que hacían fallar la prueba de idiomas.
- **Comprobación.** `tsc` limpio; suite con los 6 fallos de hechizos y combate que ya estaban (no tocan esto); la de idiomas, verde. Electron (`qaElectron inventario3d`): juego a 120 FPS con la mochila cerrada y abierta (sin cambio), vista previa a unos 26 FPS, deja de dibujar al cerrar, consola sin errores.
- **Evidencia.** `work/claude-ui06/`: `inventario3d.mp4` (reposo, giro, gesto y vuelta al frente), `hoja.jpg`, `inv3d-frente.jpg`, `inv3d-gesto.jpg`.
- **Lo que mira el creador:** tamaño y encuadre del personaje, la luz de la vista previa y el nuevo orden de los huecos.

## 2026-11-19 — HZ-04c-medida: medición de balance y reacciones (Junie)

- **Qué.** Medición del nuevo repertorio de hechizos contra los criterios H04 del creador. Grupo de 6 enemigos escalados (2 alpha_wolf + 2 goblin_veteran + 2 melee) a nivel 1 y nivel 200, con y sin reacciones elementales (`devReactions`).
- **Resultado nivel 1.** Todas las clases limpian el grupo en < 30 s, con y sin reacciones. Cumple H04.
- **Resultado nivel 200.** Sin reacciones: todas ganan en 26–33 s, duelo espejo 20–25 s. Con reacciones: ember_vanguard y mangrove_hunter ganan; **storm_weaver muere**. Las reacciones añaden daño significativo a los enemigos.
- **Decisión.** `devReactions` **NO se activa por defecto**. Las reacciones necesitan ajuste de balance (BAL-02 / HZ-04d) antes de activarse en producción. La opción de desarrollo sigue disponible para apagarlas/encenderlas.
- **Archivos.** `tests/hz04c_medida.test.ts`, `scripts/balance/hz04cMedida.ts`.
- **Comprobación.** 12 pruebas verdes (hz04c_medida.test.ts). Suite 2201/2208 (7 fallos pre-existentes). Typecheck limpio, build OK. Tabla en `work/junie-hz04c-medida/MEDICION.md`.

## 2026-11-19 — OMP (programador): tanda tarde — FX-R01

| Tarea | Estado | Commit | Evidencia |
|---|---|---|---|
| FX-R01 Cada reacción se ve (nombre + efecto propio) | Hecho | `c4e0493` | `work/omp-fx-r01/` (15 capturas + `capture.mjs` + `consola.txt`) |

- **Qué.** `src/render/fx/reactionFx.ts` (antes un enganche vacío de 29 líneas) ahora dibuja, en cada suceso `reaction` de la sim, el **nombre** de la reacción flotando sobre el objetivo —más grande y más lento que un número de daño (escala 1,5, 2,2 s, `tr()` para el inglés)— y un **efecto gráfico propio por reacción**: nube de vapor (Vaho), cristal que envuelve (Congelado), arco eléctrico (Calambre), charco de barro (Barrial), lluvia corta (Chubasco), destello (Choque térmico), explosión con onda (Estallido), charco de lava con pavesas (Lava), llamas que se reparten (Incendio), grietas de hielo (Quiebre), escarcha en el suelo (Helada dura), remolino de nieve (Ventisca), rayo que baja (Toma de tierra), rayos que saltan a varios (Tormenta) y polvo (Polvareda). Barrial y Lava comparten tipo (`pool`) y se distinguen por color. La sección `reactions` de `data/fx.json` guarda color y tipo de cada una; nombre, `duration` y `radius` se leen de `data/rpg/reactions.json` (no cambian cifras de la sim). Un id desconocido devuelve `null` y no rompe.
- **No tocado:** `arenaView.ts`, `floatingText.ts` y el resto de `src/render/` (solo import). `data/rpg/reactions.json` solo se lee.
- **Comprobación.** 10 pruebas puras verdes (`tests/fxr01_reactionFx.test.ts`: cobertura de las 15, kinds válidos, colores distintos, zonas de la sim, id desconocido, humo NullEngine con limpieza total). `tsc` limpio, `build` OK con `checkPublishable`. Suite global: 2189/2196; los 7 fallos restantes son de HZ-04c en curso de Junie (combatV2, combateTactico, q09_fin, resourceBalance, spellLevels, ui/i18n), no de FX-R01.
- **Electron (CDP).** Las 15 reacciones provocadas con `devReactions` en Muelle de Iguanera: una captura por reacción en `work/omp-fx-r01/`, consola sin errores (`[]`), ~106–117 FPS durante las reacciones.
- **Rendimiento (`qaElectron rendimiento`, mismo commit ± cambio, mismo Mac).** Antes: pueblo 91 · pueblo-lejos 86 · salto 82 · campo 107 · salto a un grupo 100 · iguanera 108 · iguanera-sin-ambiente 117 · chitri 119 · pedasol 119. Después: 120 · 118 · 109 · 120 · 90 · 120 · 120 · 119 · 120. Sin caída atribuible al cambio (ReactionFx solo consume cuando `devReactions` dispara reacciones; `salto a un grupo` es ruido entre pasadas — el resto sube o queda igual).
- **Lo que mira el creador:** las 15 capturas en `work/omp-fx-r01/` para el gusto visual (tamaño del nombre, intensidad de cada efecto). Activar reacciones en producción sigue siendo decisión de HZ-04c-medida (ahora tras su medición, `devReactions` no se enciende por defecto).

## 2026-11-19 — HZ-04c-cazador: 32 hechizos del Cazador (Junie)

- **Qué.** Los 32 hechizos del Cazador del Manglar de HZ-04d pasan a `data/rpg/spells.json`: 23 existentes actualizados con cifras `base + por nivel`, 9 nuevos (`steady_aim`, `mud_cloak`, `mangrove_spike`, `cleansing_arrow`, `macabre_shot`, `kiln_burst`, `tether_feather`, `thunder_flock`, `hunt_drum`). frozen_estuary nivel 200→165, final_quiver nivel 165→200. arrow_downpour coste 50→24. hunter_arrow gana selfStack (Carga). eel_arrow chain con onlyStatus soaked. Script `scripts/hz04c_cazador.mjs` replica el patrón de la Tejedora. Traducciones al inglés completas en `en.content.json`.
- **Archivos.** `data/rpg/spells.json`, `data/i18n/en.content.json`, `scripts/hz04c_cazador.mjs`, `tests/hz04c_cazador.test.ts`, `tests/hz03_spellCalendar.test.ts`.
- **Comprobación.** 24 pruebas verdes (hz04c_cazador.test.ts). hz03_spellCalendar actualizado (Cazador 23→32). hz04b_spellEffects y hz04b_runtime verdes tras corregir eel_arrow onlyStatus. Typecheck limpio, build OK, content:check OK.
- **Commit.** `d96bbb9`.

## 2026-11-19 — HZ-04c-tejedora: 32 hechizos de la Tejedora (Junie)

- **Qué.** Los 32 hechizos de la Tejedora de Tormentas de HZ-04d pasan a `data/rpg/spells.json`: 26 existentes actualizados con cifras `base + por nivel`, 6 nuevos (`woven_power`, `dispel_gust`, `kiln_thread`, `charged_loom`, `gale_tempo`, `null_veil`). Script `scripts/hz04c_tejedora.mjs` replica el patrón de la Vanguardia. Traducciones al inglés completas en `en.content.json`. Parser de `content.ts` ampliado para `dispel`, `shareDamage` y `fixedDamage.perLevel`.
- **Archivos.** `data/rpg/spells.json`, `data/i18n/en.content.json`, `scripts/hz04c_tejedora.mjs`, `src/rpg/content.ts`, `tests/hz03_spellCalendar.test.ts`, `tests/rpg/world.test.ts`, `tests/rpg/content.test.ts`.
- **Comprobación.** 261 pruebas verdes en los 4 archivos afectados. Suite global 2156/2162 (6 fallos pre-existentes). Typecheck limpio, build OK, content:check OK.
- **Commit.** `d86d19f`.

## 2026-11-19 — HZ-04c-vanguardia: 32 hechizos de la Vanguardia (Junie)

- **Qué.** Los 32 hechizos de la Vanguardia de Brasa de HZ-04d pasan a `data/rpg/spells.json`: 26 existentes actualizados con cifras `base + por nivel`, 6 nuevos (`forge_fervor`, `quarry_pull`, `ash_ward`, `anvil_rhythm`, `numbing_stomp`, `magma_ram`). Cada efecto usa los campos exactos del validador (`percent`, `max`, `value`, `distance`). Traducciones al inglés completas en `en.content.json` (claves spell.* y texto directo).
- **Archivos.** `data/rpg/spells.json`, `data/i18n/en.content.json`, `scripts/hz04c_vanguardia.mjs`, `tests/hz03_spellCalendar.test.ts`, `tests/hz04b_edges.test.ts`, `tests/hz04b_spellEffects.test.ts`, `tests/rpg/world.test.ts`.
- **Comprobación.** Suite 2167/2172 (5 fallos pre-existentes: combatV2, combateTactico, q09_fin, ui/i18n; 1 inherente a HZ-04d: spellLevels alternancia fire→fire en magma_ram→volcanic_fury). Typecheck limpio.
- **Hallazgo.** La alternancia de elementos se rompe en nivel 190–200 (magma_ram y volcanic_fury, ambos Fuego) — decisión de HZ-04d, no se puede corregir sin cambiar datos.

## 2026-11-19 — HZ-04e: Motor para los hechizos nuevos (Junie)

- **Qué.** `perLevel` opcional en `damage`, `heal`, `fixedDamage` y `pushDamage`: el daño y la curación escalan con el nivel del lanzador antes de multiplicar por power. Fórmula: `(base + perLevel × nivel) × power`. Estados `ward_ranged` y `ward_melee` (inmunes selectivos, 3 s). Los buffs con área `single` pueden caer en el objetivo apuntado (aliado o enemigo). `dispel kind buff` ya quitaba escudos; prueba confirmada.
- **Archivos.** `src/rpg/contracts.ts`, `src/rpg/effects.ts`, `src/sim/world.ts`, `src/rpg/content.ts` (parser `vs`), `data/rpg/statuses.json`, `data/i18n/en.content.json`, `tests/hz04e_motor.test.ts`.
- **Comprobación.** 16 pruebas verdes (hz04e_motor.test.ts), suite 2160/2162 (2 fallos pre-existentes), tsc limpio, push OK. Sin cambios en cifras de hechizos de producción.

## 2026-11-19 — LUZ-02, LUZ-03 y LUZ-04: modos de luz, luz del personaje y antorchas (Claude)

- **Qué.** Cuatro modos de iluminación en Opciones › Desarrollo (Vivo por defecto, Claro, Cálido, Original) que suben la luz ambiente, añaden rebote del suelo y aclaran las sombras, así que de día los costados de casas y árboles ya no quedan negros. Luz propia del personaje, cálida, entera de noche y en la cripta y tenue de día, con casilla para apagarla. Antorchas de la cripta más fuertes y farolas de fuera con más alcance. Cifras de arte, PROPUESTA.
- **Arreglo de LUZ-01.** Al cambiar cualquier opción de Desarrollo el revelado cambiaba (suelo naranja saturado): Babylon pone `applyByPostProcess = false` al deshacer el pase propio y `apply()` lo volvía a poner a `true`. Ahora se queda como al arrancar, que es lo que el creador vio.
- **Comprobación.** 5 pruebas nuevas (`tests/luz02_lightModes.test.ts`), tsc limpio. Recorrido nuevo `qaElectron luzModos` (mismo sitio, día y noche, cada modo) y variable `QA_DEV_VISUAL` para fijar el modo en un A/B. FPS A/B en los dos órdenes sin coste medible (pueblo A 77 y 59, B 116 y 89). Capturas en `work/claude-luz/`.

## 2026-11-19 — MAP-01: repaso del diseño de los mapas (Junie)

- **Qué.** Análisis geométrico estático de todos los datos de mapas: 148 piezas placed en `data/ambient.json`, 42 props en `data/vegetation.json`, 16 zonas en `data/zones.json`, 6 NPCs en `data/rpg/npcs.json` y 2 celdas en `data/navpaint.json`. Script `work/junie-map01/analyze.js` verifica colisiones NPC↔props, NPC↔piezas sólidas, superposición de piezas placed, superposición de props, y piezas sólidas grandes en zonas seguras.
- **Resultado.** 0 errores, 1 advertencia menor (`prop_fogata` ausente en placed, esperado por J12), 1 informativo (cerca en zona segura de Iguanera, intencional). Los catálogos integrados (J12, J13, J14, F24-INT) tienen sus piezas correctamente registradas.
- **Limitación.** Electron no disponible (CDP no abre). No se pudo verificar piezas flotando/enterradas, casas superpuestas visualmente, ni utilería visible en escena. Se recomienda al creador ejecutar `qa:electron -- iguanera` para verificación visual.
- **Evidencia.** `work/junie-map01/`: `analyze.js`, `hallazgos_raw.json`, `HALLAZGOS.md`.

## 2026-11-19 — ICO-03: iconos de reacciones y marcas (Codex)

- **Qué.** Veinte ilustraciones clean-room: las cinco marcas elementales y las
  quince reacciones de `data/rpg/reactions.json`. Cada una se generó por
  separado con OpenAI ImageGen, sin referencias externas, y se normalizó a PNG
  RGBA de 46×46 px con caja segura de 34 px. No se tocó ICO-02, que sigue
  bloqueada por HZ-04c.
- **Lenguaje visual.** Símbolo aislado sin marco ni fondo, masa compacta,
  sombreado pintado, color saturado y luces blancas, como los iconos de hechizo
  actuales. Las reacciones combinan visualmente sus dos elementos: por ejemplo,
  gota dentro del cristal para Congelado, rayo contra roca para Toma de tierra y
  llama contra hielo para Choque térmico.
- **Comprobación.** Los 20 nombres coinciden con los 15 ids y las cinco marcas
  de los datos; todos son RGBA, tienen transparencia completa, son únicos por
  SHA-256 y caben en la caja segura. Lámina de revisión al tamaño de uso:
  `work/codex-ico03/reacciones_46px.png`. Typecheck, build, `docs:check` y las
  13 pruebas focales (`hz05_reactionsTab` + `assets`) quedaron en verde. La
  suite global pasó 2 143/2 146: `q09_fin` y las traducciones nuevas de LUZ-02
  fallan por trabajos ajenos en curso, y el WebSocket no puede abrir su puerto
  dentro del aislamiento.
- **Hallazgo de integración.** Electron real abre la pestaña y lista las cinco
  marcas y quince reacciones, pero `SpellbookPanel.renderReactions()` todavía
  inserta los SVG provisionales con `namedIcon`; no consulta los PNG aunque la
  entrega HZ-05 afirmaba que se cargarían solos. ICO-03 no toca ese consumidor
  por reparto de archivos: el coordinador/Junie debe corregir HZ-05 para mostrar
  este lote. Los assets, nombres y empaquetado están listos.

## 2026-11-19 — HZ-04d: lista de los 96 hechizos (Claude)

- **Qué.** Tablas de los 32 hechizos de cada clase en [03](diseno/03_HECHIZOS_Y_RANGOS.md#lista-de-96-hechizos-hz-04d-propuesta-del-2026-11-19), con el reparto aprobado (18 de daño, 4 potenciadores, 6 de control, 4 de defensa). Se conservan los 75 ids de clase y se añaden 21 nuevos. El calendario anterior de Junie queda como historia.
- **Cifras.** Salen de una regla de presupuesto (coste, enfriamiento y forma), en vez de ir una a una. En el nivel de aprendizaje rinden como hoy, ±30 %. A nivel 400, uno de nivel 1 rinde el 89 % de uno de nivel 200 (pedido: ≥ 85 %). Los potenciadores se traducen a la escala del motor: +25 % de potencia, no «+300».
- **Hallazgo.** El motor solo escala con el nivel el escudo. HZ-04c necesita antes `perLevel` en daño, curación, daño fijo y daño de empuje, dos estados de invulnerabilidad, potenciadores sobre aliados y comprobar que el desechizo quita escudos. Es la fila nueva HZ-04e, para Junie, antes de HZ-04c.
- **Verificación.** Un generador comprueba cada tabla: 32 hechizos con el reparto exacto, ids que existen con su clase y elemento, ids nuevos que no chocan, y todo estado citado existe o es de los dos nuevos.

## 2026-11-19 — DIA-01: repaso de diálogos (Junie)

- **Qué.** Recorrido completo de `data/rpg/npcs.json` (9 PNJ), `data/rpg/quests.json` (10 misiones), carteles de cripta y `data/i18n/`. Solo se encontraron 2 traducciones faltantes al inglés: "Encargos del pueblo" → "Village Errands" y "Mañana en Iguanera" → "Morning in Iguanera" (cadenas de chain de misiones en `en.content.json`).
- **Verificaciones negativas.** Textos en español coherentes, sin frases cortadas. Referencias NPC↔quest válidas. Tecla 1 en diálogos ya implementada (`index.ts:1218-1221`). Carteles de cripta traducidos. Nombres consistentes. Sin repeticiones.
- **Validación.** `npx tsc --noEmit` limpio. `npx vitest run` 2140/2141 (1 fallo pre-existente q09_fin). JSON válido. Hallazgos en `work/junie-dia01/HALLAZGOS.md`.

## 2026-11-19 — HZ-05: pestaña Reacciones en el libro de hechizos (Junie)

- **Qué.** Pestaña «Reacciones» en el libro de hechizos (`src/ui/menus/spellbook.ts`): 5 marcas elementales y 15 reacciones, cada una con icono provisional del elemento, nombre, par de elementos y descripción. Los iconos de Codex (`assets/icons/reactions/<id>.png`) se cargan solos cuando existan.
- **Código.** `SpellbookPanel` con tabs «Hechizos» / «Reacciones»; `renderReactions()` lee `data/rpg/reactions.json` y construye las cards. Estilos en `ventanas.css` (`.spell-tabs`, `.reaction-card`, `.reaction-pair`). 4 claves i18n en `en.json` y `en.ui.json`.
- **Verificación.** 8 pruebas verdes (`tests/hz05_reactionsTab.test.ts`): datos completos, ids únicos, traducciones en inglés, colores de elemento. Suite 2140/2141 (1 fallo pre-existente q09_fin). Typecheck limpio, build OK. Commit `25651aa`.

## 2026-11-19 — Tareas de la tarde: hechizos aprobados, reacciones visibles, luz, PNJ, diálogos y mapas (Claude)

- **Qué.** El creador aprueba la propuesta 03 (HZ-04a), con la condición de que cada reacción muestre su nombre y su efecto. Pide además más luz, luz propia del personaje, antorchas más fuertes, PNJ pulidos, repaso de diálogos y mapas, iconos de Codex, un set de 8 piezas de La Espeja de nivel 50, héroes al nivel de La Espeja y el personaje en 3D en el inventario. Sus palabras están en [ACCIONES_CREADOR](ACCIONES_CREADOR.md#respuestas-del-2026-11-19-tarde); las filas, en TAREAS («Nuevas del creador (2026-11-19, tarde)»).
- **Reparto.**
  - Junie: HZ-05, DIA-01, MAP-01 y HZ-04c.
  - OMP: FX-R01 (programador) y MOD-08 (Blender).
  - Codex: ICO-03 e ICO-02.
  - Coordinador: HZ-04d, LUZ-02 a LUZ-04, MOD-01, MOD-07, MOD-09, UI-06, EQ-10 y REV-01.
- **Hallazgo.** La propuesta aprobada fija el reparto, las mecánicas y las reacciones, pero no la lista concreta de los 96 hechizos (el calendario de 03 es de la versión anterior). Por eso HZ-04d va antes que HZ-04c, y la cola de Junie empieza por lo que no depende de ella.
- **Código.** Enganche `src/render/fx/reactionFx.ts`: `arenaView` le pasa cada suceso `reaction` de la sim con la posición del objetivo, más `update` y `reset`. Hasta hoy ninguna parte del render escuchaba las reacciones. OMP lo rellena en FX-R01 sin tocar `arenaView`.

## 2026-11-19 — La Espeja: tercera danza, máscara sin «pop» y arreglo de `format.ts` (OMP programador)

- **Qué.** Ampliación del pulido del mismo día. `Danza_Giro` (coreografía propia) como tercera danza, pedida desde el diálogo; `Danza_Reflejo` y `Danza_Brinco` reescritos más lentos y largos (`scripts/blender/diablica_espejo.py`, `Danza_*` a 0,8 de velocidad en el diálogo). La máscara ya no aparece ni desaparece de golpe: un hueso propio `careta` (hijo de `head`) la lleva de la cara a la mano en `MascaraOff`/`MascaraOn`.
- **Causa raíz del «pop».** El exportador glTF mete un canal de animación por hueso en **cada** acción, así que `Reposo` pisaba `careta` a la cara al terminar el gesto. No se puede quitar en el `.blend` (el exporter lo reintroduce); se quita en el motor: `gltfCharacter` elimina en tiempo de carga la pista de `careta` de todos los grupos salvo `MascaraOn/Off`. Así la careta se queda donde la dejó el gesto. Antes, `npcView.playGesture` encendía/apagaba la malla (`setMask` → pop); se borra ese método y la visibilidad la decide la animación.
- **Arreglo preexistente.** `npm run typecheck` estaba rojo en `master` por `src/ui/menus/format.ts:430`: `effectText` no cubría 7 variantes de `EffectDef` (`power`, `critChance`, `critDamage`, `fixedDamage`, `pushDamage`, `dispel`, `shareDamage`) ni tenía `default`. Se añaden los 7 casos y un `default: never`; typecheck limpio. No es de estos assets: se arregla porque la regla obliga a typecheck en verde antes de commit.
- **Verificación:** `npm run typecheck` 0 errores; suite `npm test` 2133/2133 salvo `q09_fin` (regeneración, preexistente y ajeno — falla igual en HEAD sin estos cambios) y el `.DS_Store` de `assets.test.ts` (basura macOS, borrada). Validador del modelo: 17 663 triángulos, 6 piezas, 15 clips, altura 1,82. **Electron real, escenario `espeja`: 6/6** (tres danzas presentes; `Reposo`/`Danza_*` sin pista de `careta`; `MascaraOn/Off` sí la mueven). Renders del gesto en `work/omp-espejo-danzas/`.
- **Qué mira el creador:** hablar con La Espeja → «Báilame el del giro»; «Enséñame la cara» y ver que la máscara baja a la mano y se queda sin saltar a la cara.

## 2026-11-19 — AUD-MUSIC-POLISH: «Fiesta en el atrio» v3 y catálogo de música generada (Claude)

- **Qué.** Nueva versión de 3:09 (`fiesta_v3.py`), con temas escritos, forma de rondó de 14 secciones e interpretación propia de cada instrumento. Sale de una sola partitura: mezcla, versión sin flauta, 8-bit sincronizada, cinco stems, MIDI y mapa de secciones. **No reemplaza la música productiva** y nada entra en `assets/`.
- **`forma.py`** gana formas configurables (`SectionSpec`, `FORMS`, `check_form`, `section_map`); la API anterior se mantiene. Guía actualizada en `GUIA_AUDIO_MCP.md` §5.
- **Medidas** (`work/claude-aud-cripta/real/salida/fiesta_v3/informe_medidas.json`): −16,0 LUFS, LRA 5,4, −1,3 dBTP, 0 recortes; stems suman la mezcla (error 1,2e-4) con desfase 0 ms; 8-bit a ±10 ms y prueba nula de tramos 1,1e-16; validador OK.
- **Límites.** El A/B con ACE-Step no se hizo: el servidor no responde (AUD-IA-01 sigue pendiente). La métrica de repetición por croma la domina la armonía y no mide bien la variación. La escucha es del creador.
- **Catálogo.** Toda la música generada está en `work/musica-generada/` (ignorado por Git), con `CATALOGO.md` regenerado por `catalogar.py`: 22 piezas en OGG Opus y MP3.

## 2026-11-19 — Pulido de los diálogos de La Espeja (OMP programador, encargo directo del creador)

- **Qué y por qué.** El creador pidió quitar la frase «El Diablo lo llevo dentro desde niña» (choca con la lectura respetuosa del Diablo de Espejo de `PROCEDENCIA.md`: sin estética demoníaca, es danza ritual) y dar profundidad, con opciones que usen las dos danzas del modelo.
- **Bug raíz:** las opciones de baile llamaban a `playClip` con `Emote_dance`, clip que **no existe** en `diablica_espejo.glb` (sus clips son `Danza_Reflejo` y `Danza_Brinco`), así que La Espeja nunca bailaba desde el diálogo. Se sustituye por los clips reales; `playNamed` los reproduce una vez y vuelve a `Reposo`, igual que la máscara.
- **Grafo nuevo** (`data/rpg/npcs.json`): nodos `hello`, `sinmascara`, `espejo`, `brinco`, `razon`, `concara`. Las dos danzas se piden desde varios nodos; `sinmascara` explica el oficio heredado (no posesión); `razon` ata la danza al Pulso y al Diablo Mayor que no se quitó la máscara (Acto I, `01_MUNDO_E_HISTORIA.md`). Ninguna cifra ni nombre de lore inventado; solo texto de diálogo.
- **i18n** (`data/i18n/en.content.json`): se reescriben/eliminan las frases viejas y se añade inglés al 100 % (términos canónicos: Pulse, Great Diablo, Partner).
- **Validación:** `npm run content:check` OK (valida cada `next` del grafo); `tests/i18nContent.test.ts` 4/4; `tests/f36_danzaEspeja.test.ts` 4/4; suite `npm test` 2132/2133. El único fallo (`q09_fin`, regeneración) y el de `typecheck` (`format.ts:430`) son preexistentes del trabajo sin integrar de otros agentes y no tocan estos archivos.
- **Qué mira el creador:** hablar con La Espeja en Villa Raspadura → elegir «Báilame el baile del espejo» y «Báilame el del brinco» y comprobar que ahora sí ejecuta `Danza_Reflejo` y `Danza_Brinco`.

## 2026-11-19 — Tanda OMP modo programador: resumen (NOM-01 · DEV-02 · BUG-01 · UI-04)

Tanda de la cola `work/prompts-noche/COLA_OMP.md`, autorizada por el creador (2026-11-19), modo programador (sin Blender). Un commit por tarea sobre `master`, empujado.

|Tarea|Estado|Commit|Evidencia (`work/`)|Medición / aceptación|
|---|---|---|---|---|
|NOM-01 Nombres 16→24|Hecho|`2a73524` (docs `666406e`)|`omp-nom01/`: `02-rechazo-25.jpg`, `03-partida-creada.jpg`, `REPORTE.md`|24 aceptado / 25 rechazado / dígitos OK (`creation.test.ts`, `devConsole.test.ts`)|
|DEV-02 Día 20 min, mañana|Hecho|`b917994` (docs `9b422f5`)|`omp-dev02/`: `01`–`04.jpg`, `paso.js`, `REPORTE.md`|5 pruebas puras; Electron: 08:38 Mañana, divisor 1200, cambio 20→5 sin salto (hora 0,5→0,5), ratio de reloj 4,02|
|BUG-01 Llama sin soporte|Hecho|`e90b69d`|`omp-bug01/`: `recuento.js`, `B-antorcha-muroZ*.jpg`, `REPORTE.md`|causa: yaw del soporte invertía ±Z y enterraba la copa; Electron **445/908 → 0** llamas sin soporte (pisos 1/10/20/30/60/100); 3 pruebas puras|
|UI-04 Vida a la vista|**Bloqueada**|—|—|espera WIN-01 (fila «En curso»: toca `src/render/enemyView.ts`)|

- Sin assets nuevos: la tanda es de código; no hace falta tocar `PROCEDENCIA.md`.
- Suite: los fallos de esta sesión en `q09_fin`, `rpg/effects`, `rpg/world`, `hz04b_*`, `fx`, `i18nContent` y el `format.ts:430` de typecheck vienen del trabajo **sin commit / en curso de Junie y del coordinador** en `src/sim`, `src/rpg`, `data/fx.json`, `data/rpg/*` y `combatLog.ts`/`format.ts`. Verificado: fallan igual con mis rutas apartadas (`git stash`). Mis suites (nom01, dev02, bug01, dayNight, mundoClima, options, saveStore, i18n, torches, dungeonFuego) y `typecheck`/`build` de mis archivos, en verde.
- Qué mira el creador: **DEV-02** → Opciones › Desarrollo, cambiar la duración del día y comprobar que el reloj no salta; al empezar una partida nueva, debe ser de mañana (~08:38). **BUG-01** → en la cripta, mirar las paredes Norte/Sur: ya no hay llamas flotando sin su soporte (antes ~la mitad de las antorchas). **NOM-01** → crear personaje con hasta 24 caracteres con dígitos. **UI-04** sigue esperando a WIN-01.

## 2026-11-19 — MUE-02: retomar el piso de la cripta (Junie)

- Al morir en la cripta, `main.ts` detecta la transición a espectral y llama `spectral.rememberFloor(crypt.floor)`.
- `SpectralState` guarda `lastDungeonFloor` (0-indexado); se persiste en `SpectralSaveData` (opcional, compatibilidad con guardados viejos).
- Al acercarse a la entrada de la cripta, `cryptScene.ts` verifica si hay piso pendiente. Si es > 0, emite `dungeonFloorChoice` en vez de entrar.
- `index.ts` muestra un modal con dos opciones: «Retomar piso N» (entra en el piso guardado) y «Empezar en el piso 1» (entra en el piso 0).
- `enterDungeon` en `main.ts` verifica la llave y llama a `crypt.veil()` + `crypt.enter()` con el piso elegido.
- 14 pruebas en `tests/mue02_dungeonFloor.test.ts`. Suite: 2130 (1 fallo pre-existente q09_fin). Typecheck: 1 error pre-existente format.ts. Commit `e51f34a`.

## 2026-11-19 — DEV-02: el día dura 20 min y la partida nueva empieza por la mañana (OMP)

- `data/lighting.json`: `dayLengthSeconds` pasa de 300 (5 min) a **1200 (20 min)**; `startTime` sigue en 0,36 (08:38), que ya es de mañana. `src/world/dayNight.ts` (puro): `DAY_LENGTH_MINUTES` = [5,10,20,30,60], defecto 20, `normalizeDayLengthMinutes` y `dayLengthSeconds`.
- Opción `dayLengthMinutes` en `src/ui/menus/saveStore.ts` (defecto 20; guardado antiguo sin la clave → 20) y desplegable «Duración del día» en Opciones › Desarrollo (`screens/modals.ts`), con sus 3 etiquetas en `data/i18n/en.json`.
- `src/main.ts`: el cambio se **aplica en el momento** reescribiendo el divisor `data.lighting.dayLengthSeconds` (mismo objeto que lee la sim, `src/sim/world.ts`, no tocado). Como la sim divide una *fracción* de día, cambiar el divisor **conserva la hora actual: no salta**. Una **partida nueva** (`startPlace` null) fija `world.timeOfDay = data.lighting.startTime`; los guardados conservan su hora.
- Pruebas puras en `tests/dev02_dayLength.test.ts` (5): defecto 1200 s en opción y en `lighting.json`, cinco duraciones elegibles y normalización, hora inicial «Mañana», cambio sin salto (`timeOfDay` se conserva) y velocidad de reloj (5 min corre 4× más que 20).
- Electron (`cdp.mjs`, `work/omp-dev02/`): partida nueva a las **08:38 (Mañana ✓)** con divisor **1200**; desplegable con las 5 opciones y seleccionado 20; al elegir 5 min → divisor 300, opción guardada, hora **0,5000 → 0,5000 sin salto**; medido en vivo ratio de reloj **4,02**. Persistencia al arrancar: `onOptions` dispara con las opciones cargadas al registrarse (`menus/index.ts`).
- Suite: los fallos en `q09_fin`, `rpg/effects`, `rpg/world`, `hz04b_reactions`, `fx` e `i18nContent` vienen del trabajo **sin commit de Junie** en `src/sim`, `src/rpg`, `data/fx.json`, `data/rpg/statuses.json` y `src/ui/combatLog.ts` (verificado: fallan igual sin mis cambios, por `git stash` de mis rutas). Mis suites (dev02, dayNight, mundoClima, options, saveStore, i18n, creation, menus) y typecheck y `npm run build`, en verde. Commit `b917994`.

## 2026-11-19 — Pedido visual del creador: héroes, set de la Espeja, flora, casas, luz y letras de daño (Claude)

- MOD-04 (`e7382a2`): seis GLB de héroe con traje. MOD-05 (`7652f10`): tocado y lazo de la Espeja como equipo para cualquier personaje (`scripts/blender/equipo_espeja.py`).
- ENV-01: vegetación con luz horneada en color de vértice y copas con bultos (`9004a9b`, `staticModels.ts` lee `COLOR_0`); casas con teja, cal, tabla y piedra pintadas por código, jardineras y canecillos (`d48cdd8`). Falta suelo, cercas y utilería.
- LUZ-01 (`c87b9c7`): un pase de revelado al principio de la cadena (`render/sceneLook.ts`), con la escena en media precisión, curva ACES, exposición, contraste, curvas de color y viñeta. El bloom es opcional y va apagado. Ningún dato de luz cambia. Antes no había revelado: el terreno y el cielo usan sombreadores propios, por eso hace falta un pase y no basta con el material.
- UI-05 (`c87b9c7`): números de daño con tres acabados (plano, relieve, bloque 3D) y ocho letras del sistema, sin descargas. Opciones › Desarrollo tiene los ajustes, con muestra en vivo, guardados en esta máquina (`render/devVisual.ts`).
- LUZ-01 sin pase extra: con el estilo pintura el revelado va dentro de su pase (`PAINT_GRADE_GLSL`); el pase propio queda sólo para el estilo natural. FPS medidos en Electron con A/B en los dos órdenes: el pueblo empata (68 frente a 69), coste dentro del ruido.
- Arreglo: la flora con color de vértice no compilaba al quedar un trozo con 0 instancias (Babylon deja puesto `INSTANCESCOLOR`); ahora nunca baja de 1 y el trozo vacío se esconde.
- Pendiente: el creador elige la letra y el acabado. Pruebas: los fallos de `fx` (`frozen`), `q09_fin` e `i18n` (Reloj del mundo y filtros) vienen de trabajo sin integrar de otros agentes. Capturas en `work/claude-clases/`.

## 2026-11-19 — HZ-04b-defensa: efectos nuevos de defensa (Junie)

- 4 tipos nuevos en `EffectDef` (`src/rpg/contracts.ts`): `shield` con `perLevel` (escudo escala con nivel del lanzador), `dispel` (quita buffs/debuffs), `shareDamage` (transfiere % del daño a aliado).
- `StatusDef` nuevo campo `vs?: 'ranged' | 'melee'` para invulnerabilidad selectiva (inmunidad solo contra hechizos o ataques básicos).
- `ShieldEffect` en `src/rpg/effects.ts`: suma `perLevel × nivel` al amount base antes de aplicar power.
- `DispelEffect`: targeting `hit`; quita todos los buffs por defecto, solo debuffs si `kind='debuff'`, o un estado específico si `statusId`.
- `ShareDamageEffect`: targeting `hit`; aplica estado `share_damage` con `shareTarget` (aliado) y `sharePercent`.
- `ActiveStatus` (`src/rpg/status.ts`): campos `shareTarget` y `sharePercent` para el enlace de daño.
- `World.isVsImmune()` filtra por `vs` en estados con `immune`; `World.shareDamageToAlly()` transfiere % del daño al aliado vinculado.
- Estado `share_damage` en `data/rpg/statuses.json`, aspecto en `data/fx.json`, traducción en `data/i18n/en.content.json`.
- 14 pruebas en `tests/hz04b_defensa.test.ts`. `tests/rpg/effects.test.ts` actualizado con dispel y shareDamage.
- Suite: 2115/2116 (1 fallo pre-existente q09_fin). Typecheck: 1 error pre-existente format.ts. Commit `c6353ea`.

## 2026-11-19 — HZ-04b-potenciadores: efectos nuevos de potenciador (Junie)

- 5 tipos nuevos en `EffectDef` (`src/rpg/contracts.ts`): `power` (stat power %), `critChance` (stat critChance %), `critDamage` (stat critBonus), `fixedDamage` (stat elementalDamage), `pushDamage` (daño al chocar empujón).
- `BuffEffect` abstracta en `src/rpg/effects.ts`: aplica un modificador inline vía `StatusDef` temporal. Subclases: `PowerEffect`, `CritChanceEffect`, `CritDamageEffect`, `FixedDamageEffect`.
- `PushDamageEffect`: targeting `hit`, apply vacío; `World.execute()` detecta knockback + pushDamage y envuelve el contexto: `knockback()` devuelve la distancia no recorrida, y el wrapper aplica `value × distancia × power` de daño.
- Parser en `src/rpg/content.ts` para los 5 tipos. Registro en `EFFECT_TYPES`.
- `tests/hz04b_potenciadores.test.ts` (12 pruebas): creación, targeting, stat correcto, escala con power, pushDamage no hace nada en apply.
- `tests/rpg/effects.test.ts` actualizado con los 5 tipos en samples.
- Suite: 2101/2102 (1 fallo pre-existente q09_fin). Typecheck limpio (1 error pre-existente format.ts). Commit `b4016b2`.

## 2026-11-19 — HZ-04b-reacciones: sistema de reacciones elementales (Junie)

- 15 reacciones en `data/rpg/reactions.json` (PROPUESTA), detrás de `devReactions` en GameOptions (false por defecto).
- `ElementalMarkTracker`: cada golpe elemental deja una marca de 6 s; un elemento distinto sobre un objetivo marcado dispara la reacción y gasta ambas marcas. Cooldown de 2 s entre reacciones en el mismo objetivo. El aire no deja marca.
- Estados de marca (`mark_*`) y de reacción (`reaction_*`) en `statuses.json`, con aspecto visual en `fx.json` y traducciones en `en.content.json`.
- Integración en `World.strike()` (marca + reacción) y `World.tick()` (caducidad de marcas y cooldowns).
- Evento `reaction` en `GameEvent`.
- 14 pruebas en `tests/hz04b_reactions.test.ts` + `tests/combatLab.test.ts` actualizado. Suite: 2074/2076 (2 fallos pre-existentes). tsc limpio. Commit `ca071f2`.

## 2026-11-19 — HZ-04b-estados: Congelado y Entumecido (Junie)

- `frozen`: control root, 1.5 s, maxStacks 1, visual ice en fx.json. `numb`: hinder exhaust cooldownSlow 0.2, 4 s, visual frost.
- Archivos: `data/rpg/statuses.json` (2 estados), `data/fx.json` (aspecto visual), `data/i18n/en.content.json` (Frozen, Numb), `tests/hz04b_estados.test.ts` (9 pruebas).
- Suite: 2074/2076 (2 fallos pre-existentes: q09_fin, i18n). Typecheck limpio, build OK. Commit `35b2c5e`.

## 2026-11-19 — HZ-04b-carga: selfStack suma daño real (Junie)

- `SelfStackEffect` acumula 1 stack por lanzamiento (hasta `max` del efecto) durante `duration` s. Recorta stacks al `max` declarado.
- `World.execute()` aplica selfStack **antes** de consumir: cada lanzamiento acumula y luego gasta las acumulaciones para multiplicar el power (`1 + percent × stacks / 100`).
- Archivos: `src/rpg/effects.ts` (SelfStackEffect con firma completa), `src/sim/world.ts` (acumula → consume → golpea), `tests/hz04b_selfStack.test.ts` (14 pruebas), `tests/hz04b_edges.test.ts` (actualizado).
- Suite: 2059/2061 (2 fallos pre-existentes: q09_fin, i18n). Commit `30199f9`.

## 2026-11-19 — D-01b: coste en pergaminos para subir rango (Junie)

- Al usar un pergamino de hechizo, se verifica que hay suficientes pergaminos del mismo hechizo en el inventario para alcanzar el rango N (coste = N). Si no hay, se rechaza sin gastar ninguno y se muestra cuántos faltan.
- Si el hechizo ya está al rango máximo, se devuelve el mensaje existente sin verificar pergaminos.
- Archivos: `src/rpg/session.ts` (verificación de stock y consumo múltiple), `tests/d01b_scrollCost.test.ts` (6 pruebas), `tests/rpg/spells.test.ts` (ajustado al coste acumulativo).
- Suite: 2046/2047 (1 fallo pre-existente q09_fin). Commit `91f68a6`.

## 2026-11-19 — MUE-03: montura y mascota ocultas al morir (Junie)

- Al morir, la mascota desaparece del mundo (`syncPets()` ya vacía `pets` cuando `spectral.active` — pre-existente) y `session.pet()` devuelve null (pre-existente).
- La montura ya no se dibuja en el render cuando el jugador es espectral (`arenaView.ts`: `isSpectral` check antes de leer el equipo).
- La montura **no se desequipa**: sigue en el slot `mount` y vuelve a verse automáticamente al revivir.
- La mascota vuelve al revivir porque `syncPets()` la re-spawnea cuando `spectral.active` vuelve a false.
- 4 pruebas en `tests/mue03_mountPetSpectral.test.ts`. Suite: 2040/2041 (1 fallo pre-existente q09_fin). Commit `6c5e299`.

## 2026-11-19 — NOM-01: nombres de personaje con dígitos y hasta 24 (OMP)

- `src/ui/menus/screens/creation.ts`: `NAME_MAX` pasa de 16 a 24 (decisión del creador, Q8, 2026-11-18; no es relajar QA). El comentario de `validateName` describe la regla nueva; la barra de la ficha (`/ 16`) y el `maxlength` usan `NAME_MAX`. La regex ya admitía dígitos desde `f78b5f0`.
- Pruebas: `tests/ui/creation.test.ts` acepta 24, rechaza 25, acepta dígitos; `tests/ui/devConsole.test.ts` (contrato de la regla, tocado en `f78b5f0`) actualizado al límite nuevo: 19 caracteres es válido desde ahora, 29 sigue rechazado.
- Evidencia en `work/omp-nom01/`: `paso.js` (reproducible por CDP), capturas del rechazo de 25 y de la partida creada con «Aldara Valbruma 20260719» (24), `REPORTE.md`.
- Suite completa 2036/2037: el único fallo (`tests/q09_fin.test.ts`) viene del cambio **sin commit de Junie** en `src/ui/combatLog.ts` (oculta curas que redondean a 0), no de esta tarea; verificado verde en HEAD limpio (`git worktree`). `npm run build` y typecheck de mis archivos, en verde. Commit `2a73524`.


## 2026-11-19 — MUE-01: aviso de Pulso bajo (Junie)

- Al bajar el Pulso a 20 o menos por primera vez, se emite el evento `pulseLow` y aparece un banner («⚠ Pulso bajo») con el mensaje «Si vuelves a caer, te convertirás en fantasma» en el chat.
- El aviso no se repite hasta que el Pulso sube de 20 (consumible, descanso, tiempo).
- Archivos: `src/rpg/contracts.ts` (evento), `src/rpg/session.ts` (detección y reset), `src/ui/menus/index.ts` (banner y chat), `data/i18n/en.json` (traducción).
- 8 pruebas en `tests/rpg/mue01_pulseWarning.test.ts`. Suite: 2036/2037 (1 fallo pre-existente q09_fin). Commit `d138726`.

## 2026-11-19 — INV-01: invocaciones sin recompensa y muerte en cadena (Junie)

- `rewardDeaths()` en `src/sim/world.ts` salta XP, oro y botín cuando `summonerId !== null`.
- Al procesar la muerte del invocador, los esbirros vivos pasan a `dead` en el mismo tic.
- `session.test.ts` actualizado: los esbirros ya no sobreviven al invocador → victoria inmediata.
- 5 pruebas nuevas en `tests/inv01_summons.test.ts`. Suite: 2027/2029 (2 fallos pre-existentes). Commit `064642b`.

## 2026-11-19 — Cripta: tres piezas originales y sus 8-bit, para escuchar (Claude)

- **Encargo del creador**: «nuestras propias versiones» de las tres pistas de estudio de la cripta, más su versión 8-bit.
- **Cómo se hizo**: de esas pistas solo se tomaron rasgos generales (tempo, modo, densidad y curva de energía). No se transcribió ninguna melodía, acorde ni ritmo, porque eso sería una obra derivada de música ajena (clean-room).
- **Resultado**: tres piezas nuevas, compuestas y sintetizadas desde cero, de 63–70 s:
  - descenso, 86 BPM;
  - velas, 60 BPM;
  - ecos, 70 BPM.
  
  Cada una tiene su versión 8-bit de cuatro canales.
- **Comprobado**:
  - las 6 pasan `validar_audio_generado.py`;
  - el parecido armónico con las pistas de estudio queda al nivel de una pieza propia sin relación.
- **Falta**: la escucha del creador. Nada entra en el juego.
- **Evidencia**: `work/claude-aud-cripta/` (`LEEME.md`, `salida/`, `componer.py`).

## 2026-11-19 — Cripta con instrumentos reales y versiones largas (Claude)

- **Encargo del creador**: que suene menos a robot, con instrumentos reales (percusión, tambores, flauta).
- **Banco**: el creador autorizó descargar uno libre. Se usó GeneralUser GS 2.0.3, que permite el uso comercial; su autor no garantiza el origen de todas las muestras.
  - Está solo en `work/` y no se ha registrado en `PROCEDENCIA.md` porque no entra en el juego.
  - Lo toca un renderizador propio en Swift (AVAudioUnitSampler sin tiempo real).
- **Resultado**:
  - las 3 piezas cortas con instrumentos reales;
  - una versión larga de cada una, con la misma duración que la pista de estudio emparejada (289/312/292 s), en instrumentos reales y en 8-bit;
  - la partitura sigue siendo propia: la intensidad sigue la curva de energía medida, sin transcribir nada.
- **No hecho, por clean-room**: no se hicieron las versiones «100 % fieles» de las pistas de estudio, ni en 8-bit ni a duración real, porque reproducirían su melodía y armonía.
- **Comprobado**: las 9 pasan `validar_audio_generado.py`.
- **Falta**: la escucha del creador.
- **Evidencia**: `work/claude-aud-cripta/real/` (`LEEME.md`, `salida/`, `componer_real.py`, `render_dls.swift`).
- **Corrección**: las pistas dungeon1/2/3 son de FATE, no de DOFUS.
- **Rumbo musical nuevo (creador)**: folclore panameño (diablos de espejo, tamborito, acordeón).
  - Primera prueba propia: `salida/fiesta_en_el_atrio_tamborito.wav`.
  - De «Combate acelerado» solo toma tempo, compás, duración y curva de energía.
  - Las etiquetas de ese mp3 dicen que es una versión de un tema de DOFUS.
  - No se hicieron versiones fieles de material ajeno.
- **Tamborito v2 por secciones**: `forma.py` planifica la pieza por secciones y `tamborito.py` la rehízo con flauta.
  - Orden: intro, verso, pre, coro, solo, verso, pre, coro, puente, corte, pre, clímax ×2 y final.
  - Sonoridad medida por sección: va de −22 dB en el corte a −13,7 dB en el clímax. El pico está en el 75–90 %.
  - Duración: 133,9 s. Se entrega en OGG Opus (2,6 MB) y en MP3 (3,1 MB) en lugar del WAV de 23 MB. Las dos versiones pasan el validador.
  - La forma por secciones queda como regla en `GUIA_AUDIO_MCP.md` §5.
  - «Combate acelerado» con las mismas notas no se hizo, por clean-room: es un tema de DOFUS.

## 2026-11-19 — AUD-REF-01: análisis de «Combate acelerado» y tema de combate propio (Claude)

- **Análisis descriptivo** de la referencia, sin audio derivado:
  - 193,1 s, a 160,45 BPM, en compás binario;
  - 15 tramos;
  - dos contrastes: un corte sin bajo entre 64 y 79 s, y un tramo ligero entre 139 y 151 s.
- **No hecho**: la transcripción y el arreglo con las mismas notas. Las etiquetas indican que es el tema de combate de DOFUS 1.29, y un arreglo fiel sería obra derivada (reglas 1 y 2 de AGENTS). El motivo queda explicado en el informe.
- **Entrega separada**: «Choque en la plaza», tema de combate original con el conjunto panameño.
  - Acordeón con fuelle CC11; para eso se añadió el soporte de CC a `render_dls`.
  - Flauta con respuestas y trinos; pujador, repicador, caja con redobles, guacharaca, palmas y claves; bajo eléctrico grave.
  - Mismo tempo. Sus cambios de sección caen a ±1,5 s de los de la referencia.
  - Incluye los 5 stems, el MIDI editable y una versión de osciladores con las mismas notas, para comparar de oído.
  - Pasa el validador, con el pico a −1 dBFS y sin recorte. Es PROPUESTA, fuera de `assets/`.
- **Evidencia**: `work/audio-study/combate-acelerado/` (`INFORME.md`, `analisis.json`) y `work/audio-study/combate-propio/` (`LEEME.md`, `salida/`).

## 2026-11-19 — Audio IA: stack elegido y OMP en modo Audio (Claude)

- **Comparativa** (AUDIO-FACTORY-02, fase B; detalle en [GUIA_AUDIO_MCP](GUIA_AUDIO_MCP.md) §1):
  - motor: ACE-Step Studio 4.0.1, que tiene MCP propio y cabe en la 3080 con GGUF;
  - respaldo: ACE-Step 1.5 por su API;
  - LMMS MCP queda aparcado (inmaduro) y Audacity MCP, descartado;
  - posproceso con FFmpeg; los scripts propios se mantienen.
- **Licencias**: código y pesos MIT, y la ficha del modelo permite el uso comercial de lo generado. Quedan prohibidos Regrind y MuScriptor (no comerciales), los LoRA y OpenRouter.
- **Auditoría del código del estudio** (commit `6282158`):
  - los puertos 8792 y 8089 solo escuchan en loopback;
  - el «acceso de red» viene apagado;
  - el MCP rechaza peticiones con un `Origin` ajeno;
  - envía telemetría y consulta noticias, y las dos cosas se apagan.
- **Hecho**:
  - perfil `audio` de OMP (`~/.omp/profiles/audio/agent/`, fuera del repo);
  - `scripts/mac/omp_audio.sh`: túnel SSH sobre Tailscale y comprobación de que el estudio responde;
  - `scripts/windows/check_audio_ia.ps1`;
  - `scripts/audio/validar_audio_generado.py`, que rechaza silencio, huecos, recorte, piezas cortas y bucles cortos. `--selftest` pasa los 7 casos y las 15 mezclas propias pasan;
  - filas AUD-IA-01/02/03 y colas de OMP y Junie.
- **Sin probar**: nada se ha instalado ni generado. El PC con Windows no está en Tailscale, así que el piloto lo hace Claude en Windows (AUD-IA-01).

## 2026-11-19 — HZ-04a, 2.ª versión, y colas nuevas de Junie y OMP (Claude)

- **Respuestas del creador**: registradas en ACCIONES_CREADOR («Respuestas del 2026-11-19») y en 00_DECISIONES.
- **HZ-04a, más corta en [03](diseno/03_HECHIZOS_Y_RANGOS.md)**:
  - 18 de daño, 4 potenciadores, 6 de control y 4 de defensa por clase;
  - mecánicas nuevas: potencia, daño de empuje, escudo de 5,5 × nivel, desechizar, invulnerabilidad y repartir daño;
  - 15 reacciones elementales;
  - cifras que escalan con el nivel, para que un hechizo de nivel 1 en rango 6 siga sirviendo a nivel 400.
- **Colas en `work/prompts-noche/`**:
  - Junie, 10 tareas: INV-01, MUE-01, MUE-03, D-01b, HZ-04b en cinco partes y MUE-02;
  - OMP en modo programador, 4 tareas: NOM-01, DEV-02, BUG-01 y UI-04, esta tras WIN-01.
  - Las colas anteriores están copiadas en `anteriores/`.

## 2026-11-18 — HZ-04a: propuesta de repertorio escrita (Claude)

Sección «Repertorio revisado» en [03](diseno/03_HECHIZOS_Y_RANGOS.md), toda `PROPUESTA`. 32 hechizos por clase (los actuales, los 19 del catálogo y uno nuevo para Vanguardia y otro para Cazador); 12 de daño por clase, el resto de control, terreno, defensa y potenciadores. Incluye carga hasta 2 acumulaciones, estados nuevos Congelado y Entumecido, tabla de combos, Disparo macabro, hechizos fuertes y caros, últimos hechizos de 165–200 y factores de rango hasta el 400. No toca `data/`; espera revisión del creador (Q10).

## 2026-11-18 — WIN-01: el juego dobla los fps en Windows (Claude)

Medido en el PC del creador (i7-9700K, RTX 3080; Electron usa la 3080 por ANGLE/D3D11) en pantalla completa real a 3440×1440, como pidió el creador. Causa principal: en `enemyView.ts` el cartel de nombre de cada enemigo comparaba el texto con la clave «texto|color», que nunca coincidía, y se recreaba en cada fotograma (textura, material y malla). Cada material nuevo hacía que la atmósfera lo «ensanchara» y Babylon marcaba sucias las ~2.100 mallas: un 25 % de la CPU. Se localizó con el escenario nuevo `sondaSucio` de `scripts/qaElectron.mjs`. Evidencia: `work/qa/rendimiento-hondo-antes-completa.json` y `-despues-carteles.json`.

| Zona | fps antes | fps después | p95 después (ms) | Draw calls |
|---|---|---|---|---|
| Pueblo | 34 | 70 | 20,1 | 671 |
| Iguanera | 60 | 122 | 12,2 | 242 |
| Piso 1 | 73 | 160 | 9,2 | 56 |
| Piso 20 | 57 | 139 | 11,6 | 141 |
| Piso 60 | 59 | 135 | 12,2 | 138 |
| Piso 100 | 65 | 150 | 11,1 | 100 |

Quedan los tirones al entrar a un piso (p95 27–45 ms los primeros 3 s, por la compilación de shaders y los modelos de enemigos) y el pueblo, limitado por la CPU de Babylon (unas 1.170 mallas activas, unos 400 árboles con modelo propio y su animación). Los 14 fallos de `modalP12` y `data01_asciiIds` ya estaban antes de este cambio.

Agrupar árboles (pedido del creador): ya estaban agrupados por trozos de 64 m. Las piezas de `landmarkView` pasan a instancias, con nodos propios para que cada copia conserve su animación; las puertas siguen clonadas por su contorno dorado. Pueblo: 671→624 draw calls, 68–72 fps (igual que antes). Captura: `work/qa/sonda-pueblo-instancias.jpg`.

## 2026-11-18 — Cierre de pendientes A1–A4 (Claude)

- EV-02 cerrada: Play Mode, emotes y diálogo funcionan con entrada real. Los fallos eran del escenario (API inventada `chatBox.send`, `:wave` en vez de `/saludar`, selector `.dialog-panel`). `emotes` 4/4 y `curas_dialogo` 4/4 tras reescribirlos.
- J12 reabierta: la utilería de Iguanera no se ve en escena aunque las pruebas pasan.
- MOD-02: `falcopama` 8/8; queda la revisión visual del creador.
- HZ-04b: `tests/hz04b_edges.test.ts` (rebote tras muerte, salto a salto, línea con extra por blanco); `selfStack` sin implementar, se corrige en HZ-04c.
- WIN-01 sigue autorizada para el agente de Windows; desde el Mac no se mide.
- Evidencia: `work/claude-a1/` (logs y capturas).

## 2026-11-18 — AUD-PUB: la música de otro juego ya no entra en el paquete (Claude)

- `dist/assets/` llevaba `dungeon1..3-*.ogg`: las referencias `new URL(...)` de `src/audio/contextMusic.ts` hacían que Vite los copiara. El build ahora suena con `cripta_mix.wav` (original, en bucle) y la rotación de OGG queda solo en `npm run dev`.
- Nuevo guardián `scripts/checkPublishable.mjs`, encadenado en `npm run build`: compara por SHA-256 `dist/` y `dist-electron/` con `assets/dev_dungeon/` y `reference_assets/`. Contra el build anterior detectó las tres copias; contra el nuevo, limpio.
- Pendiente del creador: los OGG siguen versionados en Git (y en GitHub) desde `6c805a9`. Los archivos locales no se tocaron.
- Evidencia: `work/claude-aud-pub/build_check.txt`, `qa_audioMazmorra_dev.log`. 2019/2019 pruebas.

## 2026-11-18 — Segunda tanda de respuestas del creador (Claude)

- Sus palabras, literales, están en `ACCIONES_CREADOR` y resumidas en `00_DECISIONES`.
- **Confirmado**:
  - nivel máximo 400;
  - rebanada 1–10 autorizada;
  - día de 20 min que empieza por la mañana;
  - espectro solo con el Pulso a 0, con aviso al bajar a 20;
  - invocaciones sin experiencia y que mueren con su invocador;
  - nombres con números y de más de 16 caracteres;
  - el rango N cuesta N pergaminos en los hechizos universales.
- **Tareas nuevas**:
  - UI-05, fuente de las cifras de daño;
  - NOM-01;
  - EQ-09, conjuntos con dichos panameños;
  - ICO-01, iconos de pergamino;
  - BES-01 y MOD-03, bestiario por familias y su modelado con OMP;
  - BUG-01, antorcha de la cripta sin soporte.
- **Pasan a Autorizada**: T06, D-50 y D-01b.
- **Cerradas**:
  - D-00: E1–E6 no fueron a propósito;
  - JEQ-07/08: el oro bajo es intencionado, por los bots.
- **Abiertas**: Q16 y Q20–Q23.

## 2026-11-18 — Respuestas A1–A6, H01 y H03; ACCIONES_CREADOR y TAREAS rehechos (Claude)

- Las respuestas del creador están literales en `ACCIONES_CREADOR` y resumidas en `00_DECISIONES`. Salen tareas nuevas: UI-04, BAL-02, DEV-02, INV-01, MUE-02, MUE-03, AUD-02 y MUN-01 (Veraguas). Esperan respuesta DIST-01 (lanzador) y MUE-01.
- Desde ahora las preguntas van en el chat, y `ACCIONES_CREADOR` guarda las respuestas y un índice Q1–Q19.
- `TAREAS` deja solo lo abierto. Las versiones anteriores siguen íntegras en `historico/TAREAS_HASTA_2026-11-18.md` y `historico/ACCIONES_CREADOR_HASTA_2026-11-18.md`.
- Comprobado en el código: `summonerId` solo cuenta invocaciones; no quita experiencia ni mata a las invocaciones con su invocador. Tampoco se recuerda el piso de la cripta.

## 2026-11-18 — EQ-07: catálogo de objetos 1–200 con la curva del creador (Claude)

- Generador `scripts/balance/eq07Equipment.mjs` y curva `data/balance/equipmentCurve.json`: 987 piezas reescritas y 243 nuevas (anillo, amuleto, cinturón y capa por conjunto de ruta, y tres armas de cobertura). Nueva estadística `elementalDamage`.
- Corregidas las unidades de los bonos de conjuntos especializados (crítico 0,04 % → 1–4 %; daño crítico +1100 % → 3–11 %; enfriamiento topado en 4 %): `work/claude-items1118/sets_unidades.txt`.
- Pruebas ajustadas a la decisión del creador (tope de crítico 10 %, conjuntos de ruta de 8 piezas, relación de primaria hasta 2,5 en nivel 95); ninguna se relajó para ocultar un fallo.
- Evidencia: `work/claude-items1118/fichas_electron.txt`, `capturas/ficha-13..20.jpg`, copias previas `items_before_eq07.json` y `merchants_before_eq07.json`. 2016/2016 pruebas.

## 2026-11-18 — EQ-07: respuestas del creador, Vida al equipar y propuesta de reforja (Claude)

- Q-EQ1–Q-EQ4 recogidas en `00_DECISIONES`; EQ-07 pasa a **Autorizada**.
- **Vida al equipar (EQ-07b)**: `Character.carryHealth` suma o resta a la vida actual lo que cambió la máxima al equipar, desequipar o cambiar de mascota. Con 900/1000 y una pieza de +100 queda 1000/1100; quitarla no baja de 1 y cambiarse no cura. Prueba: `tests/rpg/equipHealth.test.ts` (4).
- **Reforja (EQ-08)**: propuesta con sello de jefe, ranuras por rareza y piedras dirigidas; espera tres respuestas del creador.

## 2026-11-18 — EQ-07: medición del catálogo de objetos y propuesta con las cifras del creador (Claude)

- **Filtro**: «Aire» no mostraba equipo de Agilidad porque el filtro solo miraba el arma y el daño implícito. Ahora cuenta primarias y tiradas (EQ-07a, `tests/ui/itemFiltersPrimaries.test.ts`).
- **Medición** (`work/claude-items1118/medir.mjs` → `medicion.txt`):
  - de 30 a 45 hay solo 5 piezas no arma de Agilidad;
  - en todo el juego hay solo 14 anillos y 18 amuletos;
  - 60 armas de 115–195 repiten su primaria (el Arco de renio da Agilidad tres veces).
- **Propuesta**: [07 · Revisión 2026-11-18](diseno/07_EQUIPO_Y_CONJUNTOS.md#revisión-2026-11-18-eq-07), con la curva 1–200 anclada en las cifras del creador, factor por ranura, reglas mono/bi/tri/seis con elementos distintos, azar al caer y cobertura por elemento. Las cifras del creador quedan en [00_DECISIONES](diseno/00_DECISIONES.md).
- **Pendiente**: el creador responde Q-EQ1–Q-EQ4. No se tocó `data/`.
- **Referencias**: no hay notas locales de ingeniería inversa en las carpetas vecinas, y la web no respondió. La estructura de referencia se resume como idea, sin tablas.

## 2026-11-18 — QA-1118b: revisión de BAR-01, MOD-02b, HZ-04b, HZ-UI-01, AUD-00 y AUD-01 (Claude)

- **HZ-04b**: los datos tenían rebotes y daño extra contra empapados, pero `ChainEffect` y `BonusVsStatusEffect` no hacían nada al lanzar: tres de los cuatro hechizos seguían sin cumplir su descripción. Ahora `World.execute` repite los efectos de impacto sobre cada salto (`chainTargets`, el más cercano no alcanzado dentro del radio y con el estado pedido) y el extra contra estado hace daño del elemento del hechizo. Se arregló también el error de `tsc` que dejó la prueba de Junie. Pruebas: `tests/hz04b_runtime.test.ts` (4).
- **BAR-01**: no se podía mover cada fila, y los botones 1/2/3 ensanchaban la barra hasta pisar el chat a 768p. Con la barra separada, las filas 2 y 3 son secciones propias; «Hechizos» se coloca midiendo la fila 1 (antes bajaba encima de las otras al encogerse). Los botones van en una columna estrecha.
- **MOD-02b, HZ-UI-01, AUD-00, AUD-01**: escenarios `falcopama` 8/8 y `spellbook_ladder` 11/11. Los sonidos los juzga el creador.
- Verificación: suite 2001/2001, `tsc` limpio, build correcto. `interfaz` 768p y 1080p 19/19, `barra` 6/6. En Electron, a nivel 200: tres filas, barra separada, fila 3 arrastrada a media pantalla y de vuelta en orden al unir; aguacero → anguila daña a los dos empapados. Capturas en `work/claude-qa1118b/` (`tres-filas.jpg`, `fila3-movida.jpg`, `combo.jpg`).

## 2026-11-18 — Resumen OMP (tanda nocturna 2026-11-18)

|Tarea|Estado|Commits|Evidencia|
|---|---|---|---|
|MOD-02a (Falcopama)|Hecha y revisada por el coordinador|`3ae9f62`, `ee1c9b0`|`work/omp-mod02/`|
|HZ-UI-01 (libro compacto)|Hecha, en verde|`548a03d` (+`9c4bab3` docs)|`work/omp-hzui01/`: ANTES/DESPUES-1080p.jpg, ANTES/DESPUES-768p.jpg, REPORTE.md|

Sin casillas abiertas restantes en `work/prompts-noche/COLA_OMP.md`. Nada bloqueado.

Qué tiene que mirar el creador: las capturas `work/omp-hzui01/DESPUES-1080p.jpg` y
`DESPUES-768p.jpg` (libro lleno, nivel 200: icono 56 px, tecla sobre el icono,
escalera en una línea). Hallazgo que necesita decisión de la barra (Junie/
coordinador, anotado en la fila HZ-UI-01 de TAREAS): a 768p el chat pisa la
`hud-actionbar` desde BAR-01 (medido: `9e4b7a1^` pasa `interfaz` 55/55; HEAD lo
falla igual sin mis cambios).

## 2026-11-18 — HZ-UI-01: libro de hechizos compacto (OMP programador)

El creador pidió agrupar icono y tecla y ver el icono más grande. Cambios solo en el libro (la barra no se tocó): (1) `src/ui/menus/spellbook.ts`: las pepitas de rango y la tecla asignada (`div.on-bar`) se montan sobre el icono (arriba-izquierda / abajo-derecha) en vez de una columna aparte; la escalera pasa a una línea de sólo niveles con función pura exportada `ladderCells` (detalle «Rango r · nivel n» en el `title` de cada tramo); sin tecla (`keys.label() === ''`, caso BAR-01) no hay insignia. (2) `src/ui/styles/ventanas.css`: icono 30→56 px, carta `min-height` 58 px, `.spell-ladder` en `nowrap`, regla muerta `.spell-ladder-sep` eliminada. (3) `scripts/qaElectron.mjs`: escenario `spellbook_ladder` ampliado con bloque HZ-UI-01 (nivel 200 por `gainXp`, libro learn-all, tecla/pepitas sobre el icono, escalera monolínea, desborde acotado a la ventana del libro a 1080p y 768p). (4) Prueba nueva `tests/hzui01_ladderCells.test.ts` (5).

Verificación: suite `npx vitest run` 1997/1997; Electron `spellbook_ladder` 11/11; `npx vite build` OK; typecheck con el único error preexistente de Junie (`tests/hz04b_spellEffects.test.ts`, `52d72ee`). Capturas antes/después 1080p y 768p con libro lleno: `work/omp-hzui01/` (REPORTE.md incluido). **Hallazgo anotado para la barra**: el solape `chat pisa hud-actionbar` a 768p en `interfaz` (14 fallos) es preexistente de BAR-01 — medido: sin mis cambios HEAD falla igual (40/55) y `9e4b7a1^` pasa 55/55.

## 2026-11-18 — AUD-01: sonidos de aire y agua, lightning canónico (Junie)

El creador pidió sonidos para aire y agua y renombrar storm a lightning. Cambios: (1) `data/audio/sfx.json`: 4 recetas nuevas (`cast_air`, `impact_air`, `cast_water`, `impact_water`) y 2 canónicos (`cast_lightning`, `impact_lightning`); `storm` queda como respaldo. (2) `src/audio/cues.ts`: `sfxElement` ya no traduce lightning→storm; `reflect` y `teleport` usan `cast_lightning`. (3) `scripts/generateSfx.mjs`: 6 recetas nuevas (aire, agua, lightning) generan WAV deterministas. (4) `PROCEDENCIA.md`: 21→27 WAV. (5) `tests/audio/cobertura.test.ts`: `PENDIENTE_AUD01` vacía, `sfxElement` actualizado, `FIXED_IDS` con `cast_lightning`. (6) `tests/audio.test.ts`: `cast_storm`→`cast_lightning`, elementos actualizados, 21→27 WAV.

Verificación: `npx vitest run` 1992/1992 verde. `npx tsc --noEmit` 1 error pre-existente HZ-04b (confirmado con stash). `npm run build` falla por el mismo error pre-existente. WAV generados con `node scripts/generateSfx.mjs`. Escenario Electron `sonidos_elementos` pendiente (CDP no disponible). El creador decide si suenan bien.

## 2026-11-18 — AUD-00: auditoría de audio (Junie)

El creador pidió auditar el sistema de audio. Hallazgo: `cues.ts` pide `cast_air`, `cast_water`, `impact_air` e `impact_water` que no existen en `sfx.json` — los hechizos de aire y agua no suenan en absoluto, sin error visible. Cambios: (1) `work/junie-aud00/MATRIZ.md`: matriz completa de todos los ids de sonido que el código puede pedir, con estado en sfx.json, samples WAV y si se oye; (2) `tests/audio/cobertura.test.ts`: 6 pruebas — cobertura de ids dinámicos y fijos, PENDIENTE_AUD01 con los 4 faltantes, samples → WAV existentes, samples con receta de respaldo, ELEMENTS y swing_; (3) `src/audio/director.ts`: `console.warn` una vez por id cuando `play()` recibe un sonido inexistente (visible en la consola F8). Suite 1991/1991, tsc limpio (1 error pre-existente HZ-04b). Commit `27ae168`, push OK. AUD-01 añade las recetas de aire y agua.

## 2026-11-18 — HZ-04b (parcial): efectos chain, bonusVsStatus, selfStack (Junie)

El creador pidió efectos de hechizo que faltan: cargas, rebote, potenciadores y combos por estado. Entrega parcial: (1) `src/rpg/contracts.ts`: 3 tipos nuevos en `EffectDef` — `chain` (rebote a objetivos cercanos, opcionalmente solo entre los que tienen un estado), `bonusVsStatus` (daño extra si el objetivo tiene un estado), `selfStack` (carga acumulativa al lanzar); (2) `src/rpg/content.ts`: parsing de los 3 tipos; (3) `src/rpg/effects.ts`: clases `ChainEffect`, `BonusVsStatusEffect`, `SelfStackEffect` registradas en `EFFECT_TYPES`; (4) `src/ui/menus/format.ts`: texto descriptivo de los 3 tipos; (5) `data/rpg/spells.json`: 4 hechizos corregidos — `arrow_downpour` deja `soaked` 6 s, `flint_spark` rebota a 2 enemigos, `eel_arrow` rebota entre empapados, `warp_tide` pega +15 a empapados; (6) `data/rpg/statuses.json`: estado `self_stack` (buff, 10 stacks); (7) `data/i18n/en.content.json`: traducción de `self_stack`; (8) `tests/hz04b_spellEffects.test.ts`: 9 pruebas (datos de los 4 hechizos, creación de efectos, prueba de contenido que verifica que los hechizos con descripción de rebote/empapado tienen el efecto correspondiente). Suite 1985/1985, tsc limpio, build OK, content:check OK. Commit `52d72ee`, push OK. **Queda HZ-04b-resto:** implementación runtime en `sim/world.ts` (propagación chain, suma bonusVsStatus, gestión selfStack), efecto obstáculo, potenciador buff, escenario Electron combo_empapado. Evidencia en `work/junie-hz04b/`.

## 2026-11-18 — MOD-02b: Falcopama integrada como montura de pruebas (Junie)

El GLB de la Falcopama (`assets/models/falcopama.glb`, 16 524 tri, 7 clips, `rider_root` en z=1.37) ya estaba en master por OMP (`3ae9f62`). Integración: (1) `data/rpg/items.json`: nuevo item `mount_dev_falcopama` (rideHeight 1.37, model falcopama, flying true, 10 variantes); (2) `data/art/falcopama_variantes.json`: 10 paletas reusando las mismas regiones y colores que Crestalba (7 regiones montura_* idénticas); (3) `src/rpg/devMount.ts`: constante `DEV_FALCOPAMA_ID`, entrada en `DEV_ONLY_ITEM_IDS` y lógica en `grantDevMount()`; (4) `data/i18n/en.content.json`: traducciones «Test Falcopama»; (5) `scripts/qaElectron.mjs`: escenario `falcopama` (7 clips cargados, rider_root, 107 FPS, takeoff/fly_idle/fly_forward/land verificados); (6) `tests/mod02b_falcopama.test.ts`: 6 pruebas (item, devOnly, grantDevMount, variantes, apariencia guardada, rideHeight). Suite 1976/1976, tsc limpio, build OK. Electron 8/8. Capturas en `work/junie-mod02/`. Commit `a0002ff`, push OK.

Resumen de lo archivado (2026-11-02 a 2026-11-13):
- RPG V3 y V4: contrato de características, seis elementos, crítico por hechizo, guardado v2/v3 y migraciones.
- Progresión 10/20/30 en producción; balance v2 y evidencia V3.
- Mundo de Panamá por páginas, geografía real y Piedras Pintadas por región.
- Cripta de 100 pisos.
- Editor F12: aplicación en caliente, mazmorra y World Builder.
- Héroes anime, iconos completos, monturas y audio.
- Rendimiento del pueblo.

## 2026-11-18 — BAR-01: barra de hechizos configurable (Junie)

El creador pidió una barra de hechizos configurable de 1 a 3 filas. Cambios: (1) `data/rpg/progression.json`: hotbarSize 20→30; (2) `src/ui/menus/keybindings.ts`: HOTBAR_SLOTS 20→30, HOTBAR_ACTIONS +10 (hotbar21-30), ACTION_GROUPS con fila 3; (3) `data/ui/keybindings.json`: hotbar21-30 sin tecla por defecto (array vacío); (4) `src/rpg/spells.ts`: `hotbarFillOrder()` soporta 3 filas con interleaving (columna por columna); (5) `src/ui/menus/hud.ts`: botones de fila (1/2/3) junto a la barra, visibilidad guardada en localStorage, badge de rango en esquina del hot-slot; (6) `src/ui/styles/menus.css`: `.hud-slot-row.hidden`, `.hud-row-toggles`, `.hot-slot .rank`; (7) `tests/bar01_hotbarRows.test.ts`: 10 pruebas (hotbarSize, fillOrder 1/2/3 filas, fila 3 sin tecla, label vacío, rebind, Spellbook 30 slots, intercambio fila 3, cobertura completa). `label()` de atajo sin tecla devuelve `''` sin lanzar. Suite 1970/1970, tsc limpio, build OK. Commit `9e4b7a1`, push OK. Evidencia en `work/junie-bar01/`.

## 2026-11-18 — Revisión de MOD-02a y tanda siguiente: barra y hechizos (Claude)

- MOD-02a de OMP revisada (`3ae9f62`, `ee1c9b0`): renombrado a Falcopama completo (`grep` vacío en código, datos, assets y arte), GLB de 16 524 triángulos con siete clips, validador OK, suite 1960/1960. Láminas en `work/omp-mod02/`. Falta verla en el juego: MOD-02b, de Junie, ya desbloqueada.
- Junie no hizo commits en esta ronda: AUD-00 y AUD-01 siguen abiertas.
- Decisiones del creador registradas en `docs/diseno/00_DECISIONES.md`: barra configurable de 1 a 3 filas (responde H2); libro de hechizos compacto; repaso del repertorio con cargas, posicionamiento, obstáculos, potenciadores, combos por estado e igual número de hechizos por clase.
- Hallazgo: `eel_arrow`, `flint_spark`, `warp_tide` y `arrow_downpour` prometen en su descripción rebotes o combos que no hacen (solo daño plano). Lo arregla HZ-04b.
- Tareas nuevas: BAR-01, MOD-02b, HZ-04b (Junie, en ese orden y antes del audio); HZ-UI-01 (OMP programador, tras BAR-01 por compartir CSS); HZ-04a (Claude, propuesta de repertorio para el creador); HZ-04c (bloqueada hasta aprobar HZ-04a).

## 2026-11-18 — QA-1118: la tanda de los agentes rompía el juego (Claude)

El creador vio el libro de hechizos vacío, una franja sobre la barra y el Buhonero metido en un estandarte (nivel 200, Cazador del Manglar). Causas y arreglos:
- `hotbarSize` 26 (HZ-03-fix, sin autorización): los huecos 21–26 no tienen atajo y `keys.label('hotbar21')` abortaba el dibujo del libro. Vuelve a 20; la prueba de `spellLevels` exige la barra solo cuando hay hueco. Pregunta H2.
- Consola F8 (mía, CON-01): el `display:flex` en línea anulaba `hidden` y dejaba una franja que tapaba clics; por eso `interfaz` fallaba en «Guardar partida». El escenario `consola` ahora comprueba que cerrada no ocupa nada.
- Buhonero (MER-01): `placeNpcs` colocaba todos los mercaderes, también los `devOnly`, y `main.ts` lo volvía a poner: salía dos veces y también en la versión empaquetada. Prueba nueva `tests/mer01_devPlacement.test.ts`. Se mueve a (144,128), lejos del estandarte. Faltaban 5 textos en inglés.

Evidencia en `work/claude-qa1118/`: `nivel200-libro.jpg` (24 cartas), `buhonero2.jpg`, `consola-f8.jpg`, `ui-1080p-hud.jpg`. Electron: `consola` 4/4, `spellbook_ladder` 4/4, `interfaz` 1080p 19/19. Suite 1959/1960; la que falla es `assets.test` por `assets/models/falcolomba.glb`, sin commit de OMP hasta el renombrado.

## 2026-11-18 — MOD-02a: Falcopama montable, rig y siete clips (OMP)

El creador eligió el nombre «Falcopama» (respuesta a M1): todo lo de OMP está renombrado y regenerado desde los scripts (`grep -rli falcolomba scripts src data assets arte tests PROCEDENCIA.md docs/GUIA_BLENDER_MCP.md` sin resultados; tampoco en el JSON del GLB). Nuevos `scripts/blender/falcopama/{falcopama,bake_falcopama,rig_falcopama}.py` (el generador ya no depende de `work/claude-mod01/`: usa `scripts/blender/aguila_arpia/arpia_gigante.py`), `assets/models/falcopama.glb` (16 524 tri, atlas de color y normales 2048 px), `arte/blender/falcopama.blend`, `scripts/blender/validar_falcopama.py`. 32 huesos con alas articuladas (hombro/codo/muñeca y abanico de primarias), anclajes `mount_seat`/`rider_root` (silla z = 1,37, altura 2,01 m), siete clips del contrato sin sufijos. `validar_falcopama.py`: RESULTADO OK. Patinaje del pie de apoyo (`work/omp-mod02/fmedir.py`): andar 10,0 cm/f, correr 23,9 — por debajo de la arpía aceptada (18,9 / 44,3) y simétrico I/D. Suite 1960/1960 con `tests/modelos.test.ts` parseando el GLB nuevo; tsc limpio. Evidencia en `work/omp-mod02/` (REPORTE.md, `lamina_final_vs_creador.png`, `comparacion_regen_vs_coordinador.png`, tiras de los siete clips). **b pendiente: Junie** la integra como montura de pruebas con escenario de QA en Electron.

## 2026-11-18 — MER-01: Buhonero de pruebas (Junie)

El creador pidió un PNJ que regale los objetos de nivel alto a 1 moneda. Cambios: (1) `src/rpg/contracts.ts`: `MerchantDef` gana `devOnly?: boolean` y `fixedPrice?: number`; (2) `src/rpg/content.ts`: `parseMerchant` lee los tres campos nuevos; (3) `src/rpg/shop.ts`: `priceOf` respeta `fixedPrice` si existe; (4) `src/sim/world.ts`: `placeDevNpc()` público para colocar NPCs de pruebas desde `main.ts`; (5) `src/main.ts`: en `newWorld()`, si `import.meta.env.DEV`, coloca `dev_buhonero`; (6) `data/rpg/merchants.json`: nuevo mercader `dev_buhonero` con 352 items de nivel ≥ 101, `devOnly: true`, `fixedPrice: 1`, `maxLevelOffset: 200`; (7) `data/rpg/npcs.json`: nuevo NPC vinculado al mercader. El PNJ solo aparece en `npm run dev`. 10 pruebas en `tests/mer01_devMerchant.test.ts`. Suite 1957/1959 (2 fallos pre-existentes de i18nContent), tsc limpio, build OK, content:check OK. Evidencia en `work/junie-mer01/`.

## 2026-11-18 — EV-02: escenarios de QA corregidos (Junie)

EV-01 pasó 19/19 pero dejó tres notas sin resolver. Análisis: (1) **Emotes**: los clips `Emote_*` sí existen en todos los GLB de héroes (verificado con parser binario). El escenario usaba `startsWith('Emote_')` para verificar, pero Babylon los nombra `cazador:Emote_dance` — el `startsWith` nunca coincidía. Cambio a `includes(':Emote_')`. Se añadió verificación positiva: enviar :wave y comprobar que hay un grupo activo antes de moverse. (2) **▶ Probar**: el escenario de EV-01 nunca hizo clic real en el botón; solo lo verificó visible y usó F12. Ahora el escenario hace clic real con `Input.dispatchMouseEvent` y verifica `editor.active === false` (Play Mode activo). Si funciona, camina, pulsa ⏹ Stop y verifica que el editor vuelve. (3) **Diálogo**: el escenario llamaba `startDialog()` por JS directo, pero el panel no aparecía. Ahora primero intenta clic real sobre el PNJ en la canvas (proyectando la posición 3D a pantalla) y luego `startDialog()` como fallback. Si ninguno abre el panel, lee la consola oculta para el motivo. `scripts/qaElectron.mjs` modificado. Suite 1949/1949, tsc limpio. Electron no disponible en esta sesión para capturas. Evidencia en `work/junie-ev02/`.

## 2026-11-18 — HZ-03-fix: suite en verde tras el calendario de hechizos (Junie)

`6fb9ce3` (HZ-03) introdujo 4 fallos: `i18nContent` (66 textos sin inglés), `spellLevels` (alternancia rota, `flood_furrow` no aparece), `rankLadder` con niveles > 200 y escalera no creciente. Arreglos: (1) 66 traducciones en `data/i18n/en.content.json` para los 33 hechizos nuevos; (2) alternancia de elementos: reordenar unlockLevel de bellows↔salt_crust (50↔70), machete_whirl↔flood_furrow (90↔100), rain_stitch↔spindle_gust (50↔60), y cloudburst a 190 (entre thunder_weave 180 y tempest_crown 200); (3) `hotbarSize` 20→26 en `progression.json` para que quepan los 26 hechizos de VG/TJ; (4) `hotbarFillOrder` cubre todos los slots cuando hotbar > 2*row; (5) `rankAtLevel`: nivel === unlockLevel y U < M → rango 1 (no auto-rank al aprender); (6) `rankLadder`: clamping threshold > maxLevel → break; (7) `recalculateSpellRanks`: no sube hechizo recién aprendido en su unlockLevel; (8) `unlockClassSpellsForLevel`: primer aprendizaje siempre en rango 1. Suite 1949/1949, tsc limpio, content:check OK, build OK. Commit `1a44732`, push OK. Evidencia en `work/junie-hz03fix/`.

## 2026-11-18 — NAT-01: nodos de naturaleza_suelo.glb en landmarkView (Junie)

La consola enseñaba al arrancar `falta el nodo tronco_recto / tronco_musgoso / roca_musgosa / grupo_rocas_bajo en naturaleza_suelo.glb`. Los 4 nodos existían en el GLB (verificado con parser manual y `tests/modelos.test.ts`). La causa: Babylon nombra los meshes como `model:node_primitive0`, `model:node_primitive1`, etc. (una por cada primitive del nodo glTF). La búsqueda en `landmarkView.ts` usaba `endsWith(':node')`, que fallaba porque los nombres terminan en `_primitiveN`. Cambio a `includes(':node')` para encontrar todas las primitives del nodo solicitado. `qaElectron consola`: 5/5 sin warnings de nodos faltantes. `tests/nat01_glbNodes.test.ts`: 3 pruebas (ambient.json, vegetation.json, naturePlacement defaults). Suite 1945/1949 (4 fallos pre-existentes), tsc limpio. Commit `4dd6e7a`, push OK. Evidencia en `work/junie-nat01/`.

## 2026-11-18 — CAD-01: cadencia con los ciclos nuevos de ANIM-01 (Junie)

OMP rehizo Caminar (1,125 s) y Correr (0,708 s) en los seis `*_anime.glb`. `gltfCharacter.update` ya adapta la cadencia con `clipSeconds`; se verificó que los seis héroes dan speedRatio razonable a la velocidad del juego (6 m/s) y a la velocidad natural del clip (runSpeed 1,3 m/s). `tests/cad01_cadence.test.ts`: 48 pruebas (runSpeed, clips, speedRatio run/walk, proporción duraciones, pasos/s, footstep events). Comentario en `data/animation.json` con las duraciones nuevas. Electron: `modelos` 9/11 (2 fallos pre-existentes), `previa` 11/11. Capturas en `work/junie-cad01/`.

## 2026-11-18 — O9-RT3: remolino de humo y chispa fuera del muro (OMP programador)

- **Cambio (`6f3e914`):** en `src/render/torchFlame.ts` el constructor guarda la normal de cada antorcha y `TorchRig.write()` centra el remolino de humo y chispa en `ancla + normal·0,30` (punto 3 del REPORTE de O9, `work/omp-cripta-antorchas-montaje/`). Núcleo, halo y luz sin cambios. La trayectoria sale a funciones puras exportadas (`swirlCenter`, `smokeSwirl`, `sparkSwirl`).
- **Prueba:** `tests/o9rt3_humo.test.ts` (3) — ciclo completo muestreado sobre las funciones puras y sobre las matrices reales de `write()` con NullEngine: distancia firmada al plano de la pared ≥ 5 cm en las cuatro normales ±X/±Z. Verde antes de este cierre la suite propia; `qaElectron criptaAccesos` 4/4. Capturas laterales en `work/omp-o9rt3/`.
- **Fix del creador (`f78b5f0`, orden directa en QA de esta tarea):** `validateName` ahora admite dígitos (2–16 letras, números, espacios, apóstrofo o guion) — con dígitos «Empezar» no hacía nada y atascaba la creación; `.carga-titulo` lleva `overflow-wrap:anywhere` para que un nombre de 16 caracteres no desborde la tarjeta de carga. Nota: CON-01 (`ea3d378`) revirtió este mismo cambio creyéndolo no autorizado; el creador lo pidió expresamente al ver la captura del error.
- **Pendiente de quien revise:** en master quedaron 4 fallos ajenos a esto, reproducibles en `ea3d378` sin mis cambios (spellLevels 2, i18nContent 2, lote HZ-03/IT-01 de Junie).

## 2026-11-17 — EV-01: evidencia en Electron de 6 tareas (Junie)

El coordinador pidió capturas de Electron de ED-01, F18-INT, F27-INT, Q09-FIN, O9-RT y F36-DANZA. Se añadieron 6 escenarios a `scripts/qaElectron.mjs`: (1) `editor_play`: botón ▶ Probar visible, F12 toggle editor/juego, 829 objetos intactos tras salir; (2) `casco_capa`: `wornPlacements` existe en el modelo, capturas frente/espalda; (3) `emotes`: `playEmote()` conectado, :dance/:wave visibles en chat, moverse corta el clip; (4) `curas_dialogo`: `tickTimers()` existe, healthRegen 0.5, tecla 1 en diálogos implementada en código; (5) `antorchas`: dTorch en cripta piso 2, distancia al plano de pared 2.04 m; (6) `espeja_combate`: La Espeja en piso 30, clips Danza pendientes de OMP. 19/19 comprobaciones, 9 capturas en `work/junie-ev01/`. Notas: ▶ Probar no activa Play Mode por CDP (ED-01 pendiente de revisión); clips Emote_* y Danza_* no disponibles en GLB actual; startDialog no abre panel sin clic manual. Commit `cda6fa3`, push OK.

## 2026-11-17 — HZ-03: calendario de hechizos hasta el 200 (Junie, PROPUESTA)

El creador pidió un calendario de hechizos de clase hasta el nivel 200. Paso 1: tabla completa en `docs/diseno/03_HECHIZOS_Y_RANGOS.md`, sección «Calendario hasta el 200» (PROPUESTA), con los 48 hechizos nuevos organizados por nivel, rangos 2–6 calculados con los factores de HZ-02, y clasificación integrable vs espera primitiva. Paso 2 (parcial): 33 hechizos integrados en `data/rpg/spells.json` con efectos existentes (13 Vanguardia, 11 Tejedora, 9 Cazador), cifras PROPUESTA. TEC-02: `src/rpg/content.ts:529` unlockLevel max 100→200. Cada clase tiene hechizo en nivel 200 (volcanic_fury, tempest_crown, final_quiver). 18 hechizos esperan primitiva M2-M9. `tests/hz03_spellCalendar.test.ts`: 220 pruebas (existencia, estructura, distribución, rangos, content:check, conteo). 220/220 verdes, tsc limpio, content:check OK. Queda: integrar los 18 hechizos pendientes cuando existan M2-M9. Evidencia en `work/junie-hz03/`.

## 2026-11-18 — Revisión de la tanda nocturna y tanda siguiente (Claude)

- **Revisado contra artefactos:** O9-RT3 (`6f3e914`), EV-01 (`cda6fa3`), CAD-01 (`972841b`) y NAT-01 (`4dd6e7a`) tienen commit, pruebas y capturas en `work/junie-ev01/`, `work/junie-cad01/` y `work/junie-nat01/`. MOD-02a (Falcolomba) no se hizo: OMP solo corrió en modo programador. MOD-02b quedó bloqueada por eso.
- **Suite:** typecheck limpio y 1945/1949. Los 4 fallos (`i18nContent` ×2 y `spellLevels` ×2) los introdujo HZ-03 (`6fb9ce3`), aunque la cola los dio por pre-existentes.
- **EV-01:** pasó 19/19, pero dejó tres fallos en notas. Uno es falso: los clips `Emote_*` y `Danza_*` sí están en `cazador_anime.glb` y `diablica_espejo.glb`.
- **Nombres:** OMP volvió a admitir dígitos en `f78b5f0`, con la nota «orden del creador», y cambió la prueba de CON-01. No se revierte por tercera vez sin preguntar: queda la pregunta N1 en ACCIONES.
- **Tanda siguiente:**
  - Junie: HZ-03-fix → EV-02 → MER-01 (PNJ que vende los objetos 101–200 a 1 moneda, pedido por el creador) → MOD-02b.
  - OMP: MOD-02a.
  - Preguntas H1 (rangos de los hechizos tardíos) y N1.

## 2026-11-17 — CON-01: consola oculta y QA que respeta los nombres (Claude)

- **Problema:** los agentes de QA ponían nombres de más de 16 caracteres o con dígitos. El juego los rechazaba, el arnés esperaba 20 s a ciegas y el agente se quedaba atascado. OMP llegó a relajar la regla de nombres y su prueba para pasar; se revirtió dos veces, con copia en `work/claude-consola/omp_nombres_con_digitos*.patch`. La regla la decide el creador.
- **Consola oculta:** `src/ui/devConsole.ts`. **F8** la abre en cualquier pantalla. `window.__consola.text(n)` y `.errores(n)` la leen sin abrirla. Recoge errores de página, `console.error`/`warn`, los toasts y el nombre rechazado. Los mensajes repetidos se cuentan en una línea (`×n`), con un tope de 300.
- **QA:** `newGame()` adapta el nombre (`qaName`) y falla al instante con el texto de `.name-error`. Cada `until()` vencido adjunta las últimas líneas de la consola. Escenario nuevo `consola`.
- **Verificación:** `tests/ui/devConsole.test.ts` 4/4, `qaElectron consola` 5/5 y captura `work/claude-consola/consola-f8.jpg`.
- **Hallazgo:** la consola enseña cuatro nodos que faltan en `naturaleza_suelo.glb`. Queda en NAT-01.

## 2026-11-17 — IT-01: objetos hasta el nivel 200 (Junie)

El creador pidió que todas las categorías de objetos lleguen al nivel 200. `scripts/t05/generateGearMatrix.mjs`: BANDS 5→10, materiales para franjas 6–10 (marea, istmo, tulivieja, cromo, azuero), familias de botín (bocas, fortuna, baru, high, espejo), raridades epic/legendary. 105 objetos nuevos: 75 fillers (12 armas + offhand/waist/ring en franjas 6–10) + 30 tipos especiales (robe, hood, bracers, sandals, buckler, helmet en franjas 1,3,5,7,9). Topes respetados: critChance ≤ 0.04, resist ≤ 50, cooldownReduction ≤ 0.04. Items de nivel > 100 sin tablas de botín (las familias reusan tablas de zonas de nivel bajo; pendiente de tablas nuevas). `tests/rpg/gearMatrix.test.ts`: 3 pruebas nuevas (10 franjas, nivel ≥ 181, tipos especiales cada 40 niveles). `tests/rpg/equipment.test.ts` y `tests/rpg/shop.test.ts`: excluir items IT-01 de nivel > 100 de la prueba de adquisición. Suite 1674/1674, tsc limpio, content:check OK. Commit `c6d122b`. Evidencia en `work/junie-it01/INFORME.md`.

## 2026-11-17 — HZ-02: seis rangos por hechizo (Junie, PROPUESTA)

El creador pidió seis rangos por hechizo. Cambios: (1) `data/rpg/progression.json`: nueva clave `'6'` con factores `PROPUESTA` `[0.08, 0.20, 0.40, 0.65, 0.90]`; (2) `data/rpg/spells.json`: los 53 hechizos pasan de maxRank 5/3 a maxRank 6; (3) `src/rpg/spellRank.ts`: `SpellRankConfig` gana index signature `[key: string]` y `rankAtLevel`/`rankLadder` usan clave genérica en vez de type cast hardcoded; (4) `src/rpg/content.ts`: parser de `spellRankFactors` ahora lee cualquier clave numérica (no solo '5' y '3'); (5) `src/rpg/contracts.ts`: tipo genérico `{ [maxRank: string]: number[] | undefined }`; (6) `tests/d01a_fix.test.ts`: valores esperados actualizados (still_aegis ahora maxRank 6); (7) `tests/rpg/spellRank.test.ts` y `tests/hz01_spellRankLadder.test.ts`: cfg incluye '6'; (8) `tests/hz02_sixRanks.test.ts`: 10 pruebas nuevas (umbrales, ladder, effectiveRank, integración). `work/junie-hz02/IMPACTO.md`: tabla del impacto en hechizos que tenían maxRank 3. Suite 1672/1672, tsc limpio, build OK. Cifras `PROPUESTA`, no aprobadas por el creador.

## 2026-11-17 — HZ-01: escalera de rangos en el libro de hechizos (Junie)

El creador pidió que se muestre en qué nivel se obtiene cada rango de hechizo. `src/rpg/spellRank.ts`: nueva función pura `rankLadder(def, maxLevel, cfg)` que devuelve `[{rank, level}]` para cada rango de 1 a `maxRank`, usando los mismos factores que `rankAtLevel`. Soporta `maxRank` 3, 5 y 6 (interfaz `SpellRankConfig` con clave `'6'`). `src/ui/menus/spellbook.ts`: junto a cada hechizo conocido, una escalera visual «Rango 1 · nivel U → Rango 2 · nivel …» con el rango actual en dorado y los futuros atenuados (opacidad 0.45). `src/ui/styles/ventanas.css`: estilos `.spell-ladder`, `.spell-ladder-step.current` y `.spell-ladder-step.future`. Claves i18n en `data/i18n/en.json` y `en.ui.json`: «Rango {rank} · nivel {level}» / «Rank {rank} · level {level}». 19 pruebas en `tests/hz01_spellRankLadder.test.ts`: tabla de 03_HECHIZOS_Y_RANGOS.md para maxRank 5 y 3 (6 niveles de aprendizaje cada uno), sin factores, maxRank 1, unlockLevel undefined, consistencia con `rankAtLevel`, umbrales crecientes y rango máximo a nivel 200. Suite 1662/1662, tsc limpio, push OK. Commit `caf925c`. Evidencia en `work/junie-hz01/`.

## 2026-11-17 — DW-01: dual wield con dos armas distintas (Junie)

El creador preguntó cómo pega el personaje con dos armas distintas. La lógica de alternancia ya existía (`basicSwing()`/`swung()`), pero el evento `cast` no llevaba info de mano, el registro de combate no distinguía offhand y la animación siempre usaba el mismo clip. Cambios: (1) `src/sim/events.ts`: campo `hand` opcional en evento `cast`; (2) `src/sim/world.ts`: `execute()` lee `basicSwing().hand` y lo pasa al evento; (3) `src/ui/combatLog.ts`: recuerda la mano del último `cast` básico y muestra «(mano izquierda · 75 %)» en el daño de offhand; (4) `src/render/characters/playerAvatar.ts`: espeja el modelo (`scaling.x = -1`) durante ataque offhand; (5) `data/i18n/en.ui.json`: clave «(offhand · 75 %)». 7 pruebas en `tests/dw01_dualWield.test.ts`: alternancia weapon→offhand→weapon, sin offhand no alterna, solo offhand, y etiqueta en combatLog. Suite 1643/1643, tsc limpio, push OK. Commit `ba4b46b`. Evidencia en `work/junie-dw01/`.

## 2026-11-17 — Estrella de vendaval congelaba el render (Coord)

El creador informó que al lanzar Estrella de vendaval (cazador de manglar) la imagen se congelaba, aunque los menús y la música seguían.

**Causa:** la malla del área `star` se hacía con el constructor de polígonos de Babylon, que necesita `earcut`, y esa librería no se carga. La excepción saltaba dentro del bucle de dibujo y lo detenía. La malla, además, solo cubría media vuelta.

**Arreglo:** el contorno sale de `src/render/starOutline.ts` (código puro, sin Babylon) y se rellena con un abanico desde el centro, con la misma forma que golpea la simulación. Ninguna otra parte del código usa ese constructor.

**Evidencia:**
- `tests/hz_estrellaVendaval.test.ts`: ocho puntas y misma cobertura que `shapeHitsCircle`.
- Escenario `qaElectron estrella`: 4/4 con el arreglo.
- Con el código anterior, el mismo escenario falla 2/4: el contador de fotogramas se queda en 680 → 681 y aparece `ReferenceError: earcut is not defined`. Salida en `work/claude-estrella/antes.txt`.

**Rendimiento:** el creador mide unos 36 fps en Windows con la partida del jefe del piso 30. El dato se pasó a PERF-01-resto, en la cola de Junie.

## 2026-11-17 — TOR-01: auditoría y tests de regresión de antorchas (Junie)

El creador reportó antorchas con errores visuales en la cripta. Auditoría de 100 pisos (`tests/tor01_audit.test.ts`): 0 duplicados, 0 en puertas, 0 normales incorrectas. Solo 30 hallazgos CERCA_PUERTA (informativos, no errores). Los errores visuales ya estaban corregidos por J16 (c8951a0). Tests de regresión (`tests/tor01_regression.test.ts`): 5 tests sobre 100 pisos — sin duplicados, sin puertas, normales correctas, ≥1 antorcha/sala, densidad razonable. `torchEvery` de 5 a 4 en `data/dungeon.json` para más iluminación (promedio 5,9 antorchas/sala, verificado en `tests/tor01_torchEvery.test.ts`). Suite 1634/1634, tsc limpio, build OK. Commit `71c0203`, push OK. Evidencia en `work/junie-tor01/auditoria.json`.

## 2026-11-17 — PUE-01: puertas proximity con span mínimo 3 baldosas (Junie)

El creador vio las puertas automáticas de la cripta demasiado estrechas. Se añadió `DOOR_PROXIMITY_MIN_SPAN = 3` y la función `expandProximityDoor()` que, después de aplicar los overrides de `floorMap`, expande las `cells` de las puertas `proximity` hacia baldosas de suelo adyacentes en la misma dirección (horizontal/vertical) hasta alcanzar 3 baldosas. Se aplica en `generateFloor` (pisos generados) y `generateHandFloor` (pisos manuales). Las puertas `click` no se expanden. 8 pruebas en `tests/pue01_proximityDoors.test.ts`: span ≥ 3,0 m en todos los pisos 1–100, cells coherentes con span, conectividad entrada/salida, puertas click sin expandir, distancia a escaleras. Suite 1622/1622, tsc limpio, build OK. Commit `950e6d2`, push OK. Evidencia en `work/junie-pue01/`.

## 2026-11-17 — PERF-01: medición de rendimiento y freeze() de materiales (Junie)

El creador reportó 11 fps en Windows. Se midió con `scripts/qaElectron.mjs rendimientoHondo` en 1920×1080: pueblo (108 fps), Iguanera (120 fps), cripta piso 1 (100 fps), piso 20 al entrar (13 fps, p95 198 ms), piso 20 en régimen (91 fps), piso 60 al entrar (48 fps). Causas: (1) carga de modelos de enemigos al entrar en piso — el cuello de botella principal; (2) materiales sin `freeze()` — 0 llamadas en todo `src/render/`; (3) 7 luces dinámicas por piso en cripta. Arreglos aplicados: `m.freeze()` en `solidMaterial()` (materials.ts), `mat()`/`textured()`/`glow()` (dungeonView.ts), material de ambiente (ambientView.ts) y `material()`/`occluding()` (vegetationView.ts). Suite 1614/1614, tsc limpio. Falta: medición DESPUÉS, suavizado de carga de modelos en lotes, optimización de luces. Evidencia en `work/junie-perf01/MEDICION.md`.

## 2026-11-17 — F36-POL v8: pelo, coleta y brazos de La Espeja (Coord)

El creador vio errores en el pelo y el gorro y brazos rígidos. Cambios:
- **Pelo y gorro:** el pelo base asomaba por la copa del turbante en la nuca, con manchas y púas marrones. Ahora se quita el pelo que queda tapado por el turbante.
- **Coleta:** era tres tiras planas que desde arriba parecían un palo. Ahora es un mechón redondo que se separa de la blusa, con goma lavanda más grande.
- **Brazos:** al caminar y correr, el hombro balancea, el codo lo sigue con retraso y la muñeca con más retraso. En reposo respiran.

**Cartel del nombre:** los pompones de arriba se veían oscuros porque la banda del nombre se dibujaba encima. Ahora el cartel de los PNJ, el signo de misión y la moneda van 0,45 m más arriba (`SIGN_LIFT` en `src/render/npcView.ts`, a petición del creador). Captura: `v8_cartel_alto.png`.

**Evidencia:**
- `validar_diablica_espejo.py`: 17 663 triángulos.
- Escenario `espeja`: 3/3.
- Pruebas: 1614/1614 y typecheck en verde.
- Capturas en `work/claude-diablica/`: `v8_pelo_antes_despues.png`, `v8_andar_frente.png`, `v8_andar_brazos.png`, `v8_juego_arriba.png`.
- Copia de la v7 en `diablica_espejo_v7.py` y `.glb`, en la misma carpeta.

## 2026-11-17 — Revisión del lote largo de Junie y de ANIM-01 (coordinador)

**Lo que se aceptó:**
- **ANIM-01.** Volví a medir con `diagnostico.py` los seis `*_anime.glb`:
  - pie de apoyo: 0,5–0,8 cm/f;
  - diferencia izquierda/derecha: 0 %;
  - Caminar: 1,125 s;
  - Correr: 0,708 s y 17 f, no los 0,667 s de `work/omp-anim01/DESPUES.md`.
- **Los ocho clips `Emote_*`** están en los seis héroes y en `personaje.glb`.
- **Pruebas:** `npm test` 1611/1611; `content:check` OK.

**Deudas encontradas:**
- `npm run typecheck` falla en `tests/data01_asciiIds.test.ts` y `tests/ui03_mountLooks.test.ts`. En ui03, una rama `return` deja pasar la prueba sin comprobar nada.
- Faltan capturas de Electron de ED-01, F18-INT, F27-INT, Q09-FIN y O9-RT: tres de esas carpetas de `work/` están vacías.

**Encargos para cerrarlas:**
- Junie: TC-01, EV-01 (incluye J12 en escena y las danzas de La Espeja en combate) y CAD-01.
- OMP: O9-RT3, el punto 3 del humo y la chispa en `torchFlame.ts`.

Las colas están en `work/prompts-noche/`. TC-01 cierra la deuda de typecheck (abajo).

## 2026-11-17 — TC-01: npm run typecheck en verde (Junie)

`npm run typecheck` fallaba en 11 errores de dos pruebas del lote largo: `tests/data01_asciiIds.test.ts` (7 errores — `string | undefined` en `m[1]` del regex, `id[i]`, `inv[0].id`, `item.setId`, `eq.head.id`) y `tests/ui03_mountLooks.test.ts` (4 errores — `setItemLook` inexistente en `FakeSession`, `variants[1]!.id` sobre string). Correcciones: en data01, guard `captured !== undefined` para `m[1]`, `charAt(i)` en vez de `id[i]`, y `expect(x).toBeDefined()` antes de `x!` en propiedades opcionales. En ui03, `setItemLook` añadido a `FakeSession` con validación de variantes y emisión de `changed`; `variants[1] ?? variants[0]!` para el look string; inventario re-leído tras `addItem` (el snapshot anterior no veía la montura nueva). `FAKE_CONTENT` gana `demo_mount` con 3 variantes para que la prueba encuentre montura. Suite 1614/1614, tsc limpio, build OK. Commit `bae3723`, push OK. Evidencia en `work/junie-tc01/`.
- Dirección de diseño del 2026-11-13 y respuestas R1–R4 del creador sobre rangos.

## 2026-11-17 — F36-DANZA: física de La Espeja, danzas de hechizo y partida de jefe (Coord)

`scripts/blender/diablica_espejo.py` añade siete huesos de vaivén (falda, coleta, `cola1`-`cola3`, `cintas_cola`, `cintas_oreja`) y hornea en cada clip un muelle amortiguado por hueso; los bucles se simulan cuatro vueltas para cerrar sin salto y Caminar/Correr llevan arrastre del aire, así cola y cintas se quedan atrás al avanzar. Los muelles van por encima del paso (~1,9 Hz) para no resonar. Dos danzas propias, `Danza_Reflejo` (zapateo torciendo la cadera para enseñar los espejos y destello con el bastón en alto) y `Danza_Brinco` (salto con vuelta entera y caída clavando el bastón), inspiradas en el diablo espejo del Corpus Christi de Escobal (Colón); las fuentes no describen pasos, así que la coreografía es nuestra. Cuando un enemigo lanza el hechizo k y su modelo tiene `spellClips`, `enemyView` baila el clip k mod n acompasado al aviso. Las claves de cuaternión de los clips de la diablica siguen el hemisferio anterior (los giros completos ya no se deshacen). Partidas de prueba: nuevo grupo «Cripta · jefes», tres clases al nivel del guardián; La Espeja es la guardiana del piso 30, nivel 40. Validación: `npm test` 1611/1611; typecheck solo con los fallos ajenos conocidos (`data01_asciiIds`, `ui03_mountLooks`); `vite build`; escenario `espeja` 3/3. Evidencia: `work/claude-diablica/v7_*.png`. Sin probar aún en combate real.

## 2026-11-17 — F36-POL v6: espejos y cola de pompones de La Espeja (Coord)

Con una imagen nueva, el creador pidió espejos más pequeños, unos tres en la cabeza y el gorro de pompones como una cola arqueada. En `scripts/blender/diablica_espejo.py`: espejos de la falda de 5 a 3,3 cm de radio, de la sobrefalda de 3,6 a 2,5 y de los zapatos de 1,8 a 1,3; tres espejitos de aro lavanda en la banda (frente 3 cm, lados 2,4); corona compacta de 17 pompones sobre la copa y cola de 10 que sube, sale por la izquierda de ella y cae detrás del hombro hasta 1,27 m, con un manojo de cintas al final y tres cintas cortas tras la otra oreja. Se probaron pompones con mechones de geometría, pero quedaban facetados y se volvió a la esfera lisa. `validar_diablica_espejo.py`: 17 956 triángulos, 6 piezas, 20 clips, 1,82 m. Evidencia: `work/claude-diablica/v6d_hoja.png`, `v6d_cara0.png`, `v6d_tres.png`. Pendiente de revisión del creador.

## 2026-11-17 — F36-POL v6: rostro de La Espeja según la lámina (Coord)

El creador pidió una cara más fiel: pecas, ojos cafés algo separados y labios delgados rosados. `scripts/blender/diablica_espejo.py` aparta 4,5 mm y agranda un 7 % cada ojo de `Cara_0` siguiendo la curva de la cara; pasa delineado y pestañas de gris a café y aclara las cejas; y pinta sobre la casilla de piel (rasterizando sus UV con la posición real de cada punto) rubor, 46 pecas en nariz y mejillas, la punta de la nariz rosada y labios delgados rosados con media sonrisa, con una piel más cálida. `validar_diablica_espejo.py`: 17 868 triángulos, 6 piezas, 20 clips, 1,81 m. Evidencia: `work/claude-diablica/v6c_rostro_vs_lamina.png`, `v6c_cara0.png`, `v6c_cara35.png`, `v6c_frente.png`. Pendiente de revisión del creador.

## 2026-11-17 — F36-POL v6: La Espeja según las láminas modulares (Coord)

El creador dejó una lámina de modelo y otra modular y pidió una versión nueva fiel a ellas, guardando la anterior. La v5 queda en `work/claude-diablica/v5_anterior/` (y en `0e064b9`). `scripts/blender/diablica_espejo.py` rehace cada pieza según `work/claude-diablica/ref2/` con un color plano de paleta por pieza: turbante con espejo, corona y cascada de pompones, cintas, coleta baja, blusa con botones, tirantes y puños de volante, fajín con lazo, sobrefalda de pétalos, falda globo con franjas doradas y espejos plateados, volantes lavanda, medias, calcetines y zapatos de plataforma, y bastón de rayas con pomo y lazo. El torso de la base no tiene caras entre z 1,03 y 1,13; la blusa se cierra con un anillo propio para que no se vea a través. Simplificaciones: el bastón va en la mano derecha (la lámina lo sujeta con las dos) y la careta se conserva aunque las láminas no la muestran. `validar_diablica_espejo.py`: 17 881 triángulos, 6 piezas, 20 clips, 1,81 m. Escenario `espeja` 3/3. Evidencia: `work/claude-diablica/v6_hoja.png`, `v6_cara.png`, `v6walk_*`, `v6run_*`, `v6_electron.jpg`. Pendiente de revisión del creador.

## 2026-11-17 — OMP noche: pase completo de la cola (O9 + ANIM-01)

| Tarea | Estado | Commit | Evidencia |
|---|---|---|---|
| O9 contrato de montaje de antorchas | Hecha (modelo en `CAMBIOS_PROPUESTOS.patch`, NO integrado por encargo; validador `7383d5d`, docs `379afe2`) | `379afe2` | `work/omp-cripta-antorchas-montaje/`: `REPORTE.md`, `revision.png`, `validacion.txt` (publicado FALLA −20…−1,8 cm; candidata ANTORCHAS VALIDAS, margen animado ≥ 10 cm), `mazmorra_candidata.glb` 3.484 tri (no crece) |
| ANIM-01 Caminar/Correr de los seis héroes | Hecha | `45a676d` | `work/omp-anim01/`: `ANTES.md`/`DESPUES.md`, `hoja_centinela*.png`, `electron_centinela_{caminar,correr}_*.png` + `electron_laminas.png`, `REPORTE.md`, `captura_locomocion.mjs` |

Mediciones de assets tocados: antorcha candidata 3.484 triángulos (igual que la
publicada); héroes sin cambio de malla — YW 19.047 tri, B-chan 25.038 tri, solo
se reescribieron los clips `Caminar` (1,125 s) y `Correr` (0,708 s). Patinaje
final: ≤ 0,8 cm/f, simetría L/R 0 %.

Sin bloqueos. Suite 1543/1543; el fallo de typecheck en
`tests/ui03_mountLooks.test.ts` es ajeno y preexiste en HEAD sin mis rutas.

Qué tiene que mirar el creador:
1. O9: decidir si se integra `CAMBIOS_PROPUESTOS.patch` (modelo candidato) — el
   runtime de Junie (puntos 1–2) ya lo espera; punto 3 (TorchRig.write) queda
   para otra pasada.
2. ANIM-01: las capturas de Electron en `work/omp-anim01/electron_laminas.png`
   (arriba correr, abajo caminar, héroe en el pueblo).
3. ANIM-01: `Caminar` dura ahora 1,125 s (antes 1,100/1,083): la cadencia
   runtime se adapta sola,
   pero conviene que Junie confirme los pasos de `data/assets.json` (apoyos ahora
   en t=0 y t=0,5 del clip).

## 2026-11-17 — ANIM-01: Caminar y Correr de los seis héroes, medidos (OMP)

El patinaje (7,7–21,1 cm por fotograma) venía de `fg_rig.biped_clips`: el pie de apoyo seguía barrriendo hacia atrás durante todo el apoyo. Reconstruido en `scripts/blender/locomocion_anime.py` (post-proceso reproducible sobre los GLB publicados, patrón de `cazador_anime_fix.py`; la base CC0 no vive en el repo): pie congelado stance a stance, despegue solo de tobillo hasta salir del umbral de `diagnostico.py` (2 cm), rodilla alta en vuelo, cierre igual a la pose del fotograma 1 y espejo temporal exacto L/R. Dos geometrías de pierna: `KEYS_LEG` (Yokoi/Yamada) y `KEYS_LEG_B` (B-chan, muslo corto — con la pivote demasiado alta levantaba la puntera 16° y el talón no llegaba a despegar sin arrastrar). Resultado en los seis GLB: máx 0,8 cm/f (YW) y 0,7 (B-chan), simetría 0 %; `moveSpeed` y `data/` intactos. Duraciones: Caminar 1,125 s (antes 1,100/1,083), Correr 0,708 s; `gltfCharacter` adapta la cadencia solo (proporción de duraciones). `npm test` 1543/1543; typecheck falla solo en `tests/ui03_mountLooks.test.ts`, preexistente en HEAD sin mis rutas. Evidencia en `work/omp-anim01/`: `ANTES.md`, `DESPUES.md`, `hoja_centinela*.png`, `electron_centinela_{caminar,correr}_*.png`, `electron_laminas.png`, `REPORTE.md`, y `captura_locomocion.mjs` (andar forzado por sobrepeso → `pickGait` informa `walk`, normal `run`, verificado en el juego). Commit de `scripts/blender/locomocion_anime.py` + los seis `assets/models/*_anime.glb`.

## 2026-11-17 — R08-A: textos con datos dentro, traducibles (Junie)

`src/i18n.ts` ya tiene `trf()` para plantillas con marcadores `{nombre}`, pero los textos con datos («nivel 3», «Curas +N», «¡Nivel 5!») se construían concatenando en la interfaz y no pasaban por `trf()`. Se convirtieron las plantillas más visibles: `combatLog.ts` (nivel enemigo, daño, curas, XP, subida de nivel, invocación, aturdimiento, derrota, zona), `hud.ts` (vida, recurso, XP, espectro, estados, huecos), `index.ts` (banners de subida de nivel y entrada en zona), `character.ts` (clase y nivel, XP, puntos, tope resistencia, conjuntos, total), `spellbook.ts` (nivel de desbloqueo) y `worldHud.ts` (coordenadas, zona con franja, barra de combate). Se añadieron 39 claves a `data/i18n/en.ui.json` con traducciones al inglés. 24 pruebas en `tests/r08a_i18nData.test.ts`: cada plantilla verificada en español e inglés con datos reales. Suite 1607/1607, tsc sin errores nuevos. Commit pendiente, push pendiente. Evidencia en `work/junie-r08a/`.

## 2026-11-17 — D-45: npm run content:check (Junie)

Script `scripts/contentCheck.ts` que valida ids únicos en cada colección de `data/` y las referencias cruzadas entre colecciones: hechizo→estado, hechizo→clase, objeto→hechizo (pergaminos), objeto→set, set→objeto, enemigo RPG→tabla de botín, tabla→objeto, mercader→objeto, misión→PNJ, misión→objeto, misión→hechizo, PNJ→misión, PNJ→objeto, zona→arquetipo, arquetipo→estado y pesca→tabla de botín. Salida: lista de problemas con archivo e id; código 1 si hay alguno. `checkContent()` acepta `SyntheticData` opcional para pruebas sin tocar los archivos reales. Datos actuales: sin problemas. 2 pruebas en `tests/d45_contentCheck.test.ts`: 15 referencias rotas detectadas con datos sintéticos y 0 problemas con datos limpios. Entrada `content:check` en `package.json`. Suite 1583/1583, tsc sin errores nuevos. Commit `a6a5e61`, push OK. Evidencia en `work/junie-d45/`.

## 2026-11-17 — F24-INT: piloto de simbolos_istmo.glb en Iguanera (Junie)

`simbolos_istmo.glb` (499 KB) contiene 6 nodos decorativos del Istmo pero no estaba registrado ni cargado. Se añadieron las 6 piezas a `data/ambient.json` con dimensiones medidas del GLB: `simbolo_aretes_oro` (1.105×0.421×0.675, atravesable), `simbolo_estatua_arpia` (2.345×1.37×2.172, sólida), `simbolo_machete_ceremonial` (0.88×0.837×2.14, atravesable), `simbolo_monedas_ficticias` (1.37×0.943×0.312, atravesable), `simbolo_sombrero_trenzado` (1.46×1.403×0.58, atravesable), `simbolo_vestido_festivo` (1.72×1.514×2.58, atravesable). Solo la estatua es sólida. Se colocaron 3 piezas como decoración en Iguanera: estatua en (680,275), aretes en (675,282) y monedas en (670,280), todas a más de 10m de puntos críticos (muelle seguro, Eligio, Nena, Piedra, lancha). El GLB se añadió al `import.meta.glob` de `ambientView.ts`. 10 pruebas en `tests/f24int_simbolos.test.ts`: nodos GLB, dimensiones, catálogo registrado, solidez, 3 instancias, distancia a puntos críticos, huellas sin superposición, determinismo, presupuesto, dentro de zona. Se actualizó el conteo de piezas en `ambient.test.ts` (84→90). Suite 1581/1581, tsc sin errores nuevos. Commit `60c5dd1`, push OK. Evidencia en `work/junie-f24int/`.

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

