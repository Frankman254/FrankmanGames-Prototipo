import { describe, it, expect } from 'vitest';
import { RIDE_SEAT_DROP } from '../src/render/characters/gltfCharacter';
import type { MountLook } from '../src/rpg/contracts';

/**
 * JL-68: Jinetes bien sentados en cada montura.
 *
 * Cada montura declara su seatDrop (fracción de la altura del jinete que baja
 * desde la silla). Sin seatDrop se usa RIDE_SEAT_DROP (0.42) como respaldo.
 */

describe('JL-68: seatDrop por montura', () => {
    const CHARACTER_HEIGHT = 1.7;

    function seatOffset(look: MountLook) {
        return CHARACTER_HEIGHT * (look.seatDrop ?? RIDE_SEAT_DROP);
    }

    function feetY(look: MountLook) {
        // feetY = rideHeight - seatOffset (el suelo es y=0)
        return look.rideHeight - seatOffset(look);
    }

    it('RIDE_SEAT_DROP es 0.42', () => {
        expect(RIDE_SEAT_DROP).toBe(0.42);
    });

    it('sin seatDrop usa el valor por defecto', () => {
        const look: MountLook = {
            color: '#000',
            accent: '#000',
            scale: 1,
            rideHeight: 1.0,
        };
        expect(seatOffset(look)).toBeCloseTo(CHARACTER_HEIGHT * RIDE_SEAT_DROP);
    });

    it('con seatDrop usa el valor declarado', () => {
        const look: MountLook = {
            color: '#000',
            accent: '#000',
            scale: 1,
            rideHeight: 1.0,
            seatDrop: 0.3,
        };
        expect(seatOffset(look)).toBeCloseTo(CHARACTER_HEIGHT * 0.3);
    });

    describe('monturas cuadrúpedas', () => {
        it('mula: seatDrop 0.35, pies a ~0.26 m', () => {
            const look: MountLook = {
                color: '#7d6a55',
                accent: '#3f342a',
                scale: 0.9,
                rideHeight: 0.85,
                seatDrop: 0.35,
            };
            const fy = feetY(look);
            expect(fy).toBeGreaterThan(0.1);
            expect(fy).toBeLessThan(0.4);
        });

        it('tapir: seatDrop 0.35, pies a ~0.31 m', () => {
            const look: MountLook = {
                color: '#4a4640',
                accent: '#26231f',
                scale: 0.95,
                rideHeight: 0.9,
                seatDrop: 0.35,
            };
            const fy = feetY(look);
            expect(fy).toBeGreaterThan(0.1);
            expect(fy).toBeLessThan(0.4);
        });

        it('caballo: seatDrop 0.38, pies a ~0.45 m', () => {
            const look: MountLook = {
                color: '#8a4f2a',
                accent: '#2b1a10',
                scale: 1.1,
                rideHeight: 1.1,
                seatDrop: 0.38,
            };
            const fy = feetY(look);
            expect(fy).toBeGreaterThan(0.3);
            expect(fy).toBeLessThan(0.6);
        });
    });

    describe('monturas voladoras (aves)', () => {
        it('arpía: seatDrop 0.25, jinete agachado', () => {
            const look: MountLook = {
                color: '#5a5a60',
                accent: '#e8e4dc',
                scale: 0.72,
                rideHeight: 1.56,
                seatDrop: 0.25,
                flying: true,
            };
            const fy = feetY(look);
            // El jinete agachado tiene los pies más arriba
            expect(fy).toBeGreaterThan(0.9);
            expect(fy).toBeLessThan(1.3);
        });

        it('diostedé: seatDrop 0.28', () => {
            const look: MountLook = {
                color: '#1b6d72',
                accent: '#ffd84a',
                scale: 1,
                rideHeight: 1.36,
                seatDrop: 0.28,
                flying: true,
            };
            const fy = feetY(look);
            expect(fy).toBeGreaterThan(0.8);
            expect(fy).toBeLessThan(1.0);
        });

        it('crestalba: seatDrop 0.28', () => {
            const look: MountLook = {
                color: '#178b8e',
                accent: '#103d49',
                scale: 1,
                rideHeight: 1.43,
                seatDrop: 0.28,
                flying: true,
            };
            const fy = feetY(look);
            expect(fy).toBeGreaterThan(0.9);
            expect(fy).toBeLessThan(1.1);
        });

        it('falcopama: seatDrop 0.28', () => {
            const look: MountLook = {
                color: '#178b8e',
                accent: '#103d49',
                scale: 1,
                rideHeight: 1.37,
                seatDrop: 0.28,
                flying: true,
            };
            const fy = feetY(look);
            expect(fy).toBeGreaterThan(0.8);
            expect(fy).toBeLessThan(1.0);
        });
    });

    it('las monturas con seatDrop tienen pies por encima del suelo', () => {
        const mounts: MountLook[] = [
            { color: '#000', accent: '#000', scale: 0.9, rideHeight: 0.85, seatDrop: 0.35 },
            { color: '#000', accent: '#000', scale: 0.95, rideHeight: 0.9, seatDrop: 0.35 },
            { color: '#000', accent: '#000', scale: 1.1, rideHeight: 1.1, seatDrop: 0.38 },
            { color: '#000', accent: '#000', scale: 0.72, rideHeight: 1.56, seatDrop: 0.25 },
            { color: '#000', accent: '#000', scale: 1, rideHeight: 1.36, seatDrop: 0.28 },
            { color: '#000', accent: '#000', scale: 1, rideHeight: 1.43, seatDrop: 0.28 },
            { color: '#000', accent: '#000', scale: 1, rideHeight: 1.37, seatDrop: 0.28 },
        ];
        for (const m of mounts) {
            expect(feetY(m)).toBeGreaterThan(0);
        }
    });

    it('las monturas sin seatDrop (respaldo) tienen pies por encima del suelo', () => {
        const look: MountLook = {
            color: '#000',
            accent: '#000',
            scale: 1,
            rideHeight: 1.0,
        };
        expect(feetY(look)).toBeGreaterThan(0);
    });
});
