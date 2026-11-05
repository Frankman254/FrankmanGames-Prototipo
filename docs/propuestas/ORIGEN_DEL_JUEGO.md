# Lugar de origen del juego

Estado: **Iguanera aprobada como origen** por el creador el 2026-11-05. Lo narrativo sigue siendo PROPUESTA: quién es el personaje, la premisa y las lecciones.

## Construido (etapas A y B)

| Pieza | Dónde |
|---|---|
| Isla de unos 90 × 65 m pisables, frente a Pedasol | `data/panama.json` (segundo anillo de Los Santos) |
| Zona Iguanera, niveles 1–3, sin monstruos alfa | `data/zones.json` |
| Bosque seco y playa: cocoteros, árboles de hoja caduca, matorral y roca | bioma `iguanera` en `data/vegetation.json` |
| Piedra Pintada de Iguanera: un personaje nuevo empieza aquí y solo la conoce a ella | `start` en `data/stones.json`, `src/world/stones.ts` |
| Lanchas de ida y vuelta: clic junto al muelle, ir andando y cruzar | `boats` en `data/stones.json`, `src/world/boats.ts` |
| Lancha de Blender con clip `Reposo` en los dos muelles | `scripts/blender/lancha.py` |
| Prueba en el juego: inicio, clic real en el muelle, guardar y cargar en los dos lados | escenario `iguanera` |

**Escala exagerada a propósito:** el refugio real mide unas 53 hectáreas. A 1:100 serían unos 7 m de isla; aquí son unos 90 × 65 m, unas trece veces más, para que quepa la zona de aprendizaje. La lancha real sale de playa El Arenal, en Pedasí, y tarda unos 20 minutos: en el juego, el muelle de Pedasol hace ese papel y el cruce es inmediato.

Sobre la isla real: refugio de vida silvestre desde 1981, con arrecife de coral, tortugas y aves marinas, ballenas jorobadas de julio a octubre, y revisiones recientes por material explosivo. No se encontró ninguna fuente sobre su historia militar. Fuentes: [Lonely Planet](https://www.lonelyplanet.com/points-of-interest/refugio-de-vida-silvestre-isla-iguana/1359293), [La Estrella](https://www.laestrella.com.pa/nacional/220207/amplian-650-9-hectareas-area-protegida-isla-iguana), [Panamá América](https://www.panamaamerica.com.pa/rumbos/isla-iguana-el-desafio-del-turismo-sostenible-1248202).

## Aprendizaje (etapa C)

Cadena «Mañana en Iguanera», con dos PNJ: Eligio Vergara, guardaparque, y Nena Cedeño, lanchera. Nombres, diálogos y recompensas son PROPUESTA. La premisa no se fija: el personaje hace tareas de la isla y ve una primera señal, unas espirales en una roca que miran al continente.

| Misión | Enseña | Cómo |
|---|---|---|
| La ronda del guardaparque | Moverse, cámara, mapa, hablar | Subir al mirador del arrecife y saludar a la lanchera |
| Satos en el muelle | Atacar y usar hechizos | Tres satos de nivel 1–3, solo cuerpo a cuerpo |
| Piedras desde el monte | Leer la marca del suelo y apartarse; el vigor | Dos duendes tirapiedras, que avisan antes de cada tiro |
| La cena de Nena | Pescar | Dos capturas en la poza de marea |
| Lo que deja la marea | Explorar y una pelea algo más dura | Ver la roca marcada; sato grande con dos satos, todos de nivel 3 |

Al terminar, Nena cruza a Pedasol. Antes, la lancha no sale. Quien ya pisó tierra firme vuelve a subir sin repetir nada.

**Medido con `npm run balance:inicio`**, para todas las clases y con habilidad mala y media: los grupos de la isla y el final se ganan siempre, sin morir. El golpe más fuerte quita el 17 % de la vida y la pelea final dura de 5 a 6 s. Se sale del aprendizaje con nivel 3. **En el juego** (escenario `aprendizaje`, 23 comprobaciones): la cadena entera con diálogos reales, pesca, sin monstruos de más de nivel 3 en la isla, guardar y cargar, y la lancha cerrada hasta terminar.

**Límites:** no hay ayudas en pantalla, solo lo que dicen los PNJ. La tecla de esquivar no se nombra, porque la marca del suelo basta. Los monstruos son los del llano: satos y duendes. No hay animales propios de la isla, como iguanas o aves marinas. Falta que alguien lo juegue.

El texto siguiente es la propuesta original.

## Qué se busca

Un sitio pequeño y apartado donde aprender a jugar y del que se sale una sola vez hacia el mundo: el papel de una zona de tutorial en una isla, seguida de una primera ciudad. Aquí se toma la idea de la estructura, sin nombres, mapas ni contenido de otro juego.

## Lo que dice la historia

- **Bocas del Toro y Balboa:** no coinciden. Quien llegó a la zona de Bocas fue Colón, en 1502. Balboa pasó por la costa del istmo con Bastidas en 1501, y volvió a la región del Darién hacia 1510.
- **1501:** Rodrigo de Bastidas recorre la costa caribeña desde Venezuela hasta el golfo de Urabá.
- **1502:** Colón llega a la bahía de Almirante, en la actual Bocas del Toro.
- **1510:** se funda Santa María la Antigua del Darién, por consejo de Balboa. Hoy ese sitio queda en Colombia.
- **1513:** Balboa cruza el istmo y ve el Mar del Sur.
- **Antes de todo eso:** la cerámica de Monagrillo, junto a Chitré, data de 2500–1200 a. C. y se cita como la más antigua de Panamá y de Centroamérica. Las primeras fuentes hablan de personas que ya vivían aquí, no de una llegada.

Fuentes: [Balboa, Memoria Chilena](https://www.memoriachilena.gob.cl/602/w3-article-98104.html), [Historia de Panamá hasta 1821](https://wikipedia.com/wiki/History_of_Panama_(to_1821)), [Monagrillo](https://en.wikipedia.org/wiki/Monagrillo_(archaeological_site)). Las búsquedas no confirmaron datos sobre Isla Iguana, así que aquí solo se usa su sitio en el mapa.

## Opciones

| Opción | Cómo sería | A favor | En contra |
|---|---|---|---|
| **A. Iguanera (Isla Iguana)** | Isla frente a Pedasol. Se aprende allí y una lancha cruza a Pedasol. Niveles 1–3 | Ya está en el atlas y junto a Los Santos, y encaja con las franjas actuales. Es isla, como pediste. | Es diminuta a escala: hay que agrandarla mucho. Falta verificar su historia antes de usarla |
| **B. Naufragio en Bocas** | Se llega por mar, como en 1502, a la bahía de Almirante | Es la historia que recordabas | Bocas está en la otra punta del país y tiene franja 60–70: obliga a reordenar todas las regiones. Empezar como europeo recién llegado es una lectura delicada |
| **C. Darién, 1510** | Primer poblado, primer cruce a pie | Mucha aventura | El sitio real queda fuera de Panamá, y Darién tiene franja 50–60 |
| **D. La aldea de Monagrillo** | Un origen antiguo, antes de cualquier llegada | Es la idea más propia de Panamá: aquí ya había gente | Está en Herrera, al lado de zonas de nivel alto. Inventar una cultura antigua pide cuidado y consulta |

## Recomendación

**A para jugar, D para la historia.** Se empieza en Iguanera, se cruza a Pedasol y Villa Raspadura hace de primera ciudad. Monagrillo queda como secreto de nivel alto: el jugador descubre más tarde que el verdadero origen estaba en Herrera. Sarigua, en la franja 65–80, queda justo al lado.

Para no presentar la llegada europea como el comienzo de Panamá, el jugador no sería un conquistador ni descubriría nada: sería alguien de aquí. Quién es y por qué está en la isla depende de la premisa, que sigue sin elegirse.

## Si se aprueba

1. Agrandar la isla en `data/panama.json`, como excepción a la escala.
2. Añadir la zona, el inicio y las lanchas de ida. No hay barcos todavía (M07).
3. Decidir qué se enseña allí y con qué PNJ. Eso es contenido creativo.
