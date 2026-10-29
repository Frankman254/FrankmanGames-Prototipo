// Traduce el estado de `World` a la escena Babylon: terreno, jugador y marcadores.
import {
  Color3,
  Color4,
  Engine,
  Matrix,
  MeshBuilder,
  Scene,
  Vector3,
  TransformNode,
  type LinesMesh,
  type StandardMaterial,
  type Mesh,
} from '@babylonjs/core';
import type { GameData } from '../data';
import type { GameEvent } from '../sim/events';
import type { World } from '../sim/world';
import type { Overworld } from '../world/overworld';
import type { HeightField } from '../world/terrain';
import { CameraRig } from './cameraRig';
import { ChaserView } from './chaserView';
import { EnemyView, flatMaterial, shapeMesh } from './enemyView';
import { solidMaterial } from './materials';
import { Atmosphere } from './atmosphere';
import { buildTerrain } from './terrainView';
import { buildVegetation, type VegetationView } from './vegetationView';

export class ArenaView {
  readonly engine: Engine;
  readonly scene: Scene;
  readonly rig: CameraRig;
  readonly ground: Mesh;
  readonly heights: HeightField;
  readonly vegetation: VegetationView;
  readonly atmosphere: Atmosphere;
  private readonly playerMesh: Mesh;
  private readonly playerMat: StandardMaterial;
  private readonly castMat: StandardMaterial;
  /** Áreas de habilidad del jugador recién lanzadas (se ven un instante). */
  private castFlashes: Array<{ node: TransformNode; ttl: number }> = [];
  private readonly marker: Mesh;
  private readonly tmp = new Vector3();
  readonly chasers: ChaserView;
  readonly enemies: EnemyView;
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

    this.rig = new CameraRig(this.scene, data.camera);

    const z = data.zone;
    this.heights = overworld.heights;
    this.ground = buildTerrain(this.scene, overworld.def, overworld.heights).mesh;
    this.vegetation = buildVegetation(this.scene, overworld);

    this.playerMesh = MeshBuilder.CreateCapsule('player', { radius: z.playerRadius, height: 1.8, tessellation: 12 }, this.scene);
    this.playerMat = solidMaterial(this.scene, 'playerMat', [0.25, 0.55, 0.95]);
    this.playerMesh.material = this.playerMat;
    this.castMat = flatMaterial(this.scene, 'castMat', [0.4, 0.8, 1], 0.4);
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
    this.enemies = new EnemyView(this.scene);
    this.enemies.ground = this.heights;
    this.atmosphere = new Atmosphere(this.scene, overworld.lighting, this.vegetation.lamps, this.vegetation.lanternMaterial);
    this.atmosphere.addCasters([...this.vegetation.casters, this.playerMesh]);
    this.rig.ground = this.heights;
    this.rig.blockers = this.vegetation.solids;
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

  /** Picking de la malla de un enemigo bajo el cursor (no usa la rejilla). */
  pickEnemy(screenX: number, screenY: number): number | null {
    const hit = this.scene.pick(screenX, screenY, (m) => m.isPickable && m.isEnabled() && EnemyView.enemyIdOf(m) !== null, false, this.rig.camera);
    return hit?.hit ? EnemyView.enemyIdOf(hit.pickedMesh) : null;
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

  /** Respuesta visual a los sucesos del último fotograma. */
  handleEvents(world: World, events: readonly GameEvent[]): void {
    for (const e of events) {
      if (e.type === 'damage' && !e.toPlayer) this.enemies.flashHit(e.targetId);
      if (e.type === 'cast') {
        const def = world.ability(e.ability);
        if (def.area.type === 'single') continue;
        const p = world.player;
        const node = new TransformNode('castFlash', this.scene);
        node.position.set(p.pos.x, this.heights.sample(p.pos.x, p.pos.y) + 0.06, p.pos.y);
        const m = shapeMesh(this.scene, 'castFlashMesh', def.area);
        m.parent = node;
        m.material = this.castMat;
        node.rotation.y = def.area.type === 'cone' ? -(p.facing - (def.area.angleDeg * Math.PI) / 360) : -p.facing;
        this.castFlashes.push({ node, ttl: 0.18 });
      }
    }
  }

  /** Quita todo lo que dependa de una partida (reinicio). */
  resetRun(): void {
    this.enemies.dispose();
    for (const f of this.castFlashes) f.node.dispose(false, false);
    this.castFlashes = [];
  }

  sync(world: World, alpha: number, frameSeconds: number): void {
    const p = world.player;
    const x = p.prevPos.x + (p.pos.x - p.prevPos.x) * alpha;
    const z = p.prevPos.y + (p.pos.y - p.prevPos.y) * alpha;
    const y = this.heights.sample(x, z);
    this.playerMesh.position.set(x, y + 0.9, z);
    this.playerMesh.rotation.y = -p.facing;
    // Tinte claro mientras es invulnerable (evasión); oscuro si ha caído.
    if (!p.alive) this.playerMat.emissiveColor.set(0, 0, 0);
    else if (p.invulnerable > 0) this.playerMat.emissiveColor.set(0.35, 0.5, 0.6);
    else this.playerMat.emissiveColor.set(0, 0, 0);
    this.playerMat.diffuseColor.set(p.alive ? 0.25 : 0.1, p.alive ? 0.55 : 0.15, p.alive ? 0.95 : 0.25);
    this.playerMesh.rotation.z = p.alive ? 0 : Math.PI / 2;
    for (const f of this.castFlashes) f.ttl -= frameSeconds;
    this.castFlashes = this.castFlashes.filter((f) => {
      if (f.ttl > 0) return true;
      f.node.dispose(false, false);
      return false;
    });
    if (p.moveTarget) {
      this.marker.isVisible = true;
      this.marker.position.set(p.moveTarget.x, this.heights.sample(p.moveTarget.x, p.moveTarget.y) + 0.05, p.moveTarget.y);
    } else {
      this.marker.isVisible = false;
    }
    this.syncPathLine(world, x, z);
    this.vegetation.update(frameSeconds);
    this.chasers.sync(world.chasers.list, alpha, this.heights);
    this.enemies.sync(world.enemies.list, alpha, frameSeconds);
    this.tmp.set(x, y, z);
    this.atmosphere.update(frameSeconds, this.tmp);
    this.rig.update(this.tmp, frameSeconds);
  }

  render(): void {
    this.scene.render();
  }
}
