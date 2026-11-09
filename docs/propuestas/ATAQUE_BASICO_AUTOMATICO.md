# Ataque básico automático: medición y recomendación

Estado: **PROPUESTA**, 2026-11-09. Responde a la decisión del creador sobre la QA Q01: «Sí, pero no de forma
ilimitada ni gratuita», con ataques básicos controlados que complementen a los hechizos y no los sustituyan. Nada de
este documento activa valores de combate.

## Qué quedó en el código

La mecánica está preparada y **apagada**. `data/player.json` → `basicAttack`:

| Campo | Hoy | Efecto |
|---|---|---|
| `charges`, `rechargeSeconds` | 3 y 1,4 s | Sin cambios. Son el límite real de ritmo |
| `resourceCost` | 0 | Sin cambios. Coste por golpe para todas las clases |
| `classCost` | `{}` | Nuevo. Coste por golpe según la clase (`ember_vanguard`, `storm_weaver`, `mangrove_hunter`); sustituye a `resourceCost` |
| `autoRepeat` | `false` | Nuevo. Con `true`, un clic sigue golpeando al mismo objetivo |

No hay mecanismos nuevos de cargas ni de enfriamiento. Cada golpe pasa por el mismo `checkCast` de siempre: primero
las cargas, luego el recurso, el enfriamiento del arma y el alcance. Con `autoRepeat` encendido:

- El clic selecciona al objetivo, se acerca y golpea.
- Mientras quede objetivo, sigue golpeando al ritmo que permitan las cargas y el arma.
- Lanzar un hechizo lo interrumpe (`commandCast` ya soltaba el objetivo). Un hechizo bloqueado, por ejemplo sin
  recurso, no lo interrumpe.
- Moverse a mano lo cancela. También hablar, recoger o hacer clic en otro enemigo; en este último caso pasa a
  golpear al nuevo.
- Si el objetivo muere, se para y no elige a otro.
- Si no hay recurso para el siguiente golpe, se suelta y avisa (`castBlocked`, motivo `resource`). No da un golpe
  gratis ni persigue esperando a regenerar. Este cambio vale también con `autoRepeat: false`: antes, con coste,
  un clic sin recurso se quedaba esperando.
- Sin cargas pero con el objetivo a tiro, espera la siguiente carga (≤ 1,4 s). Si el objetivo se aleja, lo sigue,
  igual que hoy. No es una espera indefinida: las cargas siempre vuelven.

Pruebas en `tests/basicAutoAttack.test.ts`, con 11 casos: los datos apagados, A, B, la parada al morir sin nuevo
objetivo, la interrupción por hechizo y por movimiento, el cambio de objetivo, C sin recurso (sin golpe gratis ni
persecución) y `classCost`.

## Cómo se midió

```bash
npm run balance:ataque-basico
```

`scripts/balance/ataqueBasico.ts` usa el mismo `World`, la misma sesión preparada por nivel y el mismo bot que
`balance:inicio`. Cada modo se aplica sobre una copia de los datos; los archivos no se tocan. Se probaron 6
semillas por combinación, en las tres clases.

Modos:

- **A-clic**: un clic, un golpe. Vuelve a hacer clic 0,35 s después.
- **A-spam**: un clic, un golpe, haciendo clic en cuanto puede. Es el bot de siempre.
- **B**: automático, limitado por las cargas y el enfriamiento del arma.
- **C k**: B más un coste por golpe de `k × regeneración por segundo × 1,4 s`. Con k = 1, golpear sin parar
  gasta justo lo que se regenera.

Escenarios:

- Los tres de Iguanera de `balance:inicio`.
- Dos combates difíciles: grupos de 3 monstruos de Azuero por encima del nivel del jugador (nivel 5 contra 6–7 y
  nivel 10 contra 11–12).

Para cada escenario se compararon dos niveles de habilidad, **malo** (no esquiva nada, sin posicionamiento) y
**medio**, y dos políticas: **hechizos** (rotación normal más básico) y **solo básico** (nunca usa la barra).

Datos actuales por clase, con el personaje de nivel 1:

| Clase | Recurso | Enfriamiento del arma | Alcance | Golpe sostenido | Coste con k = 1 | Golpes con el recurso lleno (k = 1 / k = 2) |
|---|---|---|---|---|---|---|
| Vanguardia | Vigor 60, +9/s | 0,71 s | 1,3 m | 1 cada 1,4 s | 12,6 | 4,8 / 2,4 |
| Tejedora | Maná 140, +5/s | 0,67 s | 7 m | 1 cada 1,4 s | 7 | 20 / 10 |
| Cazadora | Puntería 100, +7/s | 0,91 s | 9 m | 1 cada 1,4 s | 9,8 | 10 / 5 |

## Resultados

### 1. B no cambia el balance

En los 5 escenarios, con ambas habilidades y ambas políticas, A-clic, A-spam y B dan las mismas victorias, las mismas muertes
y la misma duración (±0,5 s) en las tres clases. La razón es que la recarga de las cargas (1,4 s) es más lenta que
el enfriamiento de cualquier arma inicial (0,67–0,91 s): el ritmo lo marcan las cargas, no los clics. Además, un
clic durante el enfriamiento ya quedaba en espera. Automatizar ahorra clics, pero no añade daño.

El ritmo medido (0,6–1,2 golpes/s) supera 1/1,4 = 0,71 porque las peleas duran de 3 a 18 s y la ráfaga inicial de
3 cargas pesa mucho.

### 2. Solo básico ya gana casi todo, con A y con B

| Escenario (medio) | Vanguardia: hechizos / solo básico | Tejedora | Cazadora |
|---|---|---|---|
| Nv 1 · grupo de 2 | 5,7 s / 10,6 s | 3,4 / 11,1 | 3,8 / 9,8 |
| Nv 3 · sato grande + 2 | 4,7 / 12,1 | 4,4 / 13,2 | 4,9 / 13,2 |
| Nv 5 · 3 de nivel 6–7 | 6,4 / 16,3 | 5,3 / 15,7 | 5,0 / 18,1 |
| Nv 10 · 3 de nivel 11–12 | 6,5 / 14,2 | 6,4 / 13,9 | 4,1 / 9,7 |

Todas las victorias son del 100 %. Solo básico tarda entre 2 y 3,6 veces más. Las derrotas solo aparecen sin
esquivar (malo):

- Nivel 1, solo básico: 17 % de derrotas para la Tejedora y la Cazadora.
- Nivel 5, solo básico: 17 % para la Vanguardia y la Cazadora y 33 % para la Tejedora.
- Con hechizos, 0 % en todos los escenarios.

Así que hoy el básico no es la estrategia *dominante*: es mucho más lento y, sin posicionamiento, a veces pierde.
Pero sí es *suficiente* para ganar casi todo lo medido. **Esto ya pasa con un clic = un golpe; no lo causa la
automatización.** Para que un combate difícil exija hechizos y posicionamiento hace falta más presión enemiga
(daño, número, avisos), no un básico más caro. Ningún escenario medido mata a quien usa hechizos, ni siquiera sin
esquivar.

### 3. Que el coste limite depende de la reserva, no solo de la regeneración

Mínimo de recurso alcanzado (en % del máximo) y bloqueos por recurso por pelea, con política solo básico y
habilidad media:

| Escenario | Vanguardia k = 1 / k = 2 | Tejedora k = 1 / k = 2 | Cazadora k = 1 / k = 2 |
|---|---|---|---|
| Nv 1 · grupo de 2 | 49 % / 2 % (74 bloqueos) | 89 % / 50 % | 81 % / 18 % (3) |
| Nv 5 · 3 de nivel 6–7 | 51 % / 1 % (111) | 92 % / 46 % | 80 % / 7 % (8) |
| Nv 10 · 3 de nivel 11–12 | 53 % / 0 % (93) | 96 % / 77 % | 92 % / 46 % |

- **Tejedora**: con 140 de Maná, ni el doble de su regeneración la limita en peleas de 15 s (20 o 10 golpes con
  el recurso lleno).
- **Cazadora**: con k = 2 se queda cerca del fondo en los niveles bajos (7–18 %), pero nunca pierde una pelea por
  ello. A nivel 10, su regeneración y su reserva crecen y el mismo coste deja de limitar (46 %). Con hechizos, el
  básico solo hace el 14–25 % de su daño, así que el coste casi no le resta.
- **Vanguardia**: con su reserva de 60, k = 2 la deja sin Vigor y sufre decenas de bloqueos. Con hechizos es la
  única que se resiente: el básico hace el 34–57 % de su daño y compite por el Vigor con sus hechizos. Con k = 1, a
  nivel 10, tarda un 30 % más (6,5 s → 8,2–8,5 s); con k = 2, en las peleas de nivel 5 tarda un 40 % más.

Un mismo factor sobre la regeneración castiga a la clase cuerpo a cuerpo, apenas toca a la Cazadora y no toca a
la Tejedora. En peleas cortas, el límite real lo dan los **golpes con el recurso lleno** (`máximo / coste`), y en
peleas largas el **drenaje neto** (`coste / (regeneración × 1,4)`). Un coste por clase debería fijar las dos cifras
a propósito. Ambas cambian con el nivel y el equipo.

## Recomendación

1. **Activar B (`autoRepeat: true`) cuando el creador lo confirme.** Cumple el comportamiento pedido, está
   probado y no cambia ninguna cifra medida. Antes conviene sentirlo en Electron con la Cazadora, porque golpea a
   9 m y es la que más clics ahorra.
2. **No activar C todavía.** El coste no es la palanca que impide abusar del básico en combates difíciles; esa
   palanca es la presión enemiga. Si se quiere un coste, conviene diseñarlo por clase con `classCost`, a partir de
   «golpes con el recurso lleno» y «drenaje neto». Además, debe comprobarse a niveles 1, 5 y 10, porque la
   regeneración y la reserva crecen. Hoy la Vanguardia saldría perjudicada con cualquier k ≥ 1.
3. **Medir con un escenario que haga perder al bot sin hechizos ni posicionamiento.** Sin él no se puede
   comprobar el criterio 7 del creador («no debe ser estrategia dominante para superar combates difíciles»). Es
   trabajo de balance enemigo (T01), aparte de este cambio.

Límites de la medición: es un bot, no una persona; las peleas son en campo abierto; se usaron 6 semillas; el equipo
es el obtenible a cada nivel. No sustituye a la prueba del creador.
