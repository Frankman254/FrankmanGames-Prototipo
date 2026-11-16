# 07 · Equipo y conjuntos

Dirección del creador (2026-11-15): el equipo debe ofrecer elecciones completas por franja, elemento y región; las armas no pueden comprar todo su poder con daño base mientras casi no aportan características. Los conjuntos parten del mundo propio de Panamá del juego. Todas las cifras de este documento son `PROPUESTA` hasta medirlas con T01.

Las capturas de otro juego aportadas por el creador se usaron únicamente para abstraer una idea general: **al subir de nivel aumenta la variedad de líneas útiles, no solo una cifra grande**. No se copian objetos, nombres, iconos, siluetas, combinaciones exactas ni valores.

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
