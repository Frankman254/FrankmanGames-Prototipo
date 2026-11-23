# JL-143: Escenario utileriaCripta — Diagnóstico

## Resultado

Escenario `utileriaCripta` en `scripts/qaElectron.mjs`: **12/17 en verde**.

- 5 pisos a mano se renderizan correctamente (dFloor, dWall, dTorch, dChest...).
- `utileria_cripta.glb` existe en `assets/models/` y es accesible por fetch.
- Los 12 nodos del GLB coinciden con las piezas declaradas en `cripta-tulivieja.json`.
- **Sin errores de consola.**

## Hallazgo: floor.props vacío

Los 5 fallos son idénticos: `dProp: 0` — ningún mesh `dProp-*` se crea en la escena.

### Causa

`buildProps()` en `src/render/dungeonView.ts:469-496` se llama correctamente (el root `dungeon-N` existe con 21 hijos), pero `floor.props` está vacío cuando se construye el `DungeonFloorView`.

`generateHandFloor()` en `src/world/dungeon.ts:651-659` mapea `hand.props`:
```ts
props: (hand.props ?? []).map((p) => { ... }),
```

Si `hand.props` es `undefined`, el resultado es `[]`. Esto significa que `DESIGNED_DUNGEON.floors[index]` no tiene `props` en runtime, aunque el JSON (`data/dungeons/cripta-tulivieja.json`) sí los tiene.

### Posible causa raíz

`import.meta.glob('/assets/models/utileria_cripta.glb')` en `dungeonView.ts:197` puede no incluir el GLB en el bundle de Vite, haciendo que `CRYPT_PROP_URLS` sea `undefined`. La carga asíncrona falla silenciosamente con `.catch(() => {})`.

Sin embargo, el fetch directo del GLB funciona, lo que sugiere que el problema puede estar en cómo Vite importa el JSON de `cripta-tulivieja.json` en `dungeon.ts:16`.

### Qué necesita arreglarse

1. Verificar que `DESIGNED_DUNGEON.floors[0].props` no es undefined en runtime.
2. Si el JSON se importa bien, verificar que `import.meta.glob` incluye `utileria_cripta.glb`.
3. Si el glob no lo incluye, cambiar a `?url` import directo o ampliar el patrón glob.

### Capturas

5 capturas en `work/qa/jl143-piso-1-atrio.jpg` a `jl143-piso-5-santuario.jpg`.
