# Tareas de desarrollo

Tablero único. Rehecho el 2026-11-18 a petición del creador: aquí solo queda lo abierto. Las filas anteriores, con su texto y su evidencia, siguen sin cambios en:
- [historico/TAREAS_HASTA_2026-11-18](historico/TAREAS_HASTA_2026-11-18.md);
- [historico/TAREAS_HASTA_2026-11-17](historico/TAREAS_HASTA_2026-11-17.md).

Otros documentos:
- lo comprobado: [ESTADO_ACTUAL](ESTADO_ACTUAL.md);
- lo que el creador debe probar o decidir: [ACCIONES_CREADOR](ACCIONES_CREADOR.md);
- el diseño: [diseno](diseno/README.md).

## Reglas del tablero

- **Estados**:
  - **Autorizada**: el creador la encargó y se puede ejecutar.
  - **En curso**.
  - **Parcial**: hay entrega, pero falta parte de la aceptación.
  - **Espera al creador**.
  - **Sin autorizar**.
  - **Bloqueada**.
  - **Hecho**.
- Un agente solo ejecuta filas **Autorizada**. Cada encargo cumple el contrato de 11 puntos de [AGENTS.md](../AGENTS.md#contrato-mínimo-de-una-tarea); lo que falte en la fila lo completa la cola del agente (`work/prompts-noche/COLA_<AGENTE>.md`).
- **Normas comunes**:
  - no se cambian cifras productivas;
  - la lógica va en `src/sim/` o `src/rpg/`, con pruebas;
  - no se relaja ninguna prueba;
  - los nombres son originales y provisionales;
  - la evidencia va en `work/<agente>-<tarea>/`.
- **Quién**: J = Junie, O = OMP, C = Codex, Coord = Claude coordinador, «—» = sin asignar.
- **Al cerrar una fila**: se marca Hecho con su commit y su prueba. En la siguiente limpieza pasa al histórico.

## Nuevas del creador (2026-11-18)

Salen de sus respuestas A1–A6, H03 y de la segunda tanda ([ACCIONES_CREADOR](ACCIONES_CREADOR.md#respuestas-del-2026-11-18)).

| ID | Quién | Estado | Qué hay que hacer | Aceptación |
|---|---|---|---|---|
| UI-04 | O | Autorizada, en la cola de OMP tras WIN-01 | Vida a la vista: jefes y rivales de PvP con barra fija y número actual/máximo; los demás monstruos la muestran, con número, al pasar el puntero | Prueba de formato y capturas en Electron: jefe, PvP y monstruo con el puntero encima |
| BAL-02 | Coord | Autorizada, tras UI-04 | Proponer vida y mecánicas de jefes tardíos y el daño en PvP, como `PROPUESTA` y medidas contra H04 (combate de nivel 1, menos de 30 s; jefe o PvP de nivel 200, 5–15 min) | Tabla de cifras con su medición; el creador la prueba antes de integrarla |
| DEV-02 | O | Autorizada, en la cola de OMP (2026-11-19) | Por defecto, el día dura **20 min** (antes 5) y una partida nueva empieza por la mañana. En Opciones → Desarrollo se elige entre 5, 10, 20, 30 y 60 min | El cambio no salta la hora del día; prueba pura de la duración y de la hora inicial |
| INV-01 | J | Autorizada, en la cola de Junie (2026-11-19) | Un monstruo invocado no da experiencia ni botín, y muere cuando muere su invocador. Hoy `summonerId` solo se usa para contar invocaciones (`src/sim/enemies.ts`) | Pruebas: matar al invocador mata a sus invocaciones; matar una invocación da 0 de experiencia |
| MUE-02 | J | Autorizada, en la cola de Junie (2026-11-19) | Morir en la cripta te deja en la Piedra Pintada. Se guarda el piso donde caíste; al volver a entrar se ofrece «Retomar piso N» o «Empezar en el piso 1». Se conserva en el guardado | Pruebas del estado y de guardar/cargar; recorrido en Electron |
| MUE-03 | J | Autorizada, en la cola de Junie (2026-11-19) | Al morir, montura y mascota dejan de verse y no actúan; vuelven al revivir sin perder su configuración | Prueba de estado y captura del espectro sin montura ni mascota |
| MUE-01 | J | Autorizada, en la cola de Junie (2026-11-19) | El espectro sigue llegando solo con el Pulso a 0. Al bajar a 20 de Pulso sale un aviso: «si vuelves a caer, te convertirás en fantasma» | Prueba del aviso en el umbral; captura |
| AUD-02 | — | Autorizada | Sustituir los timbres sintéticos de la música por muestras de instrumentos reales con licencia libre (H08), registradas en `PROCEDENCIA.md`. Las partituras actuales se conservan | Antes y después de Iguanera y la cripta en `work/`; licencias registradas |
| AUD-IA-01 | Coord, en Windows | Autorizada (creador, 2026-11-19: «elige el que mejor creas… deja todo listo») | Instalar ACE-Step Studio 4.0.1 en el PC con la 3080 y hacer el piloto. El stack, la auditoría y los pasos están en [GUIA_AUDIO_MCP](GUIA_AUDIO_MCP.md) §1, §3 y §8: telemetría apagada, acceso de red apagado, conjunto Balanced, Tailscale y SSH solo con clave. No instalar Regrind, MuScriptor, LoRA ni OpenRouter | Los 7 puntos del §8 con evidencia en `work/claude-aud-ia-01/`; `check_audio_ia.ps1` en verde; `omp_audio.sh` conecta desde el Mac; la guía se corrige con lo medido |
| AUD-IA-02 | O, modo Audio | Bloqueada por AUD-IA-01 | Tres motivos originales de ~20 s para Iguanera, varias semillas cada uno (GUIA_AUDIO_MCP §5) | Cada pieza pasa `validar_audio_generado.py` y tiene ficha reproducible en `work/omp-audio-aud-ia-02/`; el creador elige una |
| AUD-IA-03 | J | Bloqueada por la elección del creador en AUD-IA-02 | Integrar el motivo elegido: WAV de 44,1 kHz y 16 bit en `assets/audio/music/iguanera/`, fila en `PROCEDENCIA.md` antes del commit, y cableado con prueba. La partitura actual queda como respaldo | Prueba del cableado; `npm run build` con `checkPublishable` limpio; suena en Electron |
| DIST-01 | Coord | Espera al creador (Q20) | Lanzador gratuito y sin firma para Windows y Mac. Comprueba si cambió `master`, se actualiza solo y tiene un botón «Actualizar». La red queda en el lanzador, nunca en el juego. Propuesta: traer los cambios con `git pull` y recompilar en cada máquina | Según Q20 |
| UI-05 | — | Autorizada | Cifras de daño flotantes (no las del chat) con letra gruesa, contorno y colores vivos por elemento y crítico. Fuente libre (OFL o Apache), registrada en `PROCEDENCIA.md`; nunca la de otro juego. Candidatas por comprobar: Lilita One, Titan One, Bangers y Luckiest Guy | Capturas antes y después en combate; licencia registrada |
| NOM-01 | O | Autorizada, en la cola de OMP (2026-11-19) | Los nombres de personaje admiten números y más de 16 caracteres | Prueba de validación |
| EQ-09 | Coord | Autorizada | Conjuntos con dichos panameños («del Ñeque», «Vaina»…) y descripciones con humor panameño. Cifras con la curva de EQ-07 | El creador aprueba nombres y textos antes de integrarlos |
| ICO-01 | C | Autorizada | Cada pergamino de hechizo muestra una versión simple del icono de su hechizo, no un pergamino blanco | Lámina a 46 px; registrado en `PROCEDENCIA.md` |
| BES-01 | Coord | Autorizada | Bestiario por familias de hasta 6 miembros con su jefe (para mazmorras), únicos sin familia y archimonstruos con calavera de aviso. Fauna panameña y criaturas propias (arañas, slimes, jabalíes, cerdos, pollos, cangrejos, langostas, cabras lanudas…) en versión cómica, con nombres panameños originales, elemento y habilidades. Primero la ficha en `docs/diseno/` | El creador aprueba la ficha antes de modelar |
| MOD-03 | O (Blender) | Bloqueada por BES-01 | Modelar las familias aprobadas con la calidad de MOD-01 (esculpido, retopología y horneado) siguiendo [GUIA_BLENDER_MCP](GUIA_BLENDER_MCP.md). El coordinador revisa cada entrega frente a la referencia | Renders y validador en `work/omp-mod03-<familia>/` |
| BUG-01 | O | Autorizada, en la cola de OMP (2026-11-19) | En la cripta, a veces el fuego de la antorcha se ve sin la pieza que lo sostiene | Prueba o recorrido en Electron con todas las antorchas completas |
| T06 | Coord | Autorizada, diseño | Ranura de mascota y menú: características, hechizos y hasta tres hechizos del jugador que lanza sola. Con límites para que no automatice el combate | Diseño aprobado por el creador antes de programar |
| D-01b | J | Autorizada, en la cola de Junie (2026-11-19) | Hechizos universales: el rango N cuesta N pergaminos | Pruebas del coste |

## Rebanada 1–10

Autorizada por el creador el 2026-11-18 (Q14). Las fichas de diseño van antes que el código:
- D-30, fichas de zonas;
- D-10, D-12, D-13 y D-14, familias y comportamientos;
- D-18, comején;
- D-20, misiones 1–5;
- D-25, secundarias;
- D-23, despertar por clase.

## Mapa de Panamá

| ID | Quién | Estado | Qué hay que hacer | Aceptación |
|---|---|---|---|---|
| MUN-01 | Coord | Autorizada, paso 1 | Veraguas (Veraguí) es la provincia siguiente (A1). Primero, una ficha de diseño con sus regiones vecinas, caminos, pueblos y monstruos de cada zona (de la región y originales), con nombres provisionales | El creador aprueba la ficha antes de tocar el terreno o `data/` |

## En curso y autorizadas

| ID | Quién | Estado | Qué falta | Aceptación |
|---|---|---|---|---|
| WIN-01 | Claude | En curso (2026-11-18). Hecho `e13ecc7`: el cartel de cada enemigo se recreaba en cada fotograma; en pantalla completa 3440×1440 con la 3080, pueblo 34→70 fps, Iguanera 60→122, pisos 1/20/60/100 → 160/139/135/150, p95 ≤ 20 ms. Falta: piso 30 con La Espeja, tirones de 1–3 s al entrar a un piso (compilación de shaders y modelos de enemigos), Los árboles ya iban agrupados por trozos de 64 m (thin instances); las piezas de `landmarkView` (casas y demás) pasan a instancias manteniendo su animación propia: 671→624 draw calls en el pueblo, sin cambio visible de fps. Lo que limita el pueblo es la CPU de Babylon con ~1.170 mallas activas y tres pasadas (color, sombras y profundidad). Se mide siempre en pantalla completa (creador, 2026-11-18) | Que el juego vaya fluido en el PC del creador (RTX 3080 y RTX 2080), que hoy no aprovecha ni la GPU ni la CPU (creador, 2026-11-18). Recoge lo que quedó de PERF-01. Contrato debajo | ≥ 60 fps de media y p95 ≤ 25 ms a 1920×1080 en la 3080, con las opciones por defecto, en: pueblo, Iguanera, piso 30 con La Espeja y pisos 1, 20, 60 y 100. Si no se llega, el motivo medido. Se anota también el uso de GPU y CPU. Meta `PROPUESTA` |
| HZ-04a | Coord | Base provisional (creador, 2026-11-19); falta su revisión detallada | 2.ª versión, más corta, en [03, «Repertorio revisado»](diseno/03_HECHIZOS_Y_RANGOS.md): 32 por clase (18 de daño, 4 potenciadores, 6 de control y 4 de defensa), 15 reacciones elementales y cifras que escalan con el nivel del personaje | El creador la revisa antes de tocar `data/` |
| HZ-04b | J | Parcial (`52d72ee`), en la cola de Junie (2026-11-19) | Mecánicas de las §2 y §3 de la propuesta HZ-04a: carga real, Congelado y Entumecido, reacciones elementales detrás de una opción de desarrollo, potencia y daño de empuje, crítico y daño fijo, escudo por nivel, desechizar, invulnerabilidad según la distancia y repartir daño. No se asignan a hechizos de producción | Pruebas de efecto en combate por mecánica |
| HZ-04c | J | Bloqueada por HZ-04a | Aplicar a `data/rpg/spells.json` el repertorio aprobado, con iconos y su inglés | — |
| HZ-03 | J | Parcial | Faltan 18 hechizos que esperan las primitivas M2–M9. Además, las escaleras de rangos se reparten hasta el nivel 400 (Q9, creador): los últimos hechizos de cada clase son los más fuertes. Depende de D-50 | `tests/hz03_spellCalendar.test.ts` |
| D-06 | Coord | Autorizada | Fijar por entregas la línea de hechizos que falta en las tres clases, sin cuota por elemento | Cifras `PROPUESTA` con comparación; el creador aprueba antes de integrar |
| D-08 | Coord + J | Autorizada por fases | Integrar los hechizos de 25–200; primero los que usan efectos existentes | Se conservan los rangos automáticos |
| D-07 | C + J | En curso | Iconos de hechizo: 53/53 de los actuales y 3/48 de la línea nueva | PNG propios a 46 px, registrados en `PROCEDENCIA.md` |
| EQ-06 | C | Autorizada | Segundo pase de iconos de objetos y de los conjuntos nuevos, incluidas las 243 piezas de EQ-07 | Revisado a 46 px y registrado en `PROCEDENCIA.md` |
| MOD-01 | Coord | En curso | Falcopama esculpida pieza por pieza según su desglose modular ([GUIA_BLENDER_MCP](GUIA_BLENDER_MCP.md)) | Renders frente a la referencia en `work/claude-mod01/`; entra en `data/` tras revisión del creador |
| J12 | J + Coord | Reabierta | La utilería de Iguanera está en los datos y en la prueba, pero no se ve en escena junto a (633, 246). Hay que averiguar por qué | Capturas de Electron con banco, cajón, barril y fogata visibles |

**Contrato de WIN-01**, añadido el 2026-11-18: en el paso 4 se anota, además, el uso de GPU y CPU con el Administrador de tareas.

1. **Objetivo:** que el juego vaya fluido en Windows, midiendo antes de tocar. Lo pidió el creador el 2026-11-17 por la noche.
2. **Archivos:**
   - Puede modificar `src/render/**`, la puesta en marcha del motor en `src/main.ts`, `electron/main.ts` y `scripts/qaElectron.mjs`.
   - No toca `src/sim/`, `src/rpg/`, `src/world/`, `data/`, `assets/` ni lo que otro agente tenga sin publicar (`git status`). Las cifras de juego no se cambian.
3. **Paso 0:**
   - `git pull`, `npm ci`, `npm test` y `npm run typecheck` en verde.
   - Comprobar con el panel de rendimiento del juego (línea `GPU …`) qué tarjeta usa Electron.
   - Con dos GPU, `force_high_performance_gpu` no elige entre ellas. Probar Configuración de Windows → Pantalla → Gráficos (Electron en alto rendimiento) y el monitor conectado a la 3080, y anotar el efecto.
4. **Medir antes:**
   - `node scripts/qaElectron.mjs rendimientoHondo` y `node scripts/qaElectron.mjs rendimiento`.
   - A mano, la partida de prueba «Jefe piso 30 · La Espeja» con el panel de rendimiento.
   - Anotar fps, p95, draw calls, mallas activas, esqueletos, sombras y luces. Hacerlo a 1920×1080 y a la resolución real del monitor.
5. **Arreglar:**
   - Un cambio por commit, y volver a medir tras cada uno.
   - Por dónde empezar: lo que dejó PERF-01 (carga de modelos de enemigos de golpe al entrar al piso, luces dinámicas de la cripta, materiales sin `freeze()`), los mapas de sombras, los huesos y las animaciones de modelos lejanos, y el límite de fps o vsync.
6. **Bloqueos:** si un arreglo cambia lo que se ve (quitar sombras por defecto, bajar la calidad o la distancia de vista), no se aplica. Se anota en `docs/ACCIONES_CREADOR.md` para que decida el creador.
7. **Validación:** `npm test`, `npm run typecheck`, `npm run build` y el escenario de Electron del cambio. No se relaja ninguna prueba.
8. **Evidencia:**
   - Los ficheros, en `work/win01/` de esa máquina.
   - Como `work/` no viaja por Git, la tabla antes/después (zona, fps, p95, draw calls, GPU) va en la entrada de `docs/BITACORA.md`.
9. **Integración:**
   - Commits pequeños en `master`, solo con las rutas propias: `git commit -- <rutas>`.
   - `git pull --rebase` antes de `git push origin master`, y nunca `--force`.
   - Al terminar, actualizar esta fila y `docs/ESTADO_ACTUAL.md`. El coordinador revisa contra la tabla.
10. **Reanudación:** leer esta fila, `git log` y `docs/BITACORA.md`, y seguir desde la última medición publicada.

## Hechas, pendientes de que el creador las vea

| ID | Qué ver |
|---|---|
| EQ-07 | Fichas de objetos de nivel 40 y 200; preguntas Q21 y Q22 |
| F36-POL, F36-DANZA | La Espeja: modelo, vaivén y danzas |

## Esperan al creador

| ID | Qué falta |
|---|---|
| D-50 | Nivel máximo 400 (Q13) |
| EQ-08 | Reforja y versión dorada: recomendación del coordinador pendiente de visto bueno (Q23) |
| D-01c | Tasa de botín de los pergaminos |
| D-17 | Ave: color de la tijereta (Q16) |
| T04 | Cifras de la vertical Panamá Viejo y Diablicos Espejos |
| Q01, Q10, Q13 | Iguanera, ataque automático y hechizos de área propia |
| F05, F22, F28, F33, F34 | Decoraciones, pintura, audio y monturas de desarrollo: hay que verlas o elegir |

## Sin autorizar

Listas para cuando el creador lo diga; el texto completo está en el histórico.

- **Prototipos**: D-02, obstáculo; D-05, Brasa; D-04, Hilos; D-03, Reclamo.
- **Orden del repositorio**: D-42 y D-43, refactors pequeños.
- **Abiertas de antes**:
  - T01 y T02, balance humano;
  - T06, T07 y T10, mascotas con hechizos, harpía y temporadas;
  - T08 y T09, regiones e interiores;
  - T13, vista en vivo al crear personaje;
  - T14, Iguanera como inicio;
  - R03, fuente píxel;
  - R06, monturas productivas;
  - R08, idiomas;
  - R10, acción y movilidad del agua;
  - P05, pila de leña;
  - P12, modales;
  - M01, arte LOD;
  - M06 y M07, lugares y costa;
  - B06 y F27, emotes;
  - B07, edificios;
  - F18, F19, F23 y F24;
  - A01, A03, A06 y A07, flora y arte;
  - U02, retrato;
  - Q06, textos de Iguanera;
  - Q09, «Curas» sin origen y la tecla 1 en diálogos;
  - E03, editor de casas.

## Bloqueadas

- Hasta cerrar la rebanada: D-11, D-15, D-16, D-19, D-21, D-22, D-24, D-31 y D-32.
- D-44, solo si hay choques reales entre agentes.
