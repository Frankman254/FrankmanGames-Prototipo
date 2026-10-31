import { defineConfig } from 'vitest/config';
import { editorSavePlugin } from './scripts/editorSave';

export default defineConfig({
  // Rutas relativas: el build se carga con file:// dentro de Electron.
  base: './',
  // Guardado del modo edición: sólo con `vite serve` (npm run dev), nunca en el build.
  plugins: [editorSavePlugin()],
  server: { port: 5173, strictPort: false },
  // Los efectos WAV (src/audio/samples.ts) van incrustados como data URL: así
  // Electron no tiene que leerlos con fetch desde file://.
  build: { assetsInlineLimit: (file: string) => (file.endsWith('.wav') ? true : undefined) },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
