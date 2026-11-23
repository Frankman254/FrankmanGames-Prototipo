import { describe, it, expect } from 'vitest';
import { boatAt, boatOpen, canBoard, parseBoats, BOAT_CLICK_RADIUS, BOAT_BOARD_RADIUS } from '../src/world/boats';

/* ---------- boats.ts ---------- */

describe('boatAt', () => {
    it('encuentra la lancha más cercana dentro del radio', () => {
        const boats = [
            { id: 'a', name: 'A', x: 0, y: 0, to: { x: 10, y: 10 }, arrive: '', requires: null, waitText: '' },
            { id: 'b', name: 'B', x: 100, y: 100, to: { x: 200, y: 200 }, arrive: '', requires: null, waitText: '' },
        ];
        const hit = boatAt(boats, { x: 1, y: 1 });
        expect(hit?.id).toBe('a');
    });

    it('devuelve null cuando no hay lancha en el radio', () => {
        const boats = [
            { id: 'a', name: 'A', x: 0, y: 0, to: { x: 10, y: 10 }, arrive: '', requires: null, waitText: '' },
        ];
        expect(boatAt(boats, { x: 100, y: 100 })).toBeNull();
    });

    it('devuelve null con lista vacía', () => {
        expect(boatAt([], { x: 0, y: 0 })).toBeNull();
    });

    it('elige la más cercana cuando hay dos en el radio', () => {
        const boats = [
            { id: 'a', name: 'A', x: 0, y: 0, to: { x: 10, y: 10 }, arrive: '', requires: null, waitText: '' },
            { id: 'b', name: 'B', x: 2, y: 2, to: { x: 20, y: 20 }, arrive: '', requires: null, waitText: '' },
        ];
        const hit = boatAt(boats, { x: 3, y: 3 });
        expect(hit?.id).toBe('b');
    });

    it('detecta la lancha justo en el borde del radio', () => {
        const boats = [
            { id: 'edge', name: 'Edge', x: 0, y: 0, to: { x: 10, y: 10 }, arrive: '', requires: null, waitText: '' },
        ];
        // Distancia exacta = BOAT_CLICK_RADIUS (4)
        const hit = boatAt(boats, { x: BOAT_CLICK_RADIUS, y: 0 });
        expect(hit?.id).toBe('edge');
    });
});

describe('boatOpen', () => {
    const bNoReq = { id: 'free', name: 'Free', x: 0, y: 0, to: { x: 10, y: 10 }, arrive: '', requires: null, waitText: '' };
    const bReq = { id: 'locked', name: 'Locked', x: 0, y: 0, to: { x: 10, y: 10 }, arrive: '', requires: 'Q01', waitText: 'Espera' };

    it('siempre abierta si no requiere misión', () => {
        expect(boatOpen(bNoReq, () => false, ['start'], 'start')).toBe(true);
    });

    it('cerrada si requiere misión y no está hecha ni se conoce otra piedra', () => {
        expect(boatOpen(bReq, () => false, ['start'], 'start')).toBe(false);
    });

    it('abierta si la misión está hecha', () => {
        expect(boatOpen(bReq, (id) => id === 'Q01', ['start'], 'start')).toBe(true);
    });

    it('abierta si el jugador conoce otra piedra', () => {
        expect(boatOpen(bReq, () => false, ['start', 'otra'], 'start')).toBe(true);
    });

    it('cerrada si solo conoce la piedra de inicio', () => {
        expect(boatOpen(bReq, () => false, ['start'], 'start')).toBe(false);
    });
});

describe('canBoard', () => {
    const b = { id: 'x', name: 'X', x: 0, y: 0, to: { x: 30, y: 40 }, arrive: '', requires: null, waitText: '' };

    it('permite subir cuando el jugador está en el muelle', () => {
        expect(canBoard(b, { x: 0, y: 0 })).toBe(true);
    });

    it('permite subir dentro del radio de abordaje', () => {
        // Distancia 1.5 < 1.8
        expect(canBoard(b, { x: 1.5, y: 0 })).toBe(true);
    });

    it('no permite subir fuera del radio', () => {
        expect(canBoard(b, { x: 5, y: 0 })).toBe(false);
    });

    it('permite subir justo en el borde del radio', () => {
        // Distancia exacta = BOAT_BOARD_RADIUS (1.8)
        expect(canBoard(b, { x: BOAT_BOARD_RADIUS, y: 0 })).toBe(true);
    });
});

describe('parseBoats', () => {
    it('parsea una lista válida con requires', () => {
        const result = parseBoats({
            boats: [
                { id: 'dock1', name: 'Lancha a Pedasol', x: 0, y: 0, to: { x: 50, y: 60 }, arrive: 'Bienvenido', requires: 'Q01', waitText: 'Espera' },
            ],
        });
        expect(result).toHaveLength(1);
        expect(result[0]!.id).toBe('dock1');
        expect(result[0]!.to).toEqual({ x: 50, y: 60 });
        expect(result[0]!.requires).toBe('Q01');
    });

    it('devuelve array vacío si no hay boats', () => {
        expect(parseBoats({})).toEqual([]);
    });

    it('falla con id repetido', () => {
        expect(() =>
            parseBoats({
                boats: [
                    { id: 'dup', name: 'A', x: 0, y: 0, to: { x: 1, y: 1 }, arrive: '' },
                    { id: 'dup', name: 'B', x: 2, y: 2, to: { x: 3, y: 3 }, arrive: '' },
                ],
            }),
        ).toThrow();
    });

    it('soporta requires y waitText omitidos (undefined)', () => {
        const result = parseBoats({
            boats: [
                { id: 'opt', name: 'Opcional', x: 5, y: 5, to: { x: 15, y: 15 }, arrive: 'Llegada' },
            ],
        });
        expect(result[0]!.requires).toBeNull();
        expect(result[0]!.waitText).toBe('');
    });
});
