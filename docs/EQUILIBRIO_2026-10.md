# Equilibrio del contenido — octubre de 2026

> Generado por `npm run balance` (`scripts/balance/`) el 2026-10-30, en 163 s. **No editar a mano:** se sobrescribe al regenerarlo.
> Datos de `data/` con huella `565d0bb2`. Todas las cifras de juego son PROPUESTA; este informe no cambia ninguna.

## Resumen

- **Clase más fuerte: Vanguardia de Brasa; más débil: Tejedora de Tormentas.** Sin esquivar, la primera vence grupos de hasta 12 lobos y 20 goblins y la segunda 8 y 6; muere en el 0 % de los grupos y jefes frente al 6 %. La diferencia es grande (×2,3) y viene de la supervivencia, no del daño: la Vanguardia de Brasa tarda +11 % en matar.
- **Con habilidad media o buena no muere nadie** en ningún escenario de la batería. La arena se gana el 100 % de las veces incluso sin esquivar nada. **El contenido actual es fácil para las dos clases.**
- **Habilidad (Vanguardia de Brasa):** quien esquiva el 90 % pierde 0,9 de vida por combate y quien no esquiva 24,6 (×27,7). Esquivar le deja vencer grupos de 40 lobos en vez de 12; prepararse (nivel 4 y buen equipo) sin esquivar, 20. Ejecución y preparación pesan, la ejecución más.
- **Habilidad (Tejedora de Tormentas):** quien esquiva el 90 % pierde 1,6 de vida por combate y quien no esquiva 54,5 (×34,7). Esquivar le deja vencer grupos de 40 lobos en vez de 8; prepararse (nivel 4 y buen equipo) sin esquivar, 20. Ejecución y preparación pesan, la ejecución más.
- **Hechizos obligatorios** (sin ellos el combate dura ≥ 15 % más): Remolino de brasas (+21 %); Chispa (+33 %).
- **Hechizos que no aportan** (casi no se lanzan y quitarlos no cambia nada que se note): Nova de escarcha (3,3 % de los lanzamientos, sin él +1 % de tiempo y −2,9 de vida perdida por combate); Paso del relámpago (1,6 % de los lanzamientos, sin él −2 % de tiempo y −0,1 de vida perdida por combate).
- **Ataque básico:** es el 41 % de los lanzamientos: rellena los huecos del enfriamiento global.
- **El recurso sobra:** sólo en el 1 % de las decisiones en combate había un hechizo listo que no se podía pagar, y el recurso medio está al 69 %. Mandan los enfriamientos; con DEC-2026-004 (recurso + enfriamientos) el recurso debería pesar más. Los combates duran menos de 20 s y empiezan con el recurso lleno, así que pesa más el máximo que la regeneración.
- **Curva de XP:** la primera arena da 175 XP y el nivel 2 pide 50, así que se sube en mitad del primer combate; **subir de nivel cura vida y recurso del todo**, lo que salva combates perdidos. Repitiendo la arena se llega al nivel 5 en 3 min, al 10 en 19 min y al 15,5 en 60 min.
- **Los enemigos no escalan:** son de nivel 1–4 y dan la misma XP a un personaje de cualquier nivel, así que la curva sólo mide horas de repetir lo mismo. Falta contenido de más nivel o una regla de XP por diferencia de nivel (decisión de diseño, no de números).
- **Los precios están rotos (demasiado baratos):** se ganan ~125 monedas por minuto y lo más caro de la tienda (Amuleto de la tortuga de musgo, 210) cuesta 1,7 min de combate; la mitad de la tienda cuesta menos de 11 s. En la granja se beben 0,0 pociones por hora: el oro no tiene en qué gastarse.
- **Pesca:** reaccionando al 80 % da 29 monedas por minuto, el 23 % de lo que da combatir. Es una actividad tranquila, no una alternativa económica.

**Ajustes propuestos** (§8, sin aplicar): menos armadura plana; recurso más justo; baluarte y paso del relámpago, más útiles; curva de xp más lenta al principio; menos oro por combate y precios de tienda más altos. Con todos a la vez, la Vanguardia de Brasa sin esquivar vence hasta 8 lobos (ahora 12) y esquivando 40; la Tejedora de Tormentas sin esquivar vence hasta 8 lobos (ahora 8) y esquivando 40; la arena sigue ganándose con habilidad media (100 % / 100 %).

## 1. Cómo se midió

- **Simulación real:** cada partida es un `World` y una `GameSession` de `src/` a 60 Hz, sin pantalla. El bot da las mismas órdenes que el ratón y el teclado (clic para atacar o moverse, teclas 1–6, Espacio, Q/E). Código en `scripts/balance/`.
- **Rotación:** en cada decisión (una cada 0,1 s, como una persona) el bot valora los 6 huecos de la barra a partir de su definición (daño medio × objetivos alcanzados, escudo con poca vida o rodeado, mejora si no la tiene, embestida para acercarse, teletransporte e inmovilizar para quitarse de encima un cuerpo a cuerpo) y lanza el mejor que esté listo. Si no hay ninguno, ataque básico. No es una rotación escrita a mano por hechizo: sirve igual para cualquier hechizo que se ponga en la barra.
- **Habilidad:** cuando empieza un aviso enemigo cuya área le cubre, el bot decide **una vez** si lo esquiva, con probabilidad malo = 0 %, medio = 50 %, bueno = 90 %. Si lo esquiva, tras 0,3 s ± 20 % de reacción sale del área andando si le da tiempo o con la evasión si no. La clase a distancia, con la misma probabilidad, se aparta cuando un cuerpo a cuerpo se le echa encima (kiting).
- **Pociones:** bebe por debajo del 35 % de vida y toma un tónico por debajo del 15 % de recurso en combate.
- **Equipo y puntos:** equipa lo que suba una suma ponderada de estadísticas (la principal pesa 1, armadura 0,8–1,2, crítico 80 por unidad, el daño del arma 3 por punto de daño por segundo…) sin cambiar de tipo de arma; los puntos van dos a la principal y uno a vitalidad. Invoca la mascota luchadora (Zorro de ceniza) que traen las dos clases.
- **Preparación:** *inicial* = nivel 1 con el kit de la clase; *preparado* = nivel 4 con los puntos gastados y lo mejor de una copia de cada objeto equipable de nivel ≤ 4.
- **Semillas:** 12 por combinación en la batería principal, 8 en ablaciones y escaleras. 2592 partidas en la batería principal.
- **Escenarios de grupo** en un campo abierto de 80 × 80 m (como un prado del mundo continuo); los enemigos aparecen en arco a 9–11 m. La **arena** es la del Slice 01 con sus obstáculos.

| Escenario | Tipo | Enemigos | Límite |
| --- | --- | --- | --- |
| arena | arena | Lobo de pradera, Lobo de pradera, Hostigador goblin, Hostigador goblin, Chamán de hueso, Lobo alfa, Hostigador veterano | 300 s |
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
| Arena del Slice 01 (7 enemigos repartidos) | 100 % · 25,9 s · 16 | 100 % · 26,9 s · 9 | 100 % · 27,4 s · 4 | 100 % · 25,8 s · 35 | 100 % · 26,3 s · 21 | 100 % · 26,8 s · 5 |
| 1 lobo | 100 % · 1,8 s · 0 | 100 % · 2,2 s · 0 | 100 % · 2,3 s · 0 | 100 % · 1,6 s · 0 | 100 % · 1,6 s · 0 | 100 % · 1,6 s · 0 |
| 3 lobos | 100 % · 5,0 s · 0 | 100 % · 5,7 s · 1 | 100 % · 5,6 s · 0 | 100 % · 4,9 s · 14 | 100 % · 4,5 s · 2 | 100 % · 5,0 s · 0 |
| 5 lobos | 100 % · 6,1 s · 9 | 100 % · 7,9 s · 3 | 100 % · 9,1 s · 1 | 100 % · 6,5 s · 44 | 100 % · 7,3 s · 14 | 100 % · 6,7 s · 0 |
| 8 lobos | 100 % · 8,8 s · 68 | 100 % · 9,2 s · 1 | 100 % · 9,9 s · 0 | 100 % · 8,9 s · 120 | 100 % · 8,8 s · 13 | 100 % · 8,8 s · 0 |
| 1 goblin | 100 % · 1,5 s · 0 | 100 % · 1,6 s · 0 | 100 % · 1,9 s · 0 | 100 % · 1,1 s · 5 | 100 % · 1,2 s · 5 | 100 % · 1,2 s · 1 |
| 2 goblins | 100 % · 4,5 s · 0 | 100 % · 4,5 s · 0 | 100 % · 4,5 s · 0 | 100 % · 2,8 s · 16 | 100 % · 3,3 s · 6 | 100 % · 3,3 s · 0 |
| 4 goblins | 100 % · 5,8 s · 6 | 100 % · 6,1 s · 4 | 100 % · 6,4 s · 2 | 100 % · 5,6 s · 47 | 100 % · 6,5 s · 6 | 100 % · 6,5 s · 2 |
| 6 goblins | 100 % · 8,3 s · 8 | 100 % · 8,7 s · 4 | 100 % · 8,7 s · 0 | 100 % · 8,3 s · 106 | 100 % · 8,1 s · 20 | 100 % · 8,5 s · 0 |
| 1 chamán | 100 % · 2,0 s · 0 | 100 % · 2,0 s · 0 | 100 % · 2,0 s · 0 | 100 % · 1,9 s · 0 | 100 % · 1,9 s · 0 | 100 % · 1,9 s · 0 |
| 2 chamanes | 100 % · 5,6 s · 0 | 100 % · 5,7 s · 0 | 100 % · 5,7 s · 0 | 100 % · 4,4 s · 0 | 100 % · 4,4 s · 0 | 100 % · 4,4 s · 0 |
| 3 chamanes | 100 % · 8,3 s · 0 | 100 % · 8,0 s · 0 | 100 % · 7,7 s · 1 | 100 % · 6,5 s · 1 | 100 % · 6,5 s · 1 | 100 % · 7,3 s · 0 |
| 2 lobos + goblin + chamán | 100 % · 6,5 s · 0 | 100 % · 7,5 s · 0 | 100 % · 7,6 s · 0 | 100 % · 6,5 s · 26 | 100 % · 7,5 s · 9 | 100 % · 7,9 s · 2 |
| Lobo alfa + 2 lobos | 100 % · 6,2 s · 6 | 100 % · 7,7 s · 1 | 100 % · 7,9 s · 0 | 100 % · 6,5 s · 47 | 100 % · 6,3 s · 22 | 100 % · 6,4 s · 4 |
| Lobo alfa + 4 lobos | 100 % · 8,0 s · 29 | 100 % · 9,1 s · 4 | 100 % · 11,0 s · 0 | 100 % · 8,1 s · 96 | 100 % · 8,7 s · 11 | 100 % · 8,7 s · 2 |
| Lobo alfa + 2 lobos + veterano | 100 % · 8,0 s · 28 | 100 % · 9,6 s · 8 | 100 % · 10,2 s · 0 | 100 % · 8,6 s · 109 | 100 % · 9,6 s · 31 | 100 % · 9,7 s · 4 |
| Lobo alfa + 6 lobos | 100 % · 9,6 s · 84 | 100 % · 10,8 s · 15 | 100 % · 13,2 s · 3 | 83 % · 9,8 s · 124 | 100 % · 10,1 s · 17 | 100 % · 10,5 s · 4 |
| 2 lobos alfa + 2 veteranos + 2 lobos | 100 % · 14,2 s · 190 | 100 % · 15,2 s · 39 | 100 % · 16,4 s · 5 | 8 % · 12,3 s · 192 | 100 % · 13,4 s · 46 | 100 % · 14,2 s · 5 |

### 2.2 Lo mismo, preparado (nivel 4, puntos y mejor equipo de nivel ≤ 4)

| Escenario | Vanguardia de Brasa malo | Vanguardia de Brasa medio | Vanguardia de Brasa bueno | Tejedora de Tormentas malo | Tejedora de Tormentas medio | Tejedora de Tormentas bueno |
| --- | --- | --- | --- | --- | --- | --- |
| Arena del Slice 01 (7 enemigos repartidos) | 100 % · 21,8 s · 3 | 100 % · 23,2 s · 2 | 100 % · 24,6 s · 0 | 100 % · 20,6 s · 0 | 100 % · 20,5 s · 0 | 100 % · 20,3 s · 0 |
| 1 lobo | 100 % · 1,8 s · 0 | 100 % · 1,9 s · 0 | 100 % · 1,9 s · 0 | 100 % · 1,0 s · 0 | 100 % · 1,0 s · 0 | 100 % · 1,0 s · 0 |
| 3 lobos | 100 % · 3,4 s · 0 | 100 % · 3,9 s · 0 | 100 % · 4,0 s · 0 | 100 % · 3,3 s · 0 | 100 % · 3,3 s · 0 | 100 % · 3,3 s · 0 |
| 5 lobos | 100 % · 5,3 s · 0 | 100 % · 5,4 s · 0 | 100 % · 5,5 s · 0 | 100 % · 4,1 s · 12 | 100 % · 4,3 s · 2 | 100 % · 4,5 s · 0 |
| 8 lobos | 100 % · 6,9 s · 18 | 100 % · 7,2 s · 0 | 100 % · 7,2 s · 0 | 100 % · 6,1 s · 49 | 100 % · 6,5 s · 8 | 100 % · 6,2 s · 0 |
| 1 goblin | 100 % · 1,0 s · 0 | 100 % · 1,0 s · 0 | 100 % · 1,0 s · 0 | 100 % · 0,4 s · 0 | 100 % · 0,4 s · 0 | 100 % · 0,4 s · 0 |
| 2 goblins | 100 % · 4,2 s · 0 | 100 % · 4,2 s · 0 | 100 % · 4,9 s · 0 | 100 % · 2,0 s · 10 | 100 % · 1,6 s · 2 | 100 % · 1,3 s · 0 |
| 4 goblins | 100 % · 5,0 s · 5 | 100 % · 5,0 s · 1 | 100 % · 5,1 s · 1 | 100 % · 5,2 s · 39 | 100 % · 3,3 s · 2 | 100 % · 3,3 s · 0 |
| 6 goblins | 100 % · 6,9 s · 4 | 100 % · 6,9 s · 0 | 100 % · 7,3 s · 0 | 100 % · 6,2 s · 69 | 100 % · 5,8 s · 10 | 100 % · 5,8 s · 0 |
| 1 chamán | 100 % · 1,3 s · 0 | 100 % · 1,3 s · 0 | 100 % · 1,3 s · 0 | 100 % · 1,0 s · 0 | 100 % · 1,0 s · 0 | 100 % · 1,0 s · 0 |
| 2 chamanes | 100 % · 4,0 s · 0 | 100 % · 4,4 s · 0 | 100 % · 4,6 s · 0 | 100 % · 2,5 s · 0 | 100 % · 2,5 s · 0 | 100 % · 2,5 s · 0 |
| 3 chamanes | 100 % · 5,7 s · 0 | 100 % · 6,4 s · 0 | 100 % · 6,3 s · 0 | 100 % · 5,3 s · 0 | 100 % · 5,3 s · 0 | 100 % · 5,6 s · 0 |
| 2 lobos + goblin + chamán | 100 % · 5,2 s · 2 | 100 % · 5,8 s · 1 | 100 % · 6,3 s · 0 | 100 % · 5,2 s · 9 | 100 % · 5,4 s · 7 | 100 % · 5,7 s · 1 |
| Lobo alfa + 2 lobos | 100 % · 4,4 s · 1 | 100 % · 5,2 s · 1 | 100 % · 5,7 s · 0 | 100 % · 4,2 s · 11 | 100 % · 4,2 s · 1 | 100 % · 4,4 s · 0 |
| Lobo alfa + 4 lobos | 100 % · 6,4 s · 1 | 100 % · 6,6 s · 0 | 100 % · 7,6 s · 0 | 100 % · 5,7 s · 34 | 100 % · 5,5 s · 9 | 100 % · 5,9 s · 0 |
| Lobo alfa + 2 lobos + veterano | 100 % · 6,4 s · 1 | 100 % · 6,6 s · 0 | 100 % · 7,4 s · 0 | 100 % · 5,5 s · 29 | 100 % · 5,6 s · 9 | 100 % · 5,7 s · 0 |
| Lobo alfa + 6 lobos | 100 % · 7,9 s · 29 | 100 % · 7,8 s · 0 | 100 % · 8,3 s · 0 | 100 % · 6,8 s · 63 | 100 % · 6,8 s · 11 | 100 % · 7,1 s · 0 |
| 2 lobos alfa + 2 veteranos + 2 lobos | 100 % · 9,5 s · 59 | 100 % · 10,5 s · 8 | 100 % · 12,3 s · 1 | 100 % · 9,6 s · 144 | 100 % · 8,7 s · 26 | 100 % · 9,4 s · 1 |

### 2.3 Detalle con habilidad media (nivel 1)

**Vanguardia de Brasa**

| Escenario | DPS | DPS mascota | Daño entrante | Vida perdida | Golpes/avisos | Pociones | Tónicos | Recurso medio | Recurso lleno | Listo sin recurso | XP/min | Oro/min |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Arena del Slice 01 (7 enemigos repartidos) | 18,5 | 1,4 | 8,9 | 8,9 | 0 % | 0,00 | 0,75 | 69 % | 17 % | 0 % | 389 | 179 |
| 1 lobo | 28,6 | 2,9 | 0,0 | 0,0 | 0 % | 0,00 | 0,00 | 77 % | 11 % | 0 % | 399 | 102 |
| 3 lobos | 33,6 | 3,2 | 9,2 | 0,6 | 22 % | 0,00 | 0,58 | 60 % | 3 % | 7 % | 455 | 122 |
| 5 lobos | 41,3 | 3,5 | 18,2 | 2,9 | 13 % | 0,00 | 0,92 | 65 % | 14 % | 3 % | 544 | 135 |
| 8 lobos | 55,3 | 3,5 | 21,6 | 1,3 | 6 % | 0,00 | 0,58 | 67 % | 14 % | 3 % | 712 | 161 |
| 1 goblin | 26,3 | 0,9 | 0,0 | 0,0 | 0 % | 0,00 | 0,00 | 84 % | 18 % | 0 % | 667 | 349 |
| 2 goblins | 19,4 | 1,3 | 0,0 | 0,0 | 0 % | 0,00 | 0,00 | 77 % | 6 % | 0 % | 476 | 236 |
| 4 goblins | 29,1 | 2,5 | 3,8 | 3,8 | 4 % | 0,00 | 0,25 | 68 % | 21 % | 1 % | 675 | 321 |
| 6 goblins | 31,0 | 2,9 | 8,8 | 3,6 | 4 % | 0,00 | 1,00 | 78 % | 26 % | 0 % | 729 | 336 |
| 1 chamán | 30,1 | 1,6 | 0,0 | 0,0 | 0 % | 0,00 | 0,00 | 77 % | 12 % | 0 % | 932 | 707 |
| 2 chamanes | 29,5 | 2,0 | 3,7 | 0,0 | 4 % | 0,00 | 0,83 | 66 % | 6 % | 1 % | 700 | 492 |
| 3 chamanes | 34,7 | 2,6 | 2,0 | 0,2 | 16 % | 0,00 | 0,92 | 76 % | 24 % | 0 % | 813 | 481 |
| 2 lobos + goblin + chamán | 34,9 | 3,1 | 8,2 | 0,0 | 11 % | 0,00 | 0,75 | 66 % | 15 % | 3 % | 653 | 241 |
| Lobo alfa + 2 lobos | 32,7 | 3,5 | 21,9 | 1,3 | 24 % | 0,00 | 0,83 | 62 % | 4 % | 4 % | 564 | 270 |
| Lobo alfa + 4 lobos | 42,7 | 3,4 | 24,5 | 3,7 | 13 % | 0,00 | 0,92 | 69 % | 13 % | 3 % | 662 | 269 |
| Lobo alfa + 2 lobos + veterano | 33,5 | 3,2 | 36,3 | 8,1 | 16 % | 0,00 | 0,83 | 72 % | 18 % | 2 % | 656 | 319 |
| Lobo alfa + 6 lobos | 45,0 | 3,5 | 36,7 | 14,8 | 11 % | 0,00 | 0,83 | 67 % | 12 % | 2 % | 662 | 205 |
| 2 lobos alfa + 2 veteranos + 2 lobos | 35,2 | 3,4 | 71,0 | 38,8 | 10 % | 0,00 | 1,00 | 65 % | 8 % | 1 % | 735 | 373 |

**Tejedora de Tormentas**

| Escenario | DPS | DPS mascota | Daño entrante | Vida perdida | Golpes/avisos | Pociones | Tónicos | Recurso medio | Recurso lleno | Listo sin recurso | XP/min | Oro/min |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Arena del Slice 01 (7 enemigos repartidos) | 19,6 | 0,9 | 21,2 | 21,2 | 0 % | 0,00 | 0,92 | 67 % | 4 % | 0 % | 401 | 212 |
| 1 lobo | 45,8 | 2,0 | 0,0 | 0,0 | 0 % | 0,00 | 0,00 | 78 % | 0 % | 0 % | 557 | 163 |
| 3 lobos | 41,7 | 3,0 | 2,0 | 2,0 | 8 % | 0,00 | 0,00 | 57 % | 0 % | 0 % | 549 | 132 |
| 5 lobos | 46,5 | 3,4 | 13,9 | 13,9 | 9 % | 0,00 | 0,00 | 58 % | 10 % | 0 % | 593 | 142 |
| 8 lobos | 62,6 | 3,4 | 13,4 | 13,4 | 5 % | 0,00 | 0,00 | 62 % | 7 % | 0 % | 764 | 167 |
| 1 goblin | 39,2 | 1,1 | 4,5 | 4,5 | 40 % | 0,00 | 0,00 | 79 % | 0 % | 0 % | 941 | 410 |
| 2 goblins | 29,4 | 1,2 | 5,8 | 5,8 | 22 % | 0,00 | 0,00 | 75 % | 0 % | 0 % | 701 | 266 |
| 4 goblins | 30,2 | 2,5 | 6,2 | 6,2 | 5 % | 0,00 | 0,00 | 79 % | 8 % | 0 % | 695 | 312 |
| 6 goblins | 33,4 | 2,8 | 19,5 | 19,5 | 7 % | 0,08 | 0,00 | 83 % | 6 % | 0 % | 793 | 327 |
| 1 chamán | 35,4 | 1,8 | 0,0 | 0,0 | 0 % | 0,00 | 0,00 | 77 % | 0 % | 0 % | 1056 | 801 |
| 2 chamanes | 37,2 | 2,3 | 0,0 | 0,0 | 0 % | 0,00 | 0,00 | 64 % | 0 % | 0 % | 937 | 475 |
| 3 chamanes | 39,1 | 2,6 | 0,6 | 0,6 | 38 % | 0,00 | 0,00 | 70 % | 8 % | 0 % | 936 | 634 |
| 2 lobos + goblin + chamán | 37,4 | 3,0 | 9,1 | 9,1 | 14 % | 0,00 | 0,00 | 66 % | 8 % | 0 % | 683 | 308 |
| Lobo alfa + 2 lobos | 41,8 | 3,3 | 21,5 | 21,5 | 23 % | 0,00 | 0,00 | 60 % | 9 % | 0 % | 699 | 273 |
| Lobo alfa + 4 lobos | 46,0 | 3,3 | 11,3 | 11,3 | 2 % | 0,00 | 0,00 | 59 % | 8 % | 0 % | 685 | 296 |
| Lobo alfa + 2 lobos + veterano | 36,5 | 3,1 | 31,1 | 31,1 | 10 % | 0,17 | 0,00 | 69 % | 7 % | 0 % | 691 | 311 |
| Lobo alfa + 6 lobos | 54,6 | 3,4 | 16,7 | 16,7 | 6 % | 0,00 | 0,00 | 62 % | 7 % | 0 % | 763 | 271 |
| 2 lobos alfa + 2 veteranos + 2 lobos | 42,3 | 3,1 | 45,8 | 45,8 | 9 % | 0,00 | 0,00 | 65 % | 5 % | 0 % | 852 | 480 |

*XP/min y oro/min* son del tiempo de combate solo (sin desplazarse ni descansar); el ritmo real está en la granja (§5 y §7). El oro incluye el valor de venta de lo que se recoge.

### 2.4 Escaleras: mayor grupo que se vence la mitad de las veces

| Prueba | Clase | Preparación | malo | medio | bueno |
| --- | --- | --- | --- | --- | --- |
| lobos | Vanguardia de Brasa | inicial | 12 | ≥ 40 | ≥ 40 |
| lobos | Vanguardia de Brasa | preparado | 20 | ≥ 40 | ≥ 40 |
| lobos | Tejedora de Tormentas | inicial | 8 | ≥ 40 | ≥ 40 |
| lobos | Tejedora de Tormentas | preparado | 20 | ≥ 40 | ≥ 40 |
| goblins | Vanguardia de Brasa | inicial | 20 | ≥ 30 | ≥ 30 |
| goblins | Vanguardia de Brasa | preparado | ≥ 30 | ≥ 30 | ≥ 30 |
| goblins | Tejedora de Tormentas | inicial | 6 | ≥ 30 | ≥ 30 |
| goblins | Tejedora de Tormentas | preparado | 12 | ≥ 30 | ≥ 30 |

Tamaños probados: lobos 8, 12, 16, 20, 25, 30, 40; goblins 6, 9, 12, 16, 20, 25, 30. «≥ N» = gana incluso el mayor.

### 2.5 Resumen por clase

| Clase | DPS (medio) | Tiempo para matar medio | Parte de la mascota | Muertes malo / medio / bueno | Vida perdida malo / medio / bueno |
| --- | --- | --- | --- | --- | --- |
| Vanguardia de Brasa | 34,3 | 7,2 s | 8 % | 0 % / 0 % / 0 % | 24,6 / 4,9 / 0,9 |
| Tejedora de Tormentas | 41,1 | 6,5 s | 7 % | 6 % / 0 % / 0 % | 54,5 / 12,4 / 1,6 |

## 3. Hechizos

Uso con habilidad media, nivel 1, en todos los escenarios. *Ablación*: la misma batería reducida (arena, lobos8, goblins6, chaman3, alfa6, dobleAlfa; 8 semillas) con ese hueco vacío; Δ = cambio frente a la barra completa.

| Clase | Hechizo | % lanzamientos | % daño directo | Lanzamientos/min | Δ tiempo sin él | Δ vida perdida sin él | Δ victorias | Veredicto |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Vanguardia de Brasa | Ataque básico (arma) | 40,8 % | 30,0 % | 41,4 | — | — | — | — |
| Vanguardia de Brasa | Tajo ígneo | 13,0 % | 23,0 % | 13,2 | +14 % | +25 % (+3,0) | +0 pts | importante |
| Vanguardia de Brasa | Embestida | 7,3 % | 8,9 % | 7,4 | +7 % | +1 % (+0,1) | +0 pts | importante |
| Vanguardia de Brasa | Remolino de brasas | 10,3 % | 22,9 % | 10,4 | +21 % | +79 % (+9,5) | +0 pts | obligatorio |
| Vanguardia de Brasa | Grito de hierro | 7,1 % | 0,0 % | 7,2 | +8 % | +100 % (+11,9) | +0 pts | importante |
| Vanguardia de Brasa | Marca ardiente | 16,8 % | 8,3 % | 17,0 | +6 % | +52 % (+6,2) | +0 pts | importante |
| Vanguardia de Brasa | Baluarte | 4,7 % | 0,0 % | 4,8 | −3 % | +73 % (+8,7) | +0 pts | importante |
| Tejedora de Tormentas | Ataque básico (arma) | 41,9 % | 15,3 % | 53,3 | — | — | — | — |
| Tejedora de Tormentas | Chispa | 28,0 % | 32,5 % | 35,6 | +33 % | +28 % (+4,4) | +0 pts | obligatorio |
| Tejedora de Tormentas | Lanza glacial | 11,4 % | 22,1 % | 14,5 | +11 % | +32 % (+5,0) | +0 pts | importante |
| Tejedora de Tormentas | Nova de escarcha | 3,3 % | 6,0 % | 4,2 | +1 % | −18 % (−2,9) | +0 pts | prescindible |
| Tejedora de Tormentas | Paso del relámpago | 1,6 % | 0,0 % | 2,0 | −2 % | −1 % (−0,1) | +0 pts | prescindible |
| Tejedora de Tormentas | Campo estático | 7,6 % | 5,8 % | 9,6 | +3 % | +2 % (+0,3) | +0 pts | normal |
| Tejedora de Tormentas | Arco voltaico | 6,2 % | 18,3 % | 7,9 | +10 % | +30 % (+4,7) | +0 pts | importante |

El daño de la Quemadura (Marca ardiente, Remolino) cuenta aparte como «estado»; por eso la Marca parece hacer poco daño directo. Veredictos: *obligatorio* = sin él se pierden ≥ 10 puntos de victorias o el combate dura ≥ 15 % más; *importante* = dura ≥ 5 % más o se pierde ≥ 25 % más de vida; *prescindible* = menos del 6 % de los lanzamientos y quitarlo no cambia nada que se note (≤ 3 % de tiempo, ≤ 12 % de vida). Los cambios de vida de menos de 5 puntos por combate no cuentan (con tan poco daño, un +100 % son 3 puntos).

Daño de estados (Quemadura) sobre el total del jugador: 3,4 %.

### 3.1 Hechizos universales en lugar del hechizo de clase menos útil

| Clase | Universal | Sustituye a | Δ tiempo para matar | Δ vida perdida |
| --- | --- | --- | --- | --- |
| Vanguardia de Brasa | Vendaje de luz | Baluarte | −2 % | +72 % (+8,6) |
| Vanguardia de Brasa | Piel de piedra | Baluarte | −3 % | +42 % (+5,0) |
| Vanguardia de Brasa | Espíritu lobuno | Baluarte | −5 % | +74 % (+8,9) |
| Vanguardia de Brasa | Ráfaga | Baluarte | −2 % | +77 % (+9,2) |
| Tejedora de Tormentas | Vendaje de luz | Paso del relámpago | −2 % | −1 % (−0,1) |
| Tejedora de Tormentas | Piel de piedra | Paso del relámpago | +2 % | −22 % (−3,4) |
| Tejedora de Tormentas | Espíritu lobuno | Paso del relámpago | −7 % | −0 % (−0,0) |
| Tejedora de Tormentas | Ráfaga | Paso del relámpago | +0 % | +7 % (+1,1) |

## 4. ¿Importa la habilidad? (preparación + ejecución)

| Clase | Golpes/avisos malo / medio / bueno | Vida perdida malo / medio / bueno | Lobos (inicial) malo / medio / bueno | Lobos preparado malo / medio / bueno | Arena malo / medio / bueno |
| --- | --- | --- | --- | --- | --- |
| Vanguardia de Brasa | 30 % / 9 % / 2 % | 24,6 / 4,9 / 0,9 | 12 / 40 / 40 | 20 / 40 / 40 | 100 % / 100 % / 100 % |
| Tejedora de Tormentas | 39 % / 11 % / 1 % | 54,5 / 12,4 / 1,6 | 8 / 40 / 40 | 20 / 40 / 40 | 100 % / 100 % / 100 % |

Lectura: la *ejecución* es la columna de habilidad; la *preparación* es pasar de inicial a preparado con la habilidad fija. Si una clase gana lo mismo sin esquivar que esquivando, la ejecución no pesa; si gana lo mismo con o sin equipo, la preparación no pesa.

## 5. Progresión (XP)

Granja: la arena del Slice 01 (único encuentro del mundo, 175 XP) se repite durante 60 min como si reapareciera, arrastrando la vida y el recurso entre pasadas, recogiendo el botín, equipándose, vendiendo y descansando hasta el 80 %. Morir cuesta 30 s. 2 semillas por clase y habilidad.

Fórmula: xpToNext(n) = round(50 · n^1.5); nivel máximo 20.

| Nivel | XP del anterior a este | XP total | Arenas | Minuto (Vanguardia de Brasa, medio) | Minuto (Tejedora de Tormentas, medio) |
| --- | --- | --- | --- | --- | --- |
| 2 | 50 | 50 | 0,3 | 0,3 | 0,2 |
| 3 | 141 | 191 | 1,1 | 0,7 | 0,8 |
| 4 | 260 | 451 | 2,6 | 1,7 | 1,6 |
| 5 | 400 | 851 | 4,9 | 3,1 | 3,0 |
| 6 | 559 | 1410 | 8,1 | 5,4 | 5,1 |
| 8 | 926 | 3071 | 17,5 | 11,1 | 10,9 |
| 10 | 1350 | 5552 | 31,7 | 19,1 | 19,6 |
| 12 | 1824 | 8957 | 51,2 | 30,6 | 31,7 |
| 15 | 2619 | 15998 | 91,4 | 53,2 | 57,2 |
| 18 | 3505 | 25608 | 146,3 | > 60 | > 60 |
| 20 | 4141 | 33567 | 191,8 | > 60 | > 60 |

### 5.1 Nivel alcanzado en N minutos

| Clase | Habilidad | 5 min | 10 min | 20 min | 30 min | 45 min | 60 min | Pasadas | Muertes | Descanso |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Vanguardia de Brasa | malo | 6,1 | 7,9 | 10,4 | 12,2 | 14,5 | 16,3 | 113 | 0,0 | 0 s |
| Vanguardia de Brasa | medio | 5,8 | 7,6 | 10,1 | 11,9 | 14,0 | 15,7 | 104 | 0,0 | 1 s |
| Vanguardia de Brasa | bueno | 5,9 | 7,7 | 10,1 | 11,9 | 14,1 | 15,8 | 105 | 0,0 | 0 s |
| Tejedora de Tormentas | malo | 6,0 | 7,8 | 10,0 | 11,6 | 13,5 | 15,2 | 94 | 0,0 | 5 s |
| Tejedora de Tormentas | medio | 6,0 | 7,7 | 10,1 | 11,8 | 13,7 | 15,3 | 96 | 0,0 | 0 s |
| Tejedora de Tormentas | bueno | 6,0 | 7,7 | 9,9 | 11,6 | 13,5 | 15,2 | 95 | 0,0 | 0 s |

Nivel con decimales: 7,5 = a mitad de camino del 8.

## 6. Botín por rareza

Objetos que existen por rareza: common 16, uncommon 18, rare 7, epic 1, legendary 0.

| Clase | Habilidad | common/min | uncommon/min | rare/min | epic/min | legendary/min | Minutos por objeto raro | Minutos por épico |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Vanguardia de Brasa | malo | 14,47 | 5,18 | 0,66 | 0,01 | 0,00 | 1,5 | 120 |
| Vanguardia de Brasa | medio | 13,18 | 4,97 | 0,53 | 0,04 | 0,00 | 1,9 | 24 |
| Vanguardia de Brasa | bueno | 13,07 | 5,03 | 0,61 | 0,02 | 0,00 | 1,6 | 60 |
| Tejedora de Tormentas | malo | 11,72 | 4,42 | 0,56 | 0,03 | 0,00 | 1,8 | 30 |
| Tejedora de Tormentas | medio | 11,91 | 4,45 | 0,55 | 0,02 | 0,00 | 1,8 | 60 |
| Tejedora de Tormentas | bueno | 11,54 | 4,39 | 0,54 | 0,02 | 0,00 | 1,8 | 60 |

Cuenta todo lo que cae al suelo en la granja (pociones y materiales incluidos), por minuto de granja (con desplazamientos y descansos).

## 7. Economía

### 7.1 Ingresos por minuto

| Fuente | Monedas/min | Ventas/min | Neto/min |
| --- | --- | --- | --- |
| Granja, Vanguardia de Brasa (medio) | 74,3 | 57,4 | 131,7 |
| Granja, Tejedora de Tormentas (medio) | 67,8 | 51,3 | 119,0 |
| Pesca, reacciona al 50 % (3,5 capturas/min) | — | — | 14,9 |
| Pesca, reacciona al 80 % (6,1 capturas/min) | — | — | 29,1 |
| Pesca, reacciona al 95 % (7,5 capturas/min) | — | — | 33,4 |

Ventas = vender a la herrera lo que no se usa (materiales, equipo que no mejora, amuletos repetidos, peces). Neto = monedas + ventas − pociones compradas. La pesca cuenta las monedas que traen los peces y el valor de venta de todo lo pescado; los peces que curan también podrían beberse.

### 7.2 Lo que cuesta cada objeto de la tienda

| Mercader | Objeto | Rareza | Nivel | Precio | Minutos de combate | Minutos de pesca (80 %) |
| --- | --- | --- | --- | --- | --- | --- |
| Tobías Cardo | Poción de vida menor | common | 1 | 7 | 0,1 | 0,2 |
| Tobías Cardo | Tónico de recurso | common | 1 | 12 | 0,1 | 0,4 |
| Tobías Cardo | Poción de vida | uncommon | 1 | 30 | 0,2 | 1,0 |
| Tobías Cardo | Elixir de prisa | uncommon | 1 | 38 | 0,3 | 1,3 |
| Tobías Cardo | Pergamino: Vendaje de luz | uncommon | 1 | 53 | 0,4 | 1,8 |
| Tobías Cardo | Pergamino: Ráfaga | uncommon | 1 | 53 | 0,4 | 1,8 |
| Tobías Cardo | Pergamino: Piel de piedra | uncommon | 1 | 53 | 0,4 | 1,8 |
| Tobías Cardo | Amuleto de la tortuga de musgo | rare | 1 | 210 | 1,7 | 7,2 |
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
| Brunilda Yunque | Hacha de leñador | uncommon | 2 | 53 | 0,4 | 1,8 |
| Brunilda Yunque | Maza de herrero | uncommon | 3 | 63 | 0,5 | 2,2 |

Minutos de combate = precio ÷ 125,4 monedas netas por minuto (media de las clases en la granja, habilidad media).

## 8. Ajustes propuestos

> Nada de esto está aplicado: `data/` no se ha tocado. Cada ajuste se aplica a una copia en memoria (`scripts/balance/proposals.ts`) y se vuelve a simular. Son PROPUESTA para que el creador decida.

### Menos armadura plana (`armadura`)

Con la armadura de rendimiento decreciente (master, armorHalf = 20) ya no hay golpes en 1, pero la Vanguardia sigue acumulando ~12 de armadura (×0,62 al daño físico). Se recorta la armadura de las fuentes que se acumulan. (La subida de daño de los enemigos, antes «amenaza», ya se aplicó en data/.)

| Archivo | Campo | Ahora | Propuesto |
| --- | --- | --- | --- |
| data/rpg/classes.json | `classes.ember_vanguard.baseStats.armor` | 2 | 1 |
| data/rpg/statuses.json | `statuses.iron_shout.modifiers[1].value` | 5 | 2 |
| data/rpg/statuses.json | `statuses.stone_skin.modifiers[0].value` | 8 | 3 |
| data/rpg/items.json | `items.oak_buckler.implicit[0].value` | 3 | 2 |
| data/rpg/pets.json | `pets.moss_turtle.ownerBonus[0].value` | 4 | 2 |

### Recurso más justo (`recurso`)

Casi nunca hay un hechizo listo que no se pueda pagar: manda el enfriamiento, no el recurso. Los combates duran menos de 20 s y empiezan con el recurso lleno, así que el máximo pesa más que la regeneración: el Maná (140) alcanza para casi todo un combate. Se baja el máximo de Maná y la regeneración de las dos clases para que elegir qué lanzar (DEC-2026-004: recurso + enfriamientos) importe.

| Archivo | Campo | Ahora | Propuesto |
| --- | --- | --- | --- |
| data/rpg/classes.json | `classes.ember_vanguard.resource.regenPerSecond` | 9 | 6 |
| data/rpg/classes.json | `classes.storm_weaver.resource.max` | 140 | 90 |
| data/rpg/classes.json | `classes.storm_weaver.resource.regenPerSecond` | 5 | 4 |

### Baluarte y Paso del relámpago, más útiles (`hechizos`)

Quitar el Baluarte de la barra apenas se nota (con tanta armadura el escudo absorbe unos pocos puntos por combate) y el Paso del relámpago casi no se usa. Más escudo con menos enfriamiento, y el paso más barato y frecuente para que compita con andar.

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
| data/rpg/merchants.json | `merchants.smith.buyMultiplier` | 1,60 | 6,40 |
| data/rpg/merchants.json | `merchants.apothecary.buyMultiplier` | 1,40 | 5,60 |
| data/rpg/progression.json | `rules.sellRatio` | 0,30 | 0,20 |

### 8.1 Resultado con todos los ajustes a la vez (batería completa)

| Medida | Ahora | Con los ajustes |
| --- | --- | --- |
| Vanguardia de Brasa: muertes en grupos y jefes, malo / medio / bueno | 0 % / 0 % / 0 % | 5 % / 0 % / 0 % |
| Vanguardia de Brasa: vida perdida por combate, malo / medio / bueno | 24,6 / 4,9 / 0,9 | 24,6 / 5,0 / 1,6 |
| Vanguardia de Brasa: mayor grupo de lobos, malo / medio / bueno | 12 / 40 / 40 | 8 / 40 / 40 |
| Vanguardia de Brasa: mayor grupo de lobos preparado, malo | 20 | 16 |
| Vanguardia de Brasa: arena, victorias malo / medio / bueno | 100 % / 100 % / 100 % | 100 % / 100 % / 100 % |
| Vanguardia de Brasa: tiempo para matar medio (medio) | 7,2 s | 7,4 s |
| Vanguardia de Brasa: recurso medio en combate | 70 % | 59 % |
| Vanguardia de Brasa: decisiones con un hechizo listo sin recurso | 2 % | 5 % |
| Vanguardia de Brasa: nivel a los 30 min / al final | 11,9 / 15,7 | 8,5 / 11,3 |
| Vanguardia de Brasa: minuto del nivel 10 | 19,1 | 44,2 |
| Vanguardia de Brasa: muertes por hora de granja | 0,0 | 0,0 |
| Vanguardia de Brasa: oro neto por minuto | 131,7 | 76,7 |
| Tejedora de Tormentas: muertes en grupos y jefes, malo / medio / bueno | 6 % / 0 % / 0 % | 16 % / 0 % / 0 % |
| Tejedora de Tormentas: vida perdida por combate, malo / medio / bueno | 54,5 / 12,4 / 1,6 | 50,1 / 12,3 / 1,6 |
| Tejedora de Tormentas: mayor grupo de lobos, malo / medio / bueno | 8 / 40 / 40 | 8 / 40 / 40 |
| Tejedora de Tormentas: mayor grupo de lobos preparado, malo | 20 | 20 |
| Tejedora de Tormentas: arena, victorias malo / medio / bueno | 100 % / 100 % / 100 % | 100 % / 100 % / 100 % |
| Tejedora de Tormentas: tiempo para matar medio (medio) | 6,5 s | 6,6 s |
| Tejedora de Tormentas: recurso medio en combate | 68 % | 50 % |
| Tejedora de Tormentas: decisiones con un hechizo listo sin recurso | 0 % | 6 % |
| Tejedora de Tormentas: nivel a los 30 min / al final | 11,8 / 15,3 | 8,4 / 10,8 |
| Tejedora de Tormentas: minuto del nivel 10 | 19,6 | 48,0 |
| Tejedora de Tormentas: muertes por hora de granja | 0,0 | 0,0 |
| Tejedora de Tormentas: oro neto por minuto | 119,0 | 69,9 |
| Niveles que da la primera arena | 1 | 1 |
| Minutos de combate para lo más caro de la tienda | 1,7 (Amuleto de la tortuga de musgo) | 11,5 (Amuleto de la tortuga de musgo) |
| Mediana de minutos de combate por objeto de la tienda | 0,2 | 1,3 |
| Pesca al 80 %: monedas por minuto | 29,1 | 20,2 |

Veredicto de cada hechizo con los ajustes: Tajo ígneo: importante; Embestida: importante; Remolino de brasas: obligatorio; Grito de hierro: importante; Marca ardiente: importante; Baluarte: importante; Chispa: obligatorio; Lanza glacial: importante; Nova de escarcha: prescindible; Paso del relámpago: prescindible; Campo estático: normal; Arco voltaico: importante.

### 8.2 Cada ajuste por separado (batería reducida)

Batería con 4 semillas, escaleras con 3 y granja de 30 min, comparada con la línea base medida igual. «—» = no se llega en esa granja.

| Medida (Vanguardia / Tejedora) | Base | armadura | recurso | hechizos | xp | economia |
| --- | --- | --- | --- | --- | --- | --- |
| Muertes en grupos, malo | 0 % / 6 % | 0 % / 6 % | 0 % / 6 % | 0 % / 6 % | 1 % / 19 % | 0 % / 6 % |
| Vida perdida por combate, malo | 24 / 56 | 31 / 56 | 25 / 56 | 19 / 56 | 24 / 50 | 25 / 55 |
| Vida perdida por combate, bueno | 1 / 1 | 1 / 1 | 1 / 1 | 1 / 1 | 1 / 2 | 1 / 1 |
| Lobos, malo | 16 / 8 | 12 / 8 | 12 / 8 | 16 / 8 | 12 / 0 | 16 / 8 |
| Tiempo para matar (medio) | 7,5 / 6,3 | 7,5 / 6,3 | 7,3 / 6,3 | 7,4 / 6,3 | 7,5 / 6,4 | 7,5 / 6,3 |
| Recurso medio | 71 % / 69 % | 71 % / 69 % | 66 % / 60 % | 71 % / 70 % | 67 % / 59 % | 71 % / 69 % |
| Hechizo listo sin recurso | 2 % / 0 % | 2 % / 0 % | 4 % / 5 % | 2 % / 0 % | 2 % / 0 % | 2 % / 0 % |
| Minuto del nivel 10 | 19 / 19 | 19 / 19 | 20 / 19 | 19 / 19 | — / — | 19 / 19 |
| Oro neto/min | 137 / 119 | 137 / 119 | 122 / 111 | 137 / 119 | 124 / 129 | 80 / 68 |
| Min. para lo más caro | 1,6 | 1,6 | 1,8 | 1,6 | 1,7 | 11,3 |

## 9. Límites de esta medición

- El bot es constante: apunta sin errores, nunca se equivoca de tecla y reacciona siempre en 0,3 s. Un jugador real «malo» falla en más cosas que esquivar; uno «bueno» también usa el terreno. Los números son una cota optimista del daño y pesimista del tiempo que se pierde.
- Sólo se mide lo que hay: 6 arquetipos de nivel 1–4 y un único encuentro (la arena). La granja supone que la arena reaparece; en el juego todavía no lo hace.
- Vender y comprar son instantáneos (no se camina al pueblo). La pesca no se combina con mascotas.
- Las mascotas no reciben golpes (así está el juego); el zorro aporta poco daño.
- Los hechizos de huida (Paso del relámpago) valen más para una persona que para el bot, que se aparta andando muy bien: su veredicto es el más dudoso.
- La regla de equipo es una suma ponderada fija; no busca sets ni sinergias.
- No se probó ninguna fórmula nueva (armadura porcentual, XP por diferencia de nivel): sólo cambios de números en datos.
