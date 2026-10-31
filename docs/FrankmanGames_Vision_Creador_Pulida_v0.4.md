# FrankmanGames — Visión del creador y laboratorio de ideas

**Versión editorial:** 0.4 · **Fecha de edición:** 31 de octubre de 2026  
**Estado:** BORRADOR PARA REVISIÓN DEL CREADOR · No es un documento de decisiones ratificadas  
**Base:** cuestionario de Claude respondido por el creador (18 apartados; 113 respuestas, incluida una vacía).  
**Objetivo:** mejorar legibilidad, preservar íntegramente las opiniones e imaginar respuestas a las dudas **sin convertir propuestas en decisiones del juego**.

> **REGLA DE AUTORÍA:** la voz del creador prevalece. Las secciones «Visión expresada» recogen e interpretan lo que ya respondió; las secciones «Laboratorio de propuestas» son contribuciones creativas de ChatGPT que necesitan confirmación. El cuestionario original se reproduce completo en el **Anexo A**, sin suprimir preguntas, ideas, dudas, bromas ni respuestas. Los datos marcados «Hoy» son una fotografía del prototipo cuando se escribió el cuestionario: **no certifican el estado actual de GitHub**.

## Lectura rápida para el orquestador

### Intenciones expresas que deben preservarse

- FrankmanGames **tiene destino online/cooperativo**, con economía de jugadores y juego social, aunque la arquitectura y la escala final todavía requieren experimentos.
- Combate **en tiempo real y táctico**, con decisiones de posicionamiento, recursos y hechizos; no combate tradicional por turnos ni «carnicería» de clics.
- Mundo original explorable y de **carga progresiva**, con transiciones de larga distancia por transportes originales y mazmorras aparte.
- Misterio, música, pesca memorable, criaturas raras, botín sorprendente, mejora de equipo, conjuntos valiosos y oficios útiles: evitar actividades sin sentido.
- Identidad cultural panameña, humor y paisajes ricos, **sin copiar nombres ni reglas exactas** de FATE o DOFUS; ambientación todavía no fijada como medieval o futurista.
- Personalización exhaustiva de UI, mapas, controles, cámaras, gráficos, letras y temas; Windows, macOS y Linux.
- No asumir aprobación de la lista exacta de clases, nombres de elementos, fórmulas, número de niveles finales ni propuestas de esta edición.

### Temas que **no** deben cerrarse en silencio

| Tema | Tensión encontrada | Qué probar antes de decidir |
|---|---|---|
| PA/PM en tiempo real | Táctica sin pausas ni turnos | Cadencia de habilidades, movilidad táctica y posicionamiento, comparados en combate |
| Movimiento y apuntado | Un ratón, hasta 20 hechizos, teletransportes | Destino persistente; tecla+apuntar; selección de objetivo; cámara con trackpad |
| Monobjetivo y áreas | Impactos dirigidos frente a esquiva; daño a aliados | Reglas de validación, interrupción, reflejo y fuego amigo por contexto |
| Botín MMO | Recompensas personales frente a suelo compartido | Propiedad temporal/individual, resumen de encuentro, contribución |
| Muerte | Pérdida de energía y estado fantasma | Reserva de recuperación, resucitador, punto de reaparición |
| Mascotas | Ayuda táctica sin manejar dos personajes | IA contextual, órdenes simples, combos geométricos |
| Clases / ambientación | Roles propuestos, estética abierta | Primero un mundo narrativo; después nombres, siluetas y sistemas |
| Nivel y zonas | Franjas hasta 100, máximo global indefinido | Calidad de progresión por tramo, luego curva de XP |
| Rareza y equipo dorado | Botín emocionante sin quebrar el mercado | Probar afijos, x2 experimental, alternativas de reliquias |
| Sistema de control de masas | Evitar stun frustrante y conservar táctica | Telegráficos, inmunidades, topes y recuperación |

### Criterio de aceptación de nuevas ideas

1. Documentar qué idea es del creador y cuál es propuesta del agente.
2. Marcar `EXPRESADO`, `PROPUESTA`, `POR_VALIDAR`, `EXPERIMENTO` o `APROBADO_POR_CREADOR` de manera explícita.
3. Toda mecánica nueva debe describir **qué decisión interesante añade**, su coste de control y el posible abuso multijugador.
4. No cambiar economía, progresión o balance solo porque la idea «suena bien». Probar y comparar contra la versión vigente.
5. Conservar el cuestionario original como referencia para no borrar matices por resumir.

---

# Parte I — Visión consolidada y propuestas (edición del asistente)


## 1. Visión general

### Lectura pulida de las respuestas del creador

**Intención expresada por el creador.** FrankmanGames debe ser un RPG 3D original, **online y cooperativo**, cuya identidad combine misterio, descubrimiento, música, objetos inesperados y la profundidad táctica de construir un personaje. El combate será en tiempo real, pero no debe reducirse a pulsar botones frenéticamente. La economía, el comercio entre personas, los oficios, las mejoras de objetos, los sets con valor real, los hechizos y la comunicación social deben importar. También deben existir emoticonos, burbujas de chat visibles en el mundo y canales diferenciados.

**Lo que se quiere evitar.** Turnos tradicionales, clics compulsivos, animaciones robóticas, mazmorras sin conclusión, progresión artificialmente limitada, exceso de texto para entender una sola habilidad, contenido repetitivo, zonas abandonadas por falta de utilidad, espacios interiores con escalas absurdas y gráficos de baja calidad. La exploración del mundo de *Tower of Fantasy*, las reacciones elementales de *Genshin Impact* y la economía social de *Albion* sirven de referencias parciales, **no como plantillas para copiar**. También interesa que el vuelo sea posible en contextos adecuados.

**Tono y cultura.** Equilibrio entre emoción, peligro y humor; inspiración en el habla, los paisajes, las costumbres y los nombres de Panamá, sin convertirlos en una caricatura. Duración prolongada gracias al contenido vivo, sin equiparar el número de niveles con la calidad de la experiencia.

**Pitch editorial propuesto — NO APROBADO:** «Un RPG cooperativo de exploración y combate táctico en tiempo real, ambientado en un mundo original de rutas ocultas, mares y montañas. Cada viaje puede revelar criaturas temibles, reliquias inesperadas y nuevas maneras de combinar hechizos; lo que descubres tiene valor para tu personaje y para una economía de jugadores». Conviene someter el pitch a tu aprobación y reescribirlo cuando definamos la historia.

### Laboratorio de propuestas — NO APROBADO

**Pregunta abierta principal:** ¿qué hace única una expedición de 30 minutos? Propuesta para probar: encontrar información útil, afrontar un encuentro de lectura táctica, obtener una recompensa que transforme una decisión de build y regresar con una anécdota para compartir. **No equiparar diversión con estímulos constantes**: la calma —como aquella pesca memorable en FATE— también forma parte de la fantasía.


## 2. Mundo, zonas y viaje

### Lectura pulida de las respuestas del creador

**Visión expresada.** Mundo conectado y recorrible sin pantallas de carga entre cada cuadrícula, con carga progresiva del entorno conforme el jugador avanza; otros territorios, islas, dimensiones y mazmorras pueden conectarse mediante viajes coherentes con la ficción (barcos, globos, pasos especiales y transportes originales). Las monturas y compañeras de viaje pueden correr o volar según el lugar. No reutilizar nombres distintivos de otros juegos para los teletransportes.

**Progresión territorial.** Se propone experimentar con **franjas de diez niveles hasta el 100**, usando familias de criaturas propias en cada región y nombres geográficos con personalidad panameña, en vez de etiquetas genéricas «bosque» o «pradera». Esto **no fija el nivel máximo definitivo** ni significa que haya que construir diez mapas completos inmediatamente. Las criaturas aparecerán solas o en grupos, con reposición y variedad; el tamaño de grupo y el tiempo de reaparición quedan por calibrar. Día/noche y clima deben alterar encuentros, pesca y movilidad, no ser solo decoración.

**Mazmorras.** Cada región podría tener una gran mazmorra aislada del espacio compartido, con varios pisos y jefe final, accesible mediante llave u otro requisito original y con recompensa significativa. Los pisos ganan dificultad y misterio sin repetir un descenso infinito. El jugador rechazó que todo se genere al azar: conviene priorizar diseño intencional, acertijos y rutas reconocibles.

**Problema práctico observado.** Moverse, seleccionar un objetivo y apuntar hechizos al mismo tiempo está resultando incómodo. Este asunto pertenece al diseño de controles y debe probarse con prototipos, no darse por resuelto únicamente desde la navegación.

### Laboratorio de propuestas — NO APROBADO

**Propuesta de streaming (técnica, no aprobada):** separar *celdas cartográficas* visibles al jugador de **32 × 32 m** (ver §18) y *sectores de streaming* mayores, por ejemplo 128 o 256 m, que se precargan de forma asíncrona. La transición entre regiones cercanas es continua; el barco o el globo puede ocultar una transferencia de servidor para destinos lejanos. Los sectores no son «mapas de DOFUS» con carga por borde.

**Familias y reaparición (hipótesis para balance):** grupos pequeños comunes, medianos situacionales y grandes vinculados a eventos. Reapariciones escalonadas y variables dentro de áreas seguras para evitar camping, con límite de criaturas activas por sector. Nunca hacer que una criatura reaparezca literalmente encima de un jugador.

**Clima y tácticas:** lluvia podría reducir la propagación de combustión y modificar superficies; viento, trayectoria de proyectiles especiales; nieve acumulada, tracción; sol, ciertas habilidades térmicas. Diseñar efectos modestos, previsibles y simétricos para no inutilizar clases enteras.


## 3. Mapa y minimapa

### Lectura pulida de las respuestas del creador

**Visión expresada.** Hay **dos herramientas diferenciadas**. El minimapa será cuadrado, inicialmente a la derecha y arrastrable; podrá orientarse con norte fijo o girar con la cámara. Tendrá brújula, marcadores, objetivos, enemigos, compañeros, PNJ y filtros de información. El mapa grande abrirá en una **ventana con funciones completas**, no obligatoriamente a pantalla completa: exploración, marcas propias, capas, niveles de zonas, coordenadas y niebla de territorio no descubierto. La brújula podrá señalar objetivos también fuera del mapa.

**Coordenadas.** Tomar la utilidad de las coordenadas de juegos por casillas, pero adaptar el sistema a un mundo 3D con altitud. El creador acepta probar divisiones cartográficas de 32 × 32 m y quiere denominaciones originales. Explorar da sentido al descubrimiento, mientras que logros y recompensas por explorar pueden esperar hasta que el núcleo jugable sea divertido y visualmente convincente.

### Laboratorio de propuestas — NO APROBADO

**Propuesta cartográfica:** formato `SECTOR / CELDA / ALTURA`, por ejemplo `BRM · C(+03,−02) · Z+18 m`; la altitud se muestra al pedir detalles, no encima de todo. Nombres y siglas provisionales. En el minimapa, norte fijo como preajuste inicial con orientación conmutable, iconos de prioridad configurable y opción de ocultar enemigos no detectados.

**Capas sugeridas:** misiones, compañeros/grupo, comercios, recursos, peligros, límites de nivel, puntos de viaje, botines relevantes, zonas exploradas y anotaciones propias. La visibilidad de información sobre criaturas debe respetar el misterio, la distancia y la detección.


## 4. Interfaz y HUD

### Lectura pulida de las respuestas del creador

**Visión expresada.** Todos los elementos necesitan mayor legibilidad, con tamaño automático basado en la resolución y control manual. El HUD completo —barra, retrato, registro, minimapa— debe poder moverse, bloquearse y guardar configuraciones. Las ventanas de mochila, hechizos, grupo, chat, banco, oficios, mascotas, monturas y el compendio de criaturas deben ser coherentes entre sí. Temas y letras deben sentirse **finales y propios**, no como nombres de opciones de un editor. Se prefieren fuentes modernas legibles, con variantes futuristas y pixeladas; la ruta local de referencia tipográfica incluida en la respuesta original se conserva en el anexo.

**Combate legible.** Mostrar vida, nivel, estados y acciones de enemigos de acuerdo con su participación real en el encuentro; evitar un exceso de indicadores cuando no están peleando. Los críticos requieren señal audiovisual distintiva: un estallido o acento claro, sin confundir el signo «!» con un dígito. Tooltips breves al pasar el cursor y fichas completas al abrir los detalles; al preparar un hechizo, mostrar alcance y **estimación de daño**, no un número falsamente exacto si hay aleatoriedad o defensas desconocidas.

**Social e identidad.** Emotes, chat fijo por canales y burbujas que siguen al personaje unos segundos mientras se mueve. Quedan reflejados como parte de la fantasía social, aunque sean funciones de una fase posterior. El creador valora eventos con multiplicadores de experiencia/botín, objetos raros, modificaciones de equipo interesantes, pesca extraordinaria y un **tope propuesto de resistencia del 50 %; sin erosión**.

### Laboratorio de propuestas — NO APROBADO

**Tres modos de presentación a evaluar:** `Exploración` (mapa, rastreador, chat), `Encuentro` (objetivo, efectos, recursos, habilidades, aliados) y `Edición de HUD` (arrastrar, alinear, restaurar y guardar perfil). La UI debe administrar prioridades, no ocultar información vital detrás del inventario.

**Críticos:** mostrar el valor numérico separado del icono de crítico y acompañarlo de un sonido corto; colores de daño por afinidad sin depender exclusivamente del color (accesibilidad). **Indicadores de área:** una explosión afecta a aliados y rivales **si la regla de daño aliado está activada para esa habilidad/modo**. Probar PvE sin daño entre aliados frente a PvE táctico con fuego amigo antes de decidir; no convertirlo en regla universal por descuido.

**Objetivo individual:** si un hechizo requiere un objetivo fijo, el panel compacto muestra vida, estados y lectura del lanzamiento. Si es un área, priorizar la silueta en el suelo y los objetivos alcanzables.


## 5. Opciones y configuración

### Lectura pulida de las respuestas del creador

**Visión expresada.** Preajustes gráficos (bajo, medio, alto, ultra) **más ajustes avanzados**: sombras, densidad, distancia de visión, partículas, resolución interna, suavizado de bordes y recorte de objetos. Poder comprobar que el render usa aceleración de GPU donde corresponde, sin confundir render 3D con simulación y lógica, que normalmente corren en CPU. La distribución del trabajo CPU/GPU la determina el motor y las APIs, no un selector universal «dibujar con CPU o GPU».

**Personalización.** Transparencia y animaciones de interfaz configurables; si se desactivan animaciones decorativas, **no deben cambiar tiempos de combate ni ventajas mecánicas**. Puede usarse una representación simplificada de criaturas, pero manteniendo avisos legibles. Confirmación configurable antes de comprar, vender o destruir objetos; atención especial a los raros. La presentación del botín debe evitar robos injustos en un futuro MMO. El modo de lanzamiento por defecto se propone **con indicador visible mientras se prepara el hechizo**; también podrán existir lanzamiento directo y pulsar-para-confirmar, uno elegido por acción o perfil según lo que resulte cómodo. Contemplar modo para daltonismo, avisos contrastados y reducir movimiento de cámara. Internacionalización desde el principio: español e inglés, preparada para más idiomas.

### Laboratorio de propuestas — NO APROBADO

**Arquitectura de ajustes:** guardar opciones por usuario/dispositivo, perfiles de interfaz y controles por separado, validación de rangos y botón de restablecimiento por categoría. No guardar reglas de combate en ajustes gráficos.

**Gráficos:** limitar FPS del menú y del juego por separado, VSync y escala interna; permitir ver GPU y CPU por separado **como diagnóstico**, no prometer «elegir todo el procesamiento». Sugerir detección inicial del perfil según dispositivo, sin impedir ajuste manual.

**Botín para MMO (dos alternativas de prueba):** A) recompensa individual reservada para participantes elegibles, recogible en el suelo y acompañada de resumen de encuentro; B) resumen al cerrar un encuentro aislado, con recompensas individuales. Que ambos métodos usen en el servidor las mismas reglas de propiedad, reparto y anti-duplicación. Los encuentros en mundo abierto no deben permitir que terceros roben la recompensa personal.


## 6. Controles y cámara

### Lectura pulida de las respuestas del creador

**Visión expresada.** Movimiento principalmente mediante clic, combinado con una barra grande de hechizos. WASD no se descarta de manera dogmática, pero no debe sacrificar huecos de habilidades ni impedir apuntar teletransportaciones. La cámara debe girar libremente, con tecla configurable para usar el arrastre en trackpad, encuadres preestablecidos y retorno inmediato a la vista base. No se prioriza gamepad: el público objetivo es PC. Los ataques básicos deberían tener un coste u oportunidad táctica; mantener un clic presionado como única forma de atacar no debe provocar fatiga ni destruir el juego de hechizos.

**Problema sin resolver:** cómo caminar, esquivar y usar habilidades simultáneamente sin exigir demasiados clics. La respuesta exige pruebas de experiencia real; las propuestas siguientes son candidatas, no diseños aprobados.

### Laboratorio de propuestas — NO APROBADO

**Experimento A — Clic persistente:** clic en terreno fija destino; el personaje sigue caminando mientras `tecla + apuntar` prepara un hechizo. El lanzamiento no borra el destino salvo si la habilidad exige detenerse. Clic derecho puede confirmar objetivo o movimiento según modo, con remapeo.

**Experimento B — Tecla mantenida:** mantener una tecla de hechizo enseña la zona; arrastrar el cursor apunta; soltar confirma, o clic confirma según perfil. Un hechizo de teletransporte exige **punto válido**, altura y línea de visión; jamás se ejecuta solo por la dirección de WASD.

**Experimento C — Objetivo fijado:** clic en enemigo lo selecciona, ataque básico automático a ritmo controlado **solo mientras sea legal y deseado**; movimiento por clic sigue disponible. No convertir el combate en puro AFK: recursos, ventanas, posición y elección de habilidades siguen importando.

**Cámara con trackpad:** pulsar modificadora configurable (p. ej., Alt/Opción) y arrastrar un dedo; teclas laterales para giro fino, una para `restablecer cámara`. En macOS comprobar conflictos de gestos del sistema. El `zoom` y los encuadres pueden interpolarse suavemente.


## 7. Combate táctico en tiempo real

### Lectura pulida de las respuestas del creador

**Intención expresada.** Ritmo **intermedio**: decisiones de recursos, ventanas y posición, con habilidad manual, sin ser una carnicería de clics. Los avisos de impacto son útiles, pero el juego final debe representarlos con efectos diegéticos y animaciones claras, no solo polígonos pintados en suelo. Las defensas buscadas incluyen inmunidad, resistencias, contraataques, reflejos de hechizos, alteraciones de posición y retroceso temporal; **no usar «armadura» como atributo universal por defecto**. El creador quiere adaptar ideas equivalentes a movilidad y capacidad de actuar sin copiar PA/PM ni las reglas de turnos.

**Morir y controlar.** La derrota conlleva pérdida de una reserva no destructiva de energía y una condición espectral que exige resurrección; el detalle exacto de cuándo se agota y cómo se revive sigue abierto. Controles como inmovilización, aturdimiento o pérdida de capacidad de acción deben durar poco y tener respuestas defensivas. Se desea experimentar con placaje y ocupación espacial, sin imponer un sistema de casillas rígidas. El núcleo de daño debe partir principalmente de la potencia base de los hechizos, modulada por estadísticas y equipo; la aleatoriedad no debe producir fallos arbitrarios.

**Originalidad.** No copiar literalmente nombres de atributos, elementos, fórmulas ni fantasías de clase de otras franquicias. La identidad de las afinidades deberá salir de la ambientación definitiva.

### Laboratorio de propuestas — NO APROBADO

**Laboratorio PA/PM sin turnos — tres sistemas comparables:**

- **Cadencia** (*capacidad de actuar*): reserva breve que consumen hechizos fuertes y armas; recupera gradualmente, sin impedir ataques leves. Es análoga funcionalmente a una economía de acciones, no una copia de PA. Probar si castiga demasiado la fluidez.
- **Ímpetu** (*capacidad de desplazamiento*): moverse de manera normal es libre, pero acelerones, cambios bruscos, saltos y teletransportes gastan una reserva táctica. No cobrar cada paso; eso volvería tedioso explorar.
- **Posicionamiento/lectura**: habilidades más potentes si se alinean, flanquean, separan o combinan elementos; añade estrategia sin barras adicionales. Es alternativa o complemento a las dos anteriores.

**Defensas y ataques:** ataques de área evitables por posición y aviso; golpes dirigidos que, **una vez confirmado un bloqueo válido**, alcanzan salvo contramedidas explícitas (reflejo, inmunidad, interrupción anterior). Evitar que un ataque «imposible de esquivar» ignore paredes, alcance o latencia: debe existir una regla coherente para el servidor. Añadir telegráficos visuales incluso cuando no haya geometría en el suelo.

**Daño:** `resultado ≈ base_hechizo × modificadores_de_potencia × afinidad × resistencia + bonos`, con topes y orden por diseñar; **esto es una fórmula ilustrativa, no implantable todavía**. El 50 % de resistencia que pidió el creador queda como tope candidato; sin mecánica de erosión.

**Fuego amigo:** si los ataques zonales deben golpear aliados, determinar cuáles, cómo se comunica y si aplica en PvE, instancias de grupo y PvP; nunca penalizar con daño aliado oculto.


## 8. Clases y hechizos

### Lectura pulida de las respuestas del creador

**Visión expresada.** Antes de fijar nombres, estética y mundo de clases hay que definir **qué tipo de universo es FrankmanGames**: no asumir que será medieval cuando podría mezclar fantasía con tecnología. El prototipo podría ensayar **unas siete clases**, sin tope definitivo; los roles iniciales deseados son curación, resistencia/sacrificio, combate cuerpo a cuerpo, apoyo con escudos y mejoras, invocación y daño a distancia. Esas funciones deben convertirse en clases propias, no réplicas de nombres o habilidades de otros juegos.

**Progresión de habilidades.** Cada clase tendrá habilidades distintivas y un repertorio adicional adquirible por hallazgo o comercio. No está decidido si aprender habilidades de otras clases será universal, parcial o excepcional. El creador no quiere replicar sin pensar la mejora por rangos ni un catálogo obligatorio de variantes; deben explorarse formas originales de crecimiento. Los veinte huecos de la barra **no equivalen a veinte hechizos iniciales**: se desbloquean conforme a requisitos y progresión. Invocaciones, trampas con detonación al pisarlas y zonas estratégicas son ideas aceptables para experimentar.

### Laboratorio de propuestas — NO APROBADO

**Siete arquetipos funcionales de prueba (no son clases definitivas):** 1) duelista de proximidad; 2) sanador/reorientador de estados; 3) defensor de aliados y redireccionador; 4) invocador que altera terreno; 5) tirador de preparación y zonas; 6) estratega de intercambio de posiciones y tiempo; 7) amplificador elemental de sinergias. El diseño y los nombres solo se aprobarán después del **documento de ambientación**.

**Sistema de maestría alternativo (no aprobado):** al usar un hechizo se registra dominio de **situaciones** (curar bajo presión, ejecutar un combo de posición, acertar a través de una ventana táctica), no solo un contador de lanzamientos. Se desbloquean *ajustes de conducta* muy limitados o mejoras de eficiencia, sin obligar a gestionar veinte variantes de cada habilidad.

**Regla de identidad:** habilidades universales no deben eliminar la razón para elegir una clase. Investigar «núcleo exclusivo + descubrimientos compartidos» frente a «todo compartido con afinidades de clase». La respuesta original deja esta cuestión expresamente abierta.


## 9. Personaje, estadísticas y progresión

### Lectura pulida de las respuestas del creador

**Visión expresada.** Estadísticas y nombres propios en el producto final; mientras no exista un vocabulario mejor, puede haber nombres provisionales para el prototipo, pero **no heredar literalmente todo el sistema de otra franquicia**. Los puntos de característica serán libres y se podrán reiniciar. La curva de experiencia debe ser más lenta y sustancial que la actual; el número total de niveles permanece por definir. Se necesita un propósito jugable después del nivel máximo: equipo, expediciones, desafíos, variaciones del mundo o contenido nuevo, no simplemente subir números vacíos. Un atributo semejante a «sabiduría» debería influir en XP, resistencia a ralentizaciones y algún efecto nuevo.

### Laboratorio de propuestas — NO APROBADO

**Familias de atributos provisionales:** `Potencia` (capacidad ofensiva), `Precisión táctica` (control de condiciones, no tasa de fallos al azar), `Vigor` (supervivencia), `Sintonía` (afinidades/hechizos), `Temple` (resistencia a controles) y `Instinto de hallazgo` (descubrimiento, pesca y botín). **Son nombres de laboratorio**, no una lista aprobada ni una razón para introducir estadísticas redundantes.

**Progresión:** separar nivel de personaje, nivel de oficio y dominio de técnicas. Para hacer visibles los saltos, medir acceso a nuevos territorios/estrategias por tramo de diez niveles, sin que enemigos de nivel bajo resulten inútiles o que se necesite grind artificial. Investigar progresión horizontal en la etapa posterior al nivel máximo.


## 10. Objetos, sets y botín

### Lectura pulida de las respuestas del creador

**Visión expresada.** Equipables variados: sombreros, dos anillos, cinturones, collar, abrigo, arma y mano secundaria/escudo; mascota y montura simultáneas con aportes propios. **Idea divertida por explorar:** botas distintas en cada pie, para ampliar combinaciones; no descartarla, pero medir su sobrecarga de interfaz y arte. Falta inventar equivalentes originales a objetos extraordinarios de alto valor. Los enemigos pueden soltar equipo completo, como en FATE, y también materiales para oficios. Mientras se desarrolla el prototipo, conviene favorecer el *drop* directo para probar builds sin fabricar todo.

**Rareza y mejoras.** Interesa combinar identidad de cada objeto con tiradas de estadísticas, variantes raras, gemas, progresión de sets y una futura mejora de objetos más satisfactoria que una lotería cara y punitiva. Los «objetos dorados» con características duplicadas son una **hipótesis para pruebas**, no una regla universal segura para la economía. Sets con bonos importantes, incluidos equivalentes funcionales a recursos de acción y movilidad, pero sin copiar PA/PM.

**Inventario y propiedad.** Límite por peso, banco y cofres en casa; sin durabilidad ni pérdida automática de equipamiento. Requisitos de nivel para equipar. El creador quiere un banco 3D dorado y materiales brillantes como prueba visual; esto se registra como **tarea artística solicitada al equipo**, no como un recurso gráfico ya creado.

### Laboratorio de propuestas — NO APROBADO

**Botas asimétricas — prueba opcional:** izquierda y derecha con estadísticas pequeñas e identidad visual; ofrecer botón «equipar conjunto» para evitar microgestión. Comparar la diversión de combinaciones contra el coste de diseños, modelos y tooltips. Si añade demasiado ruido, conservarlo como categoría rara o accesorio cosmético.

**Reliquias alternativas a los «Dofus» (nombres por validar):** `Testigos del Istmo`, `Núcleos de Ruta`, `Sellos de Marea`. No tienen por qué ser huevos ni objetos coleccionables idénticos: podrían alterar una interacción concreta (p. ej. nueva forma de desencadenar una sinergia), con poder limitado y opciones de build.

**Economía:** comparar un modelo de rareza por afijos con otro de pieza única y calidad variable. Duplicar todas las estadísticas puede destruir el valor del resto del equipo; ensayar el multiplicador x2 como evento de prototipo, registrar su efecto e impedir que se vuelva norma sin aprobación.


## 11. Oficios, recolección y fabricación

### Lectura pulida de las respuestas del creador

**Visión expresada.** Oficios iniciales: leñador, pescador, campesino, minero, un oficio que forja armas y escudos (*«forjatodo»* como nombre de trabajo) y otro que confecciona el resto de equipables (*«confeccionatodo»*). Suben de nivel de manera independiente. Fabricar requiere receta, materiales, taller y nivel. Debe haber **dos caminos**: fabricación directa o minijuego optativo que pueda mejorar la calidad/probabilidad, sin destruir injustamente materiales valiosos. Los recursos del mundo se recogen y reaparecen.

**Pesca.** El sistema actual tiene errores por corregir. Se quieren puntos circulares visibles de actividad de peces en cuerpos de agua, hallazgos raros y vínculos con mascotas. La estadística de descubrimiento o equivalente a prospección debe influir en lo que se puede encontrar, sin garantizar objetos raros cada vez.

### Laboratorio de propuestas — NO APROBADO

**Minijuego opcional de taller:** una secuencia breve de alinear resonancias o estabilizar una pieza, inspirada solo en la idea de un reto adicional, **no en copiar la interfaz de hacking de NieR**. La fabricación rápida entrega resultado normal; el minijuego puede conceder un pequeño extra controlado de calidad. Impedir que la versión manual se vuelva una tarea repetitiva obligatoria para competir online.

**Pesca:** círculos o remolinos de fauna que aparecen por clima, hora, profundidad y presión de pesca; el búho u otra mascota podría detectar movimiento y el zorro atraer/bloquear ciertos peces. Incluir `Instinto de hallazgo` o un nombre cercano para la probabilidad de botín especial, con rendimientos decrecientes.


## 12. Mascotas y monturas

### Lectura pulida de las respuestas del creador

**Visión expresada.** Las mascotas pueden luchar, dar bonificaciones, recoger botín, crecer, cambiar con determinados alimentos o pescado y formar parte de ataques combinados. El creador no ha elegido entre los sistemas de FATE y DOFUS: quiere explorar un híbrido más original. La muerte de una mascota puede convertirla en espectro y exigir ayuda de un resucitador. Las monturas sirven para velocidad y movilidad especial, incluido el vuelo cuando la zona lo permite; la crianza queda abierta. Mandar mascotas a vender al pueblo, como en un RPG individual, no encaja directamente con un mercado MMO sostenido por jugadores.

**Idea original que conviene preservar.** Ataques geométricos con la mascota: distancia exacta entre ambos para tender un rayo, proximidad para un estallido, líneas entre trampas y desplazamientos sincronizados. Esto convierte la colocación del compañero en una mecánica táctica, pero obliga a diseñar controles simples.

### Laboratorio de propuestas — NO APROBADO

**Control con un solo ratón:** mascota en IA básica, con cuatro órdenes contextuales (`Sígueme`, `Espera`, `Marca objetivo`, `Ve al punto`). Una tecla modificadora + clic ordena la posición; el juego dibuja un arco/línea de conexión antes del combo y permite confirmar con un hechizo, evitando microgestión de un segundo personaje entero.

**Ejemplos de experimentos:** `Arco gemelo` (jugador y mascota separados enlazan un haz); `Nudo guardián` (cerca, escudo de área); `Huella trampa` (la mascota marca una traza que detona con el hechizo del jugador). Un servidor deberá validar geometría y enfriamientos.

**Muerte de mascota:** espectro recuperable mediante ritual o NPC, con mecanismos de recuperación accesibles y sin compra obligatoria. Examinar si conviene evitar que muera durante el combate para no frustrar a quienes la usan como herramienta social.


## 13. Economía y comercio entre jugadores

### Lectura pulida de las respuestas del creador

**Visión expresada.** Mercado entre jugadores, venta de productos y precios variables con las ofertas más baratas de un objeto equivalente primero. La moneda merece un nombre con identidad panameña —el creador propuso **«bibuyo»** como idea inicial— y no debe llamarse como en otra franquicia. Gastos posibles: equipo, mejoras, transporte, requisitos de misiones, viviendas, uso del banco e impuestos de comercio. El mercado debe ensayarse con simuladores y pruebas online antes de asumir su buen funcionamiento.

### Laboratorio de propuestas — NO APROBADO

**Nombres candidatos, todos no aprobados:** `Bibuyos` (preserva tu idea), `Biyuyos` (variante de escritura), `Mareles` (inspiración marítima), `Briznas` (menos local), `Cascabeles` (más fantástico). Probarlos en mensajes de compra: «Cuesta 240 bibuyos» tiene buena sonoridad; la elección final te pertenece.

**Mercado MMO:** listado por precio total/unidad, calidad de afijos y vinculación; historial sencillo; impuestos transparentes; depósito o comisión razonable para evitar spam. Precio variable por jugadores, pero vendedores NPC iniciales para garantizar acceso a elementos básicos. Antifraude, límites y propiedad deben ser autoritativos del servidor.


## 14. Misiones, historia y PNJ

### Lectura pulida de las respuestas del creador

**Visión expresada.** Historia principal original con inspiración geográfica y cultural panameña; el creador ha delegado **inventar propuestas**, no aprobar automáticamente una trama. Se desean cadenas secundarias largas que mezclen exploración, combate, recolección, fabricación, diálogo y actividades tranquilas; recompensa proporcional a su significado, no simplemente a la duración. Misiones diarias/repetibles, con diseño que evite obligaciones tediosas. Logros después de estabilizar una versión realmente entretenida. Una enciclopedia de criaturas, objetos y zonas ayudará tanto a la exploración como a la depuración del equipo.

### Laboratorio de propuestas — NO APROBADO

**Pitch de historia A — «La Ruta entre las Aguas» (propuesta original):** en un istmo de dos costas, caminos imposibles aparecen donde antes solo había selva y mareas. Antiguos faros dejaron de orientarse hacia el mar y comenzaron a señalar tierra adentro. Los pueblos comercian por estas rutas cambiantes, pero criaturas adaptadas a distintos climas empiezan a desplazarse fuera de sus territorios. El jugador no es «el elegido»: es un explorador que descubre por qué el mundo está dejando de reconocer sus propios caminos. La historia podría tener **final definido** (cerrar o estabilizar la ruta) y un mundo persistente que continúa después, con nuevas expediciones.

**Pitch B — «Las Voces del Aguacero» (alternativa):** la lluvia trae ecos de acontecimientos que aún no sucedieron; unas comunidades aprovechan esas advertencias y otras las manipulan. Se investiga un fenómeno que une montaña, costa y subsuelo mediante expediciones, archivos, músicos y pescadores. Tono más misterioso, menos épico.

**Cadena piloto original:** un pez de aguas altas contiene una marca idéntica a la encontrada en una ruina del litoral; su hallazgo conduce a un oficio, a un PNJ que miente por miedo y a una mazmorra cuyo jefe altera caminos en lugar de simplemente tener mucha vida. Poner siempre una resolución narrativa y una recompensa útil, no extender por extender.

**Regla cultural:** emplear habla y paisajes panameños con investigación y respeto; si se utilizan tradiciones o conocimientos de comunidades específicas, consultar su contexto y evitar mezclarlos superficialmente.


## 15. Monstruos y jefes

### Lectura pulida de las respuestas del creador

**Visión expresada.** Criaturas por familias de región con nombres y conductas originales; jefes con fases, espacios cambiantes, invocaciones y contrajuego. Criaturas excepcionalmente raras que se conviertan en relatos entre jugadores y dejen botín especial, **sin reutilizar nombres propios de otros videojuegos**. Algunos monstruos huyen, otros piden auxilio, se protegen o intentan rodear; su conducta debe tener pistas visuales y sonoras.

### Laboratorio de propuestas — NO APROBADO

**Borrador de mapa de familias hasta nivel 100 — propuesta geográfica, no mapa aprobado:**

| Tramo | Región de trabajo | Clima / paisaje inspirado en Panamá | Familia o amenaza distintiva |
|---|---|---|---|
| 1–10 | Orilla de los Faroles | pueblo, costa y caminos húmedos | garzas de sal y cangrejos de campana |
| 11–20 | Llanos del Guayacán | sabana seca y flores amarillas | escarabajos yesqueros y zorros de polvo |
| 21–30 | Las Mangas de Salitre | manglar y mareas cambiantes | cangrejos de raíces y anguilas terrestres |
| 31–40 | Quebradas de la Culebrina | riachuelos, lomas y roca | musgos espina y ciempiés de cascada |
| 41–50 | Cuesta del Cocuyal | bosque nocturno con luciérnagas | cazadores de farol y polillas de sombra |
| 51–60 | Alto de la Llovizna | montañas nubosas | lobos de niebla y guardianes de orquídea |
| 61–70 | Filo del Viento Hueco | desfiladeros y tormentas | mantarrayas aéreas y centinelas de rayo |
| 71–80 | Calderas de la Nube | altura fría, roca y vapor | escamas de escarcha y forjadores de vapor |
| 81–90 | Bahía del Cielo Torcido | islas suspendidas o costa extraña | aves brújula y coral errante |
| 91–100 | Umbral de los Dos Mares | anomalía entre territorios | custodios de ruta y bestias del umbral |

Los nombres sirven para **imaginar** conexiones entre bioma, cultura, música y combate; no implican que debamos desarrollar diez mapas antes del primer juego divertido.

**Jefes con mecánicas:** cambiar las líneas de visión, separarse para abrir una vía, cortar apoyo de invocaciones o resolver un patrón de terreno. El jefe raro podría aparecer tras condiciones observables (clima, hora, evento), con telemetría y protección contra acaparamiento en MMO.


## 16. Sonido, arte y herramientas

### Lectura pulida de las respuestas del creador

**Visión expresada.** Probar recursos 3D y animaciones libres compatibles, revisar su origen/licencia e integrarlos para elevar mucho la calidad del prototipo. Música por zona: el aspecto hoy parece medieval, pero la ambientación final no está cerrada; la banda sonora debe acompañar el paisaje y reforzar misterio, calma y peligro. El creador propone voces y algunas interacciones mediante IA, como sistema a investigar.

### Laboratorio de propuestas — NO APROBADO

**Pipeline de arte sugerido:** bloquear primero siluetas, animaciones, proporciones interiores/exteriores y lectura de enemigos; luego materiales, iluminación, agua y vegetación; después identidad artística original. Priorizar licencias verificables, registro de procedencia, presupuesto de memoria y versiones simplificadas. No distribuir assets con licencias incompatibles.

**Voces con IA:** grabación/voz sintética para PNJ importantes con derechos adecuados y consentimiento cuando se usen voces de personas; diálogos dinámicos limitados por el lore y por seguridad, coste y latencia. **No convertir al modelo en autoridad del mundo o fuente de recompensas**. Empezar con conversaciones guiadas y voces pre-generadas.


## 17. Plataformas y prioridades

### Lectura pulida de las respuestas del creador

**Visión expresada.** Plataformas objetivo: **Windows, macOS y Linux**, control por teclado y ratón/trackpad. Steam Deck y consolas no son prioridad en este momento. Orden solicitado: **1) gráficos, 2) mapa y minimapa, 3) zonas y criaturas por nivel, 4) mazmorra con jefe, 5) interfaz, 6) historia, 7) oficios, 8) más clases**.

**Problemas actuales que no deben diluirse:** cámara brusca, sin suavidad configurable ni encuadres invocables, seguimiento/autofoco insuficiente, falta de cámara inteligente ante monstruos y deseo de modo de cámara por regiones (sin cargas). El combate necesita interacciones interesantes entre hechizos, nuevas geometrías de ataque y controles menos exigentes; no basta multiplicar conos, rectángulos y líneas. Personajes y monstruos requieren texturas mejores. Hace falta un **editor propio de mundo y contenido**; la IA es apoyo, no reemplazo de la creatividad manual. También se necesita un plan geográfico antes de generar zonas al azar.

### Laboratorio de propuestas — NO APROBADO

**Plan de validación por hitos (adaptado a tu orden):** antes de sumar nuevas clases, crear una pequeña zona visualmente creíble con cámara cómoda y dos hechizos que combinen; mapa/minimapa con una misión; una familia enemiga con un jefe de mecánica memorable; una primera mazmorra diseñada a mano. Medir FPS p95, memoria GPU, carga de sectores, tiempo de respuesta y claridad jugable.

**Cámara:** opciones de `seguir`, `fijar zona` y `inteligente` sujetas a pruebas para evitar mareos. En modo de cámara por zona, transicionar suavemente el encuadre entre celdas cartográficas sin hacer cargas de mapa. Movimiento borroso, si se incluye, debe ser activable y moderado.

**MMO:** no dejar que el prototipo avance indefinidamente sin experimentar un servidor autoritativo, sincronización de combate y propiedad de botín; esto es una recomendación técnica, no un cambio de prioridad creativa impuesto.


## 18. Cuestiones adicionales tras jugar

### Lectura pulida de las respuestas del creador

**Visión expresada.** Aprobación exploratoria de la cuadrícula cartográfica de 32 × 32 m, puntos de viaje que se activan y cobran poco según distancia, con selección del sitio de aparición; si no se elige ninguno se vuelve al inicio. Al morir hay que encontrar cómo obtener resurrección, coherente con el estado fantasma descrito antes. Aviso de zona peligrosa con monstruos alrededor de **20 niveles** por encima del personaje, configurable por datos. Colisión de cuerpos y obstáculos ajustada. El **editor es para el creador**, no una función general de decoración de casas para jugadores por ahora. Mazmorras finitas con varios pisos, dificultad creciente, laberintos y retos intencionales; parámetros configurables, sin aleatoriedad obligatoria. Una barra horizontal permanente de enemigos puede ser demasiado lenta de consultar para el ritmo de combate actual.

### Laboratorio de propuestas — NO APROBADO

**Puntos de viaje originales:** nombres de trabajo `Faros de Ruta`, `Anclas de Camino` o `Hitos de Marea`; al descubrirlos se desbloquea viaje con coste pequeño. **No confundir** punto de teletransporte, preferencia de resurrección y guardado del personaje: tres conceptos que pueden convivir con opciones distintas.

**Muerte y recuperación — experimento:** la vida llega a cero, el jugador entra en estado espectral; debe llegar a un santuario o resucitador, y una reserva de `Ánima` (nombre de trabajo) determina limitaciones temporales, sin destruir equipo ni borrar experiencia como castigo automático. Si morir «al llegar la energía a 0» significa otra cosa, dejarlo abierto explícitamente.

**Editor de mundo y contenido:** herramienta separada o modo desarrollo protegido, con selección/movimiento/rotación, pinceles de terreno, agua, colisiones, vegetación, PNJ, zonas y puntos de aparición; deshacer/rehacer, validadores, historial, vistas previas y exportación a archivos de datos versionados. El creador podrá describir cambios por IA y también ajustarlos manualmente; **la IA propone un borrador, no escribe sin control el mundo definitivo**.

**Barra de enemigos:** probar retratos compactos solo de objetivos prioritarios, estados esenciales y ataque inminente, con panel expandible bajo demanda. Más que añadir indicadores, estudiar la velocidad de acción y movimiento para que la información pueda leerse.


---

# Parte II — Puentes entre sistemas y decisiones por validar

## A. Bucle jugable sugerido, sin aprobación

**Exploración → descubrimiento → preparación → encuentro táctico → recompensa → comercio/oficio → nueva expedición**. Cada tramo debe justificar su existencia. Una zona no es solamente un lugar para matar monstruos; contiene historias, recursos, peligros, música, variaciones climáticas y secretos. Un objeto raro debe crear una posibilidad nueva, no solo un número mayor.

## B. Separación entre experiencia individual, cooperativo y mundo masivo

- **Viajar en mundo abierto:** otros jugadores existen alrededor, pero la visibilidad y sincronización deben limitarse por cercanía; los monstruos pueden generar encuentros protegidos para evitar robos de objetivos.
- **Encuentro público aislado:** se necesita una regla original de apropiación e invitación de aliados. El resto del mundo puede seguir vivo sin interferir en la pelea.
- **Mazmorra:** la instancia agrupa la expedición; no es obligatorio crear una nueva burbuja aislada dentro de cada habitación. Los retos, llaves, pisos y jefes deben ser compatibles con grupos y latencia.
- **Economía:** inventario, monedas, recompensas, comercio y progreso deben ser autorizados por un servidor. Guardar en `localStorage` sirve para prototipo local, no para impedir trampas.

## C. Prueba de combate mínima para decidir PA/PM adaptados

Construir una sala con dos arquetipos jugables, un enemigo a distancia, uno de control y un jefe sencillo. Comparar **tres versiones de reglas** bajo el mismo escenario y medir no solo DPS: órdenes por minuto, tiempo ocioso, decisiones relevantes, golpes evitados, frustración del cursor, latencia percibida y claridad de contrajuego. La elección del sistema se hace **después de jugar**, no por analogía con otro título.

## D. Contrato técnico sugerido para agentes

- Mantener lógica de combate y progreso independiente de Babylon/Electron, preparada para servidor autoritativo.
- Datos editables y validados para zonas, climas, hechizos, enemigos, misiones, objetos y condiciones de drop.
- El editor del mundo no puede publicar cambios sin revisión, pruebas y control de versiones.
- Toda opción de interfaz y cámara se debe probar con ratón y **trackpad real**, además de Windows, macOS y Linux.
- El rendimiento se informa por **FPS y p95 de fotograma, CPU de simulación, CPU de render, GPU cuando sea posible, memoria y pausas al generar assets**. Un benchmark de 200 monstruos locales **no certifica** 200 jugadores online.

## E. Preguntas prioritarias para el creador — no bloquean exploración

1. **Ambientación:** ¿fantasía tropical, tecno-fantasía, o mundo que cruza épocas mediante rutas/anomalías? La respuesta da identidad a clases, reliquias, monstruos, música y oficios.
2. **Cadencia táctica:** ¿te atrae más una reserva para acciones, otra para movilidad o un sistema centrado en posicionamiento? Se puede jugar un prototipo de las tres opciones antes de responder.
3. **Encuentros abiertos:** ¿quieres permitir que un tercero ayude de forma voluntaria, o aislar toda pelea una vez iniciada?
4. **Fuego amigo:** ¿en qué modos un hechizo de área puede lastimar aliados? La respuesta debe ser transparente y consistente.
5. **Muerte espectral:** ¿la pérdida de energía es por cada muerte, y la resurrección es necesaria desde la primera, o solo al agotar la reserva?
6. **Mascotas:** ¿prefieres compañeros autónomos con combos ocasionales o un sistema de dos posiciones que controle el jugador?

Estas preguntas no sustituyen las **113 respuestas originales**; son el pequeño conjunto de cruces donde una elección afecta muchos sistemas a la vez.

---

# Anexo A — Cuestionario íntegro del creador (versión de consulta)

> **Fidelidad:** se conserva el contenido original de las 18 secciones y sus 113 líneas de respuesta, incluida la respuesta en blanco. Solo se normaliza el marcado Markdown escapado de la copia, sin corregir ni reinterpretar aquí sus palabras. Para la edición limpia de conceptos y los desarrollos imaginativos, ver la Parte I. Las faltas ortográficas del anexo son parte de la transcripción literal.


# Preguntas para el creador

Responde debajo de cada pregunta, en la línea `> R:`. Puedes escribir lo que quieras:

- cómo lo hace Dofus, cómo lo hace FATE, qué te gustaba y qué odiabas de cada uno;

- un ejemplo concreto;

- «lo que tú veas».

Si una pregunta no te importa, déjala vacía y decido yo.

En cada apartado aparece **Hoy** (lo que ya hay en el prototipo) y luego las preguntas.

---

## 1. Visión general

**Hoy:** RPG 3D de un jugador, combate en tiempo real con clic para moverse, zona continua y aspecto propio. Dofus y FATE son solo referencias.

1. Resume el juego en 2–3 frases, como se lo contarías a un amigo.
> **Respuesta original:** 
2. De Dofus, ¿qué 5 cosas son imprescindibles? ¿Y qué 3 no quieres ni ver?
> **Respuesta original:** el sistema de economia,la estrategia para ganar batallas, los sets y objetos, profesiones y modificacion de objetos forjamagia, sistema de hechizos por clases y hechizos que pueden tener otras clases y sus niveles, las actitudes y emoticonos estaban buenos, poder hablar (chat y que otros jugadores puedar ver el texto segun el canal y si estan en tu mismo mapa o pelea como en dofus touch) el sistema de aislamiento de mapa para una pelea eso esta bueno en mundo abierto, en mazmorra creo que no deberiamos aplicar y en ciertas zonas tambien ya que es en tiempo real (esto es para que no nso roben el mob o nos dañen la pelea). las que no quiero ni ver: es el sistema por turnos en su lugar podemos extrapolar pa y pm con otras formas de limitar los enemigos para que esto no se vuelva un juego generico que parezca batallas freneticas como carniceria y no se tenga una estategia mas que pegar y pegar. otra cosa son los graficos pobres de dofus 3 y retro en su momento me gustaban pero creo que se puede mejorar la calidad, en dofus no se puede volar, las proporciones de los espacios cerrados (dentro de alguna casa castillo milica no estana acodes al mundo) mounstruos repetitivos sets inutiles zonas que la gente ni va porque los recursos no sirven ni se venden.
3. Lo mismo de FATE: 5 imprescindibles y 3 que sobran.
> **Respuesta original:** el misterio, la pezca las masmorras, el sistema de moficacion de objetos y tambien los objetos que se le ponian gemas, la mascota que la mandabas a vender (pero en un mmorpg cuando la economia la lideran los jugadores no se como podriamos poner esto), el miedo de que te podia salir un bicho fuerte y raro en medio de la nada en un piso avanzado de la mazmorra. lo que no me gusta es: la aleatoriedad de los efectos al modificar los objetos con magia y puede fallar y cuando fallan dan malus y el coste excesivo para modificarlos ademas de que parecia no tener fin. tener que der demaciados clicks y se volvia monotono solo tirar un hechizo o pegar basicos todo el rato, ademas de que las animaciones toscas y que no se puede girar la camara y todo era solo estar en la mazmorra infinita esas cosas no tenemos que repetirlas, cada cosa debe tener su proposito y debe ser divertida y que genere euforia o dopamina al jugador realizarla.
4. ¿Hay otro juego que también te sirva de referencia (Tower of Fantasy, Diablo, Path of Exile, Wakfu, Albion…)? ¿Qué tomarías de él?
> **Respuesta original:** he juigado genshin impact, tower of fantasy y albion, pero albion los graficos muy baratos y muchas cosas que aprender. genshin estaba bueno pero no es mmorpg lo amlo en una habilidad habian mulples efectos y que pereza leer tanto, me gustaba la sinergia de elementos y reacciones elementales, de tower la exploracion las ricas waifus pero mas de lo mismo farmear yu farmear y te ponian limite para todo y asi que pereza.
5. ¿Va a ser siempre de un jugador, o algún día online o cooperativo? Cambia mucho cómo se programa.
> **Respuesta original:** esto tiene que ser online definitivamente y cooperativo
6. ¿Qué tono buscas: serio, humorístico como Dofus, o mezcla? ¿Y qué estética: colores vivos, oscura, _*low poly*_…?
> **Respuesta original:** mezcla con nombres raros y como soy de panama puedes agregar costumbres palabras lugares de aca tambien
7. ¿Cuánto debe durar? Por ejemplo, horas hasta el nivel máximo o tamaño del mundo.
> **Respuesta original:** hasta el nivel maximo de la zona pero eso va con el nivel del personaje, en dofus es lvl 200 en fate no recuerdo, en tower menos, en genshin era 90 creo y 95. ya definiremos mejor la experiencia que requiere subir al siguiente nivel y cuantos niveles al final serán, ademas recuerda que se puede jugar indefinidamente dofus y no tiene fin porque constantemente se agregan contenidos nuevos.
## 2. Mundo, zonas y viaje

**Hoy:** una sola zona de 256 × 256 m con pueblo, caminos y estanque. Un agente en la nube está haciendo zonas por franjas de nivel con monstruos que escalan.

1. ¿El mundo es un mapa grande y continuo, varias zonas unidas por bordes o portales, o islas y continentes como en Dofus?
> **Respuesta original:** puede ser una zona grande continua y par aentrar en mazmorras o dimensiones o zonas lejanas usar pasajes como barcos globos, o algun medio de transporte que simule que cambiamos de zona, ya que si cargamos todo el mundo de golpe podemos tener problemas de rendimiento, pero si creo que deberia ir cargandose en funcion de lo que nos vayamos desplazando para no tener el problema de carga de mapas en dofus y eso lo odio.
2. ¿Cuántas zonas quieres para el prototipo y con qué franjas de nivel? Por ejemplo: pueblo 1–5, pradera 5–15, bosque 15–30…
> **Respuesta original:** hasta nivel 100 las franjas son de 10 en 10 con familias de bichos con valores entre sus franjas, como dije anteriormente puedes usar nombres de panama o del mundo para llamar las zonas ya que eso de bosque que pendejada ajaj, en dofus hay lugares como frigost, llanuras de cania etc, aca podemos generar nombres dependiendo de la zona si es calida tamplada o fria como en panama, variantes de azuero, boquete, chiriqui cosas asi mi rey
3. ¿Hay mazmorras (zona cerrada con jefe al final)? ¿Son instancias aparte, generadas al azar como en FATE o fijas como en Dofus?
> **Respuesta original:** las zonas de jefe final son zonas de mazmorras aisladas del mundo y se pide llave para entrar o algo llavero como en dofus,aunque en fate no se pide eso podriamos poner como mazmorra definitiva para cada zona con artos pisos como fate y una recompensa final pero que no sea facil de terminar
4. ¿Cómo se viaja: a pie, zaapis/teletransportes, monturas, pergaminos de regreso?
> **Respuesta original:** estoy probando la navegacion y tengo problemas para apuntar los hechizos en lo que voy caminando esquivando y pegando, en dofus solo era moverse y luego pegar, con el alcance y clicando el hechizo y luego el objetivo aqui deberia ser con la tecla y luego clicando el objetivo o combinacion segun sea el tipo de hechizo o lo mas conveniente para el jugador. se puede viajar a pie, en monturas, mascoturas pero no le vamos a poner los miismops nombres que en dofus y podemos poner algunas que vuelen, podemos usar posimas de recuerdo, ojo que pusiste zaaps y no podemos usar terminos de dofus tenemos que ser originales pero manteniendo la idea principal
5. ¿Cómo debe ser el nivel máximo del juego y el de las zonas? ¿Monstruos que pueden matar de un golpe fuera de tu nivel (ya anotado)?
> **Respuesta original:**  tendriamos que toimar todos los juegos que he mencionado y llegar a un consenso, he visto gente nivel 800 omega en dofus pero no aporta caracteristicas ni nuevos sets, no importa los niveles en si lo que importa es la jugabilidad yu las diferencias entre los niveles se vean marcadas
6. ¿Los monstruos van en grupos, como en Dofus, o sueltos? ¿Reaparecen? ¿Con qué frecuencia?
> **Respuesta original:** en grupos desde 1 en adelante hasta un maximo (no se aun que maximo le pondré) si reaparecen si no no tiene sentido XD, eso lo defines tu en funcion de todos los juegos mencionados
7. ¿Hay ciclo de día y noche con efectos de juego, por ejemplo monstruos solo de noche o peces nocturnos? Hoy el ciclo es solo visual.
> **Respuesta original:** eso estaria bueno meterlo
8. ¿Hay clima (lluvia, nieve…)? ¿Afecta a algo?
> **Respuesta original:**  si puedes ponerlo tambien, nieve el movimiento es limitado dependiendo de la acumulacion de la misma pero debe ser en zonas con nieve, lluvia mm disminulle el poder de fuego, sol aumenta el poder de fuego (esos elementos tenemos que pulirlos)
## 3. Mapa y minimapa

**Hoy:** no hay ninguno de los dos.

1. ****Minimapa:****

    - ¿Redondo o cuadrado? ¿En qué esquina?
> **Respuesta original:**  cuadrado arrastrable a la derecha
    - ¿Gira con la cámara o tiene el norte fijo?
> **Respuesta original:**  norte fijo o dinamico con brujuila e indicadores de mision o banderitas
    - ¿Qué muestra: enemigos, PNJ, misiones, botín, compañeros?
> **Respuesta original:** si todo lo que sale en dofus tambien en el mapa y minimapa recuerda que son 2 cosas
2. ****Mapa grande**** (tecla M):

    - ¿Pantalla completa o ventana?
> **Respuesta original:**  ventana al abrir el mapa con funciones completas
    - ¿Con niebla en lo no explorado?
> **Respuesta original:**  puede sel XD esta weno eso
    - ¿Con coordenadas como Dofus ([x, y])?
> **Respuesta original:**  podemos usar el sistema de dofus pero no copiarlo, podemos usar otro tipo de nomenclatura de coordenadas y mas si hay areas con altura
    - ¿Se pueden poner marcas o banderas propias?
> **Respuesta original:** si
3. ¿Se muestran en el mapa las zonas con su franja de nivel?
> **Respuesta original:**  activable o desactivable con las funciones del mapa (los cheks COMO EN DOFUS)
4. ¿Hay brújula u objetivo de misión en pantalla, como una flecha que apunta al destino?
> **Respuesta original:** si
5. ¿Hay que explorar el mapa para descubrirlo? ¿Da recompensa?
> **Respuesta original:** si, lo segundo mmm sistema de logros tambien?? XD puede ser mi rey pero vamos con calma, que los bocetos y los graficos estan feos porque son genrados sin amor
## 4. Interfaz y HUD

**Hoy hay:**

- retrato con vida y recurso;

- barra de 20 hechizos en dos filas, con pociones a los lados;

- botones de mochila, personaje, libro y menú;

- registro de combate;

- seguimiento de misión;

- ventanas que se arrastran;

- 5 temas, 4 letras y tamaño de interfaz del 75 al 150 %.

1. Pediste iconos más grandes. ¿Cuáles? ¿La barra de hechizos, los objetos de la mochila, todo? ¿Prefieres un tamaño por elemento (barra, mochila, retrato…) o uno general?
> **Respuesta original:** todo mas grande u una funcion auto calculable en funcion del tamaño real de tu pantalla
2. ¿Quieres poder mover también los elementos del HUD (barra, retrato, registro, minimapa) y guardarlos en un perfil, como el modo de edición de Dofus?
> **Respuesta original:** si exactamente
3. Temas elementales, como en Dofus: agua (azul), viento/aire, fuego (rojo), tierra (marrón) y naturaleza (verde).

    - ¿El viento sería blanco/celeste o verde claro?

    - ¿Mantenemos el neutro (Pergamino), el Claro y el de Alto contraste?
> **Respuesta original:** no hay que usar cosas propias de un juego ya serio y no cosas de desarrollo, los que ya te habia comentado si quieres metele mas cariño a eso tambien
4. Letra: ¿te gusta alguna de las 4 de ahora? ¿Quieres una «de fantasía»? Eso supone descargar una fuente libre con tu permiso.
> **Respuesta original:**  si me gusta la moderna u legible, puedes agregar mas como futuristic y pixcel como en C:\Users\frank\Desktop\2025\LiveWallpaperAnimeGlitch>
5. ¿Qué ventanas faltan? Por ejemplo: mapa, oficios, bestiario, logros, ajustes de mascota, monturas, banco, chat…
> **Respuesta original:** oficios bestiario( recuerda no usar los mismos nombres), mascota, monturas, banco si la de chat no la hemos hecho xD. la de grupo como en dofus
6. ****Barras de vida de los enemigos:****

    - ¿Encima de la cabeza siempre, solo al recibir daño o solo la del objetivo?

    - ¿Mostramos su nivel y su nombre?
> **Respuesta original:**  queria que saliera como en dofus, en funcion de si estoy en pelea con ese bicho
7. Números de daño flotantes:

    - ¿Los mantienes?

    - ¿Con color por elemento?

    - ¿Quieres ver también la curación y el daño que recibes?
> **Respuesta original:**  el daño se confunde el simbolo de ! con otra cifra, en dofus sonaba el sonidito de criutico y tenia una animacion el propio critico de un ! explotando o algo asi podemos hacer eso aca
8. ¿Hay que seleccionar un enemigo como objetivo, con un marco que muestre su vida, sus estados y lo que está lanzando, o basta con hacer clic directo?
> **Respuesta original:** como explique,por ejemplo flecha explosiva tiene daño en area si se tira y cae en la zona le pega a alguien que este en dicha zona sea aliado o enemigo, hay hechizos mono targen esos si no te puedes escapar ni evadir porque van directo a reventarte rey.
9. ¿Qué información quieres en los tooltips de hechizos y objetos? Por ejemplo: daño por rango, comparación, fórmula…
> **Respuesta original:** los tooltips al pasar el puntero y las caracteristicas completas al abrir la ficha de hechizos, al pulsar la tecla mostrar el alcance del hechizo y si lo paso encima de un enemigo mostrar cuanto le va a pegar antes de pegarle.
10. ¿Algún elemento de Dofus o FATE que eches de menos en pantalla?
> **Respuesta original:** hecho de menos los emotes de dofus y que te sigan si caminas con tiempo de desaparicion igual si escribes y te mueves te vaya siguiendo la burbuja del chat que escribiste y se muestre en los canales del chat fijo. los temporis del dofus eran brutales multiplicadores de xp y drop y mounstros que mantandolos te daban objetos directamente equipables sin tener que fabricarlos, la forjamagia de dofus pero mejorar el sistema aca, las resistencias % maximo 50% no metas erosion aqui, la pezca de fate que dropiabas cosas raras, en dofus los objetos dorados de dofus touch bien raros de conseguir tantas cosas mi rey...
## 5. Opciones (configuración completa)

**Hoy** hay pestañas:

- ****Interfaz:**** tema, letra, tamaño y bloquear ventanas.

- ****Pantalla:**** pantalla completa, límite de FPS, FPS visibles, trayectoria y cuadrícula.

- ****Cámara:**** sensibilidad, invertir ejes y giro con teclas.

- ****Controles:**** atajos.

- ****Sonido:**** general, música y efectos.

1. ****Calidad gráfica.****

    - ¿Prefieres preajustes (Baja/Media/Alta/Ultra) o cada opción suelta?

    - Opciones posibles: sombras, densidad de hierba y árboles, distancia de visión, partículas, resolución interna, antialiasing, recorte de objetos que tapan…
> **Respuesta original:** preajuestes, si tambien las opciones posibles que pones, espero que el juego este usando la grafica y no el cpu y que podemos decidir donde se procesan las graficos
2. Interfaz: ¿qué más quieres configurar? Por ejemplo:

    - transparencia de ventanas;

    - animaciones de interfaz;

    - tamaño del texto del registro;

    - cuánto tarda en salir un tooltip.
> **Respuesta original:** la transparencia esta buena mi rey, mostrar u ocultar animaciones (no deben afectar el temporizador) si se desactivan las aniumacion debe mostrarse una generica como en el modo criaturas de dofus.
3. Juego: ¿qué ayudas activables quieres? Por ejemplo:

    - confirmar antes de vender un objeto raro;

    - recoger botín automáticamente;

    - mostrar el alcance del hechizo;

    - lanzamiento rápido (sin apuntar);

    - autoataque.
> **Respuesta original:** las confirmaciones antes de comprar algo y antes de vender tambien. el botin deberia salir en una ventana de fin de combate pero no se si meter eso es en las mazmorras o combates armados que ahora que esta en mundo abierto tener eso que matas un bicho y cae el loot en el suelo eso es propenso a que te roben otros jugadores, si mas gente participó tambien tienen chanse de drop como en dofus
4. ****Lanzar hechizos:****

    - ****Al pulsar:**** sale hacia el cursor.

    - ****Pulsar y clic:**** se apunta y se confirma.

    - ****Con indicador:**** se ve el área mientras mantienes la tecla.

      ¿Cuál quieres por defecto, o una opción para elegir?
> **Respuesta original:** con indicador la de por defecto, las otras tambien se pueden poner pero es una activa a la vez (creo)
5. ¿Hay opciones de accesibilidad importantes para ti? Por ejemplo: modo daltónico, avisos más visibles, reducir el temblor de pantalla…
> **Respuesta original:** ahorita la pantalla ni tiembla, daltinico puede ser y avisos mas visibles se configuran con el tamaño de interfaz
6. ¿Opciones de idioma (español, inglés…)?
> **Respuesta original:** mmmmmmmmmmmmmmm esto seria mas trabajoso la idea seria dejarlo dinamico con ingles y español y en el futuro poder expandirlo a otros idimas
## 6. Controles y cámara

**Hoy:**

- clic izquierdo para moverse y atacar;

- hechizos en QWERTYUIOP / ASDFGHJKLÑ, pociones en 1 y 2, Espacio para evadir;

- cámara: X, clic derecho, rueda pulsada, o `,` y `.` para girar.

1. ¿El movimiento es solo con clic, o también WASD, opcional? WASD chocaría con la barra; habría que cambiarla al activarlo.
> **Respuesta original:** debido a que pueden haber clases que se teletransporten es mejor con el mouse, porque con wasd como fijas ddonde vas a caer??, el tema es configurar que usamos para confirmar moverse a un sitio, tendriamos que probar ambos modos para ver cual se adecua a nuestro juego y jugar con las teclas de alrededor para los hechizos pero no quiero que por tener eso eliminemos hechisos
2. Cámara:

    - ¿Distancia y ángulo libres, o limitados?

    - ¿Quieres que se pueda girar del todo, o solo un poco, como en una vista isométrica?
> **Respuesta original:**  deben haber teclas que figen la mirada de la camara a predeterminado y con una tecla y la rueda del raton giramos la camara
3. ¿Quieres soporte de mando (gamepad)?
> **Respuesta original:** nop es un juego de pc
4. ¿Mantener pulsado el clic sobre un enemigo debe seguir atacándolo (como ahora)?
> **Respuesta original:**  los basicos deberian costar algo como las dagas en dofus cuestan pa, mm que podemos hacer con eso ya que estar dando clic para meter basicos cuando tenemos muchos hechizos y nos podemos mover y tierar hechizos como un ocra en dofus, el tema que si no hay wasd como hacemos ambas an la vez?
## 7. Combate

**Hoy:**

- en tiempo real, con avisos en el suelo antes de cada golpe enemigo y evasión con Espacio;

- recurso + enfriamientos;

- el azar solo varía el daño, sin fallos;

- los enemigos tienen hechizos propios con estados.

1. ¿Cómo se siente el ritmo que quieres: rápido tipo Diablo, más táctico, algo intermedio?
> **Respuesta original:** mas intermedio, eso de evasion con espacio cuando deberiamos tener habilidades que te permitan desplazarte o cambiar posiciones en vez de un dash enerico de toda la vida no lo se es poco original esa evacion
2. ¿Los avisos en el suelo te gustan? ¿Todos los ataques enemigos deberían tenerlos o solo los fuertes?
> **Respuesta original:**  estan buenos porque se ve el alcance de sus hechizos, pero revela como funcionan esta bueno como desarrollo pero ya pulido el juego la zona de efecto o el efecto deberia apartecer una animacion sobre el area marcada como en league of legends xD
3. ¿Hay bloqueo, parada o contraataque además de la evasión?
> **Respuesta original:** estados, como inmunidad las resistencias, reenvio de hechizo (hechisos de feca en dofus) contra, rolback del xelor para que mantener mecanicas de otros juegos (y eso de armadura como estadistica me lo vas quitando)
4. ¿Qué pasa al morir? Por ejemplo:

    - perder experiencia u oro;

    - romper equipo;

    - volver al pueblo;

    - ser fantasma como en Dofus.
> **Respuesta original:** pierdes energia (llamala de otra manera como hemoglobina XD es broma eso) al llegar a 0 pelas mi rey
5. ¿Hay estados de control fuertes contra el jugador (aturdir, inmovilizar)? ¿Cuánto pueden durar sin frustrar?
> **Respuesta original:** como en dofus te joden los pm, te hacen pasar turno mm podemos extrapolar eso aca tambien no deben durar mucho despues lo calibramos
6. ¿Placaje y bloqueo de casillas como en Dofus, adaptado al tiempo real, o nada de eso?
> **Respuesta original:** el de casillas mm podriamos experimentar ambos modos y ver como se sienten
7. ¿Elementos: tierra, fuego, agua, aire y neutro como en Dofus, o los de ahora (físico, fuego, hielo, tormenta, tierra)? ¿Con resistencias por elemento?
> **Respuesta original:** toca inventar otros nombres, en dofus fueron originales, pusieron sabiduria, vida, suerte, inteligencia, fuerza, agilidad no es calcar rey es tomar la idea de elementos y crear los nuestros, algo que nunca se haya visto en el mundo de los video juegos
8. ¿El daño de los hechizos sube por el nivel del hechizo, por las estadísticas o por el equipo? ¿Qué pesa más?
> **Respuesta original:** como en dofus con la formula del hechizo, lo que deb pesar mas es el daño base
## 8. Clases y hechizos

**Hoy:**

- 2 clases (Vanguardia de Brasa y Tejedora de Tormentas), con 6 hechizos cada una y 4 universales por pergamino;

- cualquier clase puede equipar cualquier hechizo que conozca.
> **Respuesta original:** para las clases es necesario definir la ambientacion e historia del juego, estamos poniendo por defecto algo medieval cuandoe sto tambien podria ser futurista o algo de fantasia.
1. ¿Cuántas clases quieres al final? ¿Y para el prototipo?
> **Respuesta original:**  unas 7 pára el prototipo pero no tengo un limite recuerda que en dofus ya vanc omo por 19 clases creo
2. ¿Las clases tienen papel (tanque, sanador, daño, invocador, apoyo)? Danos ideas de clases que te gustaría tener.
> **Respuesta original:**  de momento las basicas, el sanador como el aniripsa en dofus, tanque como el sacro, iop el de daño cuerpo a cuerpo mas fuerte, bosteador y da escudos como el zobal, invocador tambiend a bost, el ocra como arquero (lo de siempre ajaj pero podemos ser originales con los nombres y tambien con los roles)
3. ¿Se aprenden hechizos al subir de nivel, como en Dofus (uno nuevo cada X niveles), o se compran o encuentran?
> **Respuesta original:** hechizos bases de la propioa clase para diferenciarla del resto y tambien un gran repertorio comprable o drpeable
4. ¿Los hechizos tienen niveles o rangos que se mejoran con puntos, como en Dofus? ¿Cuántos rangos?
> **Respuesta original:**  bueno aqui tendremos que ser originales no podemos copiar todo, como en otros juegos cada uno tiene su sistema de habilidades deberiamos inventar unop propio y divertido para nosotros
5. ¿Hechizos de otras clases sí o no? Hoy sí; es lo que te gustaba de Temporis y de FATE.
> **Respuesta original:** depende rey tenemos que ver mas adelante
6. ¿Variantes de hechizo, como en Dofus 3 (elegir entre dos versiones)?
> **Respuesta original:** eso no que pereza ajaja (aunque no estaria mal)
7. ¿Cuántos hechizos activos quieres usar en combate? La barra tiene 20 huecos.
> **Respuesta original:** se van aprendiendo en funcion de suis requisitos de nivel y si los comprar y no tienes el lvl no te los puedes poner
8. ¿Hay invocaciones del jugador? ¿Trampas? ¿Glifos o zonas en el suelo?
> **Respuesta original:** mmm mas complejo aun pero podemos implemntarlos, las tramps son hechisos pero con detonador jaja lo pisas y se activa y esta invisible estaria bueno asi sera mas tactico el combate
## 9. Personaje, estadísticas y progresión

**Hoy:**

- estadísticas: Fuerza, Agilidad, Intelecto, Vitalidad y Espíritu;

- 3 puntos por nivel, nivel máximo 20;

- la XP sube muy rápido.

1. ¿Qué estadísticas primarias quieres? ¿Como Dofus (Fuerza, Inteligencia, Suerte, Agilidad, Vitalidad, Sabiduría) o propias?
> **Respuesta original:** como dije anteriormente algo propio pero de momento si no tenemos una idea utilizar las de dofus ya luego las cambiamos
2. ¿Puntos libres al subir de nivel, o fijos por clase? ¿Se puede reiniciar el reparto?
> **Respuesta original:** se puede reiniciar y son libres
3. ¿Nivel máximo? ¿Qué curva de XP: lenta como Dofus, rápida como FATE?
> **Respuesta original:** lenta la curva si no no hay juego rey eso ya lo respondi mucha slineas atras lo del nivel maximo
4. ¿Hay algo después del nivel máximo? Por ejemplo: paragon, prestigio, equipo legendario, mazmorras más difíciles…
> **Respuesta original:** evaluable pero tiene que haber algo si no la gente se aburre
5. ¿Qué sube la Sabiduría o su equivalente: XP, resistencia a pérdida de PA o PM, otra cosa?
> **Respuesta original:** otra cosa nueva y si xp obviamente y resistencia a las relantizaciones
## 10. Objetos, equipo y botín

**Hoy:**

- 37 objetos con rarezas y tiradas aleatorias, y 2 sets;

- espacios: cabeza, cuerpo, manos, arma, mano izquierda, 2 anillos y amuleto.

1. ¿Qué espacios de equipo quieres? Por ejemplo: sombrero, capa, amuleto, anillos, cinturón, botas, arma, escudo, mascota, montura, dofus o trofeos…
> **Respuesta original:** Sombrero, anillos, cinturon, (botas podriamos ser originales y poder elegir una bota distinta para cada pie XD para mas combinaciones o no s euqe te parece eso), collar, abrigo, en vez de dofus aqui no se que inventar,arma, otra arma o escudo, mascota deberia darnos caracteristicas y la montura tambien (se podrian equipar ambas a la vez), no se que otra cosa le podemos agregar
2. ¿El botín es como Dofus (recursos de monstruos para fabricar equipo) o como FATE (equipo que cae directamente con afijos aleatorios)? ¿Mezcla?
> **Respuesta original:** mezcla como en dofus tambien caen items abajo, pero por ahora como estamos desarrollando deberiamos drop todo con los bichos por ahora como si fuese un temporis
3. ¿Rarezas? ¿Cuántas y con qué colores?
> **Respuesta original:** items raros como tal no se, se va a parecer a fate mucho la verdad, en dofus es simplemente ese item y tiene caracteristicas en rango aleatorio y con cierto porcentaje de mejora
4. ¿Forjamagia o mejora de objetos (runas, encantar, engarzar gemas)?
> **Respuesta original:** mmm aqui es un sistema complejo si lo ponemos, de momento como en el temporis de dofus touch podemos meter items dorados que den el doble de caracteristicas
5. ¿Sets con bonus? ¿Muchos o pocos?
> **Respuesta original:**  si familias de items con combinaciones interezantes, la cosa es que aqui como extrapolamos las caracteristicas mas importantes de dofus que alla son los pa y pm?
6. ¿Peso o límite de inventario? ¿Banco o cofre en casa?
> **Respuesta original:** peso la verdad, banco y cofre en casa, generate un banco ahi modelado dorado para ver como se ve mete texturas brillantes para ir tambien aplicandolo a los elementos del juego como arboles casas etc agua.
7. ¿Durabilidad o reparación?
> **Respuesta original:** mm los items no se pueden eliminar a menos que los destruyas, nada es degradable por ahora
8. ¿Objetos con nivel mínimo para equiparlos?
> **Respuesta original:**  si obvio rey XD
## 11. Oficios, recolección y fabricación

**Hoy:** solo pesca (estanque, picada y captura).

1. ¿Qué oficios quieres? Por ejemplo: leñador, minero, campesino, alquimista, pescador, herrero, sastre, joyero, zapatero…
> **Respuesta original:** leñador, pescador, campesino, minero, forjatodo incluye escudos y confeccionatodo (incluye todos los equipables que no son armas de momento)
2. ¿Los oficios suben de nivel aparte del personaje?
> **Respuesta original:** si hasta un nivel maximo
3. ¿Cómo es fabricar? ¿Receta + materiales + taller? ¿Hay un minijuego, o sale directo?
> **Respuesta original:** minijuego? me tientas como el de nier automata cuando estas hackeando, dame receta + materiales y en el taller y nivel del oficio. y pon ambas que salga directo o minijuego (para que salga mas perfecto en probabilidades claro)
4. ¿Los recursos del mapa (árboles, minerales, plantas) se recolectan con clic y reaparecen?
> **Respuesta original:** si obvio si no queda el mapa pelado todo el tiempo
5. ¿La pesca como ahora te vale? ¿Qué le añadirías? FATE mezclaba la pesca con las mascotas.
> **Respuesta original:** la pesca tiene bugs, en los lagos o rios o cuerpos de agua deben aparecer zonas circulares que indican peces y con eso pescaremos, puedes mezclarla con las mascotas, se me esta olvidado que no existe la prospeccion aqui (ponle otro nombre) eso pued einfluir en la pesca
## 12. Mascotas y monturas

**Hoy:** 3 mascotas (zorro que lucha, búho que recoge, tortuga con aura). Se invocan con su amuleto y no reciben golpes.

1. ¿Mascotas como FATE (luchan contigo y se transforman al comer peces) o como Dofus (dan estadísticas y se alimentan)?
> **Respuesta original:** aqui bueno la verdad no se que seria mejor
2. ¿Pueden morir o cansarse?
> **Respuesta original:** si mueres quedas en fantasma y toca ir a que te reviva algun levanta muertos o algo asi XD
3. ¿Suben de nivel?
> **Respuesta original:**  las monturas y mascoturas si suben de nivel en dofus, las mascotas no pero podemos poner aqui que si la cosa es que si van a pegar tambien es como que estamos creando un segundo personaje y tambien habria que meterle hechizos o mecanicas con el jugador para hacer ataques combinados geometricos o cosas asi, como que deben hacerse en linea recta lejos uno del otro para disparar un rayo, o deben estar cerca para lanzar un ataque en area potente, o cada uno con echizos de trampas ir dejandolas en el terreno mm seria interezante ver como vamos a controlar la mascota con un solo mouse XD
4. ¿Monturas? ¿Para ir más rápido o también para combatir? ¿Se crían, como en Dofus?
> **Respuesta original:** monturas para ir mas rapido y tener habilidades de desplazamiento volar o algo asi, eso de criarse no se mi rey si meterlo tambien
5. ¿La mascota puede ir sola al pueblo a vender, como en FATE?
> **Respuesta original:** eso es para un rpg, en un mmorpg creo que no funcionaria tambien porque los items los comprarian y venderian los propios jugadores, aunque hay items al inicio que valen modenas pero debe ser muy poco.
## 13. Economía, tiendas y comercio

**Hoy:** dos mercaderes con compra, venta y recompra; monedas.

1. ¿Moneda única u otras (fichas de mazmorra, puntos de honor…)?
> **Respuesta original:** la moneda no se si poner algo en modo panameño XD como, bibuyo o no se que se te puede ocurrir aqui para no llamarlo kamas,oro o monedas a secas.
2. ¿Mercadillo o tienda de jugadores (si algún día hay online)?
> **Respuesta original:** si, ahi tendriamos que probar el online o al menos simularlo de momento
3. ¿Precios fijos o variables?
> **Respuesta original:** variables el mas barato primero para items iguales
4. ¿Para qué se gasta el oro: equipo, mejorar, viajar, casa…?
> **Respuesta original:** equipo, viajar, algunas misiones te pueden pedir eso, comprar una casa, entrar al banco e impuesto de venta.
## 14. Misiones, historia y PNJ

**Hoy:** misiones y diálogos en datos, con diario (N) y seguimiento en pantalla.

1. ¿Hay historia principal? Cuéntamela a grandes rasgos o dime el tono.
> **Respuesta original:** aqui chatgpt va a tener que inventarse algo de panama
2. ¿Misiones secundarias de qué tipo: matar, recoger, entregar, explorar, cadenas largas como en Dofus?
> **Respuesta original:** si cadenas largas como dofus con mezcla de todo mientras mas larga mejor la recompensa
3. ¿Misiones diarias o repetibles?
> **Respuesta original:**  si
4. ¿Logros?
> **Respuesta original:**  cuando terminemos una version enviciable ponemos eso
5. ¿Bestiario o enciclopedia de monstruos, objetos y zonas?
> **Respuesta original:** si lo necesitamos nosotros tambien para debugear
## 15. Monstruos y jefes

**Hoy:** lobos, goblins, chamán con diablillos, alfa y veterano, cada uno con hechizos propios.

1. ¿Familias de monstruos por zona? Danos ideas, aunque sean tuyas y originales.
> **Respuesta original:**  si familias originales por zona, aqui haz lo tuyo chatgpt xd
2. ¿Jefes con fases y mecánicas (áreas que esquivar, invocaciones, enrage)?
> **Respuesta original:** excelente si, lo mejor seria ir extrapolando mecanicas de dofus a aca para el tiempo real
3. ¿Monstruos raros o archimonstruos que aparecen poco y sueltan mejor botín?
> **Respuesta original:** tambien es buena esa pero no los llames como en dofus
4. ¿Los monstruos huyen, piden ayuda o llaman a otros?
> **Respuesta original:** depende del bicho ahi deberiamos crear indicadores poara cada uno
## 16. Sonido y arte

**Hoy:**

- todo generado por código: personajes, música y efectos;

- no se ha descargado nada.

1. ¿Aprobamos descargar modelos y animaciones libres (CC0, por ejemplo los de Quaternius) para personajes y monstruos? ¿O seguimos con todo hecho por código?
> **Respuesta original:** mmm vamos a decargar esas animaciones y modelos libres para ir probando
2. ¿Estilo de música: medieval, orquestal, _*lo-fi*_…? ¿Música por zona?
> **Respuesta original:** dependiendo de la zona podriamos poner una u otra, pero de momento esto es como medieval, si musica por zona
3. ¿Quieres voces o sonidos de personajes?
> **Respuesta original:** uii aqui esta interezante, podriamos ghenerar sus voces con ia y sus interacciones tambien con ia
## 17. Plataforma y prioridades

1. ¿En qué sistemas debe funcionar: Windows, Mac, Linux, Steam Deck?
> **Respuesta original:** si linux, mac, y windows, steam deck no se ni ps5 porque usamos teclado
2. Ordena por prioridad lo que quieres ver a continuación. Por ejemplo:

    - gráficos;

    - mapa y minimapa;

    - zonas y monstruos con nivel;

    - mazmorra con jefe;

    - interfaz;

    - historia.

    - oficios;

    - más clases;
> **Respuesta original:**  - gráficos, mapa y minimapa, zonas y monstruos con nivel, mazmorra con jefe, interfaz, historia, oficios, más clases;
3. ¿Algo que te moleste ahora mismo al jugar el prototipo?
> **Respuesta original:** la camara esta brusca no hay suavidad configurable ni difuminado de movimiento, no hay encuadres llamables para la camara por teclas, como hacer el encuadre por defecto, el auto focus, el inteligente segun los mounstruos pueda ir girando la camara para obtener una mejor vista, y la estatica en una zona (si te sales de la zona se mueve la camara a la siguiente cuadricula grande del mapa como en dofus peero con la camara sin cargar mapas), la jugabilidad esta compleja no veo sinergias de hechizos ni zonas distintas de efecto de los hechizos todo siempre es rectangulos conos lineas rectas y mono objetivo.
4. ¿Algo que no te haya preguntado y quieras contarme?
> **Respuesta original:**  los diseños de los personajes y mounstruos necesitamos mejor calidad en las texturas, ir haciendo el editor del juego, no me hz preguntado si generamos mas zonas o hacermos un plan geografico para crear las distintas zonas originales del juego
## 18. Preguntas nuevas (2026-10-30, tras tu partida)

**Hoy:** zonas con franja de nivel ya en `master`, y los monstruos de zonas altas te pueden matar de un golpe.

1. ****Coordenadas.**** ¿Las coordenadas como en Dofus van por casillas grandes de mapa (cada mapa = [x, y]) o por metros? Hoy el mundo es continuo de 256 × 256 m. Propuesta: dividirlo en «mapas» de 32 × 32 m → [−4..3, −4..3].
> **Respuesta original:** me agrada esa idea
2. ****Zaaps / puntos de guardado:****

    - ¿Se activan al tocarlos la primera vez?

    - ¿Viajar entre ellos cuesta monedas?

    - ¿Reapareces en el último usado al morir?

    - ¿Guardan la partida automáticamente?
> **Respuesta original:** si, si pero muy poco segun distancia, al que poder seleccionar cual guardar, si no se guarda ninguno apareces en la aparicion por defecto
3. ****Morir:**** ¿qué se pierde?

    - Ejemplos: un % de XP del nivel, monedas, durabilidad.

    - ¿Fantasma que camina hasta su tumba o una estatua, como en Dofus, o reaparición directa?
> **Respuesta original:**  tienes que ir a que te revivan creo que eso ya lo puse mas atrás.
4. ****Zona peligrosa:**** al entrar en una zona muy por encima de tu nivel la pantalla parpadea en rojo y sale un aviso. ¿A partir de cuántos niveles de diferencia (5, 10)? ¿El aviso debe repetirse o salir una sola vez por zona?
> **Respuesta original:** cuando los bichos son 20 mas que tu por ahora pero podemos poner esas configuraciones en variables de entorno
5. ****Modo edición**** dentro del juego:

    - ¿Quién lo usa? ¿Solo tú (herramienta de desarrollo, se guarda en `data/`) o también los jugadores (casa propia, decoración)?

    - ¿Qué tiene que poder editar? Ejemplos: casas, árboles, rocas, PNJ, zonas, puntos de aparición, zaaps, casillas bloqueadas, terreno (alturas, caminos, agua).
> **Respuesta original:** solo yo mi rey, lo de casa propia mm de momento no, todo lo que mencionas investiga los editores de juegos que modifican, aunque le puedo decir a la ia simpolemente que genere algo, pero ahi entra la creatividad del humano al ahcer cosas a mano
6. ****Mazmorras como FATE:****

    - ¿Pisos generados al azar en cada visita o fijos?

    - ¿Cuántos pisos?

    - ¿Escaleras para bajar, jefe en el último piso?

    - ¿Se puede volver a la superficie con un portal o pergamino?

    - ¿Más difíciles cuanto más bajas?
> **Respuesta original:** todo configurable, si cuanto mas bajas losn bichos son mas fuertes, no es infinito, no deberia ser al alzar pero bueno.. tambien deberian haber mecanicas laberintos cosas asi
7. ****Pegarse a las paredes:**** ¿quieres poder caminar pegado a casas y árboles (colisión ajustada) o prefieres un margen?
> **Respuesta original:** colision ajustada rey
8. ****Barra de enemigos en combate,**** horizontal como la de Dofus:

    - ¿Qué debe mostrar de cada enemigo: retrato, vida, nivel, estados, lo que va a lanzar?

    - ¿Clic en él para seleccionarlo como objetivo?
> **Respuesta original:**  la cosa es que no me da tiempo de ver eso porque el juego es muy rapido, y creo que para influir en velocidad de mov y de enfriamiento tendriamos que extrapolar lo de pa y pm acá


---

**Cierre editorial:** nada de este documento autoriza a los agentes a fijar reglas de diseño, fabricar modelos definitivos ni sobrescribir decisiones del creador. Las propuestas son semillas para experimentar y validar con él.
