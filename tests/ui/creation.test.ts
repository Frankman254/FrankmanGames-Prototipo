import { describe, expect, it } from 'vitest';
import { validateName } from '../../src/ui/menus/screens/creation';

describe('nombre del personaje', () => {
    it('acepta letras con tildes, dígitos, espacios, apóstrofo y guion', () => {
        expect(validateName('Aldara')).toBeNull();
        expect(validateName('  Ilse   Brumaria ')).toBeNull();
        expect(validateName("D'Arco-Peña")).toBeNull();
        expect(validateName('OMP O9RT3')).toBeNull();
        expect(validateName('Aldara 2026')).toBeNull();
    });

    it('acepta 24 caracteres y rechaza 25 (NOM-01)', () => {
        expect(validateName('A'.repeat(24))).toBeNull();
        expect(validateName('A'.repeat(25))).toMatch(/Máximo 24/);
    });

    it('rechaza cortos, largos y símbolos', () => {
        expect(validateName('A')).toMatch(/Mínimo/);
        expect(validateName('A'.repeat(25))).toMatch(/Máximo/);
        expect(validateName('Ana@')).toMatch(/Sólo/);
        expect(validateName('-Ana')).toMatch(/Sólo/);
    });
});
