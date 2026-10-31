# Equilibrio por zonas — zona contra nivel del jugador

> PROPUESTA. Generado por `npm run balance -- --zones` el 2026-10-31 (datos 8bdd7099). Números de `data/zones.json`, `data/enemies.json` y `data/rpg/`; nada aquí está aprobado.

## Cómo se mide

- Para cada zona con franja, cada nivel de jugador (1, 5, 10, 20), cada clase (ember_vanguard, storm_weaver) y cada habilidad del bot (malo = no esquiva, medio = esquiva la mitad de los avisos, bueno = el 90 %), 6 partidas.
- Cada partida: campo abierto, un grupo de 2 monstruos tirados con la tabla y la franja de la zona (arquetipo por peso, nivel uniforme + `levelBonus`), a 9–11 m. Límite 150 s.
- El jugador de nivel N tiene la XP de ese nivel, los puntos gastados en su estadística principal, lo mejor del equipo de nivel ≤ N (hoy no hay equipo por encima de nivel 4) y su mascota luchadora.
- **Muertes** = partidas perdidas; **de un golpe** = murió de un solo impacto teniendo más del 90 % de la vida; **TTK** = mediana de segundos por monstruo abatido en las partidas ganadas.

## Lo que se pidió, comprobado

- ✔ Nivel 1 sin esquivar en Cerro Ancón Embrujado: muere de un golpe en el 100 % de las partidas (se pide que pueda pasar).
- ✔ Nivel 1 (dentro de la franja) en Llanos de Azuero, habilidad media: muere el 17 %, 3.8 s por monstruo.
- ✔ Nivel 5 (dentro de la franja) en Llanos de Azuero, habilidad media: muere el 0 %, 3.5 s por monstruo.
- ✔ Nivel 10 (dentro de la franja) en Llanos de Azuero, habilidad media: muere el 0 %, 2.2 s por monstruo.
- ✘ Nivel 20 en Cumbre del Barú (≥ 5 niveles por debajo): muere el 100 % con habilidad media y el 100 % con habilidad buena (se pide que exija habilidad).
- ✘ Nivel 10 (dentro de la franja) en Manglares de Chame, habilidad media: muere el 42 %, 8.0 s por monstruo.
- ✔ Nivel 20 (dentro de la franja) en Manglares de Chame, habilidad media: muere el 8 %, 6.8 s por monstruo.
- ✔ Nivel 5 en Manglares de Chame (≥ 5 niveles por debajo): muere el 92 % con habilidad media y el 42 % con habilidad buena (se pide que exija habilidad).
- ✘ Nivel 20 (dentro de la franja) en Cerros de Boquete, habilidad media: muere el 100 %, — por monstruo.
- ✔ Nivel 10 en Cerros de Boquete (≥ 5 niveles por debajo): muere el 100 % con habilidad media y el 92 % con habilidad buena (se pide que exija habilidad).
- ✘ Nivel 20 en Neblinas de Cerro Punta (≥ 5 niveles por debajo): muere el 100 % con habilidad media y el 100 % con habilidad buena (se pide que exija habilidad).
- ✘ Nivel 20 en Darién Profundo (≥ 5 niveles por debajo): muere el 100 % con habilidad media y el 100 % con habilidad buena (se pide que exija habilidad).
- ✘ Nivel 20 en Archipiélago de Bocas (≥ 5 niveles por debajo): muere el 100 % con habilidad media y el 100 % con habilidad buena (se pide que exija habilidad).
- ✘ Nivel 20 en Archipiélago de las Perlas (≥ 5 niveles por debajo): muere el 100 % con habilidad media y el 100 % con habilidad buena (se pide que exija habilidad).
- ✘ Nivel 20 en Páramo de Fortuna (≥ 5 niveles por debajo): muere el 100 % con habilidad media y el 100 % con habilidad buena (se pide que exija habilidad).
- ✘ Nivel 20 en Cerro Ancón Embrujado (≥ 5 niveles por debajo): muere el 100 % con habilidad media y el 100 % con habilidad buena (se pide que exija habilidad).

## Tablas por zona

Cada celda: muertes (de ellas, de un golpe) · TTK por monstruo.

### Llanos de Azuero · niv. 1–10

| Nivel del jugador | Habilidad malo | Habilidad medio | Habilidad bueno | Golpe máx. (medio) | XP/min (medio) |
|---|---|---|---|---|---|
| 1 | 25 % · 4.1 s | 17 % (8 % de un golpe) · 3.8 s | 0 % · 3.9 s | 18 % de la vida | 341 |
| 5 | 0 % · 3.2 s | 0 % · 3.5 s | 0 % · 4.1 s | 6 % de la vida | 585 |
| 10 | 0 % · 2.2 s | 0 % · 2.2 s | 0 % · 2.2 s | 0 % de la vida | 948 |
| 20 | 0 % · 1.7 s | 0 % · 1.7 s | 0 % · 1.8 s | 0 % de la vida | 1892 |

### Cumbre del Barú · niv. 40–50

| Nivel del jugador | Habilidad malo | Habilidad medio | Habilidad bueno | Golpe máx. (medio) | XP/min (medio) |
|---|---|---|---|---|---|
| 1 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 92 % (92 % de un golpe) · — | 1732 % de la vida | 0 |
| 5 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 1837 % de la vida | 0 |
| 10 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 854 % de la vida | 0 |
| 20 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 701 % de la vida | 0 |

### Manglares de Chame · niv. 10–20

| Nivel del jugador | Habilidad malo | Habilidad medio | Habilidad bueno | Golpe máx. (medio) | XP/min (medio) |
|---|---|---|---|---|---|
| 1 | 100 % (50 % de un golpe) · — | 100 % (50 % de un golpe) · — | 67 % (50 % de un golpe) · 21.1 s | 119 % de la vida | 0 |
| 5 | 100 % (8 % de un golpe) · — | 92 % (25 % de un golpe) · 5.5 s | 42 % (17 % de un golpe) · 24.7 s | 94 % de la vida | 210 |
| 10 | 83 % (8 % de un golpe) · 5.9 s | 42 % (17 % de un golpe) · 8.0 s | 33 % · 9.8 s | 44 % de la vida | 472 |
| 20 | 42 % · 5.3 s | 8 % · 6.8 s | 0 % · 6.6 s | 29 % de la vida | 1407 |

### Cerros de Boquete · niv. 20–30

| Nivel del jugador | Habilidad malo | Habilidad medio | Habilidad bueno | Golpe máx. (medio) | XP/min (medio) |
|---|---|---|---|---|---|
| 1 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 339 % de la vida | 0 |
| 5 | 100 % (83 % de un golpe) · — | 100 % (83 % de un golpe) · — | 100 % (83 % de un golpe) · — | 183 % de la vida | 0 |
| 10 | 100 % (92 % de un golpe) · — | 100 % (75 % de un golpe) · — | 92 % (50 % de un golpe) · 26.3 s | 166 % de la vida | 0 |
| 20 | 100 % (50 % de un golpe) · — | 100 % (58 % de un golpe) · — | 83 % (25 % de un golpe) · 25.1 s | 120 % de la vida | 0 |

### Neblinas de Cerro Punta · niv. 30–40

| Nivel del jugador | Habilidad malo | Habilidad medio | Habilidad bueno | Golpe máx. (medio) | XP/min (medio) |
|---|---|---|---|---|---|
| 1 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 92 % (92 % de un golpe) · — | 771 % de la vida | 0 |
| 5 | 100 % (92 % de un golpe) · — | 100 % (92 % de un golpe) · — | 100 % (100 % de un golpe) · — | 848 % de la vida | 0 |
| 10 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 92 % (92 % de un golpe) · 73.0 s | 375 % de la vida | 0 |
| 20 | 100 % (92 % de un golpe) · — | 100 % (92 % de un golpe) · — | 100 % (92 % de un golpe) · — | 313 % de la vida | 0 |

### Darién Profundo · niv. 50–60

| Nivel del jugador | Habilidad malo | Habilidad medio | Habilidad bueno | Golpe máx. (medio) | XP/min (medio) |
|---|---|---|---|---|---|
| 1 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 3396 % de la vida | 0 |
| 5 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 2533 % de la vida | 0 |
| 10 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 1924 % de la vida | 0 |
| 20 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 1374 % de la vida | 0 |

### Archipiélago de Bocas · niv. 60–70

| Nivel del jugador | Habilidad malo | Habilidad medio | Habilidad bueno | Golpe máx. (medio) | XP/min (medio) |
|---|---|---|---|---|---|
| 1 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 92 % (92 % de un golpe) · — | 7672 % de la vida | 0 |
| 5 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 7662 % de la vida | 0 |
| 10 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 3754 % de la vida | 0 |
| 20 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 2933 % de la vida | 0 |

### Archipiélago de las Perlas · niv. 70–80

| Nivel del jugador | Habilidad malo | Habilidad medio | Habilidad bueno | Golpe máx. (medio) | XP/min (medio) |
|---|---|---|---|---|---|
| 1 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 14704 % de la vida | 0 |
| 5 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 11038 % de la vida | 0 |
| 10 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 7927 % de la vida | 0 |
| 20 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 6261 % de la vida | 0 |

### Páramo de Fortuna · niv. 80–90

| Nivel del jugador | Habilidad malo | Habilidad medio | Habilidad bueno | Golpe máx. (medio) | XP/min (medio) |
|---|---|---|---|---|---|
| 1 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 30541 % de la vida | 0 |
| 5 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 15558 % de la vida | 0 |
| 10 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 14768 % de la vida | 0 |
| 20 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 11443 % de la vida | 0 |

### Cerro Ancón Embrujado · niv. 90–100

| Nivel del jugador | Habilidad malo | Habilidad medio | Habilidad bueno | Golpe máx. (medio) | XP/min (medio) |
|---|---|---|---|---|---|
| 1 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 57319 % de la vida | 0 |
| 5 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 31849 % de la vida | 0 |
| 10 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 31661 % de la vida | 0 |
| 20 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 27289 % de la vida | 0 |

## Lectura

- El daño que recibe y hace cada lado ya lleva el multiplicador por diferencia de nivel (`levelDifference` en `data/zones.json`).
- Riesgo y premio: la XP por minuto sube con la zona mientras el jugador sobrevive. Ir por encima de la franja da más XP a quien esquiva bien y mata al que no esquiva.
- La zona élite está pensada por encima del nivel máximo del jugador (20): con el equipo actual, a nivel 20 sólo sobrevive con frecuencia quien esquiva casi todo. Es la comprobación que sale en ✘; se deja así a propósito y se pregunta en `docs/HANDOFF_ZONAS.md`.
- El jugador de nivel 20 lleva equipo de nivel ≤ 4 (no hay más en `data/rpg/items.json`): las zonas altas están medidas sin el equipo que tendría de verdad. Cuando exista, hay que volver a pasar este informe.
- El bot no huye ni elige grupos: entra en todos los combates. En el juego un jugador puede rodear a los monstruos de nivel alto (su vista es de 12–14 m).
