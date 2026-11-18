import { describe, expect, it } from 'vitest';
import { Spellbook, hotbarFillOrder } from '../src/rpg/spells';
import { HOTBAR_SLOTS, KeyMap, type Action, parseKeybindings } from '../src/ui/menus/keybindings';
import json from '../data/ui/keybindings.json';
import { content } from './rpg/helpers';

describe('BAR-01: barra de hechizos configurable', () => {
    it('hotbarSize es 30', () => {
        expect(content().progression.hotbarSize).toBe(30);
        expect(HOTBAR_SLOTS).toBe(30);
    });

    it('hotbarFillOrder con 3 filas intercala [0, 10, 20, 1, 11, 21, ...]', () => {
        const order = hotbarFillOrder(30, 3);
        expect(order).toHaveLength(30);
        expect(order.slice(0, 6)).toEqual([0, 10, 20, 1, 11, 21]);
        expect(order.slice(6, 12)).toEqual([2, 12, 22, 3, 13, 23]);
        // Últimos: columna 9 de las 3 filas.
        expect(order.slice(27)).toEqual([9, 19, 29]);
    });

    it('hotbarFillOrder con 2 filas (retrocompatibilidad)', () => {
        const order = hotbarFillOrder(30, 2);
        expect(order).toHaveLength(30);
        // Con 2 filas: [0, 10, 1, 11, 2, 12, ...] y los 10 últimos al final.
        expect(order.slice(0, 4)).toEqual([0, 10, 1, 11]);
    });

    it('hotbarFillOrder con 1 fila', () => {
        const order = hotbarFillOrder(30, 1);
        expect(order).toHaveLength(30);
        expect(order).toEqual([...Array(30).keys()]);
    });

    it('la fila 3 (hotbar21-30) sale sin tecla por defecto', () => {
        const kb = parseKeybindings(json);
        for (let i = 21; i <= 30; i++) {
            expect(kb[`hotbar${i}` as Action]).toEqual([]);
        }
    });

    it('label() de un atajo sin tecla devuelve cadena vacía', () => {
        const map = new KeyMap(parseKeybindings(json));
        for (let i = 21; i <= 30; i++) {
            expect(map.label(`hotbar${i}` as Action)).toBe('');
        }
        // Las filas 1 y 2 sí tienen tecla.
        expect(map.label('hotbar1')).toBe('Q');
        expect(map.label('hotbar11')).toBe('A');
    });

    it('rebind() asigna una tecla a un slot vacío', () => {
        const map = new KeyMap(parseKeybindings(json));
        // hotbar21 no tiene tecla.
        expect(map.label('hotbar21')).toBe('');
        // Asignar una tecla libre (no usada por otra acción).
        const displaced = map.rebind('hotbar21', 'PageDown');
        expect(displaced).toBeNull();
        // Ahora hotbar21 tiene una tecla.
        expect(map.label('hotbar21')).not.toBe('');
        expect(map.action('PageDown')).toBe('hotbar21');
    });

    it('el Spellbook tiene 30 huecos', () => {
        const sb = new Spellbook(content(), 30);
        expect(sb.hotbar).toHaveLength(30);
        expect(sb.hotbar.every((x) => x === null)).toBe(true);
    });

    it('asignar e intercambiar en slots de la fila 3', () => {
        const sb = new Spellbook(content(), 30);
        // spark es un hechizo universal de nivel 1.
        sb.known.set('spark', 1);
        sb.level = 1;
        // Pone un hechizo en el slot 20 (primero de fila 3).
        expect(sb.assign(20, 'spark')).toBeNull();
        expect(sb.hotbar[20]).toBe('spark');
        // Intercambia con slot 21.
        expect(sb.assign(21, 'spark')).toBeNull();
        expect(sb.hotbar[21]).toBe('spark');
        expect(sb.hotbar[20]).toBeNull();
        // Vacía.
        expect(sb.assign(21, null)).toBeNull();
        expect(sb.hotbar[21]).toBeNull();
    });

    it('hotbarFillOrder cubre todos los slots de 30', () => {
        const order = hotbarFillOrder(30, 3);
        const set = new Set(order);
        for (let i = 0; i < 30; i++) {
            expect(set.has(i)).toBe(true);
        }
    });
});
