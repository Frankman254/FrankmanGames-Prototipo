# Reparto con Codex

Decisión del creador (2026-11-06): Codex se limita a la producción visual y musical; el otro agente conecta esas entregas con el juego. Este documento dice qué archivos toca cada uno para no pisarse. Las referencias de Dofus viven sólo en `reference_assets/`, ignorado por Git; nunca son assets de producción. Todo original se registra en `PROCEDENCIA.md` antes de añadirse y se publica en master sin forzar.

## Paquete de Codex

| Área | Tareas (`docs/TAREAS.md`) | Qué entrega |
|---|---|---|
| Audio | T08 (lo que falta), F28, H13 | Pistas, capas, muestras y una ficha musical por provincia. Codex entrega archivos y especificación; el otro agente los conecta a datos, mezcla y reproducción |
| Emotes | F27, B06 | Emotes propios: dibujo o icono, más un clip `Emote_<id>` en el personaje. Las fichas de DOFUS solo sirven como lista de gestos; no se copia ningún archivo |
| Iconos | F06, F09 | Iconos de la interfaz (mochila, personaje, libro, mapa, oficios, opciones…) y del mapa y el minimapa (Piedra Pintada, cada taller, banco, castillo, casa importante, mercader, misión, mazmorra, muelle) |
| Texturas | A03 | Texturas libres (por ejemplo CC0) para corteza, hojas, madera, piedra, arena, tierra, césped y tela, aplicadas con UV |
| Modelado | A01, A02, A06, B07 (lo que falta), F18, F19, F21 (solo el modelo), F23, F24 | Flora en su sitio real, biblioteca de piezas, personajes de las fichas, armas y escudos de cada objeto, animaciones naturales, la montura de desarrollador, muebles y piezas del mundo, y símbolos panameños |
| Estilo | F22 (preparar las capturas) | Capturas del mismo sitio en estilo anime y realista para que elija el creador |

## Archivos de cada uno

| Archivos | De quién |
|---|---|
| `scripts/blender/**`, `scripts/audio/**`, `assets/models/**`, `assets/textures/**`, `assets/audio/**`, `arte/**`, `assets/emotes/**`, `assets/icons/**` | Codex |
| `reference_assets/**` | Codex, sólo local e ignorado por Git; no se integra ni publica |
| `src/audio/**`, `data/audio/**`, `scripts/generateSfx.mjs`, `scripts/checkMusic.ts`, `tests/audio.test.ts` | Otro agente: integra y prueba las entregas musicales de Codex |
| `src/ui/menus/icons.ts`, `src/ui/map/mapDraw.ts` y demás código consumidor | Otro agente: carga los PNG/GLB/WAV entregados por Codex |
| `data/vegetation.json` | Otro agente; Codex entrega modelos, texturas y ficha de uso |
| En `data/vegetation.json`: `props` (casas, castillo, estandartes y lanchas: dónde va cada edificio) | Claude |
| `data/ui/chat.json` | Otro agente; Codex entrega icono, clip y contrato de cada emote |
| Todo lo demás de `src/`, `data/`, `tests/` y `scripts/` | Claude |
| `PROCEDENCIA.md` | Los dos: solo se añaden filas |
| `docs/TAREAS.md` | Los dos: cada uno cambia solo sus filas |
| `docs/BITACORA.md` | Los dos: cada uno añade su entrada arriba |
| `scripts/qaElectron.mjs` | Los dos: Claude añade escenarios antes de `async cripta()`; Codex, al final de la lista de escenarios |

Antes de publicar: `git pull --rebase`, `npx vitest run`, `npx tsc --noEmit` y `npm run docs:check`. Si hay un conflicto en un archivo del otro, se conserva lo del otro y se avisa.

## Contratos entre los dos

Para que el código de Claude y los modelos de Codex encajen sin tocar el trabajo ajeno:

| Pieza | Contrato |
|---|---|
| Arma o escudo de un objeto (F17 y F18) | Un nodo `obj_<itemId>` en `assets/models/equipo.glb`. Su origen es el punto de agarre; el filo o la punta miran a +Z de Blender, y el escudo, de frente hacia −Y. Escala real en metros. Claude lo coloca en la mano según lo equipado; si falta el nodo, el juego muestra la forma genérica de su tipo |
| Lanza y escudo del Centinela | Pasan a ser objetos del juego. Claude crea los objetos en `data/rpg/items.json`; Codex exporta sus nodos como `obj_<id>` |
| Montura de desarrollador (F21) | Modelo `assets/models/montura_arpia.glb`, con los clips de `montura.glb` y los mismos nombres. Claude hace que esté equipada desde el nivel 1 solo en `npm run dev` |
| Montura voladora, segunda versión (F21, creador 2026-11-06) | El creador encuentra la arpía actual gris, seca y sin ternura. Pide un ave montable **tierna, con color y plumas que suben**. Su imagen de referencia es la falcolomba de DOFUS: **no se copia** su silueta, paleta (negro con puntas crema y pico y patas naranjas), rollo de silla ni detalles; solo la idea general de «ave rapaz joven y montable». Propuesta original: **pichón de águila arpía de Darién**. Proporción chibi (cabeza grande, cuerpo redondo, patas cortas y gruesas), ojos grandes y redondos. Penacho doble que se abre hacia arriba, el rasgo real de la arpía. Plumas primarias y cola que se curvan hacia arriba en abanico. Paleta propia: gris pizarra suave y plumón blanco cálido, collar más oscuro, garras y pico amarillo pálido, y una manta de silla con ribete de mola turquesa y coral. Mismo archivo `montura_arpia.glb`, origen entre las patas, morro hacia +Z. Clips `Reposo` y `Trotar` (los que ya lee el juego) y además `Volar` (aleteo) y `Planear`: el código los usará en vuelo en cuanto existan. Silla a ~1,2 m (`rideHeight`). Opcional para el rig humanoide: clip `Montar` (jinete sentado), que sustituiría a la postura que hoy hace el código |
| Emote | En `data/ui/chat.json`, cada emote lleva `id`, `icon` (ruta en `assets/emotes/`) y, si se anima, `clip`, con el nombre del clip `Emote_<id>` en el GLB del personaje |
| Icono del mapa | Un archivo por tipo en `assets/icons/map/<tipo>.png` o `.svg`. Los tipos son los de `MarkerKind` en `src/ui/map/mapDraw.ts`, más `taller`, `banco`, `castillo`, `casa`, `mazmorra` y `muelle`. Claude añade esos tipos al mapa con su posición |
| Icono de la interfaz | `assets/icons/ui/<accion>.png`, RGBA 256×256, donde `accion` es el id de `data/ui/keybindings.json` (`inventory`, `character`…). El otro agente decide el cargador y conserva el fallback provisional |
| Animaciones del personaje (F19) | Mismo esqueleto y mismos nombres de clip que hoy (`scripts/blender/fg_rig.py`); el juego no cambia |

## Pedido del 2026-11-08 (Claude orquesta; Codex y la IA local modelan)

El creador pide terminar los personajes, que se puedan elegir con su sexo al crear partida, y rehacer armas, objetos y personajes, que «se ven horribles». Claude reparte el trabajo, conecta las entregas con el juego y las revisa antes de integrarlas. Cada pedido tiene una fila `P##` en `docs/TAREAS.md`; quien lo toma cambia solo el estado de su fila.

**Asignación de fichas a clases** (decisión del orquestador, que cierra la duda de A06):

| Clase (`data/rpg/classes.json`) | Ficha | Modelos |
|---|---|---|
| `ember_vanguard`, Vanguardia de Brasa | Centinela del Istmo | `centinela.glb` (masculino, existe) y `centinela_f.glb` (femenino, falta) |
| `storm_weaver`, Tejedora de Tormentas | Oráculo de Bruma | `oraculo.glb` y `oraculo_f.glb` |
| `mangrove_hunter`, Cazador del Manglar (clase nueva: arquero) | Cazador del Manglar | `cazador.glb` y `cazador_f.glb` |
| Clase futura (aún no existe) | Forjador del Trueno | No se modela todavía |

| Pedido | Para | Qué entregar | Contrato |
|---|---|---|---|
| P01 Personajes nuevos | Codex | Oráculo de Bruma y Cazador del Manglar, cada uno masculino y femenino, más el Centinela femenino. Parten de las láminas de `docs/texturas_diseño_personajes/` | Esqueleto común `fg_rig.py` con los mismos huesos y nombres que `centinela.glb`, y los mismos clips: `Reposo`, `Caminar`, `Correr`, `Golpeado`, `Morir`, `Atacar`, `Lanzar`, `Rodar` y los `Emote_*`. El cazador añade `Disparar` (tensar y soltar el arco, con el evento de disparo a mitad). La altura y el origen de `centinela.glb`, mirando a +Z. Un atlas PBR (`fg_atlas.py`), pintado a mano en el estilo «pintura» del juego (colores planos, sombras pintadas, sin ruido fotográfico). Un generador `scripts/blender/<id>.py` y una captura de revisión en `docs/capturas/<id>/` |
| P02 Personajes actuales | Codex | Rehacer `personaje.glb` (humanoide de piezas) y repasar `centinela.glb`. Proporción estilizada y legible desde la cámara del juego (cabeza algo mayor, manos y pies claros), caras con rasgos pintados, sin aristas sueltas ni piezas flotando | Mismo esqueleto, clips y nombres de piezas que hoy (`Lanza`, `Escudo`, `Arma_*`, `Pelo_*`…), para que el código siga funcionando sin cambios |
| P03 Armas y equipo visible | Codex | Un nodo `obj_<itemId>` en `assets/models/equipo.glb` por cada arma, escudo, sombrero o capa de `data/rpg/items.json`, incluidos los nuevos de este pedido: `reed_bow`, `cane_bow`, `mangrove_bow`, `palm_cap`, `cotton_bandana`, `leather_cap` y `palm_cape` | El de siempre: origen en el agarre, filo o punta hacia +Z y escudos de frente hacia −Y. El arco se sujeta por el centro y la cuerda queda hacia −Y. Escala real. Si falta un nodo, el juego usa la pieza genérica |
| P04 Iconos nuevos | Codex o IA local | PNG 256×256 de los objetos nuevos de este pedido y de los hechizos del cazador: `hunter_arrow`, `powder_arrow`, `reed_cross`, `piercing_shot`, `heron_leap`, `hawk_eye`, `vine_arrow` y `arrow_downpour` | `assets/icons/items/<itemId>.png` y `assets/icons/spells/<spellId>.png`, con la misma familia visual del lote 01. Pasar el validador del lote |
| P05 Utilería sencilla | IA local | Piezas de prueba simples (cajas, barriles, vallas) con `scripts/blender/utileria.py` como plantilla | Una pieza por encargo, con su captura. Claude las revisa antes de usarlas |

**Reglas para la IA local** (la entrega de Crestalba del 2026-11-07 se descartó por esto):

1. **Rutas relativas.** Las rutas salen de `__file__`; no se escribe `C:/Users/...`.
2. **Errores a la vista.** Prohibido `try/except: pass`: si algo falla, que se vea.
3. **Nada de colas, cabezas ni geometría que no estén en la lámina o el contrato.**
4. **Un generador por modelo, sin envoltorios.** No se crean `run_*.py` ni informes en `docs/historico/`; la nota va a `docs/BITACORA.md`.
5. **Sin parecidos.** Nada se parece a criaturas, personajes o equipo de DOFUS ni de FATE: solo se toman ideas de función, nunca la forma ni el nombre.
6. **Siempre con prueba.** Cada entrega lleva su captura y pasa `node scripts/checkModels.mjs`, si existe, o `npx vitest run tests/modelos.test.ts`.

## Lo que sigue haciendo Claude

F05, F07, F10, F11, F12, F13, F14, F16, F17 (código), F20, F21 (código), F25, F26 y F29; además del balance (T01), los mapas y provincias (M), las decisiones pendientes y los recorridos de prueba.
