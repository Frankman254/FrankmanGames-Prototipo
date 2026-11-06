# Guía de integración de arte y audio

Contrato entre Codex, que produce arte y música, y el agente que los conecta al
juego. Las referencias locales de `reference_assets/` no forman parte de esta
entrega: están ignoradas por Git y está prohibido cargarlas o empaquetarlas.

## Regla de incorporación

1. Integrar únicamente archivos bajo `assets/` que aparezcan en
   `PROCEDENCIA.md`.
2. Mantener un fallback para cada asset mientras se completa el catálogo.
3. No renombrar un archivo publicado sin actualizar este contrato y todos sus
   consumidores.
4. Verificar legibilidad a tamaño real, no sólo ampliado: iconos a 32, 48 y
   64 px; marcadores de mapa a 24 y 32 px.
5. Codex no modifica el código consumidor. Si una entrega necesita otro nombre,
   tamaño o canal, se corrige el asset o se actualiza aquí el contrato.

## Iconos de interfaz — lote 01

Directorio: `assets/icons/ui/`. Formato: PNG RGBA, 256×256, contenido centrado
en una caja útil aproximada de 232×232.

| Archivo | Acción | Estado visual |
|---|---|---|
| `inventory.png` | `inventory` | Mochila de cuero y fibra tejida |
| `character.png` | `character` | Medallón de bronce con perfil abstracto |
| `spellbook.png` | `spellbook` | Diario verde azulado atado con cordón vino |
| `map.png` | `map` | Mapa plegado de istmo tropical |
| `journal.png` | `journal` | Diario de campo enrollado con pluma y marcador |
| `compendium.png` | `compendium` | Folio naturalista con rana y hoja prensada |
| `professions.png` | `professions` | Martillo, formón y brote unidos por cordón |
| `pause.png` | `pause` | Tres placas de oro dentro de madera tallada |

Integración sugerida: el HUD carga el PNG por acción y conserva el SVG actual
si el archivo no existe. Usar `object-fit: contain`; no recortar, recolorear ni
añadir otro marco dentro de la imagen. El brillo y el estado deshabilitado se
resuelven en CSS para no duplicar archivos.

### Dirección visual del conjunto

- lectura inmediata por silueta antes que microdetalle;
- volumen pintado con luz cálida desde arriba a la izquierda;
- sombras profundas, borde de luz dorado y materiales reconocibles;
- paleta común: cacao, vino, turquesa, verde profundo y oro envejecido;
- un objeto principal por icono, fondo transparente y sin texto;
- símbolos y composiciones originales; la referencia sólo informa el nivel de
  acabado y la jerarquía visual.

## Próximos contratos

- Interfaz: `options`, chat y acciones de cámara.
- Mapa: `assets/icons/map/<tipo>.png`, RGBA 256×256; tipos definidos en
  `docs/REPARTO_CODEX.md`.
- Emotes: `assets/emotes/<id>.png` y, cuando corresponda, clip `Emote_<id>` en
  el GLB del personaje.
- Modelos: conservar escalas, nodos y clips definidos en
  `docs/REPARTO_CODEX.md`; acompañar cada entrega con una captura de revisión.
- Audio: `assets/audio/music/` y `assets/audio/sfx/`; cada pieza llevará una
  ficha con intención, región/acción, BPM o duración, bucle y punto de fundido.

## Prompts del lote 01

Generación con OpenAI ImageGen, fondo transparente. Especificación común:
icono de UI de fantasía pintado, legible a 48 px, objeto único centrado, luz
cálida superior izquierda, volumen alto, paleta cacao/vino/turquesa/oro, sin
texto, marco, marca de agua ni parecido deliberado con símbolos o composiciones
de Dofus. Sujetos: mochila de cuero y fibra; medallón de personaje; diario de
campo mágico; mapa plegado de un istmo tropical.
