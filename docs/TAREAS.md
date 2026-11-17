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
| O8 | P2 | Coord | Entregada; sin integrar | Kit de accesos de la cripta (subida, bajada, puerta adaptable) en `work/omp-cripta-accesos/` con `CAMBIOS_PROPUESTOS.patch`. `scripts/blender/mazmorra.py` no cambia desde el 2026-11-14 | J17 (hecha, `a892405`) | Revisar el parche y las capturas; integrar con `git apply --check` y escenario de cripta en Electron, o anotar por qué no |
| O9 | P2 | Coord | Entregada; sin integrar | Contrato de montaje de antorchas corregido en `work/omp-cripta-antorchas-montaje/` (origen en el plano de pared, +X a la sala, penetración 0, margen animado ≥ 10 cm en llama). Modelo en `CAMBIOS_PROPUESTOS.patch` (solo `mazmorra.py`, apply-check OK, GLB reproducible bit a bit); validador `scripts/blender/validar_antorchas.py`: el publicado falla (−20…−1,8 cm), la candidata pasa. La matriz con yaw y el ancla en el plano exacto los aplica Junie en el runtime según el REPORTE | O8 (hecha) | Revisar `revision.png` y `REPORTE.md`; aplicar el parche + los cambios de runtime 1–3 y probar la cripta en Electron |
| ANIM-01 | P1 | O (Blender) | Autorizada (creador, 2026-11-17) | Rehacer `Caminar` y `Correr` de los seis héroes `*_anime.glb`. Medido con `scripts/blender/diagnostico.py`: el pie de apoyo patina 8–21 cm por fotograma y el izquierdo y el derecho no son simétricos. Se puede reclavar en `scripts/blender/fg_rig.py`/`heroe_anime.py`/`heroe_bchan.py` o retargetear `Walk_Loop`/`Jog_Fwd_Loop` de UAL1 (CC0, ya en `PROCEDENCIA.md`) al esqueleto común de 16 huesos. No cambia `moveSpeed` ni `data/` | O9 | Pie de apoyo < 1 cm/fotograma en `diagnostico.py`; izquierdo y derecho dentro del 10 %; hoja de `revisar_locomocion.py` y captura en Electron; evidencia en `work/omp-anim01/` |
| MOD-01 | P1 | Claude | Autorizada (creador, 2026-11-17); modelo por elegir | Un modelo esculpido de verdad (multires/sculpt, retopo, bake PBR) para medir el nivel de modelado frente a los modelos de bloques actuales. Sigue `docs/GUIA_BLENDER_MCP.md` | El creador elige el modelo | Renders frente a la referencia, conteo de polígonos y validador; evidencia en `work/claude-mod01/`. Entra en `data/` solo tras revisión del creador |
| D-00 | P0 | Coord + J | Espera al creador | La suite está en verde desde `b03210c` (1450/1450), que devolvió la zona segura del muelle a (610, 240), sincronizó la vegetación, retiró una de las dos casas y añadió un sendero a la otra. Falta que el creador confirme que es lo que quería (E1–E6) | — | El creador responde E1–E6 en [ACCIONES_CREADOR](ACCIONES_CREADOR.md); lo accidental se corrige sin editar pruebas |

## Propuestas técnicas del coordinador (2026-11-17)

Van separadas de las decisiones de diseño. Ninguna cambia cifras y todas esperan autorización.

| ID | Prioridad | Responsable | Estado | Alcance | Depende de | Aceptación |
|---|---|---|---|---|---|---|
| BAL-01 | P1 | J | Sin autorizar | Las auditorías `scripts/balance/auditBuilds.ts` y `auditCombat.ts` informan por separado la **suma bruta** de las piezas y el **efecto en juego** tras los topes: XP de Aprendizaje (+100 %, `src/rpg/character.ts:213`) y resistencia por elemento (`resistCap`, `src/sim/damage.ts:95`). Hoy JEQ-07 presenta «10100 %» y «102 %» como si fueran efectos | — | El informe muestra las dos columnas; una prueba fija que el efecto nunca supera el tope |
| DATA-01 | P1 | J | Sin autorizar | Migrar el id `tri_tambor_azuerо` (última letra cirílica, U+043E) a ASCII en el generador, `sets.json`, `items.json`, `merchants.json` y la prueba, con alias de carga para guardados antiguos | — | Ningún id de `data/` contiene caracteres no ASCII (prueba nueva); un guardado con el id viejo carga igual |
| TEC-02 | P1 | J | Sin autorizar | El parser topa en 100 el nivel de arquetipo (`src/rpg/content.ts:683`) y el `unlockLevel` de hechizo (`content.ts:470`), mientras `maxLevel` admite 1000. Ampliar cuando D-08 o D-50 lo pidan, de forma explícita | Encargo de D-08 o D-50 | Un hechizo y un arquetipo de nivel mayor que 100 cargan en una prueba; sin cambiar cifras |
| ED-01 | P2 | J | Sin autorizar | Play Mode del editor: `src/editor/playMode.ts` existe, pero el botón «▶ Probar» responde «Play Mode no disponible aún». Conectar instantánea, juego y restauración | — | Escenario Electron: editar, probar, parar y volver al estado editado sin pérdidas |

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

- **Base sana:** D-45 (`content:check` de ids y referencias).
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
| R08 | Parcial | Idiomas: frases con datos dentro del código |
| R10 | Parcial | Acción y movilidad del contrato de agua |
| P05 | Espera revisión | `prop_pila_lena` de OMP en `work/omp-utileria-p05/` |
| P12 | Parcial | Resto del pulido de modales |
| M01 | Parcial | Integrar y medir el arte LOD |
| M06, M07 | Parcial | Lugares que esperan su provincia; mar y costa |
| B06, F27 | Parcial | Clips y caritas de emotes |
| B07 | Parcial | Edificios por Blender |
| F18, F19, F23, F24 | Arte listo, falta integrar | Cabeza y espalda, caminar, utilería, símbolos |
| A01 | Pendiente | Flora según dónde crece cada especie |
| A03, A06, A07 | Parcial | Aplicar PBR, figuras pendientes, tres puntos de densidad |
| U02 (línea visual) | Arte listo, falta integrar | Retrato e iconos de características |
| Q06 | Pendiente | Textos de Iguanera (`PROPUESTA`) |
| Q09 | Parcial | J4d-resto (`01d0b37`) cerró etiquetas, zoom, botín y «Explorado»; UI-01 (`cbd5fed`), el doble clic de la mochila. Quedan «Curas» sin origen y la tecla 1 en diálogos |
| E03 | Parcial | Editor de casas (la mazmorra está hecha) |

## Hechas

Con evidencia en el histórico o en la bitácora. «Falta verlo» quiere decir que el creador aún no lo probó en Electron.

- **2026-11-17:** D-41 (Coord, por el encargo del creador: documentos fechados a `historico/`, `docs:check` en verde). D-01a-fix (`64bd28e`, `tests/d01a_fix.test.ts`). D-01d (`cd4ff62` + `30857a4`: evento `rankUp`, cartel, aviso y agrupación en `rankUpBatch`). D-01d-fix (`30857a4`, `tests/d01d_fix.test.ts`). F36 La Espeja. J13 (`a2cb7a7`, `tests/j13_escenografia.test.ts`: escenografía regional en embarcaderos). J14 (`de1b1d3`, `tests/j14_naturaleza.test.ts`: naturaleza modular en Iguanera).
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
