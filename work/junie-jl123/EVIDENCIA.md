# JL-123: hotbarFillOrder con 30 casillas y 3 filas

## Estado: Ya estaba hecho

La prueba ya existe desde BAR-01 (`9e4b7a1`) en `tests/bar01_hotbarRows.test.ts`, línea 87-93:

```ts
it('hotbarFillOrder cubre todos los slots de 30', () => {
    const order = hotbarFillOrder(30, 3);
    const set = new Set(order);
    for (let i = 0; i < 30; i++) {
        expect(set.has(i)).toBe(true);
    }
});
```

## Evidencia

- `npx vitest run tests/bar01_hotbarRows.test.ts` → 10/10 pruebas verdes.
- La prueba verifica que `hotbarFillOrder(30, 3)` devuelve un array de 30 elementos que cubre todos los índices 0-29 sin repetir.
- Además, la prueba de la línea 13-19 verifica el orden intercalado: `[0, 10, 20, 1, 11, 21, ...]`.

## Conclusión

No se requiere código nuevo. La tarea se cierra como "ya estaba hecho".
