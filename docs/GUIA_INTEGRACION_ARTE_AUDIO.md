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

## Locomoción humanoide — lote 01

`assets/models/personaje.glb` y `assets/models/centinela.glb` contienen dos
ciclos compatibles con el mismo rig:

| Clip | Duración de autoría | Uso |
|---|---:|---|
| `Caminar` | 33 fotogramas | Desplazamiento humanoide lento; nuevo, pendiente de selección por velocidad |
| `Correr` | 21 fotogramas | Desplazamiento normal/rápido; conserva el nombre ya usado por el juego |

Los ciclos no avanzan en el eje frontal: el motor conserva la autoridad sobre
la posición. Sólo animan altura y balance lateral de la raíz, piernas, pelvis,
torso, cabeza y brazos. Para `Caminar`, disparar pasos cerca de `t=0.03` y
`t=0.52`; `Correr` conserva los eventos existentes cerca de `t=0.05` y
`t=0.55`. Al cambiar entre reposo, caminar y correr, fundir durante 0,12–0,18 s
en lugar de cortar la pose. La revisión reproducible está en
`scripts/blender/revisar_locomocion.py` y genera ocho fotogramas de cada ciclo.

## Equipamiento visible — lote 01

Archivo: `assets/models/equipo.glb`. Contiene un nodo `obj_<itemId>` para los
objetos actuales de `weapon`, `offhand`, `head` y `back`: 50 nodos en total
(35 de mano, 12 de cabeza y 3 capas), incluidas la lanza y el escudo del
Centinela. `scripts/blender/equipo.py` regenera la biblioteca desde
`data/rpg/items.json` y falla si aparece un tipo visual todavía no soportado.

Contrato para el otro agente:

- cargar la biblioteca una vez y mantener todos sus nodos desactivados;
- clonar o instanciar sólo `obj_<id equipado>` en la mano correspondiente;
- el origen del nodo es el agarre; punta o filo miran hacia +Z de Blender;
- los escudos miran de frente hacia −Y y se colocan en la mano secundaria;
- cabeza: origen en el centro del cráneo, frente hacia −Y, sin escala adicional;
- capas: origen en la base del cuello, caen hacia −Z por la espalda (+Y);
- no aplicar una escala distinta por rareza o nivel: las medidas ya son reales;
- si falta un nodo, conservar el fallback genérico y registrar el ID ausente.

`scripts/blender/validar_equipo.py` exige correspondencia exacta con los IDs,
malla no vacía, origen común y escala/anclaje razonables. `revisar_equipo.py`
genera una lámina frontal rotulada de todo el catálogo.

## Montura arpía de desarrollo — lote 01

Archivo: `assets/models/montura_arpia.glb`. Modelo original de ave terrestre
grande inspirado sólo en rasgos generales del águila harpía panameña: plumaje
gris pizarra y marfil, máscara oscura, cresta doble, pico ganchudo, patas
amarillas, garras, alas plegadas, cola rayada y silla propia.

Contrato ya esperado por el juego:

- orientación frontal −Y, +Z arriba y apoyo en z=0;
- armadura raíz `FG_MonturaArpia`;
- clips `Reposo` (96 fotogramas) y `Trotar` (25 fotogramas);
- 1 452 triángulos, una malla y siete materiales;
- silla alrededor de z=1,31 m; conservar `rideHeight: 1.2` de los datos;
- no convertir el trote en vuelo: F21 es una montura terrestre de prueba.

`scripts/blender/validar_montura_arpia.py` comprueba clips, apoyo, altura y
presupuesto de triángulos. Para capturas se usa `revisar_personaje.py`; en la
fase elevada medida, las garras quedan a menos de 1 cm del suelo.

## Utilería modular — lote 01

Archivo: `assets/models/utileria.glb`. Contiene 18 nodos independientes y
originales, listos para instanciar desde los datos:

`prop_amarradero`, `prop_banco`, `prop_barril`, `prop_bebedero`, `prop_cajon`,
`prop_carreta`, `prop_cerca`, `prop_chimenea`, `prop_escalera`,
`prop_farol_poste`, `prop_fogata`, `prop_mesa_larga`, `prop_mesa_redonda`,
`prop_poste_camino`, `prop_rancho_paja`, `prop_silla`, `prop_tinaja_alta` y
`prop_tinaja_redonda`.

Contrato de integración:

- cargar la biblioteca una vez e instanciar `prop_<id>`; no separar sus
  materiales ni reconstruir las piezas con primitivas del juego;
- origen de cada nodo en el centro de la base, +Z vertical y escala en metros;
- usar las piezas sin escala o entre 0,9–1,1 para variación; variar rotación,
  no deformarlas de manera distinta por poblado;
- `prop_carreta` mira hacia −Y; `prop_chimenea`, `prop_banco`, `prop_silla` y
  las señales muestran su frente hacia −Y;
- `prop_farol_poste` y `prop_fogata` ya incluyen material emisivo, pero el
  integrador puede añadir luces de rango corto sin alterar la geometría;
- colisión simplificada aparte: caja o cápsula; no usar la malla visual como
  colisión detallada.

Superficies repetibles de 512×512 en `assets/textures/surfaces/`:
`tierra_seca.png`, `piedra_clara.png` y `cesped_tropical.png`. Son ruido
periódico propio y pueden usarse como color base de terreno con repetición.

El lote suma 4 520 triángulos. `validar_utileria.py` exige los 18 IDs exactos,
origen, apoyo, escala y presupuesto; `revisar_utileria.py` genera la lámina de
contacto. Variantes de mayor detalle quedan para lotes posteriores.

### Caballo de Azuero

Archivo separado: `assets/models/caballo_azuero.glb`. Es un caballo alazán
original de 1 348 triángulos, una malla, diez materiales y rig
`FG_CaballoAzuero`. Incluye lucero, dos calcetines claros, menudillos, cascos,
crin segmentada, cola articulada, manta vino/turquesa, silla, cincha, estribos y
brida.

- orientación frontal −Y, +Z arriba, cascos sobre z=0;
- clips `Reposo` (80 fotogramas), `Paso` (33) y `Trotar` (17);
- silla alrededor de z=1,34 m; usar `rideHeight` inicial de 1,27 m y ajustar
  sólo después de verla con el jinete real;
- `Paso` sirve para desplazamiento lento y `Trotar` para la velocidad normal;
- no aplicar tintes al modelo completo: la capa alazana y su manta son parte
  de esta variante visual.

`validar_caballo_azuero.py` comprueba los clips, presupuesto, dimensiones y
apoyo a lo largo de las animaciones. Puede revisarse con
`revisar_personaje.py` igual que las otras monturas.

## Comparación de dirección visual

F22 tiene dos renders reproducibles del mismo rincón, misma cámara y geometría:

- [cel/anime saturado](capturas/estilo/mismo_lugar_cel.png): contraste alto,
  colores limpios, superficies mates y lectura inmediata a distancia;
- [naturalista](capturas/estilo/mismo_lugar_naturalista.png): paleta contenida,
  biseles, luz cálida principal y relleno frío, sombras más profundas.

`scripts/blender/comparar_estilos.py` regenera ambos. La comparación no decide
la línea final: muestra que el cel aprovecha ya las siluetas low-poly, mientras
el naturalista necesita A03 (texturas) y más detalle geométrico para no parecer
solamente una versión oscura del mismo modelo.

## Música regional — lotes 02 y 03

Mismo contrato técnico: PCM WAV estéreo, 44,1 kHz, 16 bit; mezcla y stems
`harmony`, `melody` y `percussion` con idéntica duración dentro de cada región.

| Región | Directorio | Tempo / duración | Carácter |
|---|---|---|---|
| Iguanera | `assets/audio/music/iguanera/` | 56 BPM · 51,429 s | Pentatónica luminosa, cuerdas pulsadas y aire; percusión ligera |
| Herrera | `assets/audio/music/herrera/` | 66 BPM · 43,636 s | Dórico grave, armonía más densa y madera/tambor más presentes |
| Veraguas | `assets/audio/music/veraguas/` | 62 BPM · 46,452 s | Pentatónica menor abierta, colchón brumoso y aire amplio; percusión contenida |
| Coclé | `assets/audio/music/cocle/` | 70 BPM · 41,143 s | Hexatónica luminosa, pulsos de madera y movimiento más claro |

Cada región tiene una composición, progresión, motivo, semilla y balance de
capas propios. No transponer una mezcla sobre otra. Para transición entre zonas,
fundir la región saliente antes de iniciar los stems entrantes en tiempo cero.
Veraguas y Coclé cierran matemáticamente su empalme (diferencia de primera y
última muestra 0); pico de mezcla 0,88 y RMS 0,190/0,165, respectivamente.

## Emotes — lote 01

Directorio: `assets/emotes/`. PNG RGBA 256×256. Los nombres coinciden con los
IDs actuales; el otro agente sustituye los emojis de sistema por rutas y mantiene
comando y texto de acción.

| ID / archivo | Símbolo original | Clip disponible |
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
72–96 px. Usar `object-fit: contain`, sin recolorear. Los ocho clips ya existen
en `assets/models/personaje.glb` y `assets/models/centinela.glb`, generados por
`biped_emote_clips()` y revisables con `scripts/blender/revisar_emotes.py`.
Son acciones de una sola reproducción: al terminar, volver a `Reposo`. Durante
el gesto, enfundar u ocultar arma y escudo para evitar que atraviesen brazos o
rostro. No interrumpir `Golpeado`, `Morir`, `Atacar`, `Lanzar` ni `Rodar` con
un emote.

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
