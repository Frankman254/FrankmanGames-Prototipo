// El mar: un plano que acompaña al jugador. La costa la dibuja el terreno al hundirse.
import { Color3, MeshBuilder, StandardMaterial, type Mesh, type Scene, type TransformNode } from '@babylonjs/core';

const SIDE = 1600;
const SNAP = 32;

export class SeaView {
  private readonly mesh: Mesh;

  constructor(scene: Scene, level: number, parent: TransformNode) {
    this.mesh = MeshBuilder.CreateGround('sea', { width: SIDE, height: SIDE, subdivisions: 1 }, scene);
    const m = new StandardMaterial('seaMat', scene);
    m.diffuseColor = new Color3(0.07, 0.3, 0.42);
    m.specularColor = new Color3(0.35, 0.4, 0.42);
    m.specularPower = 64;
    m.alpha = 0.93;
    this.mesh.material = m;
    this.mesh.position.y = level;
    this.mesh.parent = parent;
    this.mesh.isPickable = false;
  }

  update(x: number, z: number): void {
    this.mesh.position.x = Math.round(x / SNAP) * SNAP;
    this.mesh.position.z = Math.round(z / SNAP) * SNAP;
  }
}
