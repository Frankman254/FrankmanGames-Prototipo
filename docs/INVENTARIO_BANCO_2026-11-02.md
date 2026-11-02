# Inventario y banco — cierre del bloque

## Requisitos del creador

- Capacidad configurable por peso de SOLO mochila. Equipo puesto y banco excluidos.
- Unidad original: briznas; capacidad inicial PROPUESTA de 150. Pesos explícitos de los 123 objetos en `data/rpg/items.json`; capacidad en `data/rpg/progression.json`.
- Compras y recogidas normales respetan el límite. Recompensas de misión y botín de combate admiten sobrepeso; caminar baja al 50 % hasta descargar.
- Posiciones visuales independientes de capacidad; rejilla fluida en panel redimensionable. Guardados antiguos conservan objetos más allá de las posiciones iniciales.
- Banco del Cruce: edificio procedural en (116,132), puerta al sur, empleado y cofre interiores. Depósito ilimitado personal del personaje, guardado junto a la partida.
- Banco muestra SOLO mochila y almacén. Enviar todo conserva equipo; filtros/categoría, Ctrl/Mayús para selección, doble clic para transferir pila. Retiradas respetan peso y dejan sobrante almacenado.
- Comercio tiene instancia separada de mochila, sin equipo visible. Menú contextual incluye acciones reales, información y conjunto. Recetas muestra ausencia: no hay sistema de fabricación implementado.

## Pendiente humano y límites

Revisar visualmente puerta, recorrido al empleado/cofre, tamaño de ventanas, doble clic y menús en Electron. No se certificó este recorrido con interacción visual completa durante este cierre.

Guardar dentro del banco conserva el cofre pero reaparece delante de su puerta al cargar. El banco es por personaje; no existe almacén compartido entre cuentas ni intercambio entre jugadores implementado. La interfaz de comercio actual cubre mercader/tienda local.

Los valores de peso son balance inicial, no decisiones creativas aprobadas. Confirmar si «briznas» resulta claro al jugar y ajustar pesos/capacidad tras una partida real.

La propuesta de extracción equipment/roll de OMP está preservada en `agents/REVISION_OMP_REFACTOR/`. No se integró porque fallaba contratos actuales y compilación. Sus skills y diagnóstico del creador quedan fuera del commit del coordinador.

Ver pruebas y resultados finales en `agents/COORDINADOR_005_INVENTARIO.md` y bitácora.
