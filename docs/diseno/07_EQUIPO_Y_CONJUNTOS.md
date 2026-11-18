# 07 · Equipo y conjuntos

Dirección del creador (2026-11-15): el equipo debe ofrecer elecciones completas por franja, elemento y región; las armas no pueden comprar todo su poder con daño base mientras casi no aportan características. Los conjuntos parten del mundo propio de Panamá del juego. Todas las cifras de este documento son `PROPUESTA` hasta medirlas con T01.

Las capturas de otro juego aportadas por el creador se usaron únicamente para abstraer una idea general: **al subir de nivel aumenta la variedad de líneas útiles, no solo una cifra grande**. No se copian objetos, nombres, iconos, siluetas, combinaciones exactas ni valores.

## Revisión 2026-11-18 (EQ-07)

Respuesta a la queja del creador del 2026-11-18 ([decisión](00_DECISIONES.md)). Esta sección manda sobre las reglas de presupuesto de más abajo donde choquen: el tope de crítico de 4 % por pieza, el daño elemental hasta 30 y la Vida de nivel alto. Todo lo que no son cifras del creador es `PROPUESTA`.

### Lo que se midió (`work/claude-items1118/medicion.txt`)

1. **«Nada da Agilidad al 40» era sobre todo el filtro.** El filtro de elemento de la mochila, el banco y la tienda solo miraba el elemento del arma y el daño implícito; nunca la Agilidad ni las tiradas. Las piezas del set de aire de nivel 32 existían, pero no salían. Corregido el 2026-11-18 (`getElementsOf` en `src/ui/menus/itemFilters.ts`, prueba `tests/ui/itemFiltersPrimaries.test.ts`).
2. **Aun así la oferta es pobre.** Entre los niveles 30 y 45 hay 5 piezas no arma de Agilidad, todas del 32–33, con Agilidad 9–13. Solo hay **14 anillos, 18 amuletos, 12 cinturones y 34 capas** en todo el juego. Las rutas por elemento cubren sombrero, pechera, guantes y botas, y nada más.
3. **60 armas repiten su primaria.** De la 115 a la 195, cada arma de metal suma la primaria una vez como línea fija y otra como tirada. El Arco de renio, por ejemplo, da Agilidad +92, +37 y +92–140 a la vez. No es trielemental, es el mismo elemento tres veces. Además, el daño fijo de varias no coincide con su primaria: la Espada de renio da Fuerza con daño de fuego.
4. **Escala de nivel 181–200 actual**: primaria hasta 81 en armaduras y 140 en armas; Vida hasta 269; Espíritu hasta 96; crítico 4 %; daño elemental 28.

### Estructura de referencia, como idea

Se toma de DOFUS 3 solo la forma general, sin objetos, nombres ni tablas:

- cada ranura tiene un peso: las piezas grandes llevan el grueso y los anillos menos;
- cada objeto tiene líneas fijas con una horquilla min–máx;
- una pieza multielemental da elementos **distintos**, cada uno algo menor que en una pieza de un solo elemento;
- las piezas «de todos los elementos» cambian primarias por Potencia;
- las secundarias dependen de la ranura y de la identidad del objeto;
- los conjuntos premian por número de piezas puestas.

De FATE se toma solo el azar: rarezas que añaden líneas aleatorias de un catálogo de la ranura.

### Curva de una pieza principal

Línea recta entre el nivel 1 (`PROPUESTA`) y el 200 (cifras del creador). Cada celda da «mínimo / máximo»; cada uno es un intervalo del que el generador elige el extremo de la tirada. Por ejemplo, en nivel 200 una pieza podría tirar Agilidad 58–104.

| Línea | 1 | 20 | 40 | 60 | 100 | 150 | 200 |
|---|---|---|---|---|---|---|---|
| Primaria elemental | 2–3 / 4–6 | 7–9 / 11–17 | 11–16 / 19–28 | 16–23 / 27–40 | 26–36 / 42–63 | 38–53 / 61–91 | **50–70 / 80–120** |
| Vida | 10–15 / 20–30 | 40 / 70 | 70 / 118 | 98 / 165 | 155 / 262 | 228 / 380 | **300 / 500** |
| Daño fijo por elemento | 1–2 | 2–4 | 3–6 | 3–7 | 5–11 | 7–15 | **9–20** |
| Resistencia % por línea | 1–3 | 2–4 | 2–4 | 3–5 | 4–6 | 5–8 | **7–10** |
| Espíritu | 1–2 / 3–4 | 4–7 / 7–10 | 7–11 / 12–17 | 10–16 / 17–24 | 15–26 / 26–37 | 23–38 / 38–53 | **30–50 / 50–70** |
| Potencia (solo seis elementos) | como primaria | | | | | | **50–70 / 80–120** |
| Crítico % | 1 / 1–2 | 1 / 1–3 | 1–2 / 2–4 | 2 / 2–4 | 2–3 / 3–6 | 2–4 / 5–8 | **3–5 / 6–10** |
| Hallazgo | **2–5** | 3–7 | 4–5 / 8–10 | 4–6 / 10–12 | 6–8 / 13–17 | 8–12 / 17–24 | **10–15 / 21–30** |

### Peso por ranura

| Grupo | Ranuras | Factor | Secundarias propias |
|---|---|---:|---|
| Principal | sombrero, pechera, botas, capa, amuleto | 1,0 | sombrero: Espíritu, recurso, enfriamiento; pechera: Vida y dos resistencias; botas: velocidad, Huida, Templanza; capa: resistencias y Hallazgo; amuleto: recurso, regeneración, crítico |
| Media | guantes, cinturón, escudo | 0,8 | guantes: crítico y Concentración; cinturón: Vida, carga y Placaje; escudo: resistencias altas y Vida |
| Anillo | anillo | 0,6 | crítico o Hallazgo, una resistencia |
| Arma | arma | 0,7 en características, más su daño base | primaria de su elemento y crítico |

El factor multiplica todas las líneas de la curva. Las secundarias de identidad de cada elemento se conservan: Placaje en tierra, Huida en aire, curación en fuego, Templanza en hielo, Hallazgo en agua y Concentración en rayo.

### Elementos por pieza

| Tipo | Primarias | Daño fijo | Regla |
|---|---|---|---|
| Mono | 1 al 100 % | 1 línea | — |
| Bi | 2 distintas, 75 % cada una | 2 líneas en el rango completo | — |
| Tri | 3 distintas, 60 % cada una | 3 líneas en el rango completo (creador) | — |
| Seis elementos | ninguna; Potencia | 9–20 a todos los elementos | — |

Las primarias de una pieza nunca se repiten, ni entre líneas fijas y tiradas.

### Azar al estilo FATE (`PROPUESTA`)

Las líneas del catálogo son fijas, con su horquilla. Al caer el objeto, un raro añade una línea aleatoria del catálogo de su ranura, un épico dos y un legendario dos de mayor rango. Cada línea al 50 % de la curva. Nunca puede salir una primaria que el objeto ya tenga.

### Cobertura mínima

Cada 20 niveles y cada elemento: una pieza por ranura principal y media, un anillo y un arma. Así ningún elemento queda sin camino a ningún nivel.

### Preguntas al creador

- **Q-EQ1.** ¿La horquilla 50–70 / 80–120 de primaria vale también por elemento en una tri, o se reparte como en la tabla (60 % cada una)?
- **Q-EQ2.** Crítico 6–10 % por pieza: ¿en qué ranuras? La propuesta es amuleto, guantes, anillos y arma, unos 50 % como máximo con todo.
- **Q-EQ3.** El azar FATE al caer, ¿sí o no? Hoy el catálogo es fijo.
- **Q-EQ4.** La Vida de nivel 200, ¿es línea de Vida directa (300–500) o se expresa en Vitalidad (5 de Vida por punto)?

## Estado medido del catálogo

La base heredada de 2026-11-15 llegaba sólo a nivel 100. El 2026-11-16 se abrió el contrato de objetos hasta 200 y `generateEquipmentRoutes.mjs` añadió una matriz determinista por encima de esa base.

| Franja | Piezas | Armas | Mediana de líneas | Problema principal |
|---|---:|---:|---:|---|
| 1–20 | 65 | 18 | 2 | Cuatro armas tienen una sola línea; el daño por nivel de algunas piezas iniciales domina todo lo demás |
| 21–40 | 24 | 12 | 3 | Poca variedad dentro de cada elemento |
| 41–60 | 23 | 12 | 3 | Falta identidad secundaria y elección defensiva |
| 61–80 | 27 | 12 | 4 | Mejor base, pero solo dos conjuntos cubren la franja |
| 81–100 | 27 | 12 | 4 | Los sets existentes son útiles, pero no hay alternativa para todos los elementos |

Los diez conjuntos productivos anteriores se conservan. La matriz nueva añade **60 conjuntos mono-elementales** (seis elementos × diez franjas) y **10 conjuntos de aprendizaje**, todos con cuatro piezas y adquisición en mercader. Los bielementales y trielementales regionales de la tabla inferior siguen siendo la siguiente capa de variedad, no un sustituto de estas rutas base.

### Aprendizaje a cambio de poder

`experienceGain` («Aprendizaje») es una secundaria separada de Espíritu. Espíritu mantiene recurso y regeneración; Aprendizaje aumenta únicamente la XP de personaje, con tope global de +100 %. Cada franja tiene un conjunto de cuatro piezas que sólo tira Aprendizaje: no da primarias, Vida, Potencia, daño, resistencia, crítico ni utilidad táctica. Por tanto, quien lo vista progresa más rápido pero necesita ayuda o acepta combates mucho más lentos; no obtiene progreso y poder de la misma inversión.

## Reglas de presupuesto

### Contrato productivo 1–100 (integrado 2026-11-15)

`scripts/balance/rebalanceEquipment.mjs` audita ahora las 446 piezas equipables. Mantiene el rebalance de las 160 piezas heredadas no montura, preserva las seis monturas y deja las 280 piezas de rutas bajo su generador propio para no contaminar los conjuntos de aprendizaje. Es determinista y `npm run balance:equipment` audita sin escribir:

- el daño declarado por un arma es **daño base**, antes de característica elemental, Potencia, afinidad, daño plano, crítico y resistencia;
- las armas 1–100 usan una curva propia pequeña y ajustada por cadencia; el Bastón de la quebrada de nivel 96 fija el patrón en **16–25 de rayo**, no 164–256;
- una línea de resistencia llega como máximo a 10 % y una de crítico a 4 % por pieza; el daño elemental plano llega a 7 en nivel 96 y la curva reserva hasta 30 para nivel 200;
- casi todas las características equipables son tiradas min–máx redondeadas. La interfaz muestra sólo el valor real y revela la horquilla al mantener `Alt` o `⌥ Option`;
- las líneas siguen un orden único: primarias, vida, Espíritu/recurso, Potencia/crítico, táctica, daño elemental y resistencias;
- los bonos acumulables de conjunto tienen topes propios inferiores a una pieza completa.

Pieza patrón: Bastón de la quebrada — Intelecto 46–70, Potencia 11–20, crítico 2–4 %, Vida 51–100, Espíritu 21–30, Placaje 2–5 y daño de rayo 3–7. El crítico solicitado se redujo deliberadamente frente a 6–10 % porque doce huecos equipables volverían trivial alcanzar 100 %.

1. El daño del arma y sus características comparten presupuesto. Un arma de daño alto recibe menos utilidad, pero **nunca queda sin identidad**: desde nivel 20 tendrá al menos una primaria, Vitalidad o Espíritu y una línea secundaria coherente.
2. Una pieza normal se centra en un elemento; una bielemental reparte sus primarias y daño sin alcanzar el máximo mono-elemental; una trielemental sacrifica pico de daño por flexibilidad.
3. Vitalidad o Espíritu aparecen en la mayoría del equipo medio y tardío. No todas las piezas dan ambos.
4. Crítico, reducción de enfriamiento, velocidad, regeneración y resistencias son líneas caras. No se apilan todas en una pieza.
5. Una penalización solo existe si cambia una decisión real y queda visible en la ficha; no sirve para inflar estadísticas positivas.
6. El bono completo del conjunto es una recompensa, no una obligación. Con dos o tres piezas ya debe existir una combinación útil con equipo de otro set.
7. Cada franja ofrece daño, supervivencia y una opción de apoyo. Ningún elemento queda ligado para siempre a una sola clase.

### Amplitud por franja

“Líneas” cuenta estadísticas individuales de la pieza, no el daño base del arma. Es un objetivo de diseño, no un permiso para llenar objetos con estadísticas irrelevantes.

| Nivel | Líneas por pieza | Primarias objetivo | Vida/recursos | Especialización esperada |
|---|---:|---|---|---|
| 1–20 | 2–3 | una | ocasional | Enseña una identidad clara |
| 21–40 | 3–4 | una; dos en piezas híbridas | frecuente | Primera secundaria: resistencia, daño plano o función táctica |
| 41–60 | 4–5 | una o dos | frecuente | Elección ofensiva/defensiva visible |
| 61–80 | 5–6 | una o dos | casi siempre | Una línea táctica propia del elemento |
| 81–100 | 6–7 | una o dos | siempre salvo piezas de riesgo | Primeros bonos fuertes de set y compensaciones reales |
| 101–120 | 7–8 | una o dos | siempre | Bielementales completos y mono-elementales especializados |
| 121–140 | 7–9 | una o dos | siempre | Resistencias cruzadas y utilidad regional |
| 141–160 | 8–10 | dos; tres en híbridos | siempre | Trielementales de flexibilidad, sin superar el pico mono |
| 161–180 | 9–11 | dos o tres | siempre | Identidad de zona y mecánica secundaria marcada |
| 181–200 | 10–12 | una a tres | siempre | Equipo final con amplitud, no con daño base descontrolado |

El generador y las pruebas traducirán esta tabla a un **presupuesto normalizado por nivel y ranura**. Antes de fijar números, T01 medirá tiempo de combate, supervivencia y daño por recurso. No se extrapolan directamente las cifras de otro juego porque la escala de vida, cadencia y combate en tiempo real es distinta.

## Identidad de los seis elementos

| Elemento | Primaria | Identidad secundaria de equipo |
|---|---|---|
| Tierra | Fuerza | carga, Placaje, resistencia a tierra, estabilidad frontal |
| Fuego | Intelecto | curación, daño plano, riesgo/recompensa |
| Aire | Agilidad | Huida, movimiento, crítico moderado |
| Agua | Caudal | Hallazgo, recursos, resistencia a agua |
| Hielo | Calma | Templanza, control y resistencia a hielo |
| Rayo | Voluntad | Concentración, recurso y ráfagas espaciadas |

## Línea de conjuntos 1–200

Los nombres son originales del proyecto y `PROPUESTA`, salvo los que el creador nombró expresamente. Cada conjunto tiene entre cuatro y seis piezas; arma y escudo no son obligatorios en todos.

| Nivel | Conjunto | Región o historia | Elementos | Función |
|---:|---|---|---|---|
| 8–16 | **del Compa del Campo** | Los Santicos; herramientas remendadas y trabajo de parcela | Tierra | Vida, Fuerza, carga y Placaje |
| 18–28 | **del Fogón de Antón** | Coclé; barro cocido, cobre y humo | Fuego | Intelecto, curación y daño de fuego |
| 28–38 | **del Diablico Sucio** | tradición fantástica propia de los Diablicos del juego | Agua + Rayo | Caudal, Voluntad, recurso y Concentración |
| 38–48 | **del Diablico Espejo** | línea de la máscara y el disfraz | Tierra + Fuego | Fuerza, Intelecto, Placaje y ruptura ofensiva |
| 44–56 | **de la Cresta de Campana** | altura, roca y corrientes de Coclé | Aire | Agilidad, Huida y movimiento |
| 52–64 | **del Mangle Rojo** | Darién; raíces, lodo y mareas | Tierra + Agua | Fuerza, Caudal, resistencia y Hallazgo |
| 64–72 | **de Bocas del Vendaval** | Bocas; tormenta costera | Agua + Rayo | recurso, daño dual y crítico moderado; ya existe una primera versión |
| 72–84 | **de la Nube del Barú** | Chiriquí; altura y sereno | Aire + Hielo | Agilidad, Calma, Huida y Templanza |
| 84–96 | **del Aguacero de Bayano** | Panamita oriental; lluvia eléctrica | Rayo | Voluntad, Concentración y ráfaga |
| 92–100 | **de la Tulivieja** | Cripta y relato propio del juego | Hielo + Rayo | Calma, Voluntad y control; el set actual se reequilibra sin perder identidad |
| 94–100 | **de Mareas Altas** | istmo y dos costas | Agua + Tierra | Caudal, Fuerza y aguante; ya existe una primera versión |
| 104–118 | **del Sereno de Volcán** | Chiriquí; madrugada fría | Hielo | Calma, Templanza y control sostenido |
| 116–130 | **de las Campanas de Portobelo** | Colona; metal, sal y fortaleza | Fuego + Rayo | Intelecto, Voluntad y apoyo de grupo |
| 128–142 | **del Camino de Cruces** | tránsito histórico reinterpretado en el mundo propio | Tierra + Aire | Fuerza, Agilidad, carga y movilidad |
| 140–154 | **de la Perla de Coiba** | Veraguas insular | Agua + Aire | Caudal, Agilidad, Hallazgo y Huida |
| 152–166 | **de las Tres Corrientes** | encuentro de montaña, río y tormenta | Agua + Hielo + Rayo | flexibilidad de control y recurso; menor pico elemental |
| 164–178 | **del Tambor de Azuero** | Azuero; cuero, madera y resonancia | Tierra + Fuego + Aire | combate cercano móvil; daño repartido |
| 176–188 | **de los Dos Mares** | Canal y costas del mundo del juego | Agua + Tierra + Rayo | aguante, Hallazgo y Concentración |
| 188–200 | **del Compás del Istmo** | cierre de la progresión 1–200 | elección de tres elementos por variante | amplitud final; ninguna variante supera a un mono-set en su elemento |

### Cobertura mínima de cada franja

Además de los conjuntos, cada bloque de 20 niveles debe contener al menos una pieza suelta por ranura y por rol relevante. Al terminar 1–200 deben existir:

- una ruta mono-elemental completa para cada uno de los seis elementos;
- al menos una ruta bielemental para cada pareja que aparezca en una clase o zona;
- tres rutas trielementales tardías con funciones distintas;
- alternativas defensivas y de apoyo que no dependan del crítico;
- obtención verificable: misión, jefe, familia de botín, oficio o mercader; ningún objeto huérfano.

## Plan ejecutable

1. **EQ-01 · Auditoría y presupuesto:** prueba que lista daño por segundo normalizado, número de líneas y objetos fuera del presupuesto. No cambia datos.
2. **EQ-02 · Rebalance 1–20:** integrado con el contrato determinista; ninguna arma queda con una sola línea.
3. **EQ-03 · Rebalance 21–100:** integrado en las 160 piezas no montura; mantiene nombres, elementos, rasgos funcionales fijos, sets y rutas de obtención.
4. **EQ-04 · Contrato 101–200:** integrado para objetos, parser, mercaderes, presets dinámicos y pruebas. Zonas y familias de botín 101–200 continúan como trabajo territorial; no se sube `maxLevel` a 400.
5. **EQ-05 · Conjuntos regionales:** las 60 rutas mono-elementales y 10 de aprendizaje ya están activas. Faltan los bielementales/trielementales regionales, iconos individuales y reparto final entre jefes, oficios y misiones.
6. **EQ-06 · Arte de objetos:** segundo pase individual a los iconos deterministas. El PNG ocupa toda el área útil de la casilla; marco, nivel, cantidad y rareza siguen siendo CSS.
