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
- El cambio de tamaño del minimapa, cuando está colocado a mano, también corrige con lo medido para que el borde derecho no se mueva con el zoom.

### Tests

`tests/ui/dragPosition.test.ts`: un modelo del navegador (zoom que multiplica `left`, desfase de transform, padre) y comprobación de que el punto agarrado queda a menos de 0,5 px del cursor con transform, con zoom 1,5, con zoom × media query (1,5 × 0,76) + transform + padre, con zoom mal estimado y sin moverse.

## 2. Minimapa con tamaño libre

- Tres asas: **borde izquierdo** (ancho), **borde de abajo** (alto) y **esquina de abajo a la izquierda** (los dos, con la proporción que salga del gesto). El borde derecho y el de arriba se quedan quietos (el minimapa va arriba a la derecha).
- Cada lado entre `minSize` y `maxSize` de `data/ui/map.json` (140–420 px CSS, `PROPUESTA`, sin cambiar las cifras).
- **Sin deformar:** el lienzo tiene el ancho y alto reales; los píxeles por metro (`minimapPixelsPerMeter`) dependen del zoom y de la escala de la interfaz, **no del tamaño**. Agrandar enseña más terreno a la misma escala; achicar recorta. Con el tamaño por defecto se ve lo mismo que antes. La brújula y la flecha de misión se pegan al borde del rectángulo (`clampToBox` con alto).
- **Perfil del HUD:** `minimapSize` pasa a ser `{ w, h }`. Los perfiles guardados antes (un número, cuadrado) se leen como `{ w: n, h: n }`.
- Tests en `tests/ui/minimapResize.test.ts`.

## 3. Resto de ventanas arrastrables

Todas pasan por el mismo `WindowLayout.attach/place`, así que el arreglo las cubre. Ver la tabla de verificación.

## Verificación en el navegador

VERIFICACION

## Comprobaciones

- `npm run typecheck`: verde.
- `npx vitest run`: TESTS
- `npm run build`: BUILD

## Decisiones técnicas (PROPUESTA)

- Corregir con lo medido en vez de calcular el zoom y los transforms de cada elemento: aguanta zooms anidados, media queries nuevas y centrados que se añadan después. Cuesta como mucho tres lecturas de layout por evento de puntero, sólo mientras se arrastra.
- Escala del minimapa fija respecto al tamaño (agrandar = más área), como pidió el creador («recortar y mostrar más área»).

## Incertidumbres / pendiente

- Revisión visual en Electron en el PC del creador (Chromium 130 de Electron 33 tiene el mismo `zoom` estandarizado que el Chromium de la prueba).
- La barra de abajo crece 3 px al pasar el ratón (la barra de experiencia se agranda con `:hover`); si se mide antes de pasar el ratón parece un salto de 3 px. No es el desfase del cursor y no se tocó.

## Archivos principales

- `src/ui/menus/windows.ts`: `grabOffset`, `dragCorner`, `solvePlacement`, `place`/`unplace`.
- `src/ui/map/minimap.ts`, `src/ui/map/mapLogic.ts` (`clampMinimapSize`, `resizeMinimap`, `minimapPixelsPerMeter`, `projectToMinimap`/`clampToBox` con alto), `src/ui/map/hudProfiles.ts` (`parseMinimapSize`).
- `src/ui/styles/map.css`, `src/ui/styles/menus.css`, `data/ui/map.json` (sólo la nota).
- `tests/ui/dragPosition.test.ts`, `tests/ui/minimapResize.test.ts`.

No se tomó ninguna decisión creativa.
