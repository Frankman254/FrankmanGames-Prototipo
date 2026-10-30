# Registro de procedencia

Cada asset, dependencia con licencia relevante o texto de terceros se anota aquí
**antes** de añadirlo. Nada de FATE, DOFUS Retro o DOFUS 3 puede aparecer.

| Fecha | Archivo / paquete | Origen | Autor | Licencia | Notas |
|---|---|---|---|---|---|
| 2026-10-28 | (geometría del Slice 01) | Generada por código | Proyecto | Propia | Formas grises sin assets externos |
| 2026-10-28 | `@babylonjs/core` 7.54.3 | npm | Babylon.js contributors | Apache-2.0 | Render de evaluación (`PEND-TECH-001`), sólo primitivas |
| 2026-10-28 | `vite` 5.4.21 | npm | Evan You y colaboradores | MIT | Servidor de desarrollo y empaquetado (dev) |
| 2026-10-28 | `typescript` 5.9.3 | npm | Microsoft | Apache-2.0 | Compilador (dev) |
| 2026-10-28 | `vitest` 2.1.9 | npm | Vitest contributors | MIT | Tests de lógica pura (dev) |
| 2026-10-29 | `electron` 33.2.1 | npm | OpenJS Foundation y colaboradores | MIT (Chromium y dependencias: ver `LICENSES.chromium.html` en el paquete) | Contenedor de escritorio Windows |
| 2026-10-29 | `electron-builder` 25.1.8 | npm | electron-userland | MIT | Empaquetado portable (dev); descarga NSIS 3.0.4.1 (zlib/libpng) al empaquetar |
| 2026-10-29 | `esbuild` 0.21.5 | npm | Evan Wallace | MIT | Compila el proceso principal (dev) |
| 2026-10-29 | `@types/node` 20 | npm | DefinitelyTyped | MIT | Tipos del proceso principal (dev) |
| 2026-10-29 | Iconos de la interfaz (`src/ui/menus/icons.ts`) | Generados por código (SVG en línea) | Proyecto | Propia | Provisionales; sin assets externos ni fuentes descargadas |
| 2026-10-29 | `playwright` (preinstalado en la máquina de la nube, no es dependencia) | — | Microsoft | Apache-2.0 | Sólo para `scripts/capturasMenus.cjs` (capturas headless) |
| 2026-10-29 | `@babylonjs/loaders` 7.54.3 | npm | Babylon.js contributors | Apache-2.0 | Cargador glTF/GLB (Slice 02) |
| 2026-10-29 | `@babylonjs/materials` 7.54.3 | npm | Babylon.js contributors | Apache-2.0 | `TerrainMaterial` (splatmap) del Slice 02 |
| 2026-10-30 | `ws` 8.18.0 | npm | Einar Otto Stangvik y colaboradores | MIT | Servidor y cliente WebSocket de la prueba de concepto online (`server/`, dev); sólo en 127.0.0.1 |
| 2026-10-30 | `@types/ws` 8.5.13 | npm | DefinitelyTyped | MIT | Tipos de `ws` (dev) |
