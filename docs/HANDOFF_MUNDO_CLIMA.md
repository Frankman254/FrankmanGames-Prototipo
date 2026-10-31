# HANDOFF — Mundo, nombres y clima

Rama `mundo-clima`, sin fusionar en `master` y sin PR. Todos los números y
nombres son **PROPUESTA** y viven en `data/`. No se tomó ninguna decisión
creativa definitiva: los nombres son una propuesta para que el creador elija.

## Objetivo autorizado

Encargo del coordinador según las respuestas del creador:

- Nombres originales con sabor panameño: piedras de viaje, zonas, monstruos, pueblo y cripta.
- Franjas de nivel hasta 100, de 10 en 10, cada una con su familia de monstruos.
- Monstruos en grupos que vuelven a aparecer.
- Día y noche con efecto en el juego.
- Tiempo por zona.
- Mazmorra con llave.

## Qué funciona (y cómo probarlo)

| Qué | Dónde | Cómo probarlo |
|---|---|---|
| **Piedras Pintadas** (antes «zaaps»): mismo comportamiento, nombres y textos nuevos. El menú de viaje grita «¡Sube, sube, que hay puesto!» como un pavo de diablo rojo. | `data/stones.json`, `src/world/stones.ts`, `src/render/stoneView.ts` | `tests/stones.test.ts`. En partida, se toca una piedra y se viaja. |
| **10 franjas**: 1–10 … 90–100. Cinco caben en el mundo de hoy; cinco quedan con `planned` y sin áreas. | `data/zones.json` | `tests/mundoClima.test.ts › franjas y familias` |
| **55 arquetipos nuevos**: 9 familias de 6 (cuerpo a cuerpo, a distancia, invocador, esbirro, élite y nocturno), más el Sato Aullador nocturno de la franja 1. Todos con ficha RPG y asset procedural. | `data/enemies.json` (con `base` + `damageScale`), `data/rpg/enemies.json`, `data/assets.json` | Mismo test |
| **Grupos** de 1 a N miembros (tope por zona). Si uno pelea, todo el grupo va a por el jugador. El grupo vuelve entero tras `respawnSeconds` desde que cae el último. | `src/sim/zones.ts` (`ZonePopulation`) | `› grupos` |
| **Noche**: los monstruos con `"time": "night"` sólo nacen de noche. Al anochecer, el 35 % de los grupos quietos se retira y vuelve con la tabla nocturna. Al amanecer, los nocturnos que no pelean se van. | `src/sim/zones.ts`, `data/weather.json › night` | `› noche` |
| **Pesca nocturna**: de noche el Charco de la Garza usa `nightLootTable`, con el Róbalo de luna y el Pargo trasnochador. | `data/rpg/fishing.json`, `data/rpg/loot.json` | `› noche › pesca` |
| **Tiempo por zona**: despejado, aguacero, solazo y nevada. Los pesos dependen del clima de la zona, el tiempo cambia cada 90–210 s y entra y sale en 8 s. | `src/sim/weather.ts`, `data/weather.json` | `› tiempo por zona` |
| Lluvia: fuego ×0,7. Solazo (sólo de día): fuego ×1,25. | Igual | Igual |
| Nieve (sólo zonas frías): se acumula y frena al jugador hasta un −40 %. | Igual | Igual |
| **Render del tiempo**: partículas de lluvia y nieve alrededor del jugador, luz más apagada o más cálida, niebla y cielo teñido. Al cambiar el tiempo sale un aviso. | `src/render/weatherView.ts`, `src/render/atmosphere.ts` (`weather`) | `npm run dev`. La tecla **Insert** pasa al siguiente tiempo de la zona actual. El texto de depuración muestra el tiempo, su intensidad, la nieve y si es de noche. |
| **Cripta con llave**: sin la Llave de la Tulivieja, no se entra y sale un aviso con lo que falta y dónde conseguirlo. Con llave, se entra y la llave se gasta. | `data/dungeon.json › key`, `src/world/dungeon.ts › useDungeonKey`, `src/scenes/cryptScene.ts` | `› mazmorra con llave` |

Verificación:

- `npm run typecheck`, `npx vitest run` (49 archivos, 402 tests; 27 nuevos en `tests/mundoClima.test.ts`) y `npm run build` en verde.
- Revisión visual rápida en Vite (panel del navegador): se ven el aguacero y el solazo en los Llanos de Azuero, con su aviso y la luz cambiada.
- **No se vio la nieve** en pantalla: hay que ir a la Cumbre del Barú. Queda para la revisión en Electron.

## Glosario de nombres (PROPUESTA)

### Piedras de viaje y lugares

| Antes | Ahora | Por qué |
|---|---|---|
| Zaap (término de DOFUS) | **Piedra Pintada** | Por la Piedra Pintada de El Valle de Antón (petroglifos) |
| Zaap del Cruce | Piedra Pintada de Villa Raspadura | |
| Zaap del Estanque | Piedra Pintada del Charco de la Garza | |
| Zaap del Barranco | Piedra Pintada del Bajareque | |
| Zaap de la Hondonada | Piedra Pintada de Cerro Punta | |
| Aldea del Cruce | **Villa Raspadura** | Por la raspadura, el dulce de panela |
| Cripta del Cruce | **Cripta de la Tulivieja** | Por la Tulivieja, leyenda panameña |
| Estanque del prado | Charco de la Garza | |

### Zonas (franja · clima · familia)

| Franja | Zona (id) | Clima | Familia | Estado |
|---|---|---|---|---|
| — | Villa Raspadura (`raspadura`) | caliente | — (segura) | colocada |
| 1–10 | Llanos de Azuero (`azuero`) | caliente | Satos, duendes y curanderos | colocada (antes Prados) |
| 10–20 | Manglares de Chame (`chame`) | caliente, lluviosa | Cangrejos, garzas y chitras | colocada (antes Pradera) |
| 20–30 | Cerros de Boquete (`boquete`) | templada, bajareque | Cafetal | colocada (antes Barranco) |
| 30–40 | Neblinas de Cerro Punta (`cerro_punta`) | fría | Saínos, freseros y neblina | colocada (antes Hondonada) |
| 40–50 | Cumbre del Barú (`baru`) | fría, nieva | Jaguares y volcán | colocada (antes Páramo) |
| 50–60 | Darién Profundo (`darien`) | caliente | Selva | `planned` |
| 60–70 | Archipiélago de Bocas (`bocas`) | caliente | Ranas, piratas y sirenas | `planned` (en lancha) |
| 70–80 | Archipiélago de las Perlas (`perlas`) | caliente | Ostras, pescadores fantasma | `planned` (en barco) |
| 80–90 | Páramo de Fortuna (`fortuna`) | fría | Ventiscas | `planned` (en globo) |
| 90–100 | Cerro Ancón Embrujado (`ancon`) | templada | Espantos de la parada del bus | `planned` |

### Monstruos

**Franja 1, renombrados** (los ids no cambian):

| id | Nombre |
|---|---|
| `melee` | Sato Cimarrón |
| `alpha_wolf` | Sato Jefe de la Jauría |
| `ranged` | Duende Tirapiedras |
| `goblin_veteran` | Duende Tirapiedras Veterano |
| `summoner` | Curandero de Huesos |
| `minion` | Diablico Sucio (por los diablicos del Corpus) |
| `grave_brute` | Matón de la Tulivieja |
| `crypt_warden` | El Sacristán Sin Cabeza |
| `ash_alpha` | Tigrillo de Ceniza |
| `night_sato` (nuevo, nocturno) | Sato Aullador de Medianoche |

**Familias nuevas** (orden: cuerpo a cuerpo · a distancia · invocador · esbirro · élite · nocturno):

| Zona | Familia |
|---|---|
| Chame | Cangrejo Machetero · Garza Flechera · Brujo del Manglar · Chitra Picadora · Cangrejo Abuelo · Caimán Trasnochador |
| Boquete | Recolector de Café Rabioso · Quetzal Cascarrabias · Bruja del Bajareque · Gotita de Bajareque · Capataz del Cafetal · Búho Chismoso |
| Cerro Punta | Saíno Escarchado · Fresero Francotirador · Chamán de la Neblina · Jirón de Neblina · Saíno Mayor de la Fría · Espanto de la Neblina |
| Barú | Jaguar Friolento del Barú · Vigía del Cráter · Hechicero del Volcán · Brasita Saltarina · Gran Jaguar del Barú · Abominable Turista del Barú |
| Darién | Ñeque Guerrero · Cerbatanero del Tapón · Brujo del Tapón · Zancudo Tamaño Familiar · Águila Harpía Real · Macho de Monte Insomne |
| Bocas | Rana Dorada Venenosa · Pirata de Isla Colón · Sirena Desafinada · Aguamala Pegajosa · Capitán Calipso · Marinero Ahogado |
| Perlas | Ostra Mordelona · Pescador Fantasma de las Perlas · Bruja de las Perlas · Perla Rodante · Tiburón Martillo Patrón · Calamar Gigante Madrugador |
| Fortuna | Ventarrón Andante · Arquero de la Ventisca · Brujo Escarchado de Fortuna · Copito Malcriado · Coloso del Embalse · Coyote de la Helada |
| Ancón | Diablo Rojo Desbocado · Pavo Gritón · Tulivieja Mayor · Alma en Pena de la Parada · El Chofer Sin Frenos · Mono Tití Trasnochado |

### Objetos y tiempo

- **Objetos nuevos**: Llave de la Tulivieja, Róbalo de luna, Pargo trasnochador.
- **Tiempos**: Despejado, Aguacero, Solazo, «Nevada (¡en Panamá!)».
- Los textos de misiones y PNJ que hablaban de lobos y goblins ahora dicen satos y duendes. Los ids no cambian.

## Mediciones y cifras de referencia

### Reaparición de grupos

Propuesta de 30, 45, 60, 90, 120, 150, 180, 240, 300 y 360 s, de la franja 1 a la 10.

Por qué: en los MMO de referencia los monstruos de nivel bajo vuelven en menos
de un minuto, para que nadie espere al empezar. Los de nivel alto tardan
minutos, para que no se puedan explotar. Es un orden de magnitud, no una tabla
copiada. Un test exige que el tiempo crezca con la franja.

### Llave de la Tulivieja

Probabilidad de que caiga por monstruo muerto:

| Monstruo | Probabilidad |
|---|---|
| Sato Cimarrón | 3,9 % |
| Duende Tirapiedras | 4,2 % |
| Curandero de Huesos | 12,3 % |
| Sato Jefe | 11,4 % |
| Duende veterano | 11,9 % |

Sale más o menos una llave cada 15 muertes. También puede salir en los cofres
de la cripta, que usan esas tablas.

### Escala de las familias altas

Se calcula con las curvas de `data/zones.json`. Un monstruo de familia vale lo
mismo que su padre escalado a ese nivel.

- A nivel 97 la curva da unas 480 000 de vida y un daño ×1666.
- La curva de hoy se dispara a partir de ~40, y el nivel máximo del jugador es 20 (`data/rpg/progression.json`).
- Las franjas 50–100 son datos listos, no equilibrio.

### Rendimiento

- Monstruos vivos en el mundo: 42, como antes. La densidad no cambió.
- FPS sin medir: el panel del navegador estaba en segundo plano.
- Las partículas tienen como tope 4000 de lluvia y 3000 de nieve. Hay que medirlo con `npm run bench:electron`.

## Decisiones técnicas tomadas (PROPUESTA)

- **Multiplicador de daño del tiempo sin tocar `src/sim/damage.ts`.**
  - Se aplica en `World` (`weatherScaled`), justo después de `levelScaled` (el gancho que ya existía para la diferencia de nivel).
  - Lo usan `dealDamage` y `hitPlayer`.
  - Cuenta el tiempo de la zona en la que está el jugador.
  - Los estados de daño por tiempo (quemadura) pasan por `dealDamage` sólo si `src/rpg/effects.ts` lo llama. No se tocó.
- **Cambios en `src/sim/world.ts`**, acotados (+60 líneas):
  - `timeOfDay`, `night` y `weather`.
  - Opción `timeOfDay`.
  - Los 4 ganchos nuevos de la población: `isEngaged`, `wake`, `despawn` e `isNight`.
  - `weatherScaled`.
  - La velocidad del jugador con nieve.
  - La tabla nocturna al sacar un pez.
  - `weather.tick`.
- **El reloj es el de la atmósfera.**
  - `main.ts` copia la hora al mundo en cada fotograma.
  - Las teclas F2 y F3 de depuración siguen moviendo las dos cosas.
  - Al crear un mundo nuevo (reaparecer, salir de la cripta) se le pasa la hora para poblar ya con nocturnos.
- **`damageScale` en `data/enemies.json`.**
  - Multiplica el daño del básico y de todos los hechizos (propios o heredados).
  - Así una familia hereda los hechizos de su padre con el daño de su nivel sin repetirlos.
  - Es un cambio mínimo en `parseEnemies`.
- **Los nocturnos no se ven afectados por la nieve**, sólo el jugador. «Los monstruos de tierra fría están acostumbrados».
- **El Tigrillo de Ceniza (`ash_alpha`) ya no sale en ninguna zona.**
  - Su nivel base es 5 y su botín lleva la llave.
  - Sigue en la arena y en los tests de diferencia de nivel.
- **Botín de las franjas altas.** Cinco tablas nuevas (`high_*`): copias de las de la franja 1, sin la llave y con más oro.

## Propuesta: mundo grande que carga al andar, con barcos y globos (no implementado)

1. **Trozos de mundo.**
   - El mundo continuo se parte en trozos de 128 × 128 m, con su terreno, vegetación, rejilla de navegación y zonas.
   - Se cargan los 3 × 3 trozos alrededor del jugador y se descargan los lejanos, con margen para que no parpadee.
   - `ZoneMap` ya funciona por áreas absolutas: sólo hace falta que `ZonePopulation` muestree por trozo.
2. **Simulación.**
   - Un `World` por región cargada, o un `World` con rejilla por trozos y coordenadas absolutas. La rejilla de hoy es una sola de 256 × 256 m.
   - Los monstruos de los trozos descargados no existen. Se vuelven a poblar al cargar, como hoy al crear el mundo.
3. **Lugares lejanos**, con datos ya preparados (`planned`):
   - Bocas: en lancha desde el Charco de la Garza.
   - Perlas: en barco desde un muelle al sur de Villa Raspadura.
   - Fortuna: en globo desde el Barú.
   - Ancón: en diablo rojo desde las Piedras Pintadas mayores.
   - Darién: a pie, al este del Barú.
   - Cada viaje sería una «ruta» (`data/routes.json`) con un punto de embarque, un destino, un precio y una escena de transición (ver el barco mientras carga la región).
4. **En línea.** El servidor sería dueño de los trozos activos por jugador. Encaja con el documento de arquitectura en línea de la otra sesión.

## Incertidumbres que bloquean el siguiente paso

- **Equilibrio de 50–100.** Las curvas de escalado se disparan y el nivel máximo del jugador es 20. Hace falta decidir el techo de nivel y las curvas antes de colocar esas zonas.
- **Posibles conflictos al fusionar** con otras sesiones:
  - `data/rpg/loot.json`: la llave en 5 tablas, 5 tablas `high_*` y la tabla de pesca nocturna. Muerte y botín podría tocarlo.
  - `src/data/schema.ts`: `damageScale`. Combate podría tocarlo.
  - `src/rpg/content.ts`: `nightLootTable`.
  - `src/ui/menus/index.ts`: `pickStone` y los textos de la piedra. Mapa y HUD podría tocarlo.
  - `src/main.ts`.
- **Mapa y HUD.** No se tocó `hud.ts` ni `worldHud.ts`. El tiempo y la noche sólo se ven con avisos y en el texto de depuración.
  - Propuesta para mapa y HUD: un icono de tiempo junto al nombre de la zona.
  - Se lee con `world.weather?.kindAt(world.weatherZone())` y `world.night`.
- **Guardado.** La clave de las piedras pasa a `frankmangames.piedras.<nombre>`. Los ids son otros, así que el progreso de las piedras guardado con los zaaps se pierde: sólo la de casa queda conocida.

## Preguntas para el creador

1. **Nombres.** ¿Te gustan «Piedra Pintada», «Villa Raspadura» y «Cripta de la Tulivieja»? ¿Algún nombre de monstruo cruza la línea del humor (por ejemplo «Diablo Rojo Desbocado», «Pavo Gritón» o «Abominable Turista del Barú»)?
2. **Nieve en Panamá.** La Cumbre del Barú y Cerro Punta nievan «porque es un juego». ¿Vale, o prefieres llamarla «helada» o «escarcha»?
3. **Llave.** ¿Se gasta al entrar (hoy) o hay un «llavero» permanente que se gana una vez? ¿La sueltan sólo los monstruos de esa franja?
4. **Grupos.** ¿El tope por zona (3 en Azuero, 6 en el Barú) te parece bien? ¿Los grupos deberían pasear juntos o quedarse quietos como ahora?
5. **Noche.** ¿Cuánto tiene que notarse? Hoy, al anochecer, un 35 % de los grupos cambia a la tabla nocturna.
6. **Nivel máximo.** ¿Llega a 100 el jugador? Eso decide las curvas antes de colocar las zonas de 50 a 100.
7. **Viajes lejanos.** ¿Barco, globo o los dos? ¿Y el «diablo rojo» como transporte de broma para el final?

## Archivos principales

- **Datos:** `data/zones.json`, `data/weather.json` (nuevo), `data/stones.json` (antes `zaaps.json`), `data/enemies.json`, `data/rpg/enemies.json`, `data/assets.json`, `data/rpg/loot.json`, `data/rpg/items.json`, `data/rpg/fishing.json`, `data/dungeon.json`, `data/rpg/quests.json` y `data/rpg/npcs.json` (sólo textos).
- **Lógica:** `src/sim/zones.ts` (grupos, noche), `src/sim/weather.ts` (nuevo), `src/sim/world.ts`, `src/world/stones.ts`, `src/world/dungeon.ts` (`useDungeonKey`).
- **Esquemas:** `src/data/zonesSchema.ts`, `src/data/weatherSchema.ts` (nuevo), `src/data/schema.ts` (`damageScale`), `src/data/dungeonSchema.ts` (`key`), `src/rpg/content.ts` (`nightLootTable`).
- **Render y escena:** `src/render/weatherView.ts` (nuevo), `src/render/atmosphere.ts`, `src/render/stoneView.ts`, `src/scenes/cryptScene.ts`, `src/main.ts`.
- **Tests:** `tests/mundoClima.test.ts` (nuevo), `tests/stones.test.ts`, y ajustes de ids en `tests/zones.test.ts`, `tests/editor.test.ts` y `tests/balance/zones.test.ts`.
