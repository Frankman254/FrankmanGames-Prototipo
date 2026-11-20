// JL-47: Pruebas del rework del Compendio.
// Verifica que los datos de items.json tienen los campos necesarios para mostrar
// rangos de características en la ventana del compendio.
import { describe, it, expect } from 'vitest';
import itemsJson from '../data/rpg/items.json';
import setsJsonRaw from '../data/rpg/sets.json';
const setsObj = (setsJsonRaw as any).sets ?? {};

describe('JL-47: Rework del Compendio — datos de objetos', () => {
    const items = Object.entries((itemsJson as any).items).filter(([id]) => !id.startsWith('_'));

    it('todos los objetos tienen category', () => {
        for (const [id, d] of items) {
            const def = d as Record<string, unknown>;
            expect(def.category, `${id}: falta category`).toBeDefined();
        }
    });

    it('los objetos equipables tienen slot', () => {
        const equipable = items.filter(([, d]) => {
            const def = d as Record<string, unknown>;
            return ['armor', 'jewel', 'weapon'].includes(def.category as string);
        });
        for (const [id, d] of equipable) {
            const def = d as Record<string, unknown>;
            expect(def.slot, `${id}: equipable sin slot`).not.toBeNull();
        }
    });

    it('5 objetos variados: rangos de características salen de los datos', () => {
        // 1. Arma con rolls
        const weapon = items.find(([, d]) => {
            const def = d as Record<string, unknown>;
            return def.weapon && Array.isArray(def.rolls) && def.rolls.length > 0;
        });
        expect(weapon, 'sin arma con rolls').toBeDefined();
        if (weapon) {
            const def = weapon[1] as Record<string, unknown>;
            const w = def.weapon as Record<string, unknown>;
            expect(Number(w.min)).toBeGreaterThan(0);
            expect(Number(w.max)).toBeGreaterThanOrEqual(Number(w.min));
            expect(w.element).toBeDefined();
            const rolls = def.rolls as Array<Record<string, unknown>>;
            for (const r of rolls) {
                expect(Number(r.min)).toBeLessThanOrEqual(Number(r.max));
                expect(['flat', 'percent']).toContain(r.op);
            }
        }

        // 2. Armadura con implicit
        const armor = items.find(([, d]) => {
            const def = d as Record<string, unknown>;
            return def.category === 'armor' && Array.isArray(def.implicit) && def.implicit.length > 0;
        });
        expect(armor, 'sin armadura con implicit').toBeDefined();
        if (armor) {
            const def = armor[1] as Record<string, unknown>;
            const implicit = def.implicit as Array<Record<string, unknown>>;
            for (const m of implicit) {
                expect(m.stat).toBeDefined();
                expect(['flat', 'percent']).toContain(m.op);
                expect(typeof m.value).toBe('number');
            }
        }

        // 3. Anillo con setId
        const ring = items.find(([, d]) => {
            const def = d as Record<string, unknown>;
            return def.slot && String(def.slot).includes('ring') && def.setId;
        });
        if (ring) {
            const def = ring[1] as Record<string, unknown>;
            const setDef = setsObj[def.setId as string];
            expect(setDef, `conjunto ${def.setId} no encontrado`).toBeDefined();
        }

        // 4. Objeto con rolls e implicit juntos
        const both = items.find(([, d]) => {
            const def = d as Record<string, unknown>;
            return Array.isArray(def.rolls) && def.rolls.length > 0 && Array.isArray(def.implicit) && def.implicit.length > 0;
        });
        expect(both, 'sin objeto con rolls e implicit').toBeDefined();

        // 5. Consumible sin slot
        const consumable = items.find(([, d]) => {
            const def = d as Record<string, unknown>;
            return def.category === 'consumable';
        });
        expect(consumable, 'sin consumible').toBeDefined();
        if (consumable) {
            const def = consumable[1] as Record<string, unknown>;
            expect(def.slot).toBeNull();
        }
    });

    it('los objetos con setId pertenecen a un conjunto válido', () => {
        const withSet = items.filter(([, d]) => {
            const def = d as Record<string, unknown>;
            return def.setId;
        });
        for (const [, d] of withSet) {
            const def = d as Record<string, unknown>;
            const setDef = setsObj[def.setId as string];
            expect(setDef, `conjunto ${def.setId} no encontrado`).toBeDefined();
        }
    });

    it('los rolls tienen min <= max y op válido', () => {
        const withRolls = items.filter(([, d]) => {
            const def = d as Record<string, unknown>;
            return Array.isArray(def.rolls) && def.rolls.length > 0;
        });
        for (const [id, d] of withRolls) {
            const def = d as Record<string, unknown>;
            const rolls = def.rolls as Array<Record<string, unknown>>;
            for (const r of rolls) {
                expect(Number(r.min), `${id}: roll min > max`).toBeLessThanOrEqual(Number(r.max));
                expect(['flat', 'percent'], `${id}: op inválido`).toContain(r.op);
                expect(typeof r.stat).toBe('string');
            }
        }
    });

    it('los implicit tienen stat y value válidos', () => {
        const withImplicit = items.filter(([, d]) => {
            const def = d as Record<string, unknown>;
            return Array.isArray(def.implicit) && def.implicit.length > 0;
        });
        for (const [id, d] of withImplicit) {
            const def = d as Record<string, unknown>;
            const implicit = def.implicit as Array<Record<string, unknown>>;
            for (const m of implicit) {
                expect(typeof m.stat, `${id}: stat no string`).toBe('string');
                expect(['flat', 'percent'], `${id}: op inválido`).toContain(m.op);
                expect(typeof m.value, `${id}: value no number`).toBe('number');
            }
        }
    });
});
