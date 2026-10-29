// Traduce el estado de `World` a una escena Babylon de primitivas grises.
import {
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HemisphericLight,
  Matrix,
  MeshBuilder,
  Scene,
  Vector3,
  type LinesMesh,
  type Mesh,
} from '@babylonjs/core';
import type { GameData } from '../data';
import type { RectObstacle } from '../sim/navGrid';
import type { World } from '../sim/world';
import { CameraRig } from './cameraRig';
import { ChaserView } from './chaserView';
import { solidMaterial } from './materials';

const WALL_HEIGHT = 2;

export class ArenaView {
  readonly engine: Engine;
  readonly scene: Scene;
  readonly rig: CameraRig;
  readonly ground: Mesh;
  private readonly playerMesh: Mesh;
  private readonly marker: Mesh;
  private readonly tmp = new Vector3();
  readonly chasers: ChaserView;
  private pathLine: LinesMesh | null = null;
  private drawnPath: unknown = null;
  private drawnPathLen = 0;
  /** Dibuja el camino del jugador (depuración, tecla L). */
  showPath = true;

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
    this.buildObstacles(z.obstacles);

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

    this.chasers = new ChaserView(this.scene, data.loadTest.radius);
  }

  private buildGridLines(w: number, d: number): void {
    const lines: Vector3[][] = [];
    for (let x = 0; x <= w; x += 4) lines.push([new Vector3(x, 0.01, 0), new Vector3(x, 0.01, d)]);
    for (let z = 0; z <= d; z += 4) lines.push([new Vector3(0, 0.01, z), new Vector3(w, 0.01, z)]);
    const grid = MeshBuilder.CreateLineSystem('grid', { lines }, this.scene);
    grid.color = new Color3(0.4, 0.41, 0.44);
    grid.isPickable = false;
  }

  private buildObstacles(obstacles: readonly RectObstacle[]): void {
    const mat = solidMaterial(this.scene, 'wallMat', [0.55, 0.52, 0.48]);
    obstacles.forEach((o, i) => {
      const b = MeshBuilder.CreateBox(`wall${i}`, { width: o.w, depth: o.d, height: WALL_HEIGHT }, this.scene);
      b.position.set(o.x, WALL_HEIGHT / 2, o.y);
      b.material = mat;
      b.isPickable = false;
      b.freezeWorldMatrix();
    });
  }

  /**
   * Raycast del cursor contra el plano del suelo (y = 0). Es geometría del
   * render, independiente de la rejilla de colisión de la simulación.
   */
  pickGround(screenX: number, screenY: number): { x: number; y: number } | null {
    const ray = this.scene.createPickingRay(screenX, screenY, Matrix.Identity(), this.rig.camera);
    if (ray.direction.y > -1e-6) return null;
    const t = -ray.origin.y / ray.direction.y;
    return { x: ray.origin.x + ray.direction.x * t, y: ray.origin.z + ray.direction.z * t };
  }

  private syncPathLine(world: World, x: number, z: number): void {
    const path = world.player.path;
    if (!this.showPath || path.length === 0) {
      if (this.pathLine) this.pathLine.isVisible = false;
      return;
    }
    if (path !== this.drawnPath || path.length !== this.drawnPathLen || !this.pathLine) {
      this.pathLine?.dispose();
      const pts = [new Vector3(x, 0.05, z), ...path.map((p) => new Vector3(p.x, 0.05, p.y))];
      this.pathLine = MeshBuilder.CreateLines('pathLine', { points: pts }, this.scene);
      this.pathLine.color = new Color3(0.95, 0.85, 0.3);
      this.pathLine.isPickable = false;
      this.drawnPath = path;
      this.drawnPathLen = path.length;
    }
    this.pathLine.isVisible = true;
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
    this.syncPathLine(world, x, z);
    this.chasers.sync(world.chasers.list, alpha);
    this.tmp.set(x, 0, z);
    this.rig.update(this.tmp, frameSeconds);
  }

  render(): void {
    this.scene.render();
  }
}
