import { describe, expect, it } from 'vitest';
import { inspectorEntityText } from '../../src/ui/dev/inspectorLogic';

describe('inspectorEntityText', () => {
    it('formats the selected mesh and its parents in order', () => {
        expect(
            inspectorEntityText({
                name: 'mesh',
                parentNames: ['group', 'scene'],
                materialName: 'paint',
                distance: 12.34,
                point: { x: 1.26, y: -2.24, z: 3.25 },
                vertices: 42,
            }),
        ).toBe(
            'Malla: mesh\n' +
                'Cuelga de: group ← scene\n' +
                'Material: paint\n' +
                'Distancia: 12.3 m\n' +
                'Punto: 1.3, -2.2, 3.3\n' +
                'Vértices: 42',
        );
    });

    it('keeps the root and missing-value fallbacks without an empty line', () => {
        expect(
            inspectorEntityText({
                name: 'root-mesh',
                parentNames: [],
                materialName: null,
                distance: Number.NaN,
                point: null,
                vertices: 0,
            }),
        ).toBe('Malla: root-mesh\n' + 'Cuelga de: (raíz)\n' + 'Material: —\n' + 'Distancia: —\n' + 'Vértices: 0');
    });
});
