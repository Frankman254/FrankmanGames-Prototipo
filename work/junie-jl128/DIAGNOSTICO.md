# JL-128: `perfil` y `perfilCpu` — timeouts y caída de CDP

## Resumen

Ambos escenarios terminan correctamente. El único fallo es intermitente y viene de un error de consola pre-existente (JL-137).

## `perfil`

- **Timeout propio:** 300 s (ya configurado por JL-51).
- **Resultado:** 1/1 comprobaciones, estable en múltiples ejecuciones.
- **Sin caída de CDP.**

## `perfilCpu`

- **Timeout propio:** 300 s (añadido en esta tarea).
- **Resultado:** El escenario completa el perfilado de CPU correctamente y escribe `perfil-cpu.json`.
- **Fallo intermitente:** El check final "Sin errores en la consola" falla cuando aparece el error de Babylon `postProcessManager` (JL-137). Este error es pre-existente y no determinista: aparece al cambiar de escena durante el perfilado.
- **Sin caída de CDP** cuando el timeout propio está configurado.

## Cambio

- `scripts/qaElectron.mjs`: añadido `scenarios.perfilCpu.timeout = 300` (línea 5836).

## Verificación

- `perfil`: 2/2 ejecuciones consecutivas en verde.
- `perfilCpu`: completa el perfilado; el único fallo es el error de consola pre-existente (JL-137).

## Lo que queda

El error `postProcessManager` se arregla en JL-137 (tarea separada).
