// Geometría de los pisos de mazmorra y de la boca de la cripta en el mundo
// abierto. Sólo primitivas: suelo de baldosas y muros como thin instances (un
// draw call por tipo), antorchas, escaleras y cofres. Los muros y su remate
// llevan el recorte de oclusión para que no tapen a los personajes.
import { Color3, Matrix, Mesh, MeshBuilder, Quaternion, StandardMaterial, TransformNode, Vector3, type AbstractMesh, type Scene } from '@babylonjs/core';
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

interface ChestEls {
  lid: Mesh;
  body: Mesh;
}

/** Un piso dibujado. `dispose()` lo quita entero (mallas y materiales). */
export class DungeonFloorView {
  readonly root: TransformNode;
  /** Antorchas para la luz (`Atmosphere.setInterior`). */
  readonly lamps: LampPost[];
  /** Muros para la cámara. */
  readonly blockers: CameraBlocker[];
  private readonly chests = new Map<string, ChestEls>();
  private readonly openMat: StandardMaterial;
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
    const tile = own(MeshBuilder.CreateGround('dFloor', { width: ts * 0.985, height: ts * 0.985 }, scene));
    tile.material = mat(scene, 'dFloorMat', [1, 1, 1]);
    tile.thinInstanceSetBuffer('matrix', matrices(floorTiles), 16, true);
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
    const wall = own(MeshBuilder.CreateBox('dWall', { width: ts, height: wh, depth: ts }, scene));
    wall.material = mat(scene, 'dWallMat', th.wall, true);
    wall.thinInstanceSetBuffer('matrix', matrices(floor.wallTiles.map((t) => ({ x: (t.c + 0.5) * ts, y: wh / 2, z: (t.r + 0.5) * ts }))), 16, true);
    wall.isPickable = false;
    wall.receiveShadows = true;
    const cap = own(MeshBuilder.CreateGround('dWallTop', { width: ts, height: ts }, scene));
    cap.material = mat(scene, 'dWallTopMat', th.wallTop, true);
    cap.thinInstanceSetBuffer('matrix', matrices(floor.wallTiles.map((t) => ({ x: (t.c + 0.5) * ts, y: wh + 0.01, z: (t.r + 0.5) * ts }))), 16, true);
    cap.isPickable = false;
    this.blockers = floor.wallRects.map((r) => ({ x: r.x, z: r.y, hw: r.w / 2, hd: r.d / 2, top: wh }));

    // Antorchas: soporte y llama (la luz real la ponen las más cercanas en la atmósfera).
    const torchY = wh * 0.62;
    const bracket = own(MeshBuilder.CreateBox('dTorch', { width: 0.12, height: 0.5, depth: 0.12 }, scene));
    bracket.material = mat(scene, 'dTorchMat', [0.22, 0.16, 0.1]);
    bracket.thinInstanceSetBuffer('matrix', matrices(floor.torches.map((t) => ({ x: t.x + t.nx * 0.12, y: torchY, z: t.y + t.ny * 0.12 }))), 16, true);
    bracket.isPickable = false;
    this.flameColor = def.light.torch.color;
    this.flameMat = glow(scene, 'dFlameMat', def.light.torch.color);
    this.flame = own(MeshBuilder.CreateSphere('dFlame', { diameter: 0.26, segments: 6 }, scene));
    this.flame.material = this.flameMat;
    this.flame.thinInstanceSetBuffer('matrix', matrices(floor.torches.map((t) => ({ x: t.x + t.nx * 0.16, y: torchY + 0.36, z: t.y + t.ny * 0.16, sy: 1.5 }))), 16, true);
    this.flame.isPickable = false;
    this.lamps = floor.torches.map((t) => ({ x: t.x + t.nx * 0.5, y: torchY + 0.4, z: t.y + t.ny * 0.5 }));

    // Escaleras: subida = peldaños que suben hacia un arco; bajada = boca negra con marco.
    const stone = mat(scene, 'dStairMat', th.wall.map((v) => Math.min(1, v * 1.25)) as Rgb);
    const runeUp = glow(scene, 'dRuneUp', [0.95, 0.75, 0.35]);
    const runeDown = glow(scene, 'dRuneDown', [0.35, 0.6, 1.0]);
    {
      const p = floor.upStairs;
      const parts: Mesh[] = [];
      for (let k = 0; k < 4; k++) {
        const step = own(MeshBuilder.CreateBox('dUpStep', { width: 0.55, height: 0.25 * (k + 1), depth: 2.2 }, scene));
        step.position.set(p.x - 0.8 + k * 0.55, 0.125 * (k + 1), p.y);
        step.material = stone;
        parts.push(step);
      }
      for (const dz of [-1.2, 1.2]) {
        const post = own(MeshBuilder.CreateBox('dUpPost', { width: 0.35, height: 2.6, depth: 0.35 }, scene));
        post.position.set(p.x + 1.4, 1.3, p.y + dz);
        post.material = stone;
        parts.push(post);
      }
      const lintel = own(MeshBuilder.CreateBox('dUpLintel', { width: 0.45, height: 0.4, depth: 2.8 }, scene));
      lintel.position.set(p.x + 1.4, 2.75, p.y);
      lintel.material = stone;
      parts.push(lintel);
      const ring = own(MeshBuilder.CreateTorus('dUpRing', { diameter: 3.2, thickness: 0.06, tessellation: 32 }, scene));
      ring.position.set(p.x, 0.04, p.y);
      ring.material = runeUp;
      ring.isPickable = false;
      tagPickable(parts, { kind: 'up' });
    }
    if (floor.downStairs) {
      const p = floor.downStairs;
      const hole = own(MeshBuilder.CreateGround('dDownHole', { width: 2.2, height: 2.2 }, scene));
      hole.position.set(p.x, 0.02, p.y);
      hole.material = glow(scene, 'dHoleMat', [0.005, 0.005, 0.01]);
      const parts: Mesh[] = [hole];
      for (const [dx, dz, w, d] of [[0, -1.25, 2.8, 0.3], [0, 1.25, 2.8, 0.3], [-1.25, 0, 0.3, 2.2], [1.25, 0, 0.3, 2.2]] as const) {
        const curb = own(MeshBuilder.CreateBox('dDownCurb', { width: w, height: 0.3, depth: d }, scene));
        curb.position.set(p.x + dx, 0.15, p.y + dz);
        curb.material = stone;
        parts.push(curb);
      }
      // Dos peldaños que se hunden en la oscuridad.
      for (let k = 0; k < 2; k++) {
        const step = own(MeshBuilder.CreateBox('dDownStep', { width: 0.5, height: 0.06, depth: 2 }, scene));
        step.position.set(p.x - 0.75 + k * 0.5, 0.035, p.y);
        step.material = mat(scene, `dDownStepMat${k}`, th.wall.map((v) => v * (0.6 - k * 0.25)) as Rgb);
        parts.push(step);
      }
      const ring = own(MeshBuilder.CreateTorus('dDownRing', { diameter: 3.6, thickness: 0.06, tessellation: 32 }, scene));
      ring.position.set(p.x, 0.04, p.y);
      ring.material = runeDown;
      ring.isPickable = false;
      tagPickable(parts, { kind: 'down' });
    }

    // Cofres: caja y tapa; abiertos, la tapa queda levantada y el interior apagado.
    const wood = mat(scene, 'dChestMat', [0.42, 0.26, 0.12]);
    const trim = mat(scene, 'dChestTrim', [0.85, 0.68, 0.25]);
    this.openMat = mat(scene, 'dChestOpenMat', [0.2, 0.14, 0.08]);
    for (const c of floor.chests) {
      const body = own(MeshBuilder.CreateBox('dChest', { width: 1.0, height: 0.55, depth: 0.7 }, scene));
      body.position.set(c.pos.x, 0.28, c.pos.y);
      body.material = wood;
      const band = own(MeshBuilder.CreateBox('dChestBand', { width: 1.04, height: 0.08, depth: 0.74 }, scene));
      band.position.set(c.pos.x, 0.42, c.pos.y);
      band.material = trim;
      const lid = own(MeshBuilder.CreateBox('dChestLid', { width: 1.02, height: 0.18, depth: 0.72 }, scene));
      lid.material = wood;
      lid.position.set(c.pos.x, 0.64, c.pos.y);
      // Mira hacia el centro del piso, más o menos hacia la sala.
      body.rotation.y = band.rotation.y = lid.rotation.y = Math.atan2(floor.width / 2 - c.pos.x, floor.depth / 2 - c.pos.y);
      tagPickable([body, band, lid], { kind: 'chest', id: c.id });
      this.chests.set(c.id, { lid, body });
      if (opened.has(c.id)) this.setOpened(c.id);
    }
  }

  /** Feature bajo el cursor (escalera o cofre). */
  pick(x: number, y: number): DungeonFeature | null {
    const hit = this.scene.pick(x, y, (m) => m.isPickable && m.isEnabled() && featureOf(m) !== null && m.isDescendantOf(this.root));
    return hit?.hit ? featureOf(hit.pickedMesh) : null;
  }

  setOpened(id: string): void {
    const c = this.chests.get(id);
    if (!c) return;
    c.lid.position.y = 0.95;
    c.lid.rotation.x = -0.9;
    c.body.material = this.openMat;
  }

  update(dt: number): void {
    this.time += dt;
    // Parpadeo del brillo (la escala no: movería las posiciones de las instancias).
    const k = 0.85 + 0.15 * Math.sin(this.time * 11) * Math.sin(this.time * 7.3);
    this.flameMat.emissiveColor.set(this.flameColor[0] * k, this.flameColor[1] * k, this.flameColor[2] * k);
  }

  dispose(): void {
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
  const stone = mat(scene, 'cryptStone', [0.46, 0.45, 0.48], true);
  const dark = glow(scene, 'cryptDark', [0.01, 0.01, 0.015]);
  const rune = glow(scene, 'cryptRune', [0.35, 0.6, 1.0]);
  const parts: Mesh[] = [];
  const box = (name: string, w: number, h: number, d: number, x: number, y: number, z: number, m: StandardMaterial): Mesh => {
    const b = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
    b.position.set(x, y, z);
    b.material = m;
    b.parent = root;
    parts.push(b);
    return b;
  };
  // Montículo detrás de la boca (local +X es hacia donde mira la boca).
  const mound = MeshBuilder.CreateSphere('cryptMound', { diameter: 6, segments: 10 }, scene);
  mound.scaling.set(0.8, 0.55, 1.15);
  mound.position.set(-4.3, 0, 0);
  mound.material = mat(scene, 'cryptMoundMat', [0.3, 0.33, 0.24]);
  mound.parent = root;
  parts.push(mound);
  box('cryptPillarL', 0.6, 3, 0.6, 0, 1.5, -1.5, stone);
  box('cryptPillarR', 0.6, 3, 0.6, 0, 1.5, 1.5, stone);
  box('cryptLintel', 0.8, 0.55, 4, 0, 3.2, 0, stone);
  box('cryptCap', 0.5, 0.3, 2.6, 0, 3.62, 0, stone);
  // Boca: losa negra entre el arco y el montículo, con peldaños que se pierden en ella.
  box('cryptHole', 2.2, 0.06, 2.6, -1.2, 0.04, 0, dark);
  for (const z of [-1.45, 1.45]) box('cryptCurb', 2.4, 0.35, 0.3, -1.2, 0.17, z, stone);
  for (let k = 0; k < 3; k++) box('cryptStep', 0.45, 0.08, 2.4, -0.3 - k * 0.5, 0.1, 0, mat(scene, `cryptStepMat${k}`, [0.4 - k * 0.12, 0.4 - k * 0.12, 0.42 - k * 0.12]));
  const ring = MeshBuilder.CreateTorus('cryptRing', { diameter: 1.0, thickness: 0.08, tessellation: 24 }, scene);
  ring.rotation.z = Math.PI / 2;
  ring.position.set(0.42, 3.2, 0);
  ring.material = rune;
  ring.parent = root;
  parts.push(ring);
  tagPickable(parts, { kind: 'entrance' });
  return root;
}

/** Feature de la boca de la cripta bajo el cursor. */
export function pickEntrance(scene: Scene, root: TransformNode, x: number, y: number): boolean {
  const hit = scene.pick(x, y, (m) => m.isPickable && m.isEnabled() && m.isDescendantOf(root));
  return hit?.hit ?? false;
}
