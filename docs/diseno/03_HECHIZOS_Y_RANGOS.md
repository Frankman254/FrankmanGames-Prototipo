# 03 · Hechizos y rangos

Estado: dirección `PROPUESTA`. Todas las cifras se ajustan en `data/rpg/spells.json` y se miden con `npm run balance:v3`.

## Qué pasa hoy (medido el 2026-11-13)

| Hecho | Dónde se ve |
|---|---|
| Hay 52 hechizos: 13 de Vanguardia, 15 de Tejedora, 14 de Cazador y 10 universales de pergamino | `data/rpg/spells.json` |
| Las clases dejan de aprender hechizos en el **nivel 20**, y el nivel máximo es 200 | campo `unlockLevel` |
| Un hechizo **solo sube de rango leyendo otro pergamino** del mismo hechizo. No hay subida por nivel | `Spellbook.learn()` en `src/rpg/spells.ts` |
| Por eso una partida de prueba de nivel 200 sale con todo en rango 1, salvo que el preset escriba el rango a mano | `src/dev/presets.ts` |
| El reparto por elemento es desigual: la Vanguardia no tiene ningún hechizo de aire y la Tejedora tiene 6 de rayo | tabla de abajo |
| Ya existen estas mecánicas: empujar, atraer, cambiar de sitio, parpadeo, carga, salto atrás, trampa, zona, escudo, cura, invocación, revelar y devolver hechizos | `EffectDef` en `src/rpg/contracts.ts` |
| No existen: obstáculos, repetidor de hechizos, marcas que se detonan, medidor de clase, desvío de daño, señuelos ni torretas | — |

## Reglas nuevas

### 1. Treinta hechizos por clase

A nivel 200 cada clase tiene **30 hechizos propios: 5 por cada uno de los 6 elementos**.

- En cada elemento, **3 son de ataque y 2 son de técnica** (apoyo, movilidad, terreno, mejora o invocación). En los dos elementos de afinidad la proporción puede variar si el total de la clase queda en 18 de ataque y 12 de técnica, con un margen de ±2.
- Mínimos de técnica por clase: 3 de movilidad o posición, 2 de terreno u obstáculo, 2 de apoyo a aliados, 2 de mejora propia y 1 invocación.
- Los 10 universales de pergamino siguen aparte y no cuentan.

Total: 90 hechizos de clase. Existen 42; faltan **48**, listados más abajo.

### 2. Niveles de aprendizaje

- Los hechizos actuales conservan su nivel (1–20).
- Los nuevos se aprenden en estos niveles, uno por nivel de la lista: **25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 120, 135, 150, 165, 180**. La clase que tiene menos hechizos nuevos salta alguno; el nivel exacto está en cada tabla.
- Así, de 1 a 40 (versión estable) cada clase aprende entre 17 y 19 hechizos.

### 3. Rangos automáticos por nivel

El rango deja de depender de pergaminos. **Sube solo al alcanzar un nivel, igual para todas las clases.**

Para un hechizo que se aprende en el nivel `U`, con nivel máximo `M = 200`:

| Rango máximo del hechizo | Rango 2 | Rango 3 | Rango 4 | Rango 5 |
|---|---|---|---|---|
| 5 (ataques y casi todas las técnicas) | `U + ⌈(M−U)·0,10⌉` | `U + ⌈(M−U)·0,25⌉` | `U + ⌈(M−U)·0,45⌉` | `U + ⌈(M−U)·0,70⌉` |
| 3 (mejoras y utilidades) | `U + ⌈(M−U)·0,25⌉` | `U + ⌈(M−U)·0,60⌉` | — | — |

Ejemplos calculados:

| Se aprende en | Rangos 2 · 3 · 4 · 5 | Si su máximo es 3: rangos 2 · 3 |
|---|---|---|
| 1 | 21 · 51 · 91 · 141 | 51 · 121 |
| 5 | 25 · 54 · 93 · 142 | 54 · 122 |
| 20 | 38 · 65 · 101 · 146 | 65 · 128 |
| 60 | 74 · 95 · 123 · 158 | 95 · 144 |
| 100 | 110 · 125 · 145 · 170 | 125 · 160 |
| 150 | 155 · 163 · 173 · 185 | 163 · 180 |
| 180 | 182 · 185 · 189 · 194 | 185 · 192 |

Consecuencias:
- A nivel 200 todo está en rango máximo, sin excepción.
- Siempre hay algo subiendo: entre hechizos nuevos y rangos, el jugador recibe una mejora cada 2 o 3 niveles durante todo el juego.
- Los universales siguen la misma tabla, contando desde su `unlockLevel`. El pergamino solo enseña el hechizo.
- Un pergamino de un hechizo ya conocido no hace nada y se puede vender. Los guardados viejos conservan el rango más alto entre el guardado y el que toca por nivel.
- Los factores (0,10 · 0,25 · 0,45 · 0,70) van en `data/rpg/progression.json`, no en el código.

### 4. Presupuesto de balance

1. Un hechizo nuevo se crea copiando las cifras de uno existente del mismo tipo y tramo, y luego se ajusta.
2. Un ataque fuera de la afinidad de la clase hace alrededor de un 10 % menos que su equivalente de afinidad. La afinidad ya da +10 (`affinityBonus`).
3. Una técnica con efecto fuerte (obstáculo, invocación, desvío) tiene enfriamiento de 15 s o más.
4. Ningún hechizo nuevo puede superar en daño por recurso al mejor ataque de afinidad de su tramo. Se comprueba con el bot de `tests/balance/`.
5. No se tocan las cifras de los hechizos actuales en esta fase, salvo los cambios de elemento que se indican abajo.

## Mecánicas nuevas que hay que programar

En orden de construcción. Cada una es una tarea de [TAREAS](../TAREAS.md).

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

## Vanguardia de Brasa: 30 hechizos

Hoy: tierra 5, fuego 4, rayo 2, agua 1, hielo 1, aire 0. Faltan 17.

Cambios en los actuales, sin tocar cifras:
- **Brasa (M5):** sube 1 con cada golpe de fuego que das y con cada golpe cuerpo a cuerpo que recibes; baja 1 cada 4 s fuera de combate.
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

## Tejedora de Tormentas: 30 hechizos

Hoy: rayo 6, hielo 5, aire 1, agua 1, fuego 1, tierra 1. Faltan 15.

Cambios en los actuales:
- `storm_focus` (Foco de tormenta) pasa de rayo a **aire**, para dejar rayo en 5. No cambia cifras.
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

## Cazador del Manglar: 30 hechizos

Hoy: aire 4, agua 3, tierra 3, fuego 2, hielo 1, rayo 1. Faltan 16.

Cambios en los actuales:
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
| 150 | `live_tide` | Marea viva | Agua | Técnica · mejora | Durante 8 s tu mascota repite tus tiros básicos y puede cargar el reclamo (M6) |
| 165 | `frozen_estuary` | Estero helado | Hielo | Ataque · círculo grande | Suelo resbaloso: los enemigos empujados dentro llegan el doble de lejos |
| 180 | `thunder_flock` | Bandada de trueno | Rayo | Ataque · estrella | Daño alto. Segundo reclamo activo desde este nivel |

## Qué entra en la versión estable

Solo lo que se usa hasta el nivel 40:
- M1 (rangos), M2 (obstáculo), M3 (reclamo), M4 (hilos) y M5 (Brasa).
- Los hechizos nuevos de nivel 25 a 40: 4 de Vanguardia, 4 de Tejedora y 4 de Cazador.
- M6 a M9 y el resto de hechizos quedan para después.
