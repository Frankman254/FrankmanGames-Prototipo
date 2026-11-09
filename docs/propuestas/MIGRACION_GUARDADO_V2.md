# Propuesta — migración de guardado v1 → v2

**Estado:** PROPUESTA PENDIENTE. No hay escritor v2 activo.
**Objetivo:** cambiar progresión, paliers o elementos sin perder personajes ni modificar silenciosamente una ranura válida.

## Invariantes

1. El guardado v1 original permanece intacto hasta que la copia v2 se valide y pueda cargarse.
2. Nivel, XP, nombre, clase, sexo, oro, inventario, banco, equipo, hechizos, barra, mascota, misiones, Pulso, estado espectral, botín pendiente, lugar y oficios se conservan salvo transformación explícita.
3. Cada transformación registra origen, destino, motivo y advertencias.
4. Ningún identificador desconocido se descarta silenciosamente.
5. Fallar la validación devuelve al v1; nunca deja una mezcla de versiones.

## Problema de capital

V1 guarda dos valores distintos:

- `allocated[stat]`: unidades asignadas, hoy compradas 1:1;
- `unspentStatPoints`: capital libre restante.

Si v2 usa paliers, no se puede reinterpretar una unidad histórica como si siempre hubiera costado el precio nuevo sin escoger una política. La previsualización V3 calcula tres cantidades:

- `historicSpent`: suma de unidades v1;
- `tieredEquivalent`: coste que esas unidades tendrían con los paliers candidatos;
- `storedUnspent`: capital libre realmente guardado.

Políticas posibles:

| Política | Resultado | Riesgo |
|---|---|---|
| Preservar unidades | Mantiene la build exacta y sólo conserva el capital libre | Personajes antiguos pueden tener una build que un personaje nuevo no podría pagar |
| Reembolso histórico | Pone las primarias en cero y devuelve `storedUnspent + historicSpent` | Conserva lo ganado, pero obliga a repartir de nuevo y puede reducir unidades |
| Equivalente por paliers | Devuelve lo que costaría recomprar la misma build | Crea capital que el personaje nunca ganó; puede inflar la economía de estadísticas |

**Decisión pendiente:** elegir una política global o una transición excepcional documentada. La infraestructura no selecciona ninguna.

## Elementos, estadísticas y objetos

Antes de crear v2 se necesita una tabla explícita por identificador:

```text
old id → new id | split | refund | legacy-preserved | blocked
```

- Renombrar `storm` a otra familia exige migrar hechizos, armas, afijos, resistencias, sets, estados, enemigos, clima, FX y perfiles.
- Dividir `frost` o añadir Agua no permite inventar el destino de cada objeto automáticamente.
- Un afijo sin destino queda en un bloque `legacy` recuperable y produce advertencia; no se elimina.
- Hechizos conocidos y barra se migran por id estable. Un id retirado se conserva como incidencia hasta decidir compensación.

## Proceso propuesto

1. Leer y validar v1 sin modificarlo.
2. Crear una copia profunda y un registro de migración.
3. Normalizar números corruptos de manera visible; los negativos o no finitos producen advertencia.
4. Aplicar la política aprobada de capital.
5. Aplicar tablas aprobadas de ids.
6. Reconciliar UID de equipo, mochila, banco y botín con la lógica ya existente.
7. Validar esquema v2 y cargarlo en una sesión aislada.
8. Guardar primero una copia de respaldo v1; después escribir v2 de forma atómica.
9. Volver a leer v2 y comparar invariantes.
10. Si cualquier paso falla, conservar v1 como ranura activa y mostrar el diagnóstico.

## Versionado y reversión

- `version: 2` debe tener un tipo propio; no ampliar el literal v1 hasta implementar el lector.
- `migrateSave` debe encadenar `v1 → v2`; nunca interpretar v1 directamente como v2.
- El respaldo debe usar otra clave local y contener hash/fecha/ranura de origen.
- Revertir significa restaurar exactamente el JSON v1 respaldado, no intentar una transformación inversa con pérdidas.
- Una versión futura usaría `v2 → v3`, no una función monolítica desde cualquier versión.

## Casos de prueba obligatorios

- nivel 1 sin puntos;
- niveles 100 y 200 con puntos libres;
- 100/101/200/201 unidades en una primaria;
- build repartida entre las cinco primarias;
- inventario, equipo, banco y botín con UID repetidos;
- afijo elemental renombrado en objeto equipado y en banco;
- hechizo retirado presente en conocidos y barra;
- set parcialmente equipado;
- números negativos, fraccionarios, no finitos o campos ausentes;
- v1 válido que migra y hace roundtrip;
- migración interrumpida antes de escribir, durante validación y después de respaldo.

## Implementación V3 disponible

`scripts/balance/v3/migration.ts` sólo inspecciona una copia v1 y compara las tres políticas de capital. `tests/balance/v3.test.ts` demuestra que no muta el guardado. Activar el escritor queda bloqueado hasta resolver H06, paliers, tabla de elementos y política de capital.
