import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { loadDungeon } from '../src/data/dungeonSchema';
import { World } from '../src/sim/world';
import { cryptStaffSpots, floorGameData, generateFloor } from '../src/world/dungeon';

const data = loadGameData();
const def = loadDungeon(data);

describe('JL-364: recarga de contenido RPG dentro de la cripta', () => {
    it('conserva a Chalo y Nina al aplicar de nuevo el contenido RPG', () => {
        const floor = generateFloor(def, 0);
        const world = new World(floorGameData(data, floor, floor.arrivalFromAbove), {
            seed: 7,
            encounter: false,
            interior: true,
            pools: floor.pools,
        });
        const spots = cryptStaffSpots(floor.arrivalFromAbove, 2, (pos) => world.grid.walkable(pos));
        const chalo = world.placeInteriorNpc('crypt_peddler', 'crypt_peddler', spots[0]!);
        const nina = world.placeInteriorNpc('crypt_guide', null, spots[1]!);
        expect(chalo && nina).toBeTruthy();
        const before = world.npcs.map((npc) => ({ ...npc, pos: { ...npc.pos } }));

        expect(before.map((npc) => npc.npcId)).toEqual(['crypt_peddler', 'crypt_guide']);
        world.applyRpgContent();

        expect(world.npcs).toEqual(before);
    });
});
