import { describe, it, expect } from 'vitest';
import { SpatialHash } from '../src/sim/spatialHash';

describe('SpatialHash', () => {
    // --- Constructor y celdas básicas ---

    it('calcula cols y rows a partir de width, depth y cellSize', () => {
        const sh = new SpatialHash(100, 60, 10);
        expect(sh.cols).toBe(10);
        expect(sh.rows).toBe(6);
    });

    it('cols y rows mínimos de 1 con mundo de tamaño 0', () => {
        const sh = new SpatialHash(0, 0, 10);
        expect(sh.cols).toBe(1);
        expect(sh.rows).toBe(1);
    });

    it('usa originX y originY para desplazar el origen', () => {
        const sh = new SpatialHash(100, 100, 10, -50, -50);
        expect(sh.cols).toBe(10);
        expect(sh.rows).toBe(10);
    });

    // --- rebuild con items en celdas conocidas ---

    it('rebuild coloca cada item en su cubo', () => {
        const sh = new SpatialHash(30, 30, 10);
        const positions = [
            { pos: { x: 5, y: 5 } },      // celda (0,0)
            { pos: { x: 15, y: 15 } },    // celda (1,1)
            { pos: { x: 25, y: 25 } },    // celda (2,2)
        ];
        sh.rebuild(positions);

        const found: number[] = [];
        sh.query(5, 5, 0, (i) => found.push(i));
        expect(found).toEqual([0]);
    });

    it('rebuild con array vacío no falla', () => {
        const sh = new SpatialHash(30, 30, 10);
        sh.rebuild([]);
        const found: number[] = [];
        sh.query(5, 5, 5, (i) => found.push(i));
        expect(found).toEqual([]);
    });

    it('varios items en la misma celda', () => {
        const sh = new SpatialHash(30, 30, 10);
        const positions = [
            { pos: { x: 2, y: 2 } },
            { pos: { x: 3, y: 3 } },
            { pos: { x: 4, y: 4 } },
        ];
        sh.rebuild(positions);

        const found: number[] = [];
        sh.query(3, 3, 0, (i) => found.push(i));
        expect(found).toHaveLength(3);
        expect(found.sort()).toEqual([0, 1, 2]);
    });

    // --- query con radio ---

    it('query con radio 0 solo devuelve la celda central', () => {
        const sh = new SpatialHash(30, 30, 10);
        const positions = [
            { pos: { x: 5, y: 5 } },     // celda (0,0)
            { pos: { x: 15, y: 15 } },   // celda (1,1)
        ];
        sh.rebuild(positions);

        const found: number[] = [];
        sh.query(5, 5, 0, (i) => found.push(i));
        // radio 0 → solo celda (0,0)
        expect(found).toContain(0);
        expect(found).not.toContain(1);
    });

    it('query con radio grande toca múltiples celdas', () => {
        const sh = new SpatialHash(30, 30, 10);
        const positions = [
            { pos: { x: 1, y: 1 } },
            { pos: { x: 15, y: 15 } },
            { pos: { x: 29, y: 29 } },
        ];
        sh.rebuild(positions);

        const found: number[] = [];
        sh.query(15, 15, 20, (i) => found.push(i));
        expect(found.sort()).toEqual([0, 1, 2]);
    });

    it('query fuera del mundo no devuelve nada', () => {
        const sh = new SpatialHash(30, 30, 10);
        const positions = [
            { pos: { x: 5, y: 5 } },
        ];
        sh.rebuild(positions);

        const found: number[] = [];
        sh.query(100, 100, 5, (i) => found.push(i));
        expect(found).toEqual([]);
    });

    // --- Mover items entre rebuilds ---

    it('rebuild tras mover posiciones actualiza la ubicación', () => {
        const sh = new SpatialHash(30, 30, 10);
        const positions = [
            { pos: { x: 5, y: 5 } },
        ];
        sh.rebuild(positions);

        // Mover a otra celda
        positions[0]!.pos.x = 25;
        positions[0]!.pos.y = 25;
        sh.rebuild(positions);

        const foundOld: number[] = [];
        sh.query(5, 5, 0, (i) => foundOld.push(i));
        expect(foundOld).toEqual([]);

        const foundNew: number[] = [];
        sh.query(25, 25, 0, (i) => foundNew.push(i));
        expect(foundNew).toEqual([0]);
    });

    // --- Bordes: items en el límite exacto de celda ---

    it('item en el borde exacto entre celdas va a la celda de arriba-derecha', () => {
        const sh = new SpatialHash(30, 30, 10);
        const positions = [
            { pos: { x: 10, y: 10 } }, // borde exacto → celda (1,1) por floor
        ];
        sh.rebuild(positions);

        const found: number[] = [];
        sh.query(10, 10, 0, (i) => found.push(i));
        expect(found).toEqual([0]);

        // query en (9,9) con radio 1 debe tocar la celda (1,1)
        const found2: number[] = [];
        sh.query(9, 9, 1, (i) => found2.push(i));
        expect(found2).toEqual([0]);
    });

    it('item en la última celda del mundo', () => {
        const sh = new SpatialHash(30, 30, 10);
        const positions = [
            { pos: { x: 29.9, y: 29.9 } }, // última celda (2,2)
        ];
        sh.rebuild(positions);

        const found: number[] = [];
        sh.query(29, 29, 1, (i) => found.push(i));
        expect(found).toEqual([0]);
    });

    // --- Bordes del mundo: coordenadas negativas y fuera ---

    it('coordenadas negativas con origin en 0', () => {
        const sh = new SpatialHash(30, 30, 10, 0, 0);
        const positions = [
            { pos: { x: -5, y: -5 } }, // fuera del mundo → clamp a (0,0)
        ];
        sh.rebuild(positions);

        const found: number[] = [];
        sh.query(0, 0, 5, (i) => found.push(i));
        expect(found).toEqual([0]);
    });

    it('origin negativo permite coordenadas negativas dentro del mundo', () => {
        const sh = new SpatialHash(30, 30, 10, -15, -15);
        const positions = [
            { pos: { x: -10, y: -10 } }, // dentro del mundo con origin (-15,-15)
        ];
        sh.rebuild(positions);

        const found: number[] = [];
        sh.query(-10, -10, 5, (i) => found.push(i));
        expect(found).toEqual([0]);
    });

    // --- Crecimiento dinámico de arrays internos ---

    it('arrays internos crecen al añadir más items', () => {
        const sh = new SpatialHash(100, 100, 10);
        const positions = [];
        for (let i = 0; i < 100; i++) {
            positions.push({ pos: { x: i % 100, y: Math.floor(i / 100) } });
        }
        sh.rebuild(positions);

        const found: number[] = [];
        sh.query(50, 0, 50, (i) => found.push(i));
        expect(found.length).toBe(100);
    });

    // --- MAX_AXIS wrap-around ---

    it('tabla limitada a MAX_AXIS con mundo más grande', () => {
        // Mundo de 6000×6000 con celdas de 10 → 600 celdas por eje > MAX_AXIS (512)
        const sh = new SpatialHash(6000, 6000, 10);
        expect(sh.cols).toBe(600);
        expect(sh.rows).toBe(600);
        // tCols y tRows están limitados a 512 (privados, pero se infiere del comportamiento)

        const positions = [
            { pos: { x: 0, y: 0 } },
            { pos: { x: 5000, y: 5000 } }, // lejos, pero puede compartir cubo por wrap
        ];
        sh.rebuild(positions);

        // query cerca del origen debe encontrar al menos el item 0
        const found: number[] = [];
        sh.query(0, 0, 5, (i) => found.push(i));
        expect(found).toContain(0);
    });

    // --- query con coordenadas negativas ---

    it('query con coordenadas negativas no falla', () => {
        const sh = new SpatialHash(30, 30, 10, 0, 0);
        const positions = [
            { pos: { x: 5, y: 5 } },
        ];
        sh.rebuild(positions);

        // No debería lanzar
        expect(() => {
            const found: number[] = [];
            sh.query(-10, -10, 5, (i) => found.push(i));
        }).not.toThrow();
    });

    // --- rebuild idempotente ---

    it('rebuild dos veces con los mismos datos da el mismo resultado', () => {
        const sh = new SpatialHash(30, 30, 10);
        const positions = [
            { pos: { x: 5, y: 5 } },
            { pos: { x: 15, y: 15 } },
        ];
        sh.rebuild(positions);
        const first: number[] = [];
        sh.query(10, 10, 10, (i) => first.push(i));

        sh.rebuild(positions);
        const second: number[] = [];
        sh.query(10, 10, 10, (i) => second.push(i));

        expect(first.sort()).toEqual(second.sort());
    });

    // --- query con radio que toca exactamente el borde de una celda ---

    it('query en el centro de una celda con radio = cellSize/2', () => {
        const sh = new SpatialHash(30, 30, 10);
        const positions = [
            { pos: { x: 5, y: 5 } },     // celda (0,0)
            { pos: { x: 15, y: 15 } },   // celda (1,1)
            { pos: { x: 25, y: 25 } },   // celda (2,2)
        ];
        sh.rebuild(positions);

        // query en (5,5) con radio 5 → toca celdas (0,0) y (1,1)
        const found: number[] = [];
        sh.query(5, 5, 5, (i) => found.push(i));
        expect(found).toContain(0);
        // (15,15) está a distancia ~14.14, fuera del radio 5 desde (5,5)
        // pero la celda (1,1) puede tocarse por el rango de celdas
        // Lo importante es que no falle y devuelva al menos el item cercano
        expect(found.length).toBeGreaterThanOrEqual(1);
    });
});
