# Bolsa siguiente — propuestas de Junie (2026-11-21)

15 tareas pequeñas derivadas de hallazgos durante la tanda JL-59…JL-107. Son **propuestas**: no están autorizadas, no empiezan sin autorización explícita en `docs/TAREAS.md`.

Cada tarea incluye el criterio de hecho y la evidencia esperada. Ninguna cambia cifras de balance.

---

### JL-109 Escenario `muerte_y_revivir`: morir, revivir en la Piedra, comprobar música y HUD

- **Por qué:** QA-01 y JL-107 muestran que el escenario `muerte` pasa, pero no verifica que tras revivir la música vuelva a la del pueblo (JL-24 lo prueba con Vitest, no en Electron) ni que el HUD se repinta sin solapes.
- **Criterio de hecho:** escenario nuevo en `scripts/qaElectron.mjs` que mata al jugador, espera la reaparición, comprueba `contextMusic.active === 'village'`, que el HUD no tiene solapes y que la consola no tiene errores.
- **Evidencia:** captura en `work/junie-jl-109/` del personaje en la Piedra con el HUD correcto.

### JL-110 Escenario `lancha`: cruzar entre Iguanera y Pedasol sin errores

- **Por qué:** `aprendizaje` falla en el cruce de lancha (JL-81, 2/23). El error de `postProcessManager` de Babylon aparece al cambiar de escena. Verificar si es reproducible en un escenario dedicado.
- **Criterio de hecho:** escenario que viaja en lancha Iguanera → Pedasol → Iguanera, comprueba que el contexto musical cambia y que no hay errores de consola.
- **Evidencia:** captura en `work/junie-jl-110/` y log de consola.

### JL-111 `assets.test.ts`: registrar los GLB de ranas que OMP publicó

- **Por qué:** el único fallo pre-existente de la suite (`assets.test.ts`) es que los GLB de ranas (`rana_venenosa.glb`, etc.) no están registrados en `data/assets.json`. OMP los publicó en FA-07 (JL-72).
- **Criterio de hecho:** `assets.test.ts` en verde sin relajar la prueba. Solo añadir las filas faltantes en `assets.json`.
- **Evidencia:** `npm test` en verde, diff de `assets.json`.

### JL-112 `balM3.ts`: typecheck limpio

- **Por qué:** `scripts/balance/balM3.ts` tiene 4 errores de typecheck (`ClassInfo | undefined`, `SpellInfo | undefined`) que ensucian `npm run typecheck` en cada commit. Es un script ajuno, pero el arreglo es añadir los guards que faltan.
- **Criterio de hecho:** `npx tsc --noEmit` sin errores en `balM3.ts`.
- **Evidencia:** salida de typecheck limpia.

### JL-113 Escenario `editorMazmorra`: colocar y borrar un objeto en el editor de mazmorras (ED-03)

- **Por qué:** ED-03 añadió el editor de pisos de mazmorra, pero no hay escenario Electron que verifique la interacción completa: abrir editor, colocar objeto, ▶ Probar, caminar sobre el objeto, ⏹ Stop, verificar que el objeto persiste.
- **Criterio de hecho:** escenario nuevo que completa el ciclo editor → probar → stop → verificar.
- **Evidencia:** capturas en `work/junie-jl-113/`.

### JL-114 Escenario `compendio`: abrir compendio, buscar criatura, ver ficha con resistencias y visor 3D

- **Por qué:** JL-41, JL-42 y JL-47 rehicieron el compendio, pero no hay escenario QA que verifique la ventana completa: lista, búsqueda, ficha de criatura con resistencias coloreadas y visor 3D girando.
- **Criterio de hecho:** escenario que abre el compendio, busca una criatura conocida, verifica que la ficha muestra las 6 resistencias con badges y que el visor 3D existe en el DOM.
- **Evidencia:** capturas en `work/junie-jl-114/`.

### JL-115 Escenario `opciones`: cambiar idioma, volumen, modo de cámara y modo de lanzar, guardar y recargar

- **Por qué:** varios escenarios fallan porque el idioma queda en inglés (JL-50). Un escenario dedicado a Opciones verifica que los cambios persisten y que no hay efectos secundarios.
- **Criterio de hecho:** escenario que cambia cada opción, guarda, recarga la página y verifica que cada valor se recuperó.
- **Evidencia:** capturas en `work/junie-jl-115/`.

### JL-116 Escenario `criptaPiso100`: bajar al piso 100 con el portero y volver con el hilo

- **Por qué:** `mazmorraHonda` no arranca (JL-51). Un escenario dedicado que usa el portero (DUN-03) para ir directo al piso 100 y vuelve con el hilo de retorno (DUN-01) verifica el flujo completo.
- **Criterio de hecho:** escenario que habla con el portero, elige piso 100, verifica que el jugador está en el piso 100, usa el hilo de retorno y verifica que vuelve a la superficie.
- **Evidencia:** capturas en `work/junie-jl-116/`.

### JL-117 Prueba: `rankLadder` con `maxRank` 6 y niveles de aprendizaje tardíos (>150)

- **Por qué:** HZ-02 subió a 6 rangos y HZ-03 puso hechizos que se aprenden en el nivel 200. `rankLadder()` debe devolver niveles estrictamente crecientes y nunca mayores que `maxLevel`. HZ-03-fix lo clamped, pero no hay prueba específica para un hechizo aprendido en 200 con 6 rangos.
- **Criterio de hecho:** prueba que un hechizo aprendido en 200 con maxRank 6 devuelve solo [{rank:1, level:200}] (no hay espacio para rangos 2–6).
- **Evidencia:** `npm test` en verde.

### JL-118 Prueba: `content:check` falla si un hechizo nuevo referencia un efecto no registrado

- **Por qué:** HZ-04b añadió efectos nuevos (chain, bonusVsStatus, selfStack, etc.). Si alguien escribe un hechizo con un efecto inexistente, `content:check` debería detectarlo. Verificar que el script valida los tipos de efecto.
- **Criterio de hecho:** prueba con datos sintéticos: un hechizo con `effects: [{type: "inexistente"}]` hace fallar `content:check`.
- **Evidencia:** `npm test` en verde.

### JL-119 Prueba: el Buhonero de pruebas no aparece en una partida normal (solo `npm run dev`)

- **Por qué:** MER-01 creó el Buhonero, pero QA encontró que salía duplicado y fuera de desarrollo. Verificar que en una partida normal (sin marca de dev) el PNJ no existe.
- **Criterio de hecho:** prueba que crea una sesión sin `devMode` y verifica que `npcs.json` no contiene `dev_buhonero` y que la tienda no está disponible.
- **Evidencia:** `npm test` en verde.

### JL-120 Prueba: al equipar un objeto de nivel 200 con nivel insuficiente, no se puede usar

- **Por qué:** IT-01 creó objetos hasta nivel 200. Verificar que un personaje de nivel 1 no puede equipar un objeto de nivel 200 (o que el juego lo rechaza con un aviso claro).
- **Criterio de hecho:** prueba que intenta equipar un objeto de nivel 200 con un personaje de nivel 1 y verifica que el equipo no cambia y hay un mensaje de error.
- **Evidencia:** `npm test` en verde.

### JL-121 Escenario `guardadoCargar`: guardar en la cripta piso 5, cerrar y recargar, verificar que se carga en el piso 5

- **Por qué:** DUN-02 implementó el guardado de la mazmorra, pero no hay escenario Electron que verifique el ciclo completo: entrar a cripta, bajar al piso 5, guardar, cerrar Electron, recargar, cargar la partida y verificar que el jugador está en el piso 5.
- **Criterio de hecho:** escenario que completa el ciclo guardar → recargar → cargar → verificar piso.
- **Evidencia:** capturas en `work/junie-jl-121/`.

### JL-122 Prueba: las reacciones elementales no se activan con `devReactions: false`

- **Por qué:** HZ-04b-reacciones puso las reacciones detrás de `devReactions`, apagada por defecto. Verificar que con la opción apagada, golpear con elementos distintos no dispara reacciones.
- **Criterio de hecho:** prueba con simulador: dos golpes de elementos distintos sobre el mismo objetivo con `devReactions: false` no emiten evento `reaction`.
- **Evidencia:** `npm test` en verde.

### JL-123 Prueba: `hotbarFillOrder` con 30 slots y 3 filas cubre todos los slots

- **Por qué:** BAR-01 subió a 30 slots (3 filas). Verificar que `hotbarFillOrder` con un personaje de nivel 200 y todos los hechizos aprendidos llena los 30 slots sin repetir ni saltar.
- **Criterio de hecho:** prueba que `hotbarFillOrder` devuelve 30 entradas únicas, cada una con un spellId distinto y un slot entre 0 y 29.
- **Evidencia:** `npm test` en verde.
