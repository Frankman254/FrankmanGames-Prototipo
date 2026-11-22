# JL-85b: Escenario `crestalba` en verde

## Causas del fallo

El escenario `crestalba` fallaba con timeout esperando "modelo Crestalba". El mesh `mount:*` nunca aparecía en la escena.

### Causa 1: Predicate demasiado específico (línea 3314)

El `until()` buscaba:
```js
m.name.endsWith('body') && m.name.startsWith('mount:')
```
Los meshes del GLB de Crestalba (y de otras monturas con modelo propio) no terminan en `body`. El escenario `monturas` (que SÍ funciona) solo usa `m.name.startsWith('mount:')`.

### Causa 2: Falta `{ devMount: true }` (línea 3309)

`newGame('QA Crestalba')` sin `{ devMount: true }` no activa las monturas de desarrollo. Aunque el escenario hacía `c.give()` como fallback, el flag `devMount` controla si `grantDevMount` se ejecuta en el juego. El escenario `monturas` usa `{ devMount: true }` y funciona.

## Arreglo

En `scripts/qaElectron.mjs`:
1. Línea 3309: `newGame('QA Crestalba')` → `newGame('QA Crestalba', { devMount: true })`
2. Línea 3314: `m.name.endsWith('body')&&m.name.startsWith('mount:')` → `m.name.startsWith('mount:')`

## Validación

Escenario `crestalba` 5/5 en verde:
- F34: Crestalba carga malla, anclaje y siete clips (33 meshes, 7 clips, rider_root, 119.9 FPS)
- F34: rendimiento visible de Crestalba (119.9 FPS)
- F34: el jinete no camina sobre Crestalba
- F34: vuelo visible con alas animadas
- Sin errores en la consola
