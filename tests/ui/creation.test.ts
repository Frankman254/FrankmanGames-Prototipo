import { describe, expect, it } from 'vitest';
import { validateName } from '../../src/ui/menus/screens/creation';

describe('nombre del personaje', () => {
  it('acepta letras con tildes, espacios, apóstrofo y guion', () => {
    expect(validateName('Aldara')).toBeNull();
    expect(validateName('  Ilse   Brumaria ')).toBeNull();
    expect(validateName("D'Arco-Peña")).toBeNull();
  });

  it('rechaza cortos, largos, números y símbolos', () => {
    expect(validateName('A')).toMatch(/Mínimo/);
    expect(validateName('Abcdefghijklmnopq')).toMatch(/Máximo/);
    expect(validateName('Ana3')).toMatch(/Sólo/);
    expect(validateName('-Ana')).toMatch(/Sólo/);
  });
});
