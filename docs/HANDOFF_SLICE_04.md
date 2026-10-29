# HANDOFF — Slice 04 (sonido y música por código)

- **Objetivo autorizado:** encargo del coordinador del 2026-10-29: efectos,
  ambiente y música generados con Web Audio, sin descargas. Rama `slice04-audio`
  desde `origin/master` (69b8e49). Todo en `src/audio/**` y `data/audio/*.json`
  (PROPUESTA); `main.ts` sólo gana la línea `mountAudio(...)` y su import.

- **Qué funciona (con cómo probarlo):**
  - `npm test` (34 archivos, 237 tests) y `npm run typecheck` en verde.
  - `npm run dev`: el audio arranca con el primer clic o tecla. En la consola de
    desarrollo, `__audio.played` cuenta los sonidos disparados y
    `__audio.music.lastGains` / `__audio.ambience.mix` muestran la mezcla.
  - **Motor** (`engine.ts`): buses master, música, efectos, ambiente e interfaz
    → limitador → salida; volumen general de las opciones de la interfaz
    (`menus.onOptions`); tope de voces simultáneas.
  - **Efectos** (`data/audio/sfx.json`): recetas por capas (osciladores o ruido,
    filtro, envolvente) con variación aleatoria y paneo/atenuación según la
    posición respecto al jugador y la orientación de la cámara. Arma por tipo,
    lanzamiento e impacto por elemento, crítico, golpe recibido, evasión, pasos
    (eventos `footstep` de la animación; grava en camino, hierba fuera), botín,
    monedas, rareza alta, subida de nivel, aviso de ataque (no se atenúa por
    debajo del 55 %), muertes, invocación, curación, clics y paneles de la
    interfaz, compra y venta en la tienda, y pesca: lanzar, plop del corcho
    donde cae, amago sutil, picada inconfundible (sin atenuar), captura y escape.
  - **Ambiente** (`players.ts`): pájaros de día, grillos y más viento de noche
    (según la altura del sol), rumor de agua cerca del estanque.
  - **Música generativa original** (`score.ts`, `data/audio/music.json`):
    escala dórica sobre Re, acordes por paseo aleatorio con semilla; capas pad,
    campana, pulso, tambor y arpa. Calma misteriosa por defecto, tensión con
    enemigos en combate cerca (se mantiene unos segundos), calma con arpa
    mientras pescas; fundidos de 3 s; de noche el pad se oscurece.

- **Mediciones:** no hay medición de rendimiento del audio en Electron (el
  presupuesto de uso se acabó). En el navegador, con combate y pasos, sin
  errores y el contexto en `running`.

- **Decisiones técnicas (PROPUESTA):**
  - Los sucesos se leen envolviendo `view.handleEvents` desde el director, para
    no cambiar ninguna vista; los clics y paneles de la interfaz, observando el
    DOM (botones y atributo `hidden` de `.panel`); compra/venta, con el suceso de
    oro de la sesión mientras la tienda está abierta.
  - Parte pura (mapa suceso→sonido, paneo, mezcla, compositor, ambiente,
    variación) separada de Web Audio y probada con un `AudioContext` falso
    (`tests/audio.test.ts`).

- **Incertidumbres / pendiente:**
  - **Nadie lo ha escuchado todavía**: niveles relativos, la picada «god» de la
    pesca y el carácter de la música necesitan oído del creador.
  - Falta medir el coste en Electron con 200 entidades y anotarlo en la bitácora.
  - Sin nota en `docs/BITACORA.md` para este slice.
  - Los pasos de enemigos no suenan (sus `footstep` no llevan posición).

- No se tomó ninguna decisión creativa definitiva: sonidos y música son
  marcadores de prototipo (PROPUESTA).
