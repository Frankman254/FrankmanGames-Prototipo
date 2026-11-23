import { describe, it, expect } from 'vitest';
import {
    SecondaryChain,
    SecondaryPhysics,
    bodyInertiaLean,
    pointToCapsuleDistance,
    DEFAULT_CHAIN_CONFIG,
    type Vec3,
    type CollisionCapsule,
    type SecondaryChainConfig,
} from '../src/render/characters/secondaryPhysics';

describe('JL-67: Motor de físicas secundarias', () => {
    const dt = 1 / 60;

    describe('SecondaryChain', () => {
        function makeChain(
            restPositions: Vec3[],
            config: SecondaryChainConfig = DEFAULT_CHAIN_CONFIG,
            capsules: CollisionCapsule[] = [],
        ) {
            return new SecondaryChain(
                restPositions.map((rp) => ({ restPos: rp })),
                config,
                capsules,
            );
        }

        describe('estabilidad', () => {
            it('no explota con 5 FPS (dt grande)', () => {
                const chain = makeChain([{ x: 0, y: -0.2, z: 0 }, { x: 0, y: -0.4, z: 0 }]);
                // 5 FPS = dt 0.2
                const positions = chain.update(0.2, { x: 0, y: 0, z: 0 });
                for (const p of positions) {
                    expect(isFinite(p.x) && isFinite(p.y) && isFinite(p.z)).toBe(true);
                }
            });

            it('no explota con 240 FPS (dt pequeño)', () => {
                const chain = makeChain([{ x: 0, y: -0.2, z: 0 }, { x: 0, y: -0.4, z: 0 }]);
                // 240 FPS = dt 0.004
                const positions = chain.update(0.004, { x: 0, y: 0, z: 0 });
                for (const p of positions) {
                    expect(isFinite(p.x) && isFinite(p.y) && isFinite(p.z)).toBe(true);
                }
            });

            it('converge hacia reposo sin inercia', () => {
                const chain = makeChain([{ x: 0, y: -0.2, z: 0 }, { x: 0, y: -0.4, z: 0 }]);
                // Simular 1 segundo de física sin inercia.
                for (let i = 0; i < 60; i++) {
                    chain.update(dt, { x: 0, y: 0, z: 0 });
                }
                const positions = chain.update(0, { x: 0, y: 0, z: 0 });
                // Los nodos deben estar cerca de reposo (el muelle los atrae).
                expect(positions[0]!.y).toBeCloseTo(-0.2, 1);
                expect(positions[1]!.y).toBeCloseTo(-0.4, 1);
            });
        });

        describe('respeto del ángulo máximo', () => {
            it('no supera el ángulo máximo con inercia fuerte', () => {
                const config: SecondaryChainConfig = {
                    ...DEFAULT_CHAIN_CONFIG,
                    maxAngle: Math.PI / 6, // 30°
                    stiffness: 0.05, // muelle suave para que la inercia domine
                };
                const chain = makeChain([{ x: 0, y: -0.3, z: 0 }], config);
                // Inercia lateral fuerte.
                chain.update(dt, { x: 50, y: 0, z: 0 });
                const positions = chain.update(0, { x: 0, y: 0, z: 0 });
                // El ángulo entre el vector reposo (0,-0.3,0) y el vector actual debe ser ≤ 30°.
                const _dx = positions[0]!.x - 0;
                const _dy = positions[0]!.y - (-0.3);
                // El reposo apunta hacia abajo: (0, -0.3, 0).
                // El desplazamiento desde el padre (0,0,0) es (pos.x, pos.y, pos.z).
                const px = positions[0]!.x;
                const py = positions[0]!.y;
                const len = Math.sqrt(px * px + py * py);
                const restLen = 0.3;
                const dot = (px * 0 + py * -0.3) / (len * restLen);
                const angle = Math.acos(Math.min(1, Math.max(-1, dot)));
                expect(angle).toBeLessThanOrEqual(Math.PI / 6 + 0.01);
            });

            it('sin maxAngle, el nodo se desplaza libremente', () => {
                const config: SecondaryChainConfig = {
                    ...DEFAULT_CHAIN_CONFIG,
                    maxAngle: 0, // sin límite
                };
                const chain = makeChain([{ x: 0, y: -0.3, z: 0 }], config);
                chain.update(dt, { x: 100, y: 0, z: 0 });
                const positions = chain.update(0, { x: 0, y: 0, z: 0 });
                // Con inercia lateral de 100 m/s², el nodo debe moverse en X.
                expect(Math.abs(positions[0]!.x)).toBeGreaterThan(0.001);
            });
        });

        describe('colisión con cápsulas', () => {
            it('empuja fuera de la cápsula', () => {
                const capsule: CollisionCapsule = {
                    center: { x: 0, y: -0.15, z: 0 },
                    radius: 0.08,
                    length: 0.3,
                    axis: { x: 0, y: 1, z: 0 },
                };
                // Nodo que empieza dentro de la cápsula.
                const chain = makeChain([{ x: 0.001, y: -0.15, z: 0 }], DEFAULT_CHAIN_CONFIG, [capsule]);
                chain.update(dt, { x: 0, y: 0, z: 0 });
                const positions = chain.update(0, { x: 0, y: 0, z: 0 });
                // La distancia al eje de la cápsula debe ser ≥ radio.
                const dist = pointToCapsuleDistance(
                    positions[0]!,
                    capsule.center,
                    capsule.length,
                    capsule.axis,
                );
                expect(dist).toBeGreaterThanOrEqual(capsule.radius - 0.001);
            });

            it('no empuja si el nodo está fuera de la cápsula', () => {
                const capsule: CollisionCapsule = {
                    center: { x: 0, y: -0.15, z: 0 },
                    radius: 0.05,
                    length: 0.2,
                    axis: { x: 0, y: 1, z: 0 },
                };
                const chain = makeChain([{ x: 0.5, y: -0.5, z: 0 }], DEFAULT_CHAIN_CONFIG, [capsule]);
                const before = chain.update(0, { x: 0, y: 0, z: 0 });
                chain.update(dt, { x: 0, y: 0, z: 0 });
                const after = chain.update(0, { x: 0, y: 0, z: 0 });
                // Sin inercia y fuera de la cápsula, la posición cambia poco (gravedad + muelle).
                // La componente X no debería moverse significativamente.
                expect(after[0]!.x).toBeCloseTo(before[0]!.x, 2);
                // Y cambia por gravedad, pero el nodo no es empujado por la cápsula.
                expect(after[0]!.y).toBeLessThan(before[0]!.y); // La gravedad lo baja.
            });
        });

        describe('freeze', () => {
            it('vuelve a las posiciones de reposo', () => {
                const chain = makeChain([{ x: 0, y: -0.2, z: 0 }, { x: 0, y: -0.4, z: 0 }]);
                // Desplazar con inercia.
                chain.update(dt, { x: 50, y: 0, z: 0 });
                // Congelar.
                const positions = chain.freezePositions();
                expect(positions[0]!.x).toBeCloseTo(0, 6);
                expect(positions[0]!.y).toBeCloseTo(-0.2, 6);
                expect(positions[1]!.x).toBeCloseTo(0, 6);
                expect(positions[1]!.y).toBeCloseTo(-0.4, 6);
            });
        });

        describe('paso fijo independiente de FPS', () => {
            it('mismo resultado con 60 Hz y 30 Hz (aproximado)', () => {
                const restPositions = [{ x: 0, y: -0.2, z: 0 }, { x: 0, y: -0.4, z: 0 }];
                const config: SecondaryChainConfig = {
                    stiffness: 0.5,
                    damping: 0.9,
                    gravity: -9.81,
                    maxAngle: Math.PI / 4,
                };
                // Simular 0.1 segundos con 60 Hz.
                const chain60 = new SecondaryChain(
                    restPositions.map((rp) => ({ restPos: rp })),
                    config,
                    [],
                );
                for (let i = 0; i < 6; i++) {
                    chain60.update(1 / 60, { x: 0, y: 0, z: 0 });
                }
                const pos60 = chain60.update(0, { x: 0, y: 0, z: 0 });

                // Simular 0.1 segundos con 30 Hz.
                const chain30 = new SecondaryChain(
                    restPositions.map((rp) => ({ restPos: rp })),
                    config,
                    [],
                );
                for (let i = 0; i < 3; i++) {
                    chain30.update(1 / 30, { x: 0, y: 0, z: 0 });
                }
                const pos30 = chain30.update(0, { x: 0, y: 0, z: 0 });

                // Los resultados deben ser similares (no idénticos, porque el paso fijo
                // da resultados ligeramente distintos con dt diferente, pero cercanos).
                for (let i = 0; i < pos60.length; i++) {
                    expect(pos60[i]!.y).toBeCloseTo(pos30[i]!.y, 2);
                }
            });
        });
    });

    describe('SecondaryPhysics', () => {
        it('sin huesos fis_ no crea cadenas', () => {
            const phys = new SecondaryPhysics();
            phys.buildChains([]);
            expect(phys.hasChains).toBe(false);
            expect(phys.chainCount).toBe(0);
        });

        it('crea cadenas a partir de grupos de huesos', () => {
            const phys = new SecondaryPhysics();
            phys.buildChains([
                [{ restPos: { x: 0, y: -0.2, z: 0 } }, { restPos: { x: 0, y: -0.4, z: 0 } }],
                [{ restPos: { x: 0.1, y: -0.1, z: 0 } }],
            ]);
            expect(phys.hasChains).toBe(true);
            expect(phys.chainCount).toBe(2);
        });

        it('freeze desactiva y vuelve a reposo', () => {
            const phys = new SecondaryPhysics();
            phys.buildChains([[{ restPos: { x: 0, y: -0.2, z: 0 } }]]);
            phys.update(dt, { x: 50, y: 0, z: 0 });
            phys.freeze();
            expect(phys.hasChains).toBe(true); // Las cadenas siguen existiendo.
        });

        it('thaw reactiva', () => {
            const phys = new SecondaryPhysics();
            phys.buildChains([[{ restPos: { x: 0, y: -0.2, z: 0 } }]]);
            phys.freeze();
            phys.thaw();
            phys.update(dt, { x: 0, y: 0, z: 0 }); // No debe fallar.
        });

        it('dispose limpia', () => {
            const phys = new SecondaryPhysics();
            phys.buildChains([[{ restPos: { x: 0, y: -0.2, z: 0 } }]]);
            phys.dispose();
            expect(phys.chainCount).toBe(0);
        });
    });

    describe('bodyInertiaLean', () => {
        it('sin movimiento no inclina', () => {
            const lean = bodyInertiaLean(0, 0, 0, dt);
            expect(lean.pitch).toBe(0);
            expect(lean.roll).toBe(0);
        });

        it('arrancar inclina hacia atrás (pitch positivo)', () => {
            const lean = bodyInertiaLean(6, 0, 0, 0.5);
            expect(lean.pitch).toBeGreaterThan(0);
            expect(lean.pitch).toBeLessThanOrEqual(Math.PI / 12);
        });

        it('frenar inclina hacia adelante (pitch negativo)', () => {
            const lean = bodyInertiaLean(0, 6, 0, 0.5);
            expect(lean.pitch).toBeLessThan(0);
            expect(lean.pitch).toBeGreaterThanOrEqual(-Math.PI / 12);
        });

        it('giro a la derecha inclina a la derecha (roll positivo)', () => {
            const lean = bodyInertiaLean(4, 4, 1.0, 0.1);
            expect(lean.roll).toBeGreaterThan(0);
            expect(lean.roll).toBeLessThanOrEqual(Math.PI / 18);
        });

        it('giro a la izquierda inclina a la izquierda (roll negativo)', () => {
            const lean = bodyInertiaLean(4, 4, -1.0, 0.1);
            expect(lean.roll).toBeLessThan(0);
            expect(lean.roll).toBeGreaterThanOrEqual(-Math.PI / 18);
        });

        it('aceleración extrema respeta el tope de pitch', () => {
            const lean = bodyInertiaLean(100, 0, 0, 0.1);
            expect(lean.pitch).toBeLessThanOrEqual(Math.PI / 12);
        });

        it('giro extremo respeta el tope de roll', () => {
            const lean = bodyInertiaLean(4, 4, 50, 0.1);
            expect(Math.abs(lean.roll)).toBeLessThanOrEqual(Math.PI / 18);
        });

        it('dt ≤ 0 devuelve cero', () => {
            expect(bodyInertiaLean(6, 0, 0, 0).pitch).toBe(0);
            expect(bodyInertiaLean(6, 0, 0, -0.1).pitch).toBe(0);
        });
    });

    describe('pointToCapsuleDistance', () => {
        it('punto sobre el eje devuelve 0', () => {
            const dist = pointToCapsuleDistance(
                { x: 0, y: 0, z: 0 },
                { x: 0, y: 0, z: 0 },
                1,
                { x: 0, y: 1, z: 0 },
            );
            expect(dist).toBeCloseTo(0, 6);
        });

        it('punto fuera del cilindro mide al extremo', () => {
            const dist = pointToCapsuleDistance(
                { x: 0, y: 10, z: 0 },
                { x: 0, y: 0, z: 0 },
                1,
                { x: 0, y: 1, z: 0 },
            );
            // El extremo superior está en (0, 0.5, 0). La distancia a (0, 10, 0) es 9.5.
            expect(dist).toBeCloseTo(9.5, 6);
        });

        it('punto lateral mide la distancia perpendicular', () => {
            const dist = pointToCapsuleDistance(
                { x: 0.5, y: 0, z: 0 },
                { x: 0, y: 0, z: 0 },
                1,
                { x: 0, y: 1, z: 0 },
            );
            expect(dist).toBeCloseTo(0.5, 6);
        });
    });
});
