# 03 · Hechizos y rangos

Estado (creador, 2026-11-15):
- **Rangos automáticos: regla ratificada** (R1–R4). Umbrales como `PROPUESTA` en datos. Nivel máximo previsto: 400, en estudio.
- **Cuota de 5 hechizos por elemento: no aprobada.** Treinta hechizos por clase es una meta provisional.
- **Brasa, Hilos y Reclamo entran por fases:** primero sus primitivas aisladas y medidas; después los hechizos que dependen de ellas.
- **La línea faltante completa y sus iconos están autorizados.** Las 48 propuestas son la base de trabajo; se integran por niveles y dependencias, no en un cambio monolítico. Daños, costes y enfriamientos siguen siendo `PROPUESTA` hasta medirlos.

Se conservan sin cambios: seis elementos, ocho primarias RPG V4 y su escalado elemental; crítico base por hechizo y crítico global 0 sin fuentes externas; hechizos con varias líneas elementales y un único resultado crítico coherente.

## Qué pasa hoy (medido el 2026-11-13)

| Hecho | Dónde se ve |
|---|---|
| Hay 53 hechizos: 13 de Vanguardia, 15 de Tejedora, 14 de Cazador y 11 universales de pergamino (incluido Dominio de arma) | `data/rpg/spells.json` |
| Las clases dejan de aprender hechizos en el **nivel 20**, y el nivel máximo es 200 | campo `unlockLevel` |
| Un hechizo **solo sube de rango leyendo otro pergamino** del mismo hechizo. No hay subida por nivel | `Spellbook.learn()` en `src/rpg/spells.ts` |
| Por eso una partida de prueba de nivel 200 sale con todo en rango 1, salvo que el preset escriba el rango a mano | `src/dev/presets.ts` |
| El reparto por elemento es desigual: la Vanguardia no tiene ningún hechizo de aire y la Tejedora tiene 6 de rayo | tabla de abajo |
| Ya existen estas mecánicas: empujar, atraer, cambiar de sitio, parpadeo, carga, salto atrás, trampa, zona, escudo, cura, invocación, revelar y devolver hechizos | `EffectDef` en `src/rpg/contracts.ts` |
| No existen: obstáculos, repetidor de hechizos, marcas que se detonan, medidor de clase, desvío de daño, señuelos ni torretas | — |

## Reglas nuevas

### 1. Repertorio por clase (provisional)

- **Meta provisional: unos 30 hechizos propios por clase a nivel máximo.** No es una obligación; una clase puede tener más o menos si su identidad lo pide.
- **No hay cuota por elemento.** Cada clase reparte sus hechizos según su identidad: puede tener muchos de sus elementos de afinidad, pocos de otros y ninguno de alguno.
- Lo que sí se busca en toda clase, como guía y no como regla: algo de movilidad o posición, algo de terreno, algo de apoyo, alguna mejora propia y, si encaja, una invocación.
- La libertad de builds se mantiene: las ocho primarias y los seis elementos siguen permitiendo jugar una clase con elementos fuera de su afinidad.
- Los 11 universales de pergamino siguen aparte. `Dominio de arma` mejora únicamente los ataques hechos con un arma equipada; no multiplica hechizos ni ataques desarmados.

Las tablas de abajo reúnen 48 hechizos nuevos. El creador autorizó completar la línea el 2026-11-15. El reparto no impone una cuota por elemento: cada entrada se conserva por su función e identidad de clase y puede pulirse durante su entrega sin cambiar elementos actuales.

### 2. Niveles de aprendizaje

- Los hechizos actuales conservan su nivel (1–20).
- Los nuevos se aprenden en estos niveles, uno por nivel de la lista: **25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 120, 135, 150, 165, 180**. La clase que tiene menos hechizos nuevos salta alguno; el nivel exacto está en cada tabla.
- Si se adoptaran todos, de 1 a 40 cada clase tendría entre 17 y 19 hechizos (13, 15 y 14 actuales más 4 nuevos). Los niveles son provisionales.

### 3. Rangos automáticos por nivel

**Ratificado por el creador (R1–R4, 2026-11-13).**

1. El rango de un hechizo sube solo al alcanzar ciertos niveles, con la misma regla para todas las clases y para los universales.
2. **El nivel máximo se lee de `data/rpg/progression.json`.** Hoy es 200. El creador quiere llevarlo a **400**, con el último hechizo de clase aprendido en el nivel **200**; del 200 al 400 el personaje progresa con rangos. Ese cambio se estudia aparte (D-50) y no se hace dentro de la corrección de rangos.
3. **Los pergaminos caen poco** y permiten adelantarse al nivel: subir a un rango con pergaminos cuesta tantos pergaminos como ese rango (lectura pendiente de confirmar, C1).
4. **Los universales** solo se aprenden por pergamino; una vez aprendidos, suben de rango con la misma regla.
5. Al subir un rango sale **un aviso arriba**. Los pergaminos se usan con **doble clic** en la mochila.

**Umbrales** (`PROPUESTA`; los factores viven en datos y se ajustan sin tocar código). Para un hechizo que se aprende en el nivel `U`, con nivel máximo `M`:

| Rango máximo del hechizo | Rango 2 | Rango 3 | Rango 4 | Rango 5 |
|---|---|---|---|---|
| 5 | `U + ⌈(M−U)·0,10⌉` | `U + ⌈(M−U)·0,25⌉` | `U + ⌈(M−U)·0,50⌉` | `U + ⌈(M−U)·0,90⌉` |
| 3 | `U + ⌈(M−U)·0,30⌉` | `U + ⌈(M−U)·0,80⌉` | — | — |

Los dos últimos factores suben respecto al primer borrador (0,45 y 0,70) para que los rangos lleguen casi hasta el nivel máximo, como pidió el creador: con el borrador, el último hechizo quedaba al máximo en el nivel 340 y de ahí a 400 no subía nada.

| Se aprende en | Con máximo 200: rangos 2 · 3 · 4 · 5 | Con máximo 400: rangos 2 · 3 · 4 · 5 | Máximo 3 rangos (200 / 400) |
|---|---|---|---|
| 1 | 21 · 51 · 101 · 181 | 41 · 101 · 201 · 361 | 61 · 161 / 121 · 321 |
| 5 | 25 · 54 · 103 · 181 | 45 · 104 · 203 · 361 | 64 · 161 / 124 · 321 |
| 20 | 38 · 65 · 110 · 182 | 58 · 115 · 210 · 362 | 74 · 164 / 134 · 324 |
| 60 | 74 · 95 · 130 · 186 | 94 · 145 · 230 · 366 | 102 · 172 / 162 · 332 |
| 100 | 110 · 125 · 150 · 190 | 130 · 175 · 250 · 370 | 130 · 180 / 190 · 340 |
| 150 | 155 · 163 · 175 · 195 | 175 · 213 · 275 · 375 | 165 · 190 / 225 · 350 |
| 200 | — | 220 · 250 · 300 · 380 | — / 260 · 360 |

A nivel máximo todo está en rango máximo, con cualquiera de los dos topes.

**Pergaminos.** Cada hechizo guarda cuántos pergaminos suyos se han leído.

| Situación | Qué pasa |
|---|---|
| No conoces el hechizo | Un pergamino lo enseña en rango 1 (como hoy) |
| Lo conoces en rango `r` | Leer pergaminos acumula; al juntar `r + 1` sube a rango `r + 1` y el contador vuelve a cero (C1) |
| El nivel te da un rango mayor que el de pergaminos | Vale el mayor. Los pergaminos ya leídos no se pierden: siguen contando para el siguiente rango |
| Ya está en rango máximo | El pergamino no se gasta; se puede vender |

**Lo que la corrección no puede romper** (condiciones del creador):

| Qué | Cómo se respeta |
|---|---|
| **Guardados** | Al cargar, el rango es el mayor entre el guardado y el que toca por nivel. Nunca baja. El contador de pergaminos es un campo nuevo opcional: un guardado viejo carga con el contador en cero |
| **Crítico por hechizo** | El rango solo aplica `perRank` (efecto y coste), como hoy. No toca el crítico base de cada hechizo ni añade crítico global |
| **Hechizos de varias líneas elementales** | El rango escala cada línea con el mismo `perRank`; la tirada de crítico sigue siendo una sola por lanzamiento |
| **Otro nivel máximo** | Factores y máximo salen de datos; ninguna cifra queda escrita en el código. Hay prueba con 200 y con 400 |
| **Balance productivo** | No se cambia `perRank`, ni `maxRank`, ni ningún daño. Solo cambia *cuándo* se alcanza un rango que ya existe |

**Cuando el máximo sea 400:** los niveles de aprendizaje del catálogo de abajo (25–180) se reparten de nuevo hasta el 200. No se hace ahora.

### 4. Presupuesto de balance

1. Un hechizo nuevo se crea copiando las cifras de uno existente del mismo tipo y tramo, y luego se ajusta.
2. Un ataque fuera de la afinidad de la clase hace alrededor de un 10 % menos que su equivalente de afinidad. La afinidad ya da +10 (`affinityBonus`).
3. Una técnica con efecto fuerte (obstáculo, invocación, desvío) tiene enfriamiento de 15 s o más.
4. Ningún hechizo nuevo puede superar en daño por recurso al mejor ataque de afinidad de su tramo. Se comprueba con el bot de `tests/balance/`.
5. No se tocan las cifras ni el elemento de los hechizos actuales.

## Mecánicas nuevas propuestas

M1 es la corrección de rangos. M2 a M5 se prototipan **aisladas** (en el laboratorio de combate y con pruebas, sin tocar los hechizos ni los recursos productivos). M6 a M9 son ideas sin fecha.

| # | Mecánica | Qué hace | Quién la usa primero |
|---|---|---|---|
| M1 | **Rango por nivel** | La regla 3. Función pura `rankAtLevel(def, level)` | Todas |
| M2 | **Obstáculo** | Pieza temporal que bloquea el paso y, según el hechizo, la visión. Entra y sale de la rejilla de navegación. Tiene vida y se puede romper | Cortafuego, Nudo de piedra, Raíces de mangle |
| M3 | **Repetidor (Reclamo)** | Objeto en el suelo. Mientras vive, cada hechizo de área del dueño se repite centrado en él con un porcentaje del efecto | Cazador |
| M4 | **Marca y detonación (Hilos)** | Estado «nudo» con tope de portadores. Otros hechizos leen quién está anudado: saltan entre ellos, los atraen o cambian de sitio con uno | Tejedora |
| M5 | **Medidor de clase (Brasa)** | Contador 0–5 que sube con ciertos sucesos y que algunos hechizos consultan o gastan. Se ve en el HUD | Vanguardia |
| M6 | **Invocación con tipo** | Hoy solo hay «criatura que pelea». Añadir: **señuelo** (atrae a los enemigos y no ataca), **torreta** (no se mueve, dispara) y **portador** (la mascota lleva un objeto del dueño) | Las tres |
| M7 | **Desvío y provocación** | Desvío: el daño de un aliado lo recibe el lanzador. Provocación: los enemigos del área cambian de objetivo unos segundos | Vanguardia |
| M8 | **Atraer a un punto** | Varios enemigos se mueven hacia un punto, no hacia el lanzador | Tejedora, Cazador |
| M9 | **Cambio de sitio con lo propio** | `swap` ya existe con enemigos. Ampliar a nudo, reclamo, mascota e invocación | Tejedora, Cazador |

Para todas: la lógica va en `src/sim/` sin tocar Babylon ni el DOM, con pruebas, y el efecto visual va aparte en `src/render/fx/`.

## Vanguardia de Brasa: catálogo de ideas

Hoy: tierra 5, fuego 4, rayo 2, agua 1, hielo 1, aire 0. El catálogo propone 17 más.

Propuesta para el prototipo (no se aplica a los datos productivos):
- **Brasa (M5):** medidor aparte del Vigor. sube 1 con cada golpe de fuego que das y con cada golpe cuerpo a cuerpo que recibes; baja 1 cada 4 s fuera de combate.
- `ember_whirl` (Remolino de brasas) **gasta** toda la Brasa: +15 % de daño por punto.
- `bulwark` (Baluarte de roca) absorbe +10 % por punto de Brasa, sin gastarla.

| Nivel | Id | Nombre | Elem. | Tipo | Qué hace |
|---|---|---|---|---|---|
| 25 | `firebreak` | Cortafuego | Fuego | Técnica · obstáculo (M2) | Hilera de estacas ardiendo. Corta el paso y la visión; quema a quien la toca |
| 30 | `guarapo_splash` | Baldazo de guarapo | Agua | Ataque · cono | Moja a los enemigos (los mojados reciben más rayo) y apaga las quemaduras de los aliados |
| 35 | `night_dew` | Sereno | Hielo | Ataque · un objetivo | Tajo frío que frena |
| 40 | `flint_spark` | Chispa de pedernal | Rayo | Ataque · un objetivo | El golpe salta a dos enemigos cercanos |
| 45 | `smoke_screen` | Humareda | Aire | Técnica · terreno | Nube que corta la visión sin cortar el paso |
| 50 | `bellows` | Fuelle | Aire | Ataque · cono | Aleja a los enemigos; más lejos cuanta más Brasa |
| 60 | `tinaja_guard` | Tinaja llena | Agua | Técnica · apoyo (M7) | Durante 6 s recibes tú el daño de un aliado o de tu mascota |
| 70 | `salt_crust` | Costra de salitre | Hielo | Técnica · mejora | Armadura que congela un instante a quien te pega cuerpo a cuerpo |
| 80 | `anvil_call` | Llamado del yunque | Rayo | Técnica · apoyo (M7) | Provoca a los enemigos cercanos 4 s y te da escudo por cada uno |
| 90 | `machete_whirl` | Molinete | Aire | Ataque · línea | Avanzas girando el machete y dañas todo el recorrido |
| 100 | `flood_furrow` | Surco anegado | Agua | Técnica · terreno | Franja de fango que frena a quien la pisa |
| 110 | `cold_ash` | Ceniza fría | Hielo | Ataque · círculo propio | Daña y quita una mejora a cada enemigo |
| 120 | `quema_wind` | Viento de quema | Aire | Técnica · apoyo | Los aliados cercanos corren más y su fuego pega más |
| 135 | `storm_harvest` | Zafra de rayos | Rayo | Ataque · línea | Tres machetazos; el tercero aturde si tienes 3 de Brasa o más |
| 150 | `river_shoulder` | Hombro de río | Agua | Ataque · carga | Embistes y arrastras contigo a todos los que tocas |
| 165 | `frozen_furrow` | Helada del surco | Hielo | Ataque · línea | Clava al suelo a los enemigos de la línea |
| 180 | `ember_scarecrow` | Espantajo de brasa | Aire | Invocación · señuelo (M6) | Muñeco de paja que atrae a los enemigos y revienta al romperse |

## Tejedora de Tormentas: catálogo de ideas

Hoy: rayo 6, hielo 5, aire 1, agua 1, fuego 1, tierra 1. El catálogo propone 15 más.

Propuesta para el prototipo (no se aplica a los datos productivos; ningún hechizo actual cambia de elemento):
- **Hilos (M4):** `spark` (Chispa) deja un nudo en el objetivo. `voltaic_arc` salta además a todos los anudados. `frost_nova` congela un instante a los anudados que alcance. `storm_swap` puede apuntar a un nudo del suelo (M9). Tope: 2 nudos; 3 tras la misión de clase.

| Nivel | Id | Nombre | Elem. | Tipo | Qué hace |
|---|---|---|---|---|---|
| 25 | `mist_veil` | Velo de bajareque | Aire | Técnica · apoyo | Zona de neblina: los enemigos de fuera ven menos lejos a quien está dentro |
| 30 | `drizzle_needle` | Aguja de llovizna | Agua | Ataque · un objetivo | Tiro rápido y barato que moja |
| 35 | `kiln_thread` | Hilo de fogón | Fuego | Ataque · un objetivo | Quema; si el objetivo está anudado, la quemadura pasa a los otros nudos |
| 40 | `stone_knot` | Nudo de piedra | Tierra | Técnica · obstáculo (M2) | Levanta una piedra que corta el paso y cuenta como nudo |
| 50 | `rain_stitch` | Puntada de lluvia | Agua | Técnica · apoyo | Cura un poco a los aliados del círculo y les quita la quemadura |
| 60 | `spindle_gust` | Huso de viento | Aire | Ataque · línea | Aparta a los enemigos hacia los lados y anuda al primero |
| 70 | `heat_haze` | Calina | Fuego | Invocación · señuelo (M6) | Deja una imagen tuya que los enemigos atacan |
| 80 | `loom_roots` | Raíces del telar | Tierra | Ataque · círculo | Daña y clava al suelo |
| 90 | `warp_tide` | Urdimbre de marea | Agua | Ataque · línea | Dos olas seguidas; la segunda pega más a los mojados |
| 100 | `garden_scarecrow` | Espantapájaros de huerta | Tierra | Invocación · torreta (M6) | No se mueve; lanza chispas a los anudados |
| 110 | `dry_lightning` | Rayo seco | Fuego | Ataque · cono | Daño alto; sin efecto extra |
| 120 | `carded_wind` | Viento cardado | Aire | Técnica · posición (M8) | Atrae a todos los anudados hacia el punto elegido |
| 135 | `landslip` | Derrumbe | Tierra | Ataque · línea | Daño alto y empuja al final de la línea |
| 150 | `cloudburst` | Reventón de nube | Agua | Ataque · círculo grande | Cae tras 1,5 s de aviso; daño muy alto |
| 165 | `midday_loom` | Telar del mediodía | Fuego | Técnica · mejora | Tus tres hechizos siguientes no gastan Maná |

## Cazador del Manglar: catálogo de ideas

Hoy: aire 4, agua 3, tierra 3, fuego 2, hielo 1, rayo 1. El catálogo propone 16 más.

Propuesta para el prototipo (no se aplica a los datos productivos):
- **Reclamo (M3):** todos sus hechizos de área actuales (`powder_arrow`, `reed_cross`, `gale_star`, `arrow_downpour`, `estuary_arrow`, `dew_arrow`) se repiten alrededor del reclamo al 50 % del efecto. PROPUESTA: 60 % en rango 5.

| Nivel | Id | Nombre | Elem. | Tipo | Qué hace |
|---|---|---|---|---|---|
| 25 | `reed_call` | Reclamo | Aire | Técnica · firma (M3) | Clava el reclamo. Dura 20 s, tiene vida y los enemigos pueden romperlo. Uno activo |
| 30 | `cold_snare` | Lazo de sereno | Hielo | Técnica · trampa | Trampa que congela 2 s a quien la pisa |
| 35 | `eel_arrow` | Flecha de anguila | Rayo | Ataque · un objetivo | Salta entre enemigos mojados |
| 40 | `tar_arrow` | Flecha de brea | Fuego | Ataque · círculo | Deja un charco que arde unos segundos |
| 50 | `mud_decoy` | Señuelo de fango | Tierra | Invocación · señuelo (M6) | Muñeco de fango que atrae a los enemigos |
| 60 | `tide_pull` | Resaca | Agua | Técnica · posición (M8) | Arrastra al objetivo hacia el reclamo; sin reclamo, hacia ti |
| 70 | `heron_feather` | Pluma de garza | Hielo | Ataque · un objetivo | Marca al objetivo: el siguiente golpe que reciba es crítico |
| 80 | `charcoal_cloud` | Nube de carbón | Fuego | Técnica · terreno | Humo en el que los enemigos te pierden como objetivo |
| 90 | `swap_shot` | Tiro de trueque | Rayo | Técnica · movilidad (M9) | Cambias de sitio con tu reclamo o con tu mascota |
| 100 | `mangrove_roots` | Raíces de mangle | Tierra | Técnica · obstáculo (M2) | Hilera de raíces: corta el paso pero deja pasar las flechas |
| 110 | `fog_arrow` | Flecha de neblina | Hielo | Ataque · círculo | Frena y acorta el alcance de los enemigos |
| 120 | `storm_perch` | Percha de tormenta | Rayo | Invocación · torreta (M6) | Un ave posada dispara a los enemigos marcados |
| 135 | `kiln_burst` | Horno de mangle | Fuego | Ataque · especial | Revienta a la vez todas tus trampas y charcos |
| 150 | `live_tide` | Marea viva | Agua | Técnica · mejora | Durante 8 s tu mascota repite tus tiros básicos. Depende del sistema general de mascotas (T06) |
| 165 | `frozen_estuary` | Estero helado | Hielo | Ataque · círculo grande | Suelo resbaloso: los enemigos empujados dentro llegan el doble de lejos |
| 180 | `thunder_flock` | Bandada de trueno | Rayo | Ataque · estrella | Daño alto. Segundo reclamo activo desde este nivel |

## Calendario hasta el 200 (PROPUESTA)

> Superado por la [lista de 96 hechizos (HZ-04d)](#lista-de-96-hechizos-hz-04d-propuesta-del-2026-11-19). Se guarda como historia.

**Junie, 2026-11-17.** Esta sección no cambia reglas ni cifras aprobadas: organiza los 48 hechizos nuevos por nivel de aprendizaje y marca cuáles se pueden integrar ya con los efectos existentes y cuáles esperan primitiva. Las cifras de daño, coste y enfriamiento son `PROPUESTA`.

### Criterios de distribución

- Un hechizo nuevo cada **10–12 niveles** de media (16 nuevos por clase en 179 niveles = ~11,2).
- **Ningún hueco de más de 20 niveles** sin aprendizaje.
- El **último hechizo de clase en el nivel 200** (`00_DECISIONES`).
- Las dependencias de primitivas (M2–M9) mandan el orden: un hechizo que necesita M2 no entra antes de que M2 exista.
- Los hechizos que usan **solo efectos existentes** se integran en `data/rpg/spells.json` (marcados `✓`). Los que esperan primitiva quedan con `✗ espera M<n>`.

### Efectos existentes vs. primitivas pendientes

| Disponible | Efectos |
|---|---|
| Sí | `damage`, `heal`, `status`, `shield`, `knockback`, `dash`, `teleport`, `restoreResource`, `summon`, `zone`, `blink`, `swap`, `pull`, `recoil`, `trap`, `reveal` |
| No (M2) | `obstacle` — pieza que bloquea paso y/o visión |
| No (M3) | `repeater` — objeto que repite hechizos de área |
| No (M4) | `mark`/`detonate` — nudo que otros hechizos leen |
| No (M5) | `gauge` — medidor de clase 0–5 |
| No (M6) | `decoy`/`turret` — invocación con comportamiento especial |
| No (M7) | `deviate`/`taunt` — desvío de daño, provocación |
| No (M8) | `attractToPoint` — atraer a un punto, no al lanzador |
| No (M9) | `swapSelf` — cambio de sitio con reclamo/mascota |

### Vanguardia de Brasa: calendario completo

| Nivel | Id | Nombre | Elem. | Integrable | Rango 2 · 3 · 4 · 5 · 6 |
|---|---|---|---|---|---|
| 1 | `charge` | Embestida | Tierra | ✓ (existente) | 21 · 51 · 101 · 181 · 198 |
| 1 | `ember_whirl` | Remolino de brasas | Fuego | ✓ (existente) | 21 · 51 · 101 · 181 · 198 |
| 1 | `iron_shout` | Rugido de hierro | Tierra | ✓ (existente) | 21 · 51 · 101 · 181 · 198 |
| 2 | `ember_mine` | Mina de brasa | Fuego | ✓ (existente) | 22 · 52 · 102 · 182 · 199 |
| 3 | `fiery_slash` | Tajo sísmico | Tierra | ✓ (existente) | 23 · 53 · 103 · 183 · 200 |
| 5 | `searing_mark` | Marca abrasadora | Fuego | ✓ (existente) | 25 · 54 · 103 · 181 · 198 |
| 6 | `stunning_pommel` | Golpe aturdir | Rayo | ✓ (existente) | 26 · 55 · 104 · 182 · 199 |
| 7 | `bulwark` | Baluarte de roca | Tierra | ✓ (existente) | 27 · 56 · 105 · 183 · 200 |
| 9 | `ember_chain` | Cadena de brasa | Fuego | ✓ (existente) | 29 · 58 · 107 · 185 · 200 |
| 12 | `retaliation` | Retaliación | Tierra | ✓ (existente) | 32 · 61 · 110 · 188 · 200 |
| 16 | `tide_cleave` | Tajo de marea | Agua | ✓ (existente) | 36 · 65 · 114 · 192 · 200 |
| 18 | `salt_temper` | Templado de sal | Hielo | ✓ (existente) | 38 · 67 · 116 · 194 · 200 |
| 20 | `thunder_maul` | Mazo de trueno | Rayo | ✓ (existente) | 40 · 70 · 120 · 198 · 200 |
| 25 | `firebreak` | Cortafuego | Fuego | ✗ espera M2 | 45 · 74 · 123 · 201 · 200 |
| 30 | `guarapo_splash` | Baldazo de guarapo | Agua | ✓ | 50 · 79 · 128 · 206 · 200 |
| 35 | `night_dew` | Sereno | Hielo | ✓ | 55 · 84 · 133 · 211 · 200 |
| 40 | `flint_spark` | Chispa de pedernal | Rayo | ✓ | 60 · 89 · 138 · 216 · 200 |
| 45 | `smoke_screen` | Humareda | Aire | ✓ | 65 · 94 · 143 · 221 · 200 |
| 50 | `bellows` | Fuelle | Aire | ✓ | 70 · 99 · 148 · 226 · 200 |
| 60 | `tinaja_guard` | Tinaja llena | Agua | ✗ espera M7 | 80 · 109 · 158 · 236 · 200 |
| 70 | `salt_crust` | Costra de salitre | Hielo | ✓ | 90 · 119 · 168 · 246 · 200 |
| 80 | `anvil_call` | Llamado del yunque | Rayo | ✗ espera M7 | 100 · 129 · 178 · 256 · 200 |
| 90 | `machete_whirl` | Molinete | Aire | ✓ | 110 · 139 · 188 · 266 · 200 |
| 100 | `flood_furrow` | Surco anegado | Agua | ✓ | 120 · 149 · 198 · 276 · 200 |
| 110 | `cold_ash` | Ceniza fría | Hielo | ✓ | 130 · 159 · 208 · 286 · 200 |
| 120 | `quema_wind` | Viento de quema | Aire | ✓ | 140 · 169 · 218 · 296 · 200 |
| 135 | `storm_harvest` | Zafra de rayos | Rayo | ✗ espera M5 | 155 · 184 · 233 · 311 · 200 |
| 150 | `river_shoulder` | Hombro de río | Agua | ✓ | 170 · 199 · 248 · 326 · 200 |
| 165 | `frozen_furrow` | Helada del surco | Hielo | ✓ | 185 · 214 · 263 · 341 · 200 |
| 180 | `ember_scarecrow` | Espantajo de brasa | Aire | ✗ espera M6 | 200 · 229 · 278 · 356 · 200 |
| 200 | `volcanic_fury` | Furia volcánica | Fuego | ✓ | — · — · — · — · — |

**Resumen Vanguardia:** 13 existentes + 12 integrables ahora + 1 nuevo en nivel 200 = **26 hechizos con efectos existentes**. 6 esperan primitiva (M2×1, M5×1, M6×1, M7×2, M2×1).

### Tejedora de Tormentas: calendario completo

| Nivel | Id | Nombre | Elem. | Integrable | Rango 2 · 3 · 4 · 5 · 6 |
|---|---|---|---|---|---|
| 1 | `spark` | Chispa | Rayo | ✓ (existente) | 21 · 51 · 101 · 181 · 198 |
| 1 | `frost_nova` | Nova de escarcha | Hielo | ✓ (existente) | 21 · 51 · 101 · 181 · 198 |
| 1 | `storm_focus` | Enfoque de tormenta | Rayo | ✓ (existente) | 21 · 51 · 101 · 181 · 198 |
| 2 | `leaden_gale` | Vendaval de plomo | Hielo | ✓ (existente) | 22 · 52 · 102 · 182 · 199 |
| 3 | `lightning_step` | Paso de relámpago | Rayo | ✓ (existente) | 23 · 53 · 103 · 183 · 200 |
| 4 | `vertigo_whistle` | Silbido de vértigo | Aire | ✓ (existente) | 24 · 53 · 102 · 182 · 199 |
| 5 | `glacial_lance` | Lanzaglaacial | Hielo | ✓ (existente) | 25 · 54 · 103 · 181 · 198 |
| 7 | `voltaic_arc` | Arco voltaico | Rayo | ✓ (existente) | 27 · 56 · 105 · 183 · 200 |
| 9 | `frost_recoil` | Retroceso helado | Hielo | ✓ (existente) | 29 · 58 · 107 · 185 · 200 |
| 11 | `storm_mirror` | Espejo de tormenta | Rayo | ✓ (existente) | 31 · 60 · 109 · 187 · 200 |
| 13 | `storm_swap` | Trueque de tormenta | Hielo | ✓ (existente) | 33 · 62 · 111 · 189 · 200 |
| 15 | `static_field` | Campo estático | Rayo | ✓ (existente) | 35 · 64 · 113 · 191 · 200 |
| 16 | `waterspout` | Remolino de agua | Agua | ✓ (existente) | 36 · 65 · 114 · 192 · 200 |
| 18 | `midday_cinder` | Brasa del mediodía | Fuego | ✓ (existente) | 38 · 67 · 116 · 194 · 200 |
| 20 | `clay_spire` | Aguja de arcilla | Tierra | ✓ (existente) | 40 · 70 · 120 · 198 · 200 |
| 25 | `mist_veil` | Velo de bajareque | Aire | ✓ | 45 · 74 · 123 · 201 · 200 |
| 30 | `drizzle_needle` | Aguja de llovizna | Agua | ✓ | 50 · 79 · 128 · 206 · 200 |
| 35 | `kiln_thread` | Hilo de fogón | Fuego | ✗ espera M4 | 55 · 84 · 133 · 211 · 200 |
| 40 | `stone_knot` | Nudo de piedra | Tierra | ✗ espera M2 | 60 · 89 · 138 · 216 · 200 |
| 50 | `rain_stitch` | Puntada de lluvia | Agua | ✓ | 70 · 99 · 148 · 226 · 200 |
| 60 | `spindle_gust` | Huso de viento | Aire | ✓ | 80 · 109 · 158 · 236 · 200 |
| 70 | `heat_haze` | Calina | Fuego | ✗ espera M6 | 90 · 119 · 168 · 246 · 200 |
| 80 | `loom_roots` | Raíces del telar | Tierra | ✓ | 100 · 129 · 178 · 256 · 200 |
| 90 | `warp_tide` | Urdimbre de marea | Agua | ✓ | 110 · 139 · 188 · 266 · 200 |
| 100 | `garden_scarecrow` | Espantapájaros de huerta | Tierra | ✗ espera M6 | 120 · 149 · 198 · 276 · 200 |
| 110 | `dry_lightning` | Rayo seco | Fuego | ✓ | 130 · 159 · 208 · 286 · 200 |
| 120 | `carded_wind` | Viento cardado | Aire | ✗ espera M8 | 140 · 169 · 218 · 296 · 200 |
| 135 | `landslip` | Derrumbe | Tierra | ✓ | 155 · 184 · 233 · 311 · 200 |
| 150 | `cloudburst` | Reventón de nube | Agua | ✓ | 170 · 199 · 248 · 326 · 200 |
| 165 | `midday_loom` | Telar del mediodía | Fuego | ✗ espera M5 | 185 · 214 · 263 · 341 · 200 |
| 180 | `thunder_weave` | Tejido de trueno | Rayo | ✓ | 200 · 229 · 278 · 356 · 200 |
| 200 | `tempest_crown` | Corona de tempestad | Rayo | ✓ | — · — · — · — · — |

**Resumen Tejedora:** 15 existentes + 12 integrables ahora + 2 nuevos en nivel 180-200 = **29 hechizos con efectos existentes**. 6 esperan primitiva (M2×1, M4×1, M5×1, M6×2, M8×1).

### Cazador del Manglar: calendario completo

| Nivel | Id | Nombre | Elem. | Integrable | Rango 2 · 3 · 4 · 5 · 6 |
|---|---|---|---|---|---|
| 1 | `hunter_arrow` | Flecha de caza | Aire | ✓ (existente) | 21 · 51 · 101 · 181 · 198 |
| 1 | `powder_arrow` | Flecha de pólvora | Fuego | ✓ (existente) | 21 · 51 · 101 · 181 · 198 |
| 1 | `hawk_eye` | Ojo de halcón | Aire | ✓ (existente) | 21 · 51 · 101 · 181 · 198 |
| 3 | `reed_cross` | Cruz de junco | Tierra | ✓ (existente) | 23 · 53 · 103 · 183 · 200 |
| 4 | `gale_star` | Estrella de vendaval | Aire | ✓ (existente) | 24 · 53 · 102 · 182 · 199 |
| 5 | `piercing_shot` | Disparo perforante | Agua | ✓ (existente) | 25 · 54 · 103 · 181 · 198 |
| 7 | `vine_arrow` | Flecha de enredadera | Tierra | ✓ (existente) | 27 · 56 · 105 · 183 · 200 |
| 9 | `heron_leap` | Salto de garza | Aire | ✓ (existente) | 29 · 58 · 107 · 185 · 200 |
| 11 | `powder_dash` | Carga de pólvora | Fuego | ✓ (existente) | 31 · 60 · 109 · 187 · 200 |
| 12 | `arrow_downpour` | Lluvia de flechas | Agua | ✓ (existente) | 32 · 61 · 110 · 188 · 200 |
| 14 | `thorn_ward` | Guardia de espinas | Tierra | ✓ (existente) | 34 · 63 · 112 · 190 · 200 |
| 16 | `estuary_arrow` | Flecha de estero | Agua | ✓ (existente) | 36 · 65 · 114 · 192 · 200 |
| 18 | `dew_arrow` | Flecha de rocío | Hielo | ✓ (existente) | 38 · 67 · 116 · 194 · 200 |
| 20 | `lightning_arrow` | Flecha de relámpago | Rayo | ✓ (existente) | 40 · 70 · 120 · 198 · 200 |
| 25 | `reed_call` | Reclamo | Aire | ✗ espera M3 | 45 · 74 · 123 · 201 · 200 |
| 30 | `cold_snare` | Lazo de sereno | Hielo | ✓ | 50 · 79 · 128 · 206 · 200 |
| 35 | `eel_arrow` | Flecha de anguila | Rayo | ✓ | 55 · 84 · 133 · 211 · 200 |
| 40 | `tar_arrow` | Flecha de brea | Fuego | ✓ | 60 · 89 · 138 · 216 · 200 |
| 50 | `mud_decoy` | Señuelo de fango | Tierra | ✗ espera M6 | 70 · 99 · 148 · 226 · 200 |
| 60 | `tide_pull` | Resaca | Agua | ✓ | 80 · 109 · 158 · 236 · 200 |
| 70 | `heron_feather` | Pluma de garza | Hielo | ✓ | 90 · 119 · 168 · 246 · 200 |
| 80 | `charcoal_cloud` | Nube de carbón | Fuego | ✓ | 100 · 129 · 178 · 256 · 200 |
| 90 | `swap_shot` | Tiro de trueque | Rayo | ✗ espera M9 | 110 · 139 · 188 · 266 · 200 |
| 100 | `mangrove_roots` | Raíces de mangle | Tierra | ✗ espera M2 | 120 · 149 · 198 · 276 · 200 |
| 110 | `fog_arrow` | Flecha de neblina | Hielo | ✓ | 130 · 159 · 208 · 286 · 200 |
| 120 | `storm_perch` | Percha de tormenta | Rayo | ✗ espera M6 | 140 · 169 · 218 · 296 · 200 |
| 135 | `kiln_burst` | Horno de mangle | Fuego | ✗ espera M4 | 155 · 184 · 233 · 311 · 200 |
| 150 | `live_tide` | Marea viva | Agua | ✗ espera T06 | 170 · 199 · 248 · 326 · 200 |
| 165 | `frozen_estuary` | Estero helado | Hielo | ✓ | 185 · 214 · 263 · 341 · 200 |
| 180 | `thunder_flock` | Bandada de trueno | Rayo | ✗ espera M3 | 200 · 229 · 278 · 356 · 200 |
| 200 | `final_quiver` | Carcaj final | Aire | ✓ | — · — · — · — · — |

**Resumen Cazador:** 14 existentes + 10 integrables ahora + 1 nuevo en nivel 200 = **25 hechizos con efectos existentes**. 7 esperan primitiva (M2×1, M3×2, M4×1, M6×2, M9×1, T06×1).

### Resumen global

| Clase | Existentes | Integrables ahora | Esperan primitiva | Nuevo nivel 200 | Total con efectos existentes |
|---|---|---|---|---|---|
| Vanguardia | 13 | 12 | 5 | 1 | **26** |
| Tejedora | 15 | 12 | 6 | 2 | **29** |
| Cazador | 14 | 10 | 7 | 1 | **25** |
| **Total** | **42** | **34** | **18** | **4** | **80** |

Los 34 hechizos integrables y los 4 del nivel 200 se añaden en `data/rpg/spells.json` con cifras `PROPUESTA`. Los 18 que esperan primitiva quedan en esta tabla hasta que la mecánica exista.

## Repertorio revisado (HZ-04a, PROPUESTA, 2.ª versión del 2026-11-19)

El creador la deja así de momento y la revisará con lupa ([ACCIONES_CREADOR](../ACCIONES_CREADOR.md#respuestas-del-2026-11-19)). Nada de esto entra en `data/` sin su visto bueno. Los nombres son provisionales y propios, y todas las cifras son `PROPUESTA`.

### 1. Reparto: 32 hechizos por clase

| Papel | Cuántos | Ejemplos de mecánica |
|---|---|---|
| Daño, a uno o en área | **18** | Golpes, áreas en cruz o en círculo, carga, combos y reacciones |
| Potenciadores | **4** | Potencia, crítico y daño fijo, sobre uno mismo o un aliado; pocos y con enfriamiento largo |
| Control y posición | **6** | Empujar sin pegar, atraer, cambiar de sitio, quitar movimiento o acción, obstáculos |
| Defensa y utilidad | **4** | Escudo, invulnerabilidad a distancia o cuerpo a cuerpo, desechizar, repartir daño |

Hay más hechizos de daño que de estrategia. Los demás deciden cuándo y dónde entra el daño.

Cada clase conserva su forma de jugar:
- la **Vanguardia** atrae, agrupa y pega en área;
- la **Tejedora** prepara estados y los detona;
- el **Cazador** elige la distancia y tiende emboscadas.

### 2. Mecánicas que faltan (HZ-04b)

| Mecánica | Regla propuesta | Ejemplo de uso |
|---|---|---|
| Carga | Cada lanzamiento deja 1 acumulación, como máximo 2, durante 6 s. Cada una suma +25 % al daño base del siguiente | Golpe barato de cada clase |
| Potencia | +300 a +350 de potencia y +150 de daño de empuje durante 2 turnos equivalentes (8 s), sobre uno mismo o un aliado | Potenciador de la Vanguardia |
| Puntería | +15 % de crítico, +50 de daño crítico y +70 de daño fijo a todos los elementos. Su variante da potencia y daño de empuje | Potenciador del Cazador. Disparo macabro sigue el mismo patrón: unos 100 de daño fijo; en rango 6, +25 % de crítico y unos 350 de potencia |
| Daño de empuje | Un empujado que choca con un muro, un obstáculo u otro cuerpo recibe daño según la distancia que no pudo recorrer y el daño de empuje del lanzador | Empujar sin pegar se vuelve daño |
| Escudo por nivel | Escudo = 5,5 × nivel del lanzador (1.100 a nivel 200, 2.200 a 400), durante 8 s | Defensa de la Vanguardia |
| Invulnerabilidad | Inmune al daño a distancia, o al cuerpo a cuerpo, durante 3 s | Una por clase |
| Desechizar | Quita los potenciadores y escudos del objetivo | Utilidad de la Tejedora y del Cazador |
| Repartir daño | Un aliado recibe parte del daño de otro, o el daño recibido se reparte entre los enemigos enlazados | Defensa y control |
| Congelado | Inmovilizado durante 1,5 s | Reacción agua + escarcha |
| Entumecido | Los enfriamientos del objetivo van un 20 % más lentos durante 4 s (equivale a quitar PA) | Control |

### 3. Reacciones elementales

Cada elemento deja una marca de 6 s en el objetivo:
- fuego: Quemadura;
- agua: Empapado;
- escarcha: Escarchado;
- rayo: Carga estática;
- tierra: Agrietado.

El aire no deja marca: esparce la que encuentra.

Si un elemento distinto golpea a un objetivo marcado, salta la reacción y las dos marcas se gastan. Un mismo objetivo tiene 2 s de espera entre reacciones. Funciona entre jugadores del mismo grupo.

| Par | Reacción | Efecto |
|---|---|---|
| Agua + fuego | Vaho | Nube de 3 m: los de dentro ven reducido el alcance de sus hechizos y se apaga la Quemadura |
| Agua + escarcha | Congelado | Inmovilizado 1,5 s |
| Agua + rayo | Calambre | El rayo salta a todos los mojados cercanos, con +30 % de daño |
| Agua + tierra | Barrial | Zona de barro de 3 m que ralentiza un 40 % durante 4 s |
| Agua + aire | Chubasco | Empapa a todos los enemigos en 4 m |
| Fuego + escarcha | Choque térmico | +40 % de daño en ese golpe |
| Fuego + rayo | Estallido | Explosión de 3 m con empuje |
| Fuego + tierra | Lava | Zona ardiente de 3 m durante 4 s |
| Fuego + aire | Incendio | La Quemadura pasa a los enemigos en 4 m |
| Escarcha + rayo | Quiebre | −15 % de resistencias durante 5 s |
| Escarcha + tierra | Helada dura | Placado (−30 % de movimiento) durante 5 s |
| Escarcha + aire | Ventisca | Zona de 4 m que deja Escarchado |
| Rayo + tierra | Toma de tierra | Aturdido 1 s |
| Rayo + aire | Tormenta | El rayo salta a 3 enemigos cercanos |
| Tierra + aire | Polvareda | Desorientado 3 s |

Mientras se mide, se activan con una opción de desarrollo y vienen apagadas en producción.

### 4. Ningún hechizo se queda viejo (rangos hasta el 400)

Lo pidió el creador: un hechizo de nivel 1 en rango 6 tiene que seguir sirviendo a nivel 400.
- **Las cifras escalan con el nivel del personaje.** Cada efecto se guarda como `base + por nivel × nivel`, como el escudo (5,5 × nivel). El rango sube la base y el coeficiente; el nivel del personaje hace el resto.
- **Ninguno se queda atrás.** Con el mismo coste y el mismo enfriamiento, un hechizo temprano en rango 6 a nivel 400 rinde al menos el 85 % de uno de nivel 200 en rango 6.
- **Los últimos siguen siendo los más fuertes,** por efecto (área, reacción o potenciador) y por un 15–25 % más de presupuesto, no porque los primeros caduquen.
- **Escalera de rangos:** factores 0,05, 0,15, 0,35, 0,60 y 0,90 sobre (400 − U). Un hechizo de nivel 1 llega a rango 6 en el 361; uno de nivel 200, en el 380.

### 5. Orden de trabajo

1. **HZ-04b**: las mecánicas de las secciones 2 y 3 en `src/sim/` y `src/rpg/`, con pruebas y sin asignarlas a hechizos de producción.
2. **HZ-04c**: tras el visto bueno del creador, el repertorio en `data/`, con medición del bot de `tests/balance/`.
3. **D-50**: el nivel 400 y la escala por nivel.

## Lista de 96 hechizos (HZ-04d, PROPUESTA del 2026-11-19)

El creador aprobó el repertorio revisado (HZ-04a) el 2026-11-19 por la tarde. Esta lista lo concreta: 32 hechizos por clase con el reparto 18 / 4 / 6 / 4, cifras y escalera de rangos. Todo sigue siendo `PROPUESTA` hasta que HZ-04c lo pase a `data/` y el bot de `tests/balance/` lo mida.
- Sustituye al calendario de Junie de más arriba, que queda como historia.
- Se conservan los 75 ids de clase que ya existen. Hay 21 nuevos, marcados «(nuevo)».
- Los 11 universales (`classId: null`) no cambian y no cuentan en los 32.

### Reglas de las cifras

**Presupuesto de daño.** Cada hechizo tiene una unidad `u`, que sale de lo que cuesta usarlo:
- `u = (6 + 0,6 × coste + enfriamiento) × forma`;
- forma: uno a distancia ×1; uno cuerpo a cuerpo ×1,15; línea o cono ×0,85; círculo, cruz o estrella ×0,75;
- un factor de papel (0,25 a 1) descuenta lo que el hechizo hace además de pegar, como controlar, desplazar o dejar zona.

Con esa regla, los hechizos de hoy salen parecidos a como están (Chispa 11,5 contra 11; Mazo de trueno 24,6 contra 24). Las mayores diferencias:
- **suben** los que hoy pegan poco para lo que cuestan: Marca abrasadora, Cadena de brasa, Baldazo de guarapo y Lluvia de flechas;
- **bajan** algo los de nivel alto que hoy van sobrados: Tejido de trueno 95 → 67, Estero helado 69 → 55 y Hombro de río 69 → 52.

**Escala por nivel.** Cada daño o curación se escribe `mín–máx + k/nv`:
- `mín–máx` es la base: `u × papel × (1 + 0,0025 × U)` ± 15 %, donde U es el nivel de aprendizaje;
- `k = 0,0075 × u × papel`, multiplicado por el nivel del lanzador;
- la inteligencia (`scaling`) se queda como hoy;
- la curación usa papel 0,8.

Esto cumple las reglas de la sección 4:
- en el nivel en que se aprende, el hechizo rinde `u × (1 + 0,01 × U)`, la misma curva que hoy (×3 entre el nivel 1 y el 200);
- a nivel 400, con el mismo coste y enfriamiento, uno de nivel 1 rinde el **89 %** de uno de nivel 200 (pedido: ≥ 85 %);
- el de nivel 200 sigue siendo un 12 % más fuerte, más lo que aporten su efecto y su presupuesto.

**Potenciadores, a escala del motor.** El «+300 de potencia» del creador está a escala de otro juego. Aquí se traduce a porcentaje:

| Efecto | Valor | Por qué |
|---|---|---|
| `power` | +25 % durante 8 s (rango 6: +30 %) | ≈ lo que suma +300 sobre un personaje de nivel 200 |
| `critChance` | +15 % | Sin cambio |
| `critDamage` | +0,15 | Sobre la base de 0,5 del `critBonus` |
| `fixedDamage` | `0 + 0,03/nv` (Disparo macabro `0,045/nv`) | ≈ 6 % de un golpe típico, igual que +70 sobre golpes de ~1.000 |
| `pushDamage` | `3 + 0,04/nv` por metro no recorrido | Va en el mismo hechizo que el `knockback`, como lo hizo HZ-04b |
| Escudo | `20 + 5,5/nv` durante 8 s | La regla aprobada |

**Escalera de rangos (sección 4).** Rango r = `U + ⌈(400 − U) × f⌉`, con f = 0,05, 0,15, 0,35, 0,60 y 0,90. Hasta que exista el nivel 400 (D-50), el motor sigue con los factores de `progression.json` y el tope 200. La columna «Rangos» es la escalera final. El aumento por rango (`perRank`) se queda como está; los nuevos usan `effectPercent 12, costPercent 4`.

### Lo que HZ-04c necesita del motor (tarea HZ-04e, Junie)

1. **`perLevel` opcional en `damage`, `heal`, `fixedDamage` y `pushDamage`**, como ya lo tiene `shield`. Fórmula del daño: `(rng(mín, máx) + perLevel × nivel del lanzador) × potencia del rango + scaling × inteligencia`. Vale también dentro de `zone` y `trap`. El nivel de los monstruos que lanzan hechizos es su nivel.
2. **Dos estados nuevos en `statuses.json`:** `ward_ranged` y `ward_melee`, con `immune: true`, `vs: 'ranged'` o `'melee'` y 3 s.
3. **Potenciadores sobre un aliado:** `power`, `critChance`, `critDamage`, `fixedDamage` y `haste` con objetivo «uno» deben poder caer en un aliado o en uno mismo. Hay que comprobarlo y, si falta, añadirlo.
4. **`dispel kind: 'buff'` debe quitar también los escudos.** El contrato lo dice ambiguo: hay que comprobarlo con una prueba.

### Cambios a hechizos que ya existen

- **Ganan Carga** (`selfStack` 25 %, máx. 2, 6 s), uno por clase: Tajo sísmico, Chispa y Flecha de caza.
- **Lluvia de flechas** baja de coste, de 50 a 24, porque el daño de hoy no paga ese coste.
- **Carcaj final y Estero helado** intercambian nivel: el carcaj pasa al 200 y el estero al 165, como pedía el calendario.
- Las cifras de daño pasan a `base + por nivel`. Lo marcado «(sin cambio)» conserva su efecto actual y solo cambia de escalera de rangos.

### Vanguardia de Brasa (32)
| Nv | Id | Nombre | Elem. | Papel | Área · alcance | Coste · enfr. | Efectos (base + por nivel) | Rangos 2 · 3 · 4 · 5 · 6 |
|---|---|---|---|---|---|---|---|---|
| 1 | `charge` | Embestida | Tierra | Daño | línea 6×1,9 m · cuerpo | 15 · 6 s | damage 12–16 + 0,11/nv · knockback 3 m + pushDamage 3 + 0,04/nv por m · dash | 21 · 61 · 141 · 241 · 361 |
| 1 | `ember_whirl` | Remolino de brasas | Fuego | Daño | círculo 3,2 m · cuerpo | 18 · 5 s | damage 13–17 + 0,11/nv · burn 3 s | 21 · 61 · 141 · 241 · 361 |
| 1 | `iron_shout` | Rugido de hierro | Tierra | Potenc. | uno mismo | 10 · 16 s | status iron_shout (sin cambio) | 21 · 61 · 141 · 241 · 361 |
| 2 | `ember_mine` | Mina de brasa | Fuego | Daño | círculo 1 m · 6 m | 14 · 6 s | trap → damage 10–14 + 0,09/nv · burn 3 s | 22 · 62 · 142 · 241 · 361 |
| 3 | `fiery_slash` | Tajo sísmico — *gana Carga* | Tierra | Daño | uno · 1,8 m | 12 · 2,5 s | damage 15–21 + 0,14/nv · selfStack 25 %, máx. 2, 6 s (Carga) | 23 · 63 · 142 · 242 · 361 |
| 5 | `searing_mark` | Marca abrasadora | Fuego | Daño | uno · 8 m | 10 · 4 s | damage 10–13 + 0,08/nv · burn 6 s | 25 · 65 · 144 · 242 · 361 |
| 6 | `stunning_pommel` | Golpe aturdidor | Rayo | Control | uno · 1,8 m | 12 · 8 s | damage 11–14 + 0,09/nv · dazed | 26 · 66 · 144 · 243 · 361 |
| 7 | `bulwark` | Baluarte de roca — *escudo por nivel* | Tierra | Defensa | uno mismo | 20 · 18 s | shield 20 + 5,5/nv, 8 s | 27 · 66 · 145 · 243 · 361 |
| 9 | `ember_chain` | Cadena de brasa | Fuego | Control | uno · 7 m | 14 · 9 s | damage 10–14 + 0,09/nv · pull 4 m | 29 · 68 · 146 · 244 · 361 |
| 12 | `retaliation` | Retaliación | Tierra | Defensa | uno mismo | 15 · 18 s | status retaliation (sin cambio) | 32 · 71 · 148 · 245 · 362 |
| 16 | `tide_cleave` | Tajo de marea | Agua | Daño | cono 4,5 m 85° · cuerpo | 18 · 7 s | damage 14–19 + 0,12/nv · soaked 4 s · knockback 2 m + pushDamage 3 + 0,04/nv por m | 36 · 74 · 151 · 247 · 362 |
| 18 | `salt_temper` | Templado de sal | Escarcha | Daño | cono 4,5 m 85° · cuerpo | 18 · 7 s | damage 16–22 + 0,14/nv · chilled 2 s | 38 · 76 · 152 · 248 · 362 |
| 20 | `thunder_maul` | Mazo de trueno | Rayo | Daño | círculo 3 m · cuerpo | 24 · 10 s | damage 18–25 + 0,15/nv · static_charge 4 s | 39 · 77 · 153 · 248 · 362 |
| 25 | `forge_fervor` (nuevo) | Fervor de fragua | Fuego | Potenc. | uno · 6 m | 20 · 24 s | power +25 % 8 s, a uno mismo o a un aliado (rango 6: +30 %) | 44 · 82 · 157 · 250 · 363 |
| 30 | `guarapo_splash` | Baldazo de guarapo | Agua | Daño | cono 4 m 80° · cuerpo | 14 · 5 s | damage 15–20 + 0,12/nv · soaked 5 s | 49 · 86 · 160 · 252 · 363 |
| 35 | `night_dew` | Sereno | Escarcha | Daño | uno · 1,8 m | 13 · 4 s | damage 17–23 + 0,14/nv · chilled 3 s | 54 · 90 · 163 · 254 · 364 |
| 40 | `flint_spark` | Chispa de pedernal | Rayo | Daño | uno · 1,8 m | 15 · 5 s | damage 17–23 + 0,14/nv · chain 2 saltos, 4 m, −30 % | 58 · 94 · 166 · 256 · 364 |
| 45 | `smoke_screen` | Humareda | Aire | Control | círculo 3 m · 8 m | 18 · 12 s | zone 3 m, 5 s (sin cambio) | 63 · 99 · 170 · 258 · 365 |
| 50 | `salt_crust` | Costra de salitre | Escarcha | Defensa | uno mismo | 22 · 15 s | status stone_skin 6 s (sin cambio) | 68 · 103 · 173 · 260 · 365 |
| 60 | `quarry_pull` (nuevo) | Tirón de cantera | Tierra | Control | círculo 5 m · cuerpo | 22 · 14 s | pull 3 m hacia el lanzador, a todos los del área | 77 · 111 · 179 · 264 · 366 |
| 70 | `bellows` | Fuelle | Aire | Daño | cono 5 m 85° · cuerpo | 16 · 6 s | damage 15–20 + 0,11/nv · knockback 3 m + pushDamage 3 + 0,04/nv por m | 87 · 120 · 186 · 268 · 367 |
| 80 | `ash_ward` (nuevo) | Guardia de ceniza | Fuego | Defensa | uno mismo | 20 · 30 s | status ward_ranged 3 s (invulnerable a distancia) | 96 · 128 · 192 · 272 · 368 |
| 90 | `flood_furrow` | Surco anegado | Agua | Control | línea 6×2 m · 8 m | 24 · 14 s | zone línea, 6 s (sin cambio) | 106 · 137 · 199 · 276 · 369 |
| 100 | `machete_whirl` | Molinete | Aire | Daño | línea 5×2 m · cuerpo | 20 · 7 s | damage 20–27 + 0,14/nv · dash | 115 · 145 · 205 · 280 · 370 |
| 110 | `cold_ash` | Ceniza fría | Escarcha | Daño | círculo 3,5 m · cuerpo | 22 · 8 s | damage 20–27 + 0,14/nv · weariness 4 s | 125 · 154 · 212 · 284 · 371 |
| 120 | `quema_wind` | Viento de quema | Aire | Potenc. | uno mismo | 26 · 18 s | status haste 8 s (sin cambio) | 134 · 162 · 218 · 288 · 372 |
| 135 | `anvil_rhythm` (nuevo) | Compás del yunque | Rayo | Potenc. | uno mismo | 20 · 30 s | critChance +15 % · critDamage +0,15, 8 s | 149 · 175 · 228 · 294 · 374 |
| 150 | `river_shoulder` | Hombro de río | Agua | Daño | línea 6×2 m · cuerpo | 28 · 8 s | damage 24–33 + 0,16/nv · dash · pull | 163 · 188 · 238 · 300 · 375 |
| 165 | `frozen_furrow` | Helada del surco | Escarcha | Daño | línea 6×2 m · cuerpo | 26 · 9 s | damage 28–38 + 0,18/nv · rooted 2 s | 177 · 201 · 248 · 306 · 377 |
| 180 | `numbing_stomp` (nuevo) | Pisotón entumecedor | Tierra | Control | círculo 4 m · cuerpo | 24 · 16 s | damage 10–14 + 0,06/nv · numb 4 s | 191 · 213 · 257 · 312 · 378 |
| 190 | `magma_ram` (nuevo) | Ariete de magma | Fuego | Daño | línea 6×1,5 m · cuerpo | 30 · 10 s | damage 31–42 + 0,18/nv · knockback 2 m + pushDamage 3 + 0,04/nv por m · burn 3 s | 201 · 222 · 264 · 316 · 379 |
| 200 | `volcanic_fury` | Furia volcánica | Fuego | Daño | círculo 4 m · cuerpo | 40 · 20 s | damage 48–65 + 0,28/nv · burn 4 s | 210 · 230 · 270 · 320 · 380 |

### Tejedora de Tormentas (32)
| Nv | Id | Nombre | Elem. | Papel | Área · alcance | Coste · enfr. | Efectos (base + por nivel) | Rangos 2 · 3 · 4 · 5 · 6 |
|---|---|---|---|---|---|---|---|---|
| 1 | `spark` | Chispa — *gana Carga* | Rayo | Daño | uno · 10 m | 9 · 0 s | damage 10–13 + 0,09/nv · selfStack 25 %, máx. 2, 6 s (Carga) | 21 · 61 · 141 · 241 · 361 |
| 1 | `frost_nova` | Nova de escarcha | Escarcha | Control | círculo 3,5 m · cuerpo | 30 · 12 s | damage 9–12 + 0,08/nv · rooted (sin cambio) | 21 · 61 · 141 · 241 · 361 |
| 1 | `storm_focus` | Enfoque de tormenta | Rayo | Potenc. | uno mismo | 10 · 16 s | status storm_focus (sin cambio) | 21 · 61 · 141 · 241 · 361 |
| 2 | `leaden_gale` | Vendaval de plomo | Escarcha | Daño | cono 6 m 60° · cuerpo | 14 · 7 s | damage 9–13 + 0,08/nv · weariness | 22 · 62 · 142 · 241 · 361 |
| 3 | `lightning_step` | Paso de relámpago | Rayo | Control | círculo 0,6 m · 8 m | 15 · 7 s | blink (sin cambio) | 23 · 63 · 142 · 242 · 361 |
| 4 | `vertigo_whistle` | Silbido de vértigo | Aire | Control | uno · 9 m | 12 · 9 s | damage 8–10 + 0,07/nv · disoriented | 24 · 64 · 143 · 242 · 361 |
| 5 | `glacial_lance` | Lanza glacial | Escarcha | Daño | línea 12×1 m · cuerpo | 22 · 5 s | damage 16–22 + 0,14/nv · chilled | 25 · 65 · 144 · 242 · 361 |
| 7 | `voltaic_arc` | Arco voltaico | Rayo | Daño | cono 6 m 70° · cuerpo | 28 · 6 s | damage 17–23 + 0,15/nv · stunned 0,8 s | 27 · 66 · 145 · 243 · 361 |
| 9 | `frost_recoil` | Retroceso helado | Escarcha | Control | cono 3,5 m 90° · cuerpo | 16 · 10 s | damage 6–8 + 0,05/nv · chilled · recoil | 29 · 68 · 146 · 244 · 361 |
| 11 | `storm_mirror` | Espejo de tormenta | Rayo | Defensa | uno mismo | 20 · 20 s | status storm_mirror (sin cambio) | 31 · 70 · 148 · 245 · 362 |
| 13 | `storm_swap` | Trueque de tormenta | Escarcha | Control | uno · 9 m | 18 · 12 s | swap · chilled 1,5 s | 33 · 72 · 149 · 246 · 362 |
| 15 | `static_field` | Campo estático — *daño por golpe de la zona* | Rayo | Daño | círculo 2,5 m · 10 m | 35 · 10 s | zone 2,5 m, 5 s, cada 1 s → damage 6–8 + 0,05/nv · static_charge | 35 · 73 · 150 · 246 · 362 |
| 16 | `waterspout` | Remolino de agua | Agua | Daño | círculo 2,6 m · 11 m | 24 · 7 s | damage 16–22 + 0,14/nv · soaked 4 s | 36 · 74 · 151 · 247 · 362 |
| 18 | `midday_cinder` | Brasa del mediodía | Fuego | Daño | círculo 2,6 m · 11 m | 24 · 7 s | damage 16–22 + 0,14/nv · burn 3 s | 38 · 76 · 152 · 248 · 362 |
| 20 | `clay_spire` | Aguja de arcilla | Tierra | Daño | uno · 10 m | 20 · 8 s | damage 19–25 + 0,16/nv · rooted 1,2 s | 39 · 77 · 153 · 248 · 362 |
| 25 | `mist_veil` | Velo de bajareque | Aire | Control | círculo 3 m · 8 m | 16 · 12 s | zone 3 m, 6 s (sin cambio) | 44 · 82 · 157 · 250 · 363 |
| 30 | `drizzle_needle` | Aguja de llovizna | Agua | Daño | uno · 12 m | 10 · 3 s | damage 14–19 + 0,11/nv · soaked 4 s | 49 · 86 · 160 · 252 · 363 |
| 40 | `woven_power` (nuevo) | Hebra de poder | Rayo | Potenc. | uno · 10 m | 20 · 24 s | power +25 % 8 s, a uno mismo o a un aliado (rango 6: +30 %) | 58 · 94 · 166 · 256 · 364 |
| 50 | `spindle_gust` | Huso de viento | Aire | Daño | línea 5×2 m · 10 m | 18 · 6 s | damage 15–20 + 0,12/nv · knockback · chilled 2 s | 68 · 103 · 173 · 260 · 365 |
| 60 | `rain_stitch` | Puntada de lluvia | Agua | Defensa | círculo 3 m · 8 m | 22 · 14 s | heal 19–26 + 0,15/nv · regeneration 4 s | 77 · 111 · 179 · 264 · 366 |
| 70 | `dispel_gust` (nuevo) | Ráfaga desechizante | Aire | Defensa | uno · 10 m | 16 · 14 s | dispel kind buff: quita potenciadores y escudos del enemigo | 87 · 120 · 186 · 268 · 367 |
| 80 | `loom_roots` | Raíces del telar | Tierra | Daño | círculo 2,5 m · 10 m | 22 · 8 s | damage 17–23 + 0,12/nv · rooted 2,5 s | 96 · 128 · 192 · 272 · 368 |
| 90 | `warp_tide` | Urdimbre de marea | Agua | Daño | línea 6×2 m · 12 m | 24 · 7 s | damage 19–26 + 0,14/nv · bonusVsStatus soaked +40 %, consume | 106 · 137 · 199 · 276 · 369 |
| 100 | `kiln_thread` (nuevo) | Hilo de fogón | Fuego | Daño | uno · 12 m | 22 · 8 s | damage 26–35 + 0,18/nv · bonusVsStatus burn +50 %, consume | 115 · 145 · 205 · 280 · 370 |
| 110 | `dry_lightning` | Rayo seco | Fuego | Daño | cono 6 m 70° · 12 m | 30 · 8 s | damage 29–40 + 0,2/nv | 125 · 154 · 212 · 284 · 371 |
| 120 | `charged_loom` (nuevo) | Telar cargado | Rayo | Potenc. | uno · 10 m | 22 · 30 s | critChance +15 % · critDamage +0,15, 8 s, a uno mismo o a un aliado | 134 · 162 · 218 · 288 · 372 |
| 135 | `landslip` | Derrumbe | Tierra | Daño | línea 7×2,5 m · 12 m | 28 · 9 s | damage 26–35 + 0,17/nv · knockback | 149 · 175 · 228 · 294 · 374 |
| 150 | `gale_tempo` (nuevo) | Compás de viento | Aire | Potenc. | uno · 10 m | 20 · 30 s | haste 6 s · fixedDamage 0 + 0,03/nv, 8 s, a uno mismo o a un aliado | 163 · 188 · 238 · 300 · 375 |
| 165 | `null_veil` (nuevo) | Velo nulo | Escarcha | Defensa | uno · 10 m | 22 · 30 s | status ward_melee 3 s (invulnerable cuerpo a cuerpo), a uno mismo o a un aliado | 177 · 201 · 248 · 306 · 377 |
| 180 | `thunder_weave` | Tejido de trueno | Rayo | Daño | estrella 3 m · 12 m | 32 · 10 s | damage 29–40 + 0,18/nv · static_charge 3 s | 191 · 213 · 257 · 312 · 378 |
| 190 | `cloudburst` | Reventón de nube | Agua | Daño | círculo 3,5 m · 15 m | 35 · 12 s | damage 33–45 + 0,2/nv · soaked 4 s | 201 · 222 · 264 · 316 · 379 |
| 200 | `tempest_crown` | Corona de tempestad | Rayo | Daño | círculo 4 m · cuerpo | 40 · 20 s | damage 41–55 + 0,24/nv · stunned 1 s | 210 · 230 · 270 · 320 · 380 |

### Cazador del Manglar (32)
| Nv | Id | Nombre | Elem. | Papel | Área · alcance | Coste · enfr. | Efectos (base + por nivel) | Rangos 2 · 3 · 4 · 5 · 6 |
|---|---|---|---|---|---|---|---|---|
| 1 | `hunter_arrow` | Flecha de caza — *gana Carga* | Aire | Daño | uno · 13 m | 8 · 0 s | damage 9–12 + 0,08/nv · selfStack 25 %, máx. 2, 6 s (Carga) | 21 · 61 · 141 · 241 · 361 |
| 1 | `powder_arrow` | Flecha de pólvora | Fuego | Daño | círculo 2,4 m · 11 m | 16 · 6 s | damage 12–17 + 0,11/nv · burn 3 s | 21 · 61 · 141 · 241 · 361 |
| 1 | `hawk_eye` | Ojo de halcón | Aire | Potenc. | uno mismo | 10 · 16 s | status hawk_eye (sin cambio) | 21 · 61 · 141 · 241 · 361 |
| 3 | `reed_cross` | Cruz de junco | Tierra | Daño | cruz 3 m · 10 m | 14 · 5 s | damage 12–17 + 0,11/nv | 23 · 63 · 142 · 242 · 361 |
| 4 | `gale_star` | Estrella de vendaval | Aire | Daño | estrella 3,2 m · 12 m | 16 · 7 s | damage 15–20 + 0,13/nv | 24 · 64 · 143 · 242 · 361 |
| 5 | `piercing_shot` | Disparo perforante | Agua | Daño | línea 15×1 m · cuerpo | 15 · 6 s | damage 15–21 + 0,13/nv | 25 · 65 · 144 · 242 · 361 |
| 7 | `vine_arrow` | Flecha de enredadera | Tierra | Control | uno · 12 m | 12 · 8 s | damage 7–10 + 0,06/nv · rooted 1,5 s | 27 · 66 · 145 · 243 · 361 |
| 9 | `heron_leap` | Salto de garza | Aire | Control | cono 3 m 70° · cuerpo | 10 · 10 s | damage 5–7 + 0,04/nv · recoil | 29 · 68 · 146 · 244 · 361 |
| 11 | `powder_dash` | Carga de pólvora | Fuego | Control | línea 7×1,4 m · cuerpo | 14 · 9 s | damage 7–9 + 0,06/nv · dash | 31 · 70 · 148 · 245 · 362 |
| 12 | `arrow_downpour` | Lluvia de flechas — *coste 50 → 24* | Agua | Daño | círculo 4 m · 12 m | 24 · 12 s | damage 15–20 + 0,13/nv · soaked 6 s | 32 · 71 · 148 · 245 · 362 |
| 14 | `thorn_ward` | Guardia de espinas | Tierra | Defensa | uno mismo | 14 · 18 s | status thorn_ward (sin cambio) | 34 · 72 · 150 · 246 · 362 |
| 16 | `estuary_arrow` | Flecha de estero | Agua | Daño | círculo 2,2 m · 12 m | 18 · 7 s | damage 14–19 + 0,12/nv · soaked 4 s | 36 · 74 · 151 · 247 · 362 |
| 18 | `dew_arrow` | Flecha de rocío | Escarcha | Daño | círculo 2,2 m · 12 m | 18 · 7 s | damage 14–19 + 0,12/nv · chilled 2 s | 38 · 76 · 152 · 248 · 362 |
| 20 | `lightning_arrow` | Flecha de relámpago | Rayo | Daño | línea 14×1,2 m · cuerpo | 21 · 8 s | damage 18–25 + 0,15/nv · static_charge 4 s | 39 · 77 · 153 · 248 · 362 |
| 25 | `steady_aim` (nuevo) | Pulso firme | Aire | Potenc. | uno mismo | 20 · 30 s | critChance +15 % · critDamage +0,15 · fixedDamage 0 + 0,03/nv, 8 s (Puntería) | 44 · 82 · 157 · 250 · 363 |
| 30 | `cold_snare` | Lazo de sereno | Escarcha | Control | círculo 0,8 m · 8 m | 12 · 6 s | trap → rooted 2 s · damage (sin cambio) | 49 · 86 · 160 · 252 · 363 |
| 35 | `eel_arrow` | Flecha de anguila | Rayo | Daño | uno · 14 m | 14 · 4 s | damage 14–18 + 0,11/nv · chain 2 saltos | 54 · 90 · 163 · 254 · 364 |
| 40 | `tar_arrow` | Flecha de brea | Fuego | Daño | círculo 2 m · 12 m | 16 · 6 s | damage 9–12 + 0,07/nv · zone 2 m, 5 s (sin cambio) | 58 · 94 · 166 · 256 · 364 |
| 50 | `mud_cloak` (nuevo) | Capa de fango | Tierra | Defensa | uno mismo | 18 · 30 s | status ward_melee 3 s (invulnerable cuerpo a cuerpo) | 68 · 103 · 173 · 260 · 365 |
| 60 | `tide_pull` | Resaca | Agua | Control | uno · 12 m | 16 · 8 s | pull (sin cambio) | 77 · 111 · 179 · 264 · 366 |
| 70 | `heron_feather` | Pluma de garza | Escarcha | Daño | uno · 14 m | 14 · 5 s | damage 19–26 + 0,15/nv · chilled 3 s | 87 · 120 · 186 · 268 · 367 |
| 80 | `charcoal_cloud` | Nube de carbón | Fuego | Control | círculo 3 m · 10 m | 20 · 12 s | zone 3 m, 5 s (sin cambio) | 96 · 128 · 192 · 272 · 368 |
| 90 | `mangrove_spike` (nuevo) | Púa de mangle | Tierra | Daño | cruz 3 m · 12 m | 18 · 6 s | damage 15–20 + 0,11/nv · rooted 1 s | 106 · 137 · 199 · 276 · 369 |
| 100 | `cleansing_arrow` (nuevo) | Flecha limpia | Agua | Defensa | uno · 12 m | 16 · 14 s | dispel kind buff: quita potenciadores y escudos del enemigo | 115 · 145 · 205 · 280 · 370 |
| 110 | `fog_arrow` | Flecha de neblina | Escarcha | Daño | círculo 2,5 m · 14 m | 20 · 6 s | damage 18–24 + 0,12/nv · chilled 4 s | 125 · 154 · 212 · 284 · 371 |
| 120 | `macabre_shot` (nuevo) | Disparo macabro | Aire | Potenc. | uno mismo | 24 · 36 s | fixedDamage 0 + 0,045/nv · critChance +10 %, 8 s (rango 6: +25 % y power +25 %) | 134 · 162 · 218 · 288 · 372 |
| 135 | `kiln_burst` (nuevo) | Horno de mangle | Fuego | Daño | círculo 3 m · 12 m | 26 · 9 s | damage 22–30 + 0,15/nv · bonusVsStatus burn +50 %, consume | 149 · 175 · 228 · 294 · 374 |
| 150 | `tether_feather` (nuevo) | Pluma compartida | Aire | Defensa | uno · 12 m | 20 · 24 s | shareDamage 30 %, 6 s: el Cazador carga con parte del daño de un aliado | 163 · 188 · 238 · 300 · 375 |
| 165 | `frozen_estuary` | Estero helado — *nivel 200 → 165* | Escarcha | Daño | círculo 3,5 m · 12 m | 28 · 10 s | damage 25–34 + 0,16/nv · zone 3,5 m, 6 s (sin cambio) | 177 · 201 · 248 · 306 · 377 |
| 180 | `thunder_flock` (nuevo) | Bandada de trueno | Rayo | Daño | uno · 14 m | 28 · 10 s | damage 30–41 + 0,18/nv · chain 4 saltos, 5 m, −20 % | 191 · 213 · 257 · 312 · 378 |
| 190 | `hunt_drum` (nuevo) | Tambor de caza | Tierra | Potenc. | uno · 12 m | 22 · 30 s | power +20 % · haste 6 s, a uno mismo o a un aliado | 201 · 222 · 264 · 316 · 379 |
| 200 | `final_quiver` | Carcaj final — *nivel 165 → 200* | Aire | Daño | estrella 4 m · 15 m | 40 · 20 s | damage 48–65 + 0,28/nv | 210 · 230 · 270 · 320 · 380 |

## Qué entra en el primer hito

Orden y condiciones en [06 Plan de implementación](06_PLAN_IMPLEMENTACION.md).

1. **M1 (rangos)**, aislado: tareas D-01a a D-01d, más el doble clic (UI-01).
2. **Rebanada jugable 1–10** con los hechizos que ya existen. No necesita hechizos nuevos.
3. **Prototipos de M2 a M5** en el laboratorio, con medición. Que pasen a producción, y con qué hechizos, lo decide el creador al verlos.
4. Los hechizos nuevos de este catálogo no entran en `data/rpg/spells.json` hasta esa decisión.
