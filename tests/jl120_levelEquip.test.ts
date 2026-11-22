// JL-120: Un personaje de nivel 1 no puede equipar un objeto de nivel alto.
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { Character } from '../src/rpg/character';
import { Rng } from '../src/sim/rng';

const data = loadGameData();

// Los objetos más altos están en nivel 195 (route_10) y 192 (sets de ruta).
const highLevelItems = Object.values(data.rpg.items).filter((i) => i.level >= 190 && i.slot !== null);

describe('JL-120: nivel mínimo para equipar', () => {
    it('un personaje de nivel 1 no puede equipar un objeto de nivel alto', () => {
        const c = new Character(data.rpg, 'ember_vanguard', 'Prueba', new Rng(1));
        expect(c.level).toBe(1);
        expect(highLevelItems.length).toBeGreaterThan(0);

        for (const item of highLevelItems) {
            const result = c.canEquip(item);
            expect(result.ok, `${item.id} (niv. ${item.level})`).toBe(false);
            if (!result.ok) expect(result.reason, `${item.id}`).toContain('nivel');
        }
    });

    it('un personaje de nivel 200 sí puede equipar un objeto de nivel alto', () => {
        const base = Character.create(data.rpg, 'ember_vanguard', 'Prueba', new Rng(1));
        while (base.level < 200) {
            base.gainXp(base.xpToNext);
        }
        expect(base.level).toBe(200);

        for (const item of highLevelItems) {
            const result = base.canEquip(item);
            expect(result.ok, `${item.id} (niv. ${item.level})`).toBe(true);
        }
    });

    it('un personaje de nivel 50 no puede equipar un objeto de nivel 190+', () => {
        const base = Character.create(data.rpg, 'ember_vanguard', 'Prueba', new Rng(1));
        while (base.level < 50) {
            base.gainXp(base.xpToNext);
        }
        expect(base.level).toBe(50);

        for (const item of highLevelItems) {
            const result = base.canEquip(item);
            expect(result.ok, `${item.id} (niv. ${item.level})`).toBe(false);
        }
    });

    it('equip() también rechaza el objeto de nivel superior', () => {
        const c = new Character(data.rpg, 'ember_vanguard', 'Prueba', new Rng(1));
        expect(c.level).toBe(1);

        const item = highLevelItems[0]!;
        const inst = c.items.create(item.id, 1);
        c.inventory.addTransferred(inst);

        const result = c.equip(inst.uid);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.reason).toContain('nivel');
    });
});
