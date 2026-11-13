# Dirección de diseño

Encargo del creador (2026-11-13): dar al juego una historia, una línea de progreso y un contenido con propósito, y dejar el trabajo repartido para los agentes.

Estos documentos dicen **qué se va a construir y por qué**. Los agentes los leen antes de crear contenido.

| Documento | Responde a |
|---|---|
| [01 Mundo e historia](01_MUNDO_E_HISTORIA.md) | De qué va el juego, quién es el jugador, qué pasa en cada acto |
| [02 Clases](02_CLASES.md) | De dónde es cada clase, su historia y cómo se juega |
| [03 Hechizos y rangos](03_HECHIZOS_Y_RANGOS.md) | Cuántos hechizos, en qué nivel se aprenden, cuándo suben de rango y qué mecánicas faltan |
| [04 Bestiario](04_BESTIARIO.md) | Familias de monstruos, con su raíz panameña y su forma de pelear |
| [05 Versión estable](05_VERSION_ESTABLE.md) | Qué falta para una versión jugable de principio a fin, misiones y fichas de zona |

## Estado

- **Dirección vigente, pendiente del visto bueno del creador por secciones.** Las decisiones que necesito están en [ACCIONES_CREADOR](../ACCIONES_CREADOR.md), arriba.
- Todas las cifras (niveles, cantidades, daños) son `PROPUESTA` y viven en `data/`. Se ajustan con `npm run balance:v3`.
- Los nombres son originales. Las tradiciones y leyendas de Panamá se usan como raíz, con respeto y sin copiar personajes ni textos de otros juegos (regla clean-room de [AGENTS](../../AGENTS.md)).
- Los borradores anteriores de `docs/propuestas/narrativa/` quedan como material de consulta. Si contradicen a estos documentos, mandan estos.

## Cómo se usa

1. Una tarea de contenido cita la sección de estos documentos que desarrolla.
2. Si un agente necesita inventar algo que aquí no está (un pueblo, un monstruo, un hechizo), lo propone en su entrega con la etiqueta `PROPUESTA` y no lo da por aprobado.
3. Las tareas viven en [TAREAS](../TAREAS.md), sección «Dirección de diseño (2026-11-13)».
