# Bolsa siguiente 4 — propuestas de Junie (2026-11-24)

20 tareas pequeñas derivadas de un barrido sistemático de `tests/` contra `src/`. Son **propuestas**: no están autorizadas, no empiezan sin autorización explícita en `docs/TAREAS.md`.

Cada tarea incluye el criterio de hecho y la evidencia esperada. Ninguna cambia cifras de balance.

**Evidencia del barrido:** `grep -rl "<modulo>" tests/ | wc -l` devuelve 0 para cada módulo listado. El barrido completo se ejecutó el 2026-11-24 contra HEAD (4851/4851 pruebas en verde).

---

### 1. Prueba: `src/render/assetCache.ts` — caché de activos (aciertos, desalojo, carga doble)

- **Por qué:** `assetCache.ts` gestiona la caché de modelos y texturas cargados en memoria. Sin pruebas, un cambio en la política de desalojo puede causar fugas de memoria o recargas innecesarias.
- **Evidencia:** `grep -rl "assetCache" tests/ | wc -l` → 0.
- **Criterio de hecho:** prueba que insertar un activo lo almacena, que leerlo dos veces devuelve la misma referencia, que el desalojo por LRU suelta el menos usado y que una recarga concurrente no duplica la petición.
- **Evidencia:** `npm test` en verde.

### 2. Prueba: `src/render/atmosphere.ts` — niebla, cielo y luz ambiental

- **Por qué:** `atmosphere.ts` controla la apariencia visual del cielo, la niebla y la luz ambiental según la fase del día. Sin pruebas, un cambio en los colores o la intensidad de niebla no se detecta.
- **Evidencia:** `grep -rl "atmosphere" tests/ | wc -l` → 0.
- **Criterio de hecho:** prueba que la fase diurna produce colores cálidos, la nocturna produce azules oscuros, y que la transición interpola suavemente. Verificar que los parámetros de niebla cambian con la fase.
- **Evidencia:** `npm test` en verde.

### 3. Prueba: `src/render/gatherView.ts` — estado visual de recursos (lleno, gastado, rebrotando)

- **Por qué:** `gatherView.ts` muestra el estado visual de los recursos recolectables. Sin pruebas, un cambio en la lógica de estado visual no se detecta.
- **Evidencia:** `grep -rl "gatherView" tests/ | wc -l` → 0.
- **Criterio de hecho:** prueba que un recurso lleno muestra el modelo completo, un gastado muestra el modelo vacío y un rebrotando muestra la transición. Verificar que el estado se sincroniza con la simulación.
- **Evidencia:** `npm test` en verde.

### 4. Prueba: `src/render/gridView.ts` — qué celdas se pintan en la cuadrícula de depuración

- **Por qué:** `gridView.ts` dibuja la cuadrícula de depuración del mundo. Sin pruebas, un cambio en la lógica de visualización no se detecta.
- **Evidencia:** `grep -rl "gridView" tests/ | wc -l` → 0.
- **Criterio de hecho:** prueba que las celdas caminables se pintan en un color, las de obstáculo en otro, y que la cuadrícula se oculta cuando el modo de depuración está apagado.
- **Evidencia:** `npm test` en verde.

### 5. Prueba: `src/render/lootView.ts` — reparto de objetos en el suelo y brillo por rareza

- **Por qué:** `lootView.ts` muestra el botín en el suelo con brillo según rareza. Sin pruebas, un cambio en la lógica de visualización no se detecta.
- **Evidencia:** `grep -rl "lootView" tests/ | wc -l` → 0.
- **Criterio de hecho:** prueba que un objeto común brilla en amarillo, uno raro en azul y uno épico en púrpura. Verificar que la posición en el suelo coincide con la entidad.
- **Evidencia:** `npm test` en verde.

### 6. Prueba: `src/render/npcView.ts` — elección de modelo y orientación hacia el jugador

- **Por qué:** `npcView.ts` gestiona la apariencia de los PNJ y su orientación. Sin pruebas, un cambio en la selección de modelo o la rotación no se detecta.
- **Evidencia:** `grep -rl "npcView" tests/ | wc -l` → 0.
- **Criterio de hecho:** prueba que un PNJ con arquetipo conocido carga el modelo correcto, que se orienta hacia el jugador al interactuar y que el nombre se muestra sobre la cabeza.
- **Evidencia:** `npm test` en verde.

### 7. Prueba: `src/render/petView.ts` — visualización de mascotas

- **Por qué:** `petView.ts` muestra las mascotas invocadas. Sin pruebas, un cambio en la lógica de visualización no se detecta.
- **Evidencia:** `grep -rl "petView" tests/ | wc -l` → 0.
- **Criterio de hecho:** prueba que invocar una mascota crea el modelo, que sigue al jugador y que al morir la mascota el modelo se oculta.
- **Evidencia:** `npm test` en verde.

### 8. Prueba: `src/render/stoneView.ts` y `src/render/zoneBorderView.ts` — piedras y bordes de zona

- **Por qué:** `stoneView.ts` y `zoneBorderView.ts` muestran las piedras de resurrección y los bordes de zona. Sin pruebas, un cambio en la lógica de visualización no se detecta.
- **Evidencia:** `grep -rl "stoneView" tests/ | wc -l` → 0; `grep -rl "zoneBorderView" tests/ | wc -l` → 0.
- **Criterio de hecho:** prueba que una piedra de resurrección se muestra en la posición correcta, que el borde de zona se dibuja como línea y que el aviso de borde aparece al acercarse.
- **Evidencia:** `npm test` en verde.

### 9. Prueba: `src/render/weatherView.ts` — de intensidad del clima a partículas, niebla y luz

- **Por qué:** `weatherView.ts` traduce la intensidad del clima a efectos visuales. Sin pruebas, un cambio en la lógica de partículas o niebla no se detecta.
- **Evidencia:** `grep -rl "weatherView" tests/ | wc -l` → 0.
- **Criterio de hecho:** prueba que lluvia leve produce pocas partículas, lluvia fuerte produce muchas, y que la niebla se intensifica con la tormenta. Verificar que la luz ambiental se atenúa con el clima.
- **Evidencia:** `npm test` en verde.

### 10. Prueba: `src/render/sceneLook.ts` y `src/render/linearFog.ts` — de opciones gráficas a parámetros

- **Por qué:** `sceneLook.ts` y `linearFog.ts` traducen las opciones gráficas a parámetros de escena. Sin pruebas, un cambio en la calidad visual no se detecta.
- **Evidencia:** `grep -rl "sceneLook" tests/ | wc -l` → 0; `grep -rl "linearFog" tests/ | wc -l` → 0.
- **Criterio de hecho:** prueba que calidad baja produce niebla densa y sombras desactivadas, calidad alta produce niebla tenue y sombras activadas. Verificar la interpolación lineal de la niebla.
- **Evidencia:** `npm test` en verde.

### 11. Prueba: `src/render/fx/aimGhosts.ts` — fantasmas de la previa de apuntado

- **Por qué:** `aimGhosts.ts` muestra los fantasmas que indican dónde caerá un hechizo antes de lanzarlo. Sin pruebas, un cambio en la posición o apariencia no se detecta.
- **Evidencia:** `grep -rl "aimGhosts" tests/ | wc -l` → 0.
- **Criterio de hecho:** prueba que un hechizo de cono muestra el fantasma del cono en la dirección correcta, que un hechizo de área muestra el círculo y que el fantasma desaparece al soltar.
- **Evidencia:** `npm test` en verde.

### 12. Prueba: `src/render/fx/statusFx.ts` — efecto visual por estado (veneno, quemado, etc.)

- **Por qué:** `statusFx.ts` asigna efectos visuales a los estados del personaje. Sin pruebas, un cambio en la asignación no se detecta.
- **Evidencia:** `grep -rl "statusFx" tests/ | wc -l` → 0.
- **Criterio de hecho:** prueba que un estado de veneno muestra partículas verdes, un estado de quemado muestra partículas naranjas, y que al quitar el estado las partículas desaparecen.
- **Evidencia:** `npm test` en verde.

### 13. Prueba: `src/ui/hoverLabel.ts` — qué etiqueta sale para cada cosa

- **Por qué:** `hoverLabel.ts` muestra las etiquetas al pasar el cursor sobre entidades. Sin pruebas, un cambio en el texto o la posición no se detecta.
- **Evidencia:** `grep -rl "hoverLabel" tests/ | wc -l` → 0.
- **Criterio de hecho:** prueba que pasar sobre un enemigo muestra su nombre y nivel, pasar sobre un PNJ muestra su nombre y diálogo, y pasar sobre un objeto muestra su nombre y rareza.
- **Evidencia:** `npm test` en verde.

### 14. Prueba: `src/ui/loadingScreen.ts` — progreso y consejos de la pantalla de carga

- **Por qué:** `loadingScreen.ts` muestra el progreso y consejos durante la carga. Sin pruebas, un cambio en el texto o el porcentaje no se detecta.
- **Evidencia:** `grep -rl "loadingScreen" tests/ | wc -l` → 0.
- **Criterio de hecho:** prueba que el progreso empieza en 0%, sube durante la carga y llega al 100% antes de ocultarse. Verificar que los consejos rotan correctamente.
- **Evidencia:** `npm test` en verde.

### 15. Prueba: `src/ui/perfOverlay.ts` y `src/ui/benchHud.ts` — formato de los números de rendimiento

- **Por qué:** `perfOverlay.ts` y `benchHud.ts` muestran las estadísticas de rendimiento. Sin pruebas, un cambio en el formato no se detecta.
- **Evidencia:** `grep -rl "perfOverlay" tests/ | wc -l` → 0; `grep -rl "benchHud" tests/ | wc -l` → 0.
- **Criterio de hecho:** prueba que los FPS se formatean como entero, la memoria como MB con un decimal, y que los colores cambian según el umbral (verde > 50 fps, rojo < 20 fps).
- **Evidencia:** `npm test` en verde.

### 16. Prueba: `src/ui/menus/mountLooks.ts` — lista de aspectos de montura disponibles

- **Por qué:** `mountLooks.ts` muestra los aspectos disponibles para las monturas. Sin pruebas, un cambio en la lista o el filtrado no se detecta.
- **Evidencia:** `grep -rl "mountLooks" tests/ | wc -l` → 0.
- **Criterio de hecho:** prueba que la lista muestra solo los aspectos desbloqueados, que el aspecto actual está marcado y que cambiar de aspecto actualiza la vista previa.
- **Evidencia:** `npm test` en verde.

### 17. Prueba: `src/ui/menus/progressBar.ts` — ancho y texto de la barra de progreso

- **Por qué:** `progressBar.ts` muestra las barras de progreso (carga, habilidades, etc.). Sin pruebas, un cambio en el ancho o el texto no se detecta.
- **Evidencia:** `grep -rl "progressBar" tests/ | wc -l` → 0.
- **Criterio de hecho:** prueba que una barra al 50% tiene el ancho correcto, que el texto muestra el porcentaje y que una barra completa cambia de color.
- **Evidencia:** `npm test` en verde.

### 18. Prueba: `src/ui/menus/questTracker.ts` — orden y texto de las misiones activas

- **Por qué:** `questTracker.ts` muestra las misiones activas y su progreso. Sin pruebas, un cambio en el orden o el texto no se detecta.
- **Evidencia:** `grep -rl "questTracker" tests/ | wc -l` → 0.
- **Criterio de hecho:** prueba que las misiones se ordenan por prioridad, que el texto muestra el objetivo actual y que al completar una misión desaparece de la lista.
- **Evidencia:** `npm test` en verde.

### 19. Prueba: `src/ui/map/minimapDecor.ts` — qué decoración se dibuja según la escala

- **Por qué:** `minimapDecor.ts` dibuja las decoraciones del minimapa (iconos, flechas, etc.). Sin pruebas, un cambio en la decoración no se detecta.
- **Evidencia:** `grep -rl "minimapDecor" tests/ | wc -l` → 0.
- **Criterio de hecho:** prueba que a escala alta se muestran los iconos de PNJ y enemigos, a escala media solo los PNJ y a escala baja ninguno. Verificar que las flechas de misión apuntan en la dirección correcta.
- **Evidencia:** `npm test` en verde.

### 20. Prueba: `src/scenes/cryptScene.ts` — entrada y salida de piso en la cripta

- **Por qué:** `cryptScene.ts` gestiona la escena de la cripta (bajar y subir pisos). Sin pruebas, un cambio en la lógica de transición no se detecta.
- **Evidencia:** `grep -rl "cryptScene" tests/ | wc -l` → 0.
- **Criterio de hecho:** prueba que entrar en la cripta carga el piso 1, que bajar por la escalera carga el piso siguiente y que subir por la escalera regresa al piso anterior. Verificar que el estado se guarda correctamente.
- **Evidencia:** `npm test` en verde.

---

**Nota:** El barrido completo reveló 35 módulos sin pruebas dedicadas. Esta bolsa prioriza los 20 más críticos por impacto en la jugabilidad y la estabilidad. Los restantes (barriadaView, chaserView, interactOutline, modelFiles, mountView, resurrectorView, streetView, terrainView, damageMeterView, inspector, devVisualOptions, hotApply) pueden formar una BOLSA_SIGUIENTE_5.
