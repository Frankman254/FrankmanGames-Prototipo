import { loadGameData } from './data';
import { ArenaView } from './render/arenaView';
import { FixedStepClock } from './sim/loop';
import { FrameStats } from './sim/frameStats';
import { World } from './sim/world';
import { Input } from './ui/input';
import { PerfOverlay } from './ui/perfOverlay';

const SIM_HZ = 60;

const canvas = document.getElementById('view') as HTMLCanvasElement;
const perf = new PerfOverlay(document.getElementById('perf')!);

const data = loadGameData();
const world = new World(data);
const view = new ArenaView(canvas, data);
const clock = new FixedStepClock(SIM_HZ);
const input = new Input(canvas);

// Latencia de clic: desde el evento hasta el primer fotograma presentado con
// el jugador ya desplazándose.
const clickLatency = new FrameStats(30);
let pendingClickStamp: number | null = null;
let holdTimer = 0;

input.onPointerDown((e) => {
  if (e.button !== 0) return;
  const p = view.pickGround(e.offsetX, e.offsetY);
  if (!p) return;
  world.commandMove(p); // la orden entra antes del siguiente tick
  holdTimer = 0;
  pendingClickStamp = world.player.path.length > 0 ? e.timeStamp : null;
});
canvas.addEventListener('wheel', (e) => {
  view.rig.zoomBy(Math.sign(e.deltaY) * 2);
  e.preventDefault();
}, { passive: false });
window.addEventListener('resize', () => view.engine.resize());
// Acceso de depuración desde la consola (sólo en `npm run dev`).
if (import.meta.env.DEV) Object.assign(window, { __game: { world, view, perf, clickLatency } });

perf.extra = () =>
  `clic→mov ${clickLatency.size ? clickLatency.mean().toFixed(1) : '--'} ms (máx ${clickLatency.size ? clickLatency.percentile(100).toFixed(1) : '--'})` +
  `  A* ${world.pathfinder.stats.searches} búsquedas`;

let last = performance.now();
view.engine.runRenderLoop(() => {
  const now = performance.now();
  const frameSeconds = Math.min(0.25, (now - last) / 1000);
  perf.frame.push(now - last);
  last = now;

  if (input.consumeKey('KeyL')) view.showPath = !view.showPath;

  // Mantener pulsado: el destino sigue al cursor cada `holdRepathSeconds`.
  if (input.leftDown) {
    holdTimer += frameSeconds;
    if (holdTimer >= data.zone.holdRepathSeconds) {
      holdTimer = 0;
      const p = view.pickGround(input.x, input.y);
      if (p) world.commandMove(p);
    }
  }

  const t0 = performance.now();
  const { steps, alpha } = clock.advance(frameSeconds);
  for (let i = 0; i < steps; i++) world.tick(clock.dt);
  const t1 = performance.now();
  view.sync(world, alpha, frameSeconds);
  view.render();
  const t2 = performance.now();

  const pl = world.player;
  if (pendingClickStamp !== null && steps > 0 && (pl.pos.x !== pl.prevPos.x || pl.pos.y !== pl.prevPos.y)) {
    clickLatency.push(t2 - pendingClickStamp);
    pendingClickStamp = null;
  }

  perf.sim.push(t1 - t0);
  perf.render.push(t2 - t1);
  perf.paint(now);
  input.endFrame();
});
