# HANDOFF — Equipo y objetos

- **Objetivo autorizado:** petición del creador:
  - «el equipo está muy raro: la mano izquierda es un escudo, pero debería poder ser también un arma»;
  - «los iconos de todos los objetos son genéricos; hay que generar más según sea escudo, espada, etc.»;
  - «genera más armas, objetos y sets»;
  - «arregla el menú de mochila y equipo, más completo y más grande, para ver dónde va cada pieza en la vista del personaje».
- **Rama:** `equipo-objetos`, desde `master` (`9cd8076`). Sin fusionar y sin PR.
- **Estado de las cifras:** todo es PROPUESTA y vive en `data/`. No se tomó ninguna decisión creativa que cierre una pregunta abierta; las dudas van al final.

## Qué funciona (y cómo probarlo)

### 1. Mano izquierda: escudo **o** arma

- **Armas de una mano** (espada, daga, hacha, maza, varita, orbe) valen para la mano derecha y la izquierda (`slotsFor`).
- **Armas de dos manos** (mandoble, martillo, lanza, arco, ballesta, bastón) bloquean la izquierda:
  - equipar una de dos manos guarda en la mochila lo que hubiera en la izquierda;
  - poner algo en la izquierda guarda el arma de dos manos;
  - si no hay sitio en la mochila, la orden falla con un aviso y no se pierde nada.
- **Qué arma ocupa dos manos:** sale del tipo (`TWO_HANDED_KINDS`). Un objeto puede forzarlo con `hands: 1 | 2` en `items.json`.
- **Dos armas (reglas en `data/rpg/progression.json` → `rules.dualWield`):**
  - el ataque básico alterna mano derecha e izquierda;
  - el golpe de la izquierda hace `offhandDamage` (0,75) × su daño;
  - los dos golpes salen `attackSpeed` (1,2) × más rápido.
  - Sin la cadencia extra, dos armas harían menos daño que una (la izquierda pega menos); con ella, la media es ×1,05 más los atributos de la segunda arma, frente a las resistencias del escudo.
  - Con un arma sólo en la izquierda se pega con ella a daño completo.
- **Clic derecho** equipa en la derecha (sustituye el arma); **Mayús + clic derecho** equipa en la izquierda. Arrastrar al hueco de la mano izquierda también vale.
- **Tooltip:** un arma de una mano con otra ya en la derecha enseña las dos comparaciones: «en la mano derecha» y «en la mano izquierda (dos armas)». Toda arma dice si es de una o de dos manos.
- **Huecos nuevos:** `back` (capa) y `waist` (cinturón), al final de `EQUIP_SLOTS`.
- **Tests:** `tests/rpg/equipment.test.ts` › «manos: dos armas y armas de dos manos». Incluye un combate real en `World` que comprueba la alternancia derecha, izquierda, derecha, izquierda.

### 2. Tipos de objeto (`kind`)

- `ITEM_KINDS` en el contrato tiene 41 tipos: armas (12), mano izquierda (2), armaduras (11), joyas (2) y el resto (pociones, elixires, comida, pescado, pergamino, amuleto de mascota, materiales, gema, llave, trasto).
- **Todos los objetos de `items.json` llevan `kind`.** Si a un objeto le falta, `content.ts` lo deduce (`inferKind`, por icono, hueco y categoría). El contenido falso de la interfaz funciona sin cambios.
- **Validación:** un `kind` que no encaja con su hueco o su categoría es un error de datos (p. ej. `shield` en el hueco `weapon`). `hands` sólo vale en armas.
- **Ordenar la mochila por criterio:** `Inventory.sort(by)` con `category` (el de siempre), `kind`, `rarity`, `level` o `name`.

### 3. Iconos SVG por tipo

- Están en `src/ui/menus/itemIcons.ts`; `itemIcon` (en `icons.ts`) los usa.
- **Una silueta por tipo**, dibujada en código.
- **Color:**
  - la rareza tiñe los adornos (guarda, cinta, hebilla) y un aro de fondo que se marca más cuanto más raro es el objeto;
  - el elemento pone la gema o el brillo: el del arma, o el del primer daño o resistencia no físicos.
- **Variantes:** una semilla sacada del id cambia proporciones y detalles (largo de hoja, guarda, pomo, número de púas, emblema del escudo, talla de la gema…). Dos espadas nunca salen iguales.
- **Pociones y elixires:** se tiñen por efecto (cura en rojo, recurso en azul, estado en verde).
- **Tests:** `tests/ui/icons.test.ts` comprueba:
  - un dibujo por tipo, todos distintos;
  - SVG bien formado para los 120 objetos y para el contenido falso;
  - las variantes por id;
  - que la rareza y el elemento cambian el icono.
- **Hoja de contacto:** `docs/capturas/equipo/04-iconos-por-tipo.jpg`.

### 4. Contenido nuevo

- **71 objetos nuevos**, de 49 a 120 en total.
  - **Por franja:** 1–10: 9 · 10–20: 7 · 20–30: 7 · 30–40: 7 · 40–50: 5 · 50–60: 6 · 60–70: 7 · 70–80: 4 · 80–90: 5 · 90–100: 7. Además hay 7 consumibles y materiales.
  - **Cubren** los 11 huecos, todos los tipos de equipo y los 5 elementos en armas.
- **Nombres originales** con toque panameño: Machete rozador, Rodela de totuma, Sombrero pintao, Cutarras, Bollo de maíz, Trozo de raspadura, Café de bajareque, Escudo de tapa de olla, Botas de papero, Capa de bijao, La Hoja del Último Bus…
- **Las cifras salen de fórmulas por nivel y rareza.** Son PROPUESTA; ver «Decisiones».
- **6 sets nuevos, uno por estilo de juego.** Cada set lleva un campo `_build` (un comentario de datos que el juego no lee):

| Set | Franja | Estilo de juego | Piezas |
|---|---|---|---|
| del Machetero | 10–20 | dos manos, fuerza y fuego | mandoble, sombrero, camisilla, cutarras |
| del Diablo Danzante | 20–30 | dos armas, agilidad y crítico | máscara, traje, cinto de cascabeles, cuchillo |
| de la Pollera | 30–40 | lanzador de escarcha con recurso y enfriamientos | tembleques, pollera, cadena chata, zapatillas |
| del Cazador del Darién | 50–60 | a distancia con arco | arco, capucha, guantes, botas, capa |
| del Guardián de las Esclusas | 60–70 | tanque con escudo | yelmo, coraza, escudo, cinturón, botas |
| de la Tulivieja | 90–100 | lanzador de tormenta y escarcha de alto nivel | bastón, velo, sayo, anillo, medalla |

- **Botín.** Antes, las franjas 10–100 compartían cinco tablas `high_*` con equipo de nivel 1–4; la nota de esas tablas decía «botín propio por franja pendiente».
  - Ahora hay **36 tablas nuevas**, `<zona>_<papel>`, con papel `beast`, `ranged`, `caster` o `elite`.
  - Cada una tiene la base de su `high_*` sin el equipo viejo, más el equipo y los consumibles de su franja. Los élites llevan todo el equipo de la franja y las piezas de set con peso doble.
  - Los 45 arquetipos de las franjas 10–100 apuntan a su tabla.
  - `high_minion` sigue igual. Las `high_*` quedan en el archivo sin usarse.
  - La franja 1 añade sus objetos nuevos a las tablas de siempre.
- **Mercaderes:**
  - Herrera: machete, cuchillo, rodela de totuma, sombrero de junco, cinturón de cabuya, anillo de coco y brazales de concha.
  - Boticario: bollo, raspadura y poción mayor (5 unidades).
- **Tests** (`equipment.test.ts` › «contenido nuevo»):
  - ≥ 40 objetos nuevos, las 10 franjas, todos los huecos, todos los tipos de equipo y los 5 elementos;
  - los 6 sets con escalones crecientes y las piezas de cada set en la misma franja;
  - todo objeto sale de algún sitio (botín, mercader, kit o misión);
  - cada zona alta suelta sólo equipo de su franja.

### 5. Mochila y equipo, más grande y completa

- **Ancho:** 860 px en vez de 620. Crece con «Casillas de la mochila» y respeta `--ui-max-width`, la escala de la interfaz y el tamaño de la pantalla.
  - Si no cabe, la mochila baja debajo del muñeco y el panel se desplaza por dentro.
  - Comprobado a 1280×800 y a 820×640 (`docs/capturas/equipo/03-pantalla-pequena.jpg`).
- **Muñeco (silueta, no 3D en vivo).** Cada hueco está en su sitio del cuerpo:
  - cabeza arriba y amuleto junto al cuello;
  - capa en el hombro y torso, cinturón y pies sobre el cuerpo;
  - guantes y arma derecha junto a la mano derecha;
  - anillos y mano izquierda junto a la mano izquierda.
  - Una línea punteada une cada hueco lateral con su punto del cuerpo. La silueta toma el color del recurso de la clase.
  - Con un arma de dos manos, el hueco izquierdo sale apagado con «2 manos» y una línea une las dos manos.
- **Totales:**
  - las 5 primarias;
  - vida, recurso, potencia, crítico, daño crítico, reducción de enfriamiento, regeneraciones y velocidad;
  - una tabla **por elemento** con la resistencia (con el tope en dorado) y el daño plano;
  - los conjuntos puestos, con los escalones activos en verde;
  - una frase con la regla de manos que rige.
- **Filtros de la mochila:** chips por grupo (Todo, Armas, Armadura, Joyas, Consumibles, Materiales), tipo y rareza.
  - Lo que no pasa el filtro se apaga pero no se mueve, así que arrastrar y soltar sigue usando los huecos reales.
  - Un contador dice cuántos objetos pasan el filtro.
- **Orden:** un selector de criterio y el botón «Ordenar» (`sortInventory(by)`).
- Las casillas de equipo muestran el nivel requerido. Los tooltips comparan como antes, y ahora también por mano.
- **Capturas:** `docs/capturas/equipo/01-…`, `02-…` y `03-…`.

### 6. 3D

- **Dibujo de cada objeto en la mano:** `withGear` usa la entrada de `gear` del objeto. Si no la tiene, usa la de su tipo (`gearLookFor`), así que los 71 objetos nuevos no necesitan entrada en `assets.json`.
- **La mano izquierda** dibuja escudo, rodela (escudo más pequeño) o cualquier arma de una mano. `heldParts(look, 'handL')` usa las mismas piezas que la derecha.
- **Piezas nuevas:** daga, mandoble, martillo, lanza, arco (`arc` vertical con cuerda), ballesta y rodela.
- **Galería:** `personajes.html?lineup=equipo` enseña cada combinación. Capturas en `docs/capturas/equipo/05-…` y `06-…`.
- **Tests** (`tests/characterLook.test.ts`):
  - las piezas de cada arma en cada mano cuelgan del rig;
  - una o dos mallas, según haya brillo en alguna mano;
  - menos de 5000 vértices;
  - el dibujo por tipo.

## Compatibilidad y migración

- **El contrato sólo crece.** Todo lo nuevo de `src/rpg/contracts.ts`:
  - `ITEM_KINDS` y `ItemKind`;
  - `ItemDef.kind?` y `ItemDef.hands?`;
  - `TWO_HANDED_KINDS`;
  - los huecos `back` y `waist` al final de `EQUIP_SLOTS`;
  - `INVENTORY_SORT_KEYS` y `InventorySortKey`;
  - `sortInventory(by?)` y `compareEquip(uid, slot?)`, con parámetros opcionales.
  - La sesión falsa de la interfaz compila sin cambios en su API.
- **Al ampliar `EQUIP_SLOTS`,** cualquier `Record<EquipSlot, …>` de otra rama necesitará las dos claves nuevas al fusionar. En esta rama sólo había dos: `SLOT_LABEL` y los del muñeco.
- **Guardados antiguos** (`SaveData.version` sigue en 1). `Character.fromSave` migra:
  - **las tiradas** se ajustan a la definición actual (`migrateInstance`): cada una busca la suya por estadística, se recorta a los límites nuevos, las que faltan salen a media tirada y las que sobran se quitan. La cantidad se recorta a `maxStack`;
  - **lo equipado en un hueco que ya no es el suyo**, o la mano izquierda con un arma de dos manos (p. ej. el Bastón de roble, ahora de dos manos, con la Rodela de roble), vuelve a la mochila. Antes, un objeto en un hueco inválido se perdía.
  - **Si no cabe**, va al botín pendiente de la sesión (`recoverDisplaced`): no se pierde nada.
  - **Tests:** `equipment.test.ts` › «migración de guardados».
- **No se tocó:** `src/ui/menus/windows.ts`, el minimapa ni `src/ui/menus/saveStore.ts`.

## Mediciones

- `npm run typecheck`, `npx vitest run` (62 archivos, 542 tests) y `npm run build`: en verde.
- **`npm run balance`.** Informes regenerados: `docs/EQUILIBRIO_2026-10.md` y `docs/EQUILIBRIO_ZONAS.md`. Comparados con los de `master` en la misma máquina, los cambios son pequeños:
  - **Economía:** de 132 a 142 monedas/min. Lo más caro de la tienda pasa de 1,6 a 1,5 min de combate.
  - **Vanguardia preparada (nivel 4 con equipo):** un 10–25 % más rápida contra grupos pequeños, porque el bot ya puede llevar dos armas y equipo nuevo de nivel bajo. Sin esquivar vence 8 lobos (antes 0).
  - **La clase «más fuerte»** pasa a ser la Vanguardia, pero la diferencia sigue siendo pequeña (×1,4).
  - **Zonas:** sin cambios de veredicto.
    - El ✘ de Chame a nivel 10 ya estaba (muere el 42 %, ahora el 50 %).
    - La élite sigue matando de un golpe a quien va 5 o más niveles por debajo.
- **Medido en Chromium headless (nube):**
  - el panel a 1280×800 y 820×640;
  - la galería 3D con las 11 combinaciones de manos (de 4087 a 4434 vértices por personaje);
  - sin errores de consola.
- **Sin medir (local):** FPS en Electron y revisión a ojo en el PC del creador.

## Decisiones técnicas tomadas (PROPUESTA)

- **Cifras de los objetos nuevos.** Salen de fórmulas por nivel L y factor de rareza f (común 1, poco común 1,15, raro 1,3, épico 1,5, legendario 1,75):
  - **arma:** daño por segundo = 10·(1 + 0,15·(L−1))·f·k. k es el factor del tipo: 1 la espada, 1,4 el mandoble, 1,45 el martillo, 1,15 el arco, 0,8 la varita… Cada tipo tiene su cadencia y su alcance;
  - **primaria:** [1 + 0,3L, 3 + 0,45L]·f;
  - **resistencia fija:** (3 + 0,18L)·f;
  - **valor:** (8 + 3,2L)·(1 + 0,2·rareza), ×1,3 en armas.
  - **Peso en el botín:** 40, 25, 12, 5 y 2 según la rareza.
  - El generador no forma parte del juego: las cifras ya están escritas en `items.json`.
- **Dos armas.** Golpes alternos con cadencia ×1,2 y la izquierda al 75 %, en vez de dos golpes a la vez o un bono de crítico. Es lo más legible con el sistema de cargas del básico. Las cifras se cambian en datos.
- **Clic derecho sobre un arma de una mano** sustituye la de la derecha, en vez de ocupar la izquierda vacía. Así nadie acaba con dos armas sin pedirlo. Para la izquierda: Mayús o arrastrar.
- **Muñeco con silueta 2D, no 3D en vivo.** Un segundo motor de Babylon con su escena dentro del panel cuesta memoria y un render más por fotograma. Las armas sí se ven en 3D en el personaje del mundo.
- **Filtros que apagan en vez de esconder:** así arrastrar y soltar sigue apuntando a los huecos reales.
- **El arco y la ballesta** usan la animación de tajo. `isCasterWeapon` no cambió, para no tocar el reparto de mallas.

## Incertidumbres para el creador / coordinador

1. **El nivel máximo del jugador sigue en 20** (`progression.json`). El equipo de nivel 21–99 cae en las zonas altas, pero no se puede equipar. Es la misma pregunta abierta de `HANDOFF_MUNDO_CLIMA.md` (§ «Nivel máximo»).
2. **Huecos de capa y cinturón:** ¿se quedan como huecos propios? Son dos piezas más de atributos por personaje.
3. **El Bastón de roble pasa a ser de dos manos** (todos los bastones lo son). Quien llevaba bastón y rodela pierde la rodela al cargar: vuelve a la mochila. ¿Debe haber bastones de una mano? Bastaría `"hands": 1` en el objeto.
4. **Las cifras de dos armas** (0,75 y 1,2) no están medidas en el simulador por separado. Los bots las usan cuando les sale a cuenta.
5. **Nombres:** «Sombrero pintao», «Pollera», «Diablo Danzante» y «Tulivieja» usan tradiciones panameñas reales en clave de homenaje. ¿Tono correcto?

## Qué revisar a ojo (local)

- La mochila en Electron a varias escalas de interfaz y tamaños de casilla.
- Arrastrar armas entre las dos manos y la mochila. Probar Mayús + clic derecho.
- El personaje en el mundo con dos armas, con arco y con un arma de dos manos: que la izquierda se dibuje y que nada atraviese el cuerpo de forma rara.
- Los iconos a tamaño real en la mochila, la tienda, el botín y el HUD de pociones.

## Archivos principales

- **Contrato y lógica:** `src/rpg/contracts.ts`, `src/rpg/items.ts`, `src/rpg/character.ts`, `src/rpg/content.ts`, `src/rpg/session.ts`, `src/sim/world.ts` (`basicAttack`).
- **Datos:** `data/rpg/items.json`, `sets.json`, `loot.json`, `enemies.json` (tablas por franja), `merchants.json`, `progression.json` (`dualWield`).
- **Interfaz:**
  - `src/ui/menus/inventory.ts`, `itemIcons.ts`, `icons.ts`, `format.ts`, `context.ts`, `dragModel.ts`;
  - `src/ui/styles/menus.css` y `options.css`.
- **3D:** `src/world/look.ts`, `src/render/characters/heroModel.ts`, `src/render/arenaView.ts`, `src/tools/characterGallery.ts`.
- **Tests:** `tests/rpg/equipment.test.ts`, `tests/ui/icons.test.ts`, `tests/characterLook.test.ts`, `tests/rpg/content.test.ts`.

Los nombres, los sets y las cifras se crearon porque el encargo los pedía. Son PROPUESTA y no cierran ninguna decisión del creador.
