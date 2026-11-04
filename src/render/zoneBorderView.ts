// Borde en el suelo de la casilla de la cámara estática, pegado al relieve.
import { Color3, MeshBuilder, StandardMaterial, Vector3, type Mesh, type Scene } from '@babylonjs/core';
import type { ZoneCell } from '../camera';

const WIDTH = 0.28;
const LIFT = 0.12;

export class ZoneBorderView {
  private mesh: Mesh | null = null;
  private shown = '';
  private readonly mat: StandardMaterial;

  constructor(private readonly scene: Scene, private readonly ground: { sample(x: number, z: number): number }) {
    this.mat = new StandardMaterial('zoneBorder', scene);
    this.mat.diffuseColor = Color3.Black();
    this.mat.specularColor = Color3.Black();
    this.mat.emissiveColor = new Color3(0.95, 0.76, 0.3);
    this.mat.alpha = 0.7;
    this.mat.backFaceCulling = false;
  }

  sync(cell: ZoneCell | null): void {
    const key = cell ? `${cell.x}:${cell.z}:${cell.size}` : '';
    if (key === this.shown) return;
    this.shown = key;
    this.mesh?.dispose();
    this.mesh = null;
    if (!cell) return;
    const x0 = cell.x * cell.size, z0 = cell.z * cell.size, s = cell.size;
    const inner: Vector3[] = [], outer: Vector3[] = [];
    const steps = Math.ceil(s);
    const add = (px: number, pz: number, ox: number, oz: number): void => {
      const y = this.ground.sample(px, pz) + LIFT;
      inner.push(new Vector3(px, y, pz));
      outer.push(new Vector3(px + ox * WIDTH, y, pz + oz * WIDTH));
    };
    for (let i = 0; i < steps; i++) add(x0 + (s * i) / steps, z0, i === 0 ? -1 : 0, -1);
    for (let i = 0; i < steps; i++) add(x0 + s, z0 + (s * i) / steps, 1, i === 0 ? -1 : 0);
    for (let i = 0; i < steps; i++) add(x0 + s - (s * i) / steps, z0 + s, i === 0 ? 1 : 0, 1);
    for (let i = 0; i < steps; i++) add(x0, z0 + s - (s * i) / steps, -1, i === 0 ? 1 : 0);
    inner.push(inner[0]!.clone());
    outer.push(outer[0]!.clone());
    this.mesh = MeshBuilder.CreateRibbon('zoneBorder', { pathArray: [inner, outer] }, this.scene);
    this.mesh.material = this.mat;
    this.mesh.isPickable = false;
  }
}
