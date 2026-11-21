# JL-64: Bloqueo — Rework de los pisos a mano de la cripta

**Fecha:** 2026-11-21
**Agente:** Junie
**Estado:** BLOQUEADA

## Motivo

Cualquier cambio en la geometría de los 5 pisos manuales de `data/dungeons/cripta-tulivieja.json` rompe las pruebas de antorchas:

- `tests/j16_torches.test.ts` — valida que las normales de las antorchas apunten a baldosas caminables
- `tests/tor01_regression.test.ts` — auditoría de regresión de antorchas en 100 pisos
- `tests/tor01_audit.test.ts` — auditoría de antorchas en pisos 1-100

## Evidencia

Con los pisos originales (HEAD):
```
tests/j16_torches.test.ts: 11/11 ✓
tests/tor01_regression.test.ts: 5/5 ✓
tests/tor01_audit.test.ts: ✓
```

Con cualquier rediseño de la geometría (columnas, nichos, paredes internas):
```
tests/j16_torches.test.ts: fallos en normales de antorchas
tests/tor01_regression.test.ts: "Piso 1: normal (-1,0) desde (13,10) apunta a roca en (12,10)"
tests/tor01_audit.test.ts: mismas fallos de normales
```

## Causa raíz

El generador de antorchas en `src/world/dungeon.ts` (`generateHandFloor`) coloca antorchas automáticamente en las caras de muro que separan roca y suelo caminable. Las pruebas validan que cada antorcha apunte a baldosa caminable. Al cambiar la geometría, las nuevas paredes internas generan antorchas cuyas normales apuntan a roca.

## Qué se necesita para desbloquear

1. **Opción A (recomendada):** Coordinar con OMP para que el generador de antorchas sea más robusto ante geometrías complejas, o permitir antorchas manuales en los pisos diseñados.
2. **Opción B:** Modificar `generateHandFloor` para que los pisos manuales puedan declarar sus propias antorchas en lugar de generarlas automáticamente.
3. **Opción C:** El coordinador autoriza cambiar el generador de antorchas como parte de esta tarea.

## Intentos realizados

Se intentaron múltiples diseños conservadores (columnas aisladas, nichos, formas irregulares) pero todos rompían las pruebas de antorchas de la misma manera.
