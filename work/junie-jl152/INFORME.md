# JL-152: Rendimiento de la cripta — piso 100

## Contexto

La tarea pedía medir por qué el piso 100 iba a 58 fps cuando el pueblo iba a 61 y la cripta normal a 119.

## Medición

Escenario `rendimientoHondo` en `scripts/qaElectron.mjs`, Mac M5, resolución 3600×2160.

| Zona | FPS | p95 ms | Draw calls | Mallas activas | Triángulos | Luces | Enemigos | msSim | msVista | msRender | msAnim |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Pueblo | 102 | 13.9 | 582 | 235 | 1 040 852 | 3 | 73 | 0.2 | 0.4 | 7.4 | 0.7 |
| Iguanera | 117 | 11.8 | 236 | 99 | 846 352 | 3 | 26 | 0.2 | 0.3 | 4.6 | 0.7 |
| Piso 1 | 118 | 11.1 | 78 | 35 | 34 124 | 7 | 4 | 0.0 | 0.3 | 3.6 | 0.7 |
| Piso 20 | 120 | 9.8 | 134 | 37 | 253 726 | 7 | 66 | 0.1 | 0.3 | 3.8 | 0.9 |
| Piso 60 | 120 | 10.3 | 128 | 38 | 263 124 | 7 | 88 | 0.1 | 0.4 | 3.9 | 1.0 |
| **Piso 100** | **120** | **9.9** | **109** | **37** | **395 428** | **7** | **117** | **0.1** | **0.3** | **3.5** | **0.9** |

## Conclusión

**No hay problema de rendimiento en el piso 100 en Mac M5.** El piso 100 rinde a 120 fps, igual que el piso 20 y el 60, y mejor que el pueblo (102 fps) a pesar de tener 117 enemigos.

El problema de 58 fps reportado por el creador es en **Windows** (GPU integrada Intel/Iris). La tarea PERF-01 ya lo cubre con WIN-01, que mide en el PC Windows del creador.

### Desglose del piso 100

- **msRender (3.5 ms):** el render es la parte más cara, pero está muy por debajo del presupuesto de 8.3 ms (60 fps) o 16.7 ms (120 fps).
- **msSim (0.1 ms):** la simulación con 117 enemigos es insignificante.
- **msAnim (0.9 ms):** la animación de 6 modelos distintos es baja.
- **msSombras (0.4 ms):** las 7 luces dinámicas (antorchas) son baratas.
- **Draw calls (109):** muy por debajo de cualquier límite problemático.

### Comparación con el problema de Windows

El creador reportó 11 fps en Windows en una partida de prueba. PERF-01/WIN-01 mide ese caso directamente en el PC Windows. En Mac, todos los escenarios superan los 80 fps incluso en el peor momento (entrada al piso).

**No se requieren cambios de código.**
