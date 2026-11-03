# HANDOFF — Combate v2

Rama `combate-v2`, sin fusionar. Sigue las respuestas del creador en `docs/PREGUNTAS_CREADOR.md`: §5.4 (lanzar hechizos), §6.7 (los básicos deben costar algo) y §7 (sin evasión genérica, defensas como estados, sin armadura). Todas las cifras son PROPUESTA y viven en `data/`.

## Qué cambió

### 1. Sin armadura

- **Qué se quitó.** La estadística `armor` desaparece de:
  - `StatId`, `STAT_IDS` y `PRIMARY/ELEMENT` (stats, content);
  - la tubería de daño (`armorHalf`) y `progression.json`;
  - las clases, objetos, estados, mascotas y fichas de enemigos;
  - la hoja de personaje, el resumen de la mochila, la creación y la sesión falsa de la interfaz.
- **Cómo se defiende ahora.** Sólo con `resist.<elemento>`, con tope del 50 % (`progression.json → resistCap`). No hay erosión. Una resistencia negativa sigue sumando daño, sin tope por abajo.
- **Conversión de lo que daba armadura** (PROPUESTA):
  - **Equipo:** cada punto se convierte en 3 % de resistencia física.
  - **Excepciones:** el equipo del Aprendiz de Tormenta da 4 % de resistencia a la tormenta; la rodela, 6 % física y 4 % de fuego.
  - **Grito de hierro:** +10 % físico.
  - **Piel de piedra:** +20 % físico y +20 % de tierra.
  - **Tortuga:** +6 % físico y +6 % de tierra.
  - **Vanguardia:** 5 % físico de base.
  - **Enemigos:** la armadura que tenían se convierte en el % que antes quitaba al golpe físico (1→5, 2→9, 3→13, 4→17, 6→23).
- **`data/zones.json`** (de otra rama, no se toca) aún tiene `flatPerLevel.armor`. `zonesSchema` acepta esa clave y la ignora, con un comentario.
- **Equilibrio.** Se cambió la propuesta «armadura» de `scripts/balance/proposals.ts` por «resistencias». También cambian los pesos del bot (`gear.ts`) y dos frases del informe.

### 2. Sin evasión genérica

- **Qué se quitó:**
  - `World.commandEvade` y `Player.evading/evadeCooldown`;
  - el suceso `evade`;
  - `data/player.json → evade` y la acción `evade` (de `keybindings.json`, `ACTIONS` y `ACTION_GROUPS`);
  - el hueco «Esp» del HUD de depuración.
- **Espacio queda libre.** Los atajos guardados que aún traigan `evade` se ignoran.
- **Efectos nuevos** en `src/rpg/effects.ts`, cada uno con su subclase de `Effect`:
  - **`blink`:** el lanzador aparece en el punto apuntado (hasta `maxDistance`), sin necesitar línea de visión. Si el punto no se pisa, cae en la celda libre más cercana.
  - **`swap`:** el lanzador cambia el sitio con el objetivo.
  - **`pull`:** atrae al objetivo y se para al tocar al lanzador.
  - **`recoil`:** el lanzador salta hacia atrás, lejos del cursor.
  - Siguen `knockback` (empujar) y `dash` (cargar).
- **Kits** (`classes.json`, `spells.json`):
  - **Vanguardia:**
    - Embestida (`dash`).
    - **Cadena de brasa** (nuevo): `pull` con poco daño, teledirigido.
    - **Represalia** (nuevo): contra.
  - **Tejedora:**
    - **Paso del relámpago:** ahora es un `blink` apuntado al suelo, con alcance de 8 m.
    - **Transposición** (nuevo): `swap` más ralentización corta.
    - **Repliegue helado** (nuevo): cono de escarcha y `recoil` de 5 m.
    - **Espejo de tormenta** (nuevo): reenvío.
- **Bot de equilibrio.** Ya no esquiva con la evasión: sólo andando. El contador `evades` queda siempre a 0.

### 3. Defensas como estados (`statuses.json`)

| Campo | Qué hace | Dónde |
|---|---|---|
| `immune: true` | Sin daño, sin perjuicios ajenos y sin desplazamientos ajenos (empujar, atraer, intercambiar) | **Égida quieta** (2 s, además inmoviliza): pergamino universal |
| `reflect: true` | Los hechizos de un objetivo vuelven al lanzador, una sola vez. El ataque básico y las áreas no se reenvían | **Espejo de tormenta** (4 s): Tejedora |
| `counter: { percent }` | Devuelve el % de cada golpe cuerpo a cuerpo a quien lo dio. El golpe devuelto pasa por la resistencia del atacante, sin crítico y sin nueva contra. Cuerpo a cuerpo = hasta `player.json → meleeReach` (2,5 m entre bordes) | **Represalia** (60 %, 6 s): Vanguardia |
| `rewind: true` | Al acabarse el estado vuelve a la posición que tenía al recibirlo y a esa vida (si ahora tiene más, se queda con más). Muerto antes, no revive | **Eco del instante** (4 s): pergamino universal |

- **Pergaminos universales.** `scroll_time_echo` y `scroll_still_aegis` entran en el kit inicial de las dos clases para poder probarlos.
- **Partidas guardadas antes de esta rama.** No conocen los hechizos nuevos de clase.

### 4. Un objetivo frente a área

- **Hechizos de un objetivo** (`area: single`).
  - Con `projectileSpeed`, son proyectiles teledirigidos de la simulación (`World.missiles`): persiguen al objetivo y llegan aunque se aleje fuera del alcance. Si el objetivo muere antes, el proyectil se pierde.
  - Sin `projectileSpeed`, llegan en el acto.
  - En los dos casos se pueden reenviar.
- **Enemigos.** El campo nuevo `homing` en los ataques de `data/enemies.json` hace un proyectil teledirigido: no se esquiva andando, y sí con inmunidad o reenvío. Lo usa la **Flecha rastreadora** del hostigador veterano. La velocidad está en `player.json → homingSpeed`.
- **Áreas.** Alcanzan a todos los enemigos dentro. Con `friendlyFire: true` en el hechizo, también a mascotas y aliados, nunca al lanzador. Las zonas lo heredan, por ejemplo el Campo estático.
  - **Con fuego amigo:** Lanza glacial, Campo estático y Ráfaga.
  - **Sin fuego amigo:** el resto de áreas, que lo tienen explícito a `false`.
- **Mascotas.** Ahora pueden morir. La del amuleto vuelve tras `petRespawnSeconds` (12 s); un aliado invocado desaparece.

### 5. Lanzar hechizos

- **El modo** es la opción `castMode` de `GameOptions` (`saveStore.ts`), en Opciones → Juego → «Lanzar hechizos». La lógica pura está en `src/sim/castModes.ts`.
  - **`indicator`** (por defecto): se mantiene la tecla y se ve el área en el suelo; soltarla lanza.
  - **`press`:** lanza hacia el cursor al pulsar.
  - **`pressClick`:** la tecla apunta y un clic izquierdo, o la misma tecla otra vez, confirma.
  - **En todos los modos:** Esc o clic derecho cancelan, y los hechizos sobre uno mismo salen al pulsar.
- **Cómo se engancha** (sin tocar `menus/hud.ts`):
  - `World.slotGate` es una puerta en `castSlot`: comprueba recurso, enfriamiento y control antes de apuntar, y si hay que apuntar no lanza.
  - `main.ts` escucha `keyup`, Esc en fase de captura y los clics, y llama a `commandCastSlot` con el cursor.
- **Lo que se ve al apuntar** (`spellFx.syncAim`):
  - el área real (círculo en el cursor, cono o línea desde el jugador);
  - un anillo bajo el enemigo apuntado (hechizos de un objetivo);
  - el anillo de alcance;
  - en gris, si el punto o el objetivo quedan fuera de alcance.
- **La opción «Alcance del hechizo»** cubre ahora apuntar y cargar.
- **Si el hechizo no se puede lanzar** al soltar o confirmar, el motivo sale en un aviso (toast).

### 6. Vista previa del daño

- **`previewHit`** (`src/sim/damage.ts`) da la horquilla sin azar: mínimo–máximo y el crítico, con la probabilidad. Usa la misma tubería que `resolveHit`, con las resistencias del objetivo.
- **`World.previewDamage`** suma los efectos de daño directo del hechizo, con su rango y la diferencia de nivel, y avisa si el objetivo es inmune.
- **La etiqueta** sale bajo el cursor mientras se apunta sobre un enemigo, por ejemplo «17–21 · crítico 25–31 (16 %)» o «Inmune».

### 7. Críticos

- **El número va limpio,** sin «!», un poco más grande y con un salto al salir (`fx.json → critPop`).
- **El «!» es una marca aparte** (`critMark`, rojo anaranjado). Estalla con chispas a un lado del número, en el eje derecho de la cámara y más allá del ancho de la cifra, para que no se lea como parte de ella.
- **Sonido:**
  - `crit` es nuevo: golpe grave, chasquido y campanilla.
  - `crit_taken` suena cuando el crítico te lo hacen a ti.
- **Estados nuevos con efecto visual en `fx.json`.**

### 8. Ataque básico con coste, y lanzar andando

- **El ataque básico gasta una carga.**
  - Tiene 3 cargas (`player.json → basicAttack`) que vuelven de una en una cada 1,4 s; `resourceCost` está en 0.
  - Sin cargas, se bloquea con «Sin cargas de ataque» (`CastBlock 'charges'`).
  - El HUD de depuración enseña las cargas en el hueco «Clic».
- **`castWhileMoving`** en `spells.json`.
  - **Con el flag:** el hechizo no para al jugador, y si tiene `castTime` se carga andando (moverse ya no lo cancela).
  - **Sin él:** el jugador se para, como antes.
  - **Hechizos que lo tienen:** los de un objetivo baratos, las mejoras y los desplazamientos (Chispa, Marca ardiente, Paso del relámpago, Transposición, Cadena de brasa…).

## Cómo probarlo

- `npm run typecheck`, `npx vitest run` y `npm run build`: en verde.
  - Hay 418 tests; 41 son nuevos, en `tests/combatV2.test.ts` y `tests/castModes.test.ts`, más las ampliaciones de daño, contenido y audio.
- **Tests de la tarea:**
  - daño sin armadura y con tope del 50 %;
  - `blink`, `swap`, `pull`, empujar y `recoil`;
  - inmunidad, reenvío (de hechizo y de la flecha rastreadora), contra y retroceso;
  - fuego amigo de línea, nova y zona;
  - teledirigido que persigue;
  - cargas del básico;
  - lanzar andando, también con tiempo de carga;
  - vista previa contra golpes reales;
  - los tres modos y la puerta de `World`.
- **`npm run balance`** funciona y regeneró `docs/EQUILIBRIO_2026-10.md` y `docs/EQUILIBRIO_ZONAS.md`. Se tocó lo justo para que no se rompiera: la propuesta de armadura, el bot sin evasión y los pesos de equipo.
  - **Vanguardia, sin esquivar:** vence 8 lobos (antes 12) y muere en el 9 % de grupos y jefes (antes el 0 %). Se nota la pérdida de armadura, junto con las cargas del básico.
  - **Las clases quedan parejas** (×1,1; antes ×2,3).
  - **El bot no apunta bien los desplazamientos:** Paso del relámpago y Transposición salen al 0 %, y por eso el informe los marca como «no aportan». No es un juicio sobre los hechizos.
  - **La línea «Un universal rinde más…»** del informe repite el nombre de la clase con seis universales (formato de `scripts/balance/report.ts`). No se arregló, porque no es de esta tarea.

## Qué revisar a ojo (en Electron, con ratón y teclado)

Se revisó en el navegador de Vite con eventos simulados:
- indicador de línea y anillo de alcance;
- marca bajo el lobo y etiqueta de daño;
- lanzar al soltar;
- Esc cancela sin abrir la pausa;
- «31» separado del «!».

Falta revisar con el juego real:

1. **El tacto del modo «con indicador»** al mantener Q…Ñ mientras se anda con clic. Lanzar andando, ¿se siente bien?
2. **«Pulsar y clic»:**
   - El clic que confirma no debe mover al personaje, tampoco al mantenerlo.
   - Pulsar un hechizo con el ratón en la barra deja apuntando; hay que confirmar con un clic en el mundo.
3. **El «!» del crítico** con la cámara girada y a distintos zooms.
4. **La flecha rastreadora** del hostigador veterano: el aviso es un anillo a tus pies que no se esquiva andando. ¿Se entiende?
5. **Fuego amigo** de la Lanza glacial o el Campo estático sobre el zorro: los números de daño salen sobre la mascota.
6. **Eco del instante:** el salto de vuelta. Sale un destello en las dos posiciones y la animación de «voltereta» del personaje.

## Preguntas para el creador

1. **Coste del básico:** ¿cargas (como ahora: 3, una cada 1,4 s), algo de recurso, o las dos cosas? Las dos están en datos.
2. **Fuego amigo:** ¿también debe dañar al propio lanzador y a otros jugadores cuando haya cooperativo? ¿Y las áreas de los enemigos a otros enemigos?
3. **Retroceso:** ¿debe devolver también el recurso y quitar los estados recibidos entretanto? ¿Debería poder salvar de la muerte, como un «volver a antes de morir»?
4. **Reenvío:** ¿también para el ataque básico a distancia, o sólo hechizos (como ahora)?
5. **Inmunidad:** ¿quieres que siempre inmovilice (como la Égida quieta) para que no sea un «modo dios» con el que seguir corriendo?
6. **¿Más enemigos** con proyectiles teledirigidos? Hoy sólo la Flecha rastreadora; el resto de ataques enemigos siguen siendo áreas con aviso que se esquivan andando.
7. **Nombres:** Represalia, Espejo de tormenta, Eco del instante, Égida quieta, Transposición, Cadena de brasa y Repliegue helado son provisionales.

## Archivos principales

- `src/sim/damage.ts`: tubería sin armadura, `previewHit`.
- `src/sim/world.ts`:
  - `strike`, contra, inmunidad y retroceso;
  - `deliverSingle`, `fly`, `missiles` y reenvío;
  - `blink`, `swap`, `pull`, `recoil` y `place`;
  - cargas del básico, `castWhileMoving`, `previewDamage` y `slotGate`.
- `src/sim/castModes.ts`: modos de lanzar (lógica pura).
- `src/rpg/effects.ts`, `contracts.ts`, `content.ts`: efectos, campos de estado y flags de hechizo.
- `src/sim/enemies.ts` y `src/data/schema.ts`: `homing` y el nuevo `player.json`.
- `src/render/fx/spellFx.ts`: indicador al apuntar, proyectiles reenviados y destellos.
- `src/render/fx/floatingText.ts`: número y marca del crítico.
- `src/main.ts`: teclas soltadas, Esc, clics y etiqueta de daño.
- `src/ui/menus/saveStore.ts` y `screens/modals.ts`: la opción `castMode`.
- `data/player.json`, `data/rpg/{spells,statuses,items,classes,enemies,pets,progression}.json`, `data/enemies.json`, `data/fx.json`, `data/audio/sfx.json`, `data/ui/keybindings.json`.

No se tomó ninguna decisión creativa definitiva. Nombres, cifras y qué clase lleva cada mecánica son PROPUESTA.
