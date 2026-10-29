// Enemigos y avisos (telegraph) con primitivas. Cada arquetipo tiene su forma y
// color (`look` en data/enemies.json); el aviso es el área exacta que la
// simulación va a resolver, con un relleno que crece hasta el golpe.
import {
  Color3,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  TransformNode,
  type Scene,
} from '@babylonjs/core';
import type { ShapeDef } from '../data/schema';
import type { Enemy } from '../sim/enemies';
import type { PlacedShape } from '../sim/shapes';

interface EnemyVisual {
  root: Mesh;
  mat: StandardMaterial;
  base: Color3;
  barBg: Mesh;
  barFill: Mesh;
  height: number;
}

interface TelegraphVisual {
  shape: PlacedShape;
  node: TransformNode;
  fill: Mesh;
}

const BAR_WIDTH = 1;

export class EnemyView {
  private readonly visuals = new Map<number, EnemyVisual>();
  private readonly telegraphs = new Map<number, TelegraphVisual>();
  /** Segundos de destello por golpe recibido, por id. */
  private readonly hitFlash = new Map<number, number>();
  private readonly outlineMat: StandardMaterial;
  private readonly fillMat: StandardMaterial;
  private readonly summonMat: StandardMaterial;
  private readonly barBgMat: StandardMaterial;
  private readonly barFillMat: StandardMaterial;

  constructor(private readonly scene: Scene) {
    this.outlineMat = flatMaterial(scene, 'teleOutline', [0.95, 0.25, 0.2], 0.25);
    this.fillMat = flatMaterial(scene, 'teleFill', [1, 0.35, 0.2], 0.55);
    this.summonMat = flatMaterial(scene, 'teleSummon', [0.7, 0.4, 1], 0.45);
    this.barBgMat = flatMaterial(scene, 'barBg', [0.1, 0.1, 0.1], 0.8);
    this.barFillMat = flatMaterial(scene, 'barFill', [0.9, 0.2, 0.2], 1);
  }

  /** Malla pickable → id de enemigo. */
  static enemyIdOf(mesh: { metadata?: unknown } | null | undefined): number | null {
    const md = mesh?.metadata as { enemyId?: number } | undefined;
    return typeof md?.enemyId === 'number' ? md.enemyId : null;
  }

  private create(e: Enemy): EnemyVisual {
    const look = e.def.look;
    const h = look.height;
    const r = e.radius;
    let root: Mesh;
    switch (look.mesh) {
      case 'box':
        root = MeshBuilder.CreateBox(`enemy${e.id}`, { width: r * 2, depth: r * 2, height: h }, this.scene);
        break;
      case 'cylinder':
        root = MeshBuilder.CreateCylinder(`enemy${e.id}`, { diameter: r * 2, height: h, tessellation: 12 }, this.scene);
        break;
      case 'cone':
        root = MeshBuilder.CreateCylinder(`enemy${e.id}`, { diameterTop: 0, diameterBottom: r * 2.2, height: h, tessellation: 12 }, this.scene);
        break;
      case 'sphere':
        root = MeshBuilder.CreateSphere(`enemy${e.id}`, { diameter: Math.max(r * 2, h), segments: 8 }, this.scene);
        break;
    }
    const mat = new StandardMaterial(`enemyMat${e.id}`, this.scene);
    const base = new Color3(...look.color);
    mat.diffuseColor = base.clone();
    mat.specularColor = new Color3(0.05, 0.05, 0.05);
    root.material = mat;
    root.isPickable = true;
    root.metadata = { enemyId: e.id };

    // «Nariz» para leer hacia dónde mira.
    const nose = MeshBuilder.CreateBox(`enemyNose${e.id}`, { width: 0.25, height: 0.15, depth: 0.25 }, this.scene);
    nose.parent = root;
    nose.position.set(r, h * 0.15, 0);
    nose.material = mat;
    nose.isPickable = false;

    const barBg = MeshBuilder.CreatePlane(`barBg${e.id}`, { width: BAR_WIDTH, height: 0.12 }, this.scene);
    barBg.billboardMode = Mesh.BILLBOARDMODE_ALL;
    barBg.material = this.barBgMat;
    barBg.isPickable = false;
    const barFill = MeshBuilder.CreatePlane(`barFill${e.id}`, { width: BAR_WIDTH, height: 0.1 }, this.scene);
    barFill.billboardMode = Mesh.BILLBOARDMODE_ALL;
    barFill.material = this.barFillMat;
    barFill.isPickable = false;
    const v = { root, mat, base, barBg, barFill, height: h };
    this.visuals.set(e.id, v);
    return v;
  }

  flashHit(id: number): void {
    this.hitFlash.set(id, 0.12);
  }

  sync(list: readonly Enemy[], alpha: number, frameSeconds = 0): void {
    const seen = new Set<number>();
    for (const e of list) {
      seen.add(e.id);
      const v = this.visuals.get(e.id) ?? this.create(e);
      const x = e.prevPos.x + (e.pos.x - e.prevPos.x) * alpha;
      const z = e.prevPos.y + (e.pos.y - e.prevPos.y) * alpha;
      const dead = e.state === 'dead';
      const gone = dead && e.stateTime >= e.def.corpseSeconds;
      v.root.setEnabled(!gone);
      v.root.isPickable = !dead;
      v.root.position.set(x, dead ? e.radius : v.height / 2, z);
      v.root.rotation.set(0, -e.facing, dead ? Math.PI / 2 : 0);

      // Color según estado: aviso parpadea, aturdido blanquea, muerto oscurece.
      const c = v.mat.diffuseColor;
      c.copyFrom(v.base);
      v.mat.emissiveColor.set(0, 0, 0);
      if (e.state === 'telegraph') {
        const blink = 0.5 + 0.5 * Math.sin(e.stateTime * 30);
        v.mat.emissiveColor.set(0.6 * blink, 0.15 * blink, 0.05 * blink);
      } else if (e.state === 'stagger') {
        Color3.LerpToRef(v.base, Color3.White(), 0.6, c);
      } else if (dead) {
        c.scaleToRef(0.35, c);
      } else if (e.state === 'idle') {
        c.scaleToRef(0.75, c);
      }
      const flash = this.hitFlash.get(e.id) ?? 0;
      if (flash > 0) {
        v.mat.emissiveColor.set(0.8, 0.8, 0.8);
        this.hitFlash.set(e.id, flash - frameSeconds);
      }

      const showBar = !dead && e.health < e.def.maxHealth;
      v.barBg.setEnabled(showBar);
      v.barFill.setEnabled(showBar);
      if (showBar) {
        const y = v.height + 0.45;
        const f = Math.max(0, e.health / e.def.maxHealth);
        v.barBg.position.set(x, y, z);
        v.barFill.position.set(x, y + 0.001, z);
        v.barFill.scaling.x = Math.max(0.001, f);
      }
      this.syncTelegraph(e);
    }
    for (const [id, v] of this.visuals) {
      if (seen.has(id)) continue;
      v.root.dispose(false, false);
      v.mat.dispose();
      v.barBg.dispose();
      v.barFill.dispose();
      this.visuals.delete(id);
      this.hitFlash.delete(id);
      this.disposeTelegraph(id);
    }
  }

  private syncTelegraph(e: Enemy): void {
    const t = e.telegraph;
    let tv = this.telegraphs.get(e.id);
    if (tv && tv.shape !== t) {
      this.disposeTelegraph(e.id);
      tv = undefined;
    }
    if (!t) return;
    if (!tv) {
      tv = this.buildTelegraph(e.id, t, e.def.attack.effect === 'summon');
      this.telegraphs.set(e.id, tv);
    }
    const progress = Math.min(1, e.stateTime / e.def.attack.telegraphSeconds);
    setFill(tv.fill, t.def, progress);
  }

  private buildTelegraph(id: number, s: PlacedShape, summon: boolean): TelegraphVisual {
    const node = new TransformNode(`tele${id}`, this.scene);
    node.position.set(s.origin.x, 0.04, s.origin.y);
    const outline = shapeMesh(this.scene, `teleOut${id}`, s.def);
    outline.parent = node;
    outline.material = summon ? this.summonMat : this.outlineMat;
    const fill = shapeMesh(this.scene, `teleFill${id}`, s.def);
    fill.parent = node;
    fill.position.y += 0.01;
    fill.material = summon ? this.summonMat : this.fillMat;
    if (s.def.type === 'cone') node.rotation.y = -(s.dir - (s.def.angleDeg * Math.PI) / 360);
    else node.rotation.y = -s.dir;
    return { shape: s, node, fill };
  }

  private disposeTelegraph(id: number): void {
    const tv = this.telegraphs.get(id);
    if (!tv) return;
    tv.node.dispose(false, false);
    this.telegraphs.delete(id);
  }

  dispose(): void {
    this.sync([], 0);
  }
}

/** Malla plana de la forma en el espacio local: el eje +X es la dirección del ataque. */
export function shapeMesh(scene: Scene, name: string, def: ShapeDef): Mesh {
  let m: Mesh;
  if (def.type === 'line') {
    m = MeshBuilder.CreateGround(name, { width: def.length, height: def.width }, scene);
    m.position.x = def.length / 2;
  } else {
    const radius = def.type === 'circle' ? def.radius : def.length;
    const arc = def.type === 'cone' ? Math.min(1, def.angleDeg / 360) : 1;
    // El disco nace en el plano XY empezando en +X; girado 90° en X queda en el
    // suelo y su arco avanza de +X hacia +Z, el mismo sentido que atan2 en la sim.
    m = MeshBuilder.CreateDisc(name, { radius, arc, tessellation: 48, sideOrientation: Mesh.DOUBLESIDE }, scene);
    m.rotation.x = Math.PI / 2;
  }
  m.isPickable = false;
  return m;
}

function setFill(fill: Mesh, def: ShapeDef, progress: number): void {
  const p = Math.max(0.001, progress);
  if (def.type === 'line') {
    fill.scaling.x = p;
    fill.position.x = (def.length * p) / 2;
  } else {
    fill.scaling.x = p;
    fill.scaling.y = p;
  }
}

export function flatMaterial(scene: Scene, name: string, rgb: [number, number, number], alpha: number): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = new Color3(...rgb);
  m.emissiveColor = new Color3(...rgb).scale(0.6);
  m.specularColor = Color3.Black();
  m.alpha = alpha;
  m.backFaceCulling = false;
  m.disableLighting = alpha < 1;
  return m;
}
