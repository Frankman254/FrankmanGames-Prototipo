# JL-197: Diagnóstico del escenario pesca

## Resultado

6/6 checks en verde. El flujo completo de pesca funciona:
1. Banco de peces disponible en el Charco de la Garza ✓
2. Jugador cerca del estanque ✓
3. Sedal lanzado y esperando ✓
4. Pez pica y se saca a tiempo ✓
5. Sedal recogido ✓
6. Sin errores en consola ✓

## Hallazgo: reel() no produce botín

Al sacar el pez (`commandFish(null)` cuando `state === 'bite'`), el método `reel()` de `FishingManager` se ejecuta correctamente:
- `wasBite: true` → el pez había picado
- `fishingAfter: false` → el estado de pesca se limpió
- Pero: inventario vacío, oro = 0, sin loot en el suelo, sin mensaje

Posibles causas:
1. `h.content.lootTables` no tiene `fishing_meadow` cuando `reel()` lo busca
2. `rollLoot()` devuelve items vacíos
3. `h.character.pickUp()` falla silenciosamente

El escenario `aprendizaje` (que también pesca) funciona con timeout 600s, por lo que la mecánica funciona en ese contexto. La diferencia podría ser la inicialización del contenido tras `newGame()`.

## Capturas

- `jl197-antes-pesca.jpg` — jugador junto al Charco de la Garza
- `jl197-sedal-agua.jpg` — sedal en el agua
- `jl197-pez-pica.jpg` — momento del bocado
- `jl197-sedal-recogido.jpg` — sedal recogido

## Para el coordinador

El bug de `reel()` sin botín debería investigarse: verificar que `content.lootTables['fishing_meadow']` existe y que `rollLoot()` devuelve items en el contexto del arnés de QA.
