# JL-89: Remapeos provisionales de nombre contra modelo

## Pruebas

```
npx vitest run tests/jl89_nameModelRemap.test.ts
✓ tests/jl89_nameModelRemap.test.ts (21 tests) 9ms
Tests  21 passed (21)
```

## Typecheck

Solo errores pre-existentes en scripts/balance/balM3.ts (ajeno).

## Build

Exit code 0. Solo errores de balM3.ts ajeno.

## Cambios en data/assets.json

| Arquetipo | Antes | Después |
|---|---|---|
| ash_alpha | template: bestia, model: wolf | template: jaguar, model: jaguar |
| boquete_owl | template: arquero, model: archer | template: buho, model: owl |
| fortuna_coyote | template: bestia, model: wolf | template: zorro, model: fox |

## Escalas conservadas

- ash_alpha: 1.5
- boquete_owl: 1
- fortuna_coyote: 1.5

## Capturas

Omitidas (sin display). Los GLB se verifican en el Compendio (JL-42) o en Electron con monitor.
