# JL-229: Zonas hostiles con áreas dentro del mundo

## Resultado

4 pruebas verdes (jl229_hostileZones.test.ts):

1. **Cada zona hostil activa tiene al menos un área** — Las zonas sin `"planned"` tienen áreas.
2. **Las zonas hostiles planificadas sin áreas están documentadas** — 9 zonas (`baru`, `chame`, `boquete`, `cerro_punta`, `darien`, `bocas`, `perlas`, `fortuna`, `ancon`) tienen `"planned"` y `"areas":[]`. Sus monstruos se usan por `extends` en zonas de Herrera.
3. **Todas las áreas de las zonas hostiles caen dentro del mundo** — Límites: x0=-3584, z0=-640, x1=4352, z1=2560. 0 áreas fuera.
4. **Prueba sintética** — Verifica que la lógica de detección funciona.

## Suite completa

4385/4385 pruebas en verde. Typecheck limpio salvo `scripts/balance/balM3.ts` (ajeno).
