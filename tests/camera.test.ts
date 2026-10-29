import { Matrix, NullEngine, Scene, Vector3 } from '@babylonjs/core';
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { parseCamera } from '../src/data/schema';
import { loadWorldData } from '../src/data/worldData';
import { CameraRig } from '../src/render/cameraRig';
import { generateHeightField } from '../src/world/terrain';
import cameraJson from '../data/camera.json';

describe('cámara orbital', () => {
  const def = loadGameData().camera;

  it('el yaw gira libre y el pitch respeta los límites de los datos', () => {
    const scene = new Scene(new NullEngine());
    const rig = new CameraRig(scene, def);
    rig.orbit(10_000, 0);
    expect(Number.isFinite(rig.yawDeg)).toBe(true);
    rig.orbit(0, 10_000);
    expect(rig.pitchDeg).toBe(def.maxPitchDeg);
    rig.orbit(0, -10_000);
    expect(rig.pitchDeg).toBe(def.minPitchDeg);
  });

  it('la inversión de ejes viene de los datos', () => {
    const scene = new Scene(new NullEngine());
    const normal = new CameraRig(scene, def);
    const inverted = new CameraRig(scene, { ...def, invertX: true, invertY: true });
    normal.orbit(10, 10);
    inverted.orbit(10, 10);
    expect(normal.yawDeg - def.yawDeg).toBeCloseTo(-(inverted.yawDeg - def.yawDeg));
    expect(normal.pitchDeg - def.pitchDeg).toBeCloseTo(-(inverted.pitchDeg - def.pitchDeg));
  });

  it('el clic en el centro de la pantalla toca el suelo junto al jugador con cualquier ángulo', () => {
    const engine = new NullEngine({ renderWidth: 1280, renderHeight: 720, textureSize: 512, deterministicLockstep: false, lockstepMaxSteps: 1 });
    const scene = new Scene(engine);
    const hf = generateHeightField(loadWorldData().terrain);
    const rig = new CameraRig(scene, def);
    rig.ground = hf;
    const target = new Vector3(124, hf.sample(124, 104), 104);
    for (const [yaw, pitch] of [[0, 30], [90, 60], [200, 15], [315, 80]] as const) {
      rig.orbit((yaw - rig.yawDeg) / def.orbitDegPerPixel, (pitch - rig.pitchDeg) / def.orbitDegPerPixel);
      rig.update(target, 1); // primera llamada: sin suavizado
      rig.update(target, 10);
      rig.camera.computeWorldMatrix(true);
      const ray = scene.createPickingRay(640, 360, Matrix.Identity(), rig.camera);
      const hit = hf.raycast(ray.origin.x, ray.origin.y, ray.origin.z, ray.direction.x, ray.direction.y, ray.direction.z, 500)!;
      expect(hit, `yaw ${yaw} pitch ${pitch}`).not.toBeNull();
      // La cámara mira 1 m por encima de los pies: con pitch bajo el punto cae algo más lejos.
      expect(Math.hypot(hit.x - target.x, hit.z - target.z), `yaw ${yaw} pitch ${pitch}`).toBeLessThan(8);
      expect(rig.camera.position.y).toBeGreaterThan(hf.sample(rig.camera.position.x, rig.camera.position.z));
    }
  });

  it('rechaza una inclinación inicial fuera de los límites', () => {
    expect(() => parseCamera({ ...cameraJson, pitchDeg: 85 })).toThrow(/pitchDeg/);
    expect(() => parseCamera({ ...cameraJson, invertX: 'sí' })).toThrow(/invertX/);
  });
});
