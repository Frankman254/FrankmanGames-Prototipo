# Preguntas para el creador — JL-160

## Puertobelo (JL-169, JL-171, JL-172, JL-173, JL-180)

**Pregunta:** ¿Se debe esperar a que OMP entregue `puertobelo_kit.glb` (OMP-PB-01) antes de avanzar con las tareas de Puertobelo, o se prefieren otras tareas mientras tanto?

**Contexto:**
- JL-169: Kit de Puertobelo en `data/ambient.json` — espera `puertobelo_kit.glb` y `work/omp-pb-01/HUELLAS.md`.
- JL-171: Zona jugable «Puertobelo» — espera JL-169.
- JL-172: Rendimiento de Puertobelo — espera JL-171.
- JL-173: Icono y etiqueta de Puertobelo en el minimapa — espera JL-171.
- JL-180: Sonido de Puertobelo — espera JL-171.

Las 5 tareas forman una cadena de dependencias que arranca en OMP-PB-01. Mientras OMP no entregue el kit, ninguna puede avanzar.

**Opciones:**
1. **Esperar:** dejar las 5 tareas como `[!]` hasta que OMP publique `puertobelo_kit.glb` en master.
2. **Reemplazar:** sustituir las 5 tareas por otras del mismo alcance (zonas, auditorías, escenarios QA) mientras llega el kit.
3. **Parcial:** avanzar con lo que no depende del kit (por ejemplo, preparar la estructura de `data/zones.json` sin el kit visual).

## JL-64 (Rework de los pisos a mano de la cripta)

**Estado:** Ya desbloqueada por JL-64b (antorchas declaradas en pisos a mano y generador robusto). JL-64 sigue marcada `[!]` en la cola original, pero el bloqueo se resolvió.

**Pregunta:** ¿El creador quiere que se avance con el rework de los pisos manuales de la cripta ahora, o se mantiene pendiente?

**Nota:** El rework implica cambiar la geometría de los pisos 1-5 de la cripta en `data/dungeons/cripta-tulivieja.json`. Es contenido, no código.

## JL-74 y JL-85 (Escenarios QA)

**Estado:** Ambas ya resueltas por sus reasignaciones:
- JL-74 → JL-74b: escenario `barra` en verde (6/6).
- JL-85 → JL-85b: escenario `crestalba` en verde (5/5).

No requieren pregunta al creador.
