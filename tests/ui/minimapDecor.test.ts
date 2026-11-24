import { describe, expect, it } from 'vitest';
import { selectScaleBarMeters } from '../../src/ui/map/minimapDecor';

describe('decoración del minimapa', () => {
    it('elige la medida de la barra de escala según los píxeles por metro', () => {
        const cases = [
            [10, 5],
            [5, 10],
            [2.5, 20],
            [2, 25],
            [1, 50],
            [0.5, 100],
            [0.25, 200],
            [0.2, 250],
            [0.1, 500],
        ] as const;

        for (const [pixelsPerMeter, expectedMeters] of cases) {
            expect(selectScaleBarMeters(200, pixelsPerMeter)).toBe(expectedMeters);
        }
    });

    it('usa la medida de respaldo al alejarse más allá de los tramos disponibles', () => {
        expect(selectScaleBarMeters(200, 0.05)).toBe(1000);
    });
});