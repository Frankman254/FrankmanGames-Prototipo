// Fantasmas del apuntado: una copia translúcida de cada cuerpo en el sitio donde
// acabaría si se lanza el hechizo, con una línea desde donde está. También aros
// bajo los enemigos alcanzados. Nada de esto interviene en el picking.
import { Color3, MeshBuilder, StandardMaterial, TransformNode, type AbstractMesh, type LinesMesh, type Mesh, type Scene, Vector3 } from '@babylonjs/core';
import type { HeightField } from '../../world/terrain';

export interface AimGhost {
  key: string;
  /** Modelo que se copia. */
  source: TransformNode | null;
  facing: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
  mine: boolean;
}

interface Live {
  root: TransformNode | null;
  source: TransformNode | null;
  line: LinesMesh | null;
  lineKey: string;
  ring: Mesh;
}

export class AimGhosts {
  private readonly live = new Map<string, Live>();
  private readonly rings: Mesh[] = [];
  private readonly mine: StandardMaterial;
  private readonly other: StandardMaterial;
  private readonly hitMat: StandardMaterial;

  constructor(private readonly scene: Scene, private readonly ground: HeightField) {
    const mat = (name: string, c: Color3, alpha: number): StandardMaterial => {
      const m = new StandardMaterial(name, scene);
      m.diffuseColor = c;
      m.emissiveColor = c.scale(0.75);
      m.specularColor = Color3.Black();
      m.alpha = alpha;
      return m;
    };
    this.mine = mat('aimGhostMine', new Color3(0.25, 0.85, 0.8), 0.48);
    this.other = mat('aimGhostOther', new Color3(0.95, 0.5, 0.2), 0.42);
    this.hitMat = mat('aimHitRing', new Color3(0.95, 0.28, 0.14), 0.9);
  }

  /** Aros bajo los alcanzados: posiciones y radio. */
  syncHits(list: readonly { x: number; y: number; radius: number }[]): void {
    while (this.rings.length < list.length) {
      const r = MeshBuilder.CreateTorus('aimHit', { diameter: 1, thickness: 0.05, tessellation: 32 }, this.scene);
      r.isPickable = false;
      r.material = this.hitMat;
      this.rings.push(r);
    }
    this.rings.forEach((r, i) => {
      const h = list[i];
      r.setEnabled(!!h);
      if (!h) return;
      r.position.set(h.x, this.ground.sample(h.x, h.y) + 0.09, h.y);
      r.scaling.setAll(h.radius * 2 + 0.35);
    });
  }

  sync(list: readonly AimGhost[]): void {
    const keep = new Set(list.map((g) => g.key));
    for (const [k, v] of this.live) {
      if (!keep.has(k)) {
        this.drop(v);
        this.live.delete(k);
      }
    }
    for (const g of list) {
      let v = this.live.get(g.key);
      if (!v) {
        v = { root: null, source: null, line: null, lineKey: '', ring: this.landingRing(g.mine) };
        this.live.set(g.key, v);
      }
      if (!v.root && g.source) {
        v.root = this.copyOf(g.source, g.mine);
        v.source = g.source;
      }
      const y = this.ground.sample(g.to.x, g.to.y);
      if (v.root) {
        v.root.position.set(g.to.x, y, g.to.y);
        v.root.rotation.copyFrom(g.source?.rotation ?? v.root.rotation);
        v.root.rotationQuaternion = null;
        v.root.rotation.y = -g.facing;
      }
      v.ring.position.set(g.to.x, y + 0.07, g.to.y);
      const lineKey = `${g.from.x.toFixed(2)},${g.from.y.toFixed(2)},${g.to.x.toFixed(2)},${g.to.y.toFixed(2)}`;
      if (lineKey === v.lineKey) continue;
      v.lineKey = lineKey;
      const points = [new Vector3(g.from.x, this.ground.sample(g.from.x, g.from.y) + 0.12, g.from.y), new Vector3(g.to.x, y + 0.12, g.to.y)];
      v.line?.dispose();
      v.line = MeshBuilder.CreateDashedLines('aimGhostLine', { points, dashNb: 12, dashSize: 3, gapSize: 2 }, this.scene);
      v.line.color = g.mine ? new Color3(0.4, 1, 0.95) : new Color3(1, 0.65, 0.3);
      v.line.isPickable = false;
    }
  }

  clear(): void {
    this.sync([]);
    this.syncHits([]);
  }

  private landingRing(mine: boolean): Mesh {
    const r = MeshBuilder.CreateTorus('aimLanding', { diameter: 1.15, thickness: 0.06, tessellation: 32 }, this.scene);
    r.isPickable = false;
    r.material = mine ? this.mine : this.other;
    return r;
  }

  /** Copia del modelo con el material translúcido; comparte esqueleto, así que respira con el original. */
  private copyOf(source: TransformNode, mine: boolean): TransformNode | null {
    const root = source.clone('aimGhost', null, false);
    if (!root) return null;
    const mat = mine ? this.mine : this.other;
    for (const m of root.getChildMeshes(false) as AbstractMesh[]) {
      m.material = mat;
      m.isPickable = false;
      m.metadata = null;
      m.receiveShadows = false;
    }
    return root;
  }

  private drop(v: Live): void {
    v.root?.dispose(false, false);
    v.line?.dispose();
    v.ring.dispose();
  }
}
