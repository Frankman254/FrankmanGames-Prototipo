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
| 2026-10-30 | Partículas de lluvia y nieve (`src/render/weatherView.ts`) | Texturas dibujadas por código (DynamicTexture) | Proyecto | Propia | Sin assets externos; las Piedras Pintadas siguen siendo geometría por código |
| 2026-10-30 | `ws` 8.18.0 | npm | Einar Otto Stangvik y colaboradores | MIT | Servidor y cliente WebSocket de la prueba de concepto online (`server/`, dev); sólo en 127.0.0.1 |
| 2026-10-30 | `@types/ws` 8.5.13 | npm | DefinitelyTyped | MIT | Tipos de `ws` (dev) |
| 2026-10-31 | Efectos `src/audio/sfx/generated_original/*.wav` (12: `hit_blade_light_01`, `hit_blade_heavy_01`, `hit_blunt_01`, `hit_critical_01`, `block_metal_01`, `spell_fire_cast_01`, `spell_fire_impact_01`, `spell_frost_cast_01`, `spell_storm_cast_01`, `spell_storm_impact_01`, `spell_earth_cast_01`, `spell_heal_01`) | Sintetizados por código con `scripts/generateSfx.mjs` (osciladores, ruido con semilla fija y filtros biquad; determinista) | Proyecto | Propia | PCM 16 bits mono 22 050 Hz con bloque LIST/INFO (`ISFT = FrankmanGames scripts/generateSfx.mjs`). Sustituyen a los WAV sin metadatos del commit WIP 0df8e0c (procedencia no verificable). Se incrustan en el build como data URL. Respaldo: recetas de `data/audio/sfx.json` |
| 2026-10-31 | `src/audio/music/` | — | — | — | **Excluida** del repositorio (`.gitignore`): contenía música del juego FATE original. Nada del código la carga |
| 2026-10-31 | `src/audio/music/` (rama `guardado-presets`) | Archivos locales del creador, en su equipo | — | — | Sigue **excluida** (`.gitignore`). A petición del creador, `src/audio/localMusic.ts` la puede reproducir **sólo con `npm run dev`** (Vite la sirve desde el disco del creador) si existe `src/audio/music/local.json`; el módulo se importa tras `import.meta.env.DEV` y el build no lo incluye (comprobado con `grep` en `dist/`). Ninguna canción entra en el repositorio ni en el ejecutable |
