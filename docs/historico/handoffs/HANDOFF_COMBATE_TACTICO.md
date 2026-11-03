# HANDOFF — Combate táctico

- **Rama:** `combate-tactico` (sale de `master` en `9cd8076`). No se fusionó ni se abrió PR.
- **Objetivo autorizado:** más táctica sin que el combate sea «pegar y pegar», según
  las respuestas del creador (2026-10-31):
  - «las trampas son hechizos pero con trigger: lo pisas y se activa, y es invisible»;
  - «como en Dofus te descuadran los PM, te hacen saltar turno; podemos extrapolarlo,
    que no duren mucho, ya calibraremos»;
  - placaje y bloqueo: «podríamos experimentar ambos modos y ver cómo se sienten».

## Qué funciona (y cómo probarlo)

Todo se verifica con `npx vitest run tests/combateTactico.test.ts` (21 tests) y el
resto de la batería (`npm run typecheck`, `npx vitest run` → 535 tests,
`npm run build`, todo en verde). En la nube no se puede abrir Electron: **la revisión
visual de los anillos de trampa y de la opción nueva queda pendiente en local**.

### 1. Trampas invisibles

- Efecto nuevo `trap` (`src/rpg/effects.ts` → `TrapEffect`, datos en
  `data/rpg/spells.json`): pone una trampa en el punto apuntado (círculo `atTarget`) o a
  los pies (`self`). Se dispara cuando un **rival** la pisa y le aplica sus efectos
  (daño, estado, empuje, atracción; el empuje aparta del centro de la trampa).
- Reglas en `data/rpg/tactics.json` → `traps`: `armSeconds` (tarda en armarse),
  `maxActive` por lanzador (la más vieja desaparece) y `minSpacing` con cualquier
  trampa del mismo bando (si no cabe, el lanzamiento se bloquea con `trapSpacing` sin
  gastar nada). Cada efecto puede llevar su propio `maxActive`/`minSpacing`, y siempre
  su `duration`. Las trampas de un lanzador muerto desaparecen.
- Visibilidad: `World.visibleTraps(bando)`. El bando propio la ve (el render la pinta
  como un anillo tenue del color del elemento); el rival no, salvo revelada (anillo
  rojizo que late). Al ponerla no suena nada (el rival no debe oírla); al saltar sí.
- **Revelar:** efecto `reveal` y hechizo universal **Polvo vidente** (`seer_dust`,
  pergamino `scroll_seer_dust`, nivel 2, en la botica): revela 6 s las trampas rivales
  a ≤ 10 m.
- Hechizos de trampa del jugador: **Lazo de zarzas** (`bramble_snare`, pergamino
  universal, nivel 3: daño de tierra + enredado) y **Brasa enterrada** (`ember_mine`,
  Vanguardia nivel 2: fuego + empuje + agotamiento).
- Enemigo: arquetipo nuevo **Trampero del Matorral** (`trapper` en `data/enemies.json`,
  variante de `ranged`, aparece en Llanos de Azuero). Su ataque `effect: "trap"` deja un
  cepo invisible a sus pies mientras retrocede (daño + enredado); no lo usa si no cabe
  otra trampa allí. Aviso (telegraph) a sus pies: quien mira con atención sabe dónde
  la dejó.

### 2. Controles en tiempo real

Campo nuevo `hinder` en los estados (`data/rpg/statuses.json`); lógica pura en
`src/rpg/hinder.ts`:

| Estado | Familia | Qué hace |
|---|---|---|
| `weariness` «Agotamiento» | exhaust | −12 % velocidad y +15 % de enfriamiento por acumulación (×3 como mucho; frenado con tope `cooldownSlowCap` = 60 %) |
| `dazed` «Embotado» | daze | el próximo lanzamiento tarda +0,6 s o falla (35 %); se consume al lanzar. Si falla: no gasta recurso ni enfriamiento, sí un GCD corto |
| `disoriented` «Desorientado» | disorient | sin hechizos de desplazamiento (dash, teleport, blink, recoil, swap); los enemigos no retroceden |

- Duraciones cortas (2,5–3 s) y **rendimientos decrecientes por familia y objetivo**:
  dentro de `window` (10 s) desde el último intento, la n-ésima aplicación dura
  `factors[n]` (1, 0,5, 0,25 y 0 = inmune un rato; suceso `hinderResisted`).
- **Estadística nueva `slowResist`** («Resistencia a los controles»): acorta esas
  duraciones un %, con tope `slowResistCap` (60 %). Sale en la hoja de personaje
  (grupo Movimiento) y la dan las **Tobilleras de junco** (`reed_anklets`, herrera).
- Hechizos del jugador: Viento plomizo (`leaden_gale`, Tejedora nivel 2, agota),
  Pomazo (`stunning_pommel`, Vanguardia nivel 6, embota), Silbo de vértigo
  (`vertigo_whistle`, Tejedora nivel 4, desorienta) y Brasa enterrada (agota).
- Enemigos: el Trampero tiene uno de cada (Boleadoras agota, Polvo de pimienta embota,
  Grito desorientador desorienta). En los enemigos el agotamiento frena sus
  enfriamientos, el embotamiento alarga o anula su aviso y la desorientación les
  impide retroceder.
- Bloqueos nuevos de lanzamiento (`CastBlock`): `dazed`, `disoriented`, `trapSpacing`.

### 3. Placaje y bloqueo: dos modos experimentales

`GameOptions.lockMode` (`'free'` por defecto) en **Opciones → Juego → Placaje
(experimental)**; `World.lockMode` lo lleva cada mundo nuevo (`src/main.ts`). Modos en
`src/sim/lock.ts`, cifras en `data/rpg/tactics.json` → `lock`:

- **A, «Bloqueo de cuerpo» (`body`):** el jugador no atraviesa enemigos (ya antes los
  enemigos no atravesaban al jugador), los enemigos no atraviesan mascotas y las
  mascotas se apartan del jugador. Separarse **andando** de un rival pegado
  (≤ `adjacentReach` = 1,2 m entre bordes) aplica `body_lock` «Trabado»: −35 %
  velocidad 1,2 s.
- **B, «Libre» (`free`):** como antes (el jugador se abre paso), más un placaje pequeño
  al **empezar** a alejarse de un rival pegado: `tackled` «Placado», −30 % 0,4 s, una
  vez por contacto.
- Vale en los dos sentidos: un enemigo que se separa andando del jugador (p. ej. el
  tirapiedras al retroceder) también queda trabado o placado.
- Los desplazamientos de hechizo (blink, teletransporte, carga…) **no** cuentan como
  andar: son la forma de zafarse sin pagar el placaje (salvo desorientado).

## Mediciones

- No se midió FPS (sin GPU en la nube). Coste añadido por tick: un recorrido de las
  trampas × rivales y otro de enemigos pegados al jugador; despreciable con las
  poblaciones de hoy.
- Tests: 535 en verde (21 nuevos en `tests/combateTactico.test.ts`).

## Decisiones técnicas tomadas y por qué (PROPUESTA)

- Todas las cifras viven en datos (`tactics.json`, `statuses.json`, `spells.json`,
  `enemies.json`, `items.json`) y son PROPUESTA para calibrar.
- Los controles son estados con `hinder`, no un tipo de control nuevo: así reutilizan
  iconos, tooltips, inmunidad, barridos y aspecto (`data/fx.json`).
- `slowResist` sólo afecta a los controles con `hinder` (no a ralentizado, enredado
  ni aturdido, ni a los estados de placaje). Si el creador quiere que afecte a todo lo
  que frena, es cambiar una condición en `World.applyStatus`.
- La ventana de rendimientos decrecientes cuenta desde el último intento (también si
  salió inmune): encadenar el mismo control alarga la inmunidad.
- El embotamiento afecta también al ataque básico (es «el próximo lanzamiento»).
- Al fallar por embotamiento no se paga coste ni enfriamiento: se pierde el momento.
- Los enemigos ignoran las trampas del jugador (no las esquivan): la IA no «ve».
- En modo cuerpo las mascotas se apartan del jugador en vez de bloquearlo, para no
  atascarlo con su propia mascota en pasillos.
- Hechizos de clase nuevos con nivel y elemento elegidos para cumplir la regla de
  progresión (alternar elemento, un desbloqueo por nivel): Brasa enterrada (2),
  Viento plomizo (2), Silbo de vértigo (4, físico), Pomazo (6).
- `tests/zones.test.ts` («repone el grupo…»): el grupo vuelve con otra tirada de
  tamaño (ya lo decía `zones.ts`); pasaba por suerte de semilla y, con la entrada nueva
  del Trampero en la tabla, el RNG cambió. Ahora comprueba que vuelve un grupo
  (entre 1 y lo que falta) en vez de exactamente el mismo número.

## Incertidumbres que bloquean el siguiente paso

- Ninguna bloquea. Para calibrar en local: ¿se notan los dos modos de placaje? ¿los
  anillos de trampa propios son demasiado tenues o demasiado visibles? ¿el Trampero
  resulta injusto (aviso a sus pies como única pista)?
- ¿`slowResist` debería acortar también ralentizado, enredado y los estados de placaje?
- Online/cooperativo: hoy «el bando» es `player`/`enemy`; con varios jugadores las
  trampas propias deberían verlas todos los aliados (ya funciona así, por bando) y el
  placaje entre aliados no existe.

## Archivos principales

- `src/sim/world.ts` (trampas, revelar, embotamiento, desorientación, placaje),
  `src/sim/enemies.ts` (ritmo de enfriamiento, aviso embotado, sin retroceso,
  ataque `trap`), `src/sim/lock.ts`, `src/rpg/hinder.ts`, `src/rpg/effects.ts`
  (`TrapEffect`, `RevealEffect`), `src/rpg/contracts.ts` (`trap`, `reveal`, `hinder`,
  `slowResist`), `src/rpg/content.ts` (validación y `tactics.json`),
  `src/data/schema.ts` (ataque enemigo `trap`).
- Datos: `data/rpg/tactics.json` (nuevo), `data/rpg/statuses.json`,
  `data/rpg/spells.json`, `data/rpg/items.json`, `data/rpg/merchants.json`,
  `data/enemies.json`, `data/rpg/enemies.json`, `data/zones.json`, `data/fx.json`,
  `data/assets.json` (paleta procedural del Trampero).
- Interfaz: `src/ui/menus/saveStore.ts`, `src/ui/menus/screens/modals.ts` (opción),
  `src/render/fx/spellFx.ts` (anillos de trampa), `src/audio/cues.ts`.
- Tests: `tests/combateTactico.test.ts`.

No se tomó ninguna decisión creativa: nombres y cifras son PROPUESTA para el creador.
