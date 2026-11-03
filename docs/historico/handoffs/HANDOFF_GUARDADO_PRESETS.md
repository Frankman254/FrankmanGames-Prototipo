# HANDOFF — Guardado con lugar, partidas de prueba y medidor de daño

- **Objetivo autorizado:** el creador quiere «probar el juego a la perfección». Para eso pidió:
  - más ranuras de guardado;
  - que el guardado recuerde el sitio: x,y, mundo abierto o mazmorra con su piso;
  - partidas de prueba con distintas franjas de nivel, sets, elementos, builds y hechizos, para ver cómo se comporta el juego y cuánto daño se hace;
  - que en la mazmorra suene una canción que tiene en local.
- **Rama:** `guardado-presets`, sacada de `master` (9cd8076). Sin fusionar y sin PR.

## Qué funciona (con cómo probarlo)

### 1. Doce ranuras

`SLOT_COUNT` = 12 en `src/ui/menus/saveStore.ts`. Las claves `frankmangames.save.0..2` de antes siguen siendo las tres primeras, así que no se pierde nada.

- La lista de «Guardar partida» y «Cargar partida» se desplaza (`.slot-list-scroll`).
- Cada fila enseña:
  - el nombre de la ranura;
  - el personaje si el nombre es distinto;
  - clase, nivel, sitio (zona o piso de la cripta, con ⛫ si es mazmorra), fecha y tiempo jugado.
- **Renombrar:** el nombre se edita en el sitio. Intro guarda y Esc cancela. Si se deja vacío, vuelve al nombre del personaje.
  - Va a `SaveData.label` (máximo 40 caracteres, sin caracteres de control).
  - Volver a guardar en la misma ranura conserva el nombre.

### 2. El guardado lleva el lugar

`SaveData.place` es un `SavePlace` nuevo en `src/rpg/contracts.ts`. El contrato sólo crece. Guarda:

- `scene` (`overworld` | `dungeon`), `dungeon` y `floor`;
- `x`, `y`;
- `stone`: la Piedra Pintada activa;
- `knownStones`;
- `timeOfDay` (hora del día) y `playSeconds`;
- `name`: el rótulo del sitio.

Cómo fluye:

- `main.ts` se lo da a la sesión con `session.placeProvider`.
- `GameSession.save()` lo incluye.
- `RpgSessionFactory.load()` lo deja en `session.startPlace`.

**Al cargar,** `src/world/placement.ts` decide dónde aparece el jugador (`resolvePlace`, lógica pura):

- **Mundo abierto con casilla caminable:** exactamente ahí. El `World` se crea con ese `playerStart`, así que los monstruos salen lejos como siempre.
- **Mazmorra con piso existente:** se entra al piso. `CryptScene.enter` acepta ahora una posición. Si no se puede pisar, va a la casilla caminable más cercana. Sin posición, a la llegada del piso.
- **El sitio ya no existe** (piso quitado, fuera del mundo, casilla bloqueada): a la **Piedra Pintada conocida más cercana**, con un aviso.
- **También se restauran:** la hora del día (`Atmosphere.setTimeOfDay`), las piedras conocidas, la de reaparición y el tiempo jugado.

**Migración** (`migrateSave`, se aplica en cada `read`):

- Un guardado sin `place` aparece en su piedra de reaparición. La saca de `frankmangames.piedras.<nombre>`, donde se guardaba aparte; si no hay nada, en la de partida.
- Un `place` o un `label` rotos se descartan sin perder la partida.

**Probarlo:** guardar dentro de la cripta, salir al título y cargar. Se vuelve al mismo piso y punto. Lo verifiqué en Chromium headless: piso 3, (36,75; 48,75) antes y después.

### 3. Partidas de prueba

- **Dónde:** botón «Partidas de prueba» en el título y en la pausa.
- **Cuándo aparece:**
  - con `npm run dev` (`import.meta.env.DEV`);
  - en un build, con la marca `localStorage['frankmangames.dev'] = '1'` o `?pruebas` en la URL.
- **Cómo se carga:** un clic en «Jugar». La partida no ocupa ranura; se guarda a mano desde la pausa.

**Datos:** `data/dev/presets.json` tiene 13 partidas (PROPUESTA: son bancos de prueba, no balance). Cada una fija:

- clase, nivel y puntos repartidos (lo que sobra queda libre);
- equipo por hueco, con `bonus` opcionales: tiradas extra de prueba para resistencias y daño elemental;
- `rollQuality` (0–1): tiradas fijas para que dos pruebas den lo mismo;
- hechizos aprendidos con rango y la barra;
- mochila, mascota invocada y monedas;
- lugar: una zona (busca un punto caminable que sea de verdad de esa zona) o `dungeon` + `floor`;
- hora del día.

Las 13 partidas:

| Grupo | Partida | Para qué |
|---|---|---|
| baja | Brasa pura 5 · Tormenta pura 5 · Curandera 8 | fuego puro, tormenta pura (set del Aprendiz 3/3), curación y apoyo, en Azuero |
| media | Tanque 15 · Escarcha pura 15 · Mixta 12 | resistencias, escarcha pura, mezcla de fuego, tierra y físico, en Chame |
| alta | Brasa 20 · Tormenta 20 · Tormenta y escarcha 20 | techo de nivel con tiradas al máximo, en Boquete y Cerro Punta |
| especial | Nivel 3 en el Barú · Tanque 20 en el Barú · Cripta piso 1 · Cripta piso del guardián | nivel bajo en zona alta, defensa al tope en zona alta, mazmorra y jefe |

**Código:**

- `src/dev/presets.ts` lee el archivo.
- `presetProblems` comprueba cada partida contra el contenido de hoy. Los problemas salen por consola al arrancar.
- `buildPresetSave` hace un `SaveData` normal: la carga pasa por `Character.fromSave`, como cualquier guardado.

### 4. Medidor de daño

Sólo con las herramientas de prueba activas. Se abre y cierra con la tecla **Fin**.

- **Lógica:** `src/sim/damageMeter.ts`, pura. Se alimenta de los mismos sucesos de `World` que la telemetría.
- **Panel:** `src/ui/dev/damageMeterView.ts`, a la izquierda, centrado.
- **Qué mide:**
  - DPS hecho: medio y de los últimos 5 s;
  - DPS recibido y curación por segundo;
  - totales;
  - golpe más alto hecho y recibido (con hechizo y si fue crítico);
  - desglose por hechizo: daño, %, golpes, críticos y máximo;
  - tiempo en matar: del primer golpe del jugador o de sus mascotas a la muerte; último, media, mínimo, máximo y las 4 últimas muertes.
- **Reloj:** el reloj propio no vuelve a cero al cambiar de piso.
- **Reinicio:** botón «Reiniciar». También se reinicia al cargar otra partida.

### 5. Música local de pruebas

Sólo con `npm run dev`.

1. Pon canciones en `Desktop/2026/FrankmanGames-MusicaPruebas/` (fuera del repositorio; otra carpeta con la variable `FMG_MUSIC_DIR`). Vite las sirve en `/__local-music/` sólo en desarrollo.
2. Crea `local.json` en esa misma carpeta, por ejemplo:

   ```json
   { "dungeon": "Fate Undiscovered Realms music Part 4.mp3", "_volume": 0.7 }
   ```

**Claves,** de más a menos concreta:

- en la cripta: `crypt-<piso desde 1>`, `crypt` y `dungeon`;
- fuera: el id de la zona (`azuero`, `chame`…) y `overworld`.

**Comportamiento:**

- La canción suena en bucle por el bus de música, así que respeta el volumen de música de las opciones.
- La música generada se apaga mientras suena y vuelve al salir.
- Sin el archivo, o sin clave para el sitio, todo suena como antes.
- `_volume` (0–2) ajusta la ganancia de las canciones locales.

**Qué comprobé** (en Chromium headless, con un WAV sintético renombrado):

- fuera de la cripta: ninguna canción local, música generada a 1,00;
- en el piso 1: suena la canción local y la generada baja a 0,01;
- al salir: vuelta a la música generada (1,00).

**Fuera del build:**

- `src/audio/localMusic.ts` se importa dinámicamente dentro de `if (import.meta.env.DEV)`, así que Rollup lo descarta.
- Busqué en `dist/` con `src/audio/music`, `local.json`, `LocalMusicPlayer`, `música local`, el nombre del archivo de prueba y `_volume`.
  - Lo único que aparece son 9 propiedades `_volume` internas de Babylon.
  - Ni el módulo ni ninguna canción.
- Vite sirve el JSON tal cual y el mp3 con su tipo. Si falta `local.json`, devuelve 404.
- `.gitignore` ya cubre `src/audio/music/`: lo comprobé con `git check-ignore`. No se ha subido nada de esa carpeta.

## Mediciones

- `npm run typecheck`, `npx vitest run` (61 archivos, 558 tests) y `npm run build`: los tres en verde.
- Tests nuevos (`tests/guardadoPresets.test.ts`, 44):
  - 12 ranuras, renombrar y lista con el sitio;
  - guardar y cargar con lugar, contra la rejilla real del mundo abierto;
  - pisos que existen y que no;
  - fuera del mundo y casilla bloqueada: piedra conocida más cercana;
  - migración de guardados antiguos y rotos;
  - cada partida de prueba se lee, referencia objetos, hechizos, zonas y pisos existentes, se monta, pasa por el almacén y se carga con lo pedido (nivel, puntos, equipo y bonos, barra, rangos, mascota, lugar en su zona);
  - cobertura de franjas, roles y elementos;
  - medidor de daño;
  - mapa de música local.
- Prueba de humo en Chromium headless (`npm run dev:web`): título, partidas de prueba, Tanque 15 en Chame en (62, 126), medidor, cripta piso 3, guardar en la ranura 7, renombrar, salir al título, cargar y mismo sitio. Sin errores de consola propios.
- Sin FPS ni latencia: la nube no tiene GPU (swiftshader da unos 3 FPS) y no aplica.

## Decisiones técnicas tomadas y por qué (PROPUESTA)

- **El guardado sigue en `version: 1`.**
  - `place` y `label` son opcionales: el contrato crece y no rompe la `FakeSession` ni a quien lea guardados.
  - La migración se hace al leer, sin reescribir hasta el próximo guardado.
- **`x`/`y` null significa «en la piedra»** (o «en la llegada» del piso). Así un guardado antiguo se migra sin inventar coordenadas.
- **La piedra de respaldo es la conocida más cercana**, no cualquiera: no se teletransporta a sitios que el personaje no ha descubierto.
- **Las partidas de prueba se construyen como guardados reales.** No se toca el estado en caliente, así se prueba también el camino de carga.
  - Los `bonus` van en `rolled` de las piezas: es el único sitio del guardado donde caben modificadores, y aparecen en los tooltips como cualquier tirada.
- **Las herramientas de prueba** (partidas y medidor) también funcionan en un build con la marca: así se puede medir en la ventana de Electron empaquetada.
  - La música local, en cambio, es **sólo** de desarrollo, como se pidió.
- **La tecla Fin es fija y está fuera de `data/ui/keybindings.json`**, como F2, F3 e Insert: es depuración y no debe aparecer en «Atajos».

## Incertidumbres que bloquean el siguiente paso

- **Música local de FATE y clean-room.** El creador pidió una canción de FATE que tiene en local.
  - No entra en el repositorio ni en el build, y el código no lee nada de las rutas prohibidas por `AGENTS.md`: sólo la carpeta ignorada que el creador llena.
  - Aun así, el coordinador debería confirmar que este uso sólo-local encaja con la regla clean-room. Está anotado en `PROCEDENCIA.md`.
- **Pendiente en el PC del creador:**
  - revisión visual en Electron (lista de 12 ranuras, panel de partidas, medidor);
  - oír la canción real en la cripta.
- **Partidas de prueba y otras sesiones.** Usan los objetos de hoy, todos de nivel ≤ 4: por eso los «sets» son el del Explorador y el del Aprendiz, y las resistencias altas vienen de `bonus`.
  - Cuando la sesión de equipo añada objetos (`items.json`), conviene actualizar `data/dev/presets.json`.
  - Si un id desaparece, los tests lo marcan y la consola lo avisa al arrancar.
- **El nivel máximo es 20** (`progression.json`), así que la «franja alta» llega a nivel 20. Las zonas de 30–50 se prueban con personajes por debajo de su franja.
- **Fusión:** `src/main.ts`, `src/ui/menus/index.ts` y `src/audio/director.ts` los tocan también otras sesiones. Los cambios aquí son aditivos, pero puede haber conflictos de texto al fusionar.
- No toqué `windows.ts`, el minimapa, `inventory.ts` ni `items.json`.

## Archivos principales

| Archivo | Qué |
|---|---|
| `src/rpg/contracts.ts` | `SavePlace`, `PLACE_SCENES`, `SaveData.place` y `SaveData.label` (sólo añadidos) |
| `src/ui/menus/saveStore.ts` | `SLOT_COUNT` = 12, `migrateSave`, `normalizePlace`, `cleanLabel`, `rename` y `summarize` |
| `src/world/placement.ts` | `resolvePlace`, `nearestStone`, `pointInZone` y textos de aviso |
| `src/rpg/session.ts` | `startPlace` y `placeProvider` en `GameSession` |
| `src/scenes/cryptScene.ts` | `enter(index, from, at?)` devuelve si existe el piso |
| `src/render/atmosphere.ts` | `setTimeOfDay` |
| `src/dev/presets.ts` · `data/dev/presets.json` | partidas de prueba |
| `src/sim/damageMeter.ts` · `src/ui/dev/damageMeterView.ts` | medidor de daño |
| `src/audio/localMusic.ts` · `src/audio/director.ts` | música local (sólo dev) |
| `src/ui/menus/index.ts`, `screens/modals.ts`, `screens/title.ts`, `styles/menus.css` | ranuras, renombrar y menú de partidas de prueba |
| `src/main.ts` | lugar al cargar y guardar, herramientas de prueba y tecla Fin |
| `tests/guardadoPresets.test.ts` · `tests/ui/saveStore.test.ts` | tests |

- No se tomó ninguna decisión creativa.
