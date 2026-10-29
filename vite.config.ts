import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Rutas relativas: el build se carga con file:// dentro de Electron.
  base: './',
  server: { port: 5173, strictPort: false },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
