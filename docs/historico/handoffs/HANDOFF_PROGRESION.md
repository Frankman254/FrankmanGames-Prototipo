# HANDOFF — Progresión por clase, requisito de nivel y sonidos

- **Rama:** `claude/amazing-cori-a4aeme` (parte de `wip-progresion-clase`, 0df8e0c). Sin fusionar a `master` y sin PR.
- **Estado de las cifras:** todo número nuevo es `PROPUESTA` y vive en `data/`.

## Objetivo autorizado

Petición del creador: corregir el Pulso con decimales, rehacer los hechizos de la
Vanguardia de Brasa (todos eran de fuego, repetitivos y sin aumento), progresión
por nivel con 3 hechizos al empezar, pergaminos de otros elementos con requisito
de nivel, tooltips por encima de todo, botón de reinicio de características,
hoja de personaje que no se rompa al ampliar la interfaz y terminar los sonidos.

## Qué funciona (y cómo probarlo)

| Punto | Dónde | Prueba |
|---|---|---|
| 2 errores de tipos y 6 tests rotos del WIP | `src/rpg/content.ts`, tests | `npm run typecheck`, `npx vitest run`. Los tests con hechizos de nivel alto llaman a `prepareSpells`/`reachLevel` (`tests/levels.ts`), que **suben de nivel de verdad**. «matar enemigos sube de nivel» usa ahora Remolino (nivel 1); el umbral del empuje de Embestida se ajustó al empuje leve de los datos (1,2 m) |
| Kit de nivel 1 = 3 hechizos (carga/proyectil, área, aumento) | `data/rpg/classes.json` | `tests/rpg/spellLevels.test.ts` |
| Progresión por nivel alternando elementos | `data/rpg/spells.json` (`unlockLevel`) | mismo archivo de tests |
| Requisito de nivel para la barra | `src/rpg/spells.ts` (`Spellbook.level`, `equipBlock`, `slotNewlyUsable`), `character.ts`, `world.ts` (bloqueo `level`) | comprar y leer el pergamino de Esquirla de escarcha al boticario a nivel 1: se aprende, no se puede arrastrar a la barra (tooltip en rojo) y entra sola al llegar a nivel 5 |
| Tooltip con el requisito | `src/ui/menus/format.ts` (`spellLevelLines`, línea `req`), `tooltip.ts`, `spellbook.ts`, `hud.ts` | `tests/ui/progressionUi.test.ts`; captura revisada |
| Tooltip por encima de todo | `.tooltip` con z-index máximo, último hijo de la raíz de menús | test que compara su z-index con todos los de las hojas de estilo; captura: encima de panel, barra y minimapa |
| Pulso en enteros | `pulseText` en HUD (medidor nuevo bajo el recurso), hoja y ventana de muerte | `tests/ui/progressionUi.test.ts` |
| Reinicio de características | `Character.resetStatPoints` / sesión / botón con confirmación en la hoja | `tests/rpg/progression.test.ts`, `tests/rpg/spellLevels.test.ts`, `tests/ui/fakeSession.test.ts` |
| Hoja de personaje a 150 % / automática | `src/ui/styles/menus.css` (bloque «Hoja de personaje»), `themes.css` | Chromium headless a 1280×720 y escala 1,5: cuerpo con scroll interno (828 px de contenido en 312 px), sin desbordamiento horizontal, columnas `auto-fit` de ≥ 150 px |
| Sonidos | `scripts/generateSfx.mjs`, `src/audio/samples.ts`, `engine.playBuffer`, `director.play`, `data/audio/sfx.json → samples` | `tests/audio.test.ts` (metadatos, cobertura, validación, carga y motor); en el juego, `window.__audio.played` en desarrollo |

### Vanguardia de Brasa (PROPUESTA)

| Nivel | Hechizo | Elemento | Uso |
|---|---|---|---|
| 1 | Embestida | físico | carga hacia el cursor, daña y aparta levemente; se lanza andando |
| 1 | Remolino de brasas | fuego | área inmediata alrededor; quema (50 %) |
| 1 | Grito de hierro | físico | aumento: +20 poder y +10 resistencia física 8 s |
| 3 | Tajo sísmico (`fiery_slash`) | tierra | golpe a un objetivo |
| 5 | Marca ardiente | fuego | quemadura a distancia |
| 7 | Baluarte de roca | tierra | escudo 40 |
| 9 | Cadena de brasa | fuego | atrae al objetivo |
| 12 | Represalia de acero | físico | devuelve 60 % cuerpo a cuerpo |

### Tejedora de Tormentas (PROPUESTA)

| Nivel | Hechizo | Elemento |
|---|---|---|
| 1 | Chispa (proyectil) · Nova de escarcha (área) · **Foco de tormenta** (aumento nuevo: +20 poder, +5 % crítico, 8 s) | rayo · escarcha · rayo |
| 3 / 5 / 7 / 9 / 11 / 13 / 15 | Paso del relámpago · Lanza glacial · Arco voltaico · Repliegue helado · Espejo de tormenta · Transposición gélida · Campo estático | rayo, escarcha, rayo, escarcha, rayo, escarcha, rayo |

Universales (pergaminos): Ráfaga 2, Vendaje de luz 3, Piel de piedra 4,
**Esquirla de escarcha 5 (nueva)**, Espíritu lobuno 6, Eco del instante 8,
Égida quieta 10.

## Mediciones

- `npm run typecheck`: sin errores. `npx vitest run`: 514 tests en verde.
  `npm run build`: correcto; los 12 WAV van incrustados (`data:audio/wav`, ~340 KB
  en bruto) para que Electron no tenga que leerlos desde `file://`.
- Generador de sonidos determinista: dos ejecuciones dan los mismos bytes.
- No se midieron FPS ni latencia (sin cambios en render ni simulación).

## Decisiones técnicas (PROPUESTA)

- **Un solo campo `unlockLevel`** sirve de requisito de barra y de nivel de
  aprendizaje automático de la clase. Por debajo, un hechizo conocido tampoco se
  lanza por id (`CastBlock` `level`), para que no haya atajos.
- Guardados antiguos: los hechizos propios por encima del nivel se olvidan (se
  recuperan solos al subir); los de pergamino se conservan pero salen de la barra.
- Al llegar al nivel, el hechizo ya conocido entra en el primer hueco libre.
- `spellIcon` distingue aumentos y cargas con su propio dibujo.
- **WAV:** los del WIP no tenían metadatos y su origen no se podía comprobar, así
  que se regeneraron por síntesis en código (mono 22 050 Hz, con bloque
  LIST/INFO que nombra el script). Siguen en el historial del commit 0df8e0c; si
  el creador quiere borrarlos también de ahí haría falta reescribir historia
  (no se hizo).
- Mapeo de muestras (`data/audio/sfx.json → samples`): golpe físico, tierra,
  fuego y tormenta; crítico dado y recibido; esquiva/inmune (bloqueo metálico);
  lanzamientos de físico, fuego, escarcha, tormenta y tierra; curación. Escarcha
  en el impacto y el resto de sonidos siguen con la receta sintetizada.
- `src/audio/music/` en `.gitignore`; un test comprueba que el código no carga
  `.mp3` ni esa carpeta.

## Incertidumbres para el siguiente paso

- **Escuchar** las 12 muestras y ajustar `gain` en `data/audio/sfx.json` (en la
  nube no hay salida de audio). Probar en Electron que se decodifican.
- Revisión visual en el PC del creador con la escala automática real y en
  Electron; aquí se verificó en Chromium headless.
- La Tejedora no tiene carga con daño (su desplazamiento es un parpadeo): si el
  creador quiere que «la carga que golpea» sea regla para todas las clases,
  hace falta decidirlo.
- El daño sigue la fórmula existente de `src/sim/damage.ts` (el daño base del
  hechizo es lo que más pesa); no se tocó.
- `fiery_slash` conserva su id (ahora «Tajo sísmico», tierra) para no romper
  guardados.

## Archivos principales

`data/rpg/{spells,classes,statuses,items,merchants,loot}.json`, `data/fx.json`,
`data/audio/sfx.json`, `src/rpg/{spells,character,content,contracts,session}.ts`,
`src/sim/{combat,world}.ts`, `src/ui/menus/{format,tooltip,hud,spellbook,character,icons,index}.ts`,
`src/ui/styles/{menus,themes}.css`, `src/audio/{samples,engine,director,data}.ts`,
`scripts/generateSfx.mjs`, `vite.config.ts`, `tests/levels.ts`,
`tests/rpg/spellLevels.test.ts`, `tests/ui/progressionUi.test.ts`, `tests/audio.test.ts`.

- No se tomó ninguna decisión creativa fuera de lo pedido: nombres, cifras y
  reparto de niveles son PROPUESTA para que el creador los apruebe o cambie.
