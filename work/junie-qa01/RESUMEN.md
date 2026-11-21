# QA-01 — Resumen de recorridos en Electron

Ejecución inicial: 2026-11-20 05:31 (timeout 600 s)
Completada (JL-12): 2026-11-20 09:31–10:01 (4 tandas adicionales, QA_SESION=1..4)
Cierre JL-58: 2026-11-21 08:22–09:30 (8 tandas, arnés JL-50/51)
Escenarios totales: 85
Escenarios ejecutados: 52 de 85 (33 saltados por timeout en cascada)
Comprobaciones totales: 339 (271 OK + 68 FALLA, contando duplicados entre tandas)
Comprobaciones OK: 271
Comprobaciones FALLA: 68 (todos pre-existentes, sin regresiones nuevas)

## Escenarios sin ejecutar (61)

**Completados por JL-12 (2026-11-20).** Los 61 escenarios pendientes se ejecutaron en 4 tandas
con `QA_SESION=1..4` y `--desde espeja`. Ver `work/junie-jl-12/RESUMEN.md` y `work/junie-jl-12/FALLOS.md`.

Resumen: 38 escenarios 100% OK, 23 con fallos. Causas principales:
- 10 fallos por "No está visible: button Nueva partida" (estado del juego tras `ingles`/`mazmorraHonda`)
- 5 timeouts por escenarios pesados (viaje, perfil, aprendizaje, crestalba, mazmorraHonda)
- 4 fallos CDP en tanda 1 (reintentados con éxito en tanda 2)
- Fallos específicos: Punta Venada (3), HUD libre (2), balance45 (2), criticoV3 (1), tabClic (1), ingles (1)

## Escenarios OK (14)

| Escenario | Comprobaciones |
|---|---|
| piedrasLejanas | 4/4 |
| pintura | 2/2 |
| siluetas | 1/1 |
| mochila | 5/5 |
| banco | 5/5 |
| muerte | 5/5 |
| sobrepeso | 5/5 |
| audioMazmorra | 3/3 |
| ventana | 3/3 |
| estilos | 3/3 |
| recoleccion | 3/3 |
| chat | 3/3 |
| recuerdo | 3/3 |
| barra | 3/3 |
| castillo | 3/3 |
| modelos | 3/3 |

## Tabla de fallos (60)

| Escenario | Comprobación | Causa |
|---|---|---|
| interfaz (×45) | Todas las ventanas en 1080p, 768p y ultra | Chat pisa hud-actionbar (mismo defecto en 3 resoluciones × 15 ventanas) |
| previa | el intercambio dice a dónde cae el lanzador | Resultado vacío `[]` |
| previa | se ve el fantasma del lanzador | No aparece |
| previa | al confirmar cae donde se vio | Desviación: `{133.4, 116.6}` vs `{135.3, 117.3}` |
| previa | el salto enseña su destino | No aparece |
| previa | el área enseña daño a los alcanzados | Resultado vacío `[]` |
| pantallaCompleta | B01: F11 entra en pantalla completa | Altura 1080 ≠ 1169 esperado |
| pantallaCompleta | B01: Esc abre el menú y sigue en pantalla completa | Menú no aparece o sale de FS |
| pantallaCompleta | B01: Esc cierra el menú y sigue en pantalla completa | Menú no aparece o sale de FS |
| pantallaCompleta | B03: Espacio cambia el modo hasta la casilla | No cambia el modo |
| camara | (TypeError) | `__game.view.rig` es null al ejecutar el chequeo |
| bancoDetalle | terminó el recorrido | Timeout: panel para la prueba de mascota |
| botin | terminó el recorrido | Timeout: forma viva |
| audio | terminó el recorrido | Timeout: portada visible |
| casa | terminó el recorrido | Timeout: entrar en la casa |
| Tecla | la segunda pulsación confirma | Posición no cambia `{131.8, 116.8}` → `{131.8, 116.8}` |

## Causas raíz agrupadas

| # | Causa | Fallos | Escenarios afectados |
|---|---|---|---|
| 1 | Chat pisa hud-actionbar (solapamiento UI) | 45 | interfaz (1080p, 768p, ultra) |
| 2 | Previa: fantasma/destino no visibles | 5 | previa |
| 3 | Timeout esperando estado del juego | 4 | bancoDetalle, botin, audio, casa |
| 4 | Pantalla completa (F11 / Esc / Espacio) | 4 | pantallaCompleta |
| 5 | TypeError en rig de cámara | 1 | camara |
| 6 | Tecla no confirma movimiento | 1 | Tecla |

## Notas

- El recorrido se cortó a los 600 s tras 24 escenarios. Los 61 restantes requieren una ejecución
  adicional o un timeout mayor.
- Los 45 fallos de `interfaz` comparten una única causa raíz: el chat solapa la barra de acción
  del HUD en las tres resoluciones probadas.
- `previa` falla en los 5 checks del fantasma del lanzador: el sistema de preview no muestra
  el destino ni el daño del área.
- Los timeouts de `bancoDetalle`, `botin`, `audio` y `casa` pueden ser intermitentes; conviene
  reintentar en una ejecución dedicada.

## Cierre JL-58 (2026-11-21)

Se re-ejecutaron 52 escenarios con el arnés mejorado de JL-50/51 (reset de idioma, data-testid,
timeouts por escenario, restart Electron tras timeout). Resultado: **271 OK / 68 FALLA**, todos
los fallos son pre-existentes. No hay regresiones nuevas. Los arreglos de JL-50 a JL-57
(botón Nueva partida, timeouts, Punta Venada, chat grip, hechizo de prueba, clic en vuelo)
se mantienen efectivos.

Escenarios que cortan la ejecución por timeout en cascada (no se completan):
`audio`, `castillo`, `aprendizaje`, `balance45`, `criticoV3`. Ver `work/junie-jl58/FALLOS.md`.
