import { Matrix, NullEngine, Scene, Vector3 } from '@babylonjs/core';
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { parseCamera } from '../src/data/schema';
import { loadWorldData } from '../src/data/worldData';
import { CameraRig, smoothingRate } from '../src/render/cameraRig';
import { generateHeightField } from '../src/world/terrain';
import cameraJson from '../data/camera.json';

describe('modos, encuadres y suavidad en el juego', () => {
  const def = loadGameData().camera;
  const rigAt = (over: Partial<CameraRig> = {}): CameraRig => {
    const rig = new CameraRig(new Scene(new NullEngine()), def);
    Object.assign(rig, over);
    rig.update(new Vector3(100, 0, 100), 1 / 60);
    return rig;
  };

  it('el giro y el zoom se alcanzan con suavidad, sin saltos', () => {
    const rig = rigAt();
    rig.orbit(100, 0);
    const pedido = rig.yawDeg;
    rig.update(new Vector3(100, 0, 100), 1 / 60);
    expect(rig.viewYawDeg).not.toBeCloseTo(pedido, 3);
    for (let i = 0; i < 300; i++) rig.update(new Vector3(100, 0, 100), 1 / 60);
    expect(rig.viewYawDeg).toBeCloseTo(((pedido % 360) + 360) % 360, 2);
  });

  it('más suavidad tarda más en llegar, y el resultado no depende de los fotogramas', () => {
    expect(smoothingRate(1)).toBeLessThan(smoothingRate(0.5));
    expect(smoothingRate(0.5)).toBeLessThan(smoothingRate(0));
    const run = (hz: number): number => {
      const rig = rigAt();
      const before = rig.camera.position.x;
      for (let i = 0; i < hz / 2; i++) rig.update(new Vector3(120, 0, 100), 1 / hz);
      return rig.camera.position.x - before;
    };
    expect(run(30)).toBeCloseTo(run(120), 3);
  });

  it('los encuadres llevan a su pose, y el por defecto a la de los datos', () => {
    const rig = rigAt();
    rig.setFraming('top');
    expect(rig.pitchDeg).toBeGreaterThan(70);
    rig.setFraming('default');
    expect([rig.yawDeg, rig.pitchDeg, rig.zoom]).toEqual([def.yawDeg, def.pitchDeg, def.distance]);
  });

  it('la cámara por casilla no se mueve dentro de la casilla y salta a la siguiente con suavidad', () => {
    const rig = rigAt({ mode: 'zone', smoothing: 0 });
    for (let i = 0; i < 600; i++) rig.update(new Vector3(100, 0, 100), 1 / 60);
    const a = rig.camera.position.clone();
    for (let i = 0; i < 120; i++) rig.update(new Vector3(105, 0, 105), 1 / 60);
    expect(rig.camera.position.subtract(a).length()).toBeLessThan(1e-3);
    rig.update(new Vector3(130, 0, 100), 1 / 60);
    const step = rig.camera.position.subtract(a).length();
    expect(step).toBeGreaterThan(0);
    expect(step).toBeLessThan(32);
  });

  it('la inteligente gira hacia el peligro, pero respeta un giro manual reciente', () => {
    const rig = rigAt({ mode: 'smart' });
    rig.threats = [{ x: 110, z: 100 }];
    const start = rig.yawDeg;
    rig.update(new Vector3(100, 0, 100), 1);
    expect(rig.yawDeg).not.toBe(start);
    rig.orbit(10, 0);
    const manual = rig.yawDeg;
    rig.update(new Vector3(100, 0, 100), 0.1);
    expect(rig.yawDeg).toBe(manual);
  });
});

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
      rig.camera.computeWorldMatrix();
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
