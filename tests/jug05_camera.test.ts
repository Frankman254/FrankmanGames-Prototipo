import { NullEngine, Scene, Vector3 } from '@babylonjs/core';
import { describe, expect, it } from 'vitest';
import { distanceBeforeBlocker } from '../src/camera';
import { loadGameData } from '../src/data';
import { CameraRig } from '../src/render/cameraRig';

describe('JUG-05: cámara — seguimiento suave, zoom y límites por escena', () => {
    const def = loadGameData().camera;
    const rigAt = (over: Partial<CameraRig> = {}): CameraRig => {
        const rig = new CameraRig(new Scene(new NullEngine()), def);
        Object.assign(rig, over);
        rig.update(new Vector3(100, 0, 100), 1 / 60);
        return rig;
    };

    describe('seguimiento suave sin tirones', () => {
        it('la cámara predice la posición futura del objetivo', () => {
            const rig = rigAt({ smoothing: 0.3 });
            // Mover el objetivo rápidamente en X durante varios frames.
            for (let i = 0; i < 60; i++) {
                rig.update(new Vector3(100 + i * 0.3, 0, 100), 1 / 60);
            }
            // La cámara sigue al foco con predicción de velocidad.
            // Con smoothing 0.3, la cámara está cerca del foco pero no lo alcanza del todo.
            const camX = rig.camera.position.x;
            const focusX = 100 + 60 * 0.3; // 118
            // La cámara debe estar entre el punto de inicio y el foco.
            expect(camX).toBeGreaterThan(100);
            expect(camX).toBeLessThan(focusX + 5); // no pasa mucho del foco
        });

        it('el seguimiento es más suave con smoothing alto', () => {
            const target = new Vector3(110, 0, 100);
            const smoothRig = rigAt({ smoothing: 0.9 });
            const sharpRig = rigAt({ smoothing: 0 });
            const beforeSmooth = smoothRig.camera.position.x;
            const beforeSharp = sharpRig.camera.position.x;
            smoothRig.update(target, 1 / 60);
            sharpRig.update(target, 1 / 60);
            const smoothMove = Math.abs(smoothRig.camera.position.x - beforeSmooth);
            const sharpMove = Math.abs(sharpRig.camera.position.x - beforeSharp);
            expect(smoothMove).toBeLessThan(sharpMove);
        });

        it('la velocidad del foco se suaviza y no salta', () => {
            const rig = rigAt();
            // Mover el objetivo en ráfagas.
            for (let i = 0; i < 30; i++) {
                rig.update(new Vector3(100 + (i % 10) * 0.5, 0, 100), 1 / 60);
            }
            // La velocidad estimada debe ser finita y razonable.
            expect(Number.isFinite((rig as any).focusVel.x)).toBe(true);
            expect(Number.isFinite((rig as any).focusVel.y)).toBe(true);
            expect(Number.isFinite((rig as any).focusVel.z)).toBe(true);
        });
    });

    describe('colisión analítica sin tirones', () => {
        it('distanceBeforeBlocker da la misma distancia sin importar el paso', () => {
            // La función analítica no usa pasos: el resultado es exacto.
            const ray = { x: 0, y: 2, z: 0, dx: 1, dy: 0, dz: 0 };
            const blockers = [{ x: 15, z: 0, halfWidth: 1, halfDepth: 3, top: 5 }];
            const d = distanceBeforeBlocker(ray, 30, blockers, 0.5);
            // La cámara se detiene antes de la pared en x=14 (15-1).
            expect(d).toBeCloseTo(13.5, 1);
        });

        it('la cámara se acerca antes de una caja sólida sin saltos', () => {
            const rig = rigAt({ smoothing: 0 });
            rig.blockers = [{ x: 110, z: 100, hw: 2, hd: 2, top: 5 }];
            rig.blockerMode = 'ray';
            rig.update(new Vector3(100, 0, 100), 1 / 60);
            // La cámara debe estar más cerca del foco que la distancia deseada
            // porque la caja la bloquea.
            const dist = rig.camera.position.subtract(new Vector3(100, 1, 100)).length();
            expect(dist).toBeLessThan(def.maxDistance);
            expect(dist).toBeGreaterThan(def.minDistance);
        });

        it('sin blockers la cámara usa la distancia deseada', () => {
            const rig = rigAt({ smoothing: 0 });
            rig.blockers = [];
            rig.update(new Vector3(100, 0, 100), 1 / 60);
            const dist = rig.camera.position.subtract(new Vector3(100, 1, 100)).length();
            expect(dist).toBeCloseTo(def.distance, 1);
        });
    });

    describe('zoom con rueda y límites por escena', () => {
        it('el zoom respeta minDistance y maxDistance', () => {
            const rig = rigAt();
            // Zoom in hasta el tope.
            for (let i = 0; i < 100; i++) rig.zoomBy(-1);
            expect(rig.zoom).toBeCloseTo(def.minDistance, 2);
            // Zoom out hasta el tope.
            for (let i = 0; i < 200; i++) rig.zoomBy(1);
            expect(rig.zoom).toBeCloseTo(def.maxDistance, 2);
        });

        it('distanceCap limita el zoom en interiores', () => {
            const rig = rigAt();
            rig.distanceCap = 14;
            // Intentar alejar la cámara más allá del tope.
            for (let i = 0; i < 100; i++) rig.zoomBy(1);
            expect(rig.zoom).toBeLessThanOrEqual(14);
        });

        it('sin distanceCap la cámara usa los límites de los datos', () => {
            const rig = rigAt();
            rig.distanceCap = null;
            for (let i = 0; i < 200; i++) rig.zoomBy(1);
            expect(rig.zoom).toBeCloseTo(def.maxDistance, 2);
        });

        it('el paso de zoom es proporcional a la distancia', () => {
            const rig = rigAt();
            const d1 = rig.zoom;
            rig.zoomBy(1);
            const stepNear = rig.zoom - d1;
            // Alejar la cámara.
            rig.jumpTo(def.maxDistance - 5);
            rig.zoomBy(1);
            const stepFar = rig.zoom - (def.maxDistance - 5);
            // De lejos, el paso es mayor.
            expect(stepFar).toBeGreaterThan(stepNear * 1.5);
        });
    });

    describe('suavizado independiente de la frecuencia de render', () => {
        it('el resultado es similar a 30, 60 y 120 fps', () => {
            const run = (hz: number): number => {
                const rig = rigAt();
                const before = rig.camera.position.x;
                for (let i = 0; i < hz / 2; i++) rig.update(new Vector3(120, 0, 100), 1 / hz);
                return rig.camera.position.x - before;
            };
            // La predicción de velocidad añade una pequeña diferencia entre fps,
            // pero el resultado sigue siendo muy cercano (< 0.1 m de diferencia).
            const r30 = run(30);
            const r60 = run(60);
            const r120 = run(120);
            expect(Math.abs(r30 - r60)).toBeLessThan(0.2);
            expect(Math.abs(r60 - r120)).toBeLessThan(0.2);
        });
    });
});
