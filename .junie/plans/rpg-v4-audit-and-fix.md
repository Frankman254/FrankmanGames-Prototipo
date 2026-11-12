---
sessionId: session-261111-211327-11j0
---

# Hallazgos de Auditoría

## Errores Confirmados

### 1. Bug crítico: `calm → slowResist` siempre da cero
- **Archivo:** `data/rpg/progression.json` (línea 64-68)
- **Causa:** La regla derivada usa `op: "percent"` con `per: 0.3`. En `StatSheet.get()`, la fórmula es `flat * (1 + pct/100)`. Como `slowResist` no tiene fuentes `flat` sin equipo, `flat=0`, el resultado es siempre `0 * (1 + algo) = 0`.
- **Impacto:** La estadística de Calma (Templanza) no funciona nunca. Invertir puntos en Calma no reduce la duración de controles.
- **Solución:** Cambiar `op` de `"percent"` a `"flat"` en la regla derivada.

### 2. Editor de mazmorra: Ctrl+Z usa el historial del exterior
- **Archivo:** `src/ui/editor/index.ts` (líneas 583, 628)
- **Causa:** Al pintar en un piso, se llama `doc.begin()` y `doc.commit()` sobre el `EditorDoc` del mundo exterior. El `DungeonEditorDoc` no tiene historial propio.
- **Impacto:** Ctrl+Z mientras editas un piso deshace cambios del mundo exterior, no del piso actual.

### 3. Editor de mazmorra: objetos no editables
- **Archivo:** `src/editor/dungeonDoc.ts` (línea 45-58)
- `objects()` expone puertas, cofres, jarras solo para visualización. No hay método para modificar posiciones.

### 4. Generador T05: IDs obsoletos
- **Archivo:** `scripts/t05/generateGearMatrix.mjs` (líneas 74, 139-161, 178-180, 199, 211, 223)
- Referencias a `physical`, `storm`, `wind_dummy` incompatibles con RPG V4.
- Los datos actuales (`data/rpg/*.json`) no contienen estos IDs (verificado), pero el generador producirá datos inválidos si se ejecuta.

### 5. QA `editorMazmorra`: no prueba el recorrido real
- **Archivo:** `scripts/qaElectron.mjs` (línea 2472-2475)
- Llama directamente a la API interna en lugar de abrir el editor con F12, pintar y guardar.

### 6. `castStability` sin uso funcional
- Definido en contratos y derivado de `will`, pero no se consulta en ningún efecto de combate. Pendiente de implementación futura.

# Plan de Ejecución

## Tickets Priorizados

### TICKET-1: Reparar `calm → slowResist` (P0, defecto crítico)
- **Error:** La regla derivada usa `op: "percent"` sobre base cero, dando siempre 0.
- **Archivos:** `data/rpg/progression.json`, `tests/rpg/stats.test.ts`
- **Dependencias:** Ninguna
- **Pruebas:** Test que verifique que con 30 de Calma, `slowResist` sea ~9 (no 0)
- **Aceptación:** `npm test` en verde; `slowResist` > 0 con Calma > 0 sin equipo
- **Exclusiones:** No cambiar topes de `slowResistCap` ni fórmulas de `hinder.ts`
- **Riesgo:** Bajo. Cambio de un campo JSON.
- **Compatibilidad:** Los guardados V3→V4 no se ven afectados.

### TICKET-2: Aislar undo/redo del editor de mazmorra (P1, integridad)
- **Error:** Ctrl+Z en un piso usa el historial del mundo exterior.
- **Archivos:** `src/editor/dungeonDoc.ts`, `src/ui/editor/index.ts`
- **Dependencias:** Independiente de TICKET-1
- **Pruebas:** Escenario Electron: pintar en piso, Ctrl+Z, verificar que se deshace el pintado
- **Aceptación:** Ctrl+Z en mazmorra deshace solo cambios del piso activo
- **Riesgo:** Medio. Cambia el flujo de `begin`/`commit` en el editor.

### TICKET-3: Limpiar IDs obsoletos del generador T05 (P1, prevención)
- **Error:** `generateGearMatrix.mjs` usa `physical`, `storm`, `wind_dummy`.
- **Archivos:** `scripts/t05/generateGearMatrix.mjs`
- **Dependencias:** Ninguna
- **Aceptación:** El generador no produce IDs no canónicos
- **Exclusiones:** No regenerar `data/rpg/items.json`
- **Riesgo:** Bajo. Solo afecta al script.

### TICKET-4: Proteger guardar+aplicar del editor (P2, integridad)
- **Error:** Guardar y aplicar son operaciones separadas; un fallo deja datos inconsistentes.
- **Archivos:** `src/ui/editor/index.ts`, `src/editor/hotApply.ts`
- **Dependencias:** TICKET-2
- **Riesgo:** Medio.

### TICKET-5: Rework de equipamiento — diseño de presupuesto de poder (P2, diseño)
- **Necesidad:** Definir presupuesto de poder por nivel, rareza, ranura.
- **Archivos:** `data/rpg/items.json`, `data/rpg/sets.json`, `data/rpg/loot.json`
- **Dependencias:** TICKET-1
- **Aceptación:** 12-20 objetos representativos
- **Riesgo:** Alto. Requiere decisión creativa del creador.

### TICKET-6: Mejorar QA `editorMazmorra` (P3, QA)
- **Error:** El QA llama directamente a la API interna.
- **Archivos:** `scripts/qaElectron.mjs`
- **Dependencias:** TICKET-2
- **Riesgo:** Bajo.

# Diseño Técnico — TICKET-1

### Contexto Actual

La regla derivada en `data/rpg/progression.json` (línea 64-68):
```json
{ "from": "calm", "to": "slowResist", "op": "percent", "per": 0.3 }
```

En `src/rpg/stats.ts`, `StatSheet.entries()` emite el modificador derivado con `op: r.op` ("percent"). En `StatSheet.get()`, la fórmula es `flat * (1 + pct / 100)`. Con `flat=0` (sin equipo), el resultado es siempre 0.

### Cambio Propuesto

Cambiar `op` de `"percent"` a `"flat"` en `data/rpg/progression.json`:
```json
{ "from": "calm", "to": "slowResist", "op": "flat", "per": 0.3 }
```

Con esto, 30 puntos de Calma dan `30 * 0.3 = 9` de `slowResist` plano. El tope es `slowResistCap: 60`, por lo que se necesitarían 200 puntos de Calma para llegar al tope.

### Prueba

Añadir un test en `tests/rpg/stats.test.ts` que cargue las reglas derivadas del contenido y verifique que `slowResist` > 0 con Calma > 0 sin equipo.

### Validación
- `npm test` en verde
- `npm run typecheck` sin errores
- El test existente `combateTactico.test.ts` sigue pasando

# Delivery Steps

### ✓ Step 1: Crear plan de ejecución y reparar calm→slowResist
### ✓ Step 2: Aislar undo/redo del editor de mazmorra (TICKET-2)
Crear `docs/PLAN_EJECUCION_RPG_V4.md` con los 6 tickets priorizados y ejecutar el TICKET-1 (reparar la regla derivada `calm → slowResist`).

- Crear `docs/PLAN_EJECUCION_RPG_V4.md` con los tickets TICKET-1 a TICKET-6, prioridades, dependencias y criterios de aceptación.
- Cambiar `op` de `"percent"` a `"flat"` en la regla derivada `calm → slowResist` de `data/rpg/progression.json`.
- Añadir un test en `tests/rpg/stats.test.ts` que verifique que `slowResist` > 0 con Calma > 0 sin equipo.
- Ejecutar `npm test` y `npm run typecheck` para validar.
- Registrar el resultado y actualizar `docs/ESTADO_ACTUAL.md` y `docs/TAREAS.md`.