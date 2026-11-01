# Auditoría de estabilización P0

**Rama:** `fix/p0-estabilizacion`  
**Commit inicial:** `2c3387ce6d25fcce46689e3020af42c5620b4122`  
**Commit final:** pendiente al terminar la operación

## Línea base

- `npm test`: 654/654 pruebas en verde al ejecutarse con acceso a loopback.
  Dentro del sandbox, la única prueba fallida fue la conexión WebSocket local
  (`EACCES 127.0.0.1`); la repetición fuera del aislamiento pasó.
- `npm run typecheck`: verde.
- `npm run build`: verde, con la advertencia preexistente de Vite por el tamaño
  del chunk principal.

## Estado de los errores

| Error | Reproducido | Corregido | Estado |
|---|---:|---:|---|
| P0-01 — desasignación accidental de hechizos | Sí | Sí | Pruebas automáticas en verde; revisión manual Electron pendiente |
| P0-02 — pausa global y menú ESC | Sí | Sí | Automático y Electron en verde |
| P0-03 — pasos y eventos audiovisuales | Sí | Sí | 666/666 y build en verde |
| P0-04 — curación innecesaria de mascota | Sí | Sí | 670/670 y build en verde |
| P0-05 — jerarquía de ventanas y HUD | Sí | Sí | Automático y Electron en verde |
| P0-06 — clic en la posición actual | Sí | Sí | 673/673 y build en verde |
| Vegetación en mazmorra | Sí | Sí | Automático y transición cripta→exterior en Electron |
| Balance y progresión | Pendiente | No aplica | Auditoría no iniciada; no se cambiarán valores |

## P0-01 — desasignación accidental de hechizos

### Comportamiento anterior y causa raíz

`src/ui/menus/dragModel.ts` trataba los destinos `trash` (exterior o terreno) y
`none` (panel no compatible) como una orden
`assignHotbar(index, null)`. El controlador DOM sólo clasificaba el destino; la
mutación accidental se originaba en esa regla pura.

### Cambio y justificación

Un arrastre con origen `hotbar` sólo produce una orden cuando el destino es
otro hueco válido de la barra. Cualquier otro destino devuelve `none`. No se
eliminó ni alteró `assignHotbar(null)`, porque sigue siendo una operación válida
de la sesión para acciones explícitas.

### Archivos modificados

- `src/ui/menus/dragModel.ts`
- `tests/ui/dragModel.test.ts`
- `docs/BITACORA.md`
- `docs/AUDITORIA_ESTABILIZACION_P0.md`

### Pruebas reales

- Focalizadas: 27/27 en
  `tests/ui/dragModel.test.ts`, `tests/rpg/session.test.ts` y
  `tests/ui/saveStore.test.ts`.
- Regresión completa tras el cambio: `npm test` 658/658,
  `npm run typecheck` verde y `npm run build` verde.
- Casos: fuera de la barra, terreno, panel incompatible, mismo hueco, hueco
  ocupado, hueco vacío, cancelación y persistencia tras reorganizar.

### Riesgos y arquitectura futura

El cambio queda en el modelo puro de presentación y no modifica simulación,
identificadores, guardados ni contratos públicos. Para una arquitectura MMORPG,
la UI continúa emitiendo una intención explícita y la sesión conserva la
autoridad para validar cualquier asignación. Riesgo residual: el gesto completo
con puntero no se revisó todavía en Electron.

## P0-02 — pausa global y menú ESC

### Comportamiento anterior y causa raíz

`MenusController.blocksGame` era verdadero ante cualquier modal y se reutilizaba
para detener el reloj fijo, `session.tick`, sistemas de sesión, puntero, atajos y
apuntado. Además, el fondo del modal interceptaba todo el viewport. Por eso una
ventana de interfaz se comportaba como una pausa global.

### Cambio y justificación

La política pura `modalPolicy` separa `simulationPaused`, `keyboardCaptured` y
`pointerCaptured`. Sólo el modal superior decide: Pausa, Opciones y Atajos son
`overlay`; confirmaciones, guardado/carga, muerte y demás flujos transaccionales
continúan como `blocking`. Un overlay captura sus propios controles y el teclado
del juego, pero su fondo deja pasar clics al mundo. Se conserva `blocksGame` como
compatibilidad, sin usarlo para el reloj fijo.

### Archivos modificados

- `src/ui/menus/modalPolicy.ts`
- `src/ui/menus/index.ts`
- `src/ui/styles/menus.css`
- `src/main.ts`
- `tests/ui/modalPolicy.test.ts`
- `tests/loop.test.ts`

### Pruebas reales

- Política pura: título/creación, partida libre, overlay, bloqueo apilado y
  retorno al overlay inferior.
- Reloj fijo: no hay recuperación de ticks por el tiempo externo de pausa.
- Electron: el reloj pasó de 05:24 a 13:23 con Pausa/Opciones abiertos; un clic
  exterior movió de `[-1,-1]` a `[-1,1]`; al quedar quieto, un clic dentro de
  Gráficos mantuvo celda, 35 pasos y 108 eventos `footstep`.
- Regresión final del paso: 71 archivos, 664/664 pruebas; typecheck y build en
  verde. La ejecución aislada conserva el `EACCES` conocido de loopback; fuera
  del sandbox la prueba WebSocket pasó.

### Riesgos y arquitectura futura

La política es independiente del DOM y del render, y admite añadir permisos más
finos sin acoplarlos a Babylon. Riesgo residual: `blocksGame` queda como alias de
compatibilidad y debe retirarse sólo en una migración posterior y explícita.

## P0-03 — sonidos de pasos y eventos audiovisuales

### Comportamiento anterior y causa raíz

`PlayerAvatar.sync` consideraba movimiento a `p.path.length > 0`. La ruta es una
intención, no evidencia de desplazamiento: durante una pausa bloqueante, con
velocidad cero o frente a un cuerpo que impide avanzar podía permanecer. El clip
`run` se reproducía entonces con una cadencia mínima y aumentaba `footsteps`;
`AudioDirector` respondía correctamente a ese contador incorrecto.

### Cambio y justificación

`isPlayerMoving` exige simulación activa, vida, ruta, velocidad positiva y una
diferencia real entre `prevPos` y `pos`. `main` pasa explícitamente el estado de
la simulación a la vista. Se mantiene el evento de animación como única fuente
del polvo, telemetría y sonido; no se añadieron temporizadores de audio.

### Archivos modificados

- `src/render/characters/playerAvatar.ts`
- `src/render/arenaView.ts`
- `src/main.ts`
- `tests/animation.test.ts`

### Pruebas reales

- Ruta con desplazamiento, ruta sin desplazamiento, velocidad cero, simulación
  bloqueada, ruta vacía y muerte.
- Animación y audio focalizados: 26/26.
- Regresión completa: 71 archivos y 666/666 pruebas; typecheck y build en verde.

### Riesgos y arquitectura futura

La vista sigue observando estado autoritativo (`prevPos`/`pos`) y no decide el
movimiento. El umbral de `1e-10` sólo filtra ruido numérico, muy por debajo de un
paso de simulación; no cambia velocidad, rutas ni balance. El audio conserva una
dependencia de un contador de presentación, apropiada para este prototipo pero
susceptible de migrarse a eventos de locomoción replicados en una arquitectura
online futura.

## P0-04 — Tortuga de musgo y curación innecesaria

### Comportamiento anterior y causa raíz

La protección aguas abajo ya era correcta: `Actor.heal` limita a `maxHealth`,
`World.context().heal` sólo emite con cantidad efectiva positiva y `cuesForEvent`
no suena con cantidad menor que uno. La aplicación redundante ocurría en
`GuardianBehavior.tick`, que ejecutaba cualquier aura cada cuatro segundos aun
si la única función de esa aura era curar a un dueño con vida completa.

### Cambio y justificación

`shouldApplyGuardianAura` reconoce curación directa o un estado cuyo tick cura y
sólo lo aplica si falta vida. Las auras no curativas siguen ejecutándose a vida
completa. No se cambió potencia, frecuencia, duración, acumulaciones ni datos;
las resistencias pasivas de la tortuga siguen gestionadas por el equipo.

### Archivos modificados

- `src/rpg/pets.ts`
- `tests/rpg/world.test.ts`
- `tests/audio.test.ts`

### Pruebas reales

- Vida completa durante tres ciclos: sin estado ni eventos de curación.
- Vida parcial, tope exacto (evento efectivo de uno), daño posterior y nuevo tick.
- Retirada de la tortuga: el estado expira y no reaparece.
- Regeneración aplicada por otra fuente continúa curando normalmente.
- Audio: cantidad cero no produce cue; cantidad uno sí.
- 56/56 focalizadas; regresión completa 670/670; typecheck y build en verde.

### Riesgos y arquitectura futura

La decisión permanece en la conducta autoritativa de mascota y no en audio/UI.
La detección se basa en el tipo estructurado de efecto, no en el id de la
tortuga, por lo que futuras auras no curativas no quedan bloqueadas. Una aura
curativa deja de estar prearmada tras varios ciclos completos: al recibir daño
espera hasta su siguiente pulso original, sin introducir ticks ni potencia
adicionales.

## P0-05 — jerarquía de ventanas y HUD

### Comportamiento anterior y causa raíz

Las capas de pantalla, juego, modal y avisos eran elementos posicionados sin un
`z-index` propio. Por ello no formaban stacking contexts: el `z-index` creciente
que `WindowLayout.front` asigna a cada panel podía participar en la comparación
global y rebasar un modal después de suficientes enfoques. El valor extremo del
tooltip era un parche para el mismo problema.

### Cambio y justificación

`UI_LAYER_Z` define una política única: pantalla, juego, edición HUD, modal,
avisos y auxiliares. `mountMenus` la aplica a las capas raíz, confinando el
contador dinámico al contexto de juego o modal que le corresponde. Tooltip y
fantasma de arrastre usan la capa auxiliar y conservan `pointer-events: none`.
No se alteran claves, posiciones guardadas, bloqueo ni perfiles.

### Archivos modificados

- `src/ui/menus/windows.ts`
- `src/ui/menus/index.ts`
- `src/ui/menus/drag.ts`
- `src/ui/menus/tooltip.ts`
- `src/ui/styles/menus.css`
- `src/ui/styles/map.css`
- `tests/ui/windows.test.ts`
- `tests/ui/progressionUi.test.ts`

### Pruebas reales

- Orden estricto de las seis capas y auxiliar sin captura de puntero.
- Regresión de colocación, opciones y política modal: 27/27 focalizadas.
- Electron maximizado 3434×1439 y restaurado 1266×793: Opciones por encima de
  HUD, mapa y barra, controles utilizables y contenido desplazable.
- Regresión completa 671/671; typecheck y build en verde.

### Riesgos y arquitectura futura

Los valores sólo ordenan contextos raíz; no son una carrera de enteros. El foco
de paneles puede crecer sin escapar de su capa. La separación es compatible con
presentación cliente de un MMORPG y no toca estado de sesión ni persistencia.

## P0-06 — clic en la posición actual

### Comportamiento anterior y causa raíz

`commandMove` limpiaba diálogo, pesca, ataque, botín y ciertos lanzamientos antes
de llamar a `walkTo`. Sólo allí se rechazaba una distancia menor de `1e-4` al
cuadrado. La ruta no cambiaba, pero las intenciones ya se habían perdido.

### Cambio y justificación

La tolerancia preexistente se nombró `MOVE_COMMAND_TOLERANCE = 0.01` (1 cm en
unidades del mundo). `commandMove` recorta primero el destino a la zona y sale
sin mutar si queda dentro de esa distancia. `walkTo` usa la misma constante; no
se amplió el área muerta ni se cambió A*, velocidad o alcance.

### Archivos modificados

- `src/sim/world.ts`
- `tests/world.test.ts`

### Pruebas reales

- A 0,5 cm se conservan ruta/destino, ataque, botín, lanzamiento, diálogo y pesca.
- A 2 cm, aun dentro de la misma celda, la orden sigue cancelando intenciones y
  crea el destino válido como antes.
- Navegación, mundo RPG y esqueleto: 41/41 focalizadas.
- Regresión completa 673/673; typecheck y build en verde.

### Riesgos y arquitectura futura

El filtro vive en la entrada autoritativa de la simulación, por lo que evita
comandos vacíos también en un futuro servidor. La constante es física y
documentada; no depende de casillas ni de presentación.

## Vegetación en mazmorra

### Comportamiento anterior y causa raíz

`CryptScene` desactivaba las mallas exteriores al entrar, pero
`VegetationView.setDensity` administraba por separado las thin instances y las
reactivaba con `setEnabled(n > 0)`. Por ello abrir Opciones o aplicar un perfil
gráfico dentro de la cripta podía hacer aparecer hierba exterior. Era un
conflicto entre dos dueños del mismo estado de visibilidad, no un problema de
generación procedural ni de datos de la mazmorra.

### Cambio y justificación

`VegetationView` mantiene dos estados ortogonales: densidad decorativa y
visibilidad exterior. Una única función aplica ambos, de modo que la densidad
puede cambiar en interiores sin habilitar ninguna malla. `CryptScene` controla
la visibilidad mediante `setVisible(false/true)` al entrar y salir. La densidad
seleccionada se conserva y vuelve a aplicarse al exterior.

### Archivos modificados

- `src/render/vegetationView.ts`
- `src/scenes/cryptScene.ts`
- `tests/vegetation.test.ts`

### Pruebas reales

- Estado puro con densidades 0, 0,4 y 1, tanto exterior visible como oculto.
- Mazmorra, diseño de pisos, opciones y vegetación: 43/43 focalizadas.
- Electron: piso 5 de la cripta sin vegetación exterior; al reaparecer en Villa
  Raspadura, la vegetación exterior volvió a ser visible.
- Regresión completa 674/674; typecheck y build en verde.

### Riesgos y arquitectura futura

La escena sigue siendo quien decide si el exterior existe; las opciones sólo
deciden cuánto se dibuja cuando existe. Esa separación evita que futuras
preferencias gráficas o sincronización de perfiles atraviesen límites de zona.
Los props no thinnables se ocultan con la misma política. No se tocaron datos,
semillas ni distribución de vegetación.

## Hallazgos de balance

Pendientes. Esta intervención no cambiará fórmulas ni datos de balance.

## Elementos que requieren aprobación del creador

Ninguno derivado de P0-01. Una acción futura para quitar voluntariamente un
hechizo de la barra requeriría un diseño explícito y no forma parte de esta
corrección.
