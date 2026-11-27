import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { loadDungeon } from '../src/data/dungeonSchema';
import { waterCircles } from '../src/sim/navGrid';
import { generateFloor } from '../src/world/dungeon';

const data = loadGameData();
const def = loadDungeon(data);
const ROOM_MARGIN_TILES = 1;
const EPSILON = 1e-9;

describe('JL-367: lóbulos de estanques dentro de su sala en los 100 pisos', () => {
    it('mantiene cada círculo dentro del rectángulo de la sala menos una baldosa', () => {
        expect(def.floors).toHaveLength(100);
        const failures: string[] = [];
        let lobedPools = 0;

        for (let index = 0; index < def.floors.length; index++) {
            const floor = generateFloor(def, index);
            for (const pool of floor.pools) {
                if (!pool.lobes?.length) continue;
                lobedPools++;

                const room = floor.rooms.find(
                    (candidate) =>
                        pool.x >= candidate.x0 * floor.tileSize &&
                        pool.x < (candidate.x0 + candidate.w) * floor.tileSize &&
                        pool.y >= candidate.y0 * floor.tileSize &&
                        pool.y < (candidate.y0 + candidate.h) * floor.tileSize,
                );
                if (!room) {
                    failures.push(`piso ${index + 1}: ${pool.id} no tiene una sala que contenga su centro`);
                    continue;
                }

                const margin = ROOM_MARGIN_TILES * floor.tileSize;
                const left = room.x0 * floor.tileSize + margin;
                const right = (room.x0 + room.w) * floor.tileSize - margin;
                const top = room.y0 * floor.tileSize + margin;
                const bottom = (room.y0 + room.h) * floor.tileSize - margin;

                waterCircles(pool).forEach((circle, circleIndex) => {
                    if (
                        circle.x - circle.radius < left - EPSILON ||
                        circle.x + circle.radius > right + EPSILON ||
                        circle.y - circle.radius < top - EPSILON ||
                        circle.y + circle.radius > bottom + EPSILON
                    ) {
                        failures.push(
                            `piso ${index + 1}: ${pool.id}, círculo ${circleIndex} ` +
                                `(${circle.x.toFixed(2)}, ${circle.y.toFixed(2)}, r=${circle.radius.toFixed(2)}) ` +
                                `sale del interior (${left.toFixed(2)}, ${top.toFixed(2)})–(${right.toFixed(2)}, ${bottom.toFixed(2)})`,
                        );
                    }
                });
            }
        }

        expect(lobedPools, 'la comprobación debe abarcar los estanques con lóbulos generados').toBeGreaterThan(0);
        expect(failures, failures.join('\n')).toEqual([]);
    });
});
