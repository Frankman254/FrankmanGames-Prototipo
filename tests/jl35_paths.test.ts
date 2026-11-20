import { describe, expect, it } from 'vitest';
import { pathEdgeDistance } from '../src/sim/paths';
import type { PathDef } from '../src/sim/paths';

describe('pathEdgeDistance', () => {
    function straightPath(startX: number, endX: number, width: number): PathDef {
        return {
            width,
            points: [{ x: startX, y: 0 }, { x: endX, y: 0 }],
        };
    }

    it('camino recto horizontal: centro devuelve ancho/2 positivo (dentro)', () => {
        const paths = [straightPath(0, 10, 4)];
        // En el centro del camino (x=5, z=0), la distancia al segmento es 0,
        // menos width/2 = -2 → negativo = dentro del camino.
        const d = pathEdgeDistance(paths, 5, 0);
        expect(d).toBeCloseTo(-2, 5);
    });

    it('camino recto horizontal: justo en el borde devuelve 0', () => {
        const paths = [straightPath(0, 10, 4)];
        // A 2m del centro (borde), distancia al segmento = 2, menos width/2 = 0.
        const d = pathEdgeDistance(paths, 5, 2);
        expect(d).toBeCloseTo(0, 5);
    });

    it('camino recto horizontal: fuera del camino devuelve positivo', () => {
        const paths = [straightPath(0, 10, 4)];
        // A 5m del centro, distancia al segmento = 5, menos width/2 = 3.
        const d = pathEdgeDistance(paths, 5, 5);
        expect(d).toBeCloseTo(3, 5);
    });

    it('camino recto vertical funciona igual', () => {
        const paths: PathDef[] = [{ width: 2, points: [{ x: 0, y: 0 }, { x: 0, y: 10 }] }];
        // En el centro (x=0, z=5), distancia al segmento = 0, menos width/2 = -1.
        const d = pathEdgeDistance(paths, 0, 5);
        expect(d).toBeCloseTo(-1, 5);
    });

    it('fuera del rango del segmento usa la distancia al punto más cercano', () => {
        const paths = [straightPath(0, 10, 2)];
        // x=15 está más allá del extremo; el punto más cercano es (10,0).
        // Distancia a (10,0) = 5, menos width/2 = 4.
        const d = pathEdgeDistance(paths, 15, 0);
        expect(d).toBeCloseTo(4, 5);
    });

    it('múltiples caminos devuelve el más cercano', () => {
        const paths: PathDef[] = [
            straightPath(0, 10, 2), // centro en z=0
            { width: 2, points: [{ x: 0, y: 20 }, { x: 10, y: 20 }] }, // centro en z=20
        ];
        // En (5, 3), el camino 1 está a 3-1=2 del borde; el camino 2 está a 17-1=16.
        const d = pathEdgeDistance(paths, 5, 3);
        expect(d).toBeCloseTo(2, 5);
    });

    it('lista vacía devuelve Infinity', () => {
        const d = pathEdgeDistance([], 5, 5);
        expect(d).toBe(Infinity);
    });

    it('camino con un solo punto no tiene segmentos y devuelve Infinity', () => {
        const paths: PathDef[] = [{ width: 2, points: [{ x: 5, y: 5 }] }];
        const d = pathEdgeDistance(paths, 5, 5);
        expect(d).toBe(Infinity);
    });

    it('camino diagonal: punto sobre la línea central', () => {
        const paths: PathDef[] = [{ width: 2, points: [{ x: 0, y: 0 }, { x: 10, y: 10 }] }];
        // (5,5) está sobre la diagonal; distancia al segmento = 0, menos width/2 = -1.
        const d = pathEdgeDistance(paths, 5, 5);
        expect(d).toBeCloseTo(-1, 5);
    });

    it('camino con segmento de longitud cero (puntos iguales) se ignora', () => {
        const paths: PathDef[] = [{ width: 2, points: [{ x: 5, y: 5 }, { x: 5, y: 5 }] }];
        const d = pathEdgeDistance(paths, 0, 0);
        // El segmento de longitud cero usa t=0, pero la distancia al punto (5,5) es ~7.07, menos 1 = ~6.07.
        expect(d).toBeCloseTo(Math.hypot(5, 5) - 1, 5);
    });
});
