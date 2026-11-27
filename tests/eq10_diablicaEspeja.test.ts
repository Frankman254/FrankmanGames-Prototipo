// EQ-10: el ajuar de La Diablica Espeja, 8 piezas de nivel 50 sacadas de su modelo.
// Datos (scripts/balance/eq10DiablicaEspeja.mjs + eq07Equipment.mjs), nodos de equipo.glb y
// tabla de ajuste por héroe (scripts/blender/equipo_diablica.py).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import ajuste from '../data/art/ajusteEquipo.json';
import loot from '../data/rpg/loot.json';
import { loadGameData } from '../src/data';
import { EQUIP_SLOTS, type EquipmentView } from '../src/rpg/contracts';
import { ItemFactory } from '../src/rpg/items';
import { Rng } from '../src/sim/rng';
import { itemTooltip } from '../src/ui/menus/format';

const ROOT = join(__dirname, '..');
const game = loadGameData();
const items = game.rpg.items;
const SET = 'diablica_espeja';
const SLOTS = ['head', 'chest', 'amulet', 'waist', 'hands', 'feet', 'back', 'weapon'] as const;
const pieceId = (slot: string): string => `${SET}_${slot === 'weapon' ? 'staff' : slot}`;
const BONES = [
    'hips',
    'spine',
    'chest',
    'head',
    'upperArmL',
    'foreArmL',
    'handL',
    'upperArmR',
    'foreArmR',
    'handR',
    'thighL',
    'shinL',
    'footL',
    'thighR',
    'shinR',
    'footR',
];

function glbNodes(file: string): string[] {
    const b = readFileSync(join(ROOT, 'assets', 'models', file));
    const json = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString('utf8')) as {
        nodes: Array<{ name?: string }>;
    };
    return json.nodes.map((n) => n.name ?? '');
}

describe('EQ-10: ajuar de La Diablica Espeja', () => {
    it('8 piezas de nivel 50, una por hueco, del conjunto diablica_espeja', () => {
        for (const slot of SLOTS) {
            const it = items[pieceId(slot)];
            expect(it, pieceId(slot)).toBeDefined();
            expect(it!.slot).toBe(slot);
            expect(it!.level).toBe(50);
            expect(it!.setId).toBe(SET);
        }
        const bonuses = (game.rpg.sets as Record<string, { bonuses: Array<{ pieces: number }> }>)[SET]!.bonuses;
        expect(bonuses.map((b) => b.pieces)).toEqual([2, 4, 6, 8]);
    });

    it('tierra y aire: Fuerza en todas, Agilidad y daño de ambos en las de ropa (cifras de la curva EQ-07)', () => {
        for (const slot of SLOTS) {
            const stats = items[pieceId(slot)]!.rolls.map((r) => r.stat);
            expect(stats, slot).toContain('strength');
            expect(stats, slot).toContain('damage.earth');
            if (slot === 'weapon') continue;
            expect(stats, slot).toEqual(expect.arrayContaining(['agility', 'maxHealth', 'damage.air']));
            // Nada se sale del orden de su franja (route_03, nivel 52: hasta ~146 de vida, ~31 de atributo).
            for (const r of items[pieceId(slot)]!.rolls) {
                if (r.stat === 'maxHealth') expect(r.max, `${slot} vida`).toBeLessThanOrEqual(150);
                if (r.stat === 'strength' || r.stat === 'agility')
                    expect(r.max, `${slot} ${r.stat}`).toBeLessThanOrEqual(32);
            }
        }
        expect(items[pieceId('weapon')]!.weapon?.element).toBe('earth');
    });

    it('se consiguen en el botín de La Espeja (PROPUESTA)', () => {
        const ids = (loot.tables as Record<string, { entries: Array<{ itemId?: string }> }>).espejo_boss!.entries.map(
            (e) => e.itemId,
        );
        for (const slot of SLOTS) expect(ids, slot).toContain(pieceId(slot));
    });

    it('equipo.glb trae cada pieza: el bastón como arma de mano y el resto a medida, por hueso', () => {
        const nodes = glbNodes('equipo.glb');
        for (const slot of SLOTS) {
            const root = `obj_${pieceId(slot)}`;
            expect(nodes, root).toContain(root);
            const parts = nodes.filter((n) => n.startsWith(`${root}@`)).map((n) => n.slice(root.length + 1));
            if (slot === 'weapon') expect(parts, root).toEqual([]);
            else {
                expect(parts.length, root).toBeGreaterThan(0);
                for (const b of parts) expect(BONES, `${root}@${b}`).toContain(b);
            }
        }
    });

    it('la tabla de ajuste cubre cada héroe y hueso con cifras sanas', () => {
        const assets = JSON.parse(readFileSync(join(ROOT, 'data', 'assets.json'), 'utf8')) as {
            templates: Record<string, { file: string }>;
        };
        const heroes = Object.values(assets.templates)
            .map((t) => t.file.replace(/^.*\//, '').replace(/\.glb$/, ''))
            .filter((f) => /^(centinela|oraculo|cazador)(_f)?_anime$/.test(f));
        expect(heroes.length).toBe(6);
        const fit = ajuste as unknown as Record<
            string,
            Record<string, { at: number[]; rot: number[]; scale: number[] }>
        >;
        for (const h of heroes) {
            for (const b of BONES) {
                const f = fit[h]?.[b];
                expect(f, `${h} ${b}`).toBeDefined();
                expect(Math.hypot(...f!.rot), `${h} ${b} giro unitario`).toBeCloseTo(1, 3);
                for (const s of f!.scale) {
                    expect(s, `${h} ${b} escala`).toBeGreaterThanOrEqual(0.8);
                    expect(s, `${h} ${b} escala`).toBeLessThanOrEqual(1.6);
                }
            }
        }
    });

    it('el tooltip cuenta las piezas puestas y activa los umbrales correctos', () => {
        const factory = new ItemFactory(game.rpg, new Rng(408));
        const pieces = SLOTS.map((slot) => factory.create(pieceId(slot)));
        const empty = Object.fromEntries(EQUIP_SLOTS.map((slot) => [slot, null])) as EquipmentView;
        const setLines = (equipment: EquipmentView, equipped: boolean) =>
            itemTooltip(pieces[0]!, {
                content: game.rpg,
                equipment,
                equipped,
                compare: [],
                sellValue: 0,
                playerLevel: 50,
            }).filter((line) => line.kind === 'set');
        const setName = (lines: ReturnType<typeof setLines>) =>
            lines.find((line) => line.text.startsWith('de la Diablica Espeja'));
        const bonusPieces = (lines: ReturnType<typeof setLines>) =>
            lines.filter((line) => /^\(\d+ piezas\)$/.test(line.text));

        const noneWorn = setLines(empty, false);
        expect(setName(noneWorn)).toMatchObject({ text: 'de la Diablica Espeja (0/8)', active: false });
        expect(bonusPieces(noneWorn).map((line) => line.active)).toEqual([false, false, false, false]);

        const partial: EquipmentView = { ...empty, head: pieces[0]!, chest: pieces[1]! };
        const twoWorn = setLines(partial, true);
        expect(setName(twoWorn)).toMatchObject({ text: 'de la Diablica Espeja (2/8)', active: true });
        expect(bonusPieces(twoWorn).map((line) => line.active)).toEqual([true, false, false, false]);

        const full = {
            ...empty,
            ...Object.fromEntries(SLOTS.map((slot, index) => [slot, pieces[index]!])),
        } as EquipmentView;
        const allWorn = setLines(full, true);
        expect(setName(allWorn)).toMatchObject({ text: 'de la Diablica Espeja (8/8)', active: true });
        expect(bonusPieces(allWorn).map((line) => line.active)).toEqual([true, true, true, true]);
    });
});
