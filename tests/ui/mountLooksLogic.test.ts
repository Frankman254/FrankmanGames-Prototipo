import { describe, expect, it } from 'vitest';
import { mountLookOptions } from '../../src/ui/menus/mountLooks';
import { mountLookOptionsFromPalette } from '../../src/ui/menus/mountLooksLogic';

describe('mountLookOptionsFromPalette', () => {
    it('mantiene el orden de las variantes y prepara nombre y muestra de color', () => {
        const options = mountLookOptionsFromPalette(['dawn', 'dusk'], {
            dawn: {
                nombre: 'Alba',
                plumaje_principal: '#112233',
                pecho_cresta: '#445566',
                pico_garras: '#778899',
            },
            dusk: {
                nombre: 'Ocaso',
                plumaje_principal: '#abcdef',
                pecho_cresta: '#123456',
                pico_garras: '#fedcba',
            },
        });

        expect(options).toEqual([
            { id: 'dawn', name: 'Alba', swatch: ['#112233', '#445566', '#778899'] },
            { id: 'dusk', name: 'Ocaso', swatch: ['#abcdef', '#123456', '#fedcba'] },
        ]);
    });

    it('usa el id y los colores de respaldo para variantes o valores no definidos', () => {
        const options = mountLookOptionsFromPalette(['missing', 'partial'], {
            partial: { nombre: 42, plumaje_principal: '#010203' },
        });

        expect(options).toEqual([
            { id: 'missing', name: 'missing', swatch: ['#777777', '#dddddd', '#333333'] },
            { id: 'partial', name: 'partial', swatch: ['#010203', '#dddddd', '#333333'] },
        ]);
    });

    it('devuelve una lista vacía sin variantes', () => {
        expect(mountLookOptionsFromPalette([], undefined)).toEqual([]);
    });

    it('resuelve la paleta correspondiente al modelo de la montura', () => {
        const def = {
            mount: { model: 'falcopama', variants: ['turquesa_clasica'] },
        } as Parameters<typeof mountLookOptions>[0];

        expect(mountLookOptions(def)).toEqual([
            {
                id: 'turquesa_clasica',
                name: 'turquesa_clasica',
                swatch: ['#efe6c8', '#72c6b7', '#d89a32'],
            },
        ]);
    });
});
