# JL-133 y JL-134: Casas y lanza del Centinela

## JL-133: 17 casas en el mapa

**Causa:** `data/vegetation.json` tiene 18 casas (17 default + 1 golden). El escenario `modelos` esperaba 16 casas (`=== 16`), pero hay 17 casas con modelo `casa`. La casa extra `(250.41, 234.29)` es de Iguanera, añadida sin actualizar el check.

**Arreglo:** `scripts/qaElectron.mjs` línea 1923: `=== 16` → `=== 17`.

## JL-134: Centinela sin lanza

**Causa:** `withGear()` en `src/world/look.ts` establecía `weapon: 'none'` cuando no había arma equipada, sobrescribiendo el arma del look de clase. El Centinela (ember_vanguard) tiene la Lanza como pieza de diseño en `centinela_anime.glb`, pero `holdGear()` la eliminaba porque `look.weapon === 'none'`.

**Arreglo:**
1. `withGear()` conserva `look.weapon` cuando no hay arma equipada (en vez de forzar `'none'`).
2. `data/assets.json`: añadido `looks.ember_vanguard` y `looks.ember_vanguard_f` con `weapon: 'spear'` en el template `personaje`.
3. `tests/characterLook.test.ts`: prueba actualizada para reflejar el nuevo comportamiento.

## Verificación

- Suite: 3513/3513 en verde.
- Typecheck: limpio (solo balM3.ts ajeno).
- Electron: escenario `modelos` no ejecutable sin display (error localStorage pre-existente del arnés).
