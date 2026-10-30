# Equilibrio por zonas — zona contra nivel del jugador

> PROPUESTA. Generado por `npm run balance -- --zones` el 2026-10-30 (datos 2e5b0b4a). Números de `data/zones.json`, `data/enemies.json` y `data/rpg/`; nada aquí está aprobado.

## Cómo se mide

- Para cada zona con franja, cada nivel de jugador (1, 5, 10, 20), cada clase (ember_vanguard, storm_weaver) y cada habilidad del bot (malo = no esquiva, medio = esquiva la mitad de los avisos, bueno = el 90 %), 6 partidas.
- Cada partida: campo abierto, un grupo de 2 monstruos tirados con la tabla y la franja de la zona (arquetipo por peso, nivel uniforme + `levelBonus`), a 9–11 m. Límite 150 s.
- El jugador de nivel N tiene la XP de ese nivel, los puntos gastados en su estadística principal, lo mejor del equipo de nivel ≤ N (hoy no hay equipo por encima de nivel 4) y su mascota luchadora.
- **Muertes** = partidas perdidas; **de un golpe** = murió de un solo impacto teniendo más del 90 % de la vida; **TTK** = mediana de segundos por monstruo abatido en las partidas ganadas.

## Lo que se pidió, comprobado

- ✔ Nivel 1 sin esquivar en Páramo de Ceniza: muere de un golpe en el 92 % de las partidas (se pide que pueda pasar).
- ✔ Nivel 1 (dentro de la franja) en Prados del Cruce, habilidad media: muere el 0 %, 1.9 s por monstruo.
- ✔ Nivel 5 (dentro de la franja) en Prados del Cruce, habilidad media: muere el 0 %, 1.6 s por monstruo.
- ✘ Nivel 20 (dentro de la franja) en Páramo de Ceniza, habilidad media: muere el 100 %, — por monstruo.
- ✔ Nivel 10 en Páramo de Ceniza (≥ 5 niveles por debajo): muere el 100 % con habilidad media y el 67 % con habilidad buena (se pide que exija habilidad).
- ✔ Nivel 5 (dentro de la franja) en Pradera de los lobos, habilidad media: muere el 8 %, 5.0 s por monstruo.
- ✔ Nivel 10 (dentro de la franja) en Pradera de los lobos, habilidad media: muere el 0 %, 3.5 s por monstruo.
- ✔ Nivel 10 (dentro de la franja) en Barranco de los hostigadores, habilidad media: muere el 25 %, 2.9 s por monstruo.
- ✔ Nivel 1 en Barranco de los hostigadores (≥ 5 niveles por debajo): muere el 58 % con habilidad media y el 8 % con habilidad buena (se pide que exija habilidad).
- ✔ Nivel 20 (dentro de la franja) en Hondonada del Hueso, habilidad media: muere el 0 %, 2.7 s por monstruo.
- ✔ Nivel 5 en Hondonada del Hueso (≥ 5 niveles por debajo): muere el 100 % con habilidad media y el 67 % con habilidad buena (se pide que exija habilidad).

## Tablas por zona

Cada celda: muertes (de ellas, de un golpe) · TTK por monstruo.

### Prados del Cruce · niv. 1–5

| Nivel del jugador | Habilidad malo | Habilidad medio | Habilidad bueno | Golpe máx. (medio) | XP/min (medio) |
|---|---|---|---|---|---|
| 1 | 0 % · 1.8 s | 0 % · 1.9 s | 0 % · 2.3 s | 2 % de la vida | 552 |
| 5 | 0 % · 1.5 s | 0 % · 1.6 s | 0 % · 1.6 s | 0 % de la vida | 791 |
| 10 | 0 % · 1.0 s | 0 % · 1.1 s | 0 % · 1.3 s | 0 % de la vida | 1199 |
| 20 | 0 % · 0.9 s | 0 % · 0.9 s | 0 % · 0.9 s | 0 % de la vida | 1883 |

### Páramo de Ceniza · niv. 20–24

| Nivel del jugador | Habilidad malo | Habilidad medio | Habilidad bueno | Golpe máx. (medio) | XP/min (medio) |
|---|---|---|---|---|---|
| 1 | 100 % (92 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 228 % de la vida | 0 |
| 5 | 100 % (92 % de un golpe) · — | 100 % (75 % de un golpe) · — | 92 % (92 % de un golpe) · 45.3 s | 152 % de la vida | 0 |
| 10 | 100 % (42 % de un golpe) · — | 100 % (58 % de un golpe) · — | 67 % (33 % de un golpe) · 27.9 s | 119 % de la vida | 0 |
| 20 | 100 % · — | 100 % (8 % de un golpe) · — | 42 % (8 % de un golpe) · 10.1 s | 76 % de la vida | 368 |

### Pradera de los lobos · niv. 5–12

| Nivel del jugador | Habilidad malo | Habilidad medio | Habilidad bueno | Golpe máx. (medio) | XP/min (medio) |
|---|---|---|---|---|---|
| 1 | 92 % (8 % de un golpe) · 6.9 s | 50 % (8 % de un golpe) · 8.8 s | 0 % · 11.1 s | 44 % de la vida | 263 |
| 5 | 25 % · 5.0 s | 8 % (8 % de un golpe) · 5.0 s | 0 % · 5.6 s | 13 % de la vida | 580 |
| 10 | 8 % · 3.2 s | 0 % · 3.5 s | 0 % · 3.5 s | 9 % de la vida | 1076 |
| 20 | 0 % · 2.0 s | 0 % · 2.0 s | 0 % · 2.1 s | 0 % de la vida | 2333 |

### Barranco de los hostigadores · niv. 9–15

| Nivel del jugador | Habilidad malo | Habilidad medio | Habilidad bueno | Golpe máx. (medio) | XP/min (medio) |
|---|---|---|---|---|---|
| 1 | 92 % (50 % de un golpe) · 9.2 s | 58 % (25 % de un golpe) · 10.5 s | 8 % · 9.2 s | 58 % de la vida | 420 |
| 5 | 58 % (25 % de un golpe) · 7.1 s | 17 % (8 % de un golpe) · 6.6 s | 0 % · 5.7 s | 30 % de la vida | 833 |
| 10 | 25 % · 3.1 s | 25 % · 2.9 s | 0 % · 4.3 s | 14 % de la vida | 1053 |
| 20 | 0 % · 2.5 s | 0 % · 2.4 s | 0 % · 2.5 s | 3 % de la vida | 2820 |

### Hondonada del Hueso · niv. 13–20

| Nivel del jugador | Habilidad malo | Habilidad medio | Habilidad bueno | Golpe máx. (medio) | XP/min (medio) |
|---|---|---|---|---|---|
| 1 | 100 % (33 % de un golpe) · — | 100 % (42 % de un golpe) · — | 83 % (17 % de un golpe) · 7.7 s | 125 % de la vida | 0 |
| 5 | 100 % · — | 100 % · — | 67 % (25 % de un golpe) · 7.6 s | 61 % de la vida | 403 |
| 10 | 83 % · 1.9 s | 58 % (8 % de un golpe) · 2.8 s | 17 % (8 % de un golpe) · 5.2 s | 47 % de la vida | 944 |
| 20 | 25 % · 3.2 s | 0 % · 2.7 s | 0 % · 2.8 s | 27 % de la vida | 2775 |

## Lectura

- El daño que recibe y hace cada lado ya lleva el multiplicador por diferencia de nivel (`levelDifference` en `data/zones.json`).
- Riesgo y premio: la XP por minuto sube con la zona mientras el jugador sobrevive. Ir por encima de la franja da más XP a quien esquiva bien y mata al que no esquiva.
- La zona élite está pensada por encima del nivel máximo del jugador (20): con el equipo actual, a nivel 20 sólo sobrevive con frecuencia quien esquiva casi todo. Es la comprobación que sale en ✘; se deja así a propósito y se pregunta en `docs/HANDOFF_ZONAS.md`.
- El jugador de nivel 20 lleva equipo de nivel ≤ 4 (no hay más en `data/rpg/items.json`): las zonas altas están medidas sin el equipo que tendría de verdad. Cuando exista, hay que volver a pasar este informe.
- El bot no huye ni elige grupos: entra en todos los combates. En el juego un jugador puede rodear a los monstruos de nivel alto (su vista es de 12–14 m).
