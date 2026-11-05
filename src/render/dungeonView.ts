// Geometría de los pisos de mazmorra y de la boca de la cripta en el mundo
// abierto. Sólo primitivas: suelo de baldosas y muros como thin instances (un
// draw call por tipo), antorchas, escaleras y cofres (modelo de Blender con su
// animación). Los muros y su remate llevan el recorte de oclusión para que no
// tapen a los personajes.
import '@babylonjs/loaders/glTF';
import { Color3, LoadAssetContainerAsync, Matrix, Mesh, MeshBuilder, Quaternion, StandardMaterial, TransformNode, Vector3, type AbstractMesh, type Texture, type AnimationGroup, type AssetContainer, type Scene } from '@babylonjs/core';
import { goldOutline } from './interactOutline';
import { staticMesh, staticTexture } from './staticModels';
import type { DungeonDef, Rgb } from '../data/dungeonSchema';
import { Rng } from '../sim/rng';
import type { DungeonFloor } from '../world/dungeon';
import type { HeightField } from '../world/terrain';
import { OcclusionPlugin } from './occlusion';
import type { LampPost } from './vegetationView';

/** Lo que se puede usar con clic: escaleras, cofres y la boca de la cripta. */
export type DungeonFeature = { kind: 'up' } | { kind: 'down' } | { kind: 'chest'; id: string } | { kind: 'entrance' };

/** Caja sólida para la cámara (`CameraRig.blockers`). */
export interface CameraBlocker {
  x: number;
  z: number;
  hw: number;
  hd: number;
  top: number;
}

function featureOf(m: AbstractMesh | null | undefined): DungeonFeature | null {
  const md = m?.metadata as { dungeonFeature?: DungeonFeature } | undefined;
  return md?.dungeonFeature ?? null;
}

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
function chestModel(scene: Scene): Promise<AssetContainer> {
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
  private readonly chestClips: AnimationGroup[] = [];
  private disposed = false;
  private readonly flameMat: StandardMaterial;
  private readonly flame: Mesh;
  private readonly flameColor: Rgb;
  private time = 0;

  constructor(
    private readonly scene: Scene,
    def: DungeonDef,
    floor: DungeonFloor,
    opened: ReadonlySet<string>,
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
    for (let r = 0; r < floor.rows; r++) for (let c = 0; c < floor.cols; c++) if (floor.cells[r * floor.cols + c]) floorTiles.push({ x: (c + 0.5) * ts, y: 0, z: (r + 0.5) * ts });
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

    // Antorchas: soporte y llama (la luz real la ponen las más cercanas en la atmósfera).
    const torchY = wh * 0.62;
    const bracket = own(staticMesh(scene, 'd_antorcha', 'dTorch'));
    bracket.material = mat(scene, 'dTorchMat', [0.22, 0.16, 0.1]);
    bracket.thinInstanceSetBuffer('matrix', matrices(floor.torches.map((t) => ({ x: t.x + t.nx * 0.12, y: torchY, z: t.y + t.ny * 0.12 }))), 16, true);
    bracket.isPickable = false;
    this.flameColor = def.light.torch.color;
    this.flameMat = glow(scene, 'dFlameMat', def.light.torch.color);
    this.flame = own(staticMesh(scene, 'd_llama', 'dFlame'));
    this.flame.material = this.flameMat;
    this.flame.thinInstanceSetBuffer('matrix', matrices(floor.torches.map((t) => ({ x: t.x + t.nx * 0.16, y: torchY + 0.36, z: t.y + t.ny * 0.16 }))), 16, true);
    this.flame.isPickable = false;
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
      const root = new TransformNode(`dChest-${c.id}`, scene);
      root.parent = this.root;
      root.position.set(c.pos.x, 0, c.pos.y);
      root.scaling.setAll(CHEST_SCALE);
      // Mira hacia el centro del piso, más o menos hacia la sala.
      root.rotation.y = Math.atan2(floor.width / 2 - c.pos.x, floor.depth / 2 - c.pos.y);
      const hit = MeshBuilder.CreateBox('dChestHit', { width: 1.24, height: 0.8, depth: 0.89 }, scene);
      hit.parent = root;
      hit.position.y = 0.4;
      hit.visibility = 0;
      tagPickable([hit], { kind: 'chest', id: c.id });
      const chest: ChestEls = { opened: opened.has(c.id), open: null, meshes: [] };
      this.chests.set(c.id, chest);
      void this.addChestModel(chest, root);
    }
  }

  private async addChestModel(chest: ChestEls, root: TransformNode): Promise<void> {
    try {
      const model = await chestModel(this.scene);
      if (this.disposed) return;
      // Materiales propios: `dispose()` borra los del piso y el modelo sirve para los siguientes.
      const inst = model.instantiateModelsToScene((n) => `${root.name}:${n}`, true, { doNotInstantiate: true });
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
    const hit = this.scene.pick(x, y, (m) => m.isPickable && m.isEnabled() && featureOf(m) !== null && m.isDescendantOf(this.root));
    return hit?.hit ? featureOf(hit.pickedMesh) : null;
  }

  setOpened(id: string): void {
    const c = this.chests.get(id);
    if (!c || c.opened) return;
    c.opened = true;
    this.showOpened(c, true);
  }

  update(dt: number): void {
    this.time += dt;
    // Parpadeo del brillo (la escala no: movería las posiciones de las instancias).
    const k = 0.85 + 0.15 * Math.sin(this.time * 11) * Math.sin(this.time * 7.3);
    this.flameMat.emissiveColor.set(this.flameColor[0] * k, this.flameColor[1] * k, this.flameColor[2] * k);
  }

  dispose(): void {
    this.disposed = true;
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
