// Medición del corro de humanoides en Chromium headless (Playwright de la
// máquina). Con `npx vite --port 5199` corriendo:
//   node scripts/benchHumanos.cjs [http://localhost:5199/]
// Abre `?bench=humans` y escribe la línea `BENCH {json}` que deja el juego.
// En la nube Chromium dibuja por software (SwiftShader): sirve para comparar
// antes/después, no como cifra absoluta (ésa sale de `npx electron . --bench`).
const { chromium } = require('playwright');
const url = (process.argv[2] ?? 'http://localhost:5199/') + '?bench=humans';
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  const done = new Promise((resolve) => page.on('console', (m) => { if (m.text().startsWith('BENCH ')) resolve(m.text()); }));
  page.on('pageerror', (e) => console.error('PAGEERROR', e.message));
  await page.goto(url);
  console.log(await done);
  await browser.close();
})();
