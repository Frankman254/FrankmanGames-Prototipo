# HANDOFF — Mapa, minimapa y HUD configurable

- **Objetivo autorizado:** minimapa, mapa grande con niebla de guerra y banderas, HUD que se mueve con perfiles y tamaño automático de la interfaz, según las respuestas del creador. Rama `mapa-hud`, sin fusionar.

## Qué funciona (con cómo probarlo)

`npm run dev`, partida nueva o «Continuar».

- **Minimapa** (arriba a la derecha):
  - Es cuadrado. Se arrastra por su cabecera y se redimensiona por la esquina de abajo a la izquierda.
  - Botón **N / ⟳**: norte fijo o girando con la cámara.
  - Zoom con **− / +** o la rueda. **▦** o doble clic abren el mapa grande.
  - Muestra el terreno, los caminos, el agua, la aldea, las casas y el bosque. Encima van:
    - el jugador (flecha) y los enemigos, con el color de nivel de `zones.json`;
    - los PNJ (círculo), los mercaderes (cuadrado) y «!» / «?» de misión;
    - el botín, las piedras de viaje y las banderas propias.
  - Brújula con N, E, S y O en el borde. La estrella de la misión seguida pasa a ser una flecha en el borde cuando queda fuera.
- **Mapa grande** (tecla **M**, nueva acción `map` en `data/ui/keybindings.json`):
  - Ventana arrastrable. Rueda para el zoom, arrastrar para moverse.
  - Coordenadas y zona bajo el cursor, y el porcentaje explorado.
  - **Niebla de guerra:** se descubren 26 m alrededor del jugador. Se guarda por personaje en `localStorage` (`frankmangames.mapFog.<nombre>`), cada 3 s y al salir al título.
  - **Banderas:**
    - Clic en un sitio libre pone una y abre su nombre para escribirlo.
    - Clic derecho sobre una, o «×» en la lista, la quita.
    - Clic en la lista la centra.
    - Se guardan en `frankmangames.mapFlags.<nombre>`, con un máximo de 40.
  - **Capas** (se recuerdan en este equipo): zonas con su franja, personajes, mercaderes, piedras de viaje, misiones y banderas.
- **Editar interfaz:**
  - Se abre con **Inicio** (acción `editHud`) o con Opciones → Interfaz → «Editar interfaz».
  - Cada elemento lleva un asa con su nombre: barra de abajo, coordenadas, barra de combate, seguimiento de misión, minimapa y registro de combate.
  - Arriba hay una barra para elegir perfil, renombrarlo, crear uno («Nuevo» copia el actual), borrarlo (nunca el último), restablecerlo y terminar («Listo» o Esc).
  - Los perfiles se guardan en `frankmangames.hudProfiles`. «Restablecer posiciones» de Opciones también restablece el perfil activo.
- **Tamaño automático:**
  - Opciones → Interfaz → «Tamaño automático (según la pantalla)». Viene activado y la barra manual sigue ahí.
  - La escala es `min(ancho/1440, alto/810) × 1,1`, más 0,1 si la pantalla tiene 1440 o más píxeles físicos de alto, entre 0,85 y 2, en pasos de 0,05.
  - Sigue a la ventana cuando cambia de tamaño. El máximo manual sube de 1,5 a 2.

## Comprobado en el navegador

Vite en 1440×810 y 1998×1168:
- El minimapa se dibuja con la niebla y los marcadores.
- El mapa grande abre con M, pone y nombra una bandera, y hace zoom.
- Editar interfaz: el minimapa se arrastra, se guarda en el perfil, «Nuevo» y «Restablecer» funcionan, y al volver al primer perfil vuelve a su sitio.
- Escala automática de 1,55 en 1998×1168.
- Sin errores en la consola.

## Mediciones

- Imagen base: se genera una vez, la primera vez que se pide (512×512 px, 2 px/m).
- El minimapa se dibuja a unos 30 Hz y el mapa grande a unos 20 Hz, sólo con él abierto.
- No se midió el FPS en Electron.

## Decisiones técnicas (PROPUESTA)

- Las cifras están en `data/ui/map.json`: radio de descubrimiento, casilla de niebla de 4 m, tamaños, zoom, colores y escala automática.
- **`WindowLayout`** sólo crece, sin cambiar lo que ya había:
  - `onMoved`: aviso al soltar una ventana;
  - `setPositions(keys, pos)`: aplica un perfil sin tocar las demás ventanas;
  - `position(key)`.
- **Coordenadas:** los mapas reciben una función `coords(x, y)`. Hoy `main.ts` le pasa `mapCoords` de `src/world/zaaps.ts`, así que si cambia el esquema sólo cambia esa línea.
- **`main.ts`:**
  - Una llamada a `setMapWorld(buildMapWorld(...))` al arrancar.
  - Una llamada a `setMap(mapFrame(session))` por fotograma.
  - La función `mapFrame` y dos imports.
  - Lo demás está en `src/ui/map/mapFeed.ts`.
- **Flecha de misión:** `questTarget` apunta así:
  - misión lista: al PNJ de la entrega;
  - si no, al primer objetivo sin cumplir que tenga lugar: punto a alcanzar, zona de la cacería (`spawn`), PNJ con quien hablar o el agua más cercana para pescar;
  - «recoger» no tiene lugar, así que no hay flecha.
- **Niebla:**
  - Oculta el terreno, los PNJ y las piedras de viaje no conocidas.
  - Las zonas con su franja se ven aunque no estén exploradas, para que el jugador sepa dónde no meterse.
  - Los enemigos cercanos se ven siempre en el minimapa.
- **Registro de combate:** pertenece a `#hud` (de `main.ts`) y reescribe su texto. Para moverlo se envuelve en `.hud-log-wrap`.
- Bajo tierra (cripta) el minimapa dice «Sin mapa bajo tierra».
- Las piedras de viaje se llaman así en la interfaz nueva. Los datos siguen viniendo de `zaaps.json` / `zaapsDef`, que otra sesión está renombrando.

## Puntos de choque al fusionar

- **`data/ui/keybindings.json` y `src/ui/menus/keybindings.ts`:**
  - Acciones `map` (KeyM) y `editHud` (Home), en «Paneles» y en `UI_ACTIONS`.
  - La etiqueta de Home es «Inicio».
  - El test de reasignar usaba KeyM como tecla libre y ahora usa Digit7.
- **`src/ui/menus/saveStore.ts`:** opción `uiScaleAuto` (por defecto `true`) y `uiScale.max` de 1,5 a 2. El test se ajustó.
- **`src/ui/menus/screens/modals.ts`:** `OptionsActions.editHud` y dos filas en Interfaz.
- **`src/ui/menus/index.ts`:**
  - Capa `layer-hudedit`, `MapState`, `HudLayout`, `attachHud()` y `uiScaleOf()`.
  - El panel `map` en `togglePanel`.
  - `setMapWorld` y `setMap` en el controlador.
- **`src/ui/menus/windows.ts`:** lo de `WindowLayout` descrito arriba.
- **`src/main.ts`:** las dos llamadas, la función `mapFrame` y dos imports.

## Incertidumbres

- No bloquean el siguiente paso.
- Falta la revisión visual del creador:
  - colores del mapa;
  - tamaño por defecto del minimapa (220 px);
  - el empujón de la escala automática.
- Las teclas Inicio y M son PROPUESTA.

## Archivos principales

- `src/ui/map/`:
  - `mapLogic.ts`: proyección, vista, niebla, banderas y flecha de misión;
  - `hudProfiles.ts`: perfiles y escala automática;
  - `mapImage.ts`, `mapDraw.ts`, `mapState.ts`, `mapFeed.ts` y `mapData.ts`;
  - `minimap.ts`, `worldMap.ts` y `hudLayout.ts`.
- `src/ui/styles/map.css` y `data/ui/map.json`.
- Tests: `tests/mapLogic.test.ts` y `tests/mapView.test.ts` (16 tests). En total, `npx vitest run` pasa 391 tests.

No se tomó ninguna decisión creativa.
