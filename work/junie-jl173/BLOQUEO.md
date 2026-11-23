# JL-173 — BLOQUEADA: Icono y etiqueta de Puertobelo en el mapa

**Fecha:** 2026-11-23
**Agente:** Junie

## Motivo

JL-173 requiere dibujar un icono `castle` y la etiqueta «Puertobelo» en el minimapa y el mapa grande (`src/ui/map/mapDraw.ts`). Sin embargo, la zona **Puertobelo no existe** en el juego:

- `data/zones.json` no contiene ninguna zona llamada «puertobelo».
- `data/ambient.json` no contiene piezas del kit de Puertobelo.
- `assets/models/puertobelo_kit.glb` no existe (pendiente de OMP-PB-01).

## Cadena de dependencias

```
JL-173 (icono/etiqueta)
  → JL-171 (zona jugable Puertobelo) — BLOQUEADA
    → JL-169 (kit en data/ambient.json) — BLOQUEADA
      → OMP-PB-01 (puertobelo_kit.glb en Blender) — Pendiente
```

## Verificación

- Búsqueda de «puertobelo» en `data/zones.json`: 0 resultados.
- Búsqueda de «puertobelo» en `data/ambient.json`: 0 resultados.
- `assets/models/puertobelo_kit.glb`: no existe.
- `work/omp-pb-01/HUELLAS.md`: no existe.

## Qué falta

Que OMP complete OMP-PB-01 (kit modular), que Junie integre el kit en `data/ambient.json` (JL-169), construya la zona (JL-171) y luego JL-173 pueda dibujar el icono y la etiqueta.

## Sin código

No se modificó ningún archivo del juego. Esta tarea no genera commit propio: la casilla, TAREAS y BITACORA entran en el commit de la siguiente tarea con código.
