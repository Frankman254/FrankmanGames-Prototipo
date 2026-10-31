// Galería de humanoides para revisar el modelo a ojo (sólo desarrollo:
// `npm run dev:web` y abrir /personajes.html; no entra en el build).
// Parámetros: `?anim=run` (idle, run, attack, cast, evade, hit, death),
// `&t=0.3` congela el clip en ese instante normalizado, `&yaw=40` gira la
// cámara (grados), `&beta=0.6` la sube, `&zoom=1.5` acerca, `&ty=1.5` sube el
// punto de mira y `&pick=1,2` / `&only=4` eligen personajes. Sin `t`, los
// clips se reproducen. `&lineup=equipo` enseña cada arma y escudo en la mano.
// Capturas: scripts/capturasPersonaje.cjs.
import { ArcRotateCamera, Color3, Color4, DirectionalLight, Engine, HemisphericLight, MeshBuilder, Scene, StandardMaterial, Vector3 } from '@babylonjs/core';
import { loadGameData } from '../data';
import { loadWorldData } from '../data/worldData';
import { AssetCache } from '../render/assetCache';
import { createCharacter, type CharacterModel } from '../render/characters/characterModel';
import { lookFor, withGear } from '../world/look';
import { ANIM_STATES, type AnimState } from '../world/rigs';

const q = new URLSearchParams(location.search);
const anim = (ANIM_STATES as readonly string[]).includes(q.get('anim') ?? '') ? (q.get('anim') as AnimState) : 'idle';
const freeze = q.has('t') ? Number(q.get('t')) : null;

const canvas = document.getElementById('view') as HTMLCanvasElement;
const engine = new Engine(canvas, true, { preserveDrawingBuffer: true }, true);
const scene = new Scene(engine);
scene.clearColor = new Color4(0.16, 0.18, 0.22, 1);
const wd = loadWorldData();
const game = loadGameData();
const cache = new AssetCache(scene, wd.assets);

const cam = new ArcRotateCamera('cam', 0, 1.3, 9, new Vector3(0, 1, 0), scene);
cam.alpha = -Math.PI / 2 + (Number(q.get('yaw') ?? 25) * Math.PI) / 180;
cam.radius = 9 / Number(q.get('zoom') ?? 1);
cam.beta = Number(q.get('beta') ?? 1.3);
cam.attachControl(canvas, true);
new HemisphericLight('sky', new Vector3(0.2, 1, -0.3), scene).intensity = 0.75;
const sun = new DirectionalLight('sun', new Vector3(-0.4, -1, 0.6), scene);
sun.intensity = 0.8;
const ground = MeshBuilder.CreateGround('ground', { width: 30, height: 12 }, scene);
const gm = new StandardMaterial('groundMat', scene);
gm.diffuseColor = new Color3(0.3, 0.36, 0.26);
gm.specularColor = Color3.Black();
ground.material = gm;

// Jugador por clase (con y sin escudo), PNJ y el bruto de las tumbas.
const player = wd.assets['player']!;
const gear = player.kind === 'procedural' ? player.gear : {};
const looks = player.kind === 'procedural' ? player.looks : {};
const lineup: Array<{ id: string; palette: string; label: string; look?: ReturnType<typeof lookFor> }> = [
  { id: 'player', palette: 'ember_vanguard', label: 'Vanguardia' },
  { id: 'player', palette: 'ember_vanguard', label: 'Vanguardia + rodela', look: withGear(lookFor(looks, 'ember_vanguard'), gear, 'woodcutter_axe', 'oak_buckler') },
  { id: 'player', palette: 'storm_weaver', label: 'Tejedora' },
  { id: 'player', palette: 'storm_weaver', label: 'Tejedora + orbe', look: withGear(lookFor(looks, 'storm_weaver'), gear, 'storm_orb', null) },
  { id: 'player', palette: 'default', label: 'Jugador (default)' },
  ...['smith', 'apothecary', 'fisher', 'guard', 'elder'].map((p) => ({ id: 'npc', palette: p, label: p })),
  { id: 'enemy.grave_brute', palette: 'default', label: 'grave_brute' },
];
// `&lineup=equipo` (`equipo-objetos`): una fila con cada dibujo de mano, de
// las dos armas a las de dos manos (los objetos sin `gear` usan su tipo).
if (q.get('lineup') === 'equipo') {
  const kindOf = (id: string): string | undefined => game.rpg.items[id]?.kind;
  const v = (label: string, w: string | null, o: string | null) => ({
    id: 'player', palette: 'ember_vanguard', label, look: withGear(lookFor(looks, 'ember_vanguard'), gear, w, o, kindOf),
  });
  lineup.splice(0, lineup.length,
    v('2 espadas', 'rozador_machete', 'short_sword'),
    v('2 dagas', 'diablo_knife', 'peeling_knife'),
    v('maza + rodela', 'guayacan_club', 'gourd_buckler'),
    v('espada + escudo', 'volcano_sword', 'locks_shield'),
    v('mandoble', 'machetero_blade', null),
    v('martillo', 'titan_maul', null),
    v('lanza', 'quetzal_spear', null),
    v('arco', 'darien_bow', null),
    v('ballesta', 'lookout_crossbow', null),
    v('bastón + —', 'tulivieja_staff', null),
    v('hacha + varita', 'gale_axe', 'mangrove_root_wand'),
  );
}
// `&only=4`: sólo ese personaje de la fila (para primeros planos);
const only = q.has('only') ? Number(q.get('only')) : null;
if (only !== null) lineup.splice(0, lineup.length, lineup[only]!);
// `&pick=1,2,4`: sólo esos.
const pick = q.get('pick')?.split(',').map(Number);
if (pick) lineup.splice(0, lineup.length, ...pick.map((i) => lineup[i]!));
const models: CharacterModel[] = lineup.map((c, i) => {
  const m = createCharacter(scene, c.id, `g${i}`, wd.assets[c.id]!, wd.animation, cache, c.palette, c.look);
  m.root.position.set((i - (lineup.length - 1) / 2) * 1.25, 0, 0);
  m.root.rotation.y = Math.PI / 2; // de cara a la cámara (+X local hacia −Z)
  m.play(anim);
  if (freeze !== null) m.update(freeze * m.clipSeconds(anim), anim === 'run' ? wd.animation.models.humanoid.runSpeed : 0);
  return m;
});
cam.target.y = Number(q.get('ty') ?? 0.95);

const verts = models.map((m) => m.meshes.reduce((a, x) => a + x.getTotalVertices(), 0));
const tris = models.map((m) => m.meshes.reduce((a, x) => a + (x.getTotalIndices() / 3), 0));
document.getElementById('info')!.textContent =
  `anim ${anim}${freeze !== null ? ` t=${freeze}` : ''}\n` + lineup.map((c, i) => `${c.label}: ${verts[i]} vért · ${tris[i]} tri · ${models[i]!.meshes.length} mallas`).join('\n');
Object.assign(window, { __gallery: { verts, tris, ready: true } });

engine.runRenderLoop(() => {
  const dt = engine.getDeltaTime() / 1000;
  if (freeze === null) for (const m of models) {
    if (m.finished) m.play(anim, { restart: true });
    m.update(dt, anim === 'run' ? wd.animation.models.humanoid.runSpeed : 0);
  }
  scene.render();
});
window.addEventListener('resize', () => engine.resize());
