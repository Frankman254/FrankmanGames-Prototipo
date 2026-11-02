// Alzadores originales de geometría procedural; visibles durante el recorrido espectral.
import { Color3, MeshBuilder, StandardMaterial, TransformNode, type Scene } from '@babylonjs/core';
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
      const pillar = MeshBuilder.CreateCylinder(altar.id + '-pilar', { height: 2.5, diameter: 0.5, tessellation: 8 }, this.scene);
      pillar.parent = root;
      pillar.position.y = 1.25;
      const ring = MeshBuilder.CreateTorus(altar.id + '-anillo', { diameter: 2, thickness: 0.12, tessellation: 24 }, this.scene);
      ring.parent = root;
      ring.position.y = 0.15;
      for (const mesh of [pillar, ring]) { mesh.material = this.material; mesh.isPickable = false; }
      root.position.set(altar.x, this.ground.sample(altar.x, altar.y), altar.y);
      this.roots.push(root);
    }
    for (const root of this.roots) root.setEnabled(world.character.spectral.active && !world.interior);
  }
}
