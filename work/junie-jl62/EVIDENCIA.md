# Evidencia JL-62: Escenario balance45 al día

**Fecha:** 2026-11-21
**Tipo:** Código (solo scripts/qaElectron.mjs)

## Cambios

1. **Check 2:** "Balance 45: tormenta escala con Voluntad (no con Agilidad)"
   - Agregado `will: 120` al setup de stats QA para que lightning_arrow escale correctamente.
   - Renombrado el check para reflejar la regla Balance 45 (escalado por stat elemental).

2. **Check 4:** "Balance 45: Lluvia de flechas es agua y cuesta recurso"
   - Cambiado de `cost >= 40` a `cost > 0`: el coste 24 de `arrow_downpour` es el diseño de HZ-04c-cazador (d96bbb9).
   - Renombrado "Aguacero" a "Lluvia de flechas" (nombre actual en spells.json).

## Validación

- `npx tsc --noEmit`: sin errores nuevos (solo balM3.ts y jl53_chatGrip.test.ts pre-existentes).
- `npx vitest run`: 3283/3284 pasadas (1 fallo pre-existente en assets.test.ts, de OMP).
- Electron: no disponible para capturas (sin display).

## Archivos modificados

- `scripts/qaElectron.mjs` (escenario balance45, líneas 4209-4248)
