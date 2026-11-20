# Tareas de desarrollo

Tablero único. Rehecho el 2026-11-18 a petición del creador: aquí solo queda lo abierto. Las filas anteriores, con su texto y su evidencia, siguen sin cambios en:
- [historico/TAREAS_HASTA_2026-11-18](historico/TAREAS_HASTA_2026-11-18.md);
- [historico/TAREAS_HASTA_2026-11-17](historico/TAREAS_HASTA_2026-11-17.md).

Otros documentos:
- lo comprobado: [ESTADO_ACTUAL](ESTADO_ACTUAL.md);
- lo que el creador debe probar o decidir: [ACCIONES_CREADOR](ACCIONES_CREADOR.md);
- el diseño: [diseno](diseno/README.md).

## Reglas del tablero

- **Estados**:
  - **Autorizada**: el creador la encargó y se puede ejecutar.
  - **En curso**.
  - **Parcial**: hay entrega, pero falta parte de la aceptación.
  - **Espera al creador**.
  - **Sin autorizar**.
  - **Bloqueada**.
  - **Hecho**.
- Un agente solo ejecuta filas **Autorizada**. Cada encargo cumple el contrato de 11 puntos de [AGENTS.md](../AGENTS.md#contrato-mínimo-de-una-tarea); lo que falte en la fila lo completa la cola del agente (`work/prompts-noche/COLA_<AGENTE>.md`).
- **Normas comunes**:
  - no se cambian cifras productivas;
  - la lógica va en `src/sim/` o `src/rpg/`, con pruebas;
  - no se relaja ninguna prueba;
  - los nombres son originales y provisionales;
  - la evidencia va en `work/<agente>-<tarea>/`.
- **Quién**: J = Junie, O = OMP, C = Codex, Coord = Claude coordinador, «—» = sin asignar.
- **Al cerrar una fila**: se marca Hecho con su commit y su prueba. En la siguiente limpieza pasa al histórico.

## Nuevas del creador (2026-11-18)

Salen de sus respuestas A1–A6, H03 y de la segunda tanda ([ACCIONES_CREADOR](ACCIONES_CREADOR.md#respuestas-del-2026-11-18)).

| ID | Quién | Estado | Qué hay que hacer | Aceptación |
|---|---|---|---|---|
| UI-04 | O, modo programador | Autorizada; desbloqueada por el coordinador (2026-11-19, noche): WIN-01 ya no toca `src/render/enemyView.ts` | Vida a la vista: jefes y rivales de PvP con barra fija y número actual/máximo; los demás monstruos la muestran, con número, al pasar el puntero. Sin volver a recrear el cartel cada fotograma (WIN-01) | Prueba de formato y capturas en Electron: jefe, PvP y monstruo con el puntero encima; FPS de `rendimiento` antes y después sin caída mayor del 5 % |
| BAL-02 | Coord | Autorizada, tras UI-04 | Proponer vida y mecánicas de jefes tardíos y el daño en PvP, como `PROPUESTA` y medidas contra H04 (combate de nivel 1, menos de 30 s; jefe o PvP de nivel 200, 5–15 min) | Tabla de cifras con su medición; el creador la prueba antes de integrarla |
| DEV-02 | O | Hecho (`b917994`). Autorizada por el creador (2026-11-18), cola OMP 2026-11-19 | Por defecto, el día dura **20 min** (antes 5) y una partida nueva empieza por la mañana. En Opciones → Desarrollo se elige entre 5, 10, 20, 30 y 60 min. El cambio reescribe el divisor `data.lighting.dayLengthSeconds`: la sim divide una fracción de día, así que conserva la hora actual (sin salto) | `tests/dev02_dayLength.test.ts` (5 pruebas puras: defecto 1200 s, hora inicial «Mañana», cambio sin salto, ratio de reloj 4×); capturas Electron en `work/omp-dev02/` (08:38, 1200→300, hora 0,5→0,5) |
| INV-01 | J | Hecho (`064642b`) | Un monstruo invocado no da experiencia ni botín, y muere cuando muere su invocador. Hoy `summonerId` solo se usa para contar invocaciones (`src/sim/enemies.ts`) | 5 pruebas verdes (inv01_summons.test.ts); session.test.ts actualizado |
| MUE-02 | J | Hecho (`e51f34a`) | Morir en la cripta guarda el piso; al reentrar se ofrece «Retomar piso N» o «Empezar en el piso 1». Se conserva en el guardado; partidas viejas cargan sin error | 14 pruebas verdes (mue02_dungeonFloor.test.ts); lastDungeonFloor en SpectralSaveData; dungeonFloorChoice en SessionEvent; modal en index.ts |
| MUE-03 | J | Hecho (`6c5e299`) | Al morir, montura y mascota dejan de verse y no actúan; vuelven al revivir sin perder su configuración | 4 pruebas verdes (mue03_mountPetSpectral.test.ts); arenaView.ts oculta montura cuando spectral.active; syncPets() ya vacía pets (pre-existente) |
| MUE-01 | J | Hecho (`d138726`) | El espectro sigue llegando solo con el Pulso a 0. Al bajar a 20 de Pulso sale un aviso: «si vuelves a caer, te convertirás en fantasma» | 8 pruebas verdes (mue01_pulseWarning.test.ts); evento pulseLow; banner y chat; textos en i18n (es/en) |
| AUD-02 | — | Autorizada | Sustituir los timbres sintéticos de la música por muestras de instrumentos reales con licencia libre (H08), registradas en `PROCEDENCIA.md`. Las partituras actuales se conservan | Antes y después de Iguanera y la cripta en `work/`; licencias registradas |
| AUD-CTX-01 | Coord | Hecho. Pedida por el creador (2026-11-19: «ve agregando las canciones al juego según sea la zona: un pueblo, pelea en un pueblo, la mazmorra y pelea de jefe en mazmorra») | Cuatro canciones propias con orquesta VSCO, en bucle por contexto: pueblo (zona `safe`) `fiesta_en_el_atrio`, pelea en pueblo `choque_en_la_plaza`, cripta `cripta_descenso` y guardián `musica1_propia`. En Ogg/Opus 160 kb/s y registradas en `PROCEDENCIA.md`. La pelea usa la ventana de tensión de la partitura generativa. Las regiones sin pueblo siguen con su partitura. La rotación de las OGG de estudio queda apagada por defecto. Nombres y elección provisionales: el creador puede cambiar cualquiera | 2 pruebas de contexto y 1 de bucle en `tests/audio.test.ts`; `npm run build` con `checkPublishable` limpio; escenario Electron `audioMazmorra` 6/6. Evidencia en `work/claude-aud-juego-musica/` |
| AUD-IA-01 | Coord, en Windows | Autorizada (creador, 2026-11-19: «elige el que mejor creas… deja todo listo») | Instalar ACE-Step Studio 4.0.1 en el PC con la 3080 y hacer el piloto. El stack, la auditoría y los pasos están en [GUIA_AUDIO_MCP](GUIA_AUDIO_MCP.md) §1, §3 y §8: telemetría apagada, acceso de red apagado, conjunto Balanced, Tailscale y SSH solo con clave. No instalar Regrind, MuScriptor, LoRA ni OpenRouter | Los 7 puntos del §8 con evidencia en `work/claude-aud-ia-01/`; `check_audio_ia.ps1` en verde; `omp_audio.sh` conecta desde el Mac; la guía se corrige con lo medido |
| AUD-IA-02 | O, modo Audio | Bloqueada por AUD-IA-01 | Tres motivos originales de ~20 s para Iguanera, varias semillas cada uno (GUIA_AUDIO_MCP §5) | Cada pieza pasa `validar_audio_generado.py` y tiene ficha reproducible en `work/omp-audio-aud-ia-02/`; el creador elige una |
| AUD-IA-03 | J | Bloqueada por la elección del creador en AUD-IA-02 | Integrar el motivo elegido: WAV de 44,1 kHz y 16 bit en `assets/audio/music/iguanera/`, fila en `PROCEDENCIA.md` antes del commit, y cableado con prueba. La partitura actual queda como respaldo | Prueba del cableado; `npm run build` con `checkPublishable` limpio; suena en Electron |
| DIST-01 | Coord | Espera al creador (Q20) | Lanzador gratuito y sin firma para Windows y Mac. Comprueba si cambió `master`, se actualiza solo y tiene un botón «Actualizar». La red queda en el lanzador, nunca en el juego. Propuesta: traer los cambios con `git pull` y recompilar en cada máquina | Según Q20 |
| UI-05 | Coord | Parcial, falta la elección del creador | Cifras de daño flotantes (no las del chat) con tres acabados (plano, relieve y bloque 3D extruido) y ocho tipografías del sistema elegibles en Opciones › Desarrollo, con muestra en vivo (`render/devVisual.ts`, `paintText` en `floatingText.ts`). Propuesto: Impacto + bloque 3D. Sin fuentes descargadas, así que no hay nada que registrar en `PROCEDENCIA.md`; si el creador quiere una fuente libre (OFL o Apache), se descarga con permiso y se registra | Capturas `work/claude-clases/09_danos_letras.jpg` (todas) y `09_danos_juego.jpg`; falta que el creador elija |
| MOD-04 | Coord | En curso, dentro de MOD-07 | Ropa por piezas al estilo de La Espeja para los seis héroes anime (`scripts/blender/heroe_trajes.py`). Mismo rig, clips y piezas teñibles; tocados con nombre `Banda`/`Yelmo` y espalda `Capa` para que el equipo los sustituya | Renders antes y después en `work/claude-clases/`; prueba en Electron |
| MOD-05 | Coord | Hecho | Modelos para el set ya existente `bi_diablico_espejo`: tocado de pompones, espejitos y cintas (cabeza) y lazo con cascada de cintas (espalda), con `scripts/blender/equipo_espeja.py`. Cifras y objetos del set sin tocar; manos, pecho y pies no se dibujan puestos | Objetos visibles al equiparlos |
| ENV-01 | Coord | En curso | Rehacer el atrezo pobre: árboles, hierba, madera y casas. Hecho: luz horneada y copas con bultos en `vegetacion.glb` (9004a9b); casas con teja, cal, tabla y piedra pintadas por código, jardineras y canecillos (`casa.py`). Falta: suelo, cercas y utilería | Capturas antes y después (`work/claude-clases/06_*`, `07_casas.png`) |
| LUZ-01 | Coord | Hecho, a falta del visto del creador | Iluminación más viva sin tocar luces ni datos (`render/sceneLook.ts`): curva ACES, exposición 1,3, contraste 1,18, saturación, sombras frías / luces cálidas y viñeta; bloom opcional apagado. Con el estilo pintura (el de por defecto) el revelado va dentro de su pase, sin pase extra; con el estilo natural, pase propio en media precisión. Todo ajustable en Opciones › Desarrollo (`render/devVisual.ts`). Coordinado con WIN-01 | Capturas `work/claude-clases/08_luz_antes.jpg` y `08_luz_aces.jpg`. FPS en Electron a pantalla completa (`qaElectron rendimiento`), A/B en los dos órdenes: pueblo 66 frente a 74 y 68 frente a 69; el resto de sitios cae en el que corre segundo, sea cual sea (calor de la máquina). Coste dentro del ruido |
| NOM-01 | O | Hecho (`2a73524`). Autorizada por el creador (Q8, 2026-11-18), cola OMP 2026-11-19 | Los nombres de personaje admiten números y hasta 24 caracteres (`NAME_MAX` 16→24, `PROPUESTA`); mínimo 2, sin espacios en los extremos, apóstrofo y guion. La barra del indicador y el `maxlength` usan `NAME_MAX` | Pruebas en `tests/ui/creation.test.ts` (24 ok / 25 mal / dígitos ok) y `tests/ui/devConsole.test.ts`; capturas Electron en `work/omp-nom01/` |
| EQ-09 | Coord | Autorizada | Conjuntos con dichos panameños («del Ñeque», «Vaina»…) y descripciones con humor panameño. Cifras con la curva de EQ-07 | El creador aprueba nombres y textos antes de integrarlos |
| ICO-01 | C | Autorizada | Cada pergamino de hechizo muestra una versión simple del icono de su hechizo, no un pergamino blanco | Lámina a 46 px; registrado en `PROCEDENCIA.md` |
| BES-01 | Coord | Autorizada | Bestiario por familias de hasta 6 miembros con su jefe (para mazmorras), únicos sin familia y archimonstruos con calavera de aviso. Fauna panameña y criaturas propias (arañas, slimes, jabalíes, cerdos, pollos, cangrejos, langostas, cabras lanudas…) en versión cómica, con nombres panameños originales, elemento y habilidades. Primero la ficha en `docs/diseno/` | El creador aprueba la ficha antes de modelar |
| MOD-03 | O (Blender) | Bloqueada por BES-01 | Modelar las familias aprobadas con la calidad de MOD-01 (esculpido, retopología y horneado) siguiendo [GUIA_BLENDER_MCP](GUIA_BLENDER_MCP.md). El coordinador revisa cada entrega frente a la referencia | Renders y validador en `work/omp-mod03-<familia>/` |
| BUG-01 | O | Hecho (`e90b69d`). Autorizada por el creador (2026-11-18), cola OMP 2026-11-19 | En la cripta, a veces el fuego de la antorcha se ve sin la pieza que lo sostiene. Causa: el soporte se giraba con `atan2(ny, nx)` pero la copa está en +X local (contrato O9); en muros ±Z la copa quedaba enterrada en el muro | `tests/bug01_torchBracket.test.ts` (3 puras); recorrido en Electron (`work/omp-bug01/recuento.js`): 445/908 → **0** llamas sin soporte en pisos 1/10/20/30/60/100 |
| T06 | Coord | Autorizada, diseño | Ranura de mascota y menú: características, hechizos y hasta tres hechizos del jugador que lanza sola. Con límites para que no automatice el combate | Diseño aprobado por el creador antes de programar |
| D-01b | J | Hecho (91f68a6) | Hechizos universales: el rango N cuesta N pergaminos | 6 pruebas verdes (d01b_scrollCost.test.ts), tsc limpio, build OK |

## Nuevas del creador (2026-11-19, noche): primero lo visual, después la jugabilidad

Salen de sus palabras del 2026-11-19 por la noche ([ACCIONES_CREADOR](ACCIONES_CREADOR.md#respuestas-del-2026-11-19-noche)): «debemos enfocarnos ahora en el apartado visual… luego vamos a pulir jugabilidad». Además de estas, siguen en lo visual: UI-04, MOD-08 (OMP), MOD-07, MOD-01, MOD-09, EQ-10 y ENV-01 (coordinador). La jugabilidad espera a que estén; mientras, solo se mide (JUG-00).

| ID | Quién | Estado | Qué hay que hacer | Aceptación |
|---|---|---|---|---|
| TEST-01 | J | Hecho (`9b51627`) | 6 pruebas en rojo tras HZ-04c: 2 bugs reales (previewDamage sin selfStack, regen emitida por tick) + 4 pruebas desactualizadas por HZ-04c | Suite 2208/2208, tsc limpio, build OK. CAUSAS.md en work/junie-test01/ |
| UI-07 | J | Hecho (`ui07-fix`) | Repaso visual: arreglado el solape chat/hud-actionbar a 768p con media query `max-height: 800px` en `ventanas.css`. Análisis estático de 5 hallazgos más (anchos fijos, bordes, fuentes). Electron no disponible para capturas. HALLAZGOS.md en work/junie-ui07/ | tsc limpio, suite 2220/2220. Capturas de Electron omitidas (sin display). HALLAZGOS.md en work/junie-ui07/ |
| VIS-02 | O, modo programador | Autorizada, tras UI-04 | Repaso de los efectos de los hechizos de las tres clases: hoja de capturas y arreglo de los 10 que se ven más pobres o iguales a otro, con forma propia por elemento | Hojas antes y después en `work/omp-vis02/`; FPS sin caída mayor del 5 % |
| ENV-02 | O (Blender) | Autorizada, tras MOD-08 | Cercas, utilería y puestos del pueblo con el acabado de las casas de ENV-01 (madera con veta, caña amarrada, telas de pollera), mismos nombres y origen | Validador, renders antes y después, captura del pueblo en Electron con la misma cámara |
| HZ-06 | J | Hecho (`7decbc7`) | Regeneración natural callada y fuera del chat; `perLevel` leído en parser damage/heal; sonido de cura suave (`heal_soft` con throttle 1.5s, `PROPUESTA`); análisis de Vendaval: perLevel funciona, pero Agilidad no cuenta para el scaling (usa inteligencia) | 3 pruebas verdes (hz06_perLevel.test.ts), suite 2221/2221, tsc limpio, build OK. VENDAVAL.md en work/junie-hz06/ |
| HZ-07 | J | Hecho (`hz07-fix`) | Hechizos desconectados: `shield.perLevel` y `pushDamage.perLevel` no se leían en parseEffect (arreglado). Todos los hechizos de las 3 clases auditados a nivel 1 y 200: ninguno roto por conexión. Hallazgos: mist_veil y charcoal_cloud con zona vacía (para el creador) | 9 pruebas verdes (hz07_disconnected.test.ts), suite 2232/2233 (1 fallo pre-existente), tsc limpio. TABLA.md en work/junie-hz07/ |
| JUG-00 | J | Hecho (diagnóstico) | Diagnóstico completo: 8 problemas identificados (sin hit-stop, animaciones no cancelables, giro lento, cámara lenta, clics fallidos), 6 propuestas (JUG-01 a JUG-06). Análisis estático, Electron no disponible | `work/junie-jug00/DIAGNOSTICO.md` con tabla de latencia, problemas y propuestas ordenadas por impacto |

## Nuevas del creador (2026-11-19, tarde)

Salen de sus respuestas del 2026-11-19 por la tarde ([ACCIONES_CREADOR](ACCIONES_CREADOR.md#respuestas-del-2026-11-19-tarde)). Orden de los hechizos: HZ-04d → HZ-04e → HZ-04c → ICO-02. Las reacciones van en paralelo: HZ-05, FX-R01 e ICO-03. Al final, REV-01.

| ID | Quién | Estado | Qué hay que hacer | Aceptación |
|---|---|---|---|---|
| HZ-04d | Coord | Hecho, a falta del visto del creador | Lista concreta de los 96 hechizos del repertorio aprobado (03 §1–§4): 32 por clase (18/4/6/4), con id, nombre, nivel, elemento, papel, área, coste, enfriamiento, efectos de HZ-04b, cifras `base + por nivel` y escalera de rangos hasta el 400. Conserva los 75 ids de clase que existen y añade 21 nuevos. Los 11 universales no cambian | [03 · Lista de 96 hechizos](diseno/03_HECHIZOS_Y_RANGOS.md#lista-de-96-hechizos-hz-04d-propuesta-del-2026-11-19): tablas generadas con una regla de presupuesto, comprobadas (reparto, ids, estados y efectos que existen); cifras `PROPUESTA` |
| HZ-04e | J | Hecho (`e84f02a`) | Motor para HZ-04c (03, «Lo que HZ-04c necesita del motor»): `perLevel` opcional en `damage`, `heal`, `fixedDamage` y `pushDamage` (también dentro de `zone` y `trap`); estados `ward_ranged` y `ward_melee`; potenciadores sobre un aliado; `dispel kind buff` quita también escudos | 16 pruebas verdes (hz04e_motor.test.ts), suite 2160/2162 (2 fallos pre-existentes), tsc limpio, push OK. Evidencia en work/junie-hz04e/ |
| HZ-04c | J | Hecho (vanguardia, `a8f3c1d`; tejedora, `d86d19f`; cazador, `d96bbb9`; medida, `<hash>`) | Pasar a `data/rpg/spells.json` los 96 hechizos de HZ-04d, por clase (HZ-04c-vanguardia, -tejedora, -cazador), con su inglés. Después, medir con el bot de `tests/balance/` y, si cumple H04, activar las reacciones en producción (hoy `devReactions` las deja apagadas) | Vanguardia: 32 hechizos, i18n completo. Tejedora: 32 hechizos (6 nuevos), 261 pruebas verdes. Cazador: 32 hechizos (9 nuevos), 24 pruebas verdes. **Medida (HZ-04c-medida):** 12 pruebas verdes (hz04c_medida.test.ts). Nivel 1: todas las clases < 30 s ✓. Nivel 200: storm_weaver muere con reacciones → **devReactions NO activado por defecto**. Tabla en work/junie-hz04c-medida/MEDICION.md. |
| HZ-05 | J | Hecho (`25651aa`) | Pestaña nueva **Reacciones** en el libro de hechizos: las 5 marcas y las 15 reacciones, cada una con icono, nombre, par de elementos y descripción (de `data/rpg/reactions.json`, con inglés). Icono provisional hasta ICO-03; los de Codex se cargan solos si existen | 8 pruebas verdes (hz05_reactionsTab.test.ts), suite 2140/2141, tsc limpio, build OK. Captura de Electron omitida (CDP no disponible). Evidencia en work/junie-hz05/ |
| FX-R01 | O (programador) | Hecho (`c4e0493`) | Cada reacción se ve: su **nombre** flota sobre el objetivo, con letra distinta de la del daño y color por reacción, y tiene su **efecto gráfico** propio (nube del Vaho, cristal del Congelado, arco del Calambre, barro, lava, ventisca, explosión del Estallido…). Las zonas se ven mientras duran | Prueba de que las 15 reacciones tienen nombre y efecto; capturas en Electron de las 15 en `work/omp-fx-r01/`; sin errores en consola y FPS medidos con `qaElectron rendimiento`. **Hecho (`c4e0493`):** 10 pruebas puras verdes (`tests/fxr01_reactionFx.test.ts`), tsc y build limpios. 15 capturas en `work/omp-fx-r01/` (una por reacción, i18n en español con nombre y color propios). Consola sin errores (CDP `[]`). FPS `qaElectron rendimiento` (mismo commit ±cambio, mismo Mac): antes 91/86/82/107/100/108/117/119/119 → después 120/118/109/120/90/120/120/119/120 (villas/campo/iguanera/chitri/pedasol, vanguardia). Sin caída atribuible al cambio: ReactionFx solo corre en idles cuando `devReactions` dispara reacciones; la diferencia de `salto a un grupo` (90 vs 100) es ruido entre pasadas |
| ICO-03 | C | **Hecho (2026-11-19); integración visual pendiente en HZ-05** | Iconos propios de las 15 reacciones y las 5 marcas elementales, con ilustración pintada, silueta gruesa, alto contraste y transparencia como los iconos de hechizo actuales. Cada reacción comunica su par por una interacción distinta, no por simple recolor. Electron confirmó que HZ-05 aún dibuja sus SVG provisionales: `renderReactions()` no consulta estos PNG, fuera de las rutas de ICO-03 | 20 PNG RGBA únicos de 46×46 px en `assets/icons/reactions/<id>.png`, caja segura de 34 px; cada archivo registrado en `PROCEDENCIA.md`; lámina a tamaño real en `work/codex-ico03/reacciones_46px.png` |
| ICO-02 | C | Bloqueada por HZ-04c (por clase) | Iconos de los hechizos nuevos de HZ-04c que aún no tengan icono | PNG propios a 46 px con el id del hechizo, registrados en `PROCEDENCIA.md` |
| DIA-01 | J | Hecho (`dia01-fix`) | Repaso de todos los diálogos (PNJ, misiones y carteles): frases cortadas o raras, claves sin traducir, nombres equivocados, repeticiones, inglés que falta y la tecla 1 en diálogos (Q09). Se corrige lo que esté roto; el tono y la historia no cambian | 2 traducciones faltantes añadidas (en.content.json). Tecla 1 ya implementada. Lista en work/junie-dia01/HALLAZGOS.md |
| MAP-01 | J | Hecho (`map01-review`) | Repaso del diseño de los mapas, zona por zona: análisis geométrico estático de 148 piezas placed, 42 props y 6 NPCs. 0 errores, 1 advertencia menor (prop_fogata ausente, esperado por J12). Capturas de Electron omitidas (CDP no disponible). Hallazgos en work/junie-map01/HALLAZGOS.md | Script analyze.js, hallazgos_raw.json, HALLAZGOS.md en work/junie-map01/ |
| MOD-08 | O (Blender) | Autorizada | Pulir los modelos de los PNJ (los `npc*` de `data/assets.json`, salvo La Espeja): proporciones, cara, ropa panameña por piezas, mismo estilo que los héroes, mismo rig y clips. Uno primero; cuando pase, los demás | Validador, renders antes y después, captura en Electron por PNJ en `work/omp-mod08/` |
| LUZ-02 | Coord | Hecho (`1bacbc3`), visto del creador el 2026-11-19 | Modos de iluminación en Opciones › Desarrollo (`render/lightModes.ts`): **Vivo** (por defecto), **Claro**, **Cálido** y **Original** (la de antes). Suben la luz ambiente, hacen que el suelo devuelva luz a costados y bajos (rebote) y aclaran las sombras; de noche cambian poco. No tocan `data/lighting.json` por hora. Arreglo de paso en LUZ-01: el primer cambio de cualquier opción de Desarrollo cambiaba el revelado (suelo naranja saturado); ahora se queda como al arrancar | Capturas en `work/claude-luz/` (`modos_dia_noche.jpg`: arriba día, abajo noche; Original, Vivo, Claro, Cálido), del recorrido nuevo `qaElectron luzModos`. FPS A/B en Electron (`rendimiento`, A = Original sin luz del personaje, B = Vivo con ella), orden A-B-B-A: pueblo 77 / 116 / 89 / 59; el segundo A cae por calor de la máquina. Sin coste medible |
| LUZ-03 | Coord | Hecho (`1bacbc3`), visto del creador el 2026-11-19 | Luz propia del personaje, cálida, que lo sigue: entera de noche y en la cripta, tenue de día (35 %) en los modos nuevos; casilla para apagarla. Exterior: alcance 11 → 14, intensidad 0,9 → 1,2, color frío → cálido. Cripta: 0,75/10 → 1,15/13 | Mismas capturas (noche con y sin ella: `luz-noche-vivo*.jpg`) y `cripta_antes.jpg` / `cripta_despues.jpg`; mismo A/B de FPS |
| LUZ-04 | Coord | Hecho (`1bacbc3`), visto del creador el 2026-11-19 | Antorchas de la cripta: intensidad 1,5 → 2,4, alcance 11 → 15. Farolas de fuera: alcance 16 → 21 e intensidad 1,8 → 1,6 (cuatro se solapan en la plaza; con más intensidad la quemaban). Siguen siendo cuatro luces reales a la vez | `work/claude-luz/cripta_antes.jpg` y `cripta_despues.jpg`; noche en `modos_dia_noche.jpg`; mismo A/B de FPS |
| MOD-07 | Coord | Autorizada (absorbe MOD-04) | Las tres clases, en versión masculina y femenina, pulidas como La Espeja: modelado, poses y animaciones | Renders frente a La Espeja y captura en Electron de los seis |
| UI-06 | Coord | Hecho y aprobado por el creador (2026-11-19: «listo esta aprueba») | El inventario muestra al personaje en 3D, animado y con lo que lleva puesto (girar, reposo y algún gesto), en vez del panel plano de hoy. UI-06b (creador, 2026-11-19): mitad personaje y mitad casillas, el personaje y sus huecos crecen con la ventana, un anillo y un arma en cada mano, ancho mínimo, tope de 10 columnas (con más sitio crecen las casillas) y doble clic en lo equipado lo desequipa (QA `mochilaMitades`, 8/8) | Captura y vídeo corto en Electron; FPS del inventario abierto |
| EQ-10 | Coord | Hecho; obtención decidida (botín de La Espeja y partidas de prueba). Falta el visto a tierra+aire (`PROPUESTA`; ver BITACORA 2026-11-19) | Set de **8 piezas** de La Diablica Espeja de nivel 50, sacadas de las piezas del propio modelo del PNJ y guardadas como objetos equipables. Cifras razonables con la curva de EQ-07 (`PROPUESTA`) | Las 8 piezas se ven puestas; tabla de cifras frente a EQ-07; prueba de datos |
| MOD-09 | Coord | Autorizada | Objetos equipables con modelo propio: armas, escudos, tocados y capas de las ranuras que se ven puestas | Lista de qué ranura tiene modelo; capturas puestas |
| MOD-01 | Coord | En curso; ahora: fidelidad | La Falcopama aún no es 100 % fiel al diseño del creador: lista de diferencias frente a su referencia y corregirlas | `work/claude-mod01/DIFERENCIAS.md` y renders lado a lado |
| REV-01 | Coord | Tras todo lo anterior | Revisión final de que todo cuadra: hechizos, reacciones, iconos, textos, modelos y luz | Informe en la entrada de BITACORA; filas cerradas o reabiertas con motivo |

## Rebanada 1–10

Autorizada por el creador el 2026-11-18 (Q14). Las fichas de diseño van antes que el código:
- D-30, fichas de zonas;
- D-10, D-12, D-13 y D-14, familias y comportamientos;
- D-18, comején;
- D-20, misiones 1–5;
- D-25, secundarias;
- D-23, despertar por clase.

## Mapa de Panamá

| ID | Quién | Estado | Qué hay que hacer | Aceptación |
|---|---|---|---|---|
| MUN-01 | Coord | Autorizada, paso 1 | Veraguas (Veraguí) es la provincia siguiente (A1). Primero, una ficha de diseño con sus regiones vecinas, caminos, pueblos y monstruos de cada zona (de la región y originales), con nombres provisionales | El creador aprueba la ficha antes de tocar el terreno o `data/` |

## En curso y autorizadas

| ID | Quién | Estado | Qué falta | Aceptación |
|---|---|---|---|---|
| WIN-01 | Claude | En curso (2026-11-18). Hecho `e13ecc7`: el cartel de cada enemigo se recreaba en cada fotograma; en pantalla completa 3440×1440 con la 3080, pueblo 34→70 fps, Iguanera 60→122, pisos 1/20/60/100 → 160/139/135/150, p95 ≤ 20 ms. Falta: piso 30 con La Espeja, tirones de 1–3 s al entrar a un piso (compilación de shaders y modelos de enemigos), Los árboles ya iban agrupados por trozos de 64 m (thin instances); las piezas de `landmarkView` (casas y demás) pasan a instancias manteniendo su animación propia: 671→624 draw calls en el pueblo, sin cambio visible de fps. Lo que limita el pueblo es la CPU de Babylon con ~1.170 mallas activas y tres pasadas (color, sombras y profundidad). Se mide siempre en pantalla completa (creador, 2026-11-18) | Que el juego vaya fluido en el PC del creador (RTX 3080 y RTX 2080), que hoy no aprovecha ni la GPU ni la CPU (creador, 2026-11-18). Recoge lo que quedó de PERF-01. Contrato debajo | ≥ 60 fps de media y p95 ≤ 25 ms a 1920×1080 en la 3080, con las opciones por defecto, en: pueblo, Iguanera, piso 30 con La Espeja y pisos 1, 20, 60 y 100. Si no se llega, el motivo medido. Se anota también el uso de GPU y CPU. Meta `PROPUESTA` |
| HZ-04a | Coord | Hecho: aprobada por el creador (2026-11-19, tarde), con la condición de que cada reacción se vea (HZ-05, FX-R01) | 2.ª versión, más corta, en [03, «Repertorio revisado»](diseno/03_HECHIZOS_Y_RANGOS.md): 32 por clase (18 de daño, 4 potenciadores, 6 de control y 4 de defensa), 15 reacciones elementales y cifras que escalan con el nivel del personaje | El creador la revisa antes de tocar `data/` |
| HZ-04b | J | Parcial (`c6353ea`), en la cola de Junie (2026-11-19) | Hecho: carga real (selfStack, `30199f9`), Congelado y Entumecido (`35b2c5e`), reacciones elementales (`ca071f2`), potenciadores: power, critChance, critDamage, fixedDamage, pushDamage (`b4016b2`), defensa: escudo perLevel, dispel, invulnerable vs, shareDamage (`c6353ea`). No se asignan a hechizos de producción | 14 pruebas (hz04b_selfStack.test.ts) + 9 (hz04b_estados.test.ts) + 14 (hz04b_reactions.test.ts) + 12 (hz04b_potenciadores.test.ts) + 14 (hz04b_defensa.test.ts) + hz04b_edges.test.ts actualizado |
| HZ-03 | J | Parcial | Faltan 18 hechizos que esperan las primitivas M2–M9. Además, las escaleras de rangos se reparten hasta el nivel 400 (Q9, creador): los últimos hechizos de cada clase son los más fuertes. Depende de D-50 | `tests/hz03_spellCalendar.test.ts` |
| D-06 | Coord | Autorizada | Fijar por entregas la línea de hechizos que falta en las tres clases, sin cuota por elemento | Cifras `PROPUESTA` con comparación; el creador aprueba antes de integrar |
| D-08 | Coord + J | Autorizada por fases | Integrar los hechizos de 25–200; primero los que usan efectos existentes | Se conservan los rangos automáticos |
| D-07 | C + J | En curso | Iconos de hechizo: 53/53 de los actuales y 3/48 de la línea nueva | PNG propios a 46 px, registrados en `PROCEDENCIA.md` |
| EQ-06 | C | Autorizada | Segundo pase de iconos de objetos y de los conjuntos nuevos, incluidas las 243 piezas de EQ-07 | Revisado a 46 px y registrado en `PROCEDENCIA.md` |
| MOD-01 | Coord | En curso | Falcopama esculpida pieza por pieza según su desglose modular ([GUIA_BLENDER_MCP](GUIA_BLENDER_MCP.md)) | Renders frente a la referencia en `work/claude-mod01/`; entra en `data/` tras revisión del creador |
| J12 | J | Hecho (`a752ab5`) | La utilería de Iguanera: análisis completo del flujo de renderizado. Código correcto, coordenadas verificadas con 7 pruebas. Electron no disponible para capturas visuales. Evidencia en work/junie-j12/ |

**Contrato de WIN-01**, añadido el 2026-11-18: en el paso 4 se anota, además, el uso de GPU y CPU con el Administrador de tareas.

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

## Hechas, pendientes de que el creador las vea

| ID | Qué ver |
|---|---|
| EQ-07 | Fichas de objetos de nivel 40 y 200; preguntas Q21 y Q22 |
| F36-POL, F36-DANZA | La Espeja: modelo, vaivén y danzas |

## Esperan al creador

| ID | Qué falta |
|---|---|
| D-50 | Nivel máximo 400 (Q13) |
| EQ-08 | Reforja y versión dorada: recomendación del coordinador pendiente de visto bueno (Q23) |
| D-01c | Tasa de botín de los pergaminos |
| D-17 | Ave: color de la tijereta (Q16) |
| T04 | Cifras de la vertical Panamá Viejo y Diablicos Espejos |
| Q01, Q10, Q13 | Iguanera, ataque automático y hechizos de área propia |
| F05, F22, F28, F33, F34 | Decoraciones, pintura, audio y monturas de desarrollo: hay que verlas o elegir |

## Sin autorizar

Listas para cuando el creador lo diga; el texto completo está en el histórico.

- **Prototipos**: D-02, obstáculo; D-05, Brasa; D-04, Hilos; D-03, Reclamo.
- **Orden del repositorio**: D-42 y D-43, refactors pequeños.
- **Abiertas de antes**:
  - T01 y T02, balance humano;
  - T06, T07 y T10, mascotas con hechizos, harpía y temporadas;
  - T08 y T09, regiones e interiores;
  - T13, vista en vivo al crear personaje;
  - T14, Iguanera como inicio;
  - R03, fuente píxel;
  - R06, monturas productivas;
  - R08, idiomas;
  - R10, acción y movilidad del agua;
  - P05, pila de leña;
  - P12, modales;
  - M01, arte LOD;
  - M06 y M07, lugares y costa;
  - B06 y F27, emotes;
  - B07, edificios;
  - F18, F19, F23 y F24;
  - A01, A03, A06 y A07, flora y arte;
  - U02, retrato;
  - Q06, textos de Iguanera;
  - Q09, «Curas» sin origen y la tecla 1 en diálogos;
  - E03, editor de casas.

## Bloqueadas

- Hasta cerrar la rebanada: D-11, D-15, D-16, D-19, D-21, D-22, D-24, D-31 y D-32.
- D-44, solo si hay choques reales entre agentes.
