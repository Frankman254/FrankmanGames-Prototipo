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

// QA_SESION permite dos recorridos a la vez, cada uno con su puerto, perfil y capturas.
const SESSION = process.env.QA_SESION ?? '';
const OUT = `work/qa${SESSION}`;
const PORT = SESSION ? 9340 + (Number(SESSION) || 1) : 9333;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

await buildMain();
const server = await createServer({ server: { strictPort: false }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
const app = spawn(String(electronPath), ['.', `--remote-debugging-port=${PORT}`, `--user-data-dir=${path.resolve(`work/qa-electron-profile${SESSION}`)}`, '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'], {
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

/** Clic real sobre el suelo junto a un punto del mundo (con el mismo pick del juego). */
async function clickGroundNear(wx, wy, within = 1.5) {
  // Proyecta el punto a la pantalla y comprueba con el mismo pick del juego que el clic cae allí.
  const p = await js(`(() => { const v=__game.view, s=v.scene, cam=v.rig.camera, c=document.querySelector('canvas'), r=c.getBoundingClientRect();
    const V=cam.position.constructor, M=cam.getViewMatrix().constructor;
    const w=new V(${wx}, v.heights.sample(${wx},${wy}), ${wy});
    const e=s.getEngine(); const vp=cam.viewport.toGlobal(e.getRenderWidth(), e.getRenderHeight());
    const sp=V.Project(w, M.Identity(), s.getTransformMatrix(), vp);
    const k=r.width/e.getRenderWidth(); const x=sp.x*k, y=sp.y*k;
    const g=v.pickGround(x,y); if(!g||Math.hypot(g.x-${wx},g.y-${wy})>${within}) return { fallo: { x, y, g } };
    return { x: x+r.x, y: y+r.y }; })()`);
  if (!p || p.fallo) throw new Error(`Suelo fuera de pantalla: ${wx},${wy} · ${JSON.stringify(p)}`);
  const top = await js(`(()=>{ const e=document.elementFromPoint(${p.x},${p.y}); return e ? e.tagName+"."+e.className : null; })()`);
  if (top && !top.startsWith("CANVAS")) console.log("     el clic cae en", top);
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
const fallShown = `[...document.querySelectorAll('button')].some(b=>b.textContent.trim().startsWith('Reaparecer en'))`;
const deathShown = `[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Continuar como espectro')`;

async function newGame(name, { island = false } = {}) {
  await cdp('Page.navigate', { url });
  await sleep(1500);
  // La carga anterior se corta al navegar; sus errores no cuentan.
  consoleErrors.length = 0;
  try {
    await until(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Nueva partida')`, 30000, 'título');
  } catch {
    throw new BootError(`El juego no arranca. Consola: ${consoleErrors.slice(-3).join(' | ') || 'sin errores'}`);
  }
  await button('Nueva partida');
  await until(`document.querySelector('.name-input')`);
  await js(`(()=>{const i=document.querySelector('.name-input');i.value=${JSON.stringify(name)};i.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  // Los recorridos parten del pueblo; la isla de inicio tiene el suyo (`iguanera`).
  if (!island) await js(`localStorage.setItem('frankmangames.piedras.'+${JSON.stringify(name)}, JSON.stringify({known:['raspadura'],respawn:'raspadura'}))`);
  else await js(`localStorage.removeItem('frankmangames.piedras.'+${JSON.stringify(name)})`);
  await button('Empezar');
  await until(`${S} && ${W}.character.name===${JSON.stringify(name)}`, 20000, 'partida');
  await sleep(800);
}

/** Paneles a la vista que se salen de la pantalla o tienen scroll horizontal. */
const uiFaults = () => js(`(() => { const out=[];
  for (const e of document.querySelectorAll('.panel, .hud-actionbar, .minimap, .chat')) { if(!e.offsetParent) continue;
    const r=e.getBoundingClientRect(), n=e.className.split(' ').slice(0,2).join('.');
    if (r.left<-1||r.top<-1||r.right>innerWidth+1||r.bottom>innerHeight+1) out.push(n+' fuera');
    for (const c of [e,...e.querySelectorAll('.panel-body,.opt-pages,.inv-grid,.spell-list')]) if (c.scrollWidth>c.clientWidth+1&&getComputedStyle(c).overflowX!=='visible') out.push(n+' scroll horizontal ('+c.className+')');
  } return out; })()`);

const scenarios = {
  // Todas las ventanas a una resolución; capturas para mirarlas y comprobación de que caben.
  async interfaz() {
    // Título y creación, a 1080p, antes de entrar.
    await resize(1920, 1080);
    await cdp('Page.navigate', { url });
    await until(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Nueva partida')`, 30000, 'título');
    await sleep(800);
    await shot('ui-titulo');
    await button('Nueva partida');
    await until(`document.querySelector('.name-input')`);
    await sleep(300);
    await shot('ui-creacion');
    await newGame('QA Interfaz');
    const sizes = [[1920, 1080, '1080p'], [1366, 768, '768p'], [3440, 1440, 'ultra']];
    const only = process.env.QA_UI_SIZE;
    const isOpen = (sel) => js(`!!document.querySelector('${sel}')?.offsetParent`);
    const toggle = async (code, name, sel) => {
      await key(code, name);
      await sleep(250);
      if (sel && !(await isOpen(sel))) throw new Error(`No abrió ${sel}`);
    };
    const hover = async (sel) => {
      const p = await locate(sel);
      if (!p) throw new Error(`No está visible: ${sel}`);
      await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 500 });
      await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y });
      await sleep(350);
    };
    for (const [w, h, n] of sizes) {
      if (only && only !== n) continue;
      await resize(w, h);
      await sleep(300);
      const seen = async (what) => {
        await shot(`ui-${n}-${what}`);
        const f = await uiFaults();
        check(`Interfaz ${n}, ${what}: cabe`, f.length === 0, f.join(' | '));
      };
      await seen('hud');
      await toggle('KeyC', 'c', '.panel-character');
      await toggle('KeyV', 'v', '.panel-spellbook');
      await toggle('KeyB', 'b', '.panel-inventory');
      await hover('.spell-card');
      await seen('tres-ventanas');
      const cut = await js(`(() => { const box=document.querySelector('.panel-character').getBoundingClientRect(); return [...document.querySelectorAll('.panel-character .stat-row b, .panel-character td')].filter(b=>b.getBoundingClientRect().right>box.right+1).length; })()`);
      check(`Interfaz ${n}: ninguna cifra de personaje cortada`, cut === 0, `${cut} cortadas`);
      await hover('.inv-grid .cell.filled');
      await shot(`ui-${n}-tooltip-objeto`);
      await toggle('KeyC', 'c');
      await toggle('KeyV', 'v');
      await toggle('KeyB', 'b');
      for (const [code, name, sel, what] of [['KeyN', 'n', '.panel-journal', 'diario'], ['Digit3', '3', '.panel-compendium', 'compendio'], ['Minus', '-', '.panel-professions', 'oficios'], ['KeyM', 'm', '.panel-worldmap', 'mapa']]) {
        await toggle(code, name, sel);
        await seen(what);
        await toggle(code, name);
      }
      await key('Escape', 'Escape');
      await sleep(300);
      await seen('pausa');
      await button('Opciones');
      await sleep(300);
      for (const tab of ['Gráficos', 'Interfaz', 'Juego']) {
        await click('.opt-tab', tab);
        await sleep(150);
        await seen(`opciones-${tab}`);
      }
      await js(`(()=>{const i=document.querySelector('.opt-search');i.value='sombras';i.dispatchEvent(new Event('input',{bubbles:true}));})()`);
      await sleep(150);
      const rows = await js(`[...document.querySelectorAll('.opt-row')].filter(r=>r.offsetParent).length`);
      check('Opciones: el buscador filtra', rows >= 1 && rows <= 3, `${rows} filas`);
      await shot(`ui-${n}-opciones-busqueda`);
      await click('.opt-tab', 'Gráficos');
      await click('.opt-tab', 'Controles');
      await button('Configurar…');
      await sleep(250);
      await seen('atajos');
      await button('Volver');
      await sleep(200);
      await button('Volver');
      await sleep(200);
      await button('Guardar partida');
      await sleep(300);
      await seen('ranuras');
      await button('Volver');
      await sleep(200);
      await key('Escape', 'Escape');
      await sleep(300);
      // Tienda, con la mochila de vender al lado.
      await js(`(() => { const s=${S}, p=${W}.player, n=${W}.npcs.find(x=>x.merchantId); p.pos.x=n.pos.x+1; p.pos.y=n.pos.y; p.path=[]; s.character.emit({type:'openMerchant',merchantId:n.merchantId}); })()`);
      await until(`document.querySelector('.panel-shop')?.offsetParent`, 5000, 'tienda');
      await sleep(300);
      await seen('tienda');
      await key('Escape', 'Escape');
      await sleep(300);
      if (await locate('.modal')) { await key('Escape', 'Escape'); await sleep(200); }
      // Diálogo, por el mismo aviso que dispara hablar con alguien.
      await js(`${S}.character.emit({type:'talkNpc',npcId:${W}.npcs.find(x=>x.npcId).npcId})`);
      await until(`document.querySelector('.dialogue')?.offsetParent`, 5000, 'diálogo');
      await sleep(250);
      await seen('dialogo');
      await key('Escape', 'Escape');
      await sleep(300);
      if (await locate('.modal')) { await key('Escape', 'Escape'); await sleep(200); }
    }
    // Cada tema con las ventanas abiertas: el marco común no debe depender de uno.
    if (!only || only === '1080p') {
      await resize(1920, 1080);
      await toggle('KeyC', 'c', '.panel-character');
      await toggle('KeyV', 'v', '.panel-spellbook');
      await toggle('KeyB', 'b', '.panel-inventory');
      for (const theme of ['fuego', 'agua', 'naturaleza', 'claro', 'contraste']) {
        await js(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
        await sleep(200);
        await shot(`ui-tema-${theme}`);
      }
      await js(`document.documentElement.dataset.theme='pergamino'`);
      await toggle('KeyC', 'c');
      await toggle('KeyV', 'v');
      await toggle('KeyB', 'b');
    }
    await resize(1280, 800);
  },

  // Clic en el hechizo de la barra: se ve el daño y a dónde cae cada uno, sin lanzarlo.
  async previa() {
    await newGame('QA Previa');
    await resize(1920, 1080);
    await js(`(() => { const c=${S}.character; c.gainXp(5000000); for (const id of ['storm_swap','lightning_step','gust','charge']) if (c.spellbook.rank(id)===0) c.spellbook.learn(id);
      c.spellbook.hotbar[0]='storm_swap'; c.spellbook.hotbar[1]='lightning_step'; c.spellbook.hotbar[2]='gust'; c.spellbook.hotbar[3]='charge'; c.resource=c.maxResource; })()`);
    await sleep(300);
    // Enemigos quietos cerca, dentro de la vista.
    await js(`(() => { const p=${W}.player.pos; globalThis.__qa=[[4,1.5],[3,-2],[5.5,-0.5]].map(([x,y])=>{ const e=${W}.spawnEnemy('melee',{x:p.x+x,y:p.y+y}); e.state='stagger'; e.stateTime=-1e9; return e.id; }); })()`);
    await sleep(600);
    const state = () => js(`(() => { const e=${W}.enemies.get(__qa[0]); return {p:${W}.player.pos, e:e.pos, hp:e.health, cd:Object.keys(${W}.player.cooldowns).filter(k=>${W}.player.cooldowns[k]>0).length}; })()`);
    const moveOverEnemy = async (id) => {
      const at = await js(`(() => { const s=__game.view.scene, c=document.querySelector('canvas'), r=c.getBoundingClientRect();
        for (let y=40;y<r.height-140;y+=10) for (let x=20;x<r.width-20;x+=10) { const h=s.pick(x,y,m=>m.isEnabled()&&m.isPickable); if (h?.pickedMesh?.metadata?.enemyId===${id}) return {x:x+r.x,y:y+r.y}; } return null; })()`);
      if (!at) throw new Error('Enemigo fuera de pantalla');
      await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x, y: at.y });
      await sleep(350);
      return at;
    };
    const slot = (i) => js(`(() => { const r=document.querySelectorAll('.hud-slot-rows .hot-slot')[${i}].getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
    const clickSlot = async (i) => { const p = await slot(i); await mouse(p.x, p.y); await sleep(200); };
    const cards = () => js(`[...document.querySelectorAll('.aim-card')].filter(c=>!c.hidden).map(c=>c.textContent)`);
    const id0 = await js(`__qa[0]`);

    // Intercambio.
    const before = await state();
    await clickSlot(0);
    const at = await moveOverEnemy(id0);
    await shot('previa-intercambio');
    const c1 = await cards();
    const pv = await js(`${W}.previewSpell('storm_swap',{point:${W}.enemies.get(__qa[0]).pos,targetId:__qa[0]})`);
    check('Previa: el intercambio dice a dónde cae el lanzador', !!pv.casterTo && c1.some((t) => t.includes('Aquí caerías')), JSON.stringify(c1));
    const during = await state();
    check('Previa: apuntar no lanza nada', during.p.x === before.p.x && during.e.x === before.e.x && during.cd === before.cd);
    check('Previa: se ve el fantasma del lanzador', await js(`__game.view.scene.meshes.some(m=>m.name.includes('aimLanding')&&m.isEnabled())`));
    await mouse(at.x, at.y);
    await sleep(900);
    const after = await state();
    check('Previa: al confirmar cae donde se vio', Math.hypot(after.p.x - pv.casterTo.x, after.p.y - pv.casterTo.y) < 0.1, `${JSON.stringify(after.p)} ~ ${JSON.stringify(pv.casterTo)}`);
    check('Previa: confirmar no deja fantasmas', !(await js(`__game.view.scene.meshes.some(m=>m.name.includes('aimLanding'))`)));

    // Salto: fantasma al cursor; Esc cancela.
    await js(`${W}.player.cooldowns={}; ${W}.player.gcd=0`);
    await clickSlot(1);
    await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1250, y: 420 });
    await sleep(350);
    await shot('previa-salto');
    check('Previa: el salto enseña su destino', (await cards()).join().includes('caerías'));
    await key('Escape', 'Escape');
    await sleep(250);
    check('Previa: Esc la quita', (await cards()).length === 0);
    if (await locate('.modal')) { await key('Escape', 'Escape'); await sleep(200); }

    // Área: varias fichas con daño, y el empujón.
    await js(`${W}.player.cooldowns={}; ${W}.player.gcd=0; ${W}.player.pos={x:${W}.enemies.get(__qa[0]).pos.x-3.5,y:${W}.enemies.get(__qa[0]).pos.y-0.5}`);
    await sleep(300);
    await clickSlot(2);
    await moveOverEnemy(id0);
    await shot('previa-area');
    const c3 = await cards();
    check('Previa: el área enseña daño a los alcanzados', c3.length >= 1 && c3.some((t) => /\d/.test(t)), JSON.stringify(c3));
    await key('Escape', 'Escape');
    await sleep(200);

    // Modo por defecto: la tecla apunta, soltarla no lanza y otra pulsación confirma.
    await js(`${W}.player.cooldowns={}; ${W}.player.gcd=0`);
    await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1250, y: 420 });
    const p0 = await js(`${W}.player.pos`);
    await key('KeyW', 'w');
    await sleep(300);
    const p1 = await js(`${W}.player.pos`);
    check('Tecla: soltarla no lanza y se ve la previa', p1.x === p0.x && p1.y === p0.y && (await cards()).join().includes('caerías'), JSON.stringify(await cards()));
    await key('KeyW', 'w');
    await sleep(600);
    const p2 = await js(`${W}.player.pos`);
    check('Tecla: la segunda pulsación confirma', Math.hypot(p2.x - p0.x, p2.y - p0.y) > 0.5 && (await cards()).length === 0, `${JSON.stringify(p0)} -> ${JSON.stringify(p2)}`);
    await resize(1280, 800);
  },

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
    await until(fallShown, 10000, 'primera caída');
    await shot('pulso-caida');
    check('Pulso: una derrota quita 20 y no mata', (await js(`${S}.energy.value`)) === 80 && !(await js(`${W}.character.spectral.active`)), await js(`${S}.energy.value`));
    await button(await js(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim().startsWith('Reaparecer en')).textContent.trim()`));
    await until(`!(${fallShown}) && ${W}.player.alive`, 10000, 'reaparecer');
    await sleep(500);
    check('Pulso: tras caer sigue vivo, sin fantasma', !(await js(`__game.view.scene.meshes.some(m=>m.name.startsWith('ghost:')&&m.isEnabled())`)));
    await js(`${S}.energy.value=20`);
    await js(`${W}.player.health=0`);
    await until(deathShown, 10000, 'pantalla de muerte');
    await shot('t02-muerte');
    await button('Continuar como espectro');
    await until(`${W}.character.spectral.active && ${W}.player.alive`, 10000, 'forma espectral');
    await sleep(700);
    await shot('t02-espectro');
    const pulse = () => js(`${S}.energy.value`);
    const ghost = () => js(`__game.view.scene.meshes.some(m=>m.name.startsWith('ghost:')&&m.isEnabled())`);
    check('Pulso: morir lo deja en 0', (await pulse()) === 0, await pulse());
    check('Espectro: se ve el fantasma, no el personaje', await ghost());
    await sleep(2000);
    check('Pulso: en forma espectral no sube', (await pulse()) === 0, await pulse());
    check('T02: guía visible con botón', await locate('button', 'Guiar al Alzador'));
    check('Fantasma: no habla con nadie', (await js(`${S}.talk(Object.keys(${S}.content.npcs)[0])`)) === null);
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
    check('Pulso: al revivir vuelve con 20 y sube muy despacio', risen >= 20 && risen < 20.2, risen);
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
    await js(`${S}.energy.value=20`);
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
        const w=getComputedStyle(e,'::-webkit-scrollbar').width; if(w!=='6px') bad.push('scroll '+e.className+' '+w); }
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
    
    await js(`(() => { const p=${W}.player; p.pos.x=100; p.pos.y=99; p.path=[]; })()`);
    await js('void __game.view.rig.setFraming("default")');
    await sleep(1800);
    await js('void __game.view.rig.jumpTo(30)');
    await sleep(1500);
    await shot('castillo-porton');
    await clickMesh('castle-gate');
    await until('__game.houses.inside', 20000, 'entrar por el portón');
    check('Castillo: el portón lleva al salón', (await js('__game.houses.place.name')).includes('salón'));
    await sleep(900);
    await shot('castillo-salon');
    // Las gradas del estrado se suben andando, sin saltar.
    await js(`${W}.commandMove({x:14.5,y:19.5})`);
    await until(`Math.hypot(${W}.player.pos.x-14.5,${W}.player.pos.y-19.5)<0.4`, 15000, 'llegar al estrado');
    const onDais = await js(`__game.view.heights.sample(${W}.player.pos.x,${W}.player.pos.y)`);
    check('Castillo: se sube al estrado por las gradas', Number(onDais) > 0.6, onDais);
    await sleep(500);
    await shot('castillo-estrado');
    await js(`${W}.commandMove({x:12,y:2.4})`);
    await until(`${W}.player.path.length===0 && ${W}.player.pos.y<3`, 15000, 'volver a la puerta');
    await sleep(1500);
    await clickMesh('house-exit');
    await until('!__game.houses.inside', 15000, 'salir del castillo');
    check('Castillo: al salir vuelve fuera del portón', (await js(`${W}.player.pos.y`)) > 95, await js(`${W}.player.pos.y`));
  },

  /** Casas: entrar por la puerta con un clic real, límites, salir y volver delante. */
  async casa() {
    await newGame('QA Casa');
    await js(`(() => { const p=${W}.player; p.pos.x=112; p.pos.y=131; p.path=[]; })()`);
    await js('void __game.view.rig.setFraming("default")');
    await sleep(1500);
    const doors = await js(`__game.view.scene.meshes.filter(m=>m.name==='house-door').length`);
    check('Casa: cada casa tiene su puerta', doors >= 6, doors);
    await clickMesh('house-door');
    await until('__game.houses.inside', 20000, 'entrar en la casa');
    check('Casa: un clic en la puerta lleva dentro al llegar', true, await js('JSON.stringify(__game.place)'));
    await sleep(900);
    await shot('casa-interior');
    check('Casa: los muebles no se atraviesan', !(await js(`${W}.grid.walkable({x:7,y:6.6})`)));
    await clickMesh('house-exit');
    await until('!__game.houses.inside', 15000, 'salir de la casa');
    const at = await js(`({x:${W}.player.pos.x,y:${W}.player.pos.y,back:__game.houses.returnPoint})`);
    check('Casa: al salir aparece delante de su puerta', Math.hypot(at.x - at.back.x, at.y - at.back.y) < 1, JSON.stringify(at));
    await sleep(500);
    await shot('casa-exterior');
  },

  async modelos() {
    await newGame('QA Modelos');
    const place = (x, y) => js(`(() => { const p=${W}.player, g=${W}.grid, a=g.center(g.nearestWalkable({x:${x},y:${y}})); p.pos.x=a.x; p.pos.y=a.y; p.prevPos.x=a.x; p.prevPos.y=a.y; p.path=[]; })()`);
    const nodes = (model) => `__game.view.scene.transformNodes.filter(n=>n.name==='landmark:${model}').length`;
    await until(`${nodes('casa')}>0 && ${nodes('trapiche')}>0 && ${nodes('farola')}>0`, 20000, 'modelos del mapa');
    check('Modelos: casas en el mapa', Number(await js(nodes('casa'))) === 16, await js(nodes('casa')));
    check('Modelos: casa dorada', Number(await js(nodes('casa_dorada'))) === 1, await js(nodes('casa_dorada')));
    check('Modelos: farolas, pozo y trapiche', Number(await js(nodes('farola'))) === 8 && Number(await js(nodes('pozo'))) === 1 && Number(await js(nodes('trapiche'))) === 1);
    const body = `__game.view.scene.meshes.filter(m=>m.name.startsWith('player:')&&m.isEnabled()&&m.getTotalVertices()>0).length`;
    await until(`${body}>0`, 15000, 'modelo del jugador');
    check('Modelos: el jugador usa el archivo', true, await js(body));
    await place(127, 130);
    await js('void __game.view.rig.setFraming("default")');
    await sleep(1800);
    await js('void __game.view.rig.jumpTo(18)');
    await sleep(900);
    await shot('modelos-pueblo');
    await js('void __game.view.rig.jumpTo(7)');
    await sleep(900);
    await shot('modelos-heroe');
    await place(127, 141);
    await sleep(900);
    await shot('modelos-pnj');
    await js(`${W}.commandMove({x:${W}.player.pos.x+12,y:${W}.player.pos.y})`);
    await sleep(500);
    check('Modelos: corre con su clip', (await js('__game.view.player.model.state')) === 'run', await js('__game.view.player.model.state'));
    await shot('modelos-correr');
    await js(`${W}.player.path=[]`);
    // Puerta: se abre al llegar, se cierra al irse.
    const door = `__game.view.scene.transformNodes.concat(__game.view.scene.meshes).filter(n=>n.name.endsWith('FG_Casa_Puerta')).map(n=>Math.round(Math.abs(n.rotationQuaternion?.y ?? 0)*100))`;
    await place(110, 141.8);
    await js('void __game.view.rig.jumpTo(13)');
    await sleep(1600);
    check('Modelos: puerta abierta al acercarse', (await js(`${door}.some(v=>v>30)`)), await js(`${door}.join()`));
    await shot('modelos-puerta');
    await place(127, 130);
    await sleep(1400);
    check('Modelos: puerta cerrada al irse', (await js(`${door}.every(v=>v<10)`)), await js(`${door}.join()`));
    // Trapiche en marcha.
    const rotor = `__game.view.scene.transformNodes.concat(__game.view.scene.meshes).find(n=>n.name.endsWith('FG_Trapiche_Yunta')).rotationQuaternion.w`;
    const a0 = await js(rotor);
    await sleep(400);
    check('Modelos: la yunta del trapiche gira', Math.abs(a0 - (await js(rotor))) > 0.001);
    await place(124, 148);
    await js('void __game.view.rig.jumpTo(16)');
    await sleep(1500);
    await shot('modelos-banco');
    await place(160, 110);
    await js('void __game.view.rig.jumpTo(24)');
    await sleep(1500);
    await shot('modelos-trapiche');
  },

  async mapa() {
    await newGame('QA Mapa');
    // Aquí se mira el mapa: que los monstruos no interrumpan el recorrido.
    await js(`window.__qaVida=setInterval(()=>{ ${W}.player.health=${W}.player.maxHealth; ${W}.player.invulnerable=5; },50)`);
    const view = async (name, x, y, pitch, dist = 32) => {
      await js(`(() => { const p=${W}.player; p.pos.x=${x}; p.pos.y=${y}; p.path=[]; const r=__game.view.rig; r.pitchDeg=${pitch}; r.distance=${dist}; })()`);
      await sleep(2200);
      const stats = await js(`({ vertices: __game.view.terrain.vertexCount, levels: __game.view.terrain.levels.join(''), plantas: __game.view.vegetation.drawnInstances, total: __game.view.vegetation.instanceCount, fps: Math.round(__game.view.scene.getEngine().getFps()) })`);
      await shot(`mapa-${name}`);
      console.log(`     ${name}: ${JSON.stringify(stats)}`);
      return stats;
    };
    const pueblo = await view('pueblo', 124, 118, 50, 26);
    check('Mapa: el terreno pierde detalle lejos del jugador', new Set(pueblo.levels).size >= 2, pueblo.levels);
    check('Mapa: no se dibuja toda la vegetación a la vez', pueblo.plantas < pueblo.total * 0.8, `${pueblo.plantas} de ${pueblo.total}`);
    await view('iglesia', 128, 98, 38, 26);
    await view('trapiche', 170, 96, 40, 20);
    await view('fortin', 100, 106, 40, 32);
    await view('azuero', 165, 95, 42, 28);
    await view('chame', 50, 150, 42, 28);
    await view('boquete', 200, 45, 42, 28);
    await view('cerro-punta', 170, 190, 42, 28);
    await view('horizonte', 124, 118, 12, 32);
    await view('horizonte-chame', 40, 200, 12, 32);
    await js(`(() => { __game.view.atmosphere.fixedTime = 0.72; })()`);
    await view('atardecer', 124, 118, 14, 32);
    await js('clearInterval(window.__qaVida); __game.view.atmosphere.fixedTime = null');
    check('Mapa: sin errores de consola', consoleErrors.length === 0, consoleErrors.slice(-1)[0] ?? '');
  },
  /** Ida y vuelta caminando por páginas: tirones, memoria y que el suelo exista donde se pisa. */
  async viaje() {
    await newGame('QA Viaje');
    await js(`window.__qaVida=setInterval(()=>{ ${W}.player.health=${W}.player.maxHealth; ${W}.player.invulnerable=5; },50)`);
    await js(`(()=>{ const t=window.__qaF={frames:[],last:performance.now()}; const tick=()=>{const n=performance.now(); t.frames.push(n-t.last); t.last=n; requestAnimationFrame(tick)}; requestAnimationFrame(tick); })()`);
    const snap = async (name) => {
      const r = await js(`(()=>{ const t=window.__qaF, f=t.frames.slice().sort((a,b)=>a-b); const s=__game.view.stream.stats; t.frames=[]; const n=f.length||1;
        return { fotogramas:f.length, ms50:+(f[n>>1]??0).toFixed(1), ms99:+(f[Math.floor(n*.99)]??0).toFixed(1), peor:+(f[n-1]??0).toFixed(1), paginas:__game.view.terrain.pageCount, mallas:__game.view.scene.meshes.length, materiales:__game.view.scene.materials.length, texturas:__game.view.scene.textures.length, plantas:__game.view.vegetation.instanceCount, enemigos:${W}.enemies.list.length, memMB:Math.round(performance.memory.usedJSHeapSize/1048576), genMedia:+(s.totalMs/Math.max(1,s.generated)).toFixed(0), genPeor:+s.worstMs.toFixed(0) }; })()`);
      console.log(`     ${name}: ${JSON.stringify(r)}`);
      return r;
    };
    // A 40 m/s, como una montura rápida: exige más que caminar.
    const go = async (x, y, stepM = 0.65) => {
      await js(`(()=>{ const p=${W}.player; window.__qaGo&&clearInterval(window.__qaGo); window.__qaGo=setInterval(()=>{ const dx=${x}-p.pos.x, dy=${y}-p.pos.y, d=Math.hypot(dx,dy); if(d<1){clearInterval(window.__qaGo);window.__qaGo=null;return;} const k=Math.min(1,${stepM}/d); p.pos.x+=dx*k; p.pos.y+=dy*k; p.path=[]; },16); })()`);
      // A 6 m/s, 256 m piden unos 45 s; con la máquina cargada el temporizador va más lento.
      await until(`!window.__qaGo`, 150000, `llegar a ${x},${y}`);
      await sleep(1500);
    };
    await sleep(2500);
    await snap('inicio');
    await js(`(()=>{ const r=__game.view.rig; r.pitchDeg=38; r.distance=30; })()`);
    await go(430, 40);
    const costa = await snap('costa-este');
    await shot('viaje-costa');
    check('Viaje: el suelo y el mar existen', costa.paginas > 3, costa.paginas);
    const wet = await js(`${W}.grid.walkable({x:620,y:100})`);
    check('Viaje: el mar no se pisa', !wet);
    await go(40, -230);
    await snap('sur');
    await shot('viaje-sur');
    await go(-300, 100);
    const oeste = await snap('oeste');
    await shot('viaje-oeste');
    await go(124, 118);
    const vuelta = await snap('vuelta-1');
    await go(430, 40);
    await go(124, 118);
    const vuelta2 = await snap('vuelta-2');
    console.log('     texturas: '+await js(`(()=>{const m={}; for(const t of __game.view.scene.textures){const sz=t.getSize?t.getSize():{width:0}; const n=t.getClassName()+'|'+(t.name||t.url||'?').replace(/[0-9.:-]+/g,'#').slice(0,30)+'|'+sz.width; m[n]=(m[n]||0)+1;} return JSON.stringify(Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,10));})()`));
    // Al paso de verdad, 6 m/s: es lo que se juega casi siempre.
    await snap('antes-de-caminar');
    await go(30, -120, 0.1);
    const paso = await snap('caminando');
    // Con otras ventanas abiertas el 1 % más lento depende de la máquina: el umbral es holgado.
    check('Viaje: caminar va fluido', paso.ms50 < 25 && paso.ms99 < 70, `mediana ${paso.ms50} ms, 99 % ${paso.ms99} ms, peor ${paso.peor} ms`);
    await js('clearInterval(window.__qaVida)');
    check('Viaje: lo que queda atrás se suelta', vuelta.paginas < 26, vuelta.paginas);
    check('Viaje: las mallas no crecen de una vuelta a otra', vuelta2.mallas <= vuelta.mallas * 1.1, `${vuelta.mallas} → ${vuelta2.mallas}`);
    check('Viaje: las texturas no crecen de una vuelta a otra', vuelta2.texturas <= vuelta.texturas * 1.1, `${vuelta.texturas} → ${vuelta2.texturas}`);
    check('Viaje: los materiales no crecen', vuelta2.materiales <= vuelta.materiales * 1.1, `${vuelta.materiales} → ${vuelta2.materiales}`);
    check('Viaje: sin errores de consola', consoleErrors.length === 0, consoleErrors.slice(-1)[0] ?? '');
  },
  /** Qué consume los fotogramas lentos al caminar por el mundo. */
  async perfil() {
    await newGame('QA Perfil');
    await js(`window.__qaVida=setInterval(()=>{ ${W}.player.health=${W}.player.maxHealth; ${W}.player.invulnerable=5; },50)`);
    await sleep(3000);
    const res = await js(`(async()=>{ const g=__game, v=g.view, sc=v.scene, rec={}; const cur={};
      const wrap=(o,k,n)=>{const f=o[k]; o[k]=function(...a){const t=performance.now(); const r=f.apply(this,a); cur[n]=(cur[n]||0)+performance.now()-t; return r;};};
      wrap(v.vegetation,'update','plantas'); wrap(v.terrain,'update','terreno'); wrap(v.stream,'update','stream'); wrap(v.stream,'deliver','entrega'); wrap(sc,'render','render'); wrap(v,'sync','sync'); wrap(${W},'tick','tick');
      let a=0,b=0,c=0; sc.onBeforeActiveMeshesEvaluationObservable.add(()=>{a=performance.now()}); sc.onAfterActiveMeshesEvaluationObservable.add(()=>{cur.activas=(cur.activas||0)+performance.now()-a});
      sc.onBeforeRenderTargetsRenderObservable.add(()=>{b=performance.now()}); sc.onAfterRenderTargetsRenderObservable.add(()=>{cur.sombras=(cur.sombras||0)+performance.now()-b});
      const slow=[]; let last=performance.now(), frames=0; const p=${W}.player; const t0=performance.now();
      await new Promise(done=>{ const tick=()=>{ const n=performance.now(), dt=n-last; last=n; frames++; if(dt>30) slow.push({dt:+dt.toFixed(0),...Object.fromEntries(Object.entries(cur).map(([k,x])=>[k,+x.toFixed(1)]))}); for(const k in cur) delete cur[k];
        const dy=-120-p.pos.y; p.pos.y+=Math.sign(dy)*Math.min(Math.abs(dy),dt*0.006); p.path=[]; if(n-t0>40000) done(); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
      return {frames, slow: slow.length, muestras: slow.slice(0,14), mallas: sc.getActiveMeshes().length}; })()`);
    console.log(JSON.stringify(res));
    fs.writeFileSync(path.join(OUT, 'perfil.json'), JSON.stringify(res, null, 1));
    check('Perfil: terminó', res.frames > 0);
  },
  async rendimiento() {
    await newGame('QA Rendimiento');
    await js(`window.__qaVida=setInterval(()=>{ ${W}.player.health=${W}.player.maxHealth; ${W}.player.invulnerable=5; },50)`);
    await js(`(()=>{ const sc=__game.view.scene, t=window.__qaT={anim:0,active:0,targets:0,frames:[],last:performance.now()}; let a0=0,b0=0,c0=0;
      sc.onBeforeAnimationsObservable.add(()=>{a0=performance.now()}); sc.onAfterAnimationsObservable.add(()=>{t.anim+=performance.now()-a0});
      sc.onBeforeActiveMeshesEvaluationObservable.add(()=>{b0=performance.now()}); sc.onAfterActiveMeshesEvaluationObservable.add(()=>{t.active+=performance.now()-b0});
      sc.onBeforeRenderTargetsRenderObservable.add(()=>{c0=performance.now()}); sc.onAfterRenderTargetsRenderObservable.add(()=>{t.targets+=performance.now()-c0});
      const tick=()=>{const n=performance.now(); t.frames.push(n-t.last); t.last=n; requestAnimationFrame(tick)}; requestAnimationFrame(tick); })()`);
    const reset = `(()=>{const t=window.__qaT; t.anim=0;t.active=0;t.targets=0;t.frames=[];})()`;
    const read = `(()=>{const t=window.__qaT, sc=__game.view.scene, f=[...t.frames].sort((a,b)=>a-b), n=Math.max(1,f.length), r=x=>Math.round(x*10)/10;
      return {fps:Math.round(1000/(f.reduce((a,b)=>a+b,0)/n)), p95:r(f[Math.floor(n*0.95)]), max:r(f[n-1]), anim:r(t.anim/n), activas:r(t.active/n), sombras:r(t.targets/n), activeMeshes:sc.getActiveMeshes().length, mallas:sc.meshes.length, grupos:sc.animationGroups.filter(g=>g.isPlaying).length, esqueletos:sc.skeletons.length, materiales:sc.materials.length, enemigos:${W}.enemies.list.length};})()`;
    const place = (x, y) => js(`(() => { const p=${W}.player, g=${W}.grid, a=g.center(g.nearestWalkable({x:${x},y:${y}})); p.pos.x=a.x; p.pos.y=a.y; p.prevPos.x=a.x; p.prevPos.y=a.y; p.path=[]; })()`);
    const out = {};
    const measure = async (name, ms = 4000) => { await js(reset); await sleep(ms); out[name] = await js(read); console.log(name, JSON.stringify(out[name])); };
    await sleep(3000);
    await js('void __game.view.rig.setFraming("default")');
    await place(127, 130);
    await sleep(2500);
    await measure('pueblo');
    await js('void __game.view.rig.jumpTo(40)');
    await sleep(1500);
    await measure('pueblo-lejos');
    await js('void __game.view.rig.setFraming("default")');
    await js(reset);
    await place(40, 200);
    await sleep(2500);
    out.salto = await js(read);
    console.log('salto', JSON.stringify(out.salto));
    await measure('campo');
    await js(reset);
    await js(`(()=>{const l=${W}.enemies.list, c=l[Math.floor(l.length*0.7)], p=${W}.player, g=${W}.grid, a=g.center(g.nearestWalkable({x:c.pos.x+3,y:c.pos.y+3})); p.pos.x=a.x; p.pos.y=a.y; p.prevPos.x=a.x; p.prevPos.y=a.y; p.path=[];})()`);
    await sleep(1500);
    out.grupo = await js(read);
    console.log('salto a un grupo', JSON.stringify(out.grupo));
    await shot('rendimiento-grupo');
    await js('void __game.view.rig.jumpTo(32)');
    await sleep(1200);
    await shot('rendimiento-lejos');
    await js('clearInterval(window.__qaVida)');
    fs.writeFileSync(path.join(OUT, `rendimiento-${process.env.QA_ETIQUETA ?? 'ultima'}.json`), JSON.stringify(out, null, 1));
    check('Rendimiento: el pueblo va fluido', out.pueblo.fps >= 45, out.pueblo.fps);
  },

  async enemigos() {
    await newGame('QA Enemigos');
    await js(`window.__qaVida=setInterval(()=>{ ${W}.player.health=${W}.player.maxHealth; ${W}.player.invulnerable=5; },50)`);
    const near = (ids) => `${W}.enemies.list.filter(e=>[${ids.map((i) => `'${i}'`).join(',')}].includes(e.def.id)&&e.health>0)[0]`;
    const seen = {};
    for (const [name, ids] of [['bestia', ['melee', 'alpha_wolf', 'chame_crab', 'night_sato']], ['arquero', ['ranged', 'chame_heron']], ['chaman', ['summoner', 'chame_witch']], ['diablillo', ['minion', 'chame_chitra', 'boquete_drizzle', 'cerropunta_wisp', 'baru_ember', 'darien_mosquito', 'bocas_jelly', 'perlas_pearl', 'fortuna_flake', 'ancon_soul']], ['grande', ['grave_brute', 'boquete_picker']]]) {
      const found = await js(`(()=>{const e=${near(ids)}; if(!e) return null; const p=${W}.player, g=${W}.grid, a=g.center(g.nearestWalkable({x:e.pos.x-1.8,y:e.pos.y-1.6})); p.pos.x=a.x; p.pos.y=a.y; p.prevPos.x=a.x; p.prevPos.y=a.y; p.path=[]; return e.def.id;})()`);
      seen[name] = found;
      if (!found) continue;
      await js('void __game.view.rig.setFraming("default")');
      await sleep(800);
      await js('void __game.view.rig.jumpTo(9)');
      await sleep(900);
      await shot(`enemigo-${name}`);
    }
    check('Enemigos: se encontraron de cada tipo', Object.values(seen).filter(Boolean).length >= 4, JSON.stringify(seen));
    const models = `${W}.enemies.list.length`;
    const skinned = `__game.view.scene.meshes.filter(m=>/^enemy\\d+:/.test(m.name)&&m.getTotalVertices()>0).length`;
    await until(`${skinned}>0`, 15000, 'mallas de enemigos');
    check('Enemigos: usan los archivos de modelo', true, `${await js(skinned)} mallas, ${await js(models)} enemigos`);
    await sleep(6000);
    const fps = await js('__game.view.engine?.getFps?.() ?? __game.view.scene.getEngine().getFps()');
    check('Enemigos: la escena sigue fluida', Number(fps) > 30, Math.round(fps));
    await js('clearInterval(window.__qaVida)');
  },

  async mascotas() {
    await newGame('QA Mascotas');
    await js(`window.__qaVida=setInterval(()=>{ ${W}.player.health=${W}.player.maxHealth; ${W}.player.invulnerable=5; },50)`);
    const ids = ['ash_fox', 'archivist_owl', 'moss_turtle', 'spirit_wolf'];
    await js(`(()=>{ const w=${W}; for (const id of ${JSON.stringify(ids)}) w.spawnPet(w.content.pets[id], null, 120); })()`);
    const skinned = (n) => `__game.view.scene.meshes.filter(m=>/^pet\\d+:/.test(m.name)&&m.getTotalVertices()>0).length`;
    await until(`${skinned()}>4`, 15000, 'modelos de las mascotas');
    check('Mascotas: usan los archivos de modelo', true, await js(skinned()));
    await js('void __game.view.rig.setFraming("default")');
    await js(`(() => { const p=${W}.player, g=${W}.grid, a=g.center(g.nearestWalkable({x:127,y:141})); p.pos.x=a.x; p.pos.y=a.y; p.prevPos.x=a.x; p.prevPos.y=a.y; p.path=[]; })()`);
    await sleep(1200);
    await js('void __game.view.rig.jumpTo(7)');
    await sleep(1800);
    await js(`(()=>{ const c=${W}.player.pos; ${W}.pets.forEach((p,i)=>{ const a=i*Math.PI/2+0.5; p.pos.x=c.x+Math.cos(a)*2.4; p.pos.y=c.y+Math.sin(a)*2.4; p.prevPos.x=p.pos.x; p.prevPos.y=p.pos.y; p.path=[]; }); })()`);
    await sleep(120);
    await shot('mascotas-reposo');
    const clip = (name) => `__game.view.scene.animationGroups.filter(g=>/^pet\\d+:/.test(g.name)&&g.name.endsWith('${name}')&&g.isPlaying).length`;
    const playing = await js(`JSON.stringify(__game.view.scene.animationGroups.filter(g=>g.name.startsWith('pet')&&g.isPlaying).map(g=>g.name))`);
    check('Mascotas: cada una suena con su clip', JSON.parse(playing).length >= 4, playing);
    check('Mascotas: el lobo espectral es translúcido', await js(`__game.view.scene.materials.some(m=>/^pet\\d+:/.test(m.name)&&m.alpha<1)`));
    await js(`${W}.commandMove({x:${W}.player.pos.x+12,y:${W}.player.pos.y+4})`);
    await until(`${clip('Correr')}>=2`, 6000, 'mascotas corriendo');
    await sleep(500);
    await shot('mascotas-corren');
    check('Mascotas: corren tras el jugador', true, await js(clip('Correr')));
    check('Corcho: sale del modelo', await js(`__game.view.scene.getMeshByName('bobber')?.getTotalVertices()>20`));
    await js('clearInterval(window.__qaVida)');
  },

  async objetos() {
    await newGame('QA Objetos');
    await js(`window.__qaVida=setInterval(()=>{ ${W}.player.health=${W}.player.maxHealth; ${W}.player.invulnerable=5; },50)`);
    const place = (x, y) => js(`(() => { const p=${W}.player, g=${W}.grid, a=g.center(g.nearestWalkable({x:${x},y:${y}})); p.pos.x=a.x; p.pos.y=a.y; p.prevPos.x=a.x; p.prevPos.y=a.y; p.path=[]; })()`);
    const view = async (name, zoom = 11) => { await js('void __game.view.rig.setFraming("default")'); await sleep(700); await js(`void __game.view.rig.jumpTo(${zoom})`); await sleep(800); await shot(name); };
    const field = `${W}.gatherField.nodes`;
    for (const [name, kind] of [['arbol', 'cedar'], ['roca', 'ore_vein'], ['planta', 'bijao']]) {
      const n = await js(`(()=>{const n=${field}.find(n=>n.kind.includes('${kind}')||n.kind==='${kind}'); return n?{x:n.x,y:n.y}:null})()`);
      if (!n) { console.log('sin nodo', kind); continue; }
      await place(n.x + 1.6, n.y - 1.6);
      await view(`objetos-${name}`);
    }
    const st = await js(`Object.values(__game.world.content?.professions?.stations ?? {}).map(s=>[s.id,s.x,s.y])`);
    for (const [id, x, y] of st ?? [['forge', 134, 118], ['loom', 122, 138], ['still', 126, 108]]) {
      await place(x + 1.6, y - 1.6);
      await view(`objetos-taller-${id}`, 9);
    }
    const stone = await js(`(()=>{const n=__game.view.scene.transformNodes.find(n=>n.name.startsWith('stone_')); return n?{x:n.position.x,y:n.position.z}:null})()`);
    check('Objetos: hay Piedras Pintadas', !!stone);
    await place(stone.x + 2.5, stone.y - 2.5);
    await view('objetos-piedra', 11);
    // Botín en el suelo: monedas, bolsa y cofre.
    await js(`(()=>{const w=${W}, p=w.player.pos; w.dropLoot({x:p.x+1,y:p.y}, null, 25); for (const [id,dx] of [['iron_ore',-1],['wood_cedar',-2]]) { try { w.dropLoot({x:p.x+dx,y:p.y}, w.character.items.create(id,1)); } catch(e) {} } })()`);
    await view('objetos-botin', 7);
    // Montura.
    const eq = await js(`(()=>{const c=${W}.character, r=c.equip ? null : null; const i=c.items.create('mount_mule',1); c.inventory.add(i); return JSON.stringify(c.equip(i.uid,'mount'));})()`);
    await until(`!!__game.view.scene.meshes.find(m=>m.name.startsWith('mount:')&&m.getTotalVertices()>0)`, 10000, 'modelo de la montura');
    check('Objetos: la montura usa su modelo', true, eq);
    await view('objetos-montura', 7);
    await js(`${W}.commandMove({x:${W}.player.pos.x+10,y:${W}.player.pos.y})`);
    await sleep(700);
    await shot('objetos-montura-trote');
    check('Objetos: la montura mira hacia donde va', await js(`(()=>{const h=__game.view.scene.transformNodes.concat(__game.view.scene.meshes).find(n=>n.name==='mount:head'), r=__game.view.scene.getTransformNodeByName('mountRoot').getAbsolutePosition(), a=h.getAbsolutePosition(), f=${W}.player.facing; return (a.x-r.x)*Math.cos(f)+(a.z-r.z)*Math.sin(f)>0.3;})()`));
    await js(`${W}.commandMove({x:${W}.player.pos.x-14,y:${W}.player.pos.y+6})`);
    await until(`__game.view.scene.animationGroups.some(g=>g.name.endsWith('Trotar')&&g.isPlaying)`, 4000, 'trote de la montura');
    check('Objetos: trota al moverse', true);
    await js(`${W}.player.path=[]`);
    await js('clearInterval(window.__qaVida)');
  },

  async cofre() {
    await newGame('QA Cofre');
    await js(`${S}.energy.value=100`);
    // Los monstruos de la sala no deben interrumpir la prueba.
    await js(`window.__qaVida=setInterval(()=>{ ${W}.player.health=${W}.player.maxHealth; },50)`);
    await js(`__game.crypt.enter(0,'above')`);
    await until(`__game.crypt.floor===0`, 10000, 'dentro de la cripta');
    // El primero abierto, o el primero del piso mientras no se abra ninguno.
    const chest = `([...__game.crypt.opened][0] ?? __game.crypt.floorData.chests[0].id)`;
    const lid = `__game.view.scene.transformNodes.concat(__game.view.scene.meshes).find(n=>n.name==='dChest-'+${chest}+':FG_Cofre_Tapa')`;
    await until(`!!${lid}`, 15000, 'modelo del cofre cargado');
    const angle = `(() => { const q=${lid}.rotationQuaternion; return Math.round(2*Math.acos(Math.min(1,Math.abs(q.w)))*180/Math.PI); })()`;
    await js(`(() => { const c=__game.crypt.floorData.chests[0], p=${W}.player, g=${W}.grid, a=g.center(g.nearestWalkable({x:c.pos.x+1.2,y:c.pos.y+1.2})); p.pos.x=a.x; p.pos.y=a.y; p.path=[]; })()`);
    await js('void __game.view.rig.setFraming("default")');
    await sleep(1500);
    check('Cofre: empieza cerrado', Number(await js(angle)) === 0, await js(angle));
    await shot('cofre-cerrado');
    await clickMesh('dChestHit');
    await until(`__game.crypt.opened.size>0`, 15000, 'cofre abierto al llegar');
    await sleep(700);
    const mid = Number(await js(angle));
    await shot('cofre-abriendo');
    await sleep(1400);
    const end = Number(await js(angle));
    await shot('cofre-abierto');
    check('Cofre: la tapa se mueve antes de terminar', mid > 0, mid);
    check('Cofre: la tapa llega a 100°', end === 100, end);
    await js(`__game.crypt.enter(0,'above')`);
    await until(`!!${lid}`, 15000, 'modelo tras recargar el piso');
    await sleep(800);
    check('Cofre: al volver sigue abierto, sin animarse', Number(await js(angle)) === 100, await js(angle));
    await js('clearInterval(window.__qaVida)');
  },

  /** Patrones: cenefa de la zona y estandarte de Blender que ondea. */
  async patrones() {
    await newGame('QA Patrones');
    await until("!!document.querySelector('.zone-band')", 15000, 'cenefa de la zona');
    check('Patrones: la zona muestra su cenefa', true);
    await until(`!!__game.view.scene.getTransformNodeByName('landmark:estandarte')`, 15000, 'estandarte');
    check('Patrones: el estandarte ondea', await js(`__game.view.scene.animationGroups.some(g=>g.name.includes('Reposo')&&g.isPlaying&&g.targetedAnimations.some(a=>a.target.name?.includes('Tela')))`));
    await js(`(() => { const p=${W}.player; p.pos.x=112; p.pos.y=140; p.path=[]; })()`);
    await sleep(2000);
    await shot('patrones-banco-casa');
    const door = '{door:{x:100,y:93},outside:{x:100,y:96.6},rotDeg:180}';
    for (const [room, mesh, x, y] of [['salon', 'house-salon-salon_alfombra', 12, 15], ['hogar', 'house-hogar-hogar_alfombra', 7, 7], ['taller', 'house-taller-taller_alfombra', 7, 7]]) {
      await js(`void __game.houses.enter(${door},'${room}')`);
      await until('!!__game.houses.inside', 8000, room);
      await sleep(800);
      check(`Patrones: alfombra con textura en ${room}`, await js(`!!__game.view.scene.getMeshByName('${mesh}')?.material?.diffuseTexture`));
      await js(`(() => { const p=${W}.player; p.pos.x=${x}; p.pos.y=${y}; p.path=[]; })()`);
      await sleep(1200);
      await shot(`patrones-${room}`);
      await js('void __game.houses.leave()');
      await sleep(600);
    }
  },

  /** Mapa grande: Panamá entera, con la provincia pisada descubierta. */
  async panama() {
    await newGame('QA Panama');
    await sleep(2500);
    await key('KeyM', 'm');
    await sleep(400);
    await button('Panamá');
    await sleep(600);
    const txt = await js("document.querySelector('.wm-explored').textContent");
    check('Panamá: una región descubierta', txt.includes('1 /'), txt);
    await shot('panama-mapa');
    await button('Zona');
    await sleep(300);
    check('Panamá: vuelve al mapa de la zona', await js("document.querySelector('.wm-local').style.display !== 'none'"));
    await key('KeyM', 'm');
  },

  /** Costa: el mar con olas y la marea que sube y baja. */
  async costa() {
    await newGame('QA Costa');
    await js(`window.__qaVida=setInterval(()=>{ ${W}.player.health=${W}.player.maxHealth; ${W}.player.invulnerable=5; },50)`);
    const shore = 395;
    await js(`(()=>{ const p=${W}.player; p.pos.x=${shore}; p.pos.y=-100; p.path=[]; const r=__game.view.rig; r.pitchDeg=48; r.distance=45; })()`);
    await sleep(5000);
    await shot('costa-playa');
    const sea = "__game.view.scene.getMeshByName('sea')";
    check('Costa: el mar tiene textura de olas', await js(`!!${sea}.material.diffuseTexture && !!${sea}.material.bumpTexture`));
    const a = await js(`${sea}.position.y`);
    await sleep(2000);
    const b = await js(`${sea}.position.y`);
    check('Costa: la marea se mueve', a !== b, `${a} → ${b}`);
    await js('clearInterval(window.__qaVida)');
  },

  /** Los Santos: cada poblado en su sitio, con zona, casas y Piedra Pintada. */
  async santos() {
    await newGame('QA Santos');
    await js(`window.__qaVida=setInterval(()=>{ ${W}.player.health=${W}.player.maxHealth; ${W}.player.invulnerable=5; },50)`);
    for (const [id, name, x, y] of [['pedasol', 'Pedasol', 438, 12], ['venada', 'Punta Venada', 300, -106], ['cambutal', 'Cambutal', 44, -228], ['canajagua', 'Macizo de Canajagua', -60, -16]]) {
      await js(`(()=>{ const p=${W}.player; p.pos.x=${x}; p.pos.y=${y}; p.path=[]; const r=__game.view.rig; r.pitchDeg=50; r.distance=38; })()`);
      await sleep(5000);
      const here = await js(`document.querySelector('.world-info, .hud-zone')?.textContent ?? document.body.innerText.slice(0, 400)`);
      check(`Santos: ${name} tiene su zona`, String(here).includes(name), String(here).slice(0, 80));
      check(`Santos: en ${name} se puede pisar`, await js(`${W}.grid.walkable({x:${x},y:${y}})`));
      const stone = await js(`(()=>{ const n=__game.view.scene.getTransformNodeByName('stone_${id === 'venada' ? 'punta_venada' : id}'); const g=__game.view.heights.sample(n.position.x,n.position.z); return { x:n.position.x, z:n.position.z, y:n.position.y, g, walk:${W}.grid.walkable({x:n.position.x,y:n.position.z}) }; })()`);
      check(`Santos: la Piedra de ${name} está en el pueblo y sobre el suelo`, Math.hypot(stone.x - x, stone.z - y) < 20 && Math.abs(stone.y - stone.g) < 0.01 && stone.walk, JSON.stringify(stone));
      await shot(`santos-${id}`);
    }
    for (const [id, name, x, y] of [['chitri', 'Chitrí', 10, 488], ['pese', 'Cañaverales de Pesé', -166, 418], ['parrita', 'Campos de Parrita', -40, 520], ['sarigua', 'Desierto de Sarigua', -70, 595]]) {
      await js(`(()=>{ const p=${W}.player; p.pos.x=${x}; p.pos.y=${y}; p.path=[]; })()`);
      await sleep(5000);
      const here = await js(`document.querySelector('.world-info, .hud-zone')?.textContent ?? ''`);
      check(`Herrera: ${name} tiene su zona`, String(here).includes(name), String(here).slice(0, 60));
      check(`Herrera: en ${name} se puede pisar`, await js(`${W}.grid.walkable({x:${x},y:${y}})`));
      await shot(`herrera-${id}`);
    }
    // Viaje a una Piedra lejana: la página aún no existe cuando se llega.
    const use = () => js(`(() => { const c=${S}.character; c.itemCooldowns={}; c.pickUp(c.items.create('seco_del_regreso'),true); const it=c.inventory.slots.find(i=>i?.itemId==='seco_del_regreso'); return ${S}.useItem(it.uid).ok; })()`);
    await js(`(()=>{ const p=${W}.player; p.pos.x=438; p.pos.y=8; p.path=[]; })()`);
    await sleep(5000);
    await js(`(()=>{ const p=${W}.player; p.pos.x=-300; p.pos.y=100; p.path=[]; })()`);
    await sleep(5000);
    check('Santos: el Seco del Regreso se puede usar', await use());
    await sleep(6000);
    const back = await js(`(()=>{ const p=${W}.player.pos; return { x:p.x, y:p.y, walk:${W}.grid.walkable(p) }; })()`);
    check('Santos: vuelve a la Piedra lejana y hay suelo', Math.hypot(back.x - 438, back.y - 6) < 4 && back.walk, JSON.stringify(back));
    await js(`${W}.commandMove({x:${W}.player.pos.x-6,y:${W}.player.pos.y+4})`);
    await sleep(1500);
    const moved = await js(`(()=>{ const p=${W}.player.pos; return Math.hypot(p.x-${back.x},p.y-${back.y}); })()`);
    check('Santos: allí se puede caminar', moved > 1, moved);
    await js('clearInterval(window.__qaVida)');
  },

  /** Iguanera: se empieza en la isla y la lancha cruza a Pedasol y vuelve. */
  async iguanera() {
    await newGame('QA Isla', { island: true });
    await sleep(5000);
    const at = await js(`(()=>{ const p=${W}.player.pos; return { x: Math.round(p.x), y: Math.round(p.y), zone: document.querySelector('.world-info, .hud-zone')?.textContent ?? '' }; })()`);
    check('Iguanera: un personaje nuevo empieza en la isla', Math.hypot(at.x - 590, at.y - 140) < 6 && at.zone.includes('Iguanera'), JSON.stringify(at));
    await shot('iguanera-inicio');
    check('Iguanera: la lancha está en la orilla', await js(`!!__game.view.scene.getTransformNodeByName('landmark:lancha')`));
    const cross = async (x, y) => {
      // Cámara mirando al muelle (al oeste): que el clic no caiga bajo la barra.
      await js(`(()=>{ const p=${W}.player; p.pos.x=${x}; p.pos.y=${y}; p.path=[]; __game.view.rig.yawDeg=225; })()`);
      await sleep(600);
    };
    await cross(563, 136);
    await sleep(1500);
    // Clic de verdad junto al muelle: el jugador va andando y sube.
    await clickGroundNear(558, 132);
    await sleep(300);
    console.log('     tras el clic', JSON.stringify(await js(`({ path: ${W}.player.path.length, pos: ${W}.player.pos, toast: [...document.querySelectorAll('.toast, .toasts *')].map(t=>t.textContent).join('|').slice(0,120), walk: ${W}.grid.walkable({x:558,y:132}) })`)));
    await sleep(4700);
    let now = await js(`(()=>{ const p=${W}.player.pos; return { x: p.x, y: p.y, walk: ${W}.grid.walkable(p) }; })()`);
    check('Iguanera: la lancha deja en Pedasol, en tierra', Math.hypot(now.x - 478, now.y - 14) < 3 && now.walk, JSON.stringify(now));
    await shot('iguanera-pedasol');
    await saveAndLoad();
    await sleep(3000);
    const loaded = await js(`(()=>{ const p=${W}.player.pos; return { x: p.x, y: p.y, walk: ${W}.grid.walkable(p) }; })()`);
    check('Iguanera: guardar y cargar en Pedasol deja en Pedasol', Math.hypot(loaded.x - 478, loaded.y - 14) < 3 && loaded.walk, JSON.stringify(loaded));
    await js(`__game.board('pedasol_iguanera')`);
    await sleep(4000);
    now = await js(`(()=>{ const p=${W}.player.pos; return { x: p.x, y: p.y, walk: ${W}.grid.walkable(p) }; })()`);
    check('Iguanera: y vuelve a la isla', Math.hypot(now.x - 558, now.y - 132) < 3 && now.walk, JSON.stringify(now));
    await saveAndLoad();
    await sleep(3000);
    const back = await js(`(()=>{ const p=${W}.player.pos; return { x: p.x, y: p.y, walk: ${W}.grid.walkable(p), zone: document.querySelector('.world-info, .hud-zone')?.textContent ?? '' }; })()`);
    check('Iguanera: guardar y cargar en la isla deja en la isla', Math.hypot(back.x - 558, back.y - 132) < 3 && back.walk && back.zone.includes('Iguanera'), JSON.stringify(back));
  },

  async cripta() {
    await newGame('QA Cripta');
    await js(`(() => { const r=__game.view.scene.getTransformNodeByName('cryptEntrance').position, p=${W}.player, g=${W}.grid, a=g.center(g.nearestWalkable({x:r.x+5,y:r.z+3})); p.pos.x=a.x; p.pos.y=a.y; p.prevPos.x=a.x; p.prevPos.y=a.y; p.path=[]; })()`);
    await sleep(1500);
    await shot('cripta-entrada');
    await js(`${S}.energy.value=20`);
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
