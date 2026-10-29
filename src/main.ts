import { loadGameData } from './data';
import { ArenaView } from './render/arenaView';
import { CHASER_RENDER_MODES, type ChaserRenderMode } from './render/chaserView';
import { FixedStepClock } from './sim/loop';
import { FrameStats } from './sim/frameStats';
import { Telemetry } from './sim/telemetry';
import { World } from './sim/world';
import { Hud } from './ui/hud';
import { Input } from './ui/input';
import { createFakeFactory, type FakeSession } from './ui/menus/fake/fakeSession';
import { mountMenus, type Action } from './ui/menus';
import { PerfOverlay } from './ui/perfOverlay';

const SIM_HZ = 60;

const canvas = document.getElementById('view') as HTMLCanvasElement;
const perfEl = document.getElementById('perf')!;
const perf = new PerfOverlay(perfEl);

const data = loadGameData();
let runIndex = 0;
// `?bench=1`: la prueba de carga del paso 3 se mide sin el encuentro, como antes.
const benchMode = new URLSearchParams(location.search).has('bench');
let world = new World(data, { seed: data.loadTest.seed, encounter: !benchMode });
const view = new ArenaView(canvas, data);
const clock = new FixedStepClock(SIM_HZ);
const input = new Input(canvas);
const hud = new Hud(document.getElementById('hud')!, data, [
  { id: 'basic', key: 'Clic' },
  { id: 'cheap', key: 'Q' },
  { id: 'cone', key: 'W' },
  { id: 'evade', key: 'Esp' },
]);

// Interfaz del Slice 03 (título, creación, HUD, mochila, personaje, libro,
// pausa). Para usar la lógica real basta cambiar esta fábrica por la de
// `src/rpg/` (rama `slice03-sistemas`); `fakeSession` y su puente desaparecen.
let fakeSession: FakeSession | null = null;
const sessionFactory = createFakeFactory({ demo: true, onSession: (s) => (fakeSession = s) });
// La medición `?bench` arranca sin menús, como antes.
const menus = benchMode ? null : mountMenus(sessionFactory);

// Latencia de clic: desde el evento hasta el primer fotograma presentado con
// el jugador ya desplazándose.
const clickLatency = new FrameStats(30);
let pendingClickStamp: number | null = null;
let holdTimer = 0;
/** Enemigo sobre el que empezó la pulsación: mantener pulsado repite el ataque básico. */
let holdEnemy: number | null = null;

input.onPointerDown((e) => {
  if (e.button !== 0 || menus?.blocksGame) return;
  holdTimer = 0;
  // Clic sobre un enemigo (picking de su malla) = ataque básico.
  holdEnemy = view.pickEnemy(e.offsetX, e.offsetY);
  if (holdEnemy !== null) {
    world.commandAttack(holdEnemy);
    pendingClickStamp = null;
    return;
  }
  const p = view.pickGround(e.offsetX, e.offsetY);
  if (!p) return;
  world.commandMove(p); // la orden entra antes del siguiente tick
  pendingClickStamp = world.player.path.length > 0 ? e.timeStamp : null;
});

// Telemetría local: una entrada por partida; se vuelca a consola al terminar
// cada una y se guarda como JSON con la tecla T.
const telemetry = new Telemetry();
telemetry.begin(new Date().toISOString());

/** Reinicio rápido: partida nueva sin recargar la página ni los datos. */
function restart(): void {
  telemetry.begin(new Date().toISOString()); // cierra la anterior como `abandoned` si seguía en juego
  runIndex++;
  world = new World(data, { seed: data.loadTest.seed + runIndex });
  view.resetRun();
  hud.clearLog();
  hud.hideOutcome();
  clock.reset();
  holdEnemy = null;
  pendingClickStamp = null;
}

function saveTelemetry(): void {
  const json = telemetry.toJSON();
  console.info('[telemetría]', json);
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `telemetria-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Punto del suelo y enemigo bajo el cursor, para apuntar habilidades. */
function cursorAim(): { point: { x: number; y: number }; targetId: number | null } {
  return { point: view.pickGround(input.x, input.y) ?? { ...world.player.pos }, targetId: view.pickEnemy(input.x, input.y) };
}
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
if (import.meta.env.DEV) {
  Object.assign(window, {
    __game: {
      get world() {
        return world;
      },
      view,
      perf,
      clickLatency,
      bench,
      telemetry,
      restart,
      get session() {
        return menus?.session ?? null;
      },
    },
  });
}

// `?bench=1` (Electron con `--bench`): batería fija y una línea `BENCH {json}`.
if (benchMode) {
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
  `enemigos vivos ${world.enemies.aliveCount()} · [${key('evade')}] evasión [${key('restartArena')}] reiniciar [${key('telemetry')}] telemetría\n` +
  `carga: ${world.chasers.list.length} perseguidores · render ${view.chasers.mode}  [${key('loadTest20')}]=20 [${key('loadTest200')}]=200 [${key('loadTestClear')}]=quitar [${key('loadTestMode')}]=modo`;

function key(a: Action): string {
  return menus?.keys.label(a) ?? a;
}

// Acciones de teclado que la interfaz no resuelve. Atajos en data/ui/keybindings.json.
menus?.onAction((a) => {
  switch (a) {
    case 'togglePath':
      view.showPath = !view.showPath;
      break;
    case 'loadTest20':
      world.spawnChasers(20);
      break;
    case 'loadTest200':
      world.spawnChasers(200);
      break;
    case 'loadTestClear':
      world.spawnChasers(0);
      break;
    case 'loadTestMode': {
      const i = CHASER_RENDER_MODES.indexOf(view.chasers.mode);
      view.chasers.mode = CHASER_RENDER_MODES[(i + 1) % CHASER_RENDER_MODES.length]!;
      break;
    }
    case 'restartArena':
      restart();
      break;
    case 'telemetry':
      saveTelemetry();
      break;
    case 'evade':
      world.commandEvade(cursorAim().point);
      break;
    // Puente provisional hasta integrar la rama A: los huecos 1 y 2 de la barra
    // disparan las dos habilidades de la arena del Slice 01.
    case 'hotbar1':
      world.commandCast('cheap', cursorAim());
      break;
    case 'hotbar2':
      world.commandCast('cone', cursorAim());
      break;
    default:
      break;
  }
});
menus?.onOptions((o) => {
  perfEl.style.display = o.showFps ? '' : 'none';
});

let last = performance.now();
view.engine.runRenderLoop(() => {
  const now = performance.now();
  const frameSeconds = Math.min(0.25, (now - last) / 1000);
  perf.frame.push(now - last);
  last = now;

  // Título, creación, pausa u otra ventana modal: el mundo se detiene.
  const paused = menus?.blocksGame ?? false;

  // Mantener pulsado: el destino sigue al cursor cada `holdRepathSeconds`; si
  // la pulsación empezó sobre un enemigo, se repite el ataque básico.
  if (input.leftDown && !paused) {
    holdTimer += frameSeconds;
    if (holdTimer >= data.zone.holdRepathSeconds) {
      holdTimer = 0;
      if (holdEnemy !== null) {
        world.commandAttack(holdEnemy);
      } else {
        const p = view.pickGround(input.x, input.y);
        if (p) world.commandMove(p);
      }
    }
  }

  const t0 = performance.now();
  const { steps, alpha } = paused ? { steps: 0, alpha: 1 } : clock.advance(frameSeconds);
  for (let i = 0; i < steps; i++) world.tick(clock.dt);
  const t1 = performance.now();
  const events = world.drainEvents();
  telemetry.record(events, world.endTime ?? world.time);
  for (const e of events) {
    if (e.type === 'enemyDeath') fakeSession?.grantKill(); // demo: XP y botín de mentira
    if (e.type !== 'outcome') continue;
    const run = telemetry.runs[telemetry.runs.length - 1]!;
    hud.showOutcome(run);
    console.info(`[telemetría] partida ${run.run}: ${e.outcome}`, JSON.stringify(run));
  }
  view.handleEvents(world, events);
  hud.update(world, events, frameSeconds);
  menus?.frame(frameSeconds);
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
