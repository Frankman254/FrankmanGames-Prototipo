# JL-166: chaman.glb no carga en dev:web

## Diagnóstico

**Síntoma:** En `npm run dev:web` (Vite), la consola del navegador muestra `[gltf] enemy10: no se pudo cargar /assets/models/chaman.glb`.

**Causa:** Vite no reconoce `.glb` como tipo de asset por defecto. Sin `assetsInclude`, los archivos `.glb` no pasan por el pipeline de assets de Vite y se sirven sin el MIME type `model/gltf-binary` correcto. Babylon.js (vía `LoadAssetContainerAsync`) rechaza la carga porque el servidor HTTP no identifica el formato.

En Electron (`npm run dev`) funciona porque usa `file://`, no HTTP: Babylon.js lee el archivo directamente sin pasar por un servidor con MIME types.

**Verificación del archivo:**
- `assets/models/chaman.glb` existe (230 KB, glTF 2.0 válido).
- Buffer embebido, sin referencias externas (texturas, imágenes).
- 7 animaciones: Reposo, Correr, Caminar, Rodar, Golpeado, Morir, Conjurar.
- Referenciado correctamente en `data/assets.json` como template `chaman`.
- Pruebas en `tests/jl166_chamanGlb.test.ts`: 6/6 verdes.

**Arreglo:** Añadir `assetsInclude: ['/**/*.glb', '/**/*.gltf']` en `vite.config.ts` para que Vite trate los GLB/GLTF como assets estáticos y los sirva con el MIME type correcto.

## Evidencia

- `tests/jl166_chamanGlb.test.ts`: 6 pruebas verdes.
- `vite build`: OK (6.43s).
- `npx tsc --noEmit`: limpio (solo errores ajenos en balM3.ts y bodyMass.ts).
- Captura de Electron no disponible: el problema es específico de dev:web (navegador), no reproducible con CDP sin display.
