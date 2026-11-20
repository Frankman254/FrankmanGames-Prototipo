// Creador (2026-11-19): seis falcopamas de elemento (+200), una de brío (+100 % de potencia y de
// velocidad) y seis huecos de huaca para objetos raros que potencian.
// Datos: scripts/balance/falcopamasHuacas.mjs.
import { describe, expect, it } from 'vitest';
import palette from '../data/art/falcopama_variantes.json';
import { loadGameData } from '../src/data';
import { buildAcquisitionIndex } from '../scripts/balance/v3/acquisition';
import { buildProfile } from '../scripts/balance/v3/profiles';
import { loadDungeon } from '../src/data/dungeonSchema';
import { addPowerKit, buildPresetSave, type PresetDef, type PresetWorld } from '../src/dev/presets';
import { dungeonCoverageProfiles, setShowcasePresets } from '../src/dev/presetCoverage';
import { Character } from '../src/rpg/character';
import { HUACA_SLOTS } from '../src/rpg/contracts';
import { slotsFor } from '../src/rpg/items';
import { Rng } from '../src/sim/rng';
import { ZoneMap } from '../src/sim/zones';

const data = loadGameData();
const items = data.rpg.items;
const ELEMENT_STAT = {
    earth: 'strength',
    fire: 'intellect',
    air: 'agility',
    water: 'flow',
    frost: 'calm',
    lightning: 'will',
} as const;
const HUACAS = Object.values(items).filter((d) => d.slot === 'huaca');

/** Cazador del manglar de nivel 100 con la mochila vacía y lo dado en ella. */
function hunter(give: string[] = []): Character {
    const base = Character.create(data.rpg, 'mangrove_hunter', 'Prueba', new Rng(1));
    const save = base.toSave(new Date(0));
    save.level = 100;
    const c = Character.fromSave(data.rpg, save, new Rng(1));
    for (const id of give) expect(c.give(id, 1), id).toBe(0);
    return c;
}
const equipFromBag = (c: Character, id: string, slot?: (typeof HUACA_SLOTS)[number] | 'mount') =>
    c.equip(c.inventory.slots.find((s) => s?.itemId === id)!.uid, slot);

describe('falcopamas de elemento y de brío', () => {
    it('seis de elemento: +200 a su característica, con su propia paleta de color', () => {
        const seen = new Set<string>();
        for (const [el, stat] of Object.entries(ELEMENT_STAT)) {
            const def = items[`mount_falcopama_${el}`];
            expect(def, el).toBeDefined();
            expect(def!.slot).toBe('mount');
            expect(def!.mount?.model).toBe('falcopama');
            expect(def!.implicit).toContainEqual({ stat, op: 'flat', value: 200 });
            const variant = def!.mount!.variant!;
            expect(Object.keys(palette.variantes), el).toContain(variant);
            expect(def!.mount!.variants).toEqual([variant]);
            seen.add(variant);
        }
        expect(seen.size).toBe(6);
    });

    it('la de brío: +100 de potencia (%) y +100 % de velocidad', () => {
        const def = items.mount_falcopama_brio!;
        expect(def.implicit).toContainEqual({ stat: 'power', op: 'flat', value: 100 });
        expect(def.implicit).toContainEqual({ stat: 'moveSpeed', op: 'percent', value: 100 });
        const c = hunter([def.id]);
        const speed = c.stats.get('moveSpeed');
        const before = c.stats.get('power');
        expect(equipFromBag(c, def.id, 'mount')).toEqual({ ok: true });
        expect(c.stats.get('moveSpeed')).toBeCloseTo(speed * 2, 5);
        expect(c.stats.get('power') - before).toBe(100);
    });
});

describe('huecos de huaca', () => {
    it('seis huecos; cada huaca vale para cualquiera de ellos y para ningún otro', () => {
        expect(HUACA_SLOTS).toHaveLength(6);
        expect(HUACAS.length).toBeGreaterThanOrEqual(6);
        for (const def of HUACAS) expect(slotsFor(def)).toEqual([...HUACA_SLOTS]);
    });

    it('no se puede llevar dos veces la misma huaca; distintas sí', () => {
        const [a, b] = HUACAS;
        const c = hunter([a!.id, a!.id, b!.id]);
        // Sin hueco indicado va al primero libre.
        expect(equipFromBag(c, a!.id)).toEqual({ ok: true });
        expect(c.equipment.slots.huaca1?.itemId).toBe(a!.id);
        expect(equipFromBag(c, a!.id, 'huaca2')).toEqual({ ok: false, reason: 'Esa huaca ya la llevas puesta' });
        expect(equipFromBag(c, b!.id)).toEqual({ ok: true });
        expect(c.equipment.slots.huaca2?.itemId).toBe(b!.id);
        // Cambiar la misma por sí misma en su hueco sí vale.
        expect(c.canEquip(a!, 'huaca1').ok).toBe(true);
    });
});

describe('kit de potencia en las partidas de prueba', () => {
    const world: PresetWorld = {
        zones: new ZoneMap(data.zones),
        width: 1280,
        depth: 1152,
        dungeons: {},
        stones: ['raspadura'],
        home: 'raspadura',
    };

    it('nivel alto: las seis huacas puestas, distintas, y las siete falcopamas en la mochila', () => {
        const base = setShowcasePresets(data, 'raspadura', 'diablica_espeja')[0]!;
        const preset: PresetDef = { ...base, level: 100 };
        const save = buildPresetSave(data.rpg, preset, world);
        const huacas = HUACA_SLOTS.map((s) => save.equipment[s]?.itemId);
        expect(huacas.every(Boolean)).toBe(true);
        expect(new Set(huacas).size).toBe(6);
        const bag = save.inventory.filter(Boolean).map((i) => i!.itemId);
        expect(bag.filter((id) => id.startsWith('mount_falcopama_'))).toHaveLength(7);
        expect(save.inventory.filter(Boolean).length).toBeLessThanOrEqual(data.rpg.progression.inventorySize);
        // Y la partida se carga con todo puesto.
        const c = Character.fromSave(data.rpg, save, new Rng(1));
        for (const s of HUACA_SLOTS) expect(c.equipment.slots[s], s).toBeTruthy();
    });

    it('por debajo del nivel de las huacas no hay kit', () => {
        const base = setShowcasePresets(data, 'raspadura', 'diablica_espeja')[0]!;
        const save = buildPresetSave(data.rpg, { ...base, level: 10 }, world);
        expect(HUACA_SLOTS.some((s) => save.equipment[s])).toBe(false);
    });

    it('también en las de cripta (perfiles de balance): el piso más hondo sale con sus seis huacas', () => {
        const profiles = dungeonCoverageProfiles(data, loadDungeon(data));
        const deepest = profiles.reduce((a, b) => (b.floor > a.floor ? b : a));
        const built = buildProfile(data, deepest.profile, buildAcquisitionIndex(data));
        const before = built.session.save();
        const save = addPowerKit(data.rpg, before);
        expect(new Set(HUACA_SLOTS.map((s) => save.equipment[s]?.itemId)).size).toBe(6);
        // Lo que ya llevaba no se toca y todo cabe en un personaje que carga.
        for (const [slot, it] of Object.entries(before.equipment))
            expect(save.equipment[slot as never], slot).toEqual(it);
        expect(Character.fromSave(data.rpg, save, new Rng(1)).level).toBe(before.level);
    });
});
