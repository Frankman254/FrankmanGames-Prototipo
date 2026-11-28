import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { hasTranslation } from '../src/i18n';

const data = loadGameData();

describe('JL-438: traducciones de hechizos por clase', () => {
    it('cada hechizo de cada clase tiene nombre y descripción en español e inglés', () => {
        for (const classId of Object.keys(data.rpg.classes)) {
            const spells = Object.values(data.rpg.spells).filter((spell) => spell.classId === classId);

            expect(spells.length, `${classId}: hechizos propios`).toBeGreaterThan(0);

            for (const spell of spells) {
                const subject = `${classId}/${spell.id}`;

                expect(spell.name.trim(), `${subject}: nombre en español`).not.toBe('');
                expect(spell.description.trim(), `${subject}: descripción en español`).not.toBe('');
                expect(hasTranslation('en', spell.name), `${subject}: nombre en inglés`).toBe(true);
                expect(hasTranslation('en', spell.description), `${subject}: descripción en inglés`).toBe(true);
            }
        }
    });
});
