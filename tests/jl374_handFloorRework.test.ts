import { describe, expect, it } from 'vitest';
import designedDungeonJson from '../data/dungeons/cripta-tulivieja.json';
import { loadGameData } from '../src/data';
import { loadDungeon } from '../src/data/dungeonSchema';
import { generateFloor } from '../src/world/dungeon';
import type { DesignedDungeonDef } from '../src/world/designedDungeon';

const designed = designedDungeonJson as unknown as DesignedDungeonDef;
const dungeon = loadDungeon(loadGameData());

const centerpieces: Record<string, string> = {
    'atrio-del-eco': 'crip_altar_huaca',
    'galeria-de-las-losetas': 'crip_urnas',
    'camara-del-candil': 'crip_sarcofago',
    'patio-del-cerrojo': 'crip_osario',
    'santuario-del-hilo-roto': 'crip_sarcofago_oro',
};

describe('JL-374: rework de los pisos a mano', () => {
    it('cada plano conserva un contorno propio y salas con forma', () => {
        const floors = designed.floors.filter((floor) => floor.mode === 'hand');
        expect(floors).toHaveLength(5);
        expect(new Set(floors.map((floor) => floor.rows?.join('\n'))).size).toBe(5);

        for (const floor of floors) {
            const interiorWalls = (floor.rows ?? []).slice(1, -1).reduce(
                (count, row) => count + [...row.slice(1, -1)].filter((tile) => tile === '#').length,
                0,
            );
            expect(interiorWalls, floor.id).toBeGreaterThanOrEqual(18);
        }
    });

    it('cada piso tiene una pieza central propia y antorchas declaradas suficientes', () => {
        const floors = designed.floors.filter((floor) => floor.mode === 'hand');

        floors.forEach((floor, index) => {
            const centerpiece = centerpieces[floor.id];
            expect(centerpiece, floor.id).toBeDefined();
            const piece = floor.props?.find((prop) => prop.piece === centerpiece);
            expect(piece, `${floor.id}: falta ${centerpiece}`).toBeDefined();

            const centerX = ((floor.rows?.[0]?.length ?? 0) - 1) / 2;
            const centerY = ((floor.rows?.length ?? 0) - 1) / 2;
            const distance = Math.hypot(piece!.tile[0] - centerX, piece!.tile[1] - centerY);
            expect(distance, `${floor.id}: ${centerpiece} está a ${distance.toFixed(1)} baldosas del centro`).toBeLessThanOrEqual(4);

            const generated = generateFloor(dungeon, index);
            const declaredTorches = floor.torches?.length ?? 0;
            expect(declaredTorches, `${floor.id}: sin antorchas declaradas`).toBeGreaterThan(0);
            expect(generated.torches.length, `${floor.id}: antorchas no generadas`).toBe(declaredTorches);
        });
    });
});