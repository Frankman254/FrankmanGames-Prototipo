// Montura del jugador: `assets/models/montura.glb` (scripts/blender/objetos.py), con sus clips
// Reposo y Trotar y el color de cada objeto. Se construye al equiparla y se quita al soltarla.
// Devuelve la altura de la silla para subir al jinete.
import '@babylonjs/loaders/glTF';
import {
  Color3,
  LoadAssetContainerAsync,
  TransformNode,
  type AbstractMesh,
  type AnimationGroup,
  type AssetContainer,
  type InstantiatedEntries,
  type Material,
  type Scene,
} from '@babylonjs/core';
import type { MountLook } from '../rpg/contracts';

const URLS: Record<string, string> = import.meta.glob('/assets/models/montura.glb', { query: '?url', import: 'default', eager: true });
const models = new WeakMap<Scene, Promise<AssetContainer>>();

function mountModel(scene: Scene): Promise<AssetContainer> {
  let p = models.get(scene);
  if (!p) {
    p = LoadAssetContainerAsync(URLS['/assets/models/montura.glb']!, scene, { pluginExtension: '.glb' });
    models.set(scene, p);
  }
  return p;
}

interface Built {
  id: string;
  root: TransformNode;
  inst: InstantiatedEntries | null;
  idle: AnimationGroup | null;
  trot: AnimationGroup | null;
  moving: boolean | null;
  disposed: boolean;
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
    this.setMoving(b, moving);
    this.phase += dt * (moving ? 13 : 0);
    return look.rideHeight + (moving ? Math.abs(Math.sin(this.phase)) * 0.03 : 0);
  }

  private setMoving(b: Built, moving: boolean): void {
    if (b.moving === moving || !b.idle || !b.trot) return;
    b.moving = moving;
    (moving ? b.idle : b.trot).stop();
    const g = moving ? b.trot : b.idle;
    g.start(true, 1, g.from, g.to);
  }

  private dispose(): void {
    const b = this.built;
    if (!b) return;
    b.disposed = true;
    if (b.inst) for (const g of b.inst.animationGroups) g.dispose();
    b.root.dispose(false, true);
    b.inst?.skeletons.forEach((s) => s.dispose());
    this.built = null;
  }

  private build(id: string, look: MountLook): Built {
    const root = new TransformNode('mountRoot', this.scene);
    const b: Built = { id, root, inst: null, idle: null, trot: null, moving: null, disposed: false };
    void mountModel(this.scene)
      .then((model) => {
        if (b.disposed) return;
        const inner = new TransformNode('mountInner', this.scene);
        inner.parent = root;
        // El modelo mira a +Z; el juego orienta a sus personajes por +X.
        inner.rotation.y = Math.PI / 2;
        inner.scaling.setAll(look.scale);
        const inst = model.instantiateModelsToScene((n) => `mount:${n}`, true, { doNotInstantiate: true });
        for (const g of inst.animationGroups) g.stop();
        for (const n of inst.rootNodes) n.parent = inner;
        b.inst = inst;
        const meshes = inner.getChildMeshes(false);
        for (const m of meshes) {
          m.isPickable = false;
          this.tint(m.material, look);
        }
        this.shadows.addCasters(meshes);
        b.idle = inst.animationGroups.find((g) => g.name.endsWith('Reposo')) ?? null;
        b.trot = inst.animationGroups.find((g) => g.name.endsWith('Trotar')) ?? null;
      })
      .catch((err: unknown) => console.error('[modelos] no se pudo cargar assets/models/montura.glb', err));
    return b;
  }

  private tint(material: Material | null, look: MountLook): void {
    const m = material as (Material & { albedoColor?: Color3 }) | null;
    if (!m?.albedoColor) return;
    if (m.name.endsWith('coat')) m.albedoColor = Color3.FromHexString(look.color).toLinearSpace();
    else if (m.name.endsWith('dark')) m.albedoColor = Color3.FromHexString(look.accent).toLinearSpace();
  }
}
