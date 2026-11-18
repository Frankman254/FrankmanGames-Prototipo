import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { loadDungeon } from '../src/data/dungeonSchema';
import {
    generateFloor,
    floodDistances,
    proximityDoors,
} from '../src/world/dungeon';

const data = loadGameData();
const def = loadDungeon(data);

describe('PUE-01: puertas de proximidad con span mínimo 3 baldosas', () => {
    // Piso 7 tiene la puerta proximity 6:door:0 (definida en floors/007.json).
    it('piso 7: la puerta proximity tiene span ≥ 3.0 m', () => {
        const floor = generateFloor(def, 6);
        const door = floor.doors.find((d) => d.id === '6:door:0');
        expect(door, 'puerta 6:door:0 debe existir').toBeDefined();
        expect(door!.activation).toBe('proximity');
        expect(door!.span).toBeGreaterThanOrEqual(3.0);
    });

    it('piso 7: cells coincide con el span de la puerta proximity', () => {
        const floor = generateFloor(def, 6);
        const door = floor.doors.find((d) => d.id === '6:door:0')!;
        // El número de cells debe ser coherente con el span.
        const expectedCells = Math.round(door.span / floor.tileSize);
        expect(door.cells.length).toBe(expectedCells);
        // El span debe ser al menos 3.0 m (3 baldosas de 1 m, o equivalente).
        expect(door.span).toBeGreaterThanOrEqual(3.0);
    });

    it('piso 7: el camino de entrada a salida sigue existiendo', () => {
        const floor = generateFloor(def, 6);
        const start = floor.arrivalFromAbove;
        const end = floor.arrivalFromBelow ?? (floor.downStairs ? { x: floor.downStairs.x, y: floor.downStairs.y } : floor.arrivalFromAbove);
        // Verificar que hay camino usando floodDistances.
        const dist = floodDistances(floor.cells, floor.cols, floor.rows,
            Math.floor(start.x / floor.tileSize - 0.5),
            Math.floor(start.y / floor.tileSize - 0.5));
        const ec = Math.floor(end.x / floor.tileSize - 0.5);
        const er = Math.floor(end.y / floor.tileSize - 0.5);
        expect(dist[er * floor.cols + ec], 'debe haber camino desde entrada a salida').toBeGreaterThan(0);
    });

    it('piso 7: la puerta proximity no se abre si el jugador está lejos', () => {
        const floor = generateFloor(def, 6);
        const door = floor.doors.find((d) => d.id === '6:door:0')!;
        expect(door.activation).toBe('proximity');
        // Con el jugador lejos de la puerta, no se abre.
        const far = { x: door.x + 100, y: door.y + 100 };
        const open = proximityDoors(floor, new Set(), far, 5);
        expect(open).not.toContain(door.id);
    });

    it('todos los pisos 1-100: ninguna puerta proximity con span < 3.0 m', () => {
        for (let i = 0; i < def.floors.length; i++) {
            const floor = generateFloor(def, i);
            for (const door of floor.doors) {
                if (door.activation === 'proximity') {
                    expect(door.span, `piso ${i + 1}: puerta ${door.id} span < 3.0`).toBeGreaterThanOrEqual(3.0);
                }
            }
        }
    });

    it('todos los pisos 1-100: cells coincide con span para puertas proximity', () => {
        for (let i = 0; i < def.floors.length; i++) {
            const floor = generateFloor(def, i);
            for (const door of floor.doors) {
                if (door.activation === 'proximity') {
                    const expectedCells = Math.round(door.span / floor.tileSize);
                    expect(door.cells.length, `piso ${i + 1}: puerta ${door.id} cells`).toBe(expectedCells);
                }
            }
        }
    });

    it('pisos manuales: las puertas click no se expanden', () => {
        // Los 5 primeros pisos son manuales.
        for (let i = 0; i < 5; i++) {
            const floor = generateFloor(def, i);
            for (const door of floor.doors) {
                if (door.activation === 'click') {
                    expect(door.cells.length).toBe(1);
                }
            }
        }
    });

    it('piso 7: la puerta proximity no queda en celda de escalera', () => {
        const floor = generateFloor(def, 6);
        const door = floor.doors.find((d) => d.id === '6:door:0')!;
        const ts = floor.tileSize;
        for (const cell of door.cells) {
            const cx = (cell.c + 0.5) * ts;
            const cy = (cell.r + 0.5) * ts;
            const distUp = Math.hypot(cx - floor.upStairs.x, cy - floor.upStairs.y);
            expect(distUp, 'puerta no sobre escalera de subida').toBeGreaterThan(1.0);
            if (floor.downStairs) {
                const distDown = Math.hypot(cx - floor.downStairs.x, cy - floor.downStairs.y);
                expect(distDown, 'puerta no sobre escalera de bajada').toBeGreaterThan(1.0);
            }
        }
    });
});
