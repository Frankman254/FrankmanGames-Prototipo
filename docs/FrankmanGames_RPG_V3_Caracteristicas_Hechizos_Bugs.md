# FrankmanGames — RPG V3: contrato maestro de características, críticos y hechizos multielementales

**Estado:** especificación de corrección y encargo técnico, revisada el 10-11-2026. **No se ha aplicado ningún cambio al repositorio ni ejecutado tests en el equipo del creador.**  
**Referencia comprobada:** `Frankman254/FrankmanGames-Prototipo`, rama `master`, HEAD consultado `f73ab8502633b93df284303239012eb659044b34`. **Claude debe volver a comprobar el HEAD y los cambios locales antes de trabajar.**  
**Fuente de decisiones:** respuestas actuales del creador y `docs/ACCIONES_CREADOR.md` / `docs/TAREAS.md`; el adjunto «Markdown pegado(5).md» es respaldo de contexto, no sustituto de la versión local más reciente.

## 0. Resumen ejecutivo — qué corregir sin reinterpretar

El jugador ha confirmado:

1. **Vitalidad cuesta siempre 1 punto de capital por +1 Vitalidad**, independientemente del tramo de inversión.
2. **Espíritu cuesta siempre 2 puntos de capital por +1 Espíritu**, independientemente del tramo de inversión.
3. **Las otras cinco primarias** conservan tramos de 100 puntos **naturales comprados**: 1:1, después 2:1, 3:1, etc. El coste nunca depende del equipamiento, del nivel ni de los puntos automáticos de clase.
4. El bonus **global** de probabilidad de crítico es **0 % sin equipamiento, sets ni estados**. Agilidad no concede críticos. Tampoco la clase aporta `critChance` base. Cada hechizo dañino tiene su **probabilidad base individual** (seleccionada y balanceada por hechizo, normalmente entre 5 % y 30 %), más bonos globales de equipo/sets/buffs. Los hechizos sin componente de daño pueden mantener 0 % si no aplica crítico a su efecto.
5. Existe intención de que **Agilidad aumente Aire**. Tormenta **no debe presentarse automáticamente como sinónimo de Aire** sin decisión de diseño explícita. Es recomendable modelar «Tormenta» como *escuela/tema* de hechizos con líneas Aire y, según cada hechizo, Agua; alternativa: mantenerlo como un séptimo elemento real con contrato propio. No migrar a ciegas.
6. Un hechizo puede generar **dos o más líneas de daño**, cada una con su propio elemento, base y escalado: por ejemplo, un hechizo temático de tormenta podría causar Aire + Agua en un solo lanzamiento.
7. Debe existir un **JSON maestro declarativo y validado** que explique características, efectos, costes, elementos, relación con hechizos y compatibilidad con el resto del juego; no añadir otra copia de valores productivos que contradiga `progression.json` o `spells.json`.
8. El producto actual usa **+10 capital, +20 vida máxima base y +30 Briznas de capacidad por nivel ganado** (`C06`, 2026-11-10). Los perfiles de desarrollo pueden probar otras cifras; no sustituir la configuración productiva.
9. Nivel 1 **sin objetos equipados ni puntos primarios base**; debe poder combatir con hechizos iniciales. La intención actual es que los puntos primarios sean elecciones del jugador y bonificaciones de equipo, no ganancias automáticas ocultas que invaliden su elección. Auditar y retirar/migrar `statsPerLevel` de clase si confirma esa contradicción en el checkout actual, **incluyendo** el +4 vida automática de clase para que el +20 productivo sea la única subida de vida base por nivel (Vitalidad/objetos se suman aparte).
10. Mantener las demás directrices ya ratificadas: Briznas +5 por punto efectivo de Fuerza: instrucción expresa del creador; implementar si todavía no existe; potencia y daños fijos universales son sistemas distintos; resistencia elemental no es armadura numérica; no copiar archivos/assets de juegos de referencia.

## 1. Diagnóstico reproducible de la captura de nivel 45

**Captura:** personaje QA `barus:mangrove_hunter:balanced:optimized-obtainable`, Cazador del Manglar, nivel 45. El nombre del perfil no confirma por sí solo si hay o no equipo activo; hay que inspeccionar el desglose de estadísticas, slots de equipo y buffs antes de atribuir todos los números a una fuente.

| Vista | Valor | Explicación exacta con el `master` consultado |
|---|---:|---|
| Puntos libres | 440 | 44 subidas × `statPointsPerLevel: 10` |
| Agilidad | 88 | `statsPerLevel.agility: 2` × 44 |
| Fuerza | 44 | `statsPerLevel.strength: 1` × 44 |
| Vitalidad | 44 | `statsPerLevel.vitality: 1` × 44 |
| Vida máxima | 1346 | 70 base de clase + (44 × 20) + (44 × 4 de `statsPerLevel.maxHealth`) + (44 × 5 de Vitalidad) = 1346 |
| Crítico global | 11,28 % → 11,3 % | 6 % de `classes.json` + 88 × 0,06 puntos porcentuales por Agilidad |
| Recurso | 100 y +2,5/s | `mangrove_hunter.resource`, sin Espíritu añadido |
| «Capacidad de Briznas» | 0 | La UI muestra **solo la bonificación `carryCapacity`**, no el límite total de mochila. El límite calculado sin otros bonos sería 1500 + 44 × 30 = **2820 Briznas** |
| Velocidad | 16 m/s | `moveSpeed` base de clase es 6 m/s: investigar la fuente del +10 (posible montura/dev), no inferirla por la captura. La velocidad no debe venir de Agilidad automáticamente. |

**Conclusión:** los números no son un fallo de aritmética; **sí revelan contradicciones con el modelo de características que el creador espera**. Mostrar `carryCapacity` como capacidad total es engañoso. La hoja debería mostrar total, usado y disponible, con desglose de bono base/nivel/Fuerza/equipo.

## 2. Tabla maestra de características (intención de diseño)

| Primaria | ID actual | Elementos/función | Coste de capital al invertir +1 | Fuente de la bonificación | Estado |
|---|---|---|---|---|---|
| Fuerza | `strength` | Físico y Tierra; Briznas: +5 por punto efectivo de Fuerza | Paliers por 100 | Puntos elegidos, equipo, sets, buffs | Elementos existentes; Briznas por Fuerza solicitado por el creador; verificar implementación |
| Agilidad | `agility` | **Aire**, placaje/huida; NO críticos, NO velocidad gratuita | Paliers por 100 | Puntos elegidos, equipo, sets, buffs | Hoy mapea Tormenta; migración pendiente |
| Intelecto | `intellect` | Fuego y curación | Paliers por 100 | Puntos elegidos, equipo, sets, buffs | Fuego actual; curación pendiente de uniformar |
| Calma | `calm` | Hielo | Paliers por 100 | Puntos elegidos, equipo, sets, buffs | Existente |
| Caudal | `flow` | Agua | Paliers por 100 | Puntos elegidos, equipo, sets, buffs | Existente |
| Vitalidad | `vitality` | Vida máxima según derivación configurada | **Fijo: 1 punto** | Puntos elegidos, equipo, sets, buffs | **Nueva decisión expresa** |
| Espíritu | `spirit` | XP y resistencia a controles: fórmula por definir y medir | **Fijo: 2 puntos** | Puntos elegidos, equipo, sets, buffs | **Nueva decisión expresa**; hoy modifica recurso máximo/regeneración |

**Diferencia esencial:** `+20 HP por nivel` es una progresión base del personaje; `+5 HP por punto efectivo de Vitalidad` es un efecto de característica. No son costes de inversión, y no deben contarse dos veces a través de `statsPerLevel`.

### Ejemplos de costes y reembolso

| Estadística | De 0 a 1 | De 99 a 100 | De 100 a 101 | De 200 a 201 | Capital para comprar 200 unidades |
|---|---:|---:|---:|---:|---:|
| Fuerza, Agilidad, Intelecto, Calma, Caudal | 1 | 1 | 2 | 3 | 300 |
| **Vitalidad** | **1** | **1** | **1** | **1** | **200** |
| **Espíritu** | **2** | **2** | **2** | **2** | **400** |

- El capital **comprado** se registra en `allocated`; el total mostrado incluye por separado equipo, buffs, etc. El precio del próximo punto se obtiene del capital natural asignado a ESA característica.
- `Cantidad` significa presupuesto de capital a gastar, NO cantidad garantizada de niveles de característica. Mejorar la etiqueta y mostrar unidades que podrá comprar a ese coste.
- `Todo` gasta todo el presupuesto posible en la característica elegida, preserva remanentes insuficientes para el próximo punto y no entra en bucle.
- `resetStatPoints()` reembolsa **exactamente el capital gastado según la regla de coste vigente y el historial/migración correspondiente**. En guardados previos a la nueva regla, no recrear ni regalar capital de forma silenciosa; exigir migración explícita o cálculo de conversión probado.
- La pantalla de confirmación debe decir el **capital devuelto**, no el número de unidades asignadas.

## 3. JSON maestro de reglas y asociaciones de hechizos

**Objetivo:** añadir `data/rpg/characteristics.json` (nombre propuesto; verificar existencia antes) como catálogo de semántica de características y elementos que el motor valide y consuma. Evitar tres mapas separados y desincronizados entre contrato TS, progreso y UI.

Requisitos:

- IDs estables en inglés, nombre/descripcion visibles en español y color/icono validados.
- `pointCost` por primaria (`tiered` con `tierSize=100`, `fixed` con `cost=1` o `2`).
- Las reglas `derived` describen explícitamente el destino (`maxHealth`, `carryCapacity`, `xpMultiplier`, `slowResist`, etc.), unidad, fórmula y topes. **Si un destino no existe todavía, implementar y validar el contrato completo, no añadir claves decorativas.**
- Cada elemento declara su atributo de escalado y una convención de presentación. Una escuela temática (`storm`) puede ser distinta de un elemento de daño (`air`, `water`), si el creador ratifica esa opción.
- `associatedSpells` debe ser una asociación **generada y verificada** a partir de los `effects` de `data/rpg/spells.json`, con referencia de IDs, no una segunda copia editable de rangos de daño/crit. Si se materializa en el JSON, el validador debe detectar divergencias y regenerarla de manera explícita.
- Los costes de críticos, números de vida/capacidad por nivel y estadísticas de hechizos conservan una fuente de verdad: la maestra las referencia o las absorbe mediante una migración total, **nunca se contradicen con** `data/rpg/progression.json` y `data/rpg/spells.json`.
- Compatibilidad y auditoría para `src/rpg/contracts.ts`, `content.ts`, `stats.ts`, `character.ts`, `statCapital.ts`, `damage.ts`, `world.ts`, `effects.ts`, `spells.ts`, inventario/equipos, zonas, clima, simuladores, interfaz y saves.

### Ejemplo parcial de la estructura pretendida (NO archivo productivo)

```json
{
  "schemaVersion": 1,
  "primaryStats": {
    "vitality": {
      "label": "Vitalidad",
      "pointCost": { "type": "fixed", "cost": 1 },
      "affects": ["maxHealth"],
      "associatedSpells": []
    },
    "spirit": {
      "label": "Espíritu",
      "pointCost": { "type": "fixed", "cost": 2 },
      "affects": ["xpMultiplier", "slowResist"],
      "associatedSpells": []
    },
    "agility": {
      "label": "Agilidad",
      "pointCost": { "type": "tiered", "tierSize": 100, "baseCost": 1, "increment": 1 },
      "affects": ["damage.air", "tackle", "escape"],
      "associatedSpells": ["AUTO_GENERATED_FROM_SPELL_EFFECTS"]
    }
  },
  "associatedSpellsSource": "data/rpg/spells.json"
}
```

`AUTO_GENERATED_FROM_SPELL_EFFECTS` es un marcador **ilustrativo**, no un ID válido que deba persistir en producción. La migración de fuente maestra requiere esquema real validado y tests de consistencia.

## 4. Críticos: cero global sin equipo; base propio por hechizo

### Contrato deseado

- `critBonusGlobal` = suma de **bonos a probabilidad** aportados por equipables, sets, mascotas y buffs si se autorizan; por defecto `0`.
- **Quitar** `baseStats.critChance` de las tres clases y la regla `agility → critChance` de `progression.json`; no sustituir con otra fuente escondida.
- Cada hechizo dañino tendrá `critChance` base explícito y balanceado, típicamente **5 %, 10 %, 15 %, 20 %, 25 % o 30 %** según diseño. Un hechizo sin daño no necesita crítico por inercia.
- `PcritEfectiva = clamp(PcritHechizo + PcritGlobal, 0, 1)` para cada lanzamiento; ambos valores se guardan 0..1 internamente y se muestran al usuario como puntos porcentuales enteros/decimales (por ejemplo `+1 %` = `0.01`, **no** `+1.0`).
- `critBonus` actual representa **magnitud del daño crítico**, otra estadística distinta de la probabilidad de crítico. No confundir `critChance` con `critBonus`; revisar el `0.5` de base de clase y su relación con el `critBonus` propio del hechizo antes de cambiarlo.
- La hoja de personaje debe decir **«Bonificación global de críticos»**, y mostrar **0 %** sin bonos. El tooltip de cada hechizo debe decir «Crítico base N % · Bono equipamiento M % · Total N+M %».
- Una probabilidad resultante superior al 100 % o inferior al 0 % se recorta de forma **idéntica** en ejecución y vista previa; ahora `resolveHit` no hace el mismo clamp explícito que `previewHit`.

### Casos mínimos

1. Cazador nivel 45, Agilidad 88, sin equipo: **0 % global**, sin dependencia de Agilidad (si temporalmente se conserva la subida automática de clase).
2. Cazador nivel 45, Agilidad 0, sin equipo: **0 % global**.
3. Hechizo 5 % sin bono: **5 %**.
4. Hechizo 10 % con +5 puntos porcentuales de equipo: **15 %**.
5. Hechizo 30 % con +20 puntos porcentuales de equipo: **50 %**.
6. Buff temporal de probabilidad: cambia solo mientras está activo; la probabilidad del hechizo refleja el valor.
7. Desmontar equipo restablece el valor y todos los previews inmediatamente.

## 5. Hechizos con múltiples líneas de daño de diferentes elementos

**Hallazgo:** el sistema actual YA admite arrays `effects[]` con múltiples entradas `{type:"damage"}`. `World.execute()` las recorre y `previewDamage()` suma sus daños. **No reescribir el motor desde cero.** Faltan integración consistente y reglas sobre crítico, proc, previsualización y presentación.

### Ejemplo ilustrativo — hechizo de tema «Tormenta» con dos líneas

```json
{
  "id": "ejemplo_tormenta_dual",
  "theme": "storm",
  "critChance": 0.10,
  "effects": [
    { "type": "damage", "element": "air", "min": 8, "max": 12, "scaling": 0.4 },
    { "type": "damage", "element": "water", "min": 5, "max": 8, "scaling": 0.25 }
  ]
}
```

Este es un **fragmento de diseño**, no cumple por sí solo el `SpellDef` actual y **`air` no está aún en `ELEMENTS`**. La implementación debe decidir si Tormenta deja de ser elemento de daño para convertirse en temática/escuela o si permanece como séptimo elemento real con su regla de escalado. Documentar migración de los hechizos, ítems, enemigos, estados, clima, partículas, UI, tests y guardados si se cambia el ID `storm`.

### Semántica recomendada para revisión del creador

- **Un lanzamiento = un coste y un enfriamiento**, aunque tenga 2–3 líneas.
- Cada línea conserva elemento, base, escalado, resistencias y daño plano de ese elemento.
- **Un solo lanzamiento crítico compartido** entre líneas es la recomendación inicial (coherencia con «probabilidad base del hechizo» y con el tooltip). Hoy cada `DamageEffect` llama por separado a `resolveHit`, por lo que cada línea puede tirar crítico independientemente; modificar solo tras diseñar el contrato y probarlo.
- Los efectos de estado y los procs `onHit` deben especificar si se aplican **por lanzamiento**, **por objetivo** o **por línea**. Evitar que un hechizo de tres líneas multiplique accidentalmente el número de activaciones.
- Respeto a resistencias por elemento, absorciones, reflect, counter, friendly fire, rango, hitboxes, proyectiles y daño mínimo. No compensar todo usando `spell.element` si las líneas tienen elementos distintos.
- `World.ability()` hoy usa `s.effects.find(DamageEffect)` y muestra **solo la primera línea** en el resumen/HUD. `previewDamage()` sí suma todas las líneas; unificar UI y predicción con una estructura explícita por líneas y un total coherente.
- `scripts/balance/v3/report.ts` y otros auditores también suelen usar `.find(effect.type === 'damage')`, por lo que reportarían únicamente la primera línea. Actualizarlos.
- Pruebas deterministas: daño por línea vs resistencia independiente, crítico compartido, probabilidades, preview real, total exacto, escalado de rango, estados, física, consumos y regresión de hechizos monoelementales.

## 6. Otros defectos que se deben corregir en esta entrega

1. **Clase → `statsPerLevel` automático:** documentar y eliminar/migrar únicamente con plan que preserve la regla productiva +10/+20/+30, paliers y saves. Un personaje QA de nivel alto sin puntos repartidos ni equipo debe tener características naturales en cero. Si un build de QA requiere 88 Agilidad, esos 88 deben estar trazados como inversión o equipo, no como bonus oculto de clase.
2. **Vitalidad** fijo 1 y **Espíritu** fijo 2: adaptar `src/rpg/statCapital.ts`, `Character.spendStatPoint`, `spendStatPoints`, `resetStatPoints`, UI, simuladores, `allocatedStatCapital`, fixtures y migración de capital.
3. **Capacidad de mochila**: distinguir `maxWeight` real de `carryCapacity` (bonificación); no mostrar `0` como si capacidad total fuera 0. Añadir desglose de 1500 base + 30 por subida + Fuerza/equipo/buffs, cuando correspondan.
4. **Stats derivados**: verificar la coherencia de Espíritu (hoy más recurso y regen), Intelecto/curaciones, Agilidad/Aire/placaje, Fuerza/Briznas, Calma/Hielo, Caudal/Agua, sin implantar tasas nuevas de XP/controles sin medir y aprobar.
5. **Pantalla y tooltips**: las etiquetas deben declarar el efecto real, no el histórico; mostrar procedencia por categoría (`class`, `level`, `points`, `item`, `set`, `pet`, `status`, `derived`).
6. **Críticos**: remover origen de clase y Agilidad, comprobar todos los equipables/sets y hechizos, no alterar la estadística diferente de daño crítico por accidente.
7. **QA aislado**: comparar jugador de clase/nivel X recién creado, sin equipo y sin puntos, contra las builds optimizadas obtenibles; no validar la configuración zero-equipment usando un perfil `optimized-obtainable` sin comprobar primero sus slots.
8. **Migración saves**: el contrato actual tiene saves v2; si cambian bases y costos, considerar versionado y reembolso correcto. Conservar backup y evidencia, nunca modificar silenciosamente el original.
9. **No crear «Armadura» numérica** ni asociar Agilidad con velocidad gratuita; monturas de desarrollo pueden tener velocidades anómalas y requieren otra auditoría.

## 7. Plan de ejecución quirúrgica para Claude y trabajadores

### Paso 0 — Descubrir estado
- `git status --short --branch`, HEAD, diferencias locales, conflictos con otros agentes y documentos canónicos.
- Respetar cambios sin commit. Nunca `git reset --hard`, `git clean` ni hacer checkout sobre trabajo ajeno.

### Paso 1 — Triage delegado
- Delegar al Qwen Windows una inspección **solo lectura** de costes/guardados/UI, con rutas y líneas.
- Delegar un segundo trabajo independiente de inspección de `spells.json`, `effects.ts`, `damage.ts`, `world.ts`, HUD/preview y tests.
- Usar Skynet únicamente con arquitectura abstracta, sin enviar código privado.
- Claude compara y valida conclusiones contra el código, no acepta recomendaciones contradictorias.

### Paso 2 — Congelar contrato y pruebas
- Crear tests de caracterización del comportamiento actual (para entender regresiones), luego tests de aceptación según este documento.
- Diseñar JSON maestro con tipos, parser, validaciones y referencias a hechizos. Evitar módulos alternativos de estadística.
- Confirmar la decisión sobre **Tormenta vs Aire** antes de cambiar IDs de daño o migrar datos.

### Paso 3 — Corregir bug crítico y costes (alcance seguro)
- Quitar `critChance` base de clase y regla de Agilidad.
- Introducir costos específicos por característica desde JSON validado, preservar paliers de las demás y reembolso exacto.
- Arreglar textos/visuales engañosos y pruebas.

### Paso 4 — Integrar maestro y daños multilínea
- Reutilizar `effects[]`, añadir indexado de hechizos por característica y por línea.
- Ajustar preview, HUD, tooltips, simuladores y crítico por lanzamiento solo si quedó aprobado.
- Mantener compatibilidad con los hechizos existentes.

### Paso 5 — QA y entrega jugable
- Correr typecheck, tests focalizados, suite completa, build y QA Electron.
- Demostrar en la ventana de personaje crítico 0 % sin equipo y costes de Vitalidad/Espíritu, y en un hechizo de prueba dos líneas independientes de elementos.
- Comparar línea base antes/después, anotar número de tests y casos fallidos.
- Documentar decisiones reales, pendientes, archivos alterados, cambios migratorios y estado final del checkout.

**Condición de cierre:** Un jugador nuevo puede repartir características con costes correctos y sin bonificaciones ocultas no aprobadas; la hoja muestra procedencias y capacidades reales; el crítico base lo define el hechizo y los equipos sólo lo aumentan; un hechizo multielemental puede golpear con dos resistencias distintas y verse correctamente en UI, simulación y combate. Nada de esto puede romper sesiones/guardados existentes.

## 8. Referencias del código verificado

- [RPG contratos](https://github.com/Frankman254/FrankmanGames-Prototipo/blob/master/src/rpg/contracts.ts)
- [Reglas de progresión](https://github.com/Frankman254/FrankmanGames-Prototipo/blob/master/data/rpg/progression.json)
- [Clases](https://github.com/Frankman254/FrankmanGames-Prototipo/blob/master/data/rpg/classes.json)
- [Cálculo de capital](https://github.com/Frankman254/FrankmanGames-Prototipo/blob/master/src/rpg/statCapital.ts)
- [Personaje](https://github.com/Frankman254/FrankmanGames-Prototipo/blob/master/src/rpg/character.ts)
- [Reglas de daño](https://github.com/Frankman254/FrankmanGames-Prototipo/blob/master/src/sim/damage.ts)
- [Comandos de hechizo y previews](https://github.com/Frankman254/FrankmanGames-Prototipo/blob/master/src/sim/world.ts)
- [Efectos de hechizos](https://github.com/Frankman254/FrankmanGames-Prototipo/blob/master/src/rpg/effects.ts)
- [Datos de hechizos](https://github.com/Frankman254/FrankmanGames-Prototipo/blob/master/data/rpg/spells.json)
- [Hoja de personaje](https://github.com/Frankman254/FrankmanGames-Prototipo/blob/master/src/ui/menus/character.ts)
- [Tareas del creador](https://github.com/Frankman254/FrankmanGames-Prototipo/blob/master/docs/TAREAS.md)
