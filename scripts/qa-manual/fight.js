const SELF = new Set(['hawk_eye','iron_shout','ember_whirl','storm_focus','frost_nova']);
/** Pelea con entrada real: clic sobre el enemigo = ataque básico; cursor encima + tecla = hechizo. */
async function hoverEnemy(id) { const e = await js(`(()=>{const e=__game.world.enemies.list.find(e=>e.id===${id}); return e&&e.state!=='dead'?{x:e.pos.x,y:e.pos.y}:null})()`); if (!e) return null;
  const p = await project(e.x, e.y, 0.8); if (!p) return null; await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y }); return p; }
async function fight({ seconds = 40, plan = [], basicOnly = false, label = 'pelea' } = {}) {
  const t0 = Date.now(); const ev = { basicClicks: 0, casts: {}, blocked: 0 }; let target = null;
  const hp0 = await state();
  while ((Date.now() - t0) / 1000 < seconds) {
    const s = await state(); if (!s.alive) { ev.died = true; break; }
    { const [h, m] = s.hp.split('/').map(Number); if (h / m < 0.35 && !ev.potionAt) { await key('Digit1','1'); ev.potionAt = s.hp; } }
    const near = await nearEnemies(6); const live = near.filter(e => e.d < 30);
    if (!live.length) break;
    if (!target || !live.find(e => e.id === target)) target = live[0].id;
    let p = await hoverEnemy(target); if (!p) { const e=live.find(e=>e.id===target); await face(e.x,e.y); ev.turns=(ev.turns??0)+1; p = await hoverEnemy(target); } if (!p) { await sleep(200); continue; }
    let cast = false;
    if (!basicOnly) for (const [code, keyName, spell] of plan) {
      const r = await js(`(()=>{ const p=__game.world.player; return { gcd:p.gcd, casting: !!p.casting, cd: p.cooldowns[${JSON.stringify(spell)}] ?? 0, res: p.resource } })()`);
      if (r.gcd > 0 || r.casting) break;
      if (r.res < 20 && spell !== 'hunter_arrow') continue;
      if (r.cd > 0) continue;
      await key(code, keyName); await sleep(60); if (!SELF.has(spell)) { await mouse(p.x, p.y); } await sleep(120);
      const a = await js(`(()=>{ const p=__game.world.player; return { gcd:p.gcd, casting: !!p.casting, cd: p.cooldowns[${JSON.stringify(spell)}] ?? 0, res: p.resource } })()`);
      if (a.gcd > 0 || a.casting || a.cd > 0 || a.res < r.res) { ev.casts[spell] = (ev.casts[spell] ?? 0) + 1; cast = true; break; } else ev.blocked++;
    }
    if (!cast) { await mouse(p.x, p.y); ev.basicClicks++; }
    await sleep(350);
  }
  const s1 = await state();
  ev.seconds = +((Date.now() - t0) / 1000).toFixed(1); ev.antes = { hp: hp0.hp, res: hp0.res, xp: hp0.xp, lvl: hp0.lvl }; ev.despues = { hp: s1.hp, res: s1.res, xp: s1.xp, lvl: s1.lvl, alive: s1.alive };
  log(label, ev); return ev;
}
