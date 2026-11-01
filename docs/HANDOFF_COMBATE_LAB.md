# HANDOFF — Laboratorio de combate

## Estado

Se añadió un núcleo experimental y aislado, sin conectarlo todavía al combate de producción. Esto permite comparar ideas sin decidir por el creador ni alterar partidas guardadas.

## Qué se puede probar

- Ocho geometrías puras en `src/sim/labShapes.ts`: anillo, onda, explosión demorada, zigzag, espiral, vínculo entre dos puntos, zona creciente y sectores rotatorios.
- Rebotes encadenados con selección determinista y sin repetir objetivos.
- Campos temporales con pulsos y seguimiento ordenado de entradas/salidas.
- Ocho reacciones entre los elementos actuales, con etiqueta corta y efecto semántico.
- Sistema A, **Cadencia**: reserva para básicos y acciones fuertes, con regeneración.
- Sistema B, **Ímpetu**: caminar es gratis; desplazamientos tácticos consumen reserva.
- Sistema C, **Posicionamiento**: bonificaciones por flanco, alineación y separación, sin barra nueva.

Todos los números son `PROPUESTA`. Los valores comparables viven en `DEFAULT_LAB_RULES` y pueden moverse a datos cuando el experimento se conecte a una sala de prueba.

## Cómo verificar

```text
npx vitest run tests/combatLab.test.ts
npm run typecheck
```

## Pendiente para una siguiente iteración

- Conectar un selector de A/B/C a las opciones de desarrollo y mostrar indicadores sólo si cada sistema está activo.
- Integrar campos y reacciones en `World` y en el render, preservando autoridad del servidor.
- Asignar las nuevas geometrías a hechizos después de validar legibilidad visual.
- Crear la sala de prueba, telemetría y el informe comparativo con los bots de equilibrio.

## Preguntas para el creador

1. ¿Cadencia debe sentirse como una reserva corta que obliga a alternar básicos/hechizos o como cargas discretas?
2. ¿Ímpetu se comparte entre todos los desplazamientos o cada clase debe recuperar de forma distinta?
3. ¿Las tres bonificaciones de Posicionamiento pueden acumularse, como en el prototipo puro, o sólo debe valer la mayor?
4. ¿Qué reacciones resultan fáciles de leer sin convertir el combate en texto flotante constante?
