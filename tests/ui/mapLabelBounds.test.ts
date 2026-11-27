import { describe, expect, it } from 'vitest';
import { labelsFullyInsideViewport } from '../../src/ui/map/mapDraw';

describe('etiquetas del mapa dentro del viewport', () => {
    it('descarta texto que se cortaría en cualquiera de los cuatro bordes', () => {
        const visible = { x: 50, y: 40, w: 30, h: 12, align: 'center' as const };
        const clippedLeft = { x: 8, y: 40, w: 20, h: 12, align: 'center' as const };
        const clippedRight = { x: 99, y: 40, w: 20, h: 12, align: 'left' as const };
        const clippedTop = { x: 50, y: 7, w: 30, h: 12, align: 'center' as const };
        const clippedBottom = { x: 50, y: 96, w: 30, h: 12, align: 'center' as const };

        expect(
            labelsFullyInsideViewport([visible, clippedLeft, clippedRight, clippedTop, clippedBottom], 100, 100),
        ).toEqual([visible]);
    });

    it('calcula el borde izquierdo según la alineación del texto', () => {
        const leftAligned = { x: 2, y: 40, w: 20, h: 12, align: 'left' as const };
        const centered = { x: 10, y: 40, w: 20, h: 12, align: 'center' as const };
        const rightAligned = { x: 98, y: 40, w: 20, h: 12, align: 'right' as const };

        expect(labelsFullyInsideViewport([leftAligned, centered, rightAligned], 100, 100)).toEqual([
            leftAligned,
            rightAligned,
        ]);
    });
});
