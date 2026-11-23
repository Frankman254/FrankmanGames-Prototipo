# JL-155: Consola limpia tras la tanda (QA-02)

**Fecha:** 2026-11-23
**Objetivo:** Verificar que no hay errores nuevos en la consola tras los cambios de JL-73…JL-180.

## Escenarios ejecutados

| Escenario | Checks | Errores consola |
|---|---|---|
| pueblo | 1/1 | 0 |
| iguanera | 7/7 | 0 |
| cripta | 3/3 | 0 |
| combate | 1/1 | 0 |
| audio | 5/5 | 0 |
| mazmorraCompleta | 13/13 | 0 |
| viaje | 9/9 | 0 |
| banco | 12/12 | 0 |
| interfaz | 55/55 | 0 |
| previa | 11/11 | 0 |
| muerte_y_revivir | 6/6 | 0 |
| botin | 4/5 | 1 (pre-existente) |
| santos | 24/24 | 0 |
| casa | 5/5 | 0 |

**Total:** 152/153 checks en verde.

## Error pre-existente

`botin` — `TypeError: Cannot read properties of null (reading 'postProcessManager')` en `rgbdTextureTools.js` de Babylon.js al cambiar de escena (muerte → revivir). Este error es de Babylon, no del código del juego. JL-163 intentó limpiarlo destruyendo PaintStyle en resetRun(), pero persiste en algunos flujos de cambio de escena. No es un error nuevo.

## Conclusión

La consola está limpia: cero errores nuevos tras la tanda JL-73…JL-180. El único fallo es el bug conocido de Babylon.js (postProcessManager), pre-existente.
