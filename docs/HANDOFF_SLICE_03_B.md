# HANDOFF — Slice 03, rama B (interfaz)

Rama: `slice03-interfaz`, creada desde `master` (9fde1c8). Hecha en la nube,
sin Electron ni GPU: verificada con `npm test`, `npm run typecheck` y capturas
en Chromium headless (SwiftShader). Sin push a `master`.

- **Objetivo autorizado:** parte B del Slice 03 (`docs/ALCANCE_SLICE_03.md`,
  sección «Interfaz (rama B)»): título, creación de personaje, HUD, mochila con
  equipo, tooltips, hoja de personaje, libro de hechizos, pausa, opciones,
  guardado en 3 ranuras y atajos en datos, todo contra una `FakeSession`
  mientras la rama A (`slice03-sistemas`) hace la lógica real.

- **Qué funciona (con cómo probarlo):**
  - `npm test` → 94 tests en verde (38 nuevos en `tests/ui/`: atajos, modelo
    de arrastre y su aplicación a la sesión, ranuras y opciones, textos y
    tooltips, `FakeSession`, nombre del personaje). `npm run typecheck` limpio.
  - `npm run dev` (o `npx vite` y abrir el navegador):
    - **Título** sobre la escena 3D: Continuar (la ranura más reciente), Nueva
      partida, Cargar partida, Opciones, Salir (`window.close()`).
    - **Creación:** dos clases con descripción, estadísticas iniciales, recurso
      con su color y hechizos de inicio (tooltip); nombre de 2–16 letras.
      Al empezar se guarda en la primera ranura libre.
    - **HUD:** vida, recurso con el color de la clase, nivel, XP (pasar el
      ratón por la barra muestra el número), barra de 6 hechizos con barrido de
      enfriamiento/GCD, coste y gris sin recurso, pociones rápidas Q/E con la
      cuenta, estados con tiempo y pilas, retrato de la mascota, mensajes de
      botín/oro/hechizo aprendido y cartel de subida de nivel, accesos a I/C/K/Esc.
    - **Mochila (I):** cuadrícula 8×5, arrastrar y soltar (mover, apilar,
      equipar al muñeco, quitar al soltar en la mochila, anillo 1↔2), tirar
      soltando fuera de los paneles (confirmación con cantidad), clic derecho
      para usar/equipar/aprender/invocar, Ordenar, monedas, resumen de defensa.
    - **Tooltips:** color de rareza, tiradas con su rango, set con piezas y
      bonos activos, comparación con lo equipado (verde sube, rojo baja),
      requisito de nivel, valor de venta.
    - **Personaje (C):** principales con botón «+» si hay puntos; el resto por
      grupos; cada fila enseña el desglose por fuente al pasar el ratón.
    - **Libro (K):** hechizos de la clase (los no conocidos atenuados),
      universales y de otras clases conocidos; rango con rombos; arrastrar a la
      barra (si ya estaba en otro hueco se intercambian; sacar de la barra la vacía).
    - **Pausa (Esc):** continuar, guardar (3 ranuras, confirma al sobrescribir),
      cargar, opciones, salir al título (confirma). Esc cierra primero los
      paneles abiertos y luego abre la pausa. Con título, creación o cualquier
      ventana modal el mundo se detiene.
    - **Opciones:** sensibilidad e inversión de cámara, mostrar FPS (oculta el
      panel de medición), volumen; en `localStorage` (`frankmangames.options`).
    - **Guardado:** `SaveData` en `localStorage` (`frankmangames.save.0..2`),
      autoguardado al subir de nivel en la ranura de la partida.
    - **Atajos** en `data/ui/keybindings.json` (validado al cargar): 1–6 barra,
      Q/E pociones, Espacio evasión, I/C/K/Esc, L camino, T telemetría,
      **F6/F7/F8** prueba de carga (20/200/quitar), V modo, **F9** reiniciar arena.
  - Demostración en la arena: cada baja da XP y botín de mentira (`grantKill`
    de la `FakeSession`); 1 y 2 disparan además las dos habilidades del Slice 01
    para que la arena siga jugable. Desde la consola en `npm run dev`:
    `__game.session.grantXp(600)`.
  - Capturas: `docs/capturas/slice03/*.jpg` (23). Se regeneran con
    `npx vite --port 5199` y `node scripts/capturasMenus.cjs docs/capturas/slice03`.

- **Mediciones (FPS/frame time con N entidades, latencia de clic):**
  - No hay medición nueva de rendimiento: la nube no tiene GPU (SwiftShader da
    ~13 FPS con o sin menús, no es representativo). El HUD toca el DOM cada
    fotograma (anchos de barra, barrido, textos); hay que medir en el PC que
    no baje de lo del paso 3 (159 FPS con 200 entidades).
  - La medición `?bench` / `npm run bench:electron` arranca **sin menús**, como antes.

- **Decisiones técnicas tomadas y por qué (PROPUESTA):**
  - DOM + CSS sin framework sobre el lienzo, una capa `#menus` con subcapas
    (pantallas, juego, modales, mensajes, tooltip). Lógica de UI pura separada
    y testeada (`keybindings.ts`, `dragModel.ts`, `saveStore.ts`, `format.ts`).
  - Arrastre con eventos de puntero propios (no la API HTML5 de drag): fantasma
    y destino controlados, igual en Electron y headless. Soltar sobre un panel
    sin destino cancela; fuera de todo panel, tira (con confirmación).
  - Iconos SVG generados por código; los de hechizo se componen de elemento +
    forma del área, así sirven igual con el contenido real. Sin assets externos
    (anotado en `PROCEDENCIA.md`).
  - Columna izquierda compartida por Personaje y Libro (abrir uno cierra el otro);
    la mochila a la derecha; la barra nunca queda tapada.
  - Mientras haya menús, el HUD del Slice 01 (`.hud-bottom`, `.hud-msg`) se
    oculta por CSS; se conservan el registro y el cartel de fin de partida.
  - **Cambios en el contrato (`src/rpg/contracts.ts`, sólo añadidos y opcionales):**
    - `GameSessionFactory.content?: ContentDb` — la creación necesita las
      clases antes de que exista sesión. `mountMenus` lo exige (error claro si falta).
    - `GameSessionApi.hotbarState?(): HotbarSlotState[]` — enfriamiento
      restante/total y si hay recurso, para el barrido.
    - `GameSessionApi.castHotbar?(index)` — tecla 1–6; la lógica decide el apuntado.
    - `GameSessionApi.quickUse?(kind: 'health' | 'resource')` — Q/E.
    - Tipos nuevos `HotbarSlotState` y `QuickUseKind`.
    Sin ellos el HUD funciona igualmente (sin barrido y sin lanzar desde la barra).
  - Fuera de `src/ui/menus/**`: `src/main.ts` (montaje, acciones de teclado,
    puente de demostración y `__game.session`), `index.html` (capa `#menus`,
    título), una cadena de `src/ui/hud.ts` («[R] reiniciar» → «[F9]») y el
    script nuevo `scripts/capturasMenus.cjs`.

- **Incertidumbres que bloquean el siguiente paso:**
  - Ninguna bloquea. Para unir con la rama A:
    1. En `src/main.ts`, sustituir `createFakeFactory(...)` por la fábrica real
       y borrar `fakeSession`, `grantKill` y el puente de `hotbar1/2` (las tres
       cosas están comentadas como provisionales).
    2. La fábrica real debe exponer `content`; implementar `hotbarState`,
       `castHotbar` y `quickUse` si se quieren barrido y teclas (si el lanzamiento
       vive en `World`, `castHotbar` puede delegar en él con el cursor actual).
    3. `PlayerView.stats` debe traer **todas** las estadísticas que la hoja
       enseña (orden de `STAT_ORDER` en `fake/fakeSession.ts`); las fuentes del
       desglose se leen con el formato del contrato (`item:<uid>`, `set:<id>`,
       `pet:<id>`, `status:<id>`, `level`, y además `class`, `points` y
       `derived:<stat>` que usa la falsa; cualquier otra se muestra tal cual).
    4. El valor de las fracciones (`critChance`, `critBonus`,
       `cooldownReduction`) se muestra ×100 como %; `power` y `resist.*` ya son %.
  - Para el creador/coordinador (todo PROPUESTA): teclas; que Esc cierre
    paneles antes de pausar; que soltar fuera tire; que el mundo se pare en la
    pausa (es un juego de un jugador); textos de ayuda de las principales en la
    hoja (p. ej. «Espíritu: regeneración de recurso») salen de la sesión falsa
    y debe confirmarlos la rama A; nombres de amuletos de mascota («Silbato del
    zorro de ceniza»…) y de los sets («Equipo del Explorador», «Galas del
    Aprendiz de Tormenta») son de ejemplo.
  - La sensibilidad/inversión de cámara sólo se guardan: el rig orbital es de
    la rama local (`slice02-mundo-visual`), que debe leer `menus.options` /
    `menus.onOptions(...)`. El volumen no hace nada (no hay sonido).

- **Archivos principales:**
  - Montaje: `src/ui/menus/index.ts` (`mountMenus`), `src/main.ts`, `index.html`.
  - Pantallas: `src/ui/menus/screens/{title,creation,modals}.ts`.
  - Paneles: `src/ui/menus/{hud,inventory,character,spellbook,panel}.ts`.
  - Infraestructura: `context.ts`, `dom.ts`, `drag.ts`, `tooltip.ts`, `icons.ts`.
  - Lógica pura: `keybindings.ts`, `dragModel.ts`, `saveStore.ts`, `format.ts`.
  - Sesión falsa: `src/ui/menus/fake/{content,fakeSession}.ts` (2 clases,
    16 hechizos, 9 estados, 37 objetos, 2 sets, 3 mascotas).
  - Estilos: `src/ui/styles/menus.css`. Datos: `data/ui/keybindings.json`.
  - Tests: `tests/ui/*.test.ts`. Capturas: `docs/capturas/slice03/`.

- No se tomó ninguna decisión creativa: nombres y cifras de la sesión falsa son
  de ejemplo (de la lista del alcance cuando la había) y todo es PROPUESTA.
