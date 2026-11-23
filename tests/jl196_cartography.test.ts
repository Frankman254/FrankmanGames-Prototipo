import { describe, it, expect } from 'vitest';
import { worldCoordinate, mapCell, parseCartography } from '../src/world/cartography';

const DEF = { cellMeters: 10, sectorCells: 4, altitudeStep: 5, sectorPrefix: 'S' };

describe('worldCoordinate', () => {
    it('coordenada en el centro del mundo', () => {
        // Mundo 100×100, centro en (50, 50)
        const wc = worldCoordinate(50, 50, 0, 100, 100, DEF);
        expect(wc.mapX).toBe(0);
        expect(wc.mapY).toBe(0);
        expect(wc.sectorX).toBe(0);
        expect(wc.sectorY).toBe(0);
        expect(wc.localX).toBe(0);
        expect(wc.localY).toBe(0);
        expect(wc.altitude).toBe(0);
    });

    it('coordenada negativa da sector negativo', () => {
        // x = -25 en un mundo de 100 → mapX = floor((-25-50)/10) = floor(-7.5) = -8
        const wc = worldCoordinate(-25, 50, 12, 100, 100, DEF);
        expect(wc.mapX).toBe(-8);
        expect(wc.sectorX).toBe(-2); // floor(-8/4) = -2
        expect(wc.localX).toBe(0); // ((-8 % 4) + 4) % 4 = 0
        expect(wc.altitude).toBe(10); // round(12/5)*5 = round(2.4)*5 = 2*5 = 10
    });

    it('coordenada positiva da sector positivo', () => {
        // x = 75 en un mundo de 100 → mapX = floor((75-50)/10) = floor(2.5) = 2
        const wc = worldCoordinate(75, 75, 0, 100, 100, DEF);
        expect(wc.mapX).toBe(2);
        expect(wc.mapY).toBe(2);
        expect(wc.sectorX).toBe(0);
        expect(wc.sectorY).toBe(0);
        expect(wc.localX).toBe(2);
        expect(wc.localY).toBe(2);
    });

    it('label incluye prefijo, sector, celda y cota', () => {
        const wc = worldCoordinate(60, 60, 15, 100, 100, DEF);
        // mapX = floor(10/10)=1, mapY=1, sectorX=0, sectorY=0, localX=1, localY=1, alt=15
        expect(wc.label).toContain('S');
        expect(wc.label).toContain('+0');
        expect(wc.label).toContain('celda 2,2');
        expect(wc.label).toContain('cota +15 m');
    });

    it('altitud negativa se redondea hacia cero', () => {
        const wc = worldCoordinate(50, 50, -3, 100, 100, DEF);
        // round(-3/5) = round(-0.6) = -1 → -1*5 = -5
        expect(wc.altitude).toBe(-5);
        expect(wc.label).toContain('cota −5 m');
    });

    it('localX siempre positivo con módulo doble', () => {
        // mapX = -1 → sectorX = -1, localX = ((-1 % 4) + 4) % 4 = 3
        const wc = worldCoordinate(40, 50, 0, 100, 100, DEF);
        // mapX = floor((40-50)/10) = floor(-1) = -1
        expect(wc.mapX).toBe(-1);
        expect(wc.sectorX).toBe(-1);
        expect(wc.localX).toBe(3);
    });
});

describe('mapCell', () => {
    it('celda en el centro del mundo', () => {
        expect(mapCell(50, 50, 100, 100, 10)).toEqual([0, 0]);
    });

    it('celda negativa', () => {
        // x=-25 → floor((-25-50)/10) = floor(-7.5) = -8
        expect(mapCell(-25, 50, 100, 100, 10)).toEqual([-8, 0]);
    });

    it('celda positiva', () => {
        // x=75 → floor((75-50)/10) = floor(2.5) = 2
        expect(mapCell(75, 75, 100, 100, 10)).toEqual([2, 2]);
    });

    it('justo en el borde de celda', () => {
        // x=60 → floor((60-50)/10) = floor(1) = 1
        expect(mapCell(60, 50, 100, 100, 10)).toEqual([1, 0]);
        // x=59.9 → floor(0.99) = 0
        expect(mapCell(59.9, 50, 100, 100, 10)).toEqual([0, 0]);
    });
});

describe('parseCartography', () => {
    it('parsea un config válido', () => {
        const result = parseCartography({
            cellMeters: 10,
            sectorCells: 4,
            altitudeStep: 5,
            sectorPrefix: 'S',
        });
        expect(result.cellMeters).toBe(10);
        expect(result.sectorCells).toBe(4);
        expect(result.altitudeStep).toBe(5);
        expect(result.sectorPrefix).toBe('S');
    });

    it('falla si cellMeters fuera de rango', () => {
        expect(() =>
            parseCartography({
                cellMeters: 3, // min 8
                sectorCells: 4,
                altitudeStep: 5,
                sectorPrefix: 'S',
            }),
        ).toThrow();
    });

    it('falla si sectorCells no es entero', () => {
        expect(() =>
            parseCartography({
                cellMeters: 10,
                sectorCells: 3.5,
                altitudeStep: 5,
                sectorPrefix: 'S',
            }),
        ).toThrow();
    });
});
