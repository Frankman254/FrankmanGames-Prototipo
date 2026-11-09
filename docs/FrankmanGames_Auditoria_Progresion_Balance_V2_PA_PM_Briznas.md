# FrankmanGames — Auditoría de progresión y balance V3

**Fecha:** 2026-11-09

**Origen:** revisión V2 corregida contra el checkout local de `master`.
**Alcance:** documentación, perfiles QA, simuladores y diseño de migración. No cambia fórmulas, clases, hechizos, elementos, inventario, interfaz normal ni guardados.

## 1. Cómo leer este documento

Cada afirmación normativa lleva una categoría:

- **DECISIÓN CONFIRMADA:** respaldada por `DEC-*` vigente o una respuesta explícita del creador ya registrada como decisión activa.
- **IMPLEMENTACIÓN ACTUAL:** comportamiento demostrado en código y pruebas locales; no implica aprobación definitiva de balance.
- **PROBLEMA COMPROBADO:** defecto o limitación reproducible con ruta y prueba.
- **PROPUESTA PENDIENTE:** diseño discutido que no debe llegar a producción sin decisión.
- **VALOR EXPERIMENTAL:** cifra usada sólo por simuladores sobre copias en memoria.

Las propuestas no se convierten en decisiones por aparecer aquí. `H06` permanece pendiente.

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
- **IMPLEMENTACIÓN ACTUAL:** cada subida concede `3` puntos libres y aplica `statsPerLevel` propios de la clase.
- **IMPLEMENTACIÓN ACTUAL:** Agilidad aporta `0,004` de crítico por punto; Espíritu aporta recurso máximo y regeneración; Vitalidad aporta vida.
- **IMPLEMENTACIÓN ACTUAL:** Físico/Tierra usan Fuerza; Tormenta usa Agilidad; Fuego/Hielo usan Intelecto.
- **IMPLEMENTACIÓN ACTUAL:** el daño aplica `base + scaling × mainStat`, después primaria elemental, Potencia y afinidad; luego daño plano elemental, crítico y resistencia.
- **IMPLEMENTACIÓN ACTUAL:** Pulso, vida y recurso de clase son tres conceptos diferentes.
- **IMPLEMENTACIÓN ACTUAL:** la mochila tiene capacidad fija `1500`; `defaultItemWeight=1000`, aunque la mayoría de objetos declara un peso explícito mucho menor.
- **IMPLEMENTACIÓN ACTUAL:** hay 12 ranuras normales y un selector separado de partidas de desarrollo. La previsualización ya muestra `Requiere nivel N`.
- **IMPLEMENTACIÓN ACTUAL:** existen 16 perfiles visuales explícitos. Ocho usan sólo objetos demostrablemente obtenibles; ocho incluyen bonificaciones artificiales y son estrés experimental.

### Problemas comprobados

1. **PROBLEMA COMPROBADO — procedencia:** `scripts/balance/scenarios.ts::makeSessionAt` entrega todos los objetos cuyo nivel encaja, sin comprobar botín, tiendas, recetas, misiones o zona.
2. **PROBLEMA COMPROBADO — doble escalado:** cuando `mainStat` coincide con la primaria elemental, la misma característica suma en la base y vuelve a multiplicar el golpe. Con base 20, `scaling=0,6`, afinidad 10 y 100 puntos, la muestra experimental da 168 frente a 88 sin la segunda aplicación.
3. **PROBLEMA COMPROBADO — progresión incompatible:** `statPointsPerLevel=3`, los bonos automáticos de clase y `configInicial` conviven, pero `configInicial` no se parsea ni se aplica.
4. **PROBLEMA COMPROBADO — reinicio futuro:** `spendStatPoint` gasta una unidad y `resetStatPoints` devuelve unidades. Es correcto hoy, pero no preservaría capital si se aprobaran paliers.
5. **PROBLEMA COMPROBADO — cobertura:** no hay territorio completo para niveles 101–200. Varias franjas 10–100 tienen monstruos y datos, pero algunas zonas canónicas no tienen `areas`.
6. **PROBLEMA COMPROBADO — balance alto:** en la línea base determinista, la mayoría de grupos de nivel 30 o más derrota a las tres clases incluso con equipo obtenible optimizado. Es evidencia inicial, no calibración definitiva.

## 3. Contratos que siguen pendientes

### Progresión por nivel

- **PROPUESTA PENDIENTE (H06):** cuántos puntos, vida y capacidad se ganan por nivel.
- **PROPUESTA PENDIENTE:** `+5 Vida`, `+5 Briznas` y `+5 capital`. No está aprobado.
- **PROPUESTA PENDIENTE:** los valores antiguos de `configInicial`: `+5 característica`, `+20 vida`, `+30 capacidad`. Tampoco están aprobados ni implementados.
- **PROPUESTA PENDIENTE:** costes uniformes por tramos de 100: `costeSiguiente(asignados) = 1 + floor(asignados / 100)`.

Los límites correctos serían: 100 unidades cuestan 100; 101 cuestan 102; 200 cuestan 300; 201 cuestan 303.

- **PROPUESTA PENDIENTE:** excepciones para Vitalidad o Espíritu. No introducirlas por semejanza con referentes.
- **PROPUESTA PENDIENTE:** conservar o retirar `statsPerLevel` al definir la progresión base. No apilar reglas nuevas sin medir la suma.

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

La batería V3 usa fórmulas y datos actuales sin corregirlos. Por franja canónica ejecuta las tres clases sin equipo, con equipo promedio obtenible y con equipo optimizado obtenible. Registra victoria, TTK, XP/min, vida, recurso/regeneración, velocidad y piezas con su fuente.

La primera pasada usa una semilla común por clase y franja para comparar los tres estratos sin cambiar enemigos. Es línea base reproducible, no una muestra suficiente para aprobar balance.

### Experimentos A–F

- **A — progresión:** actual 3/0/0 frente a 5/5/5 y valores históricos de H06.
- **B — daño:** fórmula actual frente a una variante sin segunda aplicación de la misma primaria.
- **C — acción/movilidad:** tres modelos numéricos por clase y tres pendientes de movilidad.
- **D — XP/control:** bases XP 50/80/120 y duración tras resistencia/repetición.
- **E — Briznas:** capacidad fija actual frente a dos fórmulas por nivel/Fuerza.
- **F — ofensiva:** daño fijo universal, Potencia y crítico en una tubería aislada.

Ningún experimento introduce `StatId`, elemento o campo nuevo en producción.

## 6. Migración futura de guardados

La propuesta formal está en [Migración de guardado v1 → v2](propuestas/MIGRACION_GUARDADO_V2.md).

La infraestructura sólo previsualiza copias v1. Conserva por separado unidades históricas, capital libre almacenado, capital gastado 1:1 y coste equivalente por paliers. No existe escritor v2 ni se modifica `SaveStore`.

## 7. Orden seguro futuro

1. Registrar las decisiones de progresión y estadísticas en el documento canónico.
2. Elegir una política de migración de capital y elementos.
3. Crear versión 2 con respaldo y validación antes de tocar fórmulas.
4. Migrar contratos, datos, interfaz falsa, perfiles y pruebas juntos.
5. Ejecutar lotes grandes y partidas humanas antes de cambiar balance real.

## 8. Decisiones pendientes

- H06: puntos, vida y capacidad por nivel.
- Mantener, sustituir o reducir `statsPerLevel`.
- Paliers uniformes o excepciones.
- Política exacta ante el doble escalado.
- Contrato original de elementos y primarias nuevas.
- Función definitiva de Agilidad, Intelecto y Espíritu.
- Semántica y nombre original de una estadística de obtención de botín.
- Modelo de acción y movilidad, incluidos topes y buffs.
- Política de migración para capital ya invertido.

## 9. Verificación local

`tests/balance/v3.test.ts` y `tests/balance/zones.test.ts` cubren procedencia, perfiles, equipo legal, paliers 100/101/200/201, variantes aisladas y previsualización v1 sin mutación.

**Estado:** evidencia construida; ninguna mecánica productiva aprobada o alterada por esta auditoría.
