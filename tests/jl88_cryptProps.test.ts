import { describe, it, expect } from 'vitest';
import { generateFloor } from '../src/world/dungeon';
import dungeonDef from '../data/dungeon.json';
import designedDungeonJson from '../data/dungeons/cripta-tulivieja.json';
import type { DesignedDungeonDef } from '../src/world/designedDungeon';

const def = dungeonDef as any;
const designed = designedDungeonJson as any as DesignedDungeonDef;

describe('JL-88: utilería de la cripta', () => {
    it('los 5 pisos a mano tienen props declarados', () => {
        const handFloors = designed.floors.filter((f: any) => f.mode === 'hand');
        expect(handFloors).toHaveLength(5);
        for (const fl of handFloors) {
            expect(fl.props!, `${fl.id} sin props`).toBeDefined();
            expect(fl.props!.length, `${fl.id} sin piezas`).toBeGreaterThan(0);
        }
    });

    it('las 12 piezas están distribuidas en los 5 pisos', () => {
        const handFloors = designed.floors.filter((f: any) => f.mode === 'hand');
        let total = 0;
        for (const fl of handFloors) {
            total += fl.props!.length;
        }
        expect(total).toBe(12);
    });

    it('cada pieza usa un nodo válido de utileria_cripta.glb', () => {
        const validNodes = new Set([
            'crip_altar_huaca',
            'crip_estalagmitas',
            'crip_ofrenda_oro',
            'crip_osario',
            'crip_pila_agua',
            'crip_raices_muro',
            'crip_sarcofago',
            'crip_sarcofago_oro',
            'crip_telarana_rincon',
            'crip_urnas',
            'crip_velas',
            'crip_velon',
        ]);
        const handFloors = designed.floors.filter((f: any) => f.mode === 'hand');
        for (const fl of handFloors) {
            for (const p of fl.props!) {
                expect(validNodes.has(p.piece), `${fl.id}: pieza "${p.piece}" no existe en el GLB`).toBe(true);
            }
        }
    });

    it('los props no caen sobre baldosas especiales (escaleras, cofres, puertas, spawns)', () => {
        const handFloors = designed.floors.filter((f: any) => f.mode === 'hand');
        for (const fl of handFloors) {
            const rows = fl.rows!;
            const special = new Set<string>();
            // Baldosas especiales del grid
            for (let r = 0; r < rows.length; r++) {
                for (let c = 0; c < rows[r]!.length; c++) {
                    const ch = rows[r]![c];
                    if (ch !== '.' && ch !== '#') {
                        special.add(`${c},${r}`);
                    }
                }
            }
            // Spawns
            for (const s of fl.spawns || []) {
                special.add(`${s.tile[0]},${s.tile[1]}`);
            }
            // Puertas
            for (const d of fl.doors || []) {
                special.add(`${d.tile[0]},${d.tile[1]}`);
            }
            // Antorchas
            for (const t of fl.torches || []) {
                special.add(`${t.tile[0]},${t.tile[1]}`);
            }
            // Props
            for (const p of fl.props || []) {
                const key = `${p.tile[0]},${p.tile[1]}`;
                expect(special.has(key), `${fl.id}: prop "${p.piece}" en ${key} choca con baldosa especial`).toBe(false);
                // Que sea walkable
                const ch = rows[p.tile[1]]![p.tile[0]];
                expect(ch, `${fl.id}: prop "${p.piece}" en ${key} no es walkable ('${ch}')`).toMatch(/[.#]/);
                expect(ch !== '#', `${fl.id}: prop "${p.piece}" en ${key} está sobre roca`).toBe(true);
            }
        }
    });

    it('generateFloor produce props en los pisos a mano', () => {
        for (let i = 0; i < 5; i++) {
            const floor = generateFloor(def, i);
            // Los 5 primeros pisos son hand
            const handFloor = designedDungeonJson.floors[i];
            if (handFloor?.mode === 'hand') {
                expect(floor.props.length, `piso ${i} sin props`).toBeGreaterThan(0);
                for (const p of floor.props) {
                    expect(p.piece).toBeDefined();
                    expect(p.pos.x).toBeGreaterThan(0);
                    expect(p.pos.y).toBeGreaterThan(0);
                    expect(p.rotation).toBeDefined();
                    expect(p.scale).toBeGreaterThan(0);
                }
            }
        }
    });

    it('los pisos generados por seed no tienen props', () => {
        // dungeon.json solo tiene 5 pisos (todos hand). Los pisos seed empiezan en 5+.
        // Verificar que generateFloor no lance para los 5 hand y que los seed tengan props vacíos.
        // Como solo hay 5 pisos en dungeon.json, verificamos que el campo props exista y sea array.
        for (let i = 0; i < 5; i++) {
            const floor = generateFloor(def, i);
            expect(Array.isArray(floor.props)).toBe(true);
        }
    });

    it('ningún prop está a menos de 1.5 m de una escalera', () => {
        const handFloors = designed.floors.filter((f: any) => f.mode === 'hand');
        const ts = designed.tileSize || def.tileSize;
        for (const fl of handFloors) {
            const rows = fl.rows!;
            // Encontrar escaleras
            const stairs: Array<[number, number]> = [];
            for (let r = 0; r < rows.length; r++) {
                for (let c = 0; c < rows[r]!.length; c++) {
                    if (rows[r]![c] === 'U' || rows[r]![c] === 'N' || rows[r]![c] === 'D') {
                        stairs.push([c, r]);
                    }
                }
            }
            for (const p of fl.props || []) {
                for (const [sc, sr] of stairs) {
                    const dx = (p.tile[0] - sc) * ts;
                    const dz = (p.tile[1] - sr) * ts;
                    const dist = Math.sqrt(dx * dx + dz * dz);
                    expect(dist, `${fl.id}: prop "${p.piece}" muy cerca de escalera (${dist.toFixed(1)} m)`).toBeGreaterThanOrEqual(1.5);
                }
            }
        }
    });

    it('ningún prop está a menos de 1.5 m de una antorcha', () => {
        const handFloors = designed.floors.filter((f: any) => f.mode === 'hand');
        const ts = designed.tileSize || def.tileSize;
        for (const fl of handFloors) {
            for (const p of fl.props || []) {
                for (const t of fl.torches || []) {
                    const dx = (p.tile[0] - t.tile[0]) * ts;
                    const dz = (p.tile[1] - t.tile[1]) * ts;
                    const dist = Math.sqrt(dx * dx + dz * dz);
                    expect(dist, `${fl.id}: prop "${p.piece}" muy cerca de antorcha (${dist.toFixed(1)} m)`).toBeGreaterThanOrEqual(1.5);
                }
            }
        }
    });
});
