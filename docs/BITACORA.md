# Bitácora reciente

## 2026-11-05 — Interiores y banco desde Blender

Casa, taller, salón del castillo y banco (fachada e interior) salen de `assets/models/interiores.glb`, con texturas `tablas.png`, `yeso.png` y `madera.png`, todo de `scripts/blender/interiores.py`. Lo que bloquea el paso no cambia: sigue en `ROOMS` y `BANK_FURNITURE`, y las gradas del salón repiten en el script las medidas de `platforms`. El empleado del banco usa el modelo de los PNJ, y su cofre es `cofre.glb`, que se abre al usarlo y se cierra al alejarse. `QA_SESION=2` da a `qaElectron` otro puerto, perfil y carpeta, para que dos recorridos no se pisen.

## 2026-11-05 — Mapa: Panamá en miniatura, gradas y detalle por distancia

- Gradas: al estrado del salón del castillo se sube andando. Solo el trono bloquea (`src/world/steps.ts`).
- Atlas de Panamá con las diez provincias y tres comarcas (`data/panama.json`); todas las zonas quedan en [TAREAS](TAREAS.md#mapa-de-panamá).
- Radio de detalle: terreno por trozos, plantas por anillos y bruma azul. Una malla baja muestra de lejos el mar y las cordilleras reales.
- Flora de Blender por zona: palma, guayacán, corotú, mangle, roble, ciprés, plátano, cafeto y caña. Se quitan las texturas calculadas de hojas y suelo y el pino. Casas de cal y teja, iglesia, trapiche en lugar del molino y fortín de coral en lugar del castillo europeo.
- Corregido: la niebla blanqueaba los modelos de Blender bajo la lluvia (`src/render/linearFog.ts`).
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
