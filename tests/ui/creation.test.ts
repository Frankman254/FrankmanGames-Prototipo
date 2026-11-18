import { describe, expect, it } from 'vitest';
import { validateName } from '../../src/ui/menus/screens/creation';

describe('nombre del personaje', () => {
    it('acepta letras con tildes, dígitos, espacios, apóstrofo y guion', () => {
        expect(validateName('Aldara')).toBeNull();
        expect(validateName('  Ilse   Brumaria ')).toBeNull();
        expect(validateName("D'Arco-Peña")).toBeNull();
        expect(validateName('OMP O9RT3')).toBeNull();
    });

    it('rechaza cortos, largos y símbolos', () => {
        expect(validateName('A')).toMatch(/Mínimo/);
        expect(validateName('Abcdefghijklmnopq')).toMatch(/Máximo/);
        expect(validateName('Ana@')).toMatch(/Sólo/);
        expect(validateName('-Ana')).toMatch(/Sólo/);
    });
});
