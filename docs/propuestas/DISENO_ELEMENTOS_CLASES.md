# Diseño — ambientación, elementos, estadísticas y clases

> **Estado: PROPUESTA de diseño.** Nada de esto está aprobado ni implementado.
> No toca `src/` ni `data/`. Los borradores de datos están en
> `docs/propuestas/` y sólo se cargarán cuando el creador elija entre las
> opciones de la sección 9. Todas las cifras son de partida, para calibrarlas
> en juego.
>
> Base: respuestas del creador en `docs/PREGUNTAS_CREADOR.md` (§1.6, §2.2,
> §2.8, §6.4, §7, §8, §9). Dofus, FATE y Genshin sólo se usan como ideas: no se
> copia ningún nombre, tabla ni coeficiente.

Índice:

1. [Tres ambientaciones](#1-tres-ambientaciones)
2. [Sistema de elementos](#2-sistema-de-elementos)
3. [Estadísticas primarias](#3-estadísticas-primarias)
4. [Las 7 clases](#4-las-7-clases)
5. [Combinaciones en grupo](#5-combinaciones-en-grupo)
6. [Repertorio comprable y dropeable (1–100)](#6-repertorio-comprable-y-dropeable-1100)
7. [Trampas](#7-trampas)
8. [Migración desde el código de hoy](#8-migración-desde-el-código-de-hoy)
9. [Preguntas para el creador](#9-preguntas-para-el-creador)

---

## 1. Tres ambientaciones

Las zonas ya tienen nombres panameños: Villa Raspadura, Llanos de Azuero,
Cumbre del Barú, Manglares de Chame, Cerros de Boquete, Neblinas de Cerro
Punta, Darién Profundo, Archipiélago de Bocas, Archipiélago de las Perlas,
Páramo de Fortuna y Cerro Ancón Embrujado. Las tres propuestas las conservan;
lo que cambia es *qué son*.

### A. «El Istmo de los Espantos»: fantasía tropical de raíz panameña

**Lore.** El Istmo es una franja de tierra viva entre dos mares que no se
hablan. Cada noche los cuentos que la gente se cuenta en los portales (de la
mujer que llora en el río, del chivo que se aparece en el cruce, de la luz que
corre por el potrero) cobran algo de cuerpo. Mientras el pueblo se acordaba de
ellos, los espantos se quedaban en su sitio. Desde que la gente dejó de
contarlos bien, se han soltado y se han mezclado con la fauna. Los Andantes (el
jugador) son quienes aprenden los oficios viejos (curar con hierbas, tocar el
tambor, pilar el arroz, contar cuentos) y los convierten en armas para volver
a poner cada espanto en su lugar.

- **Visual:** colores saturados de pollera y de bus pintado, vegetación
  enorme, pueblos de teja y quincha, noches muy azules con luciérnagas. Bajo
  poligonaje estilizado, sin texturas realistas.
- **Música:** tambor, caja y repicador, acordeón y violín de mejorana, saloma
  como grito de combate, y de fondo orquesta pequeña. Cada zona tiene su
  ritmo: tamborito en Azuero, calipso en Bocas, flauta y lluvia en el Darién.
- **Clases:** oficios de pueblo convertidos en arquetipos de combate. Son las
  7 clases de la sección 4 tal cual.
- **Elementos:** fuerzas cotidianas del trópico (el bochorno, el sereno, el
  bejuco). Encaja perfecto con la sección 2.
- **Zonas:** cada zona es la «casa» de una familia de espantos y de una
  fuerza: Azuero es Bochorno, Cerro Punta es Sereno, el Darién es Bejuco.
- **Riesgo:** puede sentirse demasiado folclórico o rural si no se le pone
  algo de épica; cuesta justificar mazmorras-dimensión o monturas voladoras.

### B. «Canal Eterno»: retrofuturismo istmeño

**Lore.** Siglos después de su construcción, el Canal ya no mueve barcos:
mueve *tiempo*. Sus esclusas suben y bajan mareas de energía entre dos épocas.
Una avería, el Gran Atasco, ha dejado las compuertas medio abiertas y por ellas
se cuelan máquinas de un futuro que no ocurrió y bestias de un pasado que nadie
recuerda. Las ciudades viven alrededor de las esclusas, los diablos rojos
(buses) son blindados y los globos de carga cruzan entre zonas.

- **Visual:** neón sobre lluvia, metal pintado a mano como los buses,
  hologramas con patrones de mola estilizados (inspirados, no copiados),
  contraste entre selva y chatarra.
- **Música:** cumbia y típico sobre sintetizadores, *reggae* en español y
  *synthwave* en las ciudades; tambor procesado en combate.
- **Clases:** técnicos e ingenieros (esclusero, mecánica de buses,
  radiotécnica, *DJ* de picó como apoyo, dronero como invocador).
- **Elementos:** energías de máquina (presión, frecuencia, óxido…). Los
  elementos de la sección 2 sirven renombrando su origen.
- **Zonas:** igual que hoy, pero cada zona tiene una «época» dominante: Boquete
  rural del pasado, Ciudad de Panamá del futuro, el Darién sin tiempo.
- **Riesgo:** la estética cuesta más de producir con primitivas; se aleja de la
  base medieval-fantástica que ya tienen los objetos y monstruos actuales.

### C. «La Marea Doble»: mezcla de mito tropical y ruinas antiguas *(recomendada)*

**Lore.** El Istmo separa dos mares con dos lunas que tiran de él en sentidos
opuestos: la Marea de Arriba (del Pacífico, que trae lo que fue) y la Marea de
Abajo (del Caribe, que trae lo que todavía no es). Hace mucho, un pueblo
olvidado, los *Esclusarios*, construyó compuertas de piedra y bronce para
equilibrarlas. Las compuertas se han ido rompiendo y en cada brecha las dos
mareas se mezclan: de ahí salen los espantos de los cuentos, las bestias raras
y las fuerzas de la naturaleza que la gente ahora usa como magia. En el pueblo
todo el mundo sabe un oficio viejo; los Andantes lo convierten en poder y
bajan a las brechas (las mazmorras) a cerrar compuertas.

- **Visual:** la base de la opción A (pueblo tropical vivo, colores de
  pollera, noches de luciérnagas) y, en mazmorras y zonas altas, ruinas de
  bronce verdoso con mecanismos gigantes, luces de marea y algo de tecnología
  antigua. No hace falta decidir entre medieval y futurista: el pueblo es
  rústico y las ruinas son de una civilización avanzada perdida.
- **Música:** instrumentos típicos (tambor, mejorana, acordeón, saloma) en el
  mundo abierto; en las ruinas, los mismos motivos con capas graves y
  metálicas. Cambia con el día y la noche.
- **Clases:** las 7 de la sección 4: seis oficios de pueblo y el Esclusero,
  heredero de los constructores, que manipula la posición y el tiempo.
- **Elementos:** seis fuerzas del trópico, una de ellas (el Vaivén) nacida de
  las dos mareas. Explica sin forzar los desplazamientos, intercambios y
  retrocesos que el creador pidió en vez de la evasión genérica.
- **Zonas:** se mantienen sus nombres y su clima. Cada zona tiene un elemento
  dominante (tabla en §2.5) y una brecha con mazmorra de muchos pisos. Los
  viajes largos (barcos a Bocas y Perlas, globos a la Cumbre del Barú)
  encajan como «cruzar una marea», que justifica las cargas de zona que pidió
  el creador (§2.1).
- **Riesgo:** dos tonos a cuidar, pero eso es justo la «mezcla» que pidió.

**Recomendación: C.** Mantiene el tono mixto y los nombres de Panamá, admite
monturas voladoras, barcos y mazmorras-dimensión sin forzar nada, y deja abierto
un giro más futurista en zonas altas si el creador lo quiere después. Los
elementos y clases de este documento funcionan con A y con C sin cambios; con B
habría que renombrar su origen.

---

## 2. Sistema de elementos

Seis elementos. Ninguno es «fuego, agua, tierra, aire o rayo»: son fuerzas del
trópico y del Istmo, cada una con una conducta propia que se reconoce en
combate sin leer el tooltip.

### 2.1 Los seis

| Id | Nombre | Qué es | Color | Efecto típico (lo que lo distingue) |
|---|---|---|---|---|
| `neque` | **Ñeque** | La fuerza bruta del cuerpo; en Panamá, «tener ñeque» es tener fuerza y aguante. | Terracota `#b5532e` | **Impacto:** empuja y aturde un instante. Rompe contras y escudos con más facilidad (+25 % de daño contra escudo). |
| `bochorno` | **Bochorno** | El calor húmedo y pesado del mediodía. No es fuego: es el aire que no deja respirar. | Ámbar `#f2a33a` | **Sofoco:** daño en el tiempo que además frena la regeneración de recurso del objetivo (−30 %). Más fuerte al sol. |
| `sereno` | **Sereno** | El rocío frío de la madrugada («te va a coger el sereno»). | Plata azulada `#9fc4e8` | **Entumecer:** ralentiza movimiento y lanzamientos. **Revela lo invisible** (el rocío se posa en las trampas). Más fuerte de noche. |
| `saloma` | **Saloma** | El grito largo del campo que se oye de cerro a cerro. Sonido hecho fuerza. | Magenta `#d84c9a` | **Eco:** el golpe se repite al 30 % a los 1,2 s. Interrumpe lanzamientos con carga. |
| `bejuco` | **Bejuco** | Las lianas y la savia del monte, lo que crece y se enreda. | Verde selva `#4f9e3a` | **Enredo y vínculo:** enlaza objetivos (el daño a uno salpica al otro) o aliados (la curación se reparte). Es el elemento de la curación. |
| `vaiven` | **Vaivén** | La fuerza de la marea que va y vuelve; el pulso del Istmo entre los dos mares. | Dorado `#e8c547` | **Desplazar y devolver:** atrae, intercambia y hace retroceder en el tiempo (vuelve a una posición o vida anterior). Poco daño, mucho control. |

Reservado para más adelante (no para el prototipo): **Salitre** (corrosión de
costa, blanco turquesa), que quitaría resistencias y escudos de forma
permanente durante un combate.

### 2.2 Reacciones (sinergia sin sobrecarga)

Al creador le gustó la sinergia de Genshin, pero no leer mucho. Regla única:

1. Todo golpe elemental deja una **huella** de su elemento en el objetivo
   durante 4 s (icono pequeño encima de la barra).
2. Si otro elemento que **reacciona** con esa huella le pega, se dispara la
   reacción y se gasta la huella. Si no reacciona, la huella nueva sustituye a
   la vieja.
3. Cada objetivo sólo puede sufrir una reacción cada 3 s.
4. Las huellas son de todos: **la huella de un compañero vale** (es el corazón
   del juego cooperativo).
5. Sólo 7 parejas reaccionan; las otras 8 no hacen nada. Cada reacción tiene
   un único efecto, fácil de leer, con su propio sonido y número flotante.

| Huella + golpe | Reacción | Efecto (PROPUESTA) |
|---|---|---|
| Bochorno + Sereno | **Vaharada** | Nube de vapor de 3 m: daño en área (80 % del golpe) y quien esté dentro no ve trampas ni marcas durante 2 s. |
| Bochorno + Saloma | **Tamborazo** | Aturde 0,8 s y empuja 2 m a los que estén a menos de 2,5 m. |
| Bochorno + Bejuco | **Quema de rastrojo** | El sofoco salta a todos los objetivos enlazados o a 3 m (como la quema del monte en verano). |
| Sereno + Bejuco | **Escarcha de monte** | Inmoviliza 1,5 s. |
| Saloma + Vaivén | **Retumbe** | El eco se repite dos veces más (30 % → 30 % + 20 %). |
| Ñeque + Vaivén | **Rebote** | El siguiente desplazamiento del objetivo en 3 s le hace daño de Ñeque si choca con pared, roca u otro enemigo. |
| Ñeque + Bejuco | **Latigazo** | Empuje que arrastra también a los enlazados al mismo punto (agrupa enemigos para un área). |

Reacciones que **no** existen a propósito: Ñeque con Bochorno, Sereno o
Saloma; Sereno con Saloma o Vaivén; Bochorno con Vaivén; y Bejuco con
Saloma o Vaivén. Así cada clase tiene 1–3 reacciones propias y necesita a los
demás para el resto.

Interacción con el clima (el creador lo pidió en §2.8): **sol** +15 % de
Bochorno; **lluvia** −15 % de Bochorno y +15 % de Bejuco; **noche** +15 % de
Sereno; **niebla** +15 % de Saloma (el sonido viaja); **nieve** +15 % de
Sereno y −10 % de Vaivén. Cifras en datos.

### 2.3 Resistencias

Una resistencia por elemento (`resist.neque`, …), con tope del 50 % como ya
pidió el creador (§4.10, «sin erosión»). Los monstruos de cada zona tienen
debilidad y resistencia marcadas en el bestiario.

### 2.4 Correspondencia con los 5 de hoy (migración)

| Hoy (`ELEMENTS`) | Nuevo | Por qué |
|---|---|---|
| `physical` | `neque` | Golpe físico → fuerza bruta e impacto. |
| `fire` | `bochorno` | Daño en el tiempo («quemadura» → «sofoco»). |
| `frost` | `sereno` | Ralentización («ralentizado» → «entumecido»). |
| `storm` | `saloma` | Cadena y carga estática → eco y resonancia. |
| `earth` | `bejuco` | Control en el sitio («piel de piedra» → «corteza»). |
| *(nuevo)* | `vaiven` | Recoge los efectos de desplazamiento y retroceso que hoy van en físico o tormenta (Paso del relámpago, Transposición, Eco del instante). |

### 2.5 Elemento dominante por zona

| Zona | Clima | Elemento dominante |
|---|---|---|
| Villa Raspadura | cálido | ninguno (inicio) |
| Llanos de Azuero | cálido | Bochorno |
| Manglares de Chame | cálido | Bejuco |
| Cerros de Boquete | templado | Saloma |
| Archipiélago de Bocas | cálido | Vaivén |
| Neblinas de Cerro Punta | frío | Sereno |
| Darién Profundo | cálido | Bejuco + Bochorno |
| Archipiélago de las Perlas | cálido | Vaivén + Ñeque |
| Cumbre del Barú | frío | Sereno + Ñeque |
| Páramo de Fortuna | frío | Sereno + Saloma |
| Cerro Ancón Embrujado | templado | todos (espantos) |

---

## 3. Estadísticas primarias

Ocho primarias: una por elemento, más vida y «sabiduría». Nombres propios,
cortos y con sabor local. Los puntos son **libres** y el reparto **se puede
reiniciar** (§9.2 del cuestionario).

| Id | Nombre | Elemento | Daño | Efecto secundario (lo que la hace única) |
|---|---|---|---|---|
| `fibra` | **Fibra** | Ñeque | +1 % por punto | +1 % de distancia de empuje cada 10 puntos. |
| `temple` | **Temple** | Bochorno | +1 % por punto | +1 % de duración del sofoco cada 5 puntos. |
| `calma` | **Calma** | Sereno | +1 % por punto | +0,5 m de radio para revelar trampas cada 50 puntos. |
| `pulmon` | **Pulmón** | Saloma | +1 % por punto | +1 de recurso máximo cada 2 puntos (la saloma es aire). |
| `arraigo` | **Arraigo** | Bejuco | +1 % por punto | **Escala la curación y los escudos** (+1 % por punto). |
| `tino` | **Tino** | Vaivén | +1 % por punto | +0,2 % de probabilidad de crítico por punto; −0,05 % de enfriamiento por punto (tope 25 %). |
| `aguante` | **Aguante** | — (vida) | — | +4 de vida por punto. |
| `malicia` | **Malicia** | — («sabiduría») | — | +1 % de XP cada 2 puntos; resistencia a ralentizaciones y robos de recurso; +0,02 m de percepción de trampas por punto. |

«Malicia» en Panamá es picardía, saber leer la situación: sube la XP (aprendes
más rápido), te deja menos entumecido y te hace ver antes las trampas. Es la
«sabiduría» con una función nueva (trampas), como pidió el creador.

### 3.1 Fórmulas (en datos, `docs/propuestas/elementos.json`)

- **Daño** de un hechizo: `base × (1 + estadística/100 + poder/100) × (1 − resist)`.
  Lineal y predecible, como pidió el creador («lo que debe pesar más es el daño
  base»): con 100 puntos se dobla el daño base, no se multiplica por diez.
- **Curación y escudo:** `base × (1 + arraigo/100 + poderCuración/100)`.
- **Vida:** `vidaBase de clase + 4 × aguante + 5 × nivel`.
- **Resistencia a ralentizar:** `malicia / (malicia + 200)` (con 200 puntos,
  las ralentizaciones duran la mitad; nunca llega al 100 %).
- **XP:** `× (1 + 0,005 × malicia)`.
- **Percepción de trampas:** `radio = 1,5 m + 0,02 × malicia + 0,01 × calma`.
- **Puntos por nivel:** 5. Coste: 1 punto = 1 en todas, salvo **Malicia,
  que cuesta 2 puntos por 1** (es la más versátil).
- **Reinicio:** gratis hasta nivel 20; después, con un **Baño de hierbas** del
  Yerbatero del pueblo (consumible comprable barato; nunca de pago).
- **Curva de XP** (lenta, como pidió el creador): `xpToNext(n) = round(60 · n^2,2)`
  hasta 100 (nivel 10 ≈ 9.500, nivel 50 ≈ 325.000, nivel 99 ≈ 1,5 M). Las
  zonas por franjas de 10 dan la cantidad de monstruos a calibrar en
  `npm run balance`.

---

## 4. Las 7 clases

Reglas comunes:

- **Nombre** con variante masculina y femenina según el personaje
  (Yerbatero/Yerbatera…).
- **Recurso propio** con su nombre y su forma de llenarse (no todos regeneran
  igual): eso ya diferencia el ritmo de cada clase.
- **Kit base**: 8 hechizos de clase, 3 en nivel 1 y el resto en 6, 12, 22,
  35 y 50 (el Diablico tiene su último en 70). El resto de la barra de 20
  huecos se llena con el repertorio de la sección 6.
- **Sin armadura ni evasión genérica.** Cada clase se defiende con una o dos de
  estas herramientas: teletransporte, intercambio, empuje, inmunidad, reenvío,
  contra o retroceso (todas existen ya como estados en el código: `immune`,
  `reflect`, `counter`, `rewind`).

Resumen:

| Clase | Rol | Elementos | Recurso | Mecánica propia | Movilidad | Defensa |
|---|---|---|---|---|---|---|
| Yerbatero | sanador | Bejuco, Sereno | Savia | Matas y Cosecha | intercambio con aliado | inmunidad a control (Santiguado), retroceso de aliado |
| Pilonero | tanque | Ñeque, Bejuco | Firmeza | Asiento y Amarre | atraer, intercambio | contra, inmunidad al desplazamiento |
| Diablico | daño cuerpo a cuerpo | Bochorno, Ñeque | Parranda | Careta (frenesí) | salto, atraer | reenvío |
| Tamborero | potenciador y escudos | Saloma, Bochorno | Repique | Ronda y golpe a tiempo | empuje en área | escudos, reenvío en aliado |
| Cuentero | invocador y potenciador | Sereno, Saloma | Hilo | Espantos y Moraleja | intercambio con su espanto | invocaciones que bloquean |
| Arponero | arquero | Vaivén, Bejuco | Sedal | Anclas y Nasas (trampas) | engancharse a un ancla, salto atrás | trampas, empuje |
| Esclusero *(propuesta)* | control y reposicionamiento | Vaivén, Sereno | Caudal | Compuertas | teletransporte, intercambiar a dos | retroceso, estasis |

### 4.1 Yerbatero / Yerbatera: sanador

- **Fantasía:** el curandero del pueblo que sabe para qué sirve cada mata. Cura
  con lo que planta en el suelo, no a distancia infinita.
- **Recurso — Savia** (100): regenera 6/s, y +2 por cada aliado vivo cerca.
- **Mecánica — Matas y Cosecha:** sus curaciones grandes son *matas* que
  planta en el suelo; los aliados que pasan por encima se curan. Eso convierte
  la curación en posicionamiento (tiempo real) en vez de clicar barras. La
  curación que sobra (sobrecuración) se guarda como *semilla* en el aliado y
  florece a los 4 s como escudo del 50 % de lo sobrante.
- **Movilidad:** *Mano de comadre*, intercambia el sitio con un aliado (lo saca
  del peligro y se pone él).
- **Defensa:** *Santiguado* (limpia perjuicios y da inmunidad al control) y
  *Ánima de vuelta* (retroceso: el aliado que muere en los siguientes 5 s
  vuelve a la posición y la vida del momento del lanzamiento).

| Nv | Hechizo | Elem. | Tipo | Qué hace |
|---|---|---|---|---|
| 1 | **Guarapo** | Bejuco | curación, un aliado | Proyectil teledirigido que cura y deja Regeneración 4 s. |
| 1 | **Mata de sábila** | Bejuco | zona | Planta una mata (r 2,5 m, 8 s) que cura a los aliados encima cada segundo. |
| 1 | **Bejucazo** | Bejuco | daño, línea | Latigazo de 6 m: daño y enlaza 4 s a los dos primeros enemigos. |
| 6 | **Santiguado** | Sereno | apoyo | Limpia perjuicios del aliado y le da inmunidad al control 2 s. |
| 12 | **Mano de comadre** | Vaivén | movilidad | Intercambia el sitio con un aliado a ≤ 12 m. |
| 22 | **Sereno de madrugada** | Sereno | daño, área | Rocío en círculo de 3 m: daño, entumece 2 s y revela trampas. |
| 35 | **Ánima de vuelta** | Vaivén | defensa | Retroceso en un aliado: si muere en 5 s, vuelve a su posición y vida del lanzamiento. |
| 50 | **Toma de monte** | Bejuco | definitiva | Canaliza 3 s: enlaza a todo el grupo; la curación a uno se reparte entre todos al 60 %. |

### 4.2 Pilonero / Pilonera: tanque

- **Fantasía:** quien pila el arroz con un pilón de madera dura. Pesado, lento
  y plantado en el sitio; lo difícil es moverlo.
- **Recurso — Firmeza** (60): no regenera solo; se gana al recibir golpes (+1
  por cada 2 % de vida perdida) y al bloquear con contra.
- **Mecánica — Asiento y Amarre:** quieto, acumula *Asiento* (1 por segundo,
  máximo 5): cada uno da +8 % de contra y −10 % de distancia de empuje recibida.
  Moverse los va perdiendo. Con *Amarre* se ata a un aliado y recibe el 30 % del
  daño que le hacen a ese aliado.
- **Movilidad:** *Jalón* (atrae al enemigo) y *Cambio de puesto* (intercambio
  con un aliado e inmunidad breve).
- **Defensa:** contra (*Plantao*) e inmunidad al desplazamiento.

| Nv | Hechizo | Elem. | Tipo | Qué hace |
|---|---|---|---|---|
| 1 | **Pilonazo** | Ñeque | daño, un enemigo | Golpe pesado cuerpo a cuerpo; empuja 1,5 m. |
| 1 | **Amarre** | Bejuco | apoyo | Se ata a un aliado 8 s y recibe el 30 % de su daño. |
| 1 | **Plantao** | Ñeque | defensa | 5 s: contra del 40 % y no puede ser desplazado. |
| 6 | **Jalón** | Bejuco | control | Atrae a un enemigo 5 m; durante 3 s ese enemigo le ataca a él. |
| 12 | **Muro de pilones** | Ñeque | zona | Pared de 5 m × 1 m durante 4 s que bloquea proyectiles y paso. |
| 22 | **Cambio de puesto** | Vaivén | movilidad | Intercambia el sitio con un aliado y gana inmunidad 1,5 s. |
| 35 | **Mortero** | Ñeque | daño, área | Golpe en el suelo (r 3,5 m); gasta todo el Asiento: +20 % de daño por cada uno e inmoviliza 1,5 s. |
| 50 | **Raíz del corotú** | Bejuco | definitiva | 6 s: él y los aliados atados no pueden bajar del 20 % de vida. |

### 4.3 Diablico / Diablica: el golpe cuerpo a cuerpo más fuerte

- **Fantasía:** el danzante enmascarado de rojo y negro de las fiestas de
  Azuero, que baila sobre los enemigos con cascabeles y castañuelas. La más
  pura agresividad.
- **Recurso — Parranda** (100): empieza en 0, sube +8 por golpe y baja 5/s
  fuera de combate. Los hechizos *gastan* Parranda menos los generadores, que
  la llenan.
- **Mecánica — Careta:** al llegar a 100 se puede ponerse la Careta: 8 s de
  frenesí (sin coste, +25 % de daño, cada golpe deja huella de Bochorno) pero
  durante ese tiempo **no recibe curación de otros**. Riesgo y euforia.
- **Movilidad:** *Brinco del diablo* (salto al punto) y *Coletazo* (atrae al
  enemigo).
- **Defensa:** *Careta prestada* (reenvío 2 s). Nada más: vive de matar
  rápido o de su grupo.

| Nv | Hechizo | Elem. | Tipo | Qué hace |
|---|---|---|---|---|
| 1 | **Cascabelazo** | Ñeque | generador | Golpe cuerpo a cuerpo rápido (+12 Parranda); cada tercer golpe seguido empuja. |
| 1 | **Brinco del diablo** | Bochorno | movilidad, área | Salta a ≤ 7 m; al caer, daño en 2 m y sofoco. |
| 1 | **Vaho de bochorno** | Bochorno | daño, cono | Cono de 4 m: sofoco 4 s (daño en el tiempo y −30 % de regeneración de recurso). |
| 6 | **Zapateo** | Ñeque | área | Pisotón alrededor (r 3 m): daño y aturde 0,5 s. |
| 12 | **Careta prestada** | Bochorno | defensa | 2 s de reenvío: los hechizos de un objetivo vuelven a quien los lanzó. |
| 22 | **Coletazo** | Ñeque | control | Atrae a un enemigo a ≤ 8 m hasta él y le pega. |
| 35 | **Corpus en la plaza** | Bochorno | definitiva | Requiere Careta. Cada golpe salta a otro enemigo a ≤ 3 m al 50 %. |
| 70 | **Diablo sucio** | Ñeque | definitiva | Embestida de 8 m que arrastra a todos los enemigos del trayecto hasta el final. |

### 4.4 Tamborero / Tamborera: potenciador y escudos

- **Fantasía:** el que lleva el tambor repicador en el tamborito. Marca el
  ritmo del grupo; si él para, el grupo se apaga.
- **Recurso — Repique** (80): regenera en pulsos, uno por compás (cada 1 s).
- **Mecánica — Ronda y golpe a tiempo:** a su alrededor hay una *Ronda* de 7 m.
  Siempre suena uno de tres toques (cambiar cuesta 1 s): **Repicador** (+12 %
  de daño), **Pujador** (escudos +30 %) o **Caja** (+12 % de velocidad). Un
  metrónomo visual late cada segundo: lanzar en ±0,15 s del latido es *a
  tiempo* y da +25 % al efecto. Habilidad sin azar.
- **Movilidad:** *Golpe de pecho* (empuja a los enemigos de la Ronda).
- **Defensa:** escudos en aliados y *Tambor de vuelta* (reenvío en un aliado).

| Nv | Hechizo | Elem. | Tipo | Qué hace |
|---|---|---|---|---|
| 1 | **Repique** | Saloma | daño, proyectil | Onda de sonido teledirigida; eco al 30 % a los 1,2 s. |
| 1 | **Coro de escudo** | Saloma | escudo, área | Escudo a todos los aliados de la Ronda (escala con Arraigo). |
| 1 | **Cambio de toque** | — | postura | Alterna Repicador / Pujador / Caja. |
| 6 | **Saloma larga** | Saloma | daño, línea | Grito de 12 m: daño e interrumpe lanzamientos con carga. |
| 12 | **Calentura** | Bochorno | potenciador | Un aliado 6 s: +20 % de daño y sus golpes dejan huella de Bochorno. |
| 22 | **Golpe de pecho** | Saloma | empuje, área | Empuja 4 m a los enemigos de la Ronda. |
| 35 | **Tambor de vuelta** | Saloma | defensa | Escudo en un aliado que, además, reenvía el próximo hechizo que reciba. |
| 50 | **Tamborito completo** | Saloma | definitiva | 6 s: los aliados de la Ronda son inmunes al control y ganan un escudo. |

### 4.5 Cuentero / Cuentera: invocador y potenciador

- **Fantasía:** quien cuenta los cuentos de espanto en la noche. Al contarlos,
  aparecen. Sus criaturas son *Espantos* con nombre propio (originales, sólo
  inspirados en el tono del folclor).
- **Recurso — Hilo** (120): regenera 5/s; cada espanto vivo lo reduce en 1/s.
- **Mecánica — Espantos y Moraleja:** máximo 3 espantos. Cuando un espanto
  muere o se acaba, deja su *moraleja*: una mejora para los aliados a 6 m
  (cada espanto la suya). *Moraleja* también se puede forzar sacrificando uno.
  Así el invocador es también potenciador, como pidió el creador.
- **Movilidad:** *Cambiazo*, intercambia el sitio con uno de sus espantos.
- **Defensa:** sus espantos bloquean el paso y atraen golpes; *Noche cerrada*
  los vuelve provocadores.

| Nv | Hechizo | Elem. | Tipo | Qué hace |
|---|---|---|---|---|
| 1 | **Cuento del candil** | Sereno | invocación | Candilito: luz flotante que dispara Sereno y **revela trampas** a 4 m. Moraleja: +10 % de daño 6 s. |
| 1 | **Susurro** | Saloma | daño, un enemigo | Voz que viaja al objetivo; eco al 30 %. |
| 1 | **Moraleja** | — | potenciador | Sacrifica un espanto: su moraleja al 150 % ahora mismo. |
| 6 | **Cabro del cruce** | Ñeque | invocación | Cabro que embiste en línea y empuja. Moraleja: inmunidad al desplazamiento 4 s. |
| 12 | **La Lloradera** | Sereno | invocación | Espanto que llora: los enemigos a 4 m se entumecen y se alejan. Moraleja: curación del 10 % de la vida. |
| 22 | **Cambiazo** | Vaivén | movilidad | Intercambia el sitio con uno de sus espantos. |
| 35 | **Noche cerrada** | Sereno | potenciador | 6 s: los espantos +40 % de daño y provocan a los enemigos cercanos. |
| 50 | **El Mandinga Chiquito** | Saloma | definitiva | Invoca un espanto grande 15 s que cuenta como 2. Moraleja: el grupo recupera un 30 % de recurso. |

### 4.6 Arponero / Arponera: arquero

- **Fantasía:** pescador de las islas de las Perlas que caza con arpón y
  sedal. A distancia, siempre atado a algo; deja nasas escondidas.
- **Recurso — Sedal** (100): regenera 7/s; recoger un ancla devuelve 10.
- **Mecánica — Anclas y Nasas:** sus arpones dejan un *ancla* (5 s) en el
  enemigo o en el suelo. *Recoger sedal* tira de la última ancla: si está en un
  enemigo, lo atrae; si está en el suelo o en una pared, el Arponero vuela
  hasta ella. Además es la clase de las **trampas** (sección 7).
- **Movilidad:** engancharse a un ancla, *Resaca* (salto atrás que deja una nasa).
- **Defensa:** distancia, trampas y empuje.

| Nv | Hechizo | Elem. | Tipo | Qué hace |
|---|---|---|---|---|
| 1 | **Arponazo** | Vaivén | daño, proyectil | Arpón teledirigido a ≤ 14 m; deja ancla. |
| 1 | **Recoger sedal** | Vaivén | movilidad / control | Tira de la última ancla (atrae al enemigo o te lleva al punto). |
| 1 | **Nasa** | Bejuco | trampa | Trampa invisible (detonador de pisada): inmoviliza 1,5 s y enlaza. |
| 6 | **Lluvia de fisgas** | Bejuco | daño, área | Círculo de 3 m a ≤ 14 m; con fuego amigo (afecta a aliados, como pidió el creador). |
| 12 | **Resaca** | Vaivén | movilidad | Salto atrás de 6 m que deja una Nasa donde estabas. |
| 22 | **Red de bejuco** | Bejuco | control, cono | Red en cono de 5 m: entumece 50 % 3 s. |
| 35 | **Marea alta** | Vaivén | daño, línea | Arpón que atraviesa 16 m, empuja a todos al final y, a los 2 s, los devuelve a donde estaban (retroceso de posición). |
| 50 | **Corral de nasas** | Bejuco | trampa | Coloca 4 trampas en cuadro alrededor del punto apuntado. |

### 4.7 Esclusero / Esclusera: control y reposicionamiento *(la séptima clase propuesta)*

- **Por qué esta:** las seis pedidas cubren curación, tanque, daño cuerpo a
  cuerpo, potenciador con escudos, invocador y distancia. Falta quien
  **controle el campo** y le dé sentido a la estrategia que el creador echa de
  menos («que no sea pegar y pegar»). El Esclusero es heredero de los
  constructores de las compuertas: abre, cierra y devuelve.
- **Recurso — Caudal** (100): sus hechizos de *llenar* lo gastan y los de
  *vaciar* lo devuelven (como una esclusa); obliga a alternar.
- **Mecánica — Compuertas:** zonas rectangulares en el suelo que cambian el
  tiempo dentro: *alta* (aliados: −15 % de enfriamientos) o *baja* (enemigos:
  −30 % de velocidad). Máximo 2 a la vez.
- **Movilidad:** *Trueque* (intercambia a dos unidades cualesquiera) y
  *Corriente* (teletransporte corto).
- **Defensa:** *Marea atrás* (retroceso propio o de aliado) y *Esclusa
  sellada* (estasis).

| Nv | Hechizo | Elem. | Tipo | Qué hace |
|---|---|---|---|---|
| 1 | **Compuerta** | Vaivén | zona (llenar) | Coloca una compuerta 4 × 3 m durante 8 s; alterna alta/baja al recolocar. |
| 1 | **Empuje de esclusa** | Vaivén | empuje, línea (vaciar) | Empuja 4 m a todos en una línea de 8 m; +15 Caudal. |
| 1 | **Marea atrás** | Vaivén | defensa | Marca a sí mismo o a un aliado: a los 4 s vuelve a la posición y vida de la marca. |
| 6 | **Rocío de esclusa** | Sereno | daño, un enemigo (vaciar) | Daño y entumece 30 % 2 s. |
| 12 | **Trueque** | Vaivén | control | Intercambia la posición de dos unidades a ≤ 10 m (aliados o enemigos). |
| 22 | **Corriente** | Vaivén | movilidad | Teletransporte de 8 m; deja una compuerta baja de 2 s. |
| 35 | **Esclusa sellada** | Sereno | defensa / control | Estasis 2 s a cualquier objetivo: no puede actuar pero es inmune a todo. |
| 50 | **Desagüe** | Vaivén | definitiva | Remolino de 5 m que atrae a todos los enemigos al centro y los entumece. |

---

## 5. Combinaciones en grupo

El objetivo cooperativo: **cada clase prepara algo que otra aprovecha**, y las
reacciones de la §2.2 se disparan con huellas de compañeros.

| Combinación | Cómo funciona |
|---|---|
| Esclusero + Diablico | *Desagüe* junta a los enemigos; el Diablico cae con *Brinco* y *Zapateo* sobre el montón. |
| Tamborero + Diablico | *Calentura* hace que el Diablico deje huella de Bochorno; con *Repique* del Tamborero sale **Tamborazo** (aturde). |
| Pilonero + Arponero | *Jalón* y *Recoger sedal* traen enemigos al Pilonero; las *Nasas* puestas delante los inmovilizan. Ñeque + Bejuco = **Latigazo** (agrupa). |
| Yerbatero + Pilonero | *Amarre* reparte el daño hacia el tanque y *Toma de monte* reparte la curación: el grupo funciona como una sola barra. |
| Cuentero + cualquiera | El Candilito **revela trampas** del enemigo; las moralejas potencian a quien se quede cerca. |
| Esclusero + Yerbatero | *Marea atrás* + *Ánima de vuelta*: dos capas de retroceso para jefes que matan de un golpe. |
| Arponero + Esclusero | *Marea alta* empuja y el *Trueque* mete al enemigo en una Nasa. Vaivén + Ñeque = **Rebote**. |
| Yerbatero + Tamborero | Sereno + Bochorno (*Sereno de madrugada* + *Calentura*) = **Vaharada**, área de vapor. |

Composición de mazmorra de 4 recomendada: tanque o control (Pilonero /
Esclusero), sanador (Yerbatero), apoyo (Tamborero / Cuentero) y daño
(Diablico / Arponero). Pero ninguna clase es imprescindible: el Cuentero y el
Esclusero pueden sustituir al tanque y el Tamborero al sanador a costa de
dificultad.

---

## 6. Repertorio comprable y dropeable (1–100)

Además del kit de clase, cada personaje puede aprender hechizos **universales**
(`classId: null`). El objeto que los enseña se llama **décima**, como la
copla campesina de diez versos: «se aprendió la décima» = aprendió el
hechizo. Hoy son los pergaminos (`learnSpell`); sólo cambia el nombre.

Reglas:

- Cada décima tiene **nivel requerido**: se puede aprender antes, pero no se
  pone en la barra hasta tenerlo (ya implementado con `unlockLevel`).
- Los hechizos de **otras clases** no se venden ni caen (respuesta del creador
  «depende»); queda como pregunta (§9).
- **Fuentes:** tienda (T), botín de una familia de monstruos (B), misión (M),
  cofre o jefe de mazmorra (J), pesca (P), oficio de escribanía (O),
  monstruo raro (R).
- El daño base de cada franja sube ~35 % respecto a la anterior; los efectos
  de control no se alargan, sólo cambian de forma.

| Franja | Hechizo | Elem. | Qué hace | Cómo se obtiene |
|---|---|---|---|---|
| 1–10 | Raspadura | Ñeque | Golpe básico mejorado con empuje corto. | T (Villa Raspadura) |
| 1–10 | Agua de pipa | Bejuco | Curación propia pequeña con regeneración. | T |
| 1–10 | Chiflido | Saloma | Llama la atención de un grupo de monstruos a 15 m. | M |
| 1–10 | Paso de mono | Vaivén | Salto de 5 m. | B (monos del pueblo) |
| 11–20 | Sol de las doce | Bochorno | Zona de sofoco en el suelo. | B (Llanos de Azuero) |
| 11–20 | Cáscara de coco | Ñeque | Escudo propio que estalla al romperse. | T |
| 11–20 | Pegajoso | Bejuco | Proyectil que inmoviliza 1 s. | P |
| 21–30 | Mangle cerrado | Bejuco | Pared de raíces de 4 m. | B (Manglares de Chame) |
| 21–30 | Neblina baja | Sereno | Zona que da sigilo a los aliados dentro 3 s. | J (brecha de Cerro Punta) |
| 21–30 | Eco de cañada | Saloma | El próximo hechizo propio repite su eco. | M |
| 31–40 | Bajamar | Vaivén | Retroceso propio de 3 s. | J (Bocas) |
| 31–40 | Calor de fogón | Bochorno | Potencia +15 % el próximo Bochorno de un aliado. | O |
| 31–40 | Grito de potrero | Saloma | Cono que asusta: los enemigos huyen 1,5 s. | B |
| 41–50 | Concha de perla | Vaivén | Reenvío de 1,5 s. | P (Archipiélago de las Perlas) |
| 41–50 | Cuajo de sereno | Sereno | Estasis propia de 1,5 s (inmune, inmóvil). | R |
| 41–50 | Rama de guarumo | Bejuco | Enlaza a un aliado: la mitad del daño que reciba lo cura a ti. | T |
| 51–60 | Lluvia de mangos | Ñeque | Lluvia de golpes en área durante 3 s. | B (Darién) |
| 61–70 | Volcán dormido | Bochorno | Marca el suelo; a los 3 s, área grande. | J (Cumbre del Barú) |
| 61–70 | Escarcha del Barú | Sereno | Inmoviliza en línea. | B |
| 71–80 | Viento de Fortuna | Saloma | Empuje en área enorme alrededor. | J (Páramo de Fortuna) |
| 81–90 | Diente de tiburón | Ñeque | Golpe que ignora el 20 % de la resistencia. | R |
| 91–100 | Doble marea | Vaivén | Durante 4 s, todos tus desplazamientos se pueden deshacer con otra pulsación. | J (mazmorra definitiva) |
| 91–100 | Último cuento | Saloma | Revive a un aliado caído con el 30 % de vida (1 vez por combate). | M (cadena final) |

(Las franjas 51–100 llevan menos filas aquí; se completarán con la misma
plantilla cuando existan esas zonas y familias de monstruos.)

**Progresión propia del hechizo** (el creador pidió no copiar los rangos de
Dofus): propuesta **Maña**. Cada hechizo gana maña al usarse en combates
útiles (contra enemigos de nivel cercano). Tiene 3 mañas; cada una da una
mejora fija ya escrita en el hechizo (no se elige entre variantes, que al
creador le da pereza): 1.ª −10 % coste, 2.ª +15 % efecto, 3.ª un detalle
distinto (más radio, una huella extra, menos enfriamiento). Sustituiría a
`maxRank`/`perRank`.

---

## 7. Trampas

El creador: «las trampas son hechizos pero con detonador; lo pisas y se activa
y está invisible».

**Cómo funcionan**

- Una trampa es un hechizo con `area` de trampa: se coloca en el suelo, tarda
  **1 s en armarse** y queda **invisible** para los enemigos.
- **Detonadores** (uno por trampa): *pisada* (alguien entra en su radio),
  *hilo* (alguien cruza la línea entre dos postes), *a mano* (el dueño la
  detona con otra pulsación) y *de retardo* (se activa sola a los N s).
- Duran 60 s. Máximo 3 por jugador (la Nasa del Arponero, 4 con *Corral*).
- Las trampas del jugador **sólo** afectan a enemigos (salvo que el hechizo
  diga «fuego amigo»). Las de monstruos (Darién, mazmorras) afectan a los
  jugadores.

**Cómo se ven**

- El **dueño y su grupo** las ven siempre como un contorno tenue del color del
  elemento.
- Un enemigo **no** las ve, salvo que:
  - esté dentro de su **radio de percepción** (`1,5 m + 0,02 × Malicia + 0,01 ×
    Calma`): se dibuja un brillo leve un segundo antes de pisarla;
  - le caiga **Sereno** en la zona (el rocío se posa en la trampa: queda visible
    6 s para todos);
  - un **Candilito** del Cuentero esté a 4 m.
- La reacción *Vaharada* ciega: dentro de la nube no se ven trampas.

**Cómo se contrarrestan**

- **Ver y rodear:** con Malicia, Sereno o Candilito.
- **Romperlas:** una trampa visible recibe daño; cualquier golpe de **Ñeque**
  la destruye sin activarla.
- **Detonarlas a propósito:** empujando a un enemigo encima, mandando una
  invocación o con *Trueque*.
- **Inmunidad:** quien está inmune o en estasis no las activa.
- **Pisada ligera:** al pisar con la trampa ya percibida, el efecto llega con
  0,4 s de retraso (da tiempo a salir con un desplazamiento). Sin azar.

---

## 8. Migración desde el código de hoy

Sólo para el agente que implemente cuando el creador elija; aquí no se toca
código.

1. `ELEMENTS` en `src/rpg/contracts.ts`: `['neque', 'bochorno', 'sereno',
   'saloma', 'bejuco', 'vaiven']`. Tabla de alias para partidas guardadas y
   datos viejos: `physical→neque`, `fire→bochorno`, `frost→sereno`,
   `storm→saloma`, `earth→bejuco` (§2.4).
2. `PRIMARY_STATS`: `['fibra', 'temple', 'calma', 'pulmon', 'arraigo', 'tino',
   'aguante', 'malicia']`. Alias: `strength→fibra`, `intellect→temple`,
   `agility→tino`, `vitality→aguante`, `spirit→pulmon`; `calma`, `arraigo` y
   `malicia` empiezan en 0 y el personaje recibe un reinicio gratis.
3. `progression.json`: `rules.elementStat` pasa a 1:1 (§3), `derived` con las
   fórmulas de `docs/propuestas/elementos.json`, `statPointsPerLevel: 5`,
   `statCost.malicia: 2`, `maxLevel: 100` y la curva nueva.
4. Efectos nuevos que los borradores usan y el código no tiene todavía
   (marcados `"_nuevo": true` en los borradores): `trap`, `placeTrap`,
   `reveal`, `anchor`, `reelAnchor`, `tether`, `wall`, `gate`, `swapAny`,
   `swapSummon`, `pullArea`, `drag`, `echo`, `interrupt`, `cleanse`, `stance`,
   `comboEvery`, `consumeStacks`, `requiresStatus`, `sacrificeSummon` y
   `buffSummons`, más `zone` con `targets: "allies"`. Los estados nuevos
   (provocar, estasis, retroceso al morir, vida mínima, inmunidad al
   control…) están en `docs/propuestas/statuses.json`. Las huellas y
   reacciones son un sistema nuevo en `src/sim/` (tabla en datos, lógica pura
   con tests).
5. Clases nuevas: `docs/propuestas/classes.json`; hechizos de clase:
   `docs/propuestas/spells.json` (mismo formato que `data/rpg/*.json`).
   Vanguardia de Brasa y Tejedora de Tormentas quedan como clases antiguas
   hasta que el creador diga si se retiran o se reconvierten (§9).

---

## 9. Preguntas para el creador

Responde en `> R:` como en el cuestionario. Si alguna te da igual, se usa la
marcada como **(recomendada)**.

1. **Ambientación:** ¿A (Istmo de los Espantos, fantasía tropical), B (Canal
   Eterno, retrofuturista) o C (La Marea Doble, mezcla) **(recomendada)**?
    > R:
2. **Número de elementos:** ¿6 **(recomendada)** o 7 con Salitre (corrosión)?
    > R:
3. **Nombres de elementos:** ¿te gustan Ñeque, Bochorno, Sereno, Saloma,
   Bejuco y Vaivén? Cambia el que no te suene.
    > R:
4. **Reacciones:** ¿las huellas de un compañero disparan reacciones
   **(recomendada, es lo cooperativo)** o sólo las tuyas?
    > R:
5. **Estadísticas:** ¿te gustan Fibra, Temple, Calma, Pulmón, Arraigo, Tino,
   Aguante y Malicia? ¿Malicia cuesta doble **(recomendada)** o igual que el resto?
    > R:
6. **Séptima clase:** ¿Esclusero (control) **(recomendada)**, o prefieres
   otra? Alternativas: *Salinero* (corrosión, si hay Salitre), *Guardafaro*
   (luz y visión, anti-trampas), *Cayuquero* (montado en su canoa, móvil).
    > R:
7. **Diablico:** se inspira en los diablicos de las fiestas de Azuero. ¿Te
   parece bien usar esa figura o prefieres un nombre menos ligado a la
   tradición?
    > R:
8. **Clases actuales:** ¿retiramos Vanguardia de Brasa y Tejedora de
   Tormentas, o las reconvertimos (Vanguardia → Pilonero o Diablico; Tejedora
   → Esclusero)?
    > R:
9. **Hechizos de otras clases:** ¿se pueden aprender (como hoy) o sólo los
   universales **(recomendada para que cada clase se distinga)**?
    > R:
10. **Progresión de hechizos:** ¿Maña (mejora por uso, 3 niveles fijos)
    **(recomendada)**, rangos con puntos, o sin mejora?
    > R:
11. **Décimas:** ¿te gusta llamar «décimas» a los objetos que enseñan
    hechizos?
    > R:
12. **Trampas:** ¿el grupo del dueño las ve **(recomendada)** o sólo el dueño?
    ¿Máximo 3 por jugador?
    > R:
13. **Careta del Diablico:** ¿bloquear la curación de otros durante el frenesí
    es un buen riesgo, o es demasiado castigo?
    > R:
14. **Golpe a tiempo del Tamborero:** ¿te gusta una mecánica de ritmo
    (lanzar en el latido) o es demasiado exigente en tiempo real?
    > R:
15. **Curva de XP:** ¿nivel máximo 100 para el prototipo largo, con
    `60 · n^2,2` **(recomendada)**, o más lenta todavía?
    > R:
