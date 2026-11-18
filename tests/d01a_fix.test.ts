// D-01a-fix: Universal aprendido por pergamino a nivel alto queda en el rango
// que corresponde al nivel, no en rango 1.
import { describe, it, expect } from 'vitest';
import { Character } from '../src/rpg/character';
import { Rng } from '../src/sim/rng';
import { content, hero } from './rpg/helpers';

describe('D-01a-fix: learnSpell aplica rango automático por nivel', () => {
    const ct = content();

    it('universal aprendido a nivel 200 queda en rango máximo', () => {
        const ch = hero();
        // Subir al nivel 200 sin aprender hechizos de clase aún.
        ch.level = 200;
        ch.spellbook.level = 200;

        // still_aegis es universal (classId: null), maxRank 6 (HZ-02), unlockLevel 10.
        // A nivel 200, el rango automático debe ser 6 (máximo).
        const result = ch.learnSpell('still_aegis');
        expect(result.ok).toBe(true);
        expect(ch.spellbook.rank('still_aegis')).toBe(6);
    });

    it('universal aprendido a nivel 1 queda en rango 1', () => {
        const ch = hero();
        // Nivel 1: el rango automático es 1.
        const result = ch.learnSpell('still_aegis');
        expect(result.ok).toBe(true);
        expect(ch.spellbook.rank('still_aegis')).toBe(1);
    });

    it('leer un pergamino de un hechizo ya conocido sigue subiendo un rango', () => {
        const ch = hero();
        // Primero: aprender el hechizo nuevo.
        const r1 = ch.learnSpell('still_aegis');
        expect(r1.ok).toBe(true);
        const rankAfterFirst = ch.spellbook.rank('still_aegis');

        // Segundo: leer otro pergamino del mismo hechizo.
        const r2 = ch.learnSpell('still_aegis');
        expect(r2.ok).toBe(true);
        // Debe subir un rango (el pergamino sube +1, y recalculateSpellRanks
        // ajusta al máximo entre el guardado y el automático).
        expect(ch.spellbook.rank('still_aegis')).toBeGreaterThan(rankAfterFirst);
    });

    it('universal aprendido a nivel medio queda en el rango correspondiente', () => {
        const ch = hero();
        // still_aegis: unlockLevel 10, maxRank 6 (HZ-02), factores [0.08, 0.20, 0.40, 0.65, 0.90]
        // Threshold rango 2: 10 + ceil(190*0.08) = 26
        // Threshold rango 3: 10 + ceil(190*0.20) = 48
        // Threshold rango 4: 10 + ceil(190*0.40) = 86
        ch.level = 67;
        ch.spellbook.level = 67;

        const result = ch.learnSpell('still_aegis');
        expect(result.ok).toBe(true);
        expect(ch.spellbook.rank('still_aegis')).toBe(3);
    });
});
