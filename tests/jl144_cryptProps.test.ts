import { describe, it, expect } from 'vitest';
import { generateFloor } from '../src/world/dungeon';
import dungeonDef from '../data/dungeon.json';
import designedDungeonJson from '../data/dungeons/cripta-tulivieja.json';
import type { DesignedDungeonDef } from '../src/world/designedDungeon';

const def = dungeonDef as any;
const designed = designedDungeonJson as any as DesignedDungeonDef;

/** Convierte posición en metros a coordenadas de baldosa. */
function posToTile(tileSize: number, x: number, y: number): { c: number; r: number } {
    return { c: Math.floor(x / tileSize), r: Math.floor(y / tileSize) };
}

describe('JL-144: utilería de la cripta no tapa pasillos ni antorchas', () => {
    const handIndices: number[] = [];
    for (let i = 0; i < designed.floors.length; i++) {
        if (designed.floors[i]?.mode === 'hand') handIndices.push(i);
    }

    it('hay 5 pisos a mano con props', () => {
        expect(handIndices).toHaveLength(5);
        for (const i of handIndices) {
            const fl = designed.floors[i]!;
            expect(fl.props, `${fl.id} sin props`).toBeDefined();
            expect(fl.props!.length, `${fl.id} sin piezas`).toBeGreaterThan(0);
        }
    });

    it('cada prop está sobre una baldosa caminable, no roca', () => {
        const ts = designed.tileSize || def.tileSize;
        for (const i of handIndices) {
            const floor = generateFloor(def, i);
            const hand = designed.floors[i]!;
            for (const p of hand.props ?? []) {
                const { c, r } = posToTile(ts, p.tile[0] * ts + ts * 0.5, p.tile[1] * ts + ts * 0.5);
                const idx = r * floor.cols + c;
                expect(
                    floor.cells[idx],
                    `${hand.id}: prop "${p.piece}" en baldosa ${c},${r} no es caminable`,
                ).toBe(1);
            }
        }
    });

    it('ningún prop cae sobre la baldosa de una escalera', () => {
        for (const i of handIndices) {
            const floor = generateFloor(def, i);
            const hand = designed.floors[i]!;
            const stairsTiles = new Set<string>();
            // Escalera de subida
            const up = posToTile(floor.tileSize, floor.upStairs.x, floor.upStairs.y);
            stairsTiles.add(`${up.c},${up.r}`);
            // Escalera de bajada
            if (floor.downStairs) {
                const down = posToTile(floor.tileSize, floor.downStairs.x, floor.downStairs.y);
                stairsTiles.add(`${down.c},${down.r}`);
            }
            for (const p of floor.props) {
                const { c, r } = posToTile(floor.tileSize, p.pos.x, p.pos.y);
                const key = `${c},${r}`;
                expect(
                    stairsTiles.has(key),
                    `${hand.id}: prop "${p.piece}" en ${key} cae sobre escalera`,
                ).toBe(false);
            }
        }
    });

    it('ningún prop cae sobre la baldosa de un cofre', () => {
        for (const i of handIndices) {
            const floor = generateFloor(def, i);
            const hand = designed.floors[i]!;
            const chestTiles = new Set<string>();
            for (const ch of floor.chests) {
                const { c, r } = posToTile(floor.tileSize, ch.pos.x, ch.pos.y);
                chestTiles.add(`${c},${r}`);
            }
            for (const p of floor.props) {
                const { c, r } = posToTile(floor.tileSize, p.pos.x, p.pos.y);
                const key = `${c},${r}`;
                expect(
                    chestTiles.has(key),
                    `${hand.id}: prop "${p.piece}" en ${key} cae sobre cofre`,
                ).toBe(false);
            }
        }
    });

    it('ningún prop cae sobre la baldosa de una puerta', () => {
        for (const i of handIndices) {
            const floor = generateFloor(def, i);
            const hand = designed.floors[i]!;
            const doorTiles = new Set<string>();
            for (const d of floor.doors) {
                for (const cell of d.cells) {
                    doorTiles.add(`${cell.c},${cell.r}`);
                }
            }
            for (const p of floor.props) {
                const { c, r } = posToTile(floor.tileSize, p.pos.x, p.pos.y);
                const key = `${c},${r}`;
                expect(
                    doorTiles.has(key),
                    `${hand.id}: prop "${p.piece}" en ${key} cae sobre puerta`,
                ).toBe(false);
            }
        }
    });

    it('ningún prop está en la misma baldosa que una antorcha generada', () => {
        for (const i of handIndices) {
            const floor = generateFloor(def, i);
            const hand = designed.floors[i]!;
            // Las antorchas están en el borde de la baldosa de roca/suelo.
            // La baldosa de suelo adyacente es donde "se ve" la antorcha.
            const torchWalkTiles = new Set<string>();
            for (const t of floor.torches) {
                // La antorcha está en (x, y) con normal (nx, ny).
                // La baldosa caminable es la que está en la dirección de la normal.
                const { c: wc, r: wr } = posToTile(
                    floor.tileSize,
                    t.x + t.nx * floor.tileSize * 0.5,
                    t.y + t.ny * floor.tileSize * 0.5,
                );
                torchWalkTiles.add(`${wc},${wr}`);
            }
            for (const p of floor.props) {
                const { c, r } = posToTile(floor.tileSize, p.pos.x, p.pos.y);
                const key = `${c},${r}`;
                expect(
                    torchWalkTiles.has(key),
                    `${hand.id}: prop "${p.piece}" en ${key} está en la misma baldosa que una antorcha`,
                ).toBe(false);
            }
        }
    });

    it('ningún prop está a menos de 1 baldosa de una antorcha generada', () => {
        for (const i of handIndices) {
            const floor = generateFloor(def, i);
            const hand = designed.floors[i]!;
            const torchWalkTiles: Array<{ c: number; r: number }> = [];
            for (const t of floor.torches) {
                const { c, r } = posToTile(
                    floor.tileSize,
                    t.x + t.nx * floor.tileSize * 0.5,
                    t.y + t.ny * floor.tileSize * 0.5,
                );
                torchWalkTiles.push({ c, r });
            }
            for (const p of floor.props) {
                const { c: pc, r: pr } = posToTile(floor.tileSize, p.pos.x, p.pos.y);
                for (const tc of torchWalkTiles) {
                    const dist = Math.max(Math.abs(pc - tc.c), Math.abs(pr - tc.r));
                    expect(
                        dist,
                        `${hand.id}: prop "${p.piece}" en ${pc},${pr} muy cerca de antorcha en ${tc.c},${tc.r} (dist ${dist})`,
                    ).toBeGreaterThanOrEqual(1);
                }
            }
        }
    });

    it('los 12 props de los 5 pisos pasan todas las verificaciones', () => {
        let total = 0;
        for (const i of handIndices) {
            const floor = generateFloor(def, i);
            total += floor.props.length;
        }
        expect(total).toBe(12);
    });
});
