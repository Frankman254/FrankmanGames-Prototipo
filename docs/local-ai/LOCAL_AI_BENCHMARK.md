# Benchmark de la IA local

Se ejecuta con `python -I scripts/local-ai/bench.py --label <nombre> --seeds 1,2,3` (requiere `tsc` global) y `--selftest` comprueba las verificaciones. Los resultados se guardan en `work/local-ai/bench/`, que git ignora.

## Método

- **7 tareas de TypeScript con 3 semillas: 21 pruebas por perfil.** Corregir tipos, implementar una regla, refactorizar, escribir pruebas, encontrar errores, cumplir un contrato y hallar un bug en unos 20K tokens.
- **La calidad se comprueba, no se opina.** El código se compila con `--strict` y se ejecuta. Las pruebas escritas por el modelo también deben detectar 3 versiones con errores.
- **Autoprueba.** Las soluciones de referencia pasan y una respuesta mala se rechaza en las 7 tareas.
- **Condiciones.** Temperatura 0.2, máximo 6000 tokens, API directa y mismos parámetros de carga, verificados en la línea de comandos de `llama-server`. Modelo recargado antes de cada perfil. VRAM y potencia muestreadas cada segundo.

## Cuantización: Q4_K_M contra Q6_K (131K de contexto)

| | Q4_K_M | Q6_K |
|---|---|---|
| Pruebas pasadas | **14 de 21** | 12 de 21 |
| Generación (mediana) | **68 t/s** | 57 t/s |
| Prompt de 19835 tokens, tiempo al primer token | 5.5 s | 5.6 s |
| Tiempo total | **7 min 51 s** | 11 min 39 s |
| Tokens de salida | 29985 | 36607 |
| Cortadas por límite de tokens | 1 | 0 |
| VRAM máxima, 2080 | 5255 MiB (64%) | 5819 MiB (71%) |
| VRAM máxima, 3080 | 8823 a 9107 MiB (86-89%) | 9636 MiB (94%) |
| Potencia máxima, 2080 / 3080 | 154 W / 218 W | 158 W / 222 W |

| Tarea (de 3) | Q4_K_M | Q6_K |
|---|---|---|
| Corregir tipos | 3 | 3 |
| Implementar regla | 3 | 3 |
| Refactorizar | 2 | 0 |
| Escribir pruebas | 2 | 2 |
| Encontrar errores | 0 | 0 |
| Cumplir contrato | 2 | 1 |
| Bug en archivo largo | 2 | 3 |

**Decisión: se mantiene Q4_K_M.** Con 21 pruebas, 14 contra 12 no demuestra que Q4 sea más preciso, pero Q6_K no muestra ventaja y sí es un 16% más lento. Los 24 contra 93 t/s anteriores no se repitieron.

## Contexto: 64K contra 128K (Q4_K_M)

| | 65536 | 131072 |
|---|---|---|
| Pruebas pasadas | 14 de 21 | 14 de 21 |
| Generación (mediana) | 68.1 t/s | 68.4 t/s |
| Prompt de 19835 tokens | 3620 a 3654 t/s | 3602 a 3636 t/s |
| Tiempo al primer token, prompt corto | 0.25 s | 0.27 s |
| VRAM del modelo (sin escritorio) | **9251 MiB** | **11760 MiB** |

Los dos perfiles produjeron el mismo número de tokens (29985) y los mismos aciertos, así que **128K cuesta 2509 MiB y no perjudica velocidad ni calidad**.

**Límite:** ninguna prueba pasa de 20K tokens, de modo que esto no mide la ventaja de 128K en sesiones largas. **Se mantiene 128K**: no hay motivo medido para bajarlo.

## Agente completo (subagente con OMP)

| Medida | Tarea de una línea | `rng.ts` con interrupción |
|---|---|---|
| Turnos / herramientas | 4 / 3 | 4 / 3 |
| Errores de herramienta | 0 | 0 |
| Tokens entrada / salida | 18705 / 445 | 21479 / 598 |
| Tiempo total | 11 s | 12 s |
| Generación dentro del agente | 62 t/s | 61 t/s |

La generación es de 68 t/s por API directa y unos 61 t/s dentro del agente. Son medidas distintas: el tiempo total incluye herramientas y cada turno vuelve a enviar el contexto.

Prueba `e2e.mjs`: 20 de 20 comprobaciones. Incluye interrupciones, servidor reiniciado y tareas bloqueadas a propósito.

## Sobre llenar el 90% de la VRAM

No se alcanzó, y las pruebas no muestran que convenga. Con Q6_K la 3080 llega al 94% y la 2080 se queda en 71%, porque el reparto entre GPU no cambia desde `lms load` y el escritorio ocupa la 3080. Reservar VRAM libre no costó ni calidad ni velocidad.

## Motores de inferencia

**No se instaló ni se midió ninguno.** No hay evidencia para migrar.

| Motor | Situación | Recomendación |
|---|---|---|
| LM Studio | Funciona y ya usa `llama-server` por debajo. Medido arriba | Mantener |
| llama.cpp directo | Mismo motor. Daría `--tensor-split` para repartir entre GPU, que `lms load` no ofrece | Único candidato razonable; probar solo si hace falta ese reparto |
| vLLM | Según fuentes secundarias no verificadas, soporte oficial solo en Linux, con build no oficial para Windows; fuentes en conflicto sobre GGUF | No migrar |
| SGLang | No encontré fuente fiable sobre Windows ni GGUF | No migrar |

Migrar exigiría pesos que no son GGUF, y posiblemente WSL. Con 8 y 10 GB heterogéneos, no veo una mejora que lo justifique. Es criterio, no medición.
