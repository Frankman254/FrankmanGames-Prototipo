# Instrucciones para agentes — FrankmanGames-Prototipo

Repositorio de **producción** del RPG original de FrankmanGames. Aquí sí se
escribe código. La investigación vive en las carpetas vecinas y **no se copia**.

## Autorización

El creador autorizó el 2026-10-28 crear esta carpeta y empezar el prototipo
("abrir otro agente para ir empezando el juego en su propia carpeta"). Esa
autorización cubre el **Slice 01** de `docs/ALCANCE_SLICE_01.md`. Cualquier cosa
fuera de ese alcance necesita una autorización nueva del coordinador.

## Leer antes de escribir código (en este orden)

1. `../FrankmanGames/04_VISION_Y_DECISIONES.md`: las únicas reglas de juego
   vigentes son las `DEC-*` (hoy `DEC-2026-001..005`).
2. `../FrankmanGames/07_PROPUESTA_PROTOTIPO_JUGABLE.md`: alcance y criterios de éxito.
3. `../FrankmanGames/08_CONSOLIDADO_ANALISIS.md`: qué se sabe de los referentes.
4. `../Dofus-ReverseEngineering/guia/GUIA_PROYECTO.md`: arquitectura propuesta
   (§3b zonas, §7b–7d tiempo real, clic y recurso+cooldown, §10 prototipo).
5. Sólo cuando una tarea lo pida: las fichas de `../FrankmanGames/fichas/FATE/`
   y `../Dofus-ReverseEngineering/fichas/`.

## Reglas duras

1. **Clean-room.** Ni código, ni assets, ni textos, ni nombres, ni enums, ni
   tablas de FATE, DOFUS Retro o DOFUS 3. Las fichas se leen como *ideas*; la
   implementación se escribe desde cero con nombres y coeficientes propios.
2. Nunca leer desde `C:\Program Files (x86)\WildGames\FATE`,
   `%LOCALAPPDATA%\Ankama\` ni `../*/out/` para cargar datos en el juego.
3. Todo asset (sprite, sonido, fuente) se registra en `PROCEDENCIA.md` con autor
   y licencia antes de añadirlo. En el Slice 01 basta geometría generada por código.
4. No modificar `../FrankmanGames/04_VISION_Y_DECISIONES.md` ni marcar nada como
   aprobado. Las cifras de balance son `PROPUESTA` y viven en datos (`data/*.json`).
5. No preguntar al creador desde esta tarea. Las dudas van al handoff; el
   coordinador decide si bloquean.
6. Nada de red, cuentas ni servicios externos en el Slice 01.

## Stack del Slice 01 (evaluación, no elección definitiva)

`PEND-TECH-001` sigue abierto. El Slice 01 **es** la prueba medible de JS/TS:

- El juego es **3D** (respuesta del creador, 2026-10-28).
- TypeScript estricto + Vite + **Babylon.js** como render de evaluación (sólo
  primitivas), Node 20 ya instalado. Registrar la versión en `PROCEDENCIA.md`.
- Vitest para la lógica pura (combate, cooldowns, A*, máquina de estados).
- Simulación a paso fijo (p. ej. 60 Hz) separada del render interpolado.
- La lógica de `src/sim/` no importa nada del DOM ni de Babylon, para poder
  testearla y, si se cambia de stack, portarla.

Si la medición sale mal (ver criterios), se documenta en el handoff; no se
cambia de stack por iniciativa propia.

## Forma de trabajo

- `git init` al empezar; commits pequeños por paso del slice. Sin remoto ni push.
- Cada paso termina con tests en verde y una nota en `docs/BITACORA.md`
  (qué se hizo, qué se midió, qué quedó pendiente).
- Al terminar el slice, o si algo bloquea, escribir `docs/HANDOFF_SLICE_01.md`:

```markdown
# HANDOFF — Slice 01
- Objetivo autorizado:
- Qué funciona (con cómo probarlo):
- Mediciones (FPS/frame time con N entidades, latencia de clic):
- Decisiones técnicas tomadas y por qué (PROPUESTA):
- Incertidumbres que bloquean el siguiente paso:
- Archivos principales:
- No se tomó ninguna decisión creativa.
```
