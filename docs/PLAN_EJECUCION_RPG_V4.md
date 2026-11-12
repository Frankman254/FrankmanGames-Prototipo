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
- **Necesidad:** Rediseñar el equipamiento para RPG V4 con 8 primarias y secundarias nuevas.
- **Archivos:** `data/rpg/items.json`, `data/rpg/sets.json`, `data/rpg/loot.json`, `data/rpg/merchants.json`
- **Dependencias:** TICKET-1 (slowResist reparado), TICKET-3 (generador limpio)
- **Alcance ampliado:**
  - Ocho características primarias: Fuerza, Intelecto, Agilidad, Caudal, Calma, Voluntad, Vitalidad, Espíritu.
  - Nuevas secundarias: Placaje, Huida, Hallazgo, Concentración, Templanza, Poder de curación, Capacidad de carga.
  - Presupuestos por nivel, rareza y ranura (arma, accesorio, set, mascota, montura).
  - Builds monoelementales, bielementales, multielementales, de curación, Placaje, Huida, Hallazgo, control y resistencia.
  - Bonos de conjuntos coherentes con RPG V4 (sin `storm`, `physical`, `wind_dummy`).
  - Protección de crítico, movilidad, daño, vida y economía.
  - Equipamiento obtenible por botín, fabricación y comercio.
  - Objetos de nivel 1–100 primero; estrategia para nivel 101–200 después.
  - Migración de instancias antiguas sin pérdida de bonificaciones.
  - Pruebas A/B de tres clases, equipos y situaciones de combate.
  - Catálogo piloto de 12–20 piezas antes de ampliar.
- **Aceptación:** 12-20 objetos representativos de distintas categorías y franjas de nivel.
- **Riesgo:** Alto. Requiere decisión creativa del creador sobre cifras de balance.
- **Exclusiones:** No elegir cifras definitivas unilateralmente; proponer y comparar.

### TICKET-6: Mejorar QA `editorMazmorra` (P3, QA) ✓ Hecho
- **Error:** El QA llamaba directamente a la API interna.
- **Archivos:** `scripts/qaElectron.mjs`, `tests/editor.test.ts`
- **Dependencias:** TICKET-2
- **Aceptación:** Escenario con F12, pincel, Ctrl+Z, Ctrl+Y, Ctrl+S, persistencia y aislamiento.
- **Riesgo:** Bajo.

## Pendientes fuera de los 6 tickets

- Placaje fuerte que impida realmente separarse caminando.
- Prueba de Templanza en combate y topes de `slowResist`.
- Migración V3→V4 para modificadores `rolled` y `bonus`, banco y respaldos.
- XP real de grupos, multiplicadores y orden de muertes.
- Acción y movilidad equivalentes propios al estilo RPG de DOFUS, adaptados a tiempo real.
- T13, T15, Q14 e interiores de casas E03.
