// JL-65: Pruebas de los 4 modos de cámara (Manual, Semiautomático, Automático, Encuadre de combate).
import { describe, it, expect } from 'vitest';
import { modeTarget, DEFAULT_CAMERA_TUNING, LEGACY_CAMERA_MODE_MAP } from '../src/camera';

const baseInput = {
    target: { x: 0, y: 0, z: 0 },
    threats: [] as { x: number; z: number; radius?: number }[],
    pose: { yawDeg: 0, pitchDeg: 42, distance: 16 },
    dt: 1 / 60,
    manualPause: 0,
    tuning: DEFAULT_CAMERA_TUNING,
};

describe('JL-65: modos de cámara', () => {
    describe('Modo Manual', () => {
        it('nunca reduce la distancia por obstáculos', () => {
            const result = modeTarget({
                ...baseInput,
                mode: 'manual',
                threats: [{ x: 10, z: 0, radius: 2 }],
                pose: { yawDeg: 0, pitchDeg: 42, distance: 16 },
            });
            // Manual no cambia la distancia ni el foco por amenazas.
            expect(result.pose.distance).toBe(16);
            expect(result.focus).toEqual({ x: 0, y: 0, z: 0 });
        });

        it('conserva el yaw del jugador', () => {
            const result = modeTarget({
                ...baseInput,
                mode: 'manual',
                pose: { yawDeg: 90, pitchDeg: 42, distance: 16 },
            });
            expect(result.pose.yawDeg).toBe(90);
        });

        it('sin amenazas, no cambia nada', () => {
            const result = modeTarget({
                ...baseInput,
                mode: 'manual',
            });
            expect(result.pose).toEqual({ yawDeg: 0, pitchDeg: 42, distance: 16 });
            expect(result.focus).toEqual({ x: 0, y: 0, z: 0 });
        });
    });

    describe('Modo Semiautomático', () => {
        it('no cambia la distancia por amenazas', () => {
            const result = modeTarget({
                ...baseInput,
                mode: 'semiAuto',
                threats: [{ x: 10, z: 0, radius: 2 }],
            });
            expect(result.pose.distance).toBe(16);
            expect(result.focus).toEqual({ x: 0, y: 0, z: 0 });
        });

        it('respeta el yaw del jugador', () => {
            const result = modeTarget({
                ...baseInput,
                mode: 'semiAuto',
                pose: { yawDeg: 45, pitchDeg: 42, distance: 16 },
            });
            expect(result.pose.yawDeg).toBe(45);
        });
    });

    describe('Modo Automático', () => {
        it('ajusta la distancia para encuadrar amenazas', () => {
            const result = modeTarget({
                ...baseInput,
                mode: 'auto',
                threats: [{ x: 12, z: 0, radius: 2 }],
            });
            // La distancia debe aumentar para ver al jugador y al enemigo.
            expect(result.pose.distance).toBeGreaterThan(16);
            // El foco se desplaza hacia el centro del grupo.
            expect(result.focus.x).toBeGreaterThan(0);
        });

        it('gira hacia el enemigo más cercano cuando manualPause es 0', () => {
            const result = modeTarget({
                ...baseInput,
                mode: 'auto',
                threats: [{ x: 10, z: 0, radius: 1 }],
                manualPause: 0,
                dt: 1,
            });
            // Debería haber girado hacia el enemigo (en +X, yaw ~90°).
            expect(result.pose.yawDeg).not.toBe(0);
        });

        it('respeta el giro manual reciente', () => {
            const result = modeTarget({
                ...baseInput,
                mode: 'auto',
                threats: [{ x: 10, z: 0, radius: 1 }],
                manualPause: 2,
            });
            // Con pausa activa, no gira.
            expect(result.pose.yawDeg).toBe(0);
        });

        it('sin amenazas, no cambia la distancia', () => {
            const result = modeTarget({
                ...baseInput,
                mode: 'auto',
                threats: [],
            });
            expect(result.pose.distance).toBe(16);
            expect(result.focus).toEqual({ x: 0, y: 0, z: 0 });
        });
    });

    describe('Modo Encuadre de combate', () => {
        it('ajusta la distancia y el foco para ver a todos los enemigos', () => {
            const result = modeTarget({
                ...baseInput,
                mode: 'combat',
                threats: [
                    { x: 10, z: 5, radius: 1 },
                    { x: -8, z: -3, radius: 1 },
                ],
            });
            expect(result.pose.distance).toBeGreaterThan(16);
            // El foco se desplaza al centro del grupo.
            expect(result.focus.x).toBeCloseTo(1, 0); // (10 + (-8)) / 2 = 1
            expect(result.focus.z).toBeCloseTo(1, 0); // (5 + (-3)) / 2 = 1
        });

        it('mantiene el yaw del jugador', () => {
            const result = modeTarget({
                ...baseInput,
                mode: 'combat',
                threats: [{ x: 10, z: 0, radius: 1 }],
                pose: { yawDeg: 120, pitchDeg: 42, distance: 16 },
            });
            expect(result.pose.yawDeg).toBe(120);
        });

        it('sin amenazas, no cambia nada', () => {
            const result = modeTarget({
                ...baseInput,
                mode: 'combat',
                threats: [],
            });
            expect(result.pose.distance).toBe(16);
            expect(result.focus).toEqual({ x: 0, y: 0, z: 0 });
        });
    });

    describe('Migración de modos antiguos', () => {
        it('LEGACY_CAMERA_MODE_MAP mapea los nombres viejos', () => {
            expect(LEGACY_CAMERA_MODE_MAP['follow']).toBe('manual');
            expect(LEGACY_CAMERA_MODE_MAP['smart']).toBe('auto');
            expect(LEGACY_CAMERA_MODE_MAP['autoFocus']).toBe('combat');
            expect(LEGACY_CAMERA_MODE_MAP['zone']).toBe('zone');
        });
    });

    describe('Modo zona', () => {
        it('sigue funcionando con casillas', () => {
            const result = modeTarget({
                ...baseInput,
                mode: 'zone',
                target: { x: 10, y: 0, z: 10 },
            });
            // Debería centrar en la casilla de 32x32 que contiene (10, 10).
            expect(result.focus.x).toBe(16); // 0 * 32 + 16
            expect(result.focus.z).toBe(16);
        });
    });
});
