# Subagente local (Qwen con OMP)

Claude o Codex orquestan; Qwen ejecuta tareas pequeñas. El subagente trabaja sobre una copia aislada, nunca sobre el repositorio, y entrega un parche que el agente principal revisa y aplica.

Documentos: [auditoría](LOCAL_AI_AUDIT.md), [plan de confiabilidad](LOCAL_AI_RELIABILITY_PLAN.md), [benchmark](LOCAL_AI_BENCHMARK.md) e [investigación de pesos](WEIGHT_SPACE_RESEARCH.md).

## Cómo delegar

```bash
node scripts/local-ai/subagent.mjs run scripts/local-ai/examples/rng-pick.task.json
node scripts/local-ai/subagent.mjs status rng-pick
node scripts/local-ai/subagent.mjs resume rng-pick --budget maxSeconds=1200
```

El resultado sale como JSON por la salida estándar y queda en `work/local-ai/<id>/result.json`. Códigos de salida:

| Código | Estado | Qué hacer |
|---|---|---|
| 0 | `completed` | Revisar el parche; los criterios pasaron |
| 2 | Uso incorrecto | Corregir la tarea |
| 3 | `blocked` | Leer `errors` y `pending`, resolver y ejecutar `resume` |
| 4 | `budget_exhausted` | Ejecutar `resume` con más presupuesto, o reducir la tarea |
| 5 | `failed` | Leer `tests` y `errors`; replantear la tarea |

## Formato de la tarea

| Campo | Obligatorio | Uso |
|---|---|---|
| `id` | Sí | Único; minúsculas, números, punto y guion |
| `instructions` | Sí | Qué hacer, concreto y breve |
| `acceptance` | Sí | Al menos un criterio. Sin criterios la tarea se rechaza |
| `mode` | No | `readonly` (por defecto) o `patch` |
| `files.edit` | Solo `patch` | Archivos existentes que puede cambiar |
| `files.read` | No | Archivos que puede consultar. Solo se copian los listados |
| `budget` | No | Ver abajo |
| `output` | No | Ruta adicional para el resultado |
| `model`, `thinking` | No | Por defecto `lm-studio/frankman-local` y el nivel de OMP |

Un criterio es un comando o una expresión regular sobre la respuesta:

```json
{ "name": "compila", "cmd": ["node", "{repo}/node_modules/typescript/bin/tsc", "--strict", "--noEmit", "src/sim/rng.ts"] }
{ "name": "respuesta", "outputMatches": "NAME:\\s*clamp" }
```

Los comandos corren dentro de la copia, sin shell. `{repo}` y `{sandbox}` se sustituyen. Usa `node` directamente en lugar de `npx`.

Presupuesto por defecto: `maxSeconds` 900, `maxAttempts` 3, `maxOutputTokens` 60000, `maxSteps` 30, `maxConsecutiveToolErrors` 6, `idleSeconds` 240, `serverWaitSeconds` 180, `maxServerRestarts` 3.

## Reglas para el agente principal

1. **Revisa siempre el parche.** Los criterios no sustituyen la lectura: en la prueba real, un parche los pasó con un comentario que contradecía el código.
2. Aplica con `git apply -p2 work/local-ai/<id>/proposal.patch` desde la raíz, y luego ejecuta `npm test` y `npm run typecheck`.
3. Delega tareas de un archivo o pocos, con criterios ejecutables. Lista en `files.read` todo lo que el archivo importe, o `tsc` fallará en la copia.
4. No delegues diagnóstico de errores de compilación sin ejecutar `tsc`: Qwen falló esa tarea en todas las pruebas.
5. La copia se toma al empezar. Si otro agente cambia esos archivos, la tarea termina `blocked` y hay que rehacerla.

## Comprobar que sigue funcionando

```bash
node scripts/local-ai/e2e.mjs
```

Usa el modelo real y **apaga el servidor 45 segundos**, así que no la ejecutes mientras otro agente use Qwen. Debe terminar con todas las comprobaciones en verde.

## Volver atrás

Nada de esto cambia el juego ni la configuración de OMP o LM Studio. Para retirarlo, borra `scripts/local-ai/`, `docs/local-ai/` y `work/local-ai/`, y quita `work/local-ai/` de `.gitignore`.
