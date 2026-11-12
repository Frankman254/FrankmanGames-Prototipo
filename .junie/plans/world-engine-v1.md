---
sessionId: session-261112-082229-178i
---

# Frankman World Editor — Plan de corrección V1.1

## Estado actual
Todos los 7 hitos originales están implementados en master, pero el editor visual es inutilizable:
- Interfaz duplicada (panel antiguo + workspace nuevo)
- Viewport negro por overlay oscuro
- Botones de herramientas vacíos
- Buscador de assets no conectado
- Play Mode incompleto

## Correcciones en progreso

### ✓ Step 1: Corrección 1 — Eliminar duplicación de interfaces y reparar viewport
- Desacoplar EditorPanel, solo usar EditorWorkspace
- Corregir CSS del workspace para que el viewport muestre el canvas real
- Integrar el canvas Babylon.js dentro del layout del workspace
- Un solo panel visual activo al abrir F12

### ✓ Step 2: Corrección 2 — Habilitar herramientas, búsqueda, selección, inspector y gizmos
- Implementar los 6 botones de herramientas en la toolbar
- Conectar el buscador de assets al DOM
- Asegurar selección sincronizada entre jerarquía, viewport e inspector
- Gizmos funcionales para mover, girar y escalar

### ✓ Step 3: Corrección 3 — Restaurar flujo de guardado y aplicación en caliente
- Guardar escribe JSON y aplica al mundo real sin Play Mode
- Cerrar F12 ofrece Guardar y aplicar, Cancelar, Salir sin guardar
- Deshabilitar botón Probar/Play Mode hasta que funcione
- Cambios visibles en el juego sin recargar

### * Step 4: Corrección 4 — Pulir interfaz, miniaturas y ayuda contextual
- Reemplazar emojis por iconos SVG coherentes
- Mejorar legibilidad y contraste
- Ayuda contextual accesible

### ✓ Step 5: Corrección 5 — QA integral, pruebas visuales y regresiones
- Ejecutar Electron y verificar visualmente
- Tests de regresión completos
- Verificar antorchas, rompibles, cofres, puertas

---

# Requisitos originales (contexto)

## Metas
- Construir una parte jugable del mundo visualmente.
- Abrir un piso, encontrar sus objetos, añadir nuevos, moverlos, girarlos, escalarlos, configurar comportamientos, guardar, ejecutar el escenario y regresar al editor sin perder cambios.
- El ciclo completo debe reproducirse mediante Electron con interacciones reales.

## Historias de Usuario
- Como creador, quiero abrir un piso y ver sus objetos en un árbol jerárquico para localizarlos rápidamente.
- Como creador, quiero añadir un barril desde una paleta y verlo en el viewport 3D.
- Como creador, quiero mover, girar y escalar objetos con gizmos 3D.
- Como creador, quiero guardar y cerrar F12 para ver el objeto en la mazmorra jugable.
- Como creador, quiero probar el escenario sin alterar permanentemente la partida.
- Como creador, quiero deshacer/rehacer cambios.

## Alcance
### In Scope
- Editor de mazmorras (cripta) como prioridad.
- Editor del mundo exterior (overworld) ya existente se mejora.
- Persistencia en JSON versionado.
- Play Mode aislado.
- Gizmos 3D para transformaciones.
- Biblioteca de prefabs.
- Undo/Redo.

### Out of Scope
- Rework masivo de equipamiento RPG V4.
- Las seis Rancias ni la progresión 101–200.
- Rehacer el motor de combate.
- Nuevo sistema de renderizado.
- ECS completo automático.
- Dependencias grandes sin justificación.

## Criterio de Éxito
Frankman World Editor debe permitir construir una parte jugable del mundo visualmente. El creador puede abrir un piso, encontrar sus objetos, añadir nuevos, moverlos, girarlos, escalarlos, configurar comportamientos válidos, guardar, ejecutar el escenario y regresar al editor sin perder sus cambios.

# Diseño Técnico

## Arquitectura Actual

### Componentes existentes
- `src/editor/doc.ts` — `EditorDoc`: documento del overworld (vegetación, PNJs, zonas, etc.). Soporta mover, girar, escalar, borrar, añadir, pintar navegación. Historial undo/redo.
- `src/editor/dungeonDoc.ts` — `DungeonEditorDoc`: documento del piso de mazmorra. **Solo** soporta pintar navegación (`navPaint`). No soporta objetos manuales ni overrides.
- `src/data/dungeonFloorMap.ts` — `DungeonFloorMapDef`: esquema v1 del documento de piso. Solo `navPaint` y `doors`.
- `src/ui/editor/` — UI actual del editor: panel lateral de 300px, viewport Babylon.js con cajas translúcidas, cámara libre, picking geométrico.
- `src/render/dungeonView.ts` — `DungeonFloorView`: renderiza pisos de mazmorra (suelo, muros, antorchas, escaleras, cofres, puertas, rompibles, estanques).
- `src/scenes/cryptScene.ts` — `CryptScene`: gestión de escenas de cripta. `applyEditorMap()` solo aplica navegación.
- `src/world/dungeon.ts` — `generateFloor()`: genera pisos por semilla. Lee `DungeonFloorMapDef` para overrides de puertas.

### Defectos P0 identificados
1. **Migración v1/v2**: `DungeonFloorMapDef` no soporta objetos manuales.
2. **Selección**: `DungeonEditorDoc.find()` solo resuelve objetos generados, no manuales ni overrides.
3. **IDs**: `split(':')` rompe IDs con separadores.
4. **Supresiones**: No hay mecanismo para ocultar objetos generados sin destruir la base.
5. **Runtime**: `CryptScene.applyEditorMap()` solo aplica navegación, no objetos.
6. **Interacciones**: Riesgo de duplicar cofres, enemigos o recursos al guardar/aplicar varias veces.

## Diseño Propuesto

### 1. Esquema de Documento v2
Extender `DungeonFloorMapDef`:
```
type DungeonFloorMapDef v2 {
  version: 2;
  dungeon: string;
  floor: number;
  generation: { kind: 'seed' | 'hand'; seed: number };
  navPaint: NavPaint;
  doors: Record<string, DoorOverride>;
  // Nuevo:
  overrides: Record<string, EntityOverride>;
  manualObjects: ManualObject[];
}

interface EntityOverride {
  visible?: boolean;
  position?: { x: number; y: number; z?: number };
  rotation?: number;
  scale?: number;
  category?: string;
  properties?: Record<string, unknown>;
}

interface ManualObject {
  id: string;
  kind: string; // 'chest', 'barrel', 'jar', 'door', 'torch', 'spawn', 'npc', 'resource', 'decoration', 'structural', 'zone', 'trigger', 'entrance', 'exit'
  name?: string;
  position: { x: number; y: number; z?: number };
  rotation?: number;
  scale?: number;
  visible?: boolean;
  collision?: boolean;
  properties?: Record<string, unknown>;
}
```

### 2. DungeonEditorDoc Mejorado
- `objects()`: devuelve generados + overrides + manuales.
- `find(key)`: resuelve cualquier tipo de objeto.
- `addObject(obj)`: añade objeto manual.
- `removeObject(key)`: elimina objeto manual o añade override `visible: false`.
- `setOverride(key, override)`: establece override en objeto generado.
- `serialize()`: escribe v2 con migración desde v1.

### 3. Integración Runtime
- `generateFloor()` lee `map.overrides` y `map.manualObjects`.
- `CryptScene.applyEditorMap()` aplica objetos y overrides al mundo.
- `DungeonFloorView` renderiza objetos manuales.
- Sin duplicación: los objetos manuales tienen IDs estables; los overrides se aplican una vez.

### 4. EditorWorkspace
Nuevo componente DOM reemplazando el panel lateral:
- **Barra superior**: Archivo, Editar, Herramientas, Probar, Guardar, Exportar. Escenario/piso actual, estado dirty, errores.
- **Panel izquierdo — Jerarquía**: Árbol de entidades con grupos, búsqueda, selección, visibilidad, bloqueo, crear, duplicar, renombrar, eliminar, centrar cámara.
- **Vista central — Viewport**: Babylon.js con gizmos de transformación (mover, girar, escalar), controles de vista, rejilla, snap.
- **Panel derecho — Inspector**: Propiedades del objeto seleccionado (nombre, ID, prefab, posición, rotación, escala, visibilidad, colisión, categoría, propiedades propias).
- **Panel inferior — Asset Browser**: Catálogo de prefabs con categorías, búsqueda, vista previa, colocación.

### 5. Play Mode
- `PlayModeController`: separa Edit Mode de Play Mode.
- Edit Mode: modifica documentos.
- Play Mode: ejecuta el juego con los documentos actuales.
- Stop: vuelve al estado de edición sin contaminar el documento.

### 6. Gizmos 3D
- `TransformGizmo`: usa `UniversalGizmoManager` de Babylon.js o gizmos personalizados.
- Snap: posición (0.5m), rotación (15°/90°), escala (0.1).
- Integrado con `DungeonEditorDoc` y `EditorDoc`.

### 7. PrefabRegistry
- Catálogo de prefabs con modelo GLB, propiedades por defecto, esquema de validación, categoría y vista previa.
- Asset browser con drag-and-drop o clic para colocar.

## Decisiones Clave
1. **Extender v1, no reemplazar**: `DungeonFloorMapDef` v2 es compatible con v1. Los pisos sin objetos manuales funcionan como antes.
2. **IDs estables**: Los objetos manuales tienen IDs únicos (UUID o contador). Los objetos generados usan su ID original. Los overrides usan el ID del objeto generado.
3. **Sin duplicación**: Los objetos manuales se renderizan una vez. Los overrides se aplican al objeto generado existente.
4. **Play Mode aislado**: Los cambios de simulación no contaminan el documento. Se usa un snapshot del documento al entrar en Play Mode.
5. **Gizmos Babylon.js**: Usar `UniversalGizmoManager` si está disponible;否则 gizmos personalizados con primitivas.
6. **EditorWorkspace modular**: Cada panel es un componente independiente. Se pueden añadir paneles nuevos sin modificar el core.

## Riesgos
- **Compatibilidad v1/v2**: Si la migración no es perfecta, se pierden cambios. Mitigación: tests de round-trip exhaustivos.
- **Duplicación de objetos**: Si `applyEditorMap` se llama varias veces, se duplican objetos. Mitigación: IDs estables + verificación de existencia.
- **Gizmos Babylon.js**: Si `UniversalGizmoManager` no está disponible, hay que implementar gizmos personalizados. Mitigación: fallback a botones de transformación.
- **Rendimiento**: Si el viewport se vuelve lento con muchos objetos. Mitigación: instancing, LOD, culling.

# Testing

## Estrategia de Validación
Cada hito termina con pruebas en verde y un commit independiente.

## Escenarios Clave
1. **Crear objeto**: Añadir barril desde paleta → visible en viewport y jerarquía.
2. **Seleccionar**: Clic en jerarquía o viewport → objeto seleccionado, inspector muestra propiedades.
3. **Mover con gizmo**: Arrastrar gizmo → objeto se mueve en 3D → posición actualizada en inspector.
4. **Girar y escalar**: Gizmo de rotación/escala → objeto gira/escala → propiedades actualizadas.
5. **Guardar**: Ctrl+S → escrito en disco → `dirty` falso.
6. **Cerrar F12**: Editor cerrado → objeto visible en mazmorra jugable.
7. **Interactuar**: Si es interactivo (cofre, rompible) → funciona en Play Mode.
8. **Cambiar piso y regresar**: Salir del piso → entrar → objeto conservado.
9. **Recargar**: Recargar aplicación → objeto conservado.
10. **Sin duplicación**: Guardar → aplicar → guardar → aplicar → un solo objeto.
11. **Deshacer/Rehacer**: Ctrl+Z/Ctrl+Y → cambios revertidos/aplicados.
12. **Fallo de escritura**: Simular fallo → documento conservado → reintento posible.
13. **No perder partida**: Play Mode → abrir cofre → matar enemigo → Stop → cofre cerrado, enemigo vivo.
14. **Antorchas y rompibles**: Verificar que las antorchas y rompibles recientes siguen funcionando.

## Pruebas a Extender
- `tests/editor.test.ts`: añadir tests para objetos manuales, overrides, migración v1/v2, Play Mode.
- `npm run typecheck`: sin errores de tipo.
- `npm test`: todos los tests en verde.
- `npm run build`: sin errores de compilación.
- `npm run docs:check`: documentación válida.
- `npm run qa:electron -- editorMazmorra`: QA del editor de mazmorra.
- `npm run qa:electron -- editorCaliente`: QA de aplicación en caliente.

## Casos de Borde
- ID con separadores: no romper `split(':')`.
- Override en objeto no existente: ignorar o crear como manual.
- Objeto manual en posición inválida: validar y rechazar.
- Guardar sin cambios: no escribir en disco.
- Aplicar sin guardar: aplicar cambios en memoria.
- Play Mode sin cambios: ejecutar con documento actual.
- Stop con cambios de simulación: descartar cambios de simulación.
- Migración v1 sin objetos manuales: funcionar como v1.
- Migración v2 a v1: perder objetos manuales (advertir).

# Delivery Steps

### ✓ Step 1: Hito 1 — Esquema de documento v2 y corrección de defectos P0
Extender `DungeonFloorMapDef` para soportar objetos manuales, overrides y versión 2, con migración compatible hacia atrás.
- Añadir `overrides` (propiedades editables por objeto generado: posición, rotación, visibilidad, categoría).
- Añadir `manualObjects` (objetos colocados a mano: cofres, barriles, puertas, luces, spawns, NPCs, decoraciones).
- Incrementar `version` a 2; `parseDungeonFloorMap` lee v1 y v2 sin pérdida.
- `DungeonEditorDoc` expone `addObject()`, `removeObject()`, `setOverride()`, y `find()` resuelve generados + overrides + manuales.
- IDs: corregir `split(':')` para no romper IDs con separadores (usar split limitado).
- Tests: migración v1→v2, round-trip de objetos, selección de override, supresión sin destruir base.

### ✓ Step 2: Hito 1B — Integración runtime: applyEditorMap completo
`CryptScene.applyEditorMap()` aplica objetos y overrides al mundo jugable, no solo navegación.
- `generateFloor()` y `generateHandFloor()` leen `map.overrides` y `map.manualObjects` para ajustar posiciones, rotaciones, visibilidad y añadir objetos nuevos.
- `DungeonFloorView` renderiza los objetos manuales (cofre, barril, puerta, luz, spawn) con el mismo pipeline que los generados.
- No duplicar cofres, enemigos ni recursos al guardar o aplicar varias veces.
- Tests: colocar barril → guardar → cerrar F12 → verlo en mazmorra → interactuar → cambiar piso y regresar → sin duplicación.

### ✓ Step 3: Hito 2 — EditorWorkspace mínimo
Reemplazar el panel lateral de 300px por un espacio de trabajo modular con barra superior, jerarquía, inspector y panel de assets.
- `EditorWorkspace` (nuevo componente DOM): barra superior (Archivo, Editar, Herramientas, Probar, Guardar), panel izquierdo (árbol de entidades con búsqueda, visibilidad, bloqueo), panel derecho (inspector con propiedades validadas por esquema), panel inferior (asset browser con categorías, búsqueda, vista previa).
- El viewport central sigue siendo Babylon.js con gizmos de transformación.
- Integrar con `DungeonEditorDoc` y `EditorDoc` existentes.
- No perder funcionalidad existente: F12, deshacer/rehacer, guardar, exportar.

### ✓ Step 4: Hito 3 — Transformaciones 3D con gizmos
Gizmos de Babylon.js para mover, girar y escalar objetos en el viewport 3D, con campos numéricos y snap.
- `TransformGizmo` (nuevo): usa `UniversalGizmoManager` de Babylon.js o gizmos personalizados para transformaciones 3D.
- Snap: posición (0.5m), rotación (15°/90°), escala (0.1).
- Los cambios se reflejan en el objeto real, colisiones y navegación aplicables.
- Integrar con `DungeonEditorDoc` para objetos de mazmorra y `EditorDoc` para el exterior.
- Tests: mover con gizmo → girar → escalar → guardar → recargar → posición conservada.

### ✓ Step 5: Hito 4 — Biblioteca de prefabs
Biblioteca de prefabs: catálogo de objetos colocables desde assets registrados.
- `PrefabRegistry`: catálogo de prefabs (cofre, barril, jarra, puerta, antorcha, spawn, NPC, recurso, decoración, geometría estructural, zona, desencadenador, entrada/salida).
- Cada prefab tiene: modelo GLB (si existe), propiedades por defecto, esquema de validación, categoría y vista previa.
- Asset browser: categorías, búsqueda, drag-and-drop o clic para colocar.
- Colocar, guardar y recargar un prefab desde el editor.
- Tests: prefab disponible → colocar → guardar → recargar → visible y funcional.

### ✓ Step 6: Hito 5 — Play Mode
Separación clara entre Edit Mode (modifica documentos) y Play Mode (ejecuta el juego con esos documentos).
- `PlayModeController`: pausa la edición, aplica el documento actual al mundo, permite jugar.
- Stop: vuelve al estado de edición sin convertir cambios de simulación en cambios permanentes.
- Inventario, monedas, experiencia, objetos obtenidos y estados de monstruos durante una prueba no contaminan el documento del editor.
- Soporta reinicio de escena y conserva el contenido guardado.
- Tests: probar piso → abrir cofre → matar enemigo → Stop → cofre cerrado, enemigo vivo, sin cambios en documento.

### ✓ Step 7: Hito 6 — QA integral y pulido
Pruebas funcionales integrales, rendimiento, persistencia, interfaz y documentación de uso.
- Ejecutar: `npm run typecheck`, `npm test`, `npm run build`, `npm run docs:check`.
- Extender pruebas del editor: crear objeto, seleccionar en jerarquía y viewport, mover con gizmo, girar, escalar, guardar, cerrar F12, ver modelo real, interactuar, cambiar piso y regresar, recargar, sin duplicación, deshacer/rehacer, fallo de escritura, no perder partida.
- Verificar que antorchas y rompibles recientes siguen funcionando.
- Documentación: guía de atajos, explicación contextual de cada herramienta.
- Commit independiente con SHA registrado.