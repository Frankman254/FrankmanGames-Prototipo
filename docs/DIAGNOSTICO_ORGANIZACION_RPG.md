# Diagnóstico de Organización — Módulos RPG del Prototipo

**Fecha**: 2026-11-02  
**Escopo**: `src/rpg/`, `src/sim/`, `src/world/`  
**Principio**: Clean-room (implementación propia, sin copiar de referentes)

---

## 1. Resumen Ejecutivo

El código del prototipo es **modular y bien estructurado** con separación clara entre:
- **Definiciones** (datos en `data/rpg/*.json`)
- **Lógica pura** (funciones testables en `src/sim/` y `src/rpg/`)
- **Contratos** (interfaz en `src/rpg/contracts.ts`)

Sin embargo, se han identificado **tres áreas de mejora**:

### Prioridad Alta
1. **Duplicidad entre lógica RPG y simulación** (`src/sim/world.ts` vs `src/rpg/session.ts`)
2. **Dependencia invertida** (`src/rpg/items.ts` usado por múltiples módulos sin contratos intermedios)
3. **Contratos incompletos** entre simulación y sesión

### Prioridad Media
4. **Módulos de utilidad dispersos** (tiradas, mapeo de slots, validación)
5. **Eventos de sesión duplicados** (`src/rpg/session.ts` vs `src/sim/events.ts`)

### Observaciones Positivas
- ✅ Jerarquía clara: `Entity` → `Actor` → `Character/Enemy/Pet`
- ✅ Lógica pura en `src/sim/`, sin dependencias del DOM o render
- ✅ Contratos centralizados en `src/rpg/contracts.ts`
- ✅ Parsing validado y con cruces de referencias en `src/rpg/content.ts`

---

## 2. Duplicidad Detectada

### 2.1 Lógica de Estado vs Simulación

**Problema**: Existen dos capas que manejan entidades similares pero no comparten estado.

| Módulo | Responsable | Dependencias Clave |
|--------|-------------|---------------------|
| `src/sim/world.ts` | Mundo simulado (posición, enemigos, zonas) | `NavGrid`, `Pathfinder`, efectos |
| `src/rpg/session.ts` | Sesión de juego (diálogos, misiones, botín) | `Character`, `Inventory`, `Spellbook` |

**Análisis**:  
- `World` es **puro simulación**: se encarga de movimiento, combate, zonas. No conoce diálogos ni misiones.
- `GameSession` es **puro negocio**: coordina UI, persistencia, eventos. Usa `World` como dependiente.
- **Sin duplicidad funcional**, pero existe una **brecha de información**: la sesión no tiene acceso directo al estado del mundo (excepto por el contrato `SessionWorld`).

**Veredicto**: ✅ Correcta separación. Mantener.

---

### 2.2 Lógica de Items

**Problema**: `src/rpg/items.ts` contiene lógica duplicada en:
- `Character` (`applyEquipment`, `isDualWielding`, `isTwoHanded`)
- Funciones globales (`rollQuality`, `migrateInstance`)

```typescript
// items.ts:392-506 (equipamiento, sets)
export class Equipment { ... }
export function setCounts(...) { ... }
export function equipmentSources(...) { ... }

// character.ts:524-529 (reemplazo de fuentes en sheet)
function applyEquipment(sheet: StatSheet, content: RpgContent, map: EquipMap): void { ... }
```

**Análisis**:  
- `items.ts` tiene **dos responsabilidades distintas**:
  1. Gestión del inventario y equipo (clase `Inventory`, clase `Equipment`)
  2. Reglas de slots y equipamiento (funciones puras: `fitsEquipSlot`, `displacedBy`, `slotsFor`)

- `Character` llama a `applyEquipment` pero también usa funciones de `items.ts`. Esto crea una **dependencia implícita** sobre reglas de slots que debería estar declarada en el contrato.

**Veredicto**: ⚠️ Requiere refactorización para consolidar lógica de slots en un módulo separado (`src/rpg/equipment.ts`).

---

## 3. Dependencias Innecesarias

### 3.1 `items.ts` importado por todos los módulos RPG

| Módulo | Importos Clave | ¿Necesario? |
|--------|----------------|-------------|
| `character.ts` | `Inventory`, `Equipment`, `isDualWielding` | ✅ Sí (gestión de inventario) |
| `session.ts` | `rollQuality`, `migrateInstance` | ⚠️ Podría delegar a módulo dedicado |
| `enemy.ts` | `blockToMods` (de stats, no items) | ❌ No (error en mi análisis) |

**Análisis**:  
- `character.ts` depende fuertemente de `items.ts`. Esto es correcto.
- `session.ts` usa funciones ligeras de `items.ts` (`rollQuality`, `migrateInstance`). Podría tener su propio módulo para tiradas de objetos.

**Veredicto**: ✅ Aceptable actualmente, pero se puede extraer a `src/rpg/roll.ts`.

---

### 3.2 Contratos incompletos

**Problema**: Algunos módulos dependen de detalles de implementación en lugar de contratos.

```typescript
// actor.ts (base de entidades)
import { StatSheet, type DerivedRule } from './stats';
import { StatusSet, type Control } from './status';

// character.ts
import { ...Inventory, ...Equipment, ...ItemFactory... } from './items';
import { Spellbook } from './spells';
```

**Análisis**:  
- `actor.ts` importa de `stats.ts` y `status.ts`. Correcto (son contratos de comportamiento).
- `character.ts` importa clases completas de `items.ts`. Debería importar tipos definidos en contratos (`InventoryView`, etc.) y delegar a impl.

**Veredicto**: ⚠️ Verificar que todos los módulos RPG importan de `src/rpg/contracts.ts` para sus interfaces públicas.

---

## 4. Propuestas de Mejora

### Prioridad Alta

#### 4.1 Extraer módulo de reglas de equipamiento (`src/rpg/equipment.ts`)

**Objetivo**: Consolidar lógica de slots, tipos y manos en un módulo único.

```typescript
// src/rpg/equipment.ts (nuevo)

export type EquipSlot = ...; // de contracts.ts
export const ITEM_KINDS = ...; // de contracts.ts

export function handsOf(def: ItemDef): 1 | 2 { ... }
export function slotsFor(def: ItemDef): EquipSlot[] { ... }
export function displacedBy(content: ContentDb, map: EquipMap, def: ItemDef, slot: EquipSlot): EquipSlot[] { ... }
export function isDualWielding(content: ContentDb, map: EquipMap): boolean { ... }
```

**Beneficios**:
- Reduce la superficie de importación en `items.ts` (de 40 líneas a ~5).
- Permite testear reglas de equipamiento sin dependencias de inventario.
- Documenta explícitamente el contrato entre datos y lógica.

**Migración**:
1. Mover funciones desde `items.ts:298-421` a `equipment.ts`.
2. Actualizar imports en `character.ts`, `session.ts`.
3. Eliminar duplicados de contratos (si los hay) hacia `contracts.ts`.

---

#### 4.2 Crear módulo de tiradas (`src/rpg/roll.ts`)

**Objetivo**: Centralizar funciones puras de aleatoriedad para objetos y efectos.

```typescript
// src/rpg/roll.ts (nuevo)

export function rollValue(rng: Rng, min: number, max: number): number { ... }
export function rollQuality(def: ItemDef, inst: ItemInstance): number { ... }
export function migrateInstance(def: ItemDef, inst: ItemInstance): boolean { ... }
```

**Beneficios**:
- Separa lógica de datos de lógica de simulación.
- Permite testear tiradas con `Rng` falso (reproductible).
- Facilita migraciones de versiones de objetos.

**Migración**:
1. Mover `rollQuality`, `migrateInstance`, `rollValue` a `roll.ts`.
2. Actualizar imports en `session.ts`.

---

### Prioridad Media

#### 4.3 Documentar interfaz `SessionWorld` → `World`

**Objetivo**: Clarificar el contrato entre simulación y sesión.

```typescript
// session.ts:44-58 (actualizar con comentarios)
/** Lo que la sesión pide al mundo cuando hay uno en marcha. */
export interface SessionWorld {
  // Actualizar con lista explícita de métodos usados por session.ts
}
```

**Beneficios**:
- Evita dependencias implícitas sobre propiedades no documentadas.
- Permite cambiar implementaciones internas de `World` sin afectar a `session.ts`.

---

#### 4.4 Consolidar eventos de sesión en un archivo único

**Problema**: `SessionEvent` vive en `contracts.ts`, pero su definición podría estar dispersa en simulación y mundo.

**Propuesta**:
- Crear `src/rpg/events/session-events.ts` con todas las variantes de `SessionEvent`.
- Centralizar notificaciones para que la UI dependa de un único módulo.

---

## 5. Architektura Actual (Validada)

```
src/
├── rpg/              # Lógica RPG pura (sin DOM, sin Babylon)
│   ├── contracts.ts      # Interfaces públicas (def + instancia + vistas)
│   ├── character.ts      # Jugador (Character extends Actor)
│   ├── actor.ts          # Híerarquía: Entity → Actor → [Character|Enemy|Pet]
│   ├── items.ts          # INVENTARIO + reglas de slots (⚠️ separar a 2 módulos)
│   ├── spells.ts         # Libro de hechizos y compilación
│   ├── effects.ts        # Efectos con subclases por tipo
│   ├── status.ts         # Gestión de estados activos
│   ├── stats.ts          # Hoja de estadísticas + derivados
│   ├── hinder.ts         # Combate táctico (agotamiento, desorientación)
│   ├── progression.ts    # XP y botín ponderado
│   ├── quests.ts         # Misiones y diálogos
│   ├── shop.ts           # Mercaderes (compra/venta/recompra)
│   ├── energy.ts         # "Pulso" y penalización por muerte
│   ├── spoils.ts         # Fin de combate + reparto de botín
│   ├── spectral.ts       # Estado espectral del jugador
│   ├── enemy.ts          # Enemigo RPG (envolvente de sim/enemies.ts)
│   ├── pets.ts           # Mascotas + conductas registradas
│   └── content.ts        # Parsing y validación de todos los datos
│
├── sim/               # Simulación del mundo (pura, testable)
│   ├── world.ts         # Estado simulado (Player, Enemy, Zona, Trampa)
│   ├── combat.ts        # Reglas de lanzamiento y bloqueos
│   ├── damage.ts        # Tubería de daño con resistencias
│   ├── pathfinder.ts    # A* para movimiento
│   ├── zones.ts         # Zonas + población dinámica
│   ├── enemies.ts       # Máquina de estados (Idle → Attack)
│   ├── navGrid.ts       # Grid de navegación
│   ├── shapes.ts        # Geometría para lanzamientos y colisiones
│   └── rng.ts           # Generador determinista para tests
│
├── world/             # Mundo del juego (posición, render implícito)
│   ├── overworld.ts     # Mapa abierto (población, clima, zonas)
│   ├── dungeon.ts       # Mazmorras generadas/procedurales
│   └── placement.ts     # Guardado/carga de posición del jugador
│
├── data/              # Datos JSON (no lógica)
│   ├── schema.ts        # Definiciones de tipos para validar
│   ├── validate.ts      # Validador con cruces de referencias
│   └── rpg/*.json       # Todas las fichas RPG (PROPUESTA)
│
└── ui/                # Interfaz (depende de contratos, no impl.)
    └── menus/          # Menús que usan GameSessionApi
```

**Principios validados**:
- ✅ Lógica RPG en `src/rpg/`, simulación en `src/sim/`.
- ✅ Datos JSON en `data/rpg/` (nunca cargados desde `%LOCALAPPDATA%`).
- ✅ Funciones puras testables con inputs fijos.

---

## 6. Recomendaciones Priorizadas

| # | Acción | Esfuerzo | Riesgo | Impacto |
|---|--------|----------|--------|---------|
| 1 | Extraer `equipment.ts` | Alto (migración) | Medio (revisión de imports) | Alto (claridad de contratos) |
| 2 | Crear `roll.ts` | Bajo (copiar + actualizar) | Bajo | Medio (testabilidad) |
| 3 | Documentar `SessionWorld` | Bajo (comentarios) | Nulo | Medio (seguridad de refactoring) |
| 4 | Consolidar eventos de sesión | Bajo | Nulo | Alto (reducir acoplamiento UI↔sim) |

**No recomendado actualmente**:
- ❌ Refactorizar a `src/rpg/actors.ts` para centralizar `Character` y `EnemyActor`. La jerarquía actual (`Entity` → `Actor` → subclases) es correcta.
- ❌ Mover lógica de efectos a un módulo único. El patrón por tipo (registro en `EFFECT_TYPES`) es adecuado para mantener el código limpio.

---

## 7. Conclusión

El prototipo tiene una **arquitectura sólida** con:
- ✅ Separación clara entre simulación, datos y UI
- ✅ Lógica pura testable sin dependencias del render
- ✅ Contratos explícitos en `contracts.ts`

**Acción inmediata**: Implementar **#1 (equipment.ts)** para reducir la complejidad de `items.ts`. Esto prepara el terreno para futuras extensiones de inventario sin acumular responsabilidades.

---

## 8. Cita de Referencia

> "La profundidad es una propiedad de la interfaz, no de la implementación."  
> — Codebase Design Skill

El prototipo cumple este principio: `GameSession` y `World` tienen interfaces pequeñas que esconden complejidad interna. Las mejoras propuestas mantienen esta disciplina al mover lógica a nuevos módulos con contratos explícitos.
