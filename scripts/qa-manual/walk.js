/** Anda con clics reales hacia (tx,ty): cada vez un punto a `step` m en esa dirección, como haría quien juega. */
async function walkTo(tx, ty, { step = 13, maxClicks = 40, stopIfEnemy = 0 } = {}) {
  let last = null, stuck = 0, clicks = 0;
  for (; clicks < maxClicks; clicks++) {
    const s = await state(); const dx = tx - s.pos.x, dy = ty - s.pos.y, d = Math.hypot(dx, dy);
    if (d < 3) return { ok: true, clicks, pos: s.pos };
    if (stopIfEnemy) { const e = (await nearEnemies(1))[0]; if (e && e.d < stopIfEnemy) return { ok: false, enemy: e, clicks, pos: s.pos }; }
    if (!s.alive) return { ok: false, dead: true, pos: s.pos };
    let k = Math.min(1, step / d), p = null;
    for (const f of [1, 0.7, 0.45, 0.3, 0.2]) { p = await project(s.pos.x + dx * k * f, s.pos.y + dy * k * f, 0); if (p && p.onCanvas) break; p = null; }
    if (!p) return { ok: false, reason: 'sin punto en pantalla', pos: s.pos };
    await mouse(p.x, p.y);
    await sleep(Math.min(3200, (Math.min(d, step) / 5) * 1000 + 300));
    const n = (await state()).pos;
    if (last && Math.hypot(n.x - last.x, n.y - last.y) < 0.5) { if (++stuck >= 3) return { ok: false, stuck: true, pos: n, clicks }; } else stuck = 0;
    last = n;
  }
  return { ok: false, reason: 'demasiados clics', clicks };
}
