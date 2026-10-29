import { loadGameData } from './data';
import { loadWorldData } from './data/worldData';
import { SceneInstrumentation } from '@babylonjs/core';
import { ArenaView } from './render/arenaView';
import { CHASER_RENDER_MODES, type ChaserRenderMode } from './render/chaserView';
import { LootView } from './render/lootView';
import { NpcView } from './render/npcView';
import { WaterView } from './render/waterView';
import { GameSession, RpgSessionFactory } from './rpg/session';
import { FixedStepClock } from './sim/loop';
import { FrameStats } from './sim/frameStats';
import { Telemetry } from './sim/telemetry';
import { World } from './sim/world';
import { Hud } from './ui/hud';
import { Input } from './ui/input';
import { mountMenus, type Action } from './ui/menus';
import { PerfOverlay } from './ui/perfOverlay';
import { buildOverworld, withOverworldZone } from './world/overworld';

const SIM_HZ = 60;

const canvas = document.getElementById('view') as HTMLCanvasElement;
const perfEl = document.getElementById('perf')!;
const perf = new PerfOverlay(perfEl);

const buildStart = performance.now();
const overworld = buildOverworld(loadWorldData());
const data = withOverworldZone(loadGameData(), overworld);
let runIndex = 0;
// `?bench=1`: la prueba de carga del paso 3 se mide sin el encuentro, como antes.
const benchMode = new URLSearchParams(location.search).has('bench');
// Hasta que el título cree o cargue una partida, el mundo usa un personaje de
// la clase por defecto (sólo se ve de fondo: el título detiene la simulación).
let world = new World(data, { seed: data.loadTest.seed, encounter: !benchMode });
let session: GameSession | null = null;
const view = new ArenaView(canvas, data, overworld);
const lootView = new LootView(view.scene, data.rpg.rules.rarityColor);
const waterView = new WaterView(view.scene, overworld.def, view.heights);
const npcView = new NpcView(view.scene, overworld.characters, view.assets, view.heights, data.rpg.merchants, view.atmosphere);
/** Tiempo de generar el mundo (alturas, splatmap, mallas) al arrancar. */
const buildMs = performance.now() - buildStart;
const clock = new FixedStepClock(SIM_HZ);
const input = new Input(canvas);
const hud = new Hud(document.getElementById('hud')!, data, [
  { id: 'basic', key: 'Clic' },
  ...[1, 2, 3, 4, 5, 6].map((n) => ({ id: `slot${n}`, key: String(n) })),
  { id: 'evade', key: 'Esp' },
]);

// Interfaz del Slice 03 (título, creación, HUD, mochila, personaje, libro,
// pausa) sobre la lógica real de `src/rpg/`. La medición `?bench` arranca sin menús.
const menus = benchMode ? null : mountMenus(new RpgSessionFactory(data.rpg));

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
  // Pescando, cualquier clic con el pez picado lo saca (también F).
  if (world.fishing?.state === 'bite') {
    world.commandFish(null);
    pendingClickStamp = null;
    return;
  }
  // Clic sobre un mercader = ir a hablarle (abre su tienda al llegar).
  const merchantId = npcView.pick(e.offsetX, e.offsetY);
  if (merchantId !== null) {
    world.commandTalk(merchantId);
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
  // Clic en el agua = pescar (o sacar el sedal si ya está dentro).
  if (world.fishingSpotAt(p)) {
    world.commandFish(p);
    pendingClickStamp = null;
    return;
  }
  world.commandMove(p); // la orden entra antes del siguiente tick
  pendingClickStamp = world.player.path.length > 0 ? e.timeStamp : null;
});

// Telemetría local: una entrada por partida; se vuelca a consola al terminar
// cada una y se guarda como JSON con la tecla T.
const telemetry = new Telemetry();
telemetry.begin(new Date().toISOString());

/** Reinicio rápido: arena nueva sin recargar; el personaje (nivel, objetos) se conserva. */
function restart(): void {
  telemetry.begin(new Date().toISOString()); // cierra la anterior como `abandoned` si seguía en juego
  runIndex++;
  newWorld(data.loadTest.seed + runIndex);
}

/** Crea el mundo con el personaje de la sesión en curso y lo enlaza con ella. */
function newWorld(seed: number): void {
  session?.attach(null);
  world = new World(data, session ? { seed, character: session.character } : { seed });
  world.aimProvider = cursorAim;
  session?.attach(world);
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
async function bench(n: number, mode: ChaserRenderMode, seconds = 5, timeOfDay: number | null = null, characters = 0): Promise<Record<string, number | string>> {
  world.spawnChasers(n);
  // Enemigos animados (personajes procedurales) en corro alrededor del jugador.
  const kinds = Object.keys(data.enemies.archetypes);
  for (let i = 0; i < characters; i++) {
    const a = (i / Math.max(1, characters)) * Math.PI * 2;
    const r = 7 + (i % 3) * 2;
    world.spawnEnemy(kinds[i % kinds.length]!, { x: world.player.pos.x + Math.cos(a) * r, y: world.player.pos.y + Math.sin(a) * r });
  }
  view.chasers.mode = mode;
  view.atmosphere.fixedTime = timeOfDay;
  const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
  await wait(1000);
  perf.frame.clear();
  perf.sim.clear();
  perf.render.clear();
  // Draw calls y mallas activas medidos durante la misma ventana.
  const inst = new SceneInstrumentation(view.scene);
  let drawCalls = 0;
  let activeMeshes = 0;
  let samples = 0;
  const obs = view.scene.onAfterRenderObservable.add(() => {
    drawCalls += inst.drawCallsCounter.current;
    activeMeshes += view.scene.getActiveMeshes().length;
    samples++;
  });
  await wait(seconds * 1000);
  view.scene.onAfterRenderObservable.remove(obs);
  inst.dispose();
  const r2 = (v: number): number => Math.round(v * 1000) / 1000;
  return {
    n,
    mode,
    timeOfDay: timeOfDay ?? view.atmosphere.timeOfDay,
    enemies: world.enemies.list.length,
    drawCalls: Math.round(drawCalls / Math.max(1, samples)),
    activeMeshes: Math.round(activeMeshes / Math.max(1, samples)),
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
        return session;
      },
    },
  });
}

// `?bench=1` (Electron con `--bench`): batería fija y una línea `BENCH {json}`.
if (benchMode) {
  void (async () => {
    // Mundo visual: mediodía (sombras del sol) y noche (farolas + luz del jugador).
    const runs: Array<[number, ChaserRenderMode, number]> = [
      [0, 'instanced', 0.5], [20, 'instanced', 0.5], [200, 'instanced', 0.5], [200, 'meshes', 0.5], [200, 'hidden', 0.5],
      [0, 'instanced', 0.95], [200, 'instanced', 0.95],
    ];
    const results = [];
    for (const [n, mode, t] of runs) results.push(await bench(n, mode, 5, t));
    // Al final (los enemigos se quedan): 20 personajes animados + 200 perseguidores.
    results.push(await bench(200, 'instanced', 5, 0.5, 20));
    const screen = { canvasPx: [canvas.width, canvas.height], cssPx: [canvas.clientWidth, canvas.clientHeight], dpr: devicePixelRatio, worldBuildMs: Math.round(buildMs) };
    console.log(`BENCH ${JSON.stringify({ userAgent: navigator.userAgent, screen, results })}`);
  })();
}

perf.extra = () =>
  `clic→mov ${clickLatency.size ? clickLatency.mean().toFixed(1) : '--'} ms (máx ${clickLatency.size ? clickLatency.percentile(100).toFixed(1) : '--'})` +
  `  A* ${world.pathfinder.stats.searches} búsquedas\n` +
  `enemigos vivos ${world.enemies.aliveCount()} · [${key('evade')}] evasión [${key('restartArena')}] reiniciar [${key('telemetry')}] telemetría\n` +
  `carga: ${world.chasers.list.length} perseguidores · render ${view.chasers.mode}  [${key('loadTest20')}]=20 [${key('loadTest200')}]=200 [${key('loadTestClear')}]=quitar [${key('loadTestMode')}]=modo` +
  `
mundo generado en ${buildMs.toFixed(0)} ms
` +
  `pasos ${view.player.footsteps} · pie↔suelo ${view.player.footError.size ? view.player.footError.mean().toFixed(1) : '--'} cm (máx ${view.player.footError.size ? view.player.footError.percentile(100).toFixed(1) : '--'}) · eventos ${animEventText()}
` +
  `hora ${clockText(view.atmosphere.timeOfDay)} · [F2] reloj ×${view.atmosphere.timeScale} [F3] +3 h · rueda pulsada = girar cámara`;

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
    case 'fish':
      if (!world.commandFish(null)) menus?.toast('No hay agua cerca para pescar', 'warn');
      break;
    default:
      break;
  }
});
// Partida nueva o cargada: arena nueva con ese personaje.
menus?.onSession((s) => {
  if (!(s instanceof GameSession)) throw new Error('la interfaz debe usar la sesión real');
  session = s;
  telemetry.begin(new Date().toISOString());
  runIndex++;
  newWorld(data.loadTest.seed + runIndex);
});
world.aimProvider = cursorAim;
menus?.onOptions((o) => {
  perfEl.style.display = o.showFps ? '' : 'none';
});

/** Recuento de eventos de animación (footstep, hit, cast) desde el arranque. */
const animEventCounts: Record<string, number> = {};
function animEventText(): string {
  return Object.entries(animEventCounts).map(([k, n]) => `${k} ${n}`).join(' · ') || '--';
}

function clockText(t: number): string {
  const minutes = Math.floor(t * 24 * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

let last = performance.now();
view.engine.runRenderLoop(() => {
  const now = performance.now();
  const frameSeconds = Math.min(0.25, (now - last) / 1000);
  perf.frame.push(now - last);
  last = now;

  // Título, creación, pausa u otra ventana modal: el mundo se detiene.
  const paused = menus?.blocksGame ?? false;

  // Cámara orbital: rueda pulsada y arrastrar (también en pausa).
  const drag = input.consumeOrbitDrag();
  if (drag.dx !== 0 || drag.dy !== 0) view.rig.orbit(drag.dx, drag.dy);
  // Depuración del ciclo día/noche en teclas F (1–6, Q, E y R son del juego).
  if (input.consumeKey('F2')) view.atmosphere.timeScale = view.atmosphere.timeScale === 1 ? 40 : 1;
  if (input.consumeKey('F3')) view.atmosphere.elapsed += overworld.lighting.dayLengthSeconds / 8;

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
    if (e.type !== 'outcome') continue;
    const run = telemetry.runs[telemetry.runs.length - 1]!;
    hud.showOutcome(run);
    console.info(`[telemetría] partida ${run.run}: ${e.outcome}`, JSON.stringify(run));
  }
  view.handleEvents(world, events);
  waterView.handleEvents(events);
  hud.update(world, events, frameSeconds);
  menus?.frame(frameSeconds);
  view.sync(world, alpha, frameSeconds);
  lootView.sync(world, alpha, frameSeconds);
  npcView.sync(world, frameSeconds);
  waterView.sync(world, view.player.model.root.position, frameSeconds);
  // Alejarse del mercader cierra su tienda.
  const openShop = menus?.merchantOpen;
  if (openShop) {
    const n = world.npcs.find((x) => x.merchantId === openShop);
    if (!n || Math.hypot(n.pos.x - world.player.pos.x, n.pos.y - world.player.pos.y) > 6) menus?.closeMerchant();
  }
  // Eventos por fotograma de las animaciones. La simulación todavía no los consume;
  // de momento se cuentan y se ven en el panel de medición.
  for (const ev of view.animEvents) animEventCounts[ev.type] = (animEventCounts[ev.type] ?? 0) + 1;
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
