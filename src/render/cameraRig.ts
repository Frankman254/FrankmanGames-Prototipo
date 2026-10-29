// Cámara ARPG elevada que sigue a un punto con suavizado exponencial.
import { TargetCamera, Vector3, type Scene } from '@babylonjs/core';
import type { CameraDef } from '../data/schema';

export class CameraRig {
  readonly camera: TargetCamera;
  private readonly focus = new Vector3();
  private distance: number;
  private initialised = false;

  constructor(scene: Scene, private def: CameraDef) {
    this.camera = new TargetCamera('cam', new Vector3(0, 10, -10), scene);
    this.camera.fov = (def.fovDeg * Math.PI) / 180;
    this.camera.minZ = 0.5;
    this.camera.maxZ = 500;
    this.distance = def.distance;
  }

  zoomBy(steps: number): void {
    this.distance = Math.min(this.def.maxDistance, Math.max(this.def.minDistance, this.distance + steps));
  }

  update(target: Vector3, frameSeconds: number): void {
    if (!this.initialised) {
      this.focus.copyFrom(target);
      this.initialised = true;
    } else {
      const t = 1 - Math.exp(-this.def.followLerpPerSecond * frameSeconds);
      Vector3.LerpToRef(this.focus, target, t, this.focus);
    }
    const pitch = (this.def.pitchDeg * Math.PI) / 180;
    const yaw = (this.def.yawDeg * Math.PI) / 180;
    const horiz = Math.cos(pitch) * this.distance;
    this.camera.position.set(
      this.focus.x - Math.sin(yaw) * horiz,
      this.focus.y + Math.sin(pitch) * this.distance,
      this.focus.z - Math.cos(yaw) * horiz,
    );
    this.camera.setTarget(this.focus);
  }
}
