# Equilibrio del contenido — octubre de 2026

> Generado por `npm run balance` (`scripts/balance/`) el 2026-10-31, en 123 s. **No editar a mano:** se sobrescribe al regenerarlo.
> Datos de `data/` con huella `91666499`. Todas las cifras de juego son PROPUESTA; este informe no cambia ninguna.

## Resumen

- **Clase más fuerte: Vanguardia de Brasa; más débil: Tejedora de Tormentas.** Sin esquivar, la primera vence grupos de hasta 8 lobos y 12 goblins y la segunda 8 y 6; muere en el 14 % de los grupos y jefes frente al 15 %. La diferencia es pequeña (×1,4); en tiempo para matar están a +27 %.
- **Con habilidad media o buena se muere poco:** como mucho el 17 % de las partidas de un escenario. La arena se gana el 100 % de las veces incluso sin esquivar nada. **El contenido actual es fácil para las dos clases.**
- **Habilidad (Vanguardia de Brasa):** quien esquiva el 90 % pierde 12,4 de vida por combate y quien no esquiva 81,1 (×6,5). Esquivar le deja vencer grupos de 40 lobos en vez de 8; prepararse (nivel 4 y buen equipo) sin esquivar, 30. Ejecución y preparación pesan, la ejecución más.
- **Habilidad (Tejedora de Tormentas):** quien esquiva el 90 % pierde 4,7 de vida por combate y quien no esquiva 61,7 (×13,2). Esquivar le deja vencer grupos de 40 lobos en vez de 8; prepararse (nivel 4 y buen equipo) sin esquivar, 12. Ejecución y preparación pesan, la ejecución más.
- **Hechizos obligatorios** (sin ellos el combate dura ≥ 15 % más): Embestida (+19 %); Remolino de brasas (+58 %); Chispa (+162 %).
- **Ataque básico:** es el 50 % de los lanzamientos: rellena los huecos del enfriamiento global.
- **El recurso sobra:** sólo en el 0 % de las decisiones en combate había un hechizo listo que no se podía pagar, y el recurso medio está al 90 %. Mandan los enfriamientos; con DEC-2026-004 (recurso + enfriamientos) el recurso debería pesar más. Los combates duran menos de 20 s y empiezan con el recurso lleno, así que pesa más el máximo que la regeneración.
- **Curva de XP:** la primera arena da 175 XP y el nivel 2 pide 50, así que se sube en mitad del primer combate; **subir de nivel cura vida y recurso del todo**, lo que salva combates perdidos. Repitiendo la arena se llega al nivel 5 en 3 min, al 10 en 19 min y al 15,9 en 60 min.
- **Los enemigos no escalan:** son de nivel 1–98 y dan la misma XP a un personaje de cualquier nivel, así que la curva sólo mide horas de repetir lo mismo. Falta contenido de más nivel o una regla de XP por diferencia de nivel (decisión de diseño, no de números).
- **Los precios están rotos (demasiado baratos):** se ganan ~142 monedas por minuto y lo más caro de la tienda (Amuleto de la tortuga de musgo, 210) cuesta 1,5 min de combate; la mitad de la tienda cuesta menos de 13 s. En la granja se beben 0,0 pociones por hora: el oro no tiene en qué gastarse.
- **Pesca:** reaccionando al 80 % da 29 monedas por minuto, el 21 % de lo que da combatir. Es una actividad tranquila, no una alternativa económica.

**Ajustes propuestos** (§8, sin aplicar): resistencias físicas más cortas; recurso más justo; baluarte y paso del relámpago, más útiles; curva de xp más lenta al principio; menos oro por combate y precios de tienda más altos. Con todos a la vez, la Vanguardia de Brasa sin esquivar vence hasta 0 lobos (ahora 8) y esquivando 40; la Tejedora de Tormentas sin esquivar vence hasta 0 lobos (ahora 8) y esquivando 40; la arena sigue ganándose con habilidad media (100 % / 100 %).

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
| Arena del Slice 01 (7 enemigos repartidos) | 100 % · 33,2 s · 101 | 100 % · 33,3 s · 52 | 100 % · 34,8 s · 11 | 100 % · 26,6 s · 39 | 100 % · 27,8 s · 19 | 100 % · 27,7 s · 5 |
| 1 lobo | 100 % · 1,9 s · 5 | 100 % · 1,9 s · 4 | 100 % · 1,9 s · 1 | 100 % · 1,6 s · 0 | 100 % · 1,6 s · 0 | 100 % · 1,6 s · 0 |
| 3 lobos | 100 % · 6,3 s · 31 | 100 % · 6,7 s · 15 | 100 % · 7,2 s · 6 | 100 % · 4,2 s · 20 | 100 % · 4,7 s · 3 | 100 % · 4,8 s · 0 |
| 5 lobos | 100 % · 9,4 s · 93 | 100 % · 9,2 s · 30 | 100 % · 9,6 s · 4 | 100 % · 7,1 s · 59 | 100 % · 7,2 s · 8 | 100 % · 7,7 s · 1 |
| 8 lobos | 50 % · 11,3 s · 174 | 100 % · 10,3 s · 46 | 100 % · 12,8 s · 4 | 83 % · 10,0 s · 134 | 100 % · 11,4 s · 24 | 100 % · 12,9 s · 2 |
| 1 goblin | 100 % · 1,7 s · 0 | 100 % · 1,7 s · 0 | 100 % · 1,7 s · 0 | 100 % · 1,7 s · 0 | 100 % · 1,7 s · 0 | 100 % · 2,0 s · 0 |
| 2 goblins | 100 % · 5,0 s · 5 | 100 % · 5,1 s · 5 | 100 % · 5,2 s · 1 | 100 % · 3,4 s · 15 | 100 % · 3,6 s · 9 | 100 % · 3,6 s · 1 |
| 4 goblins | 100 % · 7,0 s · 42 | 100 % · 7,4 s · 16 | 100 % · 7,4 s · 0 | 100 % · 5,8 s · 58 | 100 % · 6,9 s · 11 | 100 % · 7,1 s · 1 |
| 6 goblins | 100 % · 8,8 s · 90 | 100 % · 9,6 s · 12 | 100 % · 10,3 s · 0 | 67 % · 8,2 s · 124 | 100 % · 9,6 s · 19 | 100 % · 10,9 s · 1 |
| 1 chamán | 100 % · 1,9 s · 0 | 100 % · 1,9 s · 0 | 100 % · 1,9 s · 0 | 100 % · 1,7 s · 0 | 100 % · 1,7 s · 0 | 100 % · 1,7 s · 0 |
| 2 chamanes | 100 % · 6,8 s · 15 | 100 % · 6,8 s · 13 | 100 % · 6,8 s · 10 | 100 % · 4,2 s · 0 | 100 % · 4,2 s · 0 | 100 % · 4,2 s · 0 |
| 3 chamanes | 100 % · 11,6 s · 27 | 100 % · 10,8 s · 22 | 100 % · 11,2 s · 14 | 100 % · 6,2 s · 2 | 100 % · 6,2 s · 1 | 100 % · 7,2 s · 1 |
| 2 lobos + goblin + chamán | 100 % · 9,5 s · 54 | 100 % · 9,1 s · 30 | 100 % · 9,2 s · 8 | 100 % · 7,4 s · 46 | 100 % · 8,1 s · 18 | 100 % · 9,6 s · 11 |
| Lobo alfa + 2 lobos | 100 % · 12,2 s · 104 | 100 % · 12,4 s · 51 | 100 % · 12,2 s · 13 | 92 % · 6,6 s · 71 | 100 % · 7,3 s · 12 | 100 % · 7,6 s · 2 |
| Lobo alfa + 4 lobos | 92 % · 15,8 s · 180 | 100 % · 14,2 s · 85 | 100 % · 14,6 s · 19 | 75 % · 8,8 s · 127 | 100 % · 9,8 s · 30 | 100 % · 11,5 s · 1 |
| Lobo alfa + 2 lobos + veterano | 75 % · 13,8 s · 170 | 100 % · 16,5 s · 111 | 100 % · 14,5 s · 18 | 67 % · 9,0 s · 137 | 100 % · 11,2 s · 53 | 100 % · 11,4 s · 16 |
| Lobo alfa + 6 lobos | 42 % · 16,5 s · 196 | 100 % · 15,9 s · 93 | 100 % · 15,6 s · 30 | 58 % · 12,4 s · 150 | 100 % · 12,5 s · 36 | 100 % · 14,6 s · 4 |
| 2 lobos alfa + 2 veteranos + 2 lobos | 0 % · — s · 174 | 83 % · 23,0 s · 183 | 100 % · 25,1 s · 85 | 0 % · — s · 128 | 83 % · 19,8 s · 114 | 100 % · 21,2 s · 39 |

### 2.2 Lo mismo, preparado (nivel 4, puntos y mejor equipo de nivel ≤ 4)

| Escenario | Vanguardia de Brasa malo | Vanguardia de Brasa medio | Vanguardia de Brasa bueno | Tejedora de Tormentas malo | Tejedora de Tormentas medio | Tejedora de Tormentas bueno |
| --- | --- | --- | --- | --- | --- | --- |
| Arena del Slice 01 (7 enemigos repartidos) | 100 % · 20,0 s · 1 | 100 % · 21,2 s · 1 | 100 % · 22,4 s · 0 | 100 % · 21,1 s · 0 | 100 % · 21,0 s · 0 | 100 % · 20,5 s · 0 |
| 1 lobo | 100 % · 1,1 s · 0 | 100 % · 1,1 s · 0 | 100 % · 1,1 s · 0 | 100 % · 1,2 s · 0 | 100 % · 1,2 s · 0 | 100 % · 1,2 s · 0 |
| 3 lobos | 100 % · 3,0 s · 4 | 100 % · 3,5 s · 2 | 100 % · 3,6 s · 0 | 100 % · 2,3 s · 0 | 100 % · 2,5 s · 0 | 100 % · 2,3 s · 0 |
| 5 lobos | 100 % · 5,1 s · 15 | 100 % · 5,6 s · 5 | 100 % · 5,8 s · 2 | 100 % · 3,9 s · 1 | 100 % · 4,0 s · 2 | 100 % · 4,8 s · 1 |
| 8 lobos | 100 % · 6,5 s · 47 | 100 % · 7,5 s · 11 | 100 % · 7,8 s · 2 | 100 % · 6,3 s · 29 | 100 % · 6,5 s · 6 | 100 % · 7,2 s · 0 |
| 1 goblin | 100 % · 1,1 s · 0 | 100 % · 1,1 s · 0 | 100 % · 1,1 s · 0 | 100 % · 0,4 s · 0 | 100 % · 0,4 s · 0 | 100 % · 0,4 s · 0 |
| 2 goblins | 100 % · 3,4 s · 2 | 100 % · 3,4 s · 2 | 100 % · 3,8 s · 0 | 100 % · 1,8 s · 1 | 100 % · 1,8 s · 1 | 100 % · 1,8 s · 0 |
| 4 goblins | 100 % · 4,3 s · 10 | 100 % · 4,9 s · 4 | 100 % · 5,3 s · 0 | 100 % · 3,4 s · 24 | 100 % · 3,8 s · 3 | 100 % · 3,8 s · 0 |
| 6 goblins | 100 % · 6,0 s · 38 | 100 % · 6,8 s · 9 | 100 % · 7,1 s · 0 | 100 % · 5,0 s · 58 | 100 % · 5,5 s · 12 | 100 % · 5,5 s · 1 |
| 1 chamán | 100 % · 1,1 s · 0 | 100 % · 1,1 s · 0 | 100 % · 1,1 s · 0 | 100 % · 1,2 s · 0 | 100 % · 1,2 s · 0 | 100 % · 1,2 s · 0 |
| 2 chamanes | 100 % · 3,2 s · 1 | 100 % · 3,3 s · 0 | 100 % · 3,3 s · 0 | 100 % · 1,8 s · 0 | 100 % · 1,8 s · 0 | 100 % · 1,8 s · 0 |
| 3 chamanes | 100 % · 5,6 s · 1 | 100 % · 5,6 s · 0 | 100 % · 5,6 s · 0 | 100 % · 4,2 s · 0 | 100 % · 4,2 s · 0 | 100 % · 4,2 s · 0 |
| 2 lobos + goblin + chamán | 100 % · 4,8 s · 8 | 100 % · 4,9 s · 5 | 100 % · 5,7 s · 1 | 100 % · 4,2 s · 7 | 100 % · 4,3 s · 5 | 100 % · 5,0 s · 2 |
| Lobo alfa + 2 lobos | 100 % · 4,7 s · 15 | 100 % · 5,3 s · 7 | 100 % · 5,8 s · 1 | 100 % · 3,9 s · 3 | 100 % · 4,0 s · 1 | 100 % · 4,0 s · 0 |
| Lobo alfa + 4 lobos | 100 % · 6,1 s · 34 | 100 % · 7,5 s · 14 | 100 % · 7,5 s · 3 | 100 % · 4,9 s · 20 | 100 % · 5,2 s · 7 | 100 % · 5,7 s · 1 |
| Lobo alfa + 2 lobos + veterano | 100 % · 5,8 s · 29 | 100 % · 6,7 s · 11 | 100 % · 7,4 s · 3 | 100 % · 5,0 s · 30 | 100 % · 5,3 s · 17 | 100 % · 5,8 s · 0 |
| Lobo alfa + 6 lobos | 100 % · 8,0 s · 58 | 100 % · 8,5 s · 25 | 100 % · 8,7 s · 1 | 100 % · 6,3 s · 44 | 100 % · 6,6 s · 7 | 100 % · 7,4 s · 1 |
| 2 lobos alfa + 2 veteranos + 2 lobos | 100 % · 9,3 s · 118 | 100 % · 10,5 s · 42 | 100 % · 12,0 s · 13 | 100 % · 9,4 s · 147 | 100 % · 9,4 s · 30 | 100 % · 9,4 s · 5 |

### 2.3 Detalle con habilidad media (nivel 1)

**Vanguardia de Brasa**

| Escenario | DPS | DPS mascota | Daño entrante | Vida perdida | Golpes/avisos | Pociones | Tónicos | Recurso medio | Recurso lleno | Listo sin recurso | XP/min | Oro/min |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Arena del Slice 01 (7 enemigos repartidos) | 13,8 | 1,6 | 51,5 | 51,5 | 10 % | 0,00 | 0,00 | 91 % | 46 % | 0 % | 314 | 152 |
| 1 lobo | 30,1 | 1,9 | 4,0 | 4,0 | 31 % | 0,00 | 0,00 | 83 % | 27 % | 0 % | 395 | 87 |
| 3 lobos | 29,3 | 3,2 | 14,5 | 14,5 | 24 % | 0,00 | 0,00 | 85 % | 30 % | 0 % | 397 | 77 |
| 5 lobos | 33,0 | 3,3 | 29,5 | 29,5 | 15 % | 0,00 | 0,00 | 88 % | 41 % | 0 % | 444 | 119 |
| 8 lobos | 46,3 | 3,4 | 46,4 | 46,4 | 14 % | 0,00 | 0,00 | 90 % | 43 % | 0 % | 624 | 156 |
| 1 goblin | 27,8 | 1,4 | 0,0 | 0,0 | 0 % | 0,00 | 0,00 | 88 % | 39 % | 0 % | 656 | 301 |
| 2 goblins | 17,8 | 1,5 | 4,6 | 4,6 | 11 % | 0,00 | 0,00 | 85 % | 20 % | 0 % | 443 | 194 |
| 4 goblins | 22,7 | 2,0 | 16,1 | 16,1 | 12 % | 0,00 | 0,00 | 87 % | 38 % | 0 % | 563 | 245 |
| 6 goblins | 25,7 | 2,4 | 12,0 | 12,0 | 4 % | 0,00 | 0,00 | 86 % | 33 % | 0 % | 652 | 286 |
| 1 chamán | 29,1 | 1,8 | 0,0 | 0,0 | 0 % | 0,00 | 0,00 | 86 % | 33 % | 0 % | 932 | 704 |
| 2 chamanes | 21,7 | 2,0 | 12,6 | 12,6 | 10 % | 0,00 | 0,00 | 86 % | 35 % | 0 % | 587 | 335 |
| 3 chamanes | 24,9 | 2,3 | 21,8 | 21,8 | 28 % | 0,00 | 0,00 | 87 % | 38 % | 0 % | 627 | 346 |
| 2 lobos + goblin + chamán | 26,1 | 3,0 | 30,0 | 30,0 | 19 % | 0,00 | 0,00 | 87 % | 36 % | 0 % | 524 | 236 |
| Lobo alfa + 2 lobos | 19,3 | 2,8 | 50,8 | 50,8 | 22 % | 0,17 | 0,00 | 88 % | 38 % | 0 % | 348 | 173 |
| Lobo alfa + 4 lobos | 26,0 | 3,0 | 85,1 | 85,1 | 21 % | 0,25 | 0,00 | 90 % | 46 % | 0 % | 422 | 167 |
| Lobo alfa + 2 lobos + veterano | 19,4 | 2,7 | 110,8 | 110,8 | 22 % | 0,42 | 0,00 | 90 % | 48 % | 0 % | 398 | 222 |
| Lobo alfa + 6 lobos | 31,8 | 3,1 | 92,5 | 92,5 | 18 % | 0,42 | 0,00 | 91 % | 47 % | 0 % | 496 | 194 |
| 2 lobos alfa + 2 veteranos + 2 lobos | 22,8 | 2,7 | 182,5 | 182,5 | 16 % | 1,33 | 0,00 | 90 % | 42 % | 0 % | 467 | 254 |

**Tejedora de Tormentas**

| Escenario | DPS | DPS mascota | Daño entrante | Vida perdida | Golpes/avisos | Pociones | Tónicos | Recurso medio | Recurso lleno | Listo sin recurso | XP/min | Oro/min |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Arena del Slice 01 (7 enemigos repartidos) | 17,9 | 0,9 | 18,6 | 18,6 | 0 % | 0,00 | 0,00 | 96 % | 10 % | 0 % | 379 | 197 |
| 1 lobo | 38,3 | 2,5 | 0,0 | 0,0 | 0 % | 0,00 | 0,00 | 96 % | 1 % | 0 % | 476 | 113 |
| 3 lobos | 40,8 | 3,3 | 3,0 | 3,0 | 14 % | 0,00 | 0,00 | 87 % | 0 % | 0 % | 541 | 136 |
| 5 lobos | 44,3 | 3,4 | 8,3 | 8,3 | 7 % | 0,00 | 0,00 | 87 % | 9 % | 0 % | 586 | 151 |
| 8 lobos | 46,1 | 3,5 | 24,2 | 24,2 | 9 % | 0,08 | 0,00 | 91 % | 6 % | 0 % | 584 | 123 |
| 1 goblin | 27,7 | 1,6 | 0,0 | 0,0 | 0 % | 0,00 | 0,00 | 96 % | 1 % | 0 % | 610 | 246 |
| 2 goblins | 26,9 | 1,2 | 9,2 | 9,2 | 23 % | 0,00 | 0,00 | 95 % | 2 % | 0 % | 621 | 256 |
| 4 goblins | 29,0 | 2,1 | 10,9 | 10,9 | 7 % | 0,00 | 0,00 | 95 % | 11 % | 0 % | 653 | 254 |
| 6 goblins | 29,8 | 2,7 | 18,8 | 18,8 | 6 % | 0,17 | 0,00 | 96 % | 9 % | 0 % | 677 | 334 |
| 1 chamán | 31,5 | 1,8 | 0,0 | 0,0 | 0 % | 0,00 | 0,00 | 96 % | 1 % | 0 % | 993 | 728 |
| 2 chamanes | 36,0 | 2,4 | 0,0 | 0,0 | 0 % | 0,00 | 0,00 | 90 % | 1 % | 0 % | 974 | 573 |
| 3 chamanes | 38,2 | 2,6 | 1,4 | 1,4 | 15 % | 0,00 | 0,00 | 94 % | 11 % | 0 % | 941 | 626 |
| 2 lobos + goblin + chamán | 31,6 | 2,7 | 17,5 | 17,5 | 16 % | 0,00 | 0,00 | 87 % | 8 % | 0 % | 578 | 253 |
| Lobo alfa + 2 lobos | 36,2 | 3,1 | 12,0 | 12,0 | 9 % | 0,00 | 0,00 | 85 % | 6 % | 0 % | 597 | 243 |
| Lobo alfa + 4 lobos | 40,6 | 3,1 | 30,3 | 30,3 | 10 % | 0,08 | 0,00 | 87 % | 7 % | 0 % | 609 | 210 |
| Lobo alfa + 2 lobos + veterano | 32,1 | 2,7 | 53,1 | 53,1 | 18 % | 0,17 | 0,00 | 89 % | 7 % | 0 % | 607 | 281 |
| Lobo alfa + 6 lobos | 40,9 | 3,4 | 35,6 | 35,6 | 12 % | 0,08 | 0,00 | 89 % | 6 % | 0 % | 604 | 230 |
| 2 lobos alfa + 2 veteranos + 2 lobos | 28,7 | 2,7 | 113,8 | 113,8 | 10 % | 1,17 | 0,00 | 91 % | 5 % | 0 % | 568 | 272 |

*XP/min y oro/min* son del tiempo de combate solo (sin desplazarse ni descansar); el ritmo real está en la granja (§5 y §7). El oro incluye el valor de venta de lo que se recoge.

### 2.4 Escaleras: mayor grupo que se vence la mitad de las veces

| Prueba | Clase | Preparación | malo | medio | bueno |
| --- | --- | --- | --- | --- | --- |
| lobos | Vanguardia de Brasa | inicial | 8 | ≥ 40 | ≥ 40 |
| lobos | Vanguardia de Brasa | preparado | 30 | ≥ 40 | ≥ 40 |
| lobos | Tejedora de Tormentas | inicial | 8 | ≥ 40 | ≥ 40 |
| lobos | Tejedora de Tormentas | preparado | 12 | ≥ 40 | ≥ 40 |
| goblins | Vanguardia de Brasa | inicial | 12 | ≥ 30 | ≥ 30 |
| goblins | Vanguardia de Brasa | preparado | 20 | ≥ 30 | ≥ 30 |
| goblins | Tejedora de Tormentas | inicial | 6 | ≥ 30 | ≥ 30 |
| goblins | Tejedora de Tormentas | preparado | 9 | ≥ 30 | ≥ 30 |

Tamaños probados: lobos 8, 12, 16, 20, 25, 30, 40; goblins 6, 9, 12, 16, 20, 25, 30. «≥ N» = gana incluso el mayor.

### 2.5 Resumen por clase

| Clase | DPS (medio) | Tiempo para matar medio | Parte de la mascota | Muertes malo / medio / bueno | Vida perdida malo / medio / bueno |
| --- | --- | --- | --- | --- | --- |
| Vanguardia de Brasa | 26,7 | 9,5 s | 9 % | 14 % / 1 % / 0 % | 81,1 / 42,5 / 12,4 |
| Tejedora de Tormentas | 35,2 | 7,5 s | 7 % | 15 % / 1 % / 0 % | 61,7 / 19,8 / 4,7 |

## 3. Hechizos

Uso con habilidad media, nivel 1, en todos los escenarios. *Ablación*: la misma batería reducida (arena, lobos8, goblins6, chaman3, alfa6, dobleAlfa; 8 semillas) con ese hueco vacío; Δ = cambio frente a la barra completa.

| Clase | Hechizo | % lanzamientos | % daño directo | Lanzamientos/min | Δ tiempo sin él | Δ vida perdida sin él | Δ victorias | Veredicto |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Vanguardia de Brasa | Ataque básico (arma) | 61,7 % | 42,5 % | 46,8 | — | — | — | — |
| Vanguardia de Brasa | Embestida | 13,2 % | 18,0 % | 10,0 | +19 % | +15 % (+9,5) | +2 pts | obligatorio |
| Vanguardia de Brasa | Remolino de brasas | 16,9 % | 34,4 % | 12,8 | +58 % | +87 % (+54,8) | −13 pts | obligatorio |
| Vanguardia de Brasa | Grito de hierro | 8,2 % | 0,0 % | 6,2 | +7 % | +33 % (+20,7) | +0 pts | importante |
| Tejedora de Tormentas | Ataque básico (arma) | 38,0 % | 18,8 % | 44,2 | — | — | — | — |
| Tejedora de Tormentas | Chispa | 51,7 % | 70,8 % | 60,2 | +162 % | +295 % (+85,5) | −27 pts | obligatorio |
| Tejedora de Tormentas | Nova de escarcha | 3,7 % | 10,5 % | 4,3 | +4 % | +15 % (+4,4) | +2 pts | normal |
| Tejedora de Tormentas | Foco de tormenta | 6,6 % | 0,0 % | 7,7 | +1 % | +28 % (+8,1) | −2 pts | importante |

El daño de la Quemadura (Marca ardiente, Remolino) cuenta aparte como «estado»; por eso la Marca parece hacer poco daño directo. Veredictos: *obligatorio* = sin él se pierden ≥ 10 puntos de victorias o el combate dura ≥ 15 % más; *importante* = dura ≥ 5 % más o se pierde ≥ 25 % más de vida; *prescindible* = menos del 6 % de los lanzamientos y quitarlo no cambia nada que se note (≤ 3 % de tiempo, ≤ 12 % de vida). Los cambios de vida de menos de 5 puntos por combate no cuentan (con tan poco daño, un +100 % son 3 puntos).

Daño de estados (Quemadura) sobre el total del jugador: 2,4 %.

### 3.1 Hechizos universales en lugar del hechizo de clase menos útil

| Clase | Universal | Sustituye a | Δ tiempo para matar | Δ vida perdida |
| --- | --- | --- | --- | --- |
| Vanguardia de Brasa | Esquirla de escarcha | Grito de hierro | +7 % | +33 % (+20,7) |
| Vanguardia de Brasa | Vendaje de luz | Grito de hierro | +12 % | +34 % (+21,2) |
| Vanguardia de Brasa | Piel de piedra | Grito de hierro | +40 % | +57 % (+36,0) |
| Vanguardia de Brasa | Espíritu lobuno | Grito de hierro | +57 % | +62 % (+38,9) |
| Vanguardia de Brasa | Ráfaga | Grito de hierro | +6 % | +24 % (+14,8) |
| Vanguardia de Brasa | Eco del instante | Grito de hierro | +40 % | +57 % (+36,0) |
| Vanguardia de Brasa | Égida quieta | Grito de hierro | +40 % | +57 % (+36,0) |
| Tejedora de Tormentas | Esquirla de escarcha | Foco de tormenta | +141 % | +275 % (+79,6) |
| Tejedora de Tormentas | Vendaje de luz | Foco de tormenta | +2 % | +30 % (+8,7) |
| Tejedora de Tormentas | Piel de piedra | Foco de tormenta | +144 % | +252 % (+73,1) |
| Tejedora de Tormentas | Espíritu lobuno | Foco de tormenta | +160 % | +256 % (+74,0) |
| Tejedora de Tormentas | Ráfaga | Foco de tormenta | +18 % | +85 % (+24,6) |
| Tejedora de Tormentas | Eco del instante | Foco de tormenta | +144 % | +252 % (+73,1) |
| Tejedora de Tormentas | Égida quieta | Foco de tormenta | +144 % | +252 % (+73,1) |

## 4. ¿Importa la habilidad? (preparación + ejecución)

| Clase | Golpes/avisos malo / medio / bueno | Vida perdida malo / medio / bueno | Lobos (inicial) malo / medio / bueno | Lobos preparado malo / medio / bueno | Arena malo / medio / bueno |
| --- | --- | --- | --- | --- | --- |
| Vanguardia de Brasa | 44 % / 15 % / 3 % | 81,1 / 42,5 / 12,4 | 8 / 40 / 40 | 30 / 40 / 40 | 100 % / 100 % / 100 % |
| Tejedora de Tormentas | 40 % / 9 % / 1 % | 61,7 / 19,8 / 4,7 | 8 / 40 / 40 | 12 / 40 / 40 | 100 % / 100 % / 100 % |

Lectura: la *ejecución* es la columna de habilidad; la *preparación* es pasar de inicial a preparado con la habilidad fija. Si una clase gana lo mismo sin esquivar que esquivando, la ejecución no pesa; si gana lo mismo con o sin equipo, la preparación no pesa.

## 5. Progresión (XP)

Granja: la arena del Slice 01 (único encuentro del mundo, 175 XP) se repite durante 60 min como si reapareciera, arrastrando la vida y el recurso entre pasadas, recogiendo el botín, equipándose, vendiendo y descansando hasta el 80 %. Morir cuesta 30 s. 2 semillas por clase y habilidad.

Fórmula: xpToNext(n) = round(50 · n^1.5); nivel máximo 20.

| Nivel | XP del anterior a este | XP total | Arenas | Minuto (Vanguardia de Brasa, medio) | Minuto (Tejedora de Tormentas, medio) |
| --- | --- | --- | --- | --- | --- |
| 2 | 50 | 50 | 0,3 | 0,3 | 0,2 |
| 3 | 141 | 191 | 1,1 | 0,9 | 0,8 |
| 4 | 260 | 451 | 2,6 | 1,6 | 1,7 |
| 5 | 400 | 851 | 4,9 | 2,9 | 3,0 |
| 6 | 559 | 1410 | 8,1 | 4,7 | 5,1 |
| 8 | 926 | 3071 | 17,5 | 9,5 | 10,4 |
| 10 | 1350 | 5552 | 31,7 | 17,9 | 19,5 |
| 12 | 1824 | 8957 | 51,2 | 28,7 | 31,9 |
| 15 | 2619 | 15998 | 91,4 | 49,0 | 55,5 |
| 18 | 3505 | 25608 | 146,3 | > 60 | > 60 |
| 20 | 4141 | 33567 | 191,8 | > 60 | > 60 |

### 5.1 Nivel alcanzado en N minutos

| Clase | Habilidad | 5 min | 10 min | 20 min | 30 min | 45 min | 60 min | Pasadas | Muertes | Descanso |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Vanguardia de Brasa | malo | 6,2 | 8,0 | 10,3 | 12,0 | 14,2 | 16,0 | 108 | 0,0 | 0 s |
| Vanguardia de Brasa | medio | 6,2 | 8,1 | 10,5 | 12,2 | 14,5 | 16,3 | 113 | 0,0 | 4 s |
| Vanguardia de Brasa | bueno | 6,0 | 7,9 | 10,1 | 11,9 | 13,9 | 15,7 | 102 | 0,0 | 1 s |
| Tejedora de Tormentas | malo | 5,8 | 7,7 | 10,0 | 11,6 | 13,6 | 15,3 | 96 | 0,0 | 20 s |
| Tejedora de Tormentas | medio | 6,0 | 7,9 | 10,1 | 11,7 | 13,8 | 15,5 | 99 | 0,0 | 0 s |
| Tejedora de Tormentas | bueno | 6,0 | 7,9 | 10,2 | 11,8 | 13,8 | 15,5 | 100 | 0,0 | 0 s |

Nivel con decimales: 7,5 = a mitad de camino del 8.

## 6. Botín por rareza

Objetos que existen por rareza: common 27, uncommon 37, rare 37, epic 18, legendary 1.

| Clase | Habilidad | common/min | uncommon/min | rare/min | epic/min | legendary/min | Minutos por objeto raro | Minutos por épico |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Vanguardia de Brasa | malo | 13,38 | 5,64 | 0,41 | 0,02 | 0,00 | 2,4 | 60 |
| Vanguardia de Brasa | medio | 13,99 | 5,63 | 0,46 | 0,03 | 0,00 | 2,2 | 30 |
| Vanguardia de Brasa | bueno | 12,66 | 5,42 | 0,38 | 0,01 | 0,00 | 2,7 | 120 |
| Tejedora de Tormentas | malo | 11,69 | 4,74 | 0,42 | 0,03 | 0,00 | 2,4 | 40 |
| Tejedora de Tormentas | medio | 12,05 | 4,97 | 0,45 | 0,02 | 0,00 | 2,2 | 60 |
| Tejedora de Tormentas | bueno | 12,32 | 4,95 | 0,42 | 0,02 | 0,00 | 2,4 | 60 |

Cuenta todo lo que cae al suelo en la granja (pociones y materiales incluidos), por minuto de granja (con desplazamientos y descansos).

## 7. Economía

### 7.1 Ingresos por minuto

| Fuente | Monedas/min | Ventas/min | Neto/min |
| --- | --- | --- | --- |
| Granja, Vanguardia de Brasa (medio) | 81,0 | 73,6 | 154,5 |
| Granja, Tejedora de Tormentas (medio) | 67,7 | 61,8 | 129,5 |
| Pesca, reacciona al 50 % (3,5 capturas/min) | — | — | 14,9 |
| Pesca, reacciona al 80 % (6,1 capturas/min) | — | — | 29,1 |
| Pesca, reacciona al 95 % (7,5 capturas/min) | — | — | 33,4 |

Ventas = vender a la herrera lo que no se usa (materiales, equipo que no mejora, amuletos repetidos, peces). Neto = monedas + ventas − pociones compradas. La pesca cuenta las monedas que traen los peces y el valor de venta de todo lo pescado; los peces que curan también podrían beberse.

### 7.2 Lo que cuesta cada objeto de la tienda

| Mercader | Objeto | Rareza | Nivel | Precio | Minutos de combate | Minutos de pesca (80 %) |
| --- | --- | --- | --- | --- | --- | --- |
| Tobías Cardo | Poción de vida menor | common | 1 | 7 | 0,0 | 0,2 |
| Tobías Cardo | Bollo de maíz | common | 1 | 9 | 0,1 | 0,3 |
| Tobías Cardo | Trozo de raspadura | common | 1 | 10 | 0,1 | 0,3 |
| Tobías Cardo | Tónico de recurso | common | 1 | 12 | 0,1 | 0,4 |
| Tobías Cardo | Poción de vida | uncommon | 1 | 30 | 0,2 | 1,0 |
| Tobías Cardo | Elixir de prisa | uncommon | 1 | 38 | 0,3 | 1,3 |
| Tobías Cardo | Trago de pulso | uncommon | 1 | 42 | 0,3 | 1,4 |
| Tobías Cardo | Pergamino: Vendaje de luz | uncommon | 1 | 53 | 0,4 | 1,8 |
| Tobías Cardo | Pergamino: Ráfaga | uncommon | 1 | 53 | 0,4 | 1,8 |
| Tobías Cardo | Pergamino: Piel de piedra | uncommon | 1 | 53 | 0,4 | 1,8 |
| Tobías Cardo | Pergamino: Esquirla de escarcha | uncommon | 1 | 63 | 0,4 | 2,2 |
| Tobías Cardo | Poción de vida mayor | rare | 1 | 119 | 0,8 | 4,1 |
| Tobías Cardo | Amuleto de la tortuga de musgo | rare | 1 | 210 | 1,5 | 7,2 |
| Brunilda Yunque | Brazales de cuero | common | 1 | 12 | 0,1 | 0,4 |
| Brunilda Yunque | Botas de viajero | common | 1 | 12 | 0,1 | 0,4 |
| Brunilda Yunque | Chaleco acolchado | common | 1 | 13 | 0,1 | 0,4 |
| Brunilda Yunque | Espada corta | common | 1 | 20 | 0,1 | 0,7 |
| Brunilda Yunque | Yelmo de hierro | common | 2 | 20 | 0,1 | 0,7 |
| Brunilda Yunque | Rodela de roble | common | 2 | 21 | 0,1 | 0,7 |
| Brunilda Yunque | Bastón de roble | common | 1 | 23 | 0,2 | 0,8 |
| Brunilda Yunque | Varita de cobre | common | 1 | 23 | 0,2 | 0,8 |
| Brunilda Yunque | Capucha del Explorador | uncommon | 1 | 24 | 0,2 | 0,8 |
| Brunilda Yunque | Anillo de cobre | common | 1 | 24 | 0,2 | 0,8 |
| Brunilda Yunque | Cinturón de cabuya | common | 3 | 29 | 0,2 | 1,0 |
| Brunilda Yunque | Cuchillo de mondar | common | 2 | 31 | 0,2 | 1,1 |
| Brunilda Yunque | Rodela de totuma | common | 4 | 34 | 0,2 | 1,2 |
| Brunilda Yunque | Machete rozador | common | 3 | 37 | 0,3 | 1,3 |
| Brunilda Yunque | Sombrero de junco | common | 5 | 39 | 0,3 | 1,3 |
| Brunilda Yunque | Anillo de hueso de coco | common | 5 | 39 | 0,3 | 1,3 |
| Brunilda Yunque | Hacha de leñador | uncommon | 2 | 53 | 0,4 | 1,8 |
| Brunilda Yunque | Maza de herrero | uncommon | 3 | 63 | 0,4 | 2,2 |
| Brunilda Yunque | Brazales de concha | common | 15 | 90 | 0,6 | 3,1 |

Minutos de combate = precio ÷ 142,0 monedas netas por minuto (media de las clases en la granja, habilidad media).

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
| data/rpg/loot.json | `tables.chame_beast.gold.min` | 40 | 20 |
| data/rpg/loot.json | `tables.chame_beast.gold.max` | 80 | 40 |
| data/rpg/loot.json | `tables.chame_ranged.gold.min` | 30 | 15 |
| data/rpg/loot.json | `tables.chame_ranged.gold.max` | 60 | 30 |
| data/rpg/loot.json | `tables.chame_caster.gold.min` | 30 | 15 |
| data/rpg/loot.json | `tables.chame_caster.gold.max` | 70 | 35 |
| data/rpg/loot.json | `tables.chame_elite.gold.min` | 64 | 32 |
| data/rpg/loot.json | `tables.chame_elite.gold.max` | 128 | 64 |
| data/rpg/loot.json | `tables.boquete_beast.gold.min` | 40 | 20 |
| data/rpg/loot.json | `tables.boquete_beast.gold.max` | 80 | 40 |
| data/rpg/loot.json | `tables.boquete_ranged.gold.min` | 30 | 15 |
| data/rpg/loot.json | `tables.boquete_ranged.gold.max` | 60 | 30 |
| data/rpg/loot.json | `tables.boquete_caster.gold.min` | 30 | 15 |
| data/rpg/loot.json | `tables.boquete_caster.gold.max` | 70 | 35 |
| data/rpg/loot.json | `tables.boquete_elite.gold.min` | 64 | 32 |
| data/rpg/loot.json | `tables.boquete_elite.gold.max` | 128 | 64 |
| data/rpg/loot.json | `tables.cerro_punta_beast.gold.min` | 40 | 20 |
| data/rpg/loot.json | `tables.cerro_punta_beast.gold.max` | 80 | 40 |
| data/rpg/loot.json | `tables.cerro_punta_ranged.gold.min` | 30 | 15 |
| data/rpg/loot.json | `tables.cerro_punta_ranged.gold.max` | 60 | 30 |
| data/rpg/loot.json | `tables.cerro_punta_caster.gold.min` | 30 | 15 |
| data/rpg/loot.json | `tables.cerro_punta_caster.gold.max` | 70 | 35 |
| data/rpg/loot.json | `tables.cerro_punta_elite.gold.min` | 64 | 32 |
| data/rpg/loot.json | `tables.cerro_punta_elite.gold.max` | 128 | 64 |
| data/rpg/loot.json | `tables.baru_beast.gold.min` | 40 | 20 |
| data/rpg/loot.json | `tables.baru_beast.gold.max` | 80 | 40 |
| data/rpg/loot.json | `tables.baru_ranged.gold.min` | 30 | 15 |
| data/rpg/loot.json | `tables.baru_ranged.gold.max` | 60 | 30 |
| data/rpg/loot.json | `tables.baru_caster.gold.min` | 30 | 15 |
| data/rpg/loot.json | `tables.baru_caster.gold.max` | 70 | 35 |
| data/rpg/loot.json | `tables.baru_elite.gold.min` | 64 | 32 |
| data/rpg/loot.json | `tables.baru_elite.gold.max` | 128 | 64 |
| data/rpg/loot.json | `tables.darien_beast.gold.min` | 40 | 20 |
| data/rpg/loot.json | `tables.darien_beast.gold.max` | 80 | 40 |
| data/rpg/loot.json | `tables.darien_ranged.gold.min` | 30 | 15 |
| data/rpg/loot.json | `tables.darien_ranged.gold.max` | 60 | 30 |
| data/rpg/loot.json | `tables.darien_caster.gold.min` | 30 | 15 |
| data/rpg/loot.json | `tables.darien_caster.gold.max` | 70 | 35 |
| data/rpg/loot.json | `tables.darien_elite.gold.min` | 64 | 32 |
| data/rpg/loot.json | `tables.darien_elite.gold.max` | 128 | 64 |
| data/rpg/loot.json | `tables.bocas_beast.gold.min` | 40 | 20 |
| data/rpg/loot.json | `tables.bocas_beast.gold.max` | 80 | 40 |
| data/rpg/loot.json | `tables.bocas_ranged.gold.min` | 30 | 15 |
| data/rpg/loot.json | `tables.bocas_ranged.gold.max` | 60 | 30 |
| data/rpg/loot.json | `tables.bocas_caster.gold.min` | 30 | 15 |
| data/rpg/loot.json | `tables.bocas_caster.gold.max` | 70 | 35 |
| data/rpg/loot.json | `tables.bocas_elite.gold.min` | 64 | 32 |
| data/rpg/loot.json | `tables.bocas_elite.gold.max` | 128 | 64 |
| data/rpg/loot.json | `tables.perlas_beast.gold.min` | 40 | 20 |
| data/rpg/loot.json | `tables.perlas_beast.gold.max` | 80 | 40 |
| data/rpg/loot.json | `tables.perlas_ranged.gold.min` | 30 | 15 |
| data/rpg/loot.json | `tables.perlas_ranged.gold.max` | 60 | 30 |
| data/rpg/loot.json | `tables.perlas_caster.gold.min` | 30 | 15 |
| data/rpg/loot.json | `tables.perlas_caster.gold.max` | 70 | 35 |
| data/rpg/loot.json | `tables.perlas_elite.gold.min` | 64 | 32 |
| data/rpg/loot.json | `tables.perlas_elite.gold.max` | 128 | 64 |
| data/rpg/loot.json | `tables.fortuna_beast.gold.min` | 40 | 20 |
| data/rpg/loot.json | `tables.fortuna_beast.gold.max` | 80 | 40 |
| data/rpg/loot.json | `tables.fortuna_ranged.gold.min` | 30 | 15 |
| data/rpg/loot.json | `tables.fortuna_ranged.gold.max` | 60 | 30 |
| data/rpg/loot.json | `tables.fortuna_caster.gold.min` | 30 | 15 |
| data/rpg/loot.json | `tables.fortuna_caster.gold.max` | 70 | 35 |
| data/rpg/loot.json | `tables.fortuna_elite.gold.min` | 64 | 32 |
| data/rpg/loot.json | `tables.fortuna_elite.gold.max` | 128 | 64 |
| data/rpg/loot.json | `tables.ancon_beast.gold.min` | 40 | 20 |
| data/rpg/loot.json | `tables.ancon_beast.gold.max` | 80 | 40 |
| data/rpg/loot.json | `tables.ancon_ranged.gold.min` | 30 | 15 |
| data/rpg/loot.json | `tables.ancon_ranged.gold.max` | 60 | 30 |
| data/rpg/loot.json | `tables.ancon_caster.gold.min` | 30 | 15 |
| data/rpg/loot.json | `tables.ancon_caster.gold.max` | 70 | 35 |
| data/rpg/loot.json | `tables.ancon_elite.gold.min` | 64 | 32 |
| data/rpg/loot.json | `tables.ancon_elite.gold.max` | 128 | 64 |
| data/rpg/merchants.json | `merchants.smith.buyMultiplier` | 1,60 | 6,40 |
| data/rpg/merchants.json | `merchants.apothecary.buyMultiplier` | 1,40 | 5,60 |
| data/rpg/progression.json | `rules.sellRatio` | 0,30 | 0,20 |

### 8.1 Resultado con todos los ajustes a la vez (batería completa)

| Medida | Ahora | Con los ajustes |
| --- | --- | --- |
| Vanguardia de Brasa: muertes en grupos y jefes, malo / medio / bueno | 14 % / 1 % / 0 % | 21 % / 3 % / 0 % |
| Vanguardia de Brasa: vida perdida por combate, malo / medio / bueno | 81,1 / 42,5 / 12,4 | 80,8 / 44,5 / 13,3 |
| Vanguardia de Brasa: mayor grupo de lobos, malo / medio / bueno | 8 / 40 / 40 | 0 / 40 / 40 |
| Vanguardia de Brasa: mayor grupo de lobos preparado, malo | 30 | 25 |
| Vanguardia de Brasa: arena, victorias malo / medio / bueno | 100 % / 100 % / 100 % | 100 % / 100 % / 100 % |
| Vanguardia de Brasa: tiempo para matar medio (medio) | 9,5 s | 10,1 s |
| Vanguardia de Brasa: recurso medio en combate | 88 % | 79 % |
| Vanguardia de Brasa: decisiones con un hechizo listo sin recurso | 0 % | 0 % |
| Vanguardia de Brasa: nivel a los 30 min / al final | 12,2 / 16,3 | 8,6 / 11,3 |
| Vanguardia de Brasa: minuto del nivel 10 | 17,9 | 44,5 |
| Vanguardia de Brasa: muertes por hora de granja | 0,0 | 0,0 |
| Vanguardia de Brasa: oro neto por minuto | 154,5 | 82,5 |
| Tejedora de Tormentas: muertes en grupos y jefes, malo / medio / bueno | 15 % / 1 % / 0 % | 29 % / 2 % / 0 % |
| Tejedora de Tormentas: vida perdida por combate, malo / medio / bueno | 61,7 / 19,8 / 4,7 | 59,9 / 20,4 / 5,2 |
| Tejedora de Tormentas: mayor grupo de lobos, malo / medio / bueno | 8 / 40 / 40 | 0 / 30 / 40 |
| Tejedora de Tormentas: mayor grupo de lobos preparado, malo | 12 | 16 |
| Tejedora de Tormentas: arena, victorias malo / medio / bueno | 100 % / 100 % / 100 % | 100 % / 100 % / 100 % |
| Tejedora de Tormentas: tiempo para matar medio (medio) | 7,5 s | 7,8 s |
| Tejedora de Tormentas: recurso medio en combate | 92 % | 79 % |
| Tejedora de Tormentas: decisiones con un hechizo listo sin recurso | 0 % | 0 % |
| Tejedora de Tormentas: nivel a los 30 min / al final | 11,7 / 15,5 | 8,6 / 11,0 |
| Tejedora de Tormentas: minuto del nivel 10 | 19,5 | 46,5 |
| Tejedora de Tormentas: muertes por hora de granja | 0,0 | 0,0 |
| Tejedora de Tormentas: oro neto por minuto | 129,5 | 74,4 |
| Niveles que da la primera arena | 1 | 1 |
| Minutos de combate para lo más caro de la tienda | 1,5 (Amuleto de la tortuga de musgo) | 10,7 (Amuleto de la tortuga de musgo) |
| Mediana de minutos de combate por objeto de la tienda | 0,2 | 1,6 |
| Pesca al 80 %: monedas por minuto | 29,1 | 20,2 |

Veredicto de cada hechizo con los ajustes: Embestida: obligatorio; Remolino de brasas: obligatorio; Grito de hierro: importante; Chispa: obligatorio; Nova de escarcha: importante; Foco de tormenta: normal.

### 8.2 Cada ajuste por separado (batería reducida)

Batería con 4 semillas, escaleras con 3 y granja de 30 min, comparada con la línea base medida igual. «—» = no se llega en esa granja.

| Medida (Vanguardia / Tejedora) | Base | resistencias | recurso | hechizos | xp | economia |
| --- | --- | --- | --- | --- | --- | --- |
| Muertes en grupos, malo | 12 % / 13 % | 10 % / 13 % | 12 % / 13 % | 12 % / 13 % | 22 % / 31 % | 13 % / 15 % |
| Vida perdida por combate, malo | 81 / 62 | 83 / 62 | 81 / 62 | 81 / 62 | 77 / 60 | 82 / 62 |
| Vida perdida por combate, bueno | 12 / 5 | 13 / 5 | 12 / 5 | 12 / 5 | 14 / 6 | 12 / 5 |
| Lobos, malo | 0 / 8 | 0 / 8 | 0 / 8 | 0 / 8 | 0 / 0 | 0 / 8 |
| Tiempo para matar (medio) | 9,5 / 7,4 | 9,5 / 7,4 | 9,5 / 7,4 | 9,5 / 7,4 | 10,2 / 7,6 | 9,5 / 7,5 |
| Recurso medio | 88 % / 92 % | 88 % / 92 % | 81 % / 86 % | 88 % / 92 % | 87 % / 88 % | 88 % / 92 % |
| Hechizo listo sin recurso | 0 % / 0 % | 0 % / 0 % | 0 % / 0 % | 0 % / 0 % | 0 % / 0 % | 0 % / 0 % |
| Minuto del nivel 10 | 18 / 19 | 18 / 19 | 18 / 19 | 18 / 19 | — / — | 19 / 19 |
| Oro neto/min | 130 / 123 | 135 / 123 | 130 / 123 | 130 / 123 | 128 / 124 | 81 / 76 |
| Min. para lo más caro | 1,7 | 1,6 | 1,7 | 1,7 | 1,7 | 10,7 |

## 9. Límites de esta medición

- El bot es constante: apunta sin errores, nunca se equivoca de tecla y reacciona siempre en 0,3 s. Un jugador real «malo» falla en más cosas que esquivar; uno «bueno» también usa el terreno. Los números son una cota optimista del daño y pesimista del tiempo que se pierde.
- Sólo se mide lo que hay: 6 arquetipos de nivel 1–4 y un único encuentro (la arena). La granja supone que la arena reaparece; en el juego todavía no lo hace.
- Vender y comprar son instantáneos (no se camina al pueblo). La pesca no se combina con mascotas.
- Las mascotas no reciben golpes (así está el juego); el zorro aporta poco daño.
- Los hechizos de huida (Paso del relámpago) valen más para una persona que para el bot, que se aparta andando muy bien: su veredicto es el más dudoso.
- La regla de equipo es una suma ponderada fija; no busca sets ni sinergias.
- No se probó ninguna fórmula nueva (XP por diferencia de nivel): sólo cambios de números en datos.
