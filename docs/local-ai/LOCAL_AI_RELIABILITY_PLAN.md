# Plan de confiabilidad

Los problemas y su evidencia están en la [auditoría](LOCAL_AI_AUDIT.md).

## Hecho y probado

| Requisito | Solución | Prueba |
|---|---|---|
| Tarea delimitada con criterios | `subagent.mjs`; sin criterios se rechaza | `e2e.mjs` |
| Guardar estado antes de cada fase | `state.json` con escritura atómica | Matar el proceso de golpe |
| Registrar acciones y errores | `events.jsonl`, `history` y sesión de OMP | Revisado en las pruebas |
| Saber si terminó de verdad | Solo cuentan los criterios, no lo que diga el modelo | Tarea con criterio imposible: `failed` |
| Continuar sin repetir cambios | Copia conservada y `--resume`; verifica antes de gastar modelo | Ver abajo |
| Fallos temporales de inferencia | Espera al servidor sin gastar intentos | Servidor apagado 45 s a mitad de tarea |
| Respuestas cortadas | Detecta `stopReason: length` y pide continuar | Lógica escrita; **sin ejercitar en la e2e** |
| Compactación | Nativa de OMP; la tarea va en el prompt de sistema | **Sin ejercitar**: ninguna tarea llegó al umbral |
| Estados `blocked` y `failed` | Con diagnóstico y checkpoint | `e2e.mjs` |
| Límites configurables | Tiempo, tokens, intentos, pasos y errores seguidos | Tiempo, intentos y pasos probados; tokens sin ejercitar |
| No tocar archivos ajenos | Copia aislada, hook de bloqueo y comprobación de alcance | Escritura externa bloqueada |

### La prueba de la misión

Tarea real sobre `src/sim/rng.ts`, solo como parche y sin aplicarlo:

| Momento de la interrupción | Resultado al reanudar |
|---|---|
| Justo al empezar | `completed`, 2 intentos, parche aplicable |
| Tras leer el archivo | `completed`, 2 intentos, 1 sola edición, misma sesión |
| **Tras editar** | `completed`, **1 intento y 0 tokens más**: verificó y terminó sin usar el modelo |

`src/sim/rng.ts` sigue sin cambios en git tras las tres corridas; en la primera también se comprobó su hash antes y después.

## Límites conocidos

1. El hook cubre `read`, `grep`, `glob`, `edit` y `write`, las únicas herramientas activas. No es un aislamiento del sistema operativo, así que no bastaría si se activara `bash`.
2. La documentación de OMP no aclara si un fallo del hook bloquea o deja pasar en el modo por defecto. Si el hook no carga, no hay aviso; la e2e lo detectaría.
3. Los parches solo modifican archivos existentes. Crear archivos nuevos no está permitido en esta versión.
4. `tsc` en la copia necesita que `files.read` incluya todo lo que el archivo importe.
5. No hay MCP. La CLI resultó suficiente: cualquier agente con terminal puede usarla.

## Pendiente, por prioridad

**P1. Decide el creador**

- Pasar el OMP interactivo a `edit.mode: replace`. Lo recomiendo por lo visto con `hashline`, pero la evidencia es de pocas tareas y cambia tu herramienta diaria, así que no lo apliqué. Comando: `omp config set edit.mode replace`. Se revierte con `omp config reset edit.mode`.
- Bajar el tiempo de stream colgado de 300 s a 120 s: `omp config set providers.streamIdleTimeoutSeconds 120`. Ayuda poco y no resuelve el congelamiento observado, así que es opcional.
- Valorar `bash.gitGuard` y salir de `tools.approvalMode: yolo` en sesiones interactivas: hoy OMP puede hacer cualquier cosa en el repo sin preguntar, mientras otros agentes trabajan en él.

**P2. Siguiente trabajo**

- Permitir archivos nuevos (`files.create`), para que Qwen pueda proponer pruebas.
- Ejercitar compactación, cortes por tokens y el límite de tokens con una tarea larga.
- Medir con tareas del proyecto, no solo con las tareas aisladas del benchmark.

**P3. Vigilar**

- Si el congelamiento vuelve en OMP 18.16.0, guardar la hora y revisarla con los logs del servidor.

## Volver atrás

- **Subagente:** ver [README](README.md#volver-atrás).
- **Arranque automático:** `Unregister-ScheduledTask -TaskName FrankmanAI-AutoStart` y, como admin, `FrankmanAI-LimitesGPU`. Sin esta última, los límites de 150 W y 225 W se pierden en cada reinicio.
- **Modelo:** no se cambió ningún peso ni ajuste; sigue siendo Q4_K_M con 131072 de contexto.
