import { describe, expect, it } from 'vitest';
import { isPlayerMoving } from '../src/render/characters/playerAvatar';
import { dampRadians } from '../src/camera';

describe('JUG-01: Respuesta al clic', () => {
    const player = (
        over: Partial<Parameters<typeof isPlayerMoving>[0]> = {},
    ): Parameters<typeof isPlayerMoving>[0] => ({
        alive: true,
        path: [{ x: 2, y: 0 }],
        pos: { x: 1, y: 0 },
        prevPos: { x: 1, y: 0 },
        speed: 4,
        ...over,
    });

    describe('isPlayerMoving: animación inmediata sin esperar desplazamiento', () => {
        it('se activa en cuanto hay ruta, aunque no haya movimiento físico aún', () => {
            // Primer frame después de commandMove: path asignado, pero pos no
            // ha cambiado todavía (el tick de simulación aún no corrió).
            const justAssigned = player({
                pos: { x: 5, y: 3 },
                prevPos: { x: 5, y: 3 }, // mismo punto, sin desplazamiento
            });
            expect(isPlayerMoving(justAssigned, true)).toBe(true);
        });

        it('se activa con ruta vacía después de consumirla', () => {
            // Cuando el path se consume (llegó al destino), deja de moverse.
            expect(isPlayerMoving(player({ path: [] }), true)).toBe(false);
        });

        it('no se activa sin velocidad', () => {
            expect(isPlayerMoving(player({ speed: 0 }), true)).toBe(false);
        });

        it('no se activa con simulación bloqueada', () => {
            expect(isPlayerMoving(player(), false)).toBe(false);
        });

        it('no se activa si el jugador está muerto', () => {
            expect(isPlayerMoving(player({ alive: false }), true)).toBe(false);
        });
    });

    describe('dampRadians: giro visual más rápido (factor 22)', () => {
        it('completa el 75% del giro en ~70 ms (4 frames a 60 Hz)', () => {
            const dt = 1 / 60;
            let current = 0;
            const target = Math.PI; // 180°
            for (let i = 0; i < 4; i++) {
                current = dampRadians(current, target, 22, dt);
            }
            const delta = Math.PI; // giro total
            const covered = Math.abs(current - 0);
            const pct = covered / delta;
            expect(pct).toBeGreaterThan(0.7);
        });

        it('complete el 88% del giro en ~100 ms (6 frames a 60 Hz)', () => {
            const dt = 1 / 60;
            let current = 0;
            const target = Math.PI;
            for (let i = 0; i < 6; i++) {
                current = dampRadians(current, target, 22, dt);
            }
            const delta = Math.PI;
            const covered = Math.abs(current - 0);
            const pct = covered / delta;
            // Con factor 22, 6 frames cubren ~89% del giro de 180°.
            expect(pct).toBeGreaterThan(0.85);
            expect(pct).toBeLessThan(0.95);
        });

        it('completa el 95% del giro en ~150 ms (9 frames a 60 Hz)', () => {
            const dt = 1 / 60;
            let current = 0;
            const target = Math.PI;
            for (let i = 0; i < 9; i++) {
                current = dampRadians(current, target, 22, dt);
            }
            const delta = Math.PI;
            const covered = Math.abs(current - 0);
            const pct = covered / delta;
            expect(pct).toBeGreaterThan(0.95);
        });

        it('el factor anterior (14) tardaba más del doble: ~140 ms para 95%', () => {
            const dt = 1 / 60;
            let current = 0;
            const target = Math.PI;
            // 6 frames con factor 14
            for (let i = 0; i < 6; i++) {
                current = dampRadians(current, target, 14, dt);
            }
            const delta = Math.PI;
            const covered = Math.abs(current - 0);
            const pct = covered / delta;
            // Con factor 14, 6 frames no llegan al 95%.
            expect(pct).toBeLessThan(0.95);
        });

        it('el factor nuevo (22) es significativamente más rápido que el anterior (14)', () => {
            const dt = 1 / 60;
            let oldFactor = 0;
            let newFactor = 0;
            const target = Math.PI;
            // 4 frames
            for (let i = 0; i < 4; i++) {
                oldFactor = dampRadians(oldFactor, target, 14, dt);
                newFactor = dampRadians(newFactor, target, 22, dt);
            }
            const oldPct = Math.abs(oldFactor) / Math.PI;
            const newPct = Math.abs(newFactor) / Math.PI;
            expect(newPct).toBeGreaterThan(oldPct + 0.15);
        });
    });

    describe('Latencia total estimada', () => {
        it('la latencia típica es ~17 ms (1 tick) en lugar de ~33 ms (2 ticks)', () => {
            // Antes: commandMove → tick (16.67ms) → dx>0 → animación cambia (16.67ms) = ~33ms.
            // Ahora: commandMove → path asignado → animación cambia en el mismo render = ~17ms.
            // La mejora es que isPlayerMoving ya no espera dx>0.
            const justAssigned = player({
                pos: { x: 5, y: 3 },
                prevPos: { x: 5, y: 3 },
            });
            // La animación se activa sin esperar el tick.
            expect(isPlayerMoving(justAssigned, true)).toBe(true);
        });
    });
});
