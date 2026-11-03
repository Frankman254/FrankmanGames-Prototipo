# HANDOFF — Personaje 3D procedural

- **Rama:** `personaje-3d`, sin fusionar en `master` y sin PR.
- **Objetivo autorizado:** modelar el personaje jugable (y con él los PNJ humanoides) de forma procedural y más cuidada. Antes era una pila de cajas. Sin descargar assets: todo es geometría generada por código.

## Qué funciona

### Modelo nuevo: `src/render/characters/heroModel.ts`

Hecho con formas redondeadas: cápsulas con radio distinto arriba y abajo, elipsoides, tornos (lathe), tubos y cintas (ribbon).

- **Proporciones.** Rig propio `heroRig` en `src/world/rigs.ts`: unas 4,3 cabezas de alto (≈ 1,8 m), cabeza grande y piernas más cortas que el bípedo de los enemigos.
- **Articulaciones nuevas.**
  - `cape`: la capa ondea.
  - `eyes`: parpadeo. Los ojos se esconden 3,5 cm dentro de la cabeza.
- **Uniones suaves.**
  - Pesos por vértice (`Part.weights`): el torso se dobla entre cadera, columna y pecho.
  - La falda o túnica se reparte entre la cadera y las dos piernas.
  - La capa va cosida al pecho y la mueve su articulación.
  - Vértices soldados (`forceSharedVertices`) en las formas redondeadas: sin costuras de sombreado.
- **Cabeza.**
  - Cráneo de torno con mofletes y barbilla.
  - Ojos grandes: blanco, iris y brillo.
  - Cejas, nariz, orejas y una boca que sonríe.
- **Peinados:** `short`, `spiky`, `long`, `ponytail`, `bun` y `bald`. Barba opcional (`beard`).
- **Manos y pies.**
  - Mano: palma, dedos recogidos y pulgar.
  - Botas: caña con vuelta y suela.
- **Ropa por capas.** Colores de la paleta: `skin`, `cloth`, `trim`, `hair` y `gear`. Los tonos derivados (pantalón, cuero, madera) son `shade` sobre esas ranuras.
  - `tunic`: túnica con faldón, cuello ribeteado, cinturón con hebilla, bolsa, hombreras de cuero y brazales.
  - `plate`: coraza, gola, emblema, faldar de placas facetado, hombreras dobles, guanteletes, rodilleras y botas de metal.
  - `robe`: túnica hasta los tobillos con ribete, esclavina, mangas acampanadas, fajín y su caída.
  - `apron`: túnica más mandil de cuero.
  - Tocados (`headgear`): `hood` (capucha de dos caras con ribete y caída), `helm` (yelmo con cresta y nasal) y `band` (diadema).
  - `cape`: capa curvada con broches.

### Variantes por clase, desde datos: `data/assets.json`

- **`player.looks`.**
  - `ember_vanguard`: robusto, pelo de punta, armadura, diadema, capa y espada.
  - `storm_weaver`: delgada, melena, túnica larga, capucha y báculo.
  - Cada clase tiene además su paleta en `player.palettes`.
- **`npc.looks`.**
  - Herrero: calvo, barba, mandil y maza.
  - Boticaria: moño, túnica y diadema.
  - Pescador: coleta y diadema.
  - Guardia: armadura, yelmo, capa, espada y escudo.
  - Anciano: melena, barba, túnica y báculo.
- **`enemy.grave_brute`.** Antes usaba el humanoide de cajas. Ahora tiene aspecto propio: armadura, yelmo y hacha.
- **Cómo se resuelve un campo.** Cada campo es opcional y hereda del `default` del mismo bloque. Las claves son las de `palettes`.
- **Pruebas puras.**
  - Lectura y validación en `src/data/worldSchema.ts`. Los errores nombran la ruta, p. ej. `assets.player.looks.x.outfit`.
  - Lógica en `src/world/look.ts`.

### Equipo visible

- **`player.gear`** asigna a cada objeto equipado lo que pinta en la mano: `sword`, `axe`, `mace`, `staff`, `wand`, `orb` o `shield`.
- **Arma.** Va en la mano derecha según el arma equipada. Sin arma, manos vacías.
- **Escudo.** La rodela de `offhand` va en la izquierda.
- **Cambios en partida.** `ArenaView.syncPlayerLook` rehace el modelo cuando cambian la clase, el arma o el escudo. Se comprueba cada fotograma con una clave de texto, sin coste si nada cambia.
- **Hechizos.** El báculo, la varita y el orbe brillan: segunda malla con material emisivo. Con ellos el ataque y el hechizo se hacen con el arma (`heroClips(caster)`).

### Animaciones: los mismos 7 estados, eventos y sockets

- **`idle`:** respira (el pecho sube), se balancea, mira alrededor y parpadea.
- **`run`:** brazos contrarios a las piernas, pecho que gira al revés que la cadera y capa que ondea. Los pasos siguen cuadrando con `data/animation.json`; lo comprueba el test existente.
- **`attack`:** tajo de arriba abajo con paso al frente, o golpe de báculo. El impacto sigue en t = 0,5.
- **`cast`:** junta las manos y empuja, o alza el báculo y lo descarga. El evento sigue en t = 0,55.
- **`evade`:** voltereta completa hecha un ovillo, con los ojos cerrados.
- **`hit`:** encaja el golpe hacia atrás, con los ojos cerrados.
- **`death`:** se le doblan las rodillas, cae de espaldas con un pequeño rebote y cierra los ojos.
- **Lo que no cambia.** `PlayerAvatar`, `NpcView`, los efectos (`socket('handR')`), la oclusión y los pasos con polvo usan la misma interfaz `CharacterModel`.

### Cómo probarlo

- **Tests.** `npm run typecheck` y `npx vitest run`: 315 tests en verde, 8 nuevos en `tests/characterLook.test.ts`.
- **Galería.** `npm run dev:web` y abrir `/personajes.html`.
  - Muestra la fila de aspectos con su recuento de vértices.
  - Parámetros: `?anim=run&t=0.3&yaw=55&pick=1,2,4,8&zoom=1.7`. Están explicados en `src/tools/characterGallery.ts`.
  - No entra en el build.
- **Capturas.** `npx vite --port 5199` y después `node scripts/capturasPersonaje.cjs docs/capturas/personaje`.
- **Juego.**
  - Nueva partida con cada clase. La vanguardia lleva capa roja y la tejedora, capucha.
  - Equipar la rodela o el bastón de roble cambia lo que lleva en las manos.

## Mediciones

### Vértices y triángulos por personaje

Malla final soldada, NullEngine y galería.

| Personaje | Vértices | Triángulos | Llamadas |
|---|---|---|---|
| Humanoide anterior (cajas) | 2148 | 3372 | 1 |
| Jugador `default` (túnica, espada) | 2885 | 5328 | 1 |
| Herrero | 2745 | 4976 | 1 |
| Pescador | 2938 | 5452 | 1 |
| Tejedora (báculo) | 3848 | 6948 | 2 |
| Guardia (armadura, capa, escudo) | 4057 | 7474 | 1 |
| Vanguardia (armadura, capa) | 4125 | 7324 | 1 |
| Vanguardia + hacha y rodela | 4310 | 7696 | 1 |

- **Tope en test.** Menos de 5000 vértices para todas las combinaciones.
- **Primer intento.** Con esferas y toros de Babylon pasaba de 8000–9000 vértices.
- **Cómo se bajó.**
  - Elipsoides como torno de media circunferencia.
  - Aros como torno de un hexágono.
  - Soldadura de vértices.
  - Sin UV.

### Corro de 24 humanoides animados

- **Cómo se midió.** `?bench=humans` con `node scripts/benchHumanos.cjs`, mediodía, a 640×360.
- **Precisión.** En la nube Chromium dibuja por software (SwiftShader, unos 3–5 FPS). Sirve para comparar antes y después, no como cifra absoluta.

| | Llamadas de dibujo | Triángulos activos | Fotograma medio (SwiftShader) | Render CPU medio |
|---|---|---|---|---|
| Antes: 0 humanoides | 101 | 187 782 | 191,7 ms | 6,6 ms |
| Antes: 24 humanoides | 142 (+41) | 327 567 (+139 785) | 246,7 ms | 6,8 ms |
| Después: 0 humanoides | 102 | 209 344 | 193,3 ms | 6,1 ms |
| Después: 24 humanoides | 146 (+44) | 433 806 (+224 462) | 358,2 ms | 8,3 ms |

- **Llamadas de dibujo.** Casi iguales: una por personaje más sombra, y una más si lleva arma que brilla.
- **Triángulos.** ×1,6 por personaje.
- **Por qué el fotograma en SwiftShader crece tanto.** Es rasterizar por software. En una GPU real, 24 × ~7000 triángulos es poco. Hay que confirmarlo en el PC.
- **Batería completa.** `?bench=1` tiene una fila nueva al final, `humans: 24`. Ver `docs/BITACORA.md`.

## Decisiones técnicas (PROPUESTA)

- **Un rig nuevo (`heroRig`) sólo para el humanoide.**
  - El arquero, el chamán y el diablillo siguen con `humanoidRig` y sus cajas.
  - `data/animation.json`: `humanoid.runSpeed` baja de 3,2 a 2,75 porque la zancada es más corta. Los instantes de los pasos no cambian.
- **Una malla con esqueleto por personaje, como antes.** El aspecto se hornea al crearlo. Cambiar de arma rehace el modelo, unos milisegundos y sólo cuando cambia.
- **Aspecto separado de la paleta.** Los dos se eligen con la misma clave (clase o PNJ), pero se pueden combinar libremente: la galería y `createCharacter(..., paletteId, look)` lo hacen.
- **Altura del humanoide.** Para barras y carteles se usa el cuello más 0,45 m, porque la cabeza es más grande que en el resto de modelos.
- **Bench.** `bench(…, humans)` crea un corro de personajes sólo de render (`src/render/characters/benchCrowd.ts`). La medición registra además los triángulos activos.

## Incertidumbres y pendientes

- **FPS real y revisión visual.** Se hacen en el PC del creador: `npm run build` y `npx electron . --bench`; la última fila es la de los humanoides. Ver las capturas de `docs/capturas/personaje/`.
- **Elegir pelo y color en la creación: no se hizo.**
  - Haría falta guardar la apariencia en la partida: `SaveData` en `src/rpg/` y `src/ui/menus/saveStore.ts`, que es de otra sesión.
  - También haría falta añadir controles a `creation.ts` con estilos nuevos, y `src/ui/styles/*` también es de otra sesión.
  - El modelo ya lo admite: bastaría con un `Partial<CharacterLook>` y una paleta propia al llamar a `createCharacter`.
- **Choques de geometría que se ven en movimiento:**
  - Al correr, los brazos atraviesan la capa.
  - En la voltereta, la túnica larga se estira con las piernas.
  - Las orejas asoman un poco por el pelo.
  - Mirar en local si molestan.
- **Rotación a ojo.** No hay pruebas automáticas de que la ropa no atraviese el cuerpo. Se revisó con las capturas.
- **Otros modelos sin rehacer.** El arquero goblin, el chamán y el diablillo siguen con piezas de caja. Se pueden pasar a este sistema de piezas (`parts.ts`) cuando se pida.

## Archivos principales

- `src/render/characters/heroModel.ts`: piezas del humanoide según el aspecto.
- `src/render/characters/parts.ts`: formas, pesos por vértice y soldadura. Sale de `proceduralCharacter.ts`.
- `src/render/characters/proceduralCharacter.ts`: une las piezas con pesos de hasta 4 huesos y recibe el aspecto.
- `src/render/characters/characterModel.ts`: `createCharacter(…, paletteId, look?)`.
- `src/render/characters/playerAvatar.ts`: `replaceModel`.
- `src/render/arenaView.ts`: `syncPlayerLook`.
- `src/world/look.ts`: tipos y lógica pura del aspecto.
- `src/world/rigs.ts`: `heroRig` y `heroClips`.
- `src/data/worldSchema.ts`: `looks` y `gear`.
- `data/assets.json`: paletas y aspectos de las clases, PNJ y el bruto. Mapa `gear`.
- `data/animation.json`: `runSpeed` del humanoide.
- `src/render/characters/benchCrowd.ts`, `src/main.ts` (`?bench=humans`) y `scripts/benchHumanos.cjs`: medición.
- `personajes.html`, `src/tools/characterGallery.ts` y `scripts/capturasPersonaje.cjs`: galería y capturas.
- `tests/characterLook.test.ts`.

No se tomó ninguna decisión creativa vinculante. Las silueta y colores por clase son PROPUESTA en datos.
