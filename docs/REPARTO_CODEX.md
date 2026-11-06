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
| `scripts/blender/**`, `assets/models/**`, `assets/textures/**`, `assets/audio/**`, `arte/**`, `assets/emotes/**`, `assets/icons/**` | Codex |
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
| Emote | En `data/ui/chat.json`, cada emote lleva `id`, `icon` (ruta en `assets/emotes/`) y, si se anima, `clip`, con el nombre del clip `Emote_<id>` en el GLB del personaje |
| Icono del mapa | Un archivo por tipo en `assets/icons/map/<tipo>.png` o `.svg`. Los tipos son los de `MarkerKind` en `src/ui/map/mapDraw.ts`, más `taller`, `banco`, `castillo`, `casa`, `mazmorra` y `muelle`. Claude añade esos tipos al mapa con su posición |
| Icono de la interfaz | `assets/icons/ui/<accion>.png`, RGBA 256×256, donde `accion` es el id de `data/ui/keybindings.json` (`inventory`, `character`…). El otro agente decide el cargador y conserva el fallback provisional |
| Animaciones del personaje (F19) | Mismo esqueleto y mismos nombres de clip que hoy (`scripts/blender/fg_rig.py`); el juego no cambia |

## Lo que sigue haciendo Claude

F05, F07, F10, F11, F12, F13, F14, F16, F17 (código), F20, F21 (código), F25, F26 y F29; además del balance (T01), los mapas y provincias (M), las decisiones pendientes y los recorridos de prueba.
