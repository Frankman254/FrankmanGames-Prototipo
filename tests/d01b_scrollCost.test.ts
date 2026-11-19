// D-01b: Subir al rango N cuesta N pergaminos del hechizo.
// Si tiene menos, el pergamino no se gasta y se muestra cuántos faltan.
import { describe, it, expect } from 'vitest';
import { GameSession } from '../src/rpg/session';
import { Rng } from '../src/sim/rng';
import { content, hero } from './rpg/helpers';

describe('D-01b: Coste en pergaminos para subir rango', () => {
    const ct = content();

    // Encuentra el itemId del pergamino de un hechizo.
    const scrollId = (spellId: string) => {
        for (const [id, it] of Object.entries(ct.items)) {
            if (it.use?.kind === 'learnSpell' && it.use.spellId === spellId) return id;
        }
        throw new Error(`No scroll for ${spellId}`);
    };

    const saScroll = () => scrollId('still_aegis');

    // Encuentra el uid de un item en el inventario.
    const uidOf = (ch: ReturnType<typeof hero>, itemId: string) =>
        ch.inventory.slots.find((x) => x?.itemId === itemId)!.uid;

    describe('primer aprendizaje (rango 1) cuesta 1 pergamino', () => {
        it('aprender un hechizo nuevo gasta 1 pergamino', () => {
            const ch = hero();
            const sess = new GameSession(ct, ch, new Rng(1));
            const sid = saScroll();
            const before = ch.inventory.count(sid);
            ch.give(sid, 1);
            const r = sess.useItem(uidOf(ch, sid));
            expect(r.ok).toBe(true);
            expect(ch.spellbook.rank('still_aegis')).toBeGreaterThanOrEqual(1);
            // Debería haber gastado exactamente 1 pergamino.
            expect(ch.inventory.count(sid)).toBe(before);
        });
    });

    describe('subir al rango N cuesta N pergaminos', () => {
        it('del rango 1 al 2 cuesta 2 pergaminos', () => {
            const ch = hero();
            const sess = new GameSession(ct, ch, new Rng(1));
            const sid = saScroll();
            // Primero aprender el hechizo (gasta 1 pergamino, queda en rango 1).
            ch.give(sid, 1);
            let r = sess.useItem(uidOf(ch, sid));
            expect(r.ok).toBe(true);
            expect(ch.spellbook.rank('still_aegis')).toBe(1);

            // Ahora subir al rango 2: necesita 2 pergaminos.
            const before = ch.inventory.count(sid);
            ch.give(sid, 2);
            r = sess.useItem(uidOf(ch, sid));
            expect(r.ok).toBe(true);
            expect(ch.spellbook.rank('still_aegis')).toBe(2);
            // Debería haber gastado exactamente 2 pergaminos.
            expect(ch.inventory.count(sid)).toBe(before);
        });

        it('del rango 5 al 6 cuesta 6 pergaminos', () => {
            const ch = hero();
            const sess = new GameSession(ct, ch, new Rng(1));
            const sid = saScroll();
            // Aprender en rango 1.
            ch.give(sid, 1);
            let r = sess.useItem(uidOf(ch, sid));
            expect(r.ok).toBe(true);

            // Subir manualmente al rango 5 para el test (simulando pergaminos previos).
            ch.spellbook.known.set('still_aegis', 5);

            // Subir al rango 6: necesita 6 pergaminos.
            const before = ch.inventory.count(sid);
            ch.give(sid, 6);
            r = sess.useItem(uidOf(ch, sid));
            expect(r.ok).toBe(true);
            expect(ch.spellbook.rank('still_aegis')).toBe(6);
            // Debería haber gastado exactamente 6 pergaminos.
            expect(ch.inventory.count(sid)).toBe(before);
        });
    });

    describe('con pergaminos de menos, no gasta nada', () => {
        it('falta 1 pergamino para subir al rango 2', () => {
            const ch = hero();
            const sess = new GameSession(ct, ch, new Rng(1));
            const sid = saScroll();
            // Aprender en rango 1.
            ch.give(sid, 1);
            let r = sess.useItem(uidOf(ch, sid));
            expect(r.ok).toBe(true);
            expect(ch.spellbook.rank('still_aegis')).toBe(1);

            // Quitar todos los pergaminos restantes y dar solo 1 (necesita 2).
            ch.inventory.consume(sid, ch.inventory.count(sid));
            ch.give(sid, 1);
            const before = ch.inventory.count(sid);
            r = sess.useItem(uidOf(ch, sid));
            expect(r.ok).toBe(false);
            // No debe haber gastado el pergamino.
            expect(ch.inventory.count(sid)).toBe(before);
            // El rango no debe haber subido.
            expect(ch.spellbook.rank('still_aegis')).toBe(1);
        });

        it('mensaje indica cuantos faltan', () => {
            const ch = hero();
            const sess = new GameSession(ct, ch, new Rng(1));
            const sid = saScroll();
            // Aprender en rango 1.
            ch.give(sid, 1);
            let r = sess.useItem(uidOf(ch, sid));
            expect(r.ok).toBe(true);

            // Quitar todos los pergaminos restantes y dar solo 1 (necesita 2).
            ch.inventory.consume(sid, ch.inventory.count(sid));
            ch.give(sid, 1);
            r = sess.useItem(uidOf(ch, sid));
            expect(r.ok).toBe(false);
            // El mensaje debe mencionar el coste.
            expect((r as { reason: string }).reason).toMatch(/pergaminos|scroll/i);
        });
    });

    it('no cambia el rango automático por nivel (D-01a-fix)', () => {
        // Un personaje de nivel 200 que aprende un universal por pergamino
        // debe quedar en el rango que corresponde al nivel, no en rango 1.
        // El coste en pergaminos no afecta esta regla.
        const ch = hero();
        const sess = new GameSession(ct, ch, new Rng(1));
        const sid = saScroll();
        ch.level = 200;
        ch.spellbook.level = 200;
        // Da 6 pergaminos (suficientes para cualquier rango).
        ch.give(sid, 6);
        const r = sess.useItem(uidOf(ch, sid));
        expect(r.ok).toBe(true);
        // A nivel 200, still_aegis debe estar en rango 6 (máximo).
        expect(ch.spellbook.rank('still_aegis')).toBe(6);
    });
});
