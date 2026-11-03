# HANDOFF — Arreglos del HUD (cursor desplazado y minimapa)

- **Objetivo autorizado:** rama `hud-arreglos` desde `master`. Arreglar el desfase del cursor al mover elementos en «Editar interfaz» y en las ventanas arrastrables, y dejar redimensionar el minimapa con cualquier proporción. Sin fusionar ni PR. No se tocó `src/sim`, `src/rpg` ni `data/rpg`.

## 1. «El cursor parece desplazado media pantalla a la izquierda»

### Causa (reproducida en el navegador)

`WindowLayout.place` escribía `left/top/right/bottom` en línea con `!important`. Chromium guarda esas cuatro como el atajo **`inset: …`**, así que el atributo `style` nunca contiene la palabra `left`. Por eso las reglas `.hud-actionbar[style*='left'] { transform: none }` (y las de `.world-info`, `.combat-bar` y `.panel-worldmap`) no se aplicaban nunca, y el `translateX(-50%)` seguía puesto: el elemento quedaba **a la izquierda del cursor por medio ancho**.

Medido antes del arreglo (Chromium headless, distancia entre el punto agarrado y el cursor):

| Elemento | 1600×900 al 100 % | 1600×900 al 150 % |
|---|---|---|
| Barra de abajo | 504 px | 728–750 px |
| Coordenadas y zona | 131 px | 197 px |
| Barra de combate | 90 px | 135 px |
| Minimapa, seguimiento de misión, registro | 0 | 0 |

Con la barra de abajo (que ocupa casi toda la pantalla) es literalmente «media pantalla».

### Arreglo

- `WindowLayout.place` (`src/ui/menus/windows.ts`):
  - quita el centrado en línea (`transform: none`, `translate: none`, con `!important`) y pone la clase `win-placed`;
  - convierte a CSS con el zoom medido y luego **mide dónde quedó y corrige** (`solvePlacement`: estimación, corrección y, si el zoom estimado era malo, secante). Así ningún desfase constante (transform, zoom de la escala de la interfaz, zoom de las media queries de la barra de abajo, márgenes, padre posicionado) separa el elemento del cursor.
  - El arrastre guarda el punto agarrado medido en pantalla (`grabOffset`) y lo mantiene bajo el puntero (`dragCorner`).
- `unplace` (restablecer / perfil sin posición) quita también `transform`, `translate` y la clase, así el elemento vuelve centrado.
- CSS: las tres reglas `[style*='left']` se sustituyen por `.win-placed { transform: none !important; translate: none !important; }` en `map.css`.
- `attach` ya no engancha dos veces la misma asa (el HUD se re-registra al rehacerse y antes se acumulaban oyentes).
- **Recorte al arrastrar (`clampDrag`)**: mientras se arrastra, el recorte no es más estricto que donde estaba la ventana al agarrarla. Antes, una ventana que ya asomaba fuera (la ficha a 150 % en una ventana corta, o la barra de abajo más ancha que una ventana de 900 px) saltaba al primer movimiento y se separaba del cursor. Si es más grande que la pantalla, se puede deslizar entre sus dos bordes. Al restaurarla se sigue usando `clampWindow`.
- El cambio de tamaño del minimapa, cuando está colocado a mano, también corrige con lo medido para que el borde derecho no se mueva con el zoom.

### Tests

`tests/ui/dragPosition.test.ts`: `clampDrag` (no salta, se frena en los bordes) y un modelo del navegador (zoom que multiplica `left`, desfase de transform, padre) y comprobación de que el punto agarrado queda a menos de 0,5 px del cursor con transform, con zoom 1,5, con zoom × media query (1,5 × 0,76) + transform + padre, con zoom mal estimado y sin moverse.

## 2. Minimapa con tamaño libre

- Tres asas: **borde izquierdo** (ancho), **borde de abajo** (alto) y **esquina de abajo a la izquierda** (los dos, con la proporción que salga del gesto). El borde derecho y el de arriba se quedan quietos (el minimapa va arriba a la derecha).
- Cada lado entre `minSize` y `maxSize` de `data/ui/map.json` (140–420 px CSS, `PROPUESTA`, sin cambiar las cifras).
- **Sin deformar:** el lienzo tiene el ancho y alto reales; los píxeles por metro (`minimapPixelsPerMeter`) dependen del zoom y de la escala de la interfaz, **no del tamaño**. Agrandar enseña más terreno a la misma escala; achicar recorta. Con el tamaño por defecto se ve lo mismo que antes. La brújula y la flecha de misión se pegan al borde del rectángulo (`clampToBox` con alto).
- **Perfil del HUD:** `minimapSize` pasa a ser `{ w, h }`. Los perfiles guardados antes (un número, cuadrado) se leen como `{ w: n, h: n }`.
- Tests en `tests/ui/minimapResize.test.ts`.

## 3. Resto de ventanas arrastrables

Todas pasan por el mismo `WindowLayout.attach/place`, así que el arreglo las cubre. Ver la tabla de verificación.

## Verificación en el navegador

Vite (`npx vite --port 5191`) + Chromium headless de Playwright, partida nueva, escala manual. Script en el scratchpad de la sesión (no se sube): agarra cada asa por un punto que esté encima de todo (`elementFromPoint`), arrastra en tres pasos y mide la distancia entre el punto agarrado y el cursor en cada paso y tras soltar. Se arrastra dos veces cada elemento.

Error máximo entre el punto agarrado y el cursor (en píxeles), después del arreglo:

| | 1600×900 100 % | 1600×900 150 % | 900×800 100 % (barra con zoom 0,76) | 900×800 150 % |
|---|---|---|---|---|
| Barra de combate | 0,02 | 0,02 | 0,02 | 0,02 |
| Barra de abajo | 3,0 \* | 12 \* | 2,4 \* | 3,6 \* |
| Coordenadas y zona | 0 | 0 | 0 | 0,3 |
| Seguimiento de misión | 0 | 0,02 | 0 | 0 |
| Minimapa | 0 | 0 | 0 | 0 |
| Registro de combate | 0 | 0 | 0 | 0 |
| Mochila, ficha, libro, diario, mapa, opciones (2.º arrastre) | ≤ 0,02 | ≤ 6 † | ≤ 0,02 | ≤ 6 † |

\* Sólo en el primer arrastre, y viene de la barra de experiencia, que crece con `:hover` (el script mide antes de pasar el ratón). En el segundo arrastre da 0–0,2.
† En el primer arrastre de las ventanas salen 33–57 px. Comprobado paso a paso: la ventana sigue al cursor exactamente y se para en el borde de la pantalla (p. ej. la ficha empieza en x = 14 y el script la arrastra 60 px a la izquierda). Es el recorte a la pantalla, no un desfase. Los 6 px del mapa y la mochila a 150 % son el mismo tope por abajo.

Minimapa (los cuatro casos): el borde izquierdo cambia sólo el ancho (Δ 80 px de 80 pedidos), el de abajo sólo el alto (60 de 60) y la esquina los dos (−40 / −100). El borde derecho no se mueve. La proporción del lienzo coincide con la de pantalla (p. ej. 410×330 px de lienzo para 410×330 en pantalla a 150 %), así que no se estira. El perfil guarda `{"w":260,"h":180}`. Sin errores en la consola.

## Comprobaciones

- `npm run typecheck`: verde.
- `npx vitest run`: 60 archivos y 504 tests en verde (16 nuevos en `dragPosition` y `minimapResize`).
- `npm run build`: verde (se mantiene el aviso conocido del paquete de 6,1 MB).

## Decisiones técnicas (PROPUESTA)

- Corregir con lo medido en vez de calcular el zoom y los transforms de cada elemento: aguanta zooms anidados, media queries nuevas y centrados que se añadan después. Cuesta como mucho tres lecturas de layout por evento de puntero, sólo mientras se arrastra.
- Escala del minimapa fija respecto al tamaño (agrandar = más área), como pidió el creador («recortar y mostrar más área»).

## Incertidumbres / pendiente

- Revisión visual en Electron en el PC del creador (Chromium 130 de Electron 33 tiene el mismo `zoom` estandarizado que el Chromium de la prueba).
- A 150 % en una ventana de 900 px, la barra de abajo mide unos 1146 px y no cabe (ya pasaba antes; el `max-width` de la escala se aplica a su contenedor, no a la barra). Ahora se puede arrastrar y deslizar para ver cualquiera de sus extremos, pero habría que decidir si se encoge más o pasa a dos filas.
- La barra de abajo crece 3 px al pasar el ratón (la barra de experiencia se agranda con `:hover`); si se mide antes de pasar el ratón parece un salto de 3 px. No es el desfase del cursor y no se tocó.

## Archivos principales

- `src/ui/menus/windows.ts`: `grabOffset`, `dragCorner`, `solvePlacement`, `place`/`unplace`.
- `src/ui/map/minimap.ts`, `src/ui/map/mapLogic.ts` (`clampMinimapSize`, `resizeMinimap`, `minimapPixelsPerMeter`, `projectToMinimap`/`clampToBox` con alto), `src/ui/map/hudProfiles.ts` (`parseMinimapSize`).
- `src/ui/styles/map.css`, `src/ui/styles/menus.css`, `data/ui/map.json` (sólo la nota).
- `tests/ui/dragPosition.test.ts`, `tests/ui/minimapResize.test.ts`.

No se tomó ninguna decisión creativa.
