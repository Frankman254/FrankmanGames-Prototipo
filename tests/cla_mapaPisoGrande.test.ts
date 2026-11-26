import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { loadDungeon } from '../src/data/dungeonSchema';
import { generateFloor, floorGameData } from '../src/world/dungeon';
import { World } from '../src/sim/world';
import { buildMapFrame } from '../src/ui/map/mapFeed';
import { makeSessionAt } from '../scripts/balance/scenarios';

// El creador (2026-11-25): «no se ve el mapa en los pisos de la mazmorra». Desde el 6.º piso la
// rejilla pasa de 16 K celdas y el mapa del piso y el minimapa no recibían nada que dibujar.
const data = loadGameData();
const def = loadDungeon(data);

function frame(index: number, inside: string, dungeonFloor: number | null) {
    const f = generateFloor(def, index);
    const fd = floorGameData(data, f, f.arrivalFromAbove);
    const s = makeSessionAt(fd, 'storm_weaver', 1, 1, false);
    const world = new World(fd, { encounter: false, character: s.character });
    return {
        world,
        frame: buildMapFrame({
            world,
            session: s,
            cameraYawDeg: 0,
            inside,
            zones: data.zones,
            waters: [],
            names: {},
            stones: [],
            landmarks: [],
            dungeonFloor,
            dungeonFeatures: [],
        }),
    };
}

describe('el mapa de los pisos grandes de la cripta', () => {
    it('el piso 6 y el 100 mandan su rejilla al mapa aunque pasen de 16 K celdas', () => {
        for (const index of [5, 99]) {
            const { world, frame: f } = frame(index, `Piso ${index + 1}`, index);
            expect(world.grid.cols * world.grid.rows).toBeGreaterThan(1 << 14);
            expect(f.interiorGrid).toBe(world.grid);
        }
    });
    it('un interior grande que no es la cripta sigue sin rejilla (la barriada tiene su imagen)', () => {
        const { frame: f } = frame(5, 'Barriada', null);
        expect(f.interiorGrid).toBeNull();
    });
    it('los pisos pequeños siguen igual', () => {
        const { world, frame: f } = frame(0, 'Piso 1', 0);
        expect(f.interiorGrid).toBe(world.grid);
    });
});
