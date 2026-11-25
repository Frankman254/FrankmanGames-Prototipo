import { afterEach, describe, expect, it } from 'vitest';
import { setLanguage, tr } from '../src/i18n';

// «Carga» es el estado de acumulación (self_stack); el bloque de la ficha se llama «Peso».
// JL-297 tradujo «Carga» como "Carry" y el estado salía como peso en inglés.
describe('«Carga» y «Peso» no comparten clave', () => {
    afterEach(() => setLanguage('es'));
    it('«Carga» es Charge y «Peso» es Weight', () => {
        setLanguage('en');
        expect(tr('Carga')).toBe('Charge');
        expect(tr('Peso')).toBe('Weight');
    });
});
