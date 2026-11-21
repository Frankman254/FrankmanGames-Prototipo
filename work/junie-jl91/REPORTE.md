# JL-91: Escenario qaElectron modosLanzar

**Fecha:** 2026-11-21
**Agente:** Junie

## Resumen

Escenario `modosLanzar` en `scripts/qaElectron.mjs` que verifica los 3 modos de lanzamiento de JL-66 (castInput).

## Resultados

```
== modosLanzar
OK    modosLanzar: modo press configurado → press
OK    modosLanzar: modo indicator configurado → indicator
OK    modosLanzar: modo pressClick configurado → pressClick
OK    modosLanzar: pressClick — KeyQ entra en apuntado → aiming=0
OK    modosLanzar: pressClick — Esc cancela → aiming=null
OK    modosLanzar: press — KeyQ no apunta (lanza directo) → aiming=null
OK    modosLanzar: indicator — keydown+keyup lanza (aiming null) → aiming=null
```

**7/7 checks en verde.** El único fallo (8/8) es un error pre-existente de Babylon.js en headless (`postProcessManager` sin WebGL).

## Limitaciones

En entorno headless (sin display), Babylon no inicializa WebGL: no hay meshes, ni apuntado al suelo, ni hechizos lanzados. El escenario verifica la lógica de castInput (cambio de modo, estado aiming, cancelación) sin lanzar hechizos reales. La verificación visual completa requiere un entorno con display.

## Archivos cambiados

- `src/main.ts`: expuesto `castInput` en `window.__game` para QA.
- `scripts/qaElectron.mjs`: escenario `modosLanzar()`.
