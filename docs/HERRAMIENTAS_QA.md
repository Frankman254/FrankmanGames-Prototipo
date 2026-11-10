# Herramientas de QA: cómo se probó la pasada del 2026-11-09

Esta guía explica cómo se hizo la QA de [QA_2026-11-09](historico/QA_2026-11-09.md) y cómo repetirla. Cubre cuatro cosas: la
niebla del Muelle de Iguanera, las tres clases en combate real, las ventanas y la prueba temporal del ataque básico
automático (B). Es para agentes y no sustituye a la prueba del creador.

## Qué herramienta usar

| Pregunta | Herramienta | Dónde |
|---|---|---|
| ¿La lógica pura hace lo que dice? (combate, cooldowns, A*, estados) | `npm test` (Vitest) y `npm run typecheck` | `tests/` |
| ¿Cambia el balance con una regla nueva? | Bot sobre `World` sin ventana, con copias de los datos | `npm run balance:inicio`, `npm run balance:ataque-basico` |
| ¿Los recorridos fijos siguen funcionando? (banco, muerte, mochila…) | Recorrido automático en Electron | `npm run qa:electron`, ver [Prueba rápida](PRUEBAS_RAPIDAS.md) |
| ¿Cómo se ve y se juega algo concreto ahora mismo? | **Arnés manual por CDP** (esta guía) | `scripts/qa-manual/` |

El arnés manual sirve para explorar: abre una ventana de Electron que queda abierta y se maneja con pasos cortos.
Cada paso hace clic, lee el estado y saca capturas. No hace falta reiniciar entre pasos. Cuando un paso descubre
algo que debe comprobarse siempre, conviene pasarlo a `qaElectron.mjs` o a un test.

## Arnés manual (`scripts/qa-manual/`)

| Archivo | Qué hace |
|---|---|
| `launch.mjs` | Compila el proceso principal y arranca Vite y Electron con CDP en el puerto **9351**. Usa un perfil propio en `work/qa-manual/profile/`, así que no toca las partidas del creador, y escribe la URL en `work/qa-manual/url.txt`. Queda abierto hasta Ctrl+C |
| `cdp.mjs` | Se conecta a esa ventana y ejecuta uno o más archivos de pasos, o una expresión con `-e`. Muestra los errores y avisos de consola al final |
| `lib.js`, `walk.js`, `fight.js` | Preludio: `cdp.mjs` lo antepone a cada paso automáticamente |
| `ejemplo-nueva-partida.js` | Paso de ejemplo: título, creación de la Cazadora «Niebla» y entrada al juego |

El puerto 9351 no choca con `qa:electron`, que usa el 9333 o 934x, así que ambos pueden correr a la vez.

```bash
node scripts/qa-manual/launch.mjs
```

En otra terminal:

```bash
node scripts/qa-manual/cdp.mjs scripts/qa-manual/ejemplo-nueva-partida.js
```

```bash
node scripts/qa-manual/cdp.mjs -e "__game.world.player.pos"
```

Los pasos se escriben en `work/qa-manual/` (ignorado), por ejemplo `s05.js` o `s06.js`, uno por comprobación. Las
capturas van a `work/qa-manual/shots/`. Se ejecutan con la ruta completa desde la raíz del repo, porque una ruta
relativa desde otra carpeta falla.

### Ayudas disponibles en un paso

De `cdp.mjs`, con entrada real por CDP:

- `js(expr)`: evalúa en la página y devuelve un valor JSON.
- `mouse(x, y, {button, count, hold, modifiers})`: un clic completo (moverse, pulsar y soltar).
- `move(x, y)`: solo mueve el cursor.
- `wheel(x, y, dy)`: rueda del ratón.
- `key(code, key, hold)`: tecla real, por ejemplo `key('Digit1','1')`, `key('KeyW','w')` o `key('Escape')`.
- `click(selector, texto)` y `locate(selector, texto)`: el primer elemento visible con ese texto exacto.
- `shot(nombre)`: guarda un JPG de la ventana.
- `cdp(método, params)`: CDP directo, por ejemplo `cdp('Input.insertText', {text})` para escribir en un campo.
- `sleep(ms)` y `log(...)`.

Del preludio:

| Ayuda | Para qué |
|---|---|
| `state()` | Hora, posición, vida, recurso, nivel, XP, oro, mochila, cargas del básico, objetivo, zona y cámara |
| `nearEnemies(n)` | Enemigos vivos más cercanos: id, arquetipo, nivel, distancia, vida, posición y estado |
| `project(x, y, h)` | Convierte un punto del mundo (coordenadas de la simulación más la altura sobre el suelo) en píxeles de la ventana. `onCanvas: false` indica que el clic caería sobre la interfaz |
| `clickAt(x, y, h)` | Hace clic en ese punto del mundo y avisa si cae sobre la interfaz |
| `walkTo(x, y, {step, maxClicks, stopIfEnemy})` | Camina con clics reales de 13 m. Se detiene si se atasca, si muere o si aparece un enemigo cerca |
| `face(x, y)` | Gira la cámara (`rig.lookToward`) hasta que el punto quede en pantalla, sin interfaz encima |
| `fight({seconds, plan, basicOnly, label})` | Pelea con entrada real: pone el cursor sobre el enemigo y lanza con tecla y clic. Hace clic para el básico y bebe una poción por debajo del 35 % |
| `visibleText(sel)`, `buttons()`, `drainLog()` | Texto visible, botones visibles y las últimas líneas del chat |

`plan` es una lista `[código, tecla, hechizo]` en orden de prioridad. Por ejemplo, la Cazadora usó
`[['KeyW','w','hawk_eye'], ['KeyA','a','powder_arrow']]`.

### Estado del juego desde la consola

`window.__game` solo existe con `import.meta.env.DEV`, es decir, con Vite. No está en el juego empaquetado. Lo
que más se usó:

- `__game.world`: la simulación (`player`, `character`, `enemies.list`, `weather`, `timeOfDay` y `drainEvents()`).
- `__game.view`: el render (`scene` con la niebla en `fogDensity`, `fogStart`, `fogEnd` y `fogColor`; `rig` con
  la cámara en `distance`, `pitchDeg`, `yawDeg` y `lookToward()`; `heights.sample()`).
- `__game.place`, `__game.session`, `__game.bank` y `__game.board(id)`.

Teclas de depuración del juego: **F3** adelanta 3 h, **F2** cambia la velocidad del reloj e **Insert** pasa al
siguiente tiempo en la zona.

## Recetas usadas en esta pasada

**Niebla a 70 m.** Se pone la mañana (F3 hasta `timeOfDay` 0,33–0,55) y un cielo despejado (Insert). Después se
aleja la cámara al máximo y se cambia la inclinación arrastrando con el **botón central**. En cada inclinación se
leen `scene.fogDensity` y `rig.pitchDeg` y se saca una captura. Se repite de noche y con lluvia. Así se obtuvieron
`niebla-antes-70m` y `niebla-despues-*`. El arrastre central se hace con `Input.dispatchMouseEvent` (`button:
'middle'`, `buttons: 4`) en unos 10 movimientos.

**Contar golpes y bloqueos reales.** Se envuelve `drainEvents` una sola vez para copiar los eventos a
`window.__qaEv` sin quitárselos al juego:

```js
await js(`(()=>{const w=__game.world; window.__qaEv=[]; if(!w.__qaWrapped){const o=w.drainEvents.bind(w);
  w.drainEvents=()=>{const e=o(); for(const x of e) if(x.type==='cast'||x.type==='castBlocked')
  __qaEv.push({t:+w.time.toFixed(2), ty:x.type, ab:x.ability, r:x.reason??null}); return e;}; w.__qaWrapped=true;} })()`);
```

Con esos eventos se calcularon los intervalos entre golpes y el tope teórico `3 + ceil(s / 1,4)` de la tabla B.

**Contornos fantasma (Q11).** El estilo visual es un `<select>`, no un grupo de botones. Para cambiarlo hay que
asignar `value` y lanzar los eventos `input` y `change`. Se sacaron capturas de la misma vista con pintura y sin
ella.

**Misiones y diálogos.** Primero `walkTo` hasta el PNJ y `clickAt` sobre él. Después se espera a que
`visibleText('.dialogue')` tenga texto y se hace clic en la opción buscando el elemento más corto que contenga el
texto. Para comprobar la recompensa se compara `state()` antes y después (XP, oro y mochila).

**Morir y reaparecer.** Se hace clic en el botón cuyo texto incluye «Reaparecer». En esta pasada era
«Reaparecer en Piedra Pintada de Iguanera».

## Probar un cambio de datos sin tocar master (prueba B)

El creador pidió que `autoRepeat` siga en `false` en los datos productivos. Para jugar con B:

1. Se crea un worktree temporal en el scratchpad, **fuera del repo**. Su `node_modules` es un enlace simbólico al del
   repo.
2. En el worktree se cambia `data/player.json` (`autoRepeat: true`) y se ejecuta `buildMain`.
3. Se arranca con una variante de `launch.mjs` que hace `chdir` al worktree y usa el puerto fijo 5174. El
   perfil y `url.txt` siguen siendo los de siempre. Lo primero que hace el paso es imprimir
   `__game.world.data.player.basicAttack.autoRepeat` para confirmar qué datos están cargados.
4. Al terminar se borra el enlace `node_modules` **antes** de `git worktree remove --force`. Si no, también se
   borraría el `node_modules` real. Después se comprueba con `git status` que master no cambió.

## Casos que confunden

- **Lanzar hechizos** (modo `pressClick`, el predeterminado). Un hechizo con objetivo necesita la tecla y después un
  clic, o pulsar la tecla dos veces. Los de área propia (`hawk_eye`, `iron_shout`, `storm_focus`) se lanzan solo con
  la tecla. Si se hace clic después, ese clic cuenta como orden de movimiento o como ataque básico. `fight.js` los
  lista en `SELF`. `ember_whirl` y `frost_nova` también están en `SELF`, pero hoy piden confirmación porque su área
  es un círculo alrededor del personaje y `needsAim` devuelve `true`. Eso es la pregunta Q13; no es un fallo del
  arnés.
- **Acercarse no garantiza línea de visión** (Q12). `inRange` incluye `grid.lineOfSight`, así que un ataque puede
  no salir aunque el enemigo esté a la distancia correcta. Lo que hay que mirar es si aparece un `castBlocked`.
- **Interfaz encima del lienzo.** Antes de hacer clic en el mundo hay que mirar `project(...).onCanvas`. La barra,
  el chat y las ventanas se tragan el clic sin dar ningún error.
- **Tamaño de ventana.** `face()` supone una ventana de unos 1800 × 1000 (`innerW` e `innerH` en `lib.js`). Con
  otro tamaño hay que ajustar esas constantes.
- **Avisos de consola.** `[modelos] falta el nodo … en naturaleza_suelo.glb` aparece en cada paso y no lo causa el
  paso. Solo hay que fijarse en los avisos nuevos.
- **Un paso que se corta sin decir nada.** Ocurre cuando la página recarga en medio de una espera. `cdp.mjs`
  muestra entonces `AVISO: el paso se cortó…`. Hay que mirar `buttons()` para saber en qué pantalla quedó y
  seguir desde ahí.
- **Clics y tiempo real.** `fight()` hace una iteración cada 0,35 s más la latencia de CDP. Mide más o menos lo que
  haría una persona atenta, pero no el ritmo de una persona experta.

## Evidencia y registro

- Las capturas que sirven como prueba se reducen a 1280 px de ancho (`sips -Z 1280 archivo.jpg` en Mac) y se
  copian a `docs/capturas/qa-AAAA-MM-DD/` con nombres descriptivos. El resto se queda en `work/`.
- Cada hallazgo va a `docs/QA_AAAA-MM-DD.md` con este formato: reproducción, esperado y observado, evidencia, causa
  o incertidumbre, corrección, pruebas y estado. Además se añade una fila en `docs/TAREAS.md` y una entrada breve
  en `docs/BITACORA.md`.
- No se cambia el balance por un resultado aislado. Una cifra observada en el arnés se contrasta con
  `npm run balance:*`, que usa varias semillas, antes de proponer nada.
- Si otro agente tiene cambios sin guardar, solo se preparan para commit los archivos propios. Con `git add -p` o
  `git apply --cached` se puede dejar fuera un trozo ajeno de un mismo archivo.

## Límites

- Es un bot con entrada real, no una persona: no juzga sensación, ritmo, legibilidad ni diversión.
- Las capturas se miran siempre. Varios defectos (contornos, encuadre) solo se vieron en ellas.
- Necesita ventana y GPU, así que no corre en la nube. Allí solo quedan `npm test`, `typecheck` y los scripts de
  balance.
