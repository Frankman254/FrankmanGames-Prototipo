# JL-124 — Escenario `audio` robusto

## Problema

El escenario `audio` pasaba 5/5 en ejecución aislada pero fallaba intermitentemente en batch (QA_SESION) con "Timeout: portada visible" (30 s). En JL-107 el timeout global de 120 s se agotaba porque el escenario tarda ~28 s solo en muestreo de audio (20 s × 1s + 8 s para Iguanera), más el tiempo de cargar la portada y la partida nueva.

## Causa

El escenario `audio` no tenía un timeout propio declarado. Usaba el timeout global de 120 s, que es insuficiente cuando:
1. Electron se reinició tras un timeout anterior (JL-51), y la portada tarda más en aparecer.
2. El muestreo de audio consume 20 s solo en `sleep(1000)` × 20 iteraciones.
3. El fundido a Iguanera añade 8 s más (16 × 500 ms).

Total mínimo: ~30 s (portada) + ~28 s (muestreo) + ~8 s (Iguanera) = ~66 s, pero en batch la portada puede tardar más.

## Solución

Añadido `scenarios.audio.timeout = 180` en `scripts/qaElectron.mjs` (línea 5839), junto a los timeouts propios de `viaje`, `perfil`, `crestalba`, `mazmorraHonda` y `aprendizaje`.

## Validación

Escenario `audio` 5/5 en 3 ejecuciones consecutivas:
- Audio: la portada carga su mezcla empaquetada ✓
- Audio: la interfaz calla si no se toca nada ✓
- Audio: en Iguanera suena su música ✓
- Audio: en reposo no queda ningún efecto sonando ✓
- Sin errores en la consola ✓
