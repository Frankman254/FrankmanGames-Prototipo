# Arquitectura online — propuesta

**Estado:** PROPUESTA técnica (2026-10-30). No es una decisión `DEC-*` ni activa red
en el juego. La prueba de concepto (`server/`) sólo escucha en `127.0.0.1` y no
toca `src/`, `data/` ni `electron/`.

**Objetivo del creador:** juego online y cooperativo al estilo MMORPG, con:
- economía entre jugadores;
- chat por canales con burbujas sobre el personaje;
- grupos;
- combate aislado por pelea en el mundo abierto, para que nadie te robe el monstruo;
- botín por participante;
- un mundo grande y continuo que se carga al caminar.

---

## 0. Resumen en una página

| Tema | Recomendación | Alternativa principal |
|---|---|---|
| Autoridad | **Servidor autoritativo** Node/TypeScript que comparte `src/sim` y `src/rpg` | Servidor en otro lenguaje (Rust/Go/C#) si la medición lo pide; nunca confiar en el cliente |
| Código compartido | **Monorepo con workspaces**: `packages/sim-core` (hoy `src/sim` + `src/rpg` + esquemas de `src/data`) | Paquete npm privado aparte; peor para cambios cruzados |
| Ritmo | Simulación a **20 Hz** en el servidor; **10–20 instantáneas/s** según distancia | 60 Hz como hoy: 3× la CPU sin ganancia visible en clic-para-mover |
| Movimiento | **Predicción** del propio avatar con el mismo A*; **interpolación** de los demás con un búfer de 100 ms; **reconciliación** por tick confirmado | Sin predicción: el clic tarda un RTT en responder |
| Transporte | **WebSocket** (TLS) | WebTransport cuando la pérdida de paquetes medida lo justifique |
| Formato | **Binario propio** con versión y tipos (como la PoC); JSON sólo para herramientas | Protobuf/FlatBuffers: más herramientas, una dependencia y un esquema externo más |
| Mundo | **Celdas** de 64 m agrupadas en **regiones** de proceso; interés por celdas vecinas | Un único proceso por mapa: simple, pero topa con un techo de jugadores |
| Instancias | Mazmorra = proceso/`World` propio (como hoy cada piso); pelea aislada = **burbuja de combate** dentro de la celda | Instanciar cada pelea en otro `World`: aislamiento total, pero los demás no te ven pelear |
| Persistencia | **PostgreSQL** + libro mayor de la economía + claves de idempotencia | SQLite para la fase privada; documento (Mongo) no aporta transacciones cómodas |
| Cuentas | Propias: contraseña con hash memory-hard, sesiones revocables, tokens cortos | Proveedor externo: descartado por regla |

**Primer paso concreto:** la PoC de este documento ya cumple «2 clientes se ven
moverse en un servidor local» (`npm run server:poc`). El siguiente es la
refactorización R1 (§13.1): un `World` con varios jugadores.

---

## 1. Qué hay hoy y qué se puede reutilizar

Lectura de `src/sim/*`, `src/rpg/*`, `src/rpg/session.ts`, `src/rpg/contracts.ts` y `src/sim/rng.ts`:

**Se puede llevar al servidor tal cual:**
- `src/sim` y `src/rpg` **no usan DOM, Babylon, `Math.random`, `Date.now` ni
  `performance`** (comprobado con `grep`). Son lógica pura.
- **Navegación:** `NavGrid`, `Pathfinder` (A*) y `movement.ts` (`stepAlongPath`, `slide`).
  La PoC las usa en servidor y cliente con resultados idénticos.
- **Combate y estado:**
  - `damage.ts`, `combat.ts` (`castBlock`), `effects.ts`, `status.ts`, `stats.ts`, `items.ts`, `progression.ts` (`rollLoot`);
  - `EnemySystem` (máquina de estados), `ZoneMap` y `ZonePopulation`;
  - `FixedStepClock` (`loop.ts`): la PoC lo reutiliza para el bucle del servidor.
- **`Rng` (mulberry32 con semilla):** el mundo es reproducible con la misma
  semilla, el mismo `dt` y la misma secuencia de órdenes. Sirve para:
  - repeticiones para depurar;
  - tests de regresión;
  - verificar un servidor contra un registro de órdenes.
- **Datos:** se cargan con `import json` (`src/data/index.ts`). En Node funcionan
  con `vite-node` (lo usa la PoC) o empaquetando con `esbuild`, que ya es
  devDependency.

**Lo que impide usarlo como servidor multijugador:**

| Hoy | Problema online | Dónde |
|---|---|---|
| `World.player` y `World.character` únicos | Un mundo = un jugador | `src/sim/world.ts` (todo `tickPlayer`, `command*`, `collect`, `canCollect`) |
| `EnemyContext.player` único | Los enemigos sólo pueden perseguir a un objetivo | `src/sim/enemies.ts:61` |
| `GameSession` enlaza un `World` y un `Character` | La sesión es la de un jugador local; en red es «el jugador X en la región Y» | `src/rpg/session.ts` |
| `drainEvents()` devuelve todos los sucesos | Hay que repartirlos por destinatario (área de interés, grupo, dueño) | `src/sim/world.ts:300`, `events.ts` (26 tipos) |
| Un `Rng` por mundo, compartido por todos los sistemas | Cualquier cambio en el orden de las tiradas cambia el resultado; con varios jugadores el orden de las órdenes también | `world.rng` |
| `nextId` local al `World` | Los ids chocan entre procesos y al cambiar de región | `World.nextId` |
| Tienda, misiones e inventario se resuelven en el cliente | La economía tiene que ser del servidor | `shop.ts`, `quests.ts`, `character.ts` |
| Guardado en `localStorage` (`SaveData`) | Pasa a la base de datos; el cliente no guarda | `src/ui/menus/saveStore.ts` |
| Mundo = una `ZoneDef` (arena de 80 m o terreno de 256 m) | No hay celdas ni transferencias | `data/zone.json`, `data/terrain.json` |

**Determinismo, con un matiz importante:**
- En la misma máquina y la misma versión del motor JS, `World` es determinista.
- Entre Electron 33 (Chromium 130, V8 13.0) y Node 20 (V8 11.3), las funciones
  `Math.atan2`, `Math.hypot`, `Math.sin`… **no tienen garantía de dar el mismo
  bit**.
- Por tanto, **no** se propone un *lockstep* (todos simulan y sólo viajan órdenes).
- Se propone **servidor autoritativo con instantáneas**. La predicción del
  cliente es sólo cosmética y se corrige con la posición del servidor.

---

## 2. Servidor autoritativo en Node/TypeScript

**Recomendación:**
- Un proceso Node por **región** del mundo (§5) y uno por **instancia** (§6) o
  varias instancias por proceso.
- Comparten `sim-core`.
- El cliente Electron sigue teniendo el `World` para **predecir** y para el
  modo sin conexión (pruebas, tutorial).

**Estructura del monorepo (npm workspaces, sin herramientas nuevas):**

```
packages/
  sim-core/     ← src/sim + src/rpg + src/data (esquemas y carga), sin DOM
  protocol/     ← server/protocol.ts: mensajes, versión, cuantización
apps/
  client/       ← src/main.ts, render, ui, audio, electron/
  server/       ← región, instancias, puerta de enlace
  services/     ← cuentas, chat, mercado (pueden empezar dentro de server/)
```

**Por qué Node y no otro lenguaje:**
- Una sola implementación de las reglas: es lo que más evita la divergencia
  cliente/servidor.
- Coste medido en la PoC con 100 clientes (§12): tick medio de 0,5 ms a 60 Hz
  con la capa de avatares. Hay margen de dos órdenes de magnitud antes de que
  el lenguaje sea el cuello de botella.
- El riesgo real es el **A***: un `findPath` largo cuesta milisegundos.
  Se mitiga con presupuesto de búsquedas por tick, cola y `worker_threads`.

**Alternativas:**
1. **Rust/Go/C#** para el servidor: más rendimiento por núcleo, pero las reglas
   quedarían duplicadas (o habría que compilar TS a otro lenguaje). Sólo con
   una medición que lo justifique.
2. **Cliente autoritativo con verificación:** más barato, pero no permite una
   economía auditable. Descartado.
3. **P2P / *host* de partida:** sirve para cooperativo de 4, no para un mundo
   persistente. Descartado.

---

## 3. Modelo de red

### 3.1 Ritmos

| Qué | Hoy (local) | Propuesta online | PoC |
|---|---|---|---|
| Tick de simulación del servidor | 60 Hz | **20 Hz** (50 ms). Para clic-para-mover y hechizos con lanzamiento basta; el cliente interpola | 60 Hz (el `World` actual asume `dt` ≈ 1/60) |
| Instantáneas a cada cliente | — | **20 Hz** cerca (≤ 25 m), **10 Hz** lejos, **2–4 Hz** en el borde del área de interés | 20 Hz |
| Envío de órdenes del cliente | — | En el momento (clic, tecla); máx. 10/s de movimiento | ≈ 0,6/s |
| Render del cliente | 60+ FPS | Igual, interpolado | — |

Bajar el tick a 20 Hz requiere comprobar que `World` da lo mismo con `dt = 1/20`:
- proyectiles rápidos;
- telegrafías cortas;
- separación de multitudes.

Si no, se puede mantener 30 Hz. Hay que medirlo antes de decidir (fase 2).

### 3.2 Qué decide cada uno

| Decide el **servidor** (autoridad) | Hace el **cliente** |
|---|---|
| Posición final, colisiones, caminos | Predice su propio movimiento con el mismo A* |
| Alcance, línea de visión, coste, enfriamiento, GCD | Muestra el enfriamiento de forma optimista; se corrige con la confirmación |
| Daño, crítico, esquiva, estados, muerte | Reproduce los efectos cuando llega el suceso; nunca los calcula |
| XP, nivel, oro, botín, inventario, equipo | Pide acciones («equipar uid X») |
| Mercado, intercambio, tiendas de PNJ | Interfaz |
| Misiones (progreso y recompensas) | Diario y marcadores a partir de vistas |
| Aggro, IA y aparición de enemigos | Interpola a los enemigos |
| Quién ve qué (interés) y quién recibe qué chat | Burbujas, sonido y cámara |

**Regla:** el cliente **pide** («quiero lanzar el hechizo del hueco 3 apuntando a
(x,y)») y nunca **afirma** («he hecho 120 de daño»).

Encaja con lo que ya hay:
- los `command*` de `World` y los métodos de `GameSessionApi` ya son peticiones;
- ya devuelven `CommandResult` o `CastBlock`.

En red, los mismos métodos se convierten en mensajes.

### 3.3 Predicción, interpolación y reconciliación

**Predicción (sólo del propio movimiento):**
- Al hacer clic, el cliente calcula el camino con su `Pathfinder` y empieza a
  andar sin esperar. Envía `move{seq, x, y}`.
- El servidor calcula su propio camino desde **su** posición.
- La PoC lo demuestra: en paso con el servidor el desvío es menor de 1 cm
  (sólo la cuantización). Sobre WebSocket real, sin sincronizar relojes, se
  queda en 0,17–0,27 m.

**Reconciliación:**
- Cada instantánea trae `ackSeq` (última orden aplicada) y `tick`.
- El cliente guarda su posición predicha por tick local. Al confirmar, compara
  con la del servidor en ese tick:
  - si el error es menor de 0,25 m, no hace nada;
  - entre 0,25 y 2 m, corrige suavemente en 100–200 ms;
  - si es mayor, recoloca al avatar (un teletransporte o un empuje).
- La PoC hace la versión mínima: mide y recoloca si el desvío pasa de 0,5 m.
  Falta el historial por tick y sincronizar el reloj (ping/pong con el tick del
  servidor).

**Hechizos:**
- No se predice el daño.
- Sí se pueden predecir la animación de lanzamiento y el inicio del GCD, porque
  se ven mal si tardan 80 ms.
- Si el servidor responde `castBlocked`, se cancela la animación.

**Interpolación de los demás:**
- Las entidades ajenas se dibujan 100 ms en el pasado (dos instantáneas a 20 Hz),
  interpolando entre las dos que rodean ese instante.
- No se extrapolan ataques. Si falta una instantánea, se extrapola el
  movimiento como máximo 150 ms y luego se espera.
- Encaja con el render actual, que ya interpola `prevPos → pos` con `alpha`.

**Compensación de latencia:** no hace falta para hechizos con objetivo (se
apunta a un id) ni para áreas grandes. Si un día hay proyectiles esquivables
contra jugadores (JcJ), se rebobinan las posiciones guardadas como máximo
200 ms.

---

## 4. Transporte y formato

### 4.1 WebSocket vs WebTransport vs WebRTC (en Electron)

| | WebSocket | WebTransport | WebRTC (DataChannel) |
|---|---|---|---|
| En el renderer de Electron | Sí (API del navegador) | Sí (Chromium ≥ 97) | Sí |
| Servidor en Node | Maduro (`ws`) | Inmaduro: HTTP/3 + QUIC sin soporte estable en Node 20 | Posible (bibliotecas nativas), pesado |
| Pérdida de paquetes | TCP: un paquete perdido retrasa todo lo de detrás (bloqueo en cabeza) | Datagramas no fiables + flujos fiables | Canales no fiables/no ordenados |
| Proxies, cortafuegos, TLS | Pasa por todo (443) | UDP 443: algunas redes lo bloquean | Necesita ICE/STUN/TURN; TURN es otro servicio que operar |
| Operación | Simple (balanceador HTTP) | Media-alta | Alta |
| Modelo | Cliente-servidor | Cliente-servidor | Pensado para P2P |

**Recomendación: WebSocket.** Un RPG de clic-para-mover con combate de
recurso + enfriamiento tolera bien el retraso de TCP. Para reducirlo:
- instantáneas delta pequeñas (cientos de bytes);
- si una instantánea se retrasa, la siguiente la sustituye: en el cliente se
  descarta lo antiguo;
- `TCP_NODELAY` activo (`ws` lo hace por defecto);
- sin `permessage-deflate` en el canal de juego, porque cuesta CPU por cliente.
  Se puede valorar para el chat.

**Alternativas:**
- **WebTransport:** se reconsidera si las pruebas con pérdida de paquetes del
  1–3 % (§12) dan tirones inaceptables. La capa `Connection` de la PoC aísla el
  cambio.
- **WebRTC:** sólo tendría sentido para voz.

### 4.2 Formato de mensajes

**La PoC** (`server/protocol.ts`) usa binario little-endian:
- el primer byte es el tipo (cliente < 0x80, servidor ≥ 0x80);
- las posiciones van en centímetros `u16` (hasta 655 m, mayor que una celda);
- el rumbo va en 256 pasos.

| Mensaje | Bytes |
|---|---|
| `hello` (cliente) | 4 + nombre |
| `move` (cliente: seq, x, y en f32) | 13 |
| `welcome` | 9 |
| `snapshot`: cabecera 13 + 11 por entidad cambiada + 4 por entidad retirada | 13 + 11·n + 4·r |
| `reject` (seq, motivo) | 6 |

**Para el juego real:**
- **Sobre de mensaje:** `u8 tipo`, `u16 longitud`, y `u32 tick` cuando aplique.
  Versión del protocolo en `hello`: si no coincide, se rechaza la conexión con
  un mensaje claro de «actualiza el cliente».
- **Entidades:**
  - **posición relativa a la celda** (`u16` en cm dentro de 64 m, sobra rango),
    con el id de celda sólo cuando cambia;
  - **id de red** `u32` por región, distinto del id persistente;
  - **máscara de campos cambiados** (posición, rumbo, vida %, estado,
    animación, estados alterados) para no repetir lo que no cambia.
- **Sucesos** (golpes, lanzamientos, botín) en una sección aparte de la
  instantánea, con fiabilidad garantizada (ya lo es por TCP).
- **Esquema escrito en TypeScript** en `packages/protocol`, con tests de ida y
  vuelta (como `tests/server/protocol.test.ts`) y un test de compatibilidad por
  versión.
- **JSON** sólo para herramientas y para mensajes raros y grandes (abrir el
  mercado, cargar la ficha). Nunca en instantáneas.

**Alternativa:** Protobuf o FlatBuffers. Aportan herramientas y evolución de
esquema, a cambio de una dependencia y de un paso de generación. El volumen
del juego no lo exige: un codificador propio de unas 200 líneas basta y es
nuestro.

---

## 5. Mundo continuo con carga por zonas

### 5.1 Celdas y chunks

- **Celda de simulación:** cuadrado de **64 m** (PROPUESTA; el terreno actual
  de 256 m serían 4×4 celdas).
  - Cada celda tiene su trozo de `NavGrid`, sus enemigos y su botín en el suelo.
  - El A* puede cruzar el borde de una celda si las vecinas están cargadas en
    el mismo proceso.
  - Para caminos largos: A* jerárquico (celda → celda, luego dentro de la celda).
- **Chunk de contenido (cliente):** la misma rejilla de 64 m. El cliente carga:
  - malla de terreno, vegetación y objetos de las celdas a ≤ 1–2 anillos;
  - LOD más bajo en el anillo exterior.
  - La carga es en segundo plano, a partir de archivos locales del cliente (no
    se descargan del servidor salvo actualizaciones).
- **El servidor sólo tiene lógica:** rejilla de navegación, alturas para la
  línea de visión y entidades. No carga mallas.

### 5.2 Gestión de interés (qué recibe cada cliente)

- Cada entidad está en una celda (hash espacial; ya existe `SpatialHash`).
- **Conjunto de interés de un cliente:** su celda y las 8 vecinas, filtradas
  por un radio de ~40 m, y además siempre:
  - su grupo (aunque esté lejos, a 1 Hz para el mapa);
  - los participantes de su burbuja de combate.
- **Histéresis:** entra a 40 m y sale a 45 m, para que nada parpadee en el borde.
- **Prioridad por distancia:** cerca a 20 Hz, medio a 10 Hz y lejos a 2–4 Hz.
  Cuando hay mucha gente, un presupuesto de bytes por cliente y tick decide qué
  se envía primero (propio > grupo > combate > cercanos > resto).
- **La PoC lo hace en su forma mínima:**
  - radio fijo;
  - delta contra lo último enviado;
  - mensaje de «retirada» al salir del radio (probado en
    `tests/server/protocol.test.ts`).

**Por qué importa (medido, §12):**
- Con todos a la vista, la bajada por cliente crece con el número de jugadores
  (2 → 0,7 KB/s; 100 → 14 KB/s) y el total del servidor crece con el cuadrado
  (100 jugadores → 1,4 MB/s).
- El interés por celdas lo convierte en un coste por **densidad local**, no
  por población total.

### 5.3 Reparto del mundo entre procesos

- **Región** = conjunto de celdas contiguas simuladas por un proceso.
  Empezar con **una región = todo el mapa** y partir cuando haga falta.
- **Directorio de celdas** (un servicio pequeño o una tabla): celda → proceso.
  La puerta de enlace consulta el directorio y enruta la conexión del cliente.
- **Bordes:**
  - cada región publica a sus vecinas las entidades a ≤ 40 m del borde, como
    «fantasmas» de sólo lectura, para que se vea a través de la frontera;
  - el combate no cruza la frontera: la burbuja de combate (§6) se queda en la
    región donde empezó.
- **Transferencia de un personaje entre regiones:**
  1. El origen congela al personaje.
  2. Escribe su estado con una versión y un **ticket idempotente**.
  3. El destino lo carga y confirma.
  4. El origen lo borra.
  - Si algo falla a mitad, el ticket impide que haya dos copias. Es la misma
    técnica que para la economía (§7).
- **Alternativa:** *sharding* por **copias** del mundo («Servidor 1», «Servidor 2»).
  Es más simple, pero divide a la comunidad. Se puede combinar (varias copias,
  cada una con regiones).

---

## 6. Instancias: mazmorras y peleas aisladas

### 6.1 Mazmorras

- Ya hoy cada piso es un `World` nuevo (`src/scenes/cryptScene.ts:135`). En el
  servidor, **una instancia es un `World` con un id**, creado al entrar el grupo
  y destruido cuando se vacía (con una gracia para reconectar: PROPUESTA 5 min).
- Las instancias van en procesos dedicados (muchas por proceso). Al entrar, el
  grupo se transfiere como en §5.3.
- **Sin aislamiento de combate dentro:** todo el grupo comparte enemigos y botín
  según la regla de reparto (§6.3).

### 6.2 Peleas aisladas en el mundo abierto («nadie te roba el monstruo»)

**Recomendación: burbuja de combate dentro de la misma celda, no otra instancia.**

**Al atacar a un enemigo libre:**
- se crea un `CombatBubble { id, enemyIds, participantes (jugador o grupo) }`;
- el enemigo pasa a estar **etiquetado** a esa burbuja.

**Reglas de la burbuja:**
- **Quién puede dañar:** sólo los participantes dañan a sus enemigos y los
  enemigos sólo dañan a los participantes. Los demás:
  - los ven pelear (o atenuados, según la pregunta Q2);
  - pueden pasar al lado;
  - no pueden hacer daño ni recoger el botín.
- **Fin:**
  - todos los enemigos muertos: botín;
  - todos los participantes muertos o lejos durante X s: el enemigo se reinicia
    y se cura;
  - nadie del grupo en 60 m: se reinicia.
- **Unirse:** se entra en la burbuja de otro por invitación o por ser de su
  grupo. Pregunta Q3: ¿se puede pedir unirse?
- **Zonas marcadas `shared`** (eventos, jefes del mundo) y mazmorras: sin
  burbuja. Ahí el reparto es por contribución (§6.3).

**Cambios en el código:**
- La burbuja es un filtro en los puntos donde hoy se decide a quién golpea qué:
  - `targetsOf` en `world.ts`;
  - `hitPlayer`;
  - la elección de objetivo de `EnemySystem`.
- Encaja con R1–R2 (§13.1).

**Alternativa:** mover la pelea a un `World` aparte («fase» o *phasing*):
- aislamiento perfecto y más simple de razonar;
- pero el combate desaparece para los demás y el mundo se siente vacío;
- y la transferencia a otro mundo añade carga y tiempos de espera a cada pelea.

### 6.3 Botín por participante

- Al morir un enemigo, el servidor tira el botín **por cada participante** con
  su propio `Rng` derivado:
  - semilla = hash(semilla de la región, id del enemigo, id del personaje);
  - es reproducible y auditable.
- Cada participante ve **su** botín en el suelo; los demás no lo ven (interés
  por dueño). Ya existe `GroundLoot` y `canCollect`: hace falta un campo
  `ownerId`.
- **Oro y XP:** se reparten según la regla de grupo (PROPUESTA: XP a partes
  iguales entre presentes a ≤ 60 m; oro por participante).
- **Zonas compartidas o jefes:** hace falta una contribución mínima (p. ej. ≥ 5 %
  del daño o de la curación) para tener derecho a botín.

---

## 7. Persistencia

**Base de datos:**
- **PostgreSQL** (relacional, transacciones, restricciones, `SELECT … FOR UPDATE`).
- Para la fase privada (≤ 20 jugadores), SQLite con la misma capa de acceso.
  La librería (`pg` o `better-sqlite3`) se elige y se registra en
  `PROCEDENCIA.md` en la fase 5.

**Esquema mínimo (PROPUESTA):**

```
accounts(id, login, pass_hash, created_at, status)
sessions(id, account_id, token_hash, expires_at, revoked)
characters(id, account_id, name UNIQUE, class_id, level, xp, gold,
           region_id, pos_x, pos_y, version, updated_at)
items(uid PK, item_id, owner_char, location ENUM(bag, equip, bank, escrow, mail),
      slot, quantity, quality, rolls JSONB, version, created_by_event)
quests(char_id, quest_id, state, progress JSONB)
ledger(id, ts, kind, idempotency_key UNIQUE, from_char, to_char,
       item_uid, quantity, gold_delta, reason, server_id)
market_orders(id, seller, item_uid, price, created_at, expires_at, state)
```

**Reglas de la economía (antiduplicación):**
1. **Un objeto es una fila con `uid` único.** No se copia; se **mueve**
   (`UPDATE owner/location … WHERE uid=? AND version=?`).
   - Ya existe `ItemInstance.uid`.
   - Hoy lo genera el cliente; en el servidor lo genera el servidor
     (UUIDv7 o un id de 64 bits).
2. **Toda operación que crea, destruye o mueve valor** (botín, tienda,
   intercambio, mercado, correo, misión) es **una transacción** que:
   - escribe en `ledger` con una `idempotency_key`
     (p. ej. `loot:<regionId>:<enemyId>:<charId>`);
   - si se repite tras un corte, falla por la clave única y no duplica.
3. **Versión optimista** en `characters` e `items`: dos operaciones simultáneas
   sobre el mismo objeto → una falla y se reintenta.
4. **El estado caliente** (posición, vida, enfriamientos) vive en memoria del
   proceso y se guarda cada 30–60 s y al salir o al transferir.
   - **El valor** (oro, objetos) se escribe **en el momento** de la transacción.
   - Una caída sólo puede perder movimiento reciente, no objetos.
5. **Auditoría:**
   - el oro de un personaje = suma de sus asientos (comprobable con un trabajo
     nocturno);
   - alertas por creación anómala de oro u objetos por hora y por fuente.

---

## 8. Cuentas y autenticación (genéricas, sin terceros)

- **Registro e inicio de sesión** contra un servicio de cuentas propio, por
  HTTPS (TLS con certificado del dominio del juego).
- **Contraseñas:** hash memory-hard con sal por usuario (scrypt está en
  `node:crypto` sin dependencias; Argon2id si se acepta una dependencia).
  Límite de intentos por cuenta e IP, y retraso creciente.
- **Sesión:**
  - el login devuelve un **token de refresco** opaco (guardado hasheado en
    `sessions`, revocable, 30 días);
  - y un **token de acceso** corto (15 min) firmado con HMAC por el servidor;
  - la conexión de juego presenta el token de acceso en el primer mensaje
    (`hello`), nunca en la URL.
- **En Electron:** el token de refresco se guarda con `safeStorage` (cifrado
  del sistema) en el proceso principal. El renderer lo pide por el preload, que
  ya existe con `contextIsolation`.
- **Separación:** cuenta ≠ personaje. El servidor de juego sólo ve
  `characterId` y comprueba que pertenece a la cuenta del token.
- **Fuera de alcance por ahora:**
  - recuperación por correo (necesita un servicio de correo: decisión aparte);
  - 2FA con TOTP (se puede hacer sin terceros, más adelante).

---

## 9. Anti-trampas básico

Principio: **el servidor no se cree nada del cliente; sólo acepta peticiones.**

| Capa | Qué se valida | En la PoC |
|---|---|---|
| Mensaje | Tamaño máximo, tipo conocido, longitud exacta, números finitos | Sí (`decodeClient`) |
| Sesión | `hello` primero, versión de protocolo, token | Versión sí, token no |
| Secuencia | `seq` creciente; descartar repetidos o viejos | Sí |
| Ritmo | Cubo de fichas **por tipo de orden** (mover 10/s, hechizo 8/s, chat 1/s con ráfaga 5, mercado 2/s) | Sí (mover) |
| Reglas | Destino dentro del mundo y alcanzable; alcance, línea de visión, coste, enfriamiento, GCD, estado (aturdido, muerto) | Límites del mundo sí; el resto lo da `World` al compartir el código |
| Velocidad | No hace falta: la posición la calcula el servidor | — |
| Economía | Ver §7: transacciones, versiones, idempotencia | — |
| Reacción | Contadores de rechazo por conexión → aviso, desconexión, marca para revisión. Nunca castigar automáticamente por un único rechazo (la latencia los provoca) | Contador sí |

**El cliente Electron no es de confianza:**
- se puede modificar;
- no se añade anti-trampas en el cliente (ofuscación, detección de memoria) en
  esta fase.
- Lo que importa (daño, botín, economía) ya está en el servidor.
- Los *bots* de recolección son un problema de diseño y de detección por
  comportamiento, para más adelante.

---

## 10. Chat, burbujas y grupos

### 10.1 Chat

**Canales:**

| Canal | Quién lo recibe | Límite (PROPUESTA) |
|---|---|---|
| Local / mapa | Jugadores en el área de interés del emisor (≈ 40 m), por la región | 1 msg/s, ráfaga 5 |
| Grupo | Miembros del grupo, estén donde estén | 2 msg/s |
| Comercio | Todos los suscritos de la copia del mundo | 1 msg / 10 s |
| General | Todos los suscritos de la copia del mundo | 1 msg / 5 s |
| Susurro | Un personaje por nombre | 2 msg/s |

**Cómo funciona:**
- Local y grupo los reparte la región (ya conoce el interés).
- Comercio, general y susurro van por un **servicio de chat** aparte (un proceso
  con pub/sub en memoria; Redis u otro bus si hay muchas regiones).
- **Mensaje:** `chat{canal, texto ≤ 200 caracteres UTF-8}`.
  - El servidor añade emisor, hora e id.
  - El servidor filtra caracteres de control y comprueba el límite.
- **Moderación mínima:**
  - silenciar e ignorar (lista por personaje, persistida);
  - denunciar (guarda las últimas N líneas del canal);
  - registro de 30 días.

### 10.2 Burbujas

- **Un mensaje del canal local también genera una burbuja:** suceso
  `speech{entityId, text}`.
  - Se envía sólo a quien tiene a esa entidad en su interés.
  - El servidor no la guarda; la vida de la burbuja la decide el cliente.
- **Cliente:** una etiqueta en el mundo anclada al avatar, sobre la cabeza.
  - Sigue a la posición **interpolada**: la misma que el render, así no tiembla.
  - Dura 4 s + 0,05 s por carácter, con un máximo de 3 líneas.
  - Si llega otra, la sustituye.
  - Se oculta a más de 30 m o si el emisor está ignorado.
- Las burbujas de grupo o susurro no aparecen sobre la cabeza; van sólo a la
  ventana de chat.

### 10.3 Grupos

- **Estado:** `Group { id, leaderId, members[≤ 4–6], lootRule, createdAt }`.
  - Lo gestiona un servicio de grupos, que al principio va dentro del proceso
    de región.
  - Se persiste para sobrevivir a reconexiones.
- **Invitación:** con caducidad (60 s), aceptar o rechazar, expulsar, pasar el
  liderazgo, salir.
- **El grupo aparece en:**
  - el interés (siempre se ven, al menos en el mapa);
  - las burbujas de combate (comparten);
  - el botín (§6.3);
  - las instancias (al entrar, la instancia toma una foto del grupo).
- **Desconexión:** un miembro desconectado se queda 5 min en el grupo y en la
  instancia.

---

## 11. Economía de jugadores: mercado / casa de subastas

**Recomendación:** mercado de **órdenes de venta a precio fijo** (no pujas)
por copia del mundo.
- Es más simple, más difícil de manipular y se entiende mejor.
- Las pujas se pueden añadir después.

**Ciclo de una orden:**
1. **Publicar:** el objeto pasa de `bag` a `escrow` en una transacción. Se cobra
   una tasa de publicación (sumidero de oro).
2. **Comprar:** en una transacción:
   - se bloquea la orden (`FOR UPDATE`), estado `open` → `sold`;
   - se descuenta el oro del comprador;
   - el objeto va al **correo** del comprador;
   - el oro, menos el impuesto de venta (otro sumidero), va al correo del
     vendedor;
   - todo con asiento en `ledger` y clave de idempotencia
     `market:<orderId>:buy`.
3. **Caducar o retirar:** el objeto vuelve por correo.

**Detalles:**
- Comprar desde cualquier sitio o sólo en ciudades: pregunta Q6.
- Búsqueda por categoría, nivel y rareza con índices; las vistas se cachean
  unos segundos.
- Intercambio directo entre dos jugadores: ventana con doble confirmación.
  Cualquier cambio anula la confirmación. Una transacción mueve ambos lados.
- **Equilibrio:**
  - las fuentes de oro (botín, misiones, venta a PNJ) y los sumideros (tasas,
    reparaciones, tiendas) se miden con `ledger`;
  - es la base para ajustar las cifras, que siguen siendo PROPUESTA en `data/`.

---

## 12. Pruebas de carga y coste de alojamiento

### 12.1 Lo que ya mide la PoC

**`npm run server:poc`:**
- 2 clientes por WebSocket real, 10 s, en el PC del creador;
- simulación a 60 Hz, instantáneas a 20 Hz;
- enemigos del encuentro de la arena incluidos.

| Medida | Cliente 1 | Cliente 2 |
|---|---|---|
| Instantáneas recibidas en 10 s | 199 | 199 |
| Bajada (carga útil) | 592 B/s | 591 B/s |
| Bajada (con marco WebSocket) | 632 B/s | 631 B/s |
| Subida (con marco y máscara) | 13 B/s | 11 B/s |
| Instantáneas en las que vio moverse al otro | 123 | 169 |
| Desvío máximo de la predicción | 0,27 m | 0,17 m |

- Tick del servidor: medio 0,16 ms, p95 0,39 ms, máximo 2,3 ms.
- Sin contar TCP/IP: unos 40 B por paquete. A 20 paquetes/s son +0,8 KB/s, más
  que la propia carga con pocas entidades. A este nivel, el número de paquetes
  pesa más que su tamaño.

**Escalado en memoria** (mismo código, N bots en la arena de 80 m, todos a la
vista, 10 s):

| Clientes | Instantáneas | Bajada por cliente | Total que sale del servidor | Tick medio (60 Hz) |
|---|---|---|---|---|
| 2 | 20 Hz | 0,7 KB/s | 1,3 KB/s | 0,05 ms |
| 10 | 20 Hz | 2,0 KB/s | 20 KB/s | 0,04 ms |
| 50 | 20 Hz | 7,8 KB/s | 382 KB/s | 0,16 ms |
| 50 | 10 Hz | 3,9 KB/s | 193 KB/s | 0,08 ms |
| 100 | 20 Hz | 14,4 KB/s | 1,4 MB/s | 0,49 ms |
| 100 | 10 Hz | 7,3 KB/s | 0,7 MB/s | 0,27 ms |

**Conclusiones:**
- El cuello de botella no es la CPU de la simulación de movimiento sino el
  **ancho de banda con todos a la vista** (crece con el cuadrado).
- Hay que hacer, en este orden:
  1. interés por celdas;
  2. frecuencia por distancia;
  3. máscara de campos.
- El combate (sucesos de golpe y estados) añadirá carga: hay que medirlo en la
  fase 4.

### 12.2 Plan de pruebas de carga

**Herramienta:**
- `server/bot.ts` crecido: bots que caminan, pelean, hablan, comercian y
  cambian de región;
- lanzados en N procesos desde una o varias máquinas, contra el servidor real
  por WebSocket.

**Escenarios:**

| Escenario | Qué se mide |
|---|---|
| A. Dispersos: 200, 500 y 1000 bots repartidos por el mapa | Coste del interés, bytes/s por cliente |
| B. Aglomeración: 100–200 en una ciudad (radio 30 m) | El peor caso de ancho de banda y de presupuesto de envío |
| C. Combate: 50 grupos de 4 contra enemigos | CPU de `World`, A* por tick, sucesos/s |
| D. Fronteras: 100 bots cruzando entre dos regiones sin parar | Transferencias, fantasmas, duplicados (debe ser 0) |
| E. Economía: 500 compras/s concurrentes sobre 100 órdenes | Conflictos, latencia de la base de datos, auditoría del libro mayor sin descuadres |
| F. Red mala: 30–200 ms de RTT, 1–3 % de pérdida, *jitter* de 20 ms (simulados en el propio transporte de prueba) | Tirones percibidos, desvío de la predicción, si hace falta WebTransport |

**Criterios (PROPUESTA):**
- tick p99 < 50 % del presupuesto (25 ms a 20 Hz);
- sin colas de envío que crezcan;
- bajada por cliente ≤ 10 KB/s en el escenario B;
- 0 descuadres en `ledger`;
- 0 objetos duplicados tras matar procesos a mitad de una transferencia.

**Métricas del servidor:** tick (p50/p95/p99), memoria, bytes/s de entrada y
salida, conexiones, rechazos por motivo, latencia de la base de datos, cola de
A*.

### 12.3 Coste orientativo de alojamiento

**Orden de magnitud, no presupuesto.** Supuestos:
- precios típicos de VPS y nube de 2025–2026, a verificar al contratar;
- ~5 KB/s de bajada media por jugador conectado (CCU) con interés por celdas.

| Fase | Qué | Coste mensual aproximado |
|---|---|---|
| Desarrollo | El PC del creador (`npm run server:poc`) | 0 |
| Prueba privada (≤ 20 CCU) | 1 VPS de 2 vCPU / 4 GB con SQLite o PostgreSQL en la misma máquina | 5–25 USD |
| Alfa cerrada (≤ 200 CCU) | 1–2 VPS de 4 vCPU, PostgreSQL gestionado pequeño, copias de seguridad, dominio + TLS | 50–150 USD |
| Lanzamiento modesto (1.000 CCU) | 3–6 procesos de región/instancia, base de datos con réplica, monitorización | 300–1.000 USD |

**Tráfico:**
- 1.000 CCU × 5 KB/s ≈ 13 TB al mes de salida.
- Muchos VPS incluyen varios TB.
- En las nubes grandes la salida se cobra aparte (≈ 0,05–0,09 USD/GB): sólo eso
  serían 650–1.200 USD/mes.
- **El ancho de banda es lo que más pesa.** De ahí la prioridad del interés por
  celdas y del binario compacto.

---

## 13. Hoja de ruta por fases

Cada fase termina con tests en verde, una nota en `docs/BITACORA.md` y una
medición. **Ninguna fase necesita romper el modo de un jugador:** el cliente
sigue pudiendo crear su `World` local.

| Fase | Resultado visible | Trabajo |
|---|---|---|
| **0. Hecho (esta rama)** | 2 clientes simulados se ven moverse en un servidor local | `server/` (protocolo, transporte, servidor, bots), tests, medición de bytes |
| **1. Dos Electron se ven** | Dos ventanas del juego, en el mismo PC, ven el avatar del otro moverse por el terreno | R0 + R1 (sólo movimiento); `NetSession` en el cliente; interpolación de remotos en el render; predicción y reconciliación con historial por tick; sincronización de reloj |
| **2. Ritmo y aislamiento** | El servidor corre a 20–30 Hz con resultados equivalentes | Medir `World` con `dt` mayor; ajustar lo que dependa de 60 Hz; reloj del servidor y `ping` |
| **3. Enemigos compartidos** | Los dos jugadores pelean contra los mismos enemigos; daño y muertes del servidor | R2 (aggro multiobjetivo), R3 (sucesos por destinatario); `command*` como mensajes; `castBlocked` en red |
| **4. Burbujas de combate y botín por participante** | Un tercero no puede robar el monstruo; cada uno ve su botín | `CombatBubble`, `ownerId` en `GroundLoot`, RNG por participante; zonas `shared` en datos |
| **5. Persistencia y cuentas** | Cerrar y volver a entrar conserva personaje e inventario; login propio | R4 (sesión en el servidor), PostgreSQL/SQLite, `ledger`, idempotencia; servicio de cuentas; `SaveData` migrado al esquema |
| **6. Chat y grupos** | Canales, burbujas, invitaciones y XP compartida | Servicio de chat, grupos, límites |
| **7. Mundo continuo** | Caminar de una región a otra sin pantalla de carga | R5 (celdas), directorio, fantasmas, transferencias; carga de chunks en el cliente |
| **8. Mazmorras como instancias** | El grupo entra en su copia de la cripta | Proceso de instancias; `cryptScene` pide la instancia al servidor |
| **9. Mercado e intercambio** | Vender y comprar entre jugadores | Órdenes, *escrow*, correo, impuestos |
| **10. Carga y despliegue** | Prueba con cientos de bots y una alfa cerrada | §12.2, monitorización, copias de seguridad, TLS |

### 13.1 Refactorizaciones de `src/` (en este orden)

Cada una se puede fusionar por separado y mantiene el juego local funcionando.

**R0. Paquete compartido.**
- Mover `src/sim`, `src/rpg` y los esquemas de `src/data` a `packages/sim-core`
  (o, como primer paso, un `tsconfig` de solo-lógica que prohíba `DOM` en esas
  carpetas, para que el compilador lo garantice).
- La carga de JSON se separa: `sim-core` recibe el `GameData` ya parseado; quien
  lo carga es el cliente (Vite) o el servidor (`fs` o `esbuild`).

**R1. `World` multijugador.**
- `player` → `players: Map<id, Player>` y `character` → por jugador.
- `command*(playerId, …)`.
- `tickPlayer` recorre todos.
- `nextId` inyectable (rango por región).
- Es la más grande: toca casi todo `world.ts` y sus tests. Se puede hacer
  conservando `world.player` como «el primer jugador» para el cliente local.

**R2. Enemigos con varios objetivos.**
- `EnemyContext.player` → `targets()` + tabla de amenaza simple (el último que
  le pegó o el más cercano dentro de la burbuja).
- `hitPlayer(e, at)` → `hit(e, target, at)`.

**R3. Sucesos con destinatario.**
- Cada `GameEvent` lleva posición o `actorId` para que la región decida a quién
  se envía.
- `drainEvents()` sigue igual para el cliente local.

**R4. Sesión en el servidor.**
- `GameSession` pasa al servidor (una por personaje).
- En el cliente, una `NetSession` implementa el mismo `GameSessionApi` enviando
  peticiones y guardando las vistas que llegan.
- La interfaz no cambia: ya existe `fakeSession.ts` como precedente de otra
  implementación del contrato.
- Los métodos síncronos (`equip` devuelve `CommandResult`) necesitarán una
  versión asíncrona u optimista: decisión de la fase 5.

**R5. Celdas.**
- `ZoneDef`/`NavGrid` por celda.
- `SpatialHash` por región.
- A* que cruza celdas.
- Datos del terreno partidos en chunks.

**R6. RNG por flujo.**
- Un `Rng` por sistema y por entidad (botín por participante, IA por enemigo),
  derivado de una semilla.
- Así añadir un jugador no cambia las tiradas de otro, y las repeticiones
  siguen siendo reproducibles.

### 13.2 Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| R1 es grande y el `World` lo tocan otras sesiones a la vez | Conflictos de fusión, regresiones | Hacerlo con el tablero parado o en pasos pequeños detrás de los tests existentes (`tests/rpg/world.test.ts`, `combat.test.ts`) |
| `World` depende de `dt = 1/60` | Comportamiento distinto a 20–30 Hz | Fase 2: test que compare resultados a 60 y 30 Hz |
| Divergencia cliente/servidor (versiones de datos o de código) | Predicción errónea, tirones | Versión de protocolo **y** hash de `data/` en `hello`; rechazo con mensaje claro |
| Coste del A* con muchos jugadores | Ticks largos | Presupuesto por tick, cola, caché de caminos, `worker_threads` |
| Ancho de banda en aglomeraciones | Coste y tirones | Interés por celdas, frecuencia por distancia, máscara de campos, tope por cliente |
| Duplicación económica por fallos a mitad | Economía rota, difícil de deshacer | `ledger` + idempotencia + versiones desde el primer día de la fase 5; escenario D/E de carga |
| Operar servidores (copias, seguridad, caídas) | Tiempo del creador | Empezar con un VPS y una alfa cerrada; documentar el procedimiento |
| El juego deja de funcionar sin conexión | Pruebas y desarrollo más lentos | Mantener el modo local como un «servidor en proceso» (mismo `World`, transporte en memoria, como la PoC) |

---

## 14. Prueba de concepto incluida (`server/`)

| Archivo | Qué hace |
|---|---|
| `server/protocol.ts` | Mensajes binarios, cuantización, validación de entrada, coste del marco WebSocket |
| `server/transport.ts` | Interfaz `Connection`; par en memoria (tests) y WebSocket en `127.0.0.1` (`ws`); cuenta bytes con y sin marco |
| `server/pocServer.ts` | `World` compartido a 60 Hz + capa de avatares con el A* y `stepAlongPath` del juego; cubo de fichas, secuencia, límites; instantáneas delta a 20 Hz con área de interés |
| `server/bot.ts` | Cliente simulado: órdenes al azar con semilla, aplica deltas, predice con el mismo A*, reconcilia |
| `server/runPoc.ts` | `npm run server:poc [-- segundos]`: servidor + 2 bots por WebSocket real; imprime ticks y bytes/s |
| `tests/server/poc.test.ts` | 2 bots en memoria se ven moverse; predicción < 5 cm en paso; < 2 KB/s; prueba de humo con WebSocket real |
| `tests/server/protocol.test.ts` | Ida y vuelta, mensajes mal formados, límite de ritmo, destinos inválidos, área de interés que retira entidades |
| `tsconfig.server.json` | Comprueba `server/` con tipos de Node (incluido en `npm run typecheck`) |

**Limitaciones conocidas:**
- El `World` actual sigue teniendo su jugador único: en la PoC está aparcado
  e invulnerable y no se envía.
- Los avatares conectados son una capa aparte y no pelean.
- Es la forma de R1, no su sustituto.

**Dependencias añadidas (devDependencies, registradas en `PROCEDENCIA.md`):**
- **`ws` 8.18.0:** servidor y cliente WebSocket en Node 20, que no trae servidor
  WebSocket.
- **`@types/ws` 8.5.13:** sus tipos.

No se usa ningún servicio externo; todo escucha en `127.0.0.1`.

---

## 15. Preguntas para el creador

1. **Escala inicial:**
   - ¿Cuántos jugadores a la vez se esperan en la primera versión online:
     amigos (≤ 20), comunidad (≤ 200) o público (miles)?
   - Cambia el alojamiento, la prioridad de las celdas y el número de copias
     del mundo.
2. **Peleas aisladas, visibilidad:** ¿los demás **ven** tu pelea (sólo no
   pueden intervenir) o tu pelea y tu monstruo desaparecen para ellos?
3. **Peleas aisladas, ayudar:**
   - ¿Un desconocido puede **pedir unirse** a tu pelea?
   - ¿O sólo entra tu grupo?
   - ¿Y curarte desde fuera?
4. **¿Qué zonas son «compartidas»** (sin aislamiento)? ¿Sólo mazmorras y jefes
   del mundo, o también eventos y ciudades?
5. **JcJ:** ¿habrá combate entre jugadores? Si no, se simplifica mucho
   (no hace falta compensar la latencia ni validar golpes entre jugadores).
6. **Mercado:**
   - ¿Uno global por copia del mundo, o uno por ciudad, con precios distintos y
     comercio entre ciudades?
   - ¿Precio fijo o pujas?
7. **Copias del mundo:** ¿todos en un único mundo, o está bien tener
   «Servidor 1 / Servidor 2»?
8. **Reconexión:** ¿cuánto tiempo se guarda tu sitio en una mazmorra o pelea si
   se corta la conexión (propuesta: 5 min)?
9. **Región de los jugadores:** ¿desde dónde se jugará (Latinoamérica, España,
   ambos)? Decide dónde alquilar el servidor y la latencia aceptable.
10. **Un jugador sin conexión:** ¿se mantiene un modo sin conexión (tutorial,
    pruebas) o el juego será sólo online?
11. **Correo y recuperación de cuenta:** ¿se acepta un servicio de correo
    externo en el futuro, o la recuperación se hace por otros medios (códigos
    de recuperación guardados al registrarse)?
12. **Moderación:** ¿quién moderará el chat general y de comercio en la alfa?
