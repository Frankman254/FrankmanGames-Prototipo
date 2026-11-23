# JL-185: Pulsaciones perdidas en una pelea (solo mide)

**Fecha:** 2026-11-23  
**Autor:** Junie  
**Alcance:** Medición, sin cambios de código ni cifras.

## Método

Script `tests/jl185_castPressure.test.ts` que simula un bot pulsando los 4 primeros slots de la barra (0-3, en ciclo) cada 0.35 s durante 60 s simulados, contra un enemigo inmortal a 10 m. Se mide con las 3 clases a nivel 1 y 50.

- **Intervalo de pulsación:** 0.35 s (≈ 2.86 pulsaciones/segundo)
- **Duración:** 60 s simulados → 172 pulsaciones por combinación
- **Recurso:** se restaura al 30% para que no sea el cuello de botella
- **Enemigo:** `melee` inmortal a (20, 10), jugador en (10, 10)

## Parámetros del juego

| Parámetro | Valor |
|---|---|
| `commandQueueWindow` | 0.3 s (`data/player.json`) |
| GCD por hechizo | 0.5–0.8 s (promedio 0.66 s, 108 hechizos) |
| Cola máxima | 4 elementos |

## Resultados

### ember_vanguard

| Nivel | Pulsaciones | Lanzados | Perdidas | % perdida | GCD | Cooldown | Queued |
|---|---|---|---|---|---|---|---|
| 1 | 172 | 3 | 169 | 98.3% | 0 | 10 | 0 |
| 50 | 172 | 29 | 143 | 83.1% | 5 | 135 | 0 |

### storm_weaver

| Nivel | Pulsaciones | Lanzados | Perdidas | % perdida | GCD | Cooldown | Queued |
|---|---|---|---|---|---|---|---|
| 1 | 172 | 10 | 162 | 94.2% | 0 | 0 | 0 |
| 50 | 172 | 58 | 114 | 66.3% | 114 | 0 | 0 |

### mangrove_hunter

| Nivel | Pulsaciones | Lanzados | Perdidas | % perdida | GCD | Cooldown | Queued |
|---|---|---|---|---|---|---|---|
| 1 | 172 | 14 | 158 | 91.9% | 26 | 0 | 0 |
| 50 | 172 | 58 | 114 | 66.3% | 114 | 0 | 0 |

## Análisis

### Hallazgo 1: La cola (JUG-06) no captura ninguna pulsación

`queued` es **0** en todos los casos. La ventana de 0.3 s es demasiado corta: con pulsación cada 0.35 s, la segunda pulsación siempre llega después de que la ventana expira. La cola solo funciona si el jugador pulsa **dentro** de los primeros 0.3 s de la animación, pero con un intervalo de 0.35 s, la pulsación siguiente llega a los 0.35 s — fuera de la ventana.

### Hallazgo 2: GCD es el bloque dominante a nivel 50

A nivel 50, el GCD es el bloque más frecuente en storm_weaver y mangrove_hunter (114/114), mientras que ember_vanguard tiene más cooldown individual (135 vs 5 GCD). Esto varía según los hechizos de la barra de cada clase.

### Hallazgo 3: Nivel 1 — slots vacíos o desconocidos

A nivel 1, las clases solo tienen los universales aprendidos (spark, etc.). Los slots 0-3 de la barra incluyen hechizos de clase que aún no se han aprendido, generando bloques `empty` y `unknown` que no se muestran en la tabla resumida pero representan la mayoría de las pulsaciones perdidas.

### Hallazgo 4: Proporción perdida por GCD

De las pulsaciones perdidas a nivel 50:
- ember_vanguard: 5/143 = 3.5% por GCD (cooldown individual domina)
- storm_weaver: 114/114 = 100% por GCD
- mangrove_hunter: 114/114 = 100% por GCD

La diferencia entre ember_vanguard y las otras dos clases se debe a que sus hechizos de la barra tienen cooldowns individuales más largos que el GCD.

## Conclusión

Con un intervalo de pulsación de 0.35 s:
- **66-98% de las pulsaciones se pierden** (no se convierten en lanzamientos).
- La cola de JUG-06 (0.3 s) **no captura ninguna** pulsación a este ritmo.
- El GCD es el bloque dominante a nivel 50 para la mayoría de clases.
- A nivel 1, los slots vacíos/unknown son el problema principal.

**Para la pregunta GCD-01 del creador:** el jugador que pulsa rápido pierde la mayoría de sus pulsaciones. La cola de 0.3 s no ayuda a este ritmo. Las opciones serían:
1. Ampliar `commandQueueWindow` (pero eso cambia la regla de JUG-06).
2. Aceptar que el jugador debe pulsar al ritmo del GCD (~0.66 s).
3. Implementar un sistema de "auto-rotación" que elija el hechizo listo en lugar de perder la pulsación.
