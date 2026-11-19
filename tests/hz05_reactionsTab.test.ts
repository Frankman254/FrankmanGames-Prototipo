import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '..');
function readJson(file: string): any {
    return JSON.parse(readFileSync(resolve(ROOT, file), 'utf-8'));
}

/**
 * HZ-05: Pestaña Reacciones en el libro de hechizos.
 *
 * Verifica que los datos de reacciones están completos, las traducciones existen
 * y la estructura esperada es correcta.
 */
describe('HZ-05: Pestaña Reacciones en el libro de hechizos', () => {
    const reactions = readJson('data/rpg/reactions.json');
    const enContent = readJson('data/i18n/en.content.json');

    describe('datos de reacciones', () => {
        it('tiene las 5 marcas elementales', () => {
            expect(reactions.marks).toBeDefined();
            const markKeys = Object.keys(reactions.marks);
            expect(markKeys).toHaveLength(5);
            expect(markKeys).toContain('fire');
            expect(markKeys).toContain('water');
            expect(markKeys).toContain('frost');
            expect(markKeys).toContain('lightning');
            expect(markKeys).toContain('earth');
        });

        it('tiene las 15 reacciones', () => {
            expect(reactions.reactions).toBeDefined();
            expect(Array.isArray(reactions.reactions)).toBe(true);
            expect(reactions.reactions.length).toBe(15);
        });

        it('cada reacción tiene id, label, pair y description', () => {
            for (const rx of reactions.reactions) {
                expect(rx.id).toBeDefined();
                expect(typeof rx.id).toBe('string');
                expect(rx.label).toBeDefined();
                expect(typeof rx.label).toBe('string');
                expect(rx.pair).toBeDefined();
                expect(Array.isArray(rx.pair)).toBe(true);
                expect(rx.pair.length).toBe(2);
                expect(rx.description).toBeDefined();
                expect(typeof rx.description).toBe('string');
            }
        });

        it('los ids de reacción son únicos', () => {
            const ids = reactions.reactions.map((r: { id: string }) => r.id);
            expect(new Set(ids).size).toBe(ids.length);
        });
    });

    describe('i18n: traducciones en inglés', () => {
        it('en.content.json tiene las traducciones de las 5 marcas', () => {
            const expectedMarks = [
                'Marca de fuego', 'Marca de agua', 'Marca de escarcha',
                'Marca de rayo', 'Marca de tierra',
            ];
            for (const mark of expectedMarks) {
                expect(enContent[mark]).toBeDefined();
                expect(typeof enContent[mark]).toBe('string');
                expect(enContent[mark].length).toBeGreaterThan(0);
            }
        });

        it('en.content.json tiene las traducciones de las 15 reacciones', () => {
            for (const rx of reactions.reactions) {
                expect(enContent[rx.label], `Falta traducción de "${rx.label}"`).toBeDefined();
                expect(typeof enContent[rx.label]).toBe('string');
                expect(enContent[rx.label].length, `Traducción vacía de "${rx.label}"`).toBeGreaterThan(0);
            }
        });

        it('ruta del icono provisional es assets/icons/reactions/<id>.png', () => {
            for (const rx of reactions.reactions) {
                const expectedPath = `assets/icons/reactions/${rx.id}.png`;
                expect(expectedPath).toMatch(/assets\/icons\/reactions\/[a-z_]+\.png$/);
            }
        });
    });

    describe('elementos y marcas', () => {
        it('los 5 elementos de marca están en la lista de marcas', () => {
            const markElements = ['fire', 'water', 'frost', 'lightning', 'earth'];
            for (const elem of markElements) {
                expect(reactions.marks[elem]).toBeDefined();
            }
        });
    });
});
