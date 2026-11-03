# Tareas de desarrollo

Lista única. Actualizada2026-11-02. «Hecho» exige evidencia; los detalles actuales están en [ESTADO_ACTUAL](ESTADO_ACTUAL.md). El creador conserva la prioridad de producto de [HOJA_DE_RUTA](HOJA_DE_RUTA.md); primero se reparan riesgos de integridad.

| ID | Prioridad | Estado | Tarea y aceptación verificable |
|---|---|---|---|
| C01 | P0 | Pendiente | Integridad de UID al cargar mochila/equipo/banco. `Character.fromSave` restaura banco sin contrastarlo con otras ubicaciones. Construir guardado corrupto con mismo UID en las tres; no duplicar ni borrar objetos válidos silenciosamente, documentar resolución y comprobar contador tras cargar. Las pruebas existentes de banco no cierran este caso |
| C02 | P0 | Pendiente | Preservar propiedades de pilas. `Inventory.addTransferred` fusiona por itemId y cantidad, sin comparar bonus/rolled; reproducir transferencia/ordenación de dos copias distintas y conservar propiedades, cantidades y UID apropiados |
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

## Siguiente bloque recomendado

Una tarea por entrega: empezar por C01, después C02. Escribir primero un caso que reproduzca el defecto, corregir pequeño y ejecutar pruebas+typecheck. Si OMP termina una interacción, la tarea siguiente sigue siendo la primera pendiente de esta tabla; ningún STATUS antiguo constituye un monitor o una ejecución persistente.

No requieren nuevos tickets: contenido integrado de muerte espectral, reducción de Pulso y banco básico; conservar regresión y completar únicamente los límites pendientes indicados arriba.
