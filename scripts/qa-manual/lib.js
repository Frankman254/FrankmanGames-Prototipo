// Preludio: cdp.mjs lo antepone a cada paso. Ayudas: project, clickAt, state, nearEnemies, visibleText, buttons, drainLog, face.
const W = '__game.world';
/** Punto del mundo (sim x,y; altura sobre el suelo h) → px CSS en la ventana; null si fuera de pantalla. */
const project = (x, y, h = 1) => js(`(() => { const v=__game.view, s=v.scene, cam=v.rig.camera, c=document.querySelector('canvas'), r=c.getBoundingClientRect();
  const V=cam.position.constructor, M=cam.getViewMatrix().constructor; const e=s.getEngine();
  const w=new V(${x}, v.heights.sample(${x},${y})+${h}, ${y}); const vp=cam.viewport.toGlobal(e.getRenderWidth(), e.getRenderHeight());
  const sp=V.Project(w, M.Identity(), s.getTransformMatrix(), vp); const k=r.width/e.getRenderWidth();
  const X=sp.x*k+r.x, Y=sp.y*k+r.y; if (sp.z<0||sp.z>1||X<0||Y<0||X>innerWidth||Y>innerHeight) return null;
  const top=document.elementFromPoint(X,Y); return {x:X,y:Y,onCanvas: !!top && top.tagName==='CANVAS'}; })()`);
async function clickAt(x, y, h = 1, opts) { const p = await project(x, y, h); if (!p) throw new Error(`fuera de pantalla ${x},${y}`); if (!p.onCanvas) log('  (aviso) el clic cae sobre interfaz en', x, y); await mouse(p.x, p.y, opts); return p; }
const state = () => js(`(() => { const w=${W}, p=w.player, ch=w.character; const r=__game.view.rig;
  return { t:+w.timeOfDay.toFixed(3), pos:{x:+p.pos.x.toFixed(1),y:+p.pos.y.toFixed(1)}, hp:Math.round(p.health)+'/'+p.maxHealth, res:Math.round(p.resource)+'/'+p.maxResource, alive:p.alive, spectral:p.spectral,
    lvl:ch.level, xp:ch.xp, gold:ch.gold, bag:ch.inventory.slots.filter(Boolean).length, charges:p.basicCharges, target:p.attackTarget, zone:w.currentZone?.id ?? w.currentZone, cam:{d:+r.distance.toFixed(1),yaw:+r.yawDeg.toFixed(0)} } })()`);
/** Enemigos vivos más cercanos: id, arquetipo, nivel, distancia, vida. */
const nearEnemies = (n = 6) => js(`(() => { const w=${W}, p=w.player.pos; return w.enemies.list.filter(e=>e.state!=='dead').map(e=>({id:e.id, a:e.archetype??e.def?.id, lvl:e.level, d:+Math.hypot(e.pos.x-p.x,e.pos.y-p.y).toFixed(1), hp:Math.round(e.health)+'/'+Math.round(e.maxHealth??0), x:+e.pos.x.toFixed(1), y:+e.pos.y.toFixed(1), st:e.state})).sort((a,b)=>a.d-b.d).slice(0,${n}); })()`);
const visibleText = (sel) => js(`[...document.querySelectorAll(${JSON.stringify(sel)})].filter(e=>e.offsetParent).map(e=>e.innerText.trim()).join(' || ')`);
const buttons = () => js(`[...document.querySelectorAll('button')].filter(b=>b.offsetParent).map(b=>b.textContent.trim()).filter(Boolean).join(' | ')`);
const drainLog = () => js(`(()=>{ const c=document.querySelector('.chat-log'); return c? c.innerText.split('\\n').slice(-12).join(' / ') : '' })()`);
/** Gira la cámara (órbita ya verificada con arrastre derecho) para que el punto quede en la mitad superior. */
async function face(x, y) {
  let best = null;
  const y0 = await js(`__game.view.rig.yawDeg`);
  for (let k = 0; k < 12; k++) {
    const yaw = y0 + k * 30;
    await js(`__game.view.rig.lookToward(${yaw})`); await sleep(60);
    const p = await project(x, y, 0.8);
    if (p && p.onCanvas) { const score = Math.abs(p.x - innerW/2) + Math.abs(p.y - innerH*0.4); if (!best || score < best.score) best = { yaw, score }; }
  }
  await js(`__game.view.rig.lookToward(${best ? best.yaw : y0})`); await sleep(100);
  return best;
}
const innerW = 1800, innerH = 1000;
