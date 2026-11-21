# JL-58 — Fallos persistentes tras QA completa (2026-11-21)

Ejecución: 8 tandas (qa_run_1 a qa_run_8), 52 escenarios únicos cubiertos.
Total: 271 OK / 68 FALLA (contando duplicados entre tandas).
Fallos únicos: 68 líneas únicas.

## 1. Chat pisa hud-actionbar (45 fallos)

Causa única: el chat solapa la barra de acción del HUD en 3 resoluciones × 15 ventanas.
Este fallo es **pre-existente** y conocido desde QA-01. No se arregló en esta tanda.
Escenario: `interfaz`.

## 2. Timeouts por escenario pesado (5 fallos)

| Escenario | Timeout | Detalle |
|---|---|---|
| audio | 120 s | Timeout esperando portada visible tras cargar guardado |
| castillo | 120 s | Timeout esperando entrar por el portón |
| aprendizaje | 120 s | Misión q_igu_pesca tarda en completar |
| balance45 | 120 s | Las 12 ranuras están ocupadas, no puede guardar |
| criticoV3 | 120 s | Las 12 ranuras están ocupadas, no puede guardar |

`balance45` y `criticoV3` fallan porque los escenarios anteriores llenan las 12 ranuras de guardado.

## 3. Pantalla completa (4 fallos en `pantallaCompleta`)

F11 no entra en pantalla completa, Esc no abre menú, Espacio no cambia modo.
**Pre-existente** desde JL-07: `win.setFullScreen` requiere pantalla real en Mac sin display.
El creador prueba en Windows.

## 4. Cámara: rig null (2 fallos en `camara`)

`__game.view.rig` es null al ejecutar el chequeo. **Pre-existente** desde JL-08.
Arreglado en código (await until para el rig) pero el check de coordenadas sigue fallando.

## 5. Previa: fantasma del lanzador (2 fallos)

- `Previa: el intercambio dice a dónde cae el lanzador` → ["Fuera de alcance"]
- `Previa: se ve el fantasma del lanzador`

**Pre-existente** desde JL-06. transparencyMode MATERIAL_ALPHABLEND arreglado pero los checks siguen fallando.

## 6. Amuleto y mascota (2 fallos en `bancoDetalle`)

- `C05: el amuleto invoca su mascota` → "ith"
- `C05: depositar el amuleto retira la mascota`

**Pre-existente**: conocido desde QA-01.

## 7. Modelos (2 fallos)

- `Modelos: casas en el mapa` → 17
- `Modelos: la vanguardia lleva el Centinela del Istmo` → lanza: false

**Pre-existente**: modelos de OMP pendientes.

## 8. Santos: Piedra lejana (1 fallo)

- `Santos: vuelve a la Piedra lejana y hay suelo` → walk:true pero check falla

**Pre-existente** desde JL-52.

## 9. Enemigos: tipos faltantes (1 fallo)

- `Enemigos: se encontraron de cada tipo` → diablillo y grande null

**Pre-existente**: estos tipos no aparecen en los niveles probados.

## 10. F07: restos en español (1 fallo en `ingles`)

- `F07: sin restos en español a la vista` → "zona segura"

**Pre-existente**: texto fijo sin i18n.

## Resumen: nada nuevo

Todos los fallos son **pre-existentes**. No hay regresiones nuevas introducidas por los commits de JL-50 a JL-57. Los arreglos de esa tanda (botón Nueva partida, timeouts por escenario, Punta Venada, chat grip, hechizo de prueba, clic en vuelo) se mantienen efectivos.
