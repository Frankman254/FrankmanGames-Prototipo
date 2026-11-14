# 05 · Versión estable

Estado (creador, 2026-11-13): **Los Santicos 1–40 se acepta como hito de versión estable**, no como límite permanente del proyecto. Antes de construirlo entero se hace una **rebanada jugable 1–10 completa y divertida**. Duraciones y ritmos son objetivos provisionales sujetos a pruebas.

## Qué es

**«Los Santicos de principio a fin»**: el Acto I completo, jugable con las tres clases, del nivel 1 al 40, en unas 6 a 8 horas (objetivo provisional; se corrige con pruebas reales). Se empieza en Iguanera, se termina bailando contra el Diablo Mayor y no hay ningún tramo sin algo que hacer.

Es un hito, no una frontera: el resto del mundo sigue en el mapa y explorable, y las demás ideas del creador se conservan en [00 Decisiones](00_DECISIONES.md#decisiones-anteriores-del-creador-que-se-conservan). Solo se decide qué se construye primero.

## Qué falta

| Área | Hoy | Para la estable | Tareas |
|---|---|---|---|
| **Historia** | 10 misiones sueltas, sin hilo | 12 principales, 9 de clase y secundarias independientes (secretos, humor, oficios, pesca) | D-20 a D-25 |
| **Rangos de hechizo** | Solo por pergamino | Automáticos por nivel; pergaminos escasos para adelantarse; doble clic en la mochila | D-01a a D-01d, UI-01 |
| **Hechizos** | Se dejan de aprender en el nivel 20 | Prototipos aislados de las tres mecánicas firma; qué hechizos nuevos entran lo decide el creador al verlos | D-02 a D-06 |
| **Monstruos** | 65 arquetipos sin familia | 6 familias con mecánica propia; arañas y aves | D-10 a D-19 |
| **Zonas** | Vegetación y objetos puestos sin propósito | Cada zona con su ficha cumplida | D-30 a D-32 |
| **Mazmorra** | Cripta con pisos generados; el jefe no cierra historia | Tramo del Acto I con la Tulivieja y su final | D-24 |
| **Progreso** | La historia y las franjas no siempre coinciden | Las franjas no se tocan; se coloca contenido del nivel que haga falta dentro de cada región | — |
| **Orden del repo** | Archivos gigantes, datos duplicados, pruebas en `arte/` | Mapa de contenido y limpieza | D-40 a D-45 |
| **Pendientes anteriores** | Regresión de efectos (J2-fix), vista previa de apuntado (J4a-fix), paso del personaje (J5) | Cerrados | Cola de Junie |

## Línea de progreso

| Nivel | Dónde | Qué aprende el jugador | Hechizos de clase |
|---|---|---|---|
| 1–3 | Iguanera | Moverse, pelear, pescar, tocar una Piedra | Los iniciales |
| 3–10 | Pedasol y Sabanas | Grupos de enemigos, ir primero por el nido, comprar y equiparse | Los que hoy se aprenden hasta el nivel 10 |
| 10–18 | Canajagua | Terreno peligroso (telaraña), enemigos nocturnos | Los actuales hasta el nivel 18 |
| 15–30 | Cripta de la Tulivieja | Mazmorra por pisos, jefe con fases | — |
| 18–25 | Cañaverales de Pesé | Enemigos con jefe que da órdenes; elegir bando en una misión | 13–15: todos los actuales |
| 25–40 | Parrita y Chitrí | Mecánica firma de la clase (si se ratifica); jefe final con compás | 13–15, o hasta 17–19 si se aprueban hechizos nuevos |

Ritmo objetivo (`PROPUESTA`, se mide con `npm run balance:v3`):
- Niveles 1–10 en 1 hora; 10–25 en 2,5 horas; 25–40 en 3 horas.
- Las misiones principales dan alrededor del 40 % de la experiencia del acto, las secundarias el 20 % y los monstruos y oficios el resto. Se puede llegar al final sin repetir zonas para subir.
- Cada zona da una pieza de equipo de su franja por misión, para que nadie llegue al jefe con equipo de 15 niveles menos.

## Misiones principales del Acto I

Son las de la historia central, y por eso cada una dice quién debe qué a quién. Las secundarias no siguen esa regla. Nombres y niveles provisionales.

| # | Id | Nombre | Nivel | Zona | Qué se hace | La cuenta |
|---|---|---|---|---|---|---|
| 1 | `a1_despertar` | Lo que trajo la marea | 1 | Iguanera | Aprender a moverse y pelear con Eligio | Eligio te sacó del agua; le debes una |
| 2 | `a1_piedra` | La piedra que suena | 2 | Iguanera | Limpiar de cangrejos la Piedra Pintada y tocarla | La Piedra lleva años sin que nadie la cuide |
| 3 | `a1_cruce` | El pasaje de Nena | 3 | Iguanera → Pedasol | Pescar para pagar el cruce | A Nena nadie le paga a tiempo |
| 4 | `a1_duendes` | Piedras de día | 5 | Pedasol | Recuperar lo que los duendes robaron al pueblo | Los duendes solo devuelven si se les deja algo a cambio |
| 5 | `a1_estacas` | Medidas ajenas | 8 | Sabanas | Seguir a los topógrafos y ver qué miden: las Piedras | La Compañía compra lo que no tiene dueño en papel |
| 6 | `a1_mascarera` | La máscara que no se quitó | 10 | Villa Raspadura | Hablar con Ña Chepa; primer Diablico suelto | El pueblo debe una danza entera |
| 7 | `a1_madera` | Madera de balso | 12 | Canajagua | Atravesar las telarañas y vencer a Doña Tejeluna | El monte da la madera si se le deja el árbol madre |
| 8 | `a1_tinte` | Rojo de trapiche | 20 | Cañaverales | Conseguir el tinte: trabajarlo, comprarlo o tomarlo | El trapiche era de una familia; la Compañía lo compró barato |
| 9 | `a1_cascabel` | El cascabel | 24 | Cripta | Bajar el tramo del Acto I y enfrentar a la Tulivieja | Ella busca a su hijo; el cascabel era de él |
| 10 | `a1_devolver` | Lo que se le debe | 28 | Cripta y río | Devolverle a la Tulivieja lo que busca; ella entrega el cascabel | Cierra la cuenta de la cripta |
| 11 | `a1_ensayo` | Ensayo general | 32 | Chitrí y Parrita | Reunir a tres Diablicos liberados y aprender el compás | Los bailarines le deben la danza al pueblo |
| 12 | `a1_danza` | La danza completa | 38 | Campos de Parrita | Jefe: Chano, el Diablo Mayor. Se le vence a compás | Chano firmó con «su socio». Fin del acto |

Las 9 misiones de clase están en [02](02_CLASES.md). Las 10 misiones actuales (5 de Raspadura y 5 de Iguanera) se conservan como secundarias; se revisa su texto para que encajen.

Secundarias nuevas, **independientes de la historia central**: en cada zona al menos un secreto, una de humor, una de oficio o pesca y un misterio que no se explica del todo. No tienen que hablar del Pulso ni de deudas.

## Fichas de zona

Una zona está terminada cuando cumple su ficha. La vegetación y los objetos se colocan por regla de bioma y alrededor del hito, no al azar.

Cada zona necesita: **propósito** en la historia, **hito** (algo que se ve de lejos y da nombre al sitio), **familias** de monstruos, **recurso** propio, **centro de misiones**, **rutas** de entrada y salida, y **un secreto**.

| Zona (id) | Nivel | Propósito | Hito | Familias | Recurso | Centro | Secreto |
|---|---|---|---|---|---|---|---|
| Iguanera (`iguanera`) | 1–3 | Aprender | El faro viejo y la Piedra de la playa | Cangrejos, Tijeretas | Pesca de orilla | Caseta de Eligio | Una cueva que solo se abre con marea baja |
| Pedasol (`pedasol`) | 3–6 | Primer pueblo | El muelle y la plaza | Duendes | Coco, pesca | Plaza | El escondite de los duendes |
| Sabanas (`sabanas`) | 5–10 | Campo abierto, primeras cuadrillas | Un corotú enorme y solo | Comejenes, Gallotes, Topógrafos | Leña, cuero | Fonda del camino | Una Piedra Pintada tapada con una lona de la Compañía |
| Villa Raspadura (`raspadura`) | ciudad | Casa del jugador en el acto | La iglesia y el taller de máscaras | — | Comercio y oficios | Taller de Ña Chepa | Una máscara vieja en el campanario |
| Canajagua (`canajagua`) | 10–18 | Monte cerrado y de noche | El árbol madre envuelto en tela dorada | Tejelunas, Pavitas, Chivatos | Madera de balso, seda | Rancho de monteros | El nido de la Pavita Agorera |
| Cañaverales (`cane_pese`) | 18–25 | La Compañía en casa | El trapiche con su chimenea | Arrieras, Talingos, Capataces | Caña, miel | Trapiche | El libro de cuentas del antiguo dueño |
| Parrita y Chitrí (`parrita`, `chitri`) | 25–40 | Final del acto | La plaza de la danza | Diablicos sueltos, Gallotes, Gusarapos menores | Barro, tela | Plaza de Chitrí | El sitio donde Chano firmó |

Reglas de construcción de zona:
1. Primero el hito y los caminos. Luego los claros de pelea. Al final el relleno.
2. Cada camino lleva a algo: una misión, un recurso, un jefe o un secreto. Si no lleva a nada, se quita.
3. Los monstruos se agrupan por familia en sitios con sentido (arañas donde hay tela, comejenes junto a cercas).
4. La densidad de vegetación baja en claros de pelea y caminos, para que se vea el combate.
5. Antes de pintar, se escribe la ficha en la entrega; después, se prueba recorriéndola de punta a punta en Electron.

## Orden de construcción

El detalle, con dependencias, pruebas y lo que necesita cada etapa para empezar, está en [06 Plan de implementación](06_PLAN_IMPLEMENTACION.md).

| Etapa | Qué | Listo cuando |
|---|---|---|
| **P0 · Base sana** | Las 5 pruebas rotas por `cc838c1` y los pendientes de Junie | `npm test` en verde sin relajar pruebas |
| **P1 · Rangos** | Solo la corrección de rangos, aislada | Un personaje de nivel máximo tiene sus hechizos en rango máximo; guardados intactos; pergaminos por rango y doble clic funcionando |
| **P2 · Rebanada 1–10** | Iguanera → Pedasol → Sabanas, con lo que ya existe más misiones 1–5, tres familias y secundarias | El creador la juega entera y dice que es divertida |
| **P3 · Prototipos** | Obstáculo, Brasa, Hilos y Reclamo en el laboratorio | El creador los prueba y decide cuáles pasan |
| **P4 · Resto del Acto I** | Niveles 10–40, por tramos | Se decide después de P2 |

## Lo que espera a después del hito

No se descarta nada de esto; solo no se construye primero.

- Actos II a VI. Sus regiones siguen en el mapa y explorables.
- Clases nuevas.
- Mascotas con progresión y hechizos, máscara de Diablico Espejo, águila harpía, Panamá Viejo, interiores, castillos, cinemáticas y eventos de temporada: ver [00 Decisiones](00_DECISIONES.md#decisiones-anteriores-del-creador-que-se-conservan).
- Pisos de la cripta por encima del tramo del Acto I.
- Multijugador, temporadas y economía entre jugadores.
