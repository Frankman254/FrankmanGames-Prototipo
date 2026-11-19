# Documentación del proyecto

Empieza aquí. Revisado el 2026-11-17.

## Para el creador

| Necesidad | Documento |
|---|---|
| **Qué tienes que probar y qué decisiones te pido** | [Acciones del creador](ACCIONES_CREADOR.md) (empieza por arriba) |
| **Editor (F12) y herramientas de desarrollo** | [Guía de desarrollo](GUIA_DESARROLLO.md) |
| Qué funciona hoy y con qué límites | [Estado actual](ESTADO_ACTUAL.md) |
| **De qué va el juego: historia, clases, hechizos, monstruos y versión estable** | [Dirección de diseño](diseno/README.md) |
| Qué falta, por orden | [Tareas](TAREAS.md) |
| Cambios recientes | [Bitácora](BITACORA.md) |
| Etapas del producto | [Hoja de ruta](HOJA_DE_RUTA.md) |
| Tus respuestas al cuestionario | [Cuestionario](PREGUNTAS_CREADOR.md) y [respuestas originales](FrankmanGames_Respuestas_Originales_Intactas.md) |
| Tu visión del juego | [Visión pulida v0.4](FrankmanGames_Vision_Creador_Pulida_v0.4.md) |

## Para agentes

| Necesidad | Documento |
|---|---|
| Dónde vive cada responsabilidad del código y **dónde se añade cada tipo de contenido** | [Arquitectura](ARQUITECTURA.md) |
| Qué contenido se construye y por qué | [Dirección de diseño](diseno/README.md) |
| Recorrido automático en Electron | [Prueba rápida](PRUEBAS_RAPIDAS.md) y [herramientas de QA](HERRAMIENTAS_QA.md) |
| Mochila, comercio y banco | [Inventario y banco](INVENTARIO_BANCO.md) |
| Evidencia de progresión y balance | `npm run balance:v3` y auditorías de `scripts/balance/`; los informes V2 y V3 están en el [histórico](historico/balance/FrankmanGames_Auditoria_Progresion_Balance_V2_PA_PM_Briznas.md) |
| Integrar arte y audio de Codex | [Guía de integración](GUIA_INTEGRACION_ARTE_AUDIO.md) y [reparto con Codex](REPARTO_CODEX.md) |
| Modelar en Blender por MCP y lanzar OMP | [Guía de Blender MCP](GUIA_BLENDER_MCP.md) |
| Generar música o sonido con IA y lanzar OMP en modo Audio | [Guía de audio MCP](GUIA_AUDIO_MCP.md) |
| Trabajar en Mac | [Continuidad Mac](CONTINUIDAD_MAC.md) y [referencias](referencias/README.md) |
| Ideas no aprobadas | [Propuestas](propuestas/README.md) |
| Documentación vieja (handoffs, auditorías, informes pasados) | [Archivo histórico](historico/README.md) |

Organización: en `docs/` sólo lo vigente; todo lo vencido se mueve a `docs/historico/` (no se borra). Las imágenes de pruebas van en `work/capturas/` (fuera de Git) y `docs/propuestas/` ideas no aprobadas. `docs/Frankman_OMP_Windows/` es del creador: no se toca.

## Mapa de documentos (2026-11-17)

Columnas: propósito, estado, último cambio en Git, solapes conocidos, documentos vigentes que lo enlazan y destino recomendado.

| Documento | Propósito | Estado | Último cambio | Solapes | Enlaces entrantes | Destino |
|---|---|---|---|---|---|---|
| `../AGENTS.md` | Reglas para agentes y contrato de tarea | Canónico | 2026-11-17 | Ninguno; el contexto del Slice 01 pasó a `historico/alcance/` | Todos los agentes | Mantener |
| `ESTADO_ACTUAL.md` | Hechos comprobados | Canónico | 2026-11-17 | Ninguno; las crónicas pasaron a `historico/` | 6 | Mantener |
| `TAREAS.md` | Tablero único | Canónico | 2026-11-17 | Las colas de `work/prompts-noche/` repiten filas, no crean tareas | 15 | Mantener |
| `ACCIONES_CREADOR.md` | Qué prueba o decide el creador | Canónico | 2026-11-17 | Ninguno | 7 | Mantener |
| `HOJA_DE_RUTA.md` | Etapas del producto | Canónico | 2026-11-13 | Orden de detalle en `diseno/06` | 2 | Mantener |
| `BITACORA.md` | Entregas recientes | Canónico | 2026-11-17 | Hasta el 2026-11-13, en `historico/BITACORA_2026-11-02_A_2026-11-13.md` | 7 | Archivar por tramos |
| `ARQUITECTURA.md` | Dónde vive cada cosa y plan técnico | Canónico | 2026-11-17 | Ninguno | 5 | Mantener |
| `diseno/` | Dirección de diseño y decisiones fechadas | Canónico | 2026-11-17 | Ninguno | — | Mantener |
| `propuestas/` | Ideas sin aprobar | Canónico | — | Ninguno | — | Mantener |
| `GUIA_BLENDER_MCP.md` | Blender MCP, OMP y contrato de calidad 3D | Vigente | 2026-11-17 | Parte de `CONTINUIDAD_MAC.md` | 5 | Mantener |
| `GUIA_AUDIO_MCP.md` | Stack de audio IA (ACE-Step Studio), OMP modo Audio y contrato de calidad sonora | Vigente; el piloto (AUD-IA-01) está pendiente | 2026-11-19 | Integración final en `GUIA_INTEGRACION_ARTE_AUDIO.md` | 3 | Mantener |
| `CONTINUIDAD_MAC.md` | Arrancar el proyecto en el Mac | Vigente, sin revisar desde el 2026-11-09 | 2026-11-09 | Cita `scripts/local-ai/`, que el creador no usa | 2 | Revisar en T03 |
| `GUIA_DESARROLLO.md`, `PRUEBAS_RAPIDAS.md`, `HERRAMIENTAS_QA.md` | Editor, atajos y QA en Electron | Vigentes | 2026-11-06 a 13 | Se complementan | 1–3 | Mantener |
| `GUIA_INTEGRACION_ARTE_AUDIO.md`, `REPARTO_CODEX.md` | Integrar arte y audio; reparto con Codex | Vigentes | 2026-11-13 | El reparto de papeles ya está en `AGENTS.md` | 3 | Mantener |
| `INVENTARIO_BANCO.md` | Mochila, comercio y banco | Vigente | 2026-11-02 | Filas de banco en `ESTADO_ACTUAL.md` | 2 | Mantener |
| `PREGUNTAS_CREADOR.md`, `FrankmanGames_Respuestas_Originales_Intactas.md`, `FrankmanGames_Vision_Creador_Pulida_v0.4.md` | Palabras del creador | Intactos | 2026-10-31 a 11-02 | Ninguno | 1–5 | No se tocan |
| `historico/` | Documentos vencidos; no dan instrucciones | Archivo | 2026-11-17 | — | — | Solo se añade |

Movidos a `historico/` el 2026-11-17 (D-41): `AUDITORIA_JUNIE_2026-11-11.md` y `PLAN_EJECUCION_RPG_V4.md` a `auditorias/`; los informes `FrankmanGames_*` de balance V2 y V3 a `balance/`; `local-ai/` entero, porque el creador no usa el modelo local; y copias literales del tablero, el estado, la bitácora hasta el 13 y el `AGENTS.md` anteriores.

## Autoridad y mantenimiento

Las respuestas del creador no se deducen del código. Las decisiones DEC vigentes pertenecen al registro vecino indicado en [AGENTS](../AGENTS.md). Las ideas de agentes, las propuestas de datos y un test verde no son aprobación creativa.

Una sola entrada por pendiente en TAREAS.md, con evidencia y criterio de aceptación. ESTADO_ACTUAL.md describe comportamiento. Una entrega modifica esos documentos y añade una entrada breve a BITACORA.md: no crea otro informe, checklist, STATUS o handoff. Lo que el creador debe probar o decidir va arriba en ACCIONES_CREADOR.md.

Los informes generados de balance se escriben en `work/balance/` (ignorado). La evidencia V3 se regenera con `npm run balance:v3`.

Antes de publicar documentación ejecuta `npm run docs:check`. Para cambios de código, `npm test` y `npm run typecheck`; si cambia interfaz o empaquetado, `npm run build`.
