# Tareas de desarrollo

Lista única. Actualizada 2026-11-03. «Hecho» exige evidencia; los detalles actuales están en [ESTADO_ACTUAL](ESTADO_ACTUAL.md). El creador conserva la prioridad de producto de [HOJA_DE_RUTA](HOJA_DE_RUTA.md); primero se reparan riesgos de integridad.

| ID | Prioridad | Estado | Tarea y aceptación verificable |
|---|---|---|---|
| C01 | P0 | Hecho | Integridad de UID al cargar mochila/equipo/banco. `reconcileSavedUids` recorre equipo → mochila → banco: la misma pieza repetida queda una vez; objetos distintos con el mismo UID se conservan y el segundo recibe uno nuevo; cada reparación queda en `Character.loadRepairs` y en la consola. También el botín pendiente. `tests/rpg/itemIntegrity.test.ts` |
| C02 | P0 | Hecho | Preservar propiedades de pilas. Sólo se apilan copias con iguales tiradas y bonificaciones (transferir, ordenar y mover); dividir una pila conserva la bonificación. `tests/rpg/itemIntegrity.test.ts` |
| C03 | P1 | Parcial | Configuración inicial y progreso por nivel. `configInicial` está en datos sin consumidor. Separar lo solicitado de los valores actuales; definir contrato/validación y probar subida real de nivel y guardado si se autoriza aplicarlo. No afirmar +5/+20/+30 ni cambiar balance por cuenta propia |
| C04 | P1 | Parcial | Casillas según ventana: calcular relleno visual por espacio disponible, sin límite de capacidad por huecos. Verificar tamaños estrecho/ancho, scroll y arrastrar/soltar con índices correctos; sin pérdida ni listeners acumulados |
| C05 | P1 | Pendiente QA | Validar en Electron banco→NPC/cofre→selección/categoría/doble clic→salida y comercio sin equipo. Acceso solo durante interacción válida; mascota retirada al depositar amuleto. Registrar observado, esperado y pendientes reales |
| T01 | P1 | Pendiente | Balance con equipo obtenible: comparar nivel igual/+10/+20, TTK, supervivencia y gasto por clase. Mantener cifras como PROPUESTA y no resolver armas de nivel alto subiendo máximo sin aprobación |
| T02 | P1 | Parcial | Integración y QA de cámara, viaje, muerte espectral y guardado. Lógica espectral probada; falta recorrido visual completo incluida cripta y mochila sobrecargada. Probar no duplicación del botín al resucitar |
| T03 | P1 | En mantenimiento | Documentación: usar este índice, estado y bitácora; comprobar enlaces con docs:check y actualizar estado al cambiar comportamiento. No reactivar handoffs ni crear otro tablero |
| T05 | P1 | Parcial | Arcos: disponibilidad por tienda/botín, nivel máximo 20, alcance y presentación. Probar equipar/guardar/cargar y auditar ruta temprana sin inventar contenido ni cifras |
| T11 | P2 | Parcial | Streaming: hoy hay selección/presupuesto de sectores; falta cargar/liberar recursos de regiones, demostrar fronteras e ida/vuelta y medir presupuesto |
| T04 | P2 | Pendiente de diseño | Vertical Panamá Viejo/Diablicos Espejos y máscara. Resolver facción, detección, acción sospechosa, ruptura, expiración y muerte antes de aprobar contenido; probar percepción sin DOM |
| T06 | P2 | Pendiente | Mascotas con efectos configurables al impacto: objetivo, inmunidad, cadencia, expiración y no duplicación; sin reglas por nombre del animal |
| T07 | P2 | Pendiente de diseño | Harpía por misiones: desbloqueo idempotente, rutas/destinos válidos y guardado; alcance de vuelo por definir |
| T08 | P2 | Parcial | Música/cinemáticas: selección por región, transiciones y secuencia omisible sin perder/duplicar recompensa. Registrar procedencia de assets y accesibilidad |
| T09 | P3 | Parcial | Geografía, interiores y secretos: banco como caso pequeño; plan modular, presupuesto y liberación antes de extender ciudad |
| T10 | P3 | Pendiente de diseño | Temporadas/exclusivos: reloj autoritativo y versionado; no derivar economía persistente de la PoC local |

## Pedido en el cuestionario y sin fila hasta ahora

Comparación de `PREGUNTAS_CREADOR.md` con el código (2026-11-03). Se ordena según la prioridad del creador: gráficos, mapa, zonas, mazmorra, interfaz, historia, oficios, clases.

| ID | Prioridad | Estado | Pedido del creador y aceptación verificable |
|---|---|---|---|
| R01 | P1 | Pendiente | Pesca (§11.5): «tiene bugs»; zonas circulares visibles en el agua que indican peces, y se pesca en ellas. Probar aparición, agotamiento y reaparición con reloj de la simulación, y lanzar dentro/fuera |
| R02 | P1 | Pendiente | Compendio (§4.5, §14.5; «lo necesitamos también para depurar», sin el nombre de otro juego): ventana con criaturas por zona y sus estadísticas y botín, objetos y zonas, desde los datos |
| R03 | P1 | Pendiente | Temas y letras (§4.3, §4.4): nombres «de juego serio», sin términos de desarrollo; letras futurista y píxel. Guardados con los valores antiguos siguen cargando |
| R04 | P1 | Pendiente | Cámara (§17.3): suavidad configurable, encuadres por tecla (por defecto, autofoco, inteligente, estática por casilla). Comprobar qué falta de `src/camera/` y conectarlo a opciones y teclas |
| R05 | P2 | Pendiente | Oficios (§11): leñador, pescador, campesino, minero, forjatodo, confeccionatodo; niveles propios; recursos en el mapa que se recogen y reaparecen; receta + materiales + taller + nivel; fabricar directo o con minijuego opcional |
| R06 | P2 | Pendiente | Monturas (§12.4, §10.1): más velocidad, equipables a la vez que la mascota, con características. Vuelo y crianza quedan por diseñar |
| R07 | P2 | Pendiente | Chat y emotes (§4.5, §4.10): chat fijo por canales, burbuja que sigue al personaje con tiempo de desaparición, emotes. En local hasta que exista red; ventana de grupo después |
| R08 | P2 | Pendiente | Idiomas (§5.6): español e inglés con textos separados del código, ampliable. Empezar por una tabla y la interfaz fija; el contenido de datos después |
| R09 | P3 | Pendiente de decisión | Armadura como estadística (§7.3: «me lo vas quitando»): 48 objetos la usan. Quitarla cambia el balance; necesita sustituto aprobado antes de tocar datos |
| R10 | P3 | Pendiente de diseño | Más clases (§8.1: unas 7), ambientación (§8), nombres propios de elementos y características (§7.7, §9.1), moneda (§13.1): dependen de decisiones creativas del creador; no se inventan como definitivas |

## Siguiente bloque recomendado

Una tarea por entrega; C01 y C02 ya están. Siguientes: C03, C04 y R01. Escribir primero un caso que reproduzca el defecto, corregir pequeño y ejecutar pruebas+typecheck. Si OMP termina una interacción, la tarea siguiente sigue siendo la primera pendiente de esta tabla; ningún STATUS antiguo constituye un monitor o una ejecución persistente.

No requieren nuevos tickets: contenido integrado de muerte espectral, reducción de Pulso y banco básico; conservar regresión y completar únicamente los límites pendientes indicados arriba.
