# Bitácora reciente

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
