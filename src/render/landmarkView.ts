// Construcciones grandes modeladas fuera del motor (scripts/blender/) y colocadas con
// los props `landmark` de data/vegetation.json. Se cargan aparte para no frenar el arranque.
import '@babylonjs/loaders/glTF';
import { LoadAssetContainerAsync, TransformNode, type AbstractMesh, type Scene } from '@babylonjs/core';

const MODELS: Record<string, string> = import.meta.glob('/assets/models/*.glb', { query: '?url', import: 'default', eager: true });

export interface LandmarkPlacement {
  model: string;
  x: number;
  y: number;
  rotDeg: number;
}

export class LandmarkView {
  private readonly roots: TransformNode[] = [];

  constructor(
    private readonly scene: Scene,
    private readonly ground: { sample(x: number, z: number): number },
    private readonly shadows: { addCasters(meshes: readonly AbstractMesh[]): void },
  ) {}

  async add(list: readonly LandmarkPlacement[]): Promise<void> {
    await Promise.all(list.map(async (p) => {
      const url = MODELS[`/assets/models/${p.model}.glb`];
      if (!url) {
        console.warn(`[modelos] falta assets/models/${p.model}.glb`);
        return;
      }
      const container = await LoadAssetContainerAsync(url, this.scene, { pluginExtension: '.glb' });
      container.addAllToScene();
      const root = new TransformNode(`landmark:${p.model}`, this.scene);
      for (const n of container.rootNodes) n.parent = root;
      root.position.set(p.x, this.ground.sample(p.x, p.y), p.y);
      root.rotation.y = (p.rotDeg * Math.PI) / 180;
      for (const m of container.meshes) m.isPickable = false;
      this.shadows.addCasters(container.meshes.filter((m) => m.getTotalVertices() > 0));
      this.roots.push(root);
    }));
  }

  setVisible(on: boolean): void {
    for (const r of this.roots) r.setEnabled(on);
  }
}
