// `npm run dev`: servidor Vite (recarga en caliente del renderer) + ventana de
// Electron apuntando a él. Al cerrar la ventana se para todo.
// Argumentos extra se pasan a Electron (p. ej. `npm run dev -- --bench`).
import { spawn } from 'node:child_process';
import electronPath from 'electron';
import { createServer } from 'vite';
import { buildMain } from './buildMain.mjs';

await buildMain();
const server = await createServer({ server: { strictPort: false } });
await server.listen();
const url = server.resolvedUrls?.local[0];
if (!url) throw new Error('Vite no publicó una URL local');

const child = spawn(String(electronPath), ['.', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, VITE_DEV_SERVER_URL: url },
});
child.on('exit', async (code) => {
  await server.close();
  process.exit(code ?? 0);
});
