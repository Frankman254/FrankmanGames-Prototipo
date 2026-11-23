# Bolsa siguiente 2 — propuestas de Junie (2026-11-23)

20 tareas pequeñas derivadas de hallazgos durante la tanda JL-152…JL-180. Son **propuestas**: no están autorizadas, no empiezan sin autorización explícita en `docs/TAREAS.md`.

Cada tarea incluye el criterio de hecho y la evidencia esperada. Ninguna cambia cifras de balance.

---

### 1. Prueba: `src/sim/navGrid.ts` — construcción y consulta de la cuadrícula de navegación

- **Por qué:** `navGrid.ts` (36 líneas de exports) no tiene archivo de pruebas dedicado. Es el módulo que construye la cuadrícula de caminabilidad usada por el pathfinder y los enemigos. Un error aquí afecta movimiento, IA y colocación de objetos.
- **Evidencia:** `grep "navGrid" tests/` no devuelve pruebas propias del módulo (solo las usa indirectamente).
- **Criterio de hecho:** prueba que construye una cuadrícula sintética con obstáculos, verifica que `isWalkable` devuelve lo esperado en bordes, que `nearestWalkable` encuentra la baldosa caminable más cercana y que la cuadrícula se invalida al cambiar el mapa.
- **Evidencia:** `npm test` en verde.

### 2. Prueba: `src/sim/pathfinder.ts` — rutas entre puntos con obstáculos

- **Por qué:** `pathfinder.ts` no tiene pruebas dedicadas. Es el algoritmo de ruta que usan los enemigos para perseguir al jugador y el jugador para los accesos. Sin pruebas, un cambio en la lógica de ruta no se detecta.
- **Criterio de hecho:** prueba con mapas sintéticos: ruta directa, ruta con obstáculo que rodear, ruta imposible (sin conexión), y ruta en L. Verificar longitud mínima y que no atraviesa paredes.
- **Evidencia:** `npm test` en verde.

### 3. Prueba: `src/sim/spatialHash.ts` — partición espacial para colisiones

- **Por qué:** `spatialHash.ts` no tiene pruebas. Es la estructura que acelera las consultas de proximidad (enemigos cercanos, proyectiles, áreas de efecto). Un bug aquí causa que enemigos no detecten al jugador o que los efectos de área fallen.
- **Criterio de hecho:** prueba que inserta entidades en celdas, consulta por radio y devuelve solo las que están dentro del radio. Verificar que mover una entidad la saca de la celda vieja y la pone en la nueva.
- **Evidencia:** `npm test` en verde.

### 4. Prueba: `src/sim/rng.ts` — generador de números aleatorios determinista

- **Por qué:** `rng.ts` no tiene pruebas. Si el juego usa seed para reproducibilidad (loot, encuentros), un cambio en el RNG rompe la determinística. Verificar que la secuencia es determinista con la misma seed.
- **Criterio de hecho:** prueba que con la misma seed, `next()` produce la misma secuencia; que `next(min, max)` está en rango; y que dos instancias con seed distinta producen secuencias distintas.
- **Evidencia:** `npm test` en verde.

### 5. Prueba: `src/sim/vec2.ts` — operaciones vectoriales 2D

- **Por qué:** `vec2.ts` no tiene pruebas. Es el tipo básico de coordenadas usado en movimiento, colisiones y posicionamiento. Funciones como `dist`, `angle`, `normalize` son críticas.
- **Criterio de hecho:** prueba add, sub, mul, dist, angle, normalize, lerp con valores conocidos. Verificar que `dist(a, a) === 0` y que `normalize` da vector unitario.
- **Evidencia:** `npm test` en verde.

### 6. Prueba: `src/sim/shapes.ts` — formas geométricas para áreas de efecto

- **Por qué:** `shapes.ts` no tiene pruebas. Define círculos, rectángulos y conos para áreas de efecto de hechizos. Un error en la intersección forma/entidad hace que los hechizos de área fallen.
- **Criterio de hecho:** prueba que un punto dentro de un círculo devuelve true, uno fuera devuelve false; que un cono de 90° incluye puntos dentro del ángulo y excluye los de fuera.
- **Evidencia:** `npm test` en verde.

### 7. Prueba: `src/rpg/energy.ts` — gestión de energía y fatiga

- **Por qué:** `energy.ts` no tiene pruebas dedicadas. Controla la energía del jugador (usada para correr, saltar, etc.). Sin pruebas, un cambio en la fórmula de recuperación puede romper el balance.
- **Criterio de hecho:** prueba que gastar energía reduce el valor, que no baja de 0, que la recuperación por tick respeta el máximo y que la fatiga extra (si existe) se aplica correctamente.
- **Evidencia:** `npm test` en verde.

### 8. Prueba: `src/rpg/hinder.ts` — estados de impedimento

- **Por qué:** `hinder.ts` no tiene pruebas. Los estados de impedimento (ralentizado, aturdido, etc.) afectan el combate. Sin pruebas, un cambio en la duración o la prioridad de estados puede romper la jugabilidad.
- **Criterio de hecho:** prueba que aplicar un impedimento lo registra, que expira al terminar la duración, que un impedimento más fuerte reemplaza al débil y que dos impedimentos del mismo tipo no se apilan.
- **Evidencia:** `npm test` en verde.

### 9. Prueba: `src/rpg/items.ts` — lógica de objetos (sin cambiar cifras)

- **Por qué:** `items.ts` (683+ líneas) no tiene pruebas dedicadas. Funciones como `canEquip`, `equip`, `unequip`, `useItem` son críticas para la mochila y el equipo.
- **Criterio de hecho:** prueba que equipar un objeto en un hueco libre lo coloca, que equipar en un hueco ocupado lo reemplaza, que usar una poción resta una unidad y que un objeto roto no se puede usar.
- **Evidencia:** `npm test` en verde.

### 10. Prueba: `src/rpg/spoils.ts` — botín y saqueo

- **Por qué:** `spoils.ts` (44+ líneas) no tiene pruebas. Controla cómo se genera y recoge el botín de los enemigos. Sin pruebas, un cambio en la tabla de botín no se detecta.
- **Criterio de hecho:** prueba que un enemigo muerto genera botín según su tabla, que `collect()` lo recoge y emite `lootPickup`, y que el botín parcial (cuando la mochila está llena) deja el resto en el suelo.
- **Evidencia:** `npm test` en verde.

### 11. Prueba: `src/rpg/stats.ts` — cálculo de estadísticas derivadas

- **Por qué:** `stats.ts` (70+ líneas) no tiene pruebas. Calcula las estadísticas derivadas del personaje (ataque, defensa, resistencia) a partir de las características base y el equipo.
- **Criterio de hecho:** prueba que un personaje sin equipo tiene las stats base de su clase, que equipar un objeto con bonus lo suma, y que los topes (como `resistCap`) se aplican.
- **Evidencia:** `npm test` en verde.

### 12. Prueba: `src/rpg/status.ts` — estados del personaje

- **Por qué:** `status.ts` no tiene pruebas. Gestiona los estados activos del personaje (veneno, quemado, etc.) con sus duraciones y efectos por tick.
- **Criterio de hecho:** prueba que aplicar un estado lo registra con duración, que cada tick reduce la duración y aplica el efecto, y que al llegar a 0 el estado se elimina.
- **Evidencia:** `npm test` en verde.

### 13. Prueba: `src/rpg/pets.ts` — mascotas y compañeros

- **Por qué:** `pets.ts` no tiene pruebas. Controla las mascotas invocables (como la del amuleto). JL-132 encontró un bug de syncPets que se resolvió con `until()`, pero la lógica de mascotas no está probada directamente.
- **Criterio de hecho:** prueba que invocar una mascota la añade al mundo, que sigue al jugador, que ataca al enemigo del jugador y que al morir el jugador la mascota desaparece.
- **Evidencia:** `npm test` en verde.

### 14. Prueba: `src/rpg/professions.ts` — profesiones y oficios

- **Por qué:** `professions.ts` no tiene pruebas. Controla las profesiones (pesca, minería, etc.) y su progresión. Sin pruebas, un cambio en la fórmula de experiencia de oficio no se detecta.
- **Criterio de hecho:** prueba que realizar una acción de oficio da XP de profesión, que subir de nivel de profesión desbloquea la habilidad siguiente y que el nivel máximo se respeta.
- **Evidencia:** `npm test` en verde.

### 15. Prueba: `src/world/boats.ts` — lanchas y transporte marítimo

- **Por qué:** `boats.ts` no tiene pruebas. JL-136 creó el escenario `lancha` para verificar el cruce, pero la lógica de las lanchas (movimiento, puntos de llegada, cambio de contexto) no está probada directamente.
- **Criterio de hecho:** prueba que una lancha en el punto A espera al jugador, que al subir comienza la travesía, que al llegar al punto B el contexto cambia y que la lancha vuelve sola.
- **Evidencia:** `npm test` en verde.

### 16. Prueba: `src/world/cartography.ts` — exploración y mapa

- **Por qué:** `cartography.ts` no tiene pruebas. Controla la exploración del mapa (fog of war, porcentaje explorado). Q09-fix ya verificó que `fog.explored` funciona, pero la lógica de cartografía no está probada directamente.
- **Criterio de hecho:** prueba que moverse por una zona marca las baldosas como exploradas, que el porcentaje explorado se calcula correctamente y que al cambiar de zona el mapa se actualiza.
- **Evidencia:** `npm test` en verde.

### 17. Prueba: `src/world/locomotion.ts` — movimiento del personaje

- **Por qué:** `locomotion.ts` no tiene pruebas. J5 y J5-fix ya tocaron `moveSpeed` y `pickGait()`, pero la lógica de locomoción (caminar, correr, saltar) no está probada directamente.
- **Criterio de hecho:** prueba que `pickGait()` elige walk cuando la velocidad es baja, run cuando es alta, y que la transición entre gait es suave. Verificar que el salto se activa solo en terreno válido.
- **Evidencia:** `npm test` en verde.

### 18. Escenario `pesca`: verificar el minijuego de pesca en Electron

- **Por qué:** `src/sim/fishing.ts` existe pero no hay escenario QA dedicado. El minijuego de pesca (si está implementado) no se verifica en Electron.
- **Criterio de hecho:** escenario que se acerca a un punto de pesca, abre el minijuego, completa una pesca exitosa y verifica que el objeto aparece en la mochila.
- **Evidencia:** capturas en `work/junie-escenario-pesca/`.

### 19. Escenario `profesiones`: verificar un oficio (minería o recolección) en Electron

- **Por qué:** `src/sim/gathering.ts` existe pero no hay escenario QA dedicado. Los oficios (minería, recolección) no se verifican en Electron.
- **Criterio de hecho:** escenario que se acerca a un nodo de recursos, abre el oficio, completa la recolección y verifica que los recursos aparecen en la mochila.
- **Evidencia:** capturas en `work/junie-escenario-profesiones/`.

### 20. `content:check`: verificar que todos los PNJ de `data/rpg/npcs.json` tienen posición en `data/zones.json` o en un mapa

- **Por qué:** `content:check` ya valida ids únicos y referencias básicas, pero no verifica que cada PNJ tenga una posición válida en el mundo. Un PNJ sin posición no aparece y las misiones que lo requieren fallan silenciosamente.
- **Criterio de hecho:** prueba con datos sintéticos: un PNJ sin posición en ninguna zona hace fallar `content:check`. Verificar que los PNJ reales de `data/rpg/npcs.json` tienen posición.
- **Evidencia:** `npm test` en verde y `npm run content:check` en verde.
