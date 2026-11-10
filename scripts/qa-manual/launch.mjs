// Electron de QA manual persistente: Vite + Electron con CDP en 9351 y perfil propio en work/qa-manual/profile.
// Uso: node scripts/qa-manual/launch.mjs   (Ctrl+C para cerrar). Ver docs/HERRAMIENTAS_QA.md.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import electronPath from 'electron';
import { createServer } from 'vite';
import { buildMain } from '../buildMain.mjs';
process.chdir(path.resolve(import.meta.dirname, '../..'));
fs.mkdirSync('work/qa-manual', { recursive: true });
await buildMain();
const server = await createServer({ server: { strictPort: false }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
fs.writeFileSync('work/qa-manual/url.txt', url);
const app = spawn(String(electronPath), ['.', '--remote-debugging-port=9351', `--user-data-dir=${path.resolve('work/qa-manual/profile')}`, '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'], { stdio: 'inherit', env: { ...process.env, VITE_DEV_SERVER_URL: url } });
console.log('listo', url);
app.on('exit', async (c) => { console.log('electron salió', c); await server.close(); process.exit(0); });
process.on('SIGTERM', () => app.kill());
process.on('SIGINT', () => app.kill());
