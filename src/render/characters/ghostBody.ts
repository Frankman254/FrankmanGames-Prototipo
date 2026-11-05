// La forma espectral del jugador: un fantasma de sábana con ojos y bracitos, que flota
// y ondea. Es otro cuerpo, no el personaje teñido: `assets/models/fantasma.glb`
// (scripts/blender/mascotas.py), con sus clips Reposo y Avanzar.
import { Color3, TransformNode, type AnimationGroup, type Material, type Scene } from '@babylonjs/core';
import { modelFile } from '../modelFiles';

const HOVER = 0.22;

export class GhostBody {
  readonly root: TransformNode;
  private idle: AnimationGroup | null = null;
  private move: AnimationGroup | null = null;
  private moving: boolean | null = null;
  private requested = false;

  constructor(private readonly scene: Scene) {
    this.root = new TransformNode('ghost', scene);
    this.root.setEnabled(false);
  }

  private load(): void {
    this.requested = true;
    void modelFile(this.scene, 'fantasma')
      .then((model) => {
        const inner = new TransformNode('ghostInner', this.scene);
        inner.parent = this.root;
        // El modelo mira a +Z; el juego orienta a sus personajes por +X.
        inner.rotation.y = Math.PI / 2;
        const inst = model.instantiateModelsToScene((n) => `ghost:${n}`, true, { doNotInstantiate: true });
        for (const g of inst.animationGroups) g.stop();
        for (const n of inst.rootNodes) n.parent = inner;
        for (const m of inner.getChildMeshes(false)) {
          m.isPickable = false;
          this.style(m.material);
        }
        this.idle = inst.animationGroups.find((g) => g.name.endsWith('Reposo')) ?? null;
        this.move = inst.animationGroups.find((g) => g.name.endsWith('Avanzar')) ?? null;
      })
      .catch((err: unknown) => console.error('[modelos] no se pudo cargar assets/models/fantasma.glb', err));
  }

  private style(material: Material | null): void {
    const m = material as (Material & { albedoColor?: Color3; emissiveColor?: Color3; needDepthPrePass: boolean }) | null;
    if (!m?.name.endsWith('sabana')) return;
    m.alpha = 0.78;
    m.needDepthPrePass = true;
    m.emissiveColor = new Color3(0.42, 0.62, 0.8);
  }

  /** Coloca y elige el clip: el modelo ya flota, ondea y se inclina al avanzar. */
  sync(x: number, y: number, z: number, facing: number, moving: boolean, _dt: number): void {
    if (!this.requested) this.load();
    this.root.position.set(x, y + HOVER, z);
    this.root.rotation.y = -facing;
    if (this.moving === moving || !this.idle || !this.move) return;
    this.moving = moving;
    (moving ? this.idle : this.move).stop();
    const g = moving ? this.move : this.idle;
    g.start(true, 1, g.from, g.to);
  }
}
