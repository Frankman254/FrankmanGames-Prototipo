# Migración de guardado v1 → v2

**Estado:** IMPLEMENTADA el 2026-11-09 por autorización expresa del creador.
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

Políticas evaluadas:

| Política | Resultado | Riesgo |
|---|---|---|
| Preservar unidades | Mantiene la build exacta y sólo conserva el capital libre | Personajes antiguos pueden tener una build que un personaje nuevo no podría pagar |
| Reembolso histórico | Pone las primarias en cero y devuelve `storedUnspent + historicSpent` | Conserva lo ganado, pero obliga a repartir de nuevo y puede reducir unidades |
| Equivalente por paliers | Devuelve lo que costaría recomprar la misma build | Crea capital que el personaje nunca ganó; puede inflar la economía de estadísticas |

**Política activa — reembolso histórico:** las primarias asignadas vuelven a cero y se entrega
`storedUnspent + historicSpent`. Conserva exactamente el capital realmente ganado bajo v1, obliga a
repartirlo con los paliers v2 y evita crear capital retroactivo. El guardado registra la política y una
advertencia visible. Leer nuevamente el mismo guardado v2 no vuelve a reembolsar.

## Elementos, estadísticas y objetos

Antes de crear v2 se necesita una tabla explícita por identificador:

```text
old id → new id | split | refund | legacy-preserved | blocked
```

- Renombrar `storm` a otra familia exige migrar hechizos, armas, afijos, resistencias, sets, estados, enemigos, clima, FX y perfiles.
- Dividir `frost` o añadir Agua no permite inventar el destino de cada objeto automáticamente.
- Un afijo sin destino queda en un bloque `legacy` recuperable y produce advertencia; no se elimina.
- Hechizos conocidos y barra se migran por id estable. Un id retirado se conserva como incidencia hasta decidir compensación.

## Proceso implementado

1. Leer y validar v1 sin modificarlo.
2. Crear una copia profunda y un registro de migración.
3. Aplicar el reembolso histórico y añadir el registro de migración.
4. Guardar primero el JSON v1 exacto bajo `frankmangames.backup.v1.<slot>`.
5. Escribir v2, volver a leerlo y validar su esquema.
6. Si la escritura o validación falla, restaurar el JSON v1 como ranura activa.

No se renombraron elementos ni identificadores en esta versión, por lo que no hay una transformación
de objetos o hechizos que pueda perder contenido.

## Versionado y reversión

- `version: 2` tiene contrato propio y el lector reconoce v1 sólo para migrarlo.
- `migrateSave` encadena `v1 → v2`; nunca interpreta v1 directamente como v2.
- El respaldo usa otra clave local y conserva el JSON original exacto.
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

## Implementación disponible

`scripts/balance/v3/migration.ts` conserva la comparación reproducible de políticas.
`SaveStore` ejecuta la migración real y `tests/guardadoPresets.test.ts` comprueba conservación de
nivel/XP, respaldo exacto, capital y repetición idempotente. Los casos elementales futuros siguen
requiriendo una tabla explícita antes de una versión posterior.
