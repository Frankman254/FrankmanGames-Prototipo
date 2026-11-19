# Acciones y respuestas del creador

Actualizado: 2026-11-18. Revisión completa: lo anterior está íntegro en [historico/ACCIONES_CREADOR_HASTA_2026-11-18](historico/ACCIONES_CREADOR_HASTA_2026-11-18.md).

**Cómo funciona desde ahora** (creador, 2026-11-18): el coordinador hace las preguntas en el chat, todas juntas, y no reparte documentos nuevos. El creador responde allí. El coordinador copia aquí sus palabras sin cambios, junto con lo que entendió y la tarea que sale de cada respuesta. Las decisiones que mandan quedan en [00_DECISIONES](diseno/00_DECISIONES.md).

## Respuestas del 2026-11-18

| ID | Pregunta | Palabras del creador | Lo que entendí | Tarea |
|---|---|---|---|---|
| A1 | ¿Qué provincia sigue después de Los Santicos y Herrerita? | vamos despues con veraguas, hay que ir con las regiones adyacentes y hacer caminos y pueblos entre ellas con zonas con mounstruos tipicos de la zona y originales. | Sigue Veraguas (Veraguí). Las regiones se construyen una tras otra, vecinas entre sí, unidas por caminos y pueblos, con monstruos de la fauna y el folclor del lugar y otros inventados | MUN-01 |
| A2 | Jefes tardíos y PvP: ¿cuánta vida, qué mecánicas y si se reduce el daño entre jugadores? | depende no veo el numero tampoco en su barra de vida como para saber actualmente cuanta vida tienen los bichos tocara que pongas las cifras tu y luego yo veo si me sirven. | Primero, la barra de vida de los monstruos muestra el número. Después, el coordinador propone la vida de los jefes y el daño en PvP como `PROPUESTA`, y el creador lo prueba | UI-04, BAL-02 |
| A3 | Duración del día: hoy 5 min, con noche del 46 % | como esta actualmente lo veo bien, puedes agregar eso en opciones de desarrollo, duracion del dia. entre 5/10/20/30 y 60 min | Se queda en 5 min. En Opciones → Desarrollo se puede elegir entre 5, 10, 20, 30 y 60 min | DEV-02 |
| A4 | XP de los monstruos generados | a mira, los mounstruos que son invocaciones no dan xp, y cuando se mata al que los invoca estos tambien deben morir. | Lo invocado no da experiencia. Al morir el invocador mueren sus invocaciones. Hoy el juego no hace ninguna de las dos cosas: solo cuenta las invocaciones vivas | INV-01 |
| A5 | Música de Iguanera | ya estamos en proceso de pulir la musica, toda la musica actual esta como bien armada en el papel pero los sonidos no la acompañan se valora la intencion pero hay que poner sonidos que no suenen roboticos y suenen mas a instrumentos reales, aqui entra la implementacion del audio. | Las partituras sirven. Lo que falla es el timbre: los instrumentos sintéticos suenan a robot. Se sustituyen por muestras de instrumentos reales con licencia libre (permitido por H08) | AUD-02 |
| A6 | Distribución: firma del instalador y actualización | si ya quiero un launcher para mac y para windows del juego como lo podemos hacer?. | Quiere instalar y abrir el juego en Mac y Windows como una aplicación normal. Cómo hacerlo queda pendiente de Q17 | DIST-01 |
| H01 | Muerte espectral | si en cada caida cuando mueres. | Confirma el espectro al caer. Falta aclarar si debe activarse en **cada** caída, aunque quede Pulso (Q19) | MUE-01 |
| H03 | Muerte espectral dentro de la cripta | a esta queria llegar, cada vez que morimos en la cripta nos debe sacar de ella y dejarnos en la piedra, pero al volver a entrar el juego debe saber en que piso quedamos y darnos la opcion de si retomar ese piso o empezar desde el piso 1. | Morir dentro te deja en la Piedra Pintada. El juego guarda el piso donde caíste y, al entrar otra vez, ofrece retomarlo o empezar en el 1 | MUE-02 |
| — | (sin pregunta) | cuando morimos automaticamente la montura y mascota se desequipan o dejan de estar visibles en el juego hasta que revivamos. | Al morir, montura y mascota desaparecen de la escena y vuelven al revivir | MUE-03 |
| — | (sin pregunta) | el juego va lento en windows no aprovecha al maximo la grafica ni el cpu. | WIN-01 debe medir también el uso de GPU y CPU, no solo los fps | WIN-01 |
| — | (sin pregunta) | TAREAS.md tambien toca reestructurarlo tiene muchas cosas ya hechas y esta ilegible la tabla. | Rehecho el 2026-11-18. Las filas hechas pasan al histórico | — |

## Respuestas del 2026-11-18, segunda tanda

| ID | Palabras del creador | Lo que entendí | Tarea |
|---|---|---|---|
| UI-04 | si tambien factible mostrar la vida de los jefes con su barra y numero y en pvp, para los demas mounstruos si le pones el puntero encima tambien poder ver esa vida.l | Jefes y rivales de PvP: barra fija con número. Monstruos normales: la vida, con su número, aparece al pasar el puntero por encima | UI-04 |
| — | un detallito antes que se me olvide, hay que cambiar ese estilo de fuente y colores, debe ser algo mas llamativo como las de dofus o las de tower of fantasy busca en internet las fuentes del daño ingame no en el chat. | Las cifras de daño que flotan sobre el combate (no las del chat) necesitan una letra gruesa con contorno y colores vivos, al estilo de esos juegos pero sin copiar su fuente. Se usa una libre (OFL) | UI-05 |
| DEV-02 | ya esta respondida y si son todas esas, pon por defecto que dure 20 min y que empiece en la mañana. | Opciones de 5, 10, 20, 30 y 60 min. **El día pasa a durar 20 min por defecto** y una partida nueva empieza por la mañana | DEV-02 |
| INV-01 | confirmado las invocaciones no deben dar xp, y deben morir si matamos al que las invocó | Confirmado | INV-01 |
| MUE-02, MUE-03, AUD-02, MUN-01 | bueno las que siguen son lo mismo ya las confirme. | Confirmadas tal como están | — |
| Q19 | solo al quedar sin pulso, al llegar a 20 debe salir una advertencia de poco pulso si mueres de nuevo te convertiras en fantasma. | El espectro llega solo con el Pulso a 0, como ahora. Al bajar a 20 sale un aviso: «si vuelves a caer, te convertirás en fantasma» | MUE-01 |
| Q17 | con un boton debemos poder actualizar. firmar que es? XD no voy a pagar por eso mi rey. tambien prefiero que sea automaticas las actualizaciones en cuanto cambie el codigo en master. | Sin firma de pago. El lanzador comprueba si hay cambios en `master` y actualiza solo, y tiene además un botón «Actualizar». Contradice la regla 6 de AGENTS («nada de red»), así que se resuelve en el lanzador, no dentro del juego. La forma concreta espera Q20 | DIST-01 |
| Q1 | esta no la entiendo como asi a que te refieres exactamente? si hay desbalance puede ser por algun item que de stats exagerados. | No era una pieza exagerada, sino la suma (explicación en el chat del 2026-11-18). Queda abierta como Q21 | EQ-07 |
| Q2 | si me sirven. puedes agregar el set del Ñeque ajaja, El set vaina, etc osea con dichos panameños. y sus descripciones panameñas humoristicas. | Se aceptan los tres nombres. Nuevos conjuntos con dichos panameños («del Ñeque», «Vaina»…) y descripciones con humor panameño | EQ-09 |
| Q3 | cual es la diferencia entre vida y vitalidad? XD | La Vitalidad es una característica: cada punto da 5 de Vida. En el equipo se pone la Vida directamente para que la ficha diga lo que suma. Explicado en el chat; queda abierta como Q22 | EQ-07 |
| Q4–Q6 | esta es complicada porque ni yo tengo claro que sistema implementar que sea atractivo y adictivo para los jugadores tu que me recomiendas? | Pide una recomendación. El coordinador la dio en el chat y espera su visto bueno (Q23) | EQ-08 |
| Q7 | dejalos igual ese repo no lo ve ni el tato. | Los OGG siguen en Git; nada que hacer | — |
| Q8 | por ahora si y mas de 16 caracteres esto para efecto de agentes de desarrollo. | Se admiten números y más de 16 caracteres en los nombres | NOM-01 |
| Q9 | aqui queria llegar mi rey: si el hechizo se aprende en 180 no va a llegar a todos sus rangos en 200 porque ahora llegamos a 400 asi que debes equilibrar los rangos. los ultimos hechizos son los mas potentes y cruciales segun la raza. | Las escaleras de rangos se reparten hasta el nivel 400. Los últimos hechizos de cada clase son los más fuertes y los que la definen | HZ-03 |
| Q10 | si escribe la propuesta de hechizos recuerda que es un juego con estrategia no todo es pegar. | Se escribe HZ-04a con peso en estrategia: control, posición, combos y preparación, no solo daño | HZ-04a |
| Q11 | de que editor? el editor del juego? eso esta verde aun no funciona bien. | Sí, el editor del juego (F12). No eran cambios a propósito: se queda como lo dejó `b03210c`. D-00 se cierra | D-00 |
| Q12 | si señor, eso para los hechizos que son globales. y es mas cada pergamino debe tener una forma simple de su hechizo no solo pergaminos blancos aburridos. | Confirmado: rango N = N pergaminos, para los hechizos universales. Cada pergamino lleva dibujado de forma simple el icono de su hechizo | D-01b, ICO-01 |
| Q13 | si señor, eso significa mas items hasta 400 | Nivel máximo 400 confirmado. Arrastra el equipo hasta 400 | D-50 |
| Q14 | me sirve. adicional al juego le faltan muuuchos mounstruos y necesitamos moderlarlos, ahora que ya estas pro modelando puedes darle tareas a omp en modo blender y que llegue a tus mismos resultados de esculpido. necesitamos arañas grandes, slimes, Jabalies, Puercos, Pollos, cangrejos, langostas, cabras pero comicas llenas de lana como dofus, (debes hacer familias de hasta 6 mounstruos cada uno con sus habilidades y elementos y su jefe esto para efectos de mazmorras) tambien pueden haber mounstros sin familia y unicos. no repliques los mounstros de la vida real si no una version adaptada a nuestro juego con nombres originales panameñizados, como en dofus hay un mounstruo que es un pollito y se llama tofu y estan sus familias de mounstruo y el tofu real que tiene muchos pms. tambien hay arañas que se llaman araknas, arakna mayor. y tambien archimounstruos (moustruos anormales mas fuertes que los normales y tienen una calavera siempre arriba indicando peligro. en fate habian ratones, gusanos, aguilas mitad leon, y muchos mas mounstruos, bueno aca tambien podemos meter toda la fauna panameña pero a modo comico y unico. | Rebanada 1–10 autorizada. Bestiario nuevo por familias de hasta 6 miembros más su jefe, cada uno con elemento y habilidades; también monstruos únicos sin familia y «archimonstruos» (variantes raras y más fuertes, con una calavera de aviso). Fauna panameña y criaturas como arañas, slimes, jabalíes, cerdos, pollos, cangrejos, langostas o cabras lanudas, en versión cómica y propia, con nombres panameños originales. Los ejemplos de DOFUS y FATE son solo ideas. OMP los modela en Blender con la calidad de MOD-01 | BES-01, MOD-03 |
| Q15 | no deberian matar solos si el oro por combate no debe ser abusivo (si hacemos un mmorg y nos ponen bots nos pueden joder el juego) | Los conjuntos de aguante y apoyo no necesitan matar solos. El oro por combate se queda bajo a propósito, para no dar ventaja a los bots | — |
| Q16 | no he podido revisar eso. pero el fuego esta bug en la cripta aveces no sale la pieza que lo sostiene, el gallote no lo he visto. | Sigue pendiente de revisar. Fallo: en la cripta, a veces el fuego se ve sin la pieza que lo sostiene | BUG-01 |
| Q18 | si dejalos asi, pero deberia haber un slot y poner la mascota ahi y al tenerla equipada poder ver el menu de la mascota y ver sus caracteristicas y hechizos y poder ponerle hechizos de los nuestros para que los tire el solo (fase desarrollo ya que podriamos incurrir en automatizaciones y que el jugador deje que la mascota mate todo el mob facil) | Los amuletos se quedan como están. Hace falta una ranura de mascota con su menú: características, hechizos y hasta tres hechizos del jugador que lanza sola. Va con cautela, porque no debe matar el grupo por el jugador | T06 |

## Pendiente de ti

### Probar en el juego

- **Rendimiento (WIN-01)**: juega en pantalla completa en el pueblo, en el campo y en la cripta con muchos enemigos. Debería ir al doble que antes. Si algo sigue a tirones, anota dónde. Los árboles ya iban agrupados; las casas y demás piezas ahora también (mira que se vean y se muevan igual que antes).

- **EQ-07, objetos**: fichas de nivel 40 y 200. Hay texto de muestra en `work/claude-items1118/fichas_electron.txt`.
- **La Espeja** (F36-POL y F36-DANZA): modelo, falda, coleta y danzas, en Partidas de prueba → «Cripta · jefes».
- **Prueba humana sin hacer**, del 2026-11-09, con el detalle en el histórico:
  - Tormenta 5;
  - Curandera 8 con la tortuga;
  - apuntar y cancelar un hechizo;
  - menú ESC con el mundo vivo;
  - lectura de la cripta;
  - ballesta cambiando de objetivo;
  - recorrido de espectro y Alzador;
  - guardar en espectro.

### Preguntas abiertas

Te las hago en el chat. Aquí solo queda el índice; las que ya respondiste están arriba.

| ID | Tema | Bloquea |
|---|---|---|
| Q16 | Arte de OMP sin revisar: fuego A, B o C, equipo lote 1, pila de leña, tres enemigos de cripta, gallote orgánico, tijereta blanca | Qué arte entra |
| Q20 | Actualizar: ¿vale que el lanzador traiga los cambios con `git pull` y recompile en cada máquina? | DIST-01 |
| Q21 | Primaria a nivel 200: ¿se queda la curva o se baja? | Cerrar EQ-07 |
| Q22 | ¿Vale poner Vida directa en el equipo en vez de Vitalidad? | Cerrar EQ-07 |
| Q23 | ¿Te convence la reforja que recomendé? | EQ-08 |

## Respuestas anteriores

Siguen vigentes y no se vuelven a preguntar:
- H02, Pulso;
- H04, duración de combates;
- H05, máscara;
- H06, progresión 10/20/30;
- H07, «armor» como equipo;
- H08, recursos libres;
- H09, matriz de objetos;
- H10, monturas;
- H11, mascotas;
- H12, experiencia por cercanía;
- H13 y H14, Iguanera y estilo Pintura;
- H15, Mola;
- H16, guardados;
- Q-EQ1–4;
- R1–R4;
- H2, la barra de hechizos;
- L1, el mercader de 101–200;
- M1, la Falcopama.

Su resumen está en [00_DECISIONES](diseno/00_DECISIONES.md) y sus palabras exactas, en el histórico.
