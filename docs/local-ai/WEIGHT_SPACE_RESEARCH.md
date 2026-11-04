# Weight-Space Programming: ¿aplica a nuestro Qwen?

**Conclusión: no hoy.** Es un resultado llamativo, pero sobre otro modelo y otro problema. Nuestras fallas medidas venían sobre todo del agente y del servidor. No se modificó ningún peso ni se reprodujo ningún experimento.

## Qué afirma el trabajo

Fuentes leídas: [blog](https://rikiyat.github.io/blog/weight-space-programming/) y [logs](https://github.com/RikiyaT/lm_understand-logs). Los posts de X no se pudieron abrir (HTTP 402). Solo revisé la descripción del repositorio, no los datos del experimento.

Un modelo avanzado (GPT-6 Astra) editó pesos directamente. El caso de Qwen es el experimento 8:

| Dato | Valor publicado |
|---|---|
| Modelo | Qwen3.5-0.8B, 24 capas |
| Edición | Resta una dirección de 64 columnas de salida de las MLP en las capas 15 y 19 |
| Pesos tocados | 131072 (0.016%) |
| MATH-500 | 7.9% → 48.1% |
| GSM8K | 13.8% → 67.1% |
| IFEval | 21.0% → 62.3% |
| Respuestas de MATH-500 que llegan a 32768 tokens | 93.0% → 33.1% |
| Presupuesto | 50 pasadas hacia delante; con 10 y 25 la mejora es mucho menor (12.3% y 14.1%) |

## Lo que limita ese resultado

- Los autores lo llaman muy temprano y dicen que la capacidad sigue limitada.
- En Gemma 3 270M no se estableció mejora (6.8% a 7.7%). Concluyen que editar puede quitar un obstáculo, pero no añadir una habilidad.
- El modelo partía de un fallo enorme: el 93% de las respuestas se quedaba en bucle.
- El blog no da intervalos de confianza para la mayoría de los resultados ni el coste de cómputo.
- Los logs incluyen solo las corridas publicadas, no los intentos previos.
- Son benchmarks de matemáticas e instrucciones, no de programación con herramientas.
- No se reproduce con una herramienta lista: el benchmark y el arnés general están descritos como en progreso.

## Por qué no se traslada a nuestro caso

| Aspecto | Trabajo publicado | Nosotros |
|---|---|---|
| Tamaño | 0.8B, 24 capas | 9B, 32 capas, 4096 de dimensión |
| Pesos | Base pública, formato no indicado en el blog | GGUF Q4_K_M, ya cuantizado |
| Problema | Bucles en el 93% de los casos | 1 respuesta cortada de 21 |
| Quién edita | GPT-6 Astra con esfuerzo `max` | Sin acceso comprobado |

**El bucle es el punto clave.** Nuestro único corte fue una tarea larga a 6000 tokens, y la misma tarea pasó con otras semillas. El bucle de 60 pasos que vimos era del agente: desapareció al corregir instrucciones y herramientas, sin tocar pesos. Hasta ahora no hay evidencia de que nuestro problema sea de pesos.

**La cuantización también complica.** En Q4_K_M los pesos ya están redondeados, y un cambio pequeño puede perderse. Lo razonable sería editar los pesos completos y volver a cuantizar. Es un razonamiento mío, no algo probado.

## Si algún día se investiga

Solo con autorización expresa. El primer paso no requiere tocar pesos:

1. **Medir si hay un problema.** Correr el benchmark con más tokens (32768) y contar cuántas respuestas no terminan. Si son pocas, se acaba aquí.
2. **Trabajar sobre una copia.** Descargar pesos completos a una carpeta aparte. El [BF16 de 16.69 GiB](https://huggingface.co/unsloth/Qwen3.5-9B-GGUF) existe, aunque habría que confirmar que sirve. Nunca modificar `~/.lmstudio/models/lmstudio-community/`.
3. **Registrar el cambio.** Guardar el hash del original y cada edición como un diff reversible.
4. **Definir el éxito antes de empezar.** Por ejemplo, reducir a la mitad las respuestas sin terminar, sin bajar del 14 de 21 en programación ni empeorar la velocidad.
5. **Comparar con muestra suficiente.** Más de 21 pruebas y con tareas nuevas, no las usadas para decidir la edición.
6. **Revertir.** Borrar la copia y volver a `frankman-local`, que nunca se tocó.

Antes de eso rinde más mejorar el agente y dar a Qwen formas de verificar, como ejecutar `tsc`, la tarea que falló en todas las pruebas.
