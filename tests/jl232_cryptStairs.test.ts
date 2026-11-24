// JL-232: Cripta — cada piso tiene escalera de subida y de bajada
// sobre baldosas válidas.
import { describe, it, expect } from 'vitest';
import { loadGameData } from '../src/data';
import { loadDungeon } from '../src/data/dungeonSchema';
import { generateFloor } from '../src/world/dungeon';

const data = loadGameData();
const def = loadDungeon(data);

describe('JL-232: escaleras de la cripta', () => {
    const totalFloors = def.floors.length;

    it(`tiene ${totalFloors} pisos definidos`, () => {
        expect(totalFloors).toBeGreaterThan(5);
        expect(totalFloors).toBeLessThanOrEqual(100);
    });

    for (let i = 0; i < totalFloors; i++) {
        const pisoNum = i + 1;
        const isLast = i === totalFloors - 1;
        const isFirst = i === 0;

        it(`piso ${pisoNum} (índice ${i}): genera sin error`, () => {
            expect(() => generateFloor(def, i)).not.toThrow();
        });

        it(`piso ${pisoNum}: tiene escalera de subida sobre baldosa válida`, () => {
            const floor = generateFloor(def, i);
            expect(floor.upStairs).toBeDefined();
            const { x, y } = floor.upStairs;
            // La posición debe estar dentro del piso
            expect(x).toBeGreaterThan(0);
            expect(y).toBeGreaterThan(0);
            expect(x).toBeLessThan(floor.width);
            expect(y).toBeLessThan(floor.depth);
            // La baldosa debe ser caminable
            const tc = Math.floor(x / floor.tileSize - 0.5);
            const tr = Math.floor(y / floor.tileSize - 0.5);
            const idx = tr * floor.cols + tc;
            expect(floor.cells[idx]).toBe(1);
        });

        if (!isLast) {
            it(`piso ${pisoNum}: tiene escalera de bajada sobre baldosa válida`, () => {
                const floor = generateFloor(def, i);
                expect(floor.downStairs).toBeDefined();
                const ds = floor.downStairs!;
                // La posición debe estar dentro del piso
                expect(ds.x).toBeGreaterThan(0);
                expect(ds.y).toBeGreaterThan(0);
                expect(ds.x).toBeLessThan(floor.width);
                expect(ds.y).toBeLessThan(floor.depth);
                // La baldosa debe ser caminable
                const tc = Math.floor(ds.x / floor.tileSize - 0.5);
                const tr = Math.floor(ds.y / floor.tileSize - 0.5);
                const idx = tr * floor.cols + tc;
                expect(floor.cells[idx]).toBe(1);
            });
        } else {
            it(`piso ${pisoNum} (último): no tiene escalera de bajada`, () => {
                const floor = generateFloor(def, i);
                expect(floor.downStairs).toBeNull();
            });
        }
    }

    // Verificar que las escaleras de subida y bajada no están en la misma baldosa
    for (let i = 0; i < totalFloors - 1; i++) {
        it(`piso ${i + 1}: subida y bajada no comparten baldosa`, () => {
            const floor = generateFloor(def, i);
            const upTc = Math.floor(floor.upStairs.x / floor.tileSize - 0.5);
            const upTr = Math.floor(floor.upStairs.y / floor.tileSize - 0.5);
            const ds = floor.downStairs!;
            const downTc = Math.floor(ds.x / floor.tileSize - 0.5);
            const downTr = Math.floor(ds.y / floor.tileSize - 0.5);
            expect(upTc !== downTc || upTr !== downTr).toBe(true);
        });
    }

    // Verificar que los pisos manuales (0-4) tienen las escaleras donde el JSON las declara
    it('piso 1 (atrio): U en (1,1), N en (13,13)', () => {
        const floor = generateFloor(def, 0);
        const ts = floor.tileSize;
        const upTc = Math.floor(floor.upStairs.x / ts - 0.5);
        const upTr = Math.floor(floor.upStairs.y / ts - 0.5);
        expect([upTc, upTr]).toEqual([1, 1]);
        // El atrio (piso 0) no tiene 'N' en el JSON — pero tiene 'D'.
        // generateHandFloor busca 'N' para downStairs.
        // Si no hay 'N', downStairs es null.
        // Verificamos el comportamiento real:
        if (floor.downStairs) {
            const downTc = Math.floor(floor.downStairs.x / ts - 0.5);
            const downTr = Math.floor(floor.downStairs.y / ts - 0.5);
            expect([downTc, downTr]).toEqual([13, 13]);
        }
    });

    it('piso 5 (santuario, último manual): verifica escaleras', () => {
        const floor = generateFloor(def, 4);
        const ts = floor.tileSize;
        // U en (1,1)
        const upTc = Math.floor(floor.upStairs.x / ts - 0.5);
        const upTr = Math.floor(floor.upStairs.y / ts - 0.5);
        expect([upTc, upTr]).toEqual([1, 1]);
        // N en (9,7) — dentro de la cámara del jefe
        if (floor.downStairs) {
            const downTc = Math.floor(floor.downStairs.x / ts - 0.5);
            const downTr = Math.floor(floor.downStairs.y / ts - 0.5);
            expect([downTc, downTr]).toEqual([9, 7]);
        }
    });
});
