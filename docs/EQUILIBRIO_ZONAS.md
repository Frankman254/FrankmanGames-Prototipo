# Equilibrio por zonas — zona contra nivel del jugador

> PROPUESTA. Generado por `npm run balance -- --zones` el 2026-10-31 (datos 91666499). Números de `data/zones.json`, `data/enemies.json` y `data/rpg/`; nada aquí está aprobado.

## Cómo se mide

- Para cada zona con franja, cada nivel de jugador (1, 5, 10, 20), cada clase (ember_vanguard, storm_weaver) y cada habilidad del bot (malo = no esquiva, medio = esquiva la mitad de los avisos, bueno = el 90 %), 6 partidas.
- Cada partida: campo abierto, un grupo de 2 monstruos tirados con la tabla y la franja de la zona (arquetipo por peso, nivel uniforme + `levelBonus`), a 9–11 m. Límite 150 s.
- El jugador de nivel N tiene la XP de ese nivel, los puntos gastados en su estadística principal, lo mejor del equipo de nivel ≤ N (hoy no hay equipo por encima de nivel 4) y su mascota luchadora.
- **Muertes** = partidas perdidas; **de un golpe** = murió de un solo impacto teniendo más del 90 % de la vida; **TTK** = mediana de segundos por monstruo abatido en las partidas ganadas.

## Lo que se pidió, comprobado

- ✔ Nivel 1 sin esquivar en Cerro Ancón Embrujado: muere de un golpe en el 100 % de las partidas (se pide que pueda pasar).
- ✔ Nivel 1 (dentro de la franja) en Llanos de Azuero, habilidad media: muere el 25 %, 3.5 s por monstruo.
- ✔ Nivel 5 (dentro de la franja) en Llanos de Azuero, habilidad media: muere el 0 %, 2.7 s por monstruo.
- ✔ Nivel 10 (dentro de la franja) en Llanos de Azuero, habilidad media: muere el 0 %, 1.9 s por monstruo.
- ✘ Nivel 20 en Cumbre del Barú (≥ 5 niveles por debajo): muere el 100 % con habilidad media y el 100 % con habilidad buena (se pide que exija habilidad).
- ✘ Nivel 10 (dentro de la franja) en Manglares de Chame, habilidad media: muere el 50 %, 7.9 s por monstruo.
- ✔ Nivel 20 (dentro de la franja) en Manglares de Chame, habilidad media: muere el 8 %, 5.4 s por monstruo.
- ✔ Nivel 5 en Manglares de Chame (≥ 5 niveles por debajo): muere el 92 % con habilidad media y el 17 % con habilidad buena (se pide que exija habilidad).
- ✘ Nivel 20 (dentro de la franja) en Cerros de Boquete, habilidad media: muere el 100 %, — por monstruo.
- ✔ Nivel 10 en Cerros de Boquete (≥ 5 niveles por debajo): muere el 100 % con habilidad media y el 75 % con habilidad buena (se pide que exija habilidad).
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
| 1 | 42 % · 3.0 s | 25 % · 3.5 s | 17 % (8 % de un golpe) · 3.8 s | 28 % de la vida | 319 |
| 5 | 8 % · 2.5 s | 0 % · 2.7 s | 0 % · 2.9 s | 0 % de la vida | 760 |
| 10 | 0 % · 1.9 s | 0 % · 1.9 s | 0 % · 2.1 s | 0 % de la vida | 1207 |
| 20 | 0 % · 1.6 s | 0 % · 1.8 s | 0 % · 1.9 s | 0 % de la vida | 1900 |

### Cumbre del Barú · niv. 40–50

| Nivel del jugador | Habilidad malo | Habilidad medio | Habilidad bueno | Golpe máx. (medio) | XP/min (medio) |
|---|---|---|---|---|---|
| 1 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 2030 % de la vida | 0 |
| 5 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 1199 % de la vida | 0 |
| 10 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 938 % de la vida | 0 |
| 20 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 662 % de la vida | 0 |

### Manglares de Chame · niv. 10–20

| Nivel del jugador | Habilidad malo | Habilidad medio | Habilidad bueno | Golpe máx. (medio) | XP/min (medio) |
|---|---|---|---|---|---|
| 1 | 100 % (25 % de un golpe) · — | 100 % (50 % de un golpe) · — | 83 % (33 % de un golpe) · 21.0 s | 101 % de la vida | 0 |
| 5 | 100 % (8 % de un golpe) · — | 92 % (17 % de un golpe) · 5.6 s | 17 % · 13.7 s | 87 % de la vida | 299 |
| 10 | 67 % (8 % de un golpe) · 6.8 s | 50 % (8 % de un golpe) · 7.9 s | 33 % · 9.3 s | 43 % de la vida | 510 |
| 20 | 50 % · 4.3 s | 8 % · 5.4 s | 0 % · 6.0 s | 23 % de la vida | 1731 |

### Cerros de Boquete · niv. 20–30

| Nivel del jugador | Habilidad malo | Habilidad medio | Habilidad bueno | Golpe máx. (medio) | XP/min (medio) |
|---|---|---|---|---|---|
| 1 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 364 % de la vida | 0 |
| 5 | 100 % (92 % de un golpe) · — | 100 % (67 % de un golpe) · — | 100 % (92 % de un golpe) · — | 178 % de la vida | 0 |
| 10 | 100 % (75 % de un golpe) · — | 100 % (83 % de un golpe) · — | 75 % (58 % de un golpe) · 23.5 s | 140 % de la vida | 0 |
| 20 | 100 % (42 % de un golpe) · — | 100 % (50 % de un golpe) · — | 100 % (50 % de un golpe) · — | 99 % de la vida | 0 |

### Neblinas de Cerro Punta · niv. 30–40

| Nivel del jugador | Habilidad malo | Habilidad medio | Habilidad bueno | Golpe máx. (medio) | XP/min (medio) |
|---|---|---|---|---|---|
| 1 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 913 % de la vida | 0 |
| 5 | 100 % (92 % de un golpe) · — | 100 % (92 % de un golpe) · — | 100 % (100 % de un golpe) · — | 540 % de la vida | 0 |
| 10 | 100 % (100 % de un golpe) · — | 100 % (92 % de un golpe) · — | 100 % (100 % de un golpe) · — | 377 % de la vida | 0 |
| 20 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 256 % de la vida | 0 |

### Darién Profundo · niv. 50–60

| Nivel del jugador | Habilidad malo | Habilidad medio | Habilidad bueno | Golpe máx. (medio) | XP/min (medio) |
|---|---|---|---|---|---|
| 1 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 4398 % de la vida | 0 |
| 5 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 2201 % de la vida | 0 |
| 10 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 1704 % de la vida | 0 |
| 20 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 1480 % de la vida | 0 |

### Archipiélago de Bocas · niv. 60–70

| Nivel del jugador | Habilidad malo | Habilidad medio | Habilidad bueno | Golpe máx. (medio) | XP/min (medio) |
|---|---|---|---|---|---|
| 1 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 8770 % de la vida | 0 |
| 5 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 5943 % de la vida | 0 |
| 10 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 3801 % de la vida | 0 |
| 20 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 2595 % de la vida | 0 |

### Archipiélago de las Perlas · niv. 70–80

| Nivel del jugador | Habilidad malo | Habilidad medio | Habilidad bueno | Golpe máx. (medio) | XP/min (medio) |
|---|---|---|---|---|---|
| 1 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 17976 % de la vida | 0 |
| 5 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 9566 % de la vida | 0 |
| 10 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 9799 % de la vida | 0 |
| 20 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 6969 % de la vida | 0 |

### Páramo de Fortuna · niv. 80–90

| Nivel del jugador | Habilidad malo | Habilidad medio | Habilidad bueno | Golpe máx. (medio) | XP/min (medio) |
|---|---|---|---|---|---|
| 1 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 30787 % de la vida | 0 |
| 5 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 17277 % de la vida | 0 |
| 10 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 15547 % de la vida | 0 |
| 20 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 12336 % de la vida | 0 |

### Cerro Ancón Embrujado · niv. 90–100

| Nivel del jugador | Habilidad malo | Habilidad medio | Habilidad bueno | Golpe máx. (medio) | XP/min (medio) |
|---|---|---|---|---|---|
| 1 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 60531 % de la vida | 0 |
| 5 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 31625 % de la vida | 0 |
| 10 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 32092 % de la vida | 0 |
| 20 | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 100 % (100 % de un golpe) · — | 25367 % de la vida | 0 |

## Lectura

- El daño que recibe y hace cada lado ya lleva el multiplicador por diferencia de nivel (`levelDifference` en `data/zones.json`).
- Riesgo y premio: la XP por minuto sube con la zona mientras el jugador sobrevive. Ir por encima de la franja da más XP a quien esquiva bien y mata al que no esquiva.
- La zona élite está pensada por encima del nivel máximo del jugador (20): con el equipo actual, a nivel 20 sólo sobrevive con frecuencia quien esquiva casi todo. Es la comprobación que sale en ✘; se deja así a propósito y se pregunta en `docs/HANDOFF_ZONAS.md`.
- El jugador de nivel 20 lleva equipo de nivel ≤ 4 (no hay más en `data/rpg/items.json`): las zonas altas están medidas sin el equipo que tendría de verdad. Cuando exista, hay que volver a pasar este informe.
- El bot no huye ni elige grupos: entra en todos los combates. En el juego un jugador puede rodear a los monstruos de nivel alto (su vista es de 12–14 m).
