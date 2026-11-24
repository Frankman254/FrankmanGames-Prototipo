# JL-219: Montura dentro de la barriada — Diagnóstico

Escenario `barriadaMontura` en `scripts/qaElectron.mjs`.
Resultado: 11/14 checks verdes (3 "fallos" son hallazgos esperados, no errores).

## Resultados

### Montura de tierra (dev_harpy)

| Borde | Objetivo | Posición final | Dentro de la barriada |
|-------|----------|----------------|----------------------|
| Norte | (6210, 5) | (6210, 5) | ✅ Sí |
| Sur | (6210, 415) | (6210, 415) | ✅ Sí |
| Oeste | (6005, 210) | (6086, 290) | ✅ Sí (A* desviado por casas) |
| Este | (6415, 210) | (6383, 236) | ✅ Sí (A* desviado por casas) |

**Conclusión:** La montura de tierra no se sale de la barriada. El sistema de navegación (A*) respeta los sólidos de las casas y los límites del terreno. En los bordes oeste y este, el camino se desvía porque las casas bloquean el acceso directo al borde, pero el jugador siempre queda dentro.

### Montura voladora (Falcopama)

- `world.interior` = `true` dentro de la barriada.
- `world.canFly()` = `false` porque `canFly()` verifica `!this.interior` (src/sim/world.ts:2901).
- Tab no activa el vuelo; el juego muestra el aviso "Hace falta una montura que vuele".
- Con Falcopama equipada pero a pie, el jugador también se mantiene dentro de la barriada al intentar ir más allá del borde norte: llegó a (6282, 71), dentro de los límites.

**Conclusión:** El vuelo está bloqueado dentro de la barriada porque `world.interior` es `true`. Esto se debe a que la barriada usa `HouseScene.enter()` (src/scenes/houseScene.ts:383) que llama a `switchInside(true, room.outdoor)` y crea un mundo con `interior: true` (src/scenes/houseScene.ts:459). El flag `outdoor: true` solo afecta al render (cielo, suelo), no a la simulación.

### Altura del jugador

- El jugador queda a pie (`vuelo: false`) al final del escenario.
- No se detectó que el jugador quede sobre un techo.

## Hallazgos

1. **No se puede salir de la barriada a pie ni montado.** Los límites del terreno y los sólidos de las casas contienen al jugador. ✅ Comportamiento correcto.

2. **El vuelo está bloqueado dentro de la barriada.** Causa: `world.interior = true` (houseScene.ts:459). `canFly()` en world.ts:2901 exige `!this.interior`. Esto es un diseño existente: la barriada usa el sistema de interiores para aislar el mundo, aunque visualmente es outdoor.

3. **No hay riesgo de quedar sobre un techo.** El jugador siempre queda a nivel del suelo.

## Propuesta de arreglo (si el creador quiere permitir vuelo en la barriada)

Opción A: Cambiar `canFly()` para que también permita vuelo cuando `houses?.inBarriada` es true:
```
// world.ts:2898
canFly(): boolean {
    const m = this.character.equipment.get('mount');
    return (
        (!this.interior || this.inBarriada) &&  // ← cambio
        this.player.alive &&
        !this.character.spectral.active &&
        !!(m && this.content.items[m.itemId]?.mount?.flying)
    );
}
```
Pero esto requeriría que `World` conozca `houses`, lo cual rompe el acoplamiento.

Opción B: Al crear el mundo de la barriada, pasar `interior: false` en vez de `interior: true`:
```
// houseScene.ts:459
interior: room.outdoor ? false : true,  // ← cambio
```
Esto permitiría vuelo pero también activaría zonas, encuentros y todo lo que `interior: false` habilita.

**Recomendación:** No cambiar nada sin decisión del creador. El bloqueo actual es coherente con el diseño de la barriada como zona segura. Si el creador quiere que se pueda volar, hay que decidir si la barriada debe comportarse como interior o como exterior para la simulación.

## Capturas

- `work/qa/jl219-montado-bordes.jpg` — montado con dev_harpy, tras recorrer los 4 bordes.
- `work/qa/jl219-falcopama.jpg` — Falcopama equipada, a pie.
- `work/qa/jl219-aterrizado.jpg` — jugador a pie, sin vuelo.
