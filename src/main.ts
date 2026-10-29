import { loadGameData } from './data';
import { ArenaView } from './render/arenaView';
import { CHASER_RENDER_MODES, type ChaserRenderMode } from './render/chaserView';
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
/**
 * Prueba de carga desde la consola: `await __game.bench(200, 'instanced', 5)`.
 * Pone `n` perseguidores, espera 1 s de calentamiento y mide `seconds`.
 */
async function bench(n: number, mode: ChaserRenderMode, seconds = 5): Promise<Record<string, number | string>> {
  world.spawnChasers(n);
  view.chasers.mode = mode;
  const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
  await wait(1000);
  perf.frame.clear();
  perf.sim.clear();
  perf.render.clear();
  await wait(seconds * 1000);
  const r2 = (v: number): number => Math.round(v * 1000) / 1000;
  return {
    n,
    mode,
    frames: perf.frame.size,
    fps: r2(1000 / perf.frame.mean()),
    frameMeanMs: r2(perf.frame.mean()),
    frameP95Ms: r2(perf.frame.percentile(95)),
    simMeanMs: r2(perf.sim.mean()),
    simP95Ms: r2(perf.sim.percentile(95)),
    renderMeanMs: r2(perf.render.mean()),
    renderP95Ms: r2(perf.render.percentile(95)),
  };
}

// Acceso de depuración desde la consola (sólo en `npm run dev`).
if (import.meta.env.DEV) Object.assign(window, { __game: { world, view, perf, clickLatency, bench } });

// `?bench=1` (Electron con `--bench`): batería fija y una línea `BENCH {json}`.
if (new URLSearchParams(location.search).has('bench')) {
  void (async () => {
    const runs: Array<[number, ChaserRenderMode]> = [[0, 'instanced'], [20, 'instanced'], [200, 'instanced'], [200, 'meshes'], [200, 'hidden']];
    const results = [];
    for (const [n, mode] of runs) results.push(await bench(n, mode, 5));
    console.log(`BENCH ${JSON.stringify({ userAgent: navigator.userAgent, results })}`);
  })();
}

perf.extra = () =>
  `clic→mov ${clickLatency.size ? clickLatency.mean().toFixed(1) : '--'} ms (máx ${clickLatency.size ? clickLatency.percentile(100).toFixed(1) : '--'})` +
  `  A* ${world.pathfinder.stats.searches} búsquedas\n` +
  `carga: ${world.chasers.list.length} perseguidores · render ${view.chasers.mode}  [1]=20 [2]=200 [0]=quitar [V]=modo`;

let last = performance.now();
view.engine.runRenderLoop(() => {
  const now = performance.now();
  const frameSeconds = Math.min(0.25, (now - last) / 1000);
  perf.frame.push(now - last);
  last = now;

  if (input.consumeKey('KeyL')) view.showPath = !view.showPath;
  if (input.consumeKey('Digit1')) world.spawnChasers(20);
  if (input.consumeKey('Digit2')) world.spawnChasers(200);
  if (input.consumeKey('Digit0')) world.spawnChasers(0);
  if (input.consumeKey('KeyV')) {
    const i = CHASER_RENDER_MODES.indexOf(view.chasers.mode);
    view.chasers.mode = CHASER_RENDER_MODES[(i + 1) % CHASER_RENDER_MODES.length]!;
  }

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
