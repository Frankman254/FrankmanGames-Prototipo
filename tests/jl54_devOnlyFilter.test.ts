import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

describe('JL-54: hechizos devOnly no salen en el libro', () => {
    const spellsJson = JSON.parse(readFileSync('data/rpg/spells.json', 'utf8'));

    it('solo double_monsoon tiene devOnly en los datos reales', () => {
        const devOnlySpells = Object.entries(spellsJson.spells)
            .filter(([, sp]: [string, any]) => sp.devOnly === true)
            .map(([id]) => id);
        expect(devOnlySpells).toEqual(['double_monsoon']);
    });

    it('double_monsoon es universal (classId null)', () => {
        const spell = spellsJson.spells['double_monsoon'];
        expect(spell.classId).toBeNull();
    });

    it('un hechizo normal no tiene devOnly', () => {
        const spell = spellsJson.spells['fiery_slash'];
        expect(spell.devOnly).toBeUndefined();
    });

    it('el filtro !sp.devOnly excluye solo a double_monsoon', () => {
        const all = Object.values(spellsJson.spells);
        const nonDev = all.filter((sp: any) => !sp.devOnly);
        expect(nonDev.length).toBe(all.length - 1);
        expect(nonDev.some((sp: any) => sp.id === 'double_monsoon')).toBe(false);
    });

    it('double_monsoon tiene tag "prueba"', () => {
        const spell = spellsJson.spells['double_monsoon'];
        expect(spell.tags).toContain('prueba');
    });
});
