// La forma espectral del jugador: un fantasma de sábana con ojos y bracitos, que
// flota y ondea. Es otro cuerpo, no el personaje teñido. Hecho con primitivas.
import { Color3, Mesh, MeshBuilder, StandardMaterial, TransformNode, Vector3, VertexBuffer, VertexData, type Scene } from '@babylonjs/core';

const HOVER = 0.22;

export class GhostBody {
  readonly root: TransformNode;
  private readonly sway: TransformNode;
  private time = 0;

  constructor(scene: Scene) {
    this.root = new TransformNode('ghost', scene);
    this.sway = new TransformNode('ghostSway', scene);
    this.sway.parent = this.root;
    const sheet = new StandardMaterial('ghostSheet', scene);
    sheet.diffuseColor = new Color3(0.78, 0.92, 1);
    sheet.emissiveColor = new Color3(0.42, 0.62, 0.8);
    sheet.specularColor = Color3.Black();
    sheet.alpha = 0.78;
    sheet.needDepthPrePass = true;
    const dark = new StandardMaterial('ghostFace', scene);
    dark.diffuseColor = new Color3(0.03, 0.05, 0.1);
    dark.specularColor = Color3.Black();

    const body = wavyLathe(scene);
    body.material = sheet;
    this.add(body);
    // El personaje mira hacia +X.
    for (const side of [-1, 1]) {
      const arm = MeshBuilder.CreateSphere('ghostArm', { diameter: 0.3, segments: 8 }, scene);
      arm.scaling.set(0.8, 1.5, 0.8);
      arm.position.set(0.12, 1.02, side * 0.46);
      arm.rotation.x = side * 0.5;
      arm.material = sheet;
      this.add(arm);
      const eye = MeshBuilder.CreateSphere('ghostEye', { diameter: 0.15, segments: 8 }, scene);
      eye.scaling.set(0.5, 1.35, 1);
      eye.position.set(0.33, 1.5, side * 0.13);
      eye.material = dark;
      this.add(eye);
    }
    const mouth = MeshBuilder.CreateSphere('ghostMouth', { diameter: 0.15, segments: 8 }, scene);
    mouth.scaling.set(0.45, 1, 0.9);
    mouth.position.set(0.37, 1.26, 0);
    mouth.material = dark;
    this.add(mouth);
    this.root.setEnabled(false);
  }

  private add(m: Mesh): void {
    m.parent = this.sway;
    m.isPickable = false;
  }

  /** Coloca, flota y ondea; más inclinado hacia delante si se mueve. */
  sync(x: number, y: number, z: number, facing: number, moving: boolean, dt: number): void {
    this.time += dt;
    const t = this.time;
    this.root.position.set(x, y + HOVER + Math.sin(t * 2.3) * 0.07, z);
    this.root.rotation.y = -facing;
    this.sway.rotation.z = (moving ? -0.2 : 0) + Math.sin(t * 1.7) * 0.03;
    this.sway.rotation.x = Math.sin(t * 2.9) * 0.04;
    const breath = 1 + Math.sin(t * 3.1) * 0.025;
    this.sway.scaling.set(breath, 2 - breath, breath);
  }
}

/** Sábana: de la cabeza redondeada al borde inferior, ondulado. */
function wavyLathe(scene: Scene): Mesh {
  const profile = [
    [0.56, 0.02], [0.5, 0.35], [0.43, 0.8], [0.4, 1.2], [0.37, 1.45], [0.29, 1.66], [0.16, 1.8], [0, 1.85],
  ].map(([r, y]) => new Vector3(r, y, 0));
  const mesh = MeshBuilder.CreateLathe('ghostBody', { shape: profile, tessellation: 28, sideOrientation: Mesh.DOUBLESIDE, updatable: true }, scene);
  const positions = mesh.getVerticesData(VertexBuffer.PositionKind)!;
  for (let i = 0; i < positions.length; i += 3) {
    const y = positions[i + 1]!;
    if (y >= 0.5) continue;
    const a = Math.atan2(positions[i + 2]!, positions[i]!);
    const k = 1 - y / 0.5;
    positions[i + 1] = y + Math.cos(a * 7) * 0.08 * k;
    const push = 1 + Math.sin(a * 7) * 0.09 * k;
    positions[i] = positions[i]! * push;
    positions[i + 2] = positions[i + 2]! * push;
  }
  mesh.updateVerticesData(VertexBuffer.PositionKind, positions);
  const normals: number[] = [];
  VertexData.ComputeNormals(positions, mesh.getIndices(), normals);
  mesh.updateVerticesData(VertexBuffer.NormalKind, normals);
  return mesh;
}
