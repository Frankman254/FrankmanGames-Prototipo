import { loadGameData } from './data';
import { ArenaView } from './render/arenaView';
import { FixedStepClock } from './sim/loop';
import { World } from './sim/world';
import { PerfOverlay } from './ui/perfOverlay';

const SIM_HZ = 60;

const canvas = document.getElementById('view') as HTMLCanvasElement;
const perf = new PerfOverlay(document.getElementById('perf')!);

const data = loadGameData();
const world = new World(data);
const view = new ArenaView(canvas, data);
const clock = new FixedStepClock(SIM_HZ);

canvas.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  const p = view.pickGround(e.offsetX, e.offsetY);
  if (p) world.commandMove(p);
});
canvas.addEventListener('wheel', (e) => {
  view.rig.zoomBy(Math.sign(e.deltaY) * 2);
  e.preventDefault();
}, { passive: false });
window.addEventListener('resize', () => view.engine.resize());

let last = performance.now();
view.engine.runRenderLoop(() => {
  const now = performance.now();
  const frameSeconds = Math.min(0.25, (now - last) / 1000);
  perf.frame.push(now - last);
  last = now;

  const t0 = performance.now();
  const { steps, alpha } = clock.advance(frameSeconds);
  for (let i = 0; i < steps; i++) world.tick(clock.dt);
  const t1 = performance.now();
  view.sync(world, alpha, frameSeconds);
  view.render();
  const t2 = performance.now();

  perf.sim.push(t1 - t0);
  perf.render.push(t2 - t1);
  perf.paint(now);
});
