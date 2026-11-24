// Mide el arranque en frío: desde abrir Electron hasta poder mover al personaje.
//   node scripts/qa-cold-start.mjs
// Guarda los tiempos en work/junie-jl249/datos.json y un resumen en la consola.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import electronPath from 'electron';
import { createServer } from 'vite';
import WebSocket from 'ws';
import { buildMain } from './buildMain.mjs';

const OUT = 'work/junie-jl249';
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PORT = 9333;
const PROFILE = path.resolve('work/qa-electron-profile-cold-start');
fs.rmSync(PROFILE, { recursive: true, force: true });

await buildMain();
const server = await createServer({
    server: { strictPort: false, hmr: false, watch: null },
    logLevel: 'error',
});
await server.listen();
const viteUrl = server.resolvedUrls.local[0];

// Marca de tiempo base: antes de spawnear Electron.
const t0 = Date.now();

let app = spawn(
    String(electronPath),
    [
        '.',
        `--remote-debugging-port=${PORT}`,
        `--user-data-dir=${PROFILE}`,
        '--disable-http-cache',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-background-timer-throttling',
    ],
    {
        stdio: 'ignore',
        env: { ...process.env, VITE_DEV_SERVER_URL: viteUrl },
    },
);
process.on('exit', () => app.kill());

// Hito 1: CDP disponible
let ws;
async function connectCDP() {
    for (let i = 0; i < 60; i++) {
        try {
            const list = await (
                await fetch(`http://127.0.0.1:${PORT}/json`, { signal: AbortSignal.timeout(1500) })
            ).json();
            const page = list.find((t) => t.type === 'page' && t.url.startsWith(viteUrl));
            if (page) return page.webSocketDebuggerUrl;
        } catch {
            /* aún no abre */
        }
        await sleep(500);
    }
    throw new Error('Electron no abrió el puerto de depuración');
}

ws = new WebSocket(await connectCDP(), { handshakeTimeout: 10000 });
await new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
});
const t1 = Date.now(); // CDP conectado

let nextId = 1;
const waiting = new Map();

function cdp(method, params = {}) {
    return new Promise((ok, fail) => {
        const id = nextId++;
        const timer = setTimeout(() => {
            waiting.delete(id);
            fail(new Error(`CDP timeout: ${method}`));
        }, 15000);
        waiting.set(id, { ok: (v) => { clearTimeout(timer); ok(v); }, fail });
        ws.send(JSON.stringify({ id, method, params }));
    });
}

ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    const w = waiting.get(msg.id);
    if (w) {
        waiting.delete(msg.id);
        if (msg.error) w.fail(new Error(JSON.stringify(msg.error)));
        else w.ok(msg.result);
    }
});

await cdp('Runtime.enable');
await cdp('Page.enable');

async function js(expr) {
    const r = await cdp('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails)
        throw new Error(`${expr}\n→ ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
    return r.result.value;
}

async function until(expr, ms = 30000, label = expr) {
    const t = Date.now();
    while (Date.now() - t < ms) {
        if (await js(expr)) return true;
        await sleep(100);
    }
    throw new Error(`Tiempo agotado esperando: ${label}`);
}

async function mouse(x, y) {
    await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1, buttons: 1 });
    await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1, buttons: 0 });
}

// Hito 2: Botón "Nueva partida" visible
await until(`!!document.querySelector('[data-testid="new-game"]')`, 30000, 'título');
const t2 = Date.now(); // Botón nueva partida visible

// Clic en "Nueva partida"
const newGameBtn = await js(
    `(()=>{ const b=document.querySelector('[data-testid="new-game"]'); if(!b) return null; const r=b.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`,
);
if (!newGameBtn) throw new Error('No está visible: button[data-testid="new-game"]');
await mouse(newGameBtn.x, newGameBtn.y);
await sleep(120);

// Esperar pantalla de creación
await until(`document.querySelector('.name-input')`);

// Escribir nombre y elegir clase
await js(`(()=>{const i=document.querySelector('.name-input');i.value='QA Arranque';i.dispatchEvent(new Event('input',{bubbles:true}));})()`);

// Marcar Piedras conocidas para partir del pueblo
await js(`localStorage.setItem('frankmangames.piedras.QA Arranque', JSON.stringify({known:['raspadura'],respawn:'raspadura'}))`);

// Clic en "Empezar"
const empezarBtn = await js(
    `(()=>{ const btns=[...document.querySelectorAll('button')]; const b=btns.find(b=>b.textContent.trim()==='Empezar'); if(!b) return null; const r=b.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`,
);
if (!empezarBtn) throw new Error('No está visible: button Empezar');
await mouse(empezarBtn.x, empezarBtn.y);

// Hito 3: Sesión activa y personaje con nombre
const S = '__game.session';
const W = '__game.world';
await until(`${S} && ${W}.character.name==='QA Arranque'`, 20000, 'partida');

// Hito 4: Pantalla de carga oculta — personaje en escena
await until(`!document.querySelector('.carga:not([hidden])')`, 20000, 'escena lista');
await sleep(500);

// Hito 5: Personaje responde — verificamos que el input está activo y el jugador tiene velocidad
const inputActive = await js(`__game.input?.active === true`);
const hasSpeed = await js(`${W}.player.moveSpeed > 0`);
const sessionReady = await js(`${S} !== null && ${S}.state === 'playing'`);
const t3 = Date.now(); // Personaje controlable (input activo, sesión en playing)

// Calcular tiempos
const coldStartCDP = t1 - t0;
const cdpToTitle = t2 - t1;
const titleToReady = t3 - t2;
const totalColdStart = t3 - t0;

const metrics = {
    coldStartCDP_ms: coldStartCDP,
    cdpToTitle_ms: cdpToTitle,
    titleToReady_ms: titleToReady,
    totalColdStart_ms: totalColdStart,
    inputActive,
    hasSpeed,
    sessionReady,
};

console.log('=== Arranque en frío ===');
console.log(`  Spawn → CDP:            ${coldStartCDP} ms`);
console.log(`  CDP → Nueva partida:    ${cdpToTitle} ms`);
console.log(`  Nueva partida → Listo:  ${titleToReady} ms`);
console.log(`  Total (spawn → listo):  ${totalColdStart} ms`);
console.log(`  Input activo:           ${inputActive}`);
console.log(`  Velocidad > 0:          ${hasSpeed}`);
console.log(`  Sesión playing:         ${sessionReady}`);

// Guardar datos
const datosPath = path.join(OUT, 'datos.json');
const datos = JSON.parse(fs.existsSync(datosPath) ? fs.readFileSync(datosPath, 'utf8') : '[]');
datos.push(metrics);
fs.writeFileSync(datosPath, JSON.stringify(datos, null, 2));
console.log(`  Datos guardados en ${datosPath} (${datos.length} mediciones)`);

// Limpiar
app.kill();
await server.close();
