# HANDOFF — Muerte, energía y botín de combate

- Objetivo autorizado: energía con penalización a 0, botín en una ventana de
  fin de combate con reparto por participación (preparado para cooperativo) y
  confirmaciones de compra y venta en la tienda. Rama `muerte-botin`, sin
  fusionar en `master`.

- Qué funciona (con cómo probarlo):
  - **Pulso** (`data/rpg/energy.json`, `src/rpg/energy.ts`): 100 puntos y −20
    por muerte. Vuelve con el tiempo (3/min con vida), descansando a ≤4,5 m de
    una piedra de viaje (2/s) y con el consumible nuevo «Trago de pulso» (+35;
    lo vende el boticario). A 0 se aplica «Sin pulso»: −30 de potencia (es
    decir, −30 % de daño), −25 % de vida máxima y −15 % de velocidad, hasta
    volver a 30 (histéresis). Se ve en la hoja de personaje y en «Has caído»
    (puntos perdidos y penalización). Se guarda en `SaveData.energy`, opcional:
    un guardado antiguo empieza con la energía inicial.
  - **Botín de fin de combate** (`data/rpg/spoils.json`, `src/rpg/spoils.ts`,
    `src/ui/menus/spoils.ts`): con `lootMode: "window"` los enemigos ya no
    sueltan nada al suelo. El botín se acumula durante el combate. Cuando pasan
    3 s sin ningún enemigo con agro, o cae todo el grupo, aparece una ventana
    que **no es modal**: clic en un objeto o en las monedas para tomarlos,
    «Tomar todo», o se cierra sola a los 12 s (no cuenta en pausa). Al cerrarse
    recoge lo que quepa y lo demás cae a los pies. Si llegan varios combates
    sin recoger, se juntan. Con `"ground"` el flujo de siempre sigue intacto,
    y la pesca y los cofres no cambian.
  - **Participación**: parte = Σ peso · (aporte / aporte total), con daño 0,6,
    curación 0,25 y tiempo en combate 0,15. Cada objeto se sortea ∝ parte, las
    monedas se reparten ∝ parte y la XP es × max(0,25, parte). Las mascotas
    cuentan para su dueño. Hoy sólo participa el jugador (parte 1).
  - **Confirmaciones** (`src/ui/menus/confirmGate.ts`, `ctx.confirm` con
    `skip`): antes de comprar uno (clic o clic derecho), recomprar, vender un
    objeto o vender una pila (con cantidad). Hay una casilla «No volver a
    preguntar en esta sesión», separada para compra y venta. Se reinicia al
    empezar o cargar partida. Comprar algo apilable siempre pide cantidad. Con
    `confirmRareSell`, las ventas raras o mejores preguntan siempre.
  - Pruebas: `npx vitest run` (393 en verde). Las nuevas están en
    `tests/rpg/deathLoot.test.ts`, `tests/rpg/energySpoils.test.ts` y
    `tests/ui/confirmGate.test.ts`. `npm run typecheck` y `npm run build`
    también en verde.

- Mediciones: no se midieron FPS. El coste por tick es recorrer los sucesos
  nuevos y la lista de enemigos una vez; no se espera impacto.

- Decisiones técnicas tomadas y por qué (PROPUESTA):
  - Penalización a 0: se implementó `weakened` (modificadores en datos), porque
    deja seguir jugando y castiga sin bloquear. Alternativas para el creador:
    1. **No poder combatir** hasta recuperar X: sencillo, pero deja al
       jugador sin nada que hacer salvo esperar o descansar.
    2. **Forma espectral** que debe volver andando a una piedra para revivir:
       tiene más personalidad, pero necesita un estado nuevo del jugador en la
       simulación y su propio render.
    3. (Implementada) **Debilitado**: −daño, −vida y −velocidad hasta recuperar.
  - La energía vive en `GameSession` y no en `Character`, y la penalización es
    la fuente `energy` de la hoja. Así no se tocó `character.ts`.
  - La XP se sigue sumando al abatir a cada enemigo (la subida de nivel cura en
    pleno combate, como antes). La ventana la enseña como resumen. En
    cooperativo habría que pasar a `Allotment.xp`.
  - La participación se cuenta a partir de los `GameEvent` de daño y curación
    de cada tick, sin tocar `damage.ts` ni `effects.ts`. El suceso `heal` no
    dice quién cura, así que hoy toda curación a un aliado cuenta para el
    jugador. En cooperativo hará falta un `sourceId` en ese suceso.
  - El `power` de la penalización va en plano: la estadística ya es un %, y un
    % de un total 0 no hacía nada (lo cazó un test).
  - En modo ventana la mascota recolectora no tiene botín de enemigos que
    recoger en el mundo abierto (sólo lo que se tira o cae por inventario lleno).

- Incertidumbres que bloquean el siguiente paso:
  - Ninguna bloquea. Para el creador: el nombre «Pulso», qué penalización
    prefiere y las cifras de `energy.json` y `spoils.json`.
  - Falta la **revisión visual en local** de la ventana de botín (posición,
    tamaño, cuenta atrás), del bloque de Pulso en la hoja y en «Has caído», y
    de la casilla del diálogo de confirmación.

- Archivos principales: `data/rpg/energy.json`, `data/rpg/spoils.json`,
  `src/rpg/energy.ts`, `src/rpg/spoils.ts`, `src/rpg/session.ts`,
  `src/rpg/contracts.ts` (sólo crece), `src/rpg/content.ts`, `src/sim/world.ts`
  (sólo la parte de botín), `src/ui/menus/spoils.ts`,
  `src/ui/menus/confirmGate.ts`, `src/ui/menus/index.ts`,
  `src/ui/menus/shop.ts`, `src/ui/menus/character.ts`,
  `src/ui/menus/screens/modals.ts`, `src/main.ts` (muerte y descanso).

- No se tomó ninguna decisión creativa: nombre, penalización y cifras son
  PROPUESTA.
