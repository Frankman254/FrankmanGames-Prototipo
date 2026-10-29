// Capturas de los menús del Slice 03 en Chromium headless (Playwright ya
// instalado en la máquina). Uso, con `npx vite --port 5199` corriendo:
//   node scripts/capturasMenus.cjs docs/capturas/slice03 [http://localhost:5199/]
// Recorre título → creación → HUD → paneles → arrastres → pausa → guardado.
const { chromium } = require('playwright');
const out = process.argv[2] ?? 'docs/capturas/slice03';
const url = process.argv[3] ?? 'http://localhost:5199/';
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const errors = [];
  for (const part of [partA, partB]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
    const shot = async (n) => { await page.waitForTimeout(350); await page.screenshot({ path: `${out}/${n}.jpg`, type: 'jpeg', quality: 80 }); };
    await part(page, shot);
    await page.close();
  }
  console.log('errores de consola:', JSON.stringify(errors));
  await browser.close();
  if (errors.length) process.exit(1);
})();

async function partA(page, shot) {
  await page.goto(url);
  await page.waitForTimeout(2500);
  await shot('01-titulo');
  await page.getByText('Nueva partida').click();
  await shot('02-creacion');
  await page.locator('.class-card').nth(1).click();
  await page.fill('.name-input', 'Ilse Brumaria');
  await shot('03-creacion-tejedora');
  await page.getByText('Empezar').click();
  await page.waitForTimeout(800);
  await shot('04-hud');
  await page.keyboard.press('Digit2');
  await page.waitForTimeout(300);
  await page.keyboard.press('Digit1');
  await page.waitForTimeout(150);
  await shot('05-hud-enfriamiento');
  await page.keyboard.press('KeyI');
  await page.waitForTimeout(300);
  const cell = page.locator('.inv-grid .cell.filled').nth(4);
  await cell.hover();
  await shot('06-inventario-tooltip');
}

async function partB(page, shot) {
  const center = async (loc) => { const b = await loc.boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  /** Arrastra con el ratón y devuelve la función que suelta (para capturar a mitad). */
  const dragTo = async (a, b) => {
    const p = await center(a); const q = typeof b.x === 'number' ? b : await center(b);
    await page.mouse.move(p.x, p.y); await page.mouse.down();
    await page.mouse.move(p.x + 10, p.y + 10, { steps: 3 }); await page.mouse.move(q.x, q.y, { steps: 8 });
    return async () => page.mouse.up();
  };
  await page.goto(url);
  await page.waitForTimeout(2000);
  await page.getByText('Nueva partida').click();
  await page.fill('.name-input', 'Aldara');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);
  // Personaje con desglose
  await page.keyboard.press('KeyC');
  await page.locator('.stat-row.primary').first().hover();
  await shot('07-personaje-desglose');
  await page.locator('.stat-row', { hasText: 'Armadura' }).first().hover();
  await shot('08-personaje-armadura');
  await page.locator('.plus').first().click();
  await page.locator('.plus').first().click();
  // Libro y arrastre a la barra
  await page.keyboard.press('KeyK');
  await page.waitForTimeout(300);
  const bar = page.locator('.hot-slot:not(.potion)');
  await page.evaluate(() => window.__game.session.assignHotbar(5, null));
  await page.waitForTimeout(100);
  let up = await dragTo(page.locator('.spell-card', { hasText: 'Embestida' }), bar.nth(5));
  await shot('09-libro-arrastrando');
  await up();
  await page.locator('.spell-card', { hasText: 'Embestida' }).hover();
  await shot('10-libro-tooltip');
  // Inventario: equipar arrastrando
  await page.keyboard.press('KeyK');
  await page.keyboard.press('KeyI');
  await page.waitForTimeout(300);
  await page.mouse.move(5, 400);
  await shot('11-inventario');
  const axe = page.locator('.inv-grid .cell.filled').first();
  up = await dragTo(axe, page.locator('.eq-weapon'));
  await shot('12-inventario-arrastre-equipo');
  await up();
  await page.locator('.eq-weapon').hover();
  await shot('13-equipado-tooltip');
  // Anillo con comparación negativa/positiva
  const ring = page.locator('.inv-grid .cell.filled.r-rare').first();
  await ring.hover();
  await shot('14-tooltip-comparacion');
  // Tirar fuera → confirmación
  const ore = page.locator('.inv-grid .cell.filled', { has: page.locator('.qty', { hasText: '12' }) }).first();
  up = await dragTo(ore, { x: 300, y: 450 });
  await up();
  await shot('15-tirar-confirmacion');
  await page.getByText('Cancelar').click();
  await page.getByText('Ordenar').click();
  await page.mouse.move(5, 400);
  await shot('16-ordenado');
  // Subida de nivel
  await page.keyboard.press('Escape');
  await page.evaluate(() => { window.__game.session.grantKill(); window.__game.session.grantXp(600); });
  await page.waitForTimeout(500);
  await shot('17-subida-nivel');
  // Pausa, opciones, guardar
  await page.keyboard.press('Escape');
  await shot('18-pausa');
  await page.getByText('Opciones').click();
  await page.locator('[data-opt=cameraSensitivity]').fill('1.6');
  await shot('19-opciones');
  await page.keyboard.press('Escape');
  await page.getByText('Guardar partida').click();
  await page.locator('.slot-row').nth(1).getByText('Guardar aquí').click();
  await shot('20-ranuras');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300); await page.getByText('Salir al título').click();
  await page.getByRole('button', { name: 'Salir', exact: true }).click();
  await shot('21-titulo-con-guardado');
  await page.getByRole('button', { name: 'Cargar partida' }).click();
  await shot('22-cargar');
  await page.locator('.slot-row').nth(1).getByRole('button', { name: 'Cargar', exact: true }).click();
  await page.waitForTimeout(400);
  const lvl = await page.locator('.hud-level').textContent();
  const opts = await page.evaluate(() => localStorage.getItem('frankmangames.options'));
  console.log('nivel tras cargar', lvl, '· opciones', opts);
  await shot('23-cargado');
}
