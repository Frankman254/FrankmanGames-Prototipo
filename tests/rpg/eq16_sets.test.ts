import { describe, expect, it } from 'vitest';
import { equipmentSources, ItemFactory, setCounts, type EquipMap } from '../../src/rpg/items';
import { Rng } from '../../src/sim/rng';
import { content, session } from './helpers';
import { itemTooltip } from '../../src/ui/menus/format';
import type { EquipmentView } from '../../src/rpg/contracts';

describe('EQ-16: Conjuntos', () => {
    describe('tooltip de conjuntos', () => {
        it('muestra nombre del set, piezas equipadas y bonos activos e inactivos', () => {
            const c = content();
            const f = new ItemFactory(c, new Rng(1));
            // explorer set: 2 piezas → moveSpeed +5%, pickupRadius +0.5; 4 piezas → agility +5, critChance +0.03
            const parts = ['explorer_hood', 'explorer_jerkin', 'explorer_gloves', 'explorer_boots'].map((id) =>
                f.create(id),
            );

            // Con 2 piezas equipadas: bono de 2 activo, bono de 4 inactivo.
            const equip2: EquipmentView = { head: parts[0]!, chest: parts[1]!, weapon: null, offhand: null, hands: null, feet: null, ring1: null, ring2: null, amulet: null, back: null, waist: null, mount: null, huaca1: null, huaca2: null, huaca3: null, huaca4: null, huaca5: null, huaca6: null };
            const tip2 = itemTooltip(parts[0]!, {
                content: c,
                equipment: equip2,
                equipped: true,
                compare: [],
                sellValue: 0,
                playerLevel: 10,
            });
            const setLines = tip2.filter((l) => l.kind === 'set');
            expect(setLines.length).toBeGreaterThan(0);

            // El nombre del set debe aparecer con 2/4.
            const nameLine = setLines.find((l) => l.text.includes('del Explorador'));
            expect(nameLine).toBeDefined();
            expect(nameLine!.text).toContain('2/4');
            expect(nameLine!.active).toBe(true); // worn > 0

            // Debe haber un bono activo (2 piezas) y uno inactivo (4 piezas).
            const activeBonuses = setLines.filter((l) => l.active === true && l.text.includes('  '));
            const inactiveBonuses = setLines.filter((l) => l.active === false);
            expect(activeBonuses.length).toBeGreaterThan(0); // al menos 2 mods del bono de 2 piezas
            expect(inactiveBonuses.length).toBeGreaterThan(0); // bono de 4 piezas inactivo
        });

        it('con 4 piezas, todos los bonos están activos', () => {
            const c = content();
            const f = new ItemFactory(c, new Rng(1));
            const parts = ['explorer_hood', 'explorer_jerkin', 'explorer_gloves', 'explorer_boots'].map((id) =>
                f.create(id),
            );
            const equip4: EquipmentView = { head: parts[0]!, chest: parts[1]!, hands: parts[2]!, feet: parts[3]!, weapon: null, offhand: null, ring1: null, ring2: null, amulet: null, back: null, waist: null, mount: null, huaca1: null, huaca2: null, huaca3: null, huaca4: null, huaca5: null, huaca6: null };
            const tip4 = itemTooltip(parts[0]!, {
                content: c,
                equipment: equip4,
                equipped: true,
                compare: [],
                sellValue: 0,
                playerLevel: 10,
            });
            const setLines = tip4.filter((l) => l.kind === 'set');
            const nameLine = setLines.find((l) => l.text.includes('del Explorador'));
            expect(nameLine).toBeDefined();
            expect(nameLine!.text).toContain('4/4');

            // Todos los bonos deben estar activos.
            const inactiveBonuses = setLines.filter((l) => l.active === false && l.text.includes('  '));
            expect(inactiveBonuses.length).toBe(0);
        });

        it('sin setId, no hay líneas de set', () => {
            const c = content();
            const f = new ItemFactory(c, new Rng(1));
            const item = f.create('short_sword'); // no tiene setId
            const tip = itemTooltip(item, {
                content: c,
                equipment: { weapon: null, offhand: null, head: null, chest: null, hands: null, feet: null, ring1: null, ring2: null, amulet: null, back: null, waist: null, mount: null, huaca1: null, huaca2: null, huaca3: null, huaca4: null, huaca5: null, huaca6: null },
                equipped: false,
                compare: [],
                sellValue: 0,
                playerLevel: 1,
            });
            const setLines = tip.filter((l) => l.kind === 'set');
            expect(setLines.length).toBe(0);
        });
    });

    describe('bonos al equipar y desequipar', () => {
        it('equipar 2 piezas activa el bono; desequipar 1 lo desactiva', () => {
            const c = content();
            const f = new ItemFactory(c, new Rng(42));
            const parts = ['explorer_hood', 'explorer_jerkin'].map((id) => f.create(id));

            // 1 pieza: sin bono de set.
            const one = equipmentSources(c, { head: parts[0]! });
            expect(one.has('set:explorer')).toBe(false);

            // 2 piezas: bono de 2 piezas activo (2 mods: moveSpeed, pickupRadius).
            const two = equipmentSources(c, { head: parts[0]!, chest: parts[1]! });
            const setMods = two.get('set:explorer');
            expect(setMods).toBeDefined();
            expect(setMods!.length).toBe(2);

            // Desequipar el pecho: vuelve a 1 pieza, sin bono.
            const backToOne = equipmentSources(c, { head: parts[0]! });
            expect(backToOne.has('set:explorer')).toBe(false);
        });

        it('en sesión real: equipar activa bono, desequipar lo retira', () => {
            const s = session('storm_weaver');
            const h = s.character;

            // Equipar apprentice_robe (chest) del set storm_apprentice.
            const robe = h.inventory.slots.find((x) => x?.itemId === 'apprentice_robe')!;
            expect(s.equip(robe.uid).ok).toBe(true);

            // 1 pieza: sin bono de set.
            const counts1 = setCounts(s.content, s.character.equipment.slots);
            expect(counts1.get('storm_apprentice')).toBe(1);
            expect(equipmentSources(s.content, s.character.equipment.slots).has('set:storm_apprentice')).toBe(false);

            // Dar y equipar apprentice_cowl (head) del mismo set.
            h.gainXp(1000);
            h.give('apprentice_cowl');
            const cowl = h.inventory.slots.find((x) => x?.itemId === 'apprentice_cowl')!;
            expect(s.equip(cowl.uid).ok).toBe(true);

            // Ahora 2 piezas: bono de 2 activo (intellect +4).
            const counts2 = setCounts(s.content, s.character.equipment.slots);
            expect(counts2.get('storm_apprentice')).toBe(2);
            const setMods2 = equipmentSources(s.content, s.character.equipment.slots).get('set:storm_apprentice');
            expect(setMods2).toBeDefined();
            expect(setMods2!.length).toBe(1); // intellect +4
            expect(setMods2![0]!.stat).toBe('intellect');

            // Desequipar el head: vuelve a 1 pieza, sin bono.
            expect(s.unequip('head').ok).toBe(true);
            const counts3 = setCounts(s.content, s.character.equipment.slots);
            expect(counts3.get('storm_apprentice')).toBe(1);
            const setMods3 = equipmentSources(s.content, s.character.equipment.slots).get('set:storm_apprentice');
            expect(setMods3).toBeUndefined();
        });

        it('setCounts cuenta correctamente las piezas por set', () => {
            const c = content();
            const f = new ItemFactory(c, new Rng(1));
            const parts = ['explorer_hood', 'explorer_jerkin', 'explorer_gloves', 'explorer_boots'].map((id) =>
                f.create(id),
            );

            // 0 piezas
            const empty = setCounts(c, {});
            expect(empty.has('explorer')).toBe(false);

            // 1 pieza
            const one = setCounts(c, { head: parts[0]! });
            expect(one.get('explorer')).toBe(1);

            // 3 piezas
            const three = setCounts(c, { head: parts[0]!, chest: parts[1]!, hands: parts[2]! });
            expect(three.get('explorer')).toBe(3);

            // 4 piezas
            const four = setCounts(c, { head: parts[0]!, chest: parts[1]!, hands: parts[2]!, feet: parts[3]! });
            expect(four.get('explorer')).toBe(4);
        });
    });
});
