# JL-129: Escenario `diablica` — ya resuelto

**Fecha:** 2026-11-21  
**Tarea:** JL-129 `diablica`: tiempo agotado a los 120 s.

## Diagnóstico

El escenario `diablica` en `scripts/qaElectron.mjs` (línea 3902) equipa las 8 piezas del set `diablica_espeja` en las 3 clases × 2 sexos y verifica que los 8 meshes `obj_diablica_espeja_*` aparecen en la escena.

**Resultado:** 7/7 comprobaciones en verde, sin timeout, en 3 ejecuciones consecutivas.

## Causa del timeout original

El timeout de 120 s que reportaba JL-129 ya fue resuelto por cambios anteriores:
- **JL-78** (`7851a82`): `newGame()` vacía las 12 ranuras de guardado entre escenarios, evitando que `diablica` fallara por ranuras llenas.
- **JL-51** (`commit JL-51`): timeouts propios por escenario y relanzar Electron tras timeout, evitando caídas en cadena.
- **JL-50** (`commit JL-50`): arnés QA resetea idioma y busca botón por data-testid.

## Evidencia

```
== diablica
OK    EQ-10: las 8 piezas se ven puestas (ember_vanguard, masculino)
OK    EQ-10: las 8 piezas se ven puestas (ember_vanguard, femenino)
OK    EQ-10: las 8 piezas se ven puestas (storm_weaver, masculino)
OK    EQ-10: las 8 piezas se ven puestas (storm_weaver, femenino)
OK    EQ-10: las 8 piezas se ven puestas (mangrove_hunter, masculino)
OK    EQ-10: las 8 piezas se ven puestas (mangrove_hunter, femenino)
OK    Sin errores en la consola
7/7 comprobaciones. Capturas en work/qa/
```

3 ejecuciones consecutivas: todas 7/7, sin timeout.

## Conclusión

Sin código que cambiar. El escenario ya es robusto gracias a las mejoras del arnés en JL-50, JL-51 y JL-78.
