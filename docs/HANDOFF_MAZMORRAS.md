# HANDOFF — Mazmorras (Cripta del Cruce)

- **Objetivo autorizado:** el creador pidió unos pisos de mazmorra «como en FATE» para ver cómo luce el juego en sitios cerrados. FATE es sólo la idea de referencia: una entrada cerca del pueblo, pisos numerados por semilla, salas y pasillos, escaleras, monstruos, cofres y más dificultad al bajar. Nombres y números son propios y son PROPUESTA.
- **Rama:** `mazmorras`, sin fusionar.

## Qué funciona (con cómo probarlo)

`npm run dev`, partida nueva. Sal del pueblo por el camino sur. Unos 30 m al sur de la plaza, al este del camino, en (141, 156), hay un arco de piedra con una losa negra y un anillo azul.

- **Entrar.** Clic en el arco: el jugador va hasta él y baja al piso 1. Sale el banner «Cripta del Cruce · piso 1 · niv. 3–5»: es el banner de zona de siempre, lanzado como `zoneEnter` de la sesión.
- **Pisos.** Los genera `src/world/dungeon.ts` desde `data/dungeon.json`:
  - Salas rectangulares unidas por pasillos en L de 2 baldosas (3 m). El árbol mínimo une todas las salas y se añaden 1–2 pasillos de más para que haya bucles.
  - Escalera de subida en la sala de llegada, con peldaños, arco y anillo dorado.
  - Escalera de bajada en la sala más lejana por los pasillos: boca negra con anillo azul.
  - Antorchas cada 5 baldosas de muro de sala.
  - Cofres en esquinas de sala.
  - Monstruos por sala, menos en la de llegada.
  - Cada piso es siempre el mismo: semilla = `seed` + índice × 7919.
- **Tres pisos de nivel creciente.**

  | Piso | Tema | Niveles | Monstruos |
  |---|---|---|---|
  | 1 | losa | 3–5 | lobos, hostigadores y chamanes |
  | 2 | osario | 5–7 | chamanes, brutos, hostigadores y veteranos (+1) |
  | 3 | musgo | 7–9 | brutos, veteranos, alfas (+1) y chamanes, más el guardián |

  El guardián del piso 3 sale en la sala más lejana:
  - `crypt_warden`, «Guardián de la cripta», de nivel 10. Es una variante con `base: "grave_brute"`: 420 de vida base (785 a nivel 10), radio 0,85 y dos hechizos propios.
  - Tiene ficha en `data/rpg/enemies.json` y aspecto en `data/assets.json`.
- **Cambiar de escena.** Lo hace `src/scenes/cryptScene.ts`:
  - Crea un `World` nuevo con rejilla, enemigos y una semilla nueva.
  - Conserva el mismo `Character`: inventario, nivel, vida y recurso. La vida y el recurso se copian porque el constructor de `World` los llena.
  - Oculta el terreno, la vegetación, el agua, los PNJ y la boca de la cripta, y genera el piso.
  - Subir del piso 1 devuelve al mundo abierto delante del arco. Subir del piso N lleva al N−1, junto a su escalera de bajada.
  - Reiniciar (F9) o morir dentro devuelve al mundo abierto, como siempre.
- **Mundo interior.** Es la opción `interior` de `World`:
  - Sin PNJ, sin estanques ni pesca y sin enemigos de misiones.
  - Limpiar el piso no da «victoria».
  - Los cadáveres se retiran como en el mundo abierto.
- **Ambiente.** `Atmosphere.setInterior`:
  - Sin ciclo de día: el reloj se para dentro y el cielo se apaga.
  - Ambiente fijo y oscuro, niebla casi negra y fondo negro (la roca no se dibuja).
  - Las 4 luces de farola pasan a ser las 4 antorchas más cercanas, con parpadeo y color de los datos. La luz del jugador va siempre encendida.
- **Cofres.** Clic: el jugador va hasta el cofre, la tapa se levanta y cae el botín.
  - Usa la tabla de `data/rpg/loot.json` que diga el piso: `goblin_skirmisher`, `bone_shaman` o `alpha_wolf`.
  - Por cada piso hacia abajo, las monedas se multiplican por (1 + 0,5 × (piso − 1)) y se suma 1 tirada.
  - Los cofres abiertos se recuerdan hasta recargar.
- **Cámara.**
  - Dentro se acerca a 13 m y no pasa de 20 m (la rueda sigue funcionando).
  - `CameraRig.blockerMode = 'inside'`: la cámara sólo se acerca si fuera a quedar dentro de un muro. Los muros que tapan al jugador los quita el recorte de oclusión.
  - El modo `ray` de siempre, que acerca la cámara si algo tapa el rayo, la pegaba a 3 m del jugador cada vez que había un muro de 3,2 m detrás: se probó y se descartó para interiores.
- **Oclusión.** Los muros y su remate llevan `OcclusionPlugin`: se recortan alrededor del jugador y de los enemigos cercanos. Comprobado en el navegador de desarrollo con el jugador en un pasillo detrás de un muro.
- **Depuración en consola (dev):**
  - `__game.crypt.enter(2, 'above')` va directo al piso 3.
  - `__game.crypt.leave()` vuelve al mundo abierto.

## Mediciones

- **Escena del piso.** Se midió con el panel del navegador oculto (los fotogramas van frenados), forzando 60 fotogramas de `sync` + `render` + `gl.finish()`. Piso 1 con 15 monstruos: 3,1 ms de media y 5,8 ms en p95. Unas 22 mallas activas.
  - El suelo, los muros, el remate, los soportes y las llamas son thin instances: 1 draw call por tipo.
  - **No vale como FPS real:** hay que medirlo en Electron, en el PC del creador.
- **Generar un piso:** del orden de milisegundos. El test de 30 semillas × 3 pisos tarda unos 0,7 s en total, con relleno incluido.
- **Latencia de clic:** no se tocó (mismo camino de `commandMove`).

## Decisiones técnicas tomadas y por qué (PROPUESTA)

- **Mismo plano de coordenadas.** El piso se dibuja en las mismas coordenadas que el mundo abierto (0…69 m) y lo exterior se oculta. Las alternativas eran mover el piso lejos o crear otra `Scene` de Babylon, y las dos obligaban a rehacer todas las vistas.
- **Suelo intercambiable.** `SwitchableHeightField` (`src/world/switchableGround.ts`) es un `HeightField` con `flatHeight`. Todas las vistas comparten ese objeto, así que basta un campo para que el suelo pase a ser un plano a altura 0.
- **Un mundo nuevo en cada cambio de escena,** también al volver al exterior. El mundo abierto se repuebla, como en el referente al salir de una mazmorra. Guardar el mundo anterior era posible, pero arrastraba estado de vistas, mascotas e ids.
- **Muros.** Sólo se dibujan las baldosas de roca que tocan suelo. Para la cámara se fusionan en rectángulos (43 cajas en el piso 1).
- **Cambios en `main.ts`:**
  - Envolver `overworld.heights`.
  - Crear `CryptScene` (no en `?bench`).
  - Sacar `installWorld` de `newWorld`.
  - Una línea en el clic y otra en el bucle.
  - `crypt` en `__game`.
- **Cambios pequeños en otros archivos compartidos:**
  - `cameraRig.ts`: `distanceCap`, `blockerMode`, `zoom` y `jumpTo`.
  - `atmosphere.ts`: modo interior.
  - `vegetationView.ts`: lista `meshes`.
  - `waterView.ts` y `npcView.ts`: `setVisible`.
  - `world.ts`: opción `interior`.
- **No se tocaron** `src/ui/menus/hud.ts`, `modals.ts`, `themes.css` ni `src/render/characters/*`.
- `.claude/launch.json`: se añadió `mazmorras-web`, Vite en el puerto 5191, sólo para verificar en el navegador del agente.

## Incertidumbres que bloquean el siguiente paso

Nada bloquea. Queda pendiente:

- **Revisión visual en Electron:**
  - El último retoque de la boca de la cripta (montículo detrás, losa negra con bordillos) no se pudo ver: el panel del navegador iba congelado.
  - Los temas `osario` y `musgo` no se vieron en pantalla.
  - Si las antorchas (1,5 de intensidad, 11 m de alcance) iluminan demasiado los muros.
- **FPS real** dentro de un piso en Electron, con el guardián luchando.
- **Audio:** el ambiente sigue siendo el del exterior (`mountAudio` no sabe que estás dentro).
- **Dificultad:** el piso 1 (niv. 3–5) mata enseguida a un personaje de nivel 1. Para un personaje de nivel 3–4 parece bien, pero no se midió con el bot de equilibrio.
- **Ideas para más adelante:**
  - Minimapa del piso.
  - Pisos que cambien en cada visita en lugar de ser fijos.
  - Recordar los cofres en la partida guardada.
  - Mostrar el piso y la profundidad en el HUD (no se tocó `hud.ts`).

## Archivos principales

- `data/dungeon.json`
- `src/data/dungeonSchema.ts`
- `src/world/dungeon.ts`
- `src/world/switchableGround.ts`
- `src/render/dungeonView.ts`
- `src/scenes/cryptScene.ts`
- `tests/dungeon.test.ts` (11 tests): datos y rechazos, determinismo, conexión de las salas con 30 semillas, A* hasta salas, escaleras, cofres y monstruos, nivel por piso, botín por piso y mundo interior.
- `data/enemies.json`, `data/rpg/enemies.json`, `data/assets.json`: el guardián `crypt_warden`.

No se tomó ninguna decisión creativa: nombres, temas y números son PROPUESTA para que el creador los revise.
