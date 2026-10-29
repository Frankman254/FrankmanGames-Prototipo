// Traduce el estado de `World` a la escena Babylon: terreno, jugador y marcadores.
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
import type { World } from '../sim/world';
import type { Overworld } from '../world/overworld';
import type { HeightField } from '../world/terrain';
import { CameraRig } from './cameraRig';
import { ChaserView } from './chaserView';
import { solidMaterial } from './materials';
import { buildTerrain } from './terrainView';
import { buildVegetation, type VegetationView } from './vegetationView';

export class ArenaView {
  readonly engine: Engine;
  readonly scene: Scene;
  readonly rig: CameraRig;
  readonly ground: Mesh;
  readonly heights: HeightField;
  readonly vegetation: VegetationView;
  private readonly playerMesh: Mesh;
  private readonly marker: Mesh;
  private readonly tmp = new Vector3();
  readonly chasers: ChaserView;
  private pathLine: LinesMesh | null = null;
  private drawnPath: unknown = null;
  private drawnPathLen = 0;
  /** Dibuja el camino del jugador (depuración, tecla L). */
  showPath = true;

  constructor(canvas: HTMLCanvasElement, data: GameData, overworld: Overworld) {
    this.engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: false }, true);
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.106, 0.114, 0.133, 1);
    this.scene.skipPointerMovePicking = true; // el picking se hace a mano, sólo cuando hace falta

    new HemisphericLight('sky', new Vector3(0.2, 1, 0.1), this.scene).intensity = 0.75;
    new DirectionalLight('sun', new Vector3(-0.4, -1, 0.3), this.scene).intensity = 0.55;

    this.rig = new CameraRig(this.scene, data.camera);

    const z = data.zone;
    this.heights = overworld.heights;
    this.ground = buildTerrain(this.scene, overworld.def, overworld.heights).mesh;
    this.vegetation = buildVegetation(this.scene, overworld);

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

  /**
   * Rayo del cursor contra el campo de alturas del terreno. Es geometría del
   * render, independiente de la rejilla de colisión de la simulación.
   */
  pickGround(screenX: number, screenY: number): { x: number; y: number } | null {
    const ray = this.scene.createPickingRay(screenX, screenY, Matrix.Identity(), this.rig.camera);
    const o = ray.origin;
    const d = ray.direction;
    const hit = this.heights.raycast(o.x, o.y, o.z, d.x, d.y, d.z, this.rig.camera.maxZ);
    return hit ? { x: hit.x, y: hit.z } : null;
  }

  private syncPathLine(world: World, x: number, z: number): void {
    const path = world.player.path;
    if (!this.showPath || path.length === 0) {
      if (this.pathLine) this.pathLine.isVisible = false;
      return;
    }
    if (path !== this.drawnPath || path.length !== this.drawnPathLen || !this.pathLine) {
      this.pathLine?.dispose();
      const pts = this.drapedLine([{ x, y: z }, ...path]);
      this.pathLine = MeshBuilder.CreateLines('pathLine', { points: pts }, this.scene);
      this.pathLine.color = new Color3(0.95, 0.85, 0.3);
      this.pathLine.isPickable = false;
      this.drawnPath = path;
      this.drawnPathLen = path.length;
    }
    this.pathLine.isVisible = true;
  }

  /** Polilínea pegada al terreno (un punto cada metro). */
  private drapedLine(points: ReadonlyArray<{ x: number; y: number }>): Vector3[] {
    const out: Vector3[] = [];
    for (let i = 0; i + 1 < points.length; i++) {
      const a = points[i]!;
      const b = points[i + 1]!;
      const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y)));
      for (let k = 0; k < n; k++) {
        const px = a.x + ((b.x - a.x) * k) / n;
        const pz = a.y + ((b.y - a.y) * k) / n;
        out.push(new Vector3(px, this.heights.sample(px, pz) + 0.08, pz));
      }
    }
    const last = points[points.length - 1]!;
    out.push(new Vector3(last.x, this.heights.sample(last.x, last.y) + 0.08, last.y));
    return out;
  }

  sync(world: World, alpha: number, frameSeconds: number): void {
    const p = world.player;
    const x = p.prevPos.x + (p.pos.x - p.prevPos.x) * alpha;
    const z = p.prevPos.y + (p.pos.y - p.prevPos.y) * alpha;
    const y = this.heights.sample(x, z);
    this.playerMesh.position.set(x, y + 0.9, z);
    this.playerMesh.rotation.y = -p.facing;
    if (p.moveTarget) {
      this.marker.isVisible = true;
      this.marker.position.set(p.moveTarget.x, this.heights.sample(p.moveTarget.x, p.moveTarget.y) + 0.05, p.moveTarget.y);
    } else {
      this.marker.isVisible = false;
    }
    this.syncPathLine(world, x, z);
    this.vegetation.update(frameSeconds);
    this.chasers.sync(world.chasers.list, alpha, this.heights);
    this.tmp.set(x, y, z);
    this.rig.update(this.tmp, frameSeconds);
  }

  render(): void {
    this.scene.render();
  }
}
