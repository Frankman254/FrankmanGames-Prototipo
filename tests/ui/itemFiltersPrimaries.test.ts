// El filtro de elemento cuenta las primarias y las tiradas: el creador filtró
// «aire» al nivel 40 y no salía ningún equipo de Agilidad que no fuera arma.
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../../src/data';
import { getElementsOf, matchesCatalogFilter, PRIMARY_ELEMENT } from '../../src/ui/menus/itemFilters';

const data = loadGameData();
const items = data.rpg.items;

describe('Filtro de elemento por primarias', () => {
    it('la tabla del filtro coincide con rules.elementStat', () => {
        for (const [elem, stat] of Object.entries(data.rpg.rules.elementStat)) expect(PRIMARY_ELEMENT[stat]).toBe(elem);
    });

    it('una pieza de Agilidad sin arma ni daño implícito sale al filtrar por aire', () => {
        const filter = { element: 'air' as const, setId: 'all', focus: 'all' as const };
        const agilityArmor = Object.values(items).filter(
            (d) => !d.weapon && d.level >= 30 && d.level <= 45 && d.rolls.some((r) => r.stat === 'agility'),
        );
        expect(agilityArmor.length).toBeGreaterThan(0);
        for (const d of agilityArmor) expect(matchesCatalogFilter(d, filter, data.rpg.sets), d.name).toBe(true);
    });

    it('una pieza bielemental aparece en sus dos elementos', () => {
        const bi = Object.values(items).find((d) => {
            const e = getElementsOf(d);
            return !d.weapon && e.length >= 2;
        });
        expect(bi).toBeDefined();
        for (const e of getElementsOf(bi!))
            expect(matchesCatalogFilter(bi!, { element: e, setId: 'all', focus: 'all' }, data.rpg.sets)).toBe(true);
    });
});
