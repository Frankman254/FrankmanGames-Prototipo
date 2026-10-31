# HANDOFF — Modo edición y colisión junto a las paredes

- **Rama:** `modo-edicion` (sin fusionar en `master`).
- **Fecha:** 2026-10-30.

## Objetivo

Lo pidió el creador: «que el proyecto vaya preparándose para editarse en un
modo edición del juego con el propio juego abierto, guardando esos datos en
algún lado». Hoy no puede mover casas, árboles ni PNJ, ni marcar zonas donde
no se camina. También vio que alrededor de las casas la rejilla bloquea
demasiado lejos y el personaje no puede pegarse a la pared.

## Qué funciona y cómo probarlo

1. Arranca el juego con `npm run dev` (Electron) o `npx vite` (navegador).
2. Pulsa **F12** en cualquier pantalla, incluso en el título. Es la acción
   `editor` de `data/ui/keybindings.json` y se puede cambiar en Opciones.
   - La simulación se pausa.
   - El HUD y los menús se apartan.
   - La cámara pasa a ser libre.
3. Vuelve a pulsar F12 para salir. La cámara vuelve al jugador.

### Cámara

| Acción | Control |
|---|---|
| Mover | WASD o flechas (Mayús = más rápido) |
| Girar | Clic derecho y arrastrar |
| Desplazar | Rueda pulsada y arrastrar |
| Zoom | Rueda |
| Centrar en lo elegido | F |

### Herramientas

Se cambian con los botones del panel o con las teclas 1, 2 y 3.

**1 · Seleccionar**
- Haz clic en un objeto y arrástralo por el suelo.
- Se puede elegir:
  - casas, troncos, rocas grandes y farolas (`props`);
  - árboles y rocas, generados o puestos a mano;
  - PNJ y mercaderes;
  - estanques;
  - áreas de zona;
  - el inicio del jugador.
- Teclas:
  - R / Mayús+R: girar. Las casas giran de 90 en 90: cambia el lado de la
    puerta, y el ancho y el fondo se intercambian. Los árboles giran de 15 en 15.
  - `[` y `]`: tamaño.
  - Supr: borrar.
  - Esc: soltar.
- El panel enseña las propiedades numéricas, y la lista de objetos cercanos
  tiene un filtro.

**2 · Añadir**
- Elige algo en la paleta y haz clic en el suelo:
  - casa, tronco, roca grande, farola, pino, roble, arbusto o roca;
  - un área circular o rectangular para la zona elegida.

**3 · Navegación**
- Un pincel con radio pinta celdas sobre la cuadrícula. La cuadrícula es la
  rejilla tal como quedará al guardar.
- Modos:
  - **Bloquear:** no se pisa.
  - **Liberar:** se pisa aunque un obstáculo bloquee.
  - **Automático:** borra lo pintado.
- Mientras pintas, Mayús = Liberar y Alt = Automático.

### Zonas

- Se ve el contorno de cada área con el nombre de su zona (en verde las seguras).
- Una área se puede mover, cambiar de tamaño (o editar sus bordes con números),
  añadir o borrar. No se puede borrar la única área de una zona.

### Deshacer

- **Ctrl+Z** deshace y **Ctrl+Y** (o Ctrl+Mayús+Z) rehace, hasta 200 pasos.
- Un arrastre o una pincelada cuenta como un solo paso.

### Guardar

- **Ctrl+S** o el botón «Guardar» (sólo en desarrollo):
  - escribe los JSON que cambiaron en `data/`, con el mismo formato;
  - Vite recarga el juego y el editor vuelve a abrirse donde estaba (sessionStorage).
- «Exportar JSON» descarga los archivos que cambiaron, para la versión
  empaquetada o si se prefiere copiarlos a mano.
- Antes de escribir, el editor valida con los mismos parsers del juego
  (terreno, vegetación, navegación y zonas). También comprueba que cada sitio de
  pesca coincide con su estanque. Si algo falla, no escribe nada.

Se probó en el navegador del panel (`npx vite --port 5181`):
- abrir y cerrar el editor;
- zoom;
- arrastrar una casa;
- deshacer;
- pintar la navegación con la cuadrícula visible;
- guardar: Ctrl+S escribió sólo la línea de esa casa en `data/vegetation.json`
  y la recarga la mostró en su sitio nuevo. Luego se devolvió el archivo a como
  estaba con `git checkout`.

## Qué se guarda y dónde

| Qué | Archivo |
|---|---|
| Casas, troncos, rocas grandes, farolas | `data/vegetation.json` → `props` |
| Árbol o roca puesto o movido a mano | `data/vegetation.json` → `placements` (nuevo) |
| Árbol o roca generado que se quitó o se movió | `data/vegetation.json` → `exclusions` (nuevo) |
| PNJ | `data/rpg/npcs.json` → `position` |
| Mercaderes | `data/rpg/merchants.json` → `position` |
| Estanques | `data/terrain.json` → `ponds` y, a la vez, su `spot` de `data/rpg/fishing.json` |
| Inicio del jugador | `data/terrain.json` → `playerStart` |
| Áreas de zona | `data/zones.json` → `areas` |
| Celdas pintadas | `data/navpaint.json` (nuevo): tramos `[fila, colInicio, colFin]` |

- Mover un árbol generado lo convierte en uno «a mano»: se excluye el original
  y se añade una colocación igual en el sitio nuevo.
- En el editor, una cruz roja marca dónde había un árbol quitado.

## Colisión junto a las paredes (paso 6)

### Antes

- Una celda de 0,5 m se bloqueaba si su **centro** quedaba a menos de
  `navRadius` (0,5) del obstáculo.
- Al hacer clic en la pared, el personaje iba al **centro** de la celda libre
  más cercana.
- Resultado: se quedaba a 0,75 m de la pared. Además, con obstáculos que no
  caen en la rejilla, un punto de una celda libre podía quedar a sólo 0,25 m
  (se metía en el obstáculo).

### Ahora

- **La celda se mide por su borde** (`src/sim/navGrid.ts`): se bloquea si
  *algún punto* de ella queda a menos de `navRadius`. Cualquier punto de una
  celda libre vale, así que el personaje puede pararse en su borde.
- **El destino se pega a la pared** (`src/sim/pathfinder.ts`): si haces clic
  en un sitio bloqueado, el camino termina en el punto de la celda libre más
  cercano al clic, en vez de en su centro.
- **Troncos y rocas son redondos** (`RectObstacle.round`): ya no bloquean las
  esquinas de una caja que no existen.
- **Resultado:** en una casa alineada con la rejilla, el personaje se para a
  0,5 m de la pared. Su radio de colisión es 0,45, así que la toca sin
  atravesarla. Está en `tests/editor.test.ts → colisión junto a las paredes`.
- `navRadius` sigue en 0,5. Bajarlo no acerca más a una pared alineada: la
  rejilla de 0,5 m manda.

### Sigue funcionando

- A* y el suavizado.
- La población de zonas (más de 5 monstruos al empezar).
- El camino principal de punta a punta.
- Un paseo largo del jugador por el mundo real (tests).

## Decisiones técnicas (PROPUESTA)

- **Guardar con un plugin de Vite, no con IPC de Electron.**
  - El plugin está en `scripts/editorSave.ts` y está registrado en `vite.config.ts`.
  - Con `apply: 'serve'` sólo existe en `npm run dev`. En el build ni siquiera
    queda la ruta: lo comprobé buscando `__editor/save` en `dist`.
  - Electron queda igual: sin preload, con `contextIsolation` y `sandbox`, y sin
    acceso a disco desde el renderer. Con IPC habría que añadir un preload y un
    canal de escritura que acabaría en el ejecutable empaquetado.
  - Defensas:
    - lista blanca de rutas (`src/editor/files.ts`);
    - sólo `POST` con `application/json`;
    - cabecera propia `x-fmg-editor` (una web ajena no puede mandarla sin
      permiso CORS, que nunca se da);
    - origen local;
    - 8 MB como máximo;
    - cada archivo tiene que ser JSON válido;
    - la escritura es atómica (archivo temporal y luego `rename`).
- **Mismo formato al guardar** (`src/editor/jsonFormat.ts`).
  - Se reutiliza el texto original de todo lo que no cambió, incluidas las
    columnas alineadas a mano de `kinds`.
  - Lo nuevo copia el estilo de sus hermanos: en una línea o en varias.
  - Se conservan CRLF y el salto final.
  - Mover una casa cambia una sola línea.
- **La dispersión de vegetación es estable.**
  - Cada tipo tiene su propia secuencia aleatoria.
  - Cada candidato gasta siempre seis números, se acepte o no.
  - Un ejemplar quitado sigue ocupando su sitio para los vecinos.
  - Así, quitar un árbol no cambia ningún otro, mover una casa sólo cambia lo
    de alrededor y las exclusiones siguen apuntando al mismo árbol.
  - **Efecto secundario:** el bosque generado cambió *una vez* respecto a
    `master`. Siguen la misma densidad, las mismas reglas y la misma semilla,
    pero los árboles están en otros sitios.
- **El editor no reconstruye el mundo real en vivo.**
  - Dibuja cajas y cilindros translúcidos tal como quedarán, y la cuadrícula
    exacta: regenera la dispersión de los tipos que bloquean con el mismo código.
  - Las casas y rocas originales se ocultan mientras se edita (casilla en Capas).
  - Al guardar, Vite recarga y el mundo se regenera de verdad.
  - Los árboles reales (thin instances) no se ocultan uno a uno; el movido se
    ve en su sitio nuevo como cilindro.
- **La selección es geométrica:** rayo contra cajas, más el punto del suelo
  para estanques y áreas. No usa picking de mallas.
- **Los objetos pequeños se dibujan sólo cerca:** 70 m alrededor del foco de la
  cámara, porque hay miles de árboles.
- **Qué no se borra:**
  - PNJ, mercaderes y estanques no se borran ni se crean: llevan diálogos,
    tiendas y tablas de pesca, que son contenido.
  - El inicio y la única área de una zona tampoco se borran.

## Incertidumbres para el coordinador o el creador

1. **El bosque cambió una vez.** ¿Se acepta, o hay que conservar el de antes?
   Conservarlo es incompatible con exclusiones estables.
2. **¿Rejilla de 0,25 m?** Con 0,5 m, a una pared alineada no se llega a menos
   de 0,5 m. Con 0,25 se llegaría a unos 0,25, pero A* y la memoria cuestan
   unas cuatro veces más. Está en datos (`data/zone.json → cellSize`): se puede
   probar sin tocar código. Lo pintado en `navpaint.json` sólo vale para el
   `cellSize` con el que se pintó.
3. **Los cambios sin guardar se pierden con cualquier recarga de Vite**, por
   ejemplo si otro agente edita código mientras tanto. ¿Hace falta autoguardar
   el borrador en sessionStorage?
4. **Faltan piedras de viaje y puntos de aparición fijos en el editor.** Las
   piedras de viaje existen (hoy «Piedras Pintadas», `data/stones.json`), pero
   el editor aún no las mueve. Los monstruos salen por zona (`zones.json`), y
   eso sí se edita. Basta con añadir su categoría a `src/editor/doc.ts`.
5. **Pendiente en local:**
   - Probar en Electron con ventana grande (aquí se probó en el panel del navegador).
   - Medir los FPS con el editor abierto.
   - Revisión visual del creador.

## Archivos principales

- `src/editor/`: lógica pura, sin DOM ni Babylon.
  - `doc.ts`: documento, objetos y operaciones.
  - `jsonFormat.ts`: guardar con el formato original.
  - `history.ts`: deshacer y rehacer.
  - `navBrush.ts`: pincel de navegación.
  - `files.ts`: lista blanca de archivos.
- `src/ui/editor/`: parte visual.
  - `index.ts`: `mountEditor`, ratón, teclado, guardar y exportar.
  - `editorView.ts`: cámara libre, lo que se dibuja y la selección.
  - `panel.ts`: panel lateral.
  - `editor.css`.
- `scripts/editorSave.ts` y `vite.config.ts`: guardado en desarrollo.
- `src/sim/navGrid.ts`: celda por borde, `round`, `NavPaint`, `buildZoneGrid`.
- `src/sim/pathfinder.ts`: destino pegado a la pared.
- `src/world/scatter.ts` y `src/data/worldSchema.ts`: `placements`,
  `exclusions`, `parseNavPaint`.
- `data/navpaint.json`: nuevo.
- `src/main.ts`: tres líneas (import, `mountEditor` y la pausa).
- `src/render/gridView.ts`: radio configurable.
- `data/ui/keybindings.json` y `src/ui/menus/keybindings.ts`: acción `editor`.
- `tests/editor.test.ts`: 25 tests.
  - Formato JSON, deshacer, pincel, documento y guardado.
  - Colisión junto a la pared y estabilidad de la vegetación.

No se tomó ninguna decisión creativa: no se movió nada del mundo. Las
posiciones y tamaños por defecto de la paleta son `PROPUESTA`.
