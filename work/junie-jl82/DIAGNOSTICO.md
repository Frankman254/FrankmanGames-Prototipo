# JL-82: Diagnóstico de `bancoDetalle`

## Resultado

El escenario `bancoDetalle` **ya no da timeout**. Completa con **14/16 checks en verde**.

## Ejecución

```
perl -e 'alarm 120; exec @ARGV' node scripts/qaElectron.mjs bancoDetalle
```

Salida: 14/16 comprobaciones.

## Fallos (2, pre-existentes)

| Check | Estado | Detalle |
|---|---|---|
| C05: el amuleto invoca su mascota | FALLA | `charmUid` devuelve `"ith"` en vez de un uid válido |
| C05: depositar el amuleto retira la mascota | FALLA | Consecuencia del fallo anterior |

Estos 2 fallos son **pre-existentes**: ya fueron identificados por JL-09 (commit `d6d4304`) como fallos del juego que el arnés reveló al resolver el timeout original. No son de esta tarea.

## Causa del timeout original

Ya resuelta por JL-09 (`d6d4304`):
- Tras `saveAndLoad()`, `clickMesh('bank-chest')` no encontraba el cofre porque la cámara no había terminado de encuadrar el interior del banco.
- Arreglo: exponer `menus` en `__game` (main.ts) y abrir el panel directamente con `setBankAccess(true)` + `showBank()`.

## Conclusión

Sin código nuevo necesario. El escenario funciona correctamente; los 2 fallos restantes son conocidos y pre-existentes.
