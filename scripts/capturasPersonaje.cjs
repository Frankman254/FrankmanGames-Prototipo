// Capturas de la galería de humanoides (/personajes.html) en Chromium headless.
// Con `npx vite --port 5199` corriendo:
//   node scripts/capturasPersonaje.cjs docs/capturas/personaje [http://localhost:5199/]
const { chromium } = require('playwright');
const out = process.argv[2] ?? 'docs/capturas/personaje';
const base = (process.argv[3] ?? 'http://localhost:5199/') + 'personajes.html';
const shots = [
  ['01-reposo', 'anim=idle&t=0.1&yaw=20'],
  ['02-reposo-espalda', 'anim=idle&t=0.1&yaw=200'],
  ['03-correr', 'anim=run&t=0.3&yaw=55&pick=1,2,4,8&zoom=1.7'],
  ['04-ataque-carga', 'anim=attack&t=0.35&yaw=55&pick=1,2,4,8&zoom=1.7'],
  ['05-ataque-golpe', 'anim=attack&t=0.5&yaw=55&pick=1,2,4,8&zoom=1.7'],
  ['06-hechizo', 'anim=cast&t=0.45&yaw=55&pick=1,2,4,8&zoom=1.7'],
  ['07-evasion', 'anim=evade&t=0.45&yaw=75&pick=1,2,4,8&zoom=1.7'],
  ['08-impacto', 'anim=hit&t=0.3&yaw=30&pick=1,2,4,8&zoom=1.7'],
  ['09-muerte', 'anim=death&t=1&yaw=55&pick=1,2,4,8&zoom=1.7'],
  ['10-caras', 'anim=idle&t=0.1&yaw=0&zoom=2.6&ty=1.3'],
  ['11-primer-plano', 'anim=idle&t=0.1&yaw=15&only=4&zoom=7&ty=1.55'],
];
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1600, height: 700 } });
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  for (const [name, query] of shots) {
    await page.goto(`${base}?${query}`);
    await page.waitForFunction(() => window.__gallery?.ready === true, null, { timeout: 30000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 82 });
  }
  console.log(await page.evaluate(() => JSON.stringify(window.__gallery)));
  console.log('errores de consola:', JSON.stringify(errors));
  await browser.close();
  if (errors.length) process.exit(1);
})();
