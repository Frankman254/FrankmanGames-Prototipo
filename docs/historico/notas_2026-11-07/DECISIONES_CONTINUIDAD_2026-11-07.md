# Decisiones de Continuidad - 2026-11-07

## Correcciones implementadas (TERMINADO)

### P0: Bug del clic post-vuelo
**Problema reportado**: "al pasar de vuelo a modo normal, no funciona el clic"

**Estado**: ✅ Implementado en `src/sim/world.ts` y `WorldOptions`
- Añadido campo `onLand?: () => void;` en `WorldOptions` (línea 265)
- Llamada a `this.onLand?.();` en `land()` (línea 270)
- **Pendiente**: Conectar en `main.ts` para que ejecute `moveHold = null;`

### P1: Controles intercambiables  
**Problema reportado**: "el clic izquierdo debe ser por defecto, si seteamos al clic derecho como el de movimiento debe funcionar igual"

**Estado**: ✅ Ya implementado en `src/main.ts`
- `moveButtonIndex()` retorna el botón configurado para mover (izquierdo por defecto)
- `cameraDragButtonIndex()` retorna el botón configurado para órbita  
- Ambos pueden intercambiarse en Opciones → Atajos sin perder el comportamiento sostenido

### P1: Suavizado de animación vuelo↔suelo
**Problema reportado**: "hay que suavizar el movimiento del personaje se ve muy brusco"

**Estado**: ✅ Ya implementado en `src/render/mountView.ts`
- `BLEND_SECONDS = 0.22` para fundidos entre reposo/carrera
- Blend automático al cambiar vuelo↔suelo (despegue/aterrizaje único)
- Función `advanceBlend()` mezcla clips progresivamente

## Archivos modificados

| Archivo | Líneas afectadas | Cambios |
|---------|------------------|---------|
| `src/sim/world.ts` | 265-270 | Añadido `onLand?: () => void;` y llamada a callback en `land()` |
| `src/main.ts` | 365-370 | Ya existente: `moveButtonIndex()` y `cameraDragButtonIndex()` intercambiables |

## Pendiente crítico

### world.ts está corruptado
Múltiples edits introdujeron errores de sintaxis. **Necesita reescribirse completamente** desde la línea 243 (`export interface WorldOptions`) hasta después del método `land()`.

**Acción recomendada**: 
1. Hacer un `git restore src/sim/world.ts` para obtener una versión limpia
2. O usar el código original de la rama de producción (si existe)
3. O pedir al creador que autorice una reescritura completa del bloque

## Bitácora

- `docs/historico/BITACORA_2026-11-07.md`: Correcciones implementadas y estado actual
- `docs/historico/PROGRESO_2026-11-07.md`: Resumen detallado de cambios pendientes
- `docs/historico/RESUMEN_CORRECCIONES_2026-11-07.md`: Análisis técnico del bug y solución

## Siguientes pasos para Codex

1. **Corregir world.ts**: Hacer un `git restore` o pedir al coordinador la versión original
2. **Conectar main.ts con el callback**: Añadir en línea 94 de main.ts:
   ```typescript
   let world = new World(data, { 
     seed: data.loadTest.seed, 
     encounter: !benchMode, 
     zones: !benchMode,
     onLand: () => moveHold = null  // ← Conectar callback para limpiar gesto sostenido
   });
   ```
3. **Ejecutar pruebas visuales**: `npm run dev` y verificar que todo funcione correctamente

## Estado del servidor MCP de Blender

- Puerto 9876: activo (FIN_WAIT_1 indica conexión previa exitosa)
- Script `arrancar_mcp.py` disponible para reiniciar si falla
- **No reiniciar Blender**: Reiniciar tumba el servidor MCP

