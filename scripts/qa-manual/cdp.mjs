// Uso: node scripts/qa-manual/cdp.mjs <paso.js ...> | -e "expr". Necesita launch.mjs abierto. Ver docs/HERRAMIENTAS_QA.md.
// el script recibe helpers: js, mouse, key, wheel, shot, sleep, cdp, log
import fs from 'node:fs';
import path from 'node:path';
import WebSocket from 'ws';
const dir = path.resolve(import.meta.dirname, '../../work/qa-manual');
const url = process.env.CDP_URL ?? fs.readFileSync(path.join(dir, 'url.txt'), 'utf8').trim();
const list = await (await fetch(`http://127.0.0.1:${process.env.CDP_PORT ?? 9351}/json`)).json();
const page = list.find((t) => t.type === 'page' && t.url.startsWith(url));
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, f) => { ws.once('open', r); ws.once('error', f); });
let id = 1; const waiting = new Map(); const errors = [];
ws.on('message', (raw) => { const m = JSON.parse(raw); if (m.id && waiting.has(m.id)) { const w = waiting.get(m.id); waiting.delete(m.id); m.error ? w.f(new Error(m.error.message)) : w.r(m.result); } else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text); else if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) errors.push(m.params.type + ': ' + m.params.args.map((a) => a.value ?? a.description).join(' ')); });
const cdp = (method, params = {}) => new Promise((r, f) => { const i = id++; waiting.set(i, { r, f }); ws.send(JSON.stringify({ id: i, method, params })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await cdp('Runtime.enable');
async function js(expr) { const r = await cdp('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text); return r.result.value; }
async function mouse(x, y, o = {}) { const button = o.button ?? 'left'; const b = { x, y, button, clickCount: o.count ?? 1, modifiers: o.modifiers ?? 0 }; await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); await cdp('Input.dispatchMouseEvent', { ...b, type: 'mousePressed', buttons: button === 'right' ? 2 : 1 }); if (o.hold) await sleep(o.hold); await cdp('Input.dispatchMouseEvent', { ...b, type: 'mouseReleased' }); }
async function move(x, y) { await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); }
async function wheel(x, y, deltaY) { await cdp('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY }); }
async function key(code, keyName = code.replace(/^Key|^Digit/, '').toLowerCase(), hold = 0) { const vk = code.startsWith('Key') || code.startsWith('Digit') ? code.at(-1).toUpperCase().charCodeAt(0) : ({ Escape: 27, Space: 32, Enter: 13, F10: 121, Tab: 9 })[code] ?? 0; const b = { code, key: code === 'Escape' ? 'Escape' : code === 'Space' ? ' ' : keyName, windowsVirtualKeyCode: vk }; await cdp('Input.dispatchKeyEvent', { ...b, type: 'rawKeyDown' }); if (hold) await sleep(hold); await cdp('Input.dispatchKeyEvent', { ...b, type: 'keyUp' }); await sleep(150); }
async function shot(name) { const { data } = await cdp('Page.captureScreenshot', { format: 'jpeg', quality: 75 }); const p = path.join(dir, 'shots', name + '.jpg'); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, Buffer.from(data, 'base64')); return p; }
async function locate(sel, text) { return js(`(() => { const t=${JSON.stringify(text ?? null)}; const e=[...document.querySelectorAll(${JSON.stringify(sel)})].find(x=>x.offsetParent!==null&&(t===null||x.textContent.trim()===t)); if(!e) return null; const b=e.getBoundingClientRect(); return {x:b.x+b.width/2,y:b.y+b.height/2}; })()`); }
async function click(sel, text, o) { const p = await locate(sel, text); if (!p) throw new Error('no visible: ' + sel + ' ' + (text ?? '')); await mouse(p.x, p.y, o); await sleep(150); }
const log = (...a) => console.log(...a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))));
const arg = process.argv[2];
// Los pasos reciben delante lib.js, walk.js y fight.js (state, project, clickAt, walkTo, fight…).
const here = path.resolve(import.meta.dirname);
const prelude = ['lib.js', 'walk.js', 'fight.js'].map((f) => fs.readFileSync(path.join(here, f), 'utf8')).join('\n');
const code = arg === '-e' ? `return (async()=>{ log(await js(${JSON.stringify(process.argv[3])})); })()` : prelude + '\n' + process.argv.slice(2).map((f) => fs.readFileSync(f, 'utf8')).join('\n');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
// Si una espera queda colgada (p. ej. la página recarga), Node saldría sin decir nada: avisarlo.
let finished = false;
process.on('beforeExit', () => { if (!finished) console.log('AVISO: el paso se cortó sin terminar; vuelve a ejecutarlo desde el estado actual'); });
try { await new AsyncFunction('js', 'mouse', 'move', 'wheel', 'key', 'shot', 'sleep', 'cdp', 'log', 'click', 'locate', code)(js, mouse, move, wheel, key, shot, sleep, cdp, log, click, locate); }
catch (e) { console.log('ERROR', e.message); }
finished = true;
await sleep(100);
const shown = errors.filter((e) => !e.includes('Electron Security Warning')); if (shown.length) console.log('CONSOLA:', shown.slice(0, 8));
ws.close(); process.exit(0);
