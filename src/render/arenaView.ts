// Traduce el estado de `World` a una escena Babylon de primitivas grises.
import {
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HemisphericLight,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
  type AbstractMesh,
  type Mesh,
} from '@babylonjs/core';
import type { GameData } from '../data';
import type { World } from '../sim/world';
import { CameraRig } from './cameraRig';

export function solidMaterial(scene: Scene, name: string, rgb: [number, number, number]): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = new Color3(...rgb);
  m.specularColor = new Color3(0.05, 0.05, 0.05);
  return m;
}

export class ArenaView {
  readonly engine: Engine;
  readonly scene: Scene;
  readonly rig: CameraRig;
  readonly ground: Mesh;
  private readonly playerMesh: Mesh;
  private readonly marker: Mesh;
  private readonly tmp = new Vector3();

  constructor(canvas: HTMLCanvasElement, data: GameData) {
    this.engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: false }, true);
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.106, 0.114, 0.133, 1);
    this.scene.skipPointerMovePicking = true; // el picking se hace a mano, sólo cuando hace falta

    new HemisphericLight('sky', new Vector3(0.2, 1, 0.1), this.scene).intensity = 0.75;
    new DirectionalLight('sun', new Vector3(-0.4, -1, 0.3), this.scene).intensity = 0.55;

    this.rig = new CameraRig(this.scene, data.camera);

    const z = data.zone;
    this.ground = MeshBuilder.CreateGround('ground', { width: z.width, height: z.depth }, this.scene);
    this.ground.position.set(z.width / 2, 0, z.depth / 2);
    this.ground.material = solidMaterial(this.scene, 'groundMat', [0.32, 0.33, 0.35]);
    this.ground.isPickable = true;
    this.buildGridLines(z.width, z.depth);

    this.playerMesh = MeshBuilder.CreateCapsule('player', { radius: z.playerRadius, height: 1.8, tessellation: 12 }, this.scene);
    this.playerMesh.material = solidMaterial(this.scene, 'playerMat', [0.25, 0.55, 0.95]);
    this.playerMesh.isPickable = false;
    const nose = MeshBuilder.CreateBox('playerNose', { width: 0.3, height: 0.2, depth: 0.3 }, this.scene);
    nose.parent = this.playerMesh;
    nose.position.set(z.playerRadius, 0.5, 0);
    nose.material = solidMaterial(this.scene, 'noseMat', [0.9, 0.9, 0.95]);
    nose.isPickable = false;

    this.marker = MeshBuilder.CreateTorus('moveMarker', { diameter: 0.8, thickness: 0.06, tessellation: 24 }, this.scene);
    this.marker.material = solidMaterial(this.scene, 'markerMat', [0.95, 0.85, 0.3]);
    this.marker.isPickable = false;
    this.marker.isVisible = false;
  }

  private buildGridLines(w: number, d: number): void {
    const lines: Vector3[][] = [];
    for (let x = 0; x <= w; x += 4) lines.push([new Vector3(x, 0.01, 0), new Vector3(x, 0.01, d)]);
    for (let z = 0; z <= d; z += 4) lines.push([new Vector3(0, 0.01, z), new Vector3(w, 0.01, z)]);
    const grid = MeshBuilder.CreateLineSystem('grid', { lines }, this.scene);
    grid.color = new Color3(0.4, 0.41, 0.44);
    grid.isPickable = false;
  }

  /** Raycast del cursor contra el suelo. Devuelve el punto en el plano XZ. */
  pickGround(screenX: number, screenY: number): { x: number; y: number } | null {
    const hit = this.scene.pick(screenX, screenY, (m: AbstractMesh) => m === this.ground);
    return hit?.hit && hit.pickedPoint ? { x: hit.pickedPoint.x, y: hit.pickedPoint.z } : null;
  }

  sync(world: World, alpha: number, frameSeconds: number): void {
    const p = world.player;
    const x = p.prevPos.x + (p.pos.x - p.prevPos.x) * alpha;
    const z = p.prevPos.y + (p.pos.y - p.prevPos.y) * alpha;
    this.playerMesh.position.set(x, 0.9, z);
    this.playerMesh.rotation.y = -p.facing;
    if (p.moveTarget) {
      this.marker.isVisible = true;
      this.marker.position.set(p.moveTarget.x, 0.03, p.moveTarget.y);
    } else {
      this.marker.isVisible = false;
    }
    this.tmp.set(x, 0, z);
    this.rig.update(this.tmp, frameSeconds);
  }

  render(): void {
    this.scene.render();
  }
}
