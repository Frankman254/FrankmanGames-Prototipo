# Arquitectura online — propuesta

**Estado:** PROPUESTA técnica; no activa red en el juego. La PoC sólo escucha en `127.0.0.1`.

## Recomendación

Usar un servidor autoritativo Node/TypeScript que comparta la lógica pura de `src/sim/` y `src/rpg/` mediante un paquete de workspace. El cliente Electron presenta y predice; el servidor valida movimiento, combate, botín, inventario y economía. La alternativa de confiar en el cliente abarata el prototipo, pero hace imposible auditar duplicaciones o trampas. Reescribir el servidor en otro lenguaje sólo se justificaría con mediciones posteriores.

`World` ya usa paso fijo y `Rng`, pero hoy presupone un único jugador y mezcla algunos sucesos de presentación. Primero se extraerán contratos y sistemas multijugador; no se mantendrán dos implementaciones divergentes.

## Simulación y red

- Servidor a 60 Hz; snapshots delta a 20 Hz. Cada orden lleva secuencia y cada snapshot confirma la última aplicada.
- El cliente predice sólo su movimiento, conserva órdenes pendientes y reconcilia suavemente contra la posición autoritativa. Otros actores se interpolan con 100–150 ms de búfer; no se extrapolan ataques.
- El servidor decide alcance, colisión, coste y enfriamiento, daño, crítico, estados, muerte, XP, botín, intercambios y moneda. El cliente sólo solicita acciones y reproduce resultados.
- La PoC usa binario little-endian cuantizado. En producción cada mensaje tendrá versión, tipo, tick y límites estrictos; se registrarán métricas de tamaño y rechazos. JSON queda para herramientas, no para snapshots frecuentes.

## Transporte

**WebSocket** es la primera elección: funciona en Electron, tiene librerías maduras, TLS y operación sencilla. Su entrega fiable puede acumular retraso; se mitiga con deltas pequeños y descartando estado obsoleto en aplicación. **WebTransport** ofrece streams y datagramas, pero requiere HTTP/3 y soporte/operación más complejos. **WebRTC** aporta datagramas y P2P, pero señalización, NAT y una topología entre jugadores no encajan con autoridad ni anti-trampa. Se reconsiderará WebTransport sólo después de medir pérdida y latencia reales.

## Mundo continuo e instancias

El mundo se divide en celdas persistentes y chunks de terreno. Cada proceso mantiene varias celdas y publica presencia en los bordes. El gestor de interés envía al cliente sólo entidades dentro de su radio, grupo, combate o misión; usa histéresis para evitar entradas/salidas constantes. Al crecer, un directorio asigna celdas a procesos y transfiere al personaje con un ticket interno idempotente.

Las mazmorras y peleas aisladas son instancias con identificador y ciclo de vida. En mundo abierto, al iniciar una pelea se crea un grupo de visibilidad/combate: terceros siguen viendo una representación, pero no pueden dañar ni apropiarse del monstruo. Mazmorras y zonas expresamente compartidas desactivan ese aislamiento. El resultado lo confirma un único proceso antes de persistirlo.

## Persistencia, cuentas y economía

Base relacional para cuentas, personajes, inventario, mercado y libro mayor; almacenamiento de contenido/versiones aparte. Cada cambio económico es una transacción con idempotency key, versión optimista del inventario y asiento auditable de origen/destino. Nunca se acepta del cliente un saldo o un objeto creado. Guardados periódicos se complementan con un journal de comandos/resultados para recuperación.

Autenticación propia y genérica: credenciales con hash resistente, verificación de sesión, tokens cortos y renovación revocable; separación entre identidad y personaje. No depende de un proveedor externo. Secretos sólo en el servidor y TLS obligatorio fuera de local.

Mercado: órdenes de venta con objeto bloqueado en depósito, compra transaccional, impuesto y expiración. Así se evita vender/equipar/transferir el mismo objeto a la vez.

## Chat y grupos

Servicio de chat con canales local, grupo, comercio y general, límites de ritmo y moderación. El servidor decide destinatarios; la burbuja es un evento efímero que sigue al avatar y desaparece, mientras el historial queda en el canal. Los grupos tienen líder, invitaciones con caducidad, roles y pertenencia persistida; la instancia consume una instantánea del grupo al entrar.

## Seguridad básica

Validar esquema, secuencia, frecuencia, velocidad, alcance, línea de visión, recursos y estado de cada comando. Aplicar cubos de fichas por tipo, límites de tamaño, timeouts y desconexión progresiva. Registrar anomalías sin confiar en reloj, posición, daño ni inventario del cliente. La PoC ya rechaza destinos inválidos y exceso de órdenes.

## Escala, carga y coste orientativo

Primero medir 50, 200 y 1.000 bots por proceso: CPU por tick, p50/p95/p99, memoria, bytes/s, tamaño de cola y tiempo de persistencia; añadir 1–5 % de pérdida y 30–200 ms de latencia. El criterio inicial es p99 del tick < 16,7 ms y sin crecimiento de colas.

Coste sólo como orden de magnitud, no cotización: desarrollo local, casi cero; una VM pequeña para pruebas privadas, decenas de USD/mes; base gestionada y redundancia, decenas a cientos; mundo público con múltiples procesos, observabilidad, copias y tráfico, cientos o miles según concurrencia. Se presupuestará con CCU y bytes/s medidos, no por número de cuentas.

## Ruta por fases

1. **Dos clientes ven movimiento en servidor local** (esta PoC): `npm run server:poc`.
2. Extraer `sim-core` sin DOM/Babylon y hacer que `World` reciba una colección de jugadores y un reloj/RNG inyectados.
3. Conectar dos Electron al servidor, predicción/interpolación y reconexión; aún sin combate.
4. Mover validación de hechizos, daño y estados al servidor; reproducir eventos en el cliente.
5. Persistir cuentas/personajes/inventario con transacciones e idempotencia.
6. Añadir interés por celdas, chat, grupos e instancias de combate/mazmorra.
7. Mercado, pruebas de carga, despliegue redundante y operación.

Riesgos principales: código actual de jugador único, determinismo incompleto al serializar, divergencia cliente/servidor, picos de pathfinding, transferencias entre procesos y duplicación económica. Cada fase debe tener replay determinista y prueba de fallo antes de avanzar.

## PoC incluida

`server/` contiene protocolo, transporte WebSocket/en memoria, servidor que hace tick sobre `World` y dos bots con predicción. Mide carga útil y bytes estimados sobre el cable por cliente. No toca `src/`, `data/` ni `electron/`. Se añadieron `ws` y `@types/ws`: transporte local y tipos, respectivamente.

## Preguntas para el creador

- ¿Cuántos jugadores simultáneos se esperan primero: grupo privado, decenas o mundo masivo?
- ¿El aislamiento de peleas debe ocultarlas o sólo impedir interferencia?
- ¿Cuánto retraso es aceptable y desde qué regiones se jugará?
- ¿El mercado es global, por región o por ciudad?
- ¿Se permite reconectar a una pelea/mazmorra en curso y por cuánto tiempo?
