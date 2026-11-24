# JL-221: Rendimiento de la barriada Praderas del Norte

**Fecha:** 2026-11-23
**Máquina:** Mac M5, ANGLE Metal Renderer
**Resolución:** 1800×1080 (baja: renderScale 0.5 → 1800×1080; alta: renderScale 1.0 → 3600×2160)

## Resumen

| Posición | Calidad | FPS | p95 (ms) | Draw calls | Mallas activas | Triángulos | msRender |
|---|---|---|---|---|---|---|---|
| Plaza | Baja | 119 | 13.6 | 156 | 78 | 4 671 412 | 5.5 |
| Calle 2 | Baja | 119 | 13.2 | 148 | 75 | 4 669 724 | 5.4 |
| Cenital | Baja | 120 | 13.0 | 156 | 78 | 4 671 412 | 5.3 |
| Plaza | Alta | 89 | 16.0 | 160 | 78 | 4 678 394 | 5.7 |
| Calle 2 | Alta | 70 | 19.0 | 152 | 75 | 4 676 706 | 5.5 |
| Cenital | Alta | 98 | 15.3 | 160 | 78 | 4 671 412 | 5.8 |

## Configuración de calidad

- **Baja:** sombras=no, vegetación=0.2, distancia=80 m, partículas=0.2, renderScale=0.5, antialias=no, occlusionCut=false
- **Alta:** sombras=altas, vegetación=1.0, distancia=400 m, partículas=1.0, renderScale=1.0, antialias=fxaa, occlusionCut=true

## Observaciones

1. **Calidad baja:** 119–120 fps en todas las posiciones. Muy por encima del umbral de 50 fps.
2. **Calidad alta:** 70–98 fps. El cuello es el renderScale 1.0 (3600×2160) que duplica los píxeles a pintar. La calle 2 baja a 70 fps (p95 19 ms) — aún aceptable pero es el punto más bajo.
3. **Draw calls:** 148–160, muy estables entre posiciones y calidades. No hay fuga de draw calls.
4. **Mallas activas:** 75–78, estables. Sin fugas de mallas entre posiciones.
5. **msRender:** 5.3–5.8 ms, estable. La calidad alta no sube msRender significativamente (el costo está en el framebuffer más grande, no en el shader).
6. **msSombras:** 0.7–0.9 ms. Las sombras no son el cuello de botella en la barriada.
7. **Triángulos:** ~4.67M constantes. La diferencia entre baja y alta es mínima (los triángulos activos no cambian con la calidad).

## Conclusión

La barriada rinde bien en Mac M5. En calidad baja, 120 fps constantes. En calidad alta, el punto más bajo es 70 fps en la calle 2, pero sigue por encima del umbral de 50 fps. El problema de rendimiento de Windows (WIN-01) no se reproduce aquí.

## Datos crudos

Ver `work/qa/jl221-barriada-rendimiento-ultima.json`.
