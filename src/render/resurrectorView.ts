// Alzadores modelados en Blender (scripts/blender/objetos.py); visibles durante el recorrido espectral.
import { Color3, StandardMaterial, TransformNode, type Scene } from '@babylonjs/core';
import { staticMesh } from './staticModels';
import type { World } from '../sim/world';

export class ResurrectorView {
  private readonly roots: TransformNode[] = [];
  private readonly material: StandardMaterial;

  constructor(private readonly scene: Scene, private readonly ground: { sample(x: number, y: number): number }) {
    this.material = new StandardMaterial('alzador-luz', scene);
    this.material.diffuseColor = new Color3(0.3, 0.85, 1);
    this.material.emissiveColor = new Color3(0.2, 0.6, 0.85);
  }

  sync(world: World): void {
    const altars = world.content.spectral.resurrectors;
    if (this.roots.length === 0) for (const altar of altars) {
      const root = new TransformNode(altar.id, this.scene);
      const mesh = staticMesh(this.scene, 'a_alzador', altar.id + '-estela');
      mesh.parent = root;
      mesh.material = this.material;
      mesh.isPickable = false;
      root.position.set(altar.x, this.ground.sample(altar.x, altar.y), altar.y);
      this.roots.push(root);
    }
    for (const root of this.roots) root.setEnabled(world.character.spectral.active && !world.interior);
  }
}
