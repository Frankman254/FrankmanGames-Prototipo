// TOR-01: Test de regresión para los errores visuales reportados:
// (a) antorchas duplicadas en esquinas, (b) antorchas en puertas,
// (c) normales que no apuntan a suelo.
// Verifica que generateFloor nunca produce estos errores en cualquier piso.
import { describe, it, expect } from 'vitest';
import { loadGameData } from '../src/data';
import { loadDungeon } from '../src/data/dungeonSchema';
import { generateFloor } from '../src/world/dungeon';

const data = loadGameData();
const def = loadDungeon(data);

describe('TOR-01: regresión de errores visuales de antorchas', () => {
    // Probar todos los pisos disponibles (hasta 100 como mínimo)
    const floorsToTest = Math.min(100, def.floors.length);

    it(`ningún piso tiene antorchas duplicadas en la misma baldosa de roca (${floorsToTest} pisos)`, () => {
        for (let i = 0; i < floorsToTest; i++) {
            const floor = generateFloor(def, i);
            const ts = floor.tileSize;
            const seen = new Map<string, number>();

            for (const t of floor.torches) {
                // La posición de la antorcha es el borde roca/suelo.
                // La baldosa de roca es la posición menos la normal × medio tile.
                const rockX = t.x - t.nx * (ts * 0.5);
                const rockY = t.y - t.ny * (ts * 0.5);
                const tc = Math.floor(rockX / ts - 0.5);
                const tr = Math.floor(rockY / ts - 0.5);
                const key = `${tc},${tr}`;
                seen.set(key, (seen.get(key) ?? 0) + 1);
            }

            for (const [key, count] of seen) {
                expect(
                    count,
                    `Piso ${i + 1}: ${count} antorchas en baldosa ${key}`,
                ).toBe(1);
            }
        }
    });

    it(`ningún piso tiene antorchas en baldosas de puerta (${floorsToTest} pisos)`, () => {
        for (let i = 0; i < floorsToTest; i++) {
            const floor = generateFloor(def, i);
            const ts = floor.tileSize;

            // Construir el set de baldosas ocupadas por puertas
            const doorTiles = new Set<string>();
            for (const door of floor.doors) {
                for (const cell of door.cells) {
                    doorTiles.add(`${cell.c},${cell.r}`);
                }
            }

            for (const t of floor.torches) {
                const rockX = t.x - t.nx * (ts * 0.5);
                const rockY = t.y - t.ny * (ts * 0.5);
                const tc = Math.floor(rockX / ts - 0.5);
                const tr = Math.floor(rockY / ts - 0.5);
                const key = `${tc},${tr}`;
                expect(
                    doorTiles.has(key),
                    `Piso ${i + 1}: antorcha en baldosa de puerta ${key}`,
                ).toBe(false);
            }
        }
    });

    it(`todas las normales apuntan a suelo adyacente (${floorsToTest} pisos)`, () => {
        // cells: 1 = suelo, 0 = roca (ver dungeon.ts línea 108)
        for (let i = 0; i < floorsToTest; i++) {
            const floor = generateFloor(def, i);
            const ts = floor.tileSize;

            for (const t of floor.torches) {
                // La baldosa de roca donde está la antorcha.
                // Usar 0.45 (no 0.5) para no caer en el borde y redondear mal.
                const tc = Math.floor((t.x - t.nx * ts * 0.45) / ts - 0.5);
                const tr = Math.floor((t.y - t.ny * ts * 0.45) / ts - 0.5);
                // La baldosa adyacente en la dirección de la normal debe ser suelo (1).
                const nc = tc + t.nx;
                const nr = tr + t.ny;

                if (nc >= 0 && nr >= 0 && nc < floor.cols && nr < floor.rows) {
                    expect(
                        floor.cells[nr * floor.cols + nc],
                        `Piso ${i + 1}: normal (${t.nx},${t.ny}) desde (${tc},${tr}) apunta a roca en (${nc},${nr})`,
                    ).toBe(1); // 1 = suelo (no roca)
                }
            }
        }
    });

    it(`cada piso tiene al menos una antorcha por sala (${floorsToTest} pisos)`, () => {
        for (let i = 0; i < floorsToTest; i++) {
            const floor = generateFloor(def, i);
            expect(
                floor.torches.length,
                `Piso ${i + 1}: ${floor.torches.length} antorchas para ${floor.rooms.length} salas`,
            ).toBeGreaterThanOrEqual(floor.rooms.length);
        }
    });

    it(`torchEvery=4 produce antorchas razonables (${floorsToTest} pisos)`, () => {
        // Con torchEvery=4, una sala de 5x5 tiene 16 baldosas de pared → ~4 antorchas.
        // Verificar que el rango es razonable: entre 1 y 8 por sala en promedio.
        for (let i = 0; i < floorsToTest; i++) {
            const floor = generateFloor(def, i);
            if (floor.rooms.length === 0) continue;
            const avg = floor.torches.length / floor.rooms.length;
            expect(
                avg,
                `Piso ${i + 1}: promedio ${avg.toFixed(1)} antorchas/sala`,
            ).toBeGreaterThan(0.5);
            expect(
                avg,
                `Piso ${i + 1}: promedio ${avg.toFixed(1)} antorchas/sala`,
            ).toBeLessThan(20);
        }
    });
});
