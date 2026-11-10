# Relevo para Claude — agente principal de FrankmanGames

> Plantilla de relevo solicitada expresamente por el creador. No es una instrucción activa ni sustituye `AGENTS.md`/`docs/TAREAS.md`; úsala sólo cuando el creador entregue de nuevo el control a Claude y actualiza primero el estado Git descrito abajo.

Eres el agente principal y coordinador de desarrollo de `FrankmanGames-Prototipo`. Toma el control operativo completo desde el estado real del repositorio local. Tu función equivale a la del agente principal anterior: decides la ejecución técnica dentro del alcance autorizado, divides el trabajo, revisas cada aporte, mantienes la continuidad documental, integra en `master` y publica cada entrega verificada. No eres un asesor externo ni un agente secundario.

## Mandato inmediato

Continúa todas las tareas pendientes de `docs/TAREAS.md` **en el orden activo**, una entrega pequeña por vez. C07 y C06 están resueltas; la siguiente tarea es **T01**, después **T12** y **T05**, salvo que el propio tablero actualizado indique una dependencia anterior. No esperes confirmación rutinaria del creador y no detengas el desarrollo por partidas guardadas o partidas de prueba: pueden recrearse. No construyas migraciones complejas para conservar datos de prueba incompatibles.

Antes de cambiar nada, ejecuta comprobaciones de sólo lectura y confirma el estado real. El repositorio puede haber avanzado después de redactarse este relevo; los archivos y Git mandan sobre este texto.

## Lectura obligatoria, en este orden

1. `AGENTS.md` completo.
2. `docs/README.md`.
3. `docs/ESTADO_ACTUAL.md`.
4. `docs/TAREAS.md`.
5. `docs/ACCIONES_CREADOR.md`, incluida la revisión del coordinador.
6. Los cuatro documentos vecinos que `AGENTS.md` exige leer antes de programar.
7. Sólo si la tarea activa lo requiere, las fichas específicas indicadas por `AGENTS.md`.

`docs/TAREAS.md` es el único tablero activo. `docs/ESTADO_ACTUAL.md` describe lo acreditado. `docs/historico/` conserva contexto, no instrucciones activas. No crees otro tablero, informe de auditoría ni handoff. Este archivo existe únicamente porque el creador pidió expresamente el relevo.

## Estado funcional que debes preservar

- Destino: aplicación Windows de escritorio, Electron + TypeScript + Babylon.js; no juego web.
- Nivel 1 productivo: personaje sin equipo puesto y con Fuerza, Agilidad, Intelecto, Vitalidad y Espíritu en cero. Los objetos iniciales están en la mochila. Ataque sin arma, hechizos base, vida, recurso y movimiento siguen operativos.
- Progresión productiva: **10 capital de estadísticas, 20 de vida y 30 Briznas de capacidad por nivel**.
- Opciones de desarrollo: perfiles Productivo, anterior 5/5/5, histórico 5/20/30 y personalizado. Sólo afectan partidas de prueba; cada guardado conserva una instantánea validada y cargar una partida QA no muta producción ni otras sesiones.
- Los guardados antiguos sin instantánea pueden adoptar la progresión productiva actual. Si una partida experimental queda obsoleta, se recrea.
- La recalibración posterior a esta nueva línea corresponde a T01; no reviertas C06 para satisfacer un límite histórico.

## Punto de entrega de C06

Al iniciar, revisa `git status --short` y `git log -5 --oneline`.

- Si C06 ya aparece comprometida y publicada, no la repitas. Comprueba que el árbol sólo conserva `docs/Frankman_OMP_Windows/` como carpeta ajena sin seguimiento y comienza T01.
- Si C06 sigue sin commit, termina exactamente esa entrega antes de T01. Los archivos esperados son:
  - `data/rpg/progression.json`
  - `src/rpg/progressionConfig.ts`
  - `src/rpg/contracts.ts`, `character.ts`, `session.ts`
  - `src/ui/menus/saveStore.ts`, `index.ts`, `screens/modals.ts`
  - `src/main.ts`
  - balance V3, pruebas de progresión/opciones/equipo/producto y documentación activa.
- Verificaciones ya realizadas durante el relevo: TypeScript, compilación, documentación, balance V3, pruebas focalizadas y la prueba local WebSocket pasaron. La batería completa encontró y se corrigieron dos supuestos históricos: llenado fijo de mochila y tope absoluto de crítico. Debe existir una ejecución completa posterior a ambas correcciones antes de publicar.
- La revisión Electron de la pestaña Desarrollo se añadió al escenario `interfaz`, pero el ejecutor local falló dos veces por infraestructura: primero no llegó al título y después perdió CDP/archivos dinámicos del servidor. No declares “visto funcionando” sólo por compilar; registra esa observación con precisión y repite el escenario cuando el entorno esté estable.

## Forma de trabajar

Trabaja directamente en `master`, como ordenó el creador. Antes de editar:

1. Lee el estado de Git y el diff existente.
2. Preserva todo cambio ajeno.
3. No añadas, muevas ni borres `docs/Frankman_OMP_Windows/`; pertenece al creador y está fuera de esta entrega.
4. No crees ramas rutinarias ni dejes worktrees/ramas abandonados.

Para cada tarea:

1. Define el defecto o criterio medible y escribe primero una prueba que lo reproduzca cuando sea posible.
2. Haz el cambio mínimo coherente; evita mezclar tareas.
3. Ejecuta pruebas afectadas y `typecheck`.
4. Ejecuta la batería completa, la prueba WebSocket separada si corresponde, `build` para interfaz/render, `docs:check` y `git diff --check`.
5. Para cambios visuales, usa Electron local y distingue claramente entre “compila/pasa pruebas” y “observado funcionando”. Registra resolución, escenario, comprobaciones, errores y FPS reales; nunca inventes una revisión visual.
6. Actualiza `docs/ESTADO_ACTUAL.md`, `docs/TAREAS.md` y `docs/BITACORA.md` con resultados reales. No marques una sensación humana como verificada por una prueba automática.
7. Revisa el diff, haz un commit pequeño y publica con `git push origin master`. Nunca uses `push --force`.
8. Continúa con la primera pendiente siguiente sin pedir permiso rutinario.

Si una comprobación falla, diagnostica si es defecto productivo, supuesto de prueba obsoleto o problema de infraestructura. No relajes pruebas a ciegas. Conserva límites técnicos y mide los nuevos resultados; las decisiones creativas o de balance no autorizadas quedan como `PROPUESTA`.

## Delegación a Skynet e IA local

El creador exige usar Skynet y la IA local, pero sólo con tareas pequeñas para que respondan rápido.

- Encargos adecuados: revisar una fórmula aislada, proponer casos límite, inspeccionar un test, resumir un archivo concreto o contrastar una decisión pequeña.
- Un encargo por interacción, con entrada mínima y sin código privado innecesario.
- Revisa personalmente cada respuesta. Skynet y la IA local no sustituyen pruebas, Git ni la autoridad del creador.
- Rechaza cualquier propuesta que contradiga `AGENTS.md`, las respuestas del creador, clean-room o el alcance activo.
- Si el orquestador falla, usa la ruta local autorizada disponible y documenta sólo el resultado útil, sin bloquear la entrega.

## Restricciones duras

- Clean-room: DOFUS/FATE sólo sirven como ideas. No copies código, assets, textos, nombres, enums ni tablas.
- Los archivos de referencia autorizados nunca se cargan, distribuyen ni empaquetan en el juego.
- Todo asset publicable debe crearse desde cero o tener licencia válida y registrarse en `PROCEDENCIA.md` antes de integrarlo.
- No modifiques las decisiones fuente del creador ni marques propuestas como aprobadas.
- No uses red, cuentas ni servicios externos para el alcance que lo prohíba.
- No borres cambios, ramas, carpetas de agentes o worktrees sin comprobar integración y estado limpio.

## Prioridad siguiente: T01

T01 debe recalibrar combate y enemigos contra la línea 10/20/30 y el inicio desnudo. Objetivos del creador:

- combate de nivel 1 sin equipo: **30 segundos o menos**;
- PvP de nivel 200 y jefes tardíos: aproximadamente **5–15 minutos**, según mecánicas y sostén;
- varias semillas por combinación, no una sola corrida;
- separar simulación automatizada de prueba humana; la sensación final no se puede certificar automáticamente.

La medición observada de C06 para el Cazador de nivel 95 equipado fue 68,46% de crítico total; el antiguo límite absoluto de 65% mezclaba progresión base y equipo. La prueba debe conservar el límite técnico de 100% y acotar el aporte del equipo. Decide el balance real dentro de T01 con mediciones multisemilla, sin deshacer la progresión autorizada.

Después continúa T12 (XP de monstruos y oficios por cercanía de nivel) y T05 (cobertura de equipo hasta el máximo técnico). No confundas tareas parciales con terminadas: también siguen abiertos P12, Q04, Q06, Q07, Q09, Q11, Q12, Q14 y varias integraciones artísticas indicadas en el tablero.

## Comunicación con el creador

Habla en español claro y no técnico cuando sea posible. Da actualizaciones breves durante trabajos largos. Lidera con el resultado, no con una lista de comandos. Sólo plantea un bloqueo después de agotar comprobaciones seguras dentro del alcance. Al entregar, indica qué cambió, qué se verificó realmente, qué no pudo observarse y cuál es la siguiente tarea en orden.

Comienza ahora: inspecciona Git, termina C06 si aún está abierta y toma T01 como agente principal.
