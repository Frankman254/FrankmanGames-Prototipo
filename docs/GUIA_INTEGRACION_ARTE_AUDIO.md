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

## Iconos de hechizos — lote 01

Directorio: `assets/icons/spells/`. Hay un PNG RGBA 256×256 por cada ID actual
de `data/rpg/spells.json` (31 archivos). El nombre es exactamente
`<spellId>.png`; el integrador puede resolver la ruta sin una tabla paralela.

- mostrar a 32–52 px con `object-fit: contain`; no recortar ni recolorear;
- conservar el emoji actual como fallback hasta confirmar la carga del PNG;
- aplicar enfriamiento y estado deshabilitado mediante una capa CSS, no creando
  copias oscuras de cada archivo;
- el borde dorado identifica la familia; el interior codifica elemento:
  brasa/rojo, escarcha/cian, tormenta/azul, tierra/verde y físico/cacao;
- cada centro tiene motivo funcional propio: escudo, movimiento, zona, trampa,
  control, curación, invocación o ataque;
- si se añade un hechizo, regenerar el catálogo: el validador falla mientras no
  exista un archivo con el nuevo ID.

`scripts/art/render_spell_icons.py` produce los 31 PNG byte por byte sin fuentes
ni imágenes externas. `validar_spell_icons.py` exige correspondencia exacta con
los datos, tamaño, RGBA, transparencia y hashes únicos; `revisar_spell_icons.py`
genera la lámina local de control.

## Iconos de objetos — lote 01

Directorio: `assets/icons/items/`. Contiene 135 PNG RGBA 256×256, uno por cada
ID actual de `data/rpg/items.json`, con ruta directa `<itemId>.png`.

- mostrar a 32–64 px y conservar `item.icon`/el SVG procedural como fallback;
- no recolorear: borde y fondo codifican familia (arma, armadura, joya,
  consumible, pergamino, mascota o material) y las variantes regionales ya
  llevan acentos propios;
- rareza, cantidad, equipado, bloqueado y durabilidad son capas de interfaz;
  no hornear esas señales dentro del PNG;
- objetos del mismo conjunto comparten paleta, pero conservan silueta por slot;
- pergaminos mantienen la familia de papel y se diferencian por marcas internas;
- cuando aparezca un `itemId` nuevo, regenerar y revisar su icono antes de dar el
  catálogo por completo.

`scripts/art/render_item_icons.py` deriva las 135 composiciones exclusivamente
de los datos e IDs del proyecto. `validar_item_icons.py` exige correspondencia
exacta, RGBA, 256×256, transparencia y hashes únicos. `revisar_item_icons.py`
genera la lámina completa para detectar siluetas equivocadas o repetición.

## Iconos de estados — lote 01

Directorio: `assets/icons/statuses/`. Veinte PNG RGBA 256×256, uno por cada ID
actual de `data/rpg/statuses.json`, con ruta `<statusId>.png`.

- hexágono verde = mejora; hexágono rojo = perjuicio;
- el símbolo central reutiliza el vocabulario del hechizo relacionado para que
  lanzar y sufrir el efecto se reconozcan como la misma mecánica;
- mostrar a 24–36 px junto a duración/acumulaciones; esas cifras siguen siendo
  texto de interfaz y no forman parte del PNG;
- no recolorear ni sustituir el borde según elemento: primero debe leerse
  mejora/perjuicio, después el tipo concreto;
- conservar el emoji actual como fallback durante la integración.

`render_status_icons.py`, `validar_status_icons.py` y
`revisar_status_icons.py` producen, verifican y presentan la familia. El
generador falla si aparece un estado sin motivo asignado.

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

### Centinela optimizado — contrato de integración

`assets/models/centinela.glb` conserva el nodo raíz `FG_Centinela`, el rig, los
nombres de todos sus clips y 9 388 triángulos. Su presentación se redujo de 33
primitivas a cuatro: `Cuerpo`, `Pelo`, `Lanza` y `Escudo`. Cada pieza usa un solo
material con mapas de color, rugosidad y metal embebidos en el GLB.

El integrador no debe cargar por separado `assets/textures/personajes/atlas/`:
son fuentes reproducibles del modelo. Puede conservar el cargador y las reglas
de animación actuales. Debe repetir los escenarios `modelos` y `rendimiento`
para registrar FPS y tirón de aparición; la cifra antigua corresponde a la
versión de 33 primitivas. Para regenerar, ejecutar `centinela.py`; para revisar
frente, tres cuartos, espalda y cara, usar `revisar_personaje.py`.

## Enemigos base — pase visual 02

Los cuatro archivos sustituyen en sitio a la primera versión. El integrador no
debe cambiar rutas, plantillas ni nombres de animación:

| Archivo | Raíz | Clips obligatorios | Triángulos |
|---|---|---|---:|
| `assets/models/bestia.glb` | `FG_Bestia` | `Reposo`, `Correr`, `Atacar`, `Aullar`, `Esquivar`, `Golpeado`, `Morir` | 876 |
| `assets/models/arquero.glb` | `FG_Arquero` | `Reposo`, `Caminar`, `Correr`, `Rodar`, `Golpeado`, `Morir`, `Disparar` | 892 |
| `assets/models/chaman.glb` | `FG_Chaman` | `Reposo`, `Caminar`, `Correr`, `Rodar`, `Golpeado`, `Morir`, `Conjurar` | 988 |
| `assets/models/diablillo.glb` | `FG_Diablillo` | `Reposo`, `Caminar`, `Correr`, `Rodar`, `Golpeado`, `Morir`, `Atacar`, `Lanzar` | 860 |

Todos conservan una sola malla vinculada llamada `Cuerpo`, frente hacia −Y,
+Z vertical y apoyo en z=0. La coloración por arquetipo que ya aplica el juego
puede mantenerse; no conviene teñir ojos, dientes ni amuletos hasta que el
material permita excluir esas zonas, porque son los puntos de lectura. Fundir
locomoción y acciones durante 0,12–0,18 s, sin reiniciar el clip cada cuadro.

`scripts/blender/enemigos.py` regenera el lote y
`scripts/blender/validar_enemigos.py` verifica los cuatro contratos, clips,
apoyo, altura y presupuesto. Repetir los escenarios `modelos` y `rendimiento`:
el cambio es compatible, pero la revisión visual debe comprobar escala, paleta
y lectura dentro del grupo real de enemigos.

## Mascotas base — pase visual 02

Los archivos `assets/models/zorro.glb`, `buho.glb` y `tortuga.glb` sustituyen
en sitio a sus versiones iniciales. Conservan una malla `Cuerpo`, orientación
frontal −Y y estos contratos:

| Mascota | Raíz | Altura de referencia | Triángulos |
|---|---|---:|---:|
| Zorro de ceniza | `FG_Zorro` | 0,60 m | 732 |
| Búho archivero | `FG_Buho` | Flota entre 0,92 y 1,58 m | 820 |
| Tortuga de musgo | `FG_Tortuga` | 0,58 m | 968 |

Las tres mantienen `Reposo`, `Correr`, `Atacar`, `Golpeado` y `Morir`, por lo
que no requieren cambios en `data/assets.json`. Conservar la coloración actual
por mascota, pero evitar un tinte uniforme que elimine pupilas, libro, seta o
punta luminosa: esos detalles diferencian la función y personalidad. El búho
debe conservar su altura flotante; zorro y tortuga apoyan en z=0.

`scripts/blender/mascotas.py` regenera también `fantasma.glb`, que no cambia en
este pase. `scripts/blender/validar_mascotas.py` revisa sólo las tres mascotas.
El integrador debe probarlas como acompañantes, especialmente oclusión junto al
jugador, lectura de color y el evento de impacto a `t=0.5`.

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

Archivo: `assets/models/montura_arpia.glb`. Segunda versión original: pichón de
arpía montable con cabeza y ojos grandes, cuerpo redondo, penacho doble abierto
hacia arriba, plumas primarias y cola ascendentes, plumón cálido, pizarra suave
y manta de silla turquesa con ribete coral.

Contrato ya esperado por el juego:

- orientación frontal −Y, +Z arriba y apoyo en z=0;
- armadura raíz `FG_MonturaArpia`;
- clips `Reposo` (96 fotogramas), `Trotar` (25), `Volar` (25) y `Planear` (48);
- 1 696 triángulos, una malla y diez materiales;
- silla alrededor de z=1,35 m; conservar `rideHeight: 1.2` hasta el QA con jinete;
- usar `Volar` durante avance/ascenso aéreo y `Planear` al sostener vuelo o bajar;
- fundir 0,15–0,25 s al alternar `Volar`/`Planear`; no reiniciar el clip cada cuadro.

`scripts/blender/validar_montura_arpia.py` comprueba los cuatro clips, apoyo,
altura y presupuesto de triángulos. Para capturas se usa
`revisar_personaje.py`. El modelo aporta sus colores: no aplicar el tinte del
objeto al plumaje ni a la manta.

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

Superficies PBR repetibles de 512×512 en `assets/textures/surfaces/`:
`tierra_seca`, `piedra_clara`, `cesped_tropical`, `madera_tropical`,
`arena_costera`, `corteza_fantastica`, `hoja_tropical` y `tela_tejida`. Cada
base tiene tres mapas:
`<id>.png` (color), `<id>_normal.png` (normal OpenGL, canal verde +Y) y
`<id>_roughness.png` (rugosidad lineal en gris). Configurar color como sRGB;
normal y rugosidad como datos/no-color. Repetición inicial sugerida: una baldosa
cada 4–6 m para tierra/césped y 2–3 m para piedra. No invertir el canal verde.

Para madera y corteza, orientar la veta vertical o a lo largo de la pieza y
repetir cada 0,8–1,5 m. Arena: 2–4 m por baldosa. Follaje: 0,6–1,2 m sobre
volúmenes o tarjetas, sin tratarlo como una especie concreta. Tela: 0,25–0,5 m
para que la trama se lea de cerca. Estos cinco materiales son estilizados y
genéricos; no representan una madera, árbol, tejido artesanal o playa real.

El lote suma 4 520 triángulos. `validar_utileria.py` exige los 18 IDs exactos,
origen, apoyo, escala y presupuesto; `revisar_utileria.py` genera la lámina de
contacto. Variantes de mayor detalle quedan para lotes posteriores.

### Naturaleza modular — lote 01

Archivo: `assets/models/naturaleza_modular.glb`. Contiene doce nodos estáticos:

`natural_arbol_sombra`, `natural_palma_joven`, `natural_arbusto_redondo`,
`natural_arbusto_seco`, `natural_helecho_ancho`, `natural_mata_flor`,
`natural_pasto_alto`, `natural_tronco_caido`, `natural_roca_baja`,
`natural_roca_alta`, `natural_roca_musgosa` y `natural_grupo_rocas`.

- cargar una vez e instanciar por nombre; +Z arriba, origen en el suelo y metros;
- variar rotación y escala uniforme entre 0,85–1,15; no estirar por eje;
- usar colisión sólo en árbol, palma, tronco y rocas, mediante cápsula/caja simple;
- arbustos, helecho, flores y pasto deben permitir atravesarlos;
- el árbol y la palma son formas genéricas de escenario, no especies botánicas;
- la asignación por región/altitud corresponde al integrador y a A01; este lote
  no autoriza colocar cada forma en cualquier bioma.

Son 4 136 triángulos en total. `validar_naturaleza_modular.py` verifica nombres,
apoyo, escala y presupuesto; `revisar_naturaleza_modular.py` genera la lámina.
Puede coexistir con `vegetacion.glb`: este catálogo aporta IDs estables para
variación ambiental y no sustituye todavía la clasificación de flora real.

### Escenografía regional modular — lote 01

Archivo: `assets/models/escenografia_regional.glb`. Doce nodos estáticos:

`escena_almacen_costero`, `escena_caseta_abierta`, `escena_puesto_mercado`,
`escena_muelle_tramo`, `escena_muelle_esquina`, `escena_amarradero`,
`escena_bote_pasajeros`, `escena_bote_carga`, `escena_bote_angosto`,
`escena_poste_direcciones`, `escena_estandarte_plaza` y
`escena_baliza_costera`.

- cargar como catálogo e instanciar por ID; +Z arriba, metros y apoyo en z=0;
- combinar tramos de muelle sin escala y usar esquina para cambios de dirección;
- embarcaciones estáticas sólo como ambientación; para viaje y movimiento seguir
  usando `lancha.glb`, que conserva su clip `Reposo` y contrato propio;
- almacén, caseta, mercado y baliza necesitan colisión simplificada aparte;
- botes, amarradero, poste y estandarte pueden usar una caja/cápsula o carecer de
  colisión cuando estén fuera del área transitable;
- el estandarte es un símbolo geométrico ficticio: no añadir banderas, escudos ni
  marcas reales sobre su material;
- variar rotación y colocación, no tintar el catálogo entero por región.

El lote suma 1 580 triángulos. `validar_escenografia_regional.py` comprueba los
doce IDs, apoyo, escala y presupuesto; `revisar_escenografia_regional.py` genera
la lámina de contacto. Estas variantes amplían, no sobrescriben, `casa.glb`,
`lancha.glb`, `estandarte.glb` y `estandarte_castillo.glb`.

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

## Símbolos decorativos del Istmo — lote original provisional

Archivo: `assets/models/simbolos_istmo.glb`. Es una biblioteca estática de seis
nodos independientes:

- `simbolo_estatua_arpia`: estatua fantástica propia; no es un emblema oficial;
- `simbolo_monedas_ficticias`: pilas decorativas sin denominación ni diseño real;
- `simbolo_sombrero_trenzado`: tocado de fibras estilizado;
- `simbolo_vestido_festivo`: propuesta fantástica, no certificación de una pollera;
- `simbolo_aretes_oro`: pareja de pendientes geométricos;
- `simbolo_machete_ceremonial`: pieza vertical para exhibición, no arma equipable.

Contrato de integración:

- cargar una vez e instanciar por el nombre completo `simbolo_<id>`;
- +Z arriba, medidas en metros y origen en el centro del apoyo; rotar sobre Z;
- colisión simple aparte; la estatua puede usar cilindro/caja y las piezas pequeñas
  no necesitan colisión;
- colocar monedas junto al banco o mostradores, la estatua en plaza y el resto en
  interiores, vitrinas o escenas festivas; no poblar todas las regiones igual;
- mantener materiales y proporciones; no convertir las monedas en balboas ni
  añadir escudos, texto, banderas o marcas reales sobre estas mallas;
- tratar sombrero, vestido, aretes y machete como estilización provisional hasta
  una revisión cultural; sus nombres internos son técnicos, no afirmaciones
  etnográficas.

El conjunto suma 7 540 triángulos. `validar_simbolos_istmo.py` comprueba IDs,
origen, apoyo, escala y presupuesto. `revisar_simbolos_istmo.py` genera una
lámina de seis vistas para control visual. La bandera, el escudo nacional, las
monedas reales y cualquier insignia deportiva quedan deliberadamente fuera de
este lote hasta revisar derechos y contexto de uso.

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

## Hoja de personaje — retrato y características

Retrato predeterminado: `assets/portraits/adventurer_default.png`, PNG RGBA de
1312×1199. Mostrarlo con `object-fit: contain` o recorte centrado por rostro; no
aplastarlo a cuadrado. Es una ilustración de respaldo. Cuando exista retrato
dinámico basado en el aspecto del personaje, éste debe tener prioridad.

Iconos primarios: PNG RGBA 256×256 en `assets/icons/stats/`.

| ID | Archivo | Símbolo original |
|---|---|---|
| `strength` | `strength.png` | Guantelete de piedra y madera |
| `agility` | `agility.png` | Pluma de colibrí, veleta y ráfaga |
| `intellect` | `intellect.png` | Astrolabio de navegación |
| `vitality` | `vitality.png` | Escudo de ceiba, hojas y núcleo ámbar |
| `spirit` | `spirit.png` | Caracola y aliento turquesa |

Usarlos a 24–36 px junto al nombre de la característica, sin recolorear ni
añadir marcos internos. Conservar el texto: el icono no sustituye la etiqueta.
La generación se hizo con OpenAI ImageGen, una llamada por símbolo, pidiendo
ilustración cel pintada, transparencia real, paleta del proyecto, lectura a
24–48 px y exclusión explícita de composiciones de juegos existentes.

## Música regional — lotes 02 a 04

Mismo contrato técnico: PCM WAV estéreo, 44,1 kHz, 16 bit; mezcla y stems
`harmony`, `melody` y `percussion` con idéntica duración dentro de cada región.

| Región | Directorio | Tempo / duración | Carácter |
|---|---|---|---|
| Iguanera | `assets/audio/music/iguanera/` | 56 BPM · 51,429 s | Pentatónica luminosa, cuerdas pulsadas y aire; percusión ligera |
| Herrera | `assets/audio/music/herrera/` | 66 BPM · 43,636 s | Dórico grave, armonía más densa y madera/tambor más presentes |
| Veraguas | `assets/audio/music/veraguas/` | 62 BPM · 46,452 s | Pentatónica menor abierta, colchón brumoso y aire amplio; percusión contenida |
| Coclé | `assets/audio/music/cocle/` | 70 BPM · 41,143 s | Hexatónica luminosa, pulsos de madera y movimiento más claro |
| Panamá Oeste | `assets/audio/music/panama_oeste/` | 68 BPM · 42,353 s | Pentatónica abierta, pulso costero ágil y capas luminosas |
| Chiriquí | `assets/audio/music/chiriqui/` | 64 BPM · 45,000 s | Hexatónica menor, colchón profundo y frase aérea de montaña |
| Colón | `assets/audio/music/colon/` | 72 BPM · 40,000 s | Modo abierto, motivo ágil y pulso más activo |
| Darién | `assets/audio/music/darien/` | 58 BPM · 49,655 s | Pentatónica menor, colchón grave y espacio profundo |
| Bocas | `assets/audio/music/bocas/` | 74 BPM · 38,919 s | Pentatónica abierta, pulso móvil y capas de aire cortas |
| Las Perlas | `assets/audio/music/perlas/` | 80 BPM · 36,000 s | Hexatónica brillante, arpegio ligero y destellos espaciados |
| Panamá | `assets/audio/music/panama/` | 76 BPM · 37,895 s | Hexatónica abierta, pulso firme y frase breve; propuesta urbana fantástica |

Cada región tiene una composición, progresión, motivo, semilla y balance de
capas propios. No transponer una mezcla sobre otra. Para transición entre zonas,
fundir la región saliente antes de iniciar los stems entrantes en tiempo cero.
Veraguas, Coclé, Panamá Oeste, Chiriquí, Colón, Darién, Bocas y Las Perlas
cierran matemáticamente su empalme (diferencia de primera y última muestra 0).
Las seis propuestas
futuras tienen pico 0,88; Panamá Oeste, Chiriquí, Colón, Darién, Bocas y Las
Perlas tienen RMS 0,160/0,194/0,153/0,196/0,160/0,155.
No deben sustituir la música de una región ya construida sólo por estar
disponibles. Colón y Darién son atmósferas fantásticas: no presentarlas como
música tradicional ni asociarlas a una comunidad concreta. Lo mismo aplica a
Bocas y Las Perlas: su carácter insular es abstracto, no etnográfico.

`scripts/audio/validar_musica_original.py` comprueba formato, duración, pico,
RMS y cierre del bucle. El generador reproduce cada mezcla y sus tres stems byte
por byte con las mismas semillas.

## Ambientes sintéticos — lote 01

Directorio: `assets/audio/ambience/`. Tres WAV estéreo PCM, 44,1 kHz/16 bit,
24 segundos y bucle matemáticamente cerrado:

| ID / archivo | Capas originales | Pico / RMS |
|---|---|---|
| `costa_dia.wav` | Oleaje filtrado, espuma y llamadas tonales lejanas | 0,72 / 0,102 |
| `sabana_seca.wav` | Viento, insectos tonales periódicos y llamadas secas | 0,72 / 0,103 |
| `bosque_nuboso.wav` | Lluvia filtrada, neblina grave, gotas y llamadas aéreas | 0,72 / 0,108 |

Contrato para el integrador:

- reproducir en bucle y por debajo de la música; ganancia inicial sugerida
  0,18–0,28, marcada como PROPUESTA hasta escucharla en juego;
- fundir ambientes en 2–4 s al cambiar de bioma; nunca reiniciar la música;
- usar una sola instancia por ambiente y no apilar la misma pista por sector;
- pausar con el audio general y respetar el control de volumen de ambiente;
- no presentarlos como grabaciones de fauna: todos los sonidos son síntesis.

`scripts/audio/render_original_ambience.py` regenera los tres byte por byte con
semillas fijas. El agente integrador decide IDs de datos y zonas concretas.

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
