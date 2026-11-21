# JL-84: Escenario `casa` — timeout ya resuelto

**Fecha:** 2026-11-21
**Resultado:** 5/5 comprobaciones en verde, sin timeout.

## Ejecución

```
perl -e 'alarm 600; exec @ARGV' node scripts/qaElectron.mjs casa
```

```
== casa
OK    Casa: cada casa tiene su puerta → 18
OK    Casa: un clic en la puerta lleva dentro al llegar → {"scene":"overworld","dungeon":null,"floor":null,"x":110,"y":141.4,"stone":"raspadura","knownStones":["raspadura"],"timeOfDay":0.3624,"playSeconds":3,"name":"Villa Raspadura"}
OK    Casa: los muebles no se atraviesan
OK    Casa: al salir aparece delante de su puerta → {"x":110,"y":141.4,"back":{"x":110,"y":141.4}}
OK    Sin errores en la consola

5/5 comprobaciones. Capturas en work/qa/
```

## Causa del timeout original

El timeout de `casa` ya fue resuelto por arreglos anteriores del arnés:
- **JL-09** (d6d4304): timeouts por escenario y mejoras en bancoDetalle/botin/audio/casa.
- **JL-51** (commit JL-51): timeouts propios por escenario y relanzar Electron tras timeout.
- **JL-78** (commit JL-78): newGame() vacía las ranuras de guardado entre escenarios.

No se requieren cambios de código.
