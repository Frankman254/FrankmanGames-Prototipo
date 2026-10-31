# Equilibrio del contenido — octubre de 2026

> Generado por `npm run balance` (`scripts/balance/`) el 2026-10-31, en 289 s. **No editar a mano:** se sobrescribe al regenerarlo.
> Datos de `data/` con huella `8bdd7099`. Todas las cifras de juego son PROPUESTA; este informe no cambia ninguna.

## Resumen

- **Clase más fuerte: Vanguardia de Brasa; más débil: Tejedora de Tormentas.** Sin esquivar, la primera vence grupos de hasta 8 lobos y 12 goblins y la segunda 12 y 6; muere en el 9 % de los grupos y jefes frente al 12 %. La diferencia es pequeña (×1,1); en tiempo para matar están a +8 %.
- **Con habilidad media o buena se muere poco:** como mucho el 8 % de las partidas de un escenario. La arena se gana el 100 % de las veces incluso sin esquivar nada. **El contenido actual es fácil para las dos clases.**
- **Habilidad (Vanguardia de Brasa):** quien esquiva el 90 % pierde 3,8 de vida por combate y quien no esquiva 58,9 (×15,6). Esquivar le deja vencer grupos de 40 lobos en vez de 8; prepararse (nivel 4 y buen equipo) sin esquivar, 25. Ejecución y preparación pesan, la ejecución más.
- **Habilidad (Tejedora de Tormentas):** quien esquiva el 90 % pierde 3,8 de vida por combate y quien no esquiva 54,6 (×14,3). Esquivar le deja vencer grupos de 40 lobos en vez de 12; prepararse (nivel 4 y buen equipo) sin esquivar, 40. Ejecución y preparación pesan, la ejecución más.
- **Hechizos obligatorios** (sin ellos el combate dura ≥ 15 % más): Chispa (+33 %).
- **Hechizos que no aportan** (casi no se lanzan y quitarlos no cambia nada que se note): Embestida (5,4 % de los lanzamientos, sin él −54 % de tiempo y −21,3 de vida perdida por combate); Paso del relámpago (0,0 % de los lanzamientos, sin él +0 % de tiempo y +0,0 de vida perdida por combate); Transposición (0,0 % de los lanzamientos, sin él +0 % de tiempo y +0,0 de vida perdida por combate); Repliegue helado (0,7 % de los lanzamientos, sin él +1 % de tiempo y +3,1 de vida perdida por combate).
- **Un universal rinde más que los de clase:** Vendaje de luz, Piel de piedra, Espíritu lobuno, Ráfaga, Eco del instante, Égida quieta en lugar del hechizo de clase menos útil reduce la vida perdida −53 % con la Vanguardia de Brasa y −69 % con la Vanguardia de Brasa y −62 % con la Vanguardia de Brasa y −51 % con la Vanguardia de Brasa y −56 % con la Vanguardia de Brasa y −62 % con la Vanguardia de Brasa.
- **Ataque básico:** es el 38 % de los lanzamientos: rellena los huecos del enfriamiento global.
- **El recurso sobra:** sólo en el 1 % de las decisiones en combate había un hechizo listo que no se podía pagar, y el recurso medio está al 64 %. Mandan los enfriamientos; con DEC-2026-004 (recurso + enfriamientos) el recurso debería pesar más. Los combates duran menos de 20 s y empiezan con el recurso lleno, así que pesa más el máximo que la regeneración.
- **Curva de XP:** la primera arena da 175 XP y el nivel 2 pide 50, así que se sube en mitad del primer combate; **subir de nivel cura vida y recurso del todo**, lo que salva combates perdidos. Repitiendo la arena se llega al nivel 5 en 5 min, al 10 en 22 min y al 15,2 en 60 min.
- **Los enemigos no escalan:** son de nivel 1–98 y dan la misma XP a un personaje de cualquier nivel, así que la curva sólo mide horas de repetir lo mismo. Falta contenido de más nivel o una regla de XP por diferencia de nivel (decisión de diseño, no de números).
- **Los precios están rotos (demasiado baratos):** se ganan ~112 monedas por minuto y lo más caro de la tienda (Amuleto de la tortuga de musgo, 210) cuesta 1,9 min de combate; la mitad de la tienda cuesta menos de 13 s. En la granja se beben 2,0 pociones por hora.
- **Pesca:** reaccionando al 80 % da 29 monedas por minuto, el 26 % de lo que da combatir. Es una actividad tranquila, no una alternativa económica.

**Ajustes propuestos** (§8, sin aplicar): resistencias físicas más cortas; recurso más justo; baluarte y paso del relámpago, más útiles; curva de xp más lenta al principio; menos oro por combate y precios de tienda más altos. Con todos a la vez, la Vanguardia de Brasa sin esquivar vence hasta 8 lobos (ahora 8) y esquivando 40; la Tejedora de Tormentas sin esquivar vence hasta 8 lobos (ahora 12) y esquivando 40; la arena sigue ganándose con habilidad media (67 % / 100 %).

## 1. Cómo se midió

- **Simulación real:** cada partida es un `World` y una `GameSession` de `src/` a 60 Hz, sin pantalla. El bot da las mismas órdenes que el ratón y el teclado (clic para atacar o moverse, teclas 1–6, Espacio, Q/E). Código en `scripts/balance/`.
- **Rotación:** en cada decisión (una cada 0,1 s, como una persona) el bot valora los 6 huecos de la barra a partir de su definición (daño medio × objetivos alcanzados, escudo con poca vida o rodeado, mejora si no la tiene, embestida para acercarse, teletransporte e inmovilizar para quitarse de encima un cuerpo a cuerpo) y lanza el mejor que esté listo. Si no hay ninguno, ataque básico. No es una rotación escrita a mano por hechizo: sirve igual para cualquier hechizo que se ponga en la barra.
- **Habilidad:** cuando empieza un aviso enemigo cuya área le cubre, el bot decide **una vez** si lo esquiva, con probabilidad malo = 0 %, medio = 50 %, bueno = 90 %. Si lo esquiva, tras 0,3 s ± 20 % de reacción sale del área andando si le da tiempo o con la evasión si no. La clase a distancia, con la misma probabilidad, se aparta cuando un cuerpo a cuerpo se le echa encima (kiting).
- **Pociones:** bebe por debajo del 35 % de vida y toma un tónico por debajo del 15 % de recurso en combate.
- **Equipo y puntos:** equipa lo que suba una suma ponderada de estadísticas (la principal pesa 1, resistencia física 0,3–0,4, crítico 80 por unidad, el daño del arma 3 por punto de daño por segundo…) sin cambiar de tipo de arma; los puntos van dos a la principal y uno a vitalidad. Invoca la mascota luchadora (Zorro de ceniza) que traen las dos clases.
- **Preparación:** *inicial* = nivel 1 con el kit de la clase; *preparado* = nivel 4 con los puntos gastados y lo mejor de una copia de cada objeto equipable de nivel ≤ 4.
- **Semillas:** 12 por combinación en la batería principal, 8 en ablaciones y escaleras. 2592 partidas en la batería principal.
- **Escenarios de grupo** en un campo abierto de 80 × 80 m (como un prado del mundo continuo); los enemigos aparecen en arco a 9–11 m. La **arena** es la del Slice 01 con sus obstáculos.

| Escenario | Tipo | Enemigos | Límite |
| --- | --- | --- | --- |
| arena | arena | Sato Cimarrón, Sato Cimarrón, Duende Tirapiedras, Duende Tirapiedras, Curandero de Huesos, Sato Jefe de la Jauría, Duende Tirapiedras Veterano | 300 s |
| lobos1 | grupo | 1 lobo | 150 s |
| lobos3 | grupo | 3 lobos | 150 s |
| lobos5 | grupo | 5 lobos | 150 s |
| lobos8 | grupo | 8 lobos | 150 s |
| goblins1 | grupo | 1 goblin | 150 s |
| goblins2 | grupo | 2 goblins | 150 s |
| goblins4 | grupo | 4 goblins | 150 s |
| goblins6 | grupo | 6 goblins | 150 s |
| chaman1 | grupo | 1 chamán | 150 s |
| chaman2 | grupo | 2 chamanes | 150 s |
| chaman3 | grupo | 3 chamanes | 150 s |
| mixto | grupo | 2 lobos + goblin + chamán | 150 s |
| alfa2 | jefe | Lobo alfa + 2 lobos | 150 s |
| alfa4 | jefe | Lobo alfa + 4 lobos | 150 s |
| alfaVet | jefe | Lobo alfa + 2 lobos + veterano | 150 s |
| alfa6 | jefe | Lobo alfa + 6 lobos | 150 s |
| dobleAlfa | jefe | 2 lobos alfa + 2 veteranos + 2 lobos | 150 s |

Una partida se pierde al caer o al llegar al límite. *Tiempo para matar* = mediana de las victorias. *Vida perdida* = lo que de verdad baja la vida (sin lo que absorbe el escudo), por partida. *Golpes/avisos* = golpes enemigos que conectan ÷ avisos cuya área cubría al jugador al empezar.

## 2. Clases

### 2.1 Victorias · tiempo para matar · vida perdida (nivel 1, kit inicial)

| Escenario | Vanguardia de Brasa malo | Vanguardia de Brasa medio | Vanguardia de Brasa bueno | Tejedora de Tormentas malo | Tejedora de Tormentas medio | Tejedora de Tormentas bueno |
| --- | --- | --- | --- | --- | --- | --- |
| Arena del Slice 01 (7 enemigos repartidos) | 100 % · 27,5 s · 35 | 100 % · 28,2 s · 19 | 100 % · 28,9 s · 5 | 100 % · 27,9 s · 47 | 100 % · 28,8 s · 22 | 100 % · 28,7 s · 12 |
| 1 lobo | 100 % · 2,2 s · 8 | 100 % · 2,2 s · 5 | 100 % · 2,3 s · 1 | 100 % · 2,2 s · 0 | 100 % · 2,2 s · 0 | 100 % · 2,2 s · 0 |
| 3 lobos | 100 % · 4,2 s · 3 | 100 % · 5,2 s · 1 | 92 % · 6,1 s · 3 | 100 % · 4,8 s · 20 | 100 % · 4,9 s · 3 | 100 % · 5,2 s · 1 |
| 5 lobos | 83 % · 6,3 s · 75 | 100 % · 6,5 s · 2 | 100 % · 8,3 s · 0 | 100 % · 6,3 s · 40 | 100 % · 7,0 s · 7 | 100 % · 7,7 s · 0 |
| 8 lobos | 83 % · 8,5 s · 136 | 92 % · 9,5 s · 26 | 100 % · 9,5 s · 2 | 100 % · 7,6 s · 79 | 100 % · 8,0 s · 8 | 100 % · 8,5 s · 0 |
| 1 goblin | 100 % · 1,5 s · 1 | 100 % · 1,8 s · 1 | 100 % · 2,3 s · 0 | 100 % · 1,4 s · 5 | 100 % · 1,8 s · 5 | 100 % · 1,8 s · 1 |
| 2 goblins | 92 % · 4,0 s · 25 | 100 % · 3,9 s · 0 | 100 % · 3,9 s · 0 | 100 % · 3,4 s · 17 | 100 % · 3,8 s · 6 | 100 % · 3,8 s · 0 |
| 4 goblins | 100 % · 6,1 s · 9 | 100 % · 6,3 s · 9 | 100 % · 6,4 s · 2 | 100 % · 6,6 s · 58 | 100 % · 7,1 s · 9 | 100 % · 7,1 s · 0 |
| 6 goblins | 83 % · 8,2 s · 40 | 100 % · 8,9 s · 6 | 100 % · 9,5 s · 0 | 83 % · 9,0 s · 129 | 100 % · 9,5 s · 23 | 100 % · 9,8 s · 1 |
| 1 chamán | 100 % · 2,7 s · 0 | 100 % · 2,7 s · 0 | 100 % · 2,7 s · 0 | 100 % · 2,5 s · 0 | 100 % · 2,5 s · 0 | 100 % · 2,5 s · 0 |
| 2 chamanes | 100 % · 6,0 s · 0 | 100 % · 6,0 s · 0 | 100 % · 6,0 s · 0 | 100 % · 5,0 s · 0 | 100 % · 5,0 s · 0 | 100 % · 5,0 s · 0 |
| 3 chamanes | 92 % · 8,9 s · 39 | 100 % · 8,5 s · 1 | 100 % · 9,1 s · 1 | 100 % · 7,3 s · 1 | 100 % · 7,2 s · 1 | 100 % · 7,4 s · 1 |
| 2 lobos + goblin + chamán | 92 % · 6,7 s · 24 | 100 % · 7,1 s · 1 | 100 % · 7,3 s · 0 | 100 % · 7,4 s · 39 | 100 % · 7,2 s · 18 | 100 % · 7,5 s · 2 |
| Lobo alfa + 2 lobos | 83 % · 6,5 s · 70 | 100 % · 8,6 s · 8 | 100 % · 8,5 s · 0 | 100 % · 7,2 s · 75 | 100 % · 7,4 s · 17 | 100 % · 7,9 s · 5 |
| Lobo alfa + 4 lobos | 92 % · 8,0 s · 74 | 100 % · 9,9 s · 10 | 100 % · 10,7 s · 2 | 83 % · 7,9 s · 96 | 100 % · 9,0 s · 17 | 100 % · 9,7 s · 3 |
| Lobo alfa + 2 lobos + veterano | 75 % · 8,5 s · 118 | 92 % · 11,0 s · 36 | 92 % · 12,0 s · 22 | 75 % · 9,8 s · 125 | 100 % · 11,0 s · 38 | 100 % · 11,6 s · 15 |
| Lobo alfa + 6 lobos | 75 % · 10,2 s · 162 | 100 % · 12,5 s · 16 | 100 % · 13,1 s · 4 | 50 % · 9,0 s · 111 | 100 % · 9,0 s · 25 | 100 % · 10,3 s · 4 |
| 2 lobos alfa + 2 veteranos + 2 lobos | 83 % · 15,7 s · 245 | 100 % · 17,8 s · 69 | 100 % · 20,6 s · 27 | 0 % · — s · 142 | 100 % · 16,5 s · 99 | 100 % · 18,0 s · 25 |

### 2.2 Lo mismo, preparado (nivel 4, puntos y mejor equipo de nivel ≤ 4)

| Escenario | Vanguardia de Brasa malo | Vanguardia de Brasa medio | Vanguardia de Brasa bueno | Tejedora de Tormentas malo | Tejedora de Tormentas medio | Tejedora de Tormentas bueno |
| --- | --- | --- | --- | --- | --- | --- |
| Arena del Slice 01 (7 enemigos repartidos) | 100 % · 23,1 s · 6 | 100 % · 25,1 s · 4 | 100 % · 26,1 s · 1 | 100 % · 24,4 s · 7 | 100 % · 25,1 s · 3 | 100 % · 25,1 s · 0 |
| 1 lobo | 100 % · 1,5 s · 0 | 100 % · 1,7 s · 0 | 100 % · 2,0 s · 0 | 100 % · 1,1 s · 0 | 100 % · 1,1 s · 0 | 100 % · 1,1 s · 0 |
| 3 lobos | 100 % · 4,8 s · 1 | 100 % · 5,2 s · 0 | 100 % · 5,5 s · 0 | 100 % · 3,4 s · 0 | 100 % · 3,4 s · 0 | 100 % · 3,4 s · 0 |
| 5 lobos | 100 % · 5,2 s · 0 | 100 % · 6,0 s · 0 | 100 % · 6,5 s · 0 | 100 % · 3,7 s · 0 | 100 % · 3,8 s · 0 | 100 % · 4,5 s · 0 |
| 8 lobos | 83 % · 7,6 s · 53 | 92 % · 8,6 s · 15 | 100 % · 9,1 s · 0 | 100 % · 4,2 s · 5 | 100 % · 4,8 s · 1 | 100 % · 6,0 s · 1 |
| 1 goblin | 100 % · 1,0 s · 0 | 100 % · 1,0 s · 0 | 100 % · 1,4 s · 0 | 100 % · 0,6 s · 0 | 100 % · 0,6 s · 0 | 100 % · 0,6 s · 0 |
| 2 goblins | 100 % · 2,6 s · 0 | 100 % · 2,9 s · 1 | 100 % · 3,0 s · 0 | 100 % · 2,2 s · 4 | 100 % · 2,2 s · 2 | 100 % · 1,3 s · 0 |
| 4 goblins | 100 % · 5,3 s · 3 | 100 % · 7,2 s · 3 | 100 % · 5,8 s · 1 | 100 % · 4,7 s · 40 | 100 % · 5,0 s · 8 | 100 % · 5,0 s · 6 |
| 6 goblins | 100 % · 7,8 s · 6 | 100 % · 8,1 s · 2 | 100 % · 9,3 s · 2 | 100 % · 5,9 s · 64 | 100 % · 6,6 s · 23 | 100 % · 6,6 s · 13 |
| 1 chamán | 100 % · 1,4 s · 0 | 100 % · 1,4 s · 0 | 100 % · 1,4 s · 0 | 100 % · 1,2 s · 0 | 100 % · 1,2 s · 0 | 100 % · 1,2 s · 0 |
| 2 chamanes | 100 % · 4,8 s · 0 | 100 % · 4,8 s · 0 | 100 % · 4,8 s · 0 | 100 % · 2,6 s · 0 | 100 % · 2,6 s · 0 | 100 % · 2,6 s · 0 |
| 3 chamanes | 100 % · 6,0 s · 0 | 100 % · 6,0 s · 0 | 100 % · 5,9 s · 0 | 100 % · 4,9 s · 0 | 100 % · 4,9 s · 0 | 100 % · 4,9 s · 0 |
| 2 lobos + goblin + chamán | 100 % · 6,3 s · 2 | 100 % · 6,7 s · 1 | 100 % · 6,6 s · 0 | 100 % · 5,4 s · 12 | 100 % · 6,2 s · 6 | 100 % · 6,8 s · 1 |
| Lobo alfa + 2 lobos | 92 % · 6,1 s · 37 | 100 % · 6,8 s · 1 | 100 % · 7,0 s · 0 | 100 % · 5,3 s · 4 | 100 % · 4,8 s · 1 | 100 % · 5,2 s · 1 |
| Lobo alfa + 4 lobos | 92 % · 7,1 s · 25 | 92 % · 7,8 s · 22 | 100 % · 8,4 s · 0 | 100 % · 5,5 s · 15 | 100 % · 5,1 s · 5 | 100 % · 5,6 s · 2 |
| Lobo alfa + 2 lobos + veterano | 83 % · 7,8 s · 67 | 100 % · 8,4 s · 0 | 92 % · 9,6 s · 4 | 100 % · 5,9 s · 27 | 100 % · 6,5 s · 12 | 100 % · 6,9 s · 6 |
| Lobo alfa + 6 lobos | 92 % · 8,4 s · 32 | 92 % · 8,8 s · 31 | 100 % · 10,0 s · 0 | 100 % · 5,8 s · 22 | 100 % · 5,7 s · 5 | 100 % · 6,5 s · 1 |
| 2 lobos alfa + 2 veteranos + 2 lobos | 92 % · 10,0 s · 65 | 100 % · 13,3 s · 19 | 100 % · 13,7 s · 8 | 100 % · 9,3 s · 121 | 100 % · 9,4 s · 39 | 100 % · 9,9 s · 18 |

### 2.3 Detalle con habilidad media (nivel 1)

**Vanguardia de Brasa**

| Escenario | DPS | DPS mascota | Daño entrante | Vida perdida | Golpes/avisos | Pociones | Tónicos | Recurso medio | Recurso lleno | Listo sin recurso | XP/min | Oro/min |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Arena del Slice 01 (7 enemigos repartidos) | 17,9 | 1,2 | 19,8 | 19,3 | 6 % | 0,00 | 1,67 | 65 % | 11 % | 5 % | 374 | 202 |
| 1 lobo | 25,3 | 2,7 | 4,8 | 4,8 | 46 % | 0,00 | 0,00 | 77 % | 11 % | 0 % | 376 | 107 |
| 3 lobos | 35,5 | 3,4 | 12,4 | 0,9 | 22 % | 0,00 | 1,00 | 64 % | 3 % | 1 % | 466 | 107 |
| 5 lobos | 46,6 | 3,4 | 18,6 | 1,8 | 17 % | 0,00 | 1,00 | 66 % | 12 % | 1 % | 617 | 142 |
| 8 lobos | 25,2 | 1,5 | 57,2 | 26,3 | 16 % | 0,25 | 1,08 | 39 % | 6 % | 8 % | 315 | 60 |
| 1 goblin | 23,0 | 1,0 | 0,9 | 0,9 | 8 % | 0,00 | 0,00 | 79 % | 13 % | 0 % | 564 | 290 |
| 2 goblins | 23,2 | 1,2 | 0,0 | 0,0 | 0 % | 0,00 | 0,00 | 65 % | 4 % | 3 % | 532 | 233 |
| 4 goblins | 29,5 | 2,1 | 8,6 | 8,6 | 9 % | 0,00 | 1,00 | 72 % | 19 % | 3 % | 669 | 275 |
| 6 goblins | 29,9 | 2,6 | 11,0 | 5,7 | 5 % | 0,00 | 1,00 | 72 % | 13 % | 1 % | 699 | 271 |
| 1 chamán | 24,6 | 1,8 | 0,6 | 0,0 | 25 % | 0,00 | 0,42 | 65 % | 8 % | 6 % | 665 | 459 |
| 2 chamanes | 32,4 | 2,2 | 0,8 | 0,0 | 12 % | 0,00 | 1,00 | 56 % | 3 % | 4 % | 712 | 500 |
| 3 chamanes | 36,7 | 2,5 | 5,8 | 0,6 | 10 % | 0,00 | 1,00 | 71 % | 17 % | 2 % | 779 | 391 |
| 2 lobos + goblin + chamán | 37,5 | 2,9 | 13,7 | 0,7 | 17 % | 0,00 | 1,00 | 68 % | 10 % | 2 % | 675 | 301 |
| Lobo alfa + 2 lobos | 31,7 | 2,9 | 35,8 | 7,8 | 22 % | 0,00 | 1,00 | 64 % | 6 % | 1 % | 517 | 301 |
| Lobo alfa + 4 lobos | 40,4 | 3,0 | 33,0 | 10,4 | 10 % | 0,00 | 1,00 | 67 % | 10 % | 1 % | 634 | 325 |
| Lobo alfa + 2 lobos + veterano | 25,2 | 2,4 | 73,8 | 36,4 | 17 % | 0,25 | 1,08 | 62 % | 8 % | 4 % | 485 | 248 |
| Lobo alfa + 6 lobos | 43,2 | 3,2 | 42,8 | 16,1 | 9 % | 0,00 | 1,00 | 65 % | 8 % | 1 % | 644 | 201 |
| 2 lobos alfa + 2 veteranos + 2 lobos | 31,3 | 2,8 | 104,5 | 69,2 | 11 % | 0,17 | 1,42 | 64 % | 7 % | 1 % | 648 | 334 |

**Tejedora de Tormentas**

| Escenario | DPS | DPS mascota | Daño entrante | Vida perdida | Golpes/avisos | Pociones | Tónicos | Recurso medio | Recurso lleno | Listo sin recurso | XP/min | Oro/min |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Arena del Slice 01 (7 enemigos repartidos) | 20,1 | 0,7 | 22,1 | 22,1 | 0 % | 0,00 | 0,67 | 61 % | 4 % | 1 % | 367 | 184 |
| 1 lobo | 41,4 | 2,2 | 0,0 | 0,0 | 0 % | 0,00 | 0,00 | 75 % | 0 % | 0 % | 414 | 121 |
| 3 lobos | 41,5 | 3,3 | 3,1 | 3,1 | 7 % | 0,00 | 0,00 | 52 % | 0 % | 0 % | 499 | 113 |
| 5 lobos | 46,7 | 3,3 | 7,3 | 7,3 | 12 % | 0,00 | 0,00 | 52 % | 7 % | 0 % | 585 | 162 |
| 8 lobos | 70,2 | 3,5 | 8,1 | 8,1 | 4 % | 0,00 | 0,00 | 66 % | 8 % | 0 % | 834 | 218 |
| 1 goblin | 36,5 | 1,3 | 4,7 | 4,7 | 33 % | 0,00 | 0,00 | 77 % | 0 % | 0 % | 598 | 274 |
| 2 goblins | 32,3 | 0,8 | 6,2 | 6,2 | 15 % | 0,00 | 0,00 | 69 % | 0 % | 0 % | 570 | 252 |
| 4 goblins | 30,1 | 1,8 | 9,3 | 9,3 | 5 % | 0,08 | 0,00 | 74 % | 7 % | 0 % | 622 | 251 |
| 6 goblins | 34,7 | 2,1 | 22,9 | 22,9 | 6 % | 0,17 | 0,00 | 79 % | 6 % | 0 % | 691 | 279 |
| 1 chamán | 43,3 | 1,8 | 0,0 | 0,0 | 0 % | 0,00 | 0,00 | 70 % | 0 % | 0 % | 846 | 531 |
| 2 chamanes | 39,8 | 1,3 | 0,0 | 0,0 | 0 % | 0,00 | 0,00 | 57 % | 0 % | 0 % | 810 | 465 |
| 3 chamanes | 41,4 | 1,7 | 0,5 | 0,5 | 0 % | 0,00 | 0,00 | 64 % | 6 % | 0 % | 883 | 535 |
| 2 lobos + goblin + chamán | 39,2 | 2,4 | 17,5 | 17,5 | 19 % | 0,00 | 0,00 | 58 % | 8 % | 0 % | 641 | 302 |
| Lobo alfa + 2 lobos | 38,9 | 3,0 | 16,8 | 16,8 | 8 % | 0,00 | 0,00 | 47 % | 4 % | 0 % | 597 | 337 |
| Lobo alfa + 4 lobos | 46,7 | 3,2 | 17,1 | 17,1 | 9 % | 0,00 | 0,17 | 54 % | 6 % | 0 % | 653 | 281 |
| Lobo alfa + 2 lobos + veterano | 34,4 | 2,7 | 38,4 | 38,4 | 14 % | 0,00 | 0,00 | 63 % | 6 % | 0 % | 622 | 252 |
| Lobo alfa + 6 lobos | 61,0 | 2,9 | 24,6 | 24,6 | 7 % | 0,00 | 0,00 | 63 % | 7 % | 0 % | 797 | 284 |
| 2 lobos alfa + 2 veteranos + 2 lobos | 39,1 | 2,3 | 98,8 | 98,8 | 9 % | 1,00 | 0,00 | 58 % | 4 % | 0 % | 702 | 400 |

*XP/min y oro/min* son del tiempo de combate solo (sin desplazarse ni descansar); el ritmo real está en la granja (§5 y §7). El oro incluye el valor de venta de lo que se recoge.

### 2.4 Escaleras: mayor grupo que se vence la mitad de las veces

| Prueba | Clase | Preparación | malo | medio | bueno |
| --- | --- | --- | --- | --- | --- |
| lobos | Vanguardia de Brasa | inicial | 8 | ≥ 40 | ≥ 40 |
| lobos | Vanguardia de Brasa | preparado | 25 | ≥ 40 | ≥ 40 |
| lobos | Tejedora de Tormentas | inicial | 12 | ≥ 40 | ≥ 40 |
| lobos | Tejedora de Tormentas | preparado | ≥ 40 | ≥ 40 | ≥ 40 |
| goblins | Vanguardia de Brasa | inicial | 12 | ≥ 30 | ≥ 30 |
| goblins | Vanguardia de Brasa | preparado | ≥ 30 | ≥ 30 | ≥ 30 |
| goblins | Tejedora de Tormentas | inicial | 6 | ≥ 30 | ≥ 30 |
| goblins | Tejedora de Tormentas | preparado | 16 | ≥ 30 | ≥ 30 |

Tamaños probados: lobos 8, 12, 16, 20, 25, 30, 40; goblins 6, 9, 12, 16, 20, 25, 30. «≥ N» = gana incluso el mayor.

### 2.5 Resumen por clase

| Clase | DPS (medio) | Tiempo para matar medio | Parte de la mascota | Muertes malo / medio / bueno | Vida perdida malo / medio / bueno |
| --- | --- | --- | --- | --- | --- |
| Vanguardia de Brasa | 31,8 | 7,6 s | 7 % | 9 % / 0 % / 0 % | 58,9 / 11,6 / 3,8 |
| Tejedora de Tormentas | 42,2 | 7,0 s | 5 % | 12 % / 0 % / 0 % | 54,6 / 16,5 / 3,8 |

## 3. Hechizos

Uso con habilidad media, nivel 1, en todos los escenarios. *Ablación*: la misma batería reducida (arena, lobos8, goblins6, chaman3, alfa6, dobleAlfa; 8 semillas) con ese hueco vacío; Δ = cambio frente a la barra completa.

| Clase | Hechizo | % lanzamientos | % daño directo | Lanzamientos/min | Δ tiempo sin él | Δ vida perdida sin él | Δ victorias | Veredicto |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Vanguardia de Brasa | Ataque básico (arma) | 36,9 % | 26,9 % | 39,7 | — | — | — | — |
| Vanguardia de Brasa | Tajo ígneo | 11,4 % | 20,6 % | 12,2 | +6 % | +6 % (+2,3) | +2 pts | importante |
| Vanguardia de Brasa | Embestida | 5,4 % | 7,3 % | 5,8 | −54 % | −54 % (−21,3) | +8 pts | prescindible |
| Vanguardia de Brasa | Remolino de brasas | 8,3 % | 24,4 % | 9,0 | −13 % | +55 % (+21,6) | +4 pts | importante |
| Vanguardia de Brasa | Grito de hierro | 6,3 % | 0,0 % | 6,8 | −30 % | −3 % (−1,3) | +4 pts | normal |
| Vanguardia de Brasa | Marca ardiente | 15,2 % | 7,5 % | 16,4 | −30 % | −8 % (−3,3) | +4 pts | normal |
| Vanguardia de Brasa | Baluarte | 4,1 % | 0,0 % | 4,5 | −28 % | +22 % (+8,5) | +4 pts | normal |
| Vanguardia de Brasa | Cadena de brasa | 6,1 % | 3,7 % | 6,6 | −31 % | −22 % (−8,8) | +4 pts | normal |
| Vanguardia de Brasa | Represalia | 6,2 % | 0,0 % | 6,7 | −57 % | −53 % (−21,1) | +8 pts | normal |
| Tejedora de Tormentas | Ataque básico (arma) | 38,2 % | 11,9 % | 45,6 | — | — | — | — |
| Tejedora de Tormentas | Chispa | 27,1 % | 27,3 % | 32,3 | +33 % | +51 % (+11,9) | +0 pts | obligatorio |
| Tejedora de Tormentas | Lanza glacial | 10,4 % | 26,7 % | 12,4 | +7 % | +12 % (+2,7) | +2 pts | importante |
| Tejedora de Tormentas | Nova de escarcha | 3,6 % | 6,2 % | 4,2 | +3 % | +15 % (+3,5) | +2 pts | normal |
| Tejedora de Tormentas | Paso del relámpago | 0,0 % | 0,0 % | 0,0 | +0 % | +0 % (+0,0) | +0 pts | prescindible |
| Tejedora de Tormentas | Campo estático | 7,5 % | 8,5 % | 8,9 | +1 % | +6 % (+1,4) | +0 pts | normal |
| Tejedora de Tormentas | Arco voltaico | 6,2 % | 18,1 % | 7,3 | +10 % | +19 % (+4,5) | +2 pts | importante |
| Tejedora de Tormentas | Transposición | 0,0 % | 0,0 % | 0,0 | +0 % | +0 % (+0,0) | +0 pts | prescindible |
| Tejedora de Tormentas | Repliegue helado | 0,7 % | 1,2 % | 0,8 | +1 % | +13 % (+3,1) | +0 pts | prescindible |
| Tejedora de Tormentas | Espejo de tormenta | 6,4 % | 0,0 % | 7,7 | −2 % | −7 % (−1,5) | +2 pts | normal |

El daño de la Quemadura (Marca ardiente, Remolino) cuenta aparte como «estado»; por eso la Marca parece hacer poco daño directo. Veredictos: *obligatorio* = sin él se pierden ≥ 10 puntos de victorias o el combate dura ≥ 15 % más; *importante* = dura ≥ 5 % más o se pierde ≥ 25 % más de vida; *prescindible* = menos del 6 % de los lanzamientos y quitarlo no cambia nada que se note (≤ 3 % de tiempo, ≤ 12 % de vida). Los cambios de vida de menos de 5 puntos por combate no cuentan (con tan poco daño, un +100 % son 3 puntos).

Daño de estados (Quemadura) sobre el total del jugador: 3,6 %.

### 3.1 Hechizos universales en lugar del hechizo de clase menos útil

| Clase | Universal | Sustituye a | Δ tiempo para matar | Δ vida perdida |
| --- | --- | --- | --- | --- |
| Vanguardia de Brasa | Vendaje de luz | Represalia | −57 % | −53 % (−21,1) |
| Vanguardia de Brasa | Piel de piedra | Represalia | −56 % | −69 % (−27,5) |
| Vanguardia de Brasa | Espíritu lobuno | Represalia | −59 % | −62 % (−24,7) |
| Vanguardia de Brasa | Ráfaga | Represalia | −57 % | −51 % (−20,3) |
| Vanguardia de Brasa | Eco del instante | Represalia | −55 % | −56 % (−22,2) |
| Vanguardia de Brasa | Égida quieta | Represalia | −57 % | −62 % (−24,4) |
| Tejedora de Tormentas | Vendaje de luz | Espejo de tormenta | −2 % | −9 % (−2,1) |
| Tejedora de Tormentas | Piel de piedra | Espejo de tormenta | −0 % | −14 % (−3,2) |
| Tejedora de Tormentas | Espíritu lobuno | Espejo de tormenta | −7 % | +18 % (+4,3) |
| Tejedora de Tormentas | Ráfaga | Espejo de tormenta | +0 % | +16 % (+3,6) |
| Tejedora de Tormentas | Eco del instante | Espejo de tormenta | −1 % | +4 % (+0,9) |
| Tejedora de Tormentas | Égida quieta | Espejo de tormenta | −1 % | +4 % (+0,9) |

## 4. ¿Importa la habilidad? (preparación + ejecución)

| Clase | Golpes/avisos malo / medio / bueno | Vida perdida malo / medio / bueno | Lobos (inicial) malo / medio / bueno | Lobos preparado malo / medio / bueno | Arena malo / medio / bueno |
| --- | --- | --- | --- | --- | --- |
| Vanguardia de Brasa | 50 % / 14 % / 3 % | 58,9 / 11,6 / 3,8 | 8 / 40 / 40 | 25 / 40 / 40 | 100 % / 100 % / 100 % |
| Tejedora de Tormentas | 35 % / 8 % / 1 % | 54,6 / 16,5 / 3,8 | 12 / 40 / 40 | 40 / 40 / 40 | 100 % / 100 % / 100 % |

Lectura: la *ejecución* es la columna de habilidad; la *preparación* es pasar de inicial a preparado con la habilidad fija. Si una clase gana lo mismo sin esquivar que esquivando, la ejecución no pesa; si gana lo mismo con o sin equipo, la preparación no pesa.

## 5. Progresión (XP)

Granja: la arena del Slice 01 (único encuentro del mundo, 175 XP) se repite durante 60 min como si reapareciera, arrastrando la vida y el recurso entre pasadas, recogiendo el botín, equipándose, vendiendo y descansando hasta el 80 %. Morir cuesta 30 s. 2 semillas por clase y habilidad.

Fórmula: xpToNext(n) = round(50 · n^1.5); nivel máximo 20.

| Nivel | XP del anterior a este | XP total | Arenas | Minuto (Vanguardia de Brasa, medio) | Minuto (Tejedora de Tormentas, medio) |
| --- | --- | --- | --- | --- | --- |
| 2 | 50 | 50 | 0,3 | 0,3 | 0,3 |
| 3 | 141 | 191 | 1,1 | 0,8 | 0,9 |
| 4 | 260 | 451 | 2,6 | 3,3 | 1,8 |
| 5 | 400 | 851 | 4,9 | 7,1 | 3,3 |
| 6 | 559 | 1410 | 8,1 | 9,2 | 5,5 |
| 8 | 926 | 3071 | 17,5 | 15,0 | 11,4 |
| 10 | 1350 | 5552 | 31,7 | 24,5 | 20,4 |
| 12 | 1824 | 8957 | 51,2 | 36,7 | 32,6 |
| 15 | 2619 | 15998 | 91,4 | > 60 | 56,3 |
| 18 | 3505 | 25608 | 146,3 | > 60 | > 60 |
| 20 | 4141 | 33567 | 191,8 | > 60 | > 60 |

### 5.1 Nivel alcanzado en N minutos

| Clase | Habilidad | 5 min | 10 min | 20 min | 30 min | 45 min | 60 min | Pasadas | Muertes | Descanso |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Vanguardia de Brasa | malo | 5,9 | 7,8 | 10,1 | 11,9 | 14,1 | 15,8 | 105 | 0,0 | 0 s |
| Vanguardia de Brasa | medio | 5,0 | 6,0 | 9,0 | 10,9 | 13,2 | 14,9 | 90 | 0,5 | 0 s |
| Vanguardia de Brasa | bueno | 5,8 | 7,7 | 10,0 | 11,7 | 13,8 | 15,6 | 101 | 0,0 | 0 s |
| Tejedora de Tormentas | malo | 5,5 | 7,4 | 9,7 | 11,3 | 13,3 | 15,0 | 91 | 0,0 | 36 s |
| Tejedora de Tormentas | medio | 5,8 | 7,6 | 9,9 | 11,6 | 13,8 | 15,4 | 98 | 0,0 | 2 s |
| Tejedora de Tormentas | bueno | 5,8 | 7,5 | 9,6 | 11,3 | 13,3 | 15,0 | 91 | 0,0 | 0 s |

Nivel con decimales: 7,5 = a mitad de camino del 8.

## 6. Botín por rareza

Objetos que existen por rareza: common 16, uncommon 21, rare 10, epic 1, legendary 0.

| Clase | Habilidad | common/min | uncommon/min | rare/min | epic/min | legendary/min | Minutos por objeto raro | Minutos por épico |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Vanguardia de Brasa | malo | 12,45 | 5,72 | 0,50 | 0,02 | 0,00 | 2,0 | 60 |
| Vanguardia de Brasa | medio | 10,77 | 4,85 | 0,47 | 0,02 | 0,00 | 2,1 | 60 |
| Vanguardia de Brasa | bueno | 11,78 | 5,57 | 0,51 | 0,02 | 0,00 | 2,0 | 60 |
| Tejedora de Tormentas | malo | 10,88 | 4,77 | 0,41 | 0,01 | 0,00 | 2,4 | 120 |
| Tejedora de Tormentas | medio | 11,91 | 5,27 | 0,38 | 0,02 | 0,00 | 2,6 | 60 |
| Tejedora de Tormentas | bueno | 11,13 | 4,67 | 0,45 | 0,02 | 0,00 | 2,2 | 60 |

Cuenta todo lo que cae al suelo en la granja (pociones y materiales incluidos), por minuto de granja (con desplazamientos y descansos).

## 7. Economía

### 7.1 Ingresos por minuto

| Fuente | Monedas/min | Ventas/min | Neto/min |
| --- | --- | --- | --- |
| Granja, Vanguardia de Brasa (medio) | 60,8 | 45,0 | 105,7 |
| Granja, Tejedora de Tormentas (medio) | 68,5 | 49,0 | 117,5 |
| Pesca, reacciona al 50 % (3,5 capturas/min) | — | — | 14,9 |
| Pesca, reacciona al 80 % (6,1 capturas/min) | — | — | 29,1 |
| Pesca, reacciona al 95 % (7,5 capturas/min) | — | — | 33,4 |

Ventas = vender a la herrera lo que no se usa (materiales, equipo que no mejora, amuletos repetidos, peces). Neto = monedas + ventas − pociones compradas. La pesca cuenta las monedas que traen los peces y el valor de venta de todo lo pescado; los peces que curan también podrían beberse.

### 7.2 Lo que cuesta cada objeto de la tienda

| Mercader | Objeto | Rareza | Nivel | Precio | Minutos de combate | Minutos de pesca (80 %) |
| --- | --- | --- | --- | --- | --- | --- |
| Tobías Cardo | Poción de vida menor | common | 1 | 7 | 0,1 | 0,2 |
| Tobías Cardo | Tónico de recurso | common | 1 | 12 | 0,1 | 0,4 |
| Tobías Cardo | Poción de vida | uncommon | 1 | 30 | 0,3 | 1,0 |
| Tobías Cardo | Elixir de prisa | uncommon | 1 | 38 | 0,3 | 1,3 |
| Tobías Cardo | Trago de pulso | uncommon | 1 | 42 | 0,4 | 1,4 |
| Tobías Cardo | Pergamino: Vendaje de luz | uncommon | 1 | 53 | 0,5 | 1,8 |
| Tobías Cardo | Pergamino: Ráfaga | uncommon | 1 | 53 | 0,5 | 1,8 |
| Tobías Cardo | Pergamino: Piel de piedra | uncommon | 1 | 53 | 0,5 | 1,8 |
| Tobías Cardo | Amuleto de la tortuga de musgo | rare | 1 | 210 | 1,9 | 7,2 |
| Brunilda Yunque | Brazales de cuero | common | 1 | 12 | 0,1 | 0,4 |
| Brunilda Yunque | Botas de viajero | common | 1 | 12 | 0,1 | 0,4 |
| Brunilda Yunque | Chaleco acolchado | common | 1 | 13 | 0,1 | 0,4 |
| Brunilda Yunque | Espada corta | common | 1 | 20 | 0,2 | 0,7 |
| Brunilda Yunque | Yelmo de hierro | common | 2 | 20 | 0,2 | 0,7 |
| Brunilda Yunque | Rodela de roble | common | 2 | 21 | 0,2 | 0,7 |
| Brunilda Yunque | Bastón de roble | common | 1 | 23 | 0,2 | 0,8 |
| Brunilda Yunque | Varita de cobre | common | 1 | 23 | 0,2 | 0,8 |
| Brunilda Yunque | Capucha del Explorador | uncommon | 1 | 24 | 0,2 | 0,8 |
| Brunilda Yunque | Anillo de cobre | common | 1 | 24 | 0,2 | 0,8 |
| Brunilda Yunque | Hacha de leñador | uncommon | 2 | 53 | 0,5 | 1,8 |
| Brunilda Yunque | Maza de herrero | uncommon | 3 | 63 | 0,6 | 2,2 |

Minutos de combate = precio ÷ 111,6 monedas netas por minuto (media de las clases en la granja, habilidad media).

## 8. Ajustes propuestos

> Nada de esto está aplicado: `data/` no se ha tocado. Cada ajuste se aplica a una copia en memoria (`scripts/balance/proposals.ts`) y se vuelve a simular. Son PROPUESTA para que el creador decida.

### Resistencias físicas más cortas (`resistencias`)

Combate v2: sin armadura, la defensa es sólo la resistencia por elemento (tope 50 %). La Vanguardia suma resistencia física de la clase, el Grito de hierro, la Piel de piedra, la rodela y la tortuga: en pleno combate roza el tope. Se recortan las fuentes que se acumulan.

| Archivo | Campo | Ahora | Propuesto |
| --- | --- | --- | --- |
| data/rpg/statuses.json | `statuses.iron_shout.modifiers[1].value` | 10 | 6 |
| data/rpg/statuses.json | `statuses.stone_skin.modifiers[1].value` | 20 | 12 |
| data/rpg/items.json | `items.oak_buckler.implicit[0].value` | 6 | 4 |
| data/rpg/pets.json | `pets.moss_turtle.ownerBonus[0].value` | 6 | 3 |

### Recurso más justo (`recurso`)

Casi nunca hay un hechizo listo que no se pueda pagar: manda el enfriamiento, no el recurso. Los combates duran menos de 20 s y empiezan con el recurso lleno, así que el máximo pesa más que la regeneración: el Maná (140) alcanza para casi todo un combate. Se baja el máximo de Maná y la regeneración de las dos clases para que elegir qué lanzar (DEC-2026-004: recurso + enfriamientos) importe.

| Archivo | Campo | Ahora | Propuesto |
| --- | --- | --- | --- |
| data/rpg/classes.json | `classes.ember_vanguard.resource.regenPerSecond` | 9 | 6 |
| data/rpg/classes.json | `classes.storm_weaver.resource.max` | 140 | 90 |
| data/rpg/classes.json | `classes.storm_weaver.resource.regenPerSecond` | 5 | 4 |

### Baluarte y Paso del relámpago, más útiles (`hechizos`)

Quitar el Baluarte de la barra apenas se nota (con tanta resistencia el escudo absorbe unos pocos puntos por combate) y el Paso del relámpago casi no se usa. Más escudo con menos enfriamiento, y el paso más barato y frecuente para que compita con andar.

| Archivo | Campo | Ahora | Propuesto |
| --- | --- | --- | --- |
| data/rpg/spells.json | `spells.bulwark.effects[0].amount` | 40 | 55 |
| data/rpg/spells.json | `spells.bulwark.cooldown` | 18 | 14 |
| data/rpg/spells.json | `spells.lightning_step.resourceCost` | 15 | 10 |
| data/rpg/spells.json | `spells.lightning_step.cooldown` | 7 | 5 |

### Curva de XP más lenta al principio (`xp`)

Con base 50 el nivel 2 llega en mitad del primer combate (y subir de nivel cura del todo), el 5 a los ~3 min y el 10 a los ~18 min repitiendo la arena. Con base 120 el primer nivel cuesta una arena entera y la curva conserva la forma (exponente 1,5). Cuántas horas debe costar el nivel 20 depende del contenido que falta.

| Archivo | Campo | Ahora | Propuesto |
| --- | --- | --- | --- |
| data/rpg/progression.json | `xp.base` | 50 | 120 |

### Menos oro por combate y precios de tienda más altos (`economia`)

Repitiendo la arena se ganan ~140 monedas por minuto (monedas + ventas) y lo más caro de la tienda cuesta 210: todo se compra en 1–2 minutos y el oro no tiene uso. Se reducen a la mitad las monedas que sueltan los enemigos, la venta pasa del 30 % al 20 % del valor y el margen de los mercaderes se multiplica por 4.

| Archivo | Campo | Ahora | Propuesto |
| --- | --- | --- | --- |
| data/rpg/loot.json | `tables.prairie_wolf.gold.min` | 1 | 0 |
| data/rpg/loot.json | `tables.prairie_wolf.gold.max` | 4 | 2 |
| data/rpg/loot.json | `tables.goblin_skirmisher.gold.min` | 3 | 1 |
| data/rpg/loot.json | `tables.goblin_skirmisher.gold.max` | 8 | 4 |
| data/rpg/loot.json | `tables.bone_shaman.gold.min` | 6 | 3 |
| data/rpg/loot.json | `tables.bone_shaman.gold.max` | 14 | 7 |
| data/rpg/loot.json | `tables.bone_imp.gold.max` | 2 | 1 |
| data/rpg/loot.json | `tables.alpha_wolf.gold.min` | 8 | 4 |
| data/rpg/loot.json | `tables.alpha_wolf.gold.max` | 16 | 8 |
| data/rpg/loot.json | `tables.goblin_veteran.gold.min` | 6 | 3 |
| data/rpg/loot.json | `tables.goblin_veteran.gold.max` | 12 | 6 |
| data/rpg/loot.json | `tables.high_beast.gold.min` | 40 | 20 |
| data/rpg/loot.json | `tables.high_beast.gold.max` | 80 | 40 |
| data/rpg/loot.json | `tables.high_ranged.gold.min` | 30 | 15 |
| data/rpg/loot.json | `tables.high_ranged.gold.max` | 60 | 30 |
| data/rpg/loot.json | `tables.high_caster.gold.min` | 30 | 15 |
| data/rpg/loot.json | `tables.high_caster.gold.max` | 70 | 35 |
| data/rpg/loot.json | `tables.high_minion.gold.max` | 4 | 2 |
| data/rpg/loot.json | `tables.high_elite.gold.min` | 64 | 32 |
| data/rpg/loot.json | `tables.high_elite.gold.max` | 128 | 64 |
| data/rpg/merchants.json | `merchants.smith.buyMultiplier` | 1,60 | 6,40 |
| data/rpg/merchants.json | `merchants.apothecary.buyMultiplier` | 1,40 | 5,60 |
| data/rpg/progression.json | `rules.sellRatio` | 0,30 | 0,20 |

### 8.1 Resultado con todos los ajustes a la vez (batería completa)

| Medida | Ahora | Con los ajustes |
| --- | --- | --- |
| Vanguardia de Brasa: muertes en grupos y jefes, malo / medio / bueno | 9 % / 0 % / 0 % | 19 % / 3 % / 0 % |
| Vanguardia de Brasa: vida perdida por combate, malo / medio / bueno | 58,9 / 11,6 / 3,8 | 57,7 / 24,8 / 3,6 |
| Vanguardia de Brasa: mayor grupo de lobos, malo / medio / bueno | 8 / 40 / 40 | 8 / 40 / 40 |
| Vanguardia de Brasa: mayor grupo de lobos preparado, malo | 25 | 20 |
| Vanguardia de Brasa: arena, victorias malo / medio / bueno | 100 % / 100 % / 100 % | 75 % / 67 % / 100 % |
| Vanguardia de Brasa: tiempo para matar medio (medio) | 7,6 s | 8,0 s |
| Vanguardia de Brasa: recurso medio en combate | 66 % | 45 % |
| Vanguardia de Brasa: decisiones con un hechizo listo sin recurso | 2 % | 28 % |
| Vanguardia de Brasa: nivel a los 30 min / al final | 10,9 / 14,9 | 8,1 / 10,6 |
| Vanguardia de Brasa: minuto del nivel 10 | 24,5 | 51,2 |
| Vanguardia de Brasa: muertes por hora de granja | 0,5 | 0,5 |
| Vanguardia de Brasa: oro neto por minuto | 105,7 | 58,3 |
| Tejedora de Tormentas: muertes en grupos y jefes, malo / medio / bueno | 12 % / 0 % / 0 % | 20 % / 2 % / 0 % |
| Tejedora de Tormentas: vida perdida por combate, malo / medio / bueno | 54,6 / 16,5 / 3,8 | 54,6 / 17,6 / 4,1 |
| Tejedora de Tormentas: mayor grupo de lobos, malo / medio / bueno | 12 / 40 / 40 | 8 / 40 / 40 |
| Tejedora de Tormentas: mayor grupo de lobos preparado, malo | 40 | 30 |
| Tejedora de Tormentas: arena, victorias malo / medio / bueno | 100 % / 100 % / 100 % | 100 % / 100 % / 100 % |
| Tejedora de Tormentas: tiempo para matar medio (medio) | 7,0 s | 7,3 s |
| Tejedora de Tormentas: recurso medio en combate | 63 % | 43 % |
| Tejedora de Tormentas: decisiones con un hechizo listo sin recurso | 0 % | 16 % |
| Tejedora de Tormentas: nivel a los 30 min / al final | 11,6 / 15,4 | 8,2 / 10,6 |
| Tejedora de Tormentas: minuto del nivel 10 | 20,4 | 51,0 |
| Tejedora de Tormentas: muertes por hora de granja | 0,0 | 0,0 |
| Tejedora de Tormentas: oro neto por minuto | 117,5 | 62,6 |
| Niveles que da la primera arena | 1 | 1 |
| Minutos de combate para lo más caro de la tienda | 1,9 (Amuleto de la tortuga de musgo) | 13,9 (Amuleto de la tortuga de musgo) |
| Mediana de minutos de combate por objeto de la tienda | 0,2 | 1,6 |
| Pesca al 80 %: monedas por minuto | 29,1 | 20,2 |

Veredicto de cada hechizo con los ajustes: Tajo ígneo: obligatorio; Embestida: prescindible; Remolino de brasas: importante; Grito de hierro: obligatorio; Marca ardiente: obligatorio; Baluarte: importante; Cadena de brasa: obligatorio; Represalia: prescindible; Chispa: obligatorio; Lanza glacial: importante; Nova de escarcha: prescindible; Paso del relámpago: prescindible; Campo estático: normal; Arco voltaico: importante; Transposición: prescindible; Repliegue helado: prescindible; Espejo de tormenta: normal.

### 8.2 Cada ajuste por separado (batería reducida)

Batería con 4 semillas, escaleras con 3 y granja de 30 min, comparada con la línea base medida igual. «—» = no se llega en esa granja.

| Medida (Vanguardia / Tejedora) | Base | resistencias | recurso | hechizos | xp | economia |
| --- | --- | --- | --- | --- | --- | --- |
| Muertes en grupos, malo | 6 % / 13 % | 7 % / 13 % | 7 % / 13 % | 4 % / 13 % | 12 % / 19 % | 6 % / 12 % |
| Vida perdida por combate, malo | 52 / 57 | 54 / 57 | 57 / 57 | 45 / 57 | 45 / 56 | 52 / 57 |
| Vida perdida por combate, bueno | 3 / 4 | 3 / 4 | 3 / 3 | 3 / 4 | 7 / 4 | 3 / 4 |
| Lobos, malo | 8 / 12 | 8 / 12 | 8 / 12 | 8 / 12 | 8 / 8 | 8 / 12 |
| Tiempo para matar (medio) | 7,5 / 6,9 | 7,4 / 6,9 | 7,9 / 7,1 | 7,4 / 6,9 | 7,6 / 7,0 | 7,4 / 6,9 |
| Recurso medio | 65 % / 64 % | 65 % / 64 % | 55 % / 54 % | 65 % / 64 % | 60 % / 53 % | 62 % / 64 % |
| Hechizo listo sin recurso | 3 % / 0 % | 3 % / 0 % | 16 % / 13 % | 3 % / 0 % | 4 % / 0 % | 5 % / 0 % |
| Minuto del nivel 10 | 28 / 20 | 28 / 20 | 22 / 20 | 29 / 20 | — / — | 25 / 21 |
| Oro neto/min | 80 / 116 | 78 / 116 | 104 / 106 | 72 / 116 | 100 / 103 | 48 / 59 |
| Min. para lo más caro | 2,2 | 2,2 | 2,0 | 2,2 | 2,1 | 15,6 |

## 9. Límites de esta medición

- El bot es constante: apunta sin errores, nunca se equivoca de tecla y reacciona siempre en 0,3 s. Un jugador real «malo» falla en más cosas que esquivar; uno «bueno» también usa el terreno. Los números son una cota optimista del daño y pesimista del tiempo que se pierde.
- Sólo se mide lo que hay: 6 arquetipos de nivel 1–4 y un único encuentro (la arena). La granja supone que la arena reaparece; en el juego todavía no lo hace.
- Vender y comprar son instantáneos (no se camina al pueblo). La pesca no se combina con mascotas.
- Las mascotas no reciben golpes (así está el juego); el zorro aporta poco daño.
- Los hechizos de huida (Paso del relámpago) valen más para una persona que para el bot, que se aparta andando muy bien: su veredicto es el más dudoso.
- La regla de equipo es una suma ponderada fija; no busca sets ni sinergias.
- No se probó ninguna fórmula nueva (XP por diferencia de nivel): sólo cambios de números en datos.
