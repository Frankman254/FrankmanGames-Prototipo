// Estanques y pesca en pantalla (Slice 05): superficie de agua con brillo que
// ondula, corcho con sedal hasta la mano del jugador, temblor en el amago,
// hundimiento y anillos al picar, y salpicadura al sacar el pez.
import {
  Color3,
  Matrix,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  TransformNode,
  Vector3,
  VertexBuffer,
  type LinesMesh,
  type Scene,
  type Texture,
} from '@babylonjs/core';
import type { GameEvent } from '../sim/events';
import type { World } from '../sim/world';
import { staticMesh, staticTexture } from './staticModels';

/** Color del agua en la orilla (clara, deja ver el fondo) y en el centro (honda y oscura). */
const SHALLOW = [0.32, 0.62, 0.58, 0.45] as const;
const DEEP = [0.03, 0.14, 0.2, 0.93] as const;

/** Color de un vértice del estanque según lo lejos que está del centro (0 centro, 1 orilla). */
export function pondColor(t: number): [number, number, number, number] {
  const k = Math.min(1, Math.max(0, t)) ** 0.8;
  return [0, 1, 2, 3].map((i) => DEEP[i]! + (SHALLOW[i]! - DEEP[i]!) * k) as [number, number, number, number];
}
import { pondWaterLevel, type HeightField, type TerrainDef } from '../world/terrain';

/** Corte de un rayo con la superficie del primer estanque que atraviesa (mira hacia abajo). */
export function waterPointAlongRay(
  ponds: ReadonlyArray<{ x: number; y: number; radius: number; level: number }>,
  o: { x: number; y: number; z: number },
  d: { x: number; y: number; z: number },
): { x: number; y: number } | null {
  if (d.y >= -1e-6) return null;
  let best: { x: number; y: number } | null = null;
  let bestT = Infinity;
  for (const p of ponds) {
    const t = (p.level - o.y) / d.y;
    if (t <= 0 || t >= bestT) continue;
    const x = o.x + d.x * t;
    const z = o.z + d.z * t;
    if (Math.hypot(x - p.x, z - p.y) > p.radius) continue;
    best = { x, y: z };
    bestT = t;
  }
  return best;
}

interface Ring {
  mesh: Mesh;
  ttl: number;
}

/** Banco de peces en pantalla: círculo que late, onda que se abre y siluetas que nadan en corro. */
interface ShoalMark {
  node: TransformNode;
  ring: Mesh;
  ripple: Mesh;
  fish: Mesh[];
}

export class WaterView {
  private readonly surfaces: Mesh[] = [];
  private readonly waterMat: StandardMaterial;
  private readonly ripples: Texture;
  private readonly bobber: Mesh;
  private line: LinesMesh | null = null;
  private readonly rings: Ring[] = [];
  private readonly ringMat: StandardMaterial;
  private time = 0;
  /** Temblor del amago y de la picada (segundos que quedan). */
  private twitch = 0;
  private waterY = 0;
  private readonly shoalMarks = new Map<number, ShoalMark>();
  private readonly shoalMat: StandardMaterial;
  private readonly fishMat: StandardMaterial;
  private visible = true;

  constructor(private readonly scene: Scene, private terrain: TerrainDef, private readonly ground: HeightField) {
    this.waterMat = new StandardMaterial('waterMat', scene);
    // Profundidad: el color va de claro y transparente en la orilla a oscuro en el centro,
    // y el relieve del mar (scripts/blender/mar.py) se desplaza para que el agua se mueva.
    this.waterMat.diffuseColor = new Color3(1, 1, 1);
    this.waterMat.specularColor = new Color3(0.9, 0.95, 1);
    this.waterMat.specularPower = 96;
    this.waterMat.emissiveColor = new Color3(0.02, 0.06, 0.08);
    this.waterMat.backFaceCulling = false;
    this.ripples = staticTexture(scene, 'mar_relieve');
    this.ripples.uScale = this.ripples.vScale = 1.5;
    this.waterMat.bumpTexture = this.ripples;
    this.rebuildPonds();

    const bobberMat = new StandardMaterial('bobberMat', scene);
    bobberMat.diffuseColor = new Color3(0.9, 0.2, 0.15);
    bobberMat.emissiveColor = new Color3(0.35, 0.06, 0.04);
    this.bobber = staticMesh(scene, 'c_corcho', 'bobber');
    this.bobber.material = bobberMat;
    this.bobber.isPickable = false;
    this.bobber.setEnabled(false);

    this.ringMat = new StandardMaterial('ringMat', scene);
    this.ringMat.diffuseColor = new Color3(0.85, 0.95, 1);
    this.ringMat.emissiveColor = new Color3(0.4, 0.5, 0.55);
    this.ringMat.alpha = 0.6;

    this.shoalMat = new StandardMaterial('shoalMat', scene);
    this.shoalMat.diffuseColor = new Color3(0.55, 0.95, 1);
    this.shoalMat.emissiveColor = new Color3(0.3, 0.75, 0.85);
    this.shoalMat.alpha = 0.8;
    this.fishMat = new StandardMaterial('shoalFishMat', scene);
    this.fishMat.diffuseColor = new Color3(0.02, 0.05, 0.08);
    this.fishMat.specularColor = Color3.Black();
    this.fishMat.alpha = 0.55;
  }

  /** Borra los círculos de bancos (modo edición: el campo nuevo puede reusar ids). */
  clearShoalMarks(): void {
    for (const m of this.shoalMarks.values()) m.node.dispose(false, false);
    this.shoalMarks.clear();
  }

  /** Los discos de agua, uno por estanque (modo edición: se rehacen al cambiar la forma del terreno). */
  rebuildPonds(terrain?: TerrainDef): void {
    if (terrain) this.terrain = terrain;
    for (const d of this.surfaces) d.dispose(false, false);
    this.surfaces.length = 0;
    for (const p of this.terrain.ponds) {
      const radius = p.radius + p.shore * 0.6;
      const disc = MeshBuilder.CreateDisc(`pond-${p.x}-${p.y}`, { radius, tessellation: 64 }, this.scene);
      const pos = disc.getVerticesData(VertexBuffer.PositionKind)!;
      const colors: number[] = [];
      for (let i = 0; i < pos.length; i += 3) colors.push(...pondColor(Math.hypot(pos[i]!, pos[i + 1]!) / radius));
      disc.setVerticesData(VertexBuffer.ColorKind, colors);
      disc.hasVertexAlpha = true;
      disc.rotation.x = Math.PI / 2;
      disc.position.set(p.x, pondWaterLevel(this.terrain, p), p.y);
      disc.material = this.waterMat;
      disc.isPickable = false;
      this.surfaces.push(disc);
    }
  }

  /** Círculos de los bancos de peces: aparecen, nadan y se quitan al agotarse. */
  private syncShoals(world: World): void {
    const seen = new Set<number>();
    for (const s of world.shoals?.list ?? []) {
      if (s.respawn > 0) continue;
      seen.add(s.id);
      let m = this.shoalMarks.get(s.id);
      if (!m) {
        m = this.buildShoal(s.id, s.radius);
        this.shoalMarks.set(s.id, m);
      }
      const spot = world.fishingSpots[s.spotId];
      const pond = spot ? this.terrain.ponds.find((p) => p.x === spot.x && p.y === spot.y) : undefined;
      const y = pond ? pondWaterLevel(this.terrain, pond) : this.ground.sample(s.x, s.y);
      m.node.position.set(s.x, y + 0.03, s.y);
      m.node.setEnabled(this.visible);
      const t = this.time + s.id * 1.3;
      m.ring.scaling.setAll(1 + Math.sin(t * 1.7) * 0.03);
      const k = (t * 0.45) % 1;
      m.ripple.scaling.setAll(0.25 + k * 0.75);
      m.ripple.visibility = 1 - k;
      m.fish.forEach((f, i) => {
        const a = t * (0.55 + i * 0.12) + (i * Math.PI * 2) / m!.fish.length;
        const r = s.radius * (0.35 + 0.3 * Math.sin(t * 0.3 + i));
        f.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
        f.rotation.y = -a;
      });
    }
    for (const [id, m] of this.shoalMarks) {
      if (seen.has(id)) continue;
      m.node.dispose(false, false);
      this.shoalMarks.delete(id);
    }
  }

  private buildShoal(id: number, radius: number): ShoalMark {
    const s = this.scene;
    const node = new TransformNode(`shoal${id}`, s);
    const ring = MeshBuilder.CreateTorus(`shoalRing${id}`, { diameter: radius * 2, thickness: 0.05, tessellation: 48 }, s);
    const ripple = MeshBuilder.CreateTorus(`shoalRipple${id}`, { diameter: radius * 2, thickness: 0.03, tessellation: 48 }, s);
    ring.material = this.shoalMat;
    ripple.material = this.shoalMat;
    const fish: Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const f = MeshBuilder.CreateDisc(`shoalFish${id}:${i}`, { radius: 0.2, tessellation: 10 }, s);
      f.bakeTransformIntoVertices(Matrix.Scaling(1, 0.42, 1).multiply(Matrix.RotationX(Math.PI / 2)));
      f.material = this.fishMat;
      f.parent = node;
      f.isPickable = false;
      fish.push(f);
    }
    for (const m of [ring, ripple]) {
      m.parent = node;
      m.isPickable = false;
    }
    return { node, ring, ripple, fish };
  }

  /**
   * Punto bajo el cursor sobre la superficie de un estanque. El terreno baja bajo
   * el agua: el rayo contra el fondo cae desplazado respecto a lo que se ve.
   */
  pickWater(ray: { origin: Vector3; direction: Vector3 }): { x: number; y: number } | null {
    if (!this.visible) return null;
    return waterPointAlongRay(this.terrain.ponds.map((p) => ({ x: p.x, y: p.y, radius: p.radius, level: pondWaterLevel(this.terrain, p) })), ray.origin, ray.direction);
  }

  /** Muestra u oculta los estanques (interiores). */
  setVisible(on: boolean): void {
    for (const s of this.surfaces) s.setEnabled(on);
    this.visible = on;
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
    this.ripples.uOffset = (this.time * 0.03) % 1;
    this.ripples.vOffset = (this.time * 0.02) % 1;
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

    this.syncShoals(world);

    const f = world.fishing;
    if (!f) {
      this.bobber.setEnabled(false);
      this.line?.setEnabled(false);
      this.twitch = 0;
      return;
    }
    const spot = world.fishingSpots[f.spotId];
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
