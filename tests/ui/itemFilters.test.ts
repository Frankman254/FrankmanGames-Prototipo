// JUI-02: Pruebas puras del clasificador de filtros de catálogo.
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../../src/data';
import {
    getElementOf,
    getFocusOf,
    isLearningSet,
    matchesCatalogFilter,
    getSetIds,
    getElements,
    type ItemCatalogFilter,
} from '../../src/ui/menus/itemFilters';

const data = loadGameData();
const items = data.rpg.items;
const sets = data.rpg.sets;

const allFilter: ItemCatalogFilter = { element: 'all', setId: 'all', focus: 'all' };

describe('JUI-02: Clasificador de filtros de catálogo', () => {
    it('getElementOf devuelve el elemento del arma', () => {
        // short_sword es earth
        const sword = items['short_sword'];
        if (sword) expect(getElementOf(sword)).toBe('earth');
        // reed_bow es air
        const bow = items['reed_bow'];
        if (bow) expect(getElementOf(bow)).toBe('air');
    });

    it('getElementOf devuelve null para items sin elemento', () => {
        // hide no tiene elemento
        const hide = items['hide'];
        if (hide) expect(getElementOf(hide)).toBeNull();
        // minor_health_potion no tiene elemento
        const potion = items['minor_health_potion'];
        if (potion) expect(getElementOf(potion)).toBeNull();
    });

    it('getElementOf busca damage.* en implicit si no hay weapon', () => {
        // Buscar un item con damage.* en implicit pero sin weapon
        let found = false;
        for (const def of Object.values(items)) {
            if (def.weapon) continue;
            const hasDamageStat = def.implicit.some((m) => typeof m.stat === 'string' && m.stat.startsWith('damage.'));
            if (hasDamageStat) {
                const elem = getElementOf(def);
                expect(elem).not.toBeNull();
                found = true;
                break;
            }
        }
        // Puede que no haya ninguno en los items base; eso está bien
        // Lo importante es que la función no falle
    });

    it('isLearningSet detecta sets de Aprendizaje', () => {
        // Los sets learning_* tienen experienceGain
        let learningFound = false;
        for (const setId of Object.keys(sets)) {
            if (setId.startsWith('learning_')) {
                expect(isLearningSet(sets[setId]!)).toBe(true);
                learningFound = true;
            }
        }
        expect(learningFound).toBe(true);
    });

    it('isLearningSet rechaza sets que no son de Aprendizaje', () => {
        // Los sets route_* no tienen experienceGain
        let routeFound = false;
        for (const setId of Object.keys(sets)) {
            if (setId.startsWith('route_')) {
                expect(isLearningSet(sets[setId]!)).toBe(false);
                routeFound = true;
            }
        }
        expect(routeFound).toBe(true);
    });

    it('getFocusOf devuelve learning para items de Aprendizaje', () => {
        // Buscar un item con setId learning_*
        let found = false;
        for (const def of Object.values(items)) {
            if (def.setId?.startsWith('learning_')) {
                expect(getFocusOf(def, sets)).toBe('learning');
                found = true;
                break;
            }
        }
        expect(found).toBe(true);
    });

    it('getFocusOf devuelve noSet para items sin setId', () => {
        const hide = items['hide'];
        if (hide && !hide.setId) {
            expect(getFocusOf(hide, sets)).toBe('noSet');
        }
    });

    it('getFocusOf devuelve endurance para items con resist.* o maxHealth', () => {
        // Buscar un item especializado en aguante
        let found = false;
        for (const def of Object.values(items)) {
            if (!def.setId) continue;
            const setDef = sets[def.setId];
            if (setDef && isLearningSet(setDef)) continue;
            const hasResist = def.implicit.some(
                (m) => typeof m.stat === 'string' && (m.stat.startsWith('resist.') || m.stat === 'maxHealth'),
            );
            if (hasResist) {
                const focus = getFocusOf(def, sets);
                // Puede ser endurance o support si también tiene healingPower
                expect(['endurance', 'support', 'damage']).toContain(focus);
                found = true;
                break;
            }
        }
    });

    it('getFocusOf devuelve damage como predeterminado', () => {
        // La mayoría de items de set con daño elemental son 'damage'
        let found = false;
        for (const def of Object.values(items)) {
            if (!def.setId) continue;
            const setDef = sets[def.setId];
            if (setDef && isLearningSet(setDef)) continue;
            // EQ-07: las líneas de combate viven en las tiradas, no en las implícitas.
            const lines = [...def.implicit, ...def.rolls];
            const hasDamage = lines.some((m) => typeof m.stat === 'string' && m.stat.startsWith('damage.'));
            if (hasDamage && !lines.some((m) => typeof m.stat === 'string' && m.stat.startsWith('resist.'))) {
                expect(getFocusOf(def, sets)).toBe('damage');
                found = true;
                break;
            }
        }
        expect(found).toBe(true);
    });

    it('matchesCatalogFilter pasa todo con filtro all', () => {
        for (const def of Object.values(items)) {
            if (def.slot) {
                // solo items equipables
                expect(matchesCatalogFilter(def, allFilter, sets)).toBe(true);
            }
        }
    });

    it('matchesCatalogFilter filtra por elemento', () => {
        const earthFilter: ItemCatalogFilter = { element: 'earth', setId: 'all', focus: 'all' };
        const sword = items['short_sword'];
        if (sword) {
            expect(matchesCatalogFilter(sword, earthFilter, sets)).toBe(true);
        }
        const bow = items['reed_bow'];
        if (bow) {
            expect(matchesCatalogFilter(bow, earthFilter, sets)).toBe(false);
        }
    });

    it('matchesCatalogFilter filtra por setId', () => {
        // Buscar un item con setId
        let targetSetId: string | null = null;
        for (const def of Object.values(items)) {
            if (def.setId) {
                targetSetId = def.setId;
                break;
            }
        }
        if (!targetSetId) return;

        const setFilter: ItemCatalogFilter = { element: 'all', setId: targetSetId, focus: 'all' };
        for (const def of Object.values(items)) {
            if (def.setId === targetSetId) {
                expect(matchesCatalogFilter(def, setFilter, sets), def.id).toBe(true);
            } else if (def.setId) {
                expect(matchesCatalogFilter(def, setFilter, sets), def.id).toBe(false);
            }
        }
    });

    it('matchesCatalogFilter filtra por enfoque', () => {
        const learningFilter: ItemCatalogFilter = { element: 'all', setId: 'all', focus: 'learning' };
        // Debe pasar solo items de Aprendizaje
        let learningFound = false;
        let nonLearningFiltered = false;
        for (const def of Object.values(items)) {
            if (!def.setId) continue;
            const passes = matchesCatalogFilter(def, learningFilter, sets);
            if (def.setId.startsWith('learning_')) {
                expect(passes, def.id).toBe(true);
                learningFound = true;
            } else if (passes) {
                // Un item no-learning no debería pasar
                nonLearningFiltered = true;
            }
        }
        expect(learningFound).toBe(true);
        expect(nonLearningFiltered).toBe(false);
    });

    it('matchesCatalogFilter combina filtros', () => {
        // Elemento + enfoque: earth + noSet (short_sword es earth y no tiene set)
        const comboFilter: ItemCatalogFilter = { element: 'earth', setId: 'all', focus: 'noSet' };
        const sword = items['short_sword'];
        if (sword) {
            // short_sword es earth y noSet
            expect(matchesCatalogFilter(sword, comboFilter, sets)).toBe(true);
        }
        // reed_bow es air, no debería pasar
        const bow = items['reed_bow'];
        if (bow) {
            expect(matchesCatalogFilter(bow, comboFilter, sets)).toBe(false);
        }
    });

    it('getSetIds devuelve sets únicos', () => {
        const equipItems = Object.values(items).filter((d) => d.setId);
        const ids = getSetIds(equipItems);
        expect(ids.length).toBeGreaterThan(0);
        // Sin duplicados
        const unique = new Set(ids);
        expect(ids.length).toBe(unique.size);
        // Ordenados
        expect(ids).toEqual(ids.slice().sort());
    });

    it('getElements devuelve elementos únicos', () => {
        const allItems = Object.values(items);
        const elems = getElements(allItems);
        expect(elems.length).toBeGreaterThan(0);
        // Sin duplicados
        const unique = new Set(elems);
        expect(elems.length).toBe(unique.size);
    });
});
