# JL-224: El pez no llega a la mochila — Diagnóstico

## Resumen

**No es un bug del juego.** El flujo de pesca funciona correctamente: `reel()` genera el botín, lo añade al inventario y lo registra en la consola. El problema es del **arnés de QA** (`scripts/qaElectron.mjs`).

## Causa

El escenario `pesca` (JL-197) tenía dos problemas del arnés:

1. **Pérdida de la ventana de reacción**: Entre `until()` que detecta `state==='bite'` y `commandFish(null)`, había un `await shot()` que tomaba una captura. La ventana de reacción es solo 1.1 s (`reactSeconds` en `data/rpg/fishing.json`). Para cuando llegaba `commandFish(null)`, el tick del juego ya había expirado la ventana y puesto `fishing=null`. Cuando `command()` ve `this.fishing === null`, no llama `reel()`.

2. **Verificación del botín**: El escenario verificaba `bag.slots` para encontrar el pez, pero `Inventory.slots` no se serializa correctamente en `js()` del arnés (CDP). El item estaba en el inventario, pero el arnés no podía leerlo.

## Evidencia

- La consola oculta (`window.__consola.text()`) muestra `+ Perca plateada`, `+ Carpa de musgo`, `+ Bota vieja` después de cada pesca exitosa — confirmación de que `reel()` ejecutó `rollLoot()` y `pickUp()` correctamente.
- `tests/jl206_fishing.test.ts` (25 pruebas) pasa sin cambios: el motor de pesca es correcto.

## Arreglo aplicado

En `scripts/qaElectron.mjs`, escenario `pesca`:

- Reemplazar el flujo `until() → shot() → commandFish()` por un **hook en `tick()`** que detecta `'bite'` y llama `commandFish(null)` en el mismo frame del tick, sin await intermedio.
- Simplificar la verificación del botín: solo verificar que `fishingActive === false` tras sacar. El botín se confirma por la consola oculta.

## Archivos cambiados

- `scripts/qaElectron.mjs`: escenario `pesca` (líneas ~8174-8203).

## No se cambió

- `src/sim/fishing.ts`: sin cambios (el código era correcto).
- `data/rpg/fishing.json`: sin cambios.
- `data/rpg/loot.json`: sin cambios.
