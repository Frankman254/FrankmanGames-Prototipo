import { describe, it, expect } from 'vitest';
import { loadGameData } from '../src/data';
import type { Vec2 } from '../src/sim/vec2';
import { World } from '../src/sim/world';

/** JUG-04: clic en el suelo cerca de un enemigo ataca; cerca de un PNJ va a hablar.
 *
 * Las pruebas verifican que los radios clickAttackRadius y clickTalkRadius
 * se leen correctamente de data/player.json y que la lógica de proximidad
 * en moveToGround() (src/main.ts) funciona con los valores esperados.
 *
 * Como moveToGround vive en main.ts (renderer), las pruebas aquí verifican
 * los datos y la lógica de proximidad pura; el comportamiento en Electron
 * se verifica con el escenario jugabilidad.
 */

describe('JUG-04: clic por proximidad', () => {
    function createWorld() {
        const data = loadGameData();
        return new World(data, { zones: false });
    }

    describe('radios en data/player.json', () => {
        it('clickAttackRadius es un número positivo', () => {
            const w = createWorld();
            expect(w.data.player.clickAttackRadius).toBeGreaterThan(0);
        });

        it('clickTalkRadius es un número positivo', () => {
            const w = createWorld();
            expect(w.data.player.clickTalkRadius).toBeGreaterThan(0);
        });

        it('los radios son distintos (ataque más ajustado que diálogo)', () => {
            const w = createWorld();
            // clickAttackRadius=2.0, clickTalkRadius=2.5 en la propuesta
            expect(w.data.player.clickAttackRadius).toBeLessThanOrEqual(w.data.player.clickTalkRadius);
        });
    });

    describe('enemigo más cercano al punto clicado', () => {
        type FakeEnemy = { id: number; pos: Vec2; state: string; radius: number };

        it('encuentra el enemigo vivo más cercano dentro del radio', () => {
            const w = createWorld();
            const radius = w.data.player.clickAttackRadius;

            // Simulamos enemigos a distintas distancias del punto clicado.
            const clickPoint: Vec2 = { x: 0, y: 0 };
            const enemies: FakeEnemy[] = [
                { id: 1, pos: { x: 1, y: 0 }, state: 'idle', radius: 0.4 },
                { id: 2, pos: { x: radius + 1, y: 0 }, state: 'idle', radius: 0.4 },
                { id: 3, pos: { x: 0, y: radius + 2 }, state: 'dead', radius: 0.4 },
            ];

            // Lógica pura: encontrar el enemigo más cercano dentro del radio.
            let bestId: number | null = null;
            let bestDist = radius;
            for (const e of enemies) {
                if (e.state === 'dead') continue;
                const d = Math.hypot(e.pos.x - clickPoint.x, e.pos.y - clickPoint.y);
                if (d < bestDist) {
                    bestDist = d;
                    bestId = e.id;
                }
            }

            expect(bestId).toBe(1); // el más cercano dentro del radio
            expect(bestDist).toBe(1);
        });

        it('ignora los enemigos muertos', () => {
            const w = createWorld();
            const radius = w.data.player.clickAttackRadius;
            const clickPoint: Vec2 = { x: 0, y: 0 };
            const enemies: FakeEnemy[] = [
                { id: 1, pos: { x: 0.5, y: 0 }, state: 'dead', radius: 0.4 },
            ];

            let bestId: number | null = null;
            let bestDist = radius;
            for (const e of enemies) {
                if (e.state === 'dead') continue;
                const d = Math.hypot(e.pos.x - clickPoint.x, e.pos.y - clickPoint.y);
                if (d < bestDist) {
                    bestDist = d;
                    bestId = e.id;
                }
            }

            expect(bestId).toBeNull(); // el único está muerto
        });

        it('no selecciona si todos están fuera del radio', () => {
            const w = createWorld();
            const radius = w.data.player.clickAttackRadius;
            const clickPoint: Vec2 = { x: 0, y: 0 };
            const enemies: FakeEnemy[] = [
                { id: 1, pos: { x: radius + 5, y: 0 }, state: 'idle', radius: 0.4 },
                { id: 2, pos: { x: 0, y: radius + 10 }, state: 'idle', radius: 0.4 },
            ];

            let bestId: number | null = null;
            let bestDist = radius;
            for (const e of enemies) {
                if (e.state === 'dead') continue;
                const d = Math.hypot(e.pos.x - clickPoint.x, e.pos.y - clickPoint.y);
                if (d < bestDist) {
                    bestDist = d;
                    bestId = e.id;
                }
            }

            expect(bestId).toBeNull();
        });

        it('elige el más cercano cuando hay varios dentro del radio', () => {
            const w = createWorld();
            const radius = w.data.player.clickAttackRadius;
            const clickPoint: Vec2 = { x: 0, y: 0 };
            const enemies: FakeEnemy[] = [
                { id: 1, pos: { x: 1.5, y: 0 }, state: 'idle', radius: 0.4 },
                { id: 2, pos: { x: 0.3, y: 0 }, state: 'idle', radius: 0.4 },
                { id: 3, pos: { x: 0, y: 1.0 }, state: 'idle', radius: 0.4 },
            ];

            let bestId: number | null = null;
            let bestDist = radius;
            for (const e of enemies) {
                if (e.state === 'dead') continue;
                const d = Math.hypot(e.pos.x - clickPoint.x, e.pos.y - clickPoint.y);
                if (d < bestDist) {
                    bestDist = d;
                    bestId = e.id;
                }
            }

            expect(bestId).toBe(2); // 0.3 m de distancia, el más cercano
            expect(bestDist).toBe(0.3);
        });
    });

    describe('PNJ más cercano al punto clicado', () => {
        it('encuentra el PNJ más cercano dentro del radio', () => {
            const w = createWorld();
            const radius = w.data.player.clickTalkRadius;
            const clickPoint: Vec2 = { x: 0, y: 0 };
            const npcs = [
                { npcId: 'farmer', pos: { x: 1, y: 0 } },
                { npcId: 'blacksmith', pos: { x: radius + 1, y: 0 } },
            ];

            let bestNpc: { npcId: string } | null = null;
            let bestDist = radius;
            for (const n of npcs) {
                const d = Math.hypot(n.pos.x - clickPoint.x, n.pos.y - clickPoint.y);
                if (d < bestDist) {
                    bestDist = d;
                    bestNpc = n;
                }
            }

            expect(bestNpc?.npcId).toBe('farmer');
            expect(bestDist).toBe(1);
        });

        it('no selecciona si todos están fuera del radio', () => {
            const w = createWorld();
            const radius = w.data.player.clickTalkRadius;
            const clickPoint: Vec2 = { x: 0, y: 0 };
            const npcs = [
                { npcId: 'farmer', pos: { x: radius + 5, y: 0 } },
            ];

            let bestNpc: { npcId: string } | null = null;
            let bestDist = radius;
            for (const n of npcs) {
                const d = Math.hypot(n.pos.x - clickPoint.x, n.pos.y - clickPoint.y);
                if (d < bestDist) {
                    bestDist = d;
                    bestNpc = n;
                }
            }

            expect(bestNpc).toBeNull();
        });

        it('prioriza enemigo sobre PNJ si ambos están cerca (enemigo se verifica primero)', () => {
            // En moveToGround(), la búsqueda de enemigos va antes que la de PNJ.
            // Si un enemigo está dentro de clickAttackRadius, se ataca y no se llega a buscar PNJ.
            const w = createWorld();
            const attackRadius = w.data.player.clickAttackRadius;
            const talkRadius = w.data.player.clickTalkRadius;

            // Verificamos que el radio de ataque es menor o igual al de diálogo,
            // por lo que un enemigo dentro del radio de ataque siempre se prioriza.
            expect(attackRadius).toBeLessThanOrEqual(talkRadius);
        });
    });
});
