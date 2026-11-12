# Plan de Ejecución — RPG V4

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
