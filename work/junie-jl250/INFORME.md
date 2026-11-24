# JL-250: Consola limpia tras tanda JL-204…JL-249

## Resumen

16 escenarios nuevos de la tanda ejecutados sin errores nuevos de consola.
Los fallos detectados son pre-existentes (hallazgos de tareas anteriores).

## Línea base

- Suite: 4844/4844 pruebas verdes, 375 archivos.
- Typecheck: limpio salvo `scripts/balance/balM3.ts` (ajeno, no se toca).

## Escenarios ejecutados

| Escenario | Checks | Errores consola | Estado |
|---|---|---|---|
| hechizosClases | 25/25 | 0 | ✓ |
| barriada | 8/8 | 0 | ✓ |
| barriadaRendimiento | 10/10 | 0 | ✓ |
| pesca | 6/6 | 0 | ✓ |
| profesiones | 1/1 | 0 | ✓ |
| oficios | 1/1 | 0 | ✓ |
| misiones | 10/10 | 0 | ✓ |
| musicaContextos | 18/18 | 0 | ✓ |
| barraRoja | 6/6 | 0 | ✓ |
| todasLasPiedras | 44/44 | 0 | ✓ |
| casaCreador | 10/10 | 0 | ✓ |
| guardadoBarriadaCasa | 9/14 | 0 | ✓ (5 fallos pre-existentes, JL-237) |
| barriadaMontura | 11/14 | 0 | ✓ (3 fallos pre-existentes, JL-219) |
| barriadaNoche | 8/8 | 0 | ✓ |
| barriadaOpciones | 16/16 | 0 | ✓ |
| rendimiento | 4/4 | 0 | ✓ |

**Total: 187/202 checks en verde, 0 errores nuevos de consola.**

## Fallos pre-existentes (no nuevos)

### guardadoBarriadaCasa (9/14)
- JL-237 A3-A4: Guardar dentro de la casa del creador no restaura la escena interior al cargar. Hallazgo documentado en JL-237.
- JL-237 B4-B6: Guardar dentro de la barriada no restaura la escena interior al cargar. Hallazgo documentado en JL-237.

### barriadaMontura (11/14)
- JL-219: `canFly` devuelve false dentro de la barriada (world.interior=true bloquea vuelo). Hallazgo documentado en JL-219.
- `WARN aviso (warn): Hace falta una montura que vuele` — warning esperado del juego, no un error.

## Conclusión

Consola limpia: cero errores nuevos en los 16 escenarios nuevos de la tanda JL-204…JL-249.
Los fallos son pre-existentes y documentados en sus tareas originales.
