# JL-126: Escenarios del editor — diagnóstico

**Fecha:** 2026-11-21
**Resultado:** Ya estaba hecho. Los 5 escenarios pasan sin agotar el timeout en `.name-input`.

## Contexto

JL-126 reportaba que `editorMazmorra`, `editor_play`, `casco_capa`, `emotes` y `curas_dialogo` se agotaban esperando `.name-input` en el arnés de QA, presumiblemente por un cambio en el flujo de partida nueva.

## Verificación

Se ejecutó cada escenario individualmente con `perl -e 'alarm 120; exec @ARGV' node scripts/qaElectron.mjs <escenario>`:

| Escenario | Comprobaciones | Estado |
|-----------|---------------|--------|
| `editorMazmorra` | 11/12 | ✓ (1 fallo pre-existente: Babylon postProcessManager, JL-137) |
| `editor_play` | 4/5 | ✓ (1 fallo pre-existente: Babylon postProcessManager, JL-137) |
| `casco_capa` | 3/3 | ✓ |
| `emotes` | 4/4 | ✓ |
| `curas_dialogo` | 5/5 | ✓ |

## Conclusión

Ningún escenario se agota esperando `.name-input`. El problema fue resuelto por arreglos anteriores del arnés en esta tanda (JL-124 robusteció `audio`, JL-125 arregló `banco`, y los escenarios compartían la misma función `newGame()` que ya funciona correctamente).

Los únicos fallos son el error de Babylon `postProcessManager` (JL-137), pre-existente y no relacionado con JL-126.

## No se requiere código

No se modifican archivos. La tarea se marca `[x]` como "ya estaba hecho".
