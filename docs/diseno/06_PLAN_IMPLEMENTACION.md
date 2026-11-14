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

## P1 · Rangos de hechizo, aislado

Reglas ratificadas (R1–R4). Cuatro entregas pequeñas más el doble clic; cada una se publica sola.

```
D-01a Regla por nivel ──► D-01d Aviso
        │
        └──► D-01b Pergaminos por rango (C1) ──► D-01c Tasa de botín (C2)
UI-01 Doble clic (independiente; D-01b lo necesita para probarse en Electron)
D-50 Estudio del nivel 400 (independiente; solo informe)
```

| Tarea | Qué | Pruebas |
|---|---|---|
| **D-01a** | Función pura `rankAtLevel(def, level, cfg)`; factores en `data/rpg/progression.json`; nivel máximo leído de datos. Rango efectivo = mayor entre guardado y automático. Se aplica al subir de nivel, al cargar y en las partidas de prueba | Tablas de [03](03_HECHIZOS_Y_RANGOS.md) con máximo 200 y con 400; personaje de nivel máximo de cada clase con todo en rango máximo; un guardado viejo carga igual o mejor; las pruebas actuales de `Spellbook.learn()` pasan sin tocarlas; hechizo multilínea en rango 1 y máximo: misma probabilidad de crítico, una tirada, cada línea con `perRank`; `npm run balance:v3` antes y después, informando cuánto sube el daño a nivel alto sin ajustar nada |
| **D-01b** | Contador de pergaminos por hechizo y coste por rango | Tabla de situaciones de 03; guardado viejo carga con contador cero; pergamino en rango máximo no se gasta |
| **D-01c** | Medir cada cuánto cae hoy un pergamino por franja y proponer la tasa baja | Informe en `work/`; el cambio de `data/rpg/loot.json` espera la cifra del creador |
| **D-01d** | Aviso arriba al subir un rango (por nivel o por pergamino); varios a la vez se agrupan | Prueba del evento; recorrido en Electron con una partida de prueba |
| **UI-01** | Doble clic en la mochila: usa, equipa o lee según el objeto. Arrastrar y soltar funcionando. Cursor de manito solo mientras se arrastra | Prueba de la lógica de doble clic; recorrido en Electron: equipar, usar poción y leer pergamino con doble clic, mover con arrastre, cursor normal al pasar por encima |
| **D-50** | Estudio del nivel máximo 400: qué depende de 200 o de 100 y qué cambia | Solo informe; ningún dato se modifica |

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
