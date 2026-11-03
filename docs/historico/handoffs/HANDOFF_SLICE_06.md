# HANDOFF — Slice 06 (misiones y diálogos)

- **Objetivo autorizado:** encargo del coordinador del 2026-10-29: sistema de
  misiones y diálogos orientado a datos, con PNJ generales, cadenas,
  recompensas, guardado, marcas «!»/«?» e interfaz (diálogo, diario con J,
  seguimiento en el HUD y avisos). Contenido de ejemplo corto, sin historia
  principal. Rama `slice06-misiones` desde `master` 47deff9 (copia también en
  `claude/trusting-ritchie-ack15s`). Todo es **PROPUESTA**.

- **Qué funciona (con cómo probarlo):**
  - `npm test` (37 archivos, 263 tests) y `npm run typecheck` en verde.
  - `npm run dev`, partida nueva. En el pueblo hay tres PNJ nuevos con nombre
    y oficio encima: **Marina Junco** (pescadora, junto al camino del oeste),
    **Odila Brezo** (sargento) y **Celso Musgo** (anciano), además de los dos
    mercaderes. Un **«!»** dorado flota sobre quien tiene una misión para ti y
    un **«?»** sobre quien espera que le entregues una (tapa la moneda de los
    mercaderes mientras está).
  - **Clic en un PNJ**: el personaje camina hasta él y se abre la **ventana de
    diálogo** (abajo, en el centro): lo que dice, y opciones en lista. Clic en
    una opción o su número (las teclas 1–6 eligen opción mientras hay diálogo,
    en vez de lanzar hechizos). Esc o alejarse > 6 m la cierra.
    - Las misiones del PNJ aparecen solas: «! Nombre» (ofrecer → texto de
      encargo con objetivos y recompensa → «Acepto»/«Ahora no»), «Sobre
      «Nombre»…» mientras está en curso, y «? Entregar: Nombre» cuando está
      lista (da las recompensas y muestra el agradecimiento).
    - Con los mercaderes sale **«Comerciar»**, que abre la tienda de siempre.
      Un mercader sin entrada en `npcs.json` sigue abriendo la tienda directo.
  - **J**: diario de misiones (columna izquierda, como personaje y libro):
    en curso y por entregar con resumen, objetivos, a quién entregarla,
    recompensa, «Seguir»/«Dejar de seguir» y «Abandonar» (con confirmación);
    y la lista de completadas.
  - **Seguimiento en el HUD** (derecha, a un tercio de la altura): la misión
    seguida con sus objetivos y, si está lista, «Entrégasela a …». Clic = abre
    el diario. Se aparta cuando la mochila está abierta. Al aceptar la primera
    misión se sigue sola.
  - **Avisos**: «Nueva misión», progreso de cada objetivo («Lobos abatidos:
    2/3»), «… lista: vuelve con …», y el rótulo grande «Misión completada».
  - **Cadena de ejemplo «Encargos del pueblo»** (`data/rpg/quests.json`):
    1. *Percas para la cena* (pescadora): 3 capturas en el estanque y entregar
       2 percas plateadas. Pesca.
    2. *Lobos junto al camino* (sargento): abatir 3 lobos (aparecen al aceptar,
       al noroeste del pueblo) y entregar 2 colmillos. Combate y botín.
    3. *La piedra del vigía* (sargento → anciano, tras la 2): llegar a un punto
       al este y hablar con el anciano. Lugar y hablar.
    4. *Un tónico para el anciano* (anciano, tras la 1 y la 3, nivel 2): un
       tónico de recurso (tienda del boticario, que tiene una línea de diálogo
       propia que abre la tienda) y un cuero. Tienda.
    5. *La lección del viento* (anciano, tras la 4, nivel 3): 3 goblins
       hostigadores (aparecen al aceptar, al este) → aprende **Ráfaga**.
  - El test `tests/rpg/questChain.test.ts` recorre la cadena entera en el mundo
    real de 256 m: camina hasta cada PNJ con `commandTalk`, pesca en el
    estanque hasta tener las percas, guarda y carga a mitad de la de los lobos
    (los lobos que faltan reaparecen), los mata en la simulación y recoge el
    botín, camina hasta la piedra, compra el tónico desde el diálogo del
    boticario y termina aprendiendo Ráfaga.
  - Prueba de humo en el navegador de desarrollo (Chromium sin GPU, ~3 FPS):
    sin errores; «!» sobre la pescadora, diálogo, oferta con objetivos y
    recompensa, aceptar, diario, seguimiento y «Comerciar» con el herrero.

- **Mediciones:** no aplica (no hay render nuevo pesado: un plano con textura
  por PNJ para el signo). El coste de la lógica es una pasada por las misiones
  activas en cada señal y una comprobación de posición cada 0,25 s. No se midió
  en Electron.

- **Decisiones técnicas tomadas y por qué (PROPUESTA):**
  - **Modelo**: como el resto de `src/rpg/`, definición en datos e instancia en
    partida. `src/rpg/quests.ts` tiene:
    - `QuestObjective` y una subclase por tipo (`KillObjective`,
      `CollectObjective`, `FishObjective`, `TalkObjective`, `ReachObjective`)
      con un registro `OBJECTIVE_TYPES`. Un tipo nuevo = una subclase y una
      entrada; el diario y la interfaz no cambian.
    - `QuestLog`: estados (`locked`, `available`, `active`, `ready`,
      `completed`), aceptar, abandonar, entregar, señales, marcas, vistas y
      guardado.
    - `Conversation`: recorre el árbol del PNJ y añade sola las opciones de
      misión, «Comerciar» y «Adiós».
  - **Señales**: el mundo emite por el personaje tres sucesos nuevos
    (`enemyKilled`, `fished`, `talkNpc`); la sesión se suscribe la primera y se
    los pasa al diario. Así el objetivo «hablar con» ya cuenta cuando la
    interfaz abre el diálogo, y la entrega sale en la primera conversación.
    «Llegar a» lo mira `GameSession.tick` (que la interfaz ya llamaba cada
    fotograma sin ventanas modales).
  - **Recoger/entregar** se cuenta en la mochila, no se guarda, y puede
    retroceder si vendes o tiras el objeto. `consume: false` = sólo enseñarlo.
    Lo que ya llevas al aceptar cuenta desde el principio (por eso la misión del
    tónico puede nacer lista: el kit inicial trae tónicos).
  - **«Hablar con»** sólo cuenta cuando el resto de objetivos está hecho (es un
    «ve y cuéntaselo»). Si alguna vez se quiere un «habla con X» suelto, basta
    con que sea el único objetivo.
  - **Enemigos de misión**: un objetivo de matar puede llevar `spawn`; al
    aceptar (y al enlazar un mundo nuevo: reinicio con F9 o carga) aparecen los
    que faltan alrededor de ese punto. Motivo: el mundo no tiene reaparición y
    los enemigos del encuentro pueden estar ya muertos.
  - **Entregar** comprueba primero que la recompensa cabe en la mochila; da la
    XP al final para que un nivel nuevo desbloquee ya la siguiente.
  - **Mercaderes**: una entrada de `npcs.json` con `"merchant": true` es el
    diálogo del mercader del mismo id; nombre, sitio y aspecto salen de
    `merchants.json`. El mundo coloca los mercaderes de `merchants.json` y los
    demás PNJ de `npcs.json`.
  - **Contrato** (`contracts.ts`, sólo crece): sucesos nuevos de `SessionEvent`,
    métodos opcionales de `GameSessionApi` (`talk`, `chooseDialogue`,
    `dialogue`, `endDialogue`, `quests`, `trackedQuest`, `trackQuest`,
    `abandonQuest`, `npcMarker`), `ContentDb.quests/npcs` opcionales, tipos de
    misión y diálogo, y `SaveData.quests?` (opcional: los guardados anteriores
    cargan sin misiones; `version` sigue en 1).
  - **Cambios fuera de `src/rpg/` y `src/ui/menus/`** (con cuidado):
    - `src/sim/world.ts`: `Npc` pasa a ser `{ npcId, merchantId | null, pos }`
      y `commandTalk(npcId)` recibe ahora el id del PNJ (en un mercader, el
      mismo de antes). Además emite los sucesos nuevos y añade
      `spawnQuestEnemies`.
    - `src/render/npcView.ts`: generalizado. Recibe los PNJ por id
      (`{ name, title, look }`), pone la moneda sólo a los mercaderes y el
      signo «!»/«?» con `sync(world, dt, marker)`. El picking devuelve el id del
      PNJ y `merchantIdOf` pasa a llamarse `npcIdOf`; sólo lo usaba la propia
      vista.
    - `src/main.ts`: 5 líneas (defs de PNJ, marcas, cerrar el diálogo al
      alejarse).
    - `data/assets.json`: 3 paletas nuevas (`fisher`, `guard`, `elder`).
    - `data/ui/keybindings.json`: `journal` = J (al unir en master pasó a N, porque J es el hueco 17 de la barra).
    - `tests/rpg/shop.test.ts`: el test del clic en el herrero ahora lo prueba
      sin entrada en `npcs.json` (el caso «mercader sin diálogo»). El caso con
      diálogo lo prueban `quests.test.ts` y `questChain.test.ts`.
  - No se tocó `src/audio/` ni las demás vistas. El audio sigue oyendo
    `openMerchant` igual: ahora llega al elegir «Comerciar».

- **Incertidumbres que bloquean el siguiente paso:** ninguna bloquea. Para el
  creador:
  1. ¿Gusta el diálogo en ventana abajo-centro? Tapa un poco al personaje con
     la cámara de partida.
  2. ¿Las teclas 1–6 deben elegir opción con un diálogo abierto (como ahora)?
  3. ¿Se quiere un botón de diario en el HUD? Hoy se abre con N o con clic en
     el seguimiento; no se tocó `hud.ts`.
  4. ¿Las muertes de enemigos a manos de la mascota cuentan para la misión?
     Hoy sí (cuenta cualquier muerte con el jugador vivo).
  5. ¿Los enemigos de misión deberían reaparecer con el tiempo?
  6. La subida de nivel por XP de misión no lanza el destello 3D (ése lo
     dispara el suceso del mundo al matar); sí sale el rótulo «¡Nivel N!».
  7. Nombres, textos, posiciones y recompensas: todos inventados y cambiables
     en `data/rpg/npcs.json` y `data/rpg/quests.json`.

- **Archivos principales:**
  - `src/rpg/quests.ts`, `src/rpg/contracts.ts` (sección «Misiones y
    diálogos»), `src/rpg/content.ts` (carga y validación), `src/rpg/session.ts`.
  - `data/rpg/npcs.json`, `data/rpg/quests.json`.
  - `src/ui/menus/dialogue.ts`, `journal.ts`, `questTracker.ts`,
    `questFormat.ts`, `index.ts`; estilos al final de `src/ui/styles/menus.css`.
  - `src/sim/world.ts`, `src/render/npcView.ts`, `src/main.ts`.
  - Tests: `tests/rpg/quests.test.ts`, `tests/rpg/questChain.test.ts`,
    `tests/ui/questFormat.test.ts`.

- No se tomó ninguna decisión creativa: los PNJ, los textos y la cadena son de
  ejemplo y no son una historia principal.
