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
    const p = this.camera.position;
    p.set(this.focus.x - Math.sin(yaw) * horiz, this.focus.y + Math.sin(pitch) * this.distance, this.focus.z - Math.cos(yaw) * horiz);
    if (this.ground) p.y = Math.max(p.y, this.ground.sample(p.x, p.z) + this.def.groundClearance);
    // Mira un poco por encima de los pies para que el personaje quede centrado.
    this.camera.setTarget(new Vector3(this.focus.x, this.focus.y + 1, this.focus.z));
  }
}
