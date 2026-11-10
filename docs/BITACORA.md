# Bitácora reciente

## 2026-11-10 — Mazmorra: primeros pisos más grandes; características por cantidad

Pedido del creador. Los cinco pisos hechos a mano pasan de 40–50 a 56–64 baldosas de lado, con 8–12 salas y salas de hasta 11–14 baldosas, para enlazar con los pisos profundos (64 en adelante). Cifras PROPUESTA en `data/dungeon.json`.

Hoja de personaje: campo «Cantidad» junto a los puntos por repartir; cada «+» gasta esa cantidad y el nuevo botón «Todo» gasta todos los puntos en esa característica. `Character.spendStatPoints(stat, budget)` respeta el coste creciente por punto (igual que pulsar «+» varias veces; prueba en `tests/rpg/progression.test.ts`). Verificación: TypeScript y pruebas de mazmorra, progresión y sesión falsa; sin QA en Electron.

## 2026-11-10 — Mundo de todo Panamá con memoria por página y piedras en cada región

Decisión del creador: el mundo se carga por páginas, así que la memoria también. `HeightField.paged` y `NavGrid(..., pageMeters)` reservan alturas y casillas al generar cada página y `WorldStream.free` las suelta al descargarla (las páginas con marcas fijas y las 4 de la parcela inicial quedan fijas). Lo no cargado se lee como altura 0 y bloqueado, igual que antes. El buscador de caminos conserva su ventana fija de 1024². Con esto el mundo pasa a cubrir todo el país (`x −3584..4352, z −640..2560`): las tablas densas habrían costado ≈203 MB; ahora son 1,5 MB al empezar y ≈2 MB tras 2 km o siete viajes (`tests/pagedMemory.test.ts`). `playable` sigue siendo Los Santos y Herrera; el resto se pisa en un claro de 10 m alrededor de su Piedra y se llega viajando.

Nueve Piedras nuevas: La Chorrerita, Colona, Casco Viejito, El Porvenil, La Palmita, Sambúa, Llano Tugrú, Bocas del Torito y Davíd; `tests/stoneRegions.test.ts` exige una en cada provincia y comarca. Nombres inventados como variantes del real (decisión del creador, también para comarcas, PROPUESTA): provincias Los Santicos, Herrerita, Veraguí, Coclá, Panamita Oeste, Colona, Panamita, Dariena, Bocas del Torito y Chiricú; comarcas Emberí-Wunay, Gunayalí y Ngäbí-Buglá. `official` conserva el nombre real como referencia; el mapa muestra `name`. Coste conocido: el suelo lejano muestrea ahora todo el país al arrancar (≈0,7 s más), necesario porque las páginas cercanas pueden aparecer en cualquier punto. `audit:density` sigue revisando sólo la parcela antigua. Verificación: TypeScript, 1.114/1.114 y build; sin QA en Electron.

## 2026-11-10 — Piedras Pintadas fuera de Los Santos y Herrera

Pedido del creador: habilitar las piedras de las demás provincias. Nuevas: **Santiaguito** (Veraguas, −556, 641) y **Agua Dulce** (Coclé, salinas, −48, 752), con un claro pisable de 10 m cada una (`world.clearings` en `data/terrain.json`), porque esas provincias aún no son `playable`; por ahora se llega viajando, no a pie. Corregido de paso: la llegada a Pesé caía en vegetación (nuevo `face`). `tests/stoneRegions.test.ts` exige una piedra en cada región con tierra dentro del mundo por páginas y que piedra y llegada sean caminables.

**Bloqueo para las otras nueve** (Panamá Oeste, Colón, Panamá, Darién, Bocas, Chiriquí y las tres comarcas): quedan fuera del rectángulo del mundo (`x −640..1024, z −384..768`), donde no se genera terreno. Ampliarlo a todo el país (≈7,7 × 3,1 km) costaría del orden de 96 MB de alturas más 96 MB de navegación por mundo con las rejillas densas actuales: es decisión de arquitectura, no un ajuste de datos. Posiciones propuestas desde coordenadas reales: La Chorrera (763, 1504), Colón (630, 2030), Casco Viejo (1034, 1584), La Palma (2575, 979), Bocas (−1958, 2013), David (−2168, 1006); comarcas pendientes de consulta de nombres. Verificación: 1.111/1.111 y TypeScript; sin QA en Electron.

## 2026-11-10 — Q04: una sola cola arriba en el centro

Rótulo de zona, barra de jefe, ficha del objetivo, guía espectral, anuncio de nivel/zona, avisos y ventana de botín tenían cada uno un `top` fijo en CSS y se pisaban. `layoutTopStack` (`src/ui/menus/topStack.ts`, llamado cada fotograma desde `main.ts`) los coloca uno debajo de otro según lo que esté visible, en píxeles de pantalla corregidos por el zoom de la interfaz, y sólo escribe estilos cuando cambian. Lo que el jugador movió a mano (perfil de interfaz o arrastre) queda fuera de la cola. Verificación: TypeScript y `tests/topStack.test.ts`; no se revisó en Electron por instrucción del creador (él hará la QA).

## 2026-11-10 — T12: XP por cercanía de nivel

`rewardProximity` (en `data/rpg/progression.json`, PROPUESTA) centraliza una curva relativa y acotada: 1× al igualar nivel, penalización al repetir contenido atrasado y bonificación menor que 2× ante contenido superior. Los monstruos de población usan la suma estable del nivel de su grupo; un enemigo manual o invocado usa su propio nivel. Recolección y fabricación comparan el nivel del recurso/receta con el del oficio; pesca queda 1× porque sus bancos no declaran nivel. Sin migración de guardados.

`npm run balance:t12` ejecuta 32 semillas en niveles 1–100 y oficios 1–20; pasan las cinco puertas (orden de la curva, tope < 2×, ningún salto de más de un nivel por grupo equivalente, progresión lenta desde nivel 10, reproducibilidad). Hallazgo: los recursos terminan en nivel 5 y las recetas en 8; completar esas franjas corresponde a T05. Verificación: TypeScript, suite completa y build.

## 2026-11-10 — A02 y T14: capa ambiental, estructuras asentadas y lanchas transitables

Se terminó y revisó el trabajo que quedó abierto durante el relevo de Claude. `data/ambient.json` conecta 72 nodos de cuatro catálogos mediante siete capas deterministas de detalle y 129 piezas manuales; las sólidas comparten huella de dibujo y colisión. `AmbientView` fusiona cada anillo por trozo, carga y libera con el streaming, responde a densidad/distancia y se oculta en interiores. Se añadieron límites efectivos de ejemplares/triángulos, captura de errores de carga y cobertura de parser, referencias GLB, dimensiones, determinismo, huellas giradas, apoyo y geometría fusionada.

El muestreo de terreno nuevo habría multiplicado consultas al atlas. Se conserva la respuesta exacta con una rejilla rápida que sólo memoriza celdas sin bordes y deriva al cálculo original en costas/límites; el hash espacial limita su tabla sin dejar de filtrar por distancia. La regresión completa de atlas, páginas, navegación y simulación fija que estas optimizaciones no cambian el mundo. El soporte opcional de claros queda sin datos productivos hasta que una tarea lo necesite.

Las 61 estructuras del exterior usan un contrato común: plataformas suaves para huellas grandes, apoyo puntual para piezas pequeñas y superficie del mar para lanchas. La auditoría da 0/61 fuera del umbral de 0,30 m. Se corrigió una regresión histórica de la ruta Iguanera–Pedasol: el punto `(516,14)` no era transitable; ambos sentidos vuelven a `(478,14)` y una prueba exige que los cuatro puntos de embarque/desembarco sean caminables. La lancha visual de Pedasol queda en el punto de agua más cercano que admite su casco completo, `(520,12)`.

Validación local: TypeScript y build correctos; 46 pruebas focalizadas de ambiente, estructuras, streaming, mapa, banco y Panamá; regresión completa 1.098/1.098 y WebSocket 2/2. `audit:density` no encuentra invasiones de camino ni nuevas páginas de riesgo alto; interfaz 1366×768 19/19 con perfil limpio; casas y costa correctas; `iguanera` 7/7. Medición final sin errores: pueblo 49 FPS, Chitrí 59 y Pedasol 60. En Iguanera, 1.131 piezas/151.360 triángulos ambientales dieron 44 FPS frente a 50 con la capa apagada; otras pasadas dieron 34–58, por lo que A02 queda integrado pero con seguimiento de estabilidad, sin ocultar la variación. El arnés Electron ahora desactiva HMR, parte de un perfil limpio, registra piezas/triángulos y detecta solapes reales; el solape de chat observado antes provenía del perfil persistente, no de los valores productivos. También se corrigió la ruta Windows de `audit:density` (`fileURLToPath`).

## 2026-11-10 — R10 (parte): elemento agua y características propias de hielo y agua

Orden directa del creador: centrarse en los elementos hielo y agua que faltaban. Nombres e ids son `PROPUESTA` y viven en datos y tablas de interfaz; cambiarlos no toca la lógica.

- **Contrato:** `ELEMENTS` añade `water` (agua) y `PRIMARY_STATS` añade `calm` (**Calma**, hielo) y `flow` (**Caudal**, agua). `elementStat`: hielo → Calma (antes compartía Intelecto con fuego), agua → Caudal; Intelecto queda sólo para fuego. `resist.water` y `damage.water` existen por el mismo contrato.
- **Clases:** las tres empiezan con Calma y Caudal en cero. La Tejedora pasa su característica principal y su crecimiento por nivel de Intelecto a Calma (su repertorio es tormenta y hielo), de modo que su hielo conserva la potencia anterior.
- **Hechizos (nivel 16, uno por clase):** Tajo de marea (Vanguardia, cono con empuje), Tromba marina (Tejedora, área) y Saeta de estero (Cazador, proyectil con área). Todos dejan **Empapado** (4 s, −10 de resistencia a hielo y a tormenta): el agua prepara el golpe de los otros dos elementos.
- **Equipo y enemigos:** Varita de raíz de mangle, Orbe de neblina, Cadena chata y el set de la Pollera dan Calma; Arpón de perlero pasa a agua con Caudal, Collar de perlas negras da Caudal y las piezas de concha, nácar y arrecife resisten agua. Marinero Ahogado, Calamar Gigante y Pescador Fantasma atacan con agua.
- **Interfaz y efectos:** etiquetas, color, icono, partículas, registro de combate, traducción inglesa y tres reacciones de laboratorio (Vaharada, Aguanieve, Corriente viva). Las cinco partidas de prueba de Tejedora reparten en Calma.

Verificación: TypeScript; 1.070/1.070 en 123 archivos (sin `stream` ni `bankScene`, que no tocan RPG); regresión nueva en `tests/rpg/damage.test.ts`. Observado en Electron a 1920×1080 (`interfaz`, 20/21, cero errores de consola): Calma y Caudal en la hoja, fila «agua» en resistencias y Tajo de marea en el libro. No observado: lanzar los hechizos de agua ni Empapado en combate. Sigue pendiente de R10: equivalentes propios de acción y movilidad, y cobertura de equipo de agua/Caudal en franjas bajas (T05). Las cifras no se han medido con `balance:v3`.

## 2026-11-10 — T01: medición multisemilla contra los objetivos de duración

Nueva herramienta `npm run balance:t01` (`scripts/balance/t01.ts`, informe en `work/balance/T01.json`) y regresión `tests/balance/t01.test.ts`. Es simulación con bot a 60 Hz; no certifica sensación humana. No se cambió ninguna cifra de balance.

- **A. Nivel 1 sin equipo contra nivel 1 (objetivo ≤ 30 s): cumplido.** 3 clases × 4 monstruos diurnos de Iguanera × 2 habilidades × 12 semillas = 288 peleas: 100 % victorias, 0 muertes, mediana 2,0–6,0 s, pelea más larga 7,1 s, golpe máximo recibido ≤ 20 % de la vida. La prueba fija el tope de 30 s.
- **B. Jefes tardíos (objetivo 5–15 min): no cumplido, y no hay jefes reales.** El monstruo menos frecuente de cada zona ≥ 50, solo y al nivel máximo de la zona, contra el nivel medio de la franja (7 zonas × 3 clases × 6 semillas por estrato): con equipo medio obtenible cae en 9,6–17,0 s de mediana (máx. 18,3 s) y con el mejor obtenible en 5,3–10,7 s; 100 % victorias, 0 muertes, golpe máximo ≤ 12 % de la vida. Son élites de zona con ≈ 3.300–4.800 de vida, no jefes.
- **C. Presupuesto (estimación; no existe PvP ni contenido de nivel 200).** Con el mejor equipo obtenible, el daño medido es 1.082–1.253/s a nivel 100 y 1.307–1.866/s a nivel 200, con 5.186–5.249 y 8.616–8.679 de vida. Vida propia / daño propio da 4,2–6,6 s: cota inferior de un duelo espejo, sin defensas, curas ni huida, medida en peleas cortas (ráfaga, no desgaste). Un jefe necesitaría ≈ 325.000–376.000 de vida para 5 min y ≈ 0,97–1,13 millones para 15 min a nivel 100; ≈ 392.000–560.000 y 1,18–1,68 millones a nivel 200.

Conclusión: la línea 10/20/30 con inicio desnudo cumple el objetivo temprano con holgura; el tardío exige una decisión de diseño (jefes propios con vida y mecánicas de ese orden, y una regla de daño entre jugadores), no un retoque de los monstruos de zona. Queda como `PROPUESTA` pendiente del creador.

## 2026-11-10 — C06: 10/20/30 productivo y perfiles QA aislados

La progresión productiva pasa a 10 puntos de capital, 20 de vida y 30 Briznas por nivel. La pantalla Opciones muestra una pestaña Desarrollo sólo cuando existen Partidas de prueba: Productivo, anterior 5/5/5, histórico 5/20/30 y personalizado dentro de límites validados. La elección se aplica al construir una partida QA nueva; no muta el contenido compartido ni una sesión existente.

Cada guardado nuevo incorpora la instantánea de esas tres cifras. La fábrica restaura una copia aislada al cargar; guardados anteriores o instantáneas inválidas usan producción. El simulador V3 reconoce 10/20/30 como fila activa y conserva las otras como contrafactuales. IA local y Skynet recibieron la misma consulta abstracta, sin código: 11,6 s/740 tokens y 14,6 s/893 tokens. Ambas recomendaron aislamiento por partida; se adoptó la instantánea, no sus propuestas de espacios de nombres o archivos separados.

La primera regresión completa descubrió dos supuestos de 5/5/5 en pruebas antiguas: una mochila rellenada con una cantidad fija y un límite de crítico que mezclaba progresión base con aporte de equipo. La mochila se llena ahora contra su capacidad real; el crítico conserva el límite técnico de 100 % y acota por separado el aporte del equipo. El Cazador nivel 95 medido queda en 68,46 % equipado y se revisará como balance dentro de T01, no deshaciendo C06. Verificación final: TypeScript, compilación, documentación, balance V3, 1.078/1.078 pruebas del juego y 2/2 de WebSocket correctos.

Se amplió el escenario Electron `interfaz` para abrir Desarrollo y exigir sus cuatro controles. Los primeros intentos fallaron por tres defectos del propio recorrido, no del juego, ya corregidos en `scripts/qaElectron.mjs`: el perfil de pruebas servía desde su caché HTTP un Babylon precompilado antiguo que pedía un módulo inexistente (ahora arranca con `--disable-http-cache`); `interfaz` ejecutado solo se quedaba en la pantalla de creación y buscaba el botón del título; y abría el menú con Esc cuando desde U05 va en F10. El fallo de arranque informa ahora qué había en pantalla y `QA_BOOT_MS` alarga la espera.

Observado tras el relevo (Electron, 1920×1080, escenario `interfaz`, cero errores de consola): HUD, tres ventanas, diario, compendio, oficios, mapa, pausa, las cuatro pestañas de Opciones incluida Desarrollo con sus cuatro controles visibles, buscador, atajos, ranuras, tienda y diálogo: 20/21. Pendiente: a 1366×768 el recorrido se detiene en «No abrió .panel-inventory» después del HUD; no está diagnosticado si es defecto del juego o del recorrido, y 768p y 3440×1440 quedan sin observar en esta pasada. Batería completa repetida tras el relevo: 1.080/1.080 en 124 archivos, TypeScript, compilación y documentación correctos.

## 2026-11-10 — Arnés de QA manual en el repo y guía de herramientas

El arnés por CDP usado en la QA del 2026-11-09 pasa de `work/qa-manual/` (ignorado) a `scripts/qa-manual/`: `launch.mjs` (Electron con CDP 9351 y perfil propio), `cdp.mjs` (ejecuta pasos con preludio automático y avisa si un paso se corta), `lib.js`, `walk.js`, `fight.js` y un paso de ejemplo. Nueva guía `docs/HERRAMIENTAS_QA.md`: qué herramienta usar, ayudas, recetas (niebla, eventos, contornos, diálogos), prueba B aislada en worktree y trampas conocidas. Verificado en Electron: nueva partida, `state`, `nearEnemies`, `walkTo` y capturas. `npm run docs:check` correcto. Sin cambios de juego.

## 2026-11-10 — C07: inicio real desnudo y primarias en cero

`Character.create` dejó de autoequipar el kit inicial: armas, ropa y accesorios permanecen en la mochila hasta una orden explícita. Las tres clases fijan Fuerza, Agilidad, Intelecto, Vitalidad y Espíritu en cero al nivel 1, conservando vida, recurso, regeneración, movimiento, hechizos de clase y ataque sin arma funcionales. Los perfiles y pruebas que necesitan equipo ahora lo colocan de forma explícita, sin devolver el comportamiento productivo anterior.

La regresión nueva recorre todas las clases y comprueba equipo vacío, cinco primarias en cero, hechizos iniciales conocidos, golpe sin arma y reservas funcionales. Las 73 pruebas directamente afectadas pasaron. La primera batería completa detectó tres supuestos antiguos de equipo automático; se corrigieron y sus 34 pruebas focalizadas pasaron. Resultado final: TypeScript correcto, 1.074/1.074 pruebas del juego y 2/2 de WebSocket al repetir con acceso a localhost (el `EACCES` restringido no estaba relacionado con C07).

## 2026-11-09 — Respuestas del creador convertidas en trabajo verificable

Se revisó `ACCIONES_CREADOR.md` y se trasladaron sus respuestas al tablero único sin cambiar todavía el comportamiento del juego. Quedan fijados: 10/20/30 como progresión productiva; nivel 1 desnudo, sin equipo ni estadísticas primarias base; máscara que se rompe al recibir ataque y puede detectarse por proximidad o movimiento brusco; monturas y mascotas con progresión propia; XP por cercanía de niveles; catálogo por categoría y franja; creación visual en vivo; correcciones concretas de interfaz, Iguanera y Pintura; y una acción QA para forzar la muerte espectral.

El orden técnico pasa a C07 → C06: primero se fija la línea cero del personaje y después se aplica el crecimiento productivo. A continuación se recalibran combate, XP y objetos; los guardados y perfiles de prueba pueden regenerarse por directriz expresa. Una consulta Windows pequeña tardó 9,6 s/758 tokens, pero se rechazó su sugerencia de conservar 5/5/5 porque contradecía al creador. Skynet recibió únicamente el orden abstracto de dependencias y respondió en 15,6 s/1.191 tokens; su secuencia confirmó que inicio base, contrato RPG, progresión y consumidores deben cerrarse en ese orden. No se delegó una tarea grande ni se introdujo una decisión creativa.

## 2026-11-09 — Contraste reproducible de progresión 5/5/5 y 5/20/30

Se verificaron el contrato productivo, la auditoría y los experimentos V3. Producción continúa en +5 capital, +5 vida y +5 Briznas por nivel; `configInicial` 5/20/30 permanece sólo como alternativa pendiente de ratificación. Se corrigieron H06, el crítico documentado de Agilidad y la variante E que llamaba «actual fija» a una capacidad que el juego incrementa +5 por nivel. El informe V3 usa ahora los niveles 1, 10, 20, 50, 100, 150 y 200.

La comparación incluye crecimiento común de clase (+4 vida y +1 Vitalidad, equivalente a +9 vida por subida) y separa el capital asignable. `npm run balance:v3` regeneró la línea base; el simulador actual no usa consumibles, por lo que no se atribuye un ahorro de pociones sin una prueba nueva. El trabajador Windows confirmó la vigencia 5/5/5, pero se rechazó su aritmética porque confundió Briznas con vida y no aplicó correctamente `statsPerLevel`; las cifras integradas fueron recalculadas contra código y datos.

Directriz posterior del creador: guardados y partidas de prueba son regenerables y no deben atrasar RPG V3. La compatibilidad pasa a ser opcional: sólo se conserva cuando sea pequeña y segura; de lo contrario se versiona el contrato y se recrean perfiles, sin borrar datos durante esta preparación.

RPG V3 queda preparado, no implementado: mapa de dependencias y diez fases atómicas en `docs/propuestas/DISENO_ELEMENTOS_CLASES.md` §10; nombres, reglas y curva definitiva siguen pendientes. Delegación medida: Windows comparó progresión en 51,8 s/3.407 tokens, pero su aritmética fue rechazada; una consulta pequeña de seam tardó 8,0 s/729 tokens y confirmó el contrato central. Dos intentos OMP demasiado amplios fallaron por contexto/tiempo sin editar archivos. Skynet recibió sólo contexto abstracto: 16,9 s/1.088 tokens; aportó las pruebas de sensibilidad a equipo y curas, no decisiones. Resultado local: 1.074/1.075 pruebas pasaron dentro del entorno restringido; la única (`server/poc`) falló por `EACCES` al abrir localhost y pasó 2/2 al repetir con acceso local. `npm run typecheck`, `npm run docs:check` y `npm run balance:v3` correctos.

## 2026-11-09 — Tres catálogos ambientales y auditoría de densidad de OMP

Se revisaron las láminas, reportes y GLB reimportados de los tres encargos locales. Se integran en Git los editables, generadores, validadores y catálogos `detalle_suelo` (18 nodos, 2.310 triángulos, atravesable), `caminos_rurales` (18, 2.406) y `costa_modular` (18, 2.052). No se colocan automáticamente: A02 conserva el reparto con reglas de colisión y revisión Electron.

La auditoría pasa a `scripts/audit/worldDensity.ts` y `npm run audit:density`; sus resultados se regeneran en `work/`. Midió 13.622 sólidos, mediana 93,1 % de tierra caminable, cero invasiones y cero cuellos bajo umbrales PROPUESTA. No se tocó el mapa: A07 pide mirar p3_7, (512,14) y p2_8/p3_8 antes de decidir cambios.

## 2026-11-09 — QA en Electron: niebla verificada, tres clases, ventanas y prueba de B

Segunda pasada de la [QA del 2026-11-09](QA_2026-11-09.md#segunda-pasada-en-electron-2026-11-09-tarde), con
entrada real (teclas y ratón enviados a la ventana) y un perfil de usuario aparte. No cambia código ni datos.

- Niebla del Muelle (P1): reproducida antes de `03bbbb5` y verificada después, con día, noche, aguacero, cuatro
  inclinaciones, siete biomas e interiores. Era la malla `farWorld`; la niebla no se tocó.
- Funcionan: creación de las tres clases, aparición segura, las dos primeras misiones con sus recompensas,
  guardado y carga, muerte y reaparición, mochila, personaje y equipar con requisito de nivel.
- Nuevos pendientes:
  - Q11: contornos de tinta de copas recortadas.
  - Q12: enemigo pegado a un obstáculo («Fuera de alcance» y acercamiento hasta 0,9 m).
  - Q13: hechizos de área alrededor del personaje que piden confirmación (decisión del creador).
  - Q14: encuadre de Eligio.
- Descartado: los errores de WebGL al alternar Pintura venían de una prueba manual, no del juego.
- B probado un rato en un árbol de trabajo temporal y vuelto a `false`: sin golpes gratis, se cancela bien y no
  cambia de objetivo. En `master` nunca se activó.

Capturas reducidas en `docs/capturas/qa-2026-11-09/`.

## 2026-11-09 — Ataque básico automático preparado y medido (Q10)

Responde a la decisión del creador: ataques básicos continuos, «pero no de forma ilimitada ni gratuita». Primero se
escribieron las pruebas (`tests/basicAutoAttack.test.ts`, 11 casos). Después se añadió la mecánica, apagada:

- `data/player.json` → `basicAttack.autoRepeat` (`false`) y `classCost` (`{}`).
- `World.approachAndAttack`: con `autoRepeat`, un clic sigue golpeando al mismo objetivo al ritmo de las cargas y
  del arma. Se detiene si no hay recurso para el siguiente golpe (sin golpe gratis ni persecución), si el objetivo
  muere (sin elegir otro), al lanzar un hechizo o al moverse. No hay cargas ni enfriamientos nuevos: se usan los de
  siempre.

Medición en las tres clases con `npm run balance:ataque-basico` (bot de balance con las opciones nuevas
`basicOnly` y `clickGap`):

- A (un clic = un golpe) y B (automático) dan los mismos resultados, porque la recarga de 1,4 s marca el ritmo.
- Solo básico gana casi todos los escenarios medidos, de 2 a 3,6 veces más despacio. Esto ya pasaba con A.
- Un coste por golpe proporcional a la regeneración limita a la Vanguardia (reserva de 60) y casi nada a la
  Tejedora (140).

Recomendación en [propuestas/ATAQUE_BASICO_AUTOMATICO](propuestas/ATAQUE_BASICO_AUTOMATICO.md). No se activó
ningún valor; falta la decisión del creador y probarlo en Electron.

## 2026-11-09 — Inicio de Iguanera: sin monstruos junto a la Piedra y cámara hacia Eligio (Q01, Q03)

Corrige dos pendientes de la [QA del 2026-11-09](TAREAS.md#qa-del-2026-11-09), con pruebas escritas antes del cambio.

- Q01: la zona segura `iguanera_muelle` (`data/zones.json`) pasa de 18 m a 62 m alrededor de (610, 240). Así abarca
  la Piedra y la lancha con 40 m de margen. El bioma del mismo nombre en `data/vegetation.json` repite el área,
  como exige su prueba. Medido en una partida nueva: el monstruo más cercano está a 58 m y de noche ningún sato
  baja al muelle. Antes había 14 enemigos a menos de 80 m; ahora hay 4.
- Q03: al llegar a una Piedra (partida nueva, reaparición, viaje o poción de recuerdo) se aparece a 2,5 m de ella y
  no dentro. Es menos que `activateRadius`, así que la Piedra se sigue activando. El lado lo da el nuevo campo
  opcional `face` de `data/stones.json`; sin él, se aparece al sur. Un personaje nuevo empieza con la cámara mirando
  a `face`: en Iguanera, Eligio queda centrado delante.
- Q03: el recorte de oclusión incluye siempre el objetivo del jugador (`occlusionPicks`), aunque esté a más de los
  14 m de `enemyRange`. Antes el blanco del cazador quedaba bajo las copas.

Verificado: pruebas, TypeScript, build y documentación en verde. En el navegador integrado se comprobó una partida
nueva de día y de noche. Queda la revisión visual en Electron y la decisión del creador sobre si un clic sigue
atacando al objetivo.

## 2026-11-09 — Primera pasada de efectos de combate

La causa de varios efectos baratos era también semántica: esquivar reproducía el mismo WAV que un bloqueo metálico y el lanzamiento físico reutilizaba un golpe pesado. `scripts/generateSfx.mjs` genera ahora 21 muestras originales PCM mono a 44,1 kHz, con eliminación de DC y saturación suave: seis barridos de arma propios, preparación física, esquiva de aire e impacto de escarcha, además de las doce muestras anteriores regeneradas a mayor resolución. El motor conserva paneo y variación; las recetas Web Audio siguen como respaldo si un WAV no se decodifica.

`tests/audio.test.ts` comprueba los 21 archivos, frecuencia, metadatos, cobertura y que no vuelvan las dos reutilizaciones incorrectas. Generar dos veces produjo hashes idénticos; `ffprobe` confirmó 44,1 kHz mono y duraciones de 0,32 a 1,10 s. Pasaron 24/24 pruebas focales, TypeScript, build, documentación y 1.050/1.051 pruebas en el sandbox; la única restringida (`server/poc`, WebSocket en loopback) pasó 2/2 fuera de él. Falta escucha comparativa en Electron: esas verificaciones no acreditan por sí solas que el gusto final esté resuelto.

## 2026-11-09 — QA de Iguanera, combate e interfaz; el chat ya no crece sin fin

Pasada de QA pedida por el creador con una partida nueva de Cazadora en Iguanera (navegador integrado,
1280×800, sin Electron). Informe en [QA_2026-11-09](QA_2026-11-09.md); los pendientes van en
[TAREAS](TAREAS.md#qa-del-2026-11-09) como Q01–Q09.

- Lo más grave: el inicio es peligroso (14 enemigos a menos de 80 m de la Piedra y un sato nocturno de 149 PV en el
  muelle), y un clic sobre un enemigo da un solo golpe.
- El día dura 5 minutos y casi la mitad es noche. `4e66700` dejó a `night_sato` en 6 XP.
- Hay textos de misión que no cuadran con la escena.
- Combate medido con un guion que usa los comandos del ratón: la Cazadora gana a todo lo de Iguanera sin
  recibir daño si mantiene la distancia.

Corregido: `.chat` no tenía alto y `.chat > .chat-log` crecía con cada mensaje (82 líneas = 776 px,
todo el lado izquierdo). Ahora parte de 170 px y el estirado manual sigue mandando. Verificado en el navegador.

## 2026-11-09 — Blender MCP listo en el Mac para Claude y OMP

Se instaló `uv` con Homebrew y el addon «MCP for Blender» v1.8 con `uvx mcp-for-blender@2.2.7 install-addon`
en `~/Library/Application Support/Blender/5.2/scripts/addons/`. Se activó con
`scripts/mac/arrancar_blender_mcp.py`, que guarda las preferencias con arranque automático. El servidor
`blender` quedó registrado con la ruta absoluta de `uvx` y la versión fijada en `~/.claude.json` (ámbito
usuario) y en `~/.omp/agent/mcp.json`. Verificación: Blender 5.2.3 escucha en `127.0.0.1:9876`; un cliente
MCP por stdio recibió 9 herramientas, `get_addon_status` (protocolo 15/15) y `get_scene_info`; `omp -p` leyó
la escena y `claude mcp get blender` da «Connected». Lanzar con `open -na Blender --args --python` no ejecutó
el script, así que la guía usa el ejecutable directo. Documentado en
[GUIA_BLENDER_MCP §1a](GUIA_BLENDER_MCP.md#1a-mac-configurado-el-2026-11-09).

## 2026-11-09 — Iguanera ya no queda tapada por la malla del Panamá lejano

Al empezar una partida nueva en el Muelle de Iguanera, la vista (y más al alejar la cámara) quedaba
cubierta por un velo gris azulado. No era la niebla de escena: era `farWorld`, la malla baja del
atlas. Fuera de la parcela original se colocaba 1 m bajo la altura del atlas, que incluye
`landHeight` (+3 m), mientras el terreno de páginas no la suma; quedaba unos 2 m sobre la isla. Ahora,
donde puede haber páginas (límites del mundo), cada vértice baja a 2 m bajo el punto más bajo de
`terrainHeight` que tocan sus triángulos; fuera de esos límites sigue igual. Prueba
`tests/farWorldFloor.test.ts`; verificado en el navegador con partida nueva, cámara a 70 m y
mediodía. Typecheck y suite completa (1.051 pruebas) en verde. Falta verlo en Electron.

## 2026-11-09 — Calibración de enemigos, equipo y legibilidad del combate

Se sustituyó el crecimiento compuesto tardío por curvas lineales: vida +40 % y daño +8 % por nivel
sobre la ficha base, con XP por rol y topes de potencia, crítico, bono crítico y resistencias. El
generador reproducible `recalibrateEnemies.mjs` actualizó 55 arquetipos. En la línea base V3, el
equipo optimizado gana todas las franjas 1–95; quedan derrotas deliberadamente visibles al entrar
sin equipo o con equipo medio en Boquete/Fortuna, por lo que todavía no se declara balance cerrado.

El aporte de Agilidad al crítico baja a 0,0006 por punto. En nivel 95, el auditor de equipo observa
un máximo de 61 % de crítico en la muestra reproducible; las regresiones admiten hasta 65 % entre
tiradas, menos de 1,8× de primaria y menos de 1,75× de vida frente al personaje sin equipo.

La captura Electron mostró que los rótulos de grupos numerosos tapaban modelos y avisos. Ahora el
mundo enseña sólo el objetivo y la amenaza más cercana; el HUD superior conserva el grupo completo.
El recorrido `enemigos` pasó 4/4, con 74 enemigos, 80 mallas, 55 FPS asentados y cero errores de
consola. Verificación: 22/22 pruebas focales, typecheck, `npm run balance:v3` y build de producción.
La suite completa alcanzó 1.042/1.049 antes de actualizar tres expectativas antiguas de escalado;
las tres pasan en la repetición focal. Los cuatro fallos restantes pertenecían a assets simultáneos
sin procedencia/modelo todavía y a loopback restringido; no se mezclaron con esta entrega.

## 2026-11-09 — Iconos completos y armas 3D coherentes con su ilustración

Codex. Se redibujaron individualmente las 32 armas del catálogo como PNG RGBA anime-fantástico,
sin marco horneado y dentro de la caja segura común de 176 px. El validador detectó además catorce
objetos nuevos sin archivo y se completaron en la misma familia; `validar_item_icons.py` acredita
los 154 IDs actuales, todos únicos, transparentes y de 256×256. `itemIcon()` ya los consume por ID
y conserva el dibujo por código únicamente como respaldo.

El generador `scripts/blender/equipo.py` recibió una firma visual por arma para trasladar al 3D la
silueta, la paleta y el material dominante de su icono: madera tropical, cuero, fibra, cobre, coral,
turquesa, nácar, bruma, lava y ámbar. Se regeneró `assets/models/equipo.glb` (57 nodos, 16.260
triángulos); las 32 armas mantienen `obj_<itemId>`, origen en el agarre y punta hacia +Z. El
validador de Blender pasó con IDs, escala y orientación exactos. `heldGear.ts` ya carga ese GLB y
clona el nodo del arma equipada, por lo que la entrega queda integrada en inventario y personaje.
La revisión material desde Blender confirmó la familia; falta el recorrido visual final en Electron.

## 2026-11-09 — Heroínas anime y aspecto elegible al crear el personaje

Claude. Las tres heroínas (Centinela, Oráculo y Cazadora) pasan a una base anime CC0, «Blender-chan»
de AmarilloArts: `scripts/blender/heroe_bchan.py` deja fuera sus adornos con marca, cuece las mallas
en reposo, reduce el rig a los 16 huesos comunes, baja los brazos girando lo que pesa en cada uno y
recoge la falda. Masculinos y femeninas se exportan ahora por piezas (`heroe_piezas.py`): `Piel`,
`Ropa`, `Ropa2`, `Calzado`, cuatro caras `Cara_0..3` (en ellos pintadas: pecas, cicatriz, líneas de
jagua; en ellas, formas de ojos y cejas) y tres peinados `Pelo_short/long/bun` intercambiados entre
las dos bases. Piel, ropa y pelo se hornean neutros y el juego los tiñe.

Al crear el personaje se eligen cara, peinado (o rapado) y colores de piel, pelo, ropa y ropa 2
(`data/appearance.json`, PROPUESTA, con un aspecto inicial por clase y sexo). Se guarda en la partida
(`SaveData.appearance`; los guardados sin él usan el de su clase) y `ArenaView` deja sólo la cara y el
peinado elegidos y aplica los colores; un sombrero o yelmo que tapa el pelo quita también los nuevos
peinados. Modelos: 19 047 triángulos los masculinos y 25 038 las femeninas contando las cuatro caras
y los tres peinados; en juego se dibuja una cara y un peinado. Pruebas en
`tests/characterAppearance.test.ts`. No se probó en Electron ni hay vista previa 3D al elegir.

## 2026-11-09 — Héroes masculinos sobre una base anime CC0

Claude. Los tres héroes masculinos (Centinela, Oráculo y Cazador) dejan las figuras de cajas y pasan a
una base anime descargada: «Base Rigged Stylized Humanoid Character (YW)» de Girush (OpenGameArt,
CC0). `scripts/blender/heroe_anime.py` recibe el `.blend` de la base (no se copia al repositorio),
baja los brazos de la pose en A, reduce sus 65 huesos a los 16 del esqueleto común siguiendo la
cadena de padres (los clips de `fg_rig` sirven tal cual), tiñe sus texturas de piel al tono de cada
clase y viste por zonas con las telas pintadas propias (camisa, pantalón, faja, botas, brazales y
chaleco o túnica). Hornea una textura por pieza y exporta `centinela_anime.glb`, `oraculo_anime.glb`
y `cazador_anime.glb` (7 010 triángulos, unos 1,4 MB cada uno) con Reposo, Caminar, Correr, Rodar,
Golpeado, Morir, Atacar, Lanzar, gestos y Disparar en el cazador. `data/assets.json` apunta a ellos;
los anteriores siguen en `assets/models/` y vuelven cambiando tres rutas. Comprobado: se renderizan
bien en Blender en reposo, carrera y ataque; en el navegador el jugador carga `FG_centinela_anime`
con la espada equipada en la mano derecha y sin errores. No se vio la escena del juego (panel oculto)
ni se probó Electron. Las armas del diseño (lanza y escudo, bastón, arco) ya no vienen en el GLB: se
ve lo equipado de `equipo.glb`. Las versiones femeninas siguen con el modelo anterior; Blender-chan
(CC0) quedó descargada pero su rig Auto-Rig Pro pide más trabajo.

## 2026-11-09 — Cripta honda: pisos-mapa con agua, puertas, jarras, barriles y emboscadas

Claude. Los pisos generados (6–100) crecen de 64 a 128 baldosas de lado (hasta unos 190 m) y de
12 a 28 salas, con más pasillos de enlace. Cada piso trae de 1 a 3 estanques de pesca en salas
grandes (pescar funciona igual que fuera: cada `World` tiene ahora sus propios `fishingSpots`),
puertas de madera que bloquean el paso hasta abrirlas con clic (se abren hacia la sala con una
animación), jarras y barriles rompibles con un poco de oro o un objeto y, a veces, un bicho dentro,
y emboscadas que saltan al entrar en ciertas salas con monstruos por encima del nivel del tramo.
Las piezas (jarra, barril, aros, cascotes, poste, dintel, hoja de puerta y piedra de estanque) se
modelan en `scripts/blender/mazmorra.py`; `mazmorra.glb` regenerado (2.286 triángulos). Todas las
cifras son PROPUESTA en `data/dungeon.json` (`deep` y `breakable`). Medido: el piso 100 se genera en
unos 8 ms con 30 salas, 3 estanques, 37 puertas, 75 rompibles y 3 emboscadas. La prueba de
alcance por inundación de la rejilla sustituye a la de A* en pisos hondos (más grandes que el
límite de expansión del buscador). En el navegador, piso 31 sin errores: clic en puerta la abre y
desbloquea el hueco y romper una jarra corre sin errores; la pesca en estanque queda cubierta por
prueba, no se probó a mano. Falta verlo en Electron y jugar el ritmo.

## 2026-11-09 — Geografía real de Panamá: costa, provincias y relieve

Costa y provincias salen ahora de Natural Earth 1:10m (dominio público): la costa de Panamá tiene
1 984 puntos en 15 anillos y cada provincia y comarca usa su forma real. Ya no hay recuadro a mano
(`handBox`). Panamá Oeste se separa por el Canal con una línea aproximada. Se conservan Iguanera
(agrandada a propósito) y los cayos de Guna Yala. El relieve es real: `data/relieve.json` es una
rejilla de 0,01° sacada de Terrain Tiles on AWS (SRTM, GMTED y ETOPO1), con escala vertical 0,075
(`reliefScale`). Así, Barú queda en unos 260 m de juego y Canajagua en unos 60. `farHeight` la usa
en la vista lejana y en el macrorrelieve, que se atenúa dentro de la parcela.

Con la costa real, Punta Venada quedaba en el mar: sube 30 m tierra adentro, con su camino, sus casas
y su Piedra. El muelle de Pedasol pasa a la orilla real.

Dos errores visibles de lejos, corregidos:

- `staticMesh` compartía los vértices de la biblioteca. Al hornear cada roca grande, todas las rocas
  dispersas se desplazaban y aparecían flotando cientos de metros mar adentro.
- La malla lejana se hundía 14 m en todas partes, así que los llanos y costas reales quedaban bajo el
  plano del mar. Ahora solo se hunde bajo la parcela. Además, el color por altura usa el pico real y
  la bruma es más suave.

Pruebas: `tests/atlas.test.ts` comprueba la costa real en todo el atlas, que los pueblos queden en
tierra y en su provincia, y las alturas de Barú y Chitré. Se revisó en el navegador a distancia.

## 2026-11-09 — Progresión, guardados y balance productivo v2

Por autorización expresa del creador se activa la progresión v2: cada nivel concede +5 de capital,
+5 de vida y +5 de capacidad de Briznas; repartir primarias usa paliers de 100 y reiniciar devuelve el
capital exacto. El guardado pasa a versión 2. Al abrir una ranura v1 se conserva primero un respaldo
exacto y se aplica reembolso histórico (`capital libre + unidades asignadas`), sin inflación y sin
repetir la migración al leer de nuevo.

Se retira el doble escalado de la primaria cuando coincide con el atributo principal. Las tres clases
reciben crecimiento automático equivalente y daño representativo N10 dentro de 51–60; el Cazador
conserva mayor probabilidad crítica. Se añaden seis hechizos para que cada clase tenga daño de físico,
fuego, hielo, tormenta y tierra al nivel 20. Los objetos incorporan `carryCapacity` desde nivel 1 hasta
86 y esa bonificación modifica la capacidad real.

El menú de desarrollo genera 63 partidas: tres clases por 21 franjas, agrupadas en 1–25, 26–100 y
101–200, con equipo obtenible y semilla reproducible. Las franjas sin territorio se identifican como
simulaciones. `npm run balance:v3` se regeneró con las reglas activas. La comparación directa de clases
mejoró, pero las derrotas generalizadas desde varias franjas medias prueban que el balance de enemigos
y zonas sigue pendiente; no se presenta como cerrado.

Verificación de esta entrega: 122/122 pruebas focales de progresión, daño, inventario, guardados,
traducción y balance; construcción de las 63 partidas; typecheck completo; renderer Vite completo
(2.808 módulos), proceso principal Electron y documentación. La regresión general pasó 1.034 pruebas;
las dos expectativas de versión que el proceso ya había cargado se repitieron tras actualizarlas y
pasaron. La conexión WebSocket local, bloqueada dentro del entorno, pasó 2/2 al repetirla con permiso.

## 2026-11-09 — Evidencia V3 de progresión y balance

Se corrige la auditoría anterior para separar decisiones, implementación, problemas, propuestas y valores experimentales. Sin cambiar `data/rpg`, combate ni guardados, se añade un catálogo de adquisición por kits, tiendas, botín territorial/misiones, recompensas, pesca y recetas; perfiles deterministas por clase/franja/build/equipo; una costura para ejecutar el combate de zona con sesiones preparadas; comparaciones A–F puras; y previsualización de migración v1 sin escritor v2.

`npm run balance:v3` genera `work/balance/V3_BASELINE.md/.json`: 154 objetos examinados, 122 con ruta implementada, 756 perfiles (324 en territorio con `areas`, 432 hipotéticos) y 8/16 perfiles visuales sin bonificaciones artificiales. La primera línea base usa una semilla común por clase/franja para los tres estratos; no certifica balance.

Verificación: 9/9 pruebas específicas; 1.025 pruebas de la regresión completa pasaron en el entorno restringido y la única prueba restante, de conexión WebSocket local, pasó 2/2 al repetirla con permiso para abrir el puerto; `typecheck`, renderer Vite en salida aislada, proceso Electron y `docs:check` (43 Markdown) correctos. La compilación estándar no pudo vaciar `dist` porque la aplicación abierta mantenía bloqueado `coconut_ring-B61aUr89.png`; el mismo renderer compiló completo (2.804 módulos) en `work/build-v3-check`, sin tocar la sesión abierta. Persiste el aviso previo de chunks grandes.

## 2026-11-08 — Estados visuales de separar y soltar la barra

Codex. Se completan los dos controles que faltaban con cuatro PNG originales: `split_bar` y `unlock_bar`, cada uno en estado normal y `pressed`. Conservan lienzo transparente de 256×256 y caja segura. Separar enciende el turquesa; fijar muestra un candado totalmente cerrado y soltar lo sustituye por el candado abierto e iluminado. `HudLayout` cambia la imagen a partir del estado real, publica `aria-pressed` y conserva en CSS el botón, marco, foco y distribución.

Verificación: 1.019/1.019 pruebas, tipos, build de producción y documentación correctos. El test de assets exige y encuentra las cuatro variantes.

## 2026-11-08 — Barra de objetos cuadrada, plegado sin hueco y diálogo encima de la barra

Claude. Las dos primeras casillas de la barra de objetos (pociones rápidas) heredaban el círculo de las pociones antiguas; ahora son cuadradas, con la tecla y la cantidad donde las demás. Con la barra movida, plegar la barra de objetos dejaba el borde de arriba fijo y la barra subía con hueco debajo: `HudLayout.keepBottom` conserva el borde inferior de un elemento colocado en la mitad baja cuando sólo cambia su alto (no al cambiar el tamaño con la esquina). El diálogo con un PNJ tenía un hueco fijo de 122 px y la barra escalada o desplegada lo tapaba: `DialogueWindow.place` lo pone 8 px encima de la barra o de sus secciones y, si no cabe, limita su alto con desplazamiento. Probado en el navegador: las 10 casillas con 4 px de radio; cuatro plegados seguidos con el borde inferior en 1175,5 px; el diálogo del guardaparque de Iguanera acaba encima de la barra también con la barra subida a mitad de pantalla.

## 2026-11-08 — Sombreros, capuchas, yelmos y capas en el personaje

Claude. Lo equipado en `head` y `back` se ve: `withGear` recibe la cabeza y la espalda (`headItem`, `headKind`, `backItem`) y `gltfCharacter` clona su `obj_<itemId>` de `equipo.glb` en el hueso `head` o `chest`. El sitio vive en `wear` de cada plantilla de `data/assets.json` (PROPUESTA: origen en espacio glTF y escala, con un sitio propio para `hat`) y se calcula con los huesos en reposo, así que luego sigue la animación. Capucha y yelmo quitan el pelo; el sombrero lo deja asomar. Si el objeto no tiene modelo, se queda la pieza del diseño.

Probado en el navegador con «Tanque 15»: el yelmo de hierro cubre la cabeza con la cara a la vista; el sombrero de machetero queda entre 1,54 y 1,81 m y la capa de palma cuelga de 1,51 a 0,61 m. Montado, la capa toca la silla. `vite.config.ts` deja de vigilar y rastrear `reference_assets/`, `work/` y `release/`: con ellos el servidor no respondía. Pendiente: revisión en Electron.

## 2026-11-08 — Ejecución de producción verificada y ticket D01 de distribución

No existía comando para correr el build de producción: sólo `dev` y `package`. Añadido `npm start` (`build` + `electron .`). Verificado en esta máquina: el paquete carga por `file://` (base relativa de Vite) y el recorrido real funciona —portada, «Nueva partida», pantalla de creación con las tres clases, 120 FPS con sim 0,00 ms y render 5,9 ms, cero errores de consola; la diferencia con el arranque de desarrollo es sólo el `__game` de depuración, que sigue reservado a dev como debe ser. `qa:electron` no cambia: prueba el servidor de desarrollo y la carga empaquetada quedó acreditada por este camino. Creado D01 en TAREAS con lo que falta para distribuir: firma Windows, canal de actualizaciones y alojamiento. Sin cambios de código de juego.

## 2026-11-08 — Héroes nuevos en el juego, iconos de hechizo más grandes y barra separable arreglada

Claude. `data/assets.json` da de alta `centinela_f`, `oraculo`, `oraculo_f`, `cazador` y `cazador_f` en `classModels` por clase y sexo (el cazador ataca con `Disparar`). Los seis GLB traen todos los clips de su plantilla. El arma equipada de tipo arco va a la mano izquierda (`heldJoint` en `heldGear.ts`), como en el modelo del cazador. Una partida nueva de Cazadora carga `cazador_f.glb` y `equipo.glb` sin errores.

Iconos de hechizo: el PNG deja ~15 % de aire por lado y la casilla lo encogía otra vez al 78 %, así que el dibujo ocupaba la mitad. Ahora `img.art-icon-spells` llena su hueco y se amplía ×1,22.

Barra de abajo: al unir, las secciones se añadían al final de su contenedor y el orden se invertía (el personaje quedaba en medio). Ahora cada sección deja un marcador y vuelve justo ahí, sin asa ni zoom sobrantes. Con la barra suelta se ve y funciona la esquina de tamaño, tanto unida como en secciones. El nombre de cada elemento va en una pestaña encima del recuadro; antes tapaba el contenido o lo cortaba el recorte de la experiencia, que ahora conserva un ancho propio al separarse. Probado en el navegador: separar y unir mantiene el orden y la esquina cambia la escala. Pendiente: revisión en Electron.

## 2026-11-08 — P02 y P03: personaje base rehecho y equipo completo con texturas

Codex. `personaje.glb` rehecho con `fg_heroe.py`: mismo esqueleto, las 15 piezas de siempre (`Cuerpo`, pelos, barba, capucha, yelmo, banda, túnica, mandil, armadura, capa, escudo y tres armas) y los 16 clips. La cara pasa a una calcomanía pintada con alfa (`personaje_rasgos.png`, material `rasgos`), así que desaparecen los materiales `ojos`, `blanco_ojos`, `brillo_ojos` y `boca`; nada en `src/` los usaba. Las prendas llevan las nuevas texturas `neutra_*` casi blancas, multiplicadas por el color de los canales `skin`, `cloth`, `trim`, `hair` y `gear`, para que la paleta siga tiñendo. Botas con `cuero_oscuro` fijo.

`equipo.glb` llega a 57 nodos y usa texturas pintadas (madera, cuero, hierro, palma tejida, plumas, mola). Los arcos se rehicieron con el agarre en el origen, las palas en Z y la cuerda hacia −Y. Nuevos `palm_cap`, `cotton_bandana`, `leather_cap` y `palm_cape`. Recetas nuevas en `fg_pintura.py`: `palma_tejida`, `madera_oscura` y `neutra_*`.

Medido: `validar_equipo` con 57 nodos, `tests/modelos.test.ts` 9/9, 22.402 triángulos en `personaje.glb` (1,3 MB). Pendiente: alta de los objetos nuevos en `data/assets.json` (Claude) y revisión en Electron.

## 2026-11-08 — Iconos estructurales y HUD inferior compacto

Codex. Los 41 hechizos actuales se redibujaron como ilustraciones anime originales RGBA de 256×256, sin anillos, placas ni fondos horneados. `normalizar_iconos.py` recorta el alfa, limita el dibujo a una caja segura de 176 px y lo centra; `validar_spell_icons.py` comprueba catálogo exacto, transparencia, centrado y unicidad, y la lámina de revisión confirma la familia a tamaño reducido. El generador vectorial anterior queda bloqueado por defecto para evitar que vuelva a introducir marcos. El icono de oficios se reconstruyó con martillo y formón rectos generados por separado y compuestos en X.

La barra inferior mantiene sus paneles en CSS: diez objetos asignados a 1–0, cantidades siempre arriba a la derecha, plegado con expansor mínimo y XP de altura estable. Al separar, objetos y XP pasan a secciones móviles independientes. Se redujeron rellenos y el arte se escala dentro de marcos compartidos; no se añadió ninguna imagen de panel. Guía de integración y procedencia actualizadas.

Verificación: validador de 41 iconos, 12/12 pruebas focalizadas, tipos, build y documentación correctos. La suite completa alcanzó 1.015 pruebas verdes; la prueba WebSocket pasó al repetirla con acceso a loopback. `assets.test` ya reconoce los diez hechizos nuevos y sólo queda rojo por dos texturas concurrentes ajenas a esta entrega (`palma_tejida.png` y su normal) todavía sin registro. El QA `barra` se intentó dos veces: primero CDP no respondió y luego la ventana terminó con «El juego no arranca», consola sin errores; por ello el comportamiento está cubierto por código/pruebas pero la revisión visual de Electron sigue pendiente.

## 2026-11-08 — P01 entregado: Centinela, Oráculo y Cazador, masculino y femenino, con texturas pintadas

Codex. Nuevo constructor de héroes `scripts/blender/fg_heroe.py`: cuerpo continuo (Skin + subdivisión) con cortes limpios donde acaba cada prenda, cabeza con cara pintada (ojos, cejas, boca, rubor y pintura opcional), pelo por mechones (corto, largo, trenza, coleta), pesos automáticos y horneado final por pieza (color + oclusión pintada) a una sola primitiva. Texturas de pintura generadas en Blender con nodos y horneadas por `scripts/blender/fg_pintura.py` (telas, cueros, maderas, metales, pieles, pelo, plumas y cenefas tipo mola, repetibles, de colores planos y sin fotografía) en `assets/textures/pintadas/`.

Modelos según las láminas del creador: `centinela.glb` rehecho y `centinela_f.glb` (camisa de lino, cargo oliva, botas con hebillas, faja coral con cenefa, manto turquesa con broche, lanza con cintas y escudo de rombos; ella con trenza, flor y aretes; él con pintura en la mejilla), `oraculo.glb`/`oraculo_f.glb` (túnica blanca abierta, poncho turquesa con flecos, faja violeta, bombacho, sandalias, bastón con esfera de bruma: pieza `Arma_baston`) y `cazador.glb`/`cazador_f.glb` (chaleco de cuero, capa corta deshilachada, espinillas vendadas, carcaj, cinta en la frente y arco de mangle: pieza `Arma_arco`). Mismo esqueleto y clips que antes; el cazador añade `Disparar` (tensa hasta el fotograma 15 y suelta en el 16 de 26; la mano gira el arco a vertical). Texturas embebidas en JPEG: 1,5–1,7 MB por modelo (antes 4,4 MB el Centinela). Capturas en `docs/capturas/{centinela,oraculo,cazador}/`.

Medido: `tests/modelos.test.ts` en verde (Centinela con sus cuatro piezas). Pendiente: alta en `classModels` (Claude), revisión en Electron, P02 `personaje.glb` y P03 equipo.

## 2026-11-08 — Reporte de interfaz y mochila (U01–U18)

Hecho en master, en ocho commits: Esc cierra la ventana de arriba y el menú (sin «Pausa») se abre con F10 o desde el menú fijo de arriba a la derecha (opciones, guardar, editar interfaz, salir). Los clics sobre una ventana ya no mueven la cámara ni al personaje. Mochila con categorías Equipo/Armas/Consumibles/Materiales: el filtro oculta lo que no cuadra, los idénticos van juntos con su cantidad, el orden es por llegada y automático, y destruir pide confirmación. Equipo simétrico, con guantes y botas como par. Barra de objetos plegable sobre los hechizos. Iconos de acceso más grandes. Las asas de tamaño siguen al ratón, no se salen de la pantalla y están siempre abajo a la derecha. El chat tiene canal «Combate» y colores por tipo (daño del color de su elemento); el registro de combate aparte desaparece. Emotes dentro de la pantalla. Información de desarrollo en tres modos: resumen, completa (GPU, gráficos, zona, carga y últimos errores) y oculta.

Medido: tsc limpio y 1016 pruebas en verde. Pendiente: revisión visual en Electron por el creador (estado «Hecho, falta sentirla»).

## 2026-11-08 — Arquero, cruz, objetos de nivel bajo, sexo y minimapa

Pedido a Codex y a la IA local (P01–P05 en REPARTO_CODEX): personajes de las fichas por clase y sexo (Centinela, Oráculo de Bruma y Cazador del Manglar), rehacer el humanoide, equipo visible e iconos nuevos, con reglas para la IA local tras descartar su entrega de Crestalba (rutas fijas, errores ocultos y la cola movida a la cabeza). Hecho por Claude: área en cruz; clase Cazador del Manglar con diez hechizos (cruz, línea, explosión, control, desplazamientos y defensa); 17 objetos de nivel 1–20 con su botín y tienda; elección de sexo al crear partida; tres partidas de prueba del cazador; minimapa con viñeta, cono de visión, marco del tema, brújula y escala. 1012 pruebas verdes. El recorrido en Electron quedó a medias: unas veces no arranca y otras se queda colgado.

## 2026-11-08 — Cerrado C05: la mascota se retira al depositar su amuleto

El último pendiente de C05 quedaba en el recorrido en Electron. La lógica ya existía (`checkPetCharm` se llama en `session.bankDeposit`), pero no estaba acreditada de punta a punta. Nueva regresión en `tests/rpg/bankIntegration.test.ts`: invocar el Amuleto del zorro de ceniza con mascota en el mundo, depositarlo (la mascota y el amuleto activo desaparecen, el retiro no deja residuo) y retirarlo para reinvocar. El escenario `bancoDetalle` reproduce el gesto por la interfaz real y comprueba además que el modelo de la mascota se va de la escena: 16/16 comprobaciones, consola limpia, captura `c05-mascota-retirada`.

En el mismo recorrido apareció un fallo preexistente del arnés, no del juego: la comprobación «Ctrl+clic añade» enviaba Ctrl fijo, que en macOS el sistema remapea a clic derecho, así que el clic de selección nunca llegaba. El código del banco ya acepta ambos (`e.ctrlKey || e.metaKey`, con unidad en `tests/ui/bankSelection.test.ts`); el arnés ahora usa Cmd en macOS y Ctrl en Windows. Suite completa 1005/1005 y `npm run typecheck` correctos. No cambia reglas ni cifras de juego.

## 2026-11-08 — Corrección: la profundidad con viento ya no detiene el render

La primera integración de `windDepthMaterials` dejó el `ShaderMaterial` con un efecto global, pero `DepthRenderer` de Babylon intenta obtener el efecto desde el `DrawWrapper` de cada submalla. El wrapper quedaba vacío y el primer mapa de profundidad lanzaba `TypeError` en `effect.setFloat2("depthValues", ...)`: el bucle no completaba ningún fotograma y en pantalla sólo quedaba el color azul de fondo, aunque el DOM del HUD ya estuviera montado. Guardar el efecto normalmente por submalla evitaba esa excepción, pero sobrescribía con un string los `materialDefines` del material de color. `WindDepthMaterial` conserva el efecto global y lo enlaza explícitamente sólo al wrapper del pase de profundidad, sin contaminar el material principal.

Regresión nueva en `tests/windDepthMaterials.test.ts`: renderiza una malla con viento y comprueba que después el material de color continúa listo y sus definiciones no son un string. Verificación en Electron, escenario `pintura`: 4/4, 39 fotogramas observados en 600 ms, un bucle activo, 13 materiales de profundidad listos, árboles dentro del encuadre y cero errores de consola; la captura muestra mundo, personaje, minimapa y hechizos. Suite completa 1004/1004 (la prueba WebSocket requirió acceso local), `npm run build` y `npm run docs:check` correctos. No cambia reglas ni cifras de juego.


## 2026-11-08 — El viento mueve también el contorno: profundidad con balanceo en «pintura»

El contorno de `paintStyle` lee el mapa de profundidad, que el motor dibujaba con su shader por defecto: las plantas se balancean en color (`WindPlugin`) pero su silueta se quedaba quieta y el borde bailaba. Nuevo `src/render/windDepthMaterials.ts`: `bindWindDepthMaterials(depth, scene)` engancha a las mallas con viento un `ShaderMaterial` de profundidad que reutiliza la misma fórmula — `WIND_SWAY_GLSL` se extrajo a `windPlugin.ts` como fuente única y se inyecta en el shader base de Babylon, fallando rápido si el motor lo cambia —, cacheado por amplitud; `PaintStyle` lo posee y lo dispone. La fórmula GLSL no se duplica. La validación inicial de almacenamiento del efecto resultó incompleta y causó la pantalla azul corregida en la entrada superior. 6 pruebas nuevas en `tests/windDepthMaterials.test.ts`; suite completa 1003 verdes y `tsc` limpio. No cambia ninguna cifra de juego.


## 2026-11-08 — Diseño S5: la retención global de `NavGrid`/`HeightField` no es una fuga; se mide y se deja

Quedaba abierta la partición de las rejillas del mundo en mosaicos con ventana LRU. Antes de reescribir se midió, con la prueba de borrado del skill de diseño. `buildOverworld` corre una sola vez (`main.ts:81`, `const`); `new World` y el cambio de zona reutilizan `z.shared.grid` (`navGrid.ts`, `?? fromObstacles`), nunca llaman a `buildZoneGrid` de nuevo. Las dos matrices planas —7,3 MB `Uint8Array` de paso y 7,3 MB `Float32Array` de altura, 14,6 MB para Panamá completa— se dimensionan al rectángulo declarado, no al número de páginas: no crecen al explorar y no hay fuga que un LRU recupere. Al soltar una página ya se liberan su malla, sus instancias y su `Float32Array` de alturas (~66 KB por página); lo que se retiene a propósito son los bytes de paso (conjunto `known`) y las muestras de altura globales, para que el terreno suelto siga pisable y conserve su cota en el A* y la cámara de la frontera. Un mosaico LRU enlenteció la sonda 1,5× en `walkable` —la ruta más caliente, usada por colisión, A*, línea de visión y `nearestWalkable`— y rompería esa invariante de reentrada: alturas liberadas allanarían el terreno fuera de pantalla y el paso volvería a `UNKNOWN`. Decisión: no se particiona; si la RAM aprieta, se recorta la resolución de celda/página. La prueba de streaming ya afirmaba «conserva su altura» al soltar pero solo comprobaba lo pisable; ahora fija también que `heights.sample` no cambia tras la liberación de la página. Verificación: `tsc` limpio y 997/997 pruebas. Se actualiza T11 a «Hecho (diseño resuelto)». No cambia ninguna cifra de juego ni el contrato de `World`.

## 2026-11-08 — Limpieza de diseño 6/6: el vuelo y la recogida de recursos salen del dios `World`

Dos clústeres de comandos seguían incrustados en `src/sim/world.ts`: la máquina de vuelo (estado `flightInput`/`flightTarget`, `toggleFlight`, `land`, `tickFlight`, `setFlightInput`, ~75 líneas) y la de recogida (`gatherTarget`, `gathering`, `commandGather`, `stopGathering`, `tickGathering`, `nearStation`, ~70 líneas — el campo `GatherField` ya era un módulo, pero su lógica de órdenes no). Bajan a `src/sim/flight.ts` (`FlightManager`, puerto `FlightHost` de seis miembros: jugador, rejilla, `canFly`, `stopFishing`, `stopTalk`, `landed`) y a `src/sim/gathering.ts` (`GatherManager` junto a `GatherField`, puerto `GatherHost` de diez), mismo patrón que `makeFishingHost`/`makeTrapHost`: `World` conserva la decisión de si se puede volar (equipamiento, interior, espectral) y quién escucha el aterrizaje, y sólo delega los puntos de entrada. `FLIGHT` y `GATHER_PATH_CLEARANCE` se mueven con sus dueños (tests repunteados, sin reexporte). El contrato externo no cambia: `commandGather`, `gathering` (ahora getter), `nearStation`, `toggleFlight`, `canFly`, `setFlightInput` y `player.flight` quedan igual para `main.ts`, HUD, `gatherView` y `session`. `World`: 2425 → 2347 líneas. Verificación: `tsc` limpio y 997/997 pruebas (los nueve tests de vuelo y los de oficios ejercitan la misma interfaz por el otro lado del seam); revisión visual Electron pendiente para el creador (despegue/aterrizaje con la Crestalba y tala en Iguanera).

## 2026-11-08 — El reloj del juego se muda de la atmósfera a la simulación

El día/noche vivía en `Atmosphere` (render): un `elapsed` en segundos reales que `update()` avanzaba cada fotograma, con `fixedTime` y `timeScale` de depuración; `syncWeather()` lo espejaba a `world.timeOfDay` y `newWorld` lo resembraba desde ahí. Con la simulación pausada (menú abierto), el sol seguía moviéndose pero el poblar nocturno y la pesca no: dos relojes mitad congeados. Ahora `World` (sim) es el único dueño: `tick(dt)` avanza `timeOfDay = frac(timeOfDay + dt·timeScale/dayLengthSeconds)` con `data.lighting` (nuevo campo requerido de `GameData`, parseado en `loadGameData` y en `scripts/balance`), y `Atmosphere` pasa a consumidor puro — `update(frameSeconds, focus, t)` recibe la hora y sólo muestrea luz; se retiran `elapsed`, `timeScale`, `fixedTime`, `setTimeOfDay` y el getter. Consecuencias deliberadas: el reloj se detiene en pausa, la hora es determinista en tests y benches, el F2/F3 de depuración y el `fixedTime` del bench/QA actúan sobre `world` (pausar/F2×40/F3+3 h/atardecer de QA), y el guardado/carga escribe y lee `world.timeOfDay` directo. Las pruebas de pesca simulan dos minutos: fijan `world.timeScale = 0` para que la franja no cambie a mitad. Regresión nueva: «el reloj lo lleva la simulación» en `tests/mundoClima.test.ts`. Verificación: `tsc` limpio y 996/996 pruebas; revisión visual Electron pendiente para el creador (atardecer y pausa con menú).

## 2026-11-08 — El audio deja de espiar el DOM: suscripción a eventos de sonido de la interfaz

`AudioDirector.watchUi()` leía la interfaz por fuera: un `addEventListener('click')` global con `closest('button')` y un `MutationObserver` sobre `body` que traducía el atributo `hidden` de los elementos `.panel` en sonidos `ui_open`/`ui_close`, y además deducía si la tienda estaba abierta buscando la clase `panel-shop`. El audio conocía así etiquetas, clases y atributos del DOM ajeno (un seam roto: cualquier cambio de maquetación lo silencia en silencio). Se sustituye por una suscripción: el nuevo `src/ui/menus/uiSound.ts` (emisor puro, sin DOM) define `UiSoundEvent = { type:'click' } | { type:'panel', open, shop }`; `h()` emite `click` al crear un `button` y la base `Panel.open/close` emite `panel` (con `shop` desde `cls === 'panel-shop'`, sin leer `classList`). `MenusController.onUiSound` lo expone y `director` se suscribe en el constructor vía `MenusLike`, con la deduplicación de re-escrituras redundantes que hacía el observador convertida en comprobación explícita de `hidden`. Equivalencia comprobada: backdrops de modal, diálogo, rastreador, emotes y la pantalla de creación nunca llevaron `.panel` en el elemento que cambia `hidden`, así que no producían sonido antes ni ahora; `shopOpen` para el sonido de oro sigue del panel de tienda. Único cambio real: los botones hechos con `document.createElement('button')` (solo herramientas de desarrollo: inspector, medidor de daño, editor F12) pierden el clic sonoro — no hay botones de juego fuera de `h()`. Verificación: `tsc` correcto, `npm run build` correcto, 995/995 pruebas con dos nuevas de semántica del emisor (entrega multipunto y cancelación durante la entrega). Falta el oírlo en Electron (`environment:node`, sin jsdom, y el motor arranca sólo tras un gesto).

## 2026-11-08 — Limpieza de diseño 5/5: las trampas tácticas bajan a `TrapManager`

El bloque de trampas en `src/sim/world.ts` (espacio válido, colocación con `maxActive`, expiración y armadura, revelado y disparo sobre quien pisa) se extrae a `src/sim/traps.ts` (`TrapManager`) detrás de un puerto `TrapHost` de siete miembros (reloj, reglas, `walkable`, `nextId`, `pushEvent`, `effectContext`, `findVictim`) con adaptador `makeTrapHost()` en el propio `World`, mismo patrón que `makeFishingHost` y `makePetWorld`: sin cambiar visibilidades y sin tocar DOM ni Babylon. El conocimiento de qué entidades pueden pisar (enemigos vivos, jugador no espectral, mascotas) se queda en el adaptador porque es del modelo de actores de `World`, no de las trampas; el contexto de efectos también lo sigue proveyendo `World` (origen = la trampa, para que un empujón aparte de ella). El contrato externo no se mueve: `traps` pasa a getter que devuelve la lista del manager, `trapSpot`, `placeTrap` y `visibleTraps` delegan, y `placeEnemyTrap` (que necesita `enemyActor` y la caché de efectos del ataque) sigue en `World` y llama al manager. Verificación: 993/993 pruebas sin tocar las veintiuna de `combateTactico.test.ts` ni las de revelado por efecto, `tsc` en las tres configuraciones, pureza de `src/sim` intacta (35 pruebas); `world.ts` -69 líneas netas y `traps.ts` son 152. Serie de limpieza de diseño 1/5-5/5 completa.

## 2026-11-08 — Limpieza de diseño 4/5: la pesca sale del dios `World`

Las ~170 líneas de pesca en `src/sim/world.ts` (estado `fishing`/`fishPending`, nueve métodos y `tickFishing`) eran una máquina de estados con reloj interno que no necesitaba conocer el combate: bajan a `src/sim/fishing.ts` (`FishingManager`) detrás de un puerto `FishingHost` de catorce miembros (reloj, noche, jugador, personaje, rejilla, contenido, bancos, `walkTo`, `pushEvent`, `dropLoot`, `stopGathering`, `stopTalk`) con adaptador `makeFishingHost()` en el propio `World`, mismo patrón que `makePetWorld` con `Pet`: sin cambiar visibilidades y sin tocar DOM ni Babylon. El contrato externo no se mueve — `commandFish`, `fishingSpotAt` y `fishing` siguen en `World` (el `set` sólo existe porque una prueba monta el estado a mano; la única copia vive en el manager) y `commandMove`/`commandGather` mantienen la cancelación mutada—. Verificación: 992/992 pruebas sin tocar las dieciséis de pesca más la de la cadena de misiones, `tsc` en las tres configuraciones, pureza de `src/sim` intacta; `world.ts` −126 líneas netas. Queda 5/5: el bloque de trampas tácticas (colocación, disparo, revelado), el mayor grupo cohesivo restante.

## 2026-11-07 — Limpieza de diseño 3/5: pureza de `src/sim` en regla, no en costumbre

El único valor de `world/` que importaba la simulación era `pathEdgeDistance` (y el tipo `PathDef`): `data/schema.ts` y hasta cuatro pruebas dependían del orden correcto del `import` sin que nada lo garantizara. La geometría de caminos baja a `src/sim/paths.ts` (dirección permitida: `world/` ya importa `Rng` y `NavGrid` de `sim/`), sin shim de reexporte — los nueve consumidores se migraron de golpe. `tests/simPurity.test.ts` convierte la regla dura de AGENTS.md (33 archivos): `src/sim/` no puede importar de `../world`, `../ui`, `../render` ni Babylon; si algo cruza el seam, la portabilidad del núcleo se rompe en CI, no en el cambio de stack. Verificación: 991/991 pruebas (33 nuevas), tipos correctos; los tests de terreno/envíos siguen ejerciendo la misma función desde su sitio nuevo. No se cambió ninguna cifra ni regla de juego.

## 2026-11-07 — Limpieza de diseño 2/5: partir el HUD mixto

`src/ui/hud.ts` era un módulo plano que mezclaba dos responsabilidades: el registro de combate (vive en el juego normal Y en la medición) y la capa de medición `?bench` (barras, siete huecos, aviso de bloqueo, cartel de fin). Con la interfaz montada, `main.ts` seguía alimentando `hud.update` cada frame y el CSS ocultaba con `display:none` lo que nunca debió montarse. Se divide en dos módulos profundos: `src/ui/combatLog.ts` (`CombatLog.handle(world, events)` + `clear()`; siempre montado) y `src/ui/benchHud.ts` (`BenchHud`; sólo con `benchMode`, su `showOutcome` recibe un resolutor de etiquetas de `main.ts` en lugar de depender del último `update`, eliminando el orden implícito constructor→frame). `hud.ts` eliminado y las reglas CSS `body.menus-on` para `.hud-bottom`, `.hud-msg` y `.hud-outcome` retiradas por inalcanzables. Verificación: 958/958 pruebas, tipos correctos y prueba de humo en Chromium (servidor de desarrollo Vite): portada con registro sin barras; `?bench` con barras, siete huecos y cartel «Has caído» alimentado por eventos reales. No se ejecutó revisión visual en Electron.

## 2026-11-07 — Limpieza de diseño 1/5: Seam muerto del streaming

Auditoría de módulos profundos vs. costurones (revisión completa en el chat de esta ronda). Primer paso: `src/world/streaming.ts` (`SectorStream`, `sectorsAround`, `groupBySector`) no tenía ningún consumidor en `src/` — sólo dos archivos de prueba; `WorldStream.update` ya hace su trabajo con histéresis `drop > load`. Retirado junto con `tests/streamingValidation.test.ts` y el bloque de sectores de `tests/travelDeath.test.ts`. El presupuesto de barrido que esas pruebas defendían se traslada al módulo vivo: `WorldStream` valida sus radios al construir (`0 < load < drop`, `inFlight` entero ≥ 1) y rechaza combinaciones donde el tope de escala `MAX_SCALE` (2, antes sin topar: `arenaView` se lo sube en vuelo) daría más de `MAX_SCAN_PAGES` (1024) celdas exploradas por cuadro; `scale` se aprieta al rango en vez de aceptarse ciegamente. Nuevas regresiones en `tests/stream.test.ts`. `npm test` stream/travelDeath/detail 23/23; typecheck correcto. M00 diagnosticado con precisión: lo que crece con el mundo son `NavGrid`/`HeightField` de extensión completa retenidos para siempre (`stream.ts` deliberado, `overworld.ts:44-47`); la corrección (mosaico con ventana) se documenta en T11 para cuando Panamá entera sea la tarea.

## 2026-11-07 — Auditoría de continuidad, controles y pintura

Contraste de la conversación de Claude con `2859a47` y su trabajo interrumpido: Pintura tenía módulo/render parcialmente escritos, pero faltaban tipo de opción, persistencia y selector. Se completan Gráficos → Estilo visual → Pintura/Natural, traducciones y pruebas de opciones; se evita aclarar artificialmente el negro nocturno. No se promete ahorro de GPU: añade un pase de profundidad y otro de pantalla.

Regresiones reales de Tab/clic: conversación pendiente al despegar, destino aéreo fuera del mapa que nunca termina y seguimiento izquierdo cancelado al mover el ratón. Se corrigen preservando el derecho configurable en Atajos. Los PNG de ocho emotes propios se conectan al chat con respaldo; los clips corporales siguen pendientes. Se corrigen en ESTADO/TAREAS y ACCIONES_CREADOR las afirmaciones caducadas de iconos, piedras, armadura, máximo de nivel y autorización de Pintura.

Continuidad Mac: guía `CONTINUIDAD_MAC.md`, dos síntesis propias de documentación vecina con fuentes/hashes y diagnóstico `scripts/mac/check.sh`; comando `package:mac` para generar una .app local. No se trasladan assets de terceros ni configuraciones personales. Blender MCP usa `uvx mcp-for-blender` y addon local en 9876; la consulta real devolvió «Could not connect». Mac y su empaquetado no se han ejecutado aquí.

Verificación: 971/971 pruebas (113 archivos), tipos y build correctos; documentación con 41 Markdown y enlaces locales válidos. La prueba WebSocket necesitó ejecución con acceso a loopback. El QA visual `pintura` no logró arrancar la partida: hubo timeouts CDP y luego «El juego no arranca», sin errores de consola. Se añaden límites de espera para evitar bloqueos indefinidos y se evita renavegar la primera carga. Pintura, coste GPU y recorrido humano de clic quedan sin certificación visual; no se atribuye el fallo al juego personal abierto sin evidencia. No se incluyen los borradores narrativos ni el borrado ajeno de icons/dofus3/README.md.

## 2026-11-07 — Tema original para guardián

`guardian` completa el contraste musical de la cripta con una pieza de combate propia: 12 compases a 84 BPM, 34,286 s, escala asimétrica, bajo pulsante, motivo angular y percusión más activa. La mezcla y sus tres stems alcanzan pico 0,88, RMS 0,135 y empalme exacto; cuatro hashes se repitieron tras regenerar. No reutiliza ni acelera `cripta`, no contiene samples ni melodías externas y no pretende identidad regional. El integrador debe iniciarlo sólo al activar un guardián/jefe y devolver la música ambiental conservando un fundido limpio.

## 2026-11-07 — Segundo pase visual del personaje modular

`personaje.glb` conserva sus 15 piezas, rig `FG_Personaje` y 16 clips, pero deja atrás la lectura de maniquí: rostro con blanco, iris, brillo, cejas, nariz, boca, mandíbula y orejas; cabello corto por mechones y largo con laterales; manos con dedos; botas con punta y caña; cuello, costuras, cinturón y broche; túnica, mandil, armadura, capa, capucha, yelmo y banda con capas reconocibles. Las combinaciones aventurero, mago y placa se revisaron por separado con la nueva selección opcional de piezas de `revisar_personaje.py`. El lote completo tiene 2 060 triángulos y regeneró el mismo hash. `validar_personaje.py` exige las 15 piezas, los 16 clips, apoyo, altura y máximo de 3 000 triángulos. El integrador conserva rutas y reglas de apariencia actuales.

## 2026-11-07 — Temas originales para portada y cripta

La música funcional suma dos perfiles no regionales, cada uno con mezcla y stems de armonía, melodía y percusión. `titulo`: 12 compases a 68 BPM, 42,353 s, modo hexatónico abierto, colchón amplio, motivo de descubrimiento y percusión contenida. `cripta`: 12 compases a 54 BPM, 53,333 s, escala asimétrica grave, pulso escaso y aire tenso. Ambos alcanzan pico 0,88, RMS 0,199/0,216, empalme exacto y regeneraron ocho hashes idénticos. No contienen samples, grabaciones, melodías tradicionales ni referencias externas. El otro agente decide reproducción en portada/interior y debe desactivar la música local de pruebas al evaluar la cripta.

## 2026-11-07 — Biblioteca distante para árboles y rocas

`assets/models/vegetacion_lod.glb` resuelve la mitad artística del pendiente de árboles lejanos: conserva los 19 nombres que ya usa `vegetacion.glb` para nueve familias arbóreas y la roca, manteniendo altura, proporción y siluetas principales, pero reduce el conjunto equivalente de 6 030 a 996 triángulos (−83,5 %). Incluye palma, guayacán, corotú, mangle, roble, ciprés, árbol Panamá, cuipo, indio desnudo y roca. No cambia la flora cercana ni su distribución. `validar_vegetacion_lod.py` exige correspondencia de nodos, apoyo, altura, presupuesto y reducción mínima; la regeneración produjo el mismo hash. El otro agente debe incorporarlo al anillo lejano y medir el cambio de FPS.

## 2026-11-07 — Segundo pase visual de las tres mascotas base

`zorro.glb`, `buho.glb` y `tortuga.glb` ganan identidad a tamaño de juego sin cambiar rutas, rigs ni clips. El zorro de ceniza incorpora gorguera, mejillas, orejas con interior, ojos en capas, patas y garras; el búho archivero refuerza discos faciales, pupilas, anteojos, libro sujeto al pecho, dedos y plumas escalonadas; la tortuga de musgo recibe placas de caparazón, acumulaciones de musgo, seta luminosa, cabeza expresiva, boca, patas y garras. Conservan una sola malla `Cuerpo` y los cinco clips actuales. Pesan 732, 820 y 968 triángulos. `validar_mascotas.py` comprueba contrato, altura, animaciones y límite de 1 500 triángulos; zorro, búho, tortuga y el fantasma no modificado regeneraron hashes idénticos.

## 2026-11-07 — Segundo pase visual de los cuatro enemigos base

`bestia.glb`, `arquero.glb`, `chaman.glb` y `diablillo.glb` dejan de compartir una lectura de maniquí genérico sin alterar el contrato que ya usa el juego. La bestia recibe morro redondo, orejas anchas, colmillos, melena, cresta dorsal, garras y mechón de cola; el arquero, capucha, hombreras, bandolera, carcaj visible, bolsa y vendas; el chamán, ojos luminosos, placas rituales que enmarcan la cara, chal escalonado, cinturón, bolsas y amuletos; el diablillo, cejas, hocico, vientre, faldellín, dedos con garra, varillas en las alas y punta de cola. Conservan el nodo `Cuerpo`, rigs y nombres de clips. Pesan 876, 892, 988 y 860 triángulos respectivamente. `validar_enemigos.py` comprueba contrato, apoyo, altura, animaciones y límite de 1 500 triángulos; una segunda generación produjo los mismos cuatro hashes.

## 2026-11-07 — Diostedé: montura voladora original con diez apariencias

Sustituye a la «Falcolomba», descartada por venir de una montura de DOFUS (ver entrada anterior): sus archivos se retiraron sin publicar. El Diostedé es un tucán rechoncho del Darién con pico en tres bandas, piel de color alrededor del ojo, babero, alas cortas plegadas al flanco, cola levantada, patas zigodáctilas y manta de silla en capas con borde en zigzag. Diseño PROPUESTA, hecho por script en Blender por MCP (`scripts/blender/diostede.py`): una malla de 12 492 triángulos, 11 piezas, rig y siete clips (`idle_ground`, `walk`, `run`, `takeoff`, `fly_idle`, `fly_forward` y `land`), con anclajes `mount_seat` y `rider_root`. Las diez variantes solo cambian siete regiones de material (`data/art/diostede_variantes.json`). `MountView` tiñe cualquier modelo con paleta `<modelo>_variantes.json`, elige paso o carrera por velocidad, reproduce despegue y aterrizaje una sola vez y sube al jinete a `rider_root`. El menú del objeto en el inventario gana «Cambiar apariencia», con las diez muestras; la elección se guarda en la copia (`ItemInstance.look`). En `npm run dev` llega a la mochila como `mount_dev_diostede`. Validado: `validar_diostede.py`, 961 tests y `tsc`. En el juego se comprobó el cambio de color, el jinete sentado sin caminar y la secuencia de clips. Falta: medir FPS en Electron (en el panel oculto no son fiables) y decidir si se vende o se gana. Guía para agentes: `docs/GUIA_BLENDER_MCP.md`.

## 2026-11-07 — Cinco superficies PBR originales adicionales

A03 amplía de tres a ocho la biblioteca PBR repetible con `madera_tropical`, `arena_costera`, `corteza_fantastica`, `hoja_tropical` y `tela_tejida`. Cada material incluye color, normal OpenGL y rugosidad a 512×512, generado por ruido periódico, vetas, ondulaciones, costillas, masas de follaje o trama calculada. Las quince salidas nuevas se regeneran de forma determinista y el validador confirma las ocho familias. Son materiales fantásticos genéricos: no identifican especies, artesanías ni lugares reales y no usan fotografías ni archivos externos.

## 2026-11-07 — Clic derecho, vuelo, autoguardado, montañas e inspector

Pedidos del creador: en vuelo el clic vuela en línea recta hasta el punto (WASD manda y lo cancela); se anda con clic derecho corto (Opciones → Moverse con; arrastrar sigue girando la cámara) y el izquierdo queda para atacar, hablar y usar. Volando por encima de 8 m los enemigos no te ven y quien te perseguía te suelta. Autoguardado cada 2 minutos en la ranura en curso y al cerrar la ventana. Las cordilleras lejanas tenían forma de cúpula lisa (el «semicírculo» del fondo): ahora llevan crestas y quebradas. En vuelo se cargan más páginas, el plano lejano se aleja y la bruma se aclara. El preset gráfico Medio pasa a resolución completa (con 0,85 se veía borroso). Inspector de escena para desarrollo (tecla º): Alt + clic dice qué es cada cosa y las capas se pueden ocultar.

No integrado: el modelo «Falcolomba» de otro agente (assets/models/falcolomba.glb y su cableado sin publicar) reproduce el nombre y el diseño de una criatura de DOFUS a partir de reference_assets/; va contra la regla clean-room. Se deja sin tocar para que el creador decida; el encargo original está en docs/REPARTO_CODEX.md.

## 2026-11-06 — Tema original propuesto para Panamá

T08 añade a Panamá una mezcla y tres stems originales de 12 compases a 76 BPM (37,895 s): escala hexatónica abierta, pulso firme, arpegio móvil y frase aérea breve para una ciudad fantástica. La mezcla alcanza pico 0,88, RMS 0,148 y cierre exacto; los cuatro WAV se regeneraron con hashes idénticos. No usa samples, grabaciones ni melodías tradicionales. Guna Yala y Ngäbe-Buglé continúan sin una música que pretenda representar sus culturas hasta contar con consulta adecuada.

## 2026-11-06 — Segunda versión tierna y voladora de la arpía

F21 sustituye la primera arpía gris por un pichón montable original de 1 696 triángulos: cabeza y ojos grandes, cuerpo redondo, penacho doble vertical, primarias y cola ascendentes, plumón cálido y manta turquesa/coral. Conserva `Reposo` y `Trotar`; añade `Volar` de 25 fotogramas y `Planear` de 48. El validador confirma los cuatro clips, apoyo a 1,7 cm, altura de 1,88 m y presupuesto. Las capturas de reposo y vuelo verificaron silueta y expresión. El otro agente selecciona clips aéreos y repite QA con jinete; no se copió la referencia de Dofus.

## 2026-11-06 — Atlas PBR y cuatro piezas para el Centinela

`fg_atlas.py` consolida por pieza los materiales de un personaje sin hornear iluminación: copia las texturas repetibles, remapea una UV de atlas y conserva color, rugosidad y metal. `centinela.glb` mantiene sus 9 388 triángulos, rig y clips, pero pasa de 33 primitivas a cuatro (`Cuerpo`, `Pelo`, `Lanza`, `Escudo`). La revisión frontal, tres cuartos, espalda y rostro confirmó el acabado; la prueba estructural impide que vuelva a fragmentarse. El archivo crece de 1,98 a 4,43 MB por los atlas embebidos. Falta repetir FPS y tirón de aparición en Electron; no se reutilizó ninguna referencia de Dofus.

## 2026-11-06 — Música original propuesta para Bocas y Las Perlas

T08 añade dos paisajes insulares ficticios con mezcla y tres stems por región. Bocas: 12 compases a 74 BPM, 38,919 s, pentatónica abierta, pulso móvil y RMS 0,160. Las Perlas: 12 compases a 80 BPM, 36 s, hexatónica brillante, arpegio ligero y RMS 0,155. Ambas alcanzan pico 0,88, cierran con diferencia 0 y regeneraron ocho hashes idénticos. No usan samples ni melodías tradicionales; el integrador sólo debe asociarlas cuando existan esas regiones.

## 2026-11-06 — Familia original de 20 iconos de estados

F32 entrega `assets/icons/statuses/<statusId>.png` para todos los estados actuales. El marco hexagonal verde identifica mejoras y el rojo perjuicios; el centro reutiliza el vocabulario visual del hechizo relacionado. La revisión reemplazó una primera versión ambigua de `body_lock` por candado y eslabones, y dio a `tackled` una colisión explícita. Los 20 PNG RGBA son únicos y se regeneraron con hashes idénticos. El otro agente conecta rutas, duración y acumulaciones, conservando el emoji como fallback.

## 2026-11-06 — Catálogo original de 135 iconos de objetos

F31 entrega `assets/icons/items/<itemId>.png` para los 135 objetos actuales. La familia sustituye emojis y símbolos genéricos con siluetas propias para armas, cada slot de armadura, joyería, pociones, comida, pesca, pergaminos, mascotas y materiales; conjuntos regionales comparten acentos sin perder la forma funcional. La revisión corrigió la inferencia de armas antiguas que aún conservan emoji. Generador y validador exigen correspondencia exacta con `items.json`, formato RGBA, transparencia y hashes únicos; una segunda generación produjo 135 hashes idénticos. El otro agente conecta las rutas y conserva el icono actual como fallback.

## 2026-11-06 — Familia original de 31 iconos de hechizos

F30 elimina la dependencia visual de emojis del sistema a nivel de arte: `assets/icons/spells/` contiene un PNG RGBA 256×256 por cada ID actual de `data/rpg/spells.json`. La familia usa borde dorado, cinco paletas elementales y motivos diferentes para ataque, defensa, desplazamiento, zona, control, trampa, curación e invocación. Generador, validador y lámina son reproducibles; una segunda generación produjo 31 hashes idénticos. El otro agente conecta `<spellId>.png` y conserva el emoji como fallback.

## 2026-11-06 — Música original propuesta para Colón y Darién

T08 añade dos atmósferas ficticias para provincias futuras, cada una con mezcla y tres stems. Colón: 12 compases a 72 BPM, 40 s, modo abierto, motivo ágil, pulso activo y RMS 0,153. Darién: 12 compases a 58 BPM, 49,655 s, pentatónica menor, colchón grave, espacio profundo y RMS 0,196. Ambas tienen pico 0,88, cierre exacto y regeneración de ocho hashes idénticos. No usan samples ni melodías tradicionales y no deben presentarse como música de comunidades reales.

## 2026-11-06 — Escenografía regional modular original

A02 suma `assets/models/escenografia_regional.glb`: doce nodos `escena_<id>` y 1 580 triángulos para almacén, caseta abierta, puesto de mercado, muelle recto y esquina, amarradero, tres botes ambientales, poste de direcciones, estandarte ficticio y baliza. El catálogo tiene IDs, escala, apoyo, presupuesto, validador y lámina. No reemplaza la casa, lancha o estandartes animados actuales; el otro agente decide instancias y conserva `lancha.glb` para viajes.

## 2026-11-06 — Catálogo modular de naturaleza original

A02 recibe `assets/models/naturaleza_modular.glb`: doce nodos `natural_<id>` y 4 136 triángulos para árbol de sombra, palma joven, arbustos verde/seco, helecho, flores, pasto, tronco caído y cuatro composiciones de roca. La lámina confirma siluetas diferenciadas y el validador exige apoyo, escala, IDs y presupuesto. Los nombres son deliberadamente genéricos: no afirman especies ni distribución panameña; el otro agente asigna instancias y A01 conserva la futura investigación de biomas.

## 2026-11-06 — Música original para Panamá Oeste y Chiriquí

T08 suma dos propuestas para provincias futuras, cada una con mezcla y stems de armonía, melodía y percusión. Panamá Oeste: 12 compases a 68 BPM, 42,353 s, pentatónica abierta, pulso costero ágil y RMS 0,160. Chiriquí: 12 compases a 64 BPM, 45 s, hexatónica menor, colchón profundo, frase aérea y RMS 0,194. Ambas alcanzan pico 0,88, cierran con diferencia 0 entre primera y última muestra y se regeneraron con ocho hashes idénticos. No usan samples ni melodías tradicionales. El otro agente decidirá asociación, transición y momento de reproducción cuando existan esas regiones.

## 2026-11-06 — Símbolos decorativos originales del Istmo

F24 recibe un primer lote publicable en `assets/models/simbolos_istmo.glb`: seis nodos estáticos y 7 540 triángulos para estatua fantástica de arpía, monedas ficticias, sombrero trenzado, vestido festivo, aretes de oro y machete ceremonial. Generador, validador y lámina de revisión acompañan el archivo; el contrato reserva las piezas pequeñas para banco, vitrinas e interiores y la estatua para plaza. El lote evita deliberadamente bandera, escudo nacional, monedas reales e insignias deportivas; vestido, sombrero y joyería siguen marcados como propuestas hasta revisión cultural. El otro agente sólo debe registrar y colocar instancias.

## 2026-11-06 — Primer lote de ambientes originales

Audio ambiental recibe tres bucles sintéticos en `assets/audio/ambience/`: costa diurna, sabana seca y bosque nuboso. Cada WAV es estéreo PCM 44,1 kHz/16 bit, dura 24 s, alcanza pico 0,72 y cierra con diferencia 0 entre primera y última muestra; RMS 0,102/0,103/0,108. Se verificó una segunda generación con SHA-256 idéntico. No contienen grabaciones ni samples: oleaje, viento, lluvia, insectos, gotas y llamadas se calculan con ruido periódico, tonos y envolventes. El otro agente conecta biomas, fundidos y volumen.

## 2026-11-06 — Superficies PBR procedurales propias

F23/A03 mejora tierra seca, piedra clara y césped tropical: cada superficie de 512×512 entrega color, normal OpenGL y rugosidad, nueve PNG en total. La tierra añade grietas periódicas, la piedra vetas y motas, y el césped haces inclinados; los bordes teselan y el generador conserva semilla fija. `validar_utileria.py` exige los nueve mapas. No se usaron fotografías ni samples externos. A03 sigue parcial: esto mejora la respuesta a la luz, pero no equivale todavía a elegir una biblioteca de materiales reales con licencia.

## 2026-11-06 — Retrato y cinco iconos de características

U02 recibe un retrato predeterminado original en `assets/portraits/adventurer_default.png` (1312×1199 RGBA) y cinco símbolos pintados en `assets/icons/stats/`, 256×256 RGBA: Fuerza, Agilidad, Intelecto, Vitalidad y Espíritu. La lámina reducida confirma lectura y familia común cacao/vino/turquesa/oro. Se generaron individualmente con OpenAI ImageGen, sin referencia visual de Dofus, y se conservaron transparencia, procedencia y contrato. El otro agente conecta las rutas; un futuro retrato dinámico del aspecto elegido sustituirá el respaldo.

## 2026-11-06 — Música original para Veraguas y Coclé

T08 suma dos perfiles regionales sin samples externos, cada uno con mezcla y stems de armonía, melodía y percusión. Veraguas: 12 compases a 62 BPM, 46,452 s, pentatónica menor abierta, colchón brumoso, aire amplio y percusión contenida. Coclé: 12 compases a 70 BPM, 41,143 s, escala hexatónica luminosa y pulso de madera más claro. Ambas mezclas alcanzan pico 0,88; RMS 0,190/0,165 y diferencia de primera/última muestra 0 tras cerrar la deriva del bucle. El otro agente registra perfiles y transiciones en el juego.

## 2026-11-06 — Caballo alazán original de Azuero

F23 completa su pieza animal con `assets/models/caballo_azuero.glb`: 1 348 triángulos, una malla, diez materiales, rig propio y clips `Reposo`, `Paso` y `Trotar`. El modelo incluye lucero, calcetines, menudillos, cascos, crin y cola articuladas, manta vino/turquesa, silla, cincha, estribos y brida. El validador recorre las animaciones y mide un apoyo mínimo de −2,3 cm, dentro del volumen del casco. Falta que el otro agente lo registre como montura/variante y ajuste la altura del jinete dentro del juego.

## 2026-11-06 — Comparación reproducible cel frente a naturalista

F22 recibe dos capturas de 1280×720 del mismo rincón y la misma cámara, generadas por `comparar_estilos.py`. La versión cel usa saturación, superficies mates, sol claro y contraste alto; la naturalista conserva la composición, apaga la paleta, suaviza bordes y combina luz cálida con relleno frío. El contraste revela que las siluetas actuales sostienen mejor el cel, mientras el naturalista requeriría A03 y más geometría. Es evidencia para elegir, no una decisión creativa tomada por el agente.

## 2026-11-06 — Primer lote de utilería modular propia

F23 recibe `assets/models/utileria.glb`: 18 nodos `prop_<id>` para carreta, dos tinajas, silla, dos mesas, escalera, farol, poste, fogata, chimenea, rancho de paja, barril, cajón, banco, cerca, amarradero y bebedero. Tras la primera lámina se añadió un segundo pase de bandas pintadas, tejido, cuerda y herrajes en vino/turquesa/oro para evitar que el catálogo quedara como relleno genérico. Son 4 520 triángulos en total. También se entregan tres superficies repetibles originales de 512×512: tierra seca, piedra clara y césped tropical. Generador, validador, lámina de contacto, procedencia y contrato de integración quedan incluidos. Faltan caballos y variantes posteriores.

## 2026-11-06 — Costa real, Centinela e inglés terminado

F10: costa de Natural Earth 1:50m (dominio público, descarga aprobada por el creador) fuera de Azuero, mapa de Panamá pintado con la misma regla y comarca Emberá con sus distritos. F17: lanza y escudo del Centinela como objetos que vende Brunilda (la lanza va a una mano para llevar escudo). F07: brújula, bonos de conjunto, XP, oficios y compendio en inglés; el QA `ingles` barre las ventanas y solo quedan nombres propios. 950 pruebas verdes; QA `armasEnMano`, `ingles`, `panama`, `costa` e `iguanera` sin fallos.

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
