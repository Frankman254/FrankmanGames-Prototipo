# Dirección de diseño

Encargo del creador (2026-11-13): dar al juego una historia, una línea de progreso y un contenido con propósito, y dejar el trabajo repartido para los agentes.

Estos documentos dicen **qué se va a construir y por qué**. Los agentes los leen antes de crear contenido.

| Documento | Responde a |
|---|---|
| [00 Decisiones](00_DECISIONES.md) | Qué aprobó el creador, qué es provisional, qué está bloqueado y qué decisiones suyas se conservan |
| [01 Mundo e historia](01_MUNDO_E_HISTORIA.md) | De qué va el juego, quién es el jugador, qué pasa en cada acto |
| [02 Clases](02_CLASES.md) | De dónde es cada clase, su historia y cómo se juega |
| [03 Hechizos y rangos](03_HECHIZOS_Y_RANGOS.md) | Cuántos hechizos, en qué nivel se aprenden, cuándo suben de rango y qué mecánicas faltan |
| [04 Bestiario](04_BESTIARIO.md) | Familias de monstruos, con su raíz panameña y su forma de pelear |
| [05 Versión estable](05_VERSION_ESTABLE.md) | Qué falta para una versión jugable de principio a fin, misiones y fichas de zona |
| [06 Plan de implementación](06_PLAN_IMPLEMENTACION.md) | En qué orden se construye, con qué dependencias y pruebas |

## Estado (respuesta del creador, 2026-11-13)

- **Aprobada como base de trabajo, no como decisiones cerradas.** Qué está aprobado, qué es provisional y qué está bloqueado: [00 Decisiones](00_DECISIONES.md).
- **El silencio del creador no autoriza nada.** Una decisión narrativa o mecánica nueva solo vale con su respuesta expresa.
- **Ninguna tarea de la cola está autorizada en bloque.** El orden, las dependencias y lo que hace falta para empezar cada una: [06 Plan de implementación](06_PLAN_IMPLEMENTACION.md).
- Todas las cifras (niveles, cantidades, daños) son `PROPUESTA`. No se cambia el balance productivo, las franjas, los hechizos ni los recursos de combate hasta nueva orden.
- Los nombres son originales y provisionales. Las tradiciones de Panamá se usan como raíz, con investigación, respeto y consulta, y sin copiar otros juegos (regla clean-room de [AGENTS](../../AGENTS.md)).
- Los borradores de `docs/propuestas/narrativa/` quedan como material de consulta.

## Cómo se usa

1. Una tarea de contenido cita la sección de estos documentos que desarrolla.
2. Si un agente necesita inventar algo que aquí no está (un pueblo, un monstruo, un hechizo), lo propone en su entrega con la etiqueta `PROPUESTA` y no lo da por aprobado.
3. Las tareas viven en [TAREAS](../TAREAS.md), sección «Dirección de diseño (2026-11-13)». Un agente solo ejecuta las que digan «Autorizada».
