import { loadGameData } from './data';
import { loadWorldData } from './data/worldData';
import { SceneInstrumentation } from '@babylonjs/core';
import { ArenaView } from './render/arenaView';
import { CHASER_RENDER_MODES, type ChaserRenderMode } from './render/chaserView';
import { GridView } from './render/gridView';
import { LootView } from './render/lootView';
import { OcclusionPlugin } from './render/occlusion';
import { NpcView } from './render/npcView';
import { CharacterCrowd } from './render/characters/benchCrowd';
import { WaterView } from './render/waterView';
import { StoneView } from './render/stoneView';
import { WeatherView } from './render/weatherView';
import { WEATHER_KINDS } from './data/zonesSchema';
import { StoneBook, mapCoords, parseStones, type StoneDef } from './world/stones';
import stonesJson from '../data/stones.json';
import { loadFx } from './data/fxSchema';
import { HoverLabel } from './ui/hoverLabel';
import { GameSession, RpgSessionFactory } from './rpg/session';
import { FixedStepClock } from './sim/loop';
import { FrameStats } from './sim/frameStats';
import { Telemetry } from './sim/telemetry';
import { needsAim, World } from './sim/world';
import { CastInput } from './sim/castModes';
import { CAST_BLOCK_TEXT } from './sim/combat';
import { hotbarIndex } from './ui/menus/keybindings';
import { Hud } from './ui/hud';
import { Input } from './ui/input';
import { mountMenus, type Action } from './ui/menus';
import { DEFAULT_OPTIONS, loadOptions } from './ui/menus/saveStore';
import { mountAudio } from './audio/director';
import { mountEditor } from './ui/editor';
import { PerfOverlay } from './ui/perfOverlay';
import { buildOverworld, withOverworldZone } from './world/overworld';
import { loadDungeon } from './data/dungeonSchema';
import { CryptScene } from './scenes/cryptScene';
import { SwitchableHeightField } from './world/switchableGround';

const SIM_HZ = 60;

const canvas = document.getElementById('view') as HTMLCanvasElement;
const perfEl = document.getElementById('perf')!;
const perf = new PerfOverlay(perfEl);

const buildStart = performance.now();
const overworld = buildOverworld(loadWorldData());
// Mazmorra: el suelo de todas las vistas puede pasar a ser un plano (pisos de la cripta).
const ground = new SwitchableHeightField(overworld.heights);
overworld.heights = ground;
const data = withOverworldZone(loadGameData(), overworld);
let runIndex = 0;
// `?bench=1`: la prueba de carga del paso 3 se mide sin el encuentro, como antes.
const benchMode = new URLSearchParams(location.search).has('bench');
// `?bench=humans`: sólo la medición del corro de humanoides (personaje procedural).
const benchHumansOnly = new URLSearchParams(location.search).get('bench') === 'humans';
// Hasta que el título cree o cargue una partida, el mundo usa un personaje de
// la clase por defecto (sólo se ve de fondo: el título detiene la simulación).
let world = new World(data, { seed: data.loadTest.seed, encounter: !benchMode, zones: !benchMode });
let session: GameSession | null = null;
// MSAA es del contexto WebGL: se lee de las opciones guardadas antes de crear el motor.
const startOptions = benchMode ? DEFAULT_OPTIONS : loadStartOptions();
const view = new ArenaView(canvas, data, overworld, { msaa: startOptions.antialias === 'msaa' });
const lootView = new LootView(view.scene, data.rpg.rules.rarityColor, view.heights, loadFx());
const waterView = new WaterView(view.scene, overworld.def, view.heights);
const npcView = new NpcView(view.scene, overworld.characters, view.assets, view.heights, { ...data.rpg.merchants, ...data.rpg.npcs }, view.atmosphere);
const gridView = new GridView(view.scene, view.heights);
// Piedras Pintadas: puntos de viaje y de reaparición (data/stones.json).
const stonesDef = parseStones(stonesJson);
const stoneView = new StoneView(view.scene, view.heights);
/** Posición real de cada Piedra Pintada: la casilla caminable más cercana a la de los datos. */
const stonePos = new Map<string, { x: number; y: number }>();
const stoneAt = (z: StoneDef): { x: number; y: number } => {
  let p = stonePos.get(z.id);
  if (!p) stonePos.set(z.id, (p = world.grid.center(world.grid.nearestWalkable({ x: z.x, y: z.y }))));
  return p;
};
let stones = new StoneBook(stonesDef);
stoneView.build(stonesDef.stones, stoneAt);
/** Piedra Pintada a la que se va andando tras hacerle clic (al llegar se abre la lista). */
let stoneTarget: string | null = null;
const stoneKey = (): string => `frankmangames.piedras.${session?.character.name ?? '_'}`;
function loadStones(): void {
  let saved: unknown = null;
  try {
    saved = JSON.parse(localStorage.getItem(stoneKey()) ?? 'null');
  } catch {
    saved = null;
  }
  stones = new StoneBook(stonesDef, saved);
}
function saveStones(): void {
  try {
    localStorage.setItem(stoneKey(), JSON.stringify(stones.progress));
  } catch {
    /* sin almacenamiento: sólo dura la sesión */
  }
}
function teleport(p: { x: number; y: number }): void {
  world.player.pos = { ...p };
  world.player.prevPos = { ...p };
  world.player.path = [];
}
function openStones(): void {
  const here = stones.progress.respawn;
  menus?.pickStone(stones.known().map((z) => ({ id: z.id, name: z.name, current: z.id === here })), (id) => {
    const z = stones.get(id);
    if (!z) return;
    teleport(stoneAt(z));
    stones.progress.respawn = id;
    saveStones();
  });
}
// Hora y tiempo (data/weather.json): la simulación usa la hora del reloj de la
// atmósfera (nocturnos, pesca) y el tiempo de la zona del jugador se ve aquí.
const weatherView = data.weather ? new WeatherView(view.scene, data.weather) : null;
let lastWeather = '';
function syncWeather(): void {
  world.timeOfDay = view.atmosphere.timeOfDay;
  const w = world.weather;
  const zone = world.weatherZone();
  const s = w?.at(zone) ?? null;
  const kind = w && s ? w.kindAt(zone) : null;
  const focus = view.player.model.root.position;
  weatherView?.update(focus, crypt?.inside ? null : kind, s?.intensity ?? 0, view.atmosphere);
  const key = kind && zone && !crypt?.inside ? `${zone}:${kind}` : '';
  if (kind && key && key !== lastWeather && lastWeather !== '' && kind !== 'clear') {
    const fire = kind === 'rain' ? ' El fuego pega menos.' : kind === 'sun' ? ' El fuego pega más.' : kind === 'snow' ? ' La nieve acumulada frena el paso.' : '';
    menus?.toast(`${data.weather!.kinds[kind].name}.${fire}`, 'info');
  }
  if (key) lastWeather = key;
}

/** Texto de depuración: tiempo de la zona del jugador, intensidad, nieve y si es de noche. */
function weatherText(): string {
  const w = world.weather;
  const zone = world.weatherZone();
  const s = w?.at(zone);
  if (!w || !s) return '—';
  return `${w.def.kinds[w.kindAt(zone)].name} ${Math.round(s.intensity * 100)}%${s.snow > 0 ? ` nieve ${Math.round(s.snow * 100)}%` : ''}${world.night ? ' (noche)' : ''}`;
}

/** Al caer: vida y recurso llenos, mundo nuevo y de vuelta a la última Piedra Pintada. */
function respawn(): void {
  session?.character.restore();
  restart();
  teleport(stoneAt(stones.respawn));
}
// Cripta de la Tulivieja: boca en el mundo abierto y cambio de escena a sus pisos.
const crypt = benchMode
  ? null
  : new CryptScene({ data, def: loadDungeon(data), view, ground, water: waterView, npcs: npcView, world: () => world, install: installWorld, nextSeed: () => data.loadTest.seed + ++runIndex });
const lootLabel = new HoverLabel(document.getElementById('hud')!);
let lootLabelTimer = 0;
// Combate v2: daño esperado bajo el cursor mientras se apunta un hechizo.
const damageLabel = new HoverLabel(document.getElementById('hud')!);
let damageLabelTimer = 0;
let damageLabelTarget: number | null = null;
/** Tiempo de generar el mundo (alturas, splatmap, mallas) al arrancar. */
const buildMs = performance.now() - buildStart;
const clock = new FixedStepClock(SIM_HZ);
const input = new Input(canvas);
const hud = new Hud(document.getElementById('hud')!, data, [
  { id: 'basic', key: 'Clic' },
  ...[1, 2, 3, 4, 5, 6].map((n) => ({ id: `slot${n}`, key: String(n) })),
]);

// Interfaz del Slice 03 (título, creación, HUD, mochila, personaje, libro,
// pausa) sobre la lógica real de `src/rpg/`. La medición `?bench` arranca sin menús.
const menus = benchMode ? null : mountMenus(new RpgSessionFactory(data.rpg));
if (!benchMode) mountAudio({ world: () => world, view, overworld, menus, session: () => session });
// Modo edición (F12): mover casas, árboles, PNJ y zonas y pintar la navegación; pausa el mundo.
const editor = menus ? mountEditor({ view, overworld, data, keys: () => menus.keys.bindings.editor }) : null;

// Latencia de clic: desde el evento hasta el primer fotograma presentado con
// el jugador ya desplazándose.
const clickLatency = new FrameStats(30);
let pendingClickStamp: number | null = null;
let holdTimer = 0;
/** Enemigo sobre el que empezó la pulsación: mantener pulsado repite el ataque básico. */
let holdEnemy: number | null = null;

// ─── Lanzar hechizos (combate v2): con indicador, al pulsar o pulsar y clic ──
const castInput = new CastInput(startOptions.castMode);
/** El clic izquierdo de esta pulsación confirmó un hechizo: no mueve al soltarlo ni al mantenerlo. */
let clickConsumed = false;
/** Puerta de `World.castSlot`: true = se queda apuntando (la tecla no lanza aún). */
const slotGate = (index: number, spell: Parameters<NonNullable<World['slotGate']>>[1]): boolean => castInput.press(index, needsAim(spell)).kind === 'aim';
/** Lanza lo apuntado hacia el cursor; si no se puede, lo dice. */
function fireSlot(index: number): void {
  const block = world.commandCastSlot(index, cursorAim());
  if (block) menus?.toast(CAST_BLOCK_TEXT[block], 'warn');
}
/** Hechizo que se está apuntando (para el indicador del suelo). */
function aimingSpell(): string | null {
  return castInput.aiming === null ? null : (world.character.spellbook.hotbar[castInput.aiming] ?? null);
}
// Soltar la tecla del hueco lanza (modo con indicador).
window.addEventListener('keyup', (e) => {
  const a = menus?.keys.action(e.code);
  const hot = a ? hotbarIndex(a) : null;
  if (hot === null) return;
  if (castInput.release(hot).kind === 'cast' && !(menus?.blocksGame ?? false)) fireSlot(hot);
});
// Esc mientras se apunta cancela (y no abre la pausa): va antes que la interfaz.
window.addEventListener(
  'keydown',
  (e) => {
    if (castInput.aiming === null) return;
    if (e.code !== 'Escape' && menus?.keys.action(e.code) !== 'pause') return;
    castInput.cancel();
    e.preventDefault();
    e.stopImmediatePropagation();
  },
  true,
);

input.onPointerDown((e) => {
  // Apuntando: clic izquierdo confirma, clic derecho cancela.
  if (castInput.aiming !== null && !menus?.blocksGame) {
    if (e.button === 0) {
      const step = castInput.confirm();
      if (step.kind === 'cast') fireSlot(step.slot);
      clickConsumed = true;
      holdEnemy = null;
      pendingClickStamp = null;
      return;
    }
    if (e.button === 2) {
      castInput.cancel();
      return;
    }
  }
  if (e.button !== 0 || menus?.blocksGame) return;
  clickConsumed = false;
  holdTimer = 0;
  // Boca de la cripta, escaleras y cofres: ir hasta allí y usarlo al llegar.
  if (crypt?.click(e.offsetX, e.offsetY)) {
    holdEnemy = null;
    pendingClickStamp = null;
    return;
  }
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
  // Clic sobre una Piedra Pintada = ir hasta ella; al llegar se abre la lista de destinos.
  const stoneId = stoneView.pick(e.offsetX, e.offsetY);
  if (stoneId !== null) {
    const z = stones.get(stoneId)!;
    stoneTarget = stoneId;
    world.commandMove(stoneAt(z));
    pendingClickStamp = null;
    return;
  }
  stoneTarget = null;
  // Clic sobre un PNJ o mercader = ir a hablarle (al llegar, diálogo o tienda).
  const npcId = npcView.pick(e.offsetX, e.offsetY);
  if (npcId !== null) {
    world.commandTalk(npcId);
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
  crypt?.reset();
  installWorld(new World(data, { seed, zones: !benchMode, timeOfDay: view.atmosphere.timeOfDay, ...(session ? { character: session.character } : {}) }));
}

/** Pone `w` como mundo en curso: sesión, vistas, registro y reloj (también al cambiar de escena). */
function installWorld(w: World): void {
  session?.attach(null);
  world = w;
  world.aimProvider = cursorAim;
  world.slotGate = slotGate;
  castInput.cancel();
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
window.addEventListener('resize', () => view.resize());
/**
 * Prueba de carga desde la consola: `await __game.bench(200, 'instanced', 5)`.
 * Pone `n` perseguidores, espera 1 s de calentamiento y mide `seconds`.
 */
/**
 * Carga de efectos del Slice 02b para la medición: estados en los enemigos, las
 * cuatro mascotas, botín de todas las rarezas y diez impactos con número por
 * segundo (sucesos sintéticos sólo para el render). Devuelve cómo pararla.
 */
function stageEffects(): () => void {
  const c = world.content;
  const looks = ['burn', 'chilled', 'stunned', 'static_charge', 'rooted'];
  world.enemies.list.forEach((e, i) => world.enemyActor(e).statuses.apply(c.statuses[looks[i % looks.length]!]!, { duration: 60 }));
  world.character.statuses.apply(c.statuses['shield']!, { duration: 60, shield: 50 });
  const spawnPet = (world as unknown as { spawnPet(d: unknown, uid: null, ttl: number): void }).spawnPet.bind(world);
  for (const id of Object.keys(c.pets)) spawnPet(c.pets[id]!, null, 600);
  const itemIds = Object.keys(c.items);
  for (let i = 0; i < 10; i++) {
    // Lejos del alcance del jugador y del búho (que recoge botín), pero a la vista.
    const at = { x: world.player.pos.x + Math.cos(i * 0.35) * 12, y: world.player.pos.y + Math.sin(i * 0.35) * 12 };
    world.dropLoot(at, i < 8 ? { uid: `bench${i}`, itemId: itemIds[(i * 7) % itemIds.length]!, quantity: 1, rolled: [] } : null, i < 8 ? 0 : 25);
  }
  const timer = setInterval(() => {
    const alive = world.enemies.list.filter((e) => e.state !== 'dead');
    const e = alive[Math.floor(Math.random() * alive.length)];
    if (e) view.handleEvents(world, [{ type: 'damage', sourceId: world.player.id, targetId: e.id, amount: 12, crit: Math.random() < 0.2, toPlayer: false, ability: 'spark' }]);
  }, 100);
  return () => clearInterval(timer);
}

async function bench(n: number, mode: ChaserRenderMode, seconds = 5, timeOfDay: number | null = null, characters = 0, effects = false, occlusion = true, humans = 0): Promise<Record<string, number | string>> {
  OcclusionPlugin.setEnabled(occlusion);
  // Con enemigos: mundo nuevo y el jugador se mantiene con vida (sólo en la
  // medición), para que no acabe la partida a mitad de la ventana.
  let keepAlive: ReturnType<typeof setInterval> | null = null;
  if (characters > 0 || effects) {
    newWorld(data.loadTest.seed + ++runIndex);
    keepAlive = setInterval(() => {
      if (world.player.alive) world.character.health = world.character.maxHealth;
    }, 50);
  }
  world.spawnChasers(n);
  // Enemigos animados (personajes procedurales) en corro alrededor del jugador.
  const kinds = Object.keys(data.enemies.archetypes);
  for (let i = 0; i < characters; i++) {
    const a = (i / Math.max(1, characters)) * Math.PI * 2;
    const r = 7 + (i % 3) * 2;
    world.spawnEnemy(kinds[i % kinds.length]!, { x: world.player.pos.x + Math.cos(a) * r, y: world.player.pos.y + Math.sin(a) * r });
  }
  // Humanoides procedurales (jugador y PNJ con sus aspectos) en corro, sólo render.
  const crowd = humans > 0 ? new CharacterCrowd(view.scene, overworld.characters, view.assets, view.heights, { x: world.player.pos.x, z: world.player.pos.y }, humans, view.atmosphere) : null;
  view.chasers.mode = mode;
  view.atmosphere.fixedTime = timeOfDay;
  const stopEffects = effects ? stageEffects() : null;
  const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
  await wait(1000);
  perf.frame.clear();
  perf.sim.clear();
  perf.render.clear();
  // Draw calls y mallas activas medidos durante la misma ventana.
  const inst = new SceneInstrumentation(view.scene);
  let drawCalls = 0;
  let activeMeshes = 0;
  let activeIndices = 0;
  let samples = 0;
  // Fotogramas de más de 33 ms en la ventana (tirones).
  let longFrames = 0;
  let lastFrame = performance.now();
  const obs = view.scene.onAfterRenderObservable.add(() => {
    const now = performance.now();
    if (now - lastFrame > 33) longFrames++;
    lastFrame = now;
    drawCalls += inst.drawCallsCounter.current;
    activeMeshes += view.scene.getActiveMeshes().length;
    activeIndices += view.scene.getActiveIndices();
    samples++;
  });
  await wait(seconds * 1000);
  view.scene.onAfterRenderObservable.remove(obs);
  stopEffects?.();
  crowd?.dispose();
  if (keepAlive) clearInterval(keepAlive);
  inst.dispose();
  const r2 = (v: number): number => Math.round(v * 1000) / 1000;
  return {
    n,
    mode,
    timeOfDay: timeOfDay ?? view.atmosphere.timeOfDay,
    effects: effects ? 'sí' : 'no',
    occlusion: occlusion ? 'sí' : 'no',
    pets: world.pets.length,
    loot: world.loot.length,
    enemies: world.enemies.list.length,
    humans,
    drawCalls: Math.round(drawCalls / Math.max(1, samples)),
    activeMeshes: Math.round(activeMeshes / Math.max(1, samples)),
    activeTriangles: Math.round(activeIndices / 3 / Math.max(1, samples)),
    frames: perf.frame.size,
    fps: r2(1000 / perf.frame.mean()),
    frameMeanMs: r2(perf.frame.mean()),
    frameP95Ms: r2(perf.frame.percentile(95)),
    frameMaxMs: r2(perf.frame.percentile(100)),
    longFrames,
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
      crypt,
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
    // Corro de humanoides: sin nadie más y con 24 personajes procedurales.
    if (benchHumansOnly) {
      for (const humans of [0, 24]) results.push(await bench(0, 'instanced', 5, 0.5, 0, false, true, humans));
      console.log(`BENCH ${JSON.stringify({ userAgent: navigator.userAgent, results })}`);
      return;
    }
    for (const [n, mode, t] of runs) results.push(await bench(n, mode, 5, t));
    // Al final (los enemigos se quedan): 20 personajes animados + 200 perseguidores.
    results.push(await bench(200, 'instanced', 5, 0.5, 20));
    // Slice 02b: lo mismo con efectos (estados, mascotas, botín, impactos y números).
    results.push(await bench(200, 'instanced', 5, 0.5, 20, true));
    // Slice 02c: coste del recorte de oclusión (misma carga, recorte apagado).
    results.push(await bench(200, 'instanced', 5, 0.5, 20, true, false));
    // Personaje 3D: 24 humanoides procedurales animados (jugador y PNJ).
    results.push(await bench(0, 'instanced', 5, 0.5, 0, false, true, 24));
    const screen = { canvasPx: [canvas.width, canvas.height], cssPx: [canvas.clientWidth, canvas.clientHeight], dpr: devicePixelRatio, worldBuildMs: Math.round(buildMs) };
    console.log(`BENCH ${JSON.stringify({ userAgent: navigator.userAgent, screen, results })}`);
  })();
}

perf.extra = () =>
  `clic→mov ${clickLatency.size ? clickLatency.mean().toFixed(1) : '--'} ms (máx ${clickLatency.size ? clickLatency.percentile(100).toFixed(1) : '--'})` +
  `  A* ${world.pathfinder.stats.searches} búsquedas\n` +
  `enemigos vivos ${world.enemies.aliveCount()} · [${key('restartArena')}] reiniciar [${key('telemetry')}] telemetría\n` +
  `carga: ${world.chasers.list.length} perseguidores · render ${view.chasers.mode}  [${key('loadTest20')}]=20 [${key('loadTest200')}]=200 [${key('loadTestClear')}]=quitar [${key('loadTestMode')}]=modo` +
  `
mundo generado en ${buildMs.toFixed(0)} ms
` +
  `pasos ${view.player.footsteps} · pie↔suelo ${view.player.footError.size ? view.player.footError.mean().toFixed(1) : '--'} cm (máx ${view.player.footError.size ? view.player.footError.percentile(100).toFixed(1) : '--'}) · eventos ${animEventText()}
` +
  `hora ${clockText(view.atmosphere.timeOfDay)} · [F2] reloj ×${view.atmosphere.timeScale} [F3] +3 h [Insert] tiempo: ${weatherText()} · girar cámara: rueda o clic derecho y arrastrar, mantener [${key('cameraOrbit')}], [${key('cameraLeft')}]/[${key('cameraRight')}]`;

function key(a: Action): string {
  return menus?.keys.label(a) ?? a;
}

// Acciones de teclado que la interfaz no resuelve. Atajos en data/ui/keybindings.json.
menus?.onAction((a) => {
  switch (a) {
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
  loadStones();
  telemetry.begin(new Date().toISOString());
  runIndex++;
  newWorld(data.loadTest.seed + runIndex);
});
world.aimProvider = cursorAim;
world.slotGate = slotGate;
view.cursorGround = () => view.pickGround(input.x, input.y);
view.spellFx.aiming = () => {
  const id = aimingSpell();
  return id === null ? null : { spellId: id, ...cursorAim() };
};
/** Límite de FPS de las opciones (0 = sin límite). */
let fpsCap = 0;
/** Grados por segundo al girar con las teclas de cámara. */
let cameraKeySpeed = 120;
menus?.onOptions((o) => {
  perfEl.style.display = o.showFps ? '' : 'none';
  view.showPath = o.showPath;
  gridView.visible = o.showGrid;
  view.rig.sensitivity = o.cameraSensitivity;
  view.rig.invertX = o.invertCameraX;
  view.rig.invertY = o.invertCameraY;
  cameraKeySpeed = o.cameraKeySpeed;
  fpsCap = o.fpsCap;
  view.applyGraphics(o);
  view.showDamageNumbers = o.damageNumbers;
  view.showEnemyLabels = o.enemyLabels;
  view.enemies.barMode = o.enemyBars;
  view.spellFx.showRange = o.showSpellRange;
  castInput.setMode(o.castMode);
});

function loadStartOptions(): typeof DEFAULT_OPTIONS {
  try {
    return loadOptions(localStorage);
  } catch {
    return DEFAULT_OPTIONS;
  }
}
/** Teclas de una acción mantenida (se leen cada fotograma: el jugador puede cambiarlas). */
const holdKeys = (a: Action): readonly string[] => menus?.keys.bindings[a] ?? [];
// Mantener la tecla de giro: mover el cursor orbita la cámara (Mac sin rueda).
input.hoverOrbit = () => !(menus?.blocksGame ?? false) && input.isHeld(holdKeys('cameraOrbit'));

/** Recuento de eventos de animación (footstep, hit, cast) desde el arranque. */
const animEventCounts: Record<string, number> = {};
function animEventText(): string {
  return Object.entries(animEventCounts).map(([k, n]) => `${k} ${n}`).join(' · ') || '--';
}

/** «12–19 · crítico 17–28 (8 %)», o «Inmune». */
function previewText(p: NonNullable<ReturnType<World['previewDamage']>>): string {
  if (p.immune) return 'Inmune';
  const range = (a: number, b: number): string => (a === b ? `${a}` : `${a}–${b}`);
  const crit = p.critChance > 0 ? ` · crítico ${range(p.critMin, p.critMax)} (${Math.round(p.critChance * 100)} %)` : '';
  return `${range(p.min, p.max)}${crit}`;
}

function clockText(t: number): string {
  const minutes = Math.floor(t * 24 * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

let last = performance.now();
view.engine.runRenderLoop(() => {
  const now = performance.now();
  // Límite de FPS: se salta el fotograma si aún no toca (1 ms de margen por el redondeo del vsync).
  if (fpsCap > 0 && now - last < 1000 / fpsCap - 1) return;
  const frameSeconds = Math.min(0.25, (now - last) / 1000);
  perf.frame.push(now - last);
  last = now;

  // Título, creación, pausa u otra ventana modal: el mundo se detiene.
  const paused = (menus?.blocksGame ?? false) || (editor?.active ?? false);

  // Cámara orbital: rueda pulsada y arrastrar (también en pausa).
  const drag = input.consumeOrbitDrag();
  if (drag.dx !== 0 || drag.dy !== 0) view.rig.orbit(drag.dx, drag.dy);
  // Girar con teclas (por defecto , y .), a la velocidad de las opciones.
  if (!paused) {
    const turn = (input.isHeld(holdKeys('cameraRight')) ? 1 : 0) - (input.isHeld(holdKeys('cameraLeft')) ? 1 : 0);
    if (turn !== 0) view.rig.turn(turn * cameraKeySpeed * frameSeconds);
  }
  // Depuración del ciclo día/noche en teclas F (1–6, Q, E y R son del juego).
  if (input.consumeKey('F2')) view.atmosphere.timeScale = view.atmosphere.timeScale === 1 ? 40 : 1;
  if (input.consumeKey('F3')) view.atmosphere.elapsed += overworld.lighting.dayLengthSeconds / 8;
  // Insert: siguiente tiempo en la zona del jugador (depuración del clima; la nieve sólo donde hace frío).
  if (input.consumeKey('Insert') && world.weather) {
    const zone = world.weatherZone();
    const z = zone ? world.zoneMap.get(zone) : undefined;
    const cur = world.weather.at(zone);
    if (z && cur) {
      const kinds = WEATHER_KINDS.filter((k) => k !== 'snow' || z.climate === 'cold');
      world.weather.force(z.id, kinds[(kinds.indexOf(cur.kind) + 1) % kinds.length]!);
    }
  }

  // Mantener pulsado: el destino sigue al cursor cada `holdRepathSeconds`; si
  // la pulsación empezó sobre un enemigo, se repite el ataque básico.
  if (!input.leftDown) clickConsumed = false;
  // Con un menú delante no se sigue apuntando.
  if (paused && castInput.aiming !== null) castInput.cancel();
  if (input.leftDown && !paused && !clickConsumed) {
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
  if (!paused) crypt?.update(frameSeconds);
  const t1 = performance.now();
  const events = world.drainEvents();
  telemetry.record(events, world.endTime ?? world.time);
  for (const e of events) {
    if (e.type !== 'outcome') continue;
    const run = telemetry.runs[telemetry.runs.length - 1]!;
    // Con la interfaz: pantalla de muerte y reaparecer en la Piedra Pintada; sin ella (medición), el resumen de siempre.
    if (menus && e.outcome === 'defeat') menus.showDeath(stones.respawn.name, respawn, session?.onDeath?.());
    else hud.showOutcome(run);
    console.info(`[telemetría] partida ${run.run}: ${e.outcome}`, JSON.stringify(run));
  }
  view.handleEvents(world, events);
  waterView.handleEvents(events);
  hud.update(world, events, frameSeconds);
  menus?.frame(frameSeconds);
  if (!paused && session?.restEnergy && !crypt?.inside) {
    const resting = stones.def.stones.some((z) => {
      const p = stoneAt(z);
      return (p.x - world.player.pos.x) ** 2 + (p.y - world.player.pos.y) ** 2 <= data.rpg.energy.rest.radius ** 2;
    });
    if (resting) session.restEnergy(frameSeconds);
  }
  view.sync(world, alpha, frameSeconds);
  lootView.sync(world, alpha, frameSeconds);
  gridView.sync(world.grid, world.player.pos.x, world.player.pos.y);
  syncWeather();
  stoneView.sync(frameSeconds, (id) => stones.knows(id));
  stoneView.setVisible(!crypt?.inside);
  if (menus && session && !paused) {
    const fresh = world.player.alive && !crypt?.inside ? stones.touch(world.player.pos, stoneAt) : null;
    if (fresh) {
      menus.toast(`Piedra Pintada activada: ${fresh.name}. Reaparecerás aquí.`, 'level');
      saveStones();
    }
    if (stoneTarget) {
      const z = stones.get(stoneTarget)!;
      const p = stoneAt(z);
      if (Math.hypot(p.x - world.player.pos.x, p.y - world.player.pos.y) <= stonesDef.activateRadius) {
        stoneTarget = null;
        openStones();
      } else if (world.player.path.length === 0) stoneTarget = null;
    }
    menus.setWorld(worldInfo(), combatants());
  }
  npcView.sync(world, frameSeconds, (id) => session?.npcMarker(id) ?? null);
  waterView.sync(world, view.player.model.root.position, frameSeconds);
  // Alejarse del mercader cierra su tienda.
  const openShop = menus?.merchantOpen;
  if (openShop) {
    const n = world.npcs.find((x) => x.merchantId === openShop);
    if (!n || Math.hypot(n.pos.x - world.player.pos.x, n.pos.y - world.player.pos.y) > 6) menus?.closeMerchant();
  }
  // Y alejarse de un PNJ cierra la conversación.
  const talking = menus?.dialogueOpen;
  if (talking) {
    const n = world.npcs.find((x) => x.npcId === talking);
    if (!n || Math.hypot(n.pos.x - world.player.pos.x, n.pos.y - world.player.pos.y) > 6) menus?.closeDialogue();
  }
  // Daño esperado del hechizo apuntado sobre el enemigo bajo el cursor (combate v2).
  damageLabelTimer -= frameSeconds;
  const aimed = aimingSpell();
  if (aimed === null) {
    damageLabelTarget = null;
    damageLabel.hide();
  } else {
    if (damageLabelTimer <= 0) {
      damageLabelTimer = 0.1;
      damageLabelTarget = view.pickEnemy(input.x, input.y);
    }
    const pv = damageLabelTarget === null ? null : world.previewDamage(aimed, damageLabelTarget);
    if (pv) damageLabel.show(previewText(pv), pv.immune ? '#9aa4b2' : '#ffd36b', input.x, input.y + 64);
    else damageLabel.hide();
  }
  // Nombre del botín bajo el cursor (el picking se hace unas 10 veces por segundo).
  lootLabelTimer -= frameSeconds;
  if (lootLabelTimer <= 0) {
    lootLabelTimer = 0.1;
    const id = lootView.pick(view.scene, input.x, input.y);
    const label = id === null ? null : lootView.label(world, id);
    if (label) lootLabel.show(label.text, label.color, input.x, input.y);
    else lootLabel.hide();
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

/** Arriba: mapa [x, y], zona y franja (como DOFUS). */
function worldInfo(): { coords: [number, number]; zone: string | null; band: string | null; danger: number } {
  const p = world.player.pos;
  const place = crypt?.place;
  if (place) {
    return { coords: mapCoords(p.x, p.y, data.zone.width, data.zone.depth, stonesDef.coordCellMeters), zone: place.name, band: `niv. ${place.levelMin}–${place.levelMax}`, danger: place.levelMin - world.character.level };
  }
  const z = world.currentZone;
  return {
    coords: mapCoords(p.x, p.y, data.zone.width, data.zone.depth, stonesDef.coordCellMeters),
    zone: z?.name ?? null,
    band: z ? (z.safe ? 'zona segura' : `niv. ${z.levelMin}–${z.levelMax}`) : null,
    danger: z && !z.safe ? z.levelMin - world.character.level : 0,
  };
}

/** Enemigos que te persiguen o atacan (con agro), para la barra de combate. */
function combatants(): Array<{ archetype: string; name: string; level: number; health: number; maxHealth: number; diff: number; casting: string | null }> {
  const out = [];
  const lvl = world.character.level;
  for (const e of world.enemies.list) {
    if (e.state === 'idle' || e.state === 'dead' || e.returning) continue;
    out.push({
      archetype: e.def.id,
      name: world.content.enemies[e.def.id]?.name ?? e.def.id,
      level: e.level,
      health: e.health,
      maxHealth: e.def.maxHealth,
      diff: e.level - lvl,
      casting: e.state === 'telegraph' && e.current.name ? e.current.name : null,
    });
  }
  return out;
}

