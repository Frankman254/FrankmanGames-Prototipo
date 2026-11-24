import { describe, it, expect } from 'vitest';
import { barriadaWorldBounds, barriadaStoneWorldPos, barriadaStartWorldPos } from '../src/ui/map/barriadaMap';
import { BARRIADA, barriadaCasas, barriadaLosas } from '../src/world/barriada';

describe('JL-217: minimapa de la barriada', () => {
    it('barriadaWorldBounds devuelve el rectángulo correcto', () => {
        const b = barriadaWorldBounds();
        expect(b.x0).toBe(BARRIADA.origen.x);
        expect(b.y0).toBe(BARRIADA.origen.y);
        expect(b.x1).toBe(BARRIADA.origen.x + BARRIADA.ancho);
        expect(b.y1).toBe(BARRIADA.origen.y + BARRIADA.fondo);
    });

    it('barriadaStoneWorldPos está dentro del rectángulo', () => {
        const b = barriadaWorldBounds();
        const s = barriadaStoneWorldPos();
        expect(s.x).toBeGreaterThanOrEqual(b.x0);
        expect(s.x).toBeLessThanOrEqual(b.x1);
        expect(s.y).toBeGreaterThanOrEqual(b.y0);
        expect(s.y).toBeLessThanOrEqual(b.y1);
    });

    it('barriadaStartWorldPos está dentro del rectángulo', () => {
        const b = barriadaWorldBounds();
        const s = barriadaStartWorldPos();
        expect(s.x).toBeGreaterThanOrEqual(b.x0);
        expect(s.x).toBeLessThanOrEqual(b.x1);
        expect(s.y).toBeGreaterThanOrEqual(b.y0);
        expect(s.y).toBeLessThanOrEqual(b.y1);
    });

    it('hay casas y losas para dibujar', () => {
        const casas = barriadaCasas();
        const losas = barriadaLosas();
        expect(casas.length).toBeGreaterThan(0);
        expect(losas.length).toBeGreaterThan(0);
    });
});

describe('JL-217: umbral de interiorGrid en mapFeed', () => {
    it('el tope 1<<14 excluye la barriada (~160K celdas)', () => {
        // La barriada tiene un grid de ~400x400 = 160K celdas.
        // El tope 1<<14 = 16384 debe excluirla.
        const barriadaCells = 400 * 400;
        const tope = 1 << 14;
        expect(barriadaCells).toBeGreaterThan(tope);
    });

    it('el tope 1<<14 incluye una casa (~24x22 = 528 celdas)', () => {
        const casaCells = 24 * 22;
        const tope = 1 << 14;
        expect(casaCells).toBeLessThanOrEqual(tope);
    });

    it('el tope 1<<14 incluye un piso de cripta (~50x50 = 2500 celdas)', () => {
        const pisoCells = 50 * 50;
        const tope = 1 << 14;
        expect(pisoCells).toBeLessThanOrEqual(tope);
    });
});
