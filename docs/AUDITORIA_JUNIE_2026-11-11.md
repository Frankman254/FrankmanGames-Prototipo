# Auditoría Independiente — Junie (2026-11-11)

**Rama:** `fix/rpg-v4-junie`
**Base:** `a75bf9d`
**Commits auditados:** 6 (2b855c5, 9a11297, ba2a9cf, 7a4f7b1, 2322bc0, 1b20f02)

## Validación ejecutada

| Comprobación | Resultado |
|---|---|
| `npm test` (137 archivos) | 1176/1176 ✓ |
| `npm run typecheck` (3 configs) | 0 errores ✓ |
| `npm run build` | Éxito ✓ |
| `npm run docs:check` | 52 MD, enlaces correctos ✓ |
| `node scripts/t05/generateGearMatrix.mjs` | 0 huecos, 0 errores ✓ |
| `npm run qa:electron -- editorMazmorra` | No ejecutado (sin pantalla) |
| `npm run qa:electron -- editorCaliente` | No ejecutado (sin pantalla) |

---

## TICKET-1: `calm → slowResist` (2b855c5)

### Verificación
- `data/rpg/progression.json` línea 66: `"op": "flat"` (cambiado de `"percent"`). ✓
- `tests/rpg/stats.test.ts`: 2 tests — uno con `flat` (slowResist=9), otro con `percent` (slowResist=0, demo del bug). ✓

### Hallazgos
- **P2:** Los tests pasan las reglas derivadas directamente al constructor `StatSheet`, no cargan desde `progression.json`. Si alguien modifica el JSON sin actualizar los tests, no hay detección automática. Riesgo bajo: el JSON es pequeño y los tests cubren la lógica.

### Veredicto
**APROBADO.** La corrección es correcta y mínima.

---

## TICKET-2: Undo/Redo aislado (9a11297)

### Verificación
- `src/editor/dungeonDoc.ts`: `DungeonEditorDoc` tiene `private readonly history = new History()` (línea 18). Independiente de `EditorDoc`. ✓
- `src/ui/editor/index.ts`: `undo()`/`redo()` enrutan a `dungeonDoc` cuando hay un piso activo. ✓
- `tests/editor.test.ts`: 3 tests — undo/redo aislado, restauración de navegación, historiales independientes. ✓
- Test de aislamiento mejorado (TICKET-6): compara `floor1Blocked < floor2Blocked` en lugar de la tautología anterior. ✓

### Hallazgos
- **Ninguno significativo.** La implementación es limpia y correcta.

### Veredicto
**APROBADO.**

---

## TICKET-3: Generador T05 (ba2a9cf)

### Verificación
- `scripts/t05/generateGearMatrix.mjs`: búsqueda de `physical`, `storm`, `wind_dummy` → 0 coincidencias. ✓
- `ELEMENT_HEAVY`: todos los valores son canónicos (fire, earth, lightning, water, frost, air). ✓
- `GEAR_PRIMARY`: incluye `calm` (head), `will` (back), `flow` (amulet). ✓
- Resistencias: `resist.lightning` reemplaza a `resist.storm`/`resist.physical`. ✓
- `tests/rpg/gearMatrix.test.ts`: 3 tests de regresión (IDs obsoletos, elementos canónicos, primarias canónicas). ✓
- `tests/rpg/generateGearMatrix.test.ts`: 6 tests nuevos (patrones obsoletos, ELEMENT_HEAVY, GEAR_PRIMARY, curvas, sets, bonos). ✓

### Hallazgos
- **P2:** Los tests leen el script como texto y usan regex. Nunca ejecutan la función de generación real. El test "genera una pieza nueva válida con hueco forzado" (línea 62-97 de generateGearMatrix.test.ts) verifica fórmulas manualmente en lugar de llamar al generador. Esto se debe a que el script es un CLI sin exports, no un módulo importable. Para una prueba real se necesitaría refactorizar el script o crear un fixture con huecos artificiales.
- **P2:** El test de "primarias canónicas" en gearMatrix.test.ts (línea 109-132) tiene un falso positivo potencial: `critBonus` aparece en las piezas existentes (woodcutter_axe) pero no está en `VALID_SECONDARY` del test generateGearMatrix.test.ts. Sin embargo, el test de gearMatrix.test.ts usa una lista diferente y más amplia. Los tests pasan porque cada uno valida un aspecto distinto.

### Veredicto
**APROBADO CON PENDIENTES.** El código del generador es correcto. Los tests podrían ser más robustos ejecutando la generación real.

---

## TICKET-4: Guardado del editor (2322bc0) — CRÍTICO

### Verificación del cambio
- `src/ui/editor/index.ts` (exterior, línea 454-458): `doc.markSaved()` se ejecuta DESPUÉS de `host.apply()`. Si `apply()` lanza, `markSaved()` no se llama. ✓
- Mensajes de error mejorados para ambos caminos (dungeon y overworld). ✓

### Análisis de escenarios de fallo

#### A. Escritura al disco falla
- **Extensor:** `fetch()` devuelve error → catch block → `markSaved()` NO se llama. Documento conserva estado dirty. ✓
- **Mazmorra:** `fetch()` devuelve error → catch block → mensaje de error. ✓

#### B. Escritura al disco OK, `host.apply()` lanza
- **Exterior:** `doc.applied` se actualiza (línea 455) ANTES de `host.apply()`. Si `apply()` lanza, `doc.applied` ya cambió pero `markSaved()` no se llamó. El siguiente guardado reintentará con los datos modificados. ✓ Recuperable.
- **Mazmorra:** `dungeon.apply()` (línea 424) puede lanzar. Si falla, `dungeonDoc` no se recrea. El estado dirty persiste. ✓ Recuperable.

#### C. `host.apply()` modifica parcialmente y luego falla
- **hotApply.ts:** Cada sección (terrain, vegetation, navpaint, zones, RPG content) se aplica de forma independiente. Si una sección falla, las anteriores ya se aplicaron. No hay rollback.
- **Hallazgo P1:** `hotApply.ts` no ofrece transacción atómica. Si `applyStones()` falla después de que `parseTerrain()` ya modificó `ow.def`, el mundo queda en un estado inconsistente. Sin embargo, `hotApply.ts` no lanza excepciones en la mayoría de caminos — atrapa errores de parse internamente (línea 94-96). El riesgo real es bajo pero no nulo.

#### D. Carga asíncrona de GLB falla
- **No aplicable:** `hotApply.ts` no carga GLB. La carga de modelos es independiente del guardado del editor.

#### E. Dos guardados consecutivos se solapan
- **Hallazgo P2:** No hay mecanismo de bloqueo. Si el usuario presiona Ctrl+S dos veces rápidamente, dos `fetch()` concurrentes pueden escribir archivos de forma entrelazada. El endpoint usa escritura atómica (temp + rename) por archivo, pero no hay coordinación entre peticiones.

### Hallazgo P1 — Mensaje de error engañoso (mazmorra)
- **Archivo:** `src/ui/editor/index.ts`, línea 428-429
- **Problema:** El catch block dice `"El piso se escribió en disco pero no se aplicó al mundo"` para TODOS los errores del try block. Sin embargo, el try block incluye el `fetch()` (línea 420). Si `fetch()` falla (escritura al disco falló), el mensaje es incorrecto: el piso NO se escribió en disco.
- **Reproducción:** Simular un fallo de red o disco en el endpoint `EDITOR_SAVE_ROUTE`. El mensaje dirá "se escribió en disco" cuando en realidad no se escribió.
- **Corrección mínima:** Separar el catch en dos caminos: uno para el fetch (antes de escribir) y otro para apply (después de escribir).

### Hallazgo P2 — `doc.applied` se modifica antes de `host.apply()`
- **Archivo:** `src/ui/editor/index.ts`, línea 455
- **Problema:** `doc.applied[f] = text` se ejecuta antes de `host.apply()`. Si `apply()` falla, `doc.applied` ya refleja los nuevos datos. El siguiente guardado usará estos datos como `before`, lo que podría perder el contexto del diff.
- **Impacto:** Bajo. El siguiente guardado reintentará con los datos correctos, pero el diff podría ser incorrecto.
- **Corrección mínima:** Mover la actualización de `doc.applied` después de `host.apply()` exitoso, o restaurarla en el catch.

### Veredicto
**APROBADO CON PENDIENTES.** La mejora de mover `markSaved()` después de `apply()` es correcta y reduce el riesgo. Sin embargo, no hay transacción atómica real: `hotApply.ts` aplica secciones de forma independiente sin rollback, y el mensaje de error de mazmorra es engañoso si el fetch falla.

---

## TICKET-6: QA del editor (7a4f7b1)

### Verificación
- `scripts/qaElectron.mjs`: escenario `editorMazmorra` reescrito con interacciones CDP reales. ✓
- F12 para abrir, botón "Pintar", mousedown/drag/mouseup, Ctrl+Z, Ctrl+Y, Ctrl+S, cerrar/reabrir F12. ✓
- Verifica: pintado bloquea casillas, undo reduce, redo restaura, archivo en disco, persistencia tras reabrir, navPaint exterior intacto, jugador sin cambios. ✓
- `tests/editor.test.ts`: aserción tautológica reemplazada por comparación real floor1 vs floor2. ✓

### Hallazgos
- **P2:** El escenario no prueba cambiar de piso y volver (punto 7 del plan). No prueba persistencia tras reiniciar el juego completamente (punto 8). No prueba la advertencia de cambios sin guardar al cerrar.
- **P2:** El pintado con ratón usa coordenadas del centro del canvas + 50px. Si el canvas no está visible o tiene un tamaño diferente, el pintado podría no afectar casillas válidas. El test verifica `painted > 0` pero no el contenido específico.
- **P2:** El escenario no se pudo ejecutar en este entorno (sin pantalla). Se recomienda ejecutarlo manualmente antes de fusionar.

### Veredicto
**APROBADO CON PENDIENTES.** Las interacciones CDP reales son una mejora significativa respecto a las llamadas directas a `apply()`. Faltan algunos escenarios del plan original.

---

## TICKET-5: Plan ampliado (1b20f02)

### Verificación
- `docs/PLAN_EJECUCION_RPG_V4.md`: TICKET-5 ampliado con alcance completo (8 primarias, secundarias, presupuestos, builds, migración). ✓
- Pendientes fuera de los 6 tickets registrados. ✓

### Veredicto
**APROBADO.** Documento de planificación, no código ejecutable.

---

## Resumen de hallazgos

| Prioridad | Ticket | Descripción | Archivo | Línea |
|---|---|---|---|---|
| **P1** | TICKET-4 | Mensaje de error engañoso en mazmorra: dice "se escribió en disco" incluso si `fetch()` falla | `src/ui/editor/index.ts` | 428-429 |
| **P2** | TICKET-4 | `doc.applied` se actualiza antes de `host.apply()`; si falla, el diff puede ser incorrecto | `src/ui/editor/index.ts` | 455 |
| **P2** | TICKET-4 | No hay bloqueo contra guardados simultáneos (Ctrl+S doble) | `src/ui/editor/index.ts` | 410-464 |
| **P2** | TICKET-3 | Los tests del generador analizan texto con regex, no ejecutan la generación real | `tests/rpg/generateGearMatrix.test.ts` | 62-97 |
| **P2** | TICKET-6 | El QA no prueba cambio de piso, reinicio completo ni advertencia de cambios sin guardar | `scripts/qaElectron.mjs` | 2460-2539 |
| **P2** | TICKET-1 | Los tests pasan reglas al constructor, no cargan desde `progression.json` | `tests/rpg/stats.test.ts` | 51-64 |

## Veredicto general

**APROBADO CON PENDIENTES**

Los 6 commits son correctos en su propósito principal. No hay errores P0 (pérdida o corrupción de datos). Hay un hallazgo P1 (mensaje de error engañoso) y varios P2 (pruebas insuficientes, falta de bloqueo concurrente) que no bloquean la fusión pero deberían corregirse antes de TICKET-5.

### Recomendación

1. Corregir el mensaje de error de mazmorra (P1) — cambio de 2 líneas.
2. Ejecutar los escenarios Electron manualmente antes de fusionar.
3. Proceder con TICKET-5 (rework de equipamiento) tras fusión de esta rama.

### No ejecutado

- `npm run qa:electron -- editorMazmorra`: requiere pantalla/Electron, no disponible en este entorno.
- `npm run qa:electron -- editorCaliente`: mismo motivo.
- Pruebas de fallo inyectado en `hotApply.ts`: requerirían modificar el código para inyectar errores, fuera del alcance de una auditoría de solo lectura.
