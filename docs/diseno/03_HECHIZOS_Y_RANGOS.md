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

## Repertorio revisado (HZ-04a, PROPUESTA del 2026-11-18)

Responde a lo que pidió el creador el 2026-11-18 ([00_DECISIONES](00_DECISIONES.md)):
- todas las clases tienen el mismo número de hechizos;
- es un juego de estrategia, y «no todo es pegar»;
- hay hechizos con carga, de posicionamiento y potenciadores;
- los hechizos fuertes son caros;
- hay combos por estado;
- los últimos hechizos de cada clase son los más potentes y los que la definen;
- con el nivel máximo en 400, las escaleras de rangos llegan hasta el 400 (Q9).

Nada de esto toca `data/` hasta que el creador lo apruebe; después lo aplica HZ-04c. Nombres, cifras y niveles son provisionales.

### Cuántos y para qué

**32 hechizos por clase**, con 3 cambios:
- se suman los 19 del catálogo que esperan primitiva (5, 6 y 8 por clase);
- la Vanguardia gana un hechizo nuevo de agrupar;
- el Cazador gana el potenciador que propuso el creador.

En las tres clases, **12 de 32 son de daño (37 %)**. Los otros 20 sirven para mover, frenar, preparar terreno, proteger o potenciar. Ganar una pelea depende de cómo se encadenan, no solo de cuánto pega cada uno.

| Papel | Vanguardia | Tejedora | Cazador |
|---|---|---|---|
| Daño a un objetivo | 4 | 5 | 4 |
| Daño en área | 8 | 7 | 8 |
| Atraer, empujar o cambiar de sitio | 5 | 4 | 3 |
| Quitar movimiento o acción | 3 | 4 | 3 |
| Terreno, trampas y obstáculos | 3 | 3 | 5 |
| Movilidad propia | — | 2 | 2 |
| Defensa, provocación o cura | 5 | 2 | 1 |
| Invocación | 1 | 2 | 3 |
| Potenciador o marca | 3 | 3 | 3 |

### Cómo juega cada clase

- **Vanguardia de Brasa: atrae, agrupa y aplasta.**
  - Se pone delante y junta a los enemigos con Cadena de brasa, Hombro de río y la nueva Vorágine de ceniza.
  - Los provoca con Llamado del yunque.
  - Después los castiga en área: Remolino, Mazo del aguacero o Furia volcánica.
  - Aguanta con escudos y devolución de daño.
  - Su medidor de Brasa (M5, de 0 a 5) sube cuando recibe golpes y cuando acierta a 3 enemigos o más. Zafra de rayos lo gasta.
- **Tejedora de Tormentas: prepara el terreno y lo detona.**
  - Deja estados (Empapado, Carga estática, Ralentizado) y zonas (Campo estático, Velo de bajareque).
  - Los aprovecha con los hechizos que leen esos estados: Urdimbre de marea, los combos de abajo y los nudos de Hilos (M4).
  - Huye con parpadeo y salto atrás.
  - Es la clase más frágil y la que más premia preparar antes de pegar.
- **Cazador del Manglar: distancia y emboscada.**
  - Elige dónde pelear: trampas, raíces de mangle (obstáculo), Reclamo (M3), que repite sus áreas, y señuelos.
  - Marca a la presa con Pluma de garza y la remata con potenciadores.
  - Si lo alcanzan, salta atrás.

### Tipos que pidió el creador

| Tipo | Regla propuesta | Dónde |
|---|---|---|
| **Carga al lanzar** | Cada lanzamiento deja 1 acumulación, como máximo 2, durante 6 s. Cada acumulación suma +25 % al daño base del siguiente. Necesita que `selfStack` (HZ-04b) sume daño de verdad | Tajo sísmico (Vanguardia), Aguja de llovizna (Tejedora) y Saeta certera (Cazador): los golpes baratos y repetibles de cada clase |
| **Quitar movimiento** | Es el equivalente de quitar PM: estados que bajan la velocidad (Ralentizado −40 %, Trabado −35 %, Placado −30 %, Agotamiento −12 %) o que la anulan (Inmovilizado) | Ya existen; hay 3 o 4 por clase |
| **Quitar acción** | Es el equivalente de quitar PA. Embotado: el siguiente hechizo del enemigo tarda más en lanzarse. **Nuevo, Entumecido**: los enfriamientos del enemigo van un 20 % más lentos durante 4 s | Pomazo (Embotado); Silbo de vértigo y Viento plomizo pasan a dejar Entumecido |
| **Empujar y atraer** | Ya existen `knockback`, `pull` y `swap`. Faltan M8 (atraer a un punto) y M9 (cambiar de sitio con lo propio) | Nueva **Vorágine de ceniza** (Vanguardia, fuego, nivel 125, M8): junta a todos los enemigos del círculo en su centro |
| **Obstáculos** | M2: pieza temporal con vida que bloquea el paso y, según el hechizo, la visión | Cortafuego, Nudo de piedra y Raíces de mangle |
| **Potenciadores** | Mejoras de corta duración que cambian el ritmo de la pelea | Grito de hierro, Foco de tormenta, Ojo de gavilán y, nuevo, **Disparo macabro** (Cazador, nivel 190; nombre provisional del creador): unos 100 de daño fijo a todos los elementos; en rango 6, +25 % de crítico y unos 350 de potencia, que también cuentan en el golpe crítico |
| **Fuertes pero caros** | Coste de recurso de al menos el 30 % del máximo y enfriamiento de 20 s o más. Se lanzan pocas veces por pelea | Furia volcánica, Corona de tempestad, Carcaj final, Estero helado y Disparo macabro |

### Combos por estado

Todos usan estados que ya existen, salvo Congelado y Entumecido. Las cifras son `PROPUESTA`.

| Estado previo | Lo deja | Lo aprovecha | Resultado |
|---|---|---|---|
| Empapado | Aguacero de flechas, Tromba marina, Tajo de marea, Aguja de llovizna, Baldazo de guarapo | Rayo: Flecha de anguila, Chispa de pedernal, Arco voltaico | El rayo salta entre mojados y pega más (ya lo hacen Flecha de anguila y Urdimbre de marea) |
| Empapado | (ídem) | Escarcha: Lanza glacial, Saeta de rocío, Sereno | **Congelado**: el Ralentizado se convierte en Inmovilizado durante 1,5 s y quita el Empapado |
| Quemadura | Remolino de brasas, Marca ardiente, Saeta de pólvora | Aire: Fuelle, Huso de viento, Estrella de vendaval | El viento extiende la Quemadura a los enemigos cercanos a cada quemado |
| Carga estática | Mazo del aguacero, Flecha de centella, Tejido de trueno | Cualquier hechizo de rayo | Con 3 acumulaciones, descarga: 1 s de Aturdido y se vacía |
| Inmovilizado | Raíces del telar, Flecha de bejuco, Helada del surco | Tierra: Tajo sísmico, Aguja de arcilla, Derrumbe | +30 % de daño contra el inmovilizado, y lo libera |
| Quemadura | (ídem) | Agua sobre un aliado: Baldazo de guarapo, Puntada de lluvia | Apaga la quemadura del aliado (ya existe) |

Un estado lo puede dejar una clase y aprovecharlo otra. En grupo, una Tejedora que moja prepara la Flecha de anguila del Cazador.

### Últimos hechizos

Se aprenden entre el 165 y el 200 y son los que definen la clase:
- **Vanguardia**: Espantajo de brasa (180) y Furia volcánica (200).
- **Tejedora**: Tejido de trueno (180), Reventón de nube (190) y Corona de tempestad (200).
- **Cazador**: Carcaj final (165), Bandada de trueno (180), Disparo macabro (190) y Estero helado (200).

Su daño base y su efecto salen del presupuesto del tramo 160–200, el más alto. Su escalera de rangos llega hasta el nivel 380 o 400, así que siguen creciendo de 200 a 400.

### Rangos hasta el 400 (Q9)

Hay seis rangos. Para un hechizo que se aprende en el nivel `U`, con el nivel máximo `M` = 400, el rango `r` llega en `U + ⌈(M−U)·f⌉`. Los factores (`PROPUESTA`) sustituyen a los de la regla 3 cuando D-50 suba el máximo:

| Rango | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|
| Factor `f` | 0,05 | 0,15 | 0,35 | 0,60 | 0,90 |
| Se aprende en 1 | 21 | 61 | 141 | 241 | 361 |
| Se aprende en 100 | 115 | 145 | 205 | 280 | 370 |
| Se aprende en 180 | 191 | 213 | 257 | 312 | 378 |
| Se aprende en 200 | 210 | 230 | 270 | 320 | 380 |

Ningún hechizo se queda corto: a nivel 400 todos están en rango 6.

### Cambios a hechizos actuales

No cambia el elemento ni las cifras de daño de ningún hechizo:
- **Tajo sísmico, Aguja de llovizna y Saeta certera**: ganan la carga.
- **Silbo de vértigo y Viento plomizo**: dejan además Entumecido.
- **Lanza glacial, Saeta de rocío y Sereno**: congelan a los empapados.
- **Fuelle, Huso de viento y Estrella de vendaval**: extienden la Quemadura.
- **Hechizos de rayo**: descargan a 3 acumulaciones de Carga estática.
- **Tajo sísmico, Aguja de arcilla y Derrumbe**: rematan a los inmovilizados.

### Orden de integración (HZ-04c y siguientes)

1. **Sin primitivas nuevas**:
   - la carga, con `selfStack` arreglado;
   - los estados Congelado y Entumecido;
   - los combos de la tabla;
   - Disparo macabro.
2. **M2** (obstáculo) y **M8** (atraer a un punto): Cortafuego, Nudo de piedra, Raíces de mangle y Vorágine de ceniza.
3. **M7** (provocación y desvío) y **M5** (medidor de Brasa).
4. **M4** (nudos), **M3** (Reclamo), **M6** (señuelo y torreta), **M9** (cambio de sitio con lo propio) y T06 (Marea viva).

Cada paso se mide con el bot de `tests/balance/` contra el presupuesto de la regla 4 antes de pasar al siguiente.

## Qué entra en el primer hito

Orden y condiciones en [06 Plan de implementación](06_PLAN_IMPLEMENTACION.md).

1. **M1 (rangos)**, aislado: tareas D-01a a D-01d, más el doble clic (UI-01).
2. **Rebanada jugable 1–10** con los hechizos que ya existen. No necesita hechizos nuevos.
3. **Prototipos de M2 a M5** en el laboratorio, con medición. Que pasen a producción, y con qué hechizos, lo decide el creador al verlos.
4. Los hechizos nuevos de este catálogo no entran en `data/rpg/spells.json` hasta esa decisión.
