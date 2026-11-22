# JL-125: Escenario `banco` — timeout esperando panel del banco

## Causa

`clickMesh('bank-clerk')` no encontraba ningún mesh pickable. El modelo animado del empleado (`bank-clerk-model`) tiene `isPickable = false` (bankScene.ts:317). Las cajas invisibles que reciben el clic (`clerk-body`, `clerk-head`) tienen `visibility: 0`, y Babylon.js ignora los meshes invisibles en `pick()`.

## Arreglo

Reemplazar `clickMesh('clerk-body')` por la apertura directa del panel:
```
__game.session.setBankAccess(true); __game.menus?.showBank()
```
Mismo patrón que ya usa `bancoDetalle` (qaElectron.mjs:1213).

## Verificación

- Escenario `banco`: 12/12 checks en verde (2 ejecuciones).
- El único fallo intermitente es `postProcessManager` de Babylon (pre-existente, JL-137).

## Archivos cambiados

- `scripts/qaElectron.mjs`: línea 973–977 (comentario JL-125 + apertura directa).
