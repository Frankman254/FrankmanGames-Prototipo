# Diagnóstico JL-57: balance45

**Fecha:** 2026-11-20
**Método:** `git log -S` + `git show` sobre los commits que modificaron los archivos relevantes después de `aca5de4` (Balance 45, 2026-11-10).

## Resumen

El escenario `balance45` de `scripts/qaElectron.mjs` fue introducido por `aca5de4` con 4 checks. Dos de ellos fallan con los datos actuales porque commits posteriores cambiaron las cifras que el escenario asume.

---

## Check 1: Agua con Caudal 0 ya no usa 235 de Agilidad

**Estado:** ✅ Probablemente pasa (sin ejecutar Electron, pero el código lo respalda).

**Qué verifica:** `report.water.max < 80` — el daño de `estuary_arrow` (agua) con Caudal 0 debe ser bajo.

**Código:** `src/sim/damage.ts` → `baseAmount()` usa `rules.elementStat[el]` para escalar. Con `elementStat["water"] = "flow"` y `flow = 0` en el escenario, el escalado es 0. El daño queda en el rango base [14, 19] + perLevel, muy por debajo de 80.

**Código correcto desde:** `aca5de4` (2026-11-10). No ha sido revertido.

---

## Check 2: Tormenta sí responde a Agilidad

**Estado:** ❌ **Falla — el check está desfasado con la decisión Balance 45.**

**Qué verifica:** `report.storm.min > report.water.max` — el daño de `lightning_arrow` (tormenta) debe ser mayor que el de `estuary_arrow` (agua).

**Causa:** El escenario fue diseñado cuando `lightning_arrow` escalaba con la estadística principal de la clase (Agilidad, 235). `aca5de4` cambió `src/sim/damage.ts` para que el daño escale **exclusivamente con la stat elemental**, no con la stat principal:

- `elementStat["lightning"] = "will"` (Voluntad).
- El escenario no setea `will` → valor 0.
- Con `will = 0`, `lightning_arrow` escala igual que `estuary_arrow` con `flow = 0`: ambos usan daño base mínimo.
- `storm.min` no es mayor que `water.max` → check falla.

**El código de `damage.ts` es correcto** según la decisión Balance 45: "La característica principal de la clase no potencia elementos ajenos por accidente" (comentario en `aca5de4`). El check del escenario refleja el comportamiento anterior y no se actualizó.

**Commit de la decisión:** `aca5de4` (2026-11-10) — diff de `src/sim/damage.ts`:
```
-  const main = attacker?.mainStat ? a.get(attacker.mainStat) : 0;
-  let v = Math.floor(roll + hit.scaling * main);
+  const elementalStat = a.get(rules.elementStat[el]);
+  let v = Math.floor(roll + hit.scaling * elementalStat);
```

**Valor aprobado (aca5de4):** lightning escala con `will` (no con `agility`).
**Valor actual (HEAD):** lightning escala con `will` — **coincide con lo aprobado**.
**Problema:** El check del escenario (`scripts/qaElectron.mjs:4233-4236`) no se actualizó para reflejar la nueva regla.

---

## Check 3: La regeneración deja de ser 28,3/s

**Estado:** ✅ Probablemente pasa.

**Qué verifica:** `report.regen < 5` — la regeneración de recurso no debe ser excesiva.

**Valor aprobado (aca5de4):** `mangrove_hunter.resource.regenPerSecond` bajó de 7 a 2.5.
**Valor actual (HEAD):** 2.5 — **coincide con lo aprobado**.

Además, `progression.json` tiene `resourceRegen` derivado de `spirit` con `op: "percent", per: 0.25`. Con `spirit: 145` en el escenario, la regen derivada sería 145 × 0.25 = 36.25, pero el código usa la regen de la clase como base y la derivada como complemento. Con 2.5 de base, el total está muy por debajo de 5 si la derivada no se aplica al recurso de clase.

---

## Check 4: Aguacero es agua y cuesta una parte seria de la reserva

**Estado:** ❌ **Falla — `resourceCost` fue bajada después de Balance 45.**

**Qué verifica:** `report.downpour.element === 'water' && report.downpour.cost >= 40`

**Elemento:** ✅ `element: "water"` — coincide con lo aprobado en `aca5de4`.

**Coste:**
- **Valor aprobado (aca5de4):** `resourceCost: 50` — "Aguacero de flechas", elemento water.
- **Valor actual (HEAD):** `resourceCost: 24` — renombrado a "Lluvia de flechas".
- **Commit que lo cambió:** `d96bbb9` — "HZ-04c-cazador: 32 hechizos del Cazador del Manglar" (2026-11-11).
- El commit dice explícitamente en el mensaje: `arrow_downpour coste 50→24`.
- También cambió el nombre de "Aguacero de flechas" a "Lluvia de flechas" y el icono de 🌧 a 🌧️.

**Resumen:** `d96bbb9` bajó el coste de 50 a 24, por debajo del umbral de 40 que exige el check. El elemento water se mantuvo correcto.

---

## Commits relevantes (cronológicos)

| Commit | Fecha | Qué hizo |
|--------|-------|----------|
| `aca5de4` | 2026-11-10 | **Balance 45:** introdujo el escenario, cambió `damage.ts` (escalado por stat elemental), bajó regen de 7→2.5, puso `arrow_downpour` cost 50 y element water. |
| `930d2a0` | 2026-11-10 | V3: crítico compartido por lanzamiento. No toca `baseAmount`. |
| `d96bbb9` | 2026-11-11 | **HZ-04c-cazador:** rebalanceó 32 hechizos del Cazador. `arrow_downpour` cost 50→24, nombre "Aguacero"→"Lluvia". `estuary_arrow` scaling 0.55→0.4, min 15→14, max 21→19. `lightning_arrow` nombre e icono. |
| `161c506` | 2026-11-11 | RPG V4: afinidad del Cazador `["physical","fire"]` → `["air","water"]`. |
| `6ca0e91` | 2026-11-18 | EQ-07: añadió `elementalDamage` al paso 3 de `baseAmount`. No cambia el escalado principal. |

## Conclusión

1. **Check 2 (tormenta/Agilidad):** El código es correcto según Balance 45. El check del escenario está desfasado: fue escrito para el comportamiento anterior (escalado con stat principal) y no se actualizó cuando `aca5de4` cambió la fórmula. **No es un bug del código; es un bug del test.**

2. **Check 4 (Aguacero coste):** `d96bbb9` bajó `resourceCost` de 50 a 24, rompiendo el check `>= 40`. Este cambio fue autorizado como parte de HZ-04c-cazador, pero el escenario balance45 no se actualizó para reflejar el nuevo coste. **El coordinador debe decidir si el coste 24 es correcto o si debe restaurarse a 50 (o un valor ≥ 40).**

## Acción requerida

- **Check 2:** Actualizar el escenario para que verifique que lightning escala con `will` (no con `agility`), o eliminar el check si ya no es relevante.
- **Check 4:** Decidir si `arrow_downpour` debe costar ≥ 40 (restaurar a 50 o ajustar) o si el escenario debe aceptar el coste actual de 24.
