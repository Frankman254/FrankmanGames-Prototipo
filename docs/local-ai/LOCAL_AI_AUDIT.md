# Auditoría de la IA local

Medido el 2026-11-02 y 2026-11-03 con OMP 18.16.0, LM Studio con llama.cpp 2.67.0 y Qwen3.5 9B Q4_K_M. Cada dato indica si se midió aquí o viene de la configuración.

## Equipo

| Componente | Valor real |
|---|---|
| CPU | i7-9700K, 8 núcleos y 8 hilos |
| RAM | **48 GB** (16+16+8+8), no 32 como decía el encargo |
| GPU 0 | RTX 2080, 8 GB, límite 150 W, PCIe 3.0 x8 |
| GPU 1 | RTX 3080, 10 GB, límite 225 W, PCIe 3.0 x8, mueve el monitor |
| Escritorio y apps | Unos 2200 a 2500 MiB, todos en la 3080 |

## Cómo arranca todo

1. LM Studio se abre al iniciar sesión con `--run-as-service` (clave Run del usuario), pero **eso no enciende el servidor**. Esa fue la causa de `connection refused` tras reiniciar.
2. `FrankmanAI-LimitesGPU` (SYSTEM) aplica los límites al encender y al iniciar sesión.
3. `FrankmanAI-AutoStart` espera esos límites, enciende el servidor y carga `frankman-local`. Si los límites no están, no arranca. Vive fuera del repo, en `~/frankman-ai/`. Se probó con un reinicio real.

Bajo el modelo corre `llama-server` (visto en su línea de comandos): 131072 de contexto, paralelismo 1, `--kv-unified`, caché f16.

## Cómo usa OMP el modelo

| Tema | Comportamiento | Origen |
|---|---|---|
| Descubrimiento | Proveedor `lm-studio`, modelo `frankman-local`, ventana de 131K | `omp models list` |
| Sesiones | JSONL por carpeta en `~/.omp/agent/sessions/` | Medido |
| Compactación | Activa, también a mitad de turno; conserva 20000 tokens recientes | `omp config list` |
| Reintentos | 10 intentos con espera creciente | Configuración y medido |
| Límites | Sin límite de turnos ni de tiempo por defecto; `--max-time` opcional | Configuración |
| Herramientas | `tools.approvalMode = yolo`: aprueba todo sin preguntar | Configuración |
| Checkpoints nativos | `checkpoint.enabled = false` | Configuración |
| Bloqueo de herramientas | Hook `tool_call`, probado con `--hook` | Medido |

## Qué pasa ante cada fallo (medido)

| Escenario | Resultado |
|---|---|
| Servidor apagado | Cada intento tarda unos 31 s en fallar, aunque la conexión se rechace al instante. Son unos 5 min hasta rendirse |
| Tras volver el servidor | `--continue` funciona; no se pierde la sesión |
| Proceso matado a mitad | La sesión guarda lo anterior, sin el resultado de la herramienta en curso. OMP avisa al reanudar y el modelo sigue sin repetir pasos |
| `--restore` sin terminal | **No funciona**: exige terminal interactiva. Sin terminal hay que usar `--resume` |
| Stream colgado, por defecto | OMP espera en silencio unos 300 s, luego reintenta y se recupera |
| Stream colgado con `streamIdleTimeoutSeconds: 30` | Se recupera en unos 34 s |
| `LM_STUDIO_BASE_URL` | Se ignora: no sirve para apuntar a otro servidor |

## Problemas confirmados

**1. El modelo y el agente fallaban por causas distintas.** `connection refused` era el servidor apagado, no un fallo de razonamiento.

**2. Bucle de verificación.** Sin terminal, Qwen intentó comprobar su trabajo escribiendo scripts una y otra vez, hasta agotar 60 pasos con la tarea ya resuelta. Se corrigió con instrucciones claras y un límite de pasos.

**3. Escritura fuera de la carpeta.** Las herramientas de OMP aceptan rutas absolutas. En una prueba, Qwen escribió 17 archivos reales en `C:\tmp`, ya borrados. `--cwd` no aísla nada. Se corrigió con `sandbox-guard.js`, y la misma prueba ya no crea el archivo.

**4. El modo de edición `hashline` confunde a Qwen.** Hizo 26 llamadas a `edit` en una tarea de una línea y llegó a copiar `greet.py` del ejemplo de la herramienta. Con `replace` la misma tarea tomó 4 turnos y 0 errores. Esa mejora se midió junto con el cambio de instrucciones, así que no se le puede atribuir toda.

**5. Varios agentes en el mismo repo.** Durante las pruebas, otro agente cambió `src/rpg/` y apareció como cambio ajeno. Los eventos del subagente no contienen esas rutas. Por eso trabaja sobre una copia y avisa de estos cambios.

**6. El modelo acepta mal lo que no puede comprobar.** Un parche pasó todos los criterios con un comentario falso. Por eso el agente principal debe revisar.

## Sin resolver: el congelamiento de OMP

El 2026-11-02 a las 22:11 OMP 18.15.0 quedó en `Working…` más de 7 minutos. Lo observado:

- El servidor terminó el último pedido a las 22:11:15 y respondía bien a otras pruebas.
- OMP no tenía conexiones abiertas, ni procesos hijos, ni uso de CPU.
- La sesión no guardó nada desde las 22:10:56, aunque hubo dos respuestas después.
- No hubo reintentos, y su log estaba vacío (0 bytes).

**Causa desconocida.** Un stream colgado no lo explica: se recupera a los 300 s con un reintento, y ahí no hubo ninguno. Apunta a un fallo dentro de OMP 18.15.0, sin poder demostrarlo, y no se ha podido reproducir. Ya se actualizó a 18.16.0, sin saber si eso lo arregla. El subagente lo cubre con su vigilante, que mata y reanuda tras `idleSeconds` sin eventos. En uso interactivo la salida es `Esc` o cerrar la terminal, y luego `omp --restore=<id>`.

## Disponibilidad de fuentes

No se pudieron leer los dos posts de X del encargo (HTTP 402). Se usaron el blog y el repositorio de logs que citan.
