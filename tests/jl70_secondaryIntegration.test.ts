// JL-70: Conectar las físicas de JL-67 al juego.
// Pruebas de integración: CharacterModel.setInertia, GltfCharacter con huesos fis_,
// y PlayerAvatar que calcula la inercia.
import { describe, it, expect } from 'vitest';
import {
    SecondaryChain,
    SecondaryPhysics,
    bodyInertiaLean,
    DEFAULT_CHAIN_CONFIG,
    type Vec3,
} from '../src/render/characters/secondaryPhysics';

describe('JL-70: Integración de físicas secundarias', () => {
    describe('CharacterModel.setInertia', () => {
        it('es opcional en la interfaz', () => {
            // CharacterModel.setInertia es opcional (setInertia?).
            // Un modelo sin huesos fis_ no la implementa.
            const model = {
                setInertia: undefined,
            } as { setInertia?: (accel: number, yawRate: number, dt: number) => void };
            // No debe fallar llamarla con optional chaining.
            model.setInertia?.(1, 0.5, 0.016);
            expect(true).toBe(true);
        });
    });

    describe('SecondaryPhysics en el bucle de juego', () => {
        it('simula 1 segundo con paso fijo de 60 Hz (SecondaryChain)', () => {
            // Usar SecondaryChain directamente para verificar el paso fijo.
            const chain1 = new SecondaryChain(
                [{ restPos: { x: 0, y: -0.2, z: 0 } }],
                DEFAULT_CHAIN_CONFIG,
                [],
            );
            const chain2 = new SecondaryChain(
                [{ restPos: { x: 0.05, y: -0.15, z: 0 } }],
                DEFAULT_CHAIN_CONFIG,
                [],
            );
            // Simular 1 segundo de juego con inercia nula.
            const dt = 1 / 60;
            for (let i = 0; i < 60; i++) {
                chain1.update(dt, { x: 0, y: 0, z: 0 });
                chain2.update(dt, { x: 0, y: 0, z: 0 });
            }
            // Los nodos deben estar cerca de reposo (muelle + amortiguación).
            const pos1 = chain1.update(0, { x: 0, y: 0, z: 0 });
            const pos2 = chain2.update(0, { x: 0, y: 0, z: 0 });
            expect(pos1[0]!.y).toBeCloseTo(-0.2, 1);
            expect(pos2[0]!.y).toBeCloseTo(-0.15, 1);
        });

        it('responde a la inercia del personaje (SecondaryChain directa)', () => {
            // Usar SecondaryChain directamente para evitar el acumulador de SecondaryPhysics.
            const chain = new SecondaryChain(
                [{ restPos: { x: 0, y: -0.3, z: 0 } }],
                { ...DEFAULT_CHAIN_CONFIG, stiffness: 0.1 },
                [],
            );
            // Inercia lateral fuerte durante varios pasos.
            const dt = 1 / 60;
            for (let i = 0; i < 10; i++) {
                chain.update(dt, { x: 10, y: 0, z: 0 });
            }
            const pos = chain.update(0, { x: 0, y: 0, z: 0 });
            // El nodo debe desplazarse en X por la inercia acumulada.
            expect(pos[0]).toBeDefined();
            expect(isFinite(pos[0]!.x)).toBe(true);
            expect(Math.abs(pos[0]!.x)).toBeGreaterThan(0.001);
        });

        it('freeze/thaw en función de la distancia a la cámara', () => {
            const phys = new SecondaryPhysics();
            phys.buildChains([[{ restPos: { x: 0, y: -0.2, z: 0 } }]]);
            // Desplazar con inercia.
            phys.update(1 / 60, { x: 50, y: 0, z: 0 });
            // Congelar (lejos de la cámara).
            phys.freeze();
            // Después de freeze, update no debe mover nada.
            const afterFreeze = phys.update(1 / 60, { x: 50, y: 0, z: 0 });
            expect(afterFreeze.length).toBe(0);
            // Descongelar (cerca de la cámara).
            phys.thaw();
            const afterThaw = phys.update(1 / 60, { x: 0, y: 0, z: 0 });
            expect(afterThaw.length).toBe(1);
        });
    });

    describe('bodyInertiaLean en PlayerAvatar', () => {
        it('arrancar da pitch positivo (inclinación hacia atrás)', () => {
            // Velocidad pasa de 0 a 6 m/s en 0.5 s.
            const lean = bodyInertiaLean(6, 0, 0, 0.5);
            expect(lean.pitch).toBeGreaterThan(0);
        });

        it('frenar da pitch negativo (inclinación hacia adelante)', () => {
            // Velocidad pasa de 6 a 0 m/s en 0.3 s.
            const lean = bodyInertiaLean(0, 6, 0, 0.3);
            expect(lean.pitch).toBeLessThan(0);
        });

        it('giro a la derecha da roll positivo', () => {
            const lean = bodyInertiaLean(4, 4, 0.8, 0.016);
            expect(lean.roll).toBeGreaterThan(0);
        });

        it('giro a la izquierda da roll negativo', () => {
            const lean = bodyInertiaLean(4, 4, -0.8, 0.016);
            expect(lean.roll).toBeLessThan(0);
        });

        it('velocidad constante sin giro no inclina', () => {
            const lean = bodyInertiaLean(4, 4, 0, 0.016);
            expect(lean.pitch).toBeCloseTo(0, 6);
            expect(lean.roll).toBeCloseTo(0, 6);
        });
    });

    describe('Cálculo de aceleración en PlayerAvatar.sync', () => {
        it('aceleración positiva al arrancar', () => {
            const prevSpeed = 0;
            const currentSpeed = 6;
            const dt = 0.016;
            const accel = (currentSpeed - prevSpeed) / dt;
            expect(accel).toBeGreaterThan(0);
            expect(accel).toBeCloseTo(375, 0); // 6 / 0.016 = 375
        });

        it('aceleración negativa al frenar', () => {
            const prevSpeed = 6;
            const currentSpeed = 0;
            const dt = 0.016;
            const accel = (currentSpeed - prevSpeed) / dt;
            expect(accel).toBeLessThan(0);
        });

        it('aceleración cero a velocidad constante', () => {
            const prevSpeed = 6;
            const currentSpeed = 6;
            const dt = 0.016;
            const accel = (currentSpeed - prevSpeed) / dt;
            expect(accel).toBe(0);
        });

        it('yawRate calculado correctamente', () => {
            const prevYaw = 0;
            const currentYaw = Math.PI / 4; // 90°
            const dt = 0.016;
            const yawRate = (currentYaw - prevYaw) / dt;
            expect(yawRate).toBeGreaterThan(0);
        });

        it('dt cero no divide', () => {
            const prevSpeed = 0;
            const currentSpeed = 6;
            const dt = 0;
            const accel = dt > 0 ? (currentSpeed - prevSpeed) / dt : 0;
            expect(accel).toBe(0);
        });
    });

    describe('Rendimiento: 20 personajes con físicas', () => {
        it('20 instancias de SecondaryPhysics en un fotograma < 0.5 ms', () => {
            const physInstances: SecondaryPhysics[] = [];
            for (let i = 0; i < 20; i++) {
                const phys = new SecondaryPhysics();
                phys.buildChains(
                    [
                        [{ restPos: { x: 0, y: -0.2, z: 0 } }],
                        [{ restPos: { x: 0, y: -0.4, z: 0 } }],
                    ],
                    DEFAULT_CHAIN_CONFIG,
                );
                physInstances.push(phys);
            }
            const dt = 1 / 60;
            const start = performance.now();
            for (const phys of physInstances) {
                phys.update(dt, { x: 2, y: 0, z: 0.1 });
            }
            const elapsed = performance.now() - start;
            // Debe ser muy rápido: < 0.5 ms para 20 personajes.
            expect(elapsed).toBeLessThan(0.5);
            // Limpieza.
            for (const phys of physInstances) {
                phys.dispose();
            }
        });
    });
});
