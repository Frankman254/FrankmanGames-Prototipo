# Instrucciones para agentes — FrankmanGames-Prototipo

Repositorio de **producción** del RPG original de FrankmanGames. Aquí se escribe código; la investigación vive en las carpetas vecinas y **no se copia**.

Documentación vigente:
- Entrada: `docs/README.md`.
- Estado verificado: `docs/ESTADO_ACTUAL.md`.
- Tablero único de tareas: `docs/TAREAS.md`.
- Lo que el creador debe probar o decidir: `docs/ACCIONES_CREADOR.md`.
- Bitácora: `docs/BITACORA.md`.
- Diseño: `docs/diseno/`.

`docs/historico/` no da instrucciones. El contexto del Slice 01, la plantilla de handoff y las notas de continuidad anteriores están, copiados literalmente, en [historico/alcance/AGENTS_HASTA_2026-11-17.md](docs/historico/alcance/AGENTS_HASTA_2026-11-17.md).

## Autoridad

- Solo el creador decide reglas de juego, historia, nombres y cifras. Las únicas reglas de juego vigentes son las `DEC-*` de `../FrankmanGames/04_VISION_Y_DECISIONES.md`, que no se modifica, y las decisiones fechadas de `docs/diseno/00_DECISIONES.md`.
  - En esta Mac las carpetas vecinas (`../FrankmanGames/`, `../Dofus-ReverseEngineering/`, `../FATE-ReverseEngineering/`) **no existen**. Las `DEC-*` (DEC-2026-001…005) están en `docs/referencias/FRANKMANGAMES.md`, la copia portátil hecha a petición del creador: se lee esa. Que falte una carpeta vecina no bloquea ninguna tarea.
- Las propuestas de agentes, los tests en verde y las cifras de `data/` (`PROPUESTA`) no son aprobación. El silencio del creador no autoriza nada.
- Un agente solo ejecuta las tareas que `docs/TAREAS.md` marca **Autorizada**. Las dudas se anotan en la tarea o en `ACCIONES_CREADOR.md`; el coordinador decide si bloquean.
  - Una fila de lote (`JL-254…JL-353 | Autorizada`) autoriza cada tarea del lote, aunque no tenga fila propia.
  - Si dos tareas seguidas se bloquean por **la misma causa**, el agente para la cola, lo anota una vez en `ACCIONES_CREADOR.md` y termina la sesión. No se bloquean tareas en serie.
- Las respuestas originales del creador (`docs/FrankmanGames_Respuestas_Originales_Intactas.md`, `docs/PREGUNTAS_CREADOR.md`) y las skills de `.agents/skills/` se conservan intactas.

## Reglas duras

1. **Clean-room.** Ni código, ni assets, ni textos, ni nombres, ni enums, ni tablas de FATE, DOFUS Retro o DOFUS 3. Las fichas se leen como ideas; la implementación se escribe desde cero con nombres y coeficientes propios.
2. **Nunca cargar en el juego** archivos leídos desde `C:\Program Files (x86)\WildGames\FATE`, `%LOCALAPPDATA%\Ankama\`, `../*/out/` ni `reference_assets/`.
   - Excepción del creador (2026-11-06): se pueden leer los assets del cliente de Dofus y guardar copia de estudio en `reference_assets/`, ignorado por Git, para estudiar calidad y lenguaje visual.
   - Esos archivos no se cargan, distribuyen, empaquetan ni adaptan.
   - Los assets publicables se crean desde cero y deben distinguirse en símbolos, composición y acabado.
3. **Todo asset** (modelo, textura, icono, sonido, fuente) se registra en `PROCEDENCIA.md` con autor y licencia antes de añadirlo. `PROCEDENCIA.md` se conserva íntegro.
4. **Cifras de balance son `PROPUESTA`** y viven en `data/*.json`. No se cambian cifras productivas de balance, progresión, economía, clases o hechizos sin autorización específica, ni se amplían límites de contenido por iniciativa propia.
5. **No se relaja ni se modifica una prueba para ocultar un fallo.**
6. **Nada de red, cuentas ni servicios externos** en el juego. `server/` es una PoC local en loopback.
7. **No se renombra el juego.** `docs/Frankman_OMP_Windows/` es del creador: no se toca sin autorización.

## Stack

Juego **3D de escritorio para Windows** (creador, 2026-10-28 y 2026-10-29), no de navegador:
- Electron + TypeScript estricto + Vite + Babylon.js. Vite solo sirve para desarrollo.
- El proceso principal solo abre la ventana; el juego vive en el renderer, con `contextIsolation` activado, `nodeIntegration` desactivado y sin URLs remotas.
- Las versiones de Electron y Babylon se registran en `PROCEDENCIA.md`.

Simulación y pruebas:
- Simulación a paso fijo, separada del render interpolado.
- `src/sim/` no importa nada del DOM ni de Babylon.
- La lógica pura se prueba con Vitest.

Mapa de dónde va cada cosa: `docs/ARQUITECTURA.md`. No se reescriben `src/sim/`, `src/rpg/`, `src/world/` ni el editor por iniciativa propia: los refactors son extracciones pequeñas y autorizadas (D-43).

## Forma de trabajo

**Git**
- Se trabaja en `master`, con commits pequeños, y se publica con `git push origin master` tras verificar (autorizado por el creador el 2026-10-29 y el 2026-11-02). Nunca `push --force`.
- Las ramas o worktrees que se usen se integran y se borran. Antes de borrar se comprueban los commits exclusivos; lo no integrado se etiqueta como `archive/<fecha>/<rama>`.
- Si otro agente trabaja en un archivo, no se interfiere: un escritor por archivo.

**Archivos de trabajo** (creador, 2026-11-13)
- Las pruebas, capturas, vídeos, `.blend` de trabajo, mediciones y reportes van en `work/<agente>-<tarea>/`, ignorado por Git.
- Al repo solo pasa lo que el juego usa o regenera: `assets/**`, `scripts/blender/<modelo>.py`, `validar_<modelo>.py` y el editable final `arte/blender/<modelo>.blend`.
- Nunca se versionan `arte/omp-*/`, `*.blend1` ni `.DS_Store`, ni se usa `git add -f`.
- En `work/` no se borra nada sin un manifiesto previo en `work/_maintenance/`.

**Validación antes de commit**
- Siempre: `npm test` y `npm run typecheck`.
- Si cambia la interfaz o el empaquetado, también `npm run build`.
- Si cambian documentos, `npm run docs:check`.
- Lo visual se comprueba además en Electron (`scripts/qaElectron.mjs` o `scripts/qa-manual/`).
- Un informe de otro agente que dice «completado» no es evidencia: se mira el artefacto.

**Al entregar** se actualizan la fila de `docs/TAREAS.md`, `docs/ESTADO_ACTUAL.md` si cambió el comportamiento y una entrada breve en `docs/BITACORA.md` que cite la evidencia en `work/`. No se crean informes, tableros, prompts ni handoffs nuevos.

**Blender**: para modelado, escultura, materiales, rig, render o exportación, leer `docs/GUIA_BLENDER_MCP.md` y cumplir su contrato de calidad. Un modelo entregado no es un asset aprobado: entra en `data/` solo tras revisión visual y decisión del creador.

## Agentes

| Agente | Papel |
|---|---|
| **Claude** (coordinador) | Dirige, integra, revisa entregas contra su artefacto, mantiene docs y publica en master |
| **Junie** | Editor del mundo, simulación y sistemas RPG, pruebas, refactors pequeños |
| **OMP programador** (`scripts/mac/omp_programador.sh`) | Tareas de código acotadas |
| **OMP Blender** (`scripts/mac/omp_blender.sh`) | Modelado, escultura, materiales, rig, exportación y validación |
| **Codex** | Integración compleja, herramientas y auditorías independientes |

OMP usa solo Skynet (Qwen3.8-Flash-Next, contexto configurado de 180K) y nunca modelos locales del Mac. El detalle está en `docs/GUIA_BLENDER_MCP.md`.

Las colas viven en `work/prompts-noche/COLA_<AGENTE>.md` y repiten tareas de `TAREAS.md`; no crean tareas nuevas.

### Contrato mínimo de una tarea

Cada encargo, en `TAREAS.md` o en la cola, dice:

1. **ID** estable y **objetivo**, con su porqué.
2. **Autorización**: quién la dio y cuándo.
3. **Archivos** que puede leer, que puede modificar y que no debe tocar.
4. **Dependencias**.
5. **Reglas**: lógica en `src/sim/` o `src/rpg/` con pruebas, sin cambiar cifras, nombres provisionales.
6. **Validación**: comandos y escenario de Electron si aplica.
7. **Evidencia** exigida, en `work/<agente>-<tarea>/`.
8. **Aceptación** verificable.
9. **Bloqueos**: cuándo parar y anotar en vez de improvisar.
10. **Integración**: quién revisa y cómo se publica.
11. **Reanudación**: si la sesión se corta, se lee la fila de `TAREAS.md`, `git log` y la carpeta de `work/`, y se sigue desde el último paso verificado.

## Leer antes de escribir código

1. Las `DEC-*`: `docs/referencias/FRANKMANGAMES.md` (en Windows, `../FrankmanGames/04_VISION_Y_DECISIONES.md`).
2. `docs/diseno/README.md` y `docs/diseno/00_DECISIONES.md`.
3. `docs/ARQUITECTURA.md`.
4. Solo si la tarea lo pide y la carpeta existe (en Mac no existe; ver `docs/referencias/`): `../FrankmanGames/07_PROPUESTA_PROTOTIPO_JUGABLE.md`, `../FrankmanGames/08_CONSOLIDADO_ANALISIS.md`, `../Dofus-ReverseEngineering/guia/GUIA_PROYECTO.md` y las fichas de `../FrankmanGames/fichas/FATE/` y `../Dofus-ReverseEngineering/fichas/`.
