// Montura del jugador, hecha con primitivas: cuerpo, cuello, cabeza y patas que
// trotan al moverse. Se construye al equiparla y se tira al quitarla. Devuelve la
// altura de la silla para subir al jinete.
import {
  Color3,
  MeshBuilder,
  StandardMaterial,
  TransformNode,
  type AbstractMesh,
  type Mesh,
  type Scene,
} from '@babylonjs/core';
import type { MountLook } from '../rpg/contracts';

interface Built {
  id: string;
  root: TransformNode;
  legs: Mesh[];
  body: Mesh;
  meshes: Mesh[];
  mats: StandardMaterial[];
}

export class MountView {
  private built: Built | null = null;
  private phase = 0;

  constructor(
    private readonly scene: Scene,
    private readonly shadows: { addCasters(meshes: readonly AbstractMesh[]): void },
  ) {}

  /** Coloca la montura (o la quita si no hay). Devuelve lo que sube el jinete. */
  sync(id: string | null, look: MountLook | null, x: number, y: number, z: number, yaw: number, moving: boolean, dt: number): number {
    if (this.built && this.built.id !== id) this.dispose();
    if (!id || !look) return 0;
    this.built ??= this.build(id, look);
    const b = this.built;
    b.root.position.set(x, y, z);
    b.root.rotation.y = yaw;
    this.phase += dt * (moving ? 13 : 0);
    const swing = moving ? 0.6 : 0;
    b.legs.forEach((leg, i) => {
      leg.rotation.x = Math.sin(this.phase + (i === 0 || i === 3 ? 0 : Math.PI)) * swing;
    });
    const bob = moving ? Math.abs(Math.sin(this.phase)) * 0.06 : 0;
    b.body.position.y = 0.9 * look.scale + bob;
    return look.rideHeight + bob;
  }

  private dispose(): void {
    if (!this.built) return;
    this.built.root.dispose(false, false);
    for (const m of this.built.mats) m.dispose();
    this.built = null;
  }

  private build(id: string, look: MountLook): Built {
    const s = this.scene;
    const mat = (name: string, hex: string): StandardMaterial => {
      const m = new StandardMaterial(`mount_${name}`, s);
      m.diffuseColor = Color3.FromHexString(hex);
      m.specularColor = Color3.Black();
      return m;
    };
    const coat = mat('coat', look.color);
    const dark = mat('dark', look.accent);
    const root = new TransformNode('mountRoot', s);
    const k = look.scale;
    const meshes: Mesh[] = [];
    const box = (name: string, w: number, h: number, d: number, m: StandardMaterial, parent: TransformNode | Mesh): Mesh => {
      const b = MeshBuilder.CreateBox(`mount_${name}`, { width: w * k, height: h * k, depth: d * k }, s);
      b.parent = parent;
      b.material = m;
      b.isPickable = false;
      meshes.push(b);
      return b;
    };
    const body = box('body', 0.62, 0.6, 1.5, coat, root);
    body.position.y = 0.9 * k;
    const neck = box('neck', 0.3, 0.62, 0.34, coat, body);
    neck.position.set(0, 0.42 * k, 0.72 * k);
    neck.rotation.x = 0.45;
    const head = box('head', 0.26, 0.28, 0.56, coat, body);
    head.position.set(0, 0.74 * k, 1.0 * k);
    const mane = box('mane', 0.08, 0.66, 0.42, dark, body);
    mane.position.set(0, 0.5 * k, 0.56 * k);
    mane.rotation.x = 0.45;
    const tail = box('tail', 0.12, 0.62, 0.12, dark, body);
    tail.position.set(0, 0, -0.82 * k);
    tail.rotation.x = -0.3;
    const saddle = box('saddle', 0.66, 0.1, 0.56, dark, body);
    saddle.position.set(0, 0.33 * k, -0.05 * k);
    const legs = ([[-0.2, 0.55], [0.2, 0.55], [-0.2, -0.55], [0.2, -0.55]] as const).map(([lx, lz], i) => {
      // El pivote queda arriba: la pata gira desde la cadera.
      const hip = MeshBuilder.CreateBox(`mount_hip${i}`, { size: 0.01 }, s);
      hip.parent = root;
      hip.position.set(lx * k, 0.68 * k, lz * k);
      hip.isVisible = false;
      hip.isPickable = false;
      const leg = box(`leg${i}`, 0.16, 0.68, 0.16, dark, hip);
      leg.position.y = -0.34 * k;
      return hip;
    });
    this.shadows.addCasters(meshes);
    return { id, root, legs, body, meshes, mats: [coat, dark] };
  }
}
