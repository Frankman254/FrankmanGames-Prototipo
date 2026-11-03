# HANDOFF — Slice 03, parte A (sistemas)

Rama: `slice03-sistemas` (desde `master` 9fde1c8). Hecho en la nube; sin push a
`master`. No se abrió Electron: verificación con `npm test`, `npm run
typecheck` y capturas en Chromium headless.

- **Objetivo autorizado:** parte A del Slice 03 (`docs/ALCANCE_SLICE_03.md`):
  lógica OOP de clases, hechizos, estados, objetos, sets, inventario, equipo,
  mascotas, botín, XP y guardado en `src/rpg/`; contenido en `data/rpg/`; e
  integración con la simulación del Slice 01. Autorizado por el creador el
  2026-10-29 («hazlo a tu manera, yo después lo reviso»).

- **Qué funciona (con cómo probarlo):**
  - `npm test` → **135 tests en verde** (79 nuevos en `tests/rpg/`; los 56 del
    Slice 01 adaptados sin quitar ninguno). `npm run typecheck` → limpio.
  - `npm run dev` → arena con la **Vanguardia de Brasa**; `?class=storm_weaver`
    en la URL (o `npm run dev:web` y abrir `http://localhost:5173/?class=storm_weaver`)
    para la **Tejedora de Tormentas**. Controles provisionales (la rama B los
    sustituye por `data/ui/keybindings.json`):
    - Clic en el suelo = moverse; clic en enemigo = ataque básico **con el arma
      equipada** (alcance, cadencia y elemento del arma; varita y orbe disparan).
    - **1–6** = hechizos de la barra. **Espacio** = evasión. **R** reinicia la
      arena conservando el personaje. **T** telemetría. **F6/F7/F8** prueba de
      carga (20/200/quitar), como pide el alcance.
    - Clic sobre un botín = ir a recogerlo; se recoge solo al pasar dentro del
      radio de recogida (`pickupRadius`).
    - Consola en dev: `__game.session` es la `GameSessionApi` real
      (`__game.session.useItem(uid)`, `.equip(uid)`, `.save()`…). El kit inicial
      trae el amuleto de una mascota: `__game.session.useItem(<uid del amuleto>)`.
  - **Lógica (`src/rpg/`)**
    - `stats.ts` — `StatSheet`: fuentes `class`, `level`, `points`,
      `item:<uid>`, `set:<id>`, `status:<id>`, `pet:<id>` y `derived:<primaria>`
      (vitalidad → vida, espíritu → recurso y regeneración, agilidad → crítico;
      reglas en datos). `valor = Σflat · (1 + Σ%/100)` con desglose para el tooltip.
    - `actor.ts` — `Entity → Actor` (vida, hoja, estados, escudos) →
      `Character` (`character.ts`), `EnemyActor` (`enemy.ts`, envuelve el
      enemigo de la simulación), `Pet` (`pets.ts`).
    - `effects.ts` — `Effect` abstracto + registro `EFFECT_TYPES` (tipo →
      subclase): `DamageEffect`, `HealEffect`, `StatusEffect`, `ShieldEffect`,
      `KnockbackEffect`, `DashEffect`, `TeleportEffect`,
      `RestoreResourceEffect`, `SummonEffect` y `ZoneEffect` (añadido). Los
      efectos piden al `EffectContext` (el `World`, o la sesión fuera de
      combate) que aplique: se testean con un contexto falso.
    - `status.ts` — `StatusSet`: acumulaciones con tope, refresco, tick
      periódico (uno por acumulación), escudos que absorben, control
      (aturdido > inmovilizado > silencio).
    - `items.ts` — `ItemFactory` (uid + tiradas por copia), `Inventory`
      (apilar, mover/intercambiar/fusionar, ordenar, quitar parte de una pila),
      `Equipment` y bonos de set.
    - `progression.ts` — `xpToNext`, subida de varios niveles, botín ponderado.
    - `spells.ts` — `Spellbook` (aprender / subir rango / tope; barra con
      intercambio) y hechizos compilados por rango.
    - `session.ts` — `GameSession implements GameSessionApi` y
      `RpgSessionFactory implements GameSessionFactory`. Guardar/cargar con
      `SaveData` (ida y vuelta probada, descarta ids que ya no existan).
    - `content.ts` — carga y validación de `data/rpg/*.json` con rutas de campo
      y referencias cruzadas (hechizo → estado, objeto → set/hechizo/mascota,
      tabla → objeto, ficha de enemigo ↔ arquetipo).
  - **Contenido (`data/rpg/`, todo PROPUESTA, nombres originales)**: 2 clases
    con 6 hechizos cada una; 4 hechizos universales con su pergamino; 10
    estados (quemadura, ralentizado, inmovilizado, aturdido, escudo, grito de
    hierro, piel de piedra, regeneración, prisa, carga estática); 37 objetos (6
    armas, 12 armaduras con los sets «del Explorador» (4) y «del Aprendiz de
    Tormenta» (3), 4 joyas, 4 consumibles, 4 pergaminos, 3 amuletos de mascota,
    4 materiales); 3 mascotas (zorro de ceniza, búho archivero, tortuga de
    musgo) + el lobo espectral del hechizo; 6 tablas de botín; fichas RPG de los
    4 arquetipos (Lobo de pradera, Hostigador goblin, Chamán de hueso,
    Diablillo de hueso) y de **2 variantes por datos** (`base` en
    `data/enemies.json`): Lobo alfa y Hostigador veterano, añadidas al encuentro.
  - **Integración (`src/sim/`)**
    - `world.ts`: el jugador es el `Character` (vida/recurso son accesores a él;
      velocidad, regeneración y reducción de enfriamiento salen de su hoja). La
      barra 1–6 sustituye a `basic`/`cheap`/`cone`; `data/abilities.json` se
      eliminó y `data/player.json` sólo guarda la evasión. Formas: `self`,
      `single`, `circle` (centrado o en el punto apuntado), `cone`, `line`;
      proyectiles con retraso; estados, control y ralentización sobre
      enemigos; zonas persistentes; aliados invocados; XP y botín una sola vez
      por muerte; botín al suelo con tiempo de vida; la mascota activa sigue al
      amuleto activo del personaje.
    - `damage.ts`: tubería del alcance (`resolveHit`), también para los golpes
      enemigos (elemento de su ficha) y de mascotas. Nunca falla; mínimo 1.
    - `combat.ts`: `CastBlock` gana `empty`, `unknown` y `control`.
    - `events.ts`: sucesos nuevos (`heal`, `status`, `lootDrop`, `lootPickup`,
      `xp`, `levelUp`, `petSpawn`, `teleport`); la telemetría los ignora.
  - **Render**: `src/render/lootView.ts` (nuevo): botín (cubo del color de la
    rareza, disco dorado = monedas, pickable), mascotas/aliados (esferas) y
    zonas (disco translúcido).

- **Mediciones (FPS/frame time con N entidades, latencia de clic):**
  - No se midió FPS en Electron (nube sin ventana). Pendiente en el PC.
  - Nube, Node 20: encuentro completo (7 enemigos + esbirros, mascota, 90 s
    simulados lanzando la barra): tick medio 0,026 ms / p95 0,071 ms
    (Vanguardia) y 0,015 / 0,027 ms (Tejedora); ambas limpian la arena y suben a nivel 2.
  - `npm run bench:sim` (200 perseguidores): 1,0 ms medio / 2,7 ms p95; `master`
    en la misma máquina y momento: 0,87 / 3,1 ms. Mismo orden de magnitud.
  - Chromium headless (SwiftShader): las dos clases cargan sin errores de
    consola; botín, mascota, barra de 6 huecos con barrido y registro de XP visibles.

- **Decisiones técnicas tomadas y por qué (PROPUESTA):**
  - **A quién va cada efecto**: daño, empuje y perjuicios → a cada objetivo
    alcanzado; curación, escudo, mejoras, carga, teletransporte, recurso,
    invocación y zona → al lanzador una vez. Lo decide la subclase
    (`Effect.targeting`), no el hechizo; así los datos no repiten el destino.
  - **Orden de efectos** = orden en los datos; los objetivos se calculan antes
    (Embestida golpea en la línea y luego desplaza).
  - **Sets acumulativos**: con N piezas se aplican todos los escalones ≤ N.
  - **Peso de botín** = peso de la entrada × `dropWeight` del objeto.
  - **Ataque básico** = hechizo implícito del arma: `cooldown = 1/speed`, sin
    GCD ni coste, `scaling` común (`basicScaling`); con alcance > 3 m dispara un
    proyectil. Sin arma, `rules.unarmed`. La reducción de enfriamiento no lo acelera.
  - **Reducción de enfriamiento** con tope del 50 %.
  - **Aturdido** congela la máquina de estados del enemigo (también su aviso:
    al terminar el aturdimiento el aviso sigue donde estaba); **inmovilizado**
    pone su velocidad a 0. El jugador aturdido no se mueve ni lanza; inmovilizado
    no se mueve ni evade.
  - **Reinicio de arena** conserva el personaje (nivel, objetos) y le devuelve
    vida y recurso; el botín del suelo y los aliados no pasan a la arena nueva.
  - **Las mascotas no reciben golpes** (los enemigos sólo apuntan al jugador);
    `PetView.health` muestra su vida máxima.
  - **Recolector**: el búho ignora botín que no cabe en el inventario. La
    recogida automática también; el clic sobre un objeto que no cabe lo deja en
    el suelo y avisa «Inventario lleno» (suceso `message` de la sesión).
  - **Kit inicial**: cada clase empieza con sus 6 hechizos en la barra, su
    arma y una pieza de armadura equipadas, 3 pociones y el amuleto de una
    mascota (para poder probar mascotas sin farmear).
  - Valor de venta = `value × rarityValue × sellRatio × (0,75 + 0,5 · calidad de tiradas) × cantidad`.
  - Los enemigos usan el elemento de su ficha y sus resistencias; su vida y
    daño siguen en `data/enemies.json`; su nivel sólo es informativo.
  - Iconos: emoji Unicode provisionales en los datos (texto, no assets).

- **Cambios en `src/rpg/contracts.ts` (sólo añadidos):**
  1. `ClassDef.mainStat?: PrimaryStat` — estadística que multiplica `scaling`.
  2. `EffectDef` gana `{ type: 'zone'; radius; duration; every; effects }`
     (Campo estático). Si la interfaz hace un `switch` exhaustivo sobre
     `EffectDef['type']`, necesita este caso.
  3. Se documenta que en `summon`, `archetype` es el id de un `PetDef`.
  4. `PetDef.maxHealth?` y `PetDef.reach?`.
  5. `EnemyInfoDef` (ficha RPG de enemigo) y `GroundLootView` (botín del suelo).
  - `RpgContent extends ContentDb` (en `src/rpg/content.ts`, no en el
    contrato) añade `enemies` y `rules`. `GameSession.content` es `RpgContent`,
    así que satisface `ContentDb`.

- **Archivos fuera del reparto que se tocaron (avisar a la rama B):**
  - `src/main.ts` (de la rama B): montaje **provisional** de la sesión, teclas
    1–6, F6/F7/F8, clic sobre botín y `LootView`. La rama B puede sustituirlo
    al montar los menús: basta con crear la sesión con `RpgSessionFactory`,
    pasar `session.character` a `new World(...)` y llamar a `session.attach(world)`.
  - `src/ui/hud.ts` (sin dueño en el reparto): huecos `slot1..slot6` que leen
    la barra del personaje y textos de bloqueo nuevos. El HUD definitivo es de la rama B.
  - `src/sim/enemies.ts` (no estaba en la lista): campo `frozen` (aturdido) y
    retroceso con `e.speed` en vez de la velocidad del arquetipo (para que
    ralentizar/inmovilizar funcione). Tres líneas.
  - `src/sim/events.ts`, `data/enemies.json`, `data/encounter.json`,
    `data/player.json`, `data/abilities.json` (eliminado).

- **Incertidumbres que bloquean el siguiente paso:**
  - Ninguna bloquea la unión. Para el coordinador / creador:
    - ¿Recurso por clase (Vigor/Maná) o universal? Hoy por clase (prueba de
      `PEND-COMBATE-002`); los hechizos universales cuestan lo mismo en las dos,
      lo que pesa más en el Vigor (60) que en el Maná (140).
    - ¿Los sets acumulan escalones o sólo cuenta el mayor?
    - ¿Las mascotas deben poder morir? (Hoy no reciben golpes.)
    - El render existente dibuja el destello de los hechizos centrado en el
      jugador; el Campo estático (círculo en el punto apuntado) se ve en su
      sitio sólo como zona de `LootView`. No se tocó `arenaView.ts` (fuera del reparto).
    - Equilibrio sin probar a mano: daño, vida, XP (nivel 2 al limpiar la
      arena), frecuencia de botín.

- **Archivos principales:**
  - Lógica: `src/rpg/{stats,actor,status,effects,items,progression,spells,character,enemy,pets,session,content}.ts`.
  - Datos: `data/rpg/{classes,spells,statuses,items,sets,pets,loot,enemies,progression}.json`.
  - Integración: `src/sim/{world,damage,combat,events,enemies}.ts`, `src/data/{index,schema}.ts`.
  - Render: `src/render/lootView.ts`. Montaje provisional: `src/main.ts`, `src/ui/hud.ts`.
  - Tests: `tests/rpg/*.test.ts` (+ `tests/{combat,enemies,session,world}.test.ts` adaptados).

- No se tomó ninguna decisión creativa: nombres, números y reglas son
  PROPUESTA para que el creador los revise.
