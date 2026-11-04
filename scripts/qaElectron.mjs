// Recorrido automático en la ventana real de Electron, con clics reales por CDP.
//   node scripts/qaElectron.mjs            todos los escenarios
//   node scripts/qaElectron.mjs banco ...  solo los nombrados
// Abre una ventana unos minutos. Capturas e informe en `work/qa/` (ignorado).
// Comprueba hechos observables; no juzga sensación, ritmo ni legibilidad.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import electronPath from 'electron';
import { createServer } from 'vite';
import WebSocket from 'ws';
import { buildMain } from './buildMain.mjs';

const OUT = 'work/qa';
const PORT = 9333;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

await buildMain();
const server = await createServer({ server: { strictPort: false }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
const app = spawn(String(electronPath), ['.', `--remote-debugging-port=${PORT}`, `--user-data-dir=${path.resolve('work/qa-electron-profile')}`, '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'], {
  stdio: 'ignore',
  env: { ...process.env, VITE_DEV_SERVER_URL: url },
});

async function connect() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
      const page = list.find((t) => t.type === 'page' && t.url.startsWith(url));
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* aún no abre */ }
    await sleep(500);
  }
  throw new Error('Electron no abrió el puerto de depuración');
}
// Pase lo que pase, sin ventanas de prueba colgadas.
process.on('exit', () => app.kill());
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => process.exit(130));
const ws = new WebSocket(await connect());
await new Promise((r) => ws.once('open', r));
let nextId = 1;
const waiting = new Map();
const consoleErrors = [];
ws.on('message', (raw) => {
  const m = JSON.parse(raw);
  if (m.id && waiting.has(m.id)) {
    const { ok, fail } = waiting.get(m.id);
    waiting.delete(m.id);
    if (m.error) fail(new Error(m.error.message)); else ok(m.result);
  } else if (m.method === 'Runtime.exceptionThrown') {
    consoleErrors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
  } else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    consoleErrors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
  }
});
const cdp = (method, params = {}) => new Promise((ok, fail) => {
  const id = nextId++;
  waiting.set(id, { ok, fail });
  ws.send(JSON.stringify({ id, method, params }));
});
await cdp('Runtime.enable');
await cdp('Page.enable');

/** Evalúa en la página y devuelve el valor (JSON). */
async function js(expr) {
  const r = await cdp('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(`${expr}\n→ ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
  return r.result.value;
}
async function until(expr, ms = 15000, label = expr) {
  const t = Date.now();
  while (Date.now() - t < ms) {
    if (await js(expr)) return true;
    await sleep(100);
  }
  throw new Error(`Tiempo agotado esperando: ${label}`);
}
async function mouse(x, y, opts = {}) {
  const base = { x, y, button: 'left', clickCount: opts.count ?? 1, modifiers: opts.modifiers ?? 0 };
  await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await cdp('Input.dispatchMouseEvent', { ...base, type: 'mousePressed', buttons: 1 });
  await cdp('Input.dispatchMouseEvent', { ...base, type: 'mouseReleased' });
}
/** Centro de un elemento visible; `text` filtra por texto exacto. */
const locate = (sel, text) => js(`(() => { const t=${JSON.stringify(text ?? null)};
  const e=[...document.querySelectorAll(${JSON.stringify(sel)})].find(x=>x.offsetParent!==null&&(t===null||x.textContent.trim()===t));
  if(!e) return null; const b=e.getBoundingClientRect(); return {x:b.x+b.width/2,y:b.y+b.height/2}; })()`);
async function click(sel, text, opts) {
  const p = await locate(sel, text);
  if (!p) throw new Error(`No está visible: ${sel} ${text ?? ''}`);
  await mouse(p.x, p.y, opts);
  await sleep(120);
}
const button = (text, opts) => click('button', text, opts);
async function key(code, keyName = code.replace(/^Key|^Digit/, '').toLowerCase()) {
  const vk = code.startsWith('Key') || code.startsWith('Digit') ? code.at(-1).toUpperCase().charCodeAt(0) : code === 'Escape' ? 27 : code === 'Minus' ? 189 : code === 'F11' ? 122 : code === 'Space' ? 32 : 0;
  const base = { code, key: code === 'Escape' ? 'Escape' : keyName, windowsVirtualKeyCode: vk };
  await cdp('Input.dispatchKeyEvent', { ...base, type: 'rawKeyDown' });
  await cdp('Input.dispatchKeyEvent', { ...base, type: 'keyUp' });
  await sleep(200);
}
async function resize(width, height) {
  // Electron no ofrece Browser.setWindowBounds: se emula el área de dibujo, no el marco.
  await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await sleep(700);
}
/** Guarda en la ranura 1 y carga desde ella por los menús reales. */
async function saveAndLoad() {
  await key('Escape', 'Escape');
  await button('Guardar partida');
  await until(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Guardar aquí')`, 5000, 'lista de guardado');
  await button('Guardar aquí');
  await sleep(400);
  const pick = await js(`[...document.querySelectorAll('button')].filter(b=>b.offsetParent!==null).map(b=>b.textContent.trim()).join('|')`);
  if (pick.includes('Sobrescribir') || pick.includes('Confirmar')) await button(pick.includes('Sobrescribir') ? 'Sobrescribir' : 'Confirmar');
  await sleep(300);
  if (!(await locate('button', 'Cargar partida'))) {
    if (await locate('button', 'Volver')) await button('Volver');
    await sleep(200);
  }
  await button('Cargar partida');
  await until(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Cargar')`, 5000, 'lista de carga');
  await button('Cargar');
  await sleep(1500);
  const left = await js(`[...document.querySelectorAll('button')].filter(b=>b.offsetParent!==null).map(b=>b.textContent.trim()).join('|')`);
  if (left.includes('Cargar')) await button(left.includes('Confirmar') ? 'Confirmar' : 'Cargar');
  await sleep(1000);
}
async function shot(name) {
  const { data } = await cdp('Page.captureScreenshot', { format: 'jpeg', quality: 80 });
  fs.writeFileSync(path.join(OUT, `${name}.jpg`), Buffer.from(data, 'base64'));
}
/** Busca en pantalla un modelo por nombre con el mismo pick del juego y le hace clic real. */
async function clickMesh(part) {
  const p = await js(`(() => { const s=__game.view.scene, c=document.querySelector('canvas'), r=c.getBoundingClientRect();
    for (let y=40;y<r.height-40;y+=16) for (let x=20;x<r.width-20;x+=16) {
      const h=s.pick(x,y,m=>m.isEnabled()&&m.isPickable);
      if (h?.pickedMesh?.name.includes(${JSON.stringify(part)})) return {x:x+r.x,y:y+r.y};
    } return null; })()`);
  if (!p) throw new Error(`Modelo fuera de pantalla: ${part}`);
  await mouse(p.x, p.y);
}

class BootError extends Error {}
const results = [];
function check(name, ok, seen = '') {
  results.push({ name, ok: !!ok, seen: String(seen) });
  console.log(`${ok ? 'OK   ' : 'FALLA'} ${name}${seen !== '' ? ` → ${seen}` : ''}`);
}
const S = '__game.session';
const W = '__game.world';
const panelBankOpen = `[...document.querySelectorAll('.panel-bank')].some(e=>e.offsetParent!==null)`;
const deathShown = `[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Continuar como espectro')`;

async function newGame(name) {
  await cdp('Page.navigate', { url });
  await sleep(1500);
  try {
    await until(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Nueva partida')`, 30000, 'título');
  } catch {
    throw new BootError(`El juego no arranca. Consola: ${consoleErrors.slice(-3).join(' | ') || 'sin errores'}`);
  }
  await button('Nueva partida');
  await until(`document.querySelector('.name-input')`);
  await js(`(()=>{const i=document.querySelector('.name-input');i.value=${JSON.stringify(name)};i.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await button('Empezar');
  await until(`${S} && ${W}.character.name===${JSON.stringify(name)}`, 20000, 'partida');
  await sleep(800);
}

const scenarios = {
  async mochila() {
    await newGame('QA Mochila');
    await key('KeyB', 'b');
    await until(`document.querySelector('.inv-grid .cell')`, 5000, 'mochila abierta');
    const measure = () => js(`(() => { const g=document.querySelector('.inv-grid'), b=g.getBoundingClientRect();
      const cells=[...g.querySelectorAll('.cell')], filled=g.querySelectorAll('.cell.filled').length;
      const cols=new Set(cells.map(c=>Math.round(c.getBoundingClientRect().x))).size;
      return {cells:cells.length,filled,cols,w:Math.round(b.width),h:Math.round(b.height),overflowX:g.scrollWidth>g.clientWidth+1,vw:innerWidth,vh:innerHeight}; })()`);
    const seen = {};
    for (const [w, h, n] of [[1280, 800, 'normal'], [800, 600, 'estrecha'], [1700, 1000, 'ancha']]) {
      await resize(w, h);
      const m = await measure();
      seen[n] = m;
      await shot(`c04-mochila-${n}`);
      check(`C04 ${n}: sin desborde horizontal`, !m.overflowX, JSON.stringify(m));
      const cut = await js(`(() => { const box=document.querySelector('.eq-stats').getBoundingClientRect(); return [...document.querySelectorAll('.eq-main b')].filter(b=>b.getBoundingClientRect().right>box.right+1).length; })()`);
      check(`C04 ${n}: ninguna cifra de características cortada`, cut === 0, `${cut} cortadas`);
    }
    check('C04: la ventana grande da al menos las casillas de la pequeña', seen.ancha.cells >= seen.estrecha.cells, `${seen.estrecha.cells} → ${seen.ancha.cells}`);
    await resize(1280, 800);
    await key('KeyB', 'b');
  },

  async banco() {
    await newGame('QA Banco');
    await js(`(() => { const p=${W}.player; p.pos.x=116; p.pos.y=126; p.path=[]; })()`);
    await sleep(600);
    await js(`__game.bank.enter()`);
    await until(`__game.bank.inside`);
    await sleep(800);
    await shot('c05-banco-interior');
    check('B14: la salida y el empleado resaltan en dorado', await js(`['bank-exit','bank-clerk-body'].every(n=>__game.view.scene.getMeshByName(n)?.renderOutline)`));
    check('B11: el mobiliario no se puede atravesar', !(await js(`${W}.grid.walkable({x:4,y:3.5})`)));
    check('C05: entrar al edificio no abre el banco', !(await js(panelBankOpen)));
    await clickMesh('bank-clerk');
    await until(panelBankOpen, 15000, 'panel del banco');
    check('C05: hablar con el empleado abre el banco', true);
    await sleep(300);
    await shot('c05-banco-panel');
    const counts = () => js(`(() => { const c=${S}.character; return { bag:c.inventory.slots.filter(Boolean).length, equip:Object.values(c.equipment.all()).filter(Boolean).length, gold:c.gold }; })()`);
    const before = await counts();
    await button('Enviar todo');
    await sleep(300);
    const after = await counts();
    await shot('c05-banco-enviado');
    check('C05: Enviar todo vacía la mochila', after.bag === 0, `${JSON.stringify(before)} → ${JSON.stringify(after)}`);
    check('C05: el equipo sigue puesto', after.equip === before.equip, `${before.equip} → ${after.equip}`);
    await js(`__game.bank.leave()`);
    await until(`!__game.bank.inside`);
    await sleep(500);
    check('C05: al salir no queda el panel', !(await js(panelBankOpen)));
    const pos = await js(`({x:${W}.player.pos.x,y:${W}.player.pos.y})`);
    check('C05: reaparece delante de la puerta', Math.hypot(pos.x - 116, pos.y - 127.5) < 2, JSON.stringify(pos));
  },

  async muerte() {
    await newGame('QA Muerte');
    const inv = () => js(`${S}.character.inventory.slots.filter(Boolean).length`);
    const invBefore = await inv();
    await js(`${W}.player.health=0`);
    await until(deathShown, 10000, 'pantalla de muerte');
    await shot('t02-muerte');
    await button('Continuar como espectro');
    await until(`${W}.character.spectral.active && ${W}.player.alive`, 10000, 'forma espectral');
    await sleep(700);
    await shot('t02-espectro');
    const pulse = () => js(`${S}.energy.value`);
    const ghost = () => js(`__game.view.scene.getMeshByName('ghostBody').isEnabled()`);
    check('Pulso: morir lo deja en 0', (await pulse()) === 0, await pulse());
    check('Espectro: se ve el fantasma, no el personaje', await ghost());
    await sleep(2000);
    check('Pulso: en forma espectral no sube', (await pulse()) === 0, await pulse());
    check('T02: guía visible con botón', await locate('button', 'Guiar al Alzador'));
    const altar = await js(`(() => { const p=${W}.player.pos; return [...${W}.content.spectral.resurrectors].sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0]; })()`);
    const saved = await js(`JSON.stringify(${S}.save()).includes('"spectral":{"active":true')`);
    check('T02: el guardado conserva la forma espectral', saved);
    // Se acerca al Alzador para no esperar la caminata y se usa el botón real.
    await js(`(() => { const p=${W}.player, g=${W}.grid, a=g.center(g.nearestWalkable({x:${altar.x}+6,y:${altar.y}+6})); p.pos.x=a.x; p.pos.y=a.y; p.path=[]; })()`);
    await sleep(1200);
    await shot('t02-fantasma');
    await button('Guiar al Alzador');
    await until(`!${W}.character.spectral.active`, 30000, 'volver a la forma viva');
    await sleep(600);
    await shot('t02-resucitado');
    check('T02: el Alzador devuelve la forma viva', true, altar.name);
    check('T02: conserva la mochila', (await inv()) === invBefore, `${invBefore} → ${await inv()}`);
    check('Espectro: al revivir vuelve el personaje', !(await ghost()));
    await sleep(2500);
    const risen = await pulse();
    check('Pulso: al revivir pasa a 1 y sube muy despacio', risen >= 1 && risen < 1.2, risen);
    check('T02: la guía se oculta', !(await locate('button', 'Guiar al Alzador')));
  },

  async bancoDetalle() {
    await newGame('QA Detalle');
    await js(`(() => { const c=${S}.character; for (const id of ['fang','short_sword','short_sword']) c.pickUp(c.items.create(id),true); })()`);
    await js(`__game.bank.enter()`);
    await until(`__game.bank.inside`);
    await sleep(800);
    await clickMesh('bank-chest');
    await until(panelBankOpen, 15000, 'panel desde el cofre');
    check('C05: el cofre también abre el banco', true);
    await shot('b10-banco-rejilla');
    const cols = await js(`getComputedStyle(document.querySelector('.bank-list')).gridTemplateColumns.split(' ').length`);
    check('B10: el banco es una rejilla de 4, 6 u 8 columnas', [4, 6, 8].includes(cols), cols);
    const bagCells = `.bank-column:nth-child(1) [data-bank-uid]`;
    const bankCells = `.bank-column:nth-child(2) [data-bank-uid]`;
    const count = (sel) => js(`document.querySelectorAll(${JSON.stringify(sel)}).length`);
    const nth = async (sel, i) => js(`(() => { const b=document.querySelectorAll(${JSON.stringify(sel)})[${i}].getBoundingClientRect(); return {x:b.x+b.width/2,y:b.y+b.height/2}; })()`);
    const selected = () => js(`document.querySelectorAll('.bank-column:nth-child(1) .bank-item.selected').length`);
    const a = await nth(bagCells, 0), b = await nth(bagCells, 1), d = await nth(bagCells, 3);
    await mouse(a.x, a.y); await sleep(350);
    check('C05: clic selecciona uno', (await selected()) === 1, await selected());
    await mouse(b.x, b.y, { modifiers: 2 }); await sleep(350);
    check('C05: Ctrl+clic añade', (await selected()) === 2, await selected());
    await mouse(a.x, a.y); await sleep(350);
    await mouse(d.x, d.y, { modifiers: 8 }); await sleep(350);
    check('C05: Mayús+clic selecciona el rango', (await selected()) === 4, await selected());
    await shot('c05-seleccion');
    const r0 = await nth(bagCells, 0);
    const r1 = await nth(bagCells, 1);
    await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r0.x, y: r0.y });
    await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: r0.x, y: r0.y, button: 'left', buttons: 1, clickCount: 1 });
    await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r1.x, y: r1.y, buttons: 1 });
    await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r1.x, y: r1.y, button: 'left', clickCount: 1 });
    await sleep(300);
    check('B10: arrastrar selecciona varias', (await selected()) === 2, await selected());
    await mouse(a.x, a.y); await sleep(350);
    await mouse(d.x, d.y, { modifiers: 8 }); await sleep(350);
    const bag0 = await count(bagCells);
    await button('Depositar selección');
    await sleep(300);
    check('C05: Depositar selección mueve cuatro', (await count(bagCells)) === bag0 - 4 && (await count(bankCells)) === 4, `${bag0} → ${await count(bagCells)} / banco ${await count(bankCells)}`);
    const f = await nth(bagCells, 0);
    await mouse(f.x, f.y);
    await mouse(f.x, f.y, { count: 2 });
    await sleep(350);
    check('C05: doble clic transfiere la pila', (await count(bankCells)) === 5, await count(bankCells));
    const w = await nth(bankCells, 0);
    await mouse(w.x, w.y); await sleep(300);
    await button('Retirar selección');
    await sleep(300);
    check('C05: Retirar selección devuelve una', (await count(bankCells)) === 4, await count(bankCells));
    await js(`(() => { const s=document.querySelector('.bank-column:nth-child(1) .bank-filter'); const c=${S}.content.items[${S}.character.inventory.slots.find(Boolean).itemId].category; s.value=c; s.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    await sleep(200);
    const visibleCat = await count(bagCells);
    await button('Enviar categoría');
    await sleep(300);
    check('C05: Enviar categoría vacía esa categoría', visibleCat > 0 && (await count(bagCells)) === 0, `${visibleCat} → ${await count(bagCells)}`);
    const banked = await js(`${S}.bank().length`);
    await key('Escape', 'Escape');
    await sleep(300);
    if (await js(panelBankOpen)) await key('Escape', 'Escape');
    await sleep(300);
    const paused = await locate('button', 'Guardar partida');
    if (paused) await key('Escape', 'Escape');
    await saveAndLoad();
    check('C05: cargar desde dentro reaparece fuera', !(await js(`__game.bank.inside`)), await js(`JSON.stringify(__game.place)`));
    check('C05: el banco sobrevive a guardar y cargar', (await js(`${S}.bank().length`)) === banked, `${banked} → ${await js(`${S}.bank().length`)}`);
    await shot('c05-tras-cargar');
  },

  async sobrepeso() {
    await newGame('QA Peso');
    await sleep(300);
    const speed = () => js(`${W}.player.speed`);
    const normal = await speed();
    await js(`(() => { const c=${S}.character, i=c.inventory; while (i.bagWeight<=i.maxWeight) c.pickUp(c.items.create('short_sword'),true); })()`);
    await sleep(300);
    const slow = await speed();
    check('Mochila: con sobrepeso camina al 50 %', Math.abs(slow - normal * 0.5) < 0.01, `${normal} → ${slow}`);
    await key('KeyB', 'b');
    await sleep(400);
    await shot('sobrepeso-mochila');
    await key('KeyB', 'b');
    await js(`(() => { const c=${S}.character; let g=0; c.addGold(100000); })()`);
    const before = await js(`({gold:${S}.character.gold, n:${S}.character.inventory.slots.filter(Boolean).length})`);
    const shop = await js(`(() => { const s=${S}, p=${W}.player, n=${W}.npcs.find(x=>x.merchantId); if(!n) return null; p.pos.x=n.pos.x+1; p.pos.y=n.pos.y; p.path=[]; s.character.emit({type:'openMerchant',merchantId:n.merchantId}); return n.merchantId; })()`);
    await until(`document.querySelector('.panel-shop')?.offsetParent`, 5000, 'tienda');
    await sleep(300);
    await shot('tienda-sobrepeso');
    const res = JSON.parse(await js(`JSON.stringify(${S}.buy(${JSON.stringify(shop)}, 0, 1))`));
    const after = await js(`({gold:${S}.character.gold, n:${S}.character.inventory.slots.filter(Boolean).length})`);
    check('Tienda: con la mochila llena se rechaza y no cobra', res.ok === false && after.gold === before.gold && after.n === before.n, `${JSON.stringify(res)} ${before.gold} → ${after.gold}`);
    const rect = (sel) => `document.querySelector('${sel}').getBoundingClientRect()`;
    for (const [w, h] of [[1280, 800], [1000, 640]]) {
      await resize(w, h);
      const o = await js(`(() => { const a=${rect('.panel-shop')}, b=${rect('.panel-inventory-trade')}; return {shopRight:Math.round(a.right),tradeLeft:Math.round(b.left),tradeRight:Math.round(b.right),tradeBottom:Math.round(b.bottom),vw:innerWidth,vh:innerHeight}; })()`);
      check(`Tienda ${w}×${h}: la mochila de venta no tapa la tienda y cabe`, o.tradeLeft >= o.shopRight && o.tradeRight <= o.vw && o.tradeBottom <= o.vh, JSON.stringify(o));
      await shot(`tienda-${w}`);
    }
    await resize(1280, 800);
    const trade = await js(`(() => { const p=[...document.querySelectorAll('.panel')].filter(e=>e.offsetParent!==null&&e.querySelector('.inv-grid')); return p.map(e=>({cls:e.className,equip:e.querySelectorAll('.equip-slot,.paperdoll,.equip-grid').length})); })()`);
    check('Tienda: la mochila de venta no muestra equipo', trade.length > 0 && trade.every((t) => t.equip === 0), JSON.stringify(trade));
  },

  async botin() {
    await newGame('QA Botin');
    const count = (id) => js(`(() => { const c=${S}.character, b=${S}.spoils(); const inBag=c.inventory.slots.filter(s=>s&&s.itemId===${JSON.stringify(id)}).reduce((n,s)=>n+s.quantity,0); const sp=(b?.items??[]).filter(i=>i.itemId===${JSON.stringify(id)}).reduce((n,s)=>n+s.quantity,0); return {inBag,sp,gold:c.gold,spGold:b?.gold??0}; })()`);
    await js(`(() => { const s=${S}, c=s.character; s.loadSpoils({id:1,gold:37,xp:0,kills:1,seconds:1,share:1,items:[c.items.create('fang',3)],participants:[]}); })()`);
    const start = await count('fang');
    await js(`${W}.player.health=0`);
    await until(deathShown, 10000, 'muerte');
    await button('Continuar como espectro');
    await until(`${W}.character.spectral.active && ${W}.player.alive`, 10000, 'espectro');
    await sleep(500);
    check('Botín: el espectro no puede recogerlo', (await js(`${S}.takeSpoils('all').ok`)) === false);
    await saveAndLoad();
    check('Botín: sigue espectro tras guardar y cargar', await js(`${W}.character.spectral.active`));
    const mid = await count('fang');
    check('Botín: sigue pendiente tras cargar', mid.sp === start.sp && mid.spGold === start.spGold, JSON.stringify(mid));
    const altar = await js(`(() => { const p=${W}.player.pos; return [...${W}.content.spectral.resurrectors].sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0]; })()`);
    await js(`(() => { const p=${W}.player, g=${W}.grid, a=g.center(g.nearestWalkable({x:${altar.x}+6,y:${altar.y}+6})); p.pos.x=a.x; p.pos.y=a.y; p.path=[]; })()`);
    await sleep(300);
    await button('Guiar al Alzador');
    await until(`!${W}.character.spectral.active`, 30000, 'forma viva');
    await sleep(500);
    await js(`${S}.takeSpoils('all')`);
    const end = await count('fang');
    check('Botín: al resucitar se cobra una sola vez', end.inBag === start.inBag + start.sp && end.sp === 0 && end.gold === start.gold + start.spGold, `${JSON.stringify(start)} → ${JSON.stringify(end)}`);
  },

  /** Nivel medido de cada bus de audio parado junto al inicio. Mide; no juzga si molesta. */
  async audio() {
    await newGame('QA Audio');
    await mouse(640, 300);
    await until(`window.__audio?.engine`, 10000, 'motor de audio');
    await js(`(() => { const e=__audio.engine; window.__an={}; for (const b of ['music','sfx','ambience','ui','master']) { const a=e.ctx.createAnalyser(); a.fftSize=8192; e.buses[b].connect(a); __an[b]=a; } })()`);
    const samples = [];
    for (let i = 0; i < 20; i++) {
      await sleep(1000);
      samples.push(await js(`(() => { const o={}; for (const [b,a] of Object.entries(__an)) { const t=new Float32Array(a.fftSize); a.getFloatTimeDomainData(t); let s=0; for (const v of t) s+=v*v; const f=new Float32Array(a.frequencyBinCount); a.getFloatFrequencyData(f); let k=0; for (let i=1;i<f.length;i++) if (f[i]>f[k]) k=i; o[b]={rms:Math.sqrt(s/t.length),peakHz:Math.round(k*a.context.sampleRate/a.fftSize)}; } return o; })()`));
    }
    const out = {};
    for (const b of Object.keys(samples[0])) {
      const r = samples.map((s) => s[b].rms);
      const db = (x) => (x > 0 ? Math.round(20 * Math.log10(x) * 10) / 10 : -Infinity);
      out[b] = { mediaDb: db(r.reduce((a, c) => a + c, 0) / r.length), minDb: db(Math.min(...r)), maxDb: db(Math.max(...r)), picoHz: samples.at(-1)[b].peakHz };
    }
    const mix = await js(`(() => { const a=__audio.ambience; const p=${W}.player.pos; return {mix:a.mix, pos:{x:p.x,y:p.y}, voices:__audio.engine.voices ?? null, local:!!__audio.localMusic}; })()`);
    console.log(JSON.stringify(out, null, 1));
    check('Audio: la interfaz calla si no se toca nada', !(out.ui.maxDb > -70), JSON.stringify(out.ui));
    console.log(JSON.stringify(mix));
    fs.writeFileSync(path.join(OUT, 'audio.json'), JSON.stringify({ out, mix }, null, 2));
  },

  /** Ventana: tamaño por defecto y lista de tamaños. El monitor puede recortarlos. */
  async ventana() {
    await cdp('Emulation.clearDeviceMetricsOverride');
    await newGame('QA Ventana');
    const size = () => js('({w:innerWidth,h:innerHeight,sw:screen.availWidth,sh:screen.availHeight})');
    const start = await size();
    check('Ventana: abre en 1080p o lo que quepa en el monitor', start.w >= Math.min(1920, start.sw - 40) && start.h >= Math.min(1080, start.sh - 80), JSON.stringify(start));
    await js('frankmanDesktop.setWindowSize(3440,1440)');
    await sleep(600);
    const wide = await size();
    check('Ventana: 3440×1440 o lo que quepa', wide.w >= start.w, JSON.stringify(wide));
    await js('frankmanDesktop.setWindowSize(1234,567)');
    await sleep(400);
    check('Ventana: rechaza tamaños fuera de la lista', (await size()).w === wide.w);
    await js('frankmanDesktop.setWindowSize(1920,1080)');
    await sleep(600);
  },

  /** Busca controles sin estilo y barras de scroll distintas en cada ventana abierta. */
  async estilos() {
    await newGame('QA Estilos');
    const audit = (where) => js(`(() => { const bad=[]; const vis=e=>e.offsetParent!==null;
      for (const e of document.querySelectorAll('select,input,textarea,button')) { if(!vis(e)||['checkbox','range','color','radio'].includes(e.type)) continue;
        const bg=getComputedStyle(e).backgroundColor; const hasImg=getComputedStyle(e).backgroundImage!=='none';
        if(!hasImg&&['rgb(255, 255, 255)','rgb(239, 239, 239)','rgb(240, 240, 240)'].includes(bg)) bad.push(e.tagName+'.'+e.className+':'+(e.textContent||'').trim().slice(0,20)); }
      for (const e of document.querySelectorAll('*')) { if(!vis(e)) continue; const c=getComputedStyle(e); if(!['auto','scroll'].includes(c.overflowY)||e.scrollHeight<=e.clientHeight) continue;
        const w=getComputedStyle(e,'::-webkit-scrollbar').width; if(w!=='8px') bad.push('scroll '+e.className+' '+w); }
      return bad; })()`).then((bad) => check(`Estilos ${where}`, bad.length === 0, bad.slice(0, 8).join(' ; ')));
    for (const [code, name] of [['KeyB', 'mochila'], ['KeyC', 'personaje'], ['KeyV', 'libro'], ['Digit3', 'compendio'], ['Minus', 'oficios'], ['KeyM', 'mapa']]) {
      await key(code, code.startsWith('Key') ? code.at(-1).toLowerCase() : code === 'Minus' ? '-' : '3');
      await sleep(400);
      await audit(name);
      await shot(`estilos-${name}`);
      await key(code, code.startsWith('Key') ? code.at(-1).toLowerCase() : code === 'Minus' ? '-' : '3');
    }
    await key('Escape', 'Escape');
    await button('Opciones');
    await sleep(300);
    for (const tab of ['Gráficos', 'Interfaz', 'Juego', 'Pantalla', 'Cámara', 'Controles', 'Sonido']) {
      if (await locate('button', tab)) await button(tab);
      await sleep(250);
      await audit(`opciones/${tab}`);
      if (tab === 'Pantalla') await shot('estilos-pantalla');
    }
  },

  /** B01: Esc cierra menús sin abandonar la pantalla completa. */
  async pantallaCompleta() {
    await cdp('Emulation.clearDeviceMetricsOverride');
    await newGame('QA Completa');
    const size = () => js('({h:innerHeight,sh:screen.height})');
    await key('F11', 'F11');
    await sleep(1200);
    const on = await size();
    check('B01: F11 entra en pantalla completa', on.h === on.sh, JSON.stringify(on));
    await key('Escape', 'Escape');
    await sleep(800);
    check('B01: Esc abre el menú y sigue en pantalla completa', (await size()).h === on.sh && (await locate('button', 'Guardar partida')));
    await key('Escape', 'Escape');
    await sleep(800);
    check('B01: Esc cierra el menú y sigue en pantalla completa', (await size()).h === on.sh);
    await key('F11', 'F11');
    await sleep(1200);
    check('B01: F11 sale de pantalla completa', (await size()).h < on.sh);
  },

  /** B02 y B03: casilla entera a la vista y cambio de modo con Espacio. */
  async camara() {
    await newGame('QA Camara');
    for (let i = 0; i < 4 && (await js('__game.view.rig.mode')) !== 'zone'; i++) await key('Space', ' ');
    check('B03: Espacio cambia el modo hasta la casilla', (await js('__game.view.rig.mode')) === 'zone');
    await sleep(2500);
    await shot('b02-casilla');
    const sky = await js(`document.querySelector('.wi-sky')?.textContent`);
    check('B09: se ve la parte del día y el tiempo', /^(Mañana|Tarde|Noche)( · .+)?$/.test(sky ?? ''), sky);
    const seen = await js(`(() => { const r=__game.view.rig, c=r.zoneCell, s=__game.view.scene, h=__game.view.heights; const inv=s.getTransformMatrix(); const w=innerWidth, H=innerHeight; const out=[];
      for (const [x,z] of [[c.x*c.size,c.z*c.size],[(c.x+1)*c.size,c.z*c.size],[c.x*c.size,(c.z+1)*c.size],[(c.x+1)*c.size,(c.z+1)*c.size]]) { const p=[x,h.sample(x,z),z,1]; const m=inv.m; const cx=m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12], cy=m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13], cw=m[3]*p[0]+m[7]*p[1]+m[11]*p[2]+m[15]; out.push([cx/cw,cy/cw]); } return out; })()`);
    check('B02: las cuatro esquinas de la casilla se ven sin tapar con la barra', seen.every(([x, y]) => Math.abs(x) < 1 && y > -0.7 && y < 1), JSON.stringify(seen.map((p) => p.map((v) => +v.toFixed(2)))));
    await js(`(() => { const r=__game.view.rig; return r.zoneCell; })()`);
  },

  /** B04: una pulsación larga sobre un recurso no cancela la recolección. */
  async recoleccion() {
    await newGame('QA Oficios');
    const node = await js(`(() => { const f=${W}.gatherField; return f.nodes.find(n=>n.kind==='ore_vein'); })()`);
    await js(`(() => { const p=${W}.player,g=${W}.grid,a=g.center(g.nearestWalkable({x:${node.x}+3,y:${node.y}})); p.pos.x=a.x; p.pos.y=a.y; p.path=[]; })()`);
    await sleep(1800);
    await shot('b04-veta');
    const at = await js(`(() => { const s=__game.view.scene, c=document.querySelector('canvas'), r=c.getBoundingClientRect();
      for (let y=40;y<r.height-40;y+=8) for (let x=20;x<r.width-20;x+=8) { const h=s.pick(x,y,m=>m.isEnabled()&&m.isPickable&&m.metadata?.gather?.id===${node.id}); if(h?.hit) return {x:x+r.x,y:y+r.y}; } return null; })()`);
    if (!at) throw new Error('La veta no está en pantalla');
    await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x, y: at.y });
    await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: at.x, y: at.y, button: 'left', buttons: 1, clickCount: 1 });
    await sleep(500);
    await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: at.x, y: at.y, button: 'left', clickCount: 1 });
    await until(`${W}.gathering !== null`, 6000, 'empezar a recoger');
    check('B04: un clic largo empieza a recoger a la primera', true);
    const l1 = await js(`${W}.gatherField.nodes.filter(n=>n.kind==='cedar').length`);
    check('B04: hay más árboles de nivel 1', l1 >= 12, l1);
  },

  /** B05: emotes al campo de texto; ventana de emotes sin burbuja. */
  async chat() {
    await newGame('QA Chat');
    await js(`(()=>{const i=document.querySelector('.chat-input');i.focus();i.value='hola ';i.setSelectionRange(5,5);})()`);
    await sleep(200);
    const emote = await js(`document.querySelector('.chat-emote').textContent`);
    await js(`document.querySelector('.chat-emote').click()`);
    await sleep(200);
    check('B05: el emote se escribe en el campo y no se envía', (await js(`document.querySelector('.chat-input').value`)) === `hola ${emote}` && !(await js(`[...document.querySelectorAll('.chat-line')].some(l=>l.textContent.includes('hola'))`)));
    await button('Enviar');
    await sleep(300);
    check('B05: Enviar lo manda', await js(`[...document.querySelectorAll('.chat-line')].some(l=>l.textContent.includes('hola'))`));
    await button('☺');
    await sleep(200);
    await js(`document.querySelector('.emote-play').click()`);
    await sleep(300);
    await shot('b06-emote');
    const near = await js(`(() => { const p=${W}.player.pos, h=__game.view.heights, m=__game.view.scene.getTransformMatrix().m, y=h.sample(p.x,p.y)+2;
      const cx=m[0]*p.x+m[4]*y+m[8]*p.y+m[12], cy=m[1]*p.x+m[5]*y+m[9]*p.y+m[13], cw=m[3]*p.x+m[7]*y+m[11]*p.y+m[15];
      const sx=(cx/cw+1)/2*innerWidth, sy=(1-cy/cw)/2*innerHeight, b=document.querySelector('.chat-bubble').getBoundingClientRect();
      return Math.hypot(b.x+b.width/2-sx, b.y+b.height/2-sy); })()`);
    check('B06: el emote queda junto a la cabeza del personaje', near < 120, `${Math.round(near)} px`);
    check('B06: el emote sale sobre el personaje, sin burbuja', await js(`(()=>{const b=document.querySelector('.chat-bubble');return !b.hidden&&b.classList.contains('emote-only')&&getComputedStyle(b).backgroundColor==='rgba(0, 0, 0, 0)';})()`));
  },

  /** Poción de recuerdo: del campo y de un interior a la última Piedra Pintada. */
  async recuerdo() {
    await newGame('QA Recuerdo');
    const near = () => js(`(() => { const p=${W}.player.pos, s=__game.place; return {x:p.x,y:p.y,scene:s.scene}; })()`);
    const start = await near();
    const use = () => js(`(() => { const c=${S}.character; c.itemCooldowns={}; c.pickUp(c.items.create('seco_del_regreso'),true); const it=c.inventory.slots.find(i=>i?.itemId==='seco_del_regreso'); return ${S}.useItem(it.uid).ok; })()`);
    await js(`(() => { const p=${W}.player; p.pos.x=150; p.pos.y=100; p.path=[]; })()`);
    await sleep(300);
    check('Recuerdo: se puede usar', await use());
    await sleep(500);
    let now = await near();
    check('Recuerdo: vuelve a la Piedra Pintada', Math.hypot(now.x - start.x, now.y - start.y) < 3, JSON.stringify(now));
    await js('__game.bank.enter()');
    await until('__game.bank.inside');
    await sleep(500);
    await use();
    await sleep(900);
    now = await near();
    check('Recuerdo: también saca del banco', !(await js('__game.bank.inside')) && Math.hypot(now.x - start.x, now.y - start.y) < 3, JSON.stringify(now));
    check('Recuerdo: se fabrica en el Alambique', await js(`${S}.content.professions.recipes.seco_del_regreso?.station==='still'`));
    await shot('recuerdo');
  },

  /** Barra: separar en secciones, arrastrar, fijar y conservar al recargar. */
  async barra() {
    await newGame('QA Barra');
    const tool = (t) => js(`document.querySelector('.hud-bar-tool[title="${t}"]')?.click() ?? false`);
    await tool('Separar la barra en secciones');
    await sleep(400);
    const inRoot = () => js(`['.hud-frame','.hud-bar-centre','.hud-menu'].every(s=>document.querySelector(s).parentElement.classList.contains('game-hud'))`);
    check('Barra: se separa en tres secciones', await inRoot());
    await tool('Soltar la barra para moverla');
    await sleep(300);
    const rect = () => js(`(() => { const r=document.querySelector('.hud-frame').getBoundingClientRect(); return {x:r.left,y:r.top,w:r.width,h:r.height}; })()`);
    const r0 = await rect();
    const cx = r0.x + r0.w / 2, cy = r0.y + r0.h / 2;
    await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx, y: cy });
    await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', buttons: 1, clickCount: 1 });
    await sleep(100);
    for (let i = 1; i <= 5; i++) {
      await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx + 40 * i, y: cy - 60 * i, button: 'left', buttons: 1 });
      await sleep(40);
    }
    await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx + 200, y: cy - 300, button: 'left', clickCount: 1 });
    await sleep(300);
    const r1 = await rect();
    check('Barra: el personaje se arrastra por su cuenta', Math.abs(r1.x - r0.x - 200) < 5 && Math.abs(r1.y - r0.y + 300) < 5, JSON.stringify([r0, r1]));
    await shot('barra-separada');
    await tool('Fijar la barra');
    await sleep(300);
    check('Barra: fijada, las asas se ocultan', await js(`getComputedStyle(document.querySelector('.hud-frame > .hud-grip')).display==='none'`));
    await newGame('QA Barra Dos');
    await sleep(800);
    const r2 = await rect();
    check('Barra: se conserva al volver a entrar', await inRoot() && Math.abs(r2.x - r1.x) < 5, JSON.stringify(r2));
    await tool('Unir la barra');
    await sleep(300);
    check('Barra: se puede volver a unir', await js(`document.querySelector('.hud-frame').parentElement.classList.contains('hud-bar-main')`));
  },

  /** Castillo: el modelo de Blender cargado y en su sitio. */
  async castillo() {
    await newGame('QA Castillo');
    await until(`!!__game.view.scene.getTransformNodeByName('landmark:castillo')`, 15000, 'modelo cargado');
    check('Castillo: el modelo está en la escena', true);
    check('Castillo: no se puede atravesar', !(await js(`${W}.grid.walkable({x:100,y:82})`)));
    await js(`(() => { const p=${W}.player, g=${W}.grid, a=g.center(g.nearestWalkable({x:100,y:62})); p.pos.x=a.x; p.pos.y=a.y; p.path=[]; })()`);
    await js('void __game.view.rig.setFraming("default")');
    await sleep(2500);
    await js('void __game.view.rig.jumpTo(32)');
    await sleep(1000);
    const zone = await js('JSON.stringify(__game.world.currentZone?.levelMin ?? null)');
    check('Castillo: en zona de nivel bajo', Number(zone) <= 10, zone);
    await shot('castillo');
  },

  async cripta() {
    await newGame('QA Cripta');
    await js(`__game.crypt.enter(0,'above')`);
    await until(`__game.crypt.floor===0`, 10000, 'dentro de la cripta');
    await sleep(800);
    await shot('t02-cripta');
    await js(`${W}.player.health=0`);
    await until(deathShown, 10000, 'muerte en cripta');
    await button('Continuar como espectro');
    await until(`${W}.character.spectral.active && ${W}.player.alive`, 10000, 'espectro');
    await sleep(600);
    await shot('t02-cripta-espectro');
    check('T02 cripta: el espectro sale al exterior', (await js(`__game.crypt.floor`)) == null, await js(`JSON.stringify(__game.place)`));
    check('T02 cripta: sigue siendo espectro', await js(`${W}.character.spectral.active`));
  },
};

const wanted = process.argv.slice(2);
try {
  for (const [name, run] of Object.entries(scenarios)) {
    if (wanted.length && !wanted.includes(name)) continue;
    console.log(`\n== ${name}`);
    try {
      await run();
    } catch (e) {
      check(`${name}: terminó el recorrido`, false, e.message);
      await shot(`error-${name}`).catch(() => {});
      if (e instanceof BootError) break;
    }
  }
  check('Sin errores en la consola', consoleErrors.length === 0, consoleErrors.slice(0, 5).join(' | '));
  fs.writeFileSync(path.join(OUT, 'resultado.json'), JSON.stringify({ date: new Date().toISOString(), results, consoleErrors }, null, 2));
} finally {
  app.kill();
  await server.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} comprobaciones. Capturas en ${OUT}/`);
process.exit(failed ? 1 : 0);
