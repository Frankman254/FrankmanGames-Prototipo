import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { RpgSessionFactory } from '../src/rpg/session';
import { MemoryStore, SaveStore } from '../src/ui/menus/saveStore';

describe('JL-441: conservar equipo, mascota, montura y barra al guardar y cargar', () => {
    it('restaura los cuatro estados desde una ranura serializada', () => {
        const data = loadGameData();
        const factory = new RpgSessionFactory(data.rpg);
        const session = factory.newGame('ember_vanguard', 'JL-441', 441);
        const character = session.character;

        for (const [itemId, slot] of [
            ['padded_vest', 'chest'],
            ['leather_bracers', 'hands'],
            ['traveler_boots', 'feet'],
        ] as const) {
            expect(character.give(itemId, 1)).toBe(0);
            const item = character.inventory.slots.find((instance) => instance?.itemId === itemId)!;
            expect(session.equip(item.uid, slot).ok).toBe(true);
        }

        expect(character.give('mount_mule', 1)).toBe(0);
        const mount = character.inventory.slots.find((instance) => instance?.itemId === 'mount_mule')!;
        expect(session.equip(mount.uid, 'mount').ok).toBe(true);

        expect(character.give('charm_ash_fox', 1)).toBe(0);
        const charm = character.inventory.slots.find((instance) => instance?.itemId === 'charm_ash_fox')!;
        expect(session.useItem(charm.uid).ok).toBe(true);

        const spellId = character.spellbook.view().known[0]!.spellId;
        const hotbarIndex = character.spellbook.hotbar.length - 1;
        expect(session.assignHotbar(hotbarIndex, spellId).ok).toBe(true);
        const hotbarBeforeSave = [...character.spellbook.hotbar];
        const equipmentBeforeSave = {
            chest: character.equipment.get('chest')!.uid,
            hands: character.equipment.get('hands')!.uid,
            feet: character.equipment.get('feet')!.uid,
            mount: character.equipment.get('mount')!.uid,
        };

        const saves = new SaveStore(new MemoryStore());
        saves.write(0, session.save());
        const saved = saves.read(0);
        expect(saved).not.toBeNull();

        const loaded = factory.load(saved!, 442).character;

        for (const [itemId, slot] of [
            ['padded_vest', 'chest'],
            ['leather_bracers', 'hands'],
            ['traveler_boots', 'feet'],
            ['mount_mule', 'mount'],
        ] as const) {
            expect(loaded.equipment.get(slot)).toMatchObject({ itemId, uid: equipmentBeforeSave[slot] });
        }
        expect(loaded.activePetItemUid).toBe(charm.uid);
        expect(loaded.activePetId()).toBe('ash_fox');
        expect(loaded.spellbook.hotbar).toEqual(hotbarBeforeSave);
    });
});
