# 06 · Plan de implementación

Estado: propuesta de orden. **Nada de aquí está autorizado a ejecutarse**; cada fase empieza cuando el creador lo dice. Prioridad pedida por el creador: primero el rango de hechizos, aislado; después una rebanada 1–10 completa y divertida; el resto del Acto I solo si la rebanada convence.

En ninguna fase se cambia el balance productivo, las franjas, los hechizos actuales ni Vigor, Maná o Puntería, salvo que la fase lo diga y el creador lo haya ratificado.

## Dependencias

```
P0 Base sana ──► P1 Rangos ──► P2 Rebanada 1–10 ──► (decisión del creador) ──► P4 Resto del Acto I
      │                              ▲
      └──► P0b Orden (pequeño) ──────┘
P3 Prototipos de mecánicas (aislados; no bloquean P2; alimentan P4)
```

## P0 · Base sana

| Qué | Depende de | Pruebas | Para empezar hace falta |
|---|---|---|---|
| **P0.1** Las 5 pruebas rotas por `cc838c1` (D-00) | — | `tests/vegetation`, `iguanera`, `mapLayout`, `townRules` en verde **sin editar las pruebas**; recorrido del muelle en Electron | Que el creador diga, cambio por cambio, cuál era intencional (lista en [ACCIONES_CREADOR](../ACCIONES_CREADOR.md)) |
| **P0.2** Pendientes de Junie: J2-fix, J4a-fix, J5 | — | Las que cita cada tarea; capturas en `work/` | Autorización de la cola de Junie |
| **P0.3** `content:check` reducido (D-45) | — | Ids únicos y referencias entre datos. Sin cuotas ni clasificaciones | Autorización |

Salida: `npm test`, `npm run typecheck` y `npm run docs:check` en verde.

## P1 · Rangos de hechizo (D-01), aislado

Una sola entrega, sin ningún otro cambio dentro.

| Paso | Qué | Prueba |
|---|---|---|
| 1 | Función pura `rankAtLevel(def, level, cfg)`; factores y nivel máximo leídos de `data/rpg/progression.json` | La tabla de ejemplos de [03](03_HECHIZOS_Y_RANGOS.md); con otro máximo (100) los umbrales se recalculan |
| 2 | Rango efectivo = mayor entre el guardado (pergaminos) y el automático | Un guardado antiguo carga igual o mejor, nunca peor; guardar y cargar no cambia el archivo más que en el rango |
| 3 | Aplicarlo al subir de nivel, al cargar y en las partidas de prueba | Personaje de nivel máximo de cada clase: todos sus hechizos en rango máximo |
| 4 | Pergaminos sin cambios | Las pruebas actuales de `Spellbook.learn()` pasan sin tocarlas |
| 5 | Crítico y multilínea intactos | Un hechizo de varias líneas en rango 1 y en rango máximo: misma probabilidad de crítico, una sola tirada, cada línea escalada con `perRank` |
| 6 | Balance | `npm run balance:v3` antes y después: los personajes de nivel bajo no cambian; se informa cuánto sube el daño a niveles altos, sin ajustar nada |
| 7 | Aviso al jugador al subir un rango | Recorrido en Electron con una partida de prueba |

Para empezar hace falta: respuestas R1–R4.

## P2 · Rebanada jugable 1–10

Iguanera → Pedasol → Sabanas. Usa los hechizos y recursos que ya existen. Objetivo: que sea completa y divertida, no que sea grande.

| Bloque | Qué | Depende de | Prueba |
|---|---|---|---|
| **P2.1** Fichas de zona (D-30) | Hito, caminos que llevan a algo, claros de pelea, un secreto por zona | P0.1 | Recorrido de punta a punta en Electron, con capturas; pruebas de mapa en verde |
| **P2.2** Familias (D-10 parcial, D-12, D-13 parcial, D-14 parcial) | Duendes, Comejenes y Gallotes, con su mecánica. Arquetipos **nuevos**; los actuales no cambian de cifras | P0 | Una prueba por mecánica (nido, picada, robo); combate medido con el bot contra personajes de nivel 3, 6 y 10 |
| **P2.3** Modelos (D-17, D-18) | Ave y comején. Mientras no estén, se usan modelos existentes | — | Validador de cada modelo |
| **P2.4** Misiones principales 1–5 (D-20) | Texto del coordinador, datos de Junie | P2.1, P2.2 | Prueba de la cadena completa; del nivel 1 al 10 sin herramientas de desarrollo |
| **P2.5** Secundarias (D-25) | Al menos: un secreto, una de humor, una de pesca u oficio y un misterio. Independientes de la historia central | P2.1 | Prueba de cada cadena |
| **P2.6** Despertar por clase (D-23 parcial) | Texto inicial distinto y la primera misión de clase | P2.4 | Las tres clases llegan al nivel 10 |
| **P2.7** Prueba del creador | Juega la rebanada con una clase | Todo lo anterior | Su veredicto: divertida o no, y qué cambiar |

Medición antes de entregar: tiempo real del 1 al 10 con cada clase (bot y recorrido manual). El objetivo de una hora es provisional.

## P3 · Prototipos de mecánicas (aislados)

Se construyen en `src/sim/` con pruebas y se usan solo en el laboratorio de combate y en partidas de prueba. No entran en `data/rpg/spells.json` ni en las clases productivas.

| Prototipo | Depende de | Qué se mide |
|---|---|---|
| Obstáculo (D-02) | — | Rutas, línea de visión, limpieza al expirar, coste de navegación |
| Brasa (D-05) | — | Daño y aguante con y sin Brasa, **sin tocar el Vigor** |
| Hilos (D-04) | — | Daño por Maná de las combinaciones frente a los hechizos actuales |
| Reclamo (D-03) | — | Daño por Puntería con el área repetida; qué pasa con dos jugadores |

Salida: un informe por prototipo en `work/` y una demostración jugable. El creador decide cuáles pasan a producción y con qué hechizos (D-06).

## P4 · Resto del Acto I

No se planifica en detalle hasta terminar P2. Contenido previsto en [05](05_VERSION_ESTABLE.md): niveles 10–40, por tramos (Canajagua, Cañaverales, cripta, Parrita y Chitrí), cada uno con la misma forma que P2.

## P0b · Orden del repo (pequeño, en paralelo)

| Tarea | Condición |
|---|---|
| D-40, D-41, D-42 | Mover y documentar; ningún cambio de comportamiento |
| D-43 | **Una extracción por entrega**: se mueve un bloque de código a un archivo nuevo, sin cambiarlo, con las pruebas intactas. Nunca dos archivos grandes a la vez, nunca una reescritura |
| D-44 | Solo cuando un archivo de datos cause choques reales entre agentes. Un tipo de contenido por entrega, con prueba de que el contenido cargado es idéntico |

## Reglas de entrega para toda fase

1. Una entrega = una tarea. Sin cambios de paso.
2. `npm test` y `npm run typecheck` en verde; ninguna prueba se relaja ni se alarga.
3. Lo visible se comprueba en Electron y la captura queda en `work/<agente>-<tarea>/`.
4. Las cifras nuevas van en `data/` con la etiqueta `PROPUESTA` y su medición.
5. Bitácora, ESTADO_ACTUAL y TAREAS actualizados; lo que deba decidir el creador, arriba en ACCIONES_CREADOR.
