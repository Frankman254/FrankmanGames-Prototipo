import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { loadDungeon } from '../src/data/dungeonSchema';
import { Character } from '../src/rpg/character';
import type { SessionEvent } from '../src/rpg/contracts';
import { GameSession } from '../src/rpg/session';
import { Rng } from '../src/sim/rng';
import { waterCircles, waterDistance } from '../src/sim/navGrid';
import { World } from '../src/sim/world';
import { cryptStaffSpots, floorGameData, generateFloor } from '../src/world/dungeon';

// Creador (2026-11-25): «dentro de la mazmorra deberia haber un Npc para poder comerciar, y otro
// npc para poder volver al pueblo sin usar posimas, y deberian haber zonas de agua (no
// nesesariamente circulares para poder pescar)».
const data = loadGameData();
const def = loadDungeon(data);
const PEDDLER = 'crypt_peddler';
const GUIDE = 'crypt_guide';

function floorWorld(index: number): { w: World; arrival: { x: number; y: number } } {
    const f = generateFloor(def, index);
    const w = new World(floorGameData(data, f, f.arrivalFromAbove), {
        seed: 7,
        encounter: false,
        interior: true,
        pools: f.pools,
    });
    return { w, arrival: f.arrivalFromAbove };
}

describe('CLA-CRIPTA2: PNJ dentro de la cripta', () => {
    it('el mercader y el guía están marcados como de la cripta', () => {
        expect(data.rpg.merchants[PEDDLER]?.crypt).toBe(true);
        expect(data.rpg.npcs[GUIDE]?.crypt).toBe(true);
        expect(data.rpg.npcs[GUIDE]?.merchantId).toBeNull();
    });

    it('el mercader de la cripta sólo vende consumibles', () => {
        for (const s of data.rpg.merchants[PEDDLER]!.stock)
            expect(data.rpg.items[s.itemId]?.category, s.itemId).toBe('consumable');
    });

    it('no salen en el mundo abierto, aunque la zona cubra su sitio', () => {
        const zone = { ...data.zone, originX: 0, originY: 0, width: 256, depth: 256 };
        const w = new World({ ...data, zone }, { seed: 1, encounter: false });
        const ids = w.npcs.map((n) => n.npcId);
        expect(ids).toContain('crypt_warden');
        expect(ids).not.toContain(PEDDLER);
        expect(ids).not.toContain(GUIDE);
    });

    it('en un interior se colocan junto a la llegada, en suelo caminable y sin pisarse', () => {
        for (const index of [0, 9, 29]) {
            const { w, arrival } = floorWorld(index);
            const spots = cryptStaffSpots(arrival, 2, (p) => w.grid.walkable(p));
            const a = w.placeInteriorNpc(PEDDLER, PEDDLER, spots[0]!);
            const b = w.placeInteriorNpc(GUIDE, null, spots[1]!);
            expect(a && b, `piso ${index + 1}`).toBeTruthy();
            for (const p of [a!, b!]) {
                expect(w.grid.walkable(p)).toBe(true);
                expect(Math.hypot(p.x - arrival.x, p.y - arrival.y)).toBeLessThan(6);
            }
            expect(Math.hypot(a!.x - b!.x, a!.y - b!.y)).toBeGreaterThan(1);
        }
    });

    it('fuera de un interior placeInteriorNpc no hace nada', () => {
        const w = new World(data, { seed: 1, encounter: false });
        expect(w.placeInteriorNpc(GUIDE, null, w.player.pos)).toBeNull();
    });

    it('la opción del guía pide salir de la cripta (suceso leaveDungeon)', () => {
        const s = new GameSession(
            data.rpg,
            Character.create(data.rpg, 'ember_vanguard', 'Prueba', new Rng(1)),
            new Rng(1),
        );
        const events: SessionEvent[] = [];
        s.on((e) => events.push(e));
        const v = s.talk(GUIDE)!;
        const i = v.options.findIndex((o) => o.text === 'Llévame al pueblo.');
        expect(i).toBeGreaterThanOrEqual(0);
        expect(s.chooseDialogue(i)).toBeNull();
        expect(events.some((e) => e.type === 'leaveDungeon')).toBe(true);
    });
});

describe('CLA-CRIPTA2: pozas que no son círculos', () => {
    const lobed = def.floors
        .map((_, i) => generateFloor(def, i))
        .flatMap((f) => f.pools.map((p) => ({ f, p })))
        .filter(({ p }) => (p.lobes?.length ?? 0) > 0);

    it('las pozas de los pisos llevan lóbulos', () => {
        expect(lobed.length).toBeGreaterThan(0);
    });

    it('se pesca en un lóbulo y el agua no se pisa', () => {
        // Un punto de un lóbulo que no cae dentro del círculo principal.
        const pick = lobed
            .flatMap(({ f, p }) =>
                p.lobes!.map((lobe) => {
                    const dx = lobe.x - p.x;
                    const dy = lobe.y - p.y;
                    const len = Math.hypot(dx, dy) || 1;
                    const far = {
                        x: lobe.x + (dx / len) * lobe.radius * 0.8,
                        y: lobe.y + (dy / len) * lobe.radius * 0.8,
                    };
                    return { f, p, far };
                }),
            )
            .find(({ p, far }) => Math.hypot(far.x - p.x, far.y - p.y) > p.radius + 0.3);
        expect(pick).toBeDefined();
        const { f, p, far } = pick!;
        const w = new World(floorGameData(data, f, f.arrivalFromAbove), {
            seed: 7,
            encounter: false,
            interior: true,
            pools: f.pools,
        });
        expect(waterDistance(p, far)).toBeLessThan(0);
        expect(w.fishingSpotAt(far)?.id).toBe(p.id);
        expect(w.grid.walkable(far)).toBe(false);
        expect(waterCircles(p).length).toBe(1 + p.lobes!.length);
    });
});
