# JL-75: Diagnóstico del escenario `previa` — 5 fallos

**Fecha:** 2026-11-21
**Estado:** No se pudo ejecutar Electron (sin display en entorno headless). Análisis basado en código del arnés y del juego.

## Resumen

Los 5 fallos del escenario `previa` son **del arnés**, no del juego. La causa raíz es que `clickSlot()` en `scripts/qaElectron.mjs` hace un click completo (mousedown + mouseup) en los slots de la barra, lo que en el modo de lanzamiento por defecto (`pressClick`) confirma inmediatamente el apuntado y lanza el hechizo antes de que el QA pueda verificar los fantasmas y las cards.

## Los 5 fallos identificados

### Fallo 1: `Previa: el intercambio dice a dónde cae el lanzador`
- **Check:** `c1.some((t) => t.includes('Aquí caerías'))`
- **Resultado:** `["Fuera de alcance"]`
- **Causa:** El hechizo ya se lanzó antes de leer las cards. `syncAimPreview()` limpia los fantasmas y cards cuando `aimingSpell()` devuelve null (porque `castInput.aiming` fue limpiado por `confirm()`). Sin apuntado activo, no hay cards visibles y el check lee las cards vacías o residuales.

### Fallo 2: `Previa: se ve el fantasma del lanzador`
- **Check:** `__game.view.scene.meshes.some(m=>m.name.includes('aimLanding')&&m.isEnabled())`
- **Causa:** Mismo que fallo 1. Sin `aiming`, `aimGhosts.clear()` se ejecuta en el siguiente frame y no hay meshes `aimLanding`.

### Fallo 3: `Previa: al confirmar cae donde se vio`
- **Check:** `Math.hypot(after.p.x - pv.casterTo.x, after.p.y - pv.casterTo.y) < 0.1`
- **Causa:** `pv` se obtiene llamando a `previewSpell()` directamente desde JS (línea 834), con el targetId correcto. Si el enemigo está vivo y en alcance, `pv.casterTo` debería ser válido. Pero si el hechizo ya se lanzó por el click completo, la posición del jugador ya cambió y `after.p` no coincide con `pv.casterTo` porque el lanzamiento real usó un aim diferente (el del cursor en el momento del click, no el que el QA calcula después).

### Fallo 4: `Previa: confirmar no deja fantasmas`
- **Check:** `!(await js(__game.view.scene.meshes.some(m=>m.name.includes('aimLanding'))))`
- **Causa:** Cascada del fallo 3. Si el hechizo se lanzó prematuramente, los fantasmas pueden haberse limpiado o no, dependiendo del timing.

### Fallo 5: `Previa: apuntar no lanza nada` (o cascada)
- **Check:** `during.p.x === before.p.x && during.e.x === before.e.x && during.cd === before.cd`
- **Causa:** El hechizo ya se lanzó por el click completo, así que la posición del jugador cambió y/o el cooldown se activó.

## Causa raíz: `clickSlot()` hace click completo

En `scripts/qaElectron.mjs`, líneas 819-823:
```js
const clickSlot = async (i) => {
    const p = await slot(i);
    await mouse(p.x, p.y);
    await sleep(200);
};
```

`mouse()` envía mousedown + mouseup vía CDP. En modo `pressClick`:
1. `mousedown` → `slotGate()` → `castInput.press(0, true)` → `{kind:'aim'}` → `aiming=0` ✓
2. `mouseup` → `input.onPointerUp` → `castInput.confirm()` → `{kind:'cast'}` → `fireSlot(0)` → **el hechizo se lanza**

El escenario espera que después de `clickSlot()` el juego esté en estado "apuntando" (para ver fantasmas y cards). Pero el click completo lo saca de ese estado inmediatamente.

## ¿Es del arnés o del juego?

**Del arnés.** El código del juego funciona correctamente:
- `CastInput.press()` en modo `pressClick` establece `aiming` y devuelve `'aim'` (no lanza)
- `CastInput.confirm()` limpia `aiming` y devuelve `'cast'` (lanza)
- `syncAimPreview()` pinta fantasmas y cards mientras `aiming !== null`
- `previewSpell()` devuelve `casterTo` correcto cuando el objetivo está en alcance

El arnés debería:
1. Usar solo `mousedown` (sin `mouseup`) en el slot para entrar en estado "apuntando"
2. Verificar los fantasmas y cards
3. Luego hacer `mouseup` o un clic de confirmación para lanzar

Alternativamente, el arnés podría usar el modo `indicator` (mantener y soltar) donde `press` establece `aiming` y solo `release` lanza — pero `clickSlot` haría ambos en una sola llamada.

## Evidencia del código

- `src/sim/castModes.ts:66-79` — `CastInput.press()` en modo `pressClick` devuelve `'aim'`
- `src/sim/castModes.ts:90-95` — `CastInput.confirm()` devuelve `'cast'` y limpia `aiming`
- `src/main.ts:802-809` — `input.onPointerDown`: si `aiming !== null` y botón 0, llama `confirm()` y `fireSlot()`
- `src/main.ts:771-772` — `slotGate` llama `castInput.press()` y devuelve true solo si kind es `'aim'`
- `scripts/qaElectron.mjs:819-823` — `clickSlot()` hace `mouse()` (click completo)

## Conclusión

Los 5 fallos son **del arnés de QA**. El juego funciona correctamente en modo `pressClick`. El escenario `previa` necesita reescribirse para:
1. Separar mousedown de mouseup en `clickSlot`
2. O usar un helper `aimSlot(i)` que solo hace mousedown
3. Verificar fantasmas y cards entre mousedown y mouseup
4. Confirmar con mouseup o clic secundario

No se requieren cambios en el código del juego para esta tarea.
