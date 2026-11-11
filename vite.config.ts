import { defineConfig } from 'vitest/config';
import { editorSavePlugin } from './scripts/editorSave';
import { localMusicPlugin } from './scripts/localMusic';
import { EDITOR_FILES, WATCH_IGNORED_FILES } from './src/editor/files';

export default defineConfig({
  // Rutas relativas: el build se carga con file:// dentro de Electron.
  base: './',
  // Guardado del modo edición: sólo con `vite serve` (npm run dev), nunca en el build.
  // Música de pruebas desde una carpeta fuera del repositorio: sólo en desarrollo.
  plugins: [editorSavePlugin(), localMusicPlugin()],
  // Ni el vigilante ni la búsqueda de dependencias entran en las copias de referencia, los
  // perfiles de Electron de las pruebas ni el ejecutable empaquetado: con ellos Vite se atasca.
  // Los JSON que guarda el editor y que se importan compilados (`WATCH_IGNORED_FILES`) tampoco:
  // el modo edición los aplica en caliente; si Vite los viera, recargaría la página entera.
  server: { port: 5173, strictPort: false, watch: { ignored: ['**/reference_assets/**', '**/work/**', '**/release/**', '**/dist/**', '**/dist-electron/**', ...WATCH_IGNORED_FILES.map((f) => `**/${EDITOR_FILES[f]}`)] } },
  // Babylon se sirve tal cual: sus sombreadores se importan bajo demanda y, si Vite los
  // preempaqueta, al reoptimizar en mitad de la partida cambia el hash y falla el import
  // («Failed to fetch dynamically imported module …depth.vertex…»).
  optimizeDeps: { entries: ['index.html', 'personajes.html'], exclude: ['@babylonjs/core', '@babylonjs/loaders', '@babylonjs/materials'] },
  // Los efectos WAV (src/audio/samples.ts) van incrustados como data URL: así
  // Electron no tiene que leerlos con fetch desde file://.
  build: { assetsInlineLimit: (file: string) => (file.includes('/src/audio/sfx/generated_original/') && file.endsWith('.wav') ? true : undefined) },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
