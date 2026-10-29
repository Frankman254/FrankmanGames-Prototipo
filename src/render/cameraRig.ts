// Cámara 3D orbital que sigue a un punto con suavizado exponencial. Con la rueda
// pulsada se arrastra para girar (yaw libre, pitch con límites); la rueda hace zoom.
import { TargetCamera, Vector3, type Scene } from '@babylonjs/core';
import type { CameraDef } from '../data/schema';

const DEG = Math.PI / 180;

export class CameraRig {
  readonly camera: TargetCamera;
  private readonly focus = new Vector3();
  private distance: number;
  /** Ángulos actuales en grados (empiezan en los de los datos). */
  yawDeg: number;
  pitchDeg: number;
  /** Altura del terreno para no meter la cámara bajo una colina. */
  ground: { sample(x: number, z: number): number } | null = null;
  /** Cajas sólidas (casas, rocas grandes): la cámara se acerca al foco si la tapan. */
  blockers: ReadonlyArray<{ x: number; z: number; hw: number; hd: number; top: number }> = [];
  private initialised = false;

  constructor(scene: Scene, private def: CameraDef) {
    this.camera = new TargetCamera('cam', new Vector3(0, 10, -10), scene);
    this.camera.fov = def.fovDeg * DEG;
    this.camera.minZ = 0.3;
    this.camera.maxZ = 500;
    this.distance = def.distance;
    this.yawDeg = def.yawDeg;
    this.pitchDeg = def.pitchDeg;
  }

  zoomBy(steps: number): void {
    this.distance = Math.min(this.def.maxDistance, Math.max(this.def.minDistance, this.distance + steps));
  }

  /** Arrastre con la rueda pulsada, en píxeles de pantalla. */
  orbit(dx: number, dy: number): void {
    const k = this.def.orbitDegPerPixel;
    this.yawDeg = (this.yawDeg + dx * k * (this.def.invertX ? -1 : 1)) % 360;
    this.pitchDeg = Math.min(this.def.maxPitchDeg, Math.max(this.def.minPitchDeg, this.pitchDeg + dy * k * (this.def.invertY ? -1 : 1)));
  }

  update(target: Vector3, frameSeconds: number): void {
    if (!this.initialised) {
      this.focus.copyFrom(target);
      this.initialised = true;
    } else {
      const t = 1 - Math.exp(-this.def.followLerpPerSecond * frameSeconds);
      Vector3.LerpToRef(this.focus, target, t, this.focus);
    }
    const pitch = this.pitchDeg * DEG;
    const yaw = this.yawDeg * DEG;
    const horiz = Math.cos(pitch) * this.distance;
    const dx = -Math.sin(yaw) * Math.cos(pitch);
    const dy = Math.sin(pitch);
    const dz = -Math.cos(yaw) * Math.cos(pitch);
    const dist = this.unblockedDistance(dx, dy, dz);
    const p = this.camera.position;
    p.set(this.focus.x + dx * dist, this.focus.y + 1 + dy * dist, this.focus.z + dz * dist);
    if (this.ground) p.y = Math.max(p.y, this.ground.sample(p.x, p.z) + this.def.groundClearance);
    // Mira un poco por encima de los pies para que el personaje quede centrado.
    this.camera.setTarget(new Vector3(this.focus.x, this.focus.y + 1, this.focus.z));
  }

  /** Distancia hasta la primera caja sólida en la dirección (dx, dy, dz) desde el foco. */
  private unblockedDistance(dx: number, dy: number, dz: number): number {
    const step = 0.25;
    const ox = this.focus.x;
    const oy = this.focus.y + 1;
    const oz = this.focus.z;
    for (let t = 1; t <= this.distance; t += step) {
      const x = ox + dx * t;
      const y = oy + dy * t;
      const z = oz + dz * t;
      for (const b of this.blockers) {
        if (y < b.top && Math.abs(x - b.x) < b.hw && Math.abs(z - b.z) < b.hd) return Math.max(this.def.minDistance * 0.5, t - 0.6);
      }
    }
    return this.distance;
  }
}
