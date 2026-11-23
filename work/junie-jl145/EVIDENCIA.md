# JL-145 — Evidencia

**Prueba:** `tests/jl145_assetClips.test.ts`
**Resultado:** 125/125 pruebas en verde
**Suite completa:** 3715/3715 en verde (326 archivos)
**Typecheck:** limpio (solo errores pre-existentes en balM3.ts ajeno)

## Resumen

La prueba recorre las 40 plantillas GLB de `data/assets.json` y verifica:
1. Cada archivo GLB existe en disco.
2. Los clips declarados en la plantilla están presentes en el GLB (usando `endsWith` para tolerar prefijos).
3. Cada GLB tiene al menos un clip detectable.

Todas las plantillas pasan: los GLB tienen los clips que declaran.
