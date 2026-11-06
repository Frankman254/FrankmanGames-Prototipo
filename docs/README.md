# Documentación del proyecto

Empieza aquí. Corte de revisión: 2026-11-02; base inspeccionada `ac150a2`.

| Necesidad | Documento mantenido |
|---|---|
| Saber qué funciona y qué falta acreditar | [Estado actual y evidencia](ESTADO_ACTUAL.md) |
| Elegir la siguiente tarea y saber cuándo termina | [Tareas priorizadas](TAREAS.md) |
| Entender las etapas de producto | [Hoja de ruta](HOJA_DE_RUTA.md) |
| Localizar responsabilidades del código | [Arquitectura actual](ARQUITECTURA.md) |
| Probar mochila, comercio y banco | [Inventario y banco](INVENTARIO_BANCO.md) |
| Probar el juego en minutos con el recorrido automático | [Prueba rápida](PRUEBAS_RAPIDAS.md) |
| Respuestas y comprobaciones del creador | [Acciones del creador](ACCIONES_CREADOR.md) |
| Preguntas y respuestas conservadas | [Cuestionario](PREGUNTAS_CREADOR.md) |
| Delegar tareas a la IA local y consultar sus mediciones | [Subagente local](local-ai/README.md) |
| Ver cambios recientes | [Bitácora](BITACORA.md) |
| Integrar arte y audio entregados por Codex | [Guía de integración](GUIA_INTEGRACION_ARTE_AUDIO.md) |
| Consultar antecedentes | [Archivo histórico](historico/README.md) |
| Leer ideas todavía no aprobadas | [Propuestas](propuestas/README.md) |

Reparto de trabajo con Codex (audio, emotes, iconos, texturas y modelado): [REPARTO_CODEX](REPARTO_CODEX.md).

## Autoridad y mantenimiento

Las respuestas del creador no se deducen del código. Las decisiones DEC vigentes pertenecen al registro vecino indicado en [AGENTS](../AGENTS.md). Las ideas de agentes, las propuestas de datos y un test verde no son aprobación creativa.

Mantén una sola entrada por pendiente en TAREAS.md, con evidencia y criterio de aceptación. ESTADO_ACTUAL.md describe comportamiento; HOJA_DE_RUTA.md contiene etapas, sin duplicar casillas de tareas. Una entrega modifica esos documentos y añade una entrada breve a BITACORA.md: no crea otro informe, checklist, STATUS o handoff por defecto.

Los handoffs antiguos se consultan como fotografías históricas, nunca como instrucciones activas. Los prompts vencidos, informes rechazados y copias de código fallidas se recuperan de Git si hace falta; no se acumulan en el checkout. Las skills de `.agents/` se conservan como herramientas.

Los informes generados de balance se escriben por defecto en `work/balance/` (ignorado); no sobrescriben el histórico ni crean documentos activos. Se pueden elegir rutas explícitas con `--out` y `--zones-out`.

Antes de publicar documentación ejecuta `npm run docs:check`. Para cambios de código ejecuta pruebas adecuadas, `npm test` y `npm run typecheck`; si cambia interfaz o empaquetado, `npm run build`. Registra comandos y límites reales, separando tests, compilación y revisión visual.
