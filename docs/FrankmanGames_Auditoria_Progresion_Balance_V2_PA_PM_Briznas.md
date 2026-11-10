# FrankmanGames — Auditoría de progresión y balance V3

**Fecha:** 2026-11-09

**Origen:** revisión V2 corregida y ejecución autorizada contra el checkout local de `master`.
**Alcance:** progresión productiva v2, migración de guardados, fórmulas, tres clases, seis hechizos,
capacidad de objetos, perfiles QA y simulación. Los elementos existentes se conservan.

## 1. Cómo leer este documento

Cada afirmación normativa lleva una categoría:

- **DECISIÓN CONFIRMADA:** respaldada por `DEC-*` vigente o una respuesta explícita del creador ya registrada como decisión activa.
- **IMPLEMENTACIÓN ACTUAL:** comportamiento demostrado en código y pruebas locales; no implica aprobación definitiva de balance.
- **PROBLEMA COMPROBADO:** defecto o limitación reproducible con ruta y prueba.
- **PROPUESTA PENDIENTE:** diseño discutido que no debe llegar a producción sin decisión.
- **VALOR EXPERIMENTAL:** cifra usada sólo por simuladores sobre copias en memoria.

Las propuestas no se convierten en decisiones por aparecer aquí. La autorización del creador del
2026-11-09 sí desbloquea la migración y el rebalanceo descritos en este documento.

## 2. Diagnóstico ejecutivo corregido

### Decisiones confirmadas

- **DECISIÓN CONFIRMADA — combate:** tiempo real, sin turnos en rejilla (`DEC-2026-001`).
- **DECISIÓN CONFIRMADA — control:** clic para moverse y atacar (`DEC-2026-003`).
- **DECISIÓN CONFIRMADA — habilidades:** recurso regenerable y enfriamiento deben coexistir (`DEC-2026-004`).
- **DECISIÓN CONFIRMADA — azar:** varía daño/crítico/efectos; no hay fallo aleatorio de habilidades (`DEC-2026-005`).
- **DECISIÓN CONFIRMADA — Agilidad:** no debe convertirse automáticamente en velocidad de movimiento. La respuesta está conservada en `docs/PREGUNTAS_CREADOR.md`; falta incorporarla al registro `DEC-*` por el coordinador.
- **DECISIÓN CONFIRMADA — defensa:** no añadir una estadística numérica general de Armadura. Las prendas y escudos siguen existiendo como objetos; la mitigación general actual usa resistencias elementales.

### Implementación actual

- **IMPLEMENTACIÓN ACTUAL:** `ELEMENTS = physical, fire, frost, storm, earth` y `PRIMARY_STATS = strength, agility, intellect, vitality, spirit` en `src/rpg/contracts.ts`.
- **IMPLEMENTACIÓN ACTUAL:** nivel máximo técnico `200`, marcado como provisional. Ya no existe una contradicción activa de “máximo 20” en `docs/ESTADO_ACTUAL.md`.
- **IMPLEMENTACIÓN ACTUAL:** cada subida concede `5` de capital, `5` de vida, `5` de capacidad y aplica `statsPerLevel` propios de la clase.
- **IMPLEMENTACIÓN ACTUAL:** las primarias cuestan 1/2/3… de capital por tramos de 100 unidades y el reinicio devuelve el coste exacto.
- **IMPLEMENTACIÓN ACTUAL:** Agilidad aporta `0,0006` de probabilidad de crítico por punto; Espíritu aporta recurso máximo y regeneración; Vitalidad aporta vida.
- **IMPLEMENTACIÓN ACTUAL:** Físico/Tierra usan Fuerza; Tormenta usa Agilidad; Fuego/Hielo usan Intelecto.
- **IMPLEMENTACIÓN ACTUAL:** el daño aplica `base + scaling × mainStat`; si la primaria elemental coincide con `mainStat` no vuelve a multiplicarla. Después aplica Potencia, afinidad, daño plano, crítico y resistencia.
- **IMPLEMENTACIÓN ACTUAL:** Pulso, vida y recurso de clase son tres conceptos diferentes.
- **IMPLEMENTACIÓN ACTUAL:** la mochila parte de `1500`, gana `5` por nivel y acepta `carryCapacity` de objetos; `defaultItemWeight=1000`, aunque la mayoría declara peso explícito menor.
- **IMPLEMENTACIÓN ACTUAL:** hay 12 ranuras normales y un selector separado de partidas de desarrollo. La previsualización ya muestra `Requiere nivel N`.
- **IMPLEMENTACIÓN ACTUAL:** existen 16 perfiles visuales explícitos. Ocho usan sólo objetos demostrablemente obtenibles; ocho incluyen bonificaciones artificiales y son estrés experimental.

### Problemas comprobados

1. **PROBLEMA RESUELTO — procedencia QA:** los perfiles nuevos sólo equipan rutas demostrables por kit, tienda, botín, misión, pesca o receta.
2. **PROBLEMA RESUELTO — doble escalado:** la primaria coincidente ya no se aplica dos veces; el caso de 100 puntos baja de 168 a 88.
3. **PROBLEMA RESUELTO — progresión:** `configInicial` se retiró; capital, vida y capacidad tienen un único contrato productivo.
4. **PROBLEMA RESUELTO — reinicio:** asignar cobra el tramo correcto y reiniciar devuelve el capital exacto.
5. **PROBLEMA COMPROBADO — cobertura territorial:** no hay territorio completo para niveles 101–200. Sus partidas se rotulan como simulaciones y comienzan en el hogar.
6. **PROBLEMA COMPROBADO — balance de enemigos:** desde varias franjas medias la línea base todavía derrota a las tres clases incluso con equipo obtenible optimizado. Requiere calibración separada de enemigos y zonas.

## 3. Contratos productivos activados

### Progresión por nivel

- **IMPLEMENTACIÓN ACTUAL:** `+5 Vida`, `+5 Briznas` y `+5 capital` por nivel.
- **IMPLEMENTACIÓN ACTUAL:** `costeSiguiente(asignados) = 1 + floor(asignados / 100)`.
- **IMPLEMENTACIÓN ACTUAL:** `configInicial` se eliminó para evitar una segunda fuente contradictoria.

Los límites correctos serían: 100 unidades cuestan 100; 101 cuestan 102; 200 cuestan 300; 201 cuestan 303.

- **PROPUESTA PENDIENTE:** excepciones para Vitalidad o Espíritu. No introducirlas por semejanza con referentes.
- **IMPLEMENTACIÓN ACTUAL:** se conservan `statsPerLevel`, normalizados a cuatro primarias automáticas y cuatro de vida de clase por nivel para cada clase, además de la vida universal.

#### Contraste reproducible 5/5/5 frente a 5/20/30

El simulador cuenta subidas con `nivel - 1`. Los dos modelos conceden el mismo capital; sólo cambian la vida universal y la capacidad de mochila. Las cifras siguientes no incluyen base de clase, equipo ni puntos libres asignados:

| Nivel | Capital (ambos) | Vida 5/5/5 | Vida 5/20/30 | Briznas 5/5/5 | Briznas 5/20/30 |
|---:|---:|---:|---:|---:|---:|
| 1 | 0 | 0 | 0 | 0 | 0 |
| 10 | 45 | 45 | 180 | 45 | 270 |
| 20 | 95 | 95 | 380 | 95 | 570 |
| 50 | 245 | 245 | 980 | 245 | 1.470 |
| 100 | 495 | 495 | 1.980 | 495 | 2.970 |
| 150 | 745 | 745 | 2.980 | 745 | 4.470 |
| 200 | 995 | 995 | 3.980 | 995 | 5.970 |

Cada clase añade además, en ambos modelos, `+4 maxHealth` y `+1 Vitalidad` por nivel. Como cada Vitalidad aporta `+5 maxHealth`, el crecimiento automático de clase equivale a `+9 vida` por subida. Sin equipo ni capital asignado, la vida total queda así:

| Nivel | Vanguardia 5/5/5 → 5/20/30 | Tejedora 5/5/5 → 5/20/30 | Cazador 5/5/5 → 5/20/30 |
|---:|---:|---:|---:|
| 1 | 130 → 130 | 95 → 95 | 105 → 105 |
| 10 | 256 → 391 | 221 → 356 | 231 → 366 |
| 20 | 396 → 681 | 361 → 646 | 371 → 656 |
| 50 | 816 → 1.551 | 781 → 1.516 | 791 → 1.526 |
| 100 | 1.516 → 3.001 | 1.481 → 2.966 | 1.491 → 2.976 |
| 150 | 2.216 → 4.451 | 2.181 → 4.416 | 2.191 → 4.426 |
| 200 | 2.916 → 5.901 | 2.881 → 5.866 | 2.891 → 5.876 |

Asignar capital a Vitalidad añade la misma vida en ambos modelos porque los dos conservan `+5` de capital y los mismos paliers; por tanto no altera la diferencia entre columnas. Con base productiva de 1.500, la capacidad total pasa de 2.495 a 7.470 Briznas en nivel 200. El simulador de combate V3 no consume pociones, así que no puede medir su gasto: 5/20/30 reduce el riesgo de morir por una misma cantidad de daño, pero vuelve porcentualmente menores las curas fijas y hace que la capacidad pese mucho menos como restricción. Hace falta un lote con consumo de objetos y varias semillas antes de afirmar cuántas pociones ahorra o exige.

**IMPLEMENTADO — 2026-11-10:** la curva productiva es **10 capital / 20 vida / 30 Briznas por nivel**. Las tablas anteriores describen líneas base históricas. Opciones → Desarrollo conserva 5/5/5, 5/20/30 y valores personalizados sólo para construir partidas QA; cada guardado conserva su instantánea y no muta producción.

### Estadísticas y elementos

- **PROPUESTA PENDIENTE:** añadir Agua, renombrar Aire/Tormenta o introducir primarias.
- **PROPUESTA PENDIENTE:** nombres “Fortuna”, “Concentración” y “Prospección”. Requieren una solución original.
- **PROPUESTA PENDIENTE:** Prospección base 200 y su crecimiento.
- **PROPUESTA PENDIENTE:** Intelecto como potencia de curación, Agilidad como placaje/huida y Espíritu como XP/resistencia a controles.
- **PROPUESTA PENDIENTE:** daño fijo universal y su posición en la tubería.
- **PROPUESTA PENDIENTE:** retirar el crítico derivado de Agilidad y las bonificaciones de recurso derivadas de Espíritu.

### Acción y movilidad

- **PROPUESTA PENDIENTE:** `actionUnits` y `mobilityUnits` como fuentes separadas.
- **VALOR EXPERIMENTAL:** bases 6 de acción y 3 de movilidad, con referencias 12/6. No son límites aprobados.
- **VALOR EXPERIMENTAL:** movilidad `v = 6 × (1 + k × (unidades − 3))`, probada con `k=0,05`, `0,08` y `0,12`.
- **VALOR EXPERIMENTAL:** tres modelos de `+1 acción`: sólo capacidad; capacidad+regeneración; capacidad+regeneración+ventana.

Aumentar sólo el recurso máximo mejora la ráfaga, no necesariamente las acciones por minuto. Ninguna equivalencia debe reducir automáticamente todos los enfriamientos.

## 4. Evidencia QA V3

La infraestructura V3 vive en `scripts/balance/v3/` y se ejecuta con:

```text
npm run balance:v3
```

Escribe resultados reproducibles en `work/balance/V3_BASELINE.md` y `.json`, ignorados por Git. No toca `data/rpg/*.json` ni guardados.

### Procedencia

El catálogo une estas rutas implementadas:

- kit inicial de cada clase;
- existencias de mercaderes;
- tablas de botín vinculadas a enemigos que aparecen en territorio o misiones existentes;
- recompensas de misiones;
- pesca;
- recetas cuyos ingredientes tienen una ruta demostrable.

Un objeto puede cumplir el requisito de nivel y seguir marcado como **no verificable** si ninguna ruta implementada lo produce.

Resultado del 2026-11-09:

- 154 objetos examinados;
- 122 con alguna ruta implementada;
- 24 presentes únicamente en contenido territorial planeado;
- 32 sin ruta implementada demostrable, incluidos los anteriores.

### Perfiles

Se generan 756 perfiles de simulación deterministas:

- 3 clases;
- todas las zonas/franjas declaradas más extremos 100/150/200;
- cuatro builds: ofensiva, defensiva, equilibrada y especializada;
- tres estratos: sin equipo, equipo promedio obtenible y optimizado obtenible.

324 corresponden a territorio con `areas`; 432 están rotulados como simulación hipotética. Los hipotéticos prueban estadísticas y combate en campo abierto, no fingen que la zona es jugable.

Los 16 perfiles visuales explícitos permanecen separados. No se reemplazan las 12 ranuras del usuario.

## 5. Línea base y experimentos

### Línea base productiva

La batería V3 usa las fórmulas y datos productivos v2. Por franja canónica ejecuta las tres clases sin equipo, con equipo promedio obtenible y con equipo optimizado obtenible. Registra victoria, TTK, XP/min, vida, recurso/regeneración, velocidad y piezas con su fuente.

La primera pasada usa una semilla común por clase y franja para comparar los tres estratos sin cambiar enemigos. Es línea base reproducible, no una muestra suficiente para aprobar balance.

### Experimentos A–F

- **A — progresión:** línea base implementada 5/5/5 frente al histórico 3/0/0, al destino productivo 10/20/30 y a perfiles alternativos aislados.
- **B — daño:** fórmula actual frente a una variante sin segunda aplicación de la misma primaria.
- **C — acción/movilidad:** tres modelos numéricos por clase y tres pendientes de movilidad.
- **D — XP/control:** bases XP 50/80/120 y duración tras resistencia/repetición.
- **E — Briznas:** capacidad productiva de 1.500 base +5 por nivel frente a dos fórmulas experimentales por nivel/Fuerza.
- **F — ofensiva:** daño fijo universal, Potencia y crítico en una tubería aislada.

Ningún experimento introduce `StatId`, elemento o campo nuevo en producción.

## 6. Migración activa de guardados

El contrato está en [Migración de guardado v1 → v2](propuestas/MIGRACION_GUARDADO_V2.md).
`SaveStore` respalda el JSON v1 exacto, reinicia la asignación y entrega capital libre más unidades
históricas. Después escribe y valida v2; ante fallo restaura v1. La operación es idempotente.

**DIRECTRIZ DEL CREADOR — 2026-11-09:** los guardados y perfiles de prueba pueden recrearse y no deben retrasar RPG V3. Una fase nueva puede romper compatibilidad si mantenerla exige ampliar o debilitar el contrato; en ese caso se incrementa la versión, se rechaza el dato antiguo con un mensaje claro y se regeneran los perfiles QA. No borrar guardados reales durante la preparación ni simular que una migración existe.

## 7. Orden de trabajo siguiente

1. Calibrar salud, daño y número de enemigos por franja sin deshacer el balance relativo de clases.
2. Ejecutar lotes multisemilla y medir consumo/tiempo de obtención por perfil.
3. Probar manualmente las tres clases en Electron y ajustar sensación, no sólo TTK.
4. Crear PNG propios para los seis hechizos nuevos.
5. Completar territorio real antes de presentar 101–200 como jugable.

## 8. Decisiones pendientes

- Contrato original de elementos y primarias nuevas.
- Función definitiva de Agilidad, Intelecto y Espíritu.
- Semántica y nombre original de una estadística de obtención de botín.
- Modelo de acción y movilidad, incluidos topes y buffs.
- Calibración territorial de enemigos desde franjas medias.

## 9. Verificación local

`tests/balance/v3.test.ts` y `tests/balance/zones.test.ts` cubren procedencia, perfiles, equipo legal, paliers 100/101/200/201, variantes aisladas y previsualización v1 sin mutación.

**Estado:** progresión, migración y balance relativo v2 implementados; balance territorial todavía no certificado.
