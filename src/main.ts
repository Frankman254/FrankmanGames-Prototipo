import { loadGameData } from './data';
import { dayPhaseName } from './world/dayNight';
import { loadWorldData } from './data/worldData';
import { Matrix, SceneInstrumentation, Vector3 } from '@babylonjs/core';
import { ArenaView } from './render/arenaView';
import { CHASER_RENDER_MODES, type ChaserRenderMode } from './render/chaserView';
import { GridView } from './render/gridView';
import { LootView } from './render/lootView';
import { OcclusionPlugin } from './render/occlusion';
import { NpcView } from './render/npcView';
import { CharacterCrowd } from './render/characters/benchCrowd';
import { WaterView } from './render/waterView';
import { GatherView, type GatherPick } from './render/gatherView';
import { ZoneBorderView } from './render/zoneBorderView';
import { housePlacement, LandmarkView } from './render/landmarkView';
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
import { AimCards, aimText, type AimCardData } from './ui/aimCards';
import { AimGhosts, type AimGhost } from './render/fx/aimGhosts';
import type { LockMode } from './sim/lock';
import { CastInput } from './sim/castModes';
import { CAST_BLOCK_TEXT } from './sim/combat';
import { button } from './ui/menus/dom';
import { hotbarIndex } from './ui/menus/keybindings';
import { Hud } from './ui/hud';
import { Input } from './ui/input';
import { mountMenus, type Action, type MapFrame } from './ui/menus';
import { buildMapFrame, buildMapWorld } from './ui/map/mapFeed';
import { DEFAULT_OPTIONS, loadOptions } from './ui/menus/saveStore';
import { mountAudio } from './audio/director';
import { mountEditor } from './ui/editor';
import { PerfOverlay } from './ui/perfOverlay';
import { buildCompendium } from './rpg/compendium';
import { CAMERA_MODES, type CameraMode, type FramingId } from './camera';
import { CAMERA_MODE_NAMES } from './ui/menus/screens/modals';
import { buildOverworld, withOverworldZone } from './world/overworld';
import { loadDungeon } from './data/dungeonSchema';
import { CryptScene } from './scenes/cryptScene';
import { BANK_LOCATION, BankScene } from './scenes/bankScene';
import { HouseScene } from './scenes/houseScene';
import { SwitchableHeightField } from './world/switchableGround';
import { FALLBACK_TEXT, resolvePlace, type PlaceWorld } from './world/placement';
import { floorTitle } from './world/dungeon';
import { ZoneMap } from './sim/zones';
import { DamageMeter } from './sim/damageMeter';
import { DamageMeterView } from './ui/dev/damageMeterView';
import { PRESET_GROUPS, PRESET_GROUP_NAME, buildPresetSave, loadPresets, presetPlace, presetProblems, type PresetWorld } from './dev/presets';
import type { SavePlace } from './rpg/contracts';
import { ResurrectorView } from './render/resurrectorView';
import { UI_LAYER_Z } from './ui/menus/windows';

const SIM_HZ = 60;

const canvas = document.getElementById('view') as HTMLCanvasElement;
const perfEl = document.getElementById('perf')!;
const perf = new PerfOverlay(perfEl);

/** Modo de cámara elegido; en interiores siempre se sigue al personaje. */
let cameraMode: CameraMode = 'follow';
function applyCameraMode(): void {
  view.rig.mode = world?.interior ? 'follow' : cameraMode;
}
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
// La fachada del banco ocupa suelo real: ni jugador ni rutas la atraviesan.
if (!benchMode) data.zone.obstacles.push({ ...BANK_LOCATION.building });
// Hasta que el título cree o cargue una partida, el mundo usa un personaje de
// la clase por defecto (sólo se ve de fondo: el título detiene la simulación).
let world = new World(data, { seed: data.loadTest.seed, encounter: !benchMode, zones: !benchMode });
/** Rejilla del mundo abierto (no cambia): para decidir si un sitio guardado se puede pisar. */
const outdoorGrid = world.grid;
let session: GameSession | null = null;
/** Herramientas de prueba (partidas de prueba, medidor de daño): en `npm run dev` o con la marca `frankmangames.dev` = "1". */
const devTools = !benchMode && (import.meta.env.DEV || readDevFlag());
/** Segundos jugados con el personaje en curso (van en el guardado). */
let playSeconds = 0;
// MSAA es del contexto WebGL: se lee de las opciones guardadas antes de crear el motor.
const startOptions = benchMode ? DEFAULT_OPTIONS : loadStartOptions();
/** Combate táctico: modo de placaje elegido en Opciones → Juego (se lleva a cada mundo nuevo). */
let lockMode: LockMode = startOptions.lockMode;
world.lockMode = lockMode;
const view = new ArenaView(canvas, data, overworld, { msaa: startOptions.antialias === 'msaa' });
const resurrectorView = new ResurrectorView(view.scene, ground);
const spectralGuide = document.createElement('div');
spectralGuide.hidden = true;
spectralGuide.className = 'spectral-guide';
spectralGuide.style.zIndex = String(UI_LAYER_Z.game + 1);
const spectralText = document.createElement('span');
spectralText.setAttribute('role', 'status');
const spectralRoute = button('Guiar al Alzador', () => {
  if (!world.character.spectral.active || world.interior) return;
  const altar = nearestAltar();
  if (!altar) return;
  const at = { x: altar.x, y: altar.y };
  const cell = world.grid.walkable(at) ? null : world.grid.nearestWalkable(at);
  if (cell === -1) return;
  world.commandMove(cell === null ? at : world.grid.center(cell));
}, 'small primary');
spectralRoute.addEventListener('pointerdown', (e) => e.stopPropagation());
spectralGuide.append(spectralText, spectralRoute);
document.body.append(spectralGuide);
function nearestAltar() {
  const p = world.player.pos;
  return [...world.content.spectral.resurrectors].sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
}
const lootView = new LootView(view.scene, data.rpg.rules.rarityColor, view.heights, loadFx());
const waterView = new WaterView(view.scene, overworld.def, view.heights);
const npcView = new NpcView(view.scene, overworld.characters, view.assets, view.heights, { ...data.rpg.merchants, ...data.rpg.npcs }, view.atmosphere);
const zoneBorder = new ZoneBorderView(view.scene, view.heights);
const landmarks = new LandmarkView(view.scene, view.heights, view.atmosphere);
if (!benchMode) {
  const placed = loadWorldData().vegetation.props.filter((p) => p.kind === 'landmark' && p.model);
  for (const p of placed) view.vegetation.solids.push({ x: p.x, z: p.y, hw: p.w / 2, hd: p.d / 2, top: view.heights.sample(p.x, p.y) + (p.model === 'castillo' ? 14 : p.model === 'molino' ? 8 : 3) });
  void landmarks.add([
    ...placed.map((p) => ({ model: p.model!, x: p.x, y: p.y, rotDeg: p.rotDeg })),
    ...loadWorldData().vegetation.props.filter((p) => p.kind === 'house').map(housePlacement),
    ...loadWorldData().vegetation.props.filter((p) => p.kind === 'lamp').map((p) => ({ model: 'farola', x: p.x, y: p.y, rotDeg: p.rotDeg })),
  ]);
}
const gatherView = new GatherView(view.scene, view.heights, data.rpg.professions, view.atmosphere);
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
/** Taller al que se va andando; al llegar se abre la ventana de oficios. */
let stationTarget: string | null = null;
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
  if (world.character.spectral.active) { menus?.toast('Busca un Alzador antes de viajar', 'warn'); return; }
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
  weatherView?.update(focus, world.interior ? null : kind, s?.intensity ?? 0, view.atmosphere);
  const key = kind && zone && !world.interior ? `${zone}:${kind}` : '';
  if (kind && key && key !== lastWeather && lastWeather !== '' && kind !== 'clear') {
    const fire = kind === 'rain' ? ' El fuego pega menos.' : kind === 'sun' ? ' El fuego pega más.' : kind === 'snow' ? ' La nieve acumulada frena el paso.' : '';
    menus?.toast(`${data.weather!.kinds[kind].name}.${fire}`, 'info');
  }
  if (key) lastWeather = key;
}

/** Texto de depuración: tiempo de la zona del jugador, intensidad, nieve y si es de noche. */
/** Parte del día y tiempo para la información de arriba. */
function skyText(): string {
  const w = world.weather;
  const zone = world.weatherZone();
  const phase = dayPhaseName(view.atmosphere.timeOfDay);
  return w && w.at(zone) ? `${phase} · ${w.def.kinds[w.kindAt(zone)].name}` : phase;
}

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
const dungeonDef = loadDungeon(data);
const crypt = benchMode
  ? null
  : new CryptScene({ data, def: dungeonDef, view, ground, water: waterView, npcs: npcView, world: () => world, install: installWorld, nextSeed: () => data.loadTest.seed + ++runIndex });
function switchInterior(inside: boolean): void {
  view.ground.setEnabled(!inside);
  view.vegetation.setVisible(!inside);
  landmarks.setVisible(!inside);
  waterView.setVisible(!inside); npcView.setVisible(!inside);
  view.scene.getTransformNodeByName('cryptEntrance')?.setEnabled(!inside);
  ground.flatHeight = inside ? 0 : null;
  view.atmosphere.setInterior(inside ? { ...dungeonDef.light, ambient: 0.8, sun: 0.35, fogDensity: 0 } : null);
  view.rig.blockers = inside ? [] : view.vegetation.solids;
  view.rig.blockerMode = inside ? 'inside' : 'ray';
  view.rig.distanceCap = inside ? 14 : null;
  applyCameraMode();
  // Estar en el edificio no concede acceso: se habla con el empleado o cofre.
  session?.setBankAccess(false);
  menus?.closeBank();
  stoneTarget = null;
}

const bank: BankScene | null = benchMode ? null : new BankScene({
  data, view, ground, world: () => world, install: installWorld,
  nextSeed: () => data.loadTest.seed + ++runIndex,
  switchInside: switchInterior,
  onBank: () => {
    if (!bank?.inside || !session || !world.player.alive || world.character.spectral.active) return;
    session.setBankAccess(true);
    menus?.showBank();
  },
});
const houses: HouseScene | null = benchMode ? null : new HouseScene(
  { data, view, ground, world: () => world, install: installWorld, nextSeed: () => data.loadTest.seed + ++runIndex, switchInside: switchInterior },
  loadWorldData().vegetation.props.filter((p) => p.kind === 'house'),
  loadWorldData().vegetation.props.filter((p) => p.kind === 'landmark' && p.model === 'castillo'),
);
if (bank) {
  const b = BANK_LOCATION.building;
  view.vegetation.solids.push({ x: b.x, z: b.y, hw: b.w / 2, hd: b.d / 2, top: ground.sample(b.x, b.y) + 4.5 });
}
const lootLabel = new HoverLabel(document.getElementById('hud')!);
let lootLabelTimer = 0;
const gatherProgress = new HoverLabel(document.getElementById('hud')!);
/** Rótulo de un recurso o taller bajo el cursor. */
function gatherLabel(p: GatherPick | null): { text: string; color: string } | null {
  const jobs = data.rpg.professions;
  if (p?.kind === 'station') return { text: `${jobs.stations[p.id]!.name}: haz clic para fabricar`, color: '#ffe9b0' };
  const node = p?.kind === 'node' ? world.gatherField?.byId(p.id) : null;
  const kind = node ? jobs.nodes[node.kind] : undefined;
  if (!kind) return null;
  const ready = !session || session.character.professions.level(kind.profession) >= kind.level;
  return { text: `${kind.name} · ${jobs.professions[kind.profession]!.name} ${kind.level}`, color: ready ? '#bfe8a8' : '#d98a7a' };
}
// Combate v2: daño esperado bajo el cursor mientras se apunta un hechizo.
const aimCards = new AimCards(document.getElementById('hud')!);
const aimGhosts = new AimGhosts(view.scene, view.heights);
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
const menus = benchMode ? null : mountMenus(new RpgSessionFactory(data.rpg), {
  compendium: buildCompendium({ content: data.rpg, archetypes: data.enemies.archetypes, zones: data.zones.zones }),
  professions: { def: data.rpg.professions, items: data.rpg.items },
  ...(devTools ? { devPresets: devPresetsMenu() } : {}),
});
if (!benchMode) mountAudio({ world: () => world, view, overworld, menus, session: () => session, place: () => ({ floor: crypt?.floor ?? null, zone: world.currentZone?.id ?? null }) });
// Medidor de daño de las pruebas (tecla Fin): DPS hecho y recibido, golpe máximo, desglose y tiempo en matar.
const meter = new DamageMeter();
/** Reloj del medidor: segundos simulados que no vuelven a cero al cambiar de piso. */
let meterSeconds = 0;
const meterView = devTools
  ? new DamageMeterView(document.getElementById('hud')!, meter, { ability: (id) => data.rpg.spells[id]?.name ?? id, enemy: (id) => data.rpg.enemies[id]?.name ?? id }, 'Fin')
  : null;
// Modo edición (F12): mover casas, árboles, PNJ y zonas y pintar la navegación; pausa el mundo.
const editor = menus ? mountEditor({ view, overworld, data, keys: () => menus.keys.bindings.editor }) : null;
// Minimapa y mapa grande: el mundo una vez; cada fotograma, `mapFrame()`.
menus?.setMapWorld(buildMapWorld(overworld, data.zones, (x, y) => mapCoords(x, y, data.zone.width, data.zone.depth, stonesDef.coordCellMeters)));

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
  if (castInput.release(hot).kind === 'cast' && !(menus?.keyboardCaptured ?? false)) fireSlot(hot);
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
  if (castInput.aiming !== null && !menus?.pointerCaptured) {
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
  if (e.button !== 0 || menus?.pointerCaptured) return;
  clickConsumed = false;
  holdTimer = 0;
  // Boca de la cripta, escaleras y cofres: ir hasta allí y usarlo al llegar.
  if ((!crypt?.inside && !houses?.inside && bank?.click(e.offsetX, e.offsetY)) || (!bank?.inside && !houses?.inside && crypt?.click(e.offsetX, e.offsetY)) || (!bank?.inside && !crypt?.inside && houses?.click(e.offsetX, e.offsetY))) {
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
    clickConsumed = true;
    pendingClickStamp = null;
    return;
  }
  stoneTarget = null;
  stationTarget = null;
  // Clic sobre un PNJ o mercader = ir a hablarle (al llegar, diálogo o tienda).
  const npcId = npcView.pick(e.offsetX, e.offsetY);
  if (npcId !== null) {
    if (world.character.spectral.active) menus?.toast('Los vivos no te oyen: busca un Alzador', 'warn');
    world.commandTalk(npcId);
    clickConsumed = true;
    pendingClickStamp = null;
    return;
  }
  // Clic sobre un botín del suelo = ir a recogerlo.
  const lootId = lootView.pick(view.scene, e.offsetX, e.offsetY);
  if (lootId !== null) {
    world.commandPickup(lootId);
    clickConsumed = true;
    pendingClickStamp = null;
    return;
  }
  // Clic sobre un recurso = ir a recogerlo; sobre un taller = ir y abrir los oficios.
  const gathered = gatherView.pick(e.offsetX, e.offsetY);
  if (gathered?.kind === 'node') {
    world.commandGather(gathered.id);
    // Sin esto, mantener el botón un instante repetía «caminar» y cancelaba la recolección.
    clickConsumed = true;
    pendingClickStamp = null;
    return;
  }
  if (gathered?.kind === 'station') {
    const st = data.rpg.professions.stations[gathered.id]!;
    if (world.character.spectral.active) {
      menus?.toast('Busca un Alzador antes de trabajar', 'warn');
      clickConsumed = true;
      pendingClickStamp = null;
      return;
    }
    stationTarget = gathered.id;
    clickConsumed = true;
    world.commandMove(st);
    pendingClickStamp = null;
    return;
  }
  // Clic en el agua = pescar (o sacar el sedal si ya está dentro), sobre la superficie que se ve.
  const water = world.interior ? null : waterView.pickWater(view.scene.createPickingRay(e.offsetX, e.offsetY, Matrix.Identity(), view.rig.camera));
  if (water && world.fishingSpotAt(water)) {
    world.commandFish(water);
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

/** Reinicio rápido: arena nueva sin recargar; el personaje (nivel, objetos) se conserva. */
function restart(): void {
  telemetry.begin(new Date().toISOString()); // cierra la anterior como `abandoned` si seguía en juego
  runIndex++;
  newWorld(data.loadTest.seed + runIndex);
}

/** Crea el mundo con el personaje de la sesión en curso y lo enlaza con ella (en `start` si se da). */
function newWorld(seed: number, start?: { x: number; y: number }): void {
  bank?.reset();
  houses?.reset();
  session?.setBankAccess(false);
  menus?.closeBank();
  crypt?.reset();
  const d = start ? { ...data, zone: { ...data.zone, playerStart: { ...start } } } : data;
  installWorld(new World(d, { seed, zones: !benchMode, timeOfDay: view.atmosphere.timeOfDay, ...(session ? { character: session.character } : {}) }));
}

/** Lo que hay hoy en el mundo para decidir dónde cae un guardado. */
function placeWorld(): PlaceWorld {
  return {
    width: data.zone.width,
    depth: data.zone.depth,
    walkable: (p) => outdoorGrid.walkable(p),
    dungeons: { crypt: { floors: dungeonDef.floors.length, entrance: { x: dungeonDef.entrance.x, y: dungeonDef.entrance.y } } },
    stones: stonesDef.stones.map((z) => ({ id: z.id, ...stoneAt(z) })),
    known: stones.progress.known,
    home: stonesDef.home,
  };
}

/** Pone al jugador donde dice el guardado (o en la Piedra Pintada más cercana si el sitio ya no existe). */
function enterPlace(place: SavePlace | null, seed: number): void {
  if (session?.character.spectral.active && place?.scene === 'dungeon') {
    newWorld(seed, stoneAt(stones.respawn));
    return;
  }
  const r = resolvePlace(place, placeWorld());
  if (r.kind === 'overworld') {
    newWorld(seed, r.pos);
    return;
  }
  if (r.kind === 'dungeon') {
    newWorld(seed);
    if (!crypt || !crypt.enter(r.floor, 'above', r.pos ?? undefined)) teleport(stoneAt(stones.respawn));
    return;
  }
  newWorld(seed, stoneAt(stones.get(r.stone) ?? stones.respawn));
  const why = FALLBACK_TEXT[r.reason];
  if (why) menus?.toast(why, 'warn');
}

/** Dónde está el jugador ahora, para el guardado. */
function currentPlace(): SavePlace {
  // El banco no es una mazmorra persistente: cargar reaparece ante su puerta.
  const p = bank?.inside ? BANK_LOCATION.returnPoint : houses?.inside ? houses.returnPoint! : world.player.pos;
  const r2 = (v: number): number => Math.round(v * 100) / 100;
  const inside = crypt?.inside ?? false;
  const zone = bank?.inside ? 'El Cruce' : houses?.inside ? 'Villa Raspadura' : worldInfo().zone;
  return {
    scene: inside ? 'dungeon' : 'overworld',
    dungeon: inside ? 'crypt' : null,
    floor: inside ? crypt!.floor : null,
    x: r2(p.x),
    y: r2(p.y),
    stone: stones.progress.respawn,
    knownStones: [...stones.progress.known],
    timeOfDay: Math.round(view.atmosphere.timeOfDay * 1e4) / 1e4,
    playSeconds: Math.round(playSeconds),
    ...(zone ? { name: zone } : {}),
  };
}

/** Lo que las partidas de prueba necesitan saber del mundo. */
function presetWorld(): PresetWorld {
  return {
    zones: new ZoneMap(data.zones),
    width: data.zone.width,
    depth: data.zone.depth,
    dungeons: { crypt: { floors: dungeonDef.floors.length, title: (f) => floorTitle(dungeonDef, f) } },
    stones: stonesDef.stones.map((z) => z.id),
    home: stonesDef.home,
    walkable: (p) => outdoorGrid.walkable(p),
  };
}

/** Menú «Partidas de prueba»: las de `data/dev/presets.json` que encajan con el contenido actual. */
function devPresetsMenu(): NonNullable<Parameters<typeof mountMenus>[1]>['devPresets'] {
  const file = loadPresets();
  const pw = presetWorld();
  for (const p of file.presets) {
    const bad = presetProblems(data.rpg, p, pw);
    if (bad.length) console.warn(`[partidas de prueba] «${p.name}»: ${bad.join('; ')}`);
  }
  return {
    groups: PRESET_GROUPS.map((g) => ({
      name: PRESET_GROUP_NAME[g],
      entries: file.presets
        .filter((p) => p.group === g)
        .map((p) => ({ id: p.id, name: p.name, description: p.description, group: g, role: p.role, classId: p.classId, level: p.level, place: presetPlace(p, pw, file.allStones).name ?? '—' })),
    })),
    build: (id) => {
      const p = file.presets.find((x) => x.id === id);
      return p && data.rpg.classes[p.classId] ? buildPresetSave(data.rpg, p, pw, file.allStones) : null;
    },
  };
}

function readDevFlag(): boolean {
  try {
    return localStorage.getItem('frankmangames.dev') === '1' || new URLSearchParams(location.search).has('pruebas');
  } catch {
    return false;
  }
}

/** Pone `w` como mundo en curso: sesión, vistas, registro y reloj (también al cambiar de escena). */
function installWorld(w: World): void {
  session?.attach(null);
  world = w;
  world.aimProvider = cursorAim;
  world.slotGate = slotGate;
  world.lockMode = lockMode;
  castInput.cancel();
  meter.newScene();
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
      bank,
      houses,
      meter,
      get place() {
        return currentPlace();
      },
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
input.onMiddleClick(() => menus?.pressBinding('MouseMiddle'));
menus?.onAction((a) => {
  const framing: Partial<Record<Action, FramingId>> = { cameraDefault: 'default', cameraTop: 'top', cameraClose: 'close', cameraIsometric: 'isometric', cameraCinematic: 'cinematic' };
  const frame = framing[a];
  if (frame) {
    view.rig.setFraming(frame);
    return;
  }
  if (a === 'cameraNextMode') {
    cameraMode = CAMERA_MODES[(CAMERA_MODES.indexOf(cameraMode) + 1) % CAMERA_MODES.length]!;
    applyCameraMode();
    menus?.toast(`Cámara: ${CAMERA_MODE_NAMES[cameraMode]}`, 'info');
    return;
  }
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
/** Poción de recuerdo: a la última Piedra Pintada, también desde un interior. */
function recallToStone(): void {
  const at = stoneAt(stones.respawn);
  if (world.interior) newWorld(data.loadTest.seed + ++runIndex, at);
  else teleport(at);
  menus?.toast(`Despiertas en ${stones.respawn.name}`, 'info');
}

menus?.onSession((s) => {
  s.on((e) => {
    if (e.type === 'recall') recallToStone();
  });
  if (!(s instanceof GameSession)) throw new Error('la interfaz debe usar la sesión real');
  session = s;
  const place = s.startPlace;
  // Piedras: las del guardado si las trae; si no (guardados antiguos), las guardadas aparte por personaje.
  if (place?.knownStones) stones = new StoneBook(stonesDef, { known: place.knownStones, respawn: place.stone });
  else {
    loadStones();
    if (place?.stone && stones.knows(place.stone)) stones.progress.respawn = place.stone;
  }
  saveStones();
  playSeconds = place?.playSeconds ?? 0;
  if (place?.timeOfDay !== null && place?.timeOfDay !== undefined) view.atmosphere.setTimeOfDay(place.timeOfDay);
  s.placeProvider = currentPlace;
  telemetry.begin(new Date().toISOString());
  meter.reset();
  runIndex++;
  enterPlace(place, data.loadTest.seed + runIndex);
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
  cameraMode = o.cameraMode;
  view.rig.smoothing = o.cameraSmoothing;
  applyCameraMode();
  fpsCap = o.fpsCap;
  view.applyGraphics(o);
  view.showDamageNumbers = o.damageNumbers;
  view.showEnemyLabels = o.enemyLabels;
  view.enemies.barMode = o.enemyBars;
  view.spellFx.showRange = o.showSpellRange;
  castInput.setMode(o.castMode);
  lockMode = o.lockMode;
  world.lockMode = o.lockMode;
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
input.hoverOrbit = () => !(menus?.keyboardCaptured ?? false) && input.isHeld(holdKeys('cameraOrbit'));

/** Recuento de eventos de animación (footstep, hit, cast) desde el arranque. */
const animEventCounts: Record<string, number> = {};
function animEventText(): string {
  return Object.entries(animEventCounts).map(([k, n]) => `${k} ${n}`).join(' · ') || '--';
}

/** «12–19 · crítico 17–28 (8 %)», o «Inmune». */
const ghostFormat = (a: number, b: number): string => (a === b ? `${a}` : `${a} – ${b}`);

/** Hechizo apuntado sin lanzar: fantasmas en el suelo y fichas sobre los alcanzados. */
function syncAimPreview(): void {
  const aimed = aimingSpell();
  if (aimed === null || !world.player.alive) {
    aimGhosts.clear();
    aimCards.update([]);
    return;
  }
  const aim = cursorAim();
  const pv = world.previewSpell(aimed, aim);
  const engine = view.scene.getEngine();
  const w = engine.getRenderWidth();
  const h = engine.getRenderHeight();
  const toScreen = (x: number, y: number, up: number): { x: number; y: number } => {
    const s = Vector3.Project(new Vector3(x, view.heights.sample(x, y) + up, y), Matrix.Identity(), view.scene.getTransformMatrix(), view.rig.camera.viewport.toGlobal(w, h));
    return { x: (s.x / w) * canvas.clientWidth, y: (s.y / h) * canvas.clientHeight };
  };
  const p = world.player;
  const ghosts: AimGhost[] = [];
  const cards: AimCardData[] = [];
  if (pv.casterTo) ghosts.push({ key: 'player', source: view.player.model.root, facing: p.facing, from: p.pos, to: pv.casterTo, mine: true });
  // Las más cercanas al cursor: en una multitud, más fichas no se leerían.
  const near = [...pv.targets].sort((a, b) => Math.hypot(a.pos.x - aim.point.x, a.pos.y - aim.point.y) - Math.hypot(b.pos.x - aim.point.x, b.pos.y - aim.point.y));
  for (const t of near) {
    const statuses = t.statuses.map((st) => {
      const name = data.rpg.statuses[st.statusId]?.name ?? st.statusId;
      return st.chance < 1 ? `${name} (${Math.round(st.chance * 100)} %)` : name;
    });
    if (t.to) ghosts.push({ key: `e${t.id}`, source: view.enemies.modelRoot(t.id), facing: world.enemies.get(t.id)?.facing ?? 0, from: t.pos, to: t.to, mine: false });
    if (cards.length >= 6) continue;
    const d = t.damage;
    const lethal = !!d && !d.immune && d.max >= t.health;
    const at = toScreen(t.pos.x, t.pos.y, 2.2);
    cards.push({
      key: `e${t.id}`,
      ...at,
      title: `${t.name} · nv. ${t.level}`,
      health: { value: t.health, max: t.maxHealth, lostMin: d && !d.immune ? d.min : 0, lostMax: d && !d.immune ? d.max : 0 },
      ...(d && !d.immune ? { damage: ghostFormat(d.min, d.max), ...(d.critChance > 0 ? { crit: `${aimText('crítico')} ${ghostFormat(d.critMin, d.critMax)} · ${Math.round(d.critChance * 100)} %` } : {}) } : {}),
      lines: [...(d?.immune ? [aimText('Inmune')] : []), ...(t.to ? [aimText('Se mueve')] : []), ...statuses, ...(lethal ? [aimText('Puede caer')] : [])],
      tone: d?.immune ? 'immune' : !pv.inRange ? 'out' : lethal ? 'lethal' : 'normal',
    });
  }
  if (pv.casterTo) cards.push({ key: 'self', ...toScreen(pv.casterTo.x, pv.casterTo.y, 0), title: aimText('Aquí caerías'), tone: pv.inRange ? 'self' : 'out', ...(pv.inRange ? {} : { lines: [aimText('Fuera de alcance')] }) });
  else if (!pv.inRange) cards.push({ key: 'out', ...toScreen(aim.point.x, aim.point.y, 0.8), title: aimText('Fuera de alcance'), tone: 'out' });
  aimGhosts.sync(ghosts);
  aimGhosts.syncHits(pv.inRange ? pv.targets.map((t) => ({ x: t.pos.x, y: t.pos.y, radius: t.radius })) : []);
  aimCards.update(cards);
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

  const simulationPaused = (menus?.simulationPaused ?? false) || (editor?.active ?? false);
  const keyboardCaptured = (menus?.keyboardCaptured ?? false) || (editor?.active ?? false);
  const pointerCaptured = (menus?.pointerCaptured ?? false) || (editor?.active ?? false);

  // Cámara orbital: rueda pulsada y arrastrar (también en pausa).
  const drag = input.consumeOrbitDrag();
  if (drag.dx !== 0 || drag.dy !== 0) view.rig.orbit(drag.dx, drag.dy);
  // Girar con teclas (por defecto , y .), a la velocidad de las opciones.
  if (!keyboardCaptured) {
    const turn = (input.isHeld(holdKeys('cameraRight')) ? 1 : 0) - (input.isHeld(holdKeys('cameraLeft')) ? 1 : 0);
    if (turn !== 0) view.rig.turn(turn * cameraKeySpeed * frameSeconds);
  }
  // Depuración del ciclo día/noche en teclas F (1–6, Q, E y R son del juego).
  if (!keyboardCaptured && input.consumeKey('F2')) view.atmosphere.timeScale = view.atmosphere.timeScale === 1 ? 40 : 1;
  if (!keyboardCaptured && input.consumeKey('F3')) view.atmosphere.elapsed += overworld.lighting.dayLengthSeconds / 8;
  // Fin: medidor de daño de las pruebas.
  if (!keyboardCaptured && input.consumeKey('End') && meterView) meterView.toggle();
  // Insert: siguiente tiempo en la zona del jugador (depuración del clima; la nieve sólo donde hace frío).
  if (!keyboardCaptured && input.consumeKey('Insert') && world.weather) {
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
  if ((keyboardCaptured || pointerCaptured) && castInput.aiming !== null) castInput.cancel();
  if (input.leftDown && !pointerCaptured && !clickConsumed) {
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
  const { steps, alpha } = simulationPaused ? { steps: 0, alpha: 1 } : clock.advance(frameSeconds);
  for (let i = 0; i < steps; i++) world.tick(clock.dt);
  if (!simulationPaused) {
    if (!crypt?.inside && !houses?.inside) bank?.update(frameSeconds);
    if (!bank?.inside && !houses?.inside) crypt?.update(frameSeconds);
    if (!bank?.inside && !crypt?.inside) houses?.update();
  }
  bank?.exterior.setEnabled(!world.interior);
  houses?.exterior.setEnabled(!world.interior);
  const t1 = performance.now();
  const events = world.drainEvents();
  telemetry.record(events, world.endTime ?? world.time);
  if (meterView) {
    const pid = world.player.id;
    meterSeconds += steps * clock.dt;
    meter.record(events, meterSeconds, { isPlayer: (id) => id === pid, isAlly: (id) => id === pid || world.pets.some((p) => p.id === id) });
    meterView.update(frameSeconds);
  }
  if (session && !simulationPaused) playSeconds += frameSeconds;
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
  if (!bank?.inside || !world.player.alive || world.character.spectral.active) {
    session?.setBankAccess(false);
    menus?.closeBank();
  }
  if (!simulationPaused && session?.restEnergy && !world.interior) {
    const resting = stones.def.stones.some((z) => {
      const p = stoneAt(z);
      return (p.x - world.player.pos.x) ** 2 + (p.y - world.player.pos.y) ** 2 <= data.rpg.energy.rest.radius ** 2;
    });
    if (resting) session.restEnergy(frameSeconds);
  }
  view.sync(world, alpha, frameSeconds, !simulationPaused);
  resurrectorView.sync(world);
  spectralGuide.hidden = !world.character.spectral.active || !world.player.alive;
  if (!spectralGuide.hidden) spectralText.textContent = 'Forma espectral · Busca ' + (nearestAltar()?.name ?? 'un Alzador') + '. No puedes combatir, hablar ni usar casi nada.';
  lootView.sync(world, alpha, frameSeconds);
  gridView.sync(world.grid, world.player.pos.x, world.player.pos.y);
  syncWeather();
  stoneView.sync(frameSeconds, (id) => stones.knows(id));
  stoneView.setVisible(!world.interior);
  if (menus && session && !simulationPaused) {
    const fresh = world.player.alive && !world.interior && !world.character.spectral.active ? stones.touch(world.player.pos, stoneAt) : null;
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
    if (stationTarget) {
      if (world.character.spectral.active) stationTarget = null;
      else if (world.nearStation(stationTarget)) {
        menus.showProfessions(data.rpg.professions.stations[stationTarget]!.profession);
        stationTarget = null;
      } else if (world.player.path.length === 0) stationTarget = null;
    }
    menus.setWorld(worldInfo(), combatants(), bossView());
  }
  if (menus && session) menus.setMap(mapFrame(session));
  npcView.sync(world, frameSeconds, (id) => session?.npcMarker(id) ?? null);
  landmarks.update(world.player.pos.x, world.player.pos.y);
  waterView.sync(world, view.player.model.root.position, frameSeconds);
  gatherView.sync(world);
  zoneBorder.sync(view.rig.zoneCell);
  if (menus) {
    const head = view.player.model.root.position;
    const engine = view.scene.getEngine();
    const w = engine.getRenderWidth(), h = engine.getRenderHeight();
    const screen = Vector3.Project(new Vector3(head.x, head.y + view.player.model.height + 0.2, head.z), Matrix.Identity(), view.scene.getTransformMatrix(), view.rig.camera.viewport.toGlobal(w, h));
    menus.anchorChatBubble((screen.x / w) * canvas.clientWidth, (screen.y / h) * canvas.clientHeight);
  }
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
  syncAimPreview();
  // Nombre del botín bajo el cursor (el picking se hace unas 10 veces por segundo).
  lootLabelTimer -= frameSeconds;
  if (lootLabelTimer <= 0) {
    lootLabelTimer = 0.1;
    const id = lootView.pick(view.scene, input.x, input.y);
    const label = id === null ? gatherLabel(gatherView.pick(input.x, input.y)) : lootView.label(world, id);
    if (label) lootLabel.show(label.text, label.color, input.x, input.y);
    else lootLabel.hide();
  }
  const gathering = world.gathering;
  const gatherKind = gathering ? data.rpg.professions.nodes[world.gatherField?.byId(gathering.nodeId)?.kind ?? ''] : undefined;
  if (gathering && gatherKind) {
    const verb = data.rpg.professions.professions[gatherKind.profession]?.verb ?? '';
    gatherProgress.show(`${verb} ${gatherKind.name.toLowerCase()}… ${Math.floor((gathering.elapsed / gathering.duration) * 100)} %`, '#ffe9b0', canvas.clientWidth / 2, canvas.clientHeight * 0.62);
  } else gatherProgress.hide();
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
function worldInfo(): { coords: [number, number]; zone: string | null; band: string | null; danger: number; sky?: string | null } {
  const p = world.player.pos;
  const place = bank?.place ?? houses?.place ?? crypt?.place;
  if (place) {
    return { coords: mapCoords(p.x, p.y, data.zone.width, data.zone.depth, stonesDef.coordCellMeters), zone: place.name, band: place.levelMax <= 1 ? 'zona segura' : `niv. ${place.levelMin}–${place.levelMax}`, danger: place.levelMax <= 1 ? 0 : place.levelMin - world.character.level };
  }
  const z = world.currentZone;
  return {
    coords: mapCoords(p.x, p.y, data.zone.width, data.zone.depth, stonesDef.coordCellMeters),
    zone: z?.name ?? null,
    band: z ? (z.safe ? 'zona segura' : `niv. ${z.levelMin}–${z.levelMax}`) : null,
    danger: z && !z.safe ? z.levelMin - world.character.level : 0,
    sky: skyText(),
  };
}

/** Minimapa y mapa grande: jugador, cámara, marcadores, piedras de viaje y objetivo de la misión. */
function mapFrame(s: GameSession): MapFrame {
  return buildMapFrame({
    world,
    session: s,
    cameraYawDeg: view.rig.viewYawDeg,
    inside: bank?.place?.name ?? houses?.place?.name ?? crypt?.place?.name ?? null,
    zones: data.zones,
    waters: overworld.def.ponds,
    names: { ...data.rpg.merchants, ...data.rpg.npcs },
    stones: stonesDef.stones.map((z) => ({ id: z.id, name: z.name, ...stoneAt(z), known: stones.knows(z.id) })),
  });
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

function bossView(): { name: string; phase: string; health: number; maxHealth: number; enraged: boolean } | null {
  if (!crypt?.inside || crypt.floor !== dungeonDef.floors.length - 1) return null;
  const boss = world.enemies.list.find((e) => e.def.id === 'crypt_warden' && e.state !== 'dead');
  if (!boss) return null;
  const fraction = boss.def.maxHealth > 0 ? boss.health / boss.def.maxHealth : 0;
  const phase = fraction <= 0.33 ? 'Hilo roto' : fraction <= 0.66 ? 'Nudos vivos' : 'Telar quieto';
  return { name: 'Matriarca del Hilo Roto', phase, health: boss.health, maxHealth: boss.def.maxHealth, enraged: false };
}

