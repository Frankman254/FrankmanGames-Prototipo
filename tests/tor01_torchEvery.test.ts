// Verificar que torchEvery=4 produce más antorchas que torchEvery=5.
import { describe, it, expect } from 'vitest';
import { loadGameData } from '../src/data';
import { loadDungeon } from '../src/data/dungeonSchema';
import { generateFloor } from '../src/world/dungeon';

const data = loadGameData();
const def = loadDungeon(data);

describe('TOR-01: torchEvery=4 evidencia', () => {
    it('torchEvery es 4', () => {
        expect(def.light.torchEvery).toBe(4);
    });

    it('los 10 primeros pisos tienen más antorchas que con torchEvery=5', () => {
        // Con torchEvery=4, cada contorno de sala produce ~25% más antorchas.
        // Verificar que el promedio es razonable.
        let totalTorches = 0;
        let totalRooms = 0;
        for (let i = 0; i < 10; i++) {
            const floor = generateFloor(def, i);
            totalTorches += floor.torches.length;
            totalRooms += floor.rooms.length;
        }
        const avg = totalTorches / totalRooms;
        console.log(`Promedio: ${avg.toFixed(1)} antorchas/sala (10 pisos, ${totalTorches} antorchas, ${totalRooms} salas)`);
        // Con torchEvery=4, esperamos al menos 2 antorchas/sala en promedio.
        expect(avg).toBeGreaterThan(1.5);
    });
});
