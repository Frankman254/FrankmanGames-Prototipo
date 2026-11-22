# JL-127: editorCaliente y editorWorldBuilder — ya resueltos

**Fecha:** 2026-11-21

## Hallazgo

Ambos escenarios ya pasan sin problemas, sin necesidad de cambios de código:

- `editorCaliente`: **11/11** comprobaciones en verde.
- `editorWorldBuilder`: **10/10** comprobaciones en verde.

## Causa original

Los timeouts que causaron JL-127 fueron resueltos por arreglos anteriores del arnés:
- JL-126 (`6ebd87e`) corrigió el flujo de `.name-input` en los escenarios del editor.
- JL-50/51 mejoraron el reset de idioma y los timeouts por escenario.
- JL-78 vaciaba las ranuras de guardado entre escenarios.

## Validación

```
$ perl -e 'alarm 120; exec @ARGV' node scripts/qaElectron.mjs editorCaliente
11/11 comprobaciones. Capturas en work/qa/

$ perl -e 'alarm 180; exec @ARGV' node scripts/qaElectron.mjs editorWorldBuilder
10/10 comprobaciones. Capturas en work/qa/
```

Sin cambios de código necesarios.
