// Dibujo de los perseguidores de la prueba de carga en tres modos, para medir
// el coste del render por separado: thin instances, mallas sueltas o nada.
import { MeshBuilder, type Mesh, type Scene } from '@babylonjs/core';
import type { Chaser } from '../sim/chasers';
import { solidMaterial } from './materials';

export type ChaserRenderMode = 'instanced' | 'meshes' | 'hidden';
export const CHASER_RENDER_MODES: readonly ChaserRenderMode[] = ['instanced', 'meshes', 'hidden'];

const HEIGHT = 1.4;

export class ChaserView {
  mode: ChaserRenderMode = 'instanced';
  private readonly base: Mesh;
  private matrices = new Float32Array(0);
  private clones: Mesh[] = [];

  constructor(private readonly scene: Scene, radius: number) {
    this.base = MeshBuilder.CreateCapsule('chaser', { radius, height: HEIGHT, tessellation: 10, subdivisions: 1 }, scene);
    this.base.material = solidMaterial(scene, 'chaserMat', [0.85, 0.35, 0.3]);
    this.base.isPickable = false;
    this.base.alwaysSelectAsActiveMesh = true;
    this.base.isVisible = false;
  }

  sync(list: readonly Chaser[], alpha: number): void {
    const n = this.mode === 'hidden' ? 0 : list.length;
    if (this.mode !== 'meshes') this.disposeClones();

    if (this.mode === 'instanced' && n > 0) {
      if (this.matrices.length !== n * 16) {
        this.matrices = new Float32Array(n * 16);
        this.base.thinInstanceSetBuffer('matrix', this.matrices, 16, false);
      }
      const m = this.matrices;
      for (let i = 0; i < n; i++) {
        const c = list[i]!;
        const o = i * 16;
        const cos = Math.cos(-c.facing);
        const sin = Math.sin(-c.facing);
        m[o] = cos; m[o + 1] = 0; m[o + 2] = -sin; m[o + 3] = 0;
        m[o + 4] = 0; m[o + 5] = 1; m[o + 6] = 0; m[o + 7] = 0;
        m[o + 8] = sin; m[o + 9] = 0; m[o + 10] = cos; m[o + 11] = 0;
        m[o + 12] = c.prevPos.x + (c.pos.x - c.prevPos.x) * alpha;
        m[o + 13] = HEIGHT / 2;
        m[o + 14] = c.prevPos.y + (c.pos.y - c.prevPos.y) * alpha;
        m[o + 15] = 1;
      }
      this.base.thinInstanceBufferUpdated('matrix');
      this.base.isVisible = true;
    } else {
      this.base.isVisible = false;
    }

    if (this.mode === 'meshes') {
      while (this.clones.length < list.length) {
        const c = this.base.clone(`chaserClone${this.clones.length}`, null, true, false);
        c.thinInstanceCount = 0;
        c.isVisible = true;
        this.clones.push(c);
      }
      while (this.clones.length > list.length) this.clones.pop()!.dispose();
      for (let i = 0; i < list.length; i++) {
        const c = list[i]!;
        const mesh = this.clones[i]!;
        mesh.position.set(c.prevPos.x + (c.pos.x - c.prevPos.x) * alpha, HEIGHT / 2, c.prevPos.y + (c.pos.y - c.prevPos.y) * alpha);
        mesh.rotation.y = -c.facing;
      }
    }
  }

  private disposeClones(): void {
    if (this.clones.length === 0) return;
    for (const c of this.clones) c.dispose();
    this.clones = [];
  }
}
