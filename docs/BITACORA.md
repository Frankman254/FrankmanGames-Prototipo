# Bitácora reciente

## 2026-11-06 — Montura arpía original con rig y trote

F21 recibe `assets/models/montura_arpia.glb`: ave terrestre grande de 1 452 triángulos, una malla, siete materiales y esqueleto propio. La silueta combina pecho marfil, lomo pizarra, máscara oscura, cresta doble, pico ganchudo, garras, alas plegadas por capas, cola rayada y silla. Los clips `Reposo` y `Trotar` respetan el contrato ya implementado. La primera revisión encontró garras 10 cm bajo el suelo durante la elevación; se corrigió el desplazamiento de raíz y la nueva medida queda en −0,8 cm. Falta verla con jinete dentro del juego.

## 2026-11-06 — Biblioteca visible de 50 piezas equipables

F18 entrega `assets/models/equipo.glb` con 50 nodos `obj_<itemId>`: 35 armas/escudos, 12 piezas de cabeza y 3 capas actuales, incluidas la lanza y el escudo del Centinela añadidos durante el trabajo paralelo. Son 7 916 triángulos en total. Un segundo pase sustituyó siluetas demasiado genéricas por sable curvo, machetes, escudo-compuerta, tapa de olla, totuma, nácar, orbes diferenciados, bastones, lanzas y mazos propios; el tercero añadió sombreros, máscaras, tembleques, yelmos, capuchas y capas. `equipo.py` regenera desde los datos, `validar_equipo.py` comprueba 50 IDs exactos/origen/escala y `revisar_equipo.py` produce una lámina rotulada. El otro agente ya conecta las manos y todavía debe conectar cabeza y espalda.

## 2026-11-06 — Armas en mano, niveles, mazmorra honda, inglés, atlas y decoración

F17: cada personaje lleva en la mano el modelo del objeto equipado (`obj_<itemId>` de `equipo.glb`, de Codex). F20: rango de niveles por monstruo (base −1 a +2; el Matón de la Tulivieja 3–6) y tamaño ±2,5 % por nivel. F21 (código): montura de pruebas puesta desde el nivel 1 con `npm run dev`; el QA la quita (`frankmangames.devMount`). F26: los interiores se descubren al andar en el minimapa, por lugar y piso. F25: la cripta llega a 100 pisos por tramos, con guardián cada 10; medido: el piso 100 se genera en 8 ms y entra en 0,2 s, 54 FPS en el piso 50. F07: los 653 textos de `data/` en inglés (prueba al 100 %), 190 textos fijos de interfaz más, y lo ya abierto cambia de idioma al momento. F10: islas (Coiba, Las Perlas, Guna Yala, Bocas, Parida) y Costa Rica y Colombia visibles sin poder entrar. F05: cuatro decoraciones en Opciones para que el creador elija.

Resultados: 949 pruebas verdes, typecheck y build correctos; QA en Electron de `armasEnMano`, `mapaDentro`, `mazmorraHonda`, `ingles`, `panama`, `decoraciones` y regresión (`banco`, `hudLibre`, `mochilaQuieta`, `contraste`, `misionMapa`, `pescaLejos`, `estilos`) sin fallos. Queda: elegir decoración (F05), modelo de la arpía (F21, Codex), contorno de tierra firme detallado (F10, necesita permiso para descargar Natural Earth), frases con datos dentro aún en español (F07).

## 2026-11-06 — Cámara, recursos y plano de los pueblos

F14: zoom de 2,5 a 70 m, y la niebla ya no tiñe lo cercano al alejar. F12: recursos de oficio en zonas más amplias y ninguno sobre un camino. F11: reglas de construcción con prueba (puerta a un camino, nada tapado, distancia entre edificios) y sendas generadas con `npm run sendas`; el portón del castillo da al camino principal.

## 2026-11-06 — Caminata y carrera humanoides rehechas

F19 recibe `Caminar` de 33 fotogramas y un `Correr` rehecho de 21 en `personaje.glb` y `centinela.glb`. Ambos ciclos separan apoyo, descenso, paso y elevación, alternan rodillas, balancean pelvis y torso contra brazos y cabeza, y no trasladan el modelo hacia delante. `revisar_locomocion.py` renderizó ocho muestras de cada ciclo. `Correr` conserva el contrato actual; el otro agente todavía debe seleccionar `Caminar` a baja velocidad y fundir 0,12–0,18 s entre estados.

## 2026-11-06 — Ocho emotes animados sobre el rig humanoide

F27 completa sus clips `Emote_wave`, `laugh`, `dance`, `cry`, `angry`, `love`, `sleep` y `doubt` en `personaje.glb` y `centinela.glb`. Son animaciones procedurales originales de `fg_rig.py`, sin mocap externo, y `revisar_emotes.py` genera ocho capturas comparables ocultando equipo. La revisión confirmó acciones y poses; la guía exige al integrador enfundar arma/escudo durante el gesto, no interrumpir combate o muerte y volver a `Reposo` al terminar.

## 2026-11-06 — Familia de iconos de interfaz completa

F06 completa sus cuatro símbolos pendientes: Opciones, chat, cámara y características. Se suman como PNG RGBA 256×256 en `assets/icons/ui/`, con la misma talla de materiales, paleta cacao/vino/turquesa/oro, procedencia y contrato de los ocho anteriores. Codex termina así los doce iconos visuales; el otro agente los conecta al HUD y mantiene fallback.

## 2026-11-06 — Primer lote de emotes propios

F27 recibe ocho símbolos originales en `assets/emotes/`: saludo, risa, baile, llanto, enfado, amor, sueño y duda. Los archivos conservan los IDs actuales (`wave`, `laugh`, `dance`, `cry`, `angry`, `love`, `sleep`, `doubt`), son PNG RGBA de 256×256 con transparencia real y quedan registrados en PROCEDENCIA. Codex entrega la parte visual y el contrato; el otro agente sustituye los emojis provisionales y, cuando existan, conecta clips `Emote_<id>` al rig.

## 2026-11-06 — Música propia para Iguanera y Herrera

El generador musical pasa a perfiles regionales y conserva byte por byte la entrega publicada de Los Santos. Iguanera: 12 compases, 56 BPM, pentatónica luminosa, 51,429 s, percusión ligera. Herrera: 12 compases, 66 BPM, dórico grave, 43,636 s, armonía y tambor más densos. Cada una entrega mezcla + stems de armonía, melodía y percusión en `assets/audio/music/<region>/`, 44,1 kHz/16 bit, sin samples externos. Los bucles medidos quedan por debajo de 0,009 de salto máximo.

## 2026-11-06 — FPS (F13)

Medido antes de tocar: sin sombras el cuadro bajaba casi a la mitad, y con un solo hilo de páginas (unos 350 ms cada una) el mundo terminaba generándolas en el hilo principal. Ahora las sombras se rehacen uno de cada dos cuadros, hay 2–3 hilos de páginas y 4 peticiones a la vez. Pueblo de 34 a 68 FPS, campo de 55 a 85, Chitrí de 47 a 95, Pedasol de 63 a 98; peor cuadro al caminar, de 180 a 85 ms. Medido con Codex trabajando en la misma máquina: las cifras absolutas son ruidosas; la mejora es la misma en todos los sitios.

## 2026-11-06 — Primer bucle musical por stems

Los Santos recibe una composición original de 16 compases a 74 BPM y 4/4 en `assets/audio/music/los_santos/`: mezcla estéreo y stems de armonía, melodía y percusión, todos de 51,892 s y 44,1 kHz/16 bit. `scripts/audio/render_original_music.py` la sintetiza de forma determinista sin samples externos. Pico de mezcla 0,88, RMS 0,165 y salto de bucle 0,008; la percusión bajó a 0,0003 tras suavizar ataques y colas. Codex entrega audio y contrato; el otro agente decide si integra la mezcla o capas sincronizadas.

## 2026-11-06 — Juego completo de marcadores del mapa

F09: diez marcadores originales y coherentes en `assets/icons/map/`: Piedra Pintada, taller, banco, castillo, casa, mercader, misión, mazmorra, muelle y lancha. Son PNG RGBA 256×256 generados con OpenAI ImageGen, registrados en PROCEDENCIA y revisados juntos a 24, 32 y 48 px. Codex entrega el arte; el otro agente los conecta al mapa/minimapa y añade la leyenda según `docs/GUIA_INTEGRACION_ARTE_AUDIO.md`.

## 2026-11-06 — Referencias visuales aisladas y primer lote de iconos propios

Por aclaración del creador, Dofus puede estudiarse como referencia visual sin incorporar sus archivos al juego. UnityPy 1.25.4, con fallback 6000.3.16f1, exportó localmente 90 060 PNG (unos 1,59 GiB) desde los 50 bundles de pictogramas a `reference_assets/dofus3/`, ruta ignorada por Git. No se carga ni empaqueta. Primer lote original y versionable: ocho PNG RGBA de interfaz en `assets/icons/ui/` (mochila, personaje, libro, mapa, diario, compendio, oficios y menú), generados con OpenAI ImageGen, optimizados a 256×256 y registrados en PROCEDENCIA. `docs/GUIA_INTEGRACION_ARTE_AUDIO.md` deja al otro agente el contrato de conexión; Codex se limita a producción visual y musical.

## 2026-11-06 — Codex: música de Los Santos y Herrera

T08: perfiles generativos propuestos por provincia. Iguanera conserva su propio perfil de inicio. Los Santos usa una escala mayor mixolidia y Herrera una escala dórica de registro más grave. Validado con 921 pruebas, music:check y el escenario audio de Electron (4/4, con cambio a Iguanera). Queda escuchar en juego las transiciones hacia Los Santos y Herrera.

## 2026-11-06 — Reporte del creador: primeras correcciones

F01, temas legibles: contraste medido en los 8 temas (escenario `contraste`); el HUD sobre el mundo va siempre en tinta clara sobre fondo oscuro. F04: las ventanas se abren con el banco o una tienda abiertos. F15, pesca: el clic en el agua se cancelaba al mantener el botón; ahora no, y si una orilla no tiene camino se busca otra. F02 y F03: chat y mascota se mueven y todo elemento del HUD cambia de tamaño; las posiciones guardan su proporción de la ventana. F08: la zona de la misión seguida se ve en el minimapa y el mapa grande. F29 (parpadeo de la mochila) anotado.

## 2026-11-05 — Centinela del Istmo y texturas de personaje

Pedido del creador: modelos detallados con texturas reales a partir de sus fichas y láminas hechas con ChatGPT. `scripts/art/recortarLaminas.py` busca cada pieza por un ancla, la recorta a resolución completa y la deja repetible: telas, cueros y metales funden sus bordes, y cenefas y correas se cortan por su periodo. Las piezas sueltas, como escudo, medallón, gemas y runas, llevan transparencia. Escribe además su tabla en PROCEDENCIA.md: 107 archivos, 6,9 MB.

`scripts/blender/fg_figura.py` es la base reutilizable: tubos por secciones con UV, láminas, aros, placas con el contorno de una imagen y pesos suaves entre huesos. Con ella, `centinela.py` modela la versión masculina del Centinela, con el esqueleto y los siete clips del humanoide. La lanza y el escudo se modelan en la pose de reposo del juego. La vanguardia lo usa por `classModels` en `data/assets.json` (PROPUESTA); quitar esa línea vuelve al humanoide.

Medido en Electron, escenario `modelos`: 11/11. El Centinela tiene 9 388 triángulos y 33 mallas; el humanoide, 804 y 12. Con la misma escena, 54–71 fps frente a 85. La medida es ruidosa, pero el coste existe: el atlas queda en A06.

## 2026-11-05 — Música por zona y sonidos de viaje

Pedido de la sesión de revisión de audio. La música elige perfil por zona (`profiles` en `data/audio/music.json`): al cambiar, baja, cambia y sube, sin dos perfiles a la vez. Primer perfil: Iguanera, pentatónica en sol y lenta. `npm run music:check` revisa que cada nota caiga en su escala y que notas, voces y duración tengan tope. Sonidos nuevos por receta: lancha, activar y viajar por Piedra Pintada, y misión aceptada y entregada (pesca y subir de nivel ya tenían). Escenario `audio`: 4/4, con la música de Iguanera sonando y ningún efecto en reposo. Falta que el creador la escuche (H13).

## 2026-11-05 — Iguanera grande, lancha y flora nativa

Pedido del creador tras verla: la isla pasa de unos 90 × 65 m a unos 300 × 200 m, más llana, y el mundo crece hasta x = 1024. Las pozas tienen color de profundidad, de clara en la orilla a oscura en el centro, y ondas con el relieve del mar. Lancha nueva en Blender: casco con secciones y arrufo, cuadernas, bancadas, motor, cabo, red y remo. Cuatro especies nativas nuevas en `vegetacion.py`: árbol Panamá con gambas, cuipo, indio desnudo y platanillo. Fotos de revisión con `scripts/blender/revisar.py` y `revisar_flora.py`. Pendiente en TAREAS: A01 a A03.

## 2026-11-05 — Iguanera, etapa C

Cinco misiones de aprendizaje con dos PNJ, poza de marea para pescar y lancha cerrada hasta terminar. Corregido: los PNJ fuera de la parcela inicial no aparecían, y la lancha no comprobaba al llegar al muelle si estaba abierta. Medido para todas las clases: sin muertes. En el juego, `aprendizaje` 23/23.

## 2026-11-05 — Iguanera, etapas A y B

Isla de inicio aprobada por el creador. Geografía, zona 1–3, bosque seco, Piedra de inicio y lanchas a Pedasol. Corregido de paso: un personaje cuya posición caía en una página sin cargar aparecía en la esquina del mundo (`src/sim/world.ts`). En el juego, `iguanera` 7/7: inicio, clic real en el muelle, ida, vuelta, y guardar y cargar en los dos lados.

## 2026-11-05 — Zona inicial tranquila y Herrera

El problema de empezar no eran las cifras: medido con `npm run balance:inicio`, cada clase gana el 100 % de los grupos de su nivel, sin morir, con unos 16 minutos estimados hasta el nivel 10. Lo que mataba era el sitio: alrededor del pueblo había zonas 10–50 y los monstruos de nivel 10 salían junto a la salida. Ahora toda la parcela es 1–10 y el nivel sube al alejarse del pueblo (`gradient` en `data/zones.json`). Herrera se pisa, con zonas del 10 al 80. `maxLevel` pasa de 20 a 200, provisional. Lugar de origen, sin decidir: [propuesta](propuestas/ORIGEN_DEL_JUEGO.md).

## 2026-11-05 — Lugares de Los Santos

Pedasol, Punta Venada y Cambutal: zona segura, casas, Piedra Pintada y suelo aplanado, en su sitio del atlas. Canajagua: zona con Piedra. Camino nuevo a Punta Venada. Nombres de `data/panama.json`, PROPUESTA (M04). Sin PNJ: su contenido es creativo y queda por decidir.

## 2026-11-05 — Oleaje

El mar lleva color y relieve de Blender que se desplazan, y la marea sube y baja 22 cm para que la línea de agua se mueva en la playa.

## 2026-11-05 — Mapa de Panamá en la tecla M

Pestaña Panamá en el mapa grande: silueta del atlas con provincias y comarcas. Cada región se descubre al pisarla y se guarda por personaje.

## 2026-11-05 — Patrones en interiores y casa junto al banco

Alfombras y cenefas de casa, taller, salón y banco salen de `scripts/blender/interiores.py` con las casillas de `arte/patrones/`. Reporte del creador: una casa estaba a 0,5 m del banco y su puerta daba contra la pared; pasa a (110, 146) y `tests/mapLayout.test.ts` exige separación y puerta libre.

## 2026-11-05 — Mascotas, fantasma y corcho desde Blender

Zorro, búho y tortuga tienen modelo con esqueleto y clips (`scripts/blender/mascotas.py`); el lobo espectral usa la bestia translúcida. El fantasma del jugador pasa a `fantasma.glb`, con clips `Reposo` y `Avanzar`, y el corcho de pesca a `objetos.glb`. Escenario `mascotas`. No queda ningún personaje ni objeto hecho de primitivas a la vista salvo el agua y los efectos. La prueba destapó un fallo de `GltfCharacter`: si un personaje volvía a un clip que aún se apagaba, el fundido lo paraba y quedaba congelado; afectaba también al jugador, a los PNJ y a los enemigos.

## 2026-11-05 — Motor de mundo grande: Los Santos se camina entera

- Mundo por páginas de 128 m generadas en otro hilo; lo lejano se suelta. Costa, mar y caminos nuevos. El atlas tenía el norte al revés que el minimapa: corregido.
- Corregida una fuga anterior: los esqueletos de los enemigos no se liberaban.
- Medido en `viaje` con otras ventanas abiertas: al paso, mediana 12,7 ms, 1 % más lento 52,9 ms, peor 94,5 ms. `perfil` da 13 fotogramas de más de 30 ms entre 3605, con el código del juego en unos 10–20 ms de ellos: el resto queda fuera de lo medido, sin identificar. Una página tarda unos 190 ms en el otro hilo. Mallas y texturas no crecen de una vuelta a otra.
- Comprobado: 885 pruebas, tipos, compilación, 59 comprobaciones en Electron y el hilo abierto en la versión compilada. Falta jugarlo y el contenido propio de la provincia (M10).

## 2026-11-05 — Objetos sueltos desde Blender

Árboles, vetas y plantas de recolección, talleres, Piedras Pintadas, Alzador y botín salen de `assets/models/objetos.glb`; la montura, de `montura.glb`, con esqueleto y clips `Reposo` y `Trotar`, teñida con los colores de cada objeto. Todo de `scripts/blender/objetos.py`. Escenario `objetos`. Siguen por código a propósito las formas invisibles de clic, los brillos y el haz del botín, y la superficie del agua. Falta pasar a Blender: mascotas, fantasma y corcho de pesca.

## 2026-11-05 — Interiores y banco desde Blender

Casa, taller, salón del castillo y banco (fachada e interior) salen de `assets/models/interiores.glb`, con texturas `tablas.png`, `yeso.png` y `madera.png`, todo de `scripts/blender/interiores.py`. Lo que bloquea el paso no cambia: sigue en `ROOMS` y `BANK_FURNITURE`, y las gradas del salón repiten en el script las medidas de `platforms`. El empleado del banco usa el modelo de los PNJ, y su cofre es `cofre.glb`, que se abre al usarlo y se cierra al alejarse. `QA_SESION=2` da a `qaElectron` otro puerto, perfil y carpeta, para que dos recorridos no se pisen.

## 2026-11-05 — Mapa: Panamá en miniatura, gradas y detalle por distancia

- Gradas: al estrado del salón del castillo se sube andando. Solo el trono bloquea (`src/world/steps.ts`).
- Atlas de Panamá con las diez provincias y tres comarcas (`data/panama.json`); todas las zonas quedan en [TAREAS](TAREAS.md#mapa-de-panamá).
- Radio de detalle: terreno por trozos, plantas por anillos y bruma azul. Una malla baja muestra de lejos el mar y las cordilleras reales.
- Flora de Blender por zona: palma, guayacán, corotú, mangle, roble, ciprés, plátano, cafeto y caña. Se quitan las texturas calculadas de hojas y suelo y el pino. Casas de cal y teja, iglesia, trapiche en lugar del molino y fortín de coral en lugar del castillo europeo.
- Corregido: la niebla blanqueaba los modelos de Blender bajo la lluvia (`src/render/linearFog.ts`).
- Medido con `rendimiento` (FPS antes → después, otras ventanas abiertas): pueblo 46 → 46–50; pueblo de lejos 49 → 39–46; campo 120 → 89–95; grupo de enemigos 35 → 25–34. El campo pierde cerca de un 20 %: las copas tienen más polígonos que las tarjetas de antes.
- Comprobado en Electron: escenarios `castillo`, `modelos` y `mapa`. Falta el motor de mundo grande (M00): lo lejano aún no se puede pisar.

## 2026-11-05 — La cripta sale de Blender

Regla del creador: nada de calcular en el juego paredes, árboles, baldosas, texturas ni acabados; se modelan en Blender (MCP) y se cargan. Primera parte: baldosa, muro, remate, antorcha, llama, escaleras y entrada en `assets/models/mazmorra.glb`, y las texturas `muro.png` y `baldosa.png`, todo de `scripts/blender/mazmorra.py`. `src/render/staticModels.ts` lee la geometría antes de crear la escena (`src/boot.ts`) y `staticMesh(escena, pieza)` da una malla al momento, sin pasar por el cargador completo. Son piezas fijas, sin clips; la llama parpadea por material. Terreno y vegetación los rehace otra sesión con el mismo cargador. Medido antes de cambiar nada, en el arranque: mezcla de suelo 968 ms, generación del mundo 416, vegetación 344, baldosas de suelo 55. Esos cálculos ocurren una vez al arrancar, no en cada fotograma.

## 2026-11-04 — Detalle por distancia

Se mide primero (escenario `rendimiento`) y luego se recorta lo que no se ve. `data/detail.json`: los enemigos solo tienen modelo a menos de 55 m del jugador y se sueltan pasados 70; se crea uno por fotograma. Casas, farolas, pozo, molino y castillo se apagan y pausan su clip según su propio rango. La simulación no cambia. El personaje borra las piezas que su aspecto no usa. El castillo pasa de 172 mallas a una sola más su bandera, que ondea. Distancia de visión: 120, 160, 200 y 280 m por preajuste, antes hasta 650 en un mapa de 256 m. Medido en la misma máquina, con ruido entre ejecuciones: pueblo de 55 a 76 FPS, campo de 83 a 148. Queda un coste de 14 a 26 ms por cada modelo que se crea; al saltar a un grupo hay fotogramas de unos 110 ms. El siguiente paso es reutilizar modelos soltados.

## 2026-11-04 — «Pulsar y clic» como modo de lanzar por defecto

Decisión del creador: sustituye a su respuesta anterior de «con indicador», que se conserva en `docs/PREGUNTAS_CREADOR.md` y sigue disponible en Opciones → Juego. La tecla apunta y enseña la vista previa; un clic o la misma tecla confirman, y Esc o clic derecho cancelan.

Las opciones guardadas incluían `castMode` aunque nadie lo hubiera elegido, así que `loadOptions` pasa una sola vez «con indicador» al nuevo modo; `saveOptions` deja la marca `optionsRev` y, a partir de ahí, volver a elegirlo se respeta. Quien tenía «al pulsar» no cambia. `tests/castModes.test.ts` cubre valor por defecto y migración; el escenario `previa` prueba la tecla real en Electron.

## 2026-11-04 — Identidad panameña, características en Personaje y vista previa de hechizos

Corrección del creador: la interfaz debe parecerse sólo un poco a la referencia y estar ambientada en nuestra cultura. Las bandas de título llevan ahora líneas escalonadas de inspiración mola y un hilo de triángulos de inspiración chaquira, dibujados en `ventanas.css` sin copiar ninguna pieza. El tema por defecto pasa a llamarse Mola: tela oscura, banda roja y acento amarillo.

Características fuera de la mochila: la tabla por elemento y los conjuntos pasan a Personaje; la mochila queda con muñeco, regla de manos, botón y rejilla, y baja de 640 a 460 px de alto.

Vista previa: apuntar un hechizo enseña fichas con daño, crítico, vida que quitaría, estados y «Puede caer», y copias translúcidas de quien se movería con línea desde su sitio. `World.previewSpell` no cambia el mundo y comparte las cuentas de destino con el lanzamiento real: `tests/spellPreview.test.ts` lo compara en salto, intercambio, carga, retroceso y atracción. Escenario `previa`: clic en la barra, apuntar sin lanzar, confirmar y caer donde se vio, y Esc cancela. El modo de lanzar por defecto no cambia: con «con indicador» la previa se ve manteniendo la tecla o tras hacer clic en la barra.
## 2026-11-04 — Patrones geométricos

Biblioteca propia de seis familias y seis paletas, calculada en código, con un lenguaje por zona. Primeros usos: estandartes de Blender con clip `Reposo` y franja al entrar en una zona. Reglas culturales y revisión legal pendiente en [la propuesta](propuestas/PATRONES_GEOMETRICOS.md).

## 2026-11-04 — Línea visual común y escala de la interfaz

Petición del creador con capturas de referencia: misma línea visual en todas las ventanas, y que quepa más en el mismo espacio. Causa de lo segundo: la escala automática ponía 1080p al 145 %. Ahora 1080p es el 100 % y 3440×1440 el 135 %; una casilla de la barra pasa de ~6 % a ~3,3 % del alto de pantalla. Esto sustituye al «todo más grande» anterior; el tamaño manual de Opciones sigue disponible.

`src/ui/styles/ventanas.css` reúne marco, banda de título, controles, bloques y densidad, tomando los colores de cada tema. El tema por defecto pasa a grafito con banda vino (id `pergamino` para no romper guardados; nombre posterior: Mola) y la letra por defecto a Trebuchet y Segoe UI, del sistema. Implementación propia: sin recursos, nombres ni código de la referencia. Opciones gana menú lateral, bloques y buscador; el libro, losetas y buscador; el tooltip, cabecera con icono y datos alineados; personaje y libro se abren juntos. La mochila ya no llena la pantalla: su rejilla se desplaza dentro de la ventana. Corregido de paso: el recuadro vacío de mascota sobre la barra y el tooltip sin escalar.

Escenario `interfaz` en `scripts/qaElectron.mjs`: cada ventana a 1366×768, 1920×1080 y 3440×1440, sin salirse ni scroll horizontal. Comprobado en Electron con capturas. La comodidad de lectura la juzga el creador.

## 2026-11-04 — Enemigos de Blender

Los 65 enemigos pasan a cuatro modelos nuevos (`bestia`, `arquero`, `chaman`, `diablillo`, de `scripts/blender/enemigos.py`) y al personaje para los brutos, mediante `templates` en `data/assets.json`. Conservan paleta, escala y aspecto por enemigo; solo cambia la forma. `fg_rig.py` reúne el esqueleto y los clips comunes. Con 42 enemigos vivos, unos 80 FPS asentados; hay un bajón breve mientras se crean. Un mismo modelo sirve para animales distintos: un cangrejo sigue siendo una bestia de cuatro patas, como antes. Las mascotas siguen procedurales.

## 2026-11-04 — Primera tanda de modelos de Blender

Para ver cómo queda: jugador y PNJ pasan a `assets/models/personaje.glb` (esqueleto y siete clips; paleta y piezas según `looks` y `gear`), las casas a `casa.glb` y `casa_dorada.glb` con puerta que se abre al acercarse, y las farolas a `farola.glb`. Se añaden, como PROPUESTA de colocación, un pozo y un molino. Scripts en `scripts/blender/`, con `fg.py` común. Volver al humanoide procedural es cambiar `kind` en `data/assets.json`. Límites: 12 armas se dibujan con tres piezas; el terreno sigue saliendo de los datos porque de él depende por dónde se camina; enemigos, mascotas, árboles, rocas, banco y castillo siguen como estaban.

## 2026-11-04 — Cofre de Blender con animación

Los cofres de la cripta pasan de cajas a `assets/models/cofre.glb`, generado por `scripts/blender/cofre.py`, con clips `Abrir` y `Cerrar`. Regla del creador: cada modelo lleva su animación propia exportable. Ese script sirve de plantilla: piezas móviles con su pivote real y una pista NLA por clip. Se aclararon los colores y se bajó el metal, porque sin mapa de entorno el metal puro salía negro. Blender queda conectado por MCP; el cofre se diseñó por esa vía en una carpeta de pruebas aparte y el GLB final sale del script sin ventana. `Cerrar` aún no se usa: los cofres no se cierran.

## 2026-11-04 — Pulso por derrotas e interiores

Regla del creador: cada derrota quita 20 de Pulso y reaparece en la Piedra Pintada; a 0 hay fantasma, que no combate, no habla, no trabaja, no cambia de equipo ni activa piedras. Se revive con 20. Sin el castigo «Sin pulso», confirmado por el creador (H02). Casas con dos interiores, castillo con portón y salón, sin vigas que tapen la vista.

## 2026-11-04 — Casas con interior

Cada casa tiene puerta dorada y se entra al llegar, a una misma habitación amueblada con límites. Al salir o cargar se aparece delante de esa puerta.

## 2026-11-04 — Fantasma, poción de recuerdo, barra por secciones y castillo

Pulso a 1 al revivir. Fantasma como modelo propio que flota, en lugar del personaje teñido. «Seco del Regreso» con receta en el nuevo Alambique y botín raro. Barra separable, arrastrable y fijable. Tres edificios dejan de pisar caminos, con prueba. Primer castillo generado con Blender por script, sin archivos externos: nombre, ubicación y aspecto son PROPUESTA. No se usa el material de emotes del otro agente porque sale de DOFUS.

## 2026-11-04 — Reportes B11, B12 y B14

Contorno dorado común en lo interactivo. Banco con mobiliario y cámara más cercana. Hechizos alternados entre filas, hecho por el coordinador tras descartar el parche del agente local. B13 espera detalle del creador.

## 2026-11-04 — Reportes B01–B06 y B10

Esc ya no saca de pantalla completa. Cámara por casilla con borde y encuadre calculado. Modo de cámara con Espacio o clic de rueda. La recolección fallaba porque mantener el botón repetía la orden de caminar; el mismo fallo afectaba a piedras, PNJ, botín y talleres. Emotes al campo de texto, ventana propia y emote sin burbuja junto a la cabeza. Banco en rejilla con selección por arrastre. Falta el arte propio de los emotes.

## 2026-11-04 — Recorrido automático en Electron y correcciones

`npm run qa:electron` juega solo en la ventana real ([prueba rápida](PRUEBAS_RAPIDAS.md)). Cubre C04, C05 y gran parte de T02. Las capturas revelaron defectos que las comprobaciones no detectaban: la mochila de venta tapaba la tienda, las cifras de características salían cortadas y el selector del banco no tenía estilo.

Sonido de fondo: `main.ts` cerraba el banco en cada fotograma fuera de él, y cada cierre sonaba, con 21 voces apiladas y un tono de unos 1576 Hz, el canal más fuerte. Ahora la interfaz queda en silencio y las voces en reposo son 0. El ruido del viento y el agua pasa de un bucle de 1 s a uno de 7 s. Falta que el creador confirme que era ese sonido.

Por instrucción del creador: Pulso en 0 al morir, sube solo tras revivir y muy despacio (0,5 por minuto y 0,1/s de descanso, cifras PROPUESTA); personaje translúcido y azulado como espectro; barras de scroll y campos con una sola regla común; ventana en 1080p con 3440×1440 y 4K en Opciones, mediante un puente mínimo en `electron/preload.ts`.

IA local: Qwen escribió `trf()` en 12 s, 4 turnos y sin errores; parche revisado y aplicado, con pruebas añadidas aparte.

## 2026-11-03 — Arcos y mascotas

T05: auditoría, sin cambios de contenido. El único arco y una de las dos ballestas piden niveles que el máximo de 20 no alcanza (H09). T06: efecto configurable al impacto de mascota, con inmunidad, cadencia y expiración; ninguna mascota lo lleva hasta que el creador decida (H11).

## 2026-11-03 — Idiomas

R08: opción de idioma con español e inglés. Un único punto de traducción en la función que crea los elementos, con tabla en `data/i18n/en.json`: añadir un idioma es añadir su archivo y su nombre. Traducción del agente, sin revisar por un hablante; los textos con datos dentro y el contenido de `data/rpg` siguen en español.

## 2026-11-03 — Chat y emotes

R07: chat fijo por canales con burbuja que sigue al personaje y emotes. Local hasta que exista red. La tecla Intro queda para abrir el chat.

## 2026-11-03 — Monturas

R06: hueco de montura junto a la mascota, tres monturas de muestra con velocidad y una característica. Modelo de primitivas que trota bajo el personaje. Velocidades y precios son PROPUESTA.

## 2026-11-03 — Oficios

R05: seis oficios con nivel propio, recursos en el mapa que reaparecen, Yunque y Telar, 12 recetas y minijuego opcional que sólo puede mejorar las tiradas. Comprobado en el juego: talar da madera y experiencia, fabricar gasta materiales, y el nivel se guarda. Tiempos, recetas y niveles son PROPUESTA; hacen falta horas de juego para saber si el ritmo es bueno.

## 2026-11-03 — Cámara conectada

R04: `src/camera/` sólo lo usaban sus tests. Ahora mandan modos, encuadres y suavidad: giro y zoom persiguen su objetivo sin saltos y el resultado no depende de los fotogramas. Las pruebas no acreditan la sensación: el creador debe probarla.

## 2026-11-03 — Compendio

R02 cerrada: ventana con criaturas, objetos y zonas sacados de los datos, con probabilidad de botín por tabla. Comprobada en el navegador. Muestra todo: el creador la pidió también para depurar.

## 2026-11-03 — Subagente local con checkpoints y benchmark de Qwen

Infraestructura, sin cambios en el juego. `scripts/local-ai/subagent.mjs` ejecuta tareas con Qwen y OMP sobre una copia aislada, guarda checkpoints, solo declara éxito con criterios ejecutados y entrega parches sin aplicarlos. Documentación, mediciones e investigación de pesos en [local-ai](local-ai/README.md). Se mantiene Q4_K_M con 128K: Q6_K no mostró ventaja (12 de 21 contra 14 de 21) y fue 16% más lento.

Resultados: `node scripts/local-ai/e2e.mjs` 20/20, incluidas interrupciones y servidor reiniciado. Tarea real sobre `src/sim/rng.ts` interrumpida y reanudada, parche no aplicado. `npm test` 754/754 antes de los cambios simultáneos de otro agente en `src/`. Sin resolver: la causa del congelamiento de OMP 18.15.0.

## 2026-11-03 — Pesca con bancos de peces

R01 cerrada: círculos visibles en el agua donde se pesca, con cargas y reaparición en otro sitio. Corregido un error real: el clic se calculaba contra el fondo del estanque, así que caía lejos de lo que se veía. El aviso de zona peligrosa saltaba a +5 niveles fijos; ahora a los 20 que pidió el creador, en `data/zones.json → dangerLevelGap` (§18.4). C04: la mochila rellena la ventana. Probado con clic real en el navegador.

## 2026-11-03 — Integridad de objetos y comparación con el cuestionario

Se compara `PREGUNTAS_CREADOR.md` con el código: lo pedido y sin fila queda en `TAREAS.md` (R01–R10). C01 y C02 cerradas con `tests/rpg/itemIntegrity.test.ts`, que reproducía los fallos antes de corregirlos: UID repetidos al cargar (equipo → mochila → banco, sin duplicar ni perder objetos, reparaciones en `Character.loadRepairs`), pilas que mezclaban tiradas y bonificaciones, y `ItemFactory.split` que perdía la bonificación. No cambia ninguna cifra de juego.

## 2026-11-02 — Consolidación documental y revisión de OMP

Base inspeccionada ac150a2. Se centraliza estado/evidencia, arquitectura y tareas; roadmap conserva prioridades de producto. Handoffs y entregas útiles archivados; prompts caducados, diagnósticos no verificados y copias fallidas retirados del árbol, recuperables en Git. Preguntas/respuestas y skills preservadas. Tres borradores Canvas 2D no seguidos respaldados fuera del repo y retirados por atribuir una DEC y render no existentes.

Entrada: 766 pruebas verdes pero TypeScript fallaba. Se recuperan las 9 pruebas de comportamiento de progresión/botín sustituidas por OMP y se elimina el archivo redundante de 6 pruebas de banco; no se cambian reglas ni cifras de juego. Pendientes reales: UID entre ubicaciones, propiedades al fusionar pilas, configInicial sin consumidor y casillas según tamaño.

Resultados: npm test 754/754 (82 archivos); npm run build correcto, incluido typecheck; docs:check 20 documentos correctos y rechaza enlace roto de prueba; balance --zones --zone-seeds 1 genera informe en work/balance. Bundle grande Vite sigue como aviso. Se corrigió un salto de línea CRLF introducido en .gitignore durante la limpieza y se repitió regresión completa: verde. Datos de juego, skills y respuestas originales preservados.

Reorganización: 51 Markdown de docs raíz → 11, 49 movimientos, 24 residuos documentales y un generador temporal retirados; agents 27 → 1. Residuos versionados recuperables en Git; borradores no seguidos respaldados fuera del repo. Ver [estado](ESTADO_ACTUAL.md).

La bitácora anterior queda conservada en [histórico](historico/BITACORA_HASTA_2026-11-02.md). No se ejecutó revisión visual Electron.
