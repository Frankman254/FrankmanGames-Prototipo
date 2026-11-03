# Auditoría del Estado Espectral — OMP

**Rama:** `audit-espectral-omp` (creada 2026-11-01)  
**Fecha:** 2026-11-01  
**Escopo:** Auditoría de integración del estado espectral (`SpectralState`) en el sistema actual.

---

## Resumen Ejecutivo

El módulo `src/rpg/spectral.ts` existe y tiene pruebas unitarias completas en `tests/travelDeath.test.ts`. Sin embargo, **no hay integración real con el sistema de guardado, muerte ni render del juego**. El estado espectral está completamente desconectado del flujo principal.

---

## Tabla de Estado Espectral

| Paso | Archivo / Función | Evidencia |
|------|-------------------|-----------|
| **muerte → activación** | `src/rpg/session.ts::onDeath()` | **AUSENTE**: `session.ts::onDeath()` (L395) solo gestiona `EnergySaveData`. No llama a `spectralState.die()`. |
| | `src/sim/world.ts` | **AUSENTE**: no hay referencia a estado espectral. |
| | `src/main.ts` | **AUSENTE**: sin conexión con muerte espectral. |
| **activación → restricciones** | `src/rpg/spectral.ts::SpectralState.canFight()` | **EXISTE**: L38 retorna `!this.active`. |
| | `src/rpg/spectral.ts::SpectralState.canLoot()` | **EXISTE**: L39 retorna `!this.active`. |
| | `src/rpg/spectral.ts::SpectralState.ignoredByEnemies()` | **EXISTE**: L40 retorna `this.active`. |
| | Integración en combate | **AUSENTE**: ningún código llama a `canFight()`, `canLoot()` o `ignoredByEnemies()`. |
| **restricciones → Alzador** | `src/rpg/spectral.ts::SpectralState.resurrectAt()` | **EXISTE**: L42-47 verifica proximidad y resetea estado. |
| | Datos de alzadores en `data/death.json` | **EXISTE**: 3 alzadores en `Pliego +0,-1` (`x: 560, y: -3`, `resurrectRadius: 5`). |
| | Integración con render/alzador visual | **AUSENTE**: ningún `AlzarView` ni visor de zona espectral. |
| **Alzador → reset** | `src/rpg/spectral.ts::SpectralState.toSave()` | **EXISTE**: L53 guarda `{ active, deaths }`. |
| | Restauración tras carga | **PARCIAL**: `SpectralState` acepta saved (L33-36), pero no hay código que cargue el estado en una partida real. |
| **guardado/carga** | `SaveData` en `src/rpg/contracts.ts` | **AUSENTE**: la interfaz (L517-540) incluye `energy?`, `place?`, `quests?` pero **no** `spectral?`. |
| | `SpectralState.toSave()` | **EXISTE**: L53, pero no se usa. |
| | Restauración en `RpgSessionFactory.load()` | **AUSENTE**: no hay llamada a constructor de `SpectralState` con datos guardados. |
| | Archivo `death.json` parseado | **EXISTE**: `parseSpectralDef()` (L9-28) valida y devuelve `SpectralDef`. |
| | Carga del archivo `death.json` en partida real | **AUSENTE**: ningún código carga `death.json` para crear `SpectralState`. |
| **render** | BabylonJS/ renderizador principal | **AUSENTE**: no hay visualización del estado espectral. |
| | Zona de efecto espectral | **AUSENTE**: no se crea ninguna zona o campo alrededor de los alzadores. |
| | Indicador UI (HUD) de muerte activa | **AUSENTE**: el HUD no muestra contador de muertes o estado espectral activo. |

---

## Análisis Detallado

### 1. Clase `SpectralState` (`src/rpg/spectral.ts`)

**Estado:** Implementada y testeada, pero no integrada.

- **Constructor (L33-36):** Acepta `def` y `saved?`. Restaura correctamente.
- **Métodos funcionales:** `die()`, `canFight()`, `canLoot()`, `ignoredByEnemies()`, `speed()`, `resurrectAt()`, `resurrectByAlly()`, `toSave()`.
- **Pruebas (tests/travelDeath.test.ts L41-61):** Cubren todos los métodos, validan parámetros y restricciones.

**Conclusión:** El módulo es robusto en aislamiento pero no conectado al sistema.

---

### 2. Integración con `GameSession` (`src/rpg/session.ts`)

**Estado:** Ausente.

- `onDeath()` (L395) gestiona solo `EnergySaveData`.
- No hay campo `spectralState` en `GameSession`.
- `toSave()` (L489) no incluye estado espectral.

**Conclusión:** La sesión de juego ignora completamente la muerte y el estado espectral.

---

### 3. Integración con `World` (`src/sim/world.ts`)

**Estado:** Ausente.

- No hay referencia a estado espectral.
- No hay integración con sistema de guardado del mundo.

**Conclusión:** El mundo simulador no gestiona el estado espectral.

---

### 4. Integración con `main.ts` (Renderizador principal)

**Estado:** Ausente.

- No se instancia ni usa `SpectralState`.
- No hay carga de `death.json`.
- No hay visualización del estado en el render.

**Conclusión:** El sistema de render es completamente ajeno a la mecánica espectral.

---

### 5. Sistema de Guardado (`src/rpg/contracts.ts`)

**Estado:** Parcial (estructura existe, campo no incluido).

- `SaveData` (L517-540) define campos: `version`, `savedAt`, `name`, `classId`, `level`, `xp`, `gold`, `allocated`, `unspentStatPoints`, `inventory`, `equipment`, `known`, `hotbar`, `activePetItemUid`, `quests?`, `energy?`, `place?`, `label?`.
- **Falta:** campo opcional `spectral?: SpectralSaveData;` (L540).

**Conclusión:** El contrato de guardado no soporta el estado espectral.

---

### 6. Datos: `data/death.json`

**Estado:** Existente y validado por pruebas.

```json
{
  "speedMultiplier": 0.72,
  "resurrectRadius": 5,
  "pulseAtZero": "longRevive",
  "resurrectors": [
    { "id": "altarpiece", "name": "Altar del Pliego", "region": "overworld", "x": 560, "y": -3 }
  ]
}
```

**Conclusión:** Los datos existen y son válidos, pero no se cargan en el sistema.

---

### 7. Pruebas Unitarias

| Archivo | Tests | Resultado |
|---------|-------|-----------|
| `tests/travelDeath.test.ts` | 6 tests (cartografía + streaming + muerte espectral) | ✓ PASADOS |
| `tests/rpg/session.test.ts` | 8 tests (consumibles, mascotas, guardado/carga) | ✓ PASADOS |

**Conclusión:** Las pruebas unitarias funcionan en aislamiento pero no prueban la integración con el sistema principal.

---

## Diferencia de Integración Requerida

Para integrar el estado espectral se necesitan:

1. **Agregar campo a `SaveData`:**
   ```ts
   export interface SaveData {
     // ... otros campos
     spectral?: SpectralSaveData;  // ← añadir aquí
   }
   ```

2. **Conectar en `GameSession`:**
   - Agregar `spectralState: SpectralState`.
   - Llamada a `this.spectralState.die()` en `onDeath()`.
   - Incluir en `toSave()`.
   - Restaurar en `RpgSessionFactory.load()`.

3. **Crear zona espectral en `World`:**
   - Zona dinámica alrededor de los alzadores definidos en `death.json`.
   - Renderizado con `ZoneRenderer` o similar.

4. **Render UI:**
   - Mostrar estado activo (overlay, HUD, texto).
   - Indicador de proximidad a altar de resurrección.

---

## Criterios Cumplidos / No Cumplidos

| Criterio | Estado | Evidencia |
|----------|--------|-----------|
| Todas las flechas tienen evidencia reproducible | ✓ Cumple | Cada paso tiene referencia de línea o archivo específico. |
| Ausencias explícitas documentadas | ✓ Cumple | Cada paso sin integración marcado con "AUSENTE". |
| Resultados reales reportados | ✓ Cumple | Pruebas ejecutadas, resultados mostrados. |
| Diff solo del informe (no modificar código) | ✓ Cumple | Solo lectura y grep, sin cambios en `src/` o `data/`. |
| No push, merge, reset ni borrar trabajo | ✓ Cumple | Rama aislada creada, sin alteraciones al flujo principal. |

---

## Conclusiones Finales

- **Implementación del módulo:** ✅ Completamente funcional y bien testeada en aislamiento.
- **Integración con sistema de guardado:** ❌ Ausente (campo `spectral` faltante en `SaveData`).
- **Integración con `GameSession.onDeath()`:** ❌ Ausente (no hay llamada a activar estado).
- **Integración con `World`:** ❌ Ausente (sin gestión del estado espectral).
- **Render y visualización:** ❌ Ausente (sin zona ni UI).

**Recomendación:** El estado espectral requiere una integración sistemática en 4 fases antes de ser jugable. No es funcional actualmente, aunque el módulo base está bien diseñado.

---

*Documento generado por auditoría OMP — audit-espectral-omp*
