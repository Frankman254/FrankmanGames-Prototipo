// Geometría de los pisos de mazmorra y de la boca de la cripta en el mundo
// abierto. Sólo primitivas: suelo de baldosas y muros como thin instances (un
// draw call por tipo), antorchas, escaleras y cofres (modelo de Blender con su
// animación). Los muros y su remate llevan el recorte de oclusión para que no
// tapen a los personajes.
import '@babylonjs/loaders/glTF';
import { Color3, LoadAssetContainerAsync, Matrix, Mesh, MeshBuilder, Quaternion, StandardMaterial, TransformNode, Vector3, type AbstractMesh, type Texture, type AnimationGroup, type AssetContainer, type Scene } from '@babylonjs/core';
import { quietInstantiate } from './assetCache';
import { goldOutline } from './interactOutline';
import { staticMesh, staticTexture } from './staticModels';
import type { DungeonDef, Rgb } from '../data/dungeonSchema';
import { Rng } from '../sim/rng';
import type { DungeonFloor } from '../world/dungeon';
import type { HeightField } from '../world/terrain';
import { OcclusionPlugin } from './occlusion';
import { TorchRig } from './torchFlame';
import type { LampPost } from './vegetationView';

/** Lo que se puede usar con clic: escaleras, cofres, puertas, jarras, estanques y la boca de la cripta. */
export type DungeonFeature =
  | { kind: 'up' }
  | { kind: 'down' }
  | { kind: 'chest'; id: string }
  | { kind: 'door'; id: string }
  | { kind: 'breakable'; id: string }
  | { kind: 'pool'; x: number; y: number }
  | { kind: 'entrance' };

/** Caja sólida para la cámara (`CameraRig.blockers`). */
export interface CameraBlocker {
  x: number;
  z: number;
  hw: number;
  hd: number;
  top: number;
}

interface FeatureMeta {
  dungeonFeature?: DungeonFeature;
  /** Thin instances: la feature de cada instancia. */
  dungeonFeatures?: DungeonFeature[];
  /** Agua: la feature lleva el punto del clic. */
  dungeonPool?: true;
}

function featureOf(m: AbstractMesh | null | undefined, instance = -1, point?: Vector3 | null): DungeonFeature | null {
  const md = m?.metadata as FeatureMeta | undefined;
  if (!md) return null;
  if (md.dungeonPool) return point ? { kind: 'pool', x: point.x, y: point.z } : null;
  if (md.dungeonFeatures) return md.dungeonFeatures[instance] ?? null;
  return md.dungeonFeature ?? null;
}

/** Matriz con giro alrededor de Y (`yaw`, como `rotation.y`). */
function yawMatrix(x: number, y: number, z: number, yaw: number, sx = 1, sy = 1, sz = 1): Matrix {
  return Matrix.Compose(new Vector3(sx, sy, sz), Quaternion.RotationAxis(Vector3.Up(), yaw), new Vector3(x, y, z));
}

/** Giro que lleva el eje X local a la dirección (dx, dz) del plano. */
const yawOf = (dx: number, dz: number): number => Math.atan2(-dz, dx);

/** Hash estable de un id (FNV-1a): elegir variante sin depender del orden. */
function hashId(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function packMatrices(list: readonly Matrix[]): Float32Array {
  const buf = new Float32Array(list.length * 16);
  list.forEach((m, i) => m.copyToArray(buf, i * 16));
  return buf;
}

/** Hoja de puerta: bisagra, giro cerrada y abierta (hacia la sala) y ancho. */
interface Leaf {
  x: number;
  z: number;
  closed: number;
  open: number;
  width: number;
}

interface DoorEls {
  leaves: [number, number];
  t: number;
  target: number;
}

/** Lo que tarda una puerta en abrirse del todo (s). */
const DOOR_OPEN_SECONDS = 0.6;

function mat(scene: Scene, name: string, rgb: Rgb, occluding = false): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = new Color3(...rgb);
  m.specularColor = new Color3(0.03, 0.03, 0.03);
  if (occluding) new OcclusionPlugin(m);
  return m;
}

/** Medidas de las piezas en `scripts/blender/mazmorra.py`. */
const MODEL_TILE = 1.5;
const MODEL_WALL_HEIGHT = 3.2;

function textured(m: StandardMaterial, tex: Texture): StandardMaterial {
  m.diffuseTexture = tex;
  return m;
}

function glow(scene: Scene, name: string, rgb: Rgb): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = Color3.Black();
  m.specularColor = Color3.Black();
  m.emissiveColor = new Color3(...rgb);
  m.disableLighting = true;
  return m;
}

/** Matrices de thin instances: traslación + escala, sin giro. */
function matrices(items: ReadonlyArray<{ x: number; y: number; z: number; sx?: number; sy?: number; sz?: number }>): Float32Array {
  const buf = new Float32Array(items.length * 16);
  const m = new Matrix();
  const q = Quaternion.Identity();
  items.forEach((it, i) => {
    Matrix.ComposeToRef(new Vector3(it.sx ?? 1, it.sy ?? 1, it.sz ?? 1), q, new Vector3(it.x, it.y, it.z), m);
    m.copyToArray(buf, i * 16);
  });
  return buf;
}

function tagPickable(meshes: readonly AbstractMesh[], f: DungeonFeature): void {
  for (const m of meshes) {
    m.isPickable = true;
    m.metadata = { dungeonFeature: f };
  }
}

const CHEST_URLS: Record<string, string> = import.meta.glob('/assets/models/cofre.glb', { query: '?url', import: 'default', eager: true });
/** Tamaño del modelo en el juego; `scripts/blender/cofre.py` lo escribe en metros. */
const CHEST_SCALE = 0.85;
/** Fino: el modelo tiene muchas aristas y un contorno grueso lo tapa. */
const CHEST_OUTLINE = 0.012;
const chestModels = new WeakMap<Scene, Promise<AssetContainer>>();

/** El modelo se analiza una sola vez por escena; cada cofre es una copia. */
export function chestModel(scene: Scene): Promise<AssetContainer> {
  let p = chestModels.get(scene);
  if (!p) {
    p = LoadAssetContainerAsync(CHEST_URLS['/assets/models/cofre.glb']!, scene, { pluginExtension: '.glb' });
    chestModels.set(scene, p);
  }
  return p;
}

interface ChestEls {
  opened: boolean;
  open: AnimationGroup | null;
  meshes: AbstractMesh[];
}

/** Un piso dibujado. `dispose()` lo quita entero (mallas y materiales). */
export class DungeonFloorView {
  readonly root: TransformNode;
  /** Antorchas para la luz (`Atmosphere.setInterior`). */
  readonly lamps: LampPost[];
  /** Muros para la cámara. */
  readonly blockers: CameraBlocker[];
  private readonly chests = new Map<string, ChestEls>();
  private readonly doorEls = new Map<string, DoorEls>();
  private readonly leaves: Leaf[] = [];
  private leafMesh: Mesh | null = null;
  private readonly breakIndex = new Map<string, { mesh: Mesh[]; index: number; pos: { x: number; y: number }; kind: 'jar' | 'barrel' }>();
  private shardClay: Mesh | null = null;
  private shardWood: Mesh | null = null;
  private readonly clayMats: Matrix[] = [];
  private readonly woodMats: Matrix[] = [];
  private readonly chestClips: AnimationGroup[] = [];
  private disposed = false;
  private readonly torchRig: TorchRig;
  private time = 0;

  constructor(
    private readonly scene: Scene,
    def: DungeonDef,
    floor: DungeonFloor,
    opened: ReadonlySet<string>,
    openDoors: ReadonlySet<string> = new Set(),
    broken: ReadonlySet<string> = new Set(),
  ) {
    const ts = floor.tileSize;
    const wh = def.wallHeight;
    const th = floor.theme;
    this.root = new TransformNode(`dungeon-${floor.index}`, scene);
    const own = (m: Mesh): Mesh => {
      m.parent = this.root;
      return m;
    };

    // Suelo: una baldosa por celda con un poco de variación de tono por instancia.
    const rng = new Rng(floor.index * 31 + 5);
    const floorTiles: Array<{ x: number; y: number; z: number }> = [];
    // Bajo el agua de los estanques no hay losas: se ve el fondo oscuro.
    const wet = (x: number, z: number): boolean => floor.pools.some((p) => Math.hypot(x - p.x, z - p.y) < p.radius - ts * 0.35);
    for (let r = 0; r < floor.rows; r++) for (let c = 0; c < floor.cols; c++) if (floor.cells[r * floor.cols + c] && !wet((c + 0.5) * ts, (r + 0.5) * ts)) floorTiles.push({ x: (c + 0.5) * ts, y: 0, z: (r + 0.5) * ts });
    const tile = own(staticMesh(scene, 'd_baldosa', 'dFloor'));
    tile.material = textured(mat(scene, 'dFloorMat', [1, 1, 1]), staticTexture(scene, 'baldosa'));
    const pieceScale = ts / MODEL_TILE;
    tile.thinInstanceSetBuffer('matrix', matrices(floorTiles.map((t) => ({ ...t, sx: pieceScale, sz: pieceScale }))), 16, true);
    const colors = new Float32Array(floorTiles.length * 4);
    floorTiles.forEach((_, i) => {
      const k = 1 + rng.range(-th.floorVariation, th.floorVariation);
      colors.set([th.floor[0] * k, th.floor[1] * k, th.floor[2] * k, 1], i * 4);
    });
    tile.thinInstanceSetBuffer('color', colors, 4, true);
    tile.receiveShadows = true;
    tile.isPickable = false;
    // Junta oscura bajo las baldosas.
    const under = own(MeshBuilder.CreateGround('dUnder', { width: floor.width, height: floor.depth }, scene));
    under.position.set(floor.width / 2, -0.02, floor.depth / 2);
    under.material = mat(scene, 'dUnderMat', [th.floor[0] * 0.35, th.floor[1] * 0.35, th.floor[2] * 0.35]);
    under.isPickable = false;

    // Muros: un bloque por baldosa de roca que toca suelo, con remate oscuro encima.
    const wall = own(staticMesh(scene, 'd_muro', 'dWall'));
    wall.material = textured(mat(scene, 'dWallMat', th.wall, true), staticTexture(scene, 'muro'));
    wall.thinInstanceSetBuffer('matrix', matrices(floor.wallTiles.map((t) => ({ x: (t.c + 0.5) * ts, y: 0, z: (t.r + 0.5) * ts, sx: pieceScale, sy: wh / MODEL_WALL_HEIGHT, sz: pieceScale }))), 16, true);
    wall.isPickable = false;
    wall.receiveShadows = true;
    const cap = own(staticMesh(scene, 'd_remate', 'dWallTop'));
    cap.material = mat(scene, 'dWallTopMat', th.wallTop, true);
    cap.thinInstanceSetBuffer('matrix', matrices(floor.wallTiles.map((t) => ({ x: (t.c + 0.5) * ts, y: wh + 0.01, z: (t.r + 0.5) * ts, sx: pieceScale, sz: pieceScale }))), 16, true);
    cap.isPickable = false;
    this.blockers = floor.wallRects.map((r) => ({ x: r.x, z: r.y, hw: r.w / 2, hd: r.d / 2, top: wh }));

    // Antorchas: soporte quieto y fuego animado por instancias (TorchRig:
    // nucleo, halo, humo y chispa; 4 draw calls por piso). La luz real la
    // ponen las mas cercanas en la atmosfera, con su propio parpadeo.
    const torchY = wh * 0.62;
    const bracket = own(staticMesh(scene, 'd_antorcha', 'dTorch'));
    bracket.material = mat(scene, 'dTorchMat', [0.22, 0.16, 0.1]);
    bracket.thinInstanceSetBuffer('matrix', matrices(floor.torches.map((t) => ({ x: t.x + t.nx * 0.12, y: torchY, z: t.y + t.ny * 0.12 }))), 16, true);
    bracket.isPickable = false;
    this.torchRig = new TorchRig(scene, floor.torches, torchY + 0.36, def.light.torch.color);
    this.torchRig.attachTo(this.root);
    this.lamps = floor.torches.map((t) => ({ x: t.x + t.nx * 0.5, y: torchY + 0.4, z: t.y + t.ny * 0.5 }));

    // Escaleras: subida = peldaños que suben hacia un arco; bajada = boca negra con marco.
    const stone = textured(mat(scene, 'dStairMat', th.wall.map((v) => Math.min(1, v * 1.25)) as Rgb), staticTexture(scene, 'muro'));
    const runeUp = glow(scene, 'dRuneUp', [0.95, 0.75, 0.35]);
    const runeDown = glow(scene, 'dRuneDown', [0.35, 0.6, 1.0]);
    {
      const p = floor.upStairs;
      const stairs = own(staticMesh(scene, 'd_subida', 'dUpStairs'));
      stairs.position.set(p.x, 0, p.y);
      stairs.material = stone;
      goldOutline(stairs);
      const parts: Mesh[] = [stairs];
      const ring = own(staticMesh(scene, 'd_anillo', 'dUpRing'));
      ring.position.set(p.x, 0.04, p.y);
      ring.material = runeUp;
      ring.isPickable = false;
      tagPickable(parts, { kind: 'up' });
    }
    if (floor.downStairs) {
      const p = floor.downStairs;
      const hole = own(staticMesh(scene, 'd_boca', 'dDownHole'));
      hole.position.set(p.x, 0.02, p.y);
      hole.material = glow(scene, 'dHoleMat', [0.005, 0.005, 0.01]);
      const frame = own(staticMesh(scene, 'd_bajada', 'dDownFrame'));
      frame.position.set(p.x, 0, p.y);
      frame.material = stone;
      goldOutline(frame);
      const parts: Mesh[] = [hole, frame];
      const ring = own(staticMesh(scene, 'd_anillo', 'dDownRing'));
      ring.scaling.setAll(3.6 / 3.2);
      ring.position.set(p.x, 0.04, p.y);
      ring.material = runeDown;
      ring.isPickable = false;
      tagPickable(parts, { kind: 'down' });
    }

    // Cofres: una caja invisible recibe el clic desde el primer momento, y el modelo llega después.
    for (const c of floor.chests) {
      const override = floor.map.overrides?.[`chest:${c.id}`];
      const manual = floor.map.manualObjects?.find((o) => o.id === c.id && o.kind === 'chest');
      if (override?.visible === false || manual?.visible === false) continue;
      const root = new TransformNode(`dChest-${c.id}`, scene);
      root.parent = this.root;
      root.position.set(c.pos.x, 0, c.pos.y);
      root.scaling.setAll(CHEST_SCALE * (override?.scale ?? manual?.scale ?? 1));
      // Mira hacia el centro del piso, más o menos hacia la sala.
      const rotation = override?.rotation ?? manual?.rotation;
      root.rotation.y = rotation === undefined ? Math.atan2(floor.width / 2 - c.pos.x, floor.depth / 2 - c.pos.y) : rotation * Math.PI / 180;
      const hit = MeshBuilder.CreateBox('dChestHit', { width: 1.24, height: 0.8, depth: 0.89 }, scene);
      hit.parent = root;
      hit.position.y = 0.4;
      // Caja de clic: no se dibuja (con `visibility = 0` se pintaba con alfa nulo) pero
      // sigue elegible; los predicados de `pick` no exigen visibilidad.
      hit.isVisible = false;
      tagPickable([hit], { kind: 'chest', id: c.id });
      const chest: ChestEls = { opened: opened.has(c.id), open: null, meshes: [] };
      this.chests.set(c.id, chest);
      void this.addChestModel(chest, root);
    }

    this.buildPools(floor);
    this.buildDoors(floor, openDoors);
    this.buildBreakables(floor, broken);
  }

  /** Estanques: agua oscura a ras de suelo con un corro de piedras de orilla. */
  private buildPools(floor: DungeonFloor): void {
    if (floor.pools.length === 0) return;
    const water = new StandardMaterial('dPoolWater', this.scene);
    water.diffuseColor = new Color3(0.04, 0.14, 0.17);
    water.emissiveColor = new Color3(0.01, 0.05, 0.07);
    water.specularColor = new Color3(0.55, 0.6, 0.65);
    water.specularPower = 96;
    water.alpha = 0.9;
    const rimMats: Matrix[] = [];
    for (const p of floor.pools) {
      const disc = MeshBuilder.CreateDisc(`dPool-${p.id}`, { radius: p.radius, tessellation: 48 }, this.scene);
      disc.parent = this.root;
      disc.rotation.x = Math.PI / 2;
      disc.position.set(p.x, 0.012, p.y);
      disc.material = water;
      disc.isPickable = true;
      disc.metadata = { dungeonPool: true } satisfies FeatureMeta;
      const n = Math.max(10, Math.ceil((2 * Math.PI * p.radius) / 0.72));
      for (let k = 0; k < n; k++) {
        const a = (2 * Math.PI * k) / n;
        const rr = p.radius + 0.12;
        const s = 0.85 + ((k * 37) % 7) * 0.05;
        rimMats.push(yawMatrix(p.x + Math.cos(a) * rr, 0, p.y + Math.sin(a) * rr, yawOf(-Math.sin(a), Math.cos(a)), s, 0.8 + ((k * 13) % 5) * 0.1, 1));
      }
    }
    const th = floor.theme;
    const rim = staticMesh(this.scene, 'd_estanque_piedra', 'dPoolRim');
    rim.parent = this.root;
    rim.material = textured(mat(this.scene, 'dPoolRimMat', th.wall.map((v) => Math.min(1, v * 1.1)) as Rgb), staticTexture(this.scene, 'muro'));
    rim.thinInstanceSetBuffer('matrix', packMatrices(rimMats), 16, true);
    rim.isPickable = false;
    rim.receiveShadows = true;
  }

  /** Puertas: postes y dintel de piedra (fijos) y dos hojas de tablones que se abren hacia la sala. */
  private buildDoors(floor: DungeonFloor, openDoors: ReadonlySet<string>): void {
    if (floor.doors.length === 0) return;
    const ts = floor.tileSize;
    const posts: Matrix[] = [];
    const lintels: Matrix[] = [];
    const features: DungeonFeature[] = [];
    // Los postes asoman un poco por los dos lados del muro.
    const depth = (ts + 0.2) / 0.5;
    for (const d of floor.doors) {
      if (floor.map.overrides?.[`door:${d.id}`]?.visible === false) continue;
      const rm = floor.rooms[d.room]!;
      const roomX = (rm.x0 + rm.w / 2) * ts;
      const roomZ = (rm.y0 + rm.h / 2) * ts;
      // Eje del hueco (u) y hacia la sala (n).
      const u = d.horizontal ? { x: 1, z: 0 } : { x: 0, z: 1 };
      const side = d.horizontal ? Math.sign(roomZ - d.y) || 1 : Math.sign(roomX - d.x) || 1;
      const n = d.horizontal ? { x: 0, z: side } : { x: side, z: 0 };
      const half = d.span / 2;
      const yaw = yawOf(u.x, u.z);
      for (const s of [-1, 1]) posts.push(yawMatrix(d.x + u.x * s * (half - 0.16), 0, d.y + u.z * s * (half - 0.16), yaw, 1, 1, depth));
      lintels.push(yawMatrix(d.x, 0, d.y, yaw, d.span, 1, (ts + 0.24) / 0.52));
      const width = half - 0.32;
      const first = this.leaves.length;
      for (const s of [-1, 1]) {
        // Bisagra junto al poste; cerrada apunta al centro del hueco y abierta, hacia dentro de la sala.
        this.leaves.push({ x: d.x + u.x * s * (half - 0.32), z: d.y + u.z * s * (half - 0.32), closed: yawOf(-u.x * s, -u.z * s), open: yawOf(n.x, n.z), width });
        features.push({ kind: 'door', id: d.id });
      }
      const t = openDoors.has(d.id) ? 1 : 0;
      this.doorEls.set(d.id, { leaves: [first, first + 1], t, target: t });
    }
    const th = floor.theme;
    const stone = textured(mat(this.scene, 'dDoorStone', th.wall.map((v) => Math.min(1, v * 1.2)) as Rgb, true), staticTexture(this.scene, 'muro'));
    for (const [piece, list] of [['d_puerta_poste', posts], ['d_puerta_dintel', lintels]] as const) {
      const m = staticMesh(this.scene, piece, `dDoor-${piece}`);
      m.parent = this.root;
      m.material = stone;
      m.thinInstanceSetBuffer('matrix', packMatrices(list), 16, true);
      m.isPickable = false;
    }
    const leaf = staticMesh(this.scene, 'd_puerta_hoja', 'dDoorLeaf');
    leaf.parent = this.root;
    leaf.material = mat(this.scene, 'dDoorWood', [0.42, 0.27, 0.15], true);
    const leafT = (i: number): number => [...this.doorEls.values()].find((d) => d.leaves.includes(i))?.t ?? 0;
    leaf.thinInstanceSetBuffer('matrix', packMatrices(this.leaves.map((l, i) => this.leafMatrix(l, leafT(i)))), 16, false);
    leaf.thinInstanceEnablePicking = true;
    leaf.isPickable = true;
    leaf.metadata = { dungeonFeatures: features } satisfies FeatureMeta;
    leaf.receiveShadows = true;
    goldOutline(leaf, 0.02);
    this.leafMesh = leaf;
  }

  private leafMatrix(l: Leaf, t: number): Matrix {
    // Giro por el camino corto entre cerrada y abierta.
    let delta = l.open - l.closed;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    const e = t * t * (3 - 2 * t);
    return yawMatrix(l.x, 0, l.z, l.closed + delta * e, l.width, 1, 1);
  }

  /** Jarras, barriles y cajas (thin instances con clic) y sus cascotes al romperse.
   * El numero de piezas (variantes) de cada familia sale del id del rompiente
   * (hash determinista de la cadena), no del indice: al romperse uno, los
   * demas conservan su variante. Barro y duela viajan en su textura, sin
   * tinte de tema: el color ya lo decide el modelista (2026-11-12). */
  private buildBreakables(floor: DungeonFloor, broken: ReadonlySet<string>): void {
    if (floor.breakables.length === 0) return;
    const make = (piece: string, name: string, rgb: Rgb, texture?: string): Mesh => {
      const mesh = staticMesh(this.scene, piece, name);
      mesh.parent = this.root;
      mesh.material = texture ? textured(mat(this.scene, `${name}Mat`, [1, 1, 1]), staticTexture(this.scene, texture)) : mat(this.scene, `${name}Mat`, rgb);
      mesh.receiveShadows = true;
      mesh.isPickable = false;
      return mesh;
    };
    const jarVariants = ['d_jarra', 'd_jarra_alta', 'd_jarra_ancha', 'd_jarra_agrietada'] as const;
    const barrelVariants = ['d_barril', 'd_barril_bajo', 'd_caja'] as const;
    // Una malla thin-instanced por variante: las familias no comparten matriz.
    const jarMeshes = jarVariants.map((p, k) => make(p, `dJar${k}`, [0.62, 0.36, 0.22], 'barro'));
    const barrelMeshes = barrelVariants.map((p, k) => make(p, `dBarrel${k}`, [0.46, 0.3, 0.17], 'duela'));
    const hoops = make('d_barril_aros', 'dHoops', [0.16, 0.16, 0.18]);
    const list = (n: number): { mats: Matrix[]; features: DungeonFeature[] }[] => Array.from({ length: n }, () => ({ mats: [], features: [] }));
    const jars = list(jarVariants.length);
    const barrels = list(barrelVariants.length);
    floor.breakables.forEach((b, i) => {
      const override = floor.map.overrides?.[`breakable:${b.id}`];
      const manual = floor.map.manualObjects?.find((o) => o.id === b.id && (o.kind === 'barrel' || o.kind === 'jar'));
      const yaw = (override?.rotation ?? manual?.rotation) === undefined ? (i * 2.399) % (2 * Math.PI) : (override?.rotation ?? manual?.rotation ?? 0) * Math.PI / 180;
      const s = (0.92 + ((i * 7) % 5) * 0.04) * (override?.scale ?? manual?.scale ?? 1);
      const visible = override?.visible !== false && manual?.visible !== false;
      const gone = broken.has(b.id);
      const variant = hashId(b.id) % (b.kind === 'jar' ? jarVariants.length : barrelVariants.length);
      const l = (b.kind === 'jar' ? jars : barrels)[variant]!;
      // Aros solo sobre el barril alto (variante 0): el bajo ya lleva los de
      // madera modelados y la caja no los admite.
      const meshes = b.kind === 'jar' ? [jarMeshes[variant]!] : [barrelMeshes[variant]!, ...(variant === 0 ? [hoops] : [])];
      if (!gone && visible) this.breakIndex.set(b.id, { mesh: meshes, index: l.mats.length, pos: b.pos, kind: b.kind });
      l.mats.push(gone || !visible ? Matrix.Scaling(0, 0, 0) : yawMatrix(b.pos.x, 0, b.pos.y, yaw, s, s, s));
      l.features.push({ kind: 'breakable', id: b.id });
      if (gone) this.shardPose(b.pos, yaw, b.kind);
    });
    for (const [meshes, groups] of [[jarMeshes, jars], [barrelMeshes, barrels]] as const) {
      meshes.forEach((mesh, k) => {
        const l = groups[k]!;
        if (l.mats.length === 0) {
          mesh.setEnabled(false);
          return;
        }
        mesh.thinInstanceSetBuffer('matrix', packMatrices(l.mats), 16, false);
        mesh.thinInstanceEnablePicking = true;
        mesh.isPickable = true;
        mesh.metadata = { dungeonFeatures: l.features } satisfies FeatureMeta;
        goldOutline(mesh, 0.012);
      });
    }
    if (barrels[0]!.mats.length === 0) hoops.setEnabled(false);
    else hoops.thinInstanceSetBuffer('matrix', packMatrices(barrels[0]!.mats), 16, false);
    // Los dos fragmentos existen siempre que hay rompibles: el tipo de cascote
    // que cae depende de lo que se rompa, y cambiar el buffer en vivo es barato.
    this.shardClay = make('d_cascotes', 'dShards', [0.4, 0.26, 0.17], 'barro');
    this.shardClay.thinInstanceSetBuffer('matrix', packMatrices(this.clayMats), 16, false);
    this.shardClay.setEnabled(this.clayMats.length > 0);
    this.shardWood = make('d_cascotes_madera', 'dShardsWood', [0.36, 0.22, 0.12], 'duela');
    this.shardWood.thinInstanceSetBuffer('matrix', packMatrices(this.woodMats), 16, false);
    this.shardWood.setEnabled(this.woodMats.length > 0);
  }

  setDoorOpen(id: string, open: boolean): void {
    const d = this.doorEls.get(id);
    if (d) d.target = open ? 1 : 0;
  }

  /** Cascote coherente con lo roto: barro para jarras, duela para toneles. */
  private shardPose(pos: { x: number; y: number }, yaw: number, kind: 'jar' | 'barrel'): void {
    const m = yawMatrix(pos.x, 0, pos.y, yaw);
    if (kind === 'jar') this.clayMats.push(m);
    else this.woodMats.push(m);
  }

  /** Jarra o barril roto: desaparece y quedan los cascotes de su material. */
  setBroken(id: string): void {
    const b = this.breakIndex.get(id);
    if (!b) return;
    this.breakIndex.delete(id);
    for (const m of b.mesh) m.thinInstanceSetMatrixAt(b.index, Matrix.Scaling(0, 0, 0), true);
    this.shardPose(b.pos, b.index * 1.3, b.kind);
    const shards = b.kind === 'jar' ? this.shardClay : this.shardWood;
    const mats = b.kind === 'jar' ? this.clayMats : this.woodMats;
    if (shards) {
      shards.thinInstanceSetBuffer('matrix', packMatrices(mats), 16, false);
      shards.setEnabled(true);
    }
  }

  private async addChestModel(chest: ChestEls, root: TransformNode): Promise<void> {
    try {
      const model = await chestModel(this.scene);
      if (this.disposed) return;
      // Materiales propios: `dispose()` borra los del piso y el modelo sirve para los siguientes.
      const inst = quietInstantiate(this.scene, model, root.name);
      for (const g of inst.animationGroups) g.stop();
      for (const n of inst.rootNodes) {
        n.parent = root;
        chest.meshes.push(...n.getChildMeshes(false));
      }
      this.chestClips.push(...inst.animationGroups);
      chest.open = inst.animationGroups.find((g) => g.name.endsWith('Abrir')) ?? null;
      for (const m of chest.meshes) {
        m.isPickable = false;
        goldOutline(m, CHEST_OUTLINE);
      }
      // Ya abierto al entrar: sin animación, en su pose final. Si no, cerrado: al
      // cargar, el modelo queda en el primer fotograma del último clip.
      if (chest.opened) this.showOpened(chest, false);
      else chest.open?.start(false, 1, chest.open.from, chest.open.from);
    } catch (err) {
      console.error('[modelos] no se pudo cargar assets/models/cofre.glb', err);
    }
  }

  private showOpened(chest: ChestEls, animated: boolean): void {
    for (const m of chest.meshes) m.renderOutline = false;
    const g = chest.open;
    if (g) g.start(false, 1, animated ? g.from : g.to, g.to);
  }

  /** Feature bajo el cursor (escalera o cofre). */
  pick(x: number, y: number): DungeonFeature | null {
    const hit = this.scene.pick(x, y, (m) => m.isPickable && m.isEnabled() && m.metadata !== null && m.metadata !== undefined && m.isDescendantOf(this.root));
    return hit?.hit ? featureOf(hit.pickedMesh, hit.thinInstanceIndex, hit.pickedPoint) : null;
  }

  setOpened(id: string): void {
    const c = this.chests.get(id);
    if (!c || c.opened) return;
    c.opened = true;
    this.showOpened(c, true);
  }

  update(dt: number): void {
    this.time += dt;
    if (this.leafMesh) {
      for (const d of this.doorEls.values()) {
        if (d.t === d.target) continue;
        d.t = d.target > d.t ? Math.min(d.target, d.t + dt / DOOR_OPEN_SECONDS) : Math.max(d.target, d.t - dt / DOOR_OPEN_SECONDS);
        for (const i of d.leaves) this.leafMesh.thinInstanceSetMatrixAt(i, this.leafMatrix(this.leaves[i]!, d.t), true);
      }
    }
    // Fuego: oscilacion asincronica por antorcha (fase por posicion), 4 capas
    // thin-instanced; ver src/render/torchFlame.ts.
    this.torchRig.update(dt);
  }

  dispose(): void {
    this.disposed = true;
    this.torchRig.dispose();
    for (const g of this.chestClips) g.dispose();
    this.root.dispose(false, true);
  }
}

/**
 * Boca de la cripta en el mundo abierto: dos pilares, dintel, losa de bajada
 * oscura y unas piedras alrededor. Toda la pieza responde al clic.
 */
export function buildCryptEntrance(scene: Scene, def: DungeonDef, ground: HeightField): TransformNode {
  const e = def.entrance;
  const root = new TransformNode('cryptEntrance', scene);
  root.position.set(e.x, ground.sample(e.x, e.y), e.y);
  // facingDeg en el plano XZ (0 = +X, 90 = +Z) → giro de Babylon alrededor de Y.
  root.rotation.y = -(e.facingDeg * Math.PI) / 180;
  const piece = (name: string, m: StandardMaterial): Mesh => {
    const p = staticMesh(scene, name, `crypt-${name}`);
    p.material = m;
    p.parent = root;
    return p;
  };
  const parts = [
    piece('d_entrada', textured(mat(scene, 'cryptStone', [0.46, 0.45, 0.48], true), staticTexture(scene, 'muro'))),
    piece('d_entrada_boca', glow(scene, 'cryptDark', [0.01, 0.01, 0.015])),
    piece('d_entrada_monticulo', mat(scene, 'cryptMoundMat', [0.3, 0.33, 0.24])),
    piece('d_entrada_runa', glow(scene, 'cryptRune', [0.35, 0.6, 1.0])),
  ];
  tagPickable(parts, { kind: 'entrance' });
  return root;
}

/** Feature de la boca de la cripta bajo el cursor. */
export function pickEntrance(scene: Scene, root: TransformNode, x: number, y: number): boolean {
  const hit = scene.pick(x, y, (m) => m.isPickable && m.isEnabled() && m.isDescendantOf(root));
  return hit?.hit ?? false;
}
