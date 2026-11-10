# Documentación del proyecto

Empieza aquí. Revisado el 2026-11-10.

## Para el creador

| Necesidad | Documento |
|---|---|
| **Qué tienes que probar y qué decisiones te pido** | [Acciones del creador](ACCIONES_CREADOR.md) (empieza por arriba) |
| Qué funciona hoy y con qué límites | [Estado actual](ESTADO_ACTUAL.md) |
| Qué falta, por orden | [Tareas](TAREAS.md) |
| Cambios recientes | [Bitácora](BITACORA.md) |
| Etapas del producto | [Hoja de ruta](HOJA_DE_RUTA.md) |
| Tus respuestas al cuestionario | [Cuestionario](PREGUNTAS_CREADOR.md) y [respuestas originales](FrankmanGames_Respuestas_Originales_Intactas.md) |
| Tu visión del juego | [Visión pulida v0.4](FrankmanGames_Vision_Creador_Pulida_v0.4.md) |

## Para agentes

| Necesidad | Documento |
|---|---|
| Dónde vive cada responsabilidad del código | [Arquitectura](ARQUITECTURA.md) |
| Recorrido automático en Electron | [Prueba rápida](PRUEBAS_RAPIDAS.md) y [herramientas de QA](HERRAMIENTAS_QA.md) |
| Mochila, comercio y banco | [Inventario y banco](INVENTARIO_BANCO.md) |
| Evidencia de progresión y balance | [Auditoría V3](FrankmanGames_Auditoria_Progresion_Balance_V2_PA_PM_Briznas.md) |
| Integrar arte y audio de Codex | [Guía de integración](GUIA_INTEGRACION_ARTE_AUDIO.md) y [reparto con Codex](REPARTO_CODEX.md) |
| Modelar en Blender por MCP | [Guía de Blender MCP](GUIA_BLENDER_MCP.md) |
| Trabajar en Mac | [Continuidad Mac](CONTINUIDAD_MAC.md) y [referencias](referencias/README.md) |
| IA local | [Subagente local](local-ai/README.md) |
| Ideas no aprobadas | [Propuestas](propuestas/README.md) |
| Documentación vieja (handoffs, auditorías, informes pasados) | [Archivo histórico](historico/README.md) |

Organización: en `docs/` sólo lo vigente; todo lo vencido se mueve a `docs/historico/` (no se borra). `docs/capturas/` guarda imágenes de pruebas y `docs/propuestas/` ideas no aprobadas. `docs/Frankman_OMP_Windows/` es del creador: no se toca.

## Autoridad y mantenimiento

Las respuestas del creador no se deducen del código. Las decisiones DEC vigentes pertenecen al registro vecino indicado en [AGENTS](../AGENTS.md). Las ideas de agentes, las propuestas de datos y un test verde no son aprobación creativa.

Una sola entrada por pendiente en TAREAS.md, con evidencia y criterio de aceptación. ESTADO_ACTUAL.md describe comportamiento. Una entrega modifica esos documentos y añade una entrada breve a BITACORA.md: no crea otro informe, checklist, STATUS o handoff. Lo que el creador debe probar o decidir va arriba en ACCIONES_CREADOR.md.

Los informes generados de balance se escriben en `work/balance/` (ignorado). La evidencia V3 se regenera con `npm run balance:v3`.

Antes de publicar documentación ejecuta `npm run docs:check`. Para cambios de código, `npm test` y `npm run typecheck`; si cambia interfaz o empaquetado, `npm run build`.
