# Trabajo de agentes

La cola activa está únicamente en [docs/TAREAS.md](../docs/TAREAS.md). Estado y evidencia: [docs/ESTADO_ACTUAL.md](../docs/ESTADO_ACTUAL.md). Instrucciones: [AGENTS.md](../AGENTS.md).

Trabajar en master, una tarea acotada y un escritor por archivo. Preservar cambios preexistentes. No crear ramas o worktrees rutinarios ni encadenar agentes que se esperan entre sí. Una interacción terminada no implica proceso autónomo ni vigilancia activa.

Cada entrega actualiza tarea, estado si cambió comportamiento y una nota breve de bitácora. Pruebas reales, typecheck y diff revisado antes de commit/push. No generar por defecto PROMPT/STATUS/RESULTADO por cada paso ni copiar código fallido a informes. Como máximo, una carpeta temporal de encargo mientras esté activo; al integrar se consolida o se retira, con evidencia conservada en Git.

Un informe externo COMPLETADO no acredita integración. Después de dos errores equivalentes se registra el límite y se deja de repetir. Propuestas y cifras no se convierten en decisiones del creador.

Los encargos vencidos y la propuesta equipment/roll fueron retirados en la limpieza2026-11-02; se pueden consultar con `git show ac150a2:agents/<ruta>`. Las entregas aceptadas están en [histórico](../docs/historico/README.md). Las herramientas de `.agents/skills/` se conservan intactas.
