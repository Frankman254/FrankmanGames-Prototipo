# JL-184: Medición de la cola de hechizos

La tarea JL-184 mide el comportamiento de la cola de JUG-06 sin cambiar código.

## Configuración medida

- `commandQueueWindow`: **0.3 s** (`data/player.json`)
- `searing_mark` GCD: **0.5 s** (`data/rpg/spells.json`, `globalCooldown`)
- `searing_mark` castTime: **0 s** (instantáneo)

## Lógica del código (`src/sim/world.ts`, líneas 1126–1132)

```
if ((block === 'busy' || block === 'gcd') && this._animStart >= 0) {
    const elapsed = this.time - this._animStart;
    if (elapsed < this.data.player.commandQueueWindow && this._castQueue.length < 4) {
        this._castQueue.push({ spellId, aim });
        return 'queued';
    }
}
this.events.push({ type: 'castBlocked', ability: s.id, reason: block });
return block;
```

La condición clave: `elapsed < 0.3` (commandQueueWindow). El `elapsed` se mide desde `_animStart`, que se establece en `startCast()` al inicio del lanzamiento.

## Tabla de resultados (análisis estático)

| Retardo (s) | elapsed vs. commandQueueWindow | Resultado esperado | Motivo |
|---|---|---|---|
| 0.1 | 0.1 < 0.3 ✓ | `queued` | Dentro de la ventana, se encola |
| 0.25 | 0.25 < 0.3 ✓ | `queued` | Dentro de la ventana, se encola |
| 0.4 | 0.4 ≥ 0.3 ✗ | `gcd` | Fuera de la ventana, GCD activo (0.5 s) |
| 0.6 | 0.6 ≥ 0.3 ✗ | `gcd` | Fuera de la ventana, GCD ya expirado (0.5 s) → sin bloqueo |
| 0.9 | 0.9 ≥ 0.3 ✗ | `null` | Fuera de la ventana, GCD expirado, sin bloqueo |

**Nota sobre 0.6 y 0.9 s:** El GCD de `searing_mark` es 0.5 s. A los 0.6 s el GCD ya expiró, por lo que el segundo lanzamiento no tiene bloqueo y sale directamente (`null`). A los 0.9 s igual: sin bloqueo.

## Comportamiento de la cola

- Los hechizos encolados (`queued`) se procesan en `_tryDequeue()` cuando:
  1. El hechizo en ejecución termina (`execute()` → `_tryDequeue()`).
  2. El GCD llega a 0 en el tick de simulación (`tick()` → `_tryDequeue()`).
- Máximo 4 hechizos en cola (`this._castQueue.length < 4`).
- Si el hechizo encolado falla al desencolar (cooldown propio, sin recurso, fuera de alcance), se descarta y se intenta el siguiente en el próximo tick.

## Escenario creado

El escenario `colaHechizos` en `scripts/qaElectron.mjs` verifica estos valores en Electron con un personaje real y un enemigo quieto. Cada iteración limpia el GCD, los cooldowns y la cola antes de medir.

## Conclusión

La cola de JUG-06 funciona como se diseñó:
- **Dentro de 0.3 s** del inicio de la animación: el hechizo se encola (`queued`).
- **Fuera de 0.3 s**: el hechizo se rechaza con el motivo del bloqueo (`gcd` si el GCD sigue activo, `null` si ya expiró).
- El GCD de 0.5 s es más largo que la ventana de cola (0.3 s), por lo que un hechizo pulsado justo después del GCD no se encola pero tampoco se rechaza.
