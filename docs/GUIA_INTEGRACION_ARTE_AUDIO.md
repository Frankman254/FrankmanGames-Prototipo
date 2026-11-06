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
| `options.png` | `options` | Engranaje de bronce con brújula turquesa |
| `chat.png` | `chat` | Dos placas de conversación unidas por cordón |
| `camera.png` | `camera` | Cámara de explorador con lente turquesa |
| `characteristics.png` | `characteristics` | Tablero de atributos con tres gemas ascendentes |

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

## Contratos siguientes

- Interfaz: los doce iconos solicitados están entregados; el otro agente conecta
  las acciones y conserva fallback.
- Mapa: `assets/icons/map/<tipo>.png`, RGBA 256×256. Primer lote disponible:
  `piedra_pintada`, `taller`, `banco`, `castillo`, `mision`, `casa`, `mercader`,
  `mazmorra`, `muelle` y `lancha`. Dibujar a 24–32 px con `object-fit: contain`;
  usar halo CSS según selección, sin recolorear el PNG.
- Emotes: `assets/emotes/<id>.png` y, cuando corresponda, clip `Emote_<id>` en
  el GLB del personaje.
- Modelos: conservar escalas, nodos y clips definidos en
  `docs/REPARTO_CODEX.md`; acompañar cada entrega con una captura de revisión.
- Audio: `assets/audio/music/` y `assets/audio/sfx/`; cada pieza llevará una
  ficha con intención, región/acción, BPM o duración, bucle y punto de fundido.

## Música — Los Santos, lote 01

Directorio: `assets/audio/music/los_santos/`. PCM WAV estéreo, 44,1 kHz, 16 bit.
Bucle de 16 compases, 4/4, 74 BPM; duración aproximada 51,9 s.

| Archivo | Uso |
|---|---|
| `los_santos_mix.wav` | Mezcla lista para una primera integración |
| `los_santos_harmony.wav` | Pad, bajo y arpegio; base de exploración |
| `los_santos_melody.wav` | Marimba/cuerda y frase de aire |
| `los_santos_percussion.wav` | Tambor de madera, golpe grave y semillas |

Integración sugerida: empezar con `mix`; si el motor admite capas, usar los tres
stems sincronizados desde el mismo instante y variar sólo sus ganancias. Mantener
el tempo y la longitud exacta; fundir durante 2–3 s al cambiar de provincia. No
normalizar cada stem por separado: sus niveles relativos ya pertenecen a la
mezcla. El generador es determinista y no usa samples externos.

## Música — Iguanera y Herrera, lote 02

Mismo contrato técnico: PCM WAV estéreo, 44,1 kHz, 16 bit; mezcla y stems
`harmony`, `melody` y `percussion` con idéntica duración dentro de cada región.

| Región | Directorio | Tempo / duración | Carácter |
|---|---|---|---|
| Iguanera | `assets/audio/music/iguanera/` | 56 BPM · 51,429 s | Pentatónica luminosa, cuerdas pulsadas y aire; percusión ligera |
| Herrera | `assets/audio/music/herrera/` | 66 BPM · 43,636 s | Dórico grave, armonía más densa y madera/tambor más presentes |

Cada región tiene una composición, progresión, motivo, semilla y balance de
capas propios. No transponer una mezcla sobre otra. Para transición entre zonas,
fundir la región saliente antes de iniciar los stems entrantes en tiempo cero.

## Emotes — lote 01

Directorio: `assets/emotes/`. PNG RGBA 256×256. Los nombres coinciden con los
IDs actuales; el otro agente sustituye los emojis de sistema por rutas y mantiene
comando y texto de acción.

| ID / archivo | Símbolo original | Clip futuro |
|---|---|---|
| `wave` | Mano enguantada saludando | `Emote_wave` |
| `laugh` | Dos máscaras de madera riendo | `Emote_laugh` |
| `dance` | Botas en paso con cinta | `Emote_dance` |
| `cry` | Máscara de bronce con lágrima | `Emote_cry` |
| `angry` | Puño golpeando piedra | `Emote_angry` |
| `love` | Hojas que forman un corazón | `Emote_love` |
| `sleep` | Hamaca bajo luna creciente | `Emote_sleep` |
| `doubt` | Brújula ante tres caminos | `Emote_doubt` |

En la ventana se muestran a 48–64 px; sobre el personaje pueden mostrarse a
72–96 px. Usar `object-fit: contain`, sin recolorear. Los clips son otro lote:
estos PNG no presuponen que ya existan animaciones en el GLB.

## Prompts del lote 01

Generación con OpenAI ImageGen, fondo transparente. Especificación común:
icono de UI de fantasía pintado, legible a 48 px, objeto único centrado, luz
cálida superior izquierda, volumen alto, paleta cacao/vino/turquesa/oro, sin
texto, marco, marca de agua ni parecido deliberado con símbolos o composiciones
de Dofus. Sujetos: mochila de cuero y fibra; medallón de personaje; diario de
campo mágico; mapa plegado de un istmo tropical.

Los marcadores usan la misma paleta con una silueta más compacta y contraste
más fuerte para minimizar la pérdida al reducirlos a 24–32 px. Sujetos del
primer lote: piedra de viaje con sendero mineral, banco/cofre, fortín tropical,
puesto de taller y camino ascendente hacia una estrella.

Segundo lote de mapa: casa tropical de techo de teja, cesta de mercader, cueva
con escalones, muelle con amarre y lancha con toldo.
