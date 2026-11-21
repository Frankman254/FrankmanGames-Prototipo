# JL-70: Conectar las físicas de JL-67 al juego

## Cambios

- `src/render/characters/characterModel.ts`: método opcional `setInertia(accel, yawRate, dt)`.
- `src/render/characters/gltfCharacter.ts`:
  - Importa `SecondaryPhysics` y `DEFAULT_CHAIN_CONFIG`.
  - `buildSecondaryPhysics()`: busca huesos `fis_*`, construye cadenas, registra observer.
  - `applySecondaryPhysics()`: aplica desplazamientos a los huesos tras las animaciones.
  - `setInertia()`: actualiza el motor con la inercia del personaje.
  - `freezeSecondary()` / `thawSecondary()`: control por distancia a la cámara.
  - `dispose()`: limpia cadenas y observer.
- `src/render/characters/playerAvatar.ts`:
  - `prevSpeed` y `prevYaw` para calcular aceleración y velocidad de giro.
  - En `sync()`: calcula accel y yawRate, llama a `m.setInertia?.()`.
  - `reset()`: limpia prevSpeed y prevYaw.
- `tests/jl70_secondaryIntegration.test.ts`: 15 pruebas de integración.

## Verificación

- `npx vitest run tests/jl70_secondaryIntegration.test.ts`: 15/15 ✓
- `npx vitest run tests/jl67_secondaryPhysics.test.ts`: 25/25 ✓
- Suite completa: 3321/3321 ✓
- `npx tsc --noEmit`: limpio (solo balM3.ts ajeno)
- `npm run build`: OK (solo balM3.ts ajeno)

## Notas

- Sin huesos `fis_*` en los GLB actuales (OMP-POL-13 pendiente), el código no hace nada visible.
- La inercia se calcula en cada fotograma de `PlayerAvatar.sync()` y se pasa al motor.
- Rendimiento: 20 personajes con 2 cadenas cada uno < 0.5 ms por fotograma.
- Capturas de Electron omitidas: sin huesos `fis_*` en los modelos actuales, no hay efecto visual que capturar. Se capturan cuando OMP entregue OMP-POL-13.
