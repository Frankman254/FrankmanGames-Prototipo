import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { loadDungeon } from '../src/data/dungeonSchema';
import { World } from '../src/sim/world';
import { waterDistance } from '../src/sim/navGrid';
import { floodDistances, floorGameData, generateFloor } from '../src/world/dungeon';

const data = loadGameData();
const def = loadDungeon(data);
const SHORE_DISTANCE = 1;

describe('JL-363: navegación de estanques con lóbulos en los 100 pisos', () => {
    it('mantiene una orilla alcanzable y una ruta a la escalera de bajada', () => {
        expect(def.floors).toHaveLength(100);
        const failures: string[] = [];
        let lobedPools = 0;

        for (let index = 0; index < def.floors.length; index++) {
            const floor = generateFloor(def, index);
            const world = new World(floorGameData(data, floor, floor.arrivalFromAbove), {
                seed: 7,
                encounter: false,
                interior: true,
                pools: floor.pools,
            });
            const grid = world.grid;
            const walkable = new Uint8Array(grid.cols * grid.rows);
            for (let cell = 0; cell < walkable.length; cell++) walkable[cell] = grid.cell(cell) === 0 ? 1 : 0;

            const start = grid.cellOf(floor.arrivalFromAbove);
            if (!grid.walkableCell(start.cx, start.cy)) failures.push(`piso ${index + 1}: la llegada no es caminable`);
            const distances = floodDistances(walkable, grid.cols, grid.rows, start.cx, start.cy);
            if (floor.downStairs) {
                const down = grid.cellOf(floor.downStairs);
                const distance = distances[grid.index(down.cx, down.cy)] ?? -1;
                if (distance < 0) failures.push(`piso ${index + 1}: el agua corta la ruta a la escalera de bajada`);
            }

            for (const pool of floor.pools) {
                if (!pool.lobes?.length) continue;
                lobedPools++;
                let connectedShore = false;
                for (let cell = 0; cell < walkable.length; cell++) {
                    if (!walkable[cell] || distances[cell]! < 0) continue;
                    const point = grid.center(cell);
                    const distance = waterDistance(pool, point);
                    if (distance >= 0 && distance <= SHORE_DISTANCE) {
                        connectedShore = true;
                        break;
                    }
                }
                if (!connectedShore)
                    failures.push(`piso ${index + 1}: ${pool.id} no tiene orilla caminable conectada con la llegada`);
            }
        }

        expect(lobedPools, 'la comprobación debe abarcar los estanques generados').toBeGreaterThan(0);
        expect(failures, failures.join('\n')).toEqual([]);
    });
});
