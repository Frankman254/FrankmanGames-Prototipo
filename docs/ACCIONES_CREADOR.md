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

## Pendiente de ti

### Probar en el juego

- **Rendimiento (WIN-01)**: juega en pantalla completa en el pueblo, en el campo y en la cripta con muchos enemigos. Debería ir al doble que antes. Si algo sigue a tirones, anota dónde. ¿Agrupo los árboles con modelo propio del pueblo? Ganaría fps, pero todas las copias se balancearían a la vez.

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

Te las hago en el chat. Aquí solo queda el índice.

| ID | Tema | Bloquea |
|---|---|---|
| Q1 | Con tu curva, el equipo completo da unas 2,8 veces la primaria del personaje desnudo a nivel 200. ¿Se queda o se baja? | Cerrar EQ-07 |
| Q2 | Nombres provisionales de tres armas nuevas: Bastón de niebla fría, Arco de guayacán y Arco de nazareno | Cerrar EQ-07 |
| Q3 | La Vitalidad de las piezas pasó a Vida (propuesta del coordinador). ¿Vale? | Cerrar EQ-07 |
| Q4 | Reforja: ¿sin riesgo, donde el coste es el freno, o con probabilidad, donde se pierde la piedra pero la pieza nunca empeora? | EQ-08 |
| Q5 | Reforja: ¿las ranuras dependen de la rareza o del nivel? | EQ-08 |
| Q6 | Reforja: ¿las piedras las fabrica un oficio nuevo o uno de los actuales? | EQ-08 |
| Q7 | Los tres OGG de `assets/dev_dungeon/` (de otro juego) siguen en Git aunque ya no se empaquetan. ¿Dejan de versionarse o se quedan, si el repositorio es privado? | Limpieza de audio |
| Q8 | ¿Se admiten números en los nombres de personaje (por ejemplo «Frank254»)? Hoy sí | Regla de nombres |
| Q9 | Con seis rangos, un hechizo aprendido en el 180 no llega a todos sus rangos antes del 200. ¿Su escalera sube más rápido o se queda con menos rangos? | Cerrar HZ-03 |
| Q10 | Sin pregunta todavía: el coordinador aún no ha escrito la propuesta de repertorio de hechizos (HZ-04a). Cuando esté, te la pido aquí | HZ-04c |
| Q11 | Tus cambios del editor (E1–E6; detalle en el histórico): ¿se quedan como los dejó `b03210c`? | Cerrar D-00 |
| Q12 | ¿Subir un hechizo al rango 2, 3, 4 y 5 cuesta 2, 3, 4 y 5 pergaminos? | D-01b |
| Q13 | ¿Confirmas el nivel máximo 400 y encargo el estudio D-50? | D-50 |
| Q14 | ¿Autorizas la rebanada 1–10: ficha de zonas, Duendes, Comejenes, Gallotes y misiones 1–5? | Rebanada 1–10 |
| Q15 | Balance pendiente de JEQ-07/08 que EQ-07 no resolvió: el oro por combate se estanca, y los conjuntos de aguante y apoyo no matan solos. ¿Se corrigen? | Balance económico |
| Q16 | Arte de OMP sin revisar: fuego A, B o C, equipo lote 1, pila de leña, tres enemigos de cripta, gallote orgánico, y la tijereta, que salió blanca en vez de negra | Qué arte entra |
| Q17 | Lanzador: ¿instalador normal o carpeta portátil, y con o sin firma? | DIST-01 |
| Q18 | Los amuletos de zorro y tortuga no se equipan con doble clic. ¿Deben hacerlo? | Mochila |
| Q19 | ¿Cada caída te vuelve espectro, o solo al quedarte sin Pulso, como ahora (H02)? | MUE-01 |

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
