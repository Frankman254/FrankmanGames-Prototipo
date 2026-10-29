import { loadGameData } from './data';
import { ArenaView } from './render/arenaView';
import { CHASER_RENDER_MODES, type ChaserRenderMode } from './render/chaserView';
import { LootView } from './render/lootView';
import { RpgSessionFactory } from './rpg/session';
import { FixedStepClock } from './sim/loop';
import { FrameStats } from './sim/frameStats';
import { Telemetry } from './sim/telemetry';
import { World } from './sim/world';
import { Hud } from './ui/hud';
import { Input } from './ui/input';
import { PerfOverlay } from './ui/perfOverlay';

const SIM_HZ = 60;

const canvas = document.getElementById('view') as HTMLCanvasElement;
const perf = new PerfOverlay(document.getElementById('perf')!);

const data = loadGameData();
let runIndex = 0;
const params = new URLSearchParams(location.search);
// `?bench=1`: la prueba de carga del paso 3 se mide sin el encuentro, como antes.
const benchMode = params.has('bench');
// Slice 03: sesión RPG provisional hasta que la rama de interfaz monte la
// creación de personaje (`?class=storm_weaver` para probar la otra clase).
const classId = params.get('class') ?? data.rpg.rules.defaultClass;
const session = new RpgSessionFactory(data.rpg).newGame(data.rpg.classes[classId] ? classId : data.rpg.rules.defaultClass, 'Aventurero', data.loadTest.seed);
let world = new World(data, { seed: data.loadTest.seed, encounter: !benchMode, character: session.character });
session.attach(world);
const view = new ArenaView(canvas, data);
const lootView = new LootView(view.scene, data.rpg.rules.rarityColor);
const clock = new FixedStepClock(SIM_HZ);
const input = new Input(canvas);
const hud = new Hud(document.getElementById('hud')!, data, [
  { id: 'basic', key: 'Clic' },
  ...[1, 2, 3, 4, 5, 6].map((n) => ({ id: `slot${n}`, key: String(n) })),
  { id: 'evade', key: 'Esp' },
]);

// Latencia de clic: desde el evento hasta el primer fotograma presentado con
// el jugador ya desplazándose.
const clickLatency = new FrameStats(30);
let pendingClickStamp: number | null = null;
let holdTimer = 0;
/** Enemigo sobre el que empezó la pulsación: mantener pulsado repite el ataque básico. */
let holdEnemy: number | null = null;

input.onPointerDown((e) => {
  if (e.button !== 0) return;
  holdTimer = 0;
  // Clic sobre un enemigo (picking de su malla) = ataque básico.
  holdEnemy = view.pickEnemy(e.offsetX, e.offsetY);
  if (holdEnemy !== null) {
    world.commandAttack(holdEnemy);
    pendingClickStamp = null;
    return;
  }
  // Clic sobre un botín del suelo = ir a recogerlo.
  const lootId = lootView.pick(view.scene, e.offsetX, e.offsetY);
  if (lootId !== null) {
    world.commandPickup(lootId);
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
  world = new World(data, { seed: data.loadTest.seed + runIndex, character: session.character });
  session.attach(world);
  view.resetRun();
  lootView.reset();
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
      session,
      bench,
      telemetry,
      restart,
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
  `enemigos vivos ${world.enemies.aliveCount()} · nivel ${world.character.level} · ${world.character.gold} oro · [1-6] hechizos [Esp] evasión [R] reiniciar [T] telemetría\n` +
  `carga: ${world.chasers.list.length} perseguidores · render ${view.chasers.mode}  [F6]=20 [F7]=200 [F8]=quitar [V]=modo`;

let last = performance.now();
view.engine.runRenderLoop(() => {
  const now = performance.now();
  const frameSeconds = Math.min(0.25, (now - last) / 1000);
  perf.frame.push(now - last);
  last = now;

  if (input.consumeKey('KeyL')) view.showPath = !view.showPath;
  if (input.consumeKey('F6')) world.spawnChasers(20);
  if (input.consumeKey('F7')) world.spawnChasers(200);
  if (input.consumeKey('F8')) world.spawnChasers(0);
  if (input.consumeKey('KeyV')) {
    const i = CHASER_RENDER_MODES.indexOf(view.chasers.mode);
    view.chasers.mode = CHASER_RENDER_MODES[(i + 1) % CHASER_RENDER_MODES.length]!;
  }

  if (input.consumeKey('KeyR')) restart();
  if (input.consumeKey('KeyT')) saveTelemetry();
  for (let n = 1; n <= 6; n++) if (input.consumeKey(`Digit${n}`)) world.commandCastSlot(n - 1, cursorAim());
  if (input.consumeKey('Space')) world.commandEvade(cursorAim().point);

  // Mantener pulsado: el destino sigue al cursor cada `holdRepathSeconds`; si
  // la pulsación empezó sobre un enemigo, se repite el ataque básico.
  if (input.leftDown) {
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
  const { steps, alpha } = clock.advance(frameSeconds);
  for (let i = 0; i < steps; i++) world.tick(clock.dt);
  const t1 = performance.now();
  const events = world.drainEvents();
  telemetry.record(events, world.endTime ?? world.time);
  for (const e of events) {
    if (e.type !== 'outcome') continue;
    const run = telemetry.runs[telemetry.runs.length - 1]!;
    hud.showOutcome(run);
    console.info(`[telemetría] partida ${run.run}: ${e.outcome}`, JSON.stringify(run));
  }
  view.handleEvents(world, events);
  hud.update(world, events, frameSeconds);
  view.sync(world, alpha, frameSeconds);
  lootView.sync(world, alpha, frameSeconds);
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
