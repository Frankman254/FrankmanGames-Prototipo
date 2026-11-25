# Acciones y respuestas del creador

Actualizado: 2026-11-18. Revisión completa: lo anterior está íntegro en [historico/ACCIONES_CREADOR_HASTA_2026-11-18](historico/ACCIONES_CREADOR_HASTA_2026-11-18.md).

**Cómo funciona desde ahora** (creador, 2026-11-18): el coordinador hace las preguntas en el chat, todas juntas, y no reparte documentos nuevos. El creador responde allí. El coordinador copia aquí sus palabras sin cambios, junto con lo que entendió y la tarea que sale de cada respuesta. Las decisiones que mandan quedan en [00_DECISIONES](diseno/00_DECISIONES.md).

## Respuestas del 2026-11-24

| ID | Palabras del creador | Lo que entendí | Tarea |
|---|---|---|---|
| GRP | debemos ir preparando escenarios de prueba simulando otros jugadores peleando a mi lado a la vez para testear los enemigos los combates, si los mapas son los suficientemente amplios y estrategicos para pelear en equipo, la experiencia ganada entre el equipo para saber si estamos balanceando bien el juego | Preparar compañeros simulados que juegan como bots a tu lado, una batería sin pantalla con grupos de 1 a 4, la medida de los claros de pelea para un grupo y la comparación de reglas de reparto de XP. Las reglas del grupo (tamaño, reparto de XP, cuánto sube el enemigo) siguen siendo tuyas: se miden variantes `PROPUESTA` y tú eliges | GRP-01…GRP-05 |

## Respuestas del 2026-11-21

| ID | Palabras del creador | Lo que entendí | Tarea |
|---|---|---|---|
| HUD | necesito que asignes una tarea para arreglar la barra de hechizos cuando esta fusionada por defecto aparece demasiado grende y no con el tamaño que deberia, que todos los elementos puedan crecer horizontalmente y verticalmente independiente de los 2 ejes a la vez, corregir las posiciones por defecto en cada tipo de pantalla, ahora estamos en una pantalla de proporciones de una 1080P pero en porporciones de un monitor ultrawide tambien debemos tener las posiciones por defecto bien calibradas. | La barra fusionada mide por defecto lo que sus casillas. Cada elemento del HUD escala en X y en Y por separado. Posiciones por defecto por forma de pantalla (16:9, 16:10, 21:9, 32:9), con zona segura centrada en ultrawide y sin solapes | JL-59, JL-60 |
| Q27 | esta bien dejalas asi si el agente lo hizo fue por algo. pero los pisos iniciales hay que hacerles rework ya que estan horribles y muy simples. | Se quedan los cambios de JL-49 en la cripta. Los pisos hechos a mano se rehacen con salas con forma, una pieza central por piso y la utilería de OMP-M25 | JL-64, OMP-M25 |
| Q28 | 2.5 veces que? esto no lo estoy entendiendo bien me lo explicas con dibujitos? XD | Explicado en el chat con un dibujo: la prueba exige que el equipo tardío multiplique la primaria como mucho ×2,5; con la montura Falcopama (+200) la Vanguardia llega a ×3,21. Respondida después (Q28b) | `v2Product`, BAL |
| Q28b | pero si no tenemos balanceado el juego en el equipamiento normal, las mascotas dan eso fijo y dejalo asi no te fijes en ese tope de 2.5 eso lo volveremos a ver cuando lancemos el juego, ya que los items ni estan calibrados, estan dando caracteristicas en rangos no redondos en caracteristicas principales. ademas esto va de la mano con los hechizos y el calculo del daño y la vida de los mounstruos, cuando todo este en sintonia podemos hablar de eso | No se toca nada: las monturas y mascotas siguen dando su bono fijo, el tope de ×2,5 se queda como está y la prueba sigue en rojo. Se revisará antes del lanzamiento, junto con la calibración del equipo (primarias en cifras redondas), los hechizos, el daño y la vida de los monstruos | Aplazado al balance de lanzamiento |
| Q29 | si hay que integrar todo mi rey, hay muchos mounstruos en el convenio que tienen nombre de una cosa y son otra, muchos con forma de perro. | Integrar todos los modelos de OMP que lleguen a `master`. Auditar nombre contra modelo (18 criaturas usan `wolf`) y usar ya el modelo propio más parecido donde exista | JL-61, JL-63, orden de OMP-FA |
| Q30 | si me sirven tus recomendaciones todo eso es imaginacion que necesito y ayuda para por lo menos tener algo en el juego ya despues me inspiro y lo cambiamos. | Aprobadas las propuestas: ranas de Coclá (venenosa, ojirroja, sapo y la Rana Dorada jefa) y águilas de Dariena (negra, ornada y la crestada jefa). Son provisionales: el creador las cambiará cuando se inspire | OMP-FA-07, OMP-FA-21, BES-02 |
| Cámara | la camara hace un zoom automatico en ciertas zonas donde obtruyen los obstaculos y el personaje no puedo moverlo ni alegar el zoom necesito que el movimiento de la camara sea inteligente no solo en el zoom si no en el giro, y que cuando esta en modo manual no haga esos zooms automaticos si no que todo eso sea por el jugador, puedes agregar varios modos, modo manual, modo semi automatico, modo automatico y modo mejor encuadre respecto a los enemigos para que podamos jugar sin preocuparnos por la camara y que esta se posicione sola. | Fallo que impide jugar: arreglarlo primero. Cuatro modos: Manual (sin zoom automático; el obstáculo se transparenta), Semiautomático, Automático y Encuadre de combate | JL-65 |
| Lanzar | el tema de la jugabilidad tozca y no se siente suave y es dificil de apuntar los hechizos, deberiamos agregar varios modos de lanzar hechizos para que sea mas fluidas las peleas, como un modo que al pulsar y soltar lanza el hechizo de una vez sin esperar que vuelvas a pulsar, un modo de pulsar y mantener para ver la zona de efecto y al soltar entonces pega, otro modo como el actual de presionar 2 veces o el clic. | Los tres modos ya existen en Opciones → Juego, pero no se encuentran o no se sienten bien. Revisarlos, hacerlos visibles, y añadir asistencia al apuntar, cola de pulsaciones y modo por hechizo | JL-66 |
| Pulido | poner a otro agente a pulir los detalles del juego, como los iconos que estan al lado de la barra de hechizos, el indicador del puntero y la linea que traza la trallectoria se ven muy simples y deberiamos tener distintas skins para eso tambien. | Rehacer los iconos junto a la barra, el indicador de apuntado, el marcador de clic y la línea de trayectoria, con varias skins elegibles | OMP-POL-12 |
| Animación | las posiciones de los personajes encima de sus monturas no cuadran no estan bien calibradas para verse naturales, los personajes aun tienen problemas al caminar y peor aun con el set de la diablica puesto, las piernas se salen de la falta y como el set no tiene fisicas por eso se ve asi, multiples detalles sumanos por eso el resultado es este y la idea es ir puliendo cada uno de ellos para llegar a esos acabados, el juego parece que no tiene fisicas y vamos a tener que implementarlas correctamente para que se vea mas fluido y no todo tieso | Tres frentes. Asiento propio por montura (hoy es un número fijo para todas). Andar rehecho y trajes con huesos para físicas. Motor de físicas secundarias e inercia del cuerpo | OMP-POL-13, JL-67, JL-68 |

## Respuestas del 2026-11-20, noche

| ID | Palabras del creador | Lo que entendí | Tarea |
|---|---|---|---|
| Q24 | rana dorada va a ser el boss de clocle con sus otros tipos de ranas a tamaño humano y la dorada como 2 veces mas grande. | Familia de ranas en Coclá (Coclé): varias ranas de tamaño humano y, como jefa, la rana dorada, el doble de grande. Sale de Bocas, donde hace falta otra criatura | CUL-01, BES-02, OMP-FA-07 |
| Q25 | el aguila arpia ya esta como mascotura, pero si podria haber un boss que sea un aguila enorme y sus variantes mas pequeñas. | La arpía real sigue como mascota y montura. Además, una familia de águilas: un jefe enorme y variantes más pequeñas, con nombres y aspecto propios | CUL-01, BES-02, OMP-FA-06 |
| Q26 | si ese metodo me sirve de hecho podemos hacer algo para yo entender el proyecto por nodos | Se aprueba el método (provincia → bioma → zona → caminos → 2–3 familias por zona). Además, un mapa de nodos interactivo del mundo, sacado de los datos, para entender el proyecto | MAP-VIAL-01, BES-02, MAP-NOD-01 |

## Respuestas del 2026-11-19, noche

| ID | Palabras del creador | Lo que entendí | Tarea |
|---|---|---|---|
| RUM-a | ya omp termino sus tareas y junie tambien asi que toca seguir asignandoles tareas segun lo que ya hemos hablado | Nueva tanda para OMP y Junie con lo ya autorizado | UI-04, MOD-08, ENV-02, VIS-02, TEST-01, J12, UI-07, JUG-00 |
| RUM-b | debemos enfocarnos ahora en el apartado visual mejorar todos los diseños porque aun estamos verde en eso, luego vamos a pulir jugabilidad ya que esto es muy importante y se siente tozca la jugabilidad | Primero todo lo que se ve (modelos, atrezo, efectos, interfaz); después, la sensación de juego. Mientras tanto, solo se mide por qué se siente tosca, sin cambiarla | Visual: las de RUM-a. Jugabilidad: JUG-00 (diagnóstico) y luego JUG-01 en adelante |

## Respuestas del 2026-11-19, tarde

| ID | Palabras del creador | Lo que entendí | Tarea |
|---|---|---|---|
| LUZ-a | necesitamos mas modos de iluminacion ya que inclusive con el mejor que tenemos ahora y de dia se ven zonas oscuras, la luz no se propaga correctamente. | Faltan modos de luz y relleno: de día no debe haber rincones negros | LUZ-02 |
| LUZ-b | el personaje debe tener luz propia para iluminar donde camina, las antorchas hay que aumentarles la luz tambien. | Luz que sigue al personaje; antorchas más fuertes | LUZ-03, LUZ-04 |
| AG-a | omp puede pulir los modelasdos de los npcs y junie los dialogos y el diseño de los mapas que aun hay cosas raras. lo de untitled ya se anotó. | OMP, modelos de PNJ; Junie, repaso de diálogos y mapas | MOD-08, DIA-01, MAP-01 |
| HZ-a | el 03 de hechizos lo apruebo por mi parte. solo que cada reaccion debe tener su efecto grafico (mostrar el nombre de la reaccion) y tambien la animacion o efecto grafico de cada una. | HZ-04a aprobada. Cada reacción muestra su nombre y su efecto propio | HZ-04d, HZ-04c, FX-R01 |
| HZ-b | arma tareas una vez tengamos los nuevos hechizos y reacciones para que codex genere los iconos de los hechizos y las reaccciones (se tendran que explicar dentro del juego en hechizos en una pestaña nueva) y ahi se cargaran sus iconos y descripciones. | Codex hace los iconos; pestaña nueva de reacciones en el libro de hechizos | ICO-02, ICO-03, HZ-05 |
| CO-a | y tu al final revisaras que todo cuadre. | Revisión final del coordinador | REV-01 |
| CO-b | armate tareas para pulir el falcopama que no esta 100% fiel al diseño que te pase, y el modelado de los items equipables. | Fidelidad de la Falcopama y modelos de objetos | MOD-01, MOD-09 |
| CO-c | genera un set de 8 piezas de la diablica para nivel 50 que den stats razonables y se utilicen las piezas del propio npc para separarlas y guardarlas como items equipables. | Set nuevo de 8 piezas, nivel 50, con cifras `PROPUESTA` según EQ-07 | EQ-10 |
| CO-d | los 3 personajes (las 3 clases) hay que pulir su modelado asi como hicimos con la diablica y sus posiciones y animaciones lo mismo para esos personajes que todos tengan sus versiones femeninas y masculinas, y poder ponerlo en el inventario como previsualizacion | Seis héroes al nivel de La Espeja y personaje animado en el inventario | MOD-07, UI-06 |

## Respuestas del 2026-11-19

Revisión rápida de la propuesta de hechizos (HZ-04a, Q10). El creador la revisará con lupa más adelante.

| ID | Palabras del creador | Lo que entendí | Tarea |
|---|---|---|---|
| Q10-a | de momento dejemos todo como lo propones luego lo analizo con lupa. … me gusto tu md pero esta muy largo, no digo que este mal despues lo analizo. | La propuesta queda como base provisional, en una versión más corta. No entra en `data/` hasta su revisión | HZ-04a |
| Q10-b | un hechizo que se aprende en nivel 1 con este sistema puede quedar obsoleto y poco interezante para el jugador a nivel 400 por ende su rango 6 deberia ser equiparable y funcional al nivel 400. | Las cifras escalan con el nivel del personaje (base + coeficiente × nivel). Un hechizo temprano en rango 6 sigue sirviendo a nivel 400 | HZ-04a §4, D-50 |
| Q10-c | me gustan los estados de congelado etc, entonces para los 6 elemenos y sus interacciones podemos usar reacciones elementales que generen distintos efectos. | Cada elemento deja una marca y otro elemento la convierte en una reacción: 15 pares para tierra, fuego, rayo, escarcha, aire y agua | HZ-04a §3, HZ-04b |
| Q10-d | los de daño deben ser mas que los de estrategia ademas faltan los de bosteo que tampoco son muchos. | Por clase: 18 de daño, 4 potenciadores, 6 de control y 4 de defensa o utilidad | HZ-04a §1 |
| Q10-e | ejemplo en dofus hay un hechizo de yopuka llamado espada divina cruz de 2 casillas y da 30 de daño a nivel maximo a todos en esa area. potencia se puede tirar a uno mismo o. a un aliado y da 300 a 350 de potencia y 150 daños de empuje. el ocra tiene un hechizo que da 15% critico 50 daños criticos y 70daños fijos, su variante da potencia 350 y 150 daños de empuje. hay hechizos que no pegan pero empujan, cambian, reparten daño, desechizan uff muchas mecanicas, dan invulnerabilidad a distancia o en cac, dan escudo (ejemplo coraza del zobal da 1100 de escudo) se calcula como en 550% del nivel del personaje para un nivel 200 eso es 1100 puntos de escudo. | Son ejemplos de mecánica, no de contenido: nombres e iconos propios (clean-room). Faltan en el motor: daño en cruz, potencia y daño de empuje, crítico y daño fijo, desechizar, invulnerabilidad según la distancia, repartir daño y escudo de 5,5 × nivel | HZ-04b |
| Prompts | necesito que armes el prompt para junie en bucle y el de omp ambas tareas las mas que puedas para que no gastes inferencia, y tu solo corrigas si hacen algo mal. | Colas nuevas en `work/prompts-noche/` para Junie y OMP. El coordinador solo revisa | — |
| VIS-a | listo, ahora tu te puedes poner a modelar las 3 clases y sus versiones masculinas y femeninas para que queden parecidas a la espejo | Los seis héroes anime llevan ropa por piezas al estilo de La Espeja: geometría propia, color plano por paleta, adornos. Conservan rig, clips y las piezas que se tiñen | MOD-04 |
| VIS-b | las piezas que tiene la espejo pueden ser un set tambien equpable para los demas personajes del juego. | El tocado, el bastón y otras piezas rígidas de La Espeja pasan a objetos de `equipo.glb` y a un set. Cifras como PROPUESTA | MOD-05 |
| VIS-c | modela todo lo que puedas y veas mal, como arboles, hierva, madera, casas, todo mi rey | Rehacer el atrezo que se vea pobre: árboles, hierba, madera y casas | ENV-01 |
| VIS-d | mejora la iluminacion del juego ya que se ve simple aplicale como un hdr o algo asi que se vea mas vivo. | Entorno de iluminación propio (sin HDRI externo), mapeo de tonos, bloom suave y gradación de color, con interruptores en Opciones › Desarrollo. Se coordina con WIN-01 | LUZ-01 |
| VIS-e | y se me olvido, no se si se la dejaste a un agente pero la letra de los daños habia que cambiarla prueba versiones en 3d y multiples tipografias configurable en las opciones de desarrollo | UI-05 pasa al coordinador: varios estilos (plano, contorno, relieve 3D) y varias tipografías, elegibles en Opciones › Desarrollo | UI-05 |

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

### JL-256 — Áreas que atraviesan paredes (2026-11-24)

| ID | Pregunta | Palabras del creador | Lo que entendí | Tarea |
|---|---|---|---|---|
| JL-256 | Los hechizos de área (cono, línea, cruz, estrella, cuadrado) golpean a **todos** los enemigos dentro de la forma, incluso si hay una pared entre el centro del área y el enemigo. Los de blanco único ya verifican línea de visión. ¿Cómo quieres que funcionen los de área? | | | | Opción **A**: las áreas respetan la línea de visión desde el centro del área hasta cada enemigo (como los de blanco único). Opción **B**: se quedan como están (el área pega a todo lo que está dentro, sin importar las paredes) |

**Detalle técnico** (para contexto): en `src/sim/world.ts`, `hasLineOfSight()` devuelve `true` sin verificar para cualquier hechizo cuyo `area.type` no sea `'single'` (línea 991). Además, `shapeHitsCircle()` en la línea 1387 solo comprueba si el enemigo está dentro de la forma geométrica, sin mirar paredes. Captura en `work/junie-jl256/`.

### JL-261 — Vuelo en la barriada (2026-11-24)

| ID | Pregunta | Palabras del creador | Lo que entendí | Tarea |
|---|---|---|---|---|
| JL-261 | En la barriada de Praderas del Norte no puedes volar con una montura que vuele. La causa es técnica: la barriada comparte el sistema de "salas" con las casas y el banco, por lo que `interior=true` y `canFly()` lo bloquea. ¿Quieres que se permita volar en la barriada? | | | |

**Opciones:**

- **A — Permitir vuelo en la barriada, sin restricciones.** Se quita el bloqueo de `interior` para la barriada. El jugador vuela como en el mundo abierto.
- **B — Permitir vuelo con tope de altura.** Por ejemplo, máximo 30 m sobre el suelo, para que se vean las casas desde arriba sin salir de la zona.
- **C — Permitir vuelo con tope de altura y borde.** Tope de altura (p. ej., 30 m) y un radio máximo desde la piedra (p. ej., 80 m), para que no vuele más allá de las casas construidas.
- **D — No permitir vuelo en la barriada.** Se mantiene el bloqueo; la barriada es un espacio peatonal.

**Detalle técnico:** en `src/scenes/houseScene.ts:383`, `enter()` pasa `interior: true` a `makeWorld` para todas las salas, incluida la barriada. `canFly()` en `src/sim/world.ts:2903` devuelve `false` cuando `this.interior` es `true`. La barriada es un espacio exterior (calle, casas, cielo) pero usa la infraestructura de salas interiores. Si el creador elige A, B o C, el arreglo es pequeño: o bien `enterBarriada` pasa `interior: false`, o `canFly()` distingue la barriada de las salas cerradas.

## Pendiente de ti

### Probar en el juego

- **Canciones de pueblo (AUD-CTX-07)**: entra en Chitrí, Iguanera muelle, Pedasol, Punta Venada y Cambutal; cada uno suena distinto. Muestras de 30 s en `work/claude-aud-regiones/salida/pueblo_*_muestra30.wav`.
- **Barra en rojo (HUD-ROJO-02/03)**: apunta a un enemigo lejano o detrás de una pared; la barra ya no se pone roja, porque el personaje se acerca y lanza.
- **Ajuar de la Diablica (EQ-10c)**: quítate y ponte piezas andando, montado y con la mochila abierta; nada debe salirse de su sitio.
- **Regeneración (REGEN-01)**: ya no sale el +1 verde cada segundo.
- **Creador de personaje (CLA-CR1)**: mueve altura y complexión. La altura ahora se nota en la vista previa y robusto/delgado cambian la masa del cuerpo, no solo el ancho. Si quieres más diferencia de altura, dime el rango: hoy es 0,94–1,06 (Q24).
- **Jinetes (CLA-MON1)**: monta mula, caballo, tapir y las aves; el jinete debería ir sentado, sin flotar.
- **Barra de hechizos (CLA-BAR1)**: si tu perfil guardado aún deja el hueco abajo, arrástrala abajo una vez y cierra el candado.
- **Tu casa (CLA-CASA1)**: mira las láminas de `work/claude-casa1/v2/` (frente, tres cuartos, perfil, fondo y alero) y la captura en el juego `enjuego.jpg`. Dime qué no se parece. Las tres recámaras van a la izquierda y baño, cocina y lavandería a la derecha, según mi lectura del plano. Junie la pondrá cerca de Villa Raspadura (JL-174) solo cuando la apruebes.

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

### Audio IA (2026-11-19)

- **Elegido**: ACE-Step Studio 4.0.1 en el PC con la 3080, manejado desde el Mac por OMP en modo Audio. Por qué y cómo, en [GUIA_AUDIO_MCP](GUIA_AUDIO_MCP.md).
- **Lo que hace falta de ti**: abrir una sesión de Claude en el PC con Windows y pedirle **AUD-IA-01**. Esa sesión instala el estudio con la telemetría apagada, Tailscale y SSH solo con clave, y hace el piloto. Si prefieres instalarlo tú, los pasos están en la guía, §3.
- **Después**: escuchar los tres motivos de Iguanera (AUD-IA-02) y elegir uno.
- **Ya para escuchar**: tres piezas originales de cripta (descenso, velas y ecos) y sus versiones 8-bit, en `work/claude-aud-cripta/salida/`. Dime cuáles sirven, para la cripta o para otra cosa, y si el 8-bit va por buen camino. Detalle en `work/claude-aud-cripta/LEEME.md`.

### Preguntas abiertas

Te las hago en el chat. Aquí solo queda el índice; las que ya respondiste están arriba.

| ID | Tema | Bloquea |
|---|---|---|
| JL-174 | La casa del creador se colocó en (170, 175), al sureste de Villa Raspadura. ¿Quieres que quede ahí o en otro sitio? ¿Debe ser la casa del jugador (interior accesible) o solo un edificio decorativo? | JL-174 (posición) |
| JL-18 | `mist_veil` y `charcoal_cloud` tienen una zona con `effects: []` (vacía). Opción A: añadir daño del elemento. Opción B: eliminar la zona vacía. Diagnóstico en `work/junie-jl18/DIAGNOSTICO.md` | JL-18 (datos) |
| Q16 | Arte de OMP sin revisar: fuego A, B o C, equipo lote 1, pila de leña, tres enemigos de cripta, gallote orgánico, tijereta blanca | Qué arte entra |
| Q20 | Actualizar: ¿vale que el lanzador traiga los cambios con `git pull` y recompile en cada máquina? | DIST-01 |
| Q21 | Primaria a nivel 200: ¿se queda la curva o se baja? | Cerrar EQ-07 |
| Q22 | ¿Vale poner Vida directa en el equipo en vez de Vitalidad? | Cerrar EQ-07 |
| GCD-01 | Pediste hechizos «asíncronos» y poder lanzar 2 a la vez. Se puede: 104 de 108 hechizos ya son instantáneos y sus efectos corren en paralelo; lo único que lo impide es el enfriamiento global (0,5–0,8 s). Opciones: A) hechizos «libres» que ni ponen ni esperan GCD (p. ej. defensas y movimientos); B) GCD más corto para todos; C) sin GCD, solo el enfriamiento de cada hechizo. La cola ya guarda la pulsación cuando falta poco (CLA-COLA) | Ritmo de combate |
| Q23 | ¿Te convence la reforja que recomendé? | EQ-08 |
| Q24 | Altura del creador de personaje: ¿se queda el rango 0,94–1,06 o se amplía? | Nada (CLA-CR1 ya hecha) |

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
