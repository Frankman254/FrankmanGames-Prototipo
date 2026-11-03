# HANDOFF — Opciones completas y temas elementales

- **Rama:** `opciones-temas` (sin fusionar en `master`).
- **Fecha:** 2026-10-30.
- **Encargo:** temas elementales, opciones como las de DOFUS (Gráficos, Interfaz, Juego) y ventanas modales que caben en pantalla.

## Objetivo autorizado

Encargo del coordinador. El creador pidió temas por colores primarios («agua, viento, fuego, tierra y el verde de naturaleza») e iconos más grandes. Todo es **PROPUESTA**: nombres, colores, preajustes y valores por defecto los decide el creador.

## Qué funciona (y cómo probarlo)

Abrir Opciones desde el título o con Esc en partida. Cada cambio se aplica al momento y se guarda en este equipo.

### Temas

Hay 8 temas:
- Pergamino, el de siempre y el de por defecto.
- Fuego: brasa y ascua.
- Agua: azul profundo y turquesa.
- Viento: blanco y celeste. Es claro y frío.
- Tierra: arcilla y ocre.
- Naturaleza: verde. Es el antiguo Bosque.
- Claro.
- Alto contraste.

Un guardado viejo con `noche` pasa a `agua`, y uno con `bosque` pasa a `naturaleza`. Un valor desconocido pasa a Pergamino.

El contraste WCAG de cada tema lo comprueba un test (`tests/ui/options.test.ts`), sobre los cinco fondos: papel 0, 1 y 2, hueco y botón. Los mínimos son:
- tinta, 7 o más;
- tinta tenue y acento, 4,5 o más;
- tinta muy tenue, verde y rojo, 3 o más.

Para cumplirlos se oscurecieron tres colores que ya existían:
- la tinta muy tenue de Pergamino;
- el acento de Claro;
- la tinta muy tenue de Claro.

Las 4 letras siguen igual, todas del sistema.

### Pestaña «Gráficos»

La calidad gráfica tiene cuatro preajustes: Bajo, Medio, Alto (por defecto, el aspecto de antes) y Ultra. Al tocar una opción suelta, el preajuste pasa a «Personalizado».

| Opción | Cómo se aplica (sin rehacer la escena) |
|---|---|
| Sombras: no / bajas / altas | `sun.shadowEnabled`. Bajas: mapa de la mitad de lado (1024) con Poisson. Altas: el de `lighting.json` con PCF |
| Hierba y vegetación | Cambia `thinInstanceCount` en los trozos de hierba, flores y arbustos, es decir, lo que no bloquea el paso. Las instancias de cada trozo se guardan mezcladas, para que bajar la densidad no deje franjas. Árboles y rocas no cambian |
| Distancia de visión (100–700 m) | `camera.maxZ`, más una niebla mínima que llega al ~95 % en el plano lejano para que no se vea el corte |
| Partículas (0–150 %) | Multiplica las ráfagas y el ritmo de las estelas nuevas (`particleDetail` en `fx/particles.ts`) |
| Resolución interna (50–100 %) | `engine.setHardwareScalingLevel(1 / (escala × devicePixelRatio))`. Se vuelve a aplicar al cambiar el tamaño de la ventana |
| Suavizado: no / FXAA / MSAA | FXAA es un `FxaaPostProcess` que se pone y se quita. MSAA es del contexto WebGL: `main.ts` lee las opciones guardadas antes de crear el motor y aplica el cambio al reabrir el juego |
| Recortar lo que tapa al personaje | `OcclusionPlugin.setEnabled` |

### Pestaña «Interfaz»

- **Tema y letra.**
- **Tamaños.**
  - Tamaño general (ya existía).
  - Iconos de la barra de hechizos y casillas de la mochila, de 0,8× a 1,6× cada uno. La mochila se ensancha con sus casillas.
  - Letra del registro de combate, de 10 a 20 px.
- **Ventanas.**
  - Opacidad, de 50 a 100 %.
  - Animaciones de la interfaz: si se apagan, se quitan las transiciones. El aviso de subida de nivel se mantiene.
  - Retardo de los tooltips, de 0 a 1000 ms.
  - Bloquear ventanas y restablecer posiciones (ya existían).

### Pestaña «Juego»

- **Barras de vida de los enemigos:** siempre, sólo los heridos (por defecto, como antes), sólo el objetivo o nunca. El objetivo es `attackTarget` o, si no hay, `lastTarget`.
- **Nombre y nivel** sobre los enemigos.
- **Números de daño y curación** flotantes.
- **Alcance del hechizo al cargarlo:** implementación mínima. Mientras el jugador carga un hechizo con objetivo o con círculo apuntado, una línea pegada al suelo marca su alcance. No existe un modo de apuntar antes de lanzar; si se crea, esta opción debería mostrarlo ahí.
- **Trayectoria y cuadrícula:** se movieron aquí desde «Pantalla».
- **Confirmar antes de vender objetos raros o mejores:** sólo para objetos sueltos. Las pilas ya preguntan la cantidad.

### Ventanas modales

Ninguna modal pasa de la altura de la ventana. Cabecera, pestañas y botones finales quedan fijos y el contenido se desplaza por dentro. En Opciones se desplaza la página de la pestaña; en Atajos, la lista.

Medido en el navegador de desarrollo a 1280×720 con la interfaz al 150 %:
- **Opciones:** de 17 a 703 px y pestañas a 92 px.
- **Atajos:** cabecera a 18 px, botones a 681 px y lista con scroll (833 px de contenido en 318).

### Cómo probarlo

`npm run typecheck` y `npx vitest run` están en verde: 324 tests, 17 nuevos en `tests/ui/options.test.ts`.

## Mediciones

- **Navegador de desarrollo** (Vite en la pestaña del navegador, sin Electron): el preajuste Medio aplica, sin recargar:
  - escalado 1/0,85;
  - `maxZ` 300;
  - mapa de sombras 1024 con Poisson;
  - FXAA en la cámara;
  - y la hierba se reduce.

  Con «Siempre», los 43 enemigos muestran barra. La consola no da errores.
- **FPS por preajuste:** no se midió. Pendiente en local con `npm run bench:electron` o `__game.bench` cambiando de preajuste.

## Decisiones técnicas (PROPUESTA)

- **Preajustes.** No se guarda cuál se eligió: se deduce de los valores (`graphicsPresetOf`). Así nunca hay un preajuste que no cuadre con sus opciones.
- **Opciones nuevas.** Se mezclan con lo guardado en `normalizeOptions`: lo que falta toma el valor por defecto y los números se recortan a sus límites.
- **CSS nuevo.** Va en `src/ui/styles/options.css` y lee variables que pone `applyLook`: `--hotbar-icon-scale`, `--bag-icon-scale`, `--window-opacity`, `--combat-log-size` y la clase `no-ui-anim` en `<html>`. `menus.css` no se tocó.
- **Opacidad.** Se rehízo el fondo de `.panel` con `color-mix` sobre `--paper-*`. El diálogo con PNJ tiene su propio fondo y no cambia.

## Incertidumbres y avisos para quien siga

- **HUD.**
  - El tamaño de los iconos de la barra usa `zoom` sobre `.hot-slot`.
  - La sesión del HUD está rehaciendo la barra en `src/ui/menus/hud.ts`, y aquí no se tocó.
  - Si cambian las clases, hay que ajustar `options.css`.
  - Con 1,6× y 20 huecos, la barra puede no caber a 1280 px: decidirlo con el nuevo HUD.
- **Registro de combate.** Su tamaño se aplica a `.hud-log`, el registro del HUD antiguo. Si el HUD nuevo trae otro registro, hay que darle la misma variable.
- **MSAA.** Necesita reiniciar. La opción lo dice («MSAA (al reiniciar)»), pero no avisa de que hay un cambio pendiente.
- **Revisión visual pendiente en Electron.**
  - Los 8 temas en partida.
  - El tema Viento, que es claro, sobre el mundo.
  - Las sombras bajas.
  - La distancia corta con niebla de noche.
- **Para el creador.**
  - Si Viento debe ser claro, como ahora, u oscuro con acento celeste.
  - Qué preajuste va por defecto.
  - Si «Sólo los heridos» es el modo de barras por defecto.
- Si se fusiona con la rama del HUD, revisar conflictos en `src/ui/menus/index.ts`. Aquí sólo cambiaron `applyLook`, `sellFlow` y los imports.

## Archivos principales

- `src/ui/menus/saveStore.ts`: opciones, preajustes y migración de temas.
- `src/ui/menus/screens/modals.ts`: ventana de opciones con 7 pestañas.
- `src/ui/menus/index.ts`: `applyLook` y confirmación de venta.
- `src/ui/menus/tooltip.ts`: retardo.
- `src/ui/styles/themes.css` (temas) y `src/ui/styles/options.css` (nuevo).
- `src/render/arenaView.ts`: `applyGraphics` y `setRenderScale`.
- `src/render/atmosphere.ts`, `src/render/vegetationView.ts`, `src/render/fx/particles.ts`, `src/render/fx/spellFx.ts` y `src/render/enemyView.ts`.
- `src/main.ts`: aplica las opciones y crea el motor con MSAA según lo guardado.
- `tests/ui/options.test.ts` (nuevo) y `tests/ui/saveStore.test.ts`.

No se tomó ninguna decisión creativa: los nombres de los temas son los del encargo, y los colores y preajustes son PROPUESTA.
