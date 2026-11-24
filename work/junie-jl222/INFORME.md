# JL-222: Noche y lluvia en la barriada Praderas del Norte

**Fecha:** 2026-11-23
**Escenario:** `barriadaNoche` en `scripts/qaElectron.mjs`
**Resultado:** 8/8 checks en verde

## Capturas

| Captura | Hora (t) | Descripción |
|---------|----------|-------------|
| `jl222-barriada-mediodia.jpg` | 0.5 | Sol arriba, iluminación uniforme |
| `jl222-barriada-atardecer.jpg` | 0.75 | Sol bajo al oeste, sombras largas |
| `jl222-barriada-noche.jpg` | 0.9 | Luna, farolas encendidas, luz del jugador |
| `jl222-barriada-noche-alto.jpg` | 0.9 | Vista cenital, farolas visibles |

## Hallazgos

### Iluminación por hora

- **Mediodía (t=0.5):** Iluminación correcta. Sol alto, sombras cortas. Las casas y calles se ven bien.
- **Atardecer (t=0.75):** Sol bajo, sombras largas hacia el este. Color cálido en el horizonte. Sin problemas visibles.
- **Noche (t=0.9):** Luna ilumina débilmente. Las farolas de la barriada se encienden correctamente (lampsOn > 0). La luz del jugador crea un radio de visibilidad. Sin problemas de oscuridad total.
- **Noche cenital:** Vista desde arriba confirma que las farolas están distribuidas por las calles.

### Lluvia

- **No se puede forzar la lluvia desde el arnés.** El clima es automático por zona (`data/weather.json`). La barriada Praderas del Norte usa el clima de su zona (definido en `data/zones.json`).
- El sistema de clima (`world.weather`) existe y está activo, pero no expone API para forzar un tipo de clima concreto desde fuera.
- Los tipos de clima definidos son: `clear`, `rain`, `sun`, `snow`.
- Para forzar lluvia en QA haría falta una herramienta de desarrollo (por ejemplo, `world.weather.force('rain')` en modo dev). Esto queda como propuesta para JL-223 o una tarea futura.

### Sin errores de consola

- 0 errores de Babylon.js ni del juego durante el escenario.
- Las capturas se generan correctamente sin warnings.

## Conclusión

La iluminación de la barriada funciona correctamente a mediodía, atardecer y noche. Las farolas se encienden de noche. No se detectan problemas visuales graves. La lluvia no se pudo verificar porque no hay forma de forzarla desde el arnés.
