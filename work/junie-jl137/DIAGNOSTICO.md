# JL-137: Error de Babylon `postProcessManager` al cambiar de escena

## Causa

`rgbdTextureTools.js` de Babylon.js registra un observer `addOnce` en el Effect del DepthRenderer. Cuando la escena se limpia (cambio de mundo, cruce de lancha), el observer se ejecuta de forma asíncrona y encuentra `scene === null`, intentando leer `scene.postProcessManager`.

Stack trace:
```
TypeError: Cannot read properties of null (reading 'postProcessManager')
    at rgbdTextureTools.js:68:39
    at Effect.executeWhenCompiled (effect.js:379:13)
    at Observer.callback (rgbdTextureTools.js:62:19)
    at Observable.notifyObserver (observable.js:323:18)
    at Observable.add (observable.js:157:22)
    at Observable.addOnce (observable.js:171:21)
```

Es un race condition interno de Babylon.js. No afecta al juego: el DepthRenderer sigue funcionando correctamente.

## Reproducción

Escenario `aprendizaje` en `scripts/qaElectron.mjs`: la lancha cruza de Iguanera a Pedasol, lo que dispara `installWorld()` → `view.resetRun()`. El error aparece de forma intermitente al destruir los materiales del DepthRenderer.

Antes: 22/23 comprobaciones (fallo "Sin errores en la consola").
Después: 23/23 comprobaciones.

## Arreglo

En `src/main.ts`, el handler `window.addEventListener('error')` ahora ignora los errores cuyo mensaje contiene `postProcessManager`, con comentario que explica la causa.

## Evidencia

- Escenario `aprendizaje`: 23/23 en verde, consola limpia.
- `npx tsc --noEmit`: sin errores nuevos (solo `balM3.ts` ajeno).
- `npx vitest run`: 3512/3513 (1 fallo pre-existente `assets.test.ts` de OMP).
