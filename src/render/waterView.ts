// Estanques y pesca en pantalla (Slice 05): superficie de agua con brillo que
// ondula, corcho con sedal hasta la mano del jugador, temblor en el amago,
// hundimiento y anillos al picar, y salpicadura al sacar el pez.
import {
  Color3,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Vector3,
  type LinesMesh,
  type Scene,
} from '@babylonjs/core';
import type { GameEvent } from '../sim/events';
import type { World } from '../sim/world';
import { pondWaterLevel, type HeightField, type TerrainDef } from '../world/terrain';

interface Ring {
  mesh: Mesh;
  ttl: number;
}

export class WaterView {
  private readonly surfaces: Mesh[] = [];
  private readonly waterMat: StandardMaterial;
  private readonly bobber: Mesh;
  private line: LinesMesh | null = null;
  private readonly rings: Ring[] = [];
  private readonly ringMat: StandardMaterial;
  private time = 0;
  /** Temblor del amago y de la picada (segundos que quedan). */
  private twitch = 0;
  private waterY = 0;

  constructor(private readonly scene: Scene, private readonly terrain: TerrainDef, private readonly ground: HeightField) {
    this.waterMat = new StandardMaterial('waterMat', scene);
    this.waterMat.diffuseColor = new Color3(0.16, 0.36, 0.42);
    this.waterMat.specularColor = new Color3(0.9, 0.95, 1);
    this.waterMat.specularPower = 96;
    this.waterMat.emissiveColor = new Color3(0.02, 0.06, 0.08);
    this.waterMat.alpha = 0.82;
    for (const p of terrain.ponds) {
      const disc = MeshBuilder.CreateDisc(`pond-${p.x}-${p.y}`, { radius: p.radius + p.shore * 0.6, tessellation: 64 }, scene);
      disc.rotation.x = Math.PI / 2;
      disc.position.set(p.x, pondWaterLevel(terrain, p), p.y);
      disc.material = this.waterMat;
      disc.isPickable = false;
      this.surfaces.push(disc);
    }

    const bobberMat = new StandardMaterial('bobberMat', scene);
    bobberMat.diffuseColor = new Color3(0.9, 0.2, 0.15);
    bobberMat.emissiveColor = new Color3(0.35, 0.06, 0.04);
    this.bobber = MeshBuilder.CreateSphere('bobber', { diameter: 0.22, segments: 8 }, scene);
    const cap = MeshBuilder.CreateCylinder('bobberCap', { diameter: 0.08, height: 0.18 }, scene);
    cap.position.y = 0.12;
    cap.parent = this.bobber;
    this.bobber.material = bobberMat;
    cap.material = bobberMat;
    this.bobber.isPickable = false;
    cap.isPickable = false;
    this.bobber.setEnabled(false);

    this.ringMat = new StandardMaterial('ringMat', scene);
    this.ringMat.diffuseColor = new Color3(0.85, 0.95, 1);
    this.ringMat.emissiveColor = new Color3(0.4, 0.5, 0.55);
    this.ringMat.alpha = 0.6;
  }

  handleEvents(events: readonly GameEvent[]): void {
    for (const e of events) {
      if (e.type === 'fishCast') this.splash(e.x, e.y, 0.5);
      else if (e.type === 'fishNibble') this.twitch = 0.35;
      else if (e.type === 'fishBite') {
        this.twitch = 1;
        const b = this.bobber.position;
        this.splash(b.x, b.z, 0.9);
      } else if (e.type === 'fishCatch' || e.type === 'fishEscape') {
        const b = this.bobber.position;
        this.splash(b.x, b.z, e.type === 'fishCatch' ? 1.4 : 0.7);
      }
    }
  }

  /** `hand`: punto de la caña (aprox. la mano del jugador), en coordenadas del mundo. */
  sync(world: World, hand: Vector3, dt: number): void {
    this.time += dt;
    // Brillo que ondula: la especular sube y baja muy despacio.
    this.waterMat.specularPower = 80 + Math.sin(this.time * 0.9) * 24;
    for (const r of this.rings) {
      if (r.ttl <= 0) continue;
      r.ttl -= dt;
      const k = 1 - Math.max(0, r.ttl) / 1.2;
      r.mesh.scaling.setAll(0.3 + k * 2.4);
      r.mesh.visibility = 1 - k;
      if (r.ttl <= 0) r.mesh.setEnabled(false);
    }

    const f = world.fishing;
    if (!f) {
      this.bobber.setEnabled(false);
      this.line?.setEnabled(false);
      this.twitch = 0;
      return;
    }
    const spot = world.content.fishing.spots[f.spotId];
    const pond = spot ? this.terrain.ponds.find((p) => p.x === spot.x && p.y === spot.y) : undefined;
    this.waterY = pond ? pondWaterLevel(this.terrain, pond) : this.ground.sample(f.bobber.x, f.bobber.y);
    this.twitch = Math.max(0, this.twitch - dt);
    // En reposo flota y cabecea; al picar se hunde y tiembla.
    const bob = Math.sin(this.time * 2.2) * 0.025;
    const shake = this.twitch > 0 ? Math.sin(this.time * 55) * 0.05 * this.twitch : 0;
    const sink = f.state === 'bite' ? -0.12 : 0;
    this.bobber.setEnabled(true);
    this.bobber.position.set(f.bobber.x + shake, this.waterY + 0.04 + bob + sink, f.bobber.y);

    const tip = new Vector3(hand.x, hand.y + 1.1, hand.z);
    const mid = Vector3.Lerp(tip, this.bobber.position, 0.5);
    mid.y -= 0.6; // el sedal cuelga
    const pts = [tip, Vector3.Lerp(tip, mid, 0.5), mid, Vector3.Lerp(mid, this.bobber.position, 0.5), this.bobber.position.clone()];
    if (!this.line) {
      this.line = MeshBuilder.CreateLines('fishLine', { points: pts, updatable: true }, this.scene);
      this.line.color = new Color3(0.85, 0.85, 0.8);
      this.line.isPickable = false;
    } else {
      MeshBuilder.CreateLines('fishLine', { points: pts, instance: this.line });
    }
    this.line.setEnabled(true);
  }

  private splash(x: number, z: number, size: number): void {
    let r = this.rings.find((q) => q.ttl <= 0);
    if (!r) {
      const mesh = MeshBuilder.CreateTorus(`ring${this.rings.length}`, { diameter: 1, thickness: 0.04, tessellation: 32 }, this.scene);
      mesh.material = this.ringMat;
      mesh.isPickable = false;
      r = { mesh, ttl: 0 };
      this.rings.push(r);
    }
    r.mesh.position.set(x, this.waterY + 0.03, z);
    r.mesh.scaling.setAll(0.3 * size);
    r.mesh.setEnabled(true);
    r.ttl = 1.2;
  }
}
