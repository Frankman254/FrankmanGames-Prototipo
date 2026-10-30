# HANDOFF — Simulador de equilibrio

- **Objetivo autorizado:** encargo del coordinador del 2026-10-29: un simulador
  de equilibrio sin pantalla que mida con números si el contenido actual (2
  clases, hechizos, enemigos, botín, XP y tienda) está equilibrado, con un
  informe para el creador. Rama `balance-sim` desde `master` 47deff9. Todo en
  `scripts/balance/`, `tests/balance/` y `docs/`; `data/` y `src/` sin tocar.

- **Qué funciona (con cómo probarlo):**
  - `npm run balance` regenera `docs/EQUILIBRIO_2026-10.md` en ~2 min (4
    núcleos): 9 mediciones en procesos paralelos (línea base completa, todos
    los ajustes juntos, línea base reducida y cada ajuste por separado).
    Opciones: `--jobs N`, `--out <ruta>`.
  - `npm test` (36 archivos, 254 tests; 17 nuevos en `tests/balance/`) y
    `npm run typecheck` en verde.
  - **Bots** (`bot.ts`) sobre `World` y `GameSession` reales a 60 Hz: rotación
    genérica de la barra 1–6 deducida de la definición de cada hechizo (sirve
    para cualquier hechizo, también los universales), esquiva de avisos con
    probabilidad 0 / 50 / 90 % y 0,3 s de reacción (andando o con la evasión),
    kiting de la clase a distancia con la misma probabilidad, pociones y
    tónicos (Q/E), una orden cada 0,1 s.
  - **Fuera de combate** (`gear.ts`): equipa lo que mejora una suma ponderada
    de estadísticas (sin cambiar de tipo de arma), puntos 2:1 a principal y
    vitalidad, aprende pergaminos, invoca la mascota luchadora, vende lo que no
    usa y repone pociones.
  - **Batería** (`scenarios.ts`, `battery.ts`): 18 escenarios (arena del Slice
    01, grupos de lobos, goblins y chamanes, mixto, jefes con el lobo alfa) × 2
    clases × 3 habilidades × 2 preparaciones (nivel 1 con kit / nivel 4 con
    equipo) × 12 semillas = 2592 partidas; ablación de cada hueco de la barra y
    sustitución por cada universal; escaleras de tamaño de grupo.
  - **Economía y progresión** (`economy.ts`): granja de 60 min repitiendo la
    arena (vida arrastrada, descanso, venta, reposición, 30 s por muerte), pesca
    con probabilidad de reacción 50 / 80 / 95 % y minutos para comprar cada
    objeto de la tienda.
  - **Ajustes propuestos** (`proposals.ts`): 6 paquetes de cambios de números
    aplicados a una copia en memoria (`rawData()` clona los JSON); el informe
    lista cada cambio (archivo, campo, antes, después) y el resultado de volver
    a simular.

- **Mediciones (lo principal del informe):**
  - Con el kit de nivel 1 nadie con habilidad media o buena muere en ningún
    escenario; la arena se gana el 100 % incluso sin esquivar.
  - La Vanguardia es casi inmune al daño físico (armadura plana ~12 con el
    Grito contra golpes de 8–12 → 1 punto): sin esquivar vence 40 lobos, así que
    la ejecución no decide nada para ella. La Tejedora sin esquivar ni
    apartarse vence 12; esquivando, 40.
  - Obligatorios: Tajo ígneo, Remolino de brasas, Chispa. Casi sin aporte:
    Baluarte, Nova de escarcha, Paso del relámpago. Piel de piedra (universal)
    rinde más que el hueco de clase menos útil.
  - El recurso casi nunca limita (1–2 % de decisiones con un hechizo listo sin
    recurso; recurso medio ~70 %).
  - XP: nivel 2 en mitad del primer combate (subir cura del todo), nivel 10 a
    los 18 min de arena repetida, 16 a los 60 min.
  - Economía: ~140 monedas/min combatiendo; lo más caro de la tienda (210)
    cuesta 1,5 min; la pesca da ~29/min (21 %).
  - Con todos los ajustes: Vanguardia sin esquivar 12 lobos, Tejedora 8; los
    dos esquivando 40; arena 100 % con habilidad media; nivel 10 a los ~43 min;
    lo más caro de la tienda ~10 min.
  - Rendimiento: ~10 ms por partida de grupo, ~1,5 s por granja de 30 min.

- **Decisiones técnicas tomadas y por qué (PROPUESTA):**
  - La rotación se deduce de los datos del hechizo en vez de escribirse a mano
    por id, para que las ablaciones y sustituciones prueben cualquier barra.
  - La habilidad es una sola probabilidad que gobierna esquivar y apartarse;
    apuntar, elegir objetivo y la cadencia son iguales en los tres niveles, así
    que el bot es una cota optimista de un jugador real.
  - Los escenarios de grupo usan un campo abierto de 80 × 80 m (copia en memoria
    de la zona sin obstáculos); la arena usa la zona real.
  - La granja repite la arena porque es el único encuentro del mundo; supone
    que reaparece (en el juego todavía no lo hace).
  - Medidas que el mundo no expone se leen envolviendo métodos de la instancia
    desde el script (no desde `src/`): `World.dropLoot` (el botín puede
    recogerse en el mismo tick en que cae) y `Character.takeDamage` (vida
    perdida tras el escudo). No hizo falta exponer nada nuevo en `src/`.
  - Las conclusiones del resumen se calculan con umbrales explícitos
    (`report.ts`, `analysis.ts`), así que cambian solas al cambiar los datos.
  - Cada medición corre en un proceso `vite-node` aparte (`job.ts`) y se pasa
    en JSON que conserva NaN (`serial.ts`).

- **Incertidumbres que bloquean el siguiente paso:**
  - Los números objetivo son del creador: cuánto debe costar el nivel 20, cuánto
    oro debe valer lo más caro, si un jugador que no esquiva debe poder ganar
    los jefes. Los ajustes propuestos son un punto de partida, no un objetivo.
  - Dos problemas no se arreglan sólo con números y quedan como decisión de
    diseño: la armadura plana (una fórmula porcentual lo resolvería mejor) y la
    XP por enemigo que no depende del nivel del personaje.
  - La regla de que subir de nivel cura del todo es de código
    (`Character.gainXp` → `restore()`); con la curva actual salva combates. No
    se tocó.
  - El veredicto de los hechizos de huida (Paso del relámpago, Nova) es el más
    dudoso: el bot se aparta andando mejor que una persona.
  - Otro agente trabaja en misiones y PNJ; si cambian `data/` o el mundo, basta
    con volver a ejecutar `npm run balance`.

- **Archivos principales:**
  - `scripts/balance/run.ts` (comando), `job.ts`, `serial.ts`
  - `scripts/balance/bot.ts`, `gear.ts`, `scenarios.ts`, `metrics.ts`
  - `scripts/balance/battery.ts`, `economy.ts`, `analysis.ts`, `report.ts`
  - `scripts/balance/data.ts` (copia de los JSON), `proposals.ts` (ajustes)
  - `tests/balance/bot.test.ts`, `tests/balance/report.test.ts`
  - `docs/EQUILIBRIO_2026-10.md` (informe generado), `package.json`
    (`npm run balance`)

- No se tomó ninguna decisión creativa: ningún valor de `data/` cambió y los
  ajustes sólo aparecen en el informe como PROPUESTA.
