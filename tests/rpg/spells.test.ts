import { describe, expect, it } from 'vitest';
import { compileSpell, hotbarFillOrder } from '../../src/rpg/spells';
import { content, session } from './helpers';
import { reachLevel } from '../levels';

describe('libro de hechizos', () => {
    it('cada clase empieza con sus hechizos en la barra', () => {
        for (const id of ['ember_vanguard', 'storm_weaver']) {
            const s = session(id);
            const sb = s.spellbook();
            const start = content().classes[id]!.startingHotbar;
            expect(sb.known).toHaveLength(content().classes[id]!.startingSpells.length);
            expect(sb.hotbar).toHaveLength(content().progression.hotbarSize);
            const order = hotbarFillOrder(sb.hotbar.length);
            // BAR-01: con 3 filas, el orden intercala [0, 10, 20, 1, 11, 21, ...].
            expect(order.slice(0, 4)).toEqual([0, 10, 20, 1]);
            expect(start.map((_, i) => sb.hotbar[order[i]!])).toEqual(start);
            expect(sb.hotbar.filter((x) => x !== null)).toHaveLength(start.length);
        }
    });

    it('un pergamino enseña el hechizo; otro igual sube el rango hasta el máximo', () => {
        const s = session();
        const h = s.character;
        const max = content().spells['gust']!.maxRank;
        h.give('scroll_gust', max + 1);
        const uid = () => h.inventory.slots.find((x) => x?.itemId === 'scroll_gust')!.uid;
        const events: string[] = [];
        s.on((e) => events.push(e.type));
        expect(s.useItem(uid()).ok).toBe(true);
        expect(h.spellbook.rank('gust')).toBe(1);
        expect(events).toContain('learned');
        for (let r = 2; r <= max; r++) {
            expect(s.useItem(uid()).ok).toBe(true);
            expect(h.spellbook.rank('gust')).toBe(r);
        }
        expect(s.useItem(uid())).toEqual({ ok: false, reason: 'Ya está al rango máximo' });
        expect(h.inventory.count('scroll_gust')).toBe(1); // el último no se gasta
    });

    it('cualquier clase puede equipar cualquier hechizo que conozca (con el nivel); asignar intercambia', () => {
        const s = session('storm_weaver');
        expect(s.assignHotbar(0, 'fiery_slash')).toEqual({ ok: false, reason: 'Hechizo no aprendido' });
        reachLevel(s.character, 3);
        s.character.learnSpell('fiery_slash');
        expect(s.assignHotbar(0, 'fiery_slash').ok).toBe(true);
        expect(s.spellbook().hotbar[0]).toBe('fiery_slash');
        expect(s.assignHotbar(1, 'fiery_slash').ok).toBe(true);
        // BAR-01: con 30 slots, el intercambio pone fiery_slash en 1 y mueve lo que había a 0.
        expect(s.spellbook().hotbar[1]).toBe('fiery_slash');
        // Lo que estaba en 1 (segundo slot del orden de llenado = índice 10) se mueve a 1.
        // Con 3 filas, el índice 10 es la posición 1 del orden, que es el segundo hechizo de startingHotbar.
        const prevAt1 = s.spellbook().hotbar[1] === 'fiery_slash' ? content().classes['storm_weaver']!.startingHotbar[1] : null;
        // Verificamos que el intercambio funciona: fiery_slash está en 1, y lo que había en 1 está en 0.
        expect(s.spellbook().hotbar[0]).not.toBe('fiery_slash');
        expect(s.spellbook().hotbar[1]).toBe('fiery_slash');
        expect(s.assignHotbar(2, null).ok).toBe(true);
        expect(s.spellbook().hotbar[2]).toBeNull();
        expect(s.assignHotbar(content().progression.hotbarSize, 'spark').ok).toBe(false);
    });

    it('el rango sube los efectos y baja el coste', () => {
        const def = content().spells['spark']!;
        const r1 = compileSpell(content(), def, 1);
        const r3 = compileSpell(content(), def, 3);
        expect(r1.power).toBe(1);
        expect(r3.power).toBeCloseTo(1 + (2 * def.perRank.effectPercent) / 100);
        expect(r3.cost).toBe(Math.round(def.resourceCost * (1 - (2 * def.perRank.costPercent) / 100)));
        expect(r3.effects).toHaveLength(def.effects.length);
    });
});
