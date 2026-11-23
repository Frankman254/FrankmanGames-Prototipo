import { loadGameData } from './data';
import { tr } from './i18n';
import { dayLengthSeconds, dayPhaseName } from './world/dayNight';
import type { GameOptions } from './ui/menus/saveStore';
import { loadWorldData } from './data/worldData';
import { Matrix, SceneInstrumentation, Vector3 } from '@babylonjs/core';
import { ArenaView } from './render/arenaView';
import { connectPageWorker } from './render/pageSource';
import { CHASER_RENDER_MODES, type ChaserRenderMode } from './render/chaserView';
import { GridView } from './render/gridView';
import { LootView } from './render/lootView';
import { OcclusionPlugin } from './render/occlusion';
import { NpcView } from './render/npcView';
import { CharacterCrowd } from './render/characters/benchCrowd';
import { WaterView } from './render/waterView';
import { GatherView, type GatherPick } from './render/gatherView';
import { ZoneBorderView } from './render/zoneBorderView';
import { housePlacement, LandmarkView, naturePlacement } from './render/landmarkView';
import { StoneView } from './render/stoneView';
import { WeatherView } from './render/weatherView';
import { WEATHER_KINDS } from './data/zonesSchema';
import { StoneBook, faceYawDeg, mapCoords, parseStones, prepareStoneArrival, type StoneDef } from './world/stones';
import { boatAt, boatOpen, canBoard, parseBoats, type BoatDef } from './world/boats';
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
import { CastInput, CAST_MODES, CAST_MODE_NAMES } from './sim/castModes';
import { CAST_BLOCK_TEXT } from './sim/combat';
import { button } from './ui/menus/dom';
import { hotbarIndex } from './ui/menus/keybindings';
import { layoutTopStack } from './ui/menus/topStack';
import { BenchHud } from './ui/benchHud';
import { CombatLog } from './ui/combatLog';
import { Input, MoveClickHold } from './ui/input';
import { mountMenus, type Action, type MapFrame } from './ui/menus';
import { buildMapFrame, buildMapWorld } from './ui/map/mapFeed';
import { DEFAULT_OPTIONS, loadOptions } from './ui/menus/saveStore';
import { mountAudio } from './audio/director';
import { mountEditor } from './ui/editor';
import { applyHotEdits } from './editor/hotApply';
import type { FileId } from './editor/doc';
import { PerfOverlay } from './ui/perfOverlay';
import { DevConsolePanel, devLog, notice } from './ui/devConsole';
import { buildCompendium } from './rpg/compendium';
import { grantDevMount } from './rpg/devMount';
import { grantAllItems } from './rpg/devItems';
import { forceDeath, exhaustPulse, forceDeathAndExhaust } from './rpg/devDeath';
import { SceneInspector } from './ui/dev/inspector';
import { levelRangeOf } from './sim/levelRange';
import { CAMERA_MODES, type CameraMode, type FramingId } from './camera';
import { CAMERA_MODE_NAMES } from './ui/menus/screens/modals';
import { buildOverworld, withOverworldZone } from './world/overworld';
import { CharacterPreview } from './render/characterPreview';
import { creationLookSpec, playerLookSpec } from './render/characters/playerLook';
import { CreaturePreview } from './ui/menus/compendiumPreview';
import { loadDungeon } from './data/dungeonSchema';
import { CryptScene } from './scenes/cryptScene';
import { BANK_LOCATION, BankScene } from './scenes/bankScene';
import { HouseScene } from './scenes/houseScene';
import { SwitchableHeightField } from './world/switchableGround';
import { FALLBACK_TEXT, pointInZone, resolvePlace, type PlaceWorld } from './world/placement';
import { floorTitle, useDungeonKey } from './world/dungeon';
import { ZoneMap } from './sim/zones';
import { DamageMeter } from './sim/damageMeter';
import { computeDamageBreakdown, type SpellDamageLine, type SpellHitData } from './sim/damageBreakdown';
import { DamageMeterView } from './ui/dev/damageMeterView';
import { addPowerKit, buildPresetSave, loadPresets, type PresetWorld } from './dev/presets';
import {
    dungeonCoverageProfiles,
    guardianCoverageProfiles,
    type GuardianCoverageProfile,
    itemCatalogPresets,
    regionCoverageProfiles,
    spellCatalogPresets,
    setShowcasePresets,
    type DungeonCoverageProfile,
} from './dev/presetCoverage';
import { withProgressionGains } from './rpg/progressionConfig';
import { buildAcquisitionIndex } from '../scripts/balance/v3/acquisition';
import { buildProfile, generateProfiles, type BalanceProfile } from '../scripts/balance/v3/profiles';
import type { DungeonSaveState, SavePlace } from './rpg/contracts';
import { ResurrectorView } from './render/resurrectorView';
import { UI_LAYER_Z } from './ui/menus/windows';
import { LoadingScreen, type LoadingText } from './ui/loadingScreen';
import { assetsLoading } from './render/assetCache';
import { regionAt } from './world/atlas';

const SIM_HZ = 60;

const canvas = document.getElementById('view') as HTMLCanvasElement;
const perfEl = document.getElementById('perf')!;
const perf = new PerfOverlay(perfEl);

/** Modo de cámara elegido; en interiores siempre se sigue al personaje. */
let cameraMode: CameraMode = 'manual';
function applyCameraMode(): void {
    view.rig.mode = world?.interior ? 'manual' : cameraMode;
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
let world = new World(data, {
    seed: data.loadTest.seed,
    encounter: !benchMode,
    zones: !benchMode,
    timeOfDay: data.lighting.startTime,
});
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
const spectralRoute = button(
    'Guiar al Alzador',
    () => {
        if (!world.character.spectral.active || world.interior) return;
        const altar = nearestAltar();
        if (!altar) return;
        const at = { x: altar.x, y: altar.y };
        const cell = world.grid.walkable(at) ? null : world.grid.nearestWalkable(at);
        if (cell === -1) return;
        world.commandMove(cell === null ? at : world.grid.center(cell));
    },
    'small primary',
);
spectralRoute.addEventListener('pointerdown', (e) => e.stopPropagation());
spectralGuide.append(spectralText, spectralRoute);
document.body.append(spectralGuide);
function nearestAltar() {
    const p = world.player.pos;
    return [...world.content.spectral.resurrectors].sort(
        (a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y),
    )[0];
}
const lootView = new LootView(view.scene, data.rpg.rules.rarityColor, view.heights, loadFx());
const waterView = new WaterView(view.scene, overworld.def, view.heights);
const npcView = new NpcView(
    view.scene,
    overworld.characters,
    view.assets,
    view.heights,
    { ...data.rpg.merchants, ...data.rpg.npcs },
    view.atmosphere,
);
const zoneBorder = new ZoneBorderView(view.scene, view.heights);
const landmarks = new LandmarkView(
    view.scene,
    view.groundExact,
    view.atmosphere,
    loadWorldData().detail,
    overworld.atlas.seaLevel,
);
if (!benchMode) {
    const placed = loadWorldData().vegetation.props.filter((p) => p.kind === 'landmark' && p.model);
    void landmarks.add([
        ...placed.map((p) => {
            // Las lanchas van en el agua, no sobre el suelo (data/terrain.json → structures.afloat).
            const afloat = overworld.def.structures.afloat[p.model!];
            return { model: p.model!, x: p.x, y: p.y, rotDeg: p.rotDeg, ...(afloat ? { afloat: afloat.draft } : {}) };
        }),
        ...loadWorldData()
            .vegetation.props.filter((p) => p.kind === 'house')
            .map(housePlacement),
        ...loadWorldData()
            .vegetation.props.filter((p) => p.kind === 'lamp')
            .map((p) => ({ model: 'farola', x: p.x, y: p.y, rotDeg: p.rotDeg })),
        ...loadWorldData()
            .vegetation.props.filter(
                (p): p is typeof p & { kind: 'log' | 'boulder' } => p.kind === 'log' || p.kind === 'boulder',
            )
            .map(naturePlacement),
    ]);
}
const gatherView = new GatherView(view.scene, view.heights, data.rpg.professions, view.atmosphere);
const gridView = new GridView(view.scene, view.heights);
// Piedras Pintadas: puntos de viaje y de reaparición (data/stones.json).
// `let`: el modo edición aplica `stones.json` en caliente (2026-11-11).
let stonesDef = parseStones(stonesJson);
let boats = parseBoats(stonesJson);
/** Lancha a la que se va andando; al llegar al muelle, cruza. */
let boatTarget: BoatDef | null = null;
/** La primera salida de la isla espera a su misión. */
const boatAllowed = (b: BoatDef): boolean =>
    boatOpen(b, (id) => session?.questLog.state(id) === 'completed', stones.progress.known, stonesDef.start);
const stoneView = new StoneView(view.scene, view.heights);
/** Posición real de cada Piedra Pintada: la casilla caminable más cercana a la de los datos. */
const stonePos = new Map<string, { x: number; y: number }>();
const stoneAt = (z: StoneDef): { x: number; y: number } => {
    let p = stonePos.get(z.id);
    if (!p) {
        // Fuera de la parcela la página aún no existe: vale el sitio de los datos (las pruebas lo exigen pisable).
        const inPlot = z.x >= 0 && z.y >= 0 && z.x <= overworld.def.width && z.y <= overworld.def.depth;
        const cell = inPlot ? world.grid.nearestWalkable({ x: z.x, y: z.y }) : -1;
        stonePos.set(z.id, (p = cell >= 0 ? world.grid.center(cell) : { x: z.x, y: z.y }));
    }
    return p;
};
/** Donde se aparece al llegar a una Piedra: a su lado y no dentro de su malla (QA Q03). */
const arriveAt = (z: StoneDef): { x: number; y: number } => {
    const prepared = prepareStoneArrival(z, stoneAt(z), {
        ensure: (x0, y0, x1, y1) => overworld.stream.ensure(x0, y0, x1, y1),
        nearestWalkable: (p, maxRing) => outdoorGrid.nearestWalkable(p, maxRing),
        center: (cell) => outdoorGrid.center(cell),
    });
    if (!prepared) {
        console.warn(`[piedras] no hay llegada transitable para ${z.id}; se usa el inicio seguro`);
        return { ...overworld.def.playerStart };
    }
    stonePos.set(z.id, prepared.stone);
    return prepared.arrival;
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
    if (world.character.spectral.active) {
        menus?.toast('Busca un Alzador antes de viajar', 'warn');
        return;
    }
    const home = stones.progress.respawn;
    // La piedra junto a la que está el jugador (la que acaba de abrir).
    const pos = world.player.pos;
    const atStone = stonesDef.stones.find((z) => {
        const p = stoneAt(z);
        return Math.hypot(p.x - pos.x, p.y - pos.y) <= stonesDef.activateRadius + 2;
    });
    // Herramienta de desarrollo: todas las piedras, conocidas o no.
    const all = devAllStones();
    const list = (all ? stonesDef.stones : stones.known()).map((z) => ({
        id: z.id,
        name: z.name,
        current: z.id === atStone?.id,
        home: z.id === home,
    }));
    const saveHome = atStone
        ? {
              name: atStone.name,
              done: atStone.id === home,
              onSave: () => {
                  stones.progress.respawn = atStone.id;
                  saveStones();
                  menus?.toast(`Punto de regreso: ${atStone.name}`, 'info');
              },
          }
        : null;
    menus?.pickStone(
        list,
        (id) => {
            const z = stones.get(id);
            if (!z) return;
            if (all && !stones.knows(id)) {
                stones.progress.known.push(id);
                saveStones();
            }
            audio?.cue('stone_travel');
            veil({ kicker: tr('Viajando a'), title: z.name, sub: tr('Piedra Pintada') }, () => teleport(arriveAt(z)));
        },
        saveHome,
        all,
    );
}
/** Desarrollo (`npm run dev`): el menú de piedras lista todas; se apaga con `localStorage['frankmangames.devAllStones'] = '0'`. */
function devAllStones(): boolean {
    if (!import.meta.env.DEV) return false;
    try {
        return localStorage.getItem('frankmangames.devAllStones') !== '0';
    } catch {
        return true;
    }
}
// Hora y tiempo (data/weather.json): la simulación lleva el reloj (nocturnos,
// pesca) y el tiempo de la zona del jugador se ve aquí.
const weatherView = data.weather ? new WeatherView(view.scene, data.weather) : null;
let lastWeather = '';
function syncWeather(): void {
    const w = world.weather;
    const zone = world.weatherZone();
    const s = w?.at(zone) ?? null;
    const kind = w && s ? w.kindAt(zone) : null;
    const focus = view.player.model.root.position;
    weatherView?.update(focus, world.interior ? null : kind, s?.intensity ?? 0, view.atmosphere);
    const key = kind && zone && !world.interior ? `${zone}:${kind}` : '';
    if (kind && key && key !== lastWeather && lastWeather !== '' && kind !== 'clear') {
        const fire =
            kind === 'rain'
                ? ' El fuego pega menos.'
                : kind === 'sun'
                  ? ' El fuego pega más.'
                  : kind === 'snow'
                    ? ' La nieve acumulada frena el paso.'
                    : '';
        menus?.toast(`${data.weather!.kinds[kind].name}.${fire}`, 'info');
    }
    if (key) lastWeather = key;
}

/** Texto de depuración: tiempo de la zona del jugador, intensidad, nieve y si es de noche. */
/** Parte del día y tiempo para la información de arriba. */
function skyText(): string {
    const w = world.weather;
    const zone = world.weatherZone();
    const phase = dayPhaseName(world.timeOfDay, data.weather?.night);
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
    const at = arriveAt(stones.respawn);
    teleport(at);
    // Q14: encuadra la cámara hacia la Piedra para que Eligio no quede en el borde.
    const yaw = faceYawDeg(stones.respawn, at);
    if (yaw !== null) view.rig.lookToward(yaw);
}
// Cripta de la Tulivieja: boca en el mundo abierto y cambio de escena a sus pisos.
const dungeonDef = loadDungeon(data);
// El mundo que se carga al caminar: el otro hilo calcula las páginas y aquí se pueblan.
connectPageWorker(overworld.stream);
overworld.stream.listen({
    name: 'monstruos',
    ready: (p) => world.population?.pageReady(p.x0, p.z0, p.size),
    released: (p) => world.population?.pageReleased(p.x0, p.z0, p.size),
});
// Pantalla de carga: tapa los cambios de sitio que congelan (pisos, partida, viajes).
let loadingPause = false;
const loadingScreen = new LoadingScreen({
    busy: assetsLoading,
    ready: () => view.scene.whenReadyAsync(),
    pause: (on) => {
        loadingPause = on;
    },
});
function veil(text: LoadingText, work: () => void): Promise<void> {
    if (benchMode) {
        work();
        return Promise.resolve();
    }
    return loadingScreen.run(text, work);
}
const crypt = benchMode
    ? null
    : new CryptScene({
          data,
          def: dungeonDef,
          view,
          ground,
          water: waterView,
          npcs: npcView,
          landmarks,
          world: () => world,
          install: installWorld,
          nextSeed: () => data.loadTest.seed + ++runIndex,
          loading: veil,
      });
function switchInterior(inside: boolean): void {
    view.ground.setEnabled(!inside);
    view.vegetation.setVisible(!inside);
    view.ambient.setVisible(!inside);
    landmarks.setVisible(!inside);
    waterView.setVisible(!inside);
    npcView.setVisible(!inside);
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

const bank: BankScene | null = benchMode
    ? null
    : new BankScene({
          data,
          view,
          ground,
          world: () => world,
          install: installWorld,
          nextSeed: () => data.loadTest.seed + ++runIndex,
          switchInside: switchInterior,
          onBank: () => {
              if (!bank?.inside || !session || !world.player.alive || world.character.spectral.active) return;
              session.setBankAccess(true);
              menus?.showBank();
          },
      });
const houses: HouseScene | null = benchMode
    ? null
    : new HouseScene(
          {
              data,
              view,
              ground,
              world: () => world,
              install: installWorld,
              nextSeed: () => data.loadTest.seed + ++runIndex,
              switchInside: switchInterior,
          },
          loadWorldData().vegetation.props.filter((p) => p.kind === 'house'),
          loadWorldData().vegetation.props.filter((p) => p.kind === 'landmark' && p.model === 'castillo'),
      );
/**
 * Cajas sólidas que no salen de `buildProps` (el modo edición las rehace y se
 * pierden): monumentos —que dibuja LandmarkView— y el banco. Se llaman al
 * arrancar y después de cada aplicación en caliente; las viejas se quitan para
 * que repetir no acumule.
 */
let extraSolids: Array<{ x: number; z: number; hw: number; hd: number; top: number }> = [];
function pushExtraSolids(): void {
    const solids = view.vegetation.solids;
    for (const s of extraSolids) {
        const i = solids.indexOf(s);
        if (i >= 0) solids.splice(i, 1);
    }
    extraSolids = [];
    for (const p of overworld.vegetation.props.filter((q) => q.kind === 'landmark' && q.model)) {
        extraSolids.push({
            x: p.x,
            z: p.y,
            hw: p.w / 2,
            hd: p.d / 2,
            top: view.groundExact.sample(p.x, p.y) + (p.model === 'castillo' ? 14 : p.model === 'iglesia' ? 11 : 3),
        });
    }
    if (bank) {
        const b = BANK_LOCATION.building;
        extraSolids.push({ x: b.x, z: b.y, hw: b.w / 2, hd: b.d / 2, top: ground.sample(b.x, b.y) + 4.5 });
    }
    solids.push(...extraSolids);
}
if (!benchMode) pushExtraSolids();
const lootLabel = new HoverLabel(document.getElementById('hud')!);
let lootLabelTimer = 0;
const gatherProgress = new HoverLabel(document.getElementById('hud')!);
/** Rótulo de un recurso o taller bajo el cursor. */
function gatherLabel(p: GatherPick | null): { text: string; color: string } | null {
    const jobs = data.rpg.professions;
    if (p?.kind === 'station')
        return { text: `${jobs.stations[p.id]!.name}: haz clic para fabricar`, color: '#ffe9b0' };
    const node = p?.kind === 'node' ? world.gatherField?.byId(p.id) : null;
    const kind = node ? jobs.nodes[node.kind] : undefined;
    if (!kind) return null;
    const ready = !session || session.character.professions.level(kind.profession) >= kind.level;
    return {
        text: `${kind.name} · ${jobs.professions[kind.profession]!.name} ${kind.level}`,
        color: ready ? '#bfe8a8' : '#d98a7a',
    };
}
// Combate v2: daño esperado bajo el cursor mientras se apunta un hechizo.
const aimCards = new AimCards(document.getElementById('hud')!);
const aimGhosts = new AimGhosts(view.scene, view.heights);
/** Tiempo de generar el mundo (alturas, splatmap, mallas) al arrancar. */
const buildMs = performance.now() - buildStart;
const clock = new FixedStepClock(SIM_HZ);
const input = new Input(canvas);
// U01: lo que pasa en el mundo va al chat (canal «Combate» o «Sistema»), en trozos de color.
// Las barras y el cartel de medición, solo cuando no hay interfaz (`?bench`).
const combatLog = new CombatLog((channel, parts) => menus?.chatFeed(channel, parts));
const benchHud = benchMode
    ? new BenchHud(document.getElementById('hud')!, data, [
          { id: 'basic', key: 'Clic' },
          ...[1, 2, 3, 4, 5, 6].map((n) => ({ id: `slot${n}`, key: String(n) })),
      ])
    : null;

// Interfaz del Slice 03 (título, creación, HUD, mochila, personaje, libro,
// pausa) sobre la lógica real de `src/rpg/`. La medición `?bench` arranca sin menús.
const menus = benchMode
    ? null
    : mountMenus(new RpgSessionFactory(data.rpg), {
          compendium: buildCompendium({
              content: data.rpg,
              archetypes: data.enemies.archetypes,
              zones: data.zones.zones,
              ...(data.zones.archetypeLevels
                  ? { levelRange: (id: string, base: number) => levelRangeOf(data.zones.archetypeLevels!, id, base) }
                  : {}),
          }),
          professions: { def: data.rpg.professions, items: data.rpg.items },
          ...(!benchMode ? { devPresets: devPresetsMenu() } : {}),
          // MUE-02: la interfaz pide entrar en un piso concreto de la cripta.
          // UI-06: el personaje en 3D en la mochila (motor aparte, sólo con la mochila abierta).
          preview3d: new CharacterPreview(overworld.characters, () =>
              world.character ? playerLookSpec(world.character, overworld.characters) : null,
          ),
          // Creación de personaje: la misma vista 3D con la clase, el sexo y el aspecto elegidos.
          creationPreview: (pick) =>
              new CharacterPreview(overworld.characters, () => {
                  const p = pick();
                  return creationLookSpec(p.classId, p.sex, p.appearance, overworld.characters);
              }),
          // JL-42: vista 3D de las criaturas en el Compendio.
          compendiumPreview3d: new CreaturePreview(overworld.characters),
          // SAV-02: configuración del guardado desde data/save.json.
          saveConfig: data.save,
          enterDungeon: (floor) => {
              if (!crypt || crypt.inside) return;
              const target = floor ?? 0;
              // Verificar llave antes de entrar.
              const ch = world.character;
              const key = dungeonDef.key;
              const res = useDungeonKey(
                  dungeonDef,
                  ch.inventory,
                  key ? (world.content.items[key.itemId]?.name ?? key.itemId) : '',
              );
              if (res.message) ch.emit({ type: 'message', text: res.message });
              if (res.ok) {
                  const label = floor !== null && floor > 0 ? tr('Retomando en') : tr('Entrando en');
                  crypt.veil(label, target, () => crypt!.enter(target, 'above'));
              }
          },
      });
const audio = benchMode
    ? null
    : mountAudio({
          world: () => world,
          view,
          overworld,
          menus,
          session: () => session,
          place: () => ({
              floor: crypt?.floor ?? null,
              zone: world.currentZone?.id ?? null,
              guardian: crypt?.guardianFloor ?? false,
          }),
      });
// Medidor de daño de las pruebas (tecla Fin): DPS hecho y recibido, golpe máximo, desglose y tiempo en matar.
const meter = new DamageMeter();
/** Reloj del medidor: segundos simulados que no vuelven a cero al cambiar de piso. */
let meterSeconds = 0;
// Inspector de escena (tecla º): qué es cada cosa que se ve, y capas para ocultarlas (solo desarrollo).
if (devTools) new SceneInspector(view.scene, canvas);
// EQ-15: desglose teórico por hechizo, actualizado al abrir el panel.
function getDamageBreakdown(): SpellDamageLine[] | null {
    const s = session;
    if (!s) return null;
    const ch = s.character;
    const rpg = data.rpg;
    const hitDatas: SpellHitData[] = [];
    for (const [spellId, rank] of ch.spellbook.known) {
        const spDef = rpg.spells[spellId];
        if (!spDef) continue;
        // Power del hechizo por rango (misma fórmula que compileSpell).
        const extra = Math.max(0, rank - 1);
        const power = 1 + (spDef.perRank.effectPercent * extra) / 100;
        const hits: import('./sim/damage').HitSpec[] = [];
        for (const eff of spDef.effects) {
            if (eff.type !== 'damage') continue;
            hits.push({
                min: eff.min * power,
                max: eff.max * power,
                element: eff.element,
                scaling: eff.scaling ?? 0,
                critChance: spDef.critChance,
                critBonus: spDef.critBonus,
            });
        }
        if (hits.length === 0) continue;
        hitDatas.push({ spellId, name: spDef.name, hits });
    }
    if (hitDatas.length === 0) return null;
    const damageRules: import('./sim/damage').DamageRules = {
        elementStat: rpg.rules.elementStat,
        resistCap: rpg.progression.resistCap,
    };
    return computeDamageBreakdown(
        hitDatas,
        ch.stats,
        ch.mainStat,
        ch.affinity,
        ch.affinityBonus,
        damageRules,
    );
}

const meterView = devTools
    ? new DamageMeterView(
          document.getElementById('hud')!,
          meter,
          { ability: (id) => data.rpg.spells[id]?.name ?? id, enemy: (id) => data.rpg.enemies[id]?.name ?? id },
          'Fin',
          getDamageBreakdown,
      )
    : null;
// Modo edición (F12): mover casas, árboles, PNJ y zonas y pintar la navegación; pausa el mundo.
// Guardar escribe los JSON; aquí se aplican al mundo en pantalla sin recargar
// (2026-11-11): la partida, la posición y la escena siguen. Bajo un velo de
// carga porque la regeneración de páginas es trabajo pesado.
function editorApply(
    files: readonly FileId[],
    before: Partial<Record<FileId, string>>,
    after: Partial<Record<FileId, string>>,
): Promise<string> {
    let summary = '';
    return veil(
        {
            kicker: tr('Aplicando el editor'),
            title: tr('Actualizando el mundo'),
            sub: `${files.length} archivo${files.length === 1 ? '' : 's'}`,
        },
        () => {
            summary = applyHotEdits(
                {
                    data,
                    overworld,
                    world,
                    views: {
                        water: waterView,
                        npcs: npcView,
                        gather: gatherView,
                        landmarks,
                        resurrector: resurrectorView,
                        vegetation: view.vegetation,
                    },
                    applyStones: applyStonesJson,
                    refreshMap: refreshMapWorld,
                    refreshPropSolids: pushExtraSolids,
                    extraObstacles: () => (benchMode ? [] : [BANK_LOCATION.building]),
                    refreshHouses: () =>
                        houses?.setHouses(
                            overworld.vegetation.props.filter((p) => p.kind === 'house'),
                            overworld.vegetation.props.filter((p) => p.kind === 'landmark' && p.model === 'castillo'),
                        ),
                },
                files,
                before,
                after,
            );
        },
    ).then(() => summary);
}
const editor = menus
    ? mountEditor({
          view,
          overworld,
          data,
          keys: () => menus.keys.bindings.editor,
          apply: editorApply,
          dungeon: () => crypt?.editorContext() ?? null,
      })
    : null;
// Minimapa y mapa grande: el mundo una vez; cada fotograma, `mapFrame()`.
function refreshMapWorld(): void {
    menus?.setMapWorld(
        buildMapWorld(overworld, data.zones, (x, y) =>
            mapCoords(x, y, overworld.def.width, overworld.def.depth, stonesDef.coordCellMeters),
        ),
    );
}
refreshMapWorld();
/** Modo edición: `stones.json` cambió. Se rehacen definición, lanchas, libro y mallas. */
function applyStonesJson(raw: unknown): void {
    stonesDef = parseStones(raw);
    boats = parseBoats(raw);
    boatTarget = null;
    stoneTarget = null;
    // Las posiciones reales se recalculan sobre la rejilla nueva.
    stonePos.clear();
    stones.def = stonesDef;
    // `normalize` descarta las piedras borradas y conserva las conocidas.
    stones.progress = StoneBook.normalize(stonesDef, stones.progress);
    stoneView.build(stonesDef.stones, stoneAt);
}

// Latencia de clic: desde el evento hasta el primer fotograma presentado con
// el jugador ya desplazándose.
const clickLatency = new FrameStats(30);
let pendingClickStamp: number | null = null;
let holdTimer = 0;
/** Enemigo sobre el que empezó la pulsación: mantener pulsado repite el ataque básico. */
let holdEnemy: number | null = null;

// ─── Lanzar hechizos (combate v2): pulsar y clic, con indicador o al pulsar ──
const castInput = new CastInput(startOptions.castMode);
// JL-66: el menú contextual de la barra emite un evento para cambiar el modo de un hueco.
window.addEventListener('frankmangames:slotCastMode', (e: Event) => {
    const detail = (e as CustomEvent).detail as { slot: number; mode: string };
    castInput.setSlotMode(detail.slot, detail.mode as import('./sim/castModes').CastMode);
});
/**
 * Botón primario (izquierdo de fábrica): andar, atacar, hablar, recoger y usar. Se puede
 * intercambiar con el botón de cámara sin cambiar su comportamiento al mantenerlo.
 */
function moveButtonIndex(): 0 | 2 {
    return (menus?.keys.bindings.moveClick ?? ['MouseLeft']).includes('MouseRight') ? 2 : 0;
}
function cameraDragButtonIndex(): 0 | 2 {
    return (menus?.keys.bindings.cameraDrag ?? ['MouseRight']).includes('MouseLeft') ? 0 : 2;
}
/** Botón que se está manteniendo para andar hacia el cursor. */
let moveHold: MoveClickHold | null = null;
window.addEventListener('pointerup', (e) => {
    if (moveHold && e.button === moveHold.button) moveHold = null;
});
/** El clic izquierdo de esta pulsación confirmó un hechizo: no mueve al soltarlo ni al mantenerlo. */
let clickConsumed = false;
/** Puerta de `World.castSlot`: true = se queda apuntando (la tecla no lanza aún). */
const slotGate = (index: number, spell: Parameters<NonNullable<World['slotGate']>>[1]): boolean =>
    castInput.press(index, needsAim(spell)).kind === 'aim';
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
        if (e.code !== 'Escape' && menus?.keys.action(e.code) !== 'closeWindow') return;
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
    if (menus?.pointerCaptured) return;
    const moveBtn = moveButtonIndex();
    if (e.button !== moveBtn) return;
    clickConsumed = false;
    holdTimer = 0;
    moveHold = new MoveClickHold(moveBtn);
    // En vuelo el clic de andar es un destino, incluso sobre enemigos o interacciones del suelo.
    if (world.player.flight) {
        holdEnemy = null;
        const p = view.pickGround(e.offsetX, e.offsetY);
        if (p) world.commandMove(p);
        return;
    }
    // Boca de la cripta, escaleras y cofres: ir hasta allí y usarlo al llegar.
    if (
        (!crypt?.inside && !houses?.inside && bank?.click(e.offsetX, e.offsetY)) ||
        (!bank?.inside && !houses?.inside && crypt?.click(e.offsetX, e.offsetY)) ||
        (!bank?.inside && !crypt?.inside && houses?.click(e.offsetX, e.offsetY))
    ) {
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
    const water = world.interior
        ? null
        : waterView.pickWater(view.scene.createPickingRay(e.offsetX, e.offsetY, Matrix.Identity(), view.rig.camera));
    if (water && world.fishingSpotAt(water)) {
        world.commandFish(water);
        // Sin esto, mantener el botón un instante se volvía «caminar» y cancelaba la pesca (F15).
        clickConsumed = true;
        pendingClickStamp = null;
        return;
    }
    moveToGround(e.offsetX, e.offsetY, e.timeStamp);
});

/** Andar hasta el suelo bajo el cursor (o subir a la lancha si se pulsó su muelle). */
function moveToGround(sx: number, sy: number, stamp: number): void {
    const p = view.pickGround(sx, sy);
    if (!p) return;
    // JUG-04: si el clic cae cerca de un enemigo, atacar en vez de mover.
    {
        const radius = world.data.player.clickAttackRadius;
        let bestId: number | null = null;
        let bestDist = radius;
        for (const e of world.enemies.list) {
            if (e.state === 'dead') continue;
            const d = Math.hypot(e.pos.x - p.x, e.pos.y - p.y);
            if (d < bestDist) {
                bestDist = d;
                bestId = e.id;
            }
        }
        if (bestId !== null) {
            holdEnemy = bestId;
            world.commandAttack(bestId);
            pendingClickStamp = null;
            return;
        }
    }
    // JUG-04: si el clic cae cerca de un PNJ, ir a hablar en vez de mover.
    {
        const radius = world.data.player.clickTalkRadius;
        let bestNpc: { npcId: string } | null = null;
        let bestDist = radius;
        for (const n of world.npcs) {
            const d = Math.hypot(n.pos.x - p.x, n.pos.y - p.y);
            if (d < bestDist) {
                bestDist = d;
                bestNpc = n;
            }
        }
        if (bestNpc !== null) {
            if (world.character.spectral.active) menus?.toast('Los vivos no te oyen: busca un Alzador', 'warn');
            world.commandTalk(bestNpc.npcId);
            clickConsumed = true;
            pendingClickStamp = null;
            return;
        }
    }
    boatTarget = world.interior ? null : boatAt(boats, p);
    if (boatTarget) {
        if (world.character.spectral.active) {
            menus?.toast('Busca un Alzador antes de embarcar', 'warn');
            boatTarget = null;
        } else if (!boatAllowed(boatTarget)) {
            menus?.toast(boatTarget.waitText || 'La lancha no sale todavía', 'warn');
            boatTarget = null;
            pendingClickStamp = null;
            return;
        } else {
            world.commandMove({ x: boatTarget.x, y: boatTarget.y });
            menus?.toast(boatTarget.name, 'info');
            clickConsumed = true;
            pendingClickStamp = null;
            return;
        }
    }
    world.commandMove(p); // la orden entra antes del siguiente tick
    pendingClickStamp = world.player.path.length > 0 ? stamp : null;
}

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
    installWorld(
        new World(d, {
            seed,
            zones: !benchMode,
            timeOfDay: world.timeOfDay,
            ...(session ? { character: session.character } : {}),
        }),
    );
    // MER-01: en desarrollo, colocar el buhonero de pruebas en cada creación de mundo.
    if (import.meta.env.DEV && session) {
        const devMerchant = session.content.merchants['dev_buhonero'];
        if (devMerchant) {
            world.placeDevNpc('dev_buhonero', 'dev_buhonero', devMerchant.position);
        }
    }
}

/** Lo que hay hoy en el mundo para decidir dónde cae un guardado. */
function placeWorld(): PlaceWorld {
    return {
        width: data.zone.width,
        depth: data.zone.depth,
        originX: data.zone.originX ?? 0,
        originY: data.zone.originY ?? 0,
        // Un guardado puede caer en una página aún sin cargar.
        walkable: (p) => {
            overworld.stream.ensure(p.x, p.y, p.x + 0.001, p.y + 0.001);
            return outdoorGrid.walkable(p);
        },
        dungeons: {
            crypt: {
                floors: dungeonDef.floors.length,
                entrance: { x: dungeonDef.entrance.x, y: dungeonDef.entrance.y },
            },
        },
        stones: stonesDef.stones.map((z) => ({ id: z.id, ...stoneAt(z) })),
        known: stones.progress.known,
        home: stones.progress.respawn,
    };
}

/** Pone al jugador donde dice el guardado (o en la Piedra Pintada más cercana si el sitio ya no existe). */
function enterPlace(place: SavePlace | null, seed: number, dungeonState?: DungeonSaveState | null): void {
    if (session?.character.spectral.active && place?.scene === 'dungeon') {
        newWorld(seed, arriveAt(stones.respawn));
        return;
    }
    const r = resolvePlace(place, placeWorld());
    if (r.kind === 'overworld') {
        newWorld(seed, r.pos);
        return;
    }
    if (r.kind === 'dungeon') {
        newWorld(seed);
        if (!crypt || !crypt.enter(r.floor, 'above', r.pos ?? undefined)) teleport(arriveAt(stones.respawn));
        // DUN-02: restaurar el estado del piso después de generarlo.
        if (crypt && dungeonState) crypt.restoreState(dungeonState);
        return;
    }
    const stone = stones.get(r.stone) ?? stones.respawn;
    const at = arriveAt(stone);
    newWorld(seed, at);
    // Q14: la cámara encuadra al personaje tanto al crearlo como al cargar un guardado.
    const yaw = faceYawDeg(stone, at);
    if (yaw !== null) view.rig.lookToward(yaw);
    const why = FALLBACK_TEXT[r.reason];
    if (why) menus?.toast(why, 'warn');
}

/** Dónde está el jugador ahora, para el guardado. */
function currentPlace(): SavePlace {
    // El banco no es una mazmorra persistente: cargar reaparece ante su puerta.
    const p = bank?.inside ? BANK_LOCATION.returnPoint : houses?.inside ? houses.returnPoint! : world.player.pos;
    const inside = crypt?.inside ?? false;
    const zone = bank?.inside ? 'El Cruce' : houses?.inside ? 'Villa Raspadura' : worldInfo().zone;
    return {
        scene: inside ? 'dungeon' : 'overworld',
        dungeon: inside ? 'crypt' : null,
        floor: inside ? crypt!.floor : null,
        x: p.x,
        y: p.y,
        stone: stones.progress.respawn,
        knownStones: [...stones.progress.known],
        timeOfDay: Math.round(world.timeOfDay * 1e4) / 1e4,
        playSeconds: Math.round(playSeconds),
        ...(zone ? { name: zone } : {}),
    };
}

/** Lo que las partidas de prueba necesitan saber del mundo. */
function presetWorld(): PresetWorld {
    return {
        zones: new ZoneMap(data.zones),
        width: overworld.def.width,
        depth: overworld.def.depth,
        dungeons: { crypt: { floors: dungeonDef.floors.length, title: (f) => floorTitle(dungeonDef, f) } },
        stones: stonesDef.stones.map((z) => z.id),
        home: stonesDef.home,
        walkable: (p) => outdoorGrid.walkable(p),
    };
}

/** Menú «Partidas de prueba»: se regenera desde los catálogos actuales; no conserva presets manuales heredados. */
function devPresetsMenu(): NonNullable<Parameters<typeof mountMenus>[1]>['devPresets'] {
    const file = loadPresets();
    const pw = presetWorld();
    const acquisition = buildAcquisitionIndex(data);
    const coverage = generateProfiles(data).filter(
        (p) => p.build === 'balanced' && p.equipmentTier === 'optimized-obtainable',
    );
    const coverageById = new Map(coverage.map((p) => [`qa:${p.id}`, p]));
    const itemPresets = itemCatalogPresets(data, stonesDef.home);
    const itemPresetsById = new Map(itemPresets.map((p) => [p.id, p]));
    const spellPresets = spellCatalogPresets(data, stonesDef.home);
    const spellPresetsById = new Map(spellPresets.map((p) => [p.id, p]));
    const setPresets = setShowcasePresets(data, stonesDef.home, 'diablica_espeja');
    const setPresetsById = new Map(setPresets.map((p) => [p.id, p]));
    const regions = regionCoverageProfiles(data);
    const regionsById = new Map(regions.map((p) => [p.id, p]));
    const dungeonProfiles = dungeonCoverageProfiles(data, dungeonDef);
    const guardianProfiles = guardianCoverageProfiles(data, dungeonDef);
    const dungeonById = new Map<string, DungeonCoverageProfile | GuardianCoverageProfile>(
        [...dungeonProfiles, ...guardianProfiles].map((p) => [p.profile.id, p]),
    );
    return {
        groups: [
            ...(setPresets.length ? [setShowcaseGroup(setPresets)] : []),
            spellCatalogGroup(spellPresets),
            itemCatalogGroup(itemPresets),
            regionCoverageGroup(regions),
            guardianCoverageGroup(guardianProfiles),
            ...dungeonCoverageGroups(dungeonProfiles),
            ...coverageGroups(coverage),
        ],
        build: (id, progression) => {
            const qaRpg = withProgressionGains(data.rpg, progression);
            const qaData = { ...data, rpg: qaRpg };
            const spellPreset = spellPresetsById.get(id);
            if (spellPreset) return buildPresetSave(qaRpg, spellPreset, pw, file.allStones);
            const itemPreset = itemPresetsById.get(id);
            if (itemPreset) return buildPresetSave(qaRpg, itemPreset, pw, file.allStones);
            const setPreset = setPresetsById.get(id);
            if (setPreset) return buildPresetSave(qaRpg, setPreset, pw, file.allStones);
            const region = regionsById.get(id);
            if (region) {
                const built = buildProfile(qaData, region, acquisition);
                return {
                    ...addPowerKit(qaRpg, built.session.save()),
                    label: `Mapa · ${qaRpg.classes[region.classId]!.name} · ${region.band.label}`,
                    place: coveragePlace(region, pw),
                };
            }
            const dungeon = dungeonById.get(id);
            if (dungeon) {
                const built = buildProfile(qaData, dungeon.profile, acquisition);
                built.session.character.give('health_potion', 20);
                built.session.character.give('resource_tonic', 20);
                built.session.character.give('crypt_key', 2);
                return {
                    ...addPowerKit(qaRpg, built.session.save()),
                    label: `Cripta · ${'guardian' in dungeon ? 'jefe del ' : ''}piso ${dungeon.floor + 1} · ${qaRpg.classes[dungeon.profile.classId]!.name}`,
                    place: {
                        scene: 'dungeon',
                        dungeon: 'crypt',
                        floor: dungeon.floor,
                        x: null,
                        y: null,
                        stone: pw.home,
                        knownStones: [...pw.stones],
                        timeOfDay: 0.25,
                        name: floorTitle(dungeonDef, dungeon.floor),
                    },
                };
            }
            const profile = coverageById.get(id);
            if (!profile) return null;
            const built = buildProfile(qaData, profile, acquisition);
            const save = addPowerKit(qaRpg, built.session.save());
            return {
                ...save,
                label: `QA · ${qaRpg.classes[profile.classId]!.name} · ${profile.band.label}`,
                place: coveragePlace(profile, pw),
            };
        },
    };
}

function spellCatalogGroup(
    presets: ReturnType<typeof spellCatalogPresets>,
): NonNullable<NonNullable<Parameters<typeof mountMenus>[1]>['devPresets']>['groups'][number] {
    return {
        name: tr('Catálogo completo · hechizos, iconos y efectos'),
        entries: presets.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            group: 'catalog',
            role: p.role,
            classId: p.classId,
            level: p.level,
            place: 'Villa Raspadura',
        })),
    };
}

function setShowcaseGroup(
    presets: ReturnType<typeof setShowcasePresets>,
): NonNullable<NonNullable<Parameters<typeof mountMenus>[1]>['devPresets']>['groups'][number] {
    return {
        name: tr('Conjuntos · Ajuar de la Diablica Espeja'),
        entries: presets.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            group: 'catalog',
            role: p.role,
            classId: p.classId,
            level: p.level,
            place: 'Villa Raspadura',
        })),
    };
}

function itemCatalogGroup(
    presets: ReturnType<typeof itemCatalogPresets>,
): NonNullable<NonNullable<Parameters<typeof mountMenus>[1]>['devPresets']>['groups'][number] {
    return {
        name: tr('Catálogo completo · objetos e iconos'),
        entries: presets.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            group: 'catalog',
            role: p.role,
            classId: p.classId,
            level: p.level,
            place: 'Villa Raspadura',
        })),
    };
}

function regionCoverageGroup(
    profiles: BalanceProfile[],
): NonNullable<NonNullable<Parameters<typeof mountMenus>[1]>['devPresets']>['groups'][number] {
    return {
        name: 'Mapa de Panamá · todos los lugares y clases',
        entries: profiles.map((p) => ({
            id: p.id,
            name: `${p.band.label} · ${data.rpg.classes[p.classId]!.name}`,
            description: `${p.band.territory === 'playable' ? 'Llegada real caminable' : 'Lugar planificado: abre en el hogar hasta que tenga geografía jugable'} · build equilibrada y equipo obtenible.`,
            group: 'regions',
            role: tr('exploración · lugar y clase'),
            classId: p.classId,
            level: p.level,
            place: p.band.territory === 'playable' ? p.band.label : `${p.band.label} · planificado`,
        })),
    };
}

function guardianCoverageGroup(
    profiles: GuardianCoverageProfile[],
): NonNullable<NonNullable<Parameters<typeof mountMenus>[1]>['devPresets']>['groups'][number] {
    return {
        name: tr('Cripta · jefes (nivel del guardián)'),
        entries: profiles.map((p) => ({
            id: p.profile.id,
            name: `Jefe piso ${p.floor + 1} · ${data.rpg.enemies[p.guardian.archetype]?.name ?? p.guardian.archetype} · ${data.rpg.classes[p.profile.classId]!.name}`,
            description: `Guardián nivel ${p.guardian.level} (piso ${p.floorLevelMin}–${p.floorLevelMax}) · personaje al nivel del guardián, build equilibrada y equipo optimizado obtenible · pociones y llaves.`,
            group: 'dungeon',
            role: tr('mazmorra · jefe'),
            classId: p.profile.classId,
            level: p.profile.level,
            place: floorTitle(dungeonDef, p.floor),
        })),
    };
}

function dungeonCoverageGroups(
    profiles: DungeonCoverageProfile[],
): NonNullable<NonNullable<Parameters<typeof mountMenus>[1]>['devPresets']>['groups'] {
    const ranges = [
        [0, 24],
        [25, 49],
        [50, 74],
        [75, 99],
    ] as const;
    return ranges.map(([from, to]) => ({
        name: `Cripta · builds por piso ${from + 1}–${to + 1}`,
        entries: profiles
            .filter((p) => p.floor >= from && p.floor <= to)
            .map((p) => ({
                id: p.profile.id,
                name: `Piso ${p.floor + 1} · ${data.rpg.classes[p.profile.classId]!.name}`,
                description: `Nivel del piso ${p.floorLevelMin}–${p.floorLevelMax} · build ${p.profile.build} · equipo optimizado obtenible · pociones y llaves.`,
                group: 'dungeon',
                role: `mazmorra · ${p.profile.build}`,
                classId: p.profile.classId,
                level: p.profile.level,
                place: floorTitle(dungeonDef, p.floor),
            })),
    }));
}

function coverageGroups(
    profiles: BalanceProfile[],
): NonNullable<NonNullable<Parameters<typeof mountMenus>[1]>['devPresets']>['groups'] {
    const ranges = [
        { name: 'Cobertura completa · niveles 1–25', min: 0, max: 25 },
        { name: 'Cobertura completa · niveles 26–100', min: 26, max: 100 },
        { name: 'Cobertura futura · niveles 101–200', min: 101, max: 200 },
    ];
    return ranges.map((range) => ({
        name: range.name,
        entries: profiles
            .filter((p) => p.level >= range.min && p.level <= range.max)
            .map((p) => ({
                id: `qa:${p.id}`,
                name: `${data.rpg.classes[p.classId]!.name} ${p.level}`,
                description: `${p.band.territory === 'playable' ? 'Territorio jugable' : 'Simulación hipotética sin territorio completo'} · build equilibrada · equipo optimizado con procedencia demostrable · semilla ${p.seed}.`,
                group: 'coverage',
                role: 'balance reproducible',
                classId: p.classId,
                level: p.level,
                place: p.band.territory === 'playable' ? p.band.label : 'Sin territorio implementado',
            })),
    }));
}

function coveragePlace(profile: BalanceProfile, world: PresetWorld): SavePlace {
    if (profile.band.zone && profile.band.territory === 'playable') {
        const pos = pointInZone(world.zones, profile.band.zone.id, world.width, world.depth, world.walkable);
        if (pos)
            return {
                scene: 'overworld',
                dungeon: null,
                floor: null,
                x: pos.x,
                y: pos.y,
                stone: world.home,
                knownStones: [...world.stones],
                timeOfDay: 0.5,
                name: profile.band.label,
            };
    }
    return {
        scene: 'overworld',
        dungeon: null,
        floor: null,
        x: null,
        y: null,
        stone: world.home,
        knownStones: [...world.stones],
        timeOfDay: 0.5,
        name: `Simulación nivel ${profile.level} · sin territorio`,
    };
}

/** F21: la montura de pruebas se puede quitar con `frankmangames.devMount` = "0" (el QA lo hace). */
function devMountWanted(): boolean {
    try {
        return localStorage.getItem('frankmangames.devMount') !== '0';
    } catch {
        return true;
    }
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
    // Creador 2026-11-20: fuera de alcance, el personaje se acerca andando y lanza.
    world.approachToCast = true;
    world.slotGate = slotGate;
    world.lockMode = lockMode;
    world.onLand = () => {
        moveHold = null;
    };
    castInput.cancel();
    meter.newScene();
    session?.attach(world);
    view.resetRun();
    lootView.reset();
    combatLog.clear();
    benchHud?.hideOutcome();
    clock.reset();
    holdEnemy = null;
    pendingClickStamp = null;
}

function saveTelemetry(): void {
    const json = telemetry.toJSON();
    notice('[telemetría] ' + json, 'aviso');
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `telemetria-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Punto del suelo y enemigo bajo el cursor, para apuntar habilidades. */
function cursorAim(): { point: { x: number; y: number }; targetId: number | null } {
    const ground = view.pickGround(input.x, input.y) ?? { ...world.player.pos };
    let targetId = view.pickEnemy(input.x, input.y);
    // JL-66: asistencia al apuntar — si el cursor está cerca de un enemigo, se pega al más cercano.
    if (targetId === null && world.data.player.aimAssistRadius > 0) {
        const r = world.data.player.aimAssistRadius;
        const r2 = r * r;
        let bestId: number | null = null;
        let bestDist2 = r2;
        for (const e of world.enemies.list) {
            if (e.state === 'dead') continue;
            const d2 = (e.pos.x - ground.x) ** 2 + (e.pos.y - ground.y) ** 2;
            if (d2 < bestDist2) {
                bestDist2 = d2;
                bestId = e.id;
            }
        }
        targetId = bestId;
    }
    return { point: ground, targetId };
}
canvas.addEventListener(
    'wheel',
    (e) => {
        view.rig.zoomBy(Math.sign(e.deltaY) * 2);
        e.preventDefault();
    },
    { passive: false },
);
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
    world.enemies.list.forEach((e, i) =>
        world.enemyActor(e).statuses.apply(c.statuses[looks[i % looks.length]!]!, { duration: 60 }),
    );
    world.character.statuses.apply(c.statuses['shield']!, { duration: 60, shield: 50 });
    const spawnPet = (world as unknown as { spawnPet(d: unknown, uid: null, ttl: number): void }).spawnPet.bind(world);
    for (const id of Object.keys(c.pets)) spawnPet(c.pets[id]!, null, 600);
    const itemIds = Object.keys(c.items);
    for (let i = 0; i < 10; i++) {
        // Lejos del alcance del jugador y del búho (que recoge botín), pero a la vista.
        const at = { x: world.player.pos.x + Math.cos(i * 0.35) * 12, y: world.player.pos.y + Math.sin(i * 0.35) * 12 };
        world.dropLoot(
            at,
            i < 8 ? { uid: `bench${i}`, itemId: itemIds[(i * 7) % itemIds.length]!, quantity: 1, rolled: [] } : null,
            i < 8 ? 0 : 25,
        );
    }
    const timer = setInterval(() => {
        const alive = world.enemies.list.filter((e) => e.state !== 'dead');
        const e = alive[Math.floor(Math.random() * alive.length)];
        if (e)
            view.handleEvents(world, [
                {
                    type: 'damage',
                    sourceId: world.player.id,
                    targetId: e.id,
                    amount: 12,
                    crit: Math.random() < 0.2,
                    toPlayer: false,
                    ability: 'spark',
                },
            ]);
    }, 100);
    return () => clearInterval(timer);
}

async function bench(
    n: number,
    mode: ChaserRenderMode,
    seconds = 5,
    timeOfDay: number | null = null,
    characters = 0,
    effects = false,
    occlusion = true,
    humans = 0,
): Promise<Record<string, number | string>> {
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
        world.spawnEnemy(kinds[i % kinds.length]!, {
            x: world.player.pos.x + Math.cos(a) * r,
            y: world.player.pos.y + Math.sin(a) * r,
        });
    }
    // Humanoides procedurales (jugador y PNJ con sus aspectos) en corro, sólo render.
    const crowd =
        humans > 0
            ? new CharacterCrowd(
                  view.scene,
                  overworld.characters,
                  view.assets,
                  view.heights,
                  { x: world.player.pos.x, z: world.player.pos.y },
                  humans,
                  view.atmosphere,
              )
            : null;
    view.chasers.mode = mode;
    if (timeOfDay !== null) {
        world.timeOfDay = timeOfDay;
        world.timeScale = 0;
    } else world.timeScale = 1;
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
        timeOfDay: timeOfDay ?? world.timeOfDay,
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
            /** Pruebas: ir al muelle de una lancha y subir, como con un clic. */
            board: (id: string) => {
                boatTarget = boats.find((b) => b.id === id) ?? null;
                if (boatTarget) world.commandMove({ x: boatTarget.x, y: boatTarget.y });
            },
            /** Pruebas: mismo destino seguro que el menú de una Piedra Pintada. */
            travelStone: (id: string) => {
                const z = stonesDef.stones.find((s) => s.id === id);
                if (z) teleport(arriveAt(z));
            },
            /** Pruebas: el modo edición y su aplicación en caliente, sin pasar por el POST de guardar. */
            editor,
            editorApply,
            overworld,
            get world() {
                return world;
            },
            /** Pruebas: definición viva de piedras (`stones.json`, tras edición en caliente). */
            get stones() {
                return stonesDef;
            },
            /** JL-135: libro de piedras con progreso (para que QA fije el respawn). */
            get stoneBook() {
                return stones;
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
            menus,
            meter,
            get place() {
                return currentPlace();
            },
            get session() {
                return session;
            },
            /** JL-91: acceso de QA al CastInput para cambiar el modo de lanzamiento. */
            get castInput() {
                return castInput;
            },
            /** JL-148: acceso de QA a KeyMap para asignar teclas. */
            get keys() {
                return menus?.keys ?? null;
            },
        },
    });
}

// `?bench=1` (Electron con `--bench`): batería fija y una línea `BENCH {json}`.
if (benchMode) {
    void (async () => {
        // Mundo visual: mediodía (sombras del sol) y noche (farolas + luz del jugador).
        const runs: Array<[number, ChaserRenderMode, number]> = [
            [0, 'instanced', 0.5],
            [20, 'instanced', 0.5],
            [200, 'instanced', 0.5],
            [200, 'meshes', 0.5],
            [200, 'hidden', 0.5],
            [0, 'instanced', 0.95],
            [200, 'instanced', 0.95],
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
        const screen = {
            canvasPx: [canvas.width, canvas.height],
            cssPx: [canvas.clientWidth, canvas.clientHeight],
            dpr: devicePixelRatio,
            worldBuildMs: Math.round(buildMs),
        };
        console.log(`BENCH ${JSON.stringify({ userAgent: navigator.userAgent, screen, results })}`);
    })();
}

// U11: errores de la página y de la consola, a la información de desarrollo y a la consola oculta
// (F8, en cualquier pantalla; los agentes de QA la leen con `window.__consola.text()`).
const consolePanel = new DevConsolePanel(devLog);
(window as unknown as { __consola: object }).__consola = {
    text: (n?: number) => devLog.text(n),
    errores: (n?: number) => devLog.text(n, ['error', 'warn']),
    entradas: () => devLog.entries.slice(),
    limpiar: () => devLog.clear(),
};
window.addEventListener(
    'keydown',
    (e) => {
        if (e.code !== 'F8') return;
        e.preventDefault();
        e.stopPropagation();
        consolePanel.toggle();
    },
    true,
);
const argText = (args: unknown[]): string =>
    args
        .map((a) => {
            if (a instanceof Error) return a.stack?.split('\n').slice(0, 3).join(' ') ?? a.message;
            if (typeof a === 'string') return a;
            try {
                return JSON.stringify(a);
            } catch {
                return String(a);
            }
        })
        .join(' ');
window.addEventListener('error', (e) => {
    // JL-137: Babylon's rgbdTextureTools.js tiene un race condition interno:
    // un observer addOnce del Effect intenta acceder a scene.postProcessManager
    // después de que la escena se limpió. No afecta al juego.
    if (typeof e.message === 'string' && e.message.includes('postProcessManager')) return;
    perf.error(e.message || String(e.error), performance.now() / 1000);
    notice(e.error instanceof Error ? argText([e.error]) : e.message || String(e.error), 'error');
});
window.addEventListener('unhandledrejection', (e) => {
    const msg = `promesa: ${e.reason instanceof Error ? e.reason.message : String(e.reason)}`;
    perf.error(msg, performance.now() / 1000);
    notice(e.reason instanceof Error ? `promesa: ${argText([e.reason])}` : msg, 'error');
});
{
    const consoleError = console.error.bind(console);
    console.error = (...args: unknown[]) => {
        const text = argText(args);
        perf.error(text, performance.now() / 1000);
        notice(text, 'error');
        consoleError(...args);
    };
    const consoleWarn = console.warn.bind(console);
    console.warn = (...args: unknown[]) => {
        notice(argText(args), 'warn');
        consoleWarn(...args);
    };
}
perf.features = () => {
    const o = lastOptions;
    const engine = view.scene.getEngine();
    let gpu = '';
    try {
        gpu = (engine as unknown as { getGlInfo(): { renderer: string } }).getGlInfo().renderer;
    } catch {
        gpu = '?';
    }
    const p = world.player;
    const z = world.currentZone;
    const state =
        [p.flight ? 'volando' : null, aimingSpell() !== null ? 'apuntando' : null].filter(Boolean).join(', ') ||
        tr('a pie');
    return (
        `GPU ${gpu} · ${engine.getRenderWidth()}×${engine.getRenderHeight()} · mallas ${view.scene.getActiveMeshes().length}/${view.scene.meshes.length}\n` +
        (o
            ? `estilo ${o.visualStyle} · sombras ${o.shadows} · AA ${o.antialias} · escala ${o.renderScale} · vista ${o.viewDistance} m · recorte ${o.occlusionCut ? 'sí' : 'no'} · límite ${o.fpsCap || '∞'}\n`
            : '') +
        `zona ${z ? `${z.name} (${z.id})` : '—'} · ${state} · cámara ${cameraMode}${devTools ? ' · herramientas de desarrollo' : ''}`
    );
};
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
    `hora ${clockText(world.timeOfDay)} · [F2] reloj ×${world.timeScale} [F3] +3 h [Insert] tiempo: ${weatherText()} · girar cámara: rueda o clic derecho y arrastrar, mantener [${key('cameraOrbit')}], [${key('cameraLeft')}]/[${key('cameraRight')}]`;

function key(a: Action): string {
    return menus?.keys.label(a) ?? a;
}

// Acciones de teclado que la interfaz no resuelve. Atajos en data/ui/keybindings.json.
input.onMiddleClick(() => menus?.pressBinding('MouseMiddle'));
/** F21: en vuelo, WASD y Espacio son del vuelo y ninguna tecla lanza hechizos (sí se recibe daño). */
const FLIGHT_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space']);
if (menus)
    menus.keyFilter = (code) =>
        !!world.player.flight && (FLIGHT_KEYS.has(code) || /^hotbar/.test(menus.keys.action(code) ?? ''));
menus?.onAction((a) => {
    const framing: Partial<Record<Action, FramingId>> = {
        cameraDefault: 'default',
        cameraTop: 'top',
        cameraClose: 'close',
        cameraIsometric: 'isometric',
        cameraCinematic: 'cinematic',
    };
    const frame = framing[a];
    if (frame) {
        view.rig.setFraming(frame);
        return;
    }
    if (a === 'toggleFlight') {
        const wasFlying = !!world.player.flight;
        const flying = world.toggleFlight();
        if (wasFlying !== flying) {
            castInput.cancel();
            holdEnemy = null;
            clickConsumed = false;
            pendingClickStamp = null;
            stoneTarget = null;
            stationTarget = null;
            boatTarget = null;
            moveHold = null;
            input.cancelPointerGestures();
        }
        if (flying)
            menus?.toast(
                'Vuelo: WASD para moverte, Espacio para subir, Tab para aterrizar. Sin hechizos en el aire.',
                'info',
            );
        else if (!world.player.flight)
            menus?.toast(
                world.canFly() ? tr('Aterrizas') : tr('Hace falta una montura que vuele'),
                world.canFly() ? 'info' : 'warn',
            );
        return;
    }
    if (a === 'cameraNextMode') {
        cameraMode = CAMERA_MODES[(CAMERA_MODES.indexOf(cameraMode) + 1) % CAMERA_MODES.length]!;
        applyCameraMode();
        menus?.toast(`Cámara: ${CAMERA_MODE_NAMES[cameraMode]}`, 'info');
        return;
    }
    if (a === 'castModeNext') {
        const next = CAST_MODES[(CAST_MODES.indexOf(castInput.mode) + 1) % CAST_MODES.length]!;
        castInput.setMode(next);
        menus?.toast(`Lanzar: ${CAST_MODE_NAMES[next]}`, 'info');
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
    const stone = stones.respawn;
    const at = arriveAt(stone);
    veil({ kicker: tr('Volviendo a'), title: stone.name, sub: tr('Piedra Pintada') }, () => {
        if (world.interior) newWorld(data.loadTest.seed + ++runIndex, at);
        else teleport(at);
    });
    menus?.toast(`Despiertas en ${stone.name}`, 'info');
}

menus?.onSession((s) => {
    s.on((e) => {
        if (e.type === 'recall') recallToStone();
        if (e.type === 'dungeonReturn' && crypt?.inside) crypt.leave();
        if (e.type === 'npcClip') npcView.playGesture(e.npcId, e.clip);
        // DUN-07: recompensa del guardián.
        if (e.type === 'guardianDefeated' && crypt?.inside) crypt.onGuardianDefeated(e.archetype);
    });
    if (!(s instanceof GameSession)) throw new Error('la interfaz debe usar la sesión real');
    session = s;
    // F21: en desarrollo, la montura rápida va puesta desde el nivel 1.
    if (import.meta.env.DEV && devMountWanted() && grantDevMount(s.character))
        menus?.toast('Montura de pruebas puesta (solo en desarrollo)', 'info');
    // Catálogo de pruebas: una unidad de cada objeto del juego (mochila y, lo que no cabe, banco).
    if (import.meta.env.DEV && devMountWanted()) {
        const got = grantAllItems(s.character);
        if (got.bag + got.bank > 0)
            menus?.toast(`Catálogo de pruebas: ${got.bag} objetos en la mochila y ${got.bank} en el banco`, 'info');
        // V3: hechizos de prueba (devOnly, multilínea): no se aprenden de ninguna otra forma.
        for (const sp of Object.values(s.content.spells))
            if (sp.devOnly && s.character.spellbook.rank(sp.id) === 0) s.character.spellbook.learn(sp.id);
    }
    const place = s.startPlace;
    // DUN-02: estado de la mazmorra a restaurar después de enterPlace.
    const loadedDungeonState = place?.scene === 'dungeon' ? s.loadedDungeonState ?? null : null;
    // Piedras: las del guardado si las trae; si no (guardados antiguos), las guardadas aparte por personaje.
    if (place?.knownStones) stones = new StoneBook(stonesDef, { known: place.knownStones, respawn: place.stone });
    else {
        loadStones();
        if (place?.stone && stones.knows(place.stone)) stones.progress.respawn = place.stone;
    }
    saveStones();
    playSeconds = place?.playSeconds ?? 0;
    if (place?.timeOfDay !== null && place?.timeOfDay !== undefined) world.timeOfDay = place.timeOfDay;
    // DEV-02 (creador, 2026-11-18): una partida nueva (sin guardado detrás) empieza por la mañana.
    else if (!place) world.timeOfDay = data.lighting.startTime;
    s.placeProvider = currentPlace;
    // DUN-02: inyectar estado de la mazmorra y piso más hondo en cada guardado.
    s.saveDecorator = (save) => {
        const ds = crypt?.toSaveState() ?? null;
        const deepest = save.deepestFloor;
        if (ds && ds.floor !== null && (deepest === undefined || ds.floor > deepest)) {
            return { ...save, dungeonState: ds, deepestFloor: ds.floor };
        }
        if (ds) return { ...save, dungeonState: ds, ...(deepest !== undefined ? { deepestFloor: deepest } : {}) };
        // Al salir de la cripta, limpiar dungeonState.
        if (!crypt?.inside && save.dungeonState) {
            const { dungeonState: _ds, ...rest } = save;
            return rest;
        }
        return save;
    };
    telemetry.begin(new Date().toISOString());
    meter.reset();
    runIndex++;
    const seed = data.loadTest.seed + runIndex;
    veil({ kicker: place ? tr('Cargando partida') : tr('Partida nueva'), title: s.player().name, sub: place?.name }, () =>
        enterPlace(place, seed, loadedDungeonState),
    );
});
world.aimProvider = cursorAim;
world.approachToCast = true;
world.slotGate = slotGate;
world.onLand = () => {
    moveHold = null;
};
view.cursorGround = () => view.pickGround(input.x, input.y);
view.spellFx.aiming = () => {
    const id = aimingSpell();
    return id === null ? null : { spellId: id, ...cursorAim() };
};
/** Límite de FPS de las opciones (0 = sin límite). */
let fpsCap = 0;
/** Las últimas opciones, para la lista de funciones activas de la información de desarrollo. */
let lastOptions: GameOptions | null = null;
/** Grados por segundo al girar con las teclas de cámara. */
let cameraKeySpeed = 120;
// F27-INT: cuando el chat envía un emote, el avatar del jugador reproduce el clip.
menus?.onEmote((emoteId) => view.player.playEmote(emoteId));

menus?.onOptions((o) => {
    perf.setMode(o.devInfo);
    lastOptions = o;
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
    // JUG-03: activar/desactivar pausa de impacto y sacudida.
    view.hitPause.setConfig({
        duration: 0.06,
        shakeIntensity: 0.15,
        shakeDecay: 8,
        enabled: o.hitPause,
    });
    castInput.setMode(o.castMode);
    lockMode = o.lockMode;
    world.lockMode = o.lockMode;
    // DEV-02: la duración del día se aplica en el momento. El reloj de la simulación
    // (`src/sim/world.ts`) divide por `data.lighting.dayLengthSeconds` una fracción de día,
    // así cambiar el divisor conserva la hora actual: no salta.
    data.lighting.dayLengthSeconds = dayLengthSeconds(o.dayLengthMinutes);
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
input.orbitButton = cameraDragButtonIndex;

/** Recuento de eventos de animación (footstep, hit, cast) desde el arranque. */
const animEventCounts: Record<string, number> = {};
function animEventText(): string {
    return (
        Object.entries(animEventCounts)
            .map(([k, n]) => `${k} ${n}`)
            .join(' · ') || '--'
    );
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
        const s = Vector3.Project(
            new Vector3(x, view.heights.sample(x, y) + up, y),
            Matrix.Identity(),
            view.scene.getTransformMatrix(),
            view.rig.camera.viewport.toGlobal(w, h),
        );
        return { x: (s.x / w) * canvas.clientWidth, y: (s.y / h) * canvas.clientHeight };
    };
    const p = world.player;
    const ghosts: AimGhost[] = [];
    const cards: AimCardData[] = [];
    if (pv.casterTo)
        ghosts.push({
            key: 'player',
            source: view.player.model.root,
            facing: p.facing,
            from: p.pos,
            to: pv.casterTo,
            mine: true,
        });
    // Las más cercanas al cursor: en una multitud, más fichas no se leerían.
    const near = [...pv.targets].sort(
        (a, b) =>
            Math.hypot(a.pos.x - aim.point.x, a.pos.y - aim.point.y) -
            Math.hypot(b.pos.x - aim.point.x, b.pos.y - aim.point.y),
    );
    for (const t of near) {
        const statuses = t.statuses.map((st) => {
            const name = data.rpg.statuses[st.statusId]?.name ?? st.statusId;
            return st.chance < 1 ? `${name} (${Math.round(st.chance * 100)} %)` : name;
        });
        if (t.to)
            ghosts.push({
                key: `e${t.id}`,
                source: view.enemies.modelRoot(t.id),
                facing: world.enemies.get(t.id)?.facing ?? 0,
                from: t.pos,
                to: t.to,
                mine: false,
            });
        if (cards.length >= 6) continue;
        const d = t.damage;
        const lethal = !!d && !d.immune && d.max >= t.health;
        const at = toScreen(t.pos.x, t.pos.y, 2.2);
        cards.push({
            key: `e${t.id}`,
            ...at,
            title: `${t.name} · nv. ${t.level}`,
            health: {
                value: t.health,
                max: t.maxHealth,
                lostMin: d && !d.immune ? d.min : 0,
                lostMax: d && !d.immune ? d.max : 0,
            },
            ...(d && !d.immune
                ? {
                      damage: ghostFormat(d.min, d.max),
                      ...(d.critChance > 0
                          ? {
                                crit: `${aimText('crítico')} ${ghostFormat(d.critMin, d.critMax)} · ${Math.round(d.critChance * 100)} %`,
                            }
                          : {}),
                  }
                : {}),
            lines: [
                ...(d?.immune ? [aimText('Inmune')] : []),
                ...(t.to ? [aimText('Se mueve')] : []),
                ...statuses,
                ...(lethal ? [aimText('Puede caer')] : []),
            ],
            tone: d?.immune ? 'immune' : !pv.inRange ? 'out' : lethal ? 'lethal' : 'normal',
        });
    }
    if (pv.casterTo)
        cards.push({
            key: 'self',
            ...toScreen(pv.casterTo.x, pv.casterTo.y, 0),
            title: aimText('Aquí caerías'),
            tone: pv.inRange ? 'self' : 'out',
            ...(pv.inRange ? {} : { lines: [aimText('Fuera de alcance')] }),
        });
    else if (!pv.inRange)
        cards.push({
            key: 'out',
            ...toScreen(aim.point.x, aim.point.y, 0.8),
            title: aimText('Fuera de alcance'),
            tone: 'out',
        });
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

    const simulationPaused = (menus?.simulationPaused ?? false) || (editor?.active ?? false) || loadingPause;
    const keyboardCaptured = (menus?.keyboardCaptured ?? false) || (editor?.active ?? false) || loadingPause;
    // F21: en vuelo, WASD mueve respecto a la cámara y Espacio sube (sin Espacio baja despacio).
    if (world.player.flight) {
        const k = (c: string): number => (!keyboardCaptured && input.isHeld([c]) ? 1 : 0);
        const yaw = (view.rig.viewYawDeg * Math.PI) / 180;
        const ahead = k('KeyW') - k('KeyS');
        const side = k('KeyD') - k('KeyA');
        world.setFlightInput(
            { x: Math.sin(yaw) * ahead + Math.cos(yaw) * side, y: Math.cos(yaw) * ahead - Math.sin(yaw) * side },
            k('Space') === 1,
        );
    }
    const pointerCaptured = (menus?.pointerCaptured ?? false) || (editor?.active ?? false) || loadingPause;

    // Cámara orbital: rueda pulsada y arrastrar (también en pausa).
    const drag = input.consumeOrbitDrag();
    if (drag.dx !== 0 || drag.dy !== 0) view.rig.orbit(drag.dx, drag.dy);
    // Girar con teclas (por defecto , y .), a la velocidad de las opciones.
    if (!keyboardCaptured) {
        const turn = (input.isHeld(holdKeys('cameraRight')) ? 1 : 0) - (input.isHeld(holdKeys('cameraLeft')) ? 1 : 0);
        if (turn !== 0) view.rig.turn(turn * cameraKeySpeed * frameSeconds);
    }
    // Depuración del ciclo día/noche en teclas F (1–6, Q, E y R son del juego).
    if (!keyboardCaptured && input.consumeKey('F2')) world.timeScale = world.timeScale === 1 ? 40 : 1;
    if (!keyboardCaptured && input.consumeKey('F3')) world.timeOfDay = (world.timeOfDay + 3 / 24) % 1;
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
    // T15: herramientas de desarrollo para forzar muerte y agotar el Pulso.
    if (!keyboardCaptured && devTools && input.consumeKey('F4') && session) {
        const died = forceDeath(world.character);
        if (died) {
            menus?.toast('⚠ Dev: muerte forzada', 'warn');
        }
    }
    if (!keyboardCaptured && devTools && input.consumeKey('F5') && session) {
        const exhausted = exhaustPulse(session.energy);
        if (exhausted) {
            session.applyEnergyPenalty();
            menus?.toast('⚠ Dev: Pulso agotado', 'warn');
        }
    }
    if (!keyboardCaptured && devTools && input.consumeKey('F6') && session) {
        const changed = forceDeathAndExhaust(world.character, session.energy);
        if (changed) {
            session.applyEnergyPenalty();
            menus?.toast('⚠ Dev: muerte + Pulso agotado', 'warn');
        }
    }

    // Mantener pulsado: el destino sigue al cursor cada `holdRepathSeconds`; si
    // la pulsación empezó sobre un enemigo, se repite el ataque básico.
    // Mantener el botón de andar sigue el cursor, sea izquierdo o derecho.
    const moveHeld = moveHold?.active(input.leftDown, input.rightDown) ?? false;
    if (!moveHeld) clickConsumed = false;
    // Con un menú delante no se sigue apuntando.
    if ((keyboardCaptured || pointerCaptured) && castInput.aiming !== null) castInput.cancel();
    if (moveHeld && !pointerCaptured && !clickConsumed) {
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
    // FA-03: sincronizar el piso de la cripta para que EnemyView elija la variante correcta.
    view.enemies.dungeonFloor = crypt?.inside ? crypt.floor : null;
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
        meter.record(events, meterSeconds, {
            isPlayer: (id) => id === pid,
            isAlly: (id) => id === pid || world.pets.some((p) => p.id === id),
        });
        meterView.update(frameSeconds);
    }
    if (session && !simulationPaused) playSeconds += frameSeconds;
    for (const e of events) {
        if (e.type !== 'outcome') continue;
        const run = telemetry.runs[telemetry.runs.length - 1]!;
        // Con la interfaz: pantalla de muerte y reaparecer en la Piedra Pintada; sin ella (medición), el resumen de siempre.
        if (menus && e.outcome === 'defeat') {
            // UI-16: pasar contexto a la pantalla de muerte.
            const deathCtx: { zone?: string; floor?: number; level?: number } = {};
            const currentZone = world.weatherZone();
            if (currentZone) {
                const zoneDef = world.zoneMap.get(currentZone);
                if (zoneDef) deathCtx.zone = zoneDef.name;
            }
            if (crypt?.inside && crypt.floor !== null) {
                deathCtx.floor = crypt.floor;
            }
            if (session) {
                deathCtx.level = session.player().level;
            }
            menus.showDeath(stones.respawn.name, respawn, session?.onDeath?.(), deathCtx);
        }
        else benchHud?.showOutcome(run, (id) => world.labelOf(id));
        notice(`[telemetría] partida ${run.run}: ${e.outcome} — ${JSON.stringify(run)}`, 'aviso');
    }
    view.handleEvents(world, events);
    waterView.handleEvents(events);
    combatLog.handle(world, events);
    benchHud?.update(world, events, frameSeconds);
    menus?.frame(frameSeconds);
    if (!bank?.inside || !world.player.alive || world.character.spectral.active) {
        session?.setBankAccess(false);
        menus?.closeBank();
    }
    if (!simulationPaused && session?.restEnergy && !world.interior) {
        const resting = stones.def.stones.some((z) => {
            const p = stoneAt(z);
            return (
                (p.x - world.player.pos.x) ** 2 + (p.y - world.player.pos.y) ** 2 <= data.rpg.energy.rest.radius ** 2
            );
        });
        if (resting) session.restEnergy(frameSeconds);
    }
    view.sync(world, alpha, frameSeconds, !simulationPaused);
    resurrectorView.sync(world);
    // MUE-02: detectar la transición a espectral dentro de la cripta para recordar el piso.
    {
        const nowSpectral = world.character.spectral.active;
        if (nowSpectral && !world.player.alive && crypt?.inside && crypt.floor !== null) {
            world.character.spectral.rememberFloor(crypt.floor);
        }
    }
    spectralGuide.hidden = !world.character.spectral.active || !world.player.alive;
    if (!spectralGuide.hidden)
        spectralText.textContent =
            tr('Forma espectral · Busca ') +
            (nearestAltar()?.name ?? 'un Alzador') +
            '. No puedes combatir, hablar ni usar casi nada.';
    layoutTopStack();
    lootView.sync(world, alpha, frameSeconds);
    gridView.sync(world.grid, world.player.pos.x, world.player.pos.y);
    syncWeather();
    stoneView.sync(frameSeconds, (id) => stones.knows(id));
    stoneView.setVisible(!world.interior);
    if (menus && session && !simulationPaused) {
        const fresh =
            world.player.alive && !world.interior && !world.character.spectral.active
                ? stones.touch(world.player.pos, stoneAt)
                : null;
        if (fresh) {
            menus.toast(
                `Piedra Pintada activada: ${fresh.name}. Ábrela para guardarla como punto de regreso.`,
                'level',
            );
            audio?.cue('stone_activate');
            saveStones();
        }
        if (boatTarget) {
            if (canBoard(boatTarget, world.player.pos)) {
                if (boatAllowed(boatTarget)) {
                    teleport(boatTarget.to);
                    audio?.cue('boat_depart');
                    menus?.toast(boatTarget.arrive, 'info');
                } else menus?.toast(boatTarget.waitText || 'La lancha no sale todavía', 'warn');
                boatTarget = null;
            } else if (world.player.path.length === 0) boatTarget = null;
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
    // MUN-04: las ventanas de las casas brillan de noche (mismo lampsOn que las farolas).
    landmarks.update(world.player.pos.x, world.player.pos.y, view.seaY, view.atmosphere.state.lampsOn);
    waterView.sync(world, view.player.model.root.position, frameSeconds);
    gatherView.sync(world);
    zoneBorder.sync(view.rig.zoneCell);
    if (menus) {
        const head = view.player.model.root.position;
        const engine = view.scene.getEngine();
        const w = engine.getRenderWidth(),
            h = engine.getRenderHeight();
        const screen = Vector3.Project(
            new Vector3(head.x, head.y + view.player.model.height + 0.2, head.z),
            Matrix.Identity(),
            view.scene.getTransformMatrix(),
            view.rig.camera.viewport.toGlobal(w, h),
        );
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
    const gatherKind = gathering
        ? data.rpg.professions.nodes[world.gatherField?.byId(gathering.nodeId)?.kind ?? '']
        : undefined;
    if (gathering && gatherKind) {
        const verb = data.rpg.professions.professions[gatherKind.profession]?.verb ?? '';
        gatherProgress.show(
            `${verb} ${gatherKind.name.toLowerCase()}… ${Math.floor((gathering.elapsed / gathering.duration) * 100)} %`,
            '#ffe9b0',
            canvas.clientWidth / 2,
            canvas.clientHeight * 0.62,
        );
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
function worldInfo(): {
    coords: [number, number];
    zone: string | null;
    band: string | null;
    danger: number;
    sky?: string | null;
} {
    const p = world.player.pos;
    const place = bank?.place ?? houses?.place ?? crypt?.place;
    if (place) {
        return {
            coords: mapCoords(p.x, p.y, overworld.def.width, overworld.def.depth, stonesDef.coordCellMeters),
            zone: place.name,
            band: place.levelMax <= 1 ? 'zona segura' : `niv. ${place.levelMin}–${place.levelMax}`,
            danger: place.levelMax <= 1 ? 0 : place.levelMin - world.character.level,
        };
    }
    const z = world.currentZone;
    return {
        coords: mapCoords(p.x, p.y, overworld.def.width, overworld.def.depth, stonesDef.coordCellMeters),
        zone: placeLabel(p, z?.name ?? null),
        band: z ? (z.safe ? 'zona segura' : `niv. ${z.levelMin}–${z.levelMax}`) : null,
        danger: z && !z.safe ? z.levelMin - world.character.level : 0,
        sky: skyText(),
    };
}

/**
 * Rótulo completo del sitio: provincia · zona · lugar (la Piedra Pintada más cercana a
 * menos de 250 m). Se recalcula cada 8 m. No hay distritos en los datos todavía.
 */
let placeKey = '';
let placeText: string | null = null;
function placeLabel(p: { x: number; y: number }, zone: string | null): string | null {
    const key = `${Math.round(p.x / 8)},${Math.round(p.y / 8)},${zone}`;
    if (key === placeKey) return placeText;
    placeKey = key;
    const r = regionAt(overworld.atlas, p.x, p.y);
    const province = r ? (r.name ?? r.official) : null;
    let near: string | null = null;
    let best = 250;
    for (const s of stonesDef.stones) {
        const q = stoneAt(s);
        const d = Math.hypot(q.x - p.x, q.y - p.y);
        if (d < best) {
            best = d;
            near = s.name.replace(/^Piedra Pintada (de la |del |de )/, '');
        }
    }
    const parts = [province, zone, near].filter((x, i, a): x is string => !!x && a.indexOf(x) === i);
    placeText = parts.length ? parts.join(' · ') : null;
    return placeText;
}

/** Mapea los modelos de landmark de vegetation.json a MarkerKind del mapa. */
const LANDMARK_MODEL_TO_KIND: Record<string, string> = {
    castillo: 'castle',
    iglesia: 'house',
    banco: 'bank',
    taller: 'workshop',
    mazmorra: 'dungeon',
    muelle: 'dock',
    lancha: 'boat',
};

/** Minimapa y mapa grande: jugador, cámara, marcadores, piedras de viaje y objetivo de la misión. */
function mapFrame(s: GameSession): MapFrame {
    // F09: landmarks del mundo (castillo, iglesia, etc.) como marcadores del mapa.
    const landmarks = overworld.vegetation.props
        .filter((p) => p.kind === 'landmark' && p.model)
        .map((p) => {
            const kind = LANDMARK_MODEL_TO_KIND[p.model!];
            return kind ? { x: p.x, y: p.y, kind, name: p.model } : null;
        })
        .filter((l): l is NonNullable<typeof l> => l !== null);
    // DUN-06: puntos de interés del piso de la cripta.
    const fd = crypt?.floorMapData;
    const dungeonFeatures = fd
        ? [
              ...(fd.downStairs ? [{ kind: 'down' as const, x: fd.downStairs.x, y: fd.downStairs.y }] : []),
              ...(fd.upStairs ? [{ kind: 'up' as const, x: fd.upStairs.x, y: fd.upStairs.y }] : []),
              { kind: 'return' as const, x: fd.arrivalFromAbove.x, y: fd.arrivalFromAbove.y },
              ...fd.chests.map((c) => ({
                  kind: 'chest' as const,
                  id: c.id,
                  x: c.pos.x,
                  y: c.pos.y,
                  opened: fd.opened.has(c.id),
              })),
          ]
        : null;
    return buildMapFrame({
        world,
        session: s,
        cameraYawDeg: view.rig.viewYawDeg,
        cameraMode,
        inside: bank?.place?.name ?? houses?.place?.name ?? crypt?.place?.name ?? null,
        zones: data.zones,
        waters: overworld.def.ponds,
        names: { ...data.rpg.merchants, ...data.rpg.npcs },
        stones: stonesDef.stones.map((z) => ({ id: z.id, name: z.name, ...stoneAt(z), known: stones.knows(z.id) })),
        landmarks,
        dungeonFloor: crypt?.floor ?? null,
        dungeonFeatures,
    });
}

/** Enemigos que te persiguen o atacan (con agro), para la barra de combate. */
function combatants(): Array<{
    archetype: string;
    name: string;
    level: number;
    health: number;
    maxHealth: number;
    diff: number;
    casting: string | null;
}> {
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
    if (!crypt?.inside) return null;
    const boss = world.enemies.list.find((e) => e.def.id === 'crypt_warden' && e.state !== 'dead');
    if (!boss) return null;
    const fraction = boss.def.maxHealth > 0 ? boss.health / boss.def.maxHealth : 0;
    const phase = fraction <= 0.33 ? 'Hilo roto' : fraction <= 0.66 ? 'Nudos vivos' : 'Telar quieto';
    return {
        name: 'Matriarca del Hilo Roto',
        phase,
        health: boss.health,
        maxHealth: boss.def.maxHealth,
        enraged: false,
    };
}
